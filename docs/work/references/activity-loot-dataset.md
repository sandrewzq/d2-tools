# activity-loot 数据集：轮换活动 → 武器掉落关系

> 类型：数据源与维护参考。数据集真源是 `packages/services/src/community/activityLoot.ts` 的
> `#region activity-loot-dataset` 区段，生成与自校验脚本是 `scripts/generate-activity-loot.mjs`；
> 本文件记录推导方法、已知边界和重跑口径。
> 本文件原属 T74（2026-09-18 开工，2026-09-19 实窗验收），2026-09-21 由 `backlog/` 转入 `references/`；T74 编号冻结。
> 关联：`activity-loot` 数据集只服务首页掉落池。它原来的另一个消费方 T45「本周刷取清单」已于 2026-09-21 随 T91 一起删除。
> **注意区分**：本文说的是**首页核心活动卡**（轮换突袭 / 轮换地牢）右侧的「掉落池」，
> 不是武器详情页里的「完整掉落池」（后者是武器自己的 Perk 池，另一套东西）。

## 一、现象与成因

截图里四张卡（本周轮换突袭：国王的陨落 / 最后一愿；本周轮换地牢：二象性 / 晚星之主）
掉落池全部显示「掉落池待确认 / 公开接口尚未返回可读奖励」。

**不是接口失败，也不是渲染 bug。** 接口返回了数据（只有占位奖励），是两层叠加把内容清空了：

1. 数据集只录了 2026-09-10 当周轮换的 4 个活动，9-16 重置换走后 `loot_pool` 保持 `undefined`；
2. UI 回退到 `rewards` 后按「只留武器」过滤，而 `装备阶级5` 不是武器 → 滤成空数组 → 空态。

根因：**给一个每周变动的量配了一份静态快照，而且快照只覆盖了当周轮换。**

## 二、链路与代码位置

```
Bungie CharacterActivities（角色周挑战）
  └─ core/weekly/liveData.ts           生成 rotating_raid / rotating_dungeon 条目
       related_hashes[0] = 活动 hash
  └─ desktop/main/runtime/homeBriefing.ts:179  attachRotatingLootPools → buildLootPool
  └─ services/src/community/activityLoot.ts     lootPoolItemHashesForActivity(activityHash)
  └─ ui/src/home/HomePageContentView.tsx:540    两边都空 → is-pending 空态
```

「N 项已确认」与掉落池是两个独立事实源（前者来自角色周挑战，后者来自数据集），
所以会出现「2 项已确认」但掉落池全空的组合——这个组合本身没错，是数据没接上。

## 三、推导方法

Manifest 里**没有** activity → 掉落的直接字段：活动定义的 `rewards` 与 `challenges[].displayRewards`
都只有「突袭装备 / 强力装备」占位。唯一真源是 **Collectible 的 `sourceString` / `sourceHash`**：

```
来源串「来源：“国王的陨落”突袭」
  → 抽出名字槽「国王的陨落」→ 与活动定义名求相等 → 活动 hash
  → 该 sourceHash 下全部 Collectible → itemType === 3（武器）
  → 图样 record：recordTypeName == "武器模式" 且 displayProperties.name == 武器名
```

三条实测结论：

- **名字槽必须求相等，不能求包含。** 用「包含」会把 `由利维坦上的奇珍异兽园获得。`
  并进利维坦、把 `为水星上的万斯修士完成奥斯里斯的失落预言。` 并进预言地牢。
- **活动 hash 取「标准 / 普通」难度条目。** 本机 `home-briefing-cache.json` 里 8 个真实轮换活动，
  7 个 `: 标准`、1 个 `: 普通`；数据集原有的 4 条也都是「标准」。
- **图样 record 推得出来**（原判断为「推不出」，已证伪）：183 条「武器模式」record 无同名冲突，
  对拍数据集已有的人工值 13/13 全中，包括「集体义务」本来就没有图样那条也对上了。

## 四、踩到的坑（实测）

