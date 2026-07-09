# 首页每周活动简报改造

> 状态：Backlog
> 更新时间：2026-07-09

## 目标

首页“本周更新”要能从 Bungie 官方 live data 里确认每周日落和每周高亮地牢，不依赖外部周报源，也不把普通可进入活动误当成本周轮换。

本 backlog 先记录已验证的数据入口和实现边界，后续开发时按这里补测试和接线。

## 已验证结论

### 每周日落

当前周 `2026-07-07T17:00:00Z` 到 `2026-07-14T17:00:00Z`，游戏内显示的本周日落是：

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
- 不能把普通 / 大师难度重复展示为两个地牢；同一 `originalDisplayProperties.name` 应去重。

## 建议实现

### 数据模型

当前 `WeeklySummaryPriority` 是单项结构，不适合表达两个高亮地牢。建议扩展为支持多项：

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

- `nightfall.entries` 有值时展示活动名和奖励武器。
- `rotating_dungeon.entries` 有多个值时展示为列表。
- 没有可确认 entry 时保留“待确认”，不使用 fallback 猜测。

### 数据源

新增或扩展 weekly live data 输入：

- `DestinyActivityDefinition`
- `DestinyInventoryItemDefinition`
- `DestinyObjectiveDefinition`
- 登录态 `GetProfile components=200,204`

解析优先级：

1. 先解析 `Grandmaster Vanguard Alerts`，生成 `nightfall`。
2. 再解析 `Weekly Dungeon Challenge`，生成 `rotating_dungeon.entries`。
3. 再使用公共里程碑补充突袭、公共线索等低风险数据。
4. 所有无法确认的数据保持 `pending`。

## 开发切片

### Red：首页每周活动数据边界测试

测试目标：

- 当 `CharacterActivities(204)` 含 `Grandmaster Vanguard Alerts` objective 时，weekly summary 生成 `移民号的坠毁` 和 `崇拜`。
- 当 `CharacterActivities(204)` 含两个 `Weekly Dungeon Challenge` objective 时，weekly summary 生成 `晚星之主` 和 `二象性` 两个地牢。
- 当普通地牢无 `Weekly Dungeon Challenge` 时，不进入轮换地牢。
- 当 `平衡 / Equilibrium` 只有自身 dungeon objective 时，不进入轮换地牢。

建议测试文件：

- `packages/core/test/weekly.summary.test.ts`
- 如拆 live data 单元，可新增 `packages/core/test/weekly.liveData.test.ts`

### Green：接入登录态 weekly live data

建议修改：

- `packages/core/src/weekly/liveData.ts`：扩展输入结构，新增从 profile activities 提取日落和地牢的纯函数。
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

1. 首页每周日落显示 `移民号的坠毁`，并展示奖励 `崇拜`。
2. 首页每周高亮地牢能展示多个地牢，当前周应显示 `晚星之主` 和 `二象性`。
3. 普通可进入地牢、最新地牢自身挑战、传统日落组不会被误标为本周轮换。
4. 数据不可读或 token 缺失时保持待确认，并说明需要登录态数据。
5. 所有结论都有 Bungie live data 或 Manifest definition 证据，不依赖外部周报源。
