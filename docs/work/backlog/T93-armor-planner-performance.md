# T93 护甲规划器求解耗时

## 症状

两个：

- 槽位规则全设为「自动」时点「计算」，要等十几秒，等完还可能告诉玩家「不确定」。
- 点「计算」后界面一直停在「计算中」，按钮是禁用的，既不出结果也不说原因。这一条不在求解器，在它前面的账号刷新段，见文末。

## 实测（2026-09-22）

基准在 `.local-data/tmp/armor-bench/`。池子是本机账号快照里的 392 件术士护甲，目标 `super ≥ 100` 且 `grenade ≥ 100`，strict 模式，`state_limit` 用默认值 2000——界面从不传这个参数，全仓只有 core 里的默认值。插槽数据按规则集常数合成补齐快照缺口，这是 T58 记录的已知局限：绝对耗时是上限，迭代次数和每次迭代成本不受影响。

耗时与内层迭代次数严格成正比：

| 槽位规则 | 迭代次数 | 耗时 | 每次迭代 | 结果 |
|---|---|---|---|---|
| 全自动（当前默认） | 36,516,792 | 8,530ms | ~234ns | indeterminate，**截断** |
| 三件钉死、两件自动 | 15,361,968 | 3,566ms | ~232ns | indeterminate，**截断** |
| 逐部位 +10 钉死属性 | 1,199,478 | 264ms | ~220ns | unreachable，完整搜完 |
| 逐部位不装模组 | 1,199,478 | 269ms | ~224ns | unreachable，完整搜完 |

两点：

- **「慢」和「不确定」是同一个问题。** 全自动这次不是算完了，是撞上 `state_limit` 的裁剪上限放弃了（`packages/core/src/armor/ownedPlanner.ts:341-354`）。
- **分叉来自属性模组。** `ownedPlanner.ts:571` 里 `auto` 会把每个部位的可选装法乘成 `调谐数 × (1 + 6 + 6)`，钉死属性后只剩调谐数，13 倍分叉消失。迭代次数从 3651 万掉到 120 万，只有这一个原因。

`state_limit` 是线性旋钮，四个档位全部截断，调它只买时间、不买正确性：

| state_limit | 迭代次数 | 耗时 |
|---|---|---|
| 200 | 4,718,220 | 2,483ms |
| 500 | 10,447,866 | 5,092ms |
| 1000 | 19,144,866 | 8,902ms |
| 2000 | 36,538,866 | 16,468ms |

这四行取自旧快照，只看缩放关系。

### 时间花在哪

`node --cpu-prof` 跑一次全自动搜索（改写前，总采样 19,425ms）。`packages/core/dist/armor/` 不带 source map，行号按 dist 文本映射。

| 位置 | 自身时间 | 占比 | 在做什么 |
|---|---|---|---|
| `ownedPlanner.js:568`（`stateKey` 函数体） | 5857ms | 30.1% | `[...].join(":")` |
| `ownedPlanner.js:89`（`planOwnedArmor` 调用行） | 3871ms | 19.9% | `addArmorStatValues(state.totals, option.choice.final)` |
| `model.js:56-57`（`addArmorStatValues` 内部） | 3426ms | 17.6% | `result[stat] += block[stat]` |
| `ownedPlanner.js:104` | 1044ms | 5.4% | `next.get(key)` |
| `ownedPlanner.js:103` | 793ms | 4.1% | `stateKey(...)` 调用行 |
| `ownedPlanner.js:658`（`pieceChoiceId`） | 711ms | 3.7% | 拼 `instance_id + tuning hash + plug hash` |
| `loadSqliteArmorRuleset` | 597ms | 3.1% | 基准的一次性开销，真机有缓存 |
| `ownedPlanner.js:101` | 253ms | 1.3% | `choices: [...state.choices, option.choice]` |
| `choiceIds` / `partialScore` / `compareLogistics` | 426ms | 2.2% | |
| `retainBestStates` | 17ms | 0.1% | 剪枝几乎不花钱 |

`stateKey` 与 `addArmorStatValues` 合计约 73%。**剪枝不是瓶颈**，这一点与改动前的假设相反。

## 已做（2026-09-22）

三处严格等价的改写，不动任何算法语义：