| # | 坑 | 实例 |
|---|---|---|
| 1 | 名称匹配歧义 | `利维坦` 同时命中本体 / 星之塔 / 遗落利维坦 / 奇珍异兽园；`预言` 命中地牢与万斯修士任务源 |
| 2 | 源串前缀与句号 | `来源:利维坦突袭。` 必须剥掉 `来源：` 前缀、容忍句号，否则整批活动漏掉 |
| 3 | **兜底模式会吃掉整句** | 名字槽规则里的 `^(.+?)。?$` 排在前面时，`在“往日之苦”突袭中获得。` 整句被当成名字，活动直接消失 |
| 4 | 同名活动多条 | `救赎的边缘: 标准` 有 940375169 与 1541433876 两条；按长度/字典序平手会选错 |
| 5 | 变体重复 | `（专家）`（门徒 / 救赎 / 国王）、`（痛苦）`（国王）、`（失时）`（玻璃拱顶）、`（巴洛克）`（利维坦）；按武器计一次，只登记基础版本 |
| 6 | **SQL 直查会静默漏数据** | 官方 sqlite 的 `id` 对 ≥ 2³¹ 的 hash 存为**有符号负数**，直接 `where id in (...)` 会漏掉一半装备；两边都要 `& 4294967295` 归一到无符号 |
| 7 | 词序不固定 | `来源：“X”地牢` 与 `来源：地牢“X”` 并存；晚星之主的源串里根本没有「突袭 / 地牢」二字 |
| 8 | 粒度止于活动级 | Manifest 做不到「哪个遭遇战掉哪把」，UI 措辞不能写成遭遇战掉落 |

## 五、实现（A）

`scripts/generate-activity-loot.mjs`，用法：

```bash
node scripts/generate-activity-loot.mjs --sqlite "$HOME/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/world.sqlite"
```

- 只读 Manifest；写的是 `packages/services/src/community/activityLoot.ts` 里
  `#region activity-loot-dataset` 与 `#endregion activity-loot-dataset` 之间的内容，标记外不动。
- `--report` 只打印推导结果，不写文件。
- manifest 版本取自 sqlite 同目录的 `status.json`，`revision` / `verified_at` 取运行当天。
- **自校验**：数据集原有的 4 条（活动 hash、source hash、条目数）必须逐条复现，否则直接抛错、不写文件。
  这是「换个 Manifest 后推导链悄悄变了」的报警器。
- **人工覆盖表**（脚本内常量），口径是**宁缺毋猜**：
  - `EXCLUDED_ACTIVITIES`：众神殿的掉落是其他突袭武器的再投放、自身 7 个难度条目无唯一活动 Hash，排除；
  - `ITEM_VARIANT_OVERRIDES`：「是不是复刻武器」推不出来，按 Hash 保留数据集已有标注（贪婪之握 4 把）。
- **稳定性规则**：同名活动在 Manifest 里有多条时，先沿用当前数据集已记录的 Hash
  （那是被真实轮换验证过的值），重复生成不会抖动。

不碰索引、不碰 worker。`activityLootDatasetV1` 的 `key` 改为
`raid-<活动 hash>` / `dungeon-<活动 hash>`：中文名无法生成稳定英文 slug，Hash 形式语言无关、天然唯一。

## 六、结果

25 个活动、171 条武器关系，其中 73 条带图样 record。新增覆盖：

国王的陨落 7、最后一愿 8、二象性 7、晚星之主 5、玻璃拱顶 13、预言 17、克洛塔的末日 9、
救赎花园 15、梦魇根源 7、深岩墓室 7、永恒沙漠 7、守望者尖塔 7、深渊机灵 6、平衡 8、
分离教义 4、贪婪之握 4、战争领主的废墟 5、忧愁王冠 4、往日之苦 4、异端深渊 1、
利维坦 8、利维坦星之塔 2、世界吞噬者利维坦 2、门徒誓约 7、救赎的边缘 7。

用本机缓存的真实轮换 hash 直接验过取池：国王的陨落 1374392663 → 7 项、最后一愿 2122313384 → 8 项、
二象性 2823159265 → 7 项、晚星之主 300092127 → 5 项。

空态文案同时改准：`掉落池待确认 / 公开接口尚未返回可读奖励。` → `掉落池待核对 / 轮换已确认，掉落关系尚未核对。`
（接口返回了数据，只是不是武器，说「接口未返回」不准确）。

## 七、已知边界

- `names` 只有当前 Manifest 语言的名称（本机为中文）。英文界面下靠活动 Hash 命中；
  Hash 是语言无关的，且已用真实轮换验证过，所以名字只作兜底。
- 「已日落、当前不可获得」的活动也一并收录：Manifest 不标日落，无法可靠排除，多收录无副作用。
- 带 `（专家）/（失时）/（痛苦）/（巴洛克）` 后缀的变体不入库，按武器计一次。
- `item_variant` 目前没有任何消费方，「是不是复刻武器」推不出来，靠人工覆盖表保留。

## 八、A 的维护口径

- Manifest 大版本更新后重跑一次生成脚本即可；`verified_at` 与 `revision` 随运行日更新。
- 自校验失败说明活动 Hash / source Hash / 条目数变了，先看差异再从覆盖表处置，不要直接放行。

## 九、B（运行时索引）的结论

