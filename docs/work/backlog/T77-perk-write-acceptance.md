# T77 / T78：换 Perk 写入受理即确认，写后读回降级为后台静默校对

> 状态：✅ 已通过实窗验收（2026-09-19）
> 后续：**部分结论已被 `T80-perk-write-execution-path.md` 修正**（核对窗口长度、`reflected: true` 这条
> 验收判据、「不采用写响应体」）。改这一单之前先看 T80 §六。
> 来源：2026-09-18 T76 的写后读回留痕把「猜」变成了「看」，看到的真因与 T76 的结论不同；
> T78 是第一轮实窗复验后报的两个 bug 的收口。
> 用户口径：写入后的语义取**乐观显示 + 后台静默校对**；T76 的亲和性代码**保留**，只改它那段已被证伪的结论。

## 一、根因：拿 14.75 秒的重试预算去判一个几分钟的传播延迟

`T76` 的留痕（`~/Library/Application Support/d2-tools/write-action-debug.json`，2026-09-18）里事实很清楚：

- 12:12:09 写入被 Bungie 受理（ErrorCode 1）。
- 12:12:04 → 12:12:35 的 **6 次** `verification-read` 每次都读到同一个旧值 `1807273211`，没有抖动；
  6 条 trace 每一条都带 `affinity_cookie: true` —— 亲和性生效了，读回照样不变。
- 12:15:09 直接探测实例端点，插槽 2 已经是 `550838496`（期望值）：**写入落地了**。
- 12:15:22 实例端点与档案端点同一时刻逐槽一致：没有第二份更陈旧的读取来源。

所以 T76「读到另一台陈旧后端」的解释被证伪，真因是**服务端传播延迟**：写入被受理之后，Bungie 自己要过
几十秒才把新配置吐给读取端点。实测的两个点是 **26 秒仍读到旧值、2 分 45 秒读到新值**；
**收敛上界没有测出来**，`≈2.5 分钟` 只是「至少这么长」，不是上限。

而当时这条路是**阻塞式门闸**：`runItemWriteAction` 写完就 `await refreshItemDetailUntilVerified(...)`，
台阶 `[0, 750, 1_500, 2_500, 4_000, 6_000]`（累计 14.75 秒）走完还没读到期望值，就把这次写入报成
「Perk 更改请求已受理，但连续自动读取后游戏服务仍返回旧配置」，面板进 `refresh-error`。
**失败的是这套判定，不是那次写入**：正常传播被定性成了失败，用户看到的就是「写入成功，详情同步失败」。

同一套判定还带来第二个症状：每轮读回都会置 `detail_loading.instance`，于是
`.weapon-detail-config-loading-note`（`min-height: 34px`）反复挂载/卸载，把六列网格整体顶下去再弹回来。

## 二、DIM 是怎么做的

`DIM/src/app/inventory/advanced-write-actions.ts:240-257` 的 `refreshItemAfterAWA`
（配 `d2-item-factory.ts:219-260` 的 `makeItemSingle`）：**写入响应里的 `item` 就是权威的新状态，
直接替换本地状态，不做任何读回确认**。不轮询、不等服务器、不报「同步失败」。

本仓其实早有同族先例：`expectedAccountPatch` + `applyAcceptedAccountActionPatches`
（`useItemDetailWorkspace.ts`）—— 写入受理后本地叠加、`refreshed: false`、不做读回。
换锁 / 装备 / 转移 / 取邮政官全走这条路，**只有 socket / perk 这一条漏了**。

## 三、改法

### 3.1 core：一个纯函数，四份视图一起改

`AccountItemDetail` 上插槽状态有**四份**并行表示，必须同源更新，否则详情里不同区域会互相打架：

| 字段 | 类型 | 位置 |
|---|---|---|
| `sockets[].selected_plug` | `AccountItemSocketSummary` | `core/src/account/summary.ts` |
| `sockets[].reusable_plugs[].selected` | 同上 | 同上 |
| `socket_plugs[]` | 由 `sockets` 派生 | 同上 |
| `weapon_roll.sockets[].current_plug` + `owned_plugs[].selected` + `fingerprint` | `AccountWeaponRollSummary` | 同上 |