- `packages/core/src/armor/ownedPlanner.ts` 的 `stateKey`：手工拼接替代 `[plus5, plus10, exoticCount, ...setCounts, ...armorStatKeys.map(...)].join(":")`，省掉两个临时数组。
- `ownedPlanner.ts` 主循环的属性累加：直接建对象字面量，绕开 `addArmorStatValues` 的 rest 参数数组。
- `packages/core/src/armor/model.ts` 的 `addArmorStatValues`：展开成固定属性加法，省掉遍历 `armorStatKeys` 和动态取值。

同一份输入下（`states_examined` 逐行相同、候选摘要 `d5d961791cdc7675` 相同）：

| 场景 | 旧 | 新 | 加速 |
|---|---|---|---|
| 全自动 | 16,055ms | 8,530ms | 1.88x |
| 三件钉死两件自动 | 7,118ms | 3,566ms | 2.00x |
| 逐部位 +10 钉死属性 | 536ms | 264ms | 2.03x |
| 逐部位不装模组 | 542ms | 269ms | 2.01x |

每次迭代成本 ~440ns → ~225ns。

## 待做

按杠杆排序。前 4 项减少迭代次数，后 3 项继续压每次迭代成本。

1. **DP 前对每个部位做候选剪枝。** 2026-10-12 已落地仅适用于无额外属性上限的安全 Pareto 剪枝，仍待真实库存核对缩减率与候选内容；带上限目标不剪。原估计“绝大多数选项互相支配、能让自动追平钉死属性”还没有实测支持。
2. **加下界剪枝。** 当前搜索没有 bound：已经能估算「剩余槽位最大可得属性 + 当前 totals」，低于现有最优候选的分支直接丢。
3. **`state_limit` 自适应，或暴露成档位。** 现在是恒 2000 加 90 秒超时（`packages/desktop/src/main/runtime/armorPlannerRuntime.ts:27-31`）。
4. **池子先收敛。** 392 件里同一部位有大量等价件，按 `(item_hash, 属性向量, 能量)` 归并成同质组再展开。
5. **`choices: [...state.choices, choice]` 改父指针**，最后回溯重建，顺带干掉 `pieceChoiceId` 在比较器里的重复拼接。
6. **`stateKey` 改数值键。** 6 个属性各按 10 bit 打包进两个 32 位整数，不产生字符串。
7. **`next.get/set` 换数字键的 Map。**

只做后 3 项的理论下限是 3651 万 × ~50ns ≈ 1.8 秒。

## 账号刷新这一段（2026-09-23）

玩家报的是两件事：「计算时卡住」和「没算出来」。上表全是求解器，链路上还有一段在此之前。

`packages/desktop/src/main/runtime/armorWorkspaceRuntime.ts:56-63`：只要有任意一件已拥有且就绪的护甲缺基础属性 / 能量 / 调模插槽 / 清除选项 / T5 调校选项，就会强制一次 `getArmorPlannerAccountSummary("refresh")` 的全账号网络重建。本机快照恰好每件都缺 socket，真机上很可能每次点计算都先付一次全账号刷新。

这一段每一步单独看都有 30 秒超时（`packages/services/src/bungie/client.ts:73` 的 `timeoutMs` 默认值），但**整段没有上限**：token、membership、profile、资料库串起来最坏是几分钟。求解必须等它结束，而按钮此时是禁用的，既不能取消也没有进度。**「卡住」出在这里，不在求解器。**

### 已做

`armorWorkspaceRuntime.ts` 新增 `refreshArmorSnapshotWithinDeadline`：第二次强制刷新压到 20 秒，超时或抛错就退回刚读到的账号继续算，并往结果的 `warnings` 里追一条说明。首次读取在本轮另加 30 秒上限，见下文。

首次读取已经拿到账号数据时，第二次刷新失败或超时仍会继续求解，并说明数据可能过期。首次读取也失败且没有可用的降级副本时，会明确报错。

### 仍未测

`armor-planner.owned` 和 `account.armor-planner-summary` 两行的实测值。用设置页的「诊断摘要 → 复制脱敏诊断」取。拿到后可以判断 20 秒这个上限是偏松还是偏紧，也能确认「每次计算都强制刷新」在真机上是否成立。