本次不做 A 之外的方案，但原第六节对 B 的评估需要更正一条：
`pattern_record_hash` 推得出来（见第三节），所以 B 的前置条件少了一个，B 只剩「搬运同一套规则」。

## 十、验收标准

- 本周四张卡显示具体武器名 + 图标 + 类型，不再出现误导性空态；
- 覆盖不到的活动显示「轮换已确认，掉落关系尚未核对」，不显示「接口未返回」；
- 条目数与社区掉落表一致：二象性 7、晚星之主 4 + 破冰者、最后一愿 8、国王的陨落 7 —— 已核对；
- 轮换变更后不需要人工介入，只需在 Manifest 更新后重跑一次生成脚本。

## 附录：数据源调研（2026-09-10，原 T91 附录 A）

T91 于 2026-09-21 删除后，这份调研归到本数据集名下。

### A.1 结论

可以用「实时事实 + 静态关系」分层做出来，但不能把「Bungie 当前返回的活动奖励」直接当成完整掉落池。

- 本周轮换、活动身份、挑战进度和奖励等级：可以用 Bungie 实时 Profile / Public Milestones 与当前 Manifest。
- 武器是否属于某个活动的候选来源：可以用 Manifest `DestinyCollectibleDefinition.sourceHash/sourceString`，并参考 DIM 的 D2AI 来源映射。
- 某次突袭或地牢的完整武器—遭遇战掉落表：Bungie 没有提供稳定、完整、可直接查询的公开接口，必须使用本项目自己维护的受控数据集。

首版采用「实时事实与静态关系分层」方案，而不是继续寻找一个不存在的单一 API。

### A.2 已核实的数据能力

| 事实 | 可用来源 | 核实结果 | 允许的用途 |
|---|---|---|---|
| 当前轮换活动 | Bungie `CharacterActivities`、`Public Milestones`、活动 Manifest | 当前账号样本能返回轮换突袭 / 地牢及角色挑战 | 判断本周活动身份、开放窗口和角色完成状态 |
| 周挑战奖励等级 | 活动挑战的 `displayRewards[].itemQuantity`，旧定义兼容 `dummyRewards` | 只能读到奖励名原文；本机 Manifest 中带等级占位词的 19 个活动全是「强力装备」且全是地牢，「巅峰装备」为 0 条 | 不作为等级真相，也不用于武器掉落池 |
| 装备活动来源候选 | Manifest `DestinyCollectibleDefinition.sourceHash/sourceString` | 当前 Manifest 中突袭 / 地牢武器可解析到活动来源；装备定义自身 `sourceData` 当前为空 | 生成活动级候选装备，并作为掉落证据之一 |
| 图样身份 | Manifest `DestinyRecordDefinition.completionInfo.toastStyle = 8` 与同名武器定义的 `inventory.recipeItemHash` | 当前版本 183 条图样 Record 与 183 个可制作输出能按名称一一对应；仍需保留 Hash 级校验 | 给数据集里的武器标出 `pattern_record_hash` |

### A.3 掉落池数据源评估

**Bungie Manifest / API：权威但不完整。** `DestinyCollectibleDefinition.sourceHash/sourceString` 能回答「这个物品通常来自哪个来源」，但不能回答每个遭遇战具体掉哪些武器、普通宝箱与隐藏宝箱和挑战宝箱的差异、专家与普通和复刻与原版的区别、某个活动当前是否仍能重复获取。`DestinyActivityDefinition.rewards`、挑战 `displayRewards` 也不是完整武器掉落表——`visibleRewards` 与日落的 `displayRewards` 可以是同一份普通掉落，两者都不能复用为掉落池。

**DIM / d2-additional-info：适合作为来源候选和维护参考。** 本地 DIM 的 `source-info-v2.ts` 由 D2AI 构建生成，不应手工修改；DIM 与 `d2-additional-info` 均采用 MIT License。它适合用于活动级来源候选、版本与复刻装备的 Hash 参考、新 Manifest 发布后的差异核对，但不包含完整「遭遇战 → 掉落物」关系，不能单独作为完整掉落池。**实际生成脚本没有读取 DIM。**

**Felicity 等社区项目：有完整表，但不能直接复制。** 本地调研到 Felicity 的 `LootTables.cs`，它采用手工维护的活动、遭遇战和物品 Hash 表，能证明完整遭遇战掉落表需要维护关系数据，而不是从 Bungie 运行时推导。该项目使用 AGPL-3.0，其数据维护与本项目许可、来源链不一致，因此不直接复制代码或表，最多作为人工交叉核对材料。没有明确许可的网页、攻略站和在线表格同样不作为运行时依赖或直接 vendoring 来源。
