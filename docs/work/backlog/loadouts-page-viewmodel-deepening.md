# 配装页 ViewModel 收深计划

> 执行规则覆盖：本文保留的测试、`Red / Verify` 和 `verify:*` 命令仅是历史计划记录，不是当前 agent 执行要求。不得据此自动新增测试或执行旧命令；用户主动本地测试时照常运行现有测试。

> 状态：待推进
> 关联任务：`docs/todo.md` T4 跨端 UI 壳、可交互原型与桌面视觉收口
> 关联架构候选：候选 1「收深共享缓存和页面 ViewModel module，让 ui 的 interface 变窄」

## 背景

配装页已经完成 Prototype / Web / Desktop 共用 `packages/ui/src/loadouts/LoadoutsPageContentView.tsx` 的主路径，也已经在 `packages/app/src/workspaces/loadoutsPage.ts` 中沉淀了 `createLoadoutsPageWorkspace` 和 `loadoutEntries`。但共享 UI 仍然同时理解原始账号对象、本地模板、Bungie 游戏内槽位、迁移计划、比较行、装备状态 helper 和若干 UI 派生状态。

候选 1 的方向是把页面级 ViewModel 收到 app 层，让 UI 的接口变窄。本计划只把这个方向应用到配装菜单：先形成 `LoadoutsPageModel`，再让 Prototype / Web / Desktop 都通过同一个 model 和 actions 渲染配装页。

## 目标

- `LoadoutsPageContentView` 只接收 `model: LoadoutsPageModel`、`actions: LoadoutsPageActions` 和少量平台状态。
- `packages/app/src/workspaces/loadoutsPage.ts` 负责派生配装工作台列表、选中详情、风险摘要、比较区和装备行展示模型。
- UI 不再兜底构造 `loadoutEntries`，也不再根据 `accountSummary + selected entry` 查游戏内槽位详情。
- Prototype / Web / Desktop 保持同一套配装内容页，差异只来自 mock 数据、真实数据和平台 callback。
- 保留 Bug #62 行为：游戏内配装条目可以选中并查看详情，且保留“应用到角色”和“用当前装备覆盖”操作。

## 非目标

- 不做全局 `SharedDomainCache`，不迁移首页、账号、仓库、资料库或商人。
- 不重做配装页视觉样式，不改共享 workspace chrome。
- 不重构 `packages/desktop/src/renderer/features/loadouts/useLoadoutWriteActions.ts`。
- 不改 Desktop 主进程 IPC、preload、Bungie 写操作或 `SnapshotLoadout` 请求语义。
- 不回退 Bungie 配装槽 `name_hash`、`icon_hash`、`color_hash` 的传递链路。

## 当前问题

`LoadoutsPageContentViewProps` 仍然过宽：

- 多处 `any` 暴露在共享 UI props 和内部行组件里。
- UI 内部维护 `selectedLoadoutEntryId`，但 app 层不知道当前选中的是本地方案还是游戏内槽位。
- UI 内部保留 `buildFallbackLoadoutEntries`，导致 app 层和 UI 层都能生成配装对象列表。
- UI 内部通过 `getSelectedInGameLoadoutSlot(accountSummary, entry)` 从原始账号对象查游戏内配装详情。
- UI 同时接收 `selectedTemplate`、`selectedAnalysis`、`transferPlan`、`statusSummary`、`visibleCompareRows`、`missingCount`、`readyCount`、`actionableCount`、`getItemStatus`、`getBlockedDetails`、`getSourceItem`、`getActionFeedbackKey` 等散装数据和 helper。
- Desktop adapter 已调用 `createLoadoutsPageWorkspace`，但仍需要把 workspace 拆开后逐项传给 UI。

## 目标接口草案

`packages/app/src/workspaces/loadoutsPage.ts` 新增页面模型类型：

