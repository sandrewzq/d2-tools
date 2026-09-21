# T81：首页掉落池条目跳进待办行动行

> 状态：✅ 已通过实窗验收（2026-09-19）。范围是 2026-09-18 拍板的「只做跳转」；原始诉求里的「标记（已持有 / 推荐）」经 2026-09-19 确认不做，见 §五。
> 来源：T74 第九节第 1 条（2026-09-18 拍板单独开号）。
> 关联：T74（掉落池数据）、T91（待办清单，跳转落点是它定的）。

## 一、问题

首页核心活动卡的掉落池现在只给一串武器名（T74 已让它有内容），
玩家的决策信息在**待办**行动行的展开区里：`WeeklyFarmingPanel.tsx` 已在显示推荐 / 图样 / 账号持有 / 决策词。
两边说的是同一批武器，但首页那串名字点不动，也没有「我已经有了 / 这个推荐刷」的标记。

## 二、落点由 T91 定，不是本件新决策

`T91-todo-list.md`（原 T45，已并入）已经写死两条：

- 刷取不是导航项，是行动行展开后的一个事实面（第 7.4 节）；它依赖当前账号、活动轮换和时间窗口，
  属于需要采取行动的动态清单，不属于资料库的稳定检索内容。
- 从首页摘要、资料库、仓库或商人深链接进入时，**先定位到对应活动或武器**（第 9 节）。

所以本件是兑现已定的深链接口径：跳账号菜单「待办」里对应的**行动行并展开它**，
不跳单独的刷取分区，也不跳资料库的 `weekly_farming` 页签。

行动挑战一律落在「周常」段（时限由活动身份决定），所以深链接先切到「周常」入口，
再由行动行自己在挂载或匹配到 `activityKey` 后展开并滚动——挑战数据可能晚于深链接到达，
那一刻这一行还不存在。

## 三、实现（跳转与定位）

沿用仓库既有的深链接模式，与 `locateVaultItem` / `locateVaultTarget` 同一套：
设置一个带 `requestId` 的定位请求，再切页。

| 环节 | 位置 |
|---|---|
| 活动定位键 | `core/weekly/farming.ts` 的 `weeklyFarmingActivityKey(kind, hash)`，产出 `raid-<活动 hash>` / `dungeon-<活动 hash>` |
| 首页入口 | `ui/src/home/HomePageContentView.tsx` 掉落池标签行右侧的「查看本周刷取」 |
| 定位请求 | `desktop/.../useDesktopProductShell.tsx` 的 `locateWeeklyFarmingActivity` → `setActivePage("account")` |
| 消费 | `ui/src/account/AccountPageContentView.tsx` 收到请求后切到「周常」入口；`AccountTodoPanelSection` 滚到对应的 `[data-activity-key]` 行动行，`AccountActionRow` 展开它 |

- `requestId` 保证同一条目重复点击也重新定位。
- 入口是**新增**的：掉落池条目本身的点击仍然打开装备详情弹窗，没有顶掉原有能力。
- 没碰主进程、没改数据集、没改 `WeeklyFarmingPanel` 的 props。

影响范围（跨 5 个 package，其中 `useDesktopProductShell.tsx` 属高冲突文件）：
`packages/core`（定位键）、`packages/ui`（首页入口、账号页定位）、`packages/app`（动作契约）、
`packages/desktop`（定位请求与两个 provider）、`packages/web`（预览壳按同一契约补齐）。

## 四、入口只对数据集覆盖到的活动出现（实测边界）

账号页里行动行的定位属性由目录资源的 `activity.key` 决定，而 `buildWeeklyFarmingCatalogResource`
对两类活动给的 key 不是一套：

- 数据集覆盖到 → `activity.key`，即 `raid-<活动 hash>` / `dungeon-<活动 hash>`（`activityLoot.ts:686`）；
- 数据集没覆盖 → `uncovered:<kind>:<名称>`（`activityLoot.ts:640`）。

首页只能从活动 hash 拼出前一种，所以入口的条件定为**掉落池确有内容**（`loot_pool` 非空，即数据集覆盖），
否则会出现「点了跳过去但定位不到」的静默失败。
未覆盖的活动在首页仍然是那句「轮换已确认，掉落关系尚未核对」，不给入口。

离线核对（只读，未跑仓库测试）：数据集 25 条活动的 `key` 全部等于 `<activity_kind>-<activity_hash>`；
本机缓存的当周轮换 4 个活动（国王的陨落 1374392663、最后一愿 2122313384、二象性 2823159265、
晚星之主 300092127）拼出的 key 全部命中。

## 五、条目上的标记：确认不做（2026-09-19）

原始诉求里有「标记（已持有 / 推荐）」。2026-09-18 拍板只做跳转，2026-09-19 关闭本任务时用户确认标记不做。
下面把现状与代价留档，将来真要做时不用重新查一遍：

首页简报（`desktop/src/main/runtime/homeBriefing.ts`）的 `buildLootPool`
只产出 `{ hash, name, group_key, icon?, item_type? }`，没有账号持有与 T20 推荐。
账号 Profile 已经在首页简报链路里（`buildWeeklyLiveDataFromBungie` 消费 `snapshot.profile`），
但 T20 推荐匹配（`definitionMatches` / `instanceMatches`）目前只活在资料库侧，接进来是主进程改动，
并牵动那份简报的缓存失效与刷新计划。

约束不变：数据都已经在（账号持有、推荐、图样），不要新造一份并行状态；
要做时得复用 `LibraryWeeklyFarmingView` 已有的判断（`decision` / `recommendationLabel` / `ownedCount`）。

## 六、验收标准

- 首页轮换突袭 / 轮换地牢卡片里点「查看本周刷取」，切到账号菜单「待办」的「周常」入口；
- 页面滚动到对应行动行并展开它，而不是停在面板顶部；
- 同一条目重复点击仍然重新定位；
- 数据集未覆盖的活动不出现入口，也不出现「点了没反应」；
- 掉落池条目原有点击（打开装备详情）保持可用。
