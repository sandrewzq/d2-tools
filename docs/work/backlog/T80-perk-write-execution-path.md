# T80：换 Perk 的**执行路径**——主进程退出裁判席，写响应体当旁证，一次只飞一个写

> 状态：🟠 代码已改完，**未跑本地自动化**（按仓库约定留给本地测试 / CI / Release），待重启 dev 脚本后实窗复验
> 来源：T77 / T78 的实窗复验里，换 Perk 又报了一次「武器配置未更新 / 需要处理」。T77 只修了渲染层那条
> 路，报错的其实是**另一条**：Electron 主进程里那个自带写后读回裁判的实现。
> 关联：`T77-perk-write-acceptance.md`（本单修正了它 §三 / §5.2 / §七 的三处判断，见 §六）。

## 一、看到的

实窗截图：换 Perk 后写面板进 `error`，标题「武器配置未更新」、步骤「需要处理」，
正文「Bungie 尚未同步这件装备，已强制刷新并重试 3 次。请等待几秒后重新打开详情再试。」，
三个按钮「取消选择 / 重新读取 / 保留选择重试」。

留痕（`~/Library/Application Support/d2-tools/write-action-debug.json`，2026-09-18）里同一件装备
（倾斜角度，`6917530199817605283`）同一插槽（2）上有四段 op，按 `created_at` 排开是这样：

```
12:12:09  63e6a903  submit-complete  已应用 1 个 Perk 更改
12:12:13  63e6a903  verification-read att=1  插槽 2：期望 550838496，读到 1807273211
          ... 一直到 att=6（12:12:35），六次全是旧值
12:12:35  63e6a903  verification-complete att=6  连续 6 次读回都未读到期望的配置
          ---- 89 分钟 ----
13:41:06  e6d1610e  submit-complete
13:41:08  e6d1610e  verification-read att=1  插槽 2：期望 1807273211，读到 550838496
          ... 五次都读 550838496，正是 63e6a903 在 89 分钟前要的那个值
13:44:36  e6d1610e  verification-complete att=6  ref=true
          ---- 26 分钟 ----
14:10:19  04adaf08  submit-complete
14:10:21  04adaf08  verification-read att=1  期望 550838496，读到 1807273211
14:10:31  0aef101d  submit-start        ← 第二次点击，距第一次被受理只有 12 秒
14:10:42  0aef101d  submit-failed  ms=11322  Bungie 尚未同步这件装备，已强制刷新并重试 3 次…
14:13:52  04adaf08  verification-complete att=6  ref=true   （3 分 32 秒）
```

三个事实：

- **写入是受理了的。** 每条 `submit-complete` 都拿到了 ErrorCode 1。每一次「读不到」，
  最后都被证明只是读到得早：63e6a903 要的值在 89 分钟后仍然出现在服务器上，而且是
  e6d1610e 的探针亲手读到的。
- **报错那条 op（`0aef101d`）根本没走到读回。** 它 `submit-failed`，11.3 秒，是**写入本身**
  被 Bungie 挡了：`ErrorCode 1679`，这件装备还有变更在处理中。而那个「变更在处理中」
  就是 12 秒前自己提交的 `04adaf08`。应用自己造出了撞车条件。
- **每一条 trace 都没有 `socket_index` / `plug_hash`。** 四段 op 到底写的是哪个槽哪个 Perk，
  是这一次排查里靠 `期望/读到` 两个值反推出来的。写调用点本来就知道这两个值。

同一轮实窗还有一次报错，不是这条路来的：写面板上是
`Bungie request failed: HTTP 500 (ErrorCode 1634: You must either be logged off or in orbit to perform this action.)`，
当时角色正在活动里。**这不是应用 bug，是 Bungie 的游戏状态拒绝**——但应用把英文原句直接摊给了用户，
还顺带把它归进了「网络问题、可以重试」。见 §四 T80-5。

## 二、根因

两条独立的路各修一半，报错的是没修的那条：