```ts
export type LoadoutsPageModel = {
  entries: LoadoutEntryView[];
  selectedEntryId: string;
  selectedDetail: LoadoutsSelectedDetailView;
  riskSummary: LoadoutRiskSummaryView;
  compare: LoadoutCompareView;
};

export type LoadoutEntryView = {
  id: string;
  source: "local-template" | "in-game";
  title: string;
  subtitle: string;
  statusLabel: string;
  statusTone: "neutral" | "ready" | "warning";
  preview: string;
  templateId?: string;
  characterId?: string;
  slotIndex?: number;
};

export type LoadoutsSelectedDetailView =
  | {
      kind: "local-template";
      template: LoadoutTemplate;
      analysis: LoadoutTemplateAnalysis | null;
      transferPlan: MissingLoadoutTransferPlan | null;
      statusSummary: Array<{ key: LoadoutItemStatus["summary_key"]; label: string; count: number }>;
      itemRows: LoadoutTemplateItemRowView[];
    }
  | {
      kind: "in-game-slot";
      characterId: string;
      characterName: string;
      className: string;
      slot: AccountSummary["characters"][number]["loadout_slots"][number];
      items: InGameLoadoutItemView[];
    }
  | {
      kind: "empty";
      title: string;
      message: string;
    };

export type LoadoutRiskSummaryView = {
  missingCount: number;
  readyCount: number;
  actionableCount: number;
};

export type LoadoutCompareView = {
  compareTemplate: LoadoutTemplate | null;
  visibleRows: LoadoutCompareRow[];
};
```

`createLoadoutsPageWorkspace` 的输入需要新增选中 entry：

```ts
export function createLoadoutsPageWorkspace(input: {
  accountSummary: AccountSummary | null;
  templates: LoadoutTemplate[];
  selectedTemplateId: string;
  selectedEntryId: string;
  compareTemplateId: string;
  showDiffOnly: boolean;
}): LoadoutsPageWorkspace;
```

`packages/ui/src/loadouts/LoadoutsPageContentView.tsx` 的最终 props 收窄为：

```ts
export type LoadoutsPageContentViewProps = {
  interfaceLocale?: InterfaceLocale;
  model: LoadoutsPageModel;
  actions: LoadoutsPageActions;
  compareTemplateId: string;
  renameDraft: string;
  showDiffOnly: boolean;
  message: string;
  isRunningItemAction: boolean;
  actionFeedback: Record<string, LoadoutActionFeedbackState>;
};
```

`LoadoutsPageActions` 仍由 UI 层导出，保持平台 callback 注入：

```ts
export type LoadoutsPageActions = {
  selectEntry(entryId: string): void;
  selectTemplate(templateId: string): void;
  selectCompareTemplate(templateId: string): void;
  renameDraftChange(value: string): void;
  showDiffOnlyChange(value: boolean): void;
  renameTemplate(template: LoadoutTemplate): void;
  deleteTemplate(templateId: string): void;
  createTransferPlan(template: LoadoutTemplate): void;
  copyMissingItems(template: LoadoutTemplate, analysis: LoadoutTemplateAnalysis | null): void;
  executeMissingTransfer(template: LoadoutTemplate, analysis: LoadoutTemplateAnalysis | null): void;
  executeSingleItemTransfer(template: LoadoutTemplate, item: LoadoutTemplate["items"][number]): void;
  equipSingleItem(template: LoadoutTemplate, item: LoadoutTemplate["items"][number]): void;
  equipSavedLoadout(
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number]
  ): void;
  snapshotCurrentLoadout(
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number]
  ): void;
  openTemplateSourceItem(item: LoadoutTemplate["items"][number], templateCharacterId?: string): void;
};
```

## 执行任务

### 任务 1：app 层补选中详情模型

文件：

- 修改 `packages/app/src/workspaces/loadoutsPage.ts`
- 修改 `packages/app/test/loadouts-page-workspace.test.ts`

步骤：

- [ ] 在测试中新增本地模板选中用例：传入 `selectedEntryId: "local-template-target"`，断言 `workspace.model.selectedDetail.kind === "local-template"`，并断言风险摘要、迁移计划和比较行仍与现有行为一致。
- [ ] 在测试中新增游戏内槽位选中用例：传入 `selectedEntryId: "in-game-char-target-0"`，断言 `workspace.model.selectedDetail.kind === "in-game-slot"`，并断言槽位名称、角色、装备列表和 entry 高亮 id 正确。
- [ ] 在 `createLoadoutsPageWorkspace` 中新增 `selectedEntryId` 输入，保留当前 `selectedTemplateId` 兼容本地模板状态。
- [ ] 新增 `selectLoadoutsSelectedDetail(input)` 或同等私有函数，把本地模板详情、游戏内槽位详情和空态都放到 app 层派生。
- [ ] 保持旧字段暂时不删，让 Desktop / Prototype / Web 可以分阶段迁移。