新增并导出 `applyAcceptedSocketPlugs(detail, changes) → AcceptedSocketPlugPatch | null`：

- 按 `socket_index` 定位逐条改 `sockets[i].selected_plug`；`plug_name` 缺失时回落到该槽 `reusable_plugs`
  里同 hash 的名字与图标，再回落 `String(plug_hash)`。
- 同槽的 `reusable_plugs[].selected` 一并翻：**槽内至多一条选中，且必然是新的这一条**。漏掉这一份，
  界面上就是「新旧两项同时显示当前启用」（T78 的第一个实窗 bug）。
- **找不到 `socket_index` 整条跳过**（不新增槽位）。
- `socket_plugs` 用现成的一行派生重算（与 `summarizeItem` 里那份一致），不手写第二份。
- `weapon_roll` 只改命中槽的 `current_plug` 与 `owned_plugs[].selected`，并用现成的
  `weaponRollFingerprint` 重算 `fingerprint` —— 它是 Roll 的缓存键，不重算就会继续命中旧配置的缓存。
- 返回的是**增量**不是整份详情：`AccountItemDetail` 与渲染层的 `SelectedItemDetail` 都满足入参形状，
  但后者 `instance_id` / `sockets` 可选，回整份会被迫加类型断言；回增量则调用方 `{...detail, ...patch}` 即可。
- 一条都没落上时返回 `null`，调用方保持原对象；无可变槽位 / 空变更同为 `null`。

同文件另导出两个配套函数，**全仓只有这一份判据**，受理状态退休、后台留痕、手动重读都读它：

- `acceptedSocketPlugsReflected(detail, changes) → boolean`：逐槽对照 `selected_plug`，全中才算反射；
  空变更视为已反射。
- `summarizeAcceptedSocketPlugs(detail, changes)`：把期望条数与命中条数、以及定位不到的槽位写进 message，
  给留痕用。

### 3.2 渲染层：受理即落地，状态活得比弹框久

- `useItemDetail.ts` 的状态所有者出方法 `applyAcceptedSocketPlugs(instanceId, changes)`，
  与 `refreshSelectedItemDetail` 并列暴露；穿参照抄 `applyAcceptedAccountActionPatches` 那条现成通道。
- `runItemWriteAction` 的选项加 `acceptedSocketChanges`，在写入成功后、返回之前落地。

**为什么状态不能只放在 `selectedItem` 里**（T78 的第二个实窗 bug）：`selectedItem` 在
`closeSelectedItemDetail` 时就被销毁，而单件详情的每一次读取都会拿服务器版本把它盖回去。
把受理状态放那儿，用户「关掉详情再打开」看到的就是旧 Perk，只能得出「没切换成功」的结论。
落点因此改成模块级的 `desktop/src/renderer/shared/stores/acceptedSocketPlugs.ts`：

```
recordAcceptedSocketPlugs(instanceId, changes)   // 写入受理时登记，同槽位覆盖、异槽位并存，5 分钟窗口
withAcceptedSocketPlugs(instanceId, detail)      // 读取出口叠加；对不上原样返回，绝不合成槽位
settleAcceptedSocketPlugsFromServer(instanceId, detail)  // 探针专用：只跑退休判断，不叠加
expireAcceptedSocketPlugs()                      // 账号同步落地时调用
```

叠加**只在读取出口做一次**（`loadAccountItemDetailCached`），缓存与 in-flight 去重里存的仍是服务器原样：
受理状态永远是从当下重新叠的，调用方不必各写一遍。探针走 `serverTruth: true` 那条出口 —— 不叠加，
否则它读回自己叠上去的乐观值，每一轮都会「对上」，永远校不出服务器有没有接受。

