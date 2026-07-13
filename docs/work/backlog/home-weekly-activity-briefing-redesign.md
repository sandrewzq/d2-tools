# 首页每周活动简报改造

> 执行规则覆盖：本文保留的测试、`Red / Verify`、`verify:*` 和视觉命令仅是历史计划记录，不是当前 agent 执行要求。不得据此自动新增测试或执行旧命令；用户主动本地测试时照常运行现有测试。

> 状态：核心接线已落地，后续继续打磨仄商人摘要和更多活动细节
> 更新时间：2026-07-09

## 目标

首页“本周更新”主卡只聚焦玩家每周最常查的四类内容：先锋行动、轮换突袭、轮换地牢和仄商人。数据要能从 Bungie 官方 live data 里确认，不依赖外部周报源，也不把普通可进入活动误当成本周轮换。

本 backlog 记录已验证的数据入口和实现边界；当前已按这里补齐 weekly summary、Desktop IPC、ObjectiveDefinition 和首页三张活动主卡接线。

## 已验证结论

### 先锋行动 · 宗师先锋警戒

当前周 `2026-07-07T17:00:00Z` 到 `2026-07-14T17:00:00Z`，游戏内口径是 `先锋行动` 下的 `宗师先锋警戒`：

- `移民号的坠毁`
- 奖励武器：`崇拜`

Bungie live data 可确认该信息，但入口不是 `/Destiny2/Milestones/`。

已验证链路：

1. 调用登录态 `Destiny2.GetProfile`，组件包含 `200,204`。
2. 遍历 `characterActivities.data[characterId].availableActivities`。
3. 找到带有 `challenges[].objective.objectiveHash = 3511848321` 的活动。
4. 用 `DestinyObjectiveDefinition[3511848321]` 校验其描述为 `Complete Grandmaster Vanguard Alerts...` / `完成宗师先锋警戒...`。
5. 用该活动的 `DestinyActivityDefinition` 读取活动名称：
   - `activityHash: 461602663`
   - `displayProperties.name: 移民号的坠毁: 自定义`
   - `originalDisplayProperties.name: 移民号的坠毁`
6. 用 `visibleRewards[].rewardItems[].itemQuantity.itemHash` 读取奖励：
   - `itemHash: 891765152`
   - `DestinyInventoryItemDefinition[891765152].displayProperties.name: 崇拜`

不能使用的错误规则：

- 不能只读 `/Destiny2/Milestones/`，当前公共里程碑没有日落。
- 不能只按传统 `directActivityModeType = 16 / 17 / 47` 识别日落，会漏掉新版先锋警戒。
- 不能只按 `activityTypeHash = 575572995` 取传统日落组；当前 live data 里的传统日落组会解析到 `阈限`，不是游戏内本周 `Grandmaster Vanguard Alert`。
- 首页文案不要写“本周日落任务”，应写 `先锋行动 · 宗师先锋警戒`。

### 每周高亮突袭

当前周外部周报口径和 Bungie live data 均指向两个高亮突袭：

- `救赎的边缘` / `Salvation's Edge`
- `门徒誓约` / `Vow of the Disciple`

Bungie live data 可确认该信息，入口同样是登录态 `CharacterActivities(204)`。

已验证链路：

1. 调用登录态 `Destiny2.GetProfile`，组件包含 `200,204`。
2. 遍历 `characterActivities.data[characterId].availableActivities`。
3. 用 `DestinyActivityDefinition` 识别突袭活动：
   - `activityTypeHash = 2043403989`，或
   - `directActivityModeType = 4`，或
   - `activityModeTypes` 包含 `4`。
4. 对每个候选活动读取 `challenges[].objective.objectiveHash`。
5. 用 `DestinyObjectiveDefinition` 校验 objective 名称为 `Weekly Raid Challenge` / `周常突袭挑战`。
6. 用 `originalDisplayProperties.name` 去重普通 / 大师难度，只保留突袭名称。

已验证命中：

| 突袭 | activityHash | 难度 | objectiveHash | objective |
|---|---:|---|---:|---|
| 门徒誓约 | 1441982566 | 标准 | 1863972407 | 周常突袭挑战 |
| 门徒誓约 | 3889634515 | 大师 | 1863972407 | 周常突袭挑战 |
| 救赎的边缘 | 1541433876 | 标准 | 2243638599 | 周常突袭挑战 |
| 救赎的边缘 | 4129614942 | 大师 | 2243638599 | 周常突袭挑战 |