验证：

```powershell
npx pnpm@9.15.0 vitest --run packages/app/test/loadouts-page-workspace.test.ts
```

### 任务 2：迁出 UI 内的 entries 和游戏内槽位查找

文件：

- 修改 `packages/app/src/workspaces/loadoutsPage.ts`
- 修改 `packages/ui/src/loadouts/LoadoutsPageContentView.tsx`
- 修改 `packages/desktop/test/loadout-library-ui.test.ts`

步骤：

- [ ] 删除或停用 UI 内的 `buildFallbackLoadoutEntries`，要求 `model.entries` 始终由 app 层提供。
- [ ] 删除 UI 内的 `getSelectedInGameLoadoutSlot`，游戏内详情只读取 `model.selectedDetail.kind === "in-game-slot"`。
- [ ] 将 `LoadoutEntryRow` 的游戏内操作参数从 `accountSummary + characterId + slotIndex` 改为 entry 或 selected detail 中已经解析好的 character / slot。
- [ ] 调整 `packages/desktop/test/loadout-library-ui.test.ts` 中仍要求 `props.loadoutEntries`、`selectedLoadoutEntryId` 或 UI fallback 的源码断言，改为检查 app 层 ViewModel 行为或 UI props 边界。

验证：

```powershell
npx pnpm@9.15.0 vitest --run packages/app/test/loadouts-page-workspace.test.ts
npx pnpm@9.15.0 vitest --run packages/desktop/test/loadout-library-ui.test.ts
```

### 任务 3：收窄共享 UI props

文件：

- 修改 `packages/ui/src/loadouts/LoadoutsPageContentView.tsx`
- 修改 `packages/ui/src/index.ts`
- 修改 `packages/desktop/test/shared-ui-i18n.test.tsx`

步骤：

- [ ] 新增并导出 `LoadoutsPageActions` 类型。
- [ ] 将 `LoadoutsPageContentViewProps` 改为 `model + actions + 平台状态`，逐步删除 `accountSummary`、`templates`、`loadoutEntries`、`selectedTemplate`、`compareTemplate`、`selectedAnalysis`、`transferPlan`、`statusSummary`、`visibleCompareRows`、`missingCount`、`readyCount`、`actionableCount` 等散 props。
- [ ] `LoadoutItemRow` 改为消费 `LoadoutTemplateItemRowView`，不再在 UI 内调用 `getItemStatus`、`getBlockedDetails`、`getSourceItem`。
- [ ] 保留当前 DOM 结构和 class 名称，避免把 ViewModel 收深和视觉改版混在一起。
- [ ] 更新 i18n 渲染测试，让测试创建 `LoadoutsPageModel` fixture，而不是拼一组宽 props。

验证：

```powershell
npx pnpm@9.15.0 typecheck:ui
npx pnpm@9.15.0 vitest --run packages/desktop/test/shared-ui-i18n.test.tsx
```

### 任务 4：迁移三端 adapter

文件：

- 修改 `packages/desktop/src/renderer/features/loadouts/LoadoutsPage.tsx`
- 修改 `packages/prototype/src/main.tsx`
- 修改 `packages/web/src/main.tsx`

步骤：

- [ ] Desktop 在 `LoadoutsPage` 内维护或接收 `selectedEntryId`，调用 `createLoadoutsPageWorkspace` 后只向 UI 传 `model` 和 `actions`。
- [ ] 本地模板 entry 点击时同时调用 `actions.selectEntry("local-template-...")` 和现有 `onSelectTemplate(templateId)`，确保重命名草稿仍同步当前模板名称。
- [ ] 游戏内 entry 点击时只切换 `selectedEntryId`，不改 `selectedTemplateId`。
- [ ] Prototype 和 Web 的 mock 配装页也通过同一个 `createLoadoutsPageWorkspace` 生成 `model`，不绕过 app 层。
- [ ] 确认 `onEquipSavedLoadout` 和 `onSnapshotCurrentLoadout` 仍拿到原始 character / slot，保留覆盖游戏内配装栏的外观 hash 链路。