**为什么不用 `account_patch` 通道**（那条更「正规」）：`applyAccountEntityPatches` 只动
`locked` / `is_equipped` / 容器归属，而详情里的插槽列表**根本不从 store 读**（`mergeAccountItemDetail`
从 IPC 详情读）。要复用那条通道，得扩 `AccountItemPatch` 联合类型、`applyPatch`、
`isAccountItemActionPatchReflected`、`isSameAccountItemActionPatch`、`clearConflictingCommittedPatches`、
`resolveWriteActionLogType` 六处，还**依然**改不到详情里的插槽显示 —— 还得再给 store 加 socket 字段
再让弹框叠加。为一个已经有多份并行视图的东西再加一份，是净负债。

### 3.3 后台静默校对（不阻塞、不报错、不回退、不上屏）

- 写入受理、本地落地、`runItemWriteAction` **立即 resolve**（`refreshed: true`）→ 面板立刻进成功态。
- 之后 fire-and-forget 跑核对，台阶拉到覆盖实测传播窗口。**本轮定的是 `[0, 5_000, 15_000, 30_000, 60_000, 90_000]`
  （累计约 3.3 分钟），T80 实测后已证伪并拉长为 `[0, 30_000, 60_000, 120_000, 240_000, 300_000]`（≈12.5 分钟）——
  04adaf08 要 3 分 32 秒，正好落在原来的窗口外。见 T80 §六。**
- 核对用的读取必须是 **probe 模式**（`refreshSelectedItemDetail({ mode: "probe" })`）：
  照旧 `force: true` 走网络、照旧写缓存，但**不置 `detail_loading.instance`、不调 `mergeAccountItemDetail`、
  不碰 `selectedItem`、不写错误文案**。这一条同时修掉布局上下跳（见 §一 第二个症状）。
- **核对只允许「确认」，不允许「回退」**：读到不匹配就记 trace 继续等，绝不用旧值覆盖乐观状态。
  窗口耗尽仍不匹配 → 记一条 `verification-complete`（`reflected: false`），界面**不报错**，
  交给既有的账号同步收敛。
- **核对结果不上屏**（T78）：`backgroundVerification` 没有回调，只留痕。原来那个
  `onSettled({confirmed:true})` 是靠「一次读回读到了期望值」把「已与服务器确认」写上屏的 ——
  读回在收到旧值时同样会「成功返回」，这个位置根本区分不开「服务器认了」和「服务器还没跟上」。
- 手动「重新读取配置」保持非 probe —— 那是用户主动要的读取，显示加载态是对的。

### 3.4 文案与面板状态

- **删掉 `refresh-error`** 这个状态（类型联合、`configurationPanelContent` 的分支、面板渲染分支、
  样式规则）。它当时的唯一用途就是把「服务器还没吐回来」定性成失败 —— 正是要修的东西。
- 保住 `error`（真正的写入失败）与它的按钮组（取消选择 / 重新读取 / 保留选择重试）。
- **把 `success` 拆成 `submitted` 与 `reloaded`**（T78）：这两种状态能断言的事不一样，合成一个必然对其中一个撒谎。
  - `submitted`：写接口受理了。面板说「武器配置更改已提交」/「待核对」/「当前显示的是本地状态；
    账号同步后以服务器为准」。受理不等于服务器已经认 —— 实测传播延迟可达几分钟（见 §一）。
  - `reloaded`：刚刚读到了服务器当前配置。面板说「已读取服务器当前配置」/「已读取」。
    至于「读到的是不是刚写进去的那份」，这一层不知道，所以只说到这里。
  - 配色上两者共用成功那一套（`configurationPanelTone` 收敛，`is-success`），因为都不是失败。
- **面板不得出现「已确认 / 已完成」这类替服务器下的断言**（守卫已钉）。
- 顺手修两个文案 / 状态 bug：① `applyPendingPerks` 先设的「正在提交 N 项 Perk 更改…」紧接着被
  `onProgress` 覆盖成「应用武器配置到正在提交到 Bungie…」（label 被当主语），删掉那次预置并把 label
  改成「应用武器配置」；② 手动重读在 `error` 态下失败反而报 `success` 的不对称分支，随状态合并一起消失。

### 3.5 谁有资格覆盖受理状态（不变量正文在 `docs/development.md`）

