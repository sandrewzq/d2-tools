# T79：插槽状态收敛成一份派生结果

> 状态：✅ 已通过实窗验收（2026-09-19）
> 来源：T77 / T78 实施与实窗复验的直接产物 —— 那次「两个都变启用了」就是漏改其中一份视图造成的。

## 一、问题：同一件事实有四份并行表示（改动前的现状）

「哪个 plug 装在这个 socket 里」在 `AccountItemDetail` 上原有四份表示，由 core 的 patch 各改一遍：

| 表示 | 位置 | 谁在读 |
|---|---|---|
| `sockets[].selected_plug` | `account/summary.ts` | 详情配置区、`socket_plugs` 的派生源 |
| `sockets[].reusable_plugs[].selected` | 同上 | 本件 Roll 的候选列表（「当前启用」标记） |
| `socket_plugs[]` | 由 `sockets` 派生 | 详情摘要、别的读取面 |
| `weapon_roll.sockets[].current_plug` / `owned_plugs[].selected` / `fingerprint` | 同上 | 推荐对照区「当前启用」、Roll 缓存键 |

两个后果：

1. **写路径必须记得改全部四份。** `applyAcceptedSocketPlugs` 现在是手工逐份改的；T78 那次漏掉
   `reusable_plugs[].selected`，界面上就是「新旧两项同时显示当前启用」。
2. **读方各挑一份读。** 本件 Roll 读 `reusable_plugs[].selected`，推荐对照区读 `owned_plugs[].selected`，
   摘要读 `socket_plugs`。任何一份落后于其余三份，同一屏的不同区域就会互相打架，而且**没有一处能判出谁对**。

### 改动前核对（2026-09-19）

清点读侧后有两处修正，都影响收敛范围：

- **写侧真正手工维护的只剩两处。** `socket_plugs`、`weapon_roll.current_plug`、`fingerprint`
  在 `applyAcceptedSocketPlugs` 里**已经是从 `sockets[].selected_plug` 派生的**。
  「四份各改一遍」只对两个 `selected` 布尔成立。
- **读侧不是「各挑一份」，而是取并集。** 真读这两份布尔的地方全是 OR 合并：本件 Roll 的
  `reusablePlug?.selected === true || isCurrentPlug`、仓库同名整理的
  `plug.selected || plug.hash === socket.selected_plug?.hash`、预览插槽的
  `plug.hash === currentHash || plug.selected`，推荐对照区还有
  `recommendationPerkMatches(...) || visual.selected === true`。
  这些 `||` 不判谁对，只把两边并起来——副本一旦落后，表现是「两个都启用」，
  而不是「其中一个错」。**T78 的故障现场在这里，不在写侧。**

上一轮（T77 计划期）曾评估过「给 `AccountItemPatch` 加 socket 变体」这条更正规的路，结论是不做：
那要在六处扩展点各加一遍分支，而详情里的插槽列表根本不从 store 读，加完**依然**改不到显示 ——
等于为一个已经有多份并行视图的东西再加一份。

## 二、实际做法

**删掉两个 `selected` 布尔副本，读侧一律从真源现算。**真源分工按架构定死：

- `sockets[].selected_plug` —— 详情区的真源（完整 Roll 读过之后）；
- `weapon_roll.sockets[].current_plug` —— Roll 区的真源，包含只有快照的时候。
  它必须留在数据里：快照模式下 `item.sockets` 恒为空（`summarizeItem` 的 `mode === "full"` 分支），
  派生不出来。`fingerprint` 同理，它是缓存键。

所以「倾向 `sockets` 作为唯一真源」这条**只对 `sockets` 这一侧成立**，Roll 侧必须自持一份。
删的是副本，不是这条分工。

关于 `reusable_plugs[].selected` 那条争议（「是不是当前项」与「能不能切换」两种语义）：
按代码核对，**`can_apply` 并不依赖它**——`can_apply` 由 `isCurrentPlug`（从 `selected_plug` 算）
加 `can_insert` / `enabled` / `is_enabled` 判定。这份布尔只承担「是不是当前项」一种语义，可以直接删。

