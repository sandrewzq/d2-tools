# 跨端工作区页面模板收口

## 背景

Prototype、Web、Desktop 已共用 `ProductShellHost` 和 `packages/ui/src/styles.css`，但主菜单内部仍保留大量菜单私有顶层布局，例如 `library-workbench-layout`、`account-page-shell`、`app-settings-shell`、`vault-workbench-layout`、`loadout-workbench-shell` 和 `vendor-workbench-layout`。这会导致顶部标题、内容起始线、左右分栏、空结果区和面板高度继续分叉。

## 目标

把顶层页面结构收口为共享工作区模板：

- `ProductWorkspacePage`：页面内容根，统一标题下方间距和首屏节奏。
- `ProductWorkspacePanel`：主面板，统一边框、圆角、背景和最小高度。
- `ProductWorkspaceCommandBar`：搜索、筛选、摘要等命令区。
- `ProductWorkspaceSplit`：左侧导航/筛选 + 右侧主内容的稳定分栏。
- `ProductWorkspaceSideRail`：侧栏容器。
- `ProductWorkspaceContentStack`：右侧内容栈。
- `ProductWorkspaceEmptyState`：空结果区，避免搜索页只剩一条薄面板。

菜单私有 CSS 只保留领域内部细节，例如资料库结果卡片、账号装备槽、仓库条目、配装装备行和商人库存卡片；不再由菜单私有 CSS 决定页面根间距、主分栏和空状态高度。

## 首批迁移

1. 资料库：使用共享 split / side rail / content stack / empty state，解决空搜索结果和左侧筛选割裂。
2. 账号：使用共享 page / split / side rail / content stack，解决标题下方空白和内容起始线不稳。
3. 设置：使用共享 split / side rail / content stack，解决顶部空白和菜单页视觉分叉。
4. 仓库、配装、商人：首页、仓库、配装、资料库、账号、商人、设置都挂共享模板入口；后续只允许在领域 CSS 里保留卡片、列表、装备行和库存格等内部细节。

## 验收

- Prototype / Web / Desktop 主菜单仍通过同一套 `packages/ui` 页面渲染。
- 主菜单页面根、主面板、命令栏、左右分栏、侧栏、内容栈和空状态由 `ProductWorkspace*` 组件生成，不再要求每页手写 `product-workspace-*` class。
- 资料库空结果状态有稳定可见区域，不再只显示一条薄面板。
- 账号、设置、资料库、仓库、配装、商人顶部标题到内容的间距由共享模板控制。
- `visual:all` 通过明暗主题和三端扫描。