- 单件详情的读取：**没有**，只在读取出口叠加。
- 服务器自己吐出了新值：可以，且只是提前退休。
- 窗口耗尽之后的账号同步：可以，之后完全以服务器为准（含「服务器仍说旧的」）——
  落点是 `useAccountWorkspace` 收到完整账号快照后调一次 `expireAcceptedSocketPlugs()`。
  窗口**之内**的账号同步不动它：那个窗口存在的意义就是等服务器自己跟上。

## 四、测试与守卫

- `packages/core/test/account.socket-plug-acceptance.test.ts`（10 条）：四份视图同源更新、指纹重算、
  没命中的槽位原样复用且不改写入参、按 `socket_index` 定位（找不到整条跳过、不新增槽位）、
  空变更 / 无插槽是干净 no-op、不可见槽位改 `sockets` 但不进 `socket_plugs` 派生、
  `plug_name` 缺失的两级回落、无 `weapon_roll` 时只回插槽视图、Roll 里没有该槽位时 `weapon_roll` 原样返回；
  外加 `acceptedSocketPlugsReflected` / `summarizeAcceptedSocketPlugs` 的判据（全中才算反射、
  空变更视为已反射、定位不到的槽位按「没反射」算并把期望/实读写进 message）。
- `packages/desktop/test/item-detail-socket-plug-acceptance.test.tsx`（当时 5 条，T80 又补了 5 条）——**这几条就是本 bug 的复现**：
  `getAccountItemDetail` 被固定为返回旧配置，走一次换 Perk，断言
  ① 受理即落地时四份视图一起动（含 `reusable_plugs[].selected`，即「两个都变启用了」那个 bug）、
  ② **关掉详情再打开仍是新 Perk**（T78 第二个 bug 的复现）、
  ③ 后台探针读到旧配置时详情不回退、不置加载态、不报错、
  ④ 写操作在核对读不回来时**仍然立即返回成功**（打桩成永不 resolve，门闸还在的话这条会挂死超时）、
  ⑤ 后台核对只留痕：对上也不改文案、不改界面、不报错。
  `beforeEach` 里 `resetAcceptedSocketPlugs()` —— 受理状态是模块级的，用例之间必须清干净。
- `packages/desktop/test/architecture-maintenance.test.ts` 在既有白名单文件里补守卫（不新增架构测试文件，
  否则要动 `scripts/test-classification.mjs` 的白名单与 `check-test-quality.mjs`）：换 Perk 调用点必须带
  `acceptedSocketChanges:`、读回必须以 `mode: "probe"` 跑、面板不得再有 `refresh-error`；
  受理状态必须落在模块级 Map 里、叠加只发生在读取出口且探针走 `serverTruth` 那条、
  `closeSelectedItemDetail` 不得连带清掉它；面板与弹框都不得出现「已与服务器确认」/ `step: "已完成"`，
  工作区不得再出现 `onSettled`。
- T76 那条亲和性守卫原样保留。不引任何运行时依赖。

## 五、验证

### 5.1 已做的

- 只读取证（2026-09-18，脚本在 `.local-data/tmp/bungie-read/`，全部只发 GET、临时 token 只在内存里）：
  见 §一。真正的判据是留痕本身，它是运行期数据，不是推断。
- 实窗复验（用户执行）报出两个 bug，就是 T78 的两个缺口，已修（见 §3.1 / §3.2 / §3.4）。
- 仓库里的自动化闸门：2026-09-19 由用户授权跑了 `pnpm ci:local`，通过——架构 15 files / 92 tests、
  行为 150 files / 678 tests、共享 Shell 视觉契约 4 个状态、7 个包类型检查全过。
- 实窗验收（用户执行）：2026-09-19 随本轮十项一并验收通过。

### 5.2 复验步骤（这是唯一能证明修复的）