验证：

```powershell
npx pnpm@9.15.0 typecheck:ui
npx pnpm@9.15.0 verify:vibe:desktop:loadouts
```

### 任务 5：测试红线和文档收口

文件：

- 修改 `packages/desktop/test/loadout-library-ui.test.ts`
- 修改 `packages/desktop/test/loadouts-prototype-workspace.test.ts`
- 修改 `docs/todo.md`

步骤：

- [ ] 补边界测试：`LoadoutsPageContentViewProps` 必须包含 `model` 和 `actions`，并禁止重新出现 `buildFallbackLoadoutEntries`。
- [ ] 补三端接线测试：Prototype / Web / Desktop 都必须调用 `createLoadoutsPageWorkspace` 并向 UI 传 `model`。
- [ ] 保留或新增 Bug #62 回归断言：游戏内配装 entry 可查看详情，详情区包含应用和覆盖操作。
- [ ] 更新 `docs/todo.md` 的 T4 下一步状态，说明配装页 ViewModel 收深已推进或完成。

验证：

```powershell
npx pnpm@9.15.0 verify:ui
npx pnpm@9.15.0 verify:desktop:loadouts
npx pnpm@9.15.0 verify:docs
```

## 提交边界

建议拆成 3 个提交：

1. `refactor(app): model loadouts selected detail`
   - 只改 `packages/app/src/workspaces/loadoutsPage.ts` 和对应 app 测试。
2. `refactor(ui): narrow loadouts content props`
   - 改共享 UI、UI 出口和渲染测试，不改视觉样式。
3. `refactor(desktop): wire loadouts page model`
   - 改 Desktop / Prototype / Web adapter、边界测试和 `docs/todo.md`。

如果执行前工作区已有其他 agent 的无关改动，先运行：

```powershell
tools\git-preflight.cmd
```

不要使用 `git add -A` 混提交其他菜单、release、工具脚本或用户本地改动。

## 风险

- Prototype / Web 也直接消费 `LoadoutsPageContentView`，UI props 收窄时必须同步 adapter，否则 `typecheck:ui` 会失败。
- 当前 `packages/desktop/test/loadout-library-ui.test.ts` 有多条源码字符串断言，迁移时应把断言改到稳定行为、导出类型或 app ViewModel 输出上，避免把旧宽 props 当成验收标准。
- 游戏内配装详情是近期 Bug #62 的修复点，迁移时最容易因为只切 `selectedTemplateId` 而丢失详情。
- 覆盖游戏内配装栏依赖 Bungie 槽位外观 hash，任何 adapter 改动都不能丢掉 `name_hash`、`icon_hash`、`color_hash`。
- 这次计划会同时触碰 `packages/app`、`packages/ui`、Prototype / Web / Desktop adapter，执行时应作为配装菜单专项串行推进，不和其他菜单 UI agent 同时改共享 UI props。

## 验收标准

- `LoadoutsPageContentViewProps` 不再暴露原始 `accountSummary`、`templates`、`selectedAnalysis`、`transferPlan` 和 helper 函数。
- `LoadoutsPageContentView` 内不再存在 `buildFallbackLoadoutEntries` 和 `getSelectedInGameLoadoutSlot`。
- `packages/app/src/workspaces/loadoutsPage.ts` 输出 `LoadoutsPageModel`，包含 entries、selected detail、risk summary 和 compare view。
- 本地模板详情、游戏内配装详情和空态都由 app 层建模。
- Prototype / Web / Desktop 都通过 `createLoadoutsPageWorkspace` 生成 model 后渲染同一个共享 UI。
- Bug #62 行为保留：游戏内条目可选中、可查看装备列表、可应用到角色、可用当前装备覆盖。
- 文档和当前待办入口同步，相关验证通过。
