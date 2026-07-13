# 资料库页面 ViewModel 收口计划

> 执行规则覆盖：本文保留的测试、`Red / Verify` 和 `verify:*` 命令仅是历史计划记录，不是当前 agent 执行要求。实际开发不得据此新增或运行测试；统一遵守仓库根目录 `AGENTS.md`。

> 范围：仅限资料库菜单。目标是把资料库页面的纯派生逻辑从共享 UI 和 Desktop hook 收到 `packages/app`，不改搜索 IPC、不改核心 Manifest / Perk 搜索算法、不调整其他菜单视觉。

## 背景

候选 1 的核心是“收深共享缓存和页面 ViewModel module，让 UI 的 interface 变窄”。资料库菜单目前已经共用 `packages/ui/src/library/LibraryPageContentView.tsx`，但页面 interface 仍然偏宽：UI 直接接收搜索结果、筛选状态、历史、别名、社区推荐、实时来源、资料库状态、loading、错误和大量回调，并在组件内部继续计算可见结果、掉落分组、统计、Manifest 提示和空态。

这导致三个问题：

- UI module 的 interface 接近 implementation，调用方必须知道大量字段组合。
- Desktop `useLibraryWorkspace` 负责真实调用之外，还要把许多页面状态原样暴露给 UI。
- 资料库 Perk 关联装备、来源状态、实时售卖和空态这类行为难以在 app 层用稳定测试锁住。

## 目标

新增 `packages/app/src/workspaces/libraryPage.ts`，形成资料库页面的深 module：

- `LibraryPageCache`：搜索结果、历史、社区推荐、实时来源、资料库状态等页面缓存。
- `LibraryPageState`：当前模式、筛选、搜索触达状态、loading/error、别名草稿、详情 loading key。
- `selectLibraryPageModel(cache, state)`：输出窄的 `LibraryPageModel`，供 UI 渲染。

UI 保留布局、控件和事件绑定；Desktop / Prototype / Web 只负责 adapter 和 mock 数据输入。

## 非目标

- 不重写资料库视觉层级。
- 不修改 `packages/core/src/items/perkSearch.ts` 的搜索算法。
- 不改 `packages/desktop/src/main/ipc/library.ts` 的 IPC 契约。
- 不引入新的 runtime adapter 或跨菜单共享 shell 改动。
- 不把资料库页面模型给首页或其他菜单直接消费。

## 计划

### 1. app 层测试先行

新增 `packages/app/test/library-page-workspace.test.ts`，覆盖：

- 装备模式下按筛选输出 `visibleItems`、`dropQueryGroups`、命中数和来源统计。
- Perk 模式下保留 `related_items`，输出 Perk 行的关联分类和关联装备名称。
- Manifest 未初始化、缺组件、需更新、读取失败时输出稳定 `manifestAlert`。
- 没有搜索触达、搜索后无结果时输出不同 `emptyState`。

### 2. 新增 `libraryPage` module

在 `packages/app/src/workspaces/libraryPage.ts` 定义资料库类型和 selector：

- 迁入 `LibraryEquipmentFilter`、`LibraryPerkFilter`、默认筛选、筛选函数、掉落来源分类函数。
- 输出 `LibraryPageModel`，包含 `queryPanel`、`results`、`manifestAlert`、`stats`、`emptyState` 和 `aliasPanel`。
- 保持纯函数，不依赖 React、Electron、IPC 或 `window.d2`。

### 3. UI 改成 `model + actions`

调整 `packages/ui/src/library/LibraryPageContentView.tsx`：

- props 收窄为 `model: LibraryPageModel`、`actions: LibraryPageActions`、`interfaceLocale?`。
- 移除组件内的筛选、分组、统计和 Manifest alert 派生。
- 继续保留现有 className 和布局结构，降低视觉回归风险。

### 4. 平台入口接入 selector

调整资料库平台入口：

- Desktop `useLibraryWorkspace` 继续持有真实数据和状态，但返回 `model` 需要的 cache/state。
- Desktop `LibraryPage` 调 `selectLibraryPageModel` 后传给 UI。
- Prototype / Web 用 mock cache/state 调同一个 selector。

### 5. 验证

最小验证：

```powershell
npx pnpm@9.15.0 vitest --run packages/app/test/library-page-workspace.test.ts packages/desktop/test/library-filters.test.ts
npx pnpm@9.15.0 verify:ui
```

若 Desktop adapter 接线被实质修改，再追加：

```powershell
npx pnpm@9.15.0 verify:desktop
```

## 验收标准

- `LibraryPageContentView` 不再直接接收 `items`、`perks`、`liveAvailability`、`libraryCommunityMatch`、`manifestStatus` 等原始页面缓存。
- 资料库筛选、掉落分组、Perk 关联展示、Manifest alert 和 empty state 可通过 `selectLibraryPageModel` 单测验证。
- Prototype / Web / Desktop 继续共用同一个资料库内容页。
- 不影响账号、仓库、配装、商人、设置等其他菜单。