1. **重启 `tools/mac-dev-desktop.command`**（不是「重新打包」）：`scripts/dev-desktop.mjs` 启动时按 mtime 增量构建 `core` / `http` / `services` / `app` / desktop `main` + `preload` 六个产物，所以改了 `packages/core`（本轮新增的 `acceptedSocketPlugsReflected` / `summarizeAcceptedSocketPlugs` 就在那儿）必须重启脚本才生效；`app` / `ui` 走 Vite 别名直读源码，本轮改的 `WeaponDetailContent.tsx` 与 `09-weapon-detail.css` 在 dev 窗口里是热更的，不需要构建。
2. 应用里换一个 Perk → 点「应用」。
3. 预期：**不出现任何红色失败态**；新 Perk 立刻显示为当前生效，**且该槽里不会新旧两项同时显示当前启用**；
   面板进「武器配置更改已提交 / 待核对」。
4. **关掉详情再打开**（这一条是 T78 的第二个 bug）：仍然是新 Perk。
5. 十几秒内不要动它，看**布局不再上下跳**（`.weapon-detail-config-loading-note` 不再反复出现）。
6. 读 `write-action-debug.json`（只读脚本读，不打印 cookie 值）：应能看到后台的 `verification-read`
   逐次推进，**且这些 trace 出现时用户没有点过任何按钮**。
   ⚠️ **判据不是「最后一条 `verification-complete` 是 `reflected: true`」**（T80 §六 已证伪）：
   窗口内读不到期望值只说明「窗口内没观察到」，不是写入失败——63e6a903 在自己的窗口里一次都没读到，
   可它要的值 89 分钟后确实在服务器上。`reflected: false` 的终态在界面与留痕里都必须读作中性。
7. 反例检查：窗口内始终读不到时，界面**仍不应报错**，**面板也不应改口说「已确认」**，
   且不该把已显示的新 Perk 弹回旧值。

## 六、回退风险（如实记）

- 乐观值与下一次账号同步之间是一个非一致窗口（最长 5 分钟受理窗口 + 到下一次账号同步为止）：
  这段时间里界面上显示的配置**领先于**服务器（或领先于游戏里实际生效的）。账号同步是最终收敛者。
- 如果 Bungie 出现「受理但静默拒绝」的情况（ErrorCode 1 但配置其实没换），本地会一直显示新 Perk，
  直到账号同步把它纠正回来 —— 界面不会报错，用户可能先去游戏里看才发现。**T80 已接上写响应体对账**：
  这种情况现在会留一条 `socket-plug-response-mismatch`（见 T80 §四末）。
- 删掉阻塞门闸意味着「写后立刻读回确认」这条保障没有了。用户已明确接受这个取舍：
  DIM 这么做已经很多年，而阻塞版本制造的是**假阳性**（把成功报成失败），代价比偶发的滞后更大。
- 已知的窄边界（接受并记录，未加机制）：窗口内的交互式刷新会把**叠加过**的详情写进 hook 本地的
  `accountItemDetailCacheRef`；若该记录随后过期，同一次会话里重新打开详情理论上可能从这份缓存读到
  叠加过的值。影响有界（只活在该 hook 实例的缓存里、只到下一次真实读取为止），不值得为它再加一层机制。

## 七、明确不做

- **[T80 已推翻] 不采用写响应体。** 当时的依据是「Bungie 官方文档取不到、payload 形状未经实证」，
  而「意图」（socketIndex + plugHash + plugName）已经由调用点完整持有，确定性更高、可测。
  T80 从 Bungie 端到端实测拿到了形状（`item.sockets.data.sockets[].{socketIndex,plugHash}`）：
  `insertSocketPlug` 现在返回解析好的写响应体，用来**对账**（不一致就留 `socket-plug-response-mismatch`）；
  **显示仍按写入意图走**，理由与分工见 T80 §四末。
- 不收敛「连续读取保证确认」的**语义**，只把它从阻塞门闸改成后台静默（用户已确认这个口径）。
- 不碰 `useItemDetail.ts` 的 `is_detail_loading` / `detail_loading` 字段定义、不碰宿主就绪闩锁。
- 不新增 `AccountItemPatch` 的 socket 变体（理由见 §3.2）。
- 不动 T76 的 cookies.ts / client.ts 漏斗 / main.ts 装配 / 测试 / 架构守卫 / 文档正文，只改它的结论段。
- 不 commit、不 stage（用户做最终验收）。