1. **换 Perk 有两条写入路径。** T77 / T78 修的是渲染层那条（`useItemDetailWorkspace.runItemWriteAction`
   → `acceptedSocketChanges`）。截图里的报错来自**另一条**：`packages/desktop/src/main/ipc/actions.ts`
   里 `retrySocketPlugAfterRefresh`，它在主进程内自带一个写后读回裁判
   （`hasAppliedSocketPlug` / `hasReusableSocketPlug`），预算是 **750ms + 2000ms = 2.75 秒**。
   实测传播是 **3 分 32 秒**——差两个数量级，**只要走到这条路就必然误报**。
2. **没有重入闸。** 渲染层没有「一次只飞一个写」的保护，用户在一件装备已有变更在飞时再点一次
   「应用」，第二次必然吃 1679——而 1679 是一个**分钟级**的状态，于是又落到上面那个 2.75 秒的门闸里。

顺带解释了两件之前没解释的事：`0aef101d` 的 11.3 秒（3 次重试 × 刷新 + 退避）就是那 2.75 秒预算的
实际耗时；而 T77 的核对窗口 `[0, 5, 15, 30, 60, 90]` 秒（≈3.3 分钟）之所以「测不出收敛」，
是因为 04adaf08 恰好要 3 分 32 秒——**比窗口长一点点**。

## 三、DIM 是怎么做的（用户问题的答案）

`DIM/src/app/inventory/advanced-write-actions.ts`：

```
insertPlug → await insertFn(...) → await dispatch(refreshItemAfterAWA(response.Response))
                                    ↓ makeItemSingle(context, changes.item, stores)
                                    ↓ dispatch(awaItemChanged(...))
```

- **写响应体就是权威。** `makeItemSingle`（`d2-item-factory.ts:223`）把响应里的
  `instance / perks / renderData / stats / sockets / reusablePlugs / …` 当 `itemComponents` 喂给
  `makeItem` 重建这个 DimItem，reducer 直接换掉 store 里的那一份。
- **没有读回，没有轮询，没有比对，没有 1679 处理。** 全 `DIM/src` 搜 `1679|refresh the item`
  只有无关的哈希命中。
- **唯一的重入保护是一个 React 状态位**：`ApplyPerkSelection.tsx` 里 `if (insertInProgress) return;`
  + 按钮 `disabled={insertInProgress}`。

## 四、改法

### T80-1 `services`：写响应体不再被丢掉

`insertSocketPlug` 从 `Promise<void>` 改成 `Promise<SocketPlugWriteOutcome>`，新增导出的
`readSocketPlugWriteOutcome(response)` 按 `unknown` 逐层防守解析
`{ item: { data: { itemInstanceId }, sockets: { data: { sockets: [{ socketIndex, plugHash }] } } } }`。
**任何一层不是预期形状就返回 `{instance_id, socket_plugs: null}`，绝不抛异常**——写已经成功了，
不能因为读不懂响应体把它报成失败。

### T80-2 主进程：删掉裁判席，改报「没提交」这一档

- 删掉 `retrySocketPlugAfterRefresh` / `hasAppliedSocketPlug` / `hasReusableSocketPlug`。
- 1679 之后仍然重发（间隔 750ms / 2s，各取一次新位置），但**重发用尽就是重发用尽**：
  如实返回 `deferred: true`，不 throw、不包装成失败文案。
- 单条与批量的 IPC 处理程序都把写响应体逐槽并起来回给渲染层，
  并用 `deferred_socket_indexes: number[]` 说清**哪几个槽**没被收下（不是一个数量——渲染层要据此
  决定哪几条不落地）。
- 留痕补上 `socket_index` / `plug_hash`（以后这类排查不必再靠反推），新增 `submit-deferred` 档：
  1679 不是 `submit-failed`，它是「服务器还没处理完，我们不再等」。

### T80-3 渲染层：中性档 + 重入闸