「没算出来」是另一半：求解撞上 `state_limit` 截断后结果可能是 `indeterminate`，界面会说明截断；如果 Worker 超时，则整个请求失败。本轮剪枝和按分支数调整上限后，是否能在真实库存中稳定给出达标候选仍待核对。玩家侧现有绕法是**把属性模组的「增加属性」选成具体属性**——只把模式改成 +10 而留着「自动选择属性」，分叉仍是 6 路（`ownedPlanner.ts:571`），快不到钉死属性那个量级。这条警告的文案现在也把绕法写进去了（`LoadoutsPageContentView.tsx:1538`），原来只说「被截断」不说怎么办。

## 离线计算：棋子缓存（2026-09-23）

玩家问「一定要联网计算吗？manifest 不是都有数据吗」。准确答案：manifest 只有定义，背包里有什么来自 Bungie；但本地本来就有一份账号快照，护甲规划器此前从不读它，所以每次计算都得重新联网。

三条根因：

- 账号快照把插槽和能量剔掉了（`AccountItemSnapshot = Omit<AccountItemSummary, "armor_energy" | "catalyst" | "sockets">`，`summary.ts:374-377`），归一化后的 `ArmorPieceSnapshot` 拿不到安装切片，只能从联网的完整 profile 重建。
- 护甲规划器的 profile 组件组比账号同步多一个 `309`（ItemPlugObjectives），而 `findReusableProfileCache` 用的是超集判定（`session.ts:965`）。多一个组件，账号同步刚拉回来的那份 profile 就一次都命中不了。
- 结果一次计算最多两次全量 GetProfile：`getArmorPlannerAccountSummary("cached")` 冷启动照样走网络，之后 `armorSnapshotNeedsRefresh` 为真再强制刷新一次。

### 已做

- **组件组对齐**：`armorPlannerComponents = snapshotComponents`（`session.ts:143`）。护甲求解只读 `item.sockets` 与 `item.armor_energy`，不需要 ItemPlugObjectives。账号同步刚拉回的 profile 现在可以复用（`profileTtlMs = 45_000` 以内）。
- **棋子缓存**：新增 `packages/services/src/account/armorPiecesStore.ts`，把一次联网得到的 `ArmorPieceSnapshot[]` 落盘到 `armor-planner-pieces-cache.json`。`armorWorkspaceRuntime.ts` 的 `resolveArmorPieces` 先读它，命中就整个跳过账号摘要——「先 `cached` 再 `refresh`」两次拉取一并消失，点「计算」不再联网。这是 d2-armor-solver 的做法（派生后的护甲数组存本地、算配装全程不联网），也是 DIM 把 profile 写进 IndexedDB 的同一思路。
- **账号一同步就作废**：账号快照重新落盘时把当前棋子缓存移为降级副本（`accountSession.ts` 的落盘队列里调 `clearCachedArmorPieces`）。正常计算重新取护甲数据；只有首次读取失败时才使用同账号、同资料库和规则集、24 小时内的副本，并提示装备可能已变化。
- 缓存按账号 + 资料库版本 + 规则集 id/version 隔离，取不到账号身份就不读也不写。

### 取舍

缓存有效期 `armorPiecesMaxAgeMs = 10 分钟`，账号同步时也会立刻作废。再久就可能拿早就拆掉的装备继续算，玩家点「穿戴」才发现那件没了。要更长的新鲜度就得把插槽直接写进账号快照，那是另一件事（DIM 存的就是整份 profile）。

这次**没有**把插槽写进账号快照：账号快照是仓库、首页、装备详情共用的数据，加字段会改动所有消费者的序列化结果；快照模式还缺 plug set 定义（`collectAccountSnapshotDefinitionRequest` 刻意丢掉 `profilePlugSets` / `characterPlugSets`），可能算出和 full 模式不一样的安装切片。棋子缓存存的正是求解器的输入本身，不存在两套形状对不上的问题。

### 仍未测

- 缓存命中时「不联网」这条，要在真机上确认：算一次 → 关掉网络 → 再算一次。
- 首次计算仍要一次全量 GetProfile（缓存为空、或超过 10 分钟）。这一步省不掉。
- 落盘文件大小未实测：414 件护甲预计几百 KB，相对 7.7 MB 的账号快照可以忽略。

## 本轮针对“计算卡住、超时、没有结果”的改动（2026-10-12）

