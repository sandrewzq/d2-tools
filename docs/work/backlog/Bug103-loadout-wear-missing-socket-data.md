# Bug #103 穿戴配装时，插槽一个都改不了

## 症状

点「穿戴此方案」，按钮是灰的。能动的时候，也只会搬装备、穿装备，插槽一个都不改——武器 Perk、护甲模组都不行。

两个症状同一个根因，落在两处判定上：

- **护甲**：`strictArmorPlan` 一看到任何 gap 就把 `executable_steps` 清空（`packages/core/src/loadouts/localPlanExecution.ts:187-188`），而 `validatePlannedArmorAssignments` 在缺 `armor_energy` 或 `sockets` 时必产 gap（`:236`）。
- **武器 Perk / 护甲模组**：`hasVerifiedPlug`（`packages/core/src/loadouts/plans.ts:341-348`）只能靠 `item.socket_plugs`（已经装着的）或 `item.sockets`（可写插槽）命中。目标 plug 不是当前已装的那个，就落到 `plug-unavailable`（`plans.ts:305`、`:313`）→ `selected_count !== item_targets.length` → `wear_enabled` 永远不是 `ready`（`packages/app/src/workspaces/applicationLoadoutWorkspace.ts:411-415`）。

## 根因

穿戴路径读的是**账号快照**，而快照刻意剪掉了这两样：

- `AccountItemSnapshot` 显式 `Omit` 掉 `armor_energy`、`catalyst`、`sockets`（`packages/core/src/account/summary.ts:356-359`）。
- `summarizeItem` 只在 `mode === "full"` 时算 `sockets`，快照模式直接返回 `[]`（`summary.ts:1527-1538`）。
- 渲染层交给 `createLocalLoadoutPlanExecutionPlan` 的正是这份快照（`packages/desktop/src/renderer/features/loadouts/useLocalLoadoutPlans.ts:400`，账号来自 `useAccountSummaryStore()`，`packages/desktop/src/renderer/shared/stores/accountEntityStore.ts:301`）。

**所以快照里 socket 恒空不是巧合，是设计。** 拿它判「这个插槽能不能写」，答案永远是「不能」。

后果是：`hasVerifiedPlug` 只有目标 plug 恰好已经装着才会通过，而已经装着就会走 `already-applied`、根本不需要写。**真正需要写的那一类，这条判定永远不通过。**

## 仓库里已经有一条走通的路

T77 / T80 验收通过的「换武器 Perk」不受影响，因为它走的是另一条路径：

`packages/desktop/src/renderer/shared/components/ItemDetailModal.tsx:325` → `applyPendingPerks` → `api.applySocketPlugs`（`packages/desktop/src/preload/preload.ts:414`）→ IPC `actions:item:apply-socket-plugs`（`packages/desktop/src/main/ipc/actions.ts:153`）。

它的 socket 数据来自**按需拉的完整详情**：IPC `account:item-detail`（`packages/desktop/src/main/ipc/account.ts:67`）→ `buildAccountItemDetailFromResponse`，那里走的是 `"full"` 模式（`summary.ts:1097`），`sockets` 是真值。

这条路径不碰 `hasVerifiedPlug`，也不碰 `findWritableSocket`。护甲的读写该照抄它。子职业不写，只需要一份读得准的当前配置（见 T58）。

## 修法

穿戴路径不再拿快照当写前判据。要写哪几件，就按需拉那几件的完整详情，把 `sockets` / `armor_energy` 换成真实值再算执行步骤。

- 拉取范围只覆盖本次涉及的实例，不把整个账号转 full。
- 子职业不在此列——它不写（见 T58）。

**护甲规划器那份 full 数据不复用。** `getArmorPlannerSummary`（`packages/services/src/account/session.ts:224-241`）在主进程、走全账号 full 模式，要喂给渲染层得新开一条 IPC 并整体传一份全量账号，比按需拉重得多。

## 实现（2026-09-20）

新增 `packages/desktop/src/renderer/shared/loadouts/hydratePlanAccount.ts`：

- `collectPlanInstanceIds` 收三类来源：`item_targets[].selected_instance_id`、`armor_plan` 的 `selected_instance_ids` 与 `planned_armor_plugs[].instance_id`、以及只给了 `item_hash` 的目标在账号里命中的全部实例（不补这些，求解出的候选会因为「看不出能不能写」被误判）。
- `mergeAccountItemDetails` 按实例替换，**没有一件对得上时返回原引用**，避免挂在 memo 依赖上时整页白重算。
- `hydratePlanAccount` 走 `loadAccountItemDetailCached` 按需拉详情，并发上限 4（`services/src/account/repository.ts:74` 用的是 2–3），涉及实例超过 40 件就整份不补并告警。单件失败只跳过那一件，保留快照态让下游的 gap / `plug-unavailable` 兜底，天然 fail closed。

接线在 `packages/desktop/src/renderer/features/loadouts/useLocalLoadoutPlans.ts`：

- 新增 `planAccount` state + 补全 effect，`executionPlan`、`executeDraft` 的写前计划、`publishAppliedPlan` 都改用它。
- 新增 `refreshHydratedAccount()`，替换四处 `input.refreshAccount()`。**这一步不能省**：`executeDraft` 刷新后重建 `observedPlan` 再和确认前的计划比对（`:417-439`），刷新返回的账号不带插槽详情就会每次判 `stale` 并拒绝执行。
- `packages/desktop/src/renderer/pages/providers/LoadoutsMenuProvider.tsx` 把 `localPlans.planAccount ?? accountSummary` 传给配装页。全局 `accountSummary` 不动——它还有约 20 处消费（首页、商人、仓库、`itemDetailCleanupProtection` 的 memo key）。

判定逻辑一行没改。`hasVerifiedPlug`、`findWritableSocket`、`validatePlannedArmorAssignments`、`strictArmorPlan` 原本就是对的，数据补齐后自然通过。

### 已知取舍

`selectApplicationLoadoutLibraryViewModel`（`packages/app/src/workspaces/applicationLoadoutWorkspace.ts:262-280`）对每一套配装都算一遍 `selectApplicationLoadoutDetailView` 来填目录行。本次只补当前草稿涉及的实例，所以未选中的兄弟行仍按快照算，可能显示「Plug 当前不可用」。**这不是回归**——今天所有行都是这个状态；点过去补一次，之后靠详情缓存一直有效。要让目录全对就得补所有配装的目标并集（可能上百件），成本远超本 Bug 的范围。

## 验收

- 带护甲模组的配装，穿戴按钮可点，模组真的写进游戏。
- 武器 Perk 改动照旧能写，不能因为这次改动退回 `plug-unavailable`。
- 目标装备在邮政官、或在别的角色身上时，gap 提示照旧出现。
- 连续点两次穿戴，第二次不再被 `stale` 拦下。
- 穿戴核对能看出 socket 级差异：现在执行指纹只序列化 `plug_hashes`（`localPlanExecution.ts:600-615`），不含 `socket_index`。写回真的发生之后，这一条才会被验到。

以上都需要真实账号实窗验收，**尚未进行**。回归测试在 `packages/desktop/test/loadout-plan-account-hydration.test.ts`，覆盖补全前后的 `plug_unavailable_count` / `selected_count` 差异、三类实例来源、单件失败与超上限的降级。

## 关联

- 现有测试覆盖的是求解与匹配（`packages/core/test/loadout.armorSolver.test.ts`、`packages/services/test/loadoutPlans.test.ts`），没有覆盖快照下的执行计划。