不能使用的错误规则：

- 不能只按公共里程碑里的突袭名称展示轮换突袭；公共里程碑会列出多个可进入突袭，不等同于 featured raid rotation。
- 不能把突袭列表页的 `1-6 / 11` 理解成“本周轮换 11 个”；那只是可见突袭列表分页。
- 不能把普通 / 大师难度重复展示为两个突袭；同一 `originalDisplayProperties.name` 应去重。

### 每周高亮地牢

当前周外部周报口径和 Bungie live data 均指向两个高亮地牢：

- `晚星之主` / `Vesper's Host`
- `二象性` / `Duality`

Bungie live data 可确认该信息，入口同样是登录态 `CharacterActivities(204)`。

已验证链路：

1. 调用登录态 `Destiny2.GetProfile`，组件包含 `200,204`。
2. 遍历 `characterActivities.data[characterId].availableActivities`。
3. 用 `DestinyActivityDefinition` 识别地牢活动：
   - `activityTypeHash = 608898761`，或
   - `activityModeTypes` 包含 `82`。
4. 对每个候选活动读取 `challenges[].objective.objectiveHash`。
5. 用 `DestinyObjectiveDefinition` 校验 objective 名称为 `Weekly Dungeon Challenge` / `周常地牢挑战`。
6. 用 `originalDisplayProperties.name` 去重普通 / 大师难度，只保留地牢名称。

已验证命中：

| 地牢 | activityHash | 难度 | objectiveHash | objective |
|---|---:|---|---:|---|
| 晚星之主 | 300092127 | 普通 | 2367956143 | 周常地牢挑战 |
| 晚星之主 | 4293676253 | 大师 | 2367956143 | 周常地牢挑战 |
| 二象性 | 2823159265 | 标准 | 3039545165 | 周常地牢挑战 |
| 二象性 | 3012587626 | 大师 | 3039545165 | 周常地牢挑战 |

不能使用的错误规则：

- 不能只按 `activityTypeHash = 608898761` 展示地牢；所有可进入地牢都会出现在 `availableActivities`。
- 不能把所有带 challenge 的地牢都当轮换地牢。当前 `平衡 / Equilibrium` 也有 challenge，但 objective `897179824` 的描述是 `Complete the "Equilibrium" dungeon.`，不是 `Weekly Dungeon Challenge`。
- 不能只因 `visibleRewards` 里出现 `周常奖励` 就归入轮换地牢；`平衡 / Equilibrium` 可见周常奖励代表当前地牢自身奖励状态，不等同于本周 featured dungeon rotation。
- 不能把普通 / 大师难度重复展示为两个地牢；同一 `originalDisplayProperties.name` 应去重。

## 已落地实现

### 数据模型

`WeeklySummaryPriority` 已扩展为支持多项，避免两个高亮突袭 / 地牢被压成单条：

```ts
type WeeklyActivityEntry = {
  title: string;
  detail?: string;
  evidence?: string;
  source?: string;
  related_hashes?: number[];
  rewards?: Array<{
    hash: number;
    name: string;
    icon?: string;
  }>;
};

type WeeklySummaryPriority = {
  status: "ready" | "pending";
  title: string;
  detail: string;
  evidence?: string;
  source?: string;
  entries?: WeeklyActivityEntry[];
};
```

首页渲染规则：

- `nightfall.entries` 有值时展示为 `先锋行动 · 宗师先锋警戒`，并展示活动名和奖励武器。
- `rotating_raid.entries` 有多个值时展示为列表。
- `rotating_dungeon.entries` 有多个值时展示为列表。
- `xur` 保持仄商人紧凑库存摘要，不混入轮换活动列表。
- 没有可确认 entry 时保留“待确认”，不使用 fallback 猜测。

### 数据源

weekly live data 已扩展输入：

- `DestinyActivityDefinition`
- `DestinyInventoryItemDefinition`
- `DestinyObjectiveDefinition`
- 登录态 `GetProfile components=200,204`

解析优先级：