- `ItemWriteActionOutcome` 加 `deferred`：既不是红也不是绿。全部槽位被推迟 → 保持 `tone: "pending"`、
  保留待应用选择、**不落地**；部分被推迟 → 收下的那几条落地，文案如实说「已提交 N 项；其余 M 项…」。
- `applyPendingPerks` 顶部加重入闸 `if (props.isRunningItemAction) return;`——DIM 同款，就这一句。
- 面板加 `deferred` 档：「这件装备还有变更在处理中 / 待重试」，配色走中性，
  按钮「取消选择 / 重新读取配置 / 保留选择重试」。

### T80-4 核对窗口与终态措辞

- 后台核对台阶拉长到 `[0, 30_000, 60_000, 120_000, 240_000, 300_000]`（≈12.5 分钟）。
- 终态措辞改成 `窗口内 N 次核对都没有观察到期望的配置（窗口内未观察到，不代表写入失败）`——
  这是**留痕**，不是判据，措辞不能读起来像判决。

### T80-5 错误文案：认识的游戏状态拒绝换成中文动作句

`packages/services/src/bungie/client.ts` 原来只给 1640 一个特例，其它码一律透传
`Bungie request failed: HTTP 500 (ErrorCode …: 英文原句)`。改成一张 `bungieGameStateRejections` 表，
**HTTP 500 + 响应体 ErrorCode** 与 **HTTP 200 + ErrorCode ≠ 1** 两条路都查它：

- 认识的码（本轮 1634 与既有的 1640）→ 中文动作句，括号里保留码号，便于对上留痕和报错复述；
  同时 `retryable: false`、`causeCategory: "validation"`——重试一百次，角色还在活动里。
- 不认识的码 → 继续透传原文。**宁可给原文，也不要编一句可能不准的翻译。**

`ErrorCode 1634` 的文案是「Bungie 拒绝了这次更改（状态码 1634：角色正在活动中，必须回到轨道或
退回角色选择界面才能改装备）。请回到轨道后再试。」

面板不用改：1634 走的是写失败那条路，落在既有的 `error` 档，按钮「取消选择 / 重新读取 /
保留选择重试」正好对应「回到轨道再重试」。

### 与 DIM 的一处**有意分歧**：响应体当旁证，不当权威

DIM 把写响应体当权威状态直接替换本地。本仓只把它当**旁证**：显示仍按写入意图落地，响应体用来
**对账**——逐槽比对意图与服务器回的 `plugHash`，不一致就留一条 `socket-plug-response-mismatch`。

理由：没有证据说明写响应体走的是比读路径更新的那条数据路径，而读路径实测陈旧几分钟。若响应体
同样陈旧，照 DIM 那样替换就会把用户刚选的 Perk 弹回旧的，那比「领先几分钟」更糟。
分工因此是：**显示按意图（确定、可测、不回退），响应体负责暴露「受理但被静默拒绝」**
（这正是 T77 §六 里担心的那件事，现在有了第一手证据来源）。

## 五、测试与守卫

- `packages/core/test/bungie.actions.test.ts` 补 6 条：写响应体带回逐槽 `plugHash`（端到端一条）、
  非法条目跳过、没有 `sockets` 回落 `null`、`sockets` 为空但实例 id 仍读出、
  以及 `null / undefined / 0 / "ok" / {} / {item:null}` 六种形状全部干净地返回 `{null, null}`。
- `packages/desktop/test/item-detail-socket-plug-acceptance.test.tsx` 补 5 条：全部槽位被推迟时
  **不落地、不报错、走 pending**；部分被推迟时收下的那条落地且文案如实；
  响应体与意图不一致时只留 `socket-plug-response-mismatch` 且**界面仍按意图走**；
  一致时不产生对账留痕；响应体没带插槽状态时跳过对账、不误报。
