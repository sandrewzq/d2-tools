# 首页本日更新信息重设计实施计划

> 执行规则覆盖：本文保留的测试、`Red / Verify`、`verify:*` 和视觉命令仅是历史计划记录，不是当前 agent 执行要求。实际开发不得据此新增或运行测试；统一遵守仓库根目录 `AGENTS.md`。

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` or equivalent task-by-task execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 首页“本日更新”只展示玩家当天打开应用就能行动的信息；当前真实主内容是“今日世界遗失区域”，展示今日 active 的 9 个世界遗失区域。每条只展示目的地 / 星球、遗失区域名、勇士、护盾、威胁、专家单人奖励和大师单人奖励。为避免本日区域过空，首页保留“重点商人”预留位，但在商人页展示规范完成前不接真实库存、不展示假数据。

**Architecture:** `packages/core` 负责从 Bungie Manifest / public milestones 生成结构化 daily briefing 数据；`packages/app` 负责把 daily sources 分流成“本日可行动”和“本周/轮换线索”；`packages/desktop` 只加载所需 definition component 并传给 core；`packages/ui` 只负责展示结构化 ViewModel。Prototype / Web 继续通过 mock / snapshot 走同一个共享 UI。

**Tech Stack:** TypeScript, React, Vitest, Bungie Manifest JSON definitions.

## Global Constraints

- 不展示 Manifest hash 或开发者概念给普通用户。
- 不展示推荐光等、通关奖励、Manifest / Bungie public milestone / 数据来源标签、武器过充、激涌、其他 modifiers 或猜测文案。
- 官方 Manifest 有中文名时必须使用官方中文名；只允许把 `如若单人 - xxx` 改写成 `单人奖励：xxx`，不能自行改写物品名、掉落稀有度或规则名称。
- 首页只展示今日 active 的 9 个世界遗失区域，不展示 Manifest 中全部 31 个高难遗失区域池。
- “本日更新”只放每日重置后会影响当天游玩决策的内容；周常、突袭/地牢轮换、普通公共里程碑和无法解释的 Bungie 原始活动名不得直接塞进本日卡片。
- 不硬编码星球名；目的地名称来自 Bungie `DestinyDestinationDefinition`，缺失时回退 `DestinyPlaceDefinition`。
- 掉落信息来自 `DestinyActivityDefinition.rewards.rewardItems` + `DestinyInventoryItemDefinition`，必须清洗成玩家可读文案。
- `国王的陨落：标准` 这类 raw public milestone activity 对普通用户不可读；如果没有明确“为什么今天要看它”的标签和奖励解释，应归入“本周更新 / 公共轮换线索”，或作为低优先级状态行，不出现在本日主卡。
- “今日商人变化”不进入本日主卡；商人相关内容先只保留“重点商人”预留位，等商人页把重点库存、购买判断和展示规范收口后再接首页摘要。
- 账号提醒不进入本日更新。账号异常走顶部状态栏、账号页或异常提示，不和 Bungie 每日内容混在一起。
- 日落 / 大师日落 / GM 日落按 Bungie 每周重置归入“本周更新”；活动 modifiers / 威胁 / 护盾是具体活动详情，后续挂到对应活动行，不单独作为每日卡。
- 视觉和布局改 `packages/ui`，Desktop / Web / Prototype 只做数据或 mock 接线。
- 改首页 UI 后至少运行 `npx pnpm@9.15.0 verify:ui`；改 Desktop 接线后运行 `npx pnpm@9.15.0 verify:desktop`。

---

## File Map

- Modify `packages/app/src/workspaces/homePage.ts` or `packages/app/src/workspaces/homeDashboard.ts`
  - 增加首页 daily briefing 分流：`todayCards` / `weeklyIntel` 或等价 ViewModel。
  - 不让 UI 组件直接决定 raw milestone 属于本日还是本周。
- Modify `packages/core/src/manifest/definitions.ts`
  - 增加 `DestinyDestinationDefinition`、`DestinyPlaceDefinition` 到可缓存 definition component 类型。
  - 扩展 `DefinitionRecord` 以覆盖 activity rewards、destination/place 字段和必要展示字段。
- Modify `packages/core/src/daily/summary.ts`
  - 扩展 `DailySummaryItem`，新增 `destinationName`、`championTypes`、`shieldTypes`、`threatType`、`expertSoloRewards`、`masterSoloRewards` 等首页可用字段。
- Modify `packages/core/src/daily/lostSectors.ts`
  - 从 activity + destination/place + item definitions 生成完整遗失区域条目。
  - 输出 9 条 active 世界遗失区域，不再只输出标题和原始描述。
- Modify `packages/core/src/daily/liveData.ts`
  - `BuildDailyLiveDataInput.definitions` 接入 destinations / places。
- Modify `packages/desktop/src/main/ipc/daily.ts`
  - 加载 `DestinyDestinationDefinition` 和 `DestinyPlaceDefinition` 后传给 core。
- Modify `packages/desktop/src/main/workers/heavyTaskWorker.ts`
  - 初始化资料库时把新增 definition component 写入缓存。
- Modify `packages/ui/src/home/HomePageContentView.tsx`
  - “本日更新”只渲染当日可行动卡片。
  - 首页遗失区域集合卡改为渲染全部 9 条。
  - 每条展示目的地 chip、区域名、勇士、护盾、威胁、专家单人奖励和大师单人奖励。
  - 移除或迁移 `sourceSummaryCard("rotations", ...)` 造成的 raw public milestone 卡片。
- Modify `packages/prototype/src/mock/scenarios.ts` or fixture runtime
  - mock 9 条结构化遗失区域数据。
- Modify `packages/web/src/webAdapter.ts` or fixture runtime
  - fallback snapshot 中同步结构化字段。
- Tests
  - `packages/core/test/daily.lostSectors.test.ts`
  - `packages/core/test/daily.liveData.test.ts`
  - `packages/core/test/daily.summary.test.ts`
  - `packages/desktop/test/shared-ui-page-views.test.tsx`
  - `packages/desktop/test/manifest.definitions.test.ts` or related manifest cache test if component list changes.

## Daily Briefing 信息架构

### 本日更新应该展示什么

本日更新面板只展示“每日重置后，玩家今天要不要去做”的内容：

1. **今日世界遗失区域**
   - 必须展示全部 9 个 active 区域。
   - 每条展示：目的地 / 星球、遗失区域名、勇士、护盾、威胁、专家单人奖励、大师单人奖励。
   - 这是当前最高优先级，因为它是每日变化、玩家会每天查看的内容。

2. **重点商人预留位**
   - 这是首页信息架构预留，不是“今日商人变化”。
   - 先展示“规则整理中 / 去商人页查看完整库存”的稳定占位，不接真实库存，不展示假物品。
   - 后续只有在商人页明确重点库存规则后，才把每日武器、周末仄、活动商人等摘要接入首页。

3. **每日活动 / 奖励修正**
   - 暂不进入首版本日主卡。
   - 只有 Bungie 数据能解释清楚活动类型、奖励和行动意义时，才作为后续增强挂入本日区域。
   - 如果只有 raw activity title，不展示在本日主卡。

### 不应该放在本日更新里的内容

这些内容不属于“今天打开就要看”的主行动卡：

- 周常 raid / dungeon 轮换，例如 `国王的陨落：标准`。
- 只来自 `Bungie 公共里程碑`、没有奖励解释、没有活动类别解释的 raw milestone。
- 资料库版本、AI 配置、Bungie App 配置、应用版本等设置状态，除非异常。
- 账号提醒、账号健康检查和仓库容量提示。
- “今日商人变化”这类没有明确展示规则的商人摘要。
- 日落 / 大师日落 / GM 日落；它们属于每周重置内容。
- 无法解析名称或只能展示 hash / 不可读占位名的条目。

### 红框问题：`国王的陨落：标准`

当前红框卡片来自 `dailySummary.sources.rotations`，UI 把它作为 `sourceSummaryCard("rotations", copy.intel.activityIntel, ...)` 渲染到“本日更新”。它的问题不是视觉，而是信息分类错误：

- `国王的陨落` 是突袭活动名，`标准` 是难度 / 入口变体，不说明为什么今天要刷。
- 副标题 `Bungie 公共里程碑` 是数据来源，不是玩家语言。
- 描述被截断，用户看不到奖励、轮换原因、是否本周重点。
- 它更像“本周公共轮换线索”或“突袭/地牢线索”，不应抢占本日更新主面板。

目标行为：

- 如果公共里程碑能归类为 raid / dungeon / weekly rotation：移动到“本周更新”里的 `公共轮换线索`。
- 如果只能得到 raw activity title：降级为本周区域的低优先级状态行，文案为“Bungie 返回了公共活动线索，奖励和轮换原因待确认”。
- “本日更新”不再直接渲染 `rotations` source card；本日首版只显示完整遗失区域集合和重点商人预留位。

## Task 1: 本日更新分流规则

**Files:**
- Modify: `packages/app/src/workspaces/homePage.ts` or `packages/app/src/workspaces/homeDashboard.ts`
- Modify: `packages/ui/src/home/HomePageContentView.tsx`
- Test: `packages/desktop/test/shared-ui-page-views.test.tsx`

**Interfaces:**
- Produces: a home ViewModel shape that separates daily actionable cards from weekly/public rotation clues.
- Consumes later: UI renders daily cards from this ViewModel instead of directly rendering `dailySummary.sources.rotations`.

- [ ] **Step 1: Write the failing render test**

Render a home daily summary with:

```ts
rotations: {
  status: "ready",
  message: "已找到 1 条可读信息。",
  items: [{ title: "国王的陨落：标准", subtitle: "Bungie 公共里程碑" }]
}
```

Expected:

- `本日更新` panel does not contain `国王的陨落：标准`
- `本周更新` or weekly intel area contains `国王的陨落：标准` or a safer public rotation row
- no card subtitle says `Bungie 公共里程碑` as player-facing primary copy

- [ ] **Step 2: Run red test**

```powershell
npx pnpm@9.15.0 vitest --run packages/desktop/test/shared-ui-page-views.test.tsx
```

Expected: FAIL because current UI renders rotations directly in the daily panel.

- [ ] **Step 3: Implement minimal分流**

Move the source decision out of the daily card builder:

- `lost_sector` stays in daily panel.
- readable daily vendor/action sources can stay in daily panel only if they have player-facing action labels.
- vendor sources must not render as “今日商人变化” in the daily panel until vendor display rules are finalized; show only the fixed `重点商人` placeholder.
- `rotations` and `weekly_report` feed weekly/public intel rows by default.
- raw source names like `Bungie 公共里程碑` are treated as metadata and not used as the main subtitle.

- [ ] **Step 4: Run green test**

Run the same test. Expected: PASS.

## Task 2: Manifest 组件边界

**Files:**
- Modify: `packages/core/src/manifest/definitions.ts`
- Modify: `packages/services/test/manifest.definitions.test.ts`

**Interfaces:**
- Produces: `DefinitionComponentName` includes `DestinyDestinationDefinition` and `DestinyPlaceDefinition`.
- Consumes later: Desktop daily IPC and manifest worker can call `loadDefinitionComponent(dataDir, "DestinyDestinationDefinition")`.

- [ ] **Step 1: Write the failing test**

Add assertions that `selectDefinitionComponentPath(metadata, "zh-chs", "DestinyDestinationDefinition")` and `DestinyPlaceDefinition` resolve from metadata.

- [ ] **Step 2: Run red test**

Run:

```powershell
npx pnpm@9.15.0 vitest --run packages/services/test/manifest.definitions.test.ts
```

Expected: FAIL because the component names are not accepted yet.

- [ ] **Step 3: Implement minimal component support**

Update `DefinitionComponentName` and `requiredDefinitionComponents` only if these two components must be mandatory for homepage correctness. Preferred behavior: make them loadable and initialized by the manifest worker, but do not block all library features if older cache lacks them; daily panel can fall back gracefully.

- [ ] **Step 4: Run green test**

Run the same Vitest command. Expected: PASS.

## Task 3: 结构化遗失区域模型

**Files:**
- Modify: `packages/core/src/daily/summary.ts`
- Modify: `packages/core/src/daily/lostSectors.ts`
- Test: `packages/core/test/daily.lostSectors.test.ts`

**Interfaces:**
- Produces: `DailySummaryItem.destinationName?: string`, `championTypes?: string[]`, `shieldTypes?: string[]`, `threatType?: string`, `expertSoloRewards?: string[]`, `masterSoloRewards?: string[]`.
- Consumes later: Home UI renders these fields without parsing strings.

- [ ] **Step 1: Write the failing test**

Create a fixture with:

- activity name `采石场: 大师`
- `originalDisplayProperties.name = "采石场"`
- `destinationHash = 697502628`
- rewards containing item definitions for `异域记忆水晶（普通）`、`传说武器（普通）`、`强化核心（罕见）`
- destination definition `697502628 -> 欧洲无人区`

Expected item:

```ts
{
  title: "采石场",
  destinationName: "欧洲无人区",
  championTypes: ["屏障", "势不可挡"],
  shieldTypes: ["烈日", "虚空"],
  threatType: "虚空",
  expertSoloRewards: ["异域记忆水晶（稀有）", "传说武器（罕见）"],
  masterSoloRewards: ["异域记忆水晶（普通）", "传说武器（普通）"]
}
```

- [ ] **Step 2: Run red test**

```powershell
npx pnpm@9.15.0 vitest --run packages/core/test/daily.lostSectors.test.ts
```

Expected: FAIL because these fields are absent.

- [ ] **Step 3: Implement parser**

Add a focused helper in `lostSectors.ts`:

- `readDestinationName(definitions, activity)`
- `readDifficultyLabel(activity)`
- `readSoloRewards(activity, itemDefinitions)`
- `stripSoloPrefix(name)` removes `如若单人 - ` only for display.

Do not infer drops not present in rewards.
Do not include completion rewards such as `强化核心（罕见）` in homepage solo reward rows.

- [ ] **Step 4: Run green test**

Run the same test. Expected: PASS.

## Task 4: Daily 数据链路接线

**Files:**
- Modify: `packages/core/src/daily/liveData.ts`
- Modify: `packages/desktop/src/main/ipc/daily.ts`
- Test: `packages/core/test/daily.liveData.test.ts`

**Interfaces:**
- Consumes: `buildLostSectorData(activityDefinitions, { destinations, places, items })`.
- Produces: `buildDailyLiveDataFromBungie(...).lost_sector` carries destination, champion, shield, threat and solo reward fields.

- [ ] **Step 1: Write failing liveData test**

Pass activities + destinations + places + items + modifiers into `buildDailyLiveDataFromBungie`; assert `lost_sector[0].destinationName` and structured reward / modifier fields survive.

- [ ] **Step 2: Run red test**

```powershell
npx pnpm@9.15.0 vitest --run packages/core/test/daily.liveData.test.ts
```

- [ ] **Step 3: Implement minimal wiring**

Extend `BuildDailyLiveDataInput.definitions` with:

```ts
destinations?: DefinitionComponentData | null;
places?: DefinitionComponentData | null;
```

Pass those definitions from Desktop daily IPC.

- [ ] **Step 4: Run green test**

Run the same test. Expected: PASS.

## Task 5: 首页 UI 全量展示

**Files:**
- Modify: `packages/ui/src/home/HomePageContentView.tsx`
- Modify: `packages/ui/src/styles.css` if spacing needs menu-scoped `.home-*` rules.
- Test: `packages/desktop/test/shared-ui-page-views.test.tsx`

**Interfaces:**
- Consumes: `HomeDailyItem.destinationName`, `championTypes`, `shieldTypes`, `threatType`, `expertSoloRewards`, `masterSoloRewards`.
- Produces: Homepage renders all `lost_sector.items`, not first 3 + overflow, and does not render raw rotations as daily cards.

- [ ] **Step 1: Write failing render test**

Render 9 lost sector items and assert:

- all 9 names are present
- `欧洲无人区` appears
- `勇士：屏障、势不可挡` appears
- `单人奖励：异域记忆水晶（普通）、传说武器（普通）` appears
- `强化核心`、`推荐光等`、`Manifest`、`单人掉落` do not appear
- `另有 6 个区域` does not appear
- daily panel contains the fixed `重点商人` placeholder
- daily panel does not contain account reminder heading/copy
- `国王的陨落：标准` does not appear inside the daily panel when supplied through `rotations`

- [ ] **Step 2: Run red test**

```powershell
npx pnpm@9.15.0 vitest --run packages/desktop/test/shared-ui-page-views.test.tsx
```

- [ ] **Step 3: Implement UI**

Replace the aggregated preview with a compact full list:

- card title remains `今日世界遗失区域`
- subtitle: `9 个区域 · 每个目的地每日 1 个`
- list item layout: destination chip, sector name, modifier lines, expert / master solo reward lines.
- add a compact `重点商人` placeholder under the lost sector list; it links conceptually to vendor page but does not render fake inventory.
- remove the account reminder section from daily panel.
- daily panel no longer calls `sourceSummaryCard("rotations", ...)`.

- [ ] **Step 4: Run green test**

Run the same render test. Expected: PASS.

## Task 6: Prototype / Web mock 对齐

**Files:**
- Modify: `packages/prototype/src/mock/scenarios.ts` or fixture runtime.
- Modify: `packages/web/src/webAdapter.ts` or fixture runtime.

**Interfaces:**
- Consumes: same `DailySummaryItem` fields.
- Produces: Prototype / Web show the same structured lost sector UI.

- [ ] **Step 1: Update mock data**

Use 9 items with varied destinations:

- 欧洲无人区 / 采石场
- 萨瓦图恩的王座世界 / 萃取地
- 木卫二 / 地堡E15
- 内欧姆那 / 镀金箴言
- 苍白之心 / 繁盛深渊

- [ ] **Step 2: Run UI verification**

```powershell
npx pnpm@9.15.0 verify:ui
```

Expected: typecheck and UI tests pass.

## Task 7: 收口验证与文档

**Files:**
- Modify: `docs/todo.md`

**Validation:**

Run:

```powershell
npx pnpm@9.15.0 vitest --run packages/core/test/daily.lostSectors.test.ts packages/core/test/daily.liveData.test.ts packages/core/test/daily.summary.test.ts packages/desktop/test/shared-ui-page-views.test.tsx
npx pnpm@9.15.0 verify:ui
npx pnpm@9.15.0 verify:desktop
npx pnpm@9.15.0 verify:docs
```

Expected: all pass. If visual layout changes are obvious, also run:

```powershell
npx pnpm@9.15.0 visual:home
```

Update `docs/todo.md` Bug #65 or add a new bug entry only after implementation is verified.

## Self-Review

- Spec coverage: covers all user requirements: all 9 active lost sectors, destination, drop info, useful homepage display.
- Placeholder scan: no TBD / TODO placeholders.
- Type consistency: all new fields flow from core `DailySummaryItem` to UI `HomeDailyItem`.
- Scope check: intentionally limited to homepage lost sector briefing; no vendor, weekly report, or library redesign included.
