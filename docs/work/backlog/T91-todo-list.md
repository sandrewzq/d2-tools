# T91：待办清单

> 状态：📝 设计返工中（T43 / T44 / T45 的设计已并入本文，三号冻结作追溯；导航与清单骨架已落地，其余按第 14 节切片推进）
> 优先级：P1
> 类型：账号「待办」的信息架构 + 领域模型 + 二级导航
> 入口：账号 → 待办
> 合同：[应用工作区账号章节](../references/ui-specs/application-workspaces.md#账号)
> 上游：T42 提供光等事实，T20 提供推荐与实例匹配

## 1. 一句话说明

「待办」只提供一张清单：每项是一件还没做完的事。一级说的是**有哪些事没做完**——任务、赏金、活动挑战、催化剂、图样都在同一张清单里，不按周切。二级说的是**多急**：全部 / 日常 / 周常 / 不限时四个时限桶。

时限和二级导航管的是两件事：时限决定一行落在哪个桶，二级导航决定当前显示哪些行。同一个「周常」桶里可以同时有任务、赏金和挑战。

任务待处理、提光、本周刷取本来是三个各自取数、各自排序的平级分区，现在拆开：任务与挑战并入同一张清单，「刷取」降为行动行展开后的事实面，不再占入口。

本文写的是目标形态；哪些已经落地、哪些还在第 12 节的清单里，见第 14 节。

## 2. 这一轮为什么合并

三个需求实现时各自成了「账号 → 本周行动」下的一个平级二级分区，每个分区自己定义价值判断、完成条件和排序：

- 同一批轮换活动被排了三次。首页活动卡已经按 T74 显示这些活动的掉落池武器，账号页里「提光」按奖励等级再排一次，「本周刷取」按 T20 推荐和账号缺口又排一次。玩家看到三份顺序不同的同一批活动。
- 三个分区的事实大量重叠：活动身份、角色、周窗口、轮换时间四处重复读取和重复存储。
- 分区的结论强度超过事实。提光视图把奖励名称前缀正则当成等级真相（`packages/app/src/workspaces/accountPowerRoute.ts:134-139`，该模块已在本轮删除），刷取视图的「已确认掉落池」在文档里写的是人工 curated + DIM commit 交叉核对，代码里是 Manifest 自动推导加一个硬编码占位字符串（`scripts/generate-activity-loot.mjs:155`）。两处都是先给结论、再用措辞兜。
- 分区之间无法互相解释。玩家在「提光」看到某个活动，切到「本周刷取」看到同一个活动，没有任何东西说明这是同一件事的两面。

本轮不做新的数据能力，只把已有的三类事实放到同一个行动对象上，共用一套排序和一套失败语义。

## 3. 目标结构

「账号 → 待办」下只有一个清单，二级导航里有两种切法：

```text
账号 → 待办
├─ 二级 · 时限桶：全部（默认）/ 日常 / 周常 / 不限时
├─ 二级 · 奖励口径：提光
└─ 行动清单（按第 4.4 节分桶，桶内按第 5 节排序）
   ├─ 日常
   ├─ 周常
   └─ 不限时
```

「全部 / 日常 / 周常 / 不限时」按**多急**切；「提光」按**给什么**切，横跨上面三个桶——哪一项给等级装备就收进来，跟它什么时候过期无关。产品用一条分隔线（`data-axis="kind"`）把提光隔在时限桶下面，免得被读成第五个时限桶；这条线是账号菜单二级目录自己的样式（`.account-directory-tabs > button[data-axis="kind"]`），不是通用目录组件的规则。

二级导航只过滤同一张清单，不改变分桶、不重新计算结论、不叠加权重。一项行动可以同时出现在多个入口里（一个地牢周挑战既属于「周常」，也可以属于「提光」）——它们是同一件事的两种看法。

一级不绑周：清单里装着不限时的任务链、任务步骤、催化剂和图样，绑周会把它们排除在外。

原型在「全部」末尾还接了一段账号级事实（光等、邮政官、容量，只读、不参与排序）。三行已落地：光等按角色分别列出，邮政官报待领取件数，容量报任务槽位与仓库占用。每行只在真有事实可报时出现——读不到就不报，不补占位值。

## 4. 行动对象模型

一条「行动」= 玩家这周可以做或需要处理的一件事，必须能落到一个可确认的身份上。

### 4.1 身份

- **活动类行动**：`activity_hash` + `character_id`。存在条件是 Bungie 返回了该角色在该活动上的挑战，或该活动出现在本周轮换 / 日落中。两类来源都以 Hash 为准，不用名称匹配。角色活动这条路上，分类时一律要求活动确实带本周挑战目标：`activityTypeHash` 只说明它是日落还是地牢，「日落类型但不带挑战」的活动只是可以启动，不算这周的日落挑战（第 12 节）。
- **任务类行动**：`character_id` + `item_instance_id`（任务物品），或 `character_id` + `milestone_hash` / `record_hash`（里程碑与赛季挑战）。
- 同一角色内两条没有实例 ID 的同名任务不得共用同一个 `id`；`id` 必须全局唯一，用作 UI 的稳定键。

### 4.2 字段

```text
id
kind: activity_challenge | pursuit
time_frame: timeless | daily | weekly | long
scope: character | account
character_id / class_name（account 作用域为空）
activity_hash / activity_kind（nightfall | raid | dungeon | crucible | gambit | strike | ...）
title / type_label / icon
facts[]            # 见 4.3，每条事实带自己的来源与数据时间
data_state: confirmed | partial | unavailable
```

### 4.3 事实（facts）

事实是清单要展示的内容，每一条都必须能指回来源。清单不生产新事实，只汇集已有事实。

| 事实 | 内容 | 来源 | 缺失时 |
|---|---|---|---|
| `challenge` | 该角色该活动的挑战完成状态、Objective 进度 | Bungie CharacterActivities 的 `challenges[].objective` | 显示「角色状态待确认」，不算作可做 |
| `rewards` | 官方奖励名原文，以及它是否带等级占位词 | Manifest 活动挑战的 `displayRewards[].itemQuantity`，旧定义兼容 `dummyRewards` | 显示「奖励名未返回」，不显示等级结论 |
| `loot` | 活动级武器关系 | `activity-loot.v1` 受控数据集 | 显示「掉落关系尚未核对」 |
| `recommendation` | T20 推荐摘要 | 统一推荐模型 | 显示「推荐数据未覆盖」 |
| `owned` | 账号持有实例与最佳匹配 | 共享账号 Store | 显示「实例推荐仍在核对」，不当作没有合格 Roll |
| `pattern` | 制作图样进度 | Bungie Profile Records | 显示「制作进度无法确认」，不显示 `0/N` |
| `pursuit` | 任务完成状态、到期时间、追踪位、进度 | 任务资源 | 显示「领取状态待确认」，见 7.2 |

### 4.4 时限分桶

分桶的第一维是**时限**，不是完成状态。按完成状态分组（可执行 / 待处理 / 已完成 / 无法确认）会把一个地牢周挑战、一个突袭周挑战、一个每日赏金和一个赛季挑战塞进同一个「可执行」格子里，玩家看不出哪些今天不做就没了。完成状态在桶内处理，见第 5 节。

三个桶对应二级导航的三个时限入口：

| 桶（二级） | 装什么 | 时限从哪来 |
|---|---|---|
| 日常 | 每日悬赏 | 到期时间落在下一个每日边界 |
| 周常 | 每周悬赏、可重复悬赏、赛季挑战、突袭与地牢周挑战，以及日落 / 宗师、熔炉、智谋、打击等本周轮换活动 | 到期时间落在下一个每周重置，或活动身份属于本周轮换 |
| 不限时 | 任务、任务步骤、异域催化剂、图样 | 没有到期时间 |

「限时活动」（铁旗、试炼、节日）窗口不固定，确认本周出现才建项，混在「周常」段里靠行上「限时活动」字样区分，不单开一段。`long`（过了下一个每周重置但仍在限时，赛季挑战这类）与 `weekly` 同段。

光等、邮政官、容量这些账号级事实不参与分桶，常驻显示在「全部」末尾，见第 7.1 节。任务槽位上限来自任务 Bucket 的定义（本机 Manifest 为 63），因此 `accountCapacityDefinitionBucketHashes` 也包含任务 Bucket，占用数由角色背包里落在该 Bucket 的条数得出。

**时限怎么判定**

- 任务与赏金读 Bungie 返回的到期时间字段，和每日、每周重置边界比较得出 `time_frame`。有到期时间是限时，没有是不限时。
- **不用名称、不用 `itemTypeDisplayName` 当分桶依据。** `itemTypeDisplayName` 只作展示文案。本机 Manifest 里「护甲合成悬赏」「周常星马悬赏」「女王的悬赏」三类完全没有到期提示字段，`itemTypeDisplayName` 写着「悬赏」但实际不限时；反过来「日常悬赏」「可重复悬赏」「试炼每日悬赏」全都带到期提示。
- 活动挑战的时限由**活动身份**决定，不由挑战目标名决定，一律落在「周常」段。

**活动分类用 `activityTypeHash`，不用挑战目标名正则**

活动类型 Hash 在本机 Manifest（版本 `244213.26.06.29`）已核实，按「带挑战的活动数」排序：

| activityTypeHash | 类型 | 带挑战活动数 |
|---|---|---|
| 575572995 | 日落 | 125 |
| 1686739444 | 剧情 | 83 |
| 2043403989 | 突袭 | 37 |
| 332181804 | 梦魇狩猎 | 32 |
| 263019149 / 1728319841 | 赛季竞技场 | 29 / 21 |
| 608898761 | 地牢 | 24 |
| 4088006058 | 熔炉竞技场 | 14 |
| 2112637710 | 奥斯里斯试炼 | 5 |
| 2371050408 | 铁旗 | 4 |

分类结果只用来生成行上的 `activity_kind` 与「怎么拿到」的事实，不再决定行落在哪一段——活动挑战一律进「周常」。

日落是数量最多的一类（125 个），而当前实现只能靠挑战目标名「宗师先锋警戒」认出它，该目标在本机 Manifest 全库 0 条命中，于是日落整类不出现。突袭（2043403989）和地牢（608898761）已经同时有 Hash 判定（`packages/core/src/weekly/liveData.ts:1034-1039`），扩到其余类型即可，名称正则降为兜底。

## 5. 排序

清单先按第 4.4 节分桶，段的顺序固定：日常 → 周常 → 不限时，「全部」按这个顺序拼接。桶内只有一套排序，确定性且与语言无关：

1. **可执行性**：0 可执行 → 1 已完成待处理 → 2 已结束 → 3 状态待确认。四档在任务和挑战上共用同一套编号；挑战没有「已完成待领取」的信号，所以那一档在挑战身上取不到值。
2. **时间**：有服务器到期时间的排在无到期时间的前面，按时间升序。
3. **稳定身份**：活动 Hash 或任务 Hash 按无符号数值升序；两者都没有时退到行的 `id` 比较。
4. **角色顺序**：按 Bungie 返回的角色顺序。

任务和挑战共用同一个比较器：时限决定它落在哪一段，段内顺序由上面这四个键决定。

段不为空才出现。二级按钮上的计数就是该面板的可见行数，标题里的段头计数也是，两处都不手写——写着 10 行却只有 1 行时，玩家会以为有 9 行没显示出来。

不按本地化名称排序。同一份 Profile 在两台设备上顺序一致。

清单**不比较不同行动之间的价值**。哪件事更值得做由玩家自己判断，页面只保证同类事实用同一套口径展示。

## 6. 事实分级

- 每条事实独立记录 `来源 / 数据时间 / 状态`，在行动项上就地显示，不汇总成一个总状态。
- 事实缺失时显示「无法确认 + 具体原因」，**不从清单里静默删除**。本轮修掉一处：提光不再把等级未知的项整体过滤（原 `accountPowerRoute.ts:81-83`，模块已删除）。还剩一处反例：刷取把图样映射缺失确定性地报成「不可制作」（`packages/services/src/community/activityLoot.ts:768`）。
- 不确认的事实不得用「已完成」「已确认」这类动词包装。

### 6.1 界面文案

`来源 / 数据时间 / 状态` 是内部模型，不要求原样出现在界面上。玩家看的是中文名和来源类型，不是字段名和数据集标识。

| 层 | 显示什么 | 不显示什么 |
|---|---|---|
| 事实名 | 「挑战状态」「奖励名」「掉落武器」「推荐」「已持有」「图样进度」 | `challenge` / `rewards` / `loot` / `recommendation` / `owned` / `pattern` |
| 来源 | 「游戏返回」「官方定义」「本项目掉落数据集」「本机推荐规则」「账号快照」「游戏记录」+ 数据时间 | `CharacterActivities`、`Manifest displayRewards`、`activity-loot.v1`、`ProfileRecords`、`item.state`、`T20` |
| 版本 | 在「待办」面板顶部出现一次：「数据版本：游戏清单 244213.26.06.29 · 掉落数据集 2026-09-18.1」 | 逐行重复版本号或 revision |

- 界面文案不写设计说明。「官方奖励名原文，不判定等级」这类解释属于本文档，不属于玩家界面；界面上就是奖励名本身。
- 版本号仍然要能被玩家找到，用于解释「为什么和游戏里不一致」，所以放在分区顶部而不是删掉。

## 7. 二级导航与各面板内容

每个入口给出一条谓词。时限入口只按 `time_frame` 收行（活动挑战的 `time_frame` 由活动身份给出，见 4.4），提光入口只按活动挑战的奖励名原文收行，**都不建立在某条事实是否可用上**。用「奖励名读到了没有」「掉落关系核对过没有」当进门条件，会把「无法确认」的项挡在入口外，与第 6 节冲突。

| 入口 | 谓词 | 不因缺失而排除 |
|---|---|---|
| 全部 | 无 | — |
| 日常 | `time_frame = daily` | — |
| 周常 | `time_frame = weekly \| long`，或活动挑战 | 角色状态待确认的挑战保留 |
| 不限时 | `time_frame = timeless` | — |
| 提光 | 活动挑战的官方奖励名带等级占位词 | `rewards` 缺失显示「奖励名未返回」，保留 |

入口只决定显示哪些行，不改变第 4.4 节的分桶。提光的谓词横跨三个时限桶：同一个地牢周挑战在「周常」和「提光」里都出现，只是各自落在自己的段里。

提光只按奖励名原文分组，不据此推断提升幅度或推荐优先级。行上的等级占位词只是「官方奖励名里有这个词」这一条事实。

### 7.1 全部

无过滤条件，三个时限段依次拼接，没有独有规则。清单末尾接一段账号级事实：光等、邮政官、容量三行常驻显示，只读、可折叠，不参与分桶和排序，清单为空时也照常出现。三行只在真有事实可报时出现，读不到的行不显示，不补占位值；数据时间取账号快照时间，不是待办那次任务读取的时间。

### 7.2 任务与赏金

**展示什么**

- 任务和赏金是清单里的一类行，按 `time_frame` 落进日常 / 周常 / 不限时三段，段内按第 5 节的四个键排序，不再有自己的固定分组和自己的一组计数。
- 每行显示图标、名称、角色、来源、进度、状态、剩余时间和数据来源；紧凑只读行，不做装备卡，不提供假的「领取」按钮。
- 行是可展开的：正面给状态与时限，展开后给这份行上所有事实的来源、数据时间与状态。
- 状态同时使用文字、图标或边界和 `aria-label`，不只靠颜色区分完成、过期和未知。
- 加载、部分失败和旧数据状态保留页面骨架，不用整页遮罩清空旧内容；失败时提供重新拉取任务、赏金与活动挑战的入口（`refreshTasks`）。

**状态语义**

- `completed_pending_action` 只在能确认存在领取 / 兑换 / 继续处理语义时使用。现状是所有可见 Objective 完成即判成这个状态（`packages/core/src/account/summary.ts:2551`、`packages/core/src/account/pursuits.ts:260`），把需要继续推进的任务链步骤顶到了绿色最高优先级。
- 新增并实际产生保守态 `completed_state_known_claim_unconfirmed`，页面文案「完成状态已知，领取状态待确认」。现有数据无法区分「完成但待领取」和「已完成已领取」时一律落到这个状态。**这个保守态目前从未被任何分支产生过。**
- `completed_confirmed` 要能被任务物品路径产生。现状 inventory 路径只有 expired / complete / in_progress / unknown（`pursuits.ts:258-264`），「已过期或已处理」分组对任务物品只能装 expired。
- 「待处理数量」口径要与 UI 标签一致。现状 `pending_count` 只统计第一组（`pursuits.ts:195`）；新形态下这一档计数按可执行性取，不再复用旧的 `pending_count`。

**数据模型**

- 保留 `quantity`：模型里没有（`pursuits.ts:11-30`），可堆叠赏金（quantity=N）现在只算 1 条。
- `id` 必须唯一：现状 `id = ${characterId}:${instance_id ?? hash}`（`pursuits.ts:266`），同一角色内两条无实例的同 hash 项会撞键，UI 的 `key: pursuit:${id}`（`packages/app/src/workspaces/accountPage.ts:941`）随之重复。
- 去重范围只做 milestone ↔ inventory 一层，键 `${character_id}:${item_hash}`（`pursuits.ts:94-96`、`:105`）。
- 时间戳统一：inventory 路径用 `normalizeProfileTimestamp`（`summary.ts:2572`），milestone / record 路径原样透传 `endDate` / `expirationInfo.expirationDate`（`pursuits.ts:136`、`:181`）；非法字符串会让比较器的 `Date.parse` 变成 NaN（`pursuits.ts:296-299`）。
- `data_state: "confirmed"` 的判据（`pursuits.ts:198-203`）只检查 records 存在、根节点存在、遍历完整；record 定义缺失时静默 `return []`（`pursuits.ts:155-156`），页面仍宣称「已确认」。要么补判据，要么降级为 `partial`。
- 进度来源版本：301 不在 pursuit 组件集里（`packages/services/src/account/session.ts:165` 只有 100 / 200 / 202 / 900），任务进度复用已确认的装备快照（`session.ts:266`）。任务列表与 202 / 900 可能来自不同 Profile 版本，而 `observed_at` 只显示 202 的时间（`pursuits.ts:89-93`）。要么把 301 并入任务组件集，要么在页面上说明两个来源可能不同版本。
- `reward_hashes` / `quest_step` 目前没有消费方，保留为行动对象的结构化字段，不做展示。
- 24 小时阈值写死两处（`pursuits.ts:305`、`accountPage.ts:820`），收成一个命名常量。

**保留不推翻的部分**

- 任务分类完全走 Hash / definition 关系：Quests bucket `1345459588`、`itemCategoryHashes` 的 Quest / QuestStep / Bounties / RepeatableBounties / SeasonalArtifact，以及 `definition.objectives.questlineItemHash`（`packages/core/src/items/classification.ts:44-52`、`packages/core/src/account/summary.ts:2524-2545`）。名称关键词分类已从任务路径彻底删除。
- 任务数据独立成 `AccountPursuitResource`，使用 `CharacterProgressions`（202）与由 Bungie `/Settings/` 指定赛季挑战根节点的受控 `ProfileRecords`（900）；失败不阻塞装备、仓库、容量和邮政官（`session.ts:165`、`:271-293`）。
- 账号页固定聚合三个角色，不随当前角色切换丢失其他角色任务；首页不展示任务清单。

**Web 预览**：`createWebAccountPageModel`（`packages/web/src/fixtures/useWebFixtureRuntime.ts:596-624`）没有注入 `pursuitSummary`，fixture 物品也没有 `pursuit` / `item_objectives` 字段，任务分区永远是 `itemCount=0` + `dataState="partial"` 的空态。要么给同形状的预览数据，要么明确不覆盖该分区，不能让它看起来像「账号没有任务」。

### 7.3 提光

提光是二级导航里唯一按奖励口径切的入口，横跨三个时限桶：收进来的都是活动挑战行，按各自的活动身份落回「周常」段。它只回答两个问题：这周的挑战里官方奖励名写的是什么，这个角色的这项挑战做了没有。

**展示什么**

- 活动身份：正式名称与活动类型。
- 角色：行上带角色名，覆盖全部角色，不随当前角色切换丢行。
- 完成状态：`可执行` / `本周已完成` / `当前不可执行` / `状态待确认`，全部来自 Bungie 的 `challenges[].objective`。
- 官方奖励名：Manifest 返回的奖励名原文，按原样展示。等级占位词有两处来源：奖励物品的名字（`强力装备` / `Pinnacle Gear`），或奖励物品的装备阶级原文（`装备阶级5`）。
- 怎么拿到：来源活动的正式名称、挑战名称，以及进入该活动的入口。给的是路径，不是结论。
- 数据来源与时间。
- 完成的挑战不单独折叠，按第 5 节的可执行性排在段内后面。
- 面板顶部的状态矩阵按可执行性分四格（可执行 / 已完成待处理 / 已结束 / 状态待确认），四格相加等于面板行数。

**不展示**：不回答「做完会不会提升光等」，不给推荐顺序，不出现「巅峰奖励」「可能补齐低光槽位」。奖励名缺失、定义查不到或组件返回失败时显示「奖励名未返回 / 无法确认」，不从清单里删除。

面板顶部的说明要把「怎么只有几行」写给玩家看：这不是筛子写窄了，是游戏只给了这几项等级信息。

**事实边界**

- 名称正则不是等级真相。等级判定要么有 Bungie 的明确字段支撑，要么只展示官方奖励名原文。
- 名称正则也不是活动类型的真相。日落、熔炉、智谋、打击这些活动的身份本来就随 CharacterActivities 返回，不需要新数据源；它们不出现在清单里是分类问题，不是取数问题。分类按 `activityTypeHash`（见 4.4），名称正则降为兜底。
- 当前 Manifest 中「巅峰装备」为 0 条，页面不得出现「巅峰奖励」占位文案。
- 奖励名按角色挑战 Objective 关联 Manifest 活动挑战的 `displayRewards[].itemQuantity`，兼容旧定义的 `dummyRewards`；不使用 `visibleRewards` 代替挑战奖励。
- 账号掉落基准忽略职业与异域限制，是账号级参考，不得作为某个角色的推荐理由；它和逐槽缺口只在角色状态的光等详情里出现（见 T42）。
- 周重置时间来自本地推算（`packages/core/src/weekly/summary.ts:301-318`，周二 17:00 UTC 硬编码），页面标注为「按每周重置推算」，不写成 Bungie 返回。

**现状与返工点**

原实现用奖励名称前缀正则判定奖励等级。那个模块（`accountPowerRoute.ts`）已随本轮删除，正则本身移到 `packages/app/src/workspaces/accountTodoChallenges.ts:39`，语义收窄成「这项是不是提光项」：

```text
^(?:巅峰装备|高阶装备|Pinnacle Gear)(?:\s|$)   → pinnacle
^(?:强力装备|Powerful Gear)(?:\s|$)            → powerful
```

本机 Manifest（`manifest/sqlite/zh-chs/active/world.sqlite`，版本 `244213.26.06.29`）实测：

- 全库 4069 个活动里，挑战奖励带等级占位词的只有 19 个，全部是「强力装备」，全部是地牢。2026-09-21 补上「奖励物品的装备阶级」这一路判据后，同一档的「突袭装备」也收进来。
- 没有任何活动出现「巅峰装备」。pinnacle 分支、UI 的「巅峰奖励」文案、排序里的「未完成巅峰优先」，在真实数据下永远不会触发。
- 日落的挑战奖励就是那份普通掉落表。例：`DestinyActivityDefinition 1928490084`（抗战战场：欧洲无人区）的 `displayRewards` 有 14 项 = 11 把普通武器 + 3 种材料。代码确实没有用 `visibleRewards`，但对日落而言两者内容相同，所以「改读 `displayRewards`」并没有把普通掉落挡在外面。
- 日落真正的缺席原因是活动分类。当前实现把日落判成 `nightfall` 的条件是挑战目标名匹配「宗师先锋警戒」（`packages/core/src/weekly/liveData.ts:1022-1024`），而本机 Manifest 全库 0 条命中，于是日落整类不出现。这不是取数问题——日落的 125 个带挑战活动本来就随 `components=204` 返回，改按 `activityTypeHash 575572995` 判定即可，见 4.4。
- 里程碑那条路的分类同样是名称正则（`liveData.ts:961-976`），并且把试炼和铁旗写成了 `return undefined` 直接排除（`:962`）。铁旗另有单独链路（`liveData.ts:219`），试炼则完全没有出口。
- 突袭曾被整档漏掉：国王的陨落、最后一愿的挑战奖励名都是「突袭装备」，名字里没有等级词，但奖励物品的 `itemTypeDisplayName` 是 `装备阶级5`，与地牢的「强力装备」同档。2026-09-21 起判据同时读这两处官方原文，突袭不再被滤掉。
- `dummyRewards` 兼容路径是空转：二象性（大师难度）的 `dummyRewards` 指向 hash `73143230`，该 hash 在当前 Manifest 的 `DestinyInventoryItemDefinition` 里查不到定义，被静默丢弃。
- 名正则本身也脆：物品库里有「第II阶强力装备」「赛季加成强力装备」，前缀锚定匹配不上。
- 净结果：带等级原文的是地牢（奖励名「强力装备」）和突袭（「突袭装备」，靠物品阶级认出来），真实账号上提光 4 项。日落、熔炉、智谋、打击、试炼、铁旗的周常挑战奖励里没有等级原文——要么是普通武器与材料，要么整条 `rewards` 为空——因此进不了提光。

账号掉落基准按设计就忽略职业限制与「同时只能装备一件异域」的限制（`packages/core/src/account/power.ts:148-160`），邮政官不参与。这是 T42 定的账号级事实，本身没错；但原实现把它当成某个角色的推荐原因，于是泰坦（light 226）也会看到「胸甲低 1；奖励掉落槽位随机，仍可能补齐低光槽位」，而那件基准装备是一件术士法袍。原来的 `valueLabel` 只有三个分支：`可能补齐低光槽位` / `仍有提光机会` / `等待完整光等数据`，在真实账号上恒为前两者，对决策没有信息量。这些推断文案已随 `accountPowerRoute.ts` 一起删除。

其他已证实的缺口：

- 等级未知的项被整体过滤：已修。挑战读不到角色状态时报 `unknown`，落到可执行性的第 3 档「状态待确认」，行照常显示。
- 无来源与时间字段：已修。每条事实带自己的来源（`游戏返回` / `官方定义` / `本机分桶规则`），面板顶部给快照数据时间。
- 挑战行的来源只覆盖 `nightfall` / `rotating_raid` / `rotating_dungeon` 三类（`accountTodoChallenges.ts:42`）；日落、熔炉、试炼、铁旗接进来是第 14 节切片 1 的事。
- 账号刷新不刷简报：`useDesktopProductShell.tsx:195-198` 的手动刷新只刷新账号快照，挑战完成状态最长滞后到下一个每日边界。
- 文案 bug：「周期：」与本身已含「每周重置：」前缀的标签叠加，渲染成 `周期：每周重置：09/23 01:00 · …`：已随 `accountPowerRoute.ts` 删除。

### 7.4 刷取事实

**刷取不是入口，是行动行展开后的一个事实面。** 提光在行正面（游戏返回的官方奖励名原文），刷取在展开里（掉落武器 + 推荐 + 图样缺口），两个挂在同一行的两个面上。等级占位词只在提光入口当谓词，刷取内容对它没有影响。

**回答什么**：为了拿到值得使用或可制作的装备，本周刷什么——本周轮换活动里哪些武器值得刷、推荐什么 Roll、账号里是否已有合格实例、红框还差多少。

**活动摘要**：每个活动先显示一行可扫描摘要。

```text
守望者尖塔
本周轮换 · 6 天后结束
6 把武器 · 2 把值得刷 · 1 把红框未完成
```

必须包含活动类型与正式名称、是否处于可重复刷取或本周轮换状态、结束时间或下次重置时间、已确认武器数量、值得继续刷 / 红框未完成 / 信息不足的数量。活动折叠时仍保留这些结论，不要求玩家展开所有武器后自行统计。

现状：面板只显示已核对 / 建议继续刷 / 图样有缺口三项（`packages/ui/src/weekly/WeeklyFarmingPanel.tsx:84-88`），**「信息不足」数量缺失**；活动级结束时间也没有，只有全局的「下次周重置」。活动级结束时间要先确认 Bungie 是否真返回该活动的结束时间；没有可靠来源就不显示，不按固定周期推算。

**武器摘要**：五态结论。

```text
武器名称 · 武器类型
推荐：Aegis S · 另有 2 个来源
红框：3 / 5 · 当前持有 4 把 · 最佳实例核心 Perk 4 / 5
结论：继续补红框
```

- `值得刷`：存在可靠推荐，账号没有满足条件的实例。
- `继续补红框`：制作图样尚未完成，并且该武器仍有明确刷取价值。
- `已有合格 Roll`：至少一个实例满足当前选择来源的核心要求。
- `当前已满足`：制作目标和实例目标均达到系统可确认条件。
- `信息不足`：掉落、推荐、实例配置或制作进度缺少可靠数据。

不使用裸复选框表达「毕业」。系统判断与玩家个人决定分开：系统状态只根据已确认事实显示「当前已满足」或「仍有缺口」；如后续增加个人规划，使用明确操作「标记为不再刷」，保存为可撤销的本地偏好，不伪装成系统事实。

现状：五态在逻辑上都可达（`packages/core/src/weekly/farming.ts:94-106`），但真实数据下严重偏斜——

- `信息不足` 吞掉绝大多数条目。`recommendationCovered` 要求 T20 有该武器的来源（`packages/app/src/workspaces/libraryWeeklyFarming.ts:89`），没命中的全部落到这里，而它的数量在 UI 上不显示。
- `继续补红框` 要求同时满足「T20 已覆盖」和「图样进行中」。可制作但 T20 没覆盖的武器会落到「信息不足」，而不是「继续补红框」。
- `已有合格 Roll` 被前两条遮蔽：只有图样状态是 `unavailable` 或不可制作的武器才可能落到这一态。
- `当前已满足` 要求图样状态为 `complete`，所以不可制作的武器即使满 Roll 也永远不会「当前已满足」。
- 图样缺口计数只统计 `in_progress`（`libraryWeeklyFarming.ts:138`、`:163`），图样状态为 `unavailable` 的缺口不计入「图样有缺口」。

返工时先把每个状态的触发条件按真实数据走一遍，确认玩家至少能看到「继续补红框」「已有合格 Roll」「信息不足」三种，并且「信息不足」有可见数量。

**展开详情**：按顺序显示五项。

1. **为什么值得刷**：各推荐来源的结论和必要备注；先显示摘要，详细来源证据按需展开。所有来源同级，不按来源类型排权重。
2. **推荐 Roll**：各来源独立展示枪管、弹匣、主要 Perk、大师属性和起源特性；不跨来源拼接。
3. **当前已有**：同一正式发布版本的真实实例按匹配程度排序，第一项明确标记为「当前最佳」。
4. **制作进度**：显示 `3 / 5`、还差 `2` 个；不可确认时显示原因，不展示伪造的 `0 / 5`。
5. **获取依据**：显示活动掉落数据的来源、版本和确认时间，可跳转统一装备详情。

现状：面板（`WeeklyFarmingPanel.tsx`）只做到第 5 项的简化版，前四项都没兑现——

- 没有「推荐 Roll」。逐来源的枪管、弹匣、主要 Perk、大师属性和起源特性一个字都没渲染，副标题里却写着「活动来源 + 推荐 Roll + 账号持有 + 图样进度」（`WeeklyFarmingPanel.tsx:61`）。现状是把玩家丢给「查看装备与推荐」按钮，进统一装备详情看。
- 「为什么值得刷」只有一行摘要（`:121`、`:132`），没有各推荐来源的结论与备注。
- 「当前已有」被压成一个最佳实例（`:124`），不是按匹配程度排序、第一项标记为当前最佳的列表。
- 「获取依据」（`:129-136`）没有渲染 `source_url`，也没有用到 view model 里已有的 `manifestVersion` / `verifiedManifestVersion`（`libraryWeeklyFarming.ts:157-158`）。
- `compact` prop（`WeeklyFarmingPanel.tsx:19`、`:30`）没有任何调用方传入。

返工时在这四项里选一条：要么补齐，要么把不做的部分从承诺里删掉，不留「文档写了、页面没有」的差。

**排序**：活动先按当前可刷状态、结束时间和稳定活动 Hash 排序，不按本地化名称。活动内武器按五级优先级排序：红框未完成且存在可靠推荐 → 没有合格实例且存在可靠推荐 → 已有合格实例但制作尚未完成 → 当前已满足 → 信息不足或没有推荐覆盖。

展开区内的武器排序不影响清单排序；清单排序仍按第 5 节。

现状：活动排序没兑现。按 `raid 优先 → key 字符串` 排（`libraryWeeklyFarming.ts:142-145`、`:169-171`）：没有 per-activity 结束时间，「活动 Hash 数值升序」被写成了字符串比较。返工时按本节口径改；如果活动级结束时间确认拿不到，就把这一维从排序里删掉，不留一个永远相等的比较。武器排序已按五级优先级实现（`libraryWeeklyFarming.ts:124-128`），但受状态可达性问题影响，排序结果跟着偏斜。

**数据来源**

- 轮换：优先使用 Bungie CharacterActivities、Milestones、活动 Definition 和已有的首页轮换资源确认活动身份与状态；不根据固定周序、中文名称或第三方网页正文推算。轮换状态无法确认时，活动不得显示为「本周可刷」。
- 掉落关系：Bungie 没有稳定、完整、可直接查询的活动掉落接口，用本项目维护的 `activity-loot.v1` 受控数据集。没有可靠来源时显示「掉落池暂不可确认」，不根据装备描述、来源文案或名称关键词猜测。
- 推荐：直接消费 T20 的人工来源结果，不建立第二套推荐数据库，不把多个来源拼成虚假的统一 Roll。
- 账号实例：来自共享账号快照，按 canonical 发布版本身份匹配；不同发布版本不得混为同一把。
- 图样进度：只展示 Bungie 当前账号真实返回的进度；已完成、不可制作、进度隐藏和接口未返回是不同状态。

**数据集真实口径**

`activity-loot` 数据集由本项目维护，落在 services / community 数据边界，不写进 UI。它的真实生成方式是 **Manifest 自动推导 + 生成脚本自校验 + 人工抽检**，不是人工 curated，也没有 DIM 交叉核对。

推导链（`scripts/generate-activity-loot.mjs`）：

```text
Collectible 的 sourceString / sourceHash
  → 抽名字槽，与活动定义名求相等（不是包含）
  → 活动 hash（同名多条目时沿用已有记录值）
  → 该 sourceHash 下 itemType === 3 的武器
  → 图样 record：recordTypeName == "武器模式" 且显示名与武器名相等
```

实际字段（`packages/services/src/community/activityLoot.ts:11-30`）：

```text
key                  raid-<活动 hash> | dungeon-<活动 hash>
activity_hash
activity_name_key
activity_kind        raid | dungeon
item_hash
item_variant         normal | reprised（其余取值声明了但没有产生过）
drop_scope           activity（171 条全部是 activity）
pattern_record_hash  可选
source_url / source_license / evidence_note
generated_at         数据集生成时间，不是人工确认时间
```

数据集级：`revision: "2026-09-18.1"`、`manifest_version: "244213.26.06.29.2000-1-bnet.65864"`（`activityLoot.ts:49-55`）。规模：25 个活动（15 raid / 10 dungeon）、171 条武器关系、73 条带图样 record。

与最初设计的差距：

1. `encounter_key` / `encounter_label` 完全没有，`drop_scope` 恒为 `activity`。UI 里 `final_chest / secret_chest / challenge / encounter` 的分支是死代码（`WeeklyFarmingPanel.tsx:170-178`）。要么补遭遇战数据，要么把这些分支和对应的展示承诺删掉。
2. `source_kind`（curated / bungie_collectible_crosscheck / community_crosscheck）不存在，逐关系的 `manifest_version` 和 `enabled` 不存在。
3. 已修：`source_url` / `source_license` 原本是写进每条记录的常量，生成脚本里 DIM 只是一个硬编码占位字符串（`scripts/generate-activity-loot.mjs:155`），脚本从没读过 DIM 的数据。现在署名改为 Bungie Manifest 与生成脚本本身，假的 DIM 引用已删除。
4. 已修：`verified_at` 取生成脚本运行日，不是人工确认时间，原名「证据确认时间」误导。字段改名 `generated_at`，界面按「数据集生成时间」展示，并写明它不表示人工核对过。
5. 部分已修：校验原本只覆盖 key 唯一、`activity_hash` / `source_hash` 有限、名称非空、HTTPS 来源、license、日期格式、条目非空、同活动内 hash 去重（`activityLoot.ts:723-746`）。现在补上 `activity_kind` / `item_variant` / `drop_scope` 的取值校验；生成脚本的自校验从原 4 个活动扩到全量，新增「item_hash 必须能在当前 Manifest 解析成武器」和「一条图样 record 不能挂到两把武器上」。仍未做：`pattern_record_hash` 能否解析成一条图样 record。
6. 仍未做：图样映射只靠 `recordTypeName === "武器模式"` + 名字相等（`generate-activity-loot.mjs:238-251`），没有按 `inventory.recipeItemHash` 双向校验。生成脚本现在会报出「一条 record 挂到两把武器上」，能挡住同名武器互相串记录，但挡不住「名字对上、武器其实不是这把」。

仍然成立的硬规则：

1. 名字槽必须求相等，不能求包含。生成脚本已经遵守，运行时没有。
2. 当前 Manifest 找不到 `item_hash` 时，关系标记为过期，不静默替换同名物品。
3. 普通版、专家版、复刻版使用独立 Hash，不能按中文名称合并。
4. 数据集本身带 revision 与 Manifest 版本；客户端只缓存结果，不修改关系真相。
5. 覆盖范围是全部可推导的突袭与地牢，不限于当周轮换。已日落、当前不可获得的活动也一并收录，Manifest 不标日落，多收录无副作用。
6. 名称只有当前 Manifest 语言的版本（本机为中文）。英文界面靠活动 Hash 命中；Hash 语言无关，名字只作兜底。

**图样进度口径**

正式顺序：

1. 从武器 canonical Hash 找到 `inventory.recipeItemHash`，确认它是可制作输出。
2. 通过 Manifest Record 的 `toastStyle=CraftingRecipeUnlocked` 和规范名称找到图样 Record。
3. 优先读取账号 `ProfileRecords`；Record 为角色范围时再读取各角色 `CharacterRecords`，取已返回且语义有效的记录。
4. 读取 Record 的可见 Objective，使用 `progress / completionValue` 展示进度。
5. `ObjectiveNotCompleted` 或 Objective 未完成：显示「还差 N 个」；已完成且未被 `RewardUnavailable` / `Obscured` 等状态阻塞：显示「已完成」。
6. Record、Objective 或映射缺失：显示「制作进度无法确认」，绝不显示 `0/N`。

现状：四类状态（`not_craftable` / `in_progress` / `complete` / `unavailable`）已经实现，`unavailable` 还细分了 `not_returned | objective_missing | record_hidden | entitlement_unowned | read_failed`（`packages/core/src/weekly/farming.ts:38`），读失败时不会伪造成 `0/N`。以下四条与口径不符：

1. **映射缺失被当成「不可制作」。** `recordHash === undefined` 直接返回 `not_craftable`（`packages/services/src/community/activityLoot.ts:768`），但 `recordHash` 来自生成期的名字相等匹配。武器真的可制作、只是名字没对上时，会被确定性地标成「不可制作」而不是「制作进度无法确认」。171 条里有 98 条没有 `pattern_record_hash`，全部走这条路。这是刷取事实要修的重点。
2. **没有 CharacterRecords 回退。** 只读 Profile Records（`packages/desktop/src/main/ipc/library.ts:158-175`、组件 900），角色范围的图样会一律变成「图样无法确认」。
3. **可能泄露 `0/N`。** `progress = Math.max(0, objective.progress ?? 0)`（`activityLoot.ts:788`）：Bungie 返回了 `completionValue` 但没给 `progress` 时会显示 `0 / N`。
4. **没有解码 `RewardUnavailable`（状态位 `&2`）。** 现在只解 `&32`（EntitlementUnowned）、`&8`（Obscured）、`&16`（Invisible）（`activityLoot.ts:773-778`），`complete` 只由 objective 推导（`:789`）。被 `RewardUnavailable` 阻塞的图样不得显示「已完成」。

另外 `weeklyFarmingItemDetail.ts:21` 的兜底 `items.find(...)` 不校验 `group_key` 和武器身份，可能返回同 hash 的非武器条目，要一并修。

**首版能承诺 / 不能承诺**

能：当前轮换突袭与地牢；受控数据集已覆盖的活动级武器来源；T20 推荐状态；账号内同一 canonical 版本的实例与最佳匹配；可确认的图样进度；每条结论的来源、版本和更新时间。

不能：自动从 Bungie 推导完整掉落池；所有活动、所有异域任务和所有隐藏宝箱；没有证据时的「完整掉落数量」；仅凭同名判断复刻版、专家版或旧版已经满足。

**轮换匹配的实测 bug**

`activityMatches`（`packages/services/src/community/activityLoot.ts:799-808`）先比 hash，hash 不中时退化为子串包含 `title.includes(normalizeActivityName(name))`，并用 `Array.find` 取首个命中。

T74 §4 已经证明名字槽必须求相等、不能求包含，生成脚本遵守了，**运行时没有**。后果：数据集里 `raid-119944200`（利维坦，星之塔）排在 `raid-2693136600`（利维坦）之前，轮换标题是「利维坦」时会先命中星之塔，显示 2 把星之塔武器而不是本体利维坦的 8 把；「世界吞噬者，利维坦」同理被截胡。只有 milestone 下发的 hash 恰好等于数据集记录的 hash 时才被掩盖，而 T74 §3 已证实重复条目并不总是相等。

修法：hash 不中时返回「未覆盖」，不做字符串回落；确实需要回落时只允许完全相等。

**资料库的重复挂载点**

已落地：资料库只保留「装备」和「Perk 与框架」两个查询模式，`weekly_farming` 已从 `LibraryViewMode`、资料库视图和资料库加载器里删除，老深链接落到账号「待办」的对应入口。本周刷取只有行动行展开区一个挂载点。

**加载时机与失败状态**

已落地：

- 两份资源都改成进「待办」才读。任务资源由 `ensurePursuits()` 触发（`packages/desktop/src/renderer/features/account/useAccountWorkspace.ts`）：没进过「待办」的会话不跑 202 + 900 + record 定义那条链，进过之后才跟着账号刷新一起更新。本周刷取在同一处触发 `loadWeeklyFarming(false)`（`packages/desktop/src/renderer/features/library/useLibraryWorkspace.ts`），同一批活动读过就不再读第二遍。
- 待办的「重试」把任务资源与首页简报各重读一次；只重试其中一份修不好另一半。
- `weeklyRotationError` 只在周报确实没随本次读取返回时才有值（`packages/desktop/src/renderer/pages/providers/AccountMenuProvider.tsx`）。日报那半失败、或只是保留上一份结果，都不算轮换失败；文案用刷取面板自己的「本周轮换无法更新」，不再借用首页简报那一句。
- 待办里那个「永远走 if」的死分支（`props.weeklyFarming ? … : <AccountInlineState …>`）随独立刷取面板一起删除。

## 8. 刷新、缓存与失败

六份资源各自独立，分开刷新和显示状态：

| 资源 | 真相 | 刷新触发 | 缓存键 |
|---|---|---|---|
| 轮换 | Bungie 实时活动 / 里程碑 | 每周窗口、手动刷新、账号事件 | Bungie Profile / period key |
| 任务 | CharacterProgressions 202 + ProfileRecords 900 | 账号同步、写后局部 patch | account + profile minted timestamp |
| 掉落关系 | `activity-loot` 受控数据集 | Manifest 更新、数据集 revision 更新 | activity hash + manifest version + dataset revision |
| 推荐 | T20 | 推荐库 revision 更新 | item hash + recommendation revision |
| 账号实例 | 共享 AccountSession | 账号同步、写后局部 patch | account + profile minted timestamp |
| 图样进度 | Bungie Records | 账号同步、展开详情时按需读取 | account + profile minted timestamp + record hash |

- 清单在任一资源失败时保留其他资源已确认的事实，只在对应行动项的对应事实上标出不可用，不清空整张清单。
- 刷新入口按资源分开，不用一个按钮暗示所有资源已同步。视图内拆成「刷新本周轮换」和「重新核对图样与推荐」。
- 首屏先显示已确认的活动和身份，推荐、实例与图样状态在各自区域补齐，不做成一个巨型阻塞请求。
- 任务资源复用中央账号 Session 和账号刷新事件，不建立账号页私有缓存、私有轮询或第二套刷新按钮；独立 `loading / stale / partial / error / synced` 状态，不阻塞装备、容量、仓库和邮政官首屏。
- 任务失败时页面同时出现「任务同步失败…」和状态标签「等待重新同步」（`accountPage.ts:801`），两个文案要统一到同一套状态命名。
- epoch 变化时 `packages/services/src/account/session.ts:303-305` 抛出的「任务结果已作废」会被吞成资源 error，页面读作「任务同步失败」。这类作废与真实失败要分开显示。
- 缓存互删风险：`session.ts:685-694` 的 `pruneSupersededProfileCaches` 会删除同账号其它组件集缓存，202 / 900 的读取与装备快照会互相淘汰，下一次退化成完整 Profile 远端请求。实施时确认这是预期行为。
- 写操作触发的受控重读要真正接通。现状 `invalidate({scope: "pursuits"})` 是死代码：唯一入口 `packages/desktop/src/main/runtime/accountSession.ts:193` 只被 `{scope:"item"}` / `{"item-details"}` 调用（`accountSession.ts:201-205`、`packages/desktop/src/main/ipc/actions.ts:546`），实际靠整账号刷新顺带 `refreshPursuits(true)`。
- 新请求淘汰旧请求结果，避免轮换变化或连续点击后由较慢旧响应覆盖新清单。
- 持久化只保存最后确认的资源与数据时间，不保存 Token、Cookie、完整 Profile 或未确认的乐观状态。
- 按需加载：进入「待办」才加载任务资源与图样记录。已落地：`ensurePursuits()` 只在进过「待办」之后才读，账号刷新不再无条件 `void refreshPursuits(true)`（原先在 `packages/desktop/src/renderer/features/account/useAccountWorkspace.ts:321`）；没进过「待办」的会话不跑 202 + 900 + `/Settings/` + record 定义这条重链，进过之后才由账号刷新事件带着更新。

## 9. 响应式与操作

- 宽屏在「待办」模式内使用稳定的二级导航、行动分组和紧凑行动行；窄屏先显示单行分段控件，再按段、行、事实的顺序回到单列，不保留横向大表格。
- 从首页活动卡、资料库、仓库或商人深链接进入时，先定位到对应活动或武器，再允许返回「待办」；返回操作不丢失原页面筛选上下文。
- 首层不铺开多个推荐来源表格；详细证据由玩家展开。
- 展开的开关是**整条行动行**，不是行末的小字。点名称、图标、行内空白处都要能展开；只有整行可点才算数，把开关缩成一行提示文字等于玩家点不到。
- 行动行是可聚焦的展开控件：`Tab` 能停在行上，`Enter` / `Space` 展开和收起，展开后焦点进入详情，收起后返回来源行。
- 活动和武器使用稳定键盘焦点顺序，展开后焦点进入详情，收起或关闭后返回来源项。
- 状态必须同时使用文字与颜色，不能只用绿色、黄色或复选框表达。
- 长 Perk 名称和多来源内容允许换行或内部滚动，不截断关键信息。
- 加载、部分失败和旧数据状态保留页面骨架，不用整页遮罩清空旧内容。

## 10. 与首页的分工

- 首页保留刷新节奏、周信号、活动摘要和商人库存四层结构，不承载行动清单，也不展示任务清单、任务进度或任务资源状态。
- 两处共用同一份实时数据。首页简报的 `components=200,204` 请求已经把全角色的 `availableActivities`（含每个活动的挑战、Objective 进度、`visibleRewards`、`modifierHashes`）拉回来了（`packages/core/src/weekly/liveData.ts:160`）。「待办」直接消费这份结果，不发第二次轮换请求；本条目新增的只有分类与分桶两层纯函数。
- 首页不展示「待办」摘要卡，也不对行动做排序或结论。活动卡继续按 T74 显示活动级掉落池武器，点击后进入账号「待办」里的对应行动项。
- 首页的「查看本周刷取」深链接落到账号「待办」里对应的行动行并展开它，不落到独立分区——刷取已经不是入口，没有可以单独落脚的分区。行动挑战一律在「周常」段，所以深链接先切到该入口，再由行动行自己完成展开和滚动。
- 同一个活动在两处出现时，两处显示的是同一份事实，不是两套判断。
- 首页活动卡与「待办」用同一份分类结果。一个活动能不能算本周日落 / 轮换行，两处共用这一个判定，不按页面各筛一次。
- 若后续需要极短时限提醒，应建立独立需求验证价值并提供关闭能力，不直接恢复首页卡片。

## 11. 非目标

- 不做跨行动的「哪个最值得做」排序，不比较不同行动之间的价值。
- 不做提光推断，不给「做完这个一定能提升」或「可能提升」这类结论。
- 不新增数据能力，不新增第二份轮换请求、第二套账号缓存或页面私有轮询。
- 不自动领取、完成、装备、分解或转移任何东西。
- 不把二级入口做成各自取数、各自刷新的独立页面。
- 不把所有声望、成就、收藏品、催化剂、赛季等级做成任务中心。
- 不复制 DIM 的 Progress / Milestones / Ranks / Pathfinder 页面。
- 不使用中文 / 英文名称关键词、固定完成百分比、固定周期或示例数据充当事实。
- 不提供活动攻略、机制教学、队伍招募或自动匹配。
- 不承诺某次活动必定掉落指定武器或指定 Perk。
- 不根据玩家持有数量自动删除实例，也不替玩家决定主观毕业标准。
- 只展示本周实际轮换且存在可靠掉落依据的活动与装备，不维护全历史掉落百科或固定周期推算。
- 首版不展示无法可靠确认的专家版掉落。

## 12. 修复清单与落地状态

「现状」写的是本条目的返工点；已经做完的条目在「目标」里标出来，不再单独开一份归档。

| 域 | 位置 | 现状 | 目标 |
|---|---|---|---|
| 时限分桶 | `liveData.ts:1022-1024` | 日落判定靠挑战目标名「宗师先锋警戒」正则，本机 Manifest 全库 0 命中 | 已落地：改按 `activityTypeHash 575572995` 判定，名称正则降为兜底 |
| 时限分桶 | `liveData.ts:1034-1039` | 只有突袭（2043403989）和地牢（608898761）有 Hash 判定 | 已落地：扩到日落、熔炉竞技场、奥斯里斯试炼、铁旗、梦魇狩猎、赛季竞技场、智谋、打击；智谋 58 个活动只有 2 个带挑战、打击 202 个只有 1 个，其余靠名称正则兜底 |
| 时限分桶 | `liveData.ts:1047` | 日落分支只认 `activityTypeHash 575572995`，不要求活动带本周挑战目标；四类里只有它放行无挑战的活动。角色的日落类型活动里混着「行动」变体（火力战队行动（史诗 / 闪击）、熔炉竞技场霸权、单人行动、巅峰行动），没有挑战目标、没有奖励，只是可以启动；首页日落卡 6 行里 5 行是它们（2026-09-21 实窗） | 已落地：日落分支与其余三类一样要求 `objectiveTexts.length > 0`，首页日落卡只剩真正带挑战的本周日落；简报缓存 `version` 升到 11 作废同周的旧缓存 |
| 时限分桶 | `liveData.ts:961-976` | 里程碑分类靠名称正则，试炼与铁旗被 `return undefined` 显式排除（`:962`） | 已落地：按活动 Hash 分类，试炼与铁旗接出为活动挑战 |
| 时限分桶 | `liveData.ts:144-205`、`summary.ts:3-9` | 结果按内容类型分 5 个 priority（nightfall / rotating_raid / rotating_dungeon / weekly_surge / special_event） | 已落地：内容类型降为行上的 `activity_kind`，分桶改按第 4.4 节的时限 |
| 时限分桶 | `pursuits.ts:341-351` | 任务与赏金不读到期时间分桶 | 已落地：`deriveTimeFrame` 按每日、每周重置边界给出 `time_frame`，分桶与段顺序见 `accountPage.ts:911-915` |
| 时限分桶 | `pursuits.ts:132,272` | `itemTypeDisplayName` 只当 `type_label` 展示 | 不参与分桶；时限只读 Bungie 返回的到期时间 |
| 任务与赏金 | `packages/core/src/account/summary.ts:2551`、`pursuits.ts:260` | 可见 Objective 全完成即 `completed_pending_action` | 已落地：完成判据改用**全部**目标，被标为不可见的目标未完成时不报已完成 |
| 任务与赏金 | `pursuits.ts:258-264` | inventory 路径无 `completed_confirmed` | 已澄清：已领取的赏金和任务步骤会直接从背包消失，Bungie 也没有等价的 redeemed 标志位。`completed_pending_action` 就是这条路径的准确状态，不补确认分支，代码里写明原因 |
| 任务与赏金 | `pursuits.ts:90,226` / `accountPage.ts:928-931` | 计数的 `now` 固化在抓取时刻，分组用渲染时刻，快照放一会儿就对不上 | 已落地：清单计数、排序和行上的剩余时间都读快照观测时刻 `snapshotNow`；core 的 `pending_count` / `expiring_count` 现已没有消费方 |
| 任务与赏金 | `pursuits.ts:384-388` | `isExpiring` 的 24 小时阈值写死；对应的 `expiring_count` 已没有消费方 | 已落地：`expiring_count` 保留，阈值收成命名常量 `expiringWindowMs`，口径不变 |
| 任务与赏金 | `pursuits.ts:302` / `accountPage.ts:1092` | `id = ${characterId}:${instance_id ?? hash}`，同一角色内两条无实例的同 hash 项会撞键，UI 的 `key: pursuit:${id}` 随之重复 | 已落地：重复项追加出现序号 `#n`，不重复的项 id 不变 |
| 任务与赏金 | `pursuits.ts:11-30` | 模型缺 `quantity` | 已落地：`AccountItemSummary` 与 `AccountPursuit` 都补上 `quantity`，Bungie 未返回时留空，不补 1 |
| 任务与赏金 | `pursuits.ts:136,181` | 时间戳未归一 | 已落地：里程碑 `endDate` 与记录 `expirationInfo.expirationDate` 都走 `normalizeTimestamp` |
| 任务与赏金 | `pursuits.ts:198-203` | `data_state: "confirmed"` 判据不足 | 已落地：定义查不到、任务状态未返回、赛季记录条目缺失任一出现即降级 `partial` |
| 任务与赏金 | `packages/services/src/account/session.ts:165` | 301 不在 pursuit 组件集 | 已澄清：任务物品和它们的 Objective 都来自装备快照（含 301），pursuit 这次读取只负责 202 / 900。两半读取时间可能不同，已在 `pursuits.ts` 写明 `observed_at` 记的是任务读取时刻 |
| 任务与赏金 | `packages/desktop/src/main/runtime/accountSession.ts:193` | `scope:"pursuits"` 是死代码 | 保留：本产品按第 10 节不写任何任务状态，眼下没有写操作可挂。删掉它会让将来接通写后重读时仓库缓存继续返回旧结果，因此留着这个分支 |
| 任务与赏金 | `useAccountWorkspace.ts:321` | 账号刷新无条件拉任务组件 | 已落地：改由 `ensurePursuits()` 在进入「待办」时触发；没进过待办的会话，账号刷新不再顺带重读 |
| 任务与赏金 | `AccountPageContentView.tsx` | 无任务重试入口 | 已落地：`refreshTasks` 同时重读任务资源与首页简报里的轮换 |
| 任务与赏金 | `AccountPageContentView.tsx` | 行不可交互 | 已落地：`AccountActionRow` 整行是展开开关，可 `Tab` 聚焦、`Enter` / `Space` 展开 |
| 任务与赏金 | `accountPage.ts:1099-1150`、`AccountPageContentView.tsx:893,1105,1476` | 行状态、事实标签和空态文案是硬编码中文，没走 `accountText` | 按现有 `accountText` 口径收进 copy 文件 |
| 任务与赏金 | `useWebFixtureRuntime.ts:596-624` | Web 预览无任务数据 | 补同形状 fixture 或标明不覆盖 |
| 提光 | `accountTodoChallenges.ts:39` | 名称正则判定奖励等级 | 已落地：正则只回答「奖励名里有没有等级占位词」，不再产出等级结论 |
| 提光 | `accountTodoChallenges.ts:39-43` | 判据只看奖励物品名字。突袭的周常挑战奖励名是「突袭装备」，与地牢的「强力装备」同属 `装备阶级5`，名字对不上就整档漏掉（2026-09-21 真实账号只看到 2 项地牢） | 已落地：判据同时读奖励物品的 `item_type`（`装备阶级N`），提光在真实账号上由 2 项变 4 项（两个突袭 + 两个地牢） |
| 提光 | `accountTodoChallenges.ts:84-88` | 等级未知项被整体过滤 | 已落地：`unknown` 落到可执行性第 3 档，行照常显示 |
| 提光 | `accountPage.ts:1120-1152` | 行曾输出 `valueLabel` / `reason` 这类提光推断 | 已落地：推断文案随模块删除，行正面只给挑战状态与官方奖励名原文 |
| 提光 | `accountPage.ts:1146-1150` | 无来源与时间字段 | 已落地：每条事实带来源，面板顶部给快照数据时间 |
| 提光 | `accountTodoChallenges.ts:16` | 状态缺「已过期 / 读取失败」 | 按第 6 节的事实分级补齐 |
| 提光 | `accountTodoChallenges.ts:72`、`briefingStore.ts:18`、`weeklyApi.ts:17`、`homeDashboard.ts:57`、`HomePageContentView.tsx:41,67` | 周报的时限来源键集合在 core 之外另有四份手抄副本。旧简报缓存里的 `priorities` 少 `activity_challenge`，同一周的缓存又不会被周期检查换掉，读 `.entries` 直接抛错，React 19 把整棵树卸载，点「账号」得到白窗（2026-09-20 实窗复现） | 已落地：简报缓存 `version` 升到 10 作废旧缓存；四处副本改为引用 core 的 `WeeklyPriorityKind`；缺这个键时按空数组处理 |
| 提光 | `accountPowerRoute.ts` | `周期：每周重置：…` 前缀叠加 | 已落地：文案随模块删除 |
| 提光 | `useDesktopProductShell.tsx:195-198` | 账号刷新不含挑战状态 | 账号刷新同时刷新简报 |
| 账号名 | `AccountPageContentView.tsx:517` | 账号名挂 `data-info-priority="display"`，命中共享层的 24px。选择器比菜单自己的 `.account-band-heading h2`（18px）更具体，菜单规则永远不生效；待办页上账号名与页面标题同为 24px，看不出层级 | 已落地：去掉该属性，账号名回到菜单声明的 18px，页面标题保持唯一的 24px |
| 本周刷取 | `activityLoot.ts:799-808` | hash 不中时名称子串回落 | 已落地：返回「未覆盖」，不做字符串回落 |
| 本周刷取 | `activityLoot.ts:768` | 图样映射缺失报成 `not_craftable` | 已落地：改为「制作进度无法确认」，并区分 `pattern_not_mapped` / `progress_missing` / `reward_unavailable` 三种原因 |
| 本周刷取 | `activityLoot.ts:788` | `progress` 缺失时泄露 `0/N` | 已落地：缺失即无法确认 |
| 本周刷取 | `activityLoot.ts:773-778` | 未解码 `RewardUnavailable`（`&2`） | 已落地：补状态位 |
| 本周刷取 | `packages/desktop/src/main/ipc/library.ts:158-175` | 无 CharacterRecords 回退 | 已落地：跟随 901 读取并按 record Hash 摊平合并；本机 Manifest 里 183 条武器模式 record 有 32 条是角色作用域 |
| 本周刷取 | `weeklyFarmingItemDetail.ts:21` | 兜底 `items.find` 不校验身份 | 已落地：兜底匹配要求命中项 `group_key` 为 `weapons` |
| 本周刷取 | `libraryPage.ts:211`、`LibraryPageContentView.tsx:114,249,335`、`useLibraryWorkspace.ts:131,212` | 资料库保留 `weekly_farming` 模式 | 已落地：`LibraryViewMode`、资料库视图和加载器都不再有该模式，老深链接落到账号「待办」 |
| 本周刷取 | `AccountMenuProvider.tsx:13-15` / `useLibraryWorkspace.ts:130-133` | 加载时机不一致 | 已落地：两处都改由进入「待办」触发，同一批活动读过不重复读 |
| 本周刷取 | `AccountMenuProvider.tsx:51-52,61` | 轮换失败复用首页简报状态 | 已落地：只有周报确实没读到才算轮换失败，文案用刷取面板自己的说法 |
| 本周刷取 | `AccountPageContentView.tsx` | 永远走 if 的死分支 | 已落地：独立刷取面板删除，改为行动行展开区 |
| 本周刷取 | `libraryWeeklyFarming.ts:142-145,169-171` | raid 优先 + 字符串比较 | 已落地：改按可刷项 → 覆盖是否已确认 → 活动 Hash 数值 → key 兜底，全部与语言无关 |
| 本周刷取 | `libraryWeeklyFarming.ts:213` | 自拼推荐摘要 | 复用统一摘要口径 `Perk x/y · 完整 x/y` |
| 本周刷取 | `WeeklyFarmingPanel.tsx:170-178` | 遭遇战分支是死代码 | 补数据或删分支 |
| 本周刷取 | `WeeklyFarmingPanel.tsx:61,121,124,129-136` | 展开详情五项未兑现 | 补齐或从承诺中删掉 |
| 本周刷取 | `WeeklyFarmingPanel.tsx:84-88` | 缺「信息不足」计数与活动结束时间 | 补计数；结束时间无来源则不显示 |
| 本周刷取 | `WeeklyFarmingPanel.tsx:19,30` | `compact` prop 无调用方 | 删除或使用 |
| 本周刷取 | `activityLoot.ts:11-30,49-55` + `generate-activity-loot.mjs:155` | 来源署名含假 DIM 引用，`verified_at` 名称误导 | 已落地：署名改为 Bungie Manifest + 生成脚本，字段改名 `generated_at` |
| 本周刷取 | `activityLoot.ts:723-746` / `generate-activity-loot.mjs:78-83` | 不校验 `item_hash` 与 `pattern_record_hash`；自校验只覆盖 4 个活动 | 已落地：校验补上 `activity_kind` / `item_variant` / `drop_scope` 取值；生成脚本自校验扩到全量，新增「item_hash 必须能在当前 Manifest 解析成武器」和「一条图样 record 不能挂到两把武器上」 |

## 13. 验收标准

### 数据正确性

- 同一账号、同一服务器 Profile 在两台设备上分类、状态、数量和排序一致。
- Quest / Bounty / Seasonal 的分类来自稳定 Hash / definition 关系；名称和语言变化不改变结果。
- 任务物品、角色里程碑和记录项目能区分来源，不重复计数；Objective 进度、完成值、可见性、追踪和到期时间均来自 Bungie 字段，缺失时明确显示未知或部分。
- 「待处理数量」不把普通进行中任务总数当成已完成待处理数量；`completed_pending_action` 只包含确实可领取 / 可兑换 / 可继续处理的项目。
- 计数与分组来自同一时间基准，磁盘缓存在跨天后不自相矛盾。
- 每一项的时限桶由 Bungie 返回的到期时间或活动身份决定，不由名称、`itemTypeDisplayName` 或固定周期决定；段顺序固定，段在有条目时才出现，二级按钮上的计数与面板可见行数一致。
- 日落、熔炉、智谋、打击的活动只要随 `components=204` 返回，就必须能被分类；分类结果不随活动正式名称的中英文变化而改变。
- 提光入口只展示可证事实：活动、角色、完成状态、官方奖励名、来源与时间；三个角色的活动按各自状态显示；「巅峰奖励」在页面与代码里都不存在。
- 当前轮换与 Destiny 2 实际状态一致，不使用固定周序猜测；展示的每件掉落装备都能追溯到明确数据源和版本。
- 推荐等级、Perk 要求和实例匹配与 T20 的装备详情及仓库结果一致；推荐摘要复用统一口径。
- 当前持有数量、版本和最佳实例与共享账号快照一致；可制作状态和红框进度与游戏内一致，缺失数据不显示为 0。

### 页面感知

- 玩家能在「账号 → 待办」一眼看到还有哪些事没做完，切换二级入口不改变同一项行动的事实。
- 玩家一眼能看出哪些事今天不做就没了、哪些本周内做完就行、哪些不限时；同一项行动在「全部」和任一入口里落在同一段。
- 日落、熔炉、智谋、打击里的本周挑战能在清单里找到，不会因为挑战目标名和代码里的正则对不上而整类消失。
- 入口只按第 7 节的谓词收放：同一条行动在「全部」和它所属的入口里都存在，不会因为 `rewards` / `loot` 等事实缺失而整条消失，也不因为事实齐备而凭空多出。
- 「提光」横跨三个时限段：同一个地牢周挑战在「周常」和「提光」里都出现，换入口不改变它落在哪一段。
- 任务同步期间旧列表不消失，页面显示同步中和数据时间；失败不清空其他账号页内容，并提供重新拉取任务、赏金与活动挑战的入口。
- 玩家不展开详情也能看懂本周有哪些活动、哪些武器值得刷以及当前主要缺口；展开后能进入来源评价、推荐 Roll、当前最佳实例和制作进度。
- 「系统已满足」和「玩家不再刷」有明确区别，不使用含义不明的复选框。
- 空账号、组件失败和确认无待处理三种情况分别有可理解的文案，不用示例任务填充。
- 「全部」末尾的账号级事实三行常驻显示，只读、不参与分段：光等与游戏内各角色一致，邮政官件数与游戏内一致，容量的任务槽位按当前角色计。三行的数据时间标的是账号快照时间，与清单的数据时间分开。
- 用户可见文案全部有中文登记，英文界面不出现裸中文。
- 界面不出现内部字段名、数据集标识或版本字符串（按第 6.1 节）；版本信息只在分区顶部出现一次。
- 宽屏、窄屏、键盘和手柄操作均能完成切换、展开和关闭。
- 点行动行的名称、图标或行内空白处都能展开详情，不需要精确点到某一行小字。

### 架构与性能

- 行动清单不让装备、容量、仓库和邮政官首屏进入等待任务或图样数据的阻塞链；进入「待办」才加载任务资源与图样记录。
- 不新增页面私有轮询或第二套账号缓存；刷新和写操作遵守中央 Session 的确认语义。
- 三类资源失败互不阻塞：掉落池、图样或推荐失败不影响轮换清单、账号页或首页。
- Web 与 Desktop 使用同一个 `packages/ui` 页面实现，平台壳不复制产品 UI。

### 真实账号验收步骤

1. 打开「账号 → 待办」，确认五个二级入口在同一份 Profile 下事实一致、排序稳定。
2. 核对分桶：各找一个每日赏金、每周赏金、不限时任务和日落挑战，确认它们分别落在日常 / 周常 / 周常 / 周常，切到「提光」后仍在各自的时段里。
3. 确认日落、熔炉、智谋、打击里的本周挑战能在清单里找到，而不是整类缺席。
4. 分别切换三个角色，核对每项挑战与任务的完成状态与游戏内一致；找一项已完成挑战，确认它按可执行性排在「周常」段的后面，而不是另起一个折叠区。
5. 找一件图样进行中的武器，核对 `进度 / 总数` 与游戏内一致；找一件已完成图样，确认显示「图样已完成」，不会显示 `0/N`。
6. 找一件映射缺失的可制作武器，确认显示「制作进度无法确认」并给出具体原因，而不是「不可制作」。
7. 找一个奖励名未返回或定义查不到的活动，确认显示「无法确认」且没有被静默删除。
8. 在游戏内完成一项挑战后按账号刷新，确认完成状态更新。
9. 对账号已有实例的武器，核对持有数量、位置和当前最佳实例；打开详情后与仓库 T20 结论一致。
10. 分别点「刷新本周轮换」和「重新核对图样与推荐」，确认各自显示进行中状态，旧内容保持可见，完成后读取时间与结论更新。
11. 在「全部」末尾核对账号级事实三行：光等与游戏内各角色一致，邮政官待领取件数与游戏内一致，容量行的任务槽位占用按当前角色计、仓库占用与仓库页一致；确认这三行在任何二级入口里都不出现。
12. 在窄窗口检查回到单列；用键盘切换二级入口并上下移动操作按钮，焦点不丢失。

## 14. 实施切片

「导航与清单骨架」这一轮落地的是第 2、3、6 片；第 1、4、5、7、8 片随后落地，剩余待做的是第 9 片。

| # | 切片 | 状态 |
|---|---|---|
| 1 | **活动分类**：把日落 / 熔炉 / 智谋 / 打击等类型从挑战目标名正则改为 `activityTypeHash` 判定（Hash 见 4.4），名称正则降为兜底；试炼从 `inferWeeklyActivityKind` 的排除名单里接出输出口。 | 已落地 |
| 2 | **时限分桶**：`packages/core/src/account/pursuits.ts` 的 `deriveTimeFrame` 按到期时间与每日、每周重置边界给出 `time_frame`；`packages/app/src/workspaces/accountPage.ts` 的 `todoBucketForTimeFrame` 把它折成三个段，`compareTodoEntries` 实现第 5 节排序。时限只读 Bungie 返回的到期时间与活动身份，不读 `itemTypeDisplayName`，不引入新数据源。 | 已落地 |
| 3 | **导航**：三个平级分区改为同一清单的五个二级入口，谓词按第 7 节开头那张表；「提光」用 `data-axis="kind"` 与时限桶隔开。 | 已落地 |
| 4 | **事实缺失态**：把静默过滤改为「无法确认 + 原因」。 | 已落地 |
| 5 | **数据修复**：按第 12 节清单修运行时匹配、图样状态位、计数时间基准。 | 已落地（第 12 节里界面层与接线层的条目留待后续） |
| 6 | **UI**：`packages/ui/src/account/` 落地二级导航与行动行，展开区嵌现有的 `WeeklyFarmingPanel`；「刷取」不再有独立面板。 | 已落地 |
| 7 | **按需加载**：任务资源与图样记录改为进入「待办」才加载；删除资料库的 `weekly_farming` 模式。 | 已落地 |
| 8 | **「全部」末尾的账号级事实**：光等、邮政官、容量三行，只读、不参与排序。 | 已落地 |
| 9 | **真实账号验收**：按第 13 节的步骤走。 | 待做 |

## 15. 编号说明

- T43「任务待处理中心」、T44「光等提升路线 → 本周挑战清单」、T45「本周刷取清单」三个编号冻结保留，不单独占行，追溯用 Git 历史。
- 三个需求的设计、实测证据和待实施修复清单已全部并入本文；实施时只按本文执行。
- T44 的推荐语义已撤销：它不再消费 T20 推荐结果、来源事实或推荐 revision，因此 T56 统一推荐模型对本条目无影响。T43 与 T45 消费推荐结果，口径按 T56 定。

## 附录 A：数据源调研（2026-09-10）

### A.1 结论

可以实现，但不能把「Bungie 当前返回的活动奖励」直接当成完整掉落池。

- 本周轮换、活动身份、挑战进度和奖励等级：可以用 Bungie 实时 Profile / Public Milestones 与当前 Manifest。
- 武器是否属于某个活动的候选来源：可以用 Manifest `DestinyCollectibleDefinition.sourceHash/sourceString`，并参考 DIM 的 D2AI 来源映射。
- 某次突袭或地牢的完整武器—遭遇战掉落表：Bungie 没有提供稳定、完整、可直接查询的公开接口，必须使用本项目自己维护的受控数据集。
- 制作图样进度：可以用 Manifest 中 `completionInfo.toastStyle = CraftingRecipeUnlocked` 的 Record，加上 Bungie Profile `Records` 的 Objective 进度。

首版采用「实时事实与静态关系分层」方案，而不是继续寻找一个不存在的单一 API。

### A.2 已核实的数据能力

| 事实 | 可用来源 | 核实结果 | 允许的用途 |
|---|---|---|---|
| 当前轮换活动 | Bungie `CharacterActivities`、`Public Milestones`、活动 Manifest | 当前账号样本能返回轮换突袭 / 地牢及角色挑战 | 判断本周活动身份、开放窗口和角色完成状态 |
| 周挑战奖励等级 | 活动挑战的 `displayRewards[].itemQuantity`，旧定义兼容 `dummyRewards` | 只能读到奖励名原文；本机 Manifest 中带等级占位词的 19 个活动全是「强力装备」且全是地牢，「巅峰装备」为 0 条 | 不作为等级真相，也不用于武器掉落池 |
| 装备活动来源候选 | Manifest `DestinyCollectibleDefinition.sourceHash/sourceString` | 当前 Manifest 中突袭 / 地牢武器可解析到活动来源；装备定义自身 `sourceData` 当前为空 | 生成活动级候选装备，并作为掉落证据之一 |
| 图样身份 | Manifest `DestinyRecordDefinition.completionInfo.toastStyle = 8` 与同名武器定义的 `inventory.recipeItemHash` | 当前版本 183 条图样 Record 与 183 个可制作输出能按名称一一对应；仍需保留 Hash 级校验 | 找到武器图样 Record 和制作模板 |
| 图样进度 | Bungie Profile `Records.data.records[recordHash].objectives[]` | 真实样本出现 `0/5`、`2/5`、`5/5`、`1/2` 等进度；`state` 可区分未完成、已完成、不可用等位 | 展示红框 / 图样进度，缺失时显示「无法确认」 |
| 账号实例与 Roll | 共享 `AccountSnapshot`、T20 推荐匹配结果 | 已有正式版本匹配与七类状态 | 生成「继续刷 / 已有合格 Roll / 当前已满足」 |

### A.3 掉落池数据源评估

**Bungie Manifest / API：权威但不完整。** `DestinyCollectibleDefinition.sourceHash/sourceString` 能回答「这个物品通常来自哪个来源」，但不能回答每个遭遇战具体掉哪些武器、普通宝箱与隐藏宝箱和挑战宝箱的差异、专家与普通和复刻与原版的区别、某个活动当前是否仍能重复获取。`DestinyActivityDefinition.rewards`、挑战 `displayRewards` 也不是完整武器掉落表——`visibleRewards` 与日落的 `displayRewards` 可以是同一份普通掉落，两者都不能复用为掉落池。

**DIM / d2-additional-info：适合作为来源候选和维护参考。** 本地 DIM 的 `source-info-v2.ts` 由 D2AI 构建生成，不应手工修改；DIM 与 `d2-additional-info` 均采用 MIT License。它适合用于活动级来源候选、版本与复刻装备的 Hash 参考、新 Manifest 发布后的差异核对，但不包含完整「遭遇战 → 掉落物」关系，不能单独作为完整掉落池。**实际生成脚本没有读取 DIM。**

**Felicity 等社区项目：有完整表，但不能直接复制。** 本地调研到 Felicity 的 `LootTables.cs`，它采用手工维护的活动、遭遇战和物品 Hash 表，能证明完整遭遇战掉落表需要维护关系数据，而不是从 Bungie 运行时推导。该项目使用 AGPL-3.0，其数据维护与本项目许可、来源链不一致，因此不直接复制代码或表，最多作为人工交叉核对材料。没有明确许可的网页、攻略站和在线表格同样不作为运行时依赖或直接 vendoring 来源。

## 附录 B：T56 统一推荐模型的复验（2026-09-16 登记，2026-09-20 复验）

T56 改了推荐来源的输入形状与口径。逐条核过，四条里两条已经符合，两条仍不符：

| 位置 | 原表述 | 复验结果 |
|---|---|---|
| 数据来源 | 「哪些武器被可靠推荐来源评价为值得刷」「推荐来源分别要求哪些 Perk 或完整组合」 | **不符**。`bestRecommendationMatch` 自己拼 `` `${source.source_label} · ${source.matched_requirement_count}/${source.requirement_count}` ``（`packages/app/src/workspaces/libraryWeeklyFarming.ts:213`），没有用统一摘要（`packages/ui/src/recommendationMatchView.ts:508-517` 的 `Perk x/y · 完整 x/y · N 项无法判断`）。返工时改为复用统一口径，并把 `perk_requirement_count` / `uncheckable_*` / `recommendation_state` 这些已有字段用起来。 |
| 边界 | 「DIM 完整组合」「消费 T20 的人工来源与 DIM Wishlist 结果」 | **表述已过期**。「DIM 愿望单」不再是用户概念，DIM 文本只是一种来源格式；来源类型不进消费分支这条已遵守，文档里残留的写法要一并清掉。 |
| 展开详情 | 「各推荐来源的等级、结论和必要备注」 | 符合。没有显示来源等级，也没有按来源类型分叉。 |
| 缓存键 | 「缓存必须带活动身份、资料库版本、推荐 revision、账号 Profile 时间和算法版本」 | 符合。没有残留「人工知识库 revision + DIM revision」这类双输入。 |

另外两条对外的行为变化：导入身份改为「用户命名 + 新建 / 覆盖」，一个可管理来源 = 一份导入文档；schema v11 删掉旧 CSV 表族后，CSV 需用户重新导入一次（DIM 侧不用）。
