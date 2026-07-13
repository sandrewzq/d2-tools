# 账号页 ViewModel 收口计划

> 执行规则覆盖：本文保留的测试、`Red / Verify` 和 `verify:*` 命令仅是历史计划记录，不是当前 agent 执行要求。不得据此自动新增测试或执行旧命令；用户主动本地测试时照常运行现有测试。

## 背景

账号页已经有 `packages/app/src/workspaces/accountPage.ts` 中的 `AccountPageWorkspace`，但共享 UI `AccountPageContentView` 仍然接收大量宽 props，并混用原始账号实体、页面派生数据、平台状态、活动数据、配装状态、工具函数和行为回调。Prototype / Web / Desktop 也都需要手工拼同一批参数，导致账号页新增按钮、活动状态或物品打开参数时容易三端漏改。

本计划只收口账号菜单，不同步改配装、设置或共享 workspace chrome。

## 目标

- 账号页 UI 只依赖 `AccountPageViewModel` 和 `AccountPageActions`。
- `packages/app` 先形成最小 `SharedDomainCache`，再通过 `selectAccountPageModel({ cache, pageState })` 生成账号页展示模型。
- Desktop / Prototype / Web 只提供真实或 mock cache / pageState，并注入动作函数。
- UI 层不再出现账号页专用 `Any* = any` 类型别名，也不直接依赖 `StartupState` 或 `AccountSummary["characters"][number]`。

## 非目标

- 不重做账号页视觉设计。
- 不迁移其他菜单。
- 不调整 Desktop 主进程、IPC 或真实账号读取逻辑。
- 不解决当前工作区中配装页已有的类型错误。

## 设计

### ViewModel 边界

在 `packages/app/src/workspaces/accountPage.ts` 保留已有 `AccountPageWorkspace`，并新增完整的 `AccountPageViewModel`：

```ts
export type AccountPageViewModel = {
  connection: AccountConnectionView;
  feedback: AccountFeedbackView;
  profile: AccountProfileView | null;
  navigation: AccountPageNavItem[];
  selectedCharacter: AccountCharacterDetailView | null;
  loadout: AccountLoadoutSectionView;
  activity: AccountActivitySectionView;
  materials: AccountMaterialsSectionView;
  postmaster: AccountPostmasterSectionView;
};
```

`selectAccountPageModel({ cache, pageState })` 内部复用 `createAccountPageWorkspace(input)`，避免复制现有槽位、材料、邮政官和角色页签派生逻辑。

### 共享缓存边界

第一阶段只定义账号页需要的最小缓存，不一次性迁移首页、商人和资料库：

```ts
export type SharedDomainCache = {
  accountSummary: AccountSummary | null;
  activitySummary: ActivityHistorySummary | null;
};

export type AccountPageModelInput = {
  cache: SharedDomainCache;
  pageState: AccountPageState;
};
```

后续首页单独做 `selectHomePageModel(cache)`，可以复用 `cache.accountSummary`，但不得依赖 `AccountPageViewModel`。

### Action 边界

在 UI 层导出 `AccountPageActions`：

```ts
export type AccountPageActions = {
  configureBungie(): void;
  loginBungie(): void;
  refreshAccount(): void;
  refreshActivity(): void;
  selectCharacter(characterId: string): void;
  saveCurrentLoadout(characterId: string): void;
  equipHighestPower(characterId: string): void;
  openItem(payload: AccountOpenItemPayload): void;
};
```

UI 不再从原始 item 临时拼 `source_character_id`；ViewModel 中的物品按钮携带 `openPayload`。

### 三端接线

- Desktop：`packages/desktop/src/renderer/features/account/AccountPage.tsx` 负责调用 `selectAccountPageModel`，并把 payload 转发到现有真实动作。
- Prototype / Web：继续使用 mock 数据，但也通过同一个 `selectAccountPageModel` 生成账号页模型。
- UI：`AccountPageContentViewProps` 收窄为：