1. 先解析 `Grandmaster Vanguard Alerts`，生成 `nightfall`。
2. 再解析 `Weekly Raid Challenge`，生成 `rotating_raid.entries`。
3. 再解析 `Weekly Dungeon Challenge`，生成 `rotating_dungeon.entries`。
4. 仄商人继续使用首页现有 live vendor 摘要。
5. 公共里程碑只进入公共线索或兜底说明，不再作为轮换突袭 / 地牢主来源。
6. 所有无法确认的数据保持 `pending`。

## 开发切片记录

### Red：首页每周活动数据边界测试

测试目标：

- 当 `CharacterActivities(204)` 含 `Grandmaster Vanguard Alerts` objective 时，weekly summary 生成 `移民号的坠毁` 和 `崇拜`。
- 当 `CharacterActivities(204)` 含两个 `Weekly Raid Challenge` objective 时，weekly summary 生成 `救赎的边缘` 和 `门徒誓约` 两个突袭。
- 当 `CharacterActivities(204)` 含两个 `Weekly Dungeon Challenge` objective 时，weekly summary 生成 `晚星之主` 和 `二象性` 两个地牢。
- 当公共里程碑含多个突袭名称但 profile activity 没有 `Weekly Raid Challenge` 时，不把这些突袭误标为轮换突袭。
- 当普通地牢无 `Weekly Dungeon Challenge` 时，不进入轮换地牢。
- 当 `平衡 / Equilibrium` 只有自身 dungeon objective 时，不进入轮换地牢。

建议测试文件：

- `packages/core/test/weekly.summary.test.ts`
- 如拆 live data 单元，可新增 `packages/core/test/weekly.liveData.test.ts`

### Green：接入登录态 weekly live data

建议修改：

- `packages/core/src/weekly/liveData.ts`：扩展输入结构，新增从 profile activities 提取先锋警戒、轮换突袭和轮换地牢的纯函数。
- `packages/desktop/src/main/ipc/weekly.ts`：读取 fresh OAuth token，调用 `GetProfile components=200,204`，加载 `DestinyObjectiveDefinition`。
- `packages/core/src/manifest/definitions.ts`：确认 `DestinyObjectiveDefinition` 在 required / optional definition 读取范围内。
- `packages/desktop/src/renderer/api/weeklyApi.ts`：同步 `entries` 类型。

### Tidy：首页展示多个地牢

建议修改：

- `packages/ui/src/home/HomePageContentView.tsx`：每周地牢卡支持多项列表。
- `packages/app/src/workspaces/homeDashboard.ts` / `homePage.ts`：透传扩展后的 `weeklySummary`。
- `packages/ui/src/i18n/copy.ts`：如新增可见文案，沉淀到 copy。

### Verify：验证

最小验证：

```powershell
npx pnpm@9.15.0 vitest --run packages/core/test/weekly.summary.test.ts packages/desktop/test/shared-ui-page-views.test.tsx --testNamePattern "weekly|本周|地牢|日落"
npx pnpm@9.15.0 verify:ui
npx pnpm@9.15.0 verify:desktop
npx pnpm@9.15.0 verify:docs
```

如果首页视觉布局变化明显，追加：

```powershell
npx pnpm@9.15.0 visual:home
```

## 官方参考

- Bungie `Destiny2.GetProfile`
- Bungie `DestinyComponentType.CharacterActivities = 204`
- Bungie `DestinyActivityDefinition`
- Bungie `DestinyObjectiveDefinition`

## 完成标准

1. 首页每周先锋行动显示 `宗师先锋警戒：移民号的坠毁`，并展示奖励 `崇拜`。
2. 首页每周高亮突袭能展示多个突袭，当前周应显示 `救赎的边缘` 和 `门徒誓约`。
3. 首页每周高亮地牢能展示多个地牢，当前周应显示 `晚星之主` 和 `二象性`。
4. 首页仄商人继续显示 live vendor 库存摘要，不被公共线索或其他商人顶替。
5. 普通可进入突袭 / 地牢、最新地牢自身挑战、传统日落组不会被误标为本周轮换。
6. 数据不可读或 token 缺失时保持待确认，并说明需要登录态数据。
7. 所有结论都有 Bungie live data 或 Manifest definition 证据，不依赖外部周报源。