- 20 秒上限原先只管第二次强制刷新。缓存未命中时，第一次 `getArmorPlannerAccountSummary("cached")` 仍可能完整联网且没有总时限；现在首次读取设 30 秒上限。失败时先尝试上述降级副本，没有可用副本就给出“先刷新账号再计算”的明确错误。
- 原先任意一件护甲缺插槽或能量都会触发全账号强制刷新；现在只在目标职业的某个槽位有护甲、却一件可严格回放的实例都没有时才刷新。缺数据的个别实例仍由求解器排除并计入数据质量，避免一件坏数据让每次计算都多等 20 秒。
- 求解器对只有最低值、没有额外属性上限的目标做安全 Pareto 剪枝：同模组数量、异域与套装贡献、六维个位数的候选，只有属性不低、能量和搬运成本不高时才能淘汰另一件。存在额外属性上限时不剪，避免把能满足上限的低属性选项删掉。
- 默认 `state_limit` 按五个槽位实际选项数收紧，以约 3000 万次迭代为预算目标，最低保留 128 个状态；显式传入的 `state_limit` 不变。达到上限仍标记 `truncated`，不能把部分搜索说成完整结果。
- 本次请求出错时，界面保留上一次同规划方式的候选供查看，禁用接受，避免把旧候选当成本次结果。

2026-10-12 本地复验：`armor.ownedPlanner.test.ts` 与 `armorPiecesStore.test.ts` 共 3 个用例通过，`pnpm typecheck` 通过。用本机账号快照和资料库、合成插槽跑只读基准，全自动双 T10 单次 1428ms；三轮中位 1372ms，返回 5 个候选，但仍是 `indeterminate` 且搜索被截断。逐部位钉死 +10 属性的三轮中位为 83ms，搜索未截断，状态为 `unreachable`。这份快照缺真实插槽和能量，不能据此判断真实账号的候选是否正确，也没有测到首次读取、降级副本和缓存命中。下界剪枝仍未做。

2026-10-13 隔离验收：从本机账号详情缓存合并出 5 件术士真实护甲，全部 `strict_replay_ready`，全自动模组目标在约 3.8 秒返回 5 个 `reachable` 候选，搜索仍因状态上限标记 `truncated`；账号详情最后抓取于 2026-09-23。用同一批棋子写入临时缓存后读取命中 5 件，清除缓存后降级副本仍能读回 5 件。尚未验证新鲜账号首次读取、缓存命中时完全不联网，也没有完成下界剪枝。

2026-10-13 新鲜账号实测：只读账号摘要约 10.6 秒返回，术士 434 件护甲全部满足 `strict_replay_ready`，其中移民号陨落 130 件、逃逸艺术家 3 件。目标设为 4 件套、锁定一件逃逸艺术家、手雷至少 200、武器至少 100，碎片手雷加成为 0；全自动模组直接求解超过 90 秒仍无结果，手动终止。每个套装部位只取手雷较高的 4 件、属性模组限定手雷后，约 37 秒找到手雷 200、武器 111 的真实实例候选；结果仍标记 `truncated`，不能证明全库存最优。此前“核心求解已验收”的结论不覆盖这个真实约束场景；仍需修复全量搜索耗时，并在 UI 里复验超时提示与缓存命中时不联网。

2026-10-13 后续优化与复验：CPU 采样发现状态裁剪的排序比较器反复计算同一状态的评分和装备 ID。改为每次裁剪对每个状态各算一次后，缩小候选的同一输入从约 36.7 秒降到约 13.1 秒，输出文件哈希完全一致。完整 130 件套装护甲、锁定的逃逸艺术家和全自动模组在约 50.3 秒返回手雷 200、武器 145 的达标候选，搜索仍标记 `truncated`。这解决了这组约束的 90 秒超时，但等待仍长，且未做 UI 实窗和缓存命中时不联网的复验。

## 关联

- 基准与 profile 在 `.local-data/tmp/armor-bench/`（不提交）：`bench.mjs`、`bench-slots.mjs`、`bench-states.mjs`、`equiv.mjs`、`key-equiv.mjs`、`mainthread.mjs`、`viewmodel.mjs`。
- 棋子缓存：`packages/services/src/account/armorPiecesStore.ts`（不提交的产物是数据目录下的 `armor-planner-pieces-cache.json`）。
- 求解器输入用规则集常数合成补齐快照缺口，同 T58 的已知局限。
- 玩家侧现有缓解：把五个部位的属性模组规则从「自动」改成固定属性（`packages/ui/src/loadouts/LoadoutsPageContentView.tsx:2005-2070`），8.5 秒 → 0.27 秒，而且从截断变成完整搜完。