```ts
export type AccountPageContentViewProps = {
  interfaceLocale?: InterfaceLocale;
  viewModel: AccountPageViewModel;
  actions: AccountPageActions;
};
```

## 执行任务

### 任务 1：补架构边界测试

文件：

- 修改 `packages/desktop/test/account-inventory-ui.test.ts`

验收：

- 测试要求 `AccountPageContentViewProps` 包含 `viewModel` 和 `actions`。
- 测试禁止账号 UI 文件中出现 `type AnyAccount`、`startupState:`、`accountWorkspace:` 和 `selectedCharacter:` props。
- 测试要求 Desktop / Prototype / Web 都出现 `selectAccountPageModel`。

验证：

```powershell
npx pnpm@9.15.0 vitest --run packages/desktop/test/account-inventory-ui.test.ts -t "account page view model"
```

### 任务 2：在 app 层新增 SharedDomainCache 和完整 ViewModel selector

文件：

- 修改 `packages/app/src/workspaces/accountPage.ts`
- 修改 `packages/app/test/account-page-workspace.test.ts`

验收：

- `selectAccountPageModel({ cache, pageState })` 输出连接状态、反馈、导航、角色详情、活动、材料和邮政官区块。
- ViewModel 中物品按钮带 `openPayload`。
- 旧 `createAccountPageWorkspace` 暂时保留，降低并行改动冲突。

验证：

```powershell
npx pnpm@9.15.0 vitest --run packages/app/test/account-page-workspace.test.ts
```

### 任务 3：迁移共享账号 UI 入参

文件：

- 修改 `packages/ui/src/account/AccountPageContentView.tsx`

验收：

- UI 只接 `viewModel` 和 `actions`。
- UI 不再接收账号页专用 `Any* = any`。
- UI 仍保留当前账号页结构、按钮、活动复盘、材料和邮政官展示。

验证：

```powershell
npx pnpm@9.15.0 vitest --run packages/desktop/test/account-inventory-ui.test.ts -t "account page view model|keeps account refresh|keeps recent account activities"
```

### 任务 4：迁移 Desktop / Prototype / Web adapter

文件：

- 修改 `packages/desktop/src/renderer/features/account/AccountPage.tsx`
- 修改 `packages/prototype/src/main.tsx`
- 修改 `packages/web/src/main.tsx`

验收：

- 三端都调用 `selectAccountPageModel`。
- 三端都向 UI 传 `viewModel` 和 `actions`。
- Desktop 仍能把打开装备、保存当前配装、装备最高光等动作转发到现有真实回调。

验证：

```powershell
npx pnpm@9.15.0 vitest --run packages/desktop/test/account-inventory-ui.test.ts -t "account page view model"
npx pnpm@9.15.0 vitest --run packages/desktop/test/shared-ui-i18n.test.tsx
```

### 任务 5：文档和收口验证

文件：

- 修改 `docs/todo.md`

验收：

- `docs/todo.md` 的 T4 下一步记录账号页 ViewModel 收口已推进。
- `docs:check` 通过。
- 如果当前工作区配装页类型错误仍存在，最终说明要明确 `verify:ui` / `verify:desktop` 的阻塞来源。

验证：

```powershell
npx pnpm@9.15.0 docs:check
npx pnpm@9.15.0 verify:vibe:ui
npx pnpm@9.15.0 verify:vibe:desktop:account
```

## 风险

- 当前工作区存在多菜单并行改动，尤其 `packages/ui/src/styles.css`、`packages/ui/src/loadouts/LoadoutsPageContentView.tsx` 和 Desktop page provider 相关文件。执行时不要格式化、回退或顺手修这些无关改动。
- `verify:ui` 和 `verify:desktop` 可能被配装页既有类型错误阻塞。账号页收口期间优先跑账号定向测试和 app workspace 测试，收口时再报告全量门禁状态。