- `architecture-maintenance.test.ts` 在既有白名单文件里补一条守卫：主进程**活代码**里不得再出现
  `hasAppliedSocketPlug` / `hasReusableSocketPlug` / `selected_plug`（注释里留名字是有意的，
  所以比对前先 `stripSourceComments`）、必须逐槽报 `deferred_socket_indexes`、
  services 必须解析写响应体、面板必须有独立的 `deferred` 档、`applyPendingPerks` 必须有重入闸。
- `packages/services/test/bungie.client.test.ts` 补 2 条（T80-5）：HTTP 500 + 1634 换成中文、
  `retryable: false`、`causeCategory: "validation"`、`details` 带 `status` 与 `bungie_error_code`；
  同一个码走 HTTP 200 回来也认，1640 那条特例仍在，没见过的码仍透传原文。

## 六、对 T77 的三处自我修正

- **§三 3.3 的核对窗口 `[0,5,15,30,60,90]`（≈3.3 分钟）太短。** 04adaf08 实测 3 分 32 秒才
  `reflected: true`，正好落在窗口外。已拉到 ≈12.5 分钟。
- **§5.2 步骤 6 的验收判据「最后一条 `verification-complete` 是 `reflected: true`」不成立。**
  63e6a903 在自己的窗口里一次都没读到期望值，可它要的值 89 分钟后确实在服务器上。
  `reflected: false` 说明的是「窗口内没观察到」，**不是**「写入失败」。该步骤已改写。
- **§七「不采用写响应体」已被推翻**（本单 T80-1 采用了它，理由与分工见 §四末）。当时列为「不做」
  的依据是「payload 形状未经实证」；现在形状从 Bungie 端到端实测拿到了，且解析器写成「读不懂就
  回落」，采用它的成本低于当时估计。

## 七、验证

### 7.1 已做的

- 只读复盘 `write-action-debug.json`（500 条，最新在前）：四段 op 的时间线与
  「期望 / 读到」两个值的交叉印证，见 §一。**没有发过任何写请求**，没有打印 cookie 值。
- 仓库里的自动化闸门**未运行**（按约定留给本地测试 / CI / Release）。**未运行**的部分包括：
  `pnpm typecheck:*`、`test:behavior`、`test:architecture`、`test:quality`、`ci:local`。
  收尾如实写：**未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。**

### 7.2 复验步骤

1. **重启 `tools/mac-dev-desktop.command`**：本轮改了 `packages/services`（写响应体解析），
   它按 mtime 增量构建，不重启脚本不进实窗；`packages/ui` 与渲染层走 Vite 别名直读源码，是热更的。
2. 应用里换一个 Perk → 点「应用」。
3. 预期：**不出现红色失败态**；面板进「武器配置更改已提交 / 待核对」；新 Perk 立刻显示为当前生效。
4. **连点两次「应用」**（这一条是 1679 的复现）：第二次应当**点不动**（重入闸），
   不该出现任何红色失败态。
5. 读 `write-action-debug.json`：这轮 op 的 `submit-start` / `submit-complete` 里应当**带
   `socket_index` 与 `plug_hash`**；不应出现新的 `submit-failed` + 「已强制刷新并重试」。
6. 若真撞上 1679（例如游戏内刚换过装备），预期看到 `submit-deferred`，面板走中性档，
   **不是红条**。
7. Bungie 那边确实受理了的话，后台核对最终会留一条 `reflected: true` 的 `verification-complete`
   （窗口约 12.5 分钟，期间用户不必点任何按钮）。
8. 顺手验 T80-5：角色在活动里（不在轨道）时点「应用」，面板该给中文动作句
   「Bungie 拒绝了这次更改（状态码 1634：角色正在活动中…）」，**不再是英文原文**。

## 八、明确不做

- **不照搬 DIM 的「响应体即权威」**（理由见 §四末）。
- 不把 1679 当错误分类上报：它是状态，不是失败。
- 不动 T77 / T78 的 `acceptedSocketPlugs` 受理存储、probe 出口与不变量。
- 不 commit、不 stage（用户做最终验收）。