## 三、前置（已完成）

- 读侧消费点已清点：真读 `reusable_plugs[].selected` 的只有 4 处；`owned_plugs[].selected`
  生产侧没有直读，只经 core 的 DTO 透传到推荐对照区。范围跨 `core` / `desktop` / `app` / `ui` / `services`。
- 行为等价判据以 `weapon-detail-view.test.ts` 与 `account.socket-plug-acceptance.test.ts` 为起点，
  另加 `item-detail-socket-plug-acceptance.test.tsx`。三处断言口径都从「四份表示一起动」
  改为「一处真源 + 派生」。
- T77 实窗复验已于 2026-09-19 通过，前置满足。

## 四、实现记录（2026-09-19）

| 文件 | 改动 |
|---|---|
| `core/src/account/summary.ts` | `AccountItemReusablePlugSummary` 与 `AccountWeaponRollPlugSummary` 删除 `selected`；删掉 `markPlugSelected`；`buildReusablePlugSummary` 去掉 `selectedHash` 参数；`summarizeWeaponRoll` 的 `addPlug` 去掉 `selected` 参数与 `existing.selected \|= selected`；`applyAcceptedSocketPlugs` / `applyAcceptedSocketPlugsToWeaponRoll` 只写 `selected_plug` 与 `current_plug`，不再逐个 map 候选列表 |
| `desktop/.../buildWeaponDetailView.ts` | `isReusablePlugSummary` 改用 `insert_fail_indexes` / `enable_fail_indexes` 判别（原来靠 `"selected" in plug`）；候选的 `selected` 只看 `isCurrentPlug` |
| `ui/.../WeaponDetailContent.tsx` | 推荐对照区的 `active` 去掉 `\|\| visual.selected === true`；`recommendationOwnedPerk` 不再从副本取 `selected` |
| `ui/src/vault/VaultDuplicateGroups.tsx` | 重复装备对比的「当前」判定只比 `selected_plug.hash` |
| `app/src/workspaces/itemDetail.ts` | `buildPreviewSocketsFromWeaponRoll` 不再给候选写 `selected` 副本 |
| `services/src/community/weaponRecommendationKnowledge.ts`、`dimWishlistDiagnostics.ts` | 两处 `AccountWeaponRollPlugSummary` 构造点删掉 `selected: false` |
| `core/test/account.socket-plug-acceptance.test.ts`、`desktop/test/weapon-detail-view.test.ts`、`desktop/test/item-detail-socket-plug-acceptance.test.tsx` | 断言口径从「四份一起动」改为「一处真源 + 派生」；夹具不再构造 `selected` |

`current_plug` 与 `fingerprint` **保持不动**，理由见第二节。

指纹算法本身没改，输入仍是 `current_plug?.hash` 加 `owned_plugs` 的 hash 集合——
`owned_plugs[].selected` 本来就不参与（`weaponRollFingerprint` 只取 hash），
所以本次改动**不动任何缓存键**。

### 未跑本地自动化验证

本地未跑 typecheck / 构建 / 测试，由 CI 与 Release 负责。

**发布门禁的 typecheck 抓到两处漏改**：`buildWeaponDetailView.ts` 里「预览待应用 Perk 的属性变化」
那两处（`buildPendingWeaponStats` 与 `buildPendingWeaponStatModifiers`）仍在读
`reusable_plugs[].selected` 来跳过「已经是当前装的那一项」。两处都已改成按
`pending.hash === socket.selected_plug?.hash` 比对——与本次收敛的口径一致，
即候选列表不另存副本、读侧拿 hash 与真源比。改动后桌面端 typecheck 通过。

### 实窗复验（2026-09-19 通过）

- 本件 Roll 的每个格子：当前装的那一项仍显示「当前启用」，其余项显示为可切换；
- 推荐对照区的「当前启用」标记仍落在正确的一项上；
- 换 Perk 之后，本件 Roll 与推荐对照区**不再出现「新旧两项同时启用」**（本次改动的直接目标）；
- 仓库同名整理里，重复装备对比的「当前」标记仍正确。
