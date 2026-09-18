# T79：插槽状态收敛成一份派生结果

> 状态：📝 待排期（排在 T77 实窗复验通过、行为确认稳定之后）
> 来源：T77 / T78 实施与实窗复验的直接产物 —— 那次「两个都变启用了」就是漏改其中一份视图造成的。

## 一、问题：同一件事实有四份并行表示

「哪个 plug 装在这个 socket 里」在 `AccountItemDetail` 上有四份表示，全部由 core 的 patch 各改一遍：

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

上一轮（T77 计划期）曾评估过「给 `AccountItemPatch` 加 socket 变体」这条更正规的路，结论是不做：
那要在六处扩展点各加一遍分支，而详情里的插槽列表根本不从 store 读，加完**依然**改不到显示 ——
等于为一个已经有多份并行视图的东西再加一份。

## 二、方向（待细化）

**当前配置只留一处真源（倾向 `sockets`），其余全部改成从它派生。**

- `socket_plugs` 已经是派生的（`summarizeItem` 里一行 `flatMap`），保持。
- `weapon_roll` 的 `current_plug` / `owned_plugs[].selected` 改成由 `sockets` 推导，
  而不是各存一份可能漂移的副本；`fingerprint` 跟着同源重算。
- 写路径收敛成一个「设置某槽当前 plug」的操作，只改真源，派生物在读取时算 ——
  T78 那类「漏一份」在结构上变得不可能，而不是靠再写一条守卫去钉。
- `reusable_plugs[].selected` 是唯一有点争议的一份：它同时承担「这一项是不是当前项」和
  「这一项能不能切换」两种语义（见 T73 的 `can_apply` 判定）。要分清哪些是真源、哪些是派生视图。

## 三、明确的前置

- 需要先清点**读侧消费点**：本件 Roll、推荐对照区、完整掉落池、详情摘要、仓库同名整理，
  逐处确认它读的是哪一份、收敛后等价。
- 属于重构，不改行为：因此**要有行为等价判据**（现有 `weapon-detail-view.test.ts` 与
  `account.socket-plug-acceptance.test.ts` 是起点），不能顺手改口径。
- 排在 T77 实窗复验通过之后：先确认 T77/T78 的行为是想要的，再收敛结构；
  否则会把「结构问题」和「行为没定」搅在一起。
