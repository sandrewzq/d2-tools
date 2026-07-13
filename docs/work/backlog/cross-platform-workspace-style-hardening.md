# 跨端工作区骨架与样式系统彻底收口计划

> 执行规则覆盖：本文保留的测试、`Red / Verify`、`verify:*` 和视觉命令仅是历史计划记录，不是当前 agent 执行要求。实际开发不得据此新增或运行测试；统一遵守仓库根目录 `AGENTS.md`，普通 push 交给 CI，Release 使用发布脚本。

> 状态：进行中（结构收口与代码边界已落地，真实 UI 视觉样式收口未完成）
> 关联任务：`docs/todo.md` T4 跨端 UI 壳、可交互原型与桌面视觉收口
> 参考基准：`docs/work/references/d2-unified-workspace-layout-v0.html`

## 目标

彻底解决 Prototype / Web / Desktop 和各主菜单之间“像多个页面拼起来”的问题。最终结构必须做到：

1. 页面骨架只有一个所有者。
2. 页面标题、页面级 gap、页面滚动和首层面板 chrome 由共享 workspace 系统统一控制。
3. 菜单内容层可以有领域差异，但不能重写页面骨架、首层面板、首层工具栏和暗色背景。
4. `tool-panel`、`product-card`、`app-panel` 等旧类继续保留合理用途，但不能再参与主菜单页面骨架。
5. 参考 HTML 只作为设计约束和视觉基准，不能把说明性内容迁入真实 UI。
6. Desktop renderer 的产品入口不再做所有菜单的事实总控；每个菜单应由独立 Provider 组装自己的 workspace props，首页也只是平级菜单。

## 非目标

- 不重做 Bungie / 账号 / 仓库 / 资料库 / AI 的业务逻辑。
- 不改 Web / Desktop 的数据 provider 语义，除非页面挂载结构必须同步。
- 不把所有领域内容卡片改成同一种外观；装备卡、奖励卡、设置表单、商人商品可以有领域样式。
- 不删除 `tool-panel`、`product-card`、`app-panel`，只收窄它们的使用层级。

## 当前问题清单

本计划已吸收并替代已删除的历史计划 `cross-platform-workspace-layout-template.md`，并合并原 `cross-platform-ui-shell-refactor.md` 中仍有效的跨端壳边界、adapter、i18n、测试分层和视觉验证要求。后续不再单独维护“跨端 UI 壳收口”或“工作区页面模板收口”计划，T4 的工作区骨架、样式语义、测试红线、跨端壳边界和视觉验收都以本文为准。

## 当前事实

已完成的方向不再作为待办重复追踪：

- 已建立 `packages/ui`、`packages/prototype` 和 `packages/web`。
- Prototype / Web / Desktop 均已挂共享 `ProductShellHost`。
- 旧 Desktop 专用 shell wrapper 已退役，Desktop 只保留 Electron 平台能力 adapter。
- 界面语言和 Bungie 资料库语言已分开建模，Desktop 偏好持久化已接入。
- 首页、设置页、账号页、资料库页、配装页、仓库页和商人页已不同程度迁入 `packages/ui`。
- Prototype 已成为当前活跃原型入口。
- 静态 HTML 不作为新的活跃实现入口；仍作为视觉和规则参考基准。

本轮已完成页面骨架所有权、主菜单 ContentView 纯内容层、`showInternalHeading` 平台入口清理、设置页首层旧面板类收口，以及对应结构 / 样式红线测试同步。本轮继续完成了首层 workspace chrome 基础收口、仓库卡片抗压、配装详情首层 panel 化，以及视觉脚本卡住问题修复。

当前自动门禁已经覆盖：`verify:ui`、`verify:desktop`、`verify:docs`、`visual:home`、`visual:settings`、`visual:loadouts`、`visual:ai` 和 `visual:all`。这些结果说明结构、类型、接线、文档和自动视觉扫描通过；后续仍建议由用户打开 Prototype / Desktop 做一次人工审美复核，避免自动脚本无法表达的密度和观感问题。

## 当前执行状态（2026-07-06）

本节是当前执行状态，不是历史问题复述。后续 agent 接手时必须从这里继续，不得只看旧阶段计划判断还有哪些未完成。

### A. 本轮已完成

- `.product-workspace-panel` 已统一 `padding`、`border`、`border-radius`、`background` 和 `box-shadow`。
- `.product-side-rail` 已统一首层侧栏 chrome；`.product-content-stack` 保持为纯 stack，不承担 panel chrome。
- `LoadoutsPageContentView` 的方案详情区已从 `ProductWorkspaceContentStack` 改为 `ProductWorkspacePanel`，避免首层详情区域看起来缺面板。
- 仓库卡片已补 `.vault-title-row`、`.vault-card-body .decision-badge` 和 `.vault-card-actions` 的窄宽度抗压规则。
- `visual:home` 卡住根因已修复：Desktop 截图等待旧 `.home-app-page`，但真实首页已改为内容层 `.home-briefing-grid`；脚本已补超时和进程树清理。
- `visual:home`、`visual:settings`、`visual:loadouts`、`visual:ai` 和 `visual:all` 已在本轮通过，`visual:all` 扫描 70 个状态。

### B. 仍需人工复核

- 自动视觉扫描不能完全判断审美质量。用户仍应打开 Prototype / Desktop 检查首页、仓库、配装、资料库、商人、设置的密度、留白、层级和实际观感。
- 如果人工复核发现某页“不统一”，优先改 `packages/ui/src/styles.css` 和共享 ContentView；不要回到 Desktop 私有 CSS 或旧 HTML。
- 新增 UI 需求继续先改共享 UI / Prototype，再由 Web 和 Desktop 共同消费。

### C. Header actions 两列布局遗漏

本轮人工复核发现首页刷新按钮在真实 UI 中掉到标题下方，而参考 HTML 中按钮位于标题区右侧。根因是计划只写了 `ProductWorkspaceHeader` 负责标题、副标题和页面级 action，但没有把参考 HTML 的两列布局转成硬性验收标准。

必须补齐以下规则：

1. `.product-workspace-header` 是标题区唯一骨架，必须使用 `display: grid`。
2. 桌面宽度下标题区必须使用 `grid-template-columns: minmax(0, 1fr) auto`，左侧放标题和副标题，右侧放页面级 actions。
3. `.product-page-header-actions` 必须右对齐，且默认不掉到标题下方。
4. 窄屏或空间不足时才允许 action 换行；换行规则必须由共享 workspace CSS 控制，不能由某个菜单私有 class 控制。
5. `workspace-layout.test.ts` 必须锁住 header grid、actions 右对齐和 `ProductWorkspaceHeader` 结构，避免再次只验证“组件存在”而漏掉布局。

### D. `styles.css` 历史规则仍需整理

`packages/ui/src/styles.css` 中仍存在多轮重构留下的重复或过时规则：

- `.app-page`、`.home-app-page`、`.settings-app-page`、`.vault-product-layout`、`.loadout-product-layout`、`.library-product-layout` 等旧类仍保留，部分用于 standalone fallback，部分已不应影响真实主菜单。
- 首页、仓库、配装、资料库、商人、设置的私有样式散落在不同位置，后写规则覆盖前写规则，容易造成“改一处又被后面覆盖”。
- `ProductWorkspace*` 基础规则与菜单私有规则的先后顺序需要重新整理，避免私有规则偷偷覆盖首层 chrome。

下一步：

1. 在 `styles.css` 中建立清晰顺序：token -> workspace primitives -> shared content primitives -> page private content styles -> responsive overrides。
2. 给 legacy 类加注释和测试白名单，明确哪些只能用于 fallback。
3. 删除或收窄已不被真实入口使用的页面级布局规则。

### E. 验收口径

后续汇报必须使用以下口径：

- “结构收口完成”：只表示 `ContentView` / `ProductShellHost` / 平台入口边界正确，并且相关结构测试通过。
- “常规验证通过”：只表示 `verify:ui`、`verify:desktop`、`verify:docs` 通过。
- “自动视觉门禁通过”：表示 `visual:home`、`visual:settings`、`visual:ai`、`visual:all` 等脚本报告通过。
- “视觉收口完成”：必须说明依据是自动视觉脚本、人工截图确认，还是两者都有；不能只用 `verify:*` 代替视觉结论。
- “HTML 还原完成”：必须同时包含结构、CSS 布局属性和关键交互位置的验收；只检查组件存在或页面可见不算还原完成。

如果后续没有重新运行视觉脚本，或用户指出截图观感问题，不得继续回复“UI 完成”。

### F. Desktop 菜单 Provider 解耦计划

本节状态：已落地。当前实现为：

- `packages/desktop/src/renderer/pages/HomePage.tsx` 只负责挂载 `ProductShellHost`、`DesktopMenuProvider`、`HomePageRoutes` 和全局装备详情弹窗。
- 产品级状态、顶部状态、AI 抽屉、后台任务、更新横幅、全局写操作和各菜单 props 组装已迁到 `useDesktopProductShell.tsx`。
- 菜单渲染入口已迁到 `packages/desktop/src/renderer/pages/providers/*MenuProvider.tsx`，`HomePageRoutes.tsx` 只根据 `activePage` 选择对应 Provider。
- 产品级写操作 hook 已从 `useHomePageWriteActions.ts` 改名为 `useDesktopProductWriteActions.ts`，避免把跨菜单写操作继续命名为首页能力。
- `packages/desktop/test/desktop-menu-provider-boundaries.test.ts` 已新增边界：禁止 `features/home/` import 其他菜单 feature，禁止 `HomePage.tsx` 直接 import 菜单 workspace hooks，禁止恢复旧 HomePage 写操作命名，并要求路由通过菜单 Provider 渲染。

后续如果继续下沉菜单 ViewModel，应在 `packages/app` 或对应菜单 Provider 内推进；不要把这些逻辑重新塞回 `HomePage.tsx`。

改造前，Desktop renderer 的 composition root 仍然偏胖。`packages/desktop/src/renderer/pages/HomePage.tsx` 同时初始化账号、资料库、配装、仓库、商人、首页、AI、写操作和全局状态，再把所有菜单 props 一次性传给 `HomePageRoutes`。这会让首页看起来像其他菜单的上级聚合器，也会让多 agent 分菜单开发时边界不清。本轮已经按上面的落地状态拆出 Provider 和产品壳 hook；本段保留为问题背景。

目标不是让首页管理其他菜单，而是让首页、账号、仓库、配装、资料库、商人、设置都成为 `ProductShellHost` 下的平级菜单：

```text
DesktopProductShell
  负责 shell、路由、顶部状态、AI 抽屉、全局偏好、全局提示

HomeMenuProvider
AccountMenuProvider
VaultMenuProvider
LoadoutsMenuProvider
LibraryMenuProvider
VendorsMenuProvider
SettingsMenuProvider
  各自组装自己的菜单 props
  不 import 其他菜单内部 hook
```

首页菜单的规则：

- 首页可以展示跨领域摘要，但不能 import 其他菜单的内部 hook、组件或私有 ViewModel。
- 首页需要的提醒、状态和摘要应来自首页自己的 workspace props，或后续从 `packages/app` / `packages/services` 暴露的轻量 summary。
- 首页不是账号、仓库、商人、配装或资料库的父级；其他菜单也不应依赖首页。

已执行的实施阶段：

1. **边界测试先行**
   - 新增或扩展 `packages/desktop/test/desktop-menu-provider-boundaries.test.ts`。
   - 断言 `features/home/` 不得 import `features/account|vault|vendors|loadouts|library`。
   - 断言 `HomePage.tsx` 不得直接 import `useAccountWorkspace`、`useLibraryWorkspace`、`useLoadoutTemplates` 等菜单 workspace hooks。
   - 断言菜单 Provider 只能 import 自己菜单目录、`shared/`、`api/`、`@d2-tools/app`、`@d2-tools/ui` 和明确的平台 adapter。
   - 断言 `useHomePageWriteActions.ts` 不再作为首页写操作命名存在，产品级写操作应改名为 `useDesktopProductWriteActions.ts` 或同等语义。

2. **拆出产品级 Shell 状态**
   - 从 `HomePage.tsx` 中先拆出 `useDesktopProductShell.ts` 或等价模块。
   - 只保留真正全局的状态：`activePage`、`assistantMode`、界面语言、颜色模式、顶部状态条、后台任务、更新横幅、AI 抽屉、`platformActions`。
   - 不在本阶段移动菜单业务逻辑，避免一次改动过大。

3. **新增菜单 Provider 目录**
   - 新建 `packages/desktop/src/renderer/pages/providers/`。
   - 逐步新增：
     - `HomeMenuProvider.tsx`
     - `AccountMenuProvider.tsx`
     - `VaultMenuProvider.tsx`
     - `LoadoutsMenuProvider.tsx`
     - `LibraryMenuProvider.tsx`
     - `VendorsMenuProvider.tsx`
     - `SettingsMenuProvider.tsx`
   - 每个 Provider 只返回对应菜单页面组件，例如 `HomeMenuProvider` 返回 `HomeDashboard`，`VaultMenuProvider` 返回 `VaultPage`。

4. **按低风险顺序迁移菜单**
   - 先迁移 `VendorsMenuProvider`：主要依赖 daily summary，风险低。
   - 再迁移 `LibraryMenuProvider`：已有 `useLibraryWorkspace`。
   - 再迁移 `AccountMenuProvider`：已有 `useAccountWorkspace`。
   - 再迁移 `LoadoutsMenuProvider`：依赖模板和写操作，复杂度中等。
   - 再迁移 `VaultMenuProvider`：依赖账号、标签、推荐、详情和写操作，最后处理。
   - 最后迁移 `HomeMenuProvider`：只保留首页自己的 `createHomeDashboardWorkspace`、daily / weekly 数据和首页 actions。

5. **重命名产品级写操作**
   - 将 `packages/desktop/src/renderer/pages/useHomePageWriteActions.ts` 重命名为 `useDesktopProductWriteActions.ts`。
   - 该 hook 属于 Desktop 产品壳或写操作 composition，不属于首页菜单。
   - 如果某些写操作只服务单个菜单，优先下沉到对应菜单 Provider，而不是继续放在产品级 hook 里。

6. **瘦身 `HomePage.tsx`**
   - 最终 `HomePage.tsx` 只负责挂载 `ProductShellHost`、提供 shell 状态和路由。
   - `HomePageRoutes` 应渲染各菜单 Provider，而不是接收一个由 `HomePage.tsx` 预先组装好的巨大 props 对象。
   - `HomePage.tsx` 不再直接 import 菜单 workspace hooks。

7. **验证**
   - 每迁移一个 Provider，运行：
     ```powershell
     npx pnpm@9.15.0 verify:desktop
     npx pnpm@9.15.0 verify:ui
     ```
   - 最终收口运行：
     ```powershell
     npx pnpm@9.15.0 verify:ui
     npx pnpm@9.15.0 verify:desktop
     npx pnpm@9.15.0 visual:home
     npx pnpm@9.15.0 visual:all
     npx pnpm@9.15.0 verify:docs
     ```

风险和执行建议：

- 这是中等偏大的 Desktop renderer 架构重构，会碰 `HomePage.tsx`、`HomePageRoutes.tsx`、写操作 hook、多个菜单 provider 和相关测试。
- 不建议和多个菜单 UI agent 同时改同一工作区；执行前先提交当前 UI 收口成果，或使用 worktree 隔离。
- 建议由一个集成 agent 串行推进，按菜单逐个迁移；不要多个 agent 同时拆 provider。
- 每个阶段都必须先补边界测试，再移动实现，避免只靠人工约定维持解耦。

## 执行前置条件

阶段 1 开始前必须先运行：

```powershell
tools\git-preflight.cmd
```

目的不是阻止开发，而是确认当前工作区是否混有其他 agent 的实现改动、工具脚本改动、release 改动或端口改动。若输出显示多条 lane 或高冲突文件，先明确提交边界，必要时开 worktree；不得把工具脚本、release、端口、UI 重构和用户本地改动混成一次提交。

## 跨端边界

### `packages/ui`

`packages/ui` 是产品 UI 和跨端页面结构的主实现：

- 提供 `ProductShellHost`、shell、页面内容视图、共享组件、设计系统 token 和 i18n copy。
- 页面组件只接收 ViewModel、props 和 callback，不直接访问 Electron、浏览器部署、Node 文件系统或 `window.d2`。
- 可见文案优先进入 `packages/ui/src/i18n/` 或对应领域 copy。
- 不新增 Electron、Node 文件系统、浏览器 `window` 全局或移动端不可复用的直接依赖；需要平台能力时通过 adapter / callback 注入。
- 页面骨架保持平台中立，后续移动 App 也是壳，只消费同一套产品 UI 和 ViewModel。

### `packages/prototype`

Prototype 用于 mock 状态、可交互原型和视觉验证：

- 只组合 `packages/ui` 和 mock adapter。
- 可维护原型状态切换面板，例如未登录、资料库过期、后台任务运行、AI 未配置和应用有新版。
- 不长期维护第二套真实页面结构。

### `packages/web`

Web 是浏览器平台壳：

- 挂载共享 `ProductShellHost`。
- 通过 Web adapter、HTTP/API 或浏览器能力读取真实数据。
- 不复制 Prototype mock 页面，也不引入 Electron IPC、本地数据目录或桌面更新逻辑。

### `packages/desktop`

Desktop 是 Electron 平台壳：

- 负责主进程、preload、IPC、本地目录、窗口颜色、OAuth、应用更新、后台任务和打包发布。
- Renderer feature 保留真实数据 adapter、写操作接线和暂未迁出的业务交互。
- 新 UI 结构默认进入 `packages/ui`，Desktop 只把真实状态和 callback 接进去。

### 后续移动端

移动端本轮不做视觉脚本覆盖，但作为架构约束存在：

- 移动 App 也按壳模式接入，不能让 `packages/ui` 依赖 Electron 专属能力。
- `ProductShellHost`、workspace 骨架、页面内容 View 和 i18n copy 必须保持平台中立。
- 当前验收覆盖 Prototype / Web / Desktop；移动端接入时只补平台 adapter、导航和输入差异，不重新实现页面结构。

### 1. 页面容器和页面内容边界未统一

当前 `ProductShellHost` 已经渲染统一页面标题，但多个真实内容组件仍然自己包 `ProductWorkspacePage`：

| 文件 | 问题 |
|---|---|
| `packages/ui/src/home/HomePageView.tsx` | 首页真实挂载组件自己包 `ProductWorkspacePage`，并叠加 `app-page` |
| `packages/ui/src/vault/VaultPageContentView.tsx` | ContentView 自己包 `ProductWorkspacePage` |
| `packages/ui/src/loadouts/LoadoutsPageContentView.tsx` | ContentView 委托 `LoadoutsPageView`，间接包 `ProductWorkspacePage` |
| `packages/ui/src/library/LibraryPageContentView.tsx` | ContentView 委托 `LibraryPageView`，间接包 `ProductWorkspacePage` |
| `packages/ui/src/vendors/VendorsPageContentView.tsx` | ContentView 委托 `VendorsPageView`，间接包 `ProductWorkspacePage` |
| `packages/desktop/src/renderer/features/vault/VaultPage.tsx` | Desktop 仓库存在 `VaultPageView -> VaultPageContentView` 双页面壳风险 |

阶段 1 的测试不能只扫描 `*ContentView.tsx`。真实主菜单挂载组件也必须纳入范围：

- 首页如果继续以 `HomePageView.tsx` 作为真实入口，则它必须符合内容层规则；更推荐拆成 `HomePageContentView.tsx`，让 `HomePageView.tsx` 只做 standalone fallback。
- 测试必须扫描 Prototype / Web / Desktop 的真实 `renderPage` 挂载组件，确认这些入口最终挂的是内容层，而不是 PageView 或二次页面壳。

### 2. `showInternalHeading` 仍在掩盖页面标题边界

Prototype / Web / Desktop 当前大量传入 `showInternalHeading={false}`。这只是隐藏内部标题，不会移除内部页面容器、gap 或私有布局。

涉及文件：

- `packages/ui/src/account/AccountPageContentView.tsx`
- `packages/ui/src/vault/VaultPageContentView.tsx`
- `packages/ui/src/loadouts/LoadoutsPageContentView.tsx`
- `packages/ui/src/library/LibraryPageContentView.tsx`
- `packages/ui/src/vendors/VendorsPageContentView.tsx`
- `packages/prototype/src/main.tsx`
- `packages/web/src/main.tsx`
- `packages/desktop/src/renderer/features/*/*Page.tsx`

### 3. 面板语义混用

当前首层面板和内部对象卡片混用了这些类：

- `product-workspace-panel`
- `app-panel`
- `product-card`
- `tool-panel`
- `daily-source source-ready`

典型问题：

- `ProductWorkspacePanel className="app-panel app-panel-body ..."`
- `ProductWorkspaceContentStack className="... product-workspace-panel"`
- `ProductWorkspaceSideRail className="app-panel settings-menu"`
- `ProductWorkspacePanel className="product-card ..."`

这会让 border、background、shadow、padding 和暗色模式来源不清。

需要额外收紧的范围：

- 所有 `ProductWorkspace*` 组件都不能通过 `className` 伪装成另一个 workspace chrome，包括 `ProductWorkspaceEmptyState`、`ProductWorkspacePanel`、`ProductWorkspaceContentStack`、`ProductWorkspaceSideRail`、`ProductWorkspaceSplit`。
- 禁止出现 `ProductWorkspaceEmptyState className="... product-workspace-panel"` 这类把空态伪装成面板的写法。
- `daily-source`、`source-ready`、`source-status-card` 只能作为内容内部状态块，不能挂在 `ProductWorkspaceSideRail`、`ProductWorkspaceContentStack`、`ProductWorkspaceEmptyState` 或任何首层 workspace 组件上。
- 这类状态块长期迁到 `status-message`、`panel-subsection` 或领域内部状态卡，不再承担页面首层 chrome。

### 4. 旧标题样式仍可能承担页面标题职责

旧标题类仍散落在主菜单真实内容中：

- `section-heading`
- `compact-heading`
- `app-page-head`
- `equipment-section-heading`

其中子区块标题可以保留，但页面标题只能由 `ProductShellHost` / `ProductWorkspaceHeader` 负责。

### 5. 样式约束没有完整转化成测试红线

`docs/work/references/d2-unified-workspace-layout-v0.html` 已经表达了页面骨架、主面板、命令栏、分栏和侧栏的约束，但真实代码没有被测试强制遵守，导致实现靠记忆推进。

### 6. Adapter、i18n 和测试分层仍需继续收口

骨架和样式收口不代表跨端壳工作全部结束，仍需保留以下方向：

- Prototype adapter 只提供 mock 数据和 mock action。
- Web adapter 优先接 `/api/home-snapshot`、`/api/pages/:page/snapshot` 等 HTTP 边界；无服务时允许 fallback snapshot。
- Desktop adapter 继续接 Electron IPC、本地文件、窗口、更新和后台任务。
- 跨端 DTO 放到 `packages/app`、`packages/services`、`packages/ui` 的类型边界，不把大型 DTO 塞回 Desktop renderer API 聚合文件。
- shell、首页、设置页、账号页、仓库页、资料库页和配装页的产品文案优先进入 `packages/ui/src/i18n/`。
- 旧 Desktop feature 中暂留的中文可以保留，但新增文案不要继续分散。
- 不在组件中新增 `locale === ... ? ... : ...` 的临时判断。
- 旧测试如果仍检查 Desktop feature 内部具体结构，应迁到新边界。

### 7. standalone fallback 边界未定义清楚

`*PageView` 可以保留，但只能用于以下场景：

- 未登录、未授权、资料缺失、空态等无法进入正式工作区的 standalone 页面。
- 原型或文档中的独立 preview。
- 某个页面还没有完成 ContentView 拆分时的临时过渡入口。

Prototype / Web / Desktop 主菜单真实入口禁止直接挂 `*PageView`，除非该页尚未拆出 ContentView，且计划中必须有明确迁出任务。已经拆出 ContentView 的页面，必须防止 `PageView -> ContentView` 双壳回归。

### 8. 设置页和 AI 抽屉旧类边界未收口

- 设置页 `app-panel` 不能只写“内部可以继续用”。新增设置分组和已迁移分组应迁到 `panel-subsection`，或新增语义更清楚的 `ProductSettingsSection`。
- `app-panel` 只允许作为未迁移 legacy 内部块存在，并在测试中保持收缩趋势；不能继续作为设置页新分组的默认类。
- `tool-panel` 必须有白名单：`.global-assistant-sidebar`、设置诊断区、设置工具区、操作日志区等低频工具容器。
- `tool-panel` 禁止出现在主菜单页面内容根、首层 workspace 组件或首层主面板上。
- AI 抽屉属于全局产品辅助面板，最终验收必须运行 `visual:ai`，确认 Prototype / Web / Desktop 打开抽屉后样式一致。

## 目标架构

### React 结构

最终主菜单结构必须是：

```tsx
<ProductShellHost>
  <ProductWorkspacePage>
    <ProductWorkspaceHeader />
    <PageContent />
  </ProductWorkspacePage>
</ProductShellHost>
```

其中：

- `ProductShellHost` 负责产品壳、顶部状态、左侧导航、AI 抽屉、后台任务 dock 和页面 workspace 根。
- `ProductWorkspacePage` 包住页面标题和当前页面内容。
- `ProductWorkspaceHeader` 负责标题、副标题和页面级 action。
- `PageContent` 只能返回内容层，例如 `ProductWorkspaceSplit`、`ProductWorkspacePanel`、内容网格或空状态。
- `*ContentView.tsx` 禁止 import 或使用 `ProductWorkspacePage`。
- `*ContentView.tsx` 禁止委托对应 `*PageView.tsx`。

### 样式层级

| 层级 | 允许组件 / class | 责任 | 禁止事项 |
|---|---|---|---|
| 页面骨架层 | `ProductWorkspacePage`、`ProductWorkspaceHeader`、`.shell-content` | 页面滚动、页面标题、页面级 gap、页面背景 | 菜单私有 class 不得覆盖 |
| 首层工作区层 | `ProductWorkspaceSplit`、`ProductWorkspacePanel`、`ProductWorkspaceCommandBar`、`ProductWorkspaceSideRail`、`ProductWorkspaceContentStack` | 首层分栏、主面板、工具栏、侧栏 chrome | 不叠 `app-panel`、`product-card`、`tool-panel` |
| 内容区块层 | `panel-subsection`、领域 `*-section`、`ui-filter-toolbar`、`ui-list-row` | 面板内部的表单、分组、筛选和列表 | 不承担页面根、首层面板、页面标题 |
| 对象卡片层 | `ui-item-card`、领域装备卡、奖励卡、商人商品卡、`product-card` | 面板内部的重复对象卡片 | 不做页面首层容器 |
| 工具面板层 | `tool-panel` 或后续 `ProductToolPanel` | AI、诊断、设置工具、日志和低频操作块 | 不做主菜单页面根或首层面板 |

### 旧类保留规则

| 类 | 保留 | 收口规则 |
|---|---:|---|
| `app-panel` | 是 | 只作为 legacy 内部块，不能用于主菜单首层面板，不能和 `ProductWorkspacePanel` 叠加 |
| `product-card` | 是 | 只用于面板内部对象卡片，不能用于页面大容器，不能和 `ProductWorkspacePanel` 叠加 |
| `tool-panel` | 是 | 只用于 AI、诊断、设置工具区和日志区，不能用于主菜单页面骨架 |
| `section-heading` | 是 | 只用于面板内部子区块标题，不能作为页面标题 |
| `app-page` / `app-page-head` | 逐步淘汰 | 不得用于主菜单真实页面骨架 |

## 实施阶段

### 阶段 1：测试红线先行

目标：先让现状红灯，证明测试能抓住“页面骨架和样式语义未统一”的问题。

修改文件：

- `packages/desktop/test/workspace-layout.test.ts`
- `packages/desktop/test/ui-style-system.test.ts`
- 需要时新增或扩展视觉脚本中的 DOM rect 校验

新增断言：

1. `ProductShellHost.tsx` 必须包含 `ProductWorkspacePage`，并在其中渲染 `product-workspace-header` 和页面内容。
2. `packages/ui/src/**/*ContentView.tsx` 禁止出现 `ProductWorkspacePage`。
3. 首页真实挂载入口必须纳入检查：如果使用 `HomePageView.tsx`，它必须符合内容层规则；如果拆出 `HomePageContentView.tsx`，三端真实入口必须挂 `HomePageContentView`。
4. 测试扫描 Prototype / Web / Desktop 的真实 `renderPage` 挂载组件，禁止已拆分页面继续挂 `*PageView`。
5. `packages/ui/src/**/*ContentView.tsx` 禁止 import 或渲染对应 `*PageView`。
6. `showInternalHeading` 禁止出现在主菜单真实 ContentView 和平台挂载入口。
7. `*PageView` 只允许用于 standalone fallback、未登录、空态或独立 preview；禁止 `VaultPageView -> VaultPageContentView` 这类双壳回归。
8. 所有 `ProductWorkspace*` 组件的 `className` 禁止包含其他 workspace chrome 类，例如 `product-workspace-panel`、`product-side-rail`、`product-content-stack`。
9. `ProductWorkspaceEmptyState`、`ProductWorkspaceContentStack` 和 `ProductWorkspaceSideRail` 禁止通过 className 伪装成 `product-workspace-panel`。
10. `daily-source`、`source-ready`、`source-status-card` 禁止挂在首层 `ProductWorkspace*` 组件上，只允许在内容内部状态块中出现。
11. `tool-panel` 只允许出现在白名单容器：全局 AI 抽屉、设置诊断、设置工具、操作日志；禁止出现在主菜单内容根或首层 workspace 组件。
12. 新增和迁移后的设置分组禁止继续使用 `app-panel`，优先使用 `panel-subsection` 或后续 `ProductSettingsSection`。
13. `ProductWorkspacePanel` 的 className 禁止包含 `app-panel`、`product-card`、`tool-panel`。
14. `ProductWorkspaceContentStack` 和 `ProductWorkspaceSideRail` 的 className 禁止直接包含 `product-workspace-panel`。
15. `app-page`、`app-page-head` 禁止出现在主菜单真实挂载组件中。
16. `section-heading` 可以出现在子区块白名单中，但不能出现在 `showInternalHeading` 相关页面标题逻辑中。
17. `d2-reference-only` 标记块中的说明文案不得进入 `packages/ui/src`。

几何和 computed style 断言：

1. Prototype / Web / Desktop 的首页、仓库、资料库、商人、设置页中，`.product-workspace-header` 到第一个首层 workspace 内容的垂直 gap 必须一致。
2. 首层 `ProductWorkspacePanel`、`ProductWorkspaceSideRail`、`ProductWorkspaceContentStack` 的 top 对齐策略必须一致，不能某页额外顶出一段私有 margin。
3. 首层 panel 的 `border`、`border-radius`、`background-color`、`box-shadow` computed style 必须来自同一套 token 规则；菜单私有 class 不能覆盖这些 chrome 属性。
4. 暗色模式下同样执行上述检查，避免“结构测过但暗色漏白”。

运行命令：

```powershell
npx pnpm@9.15.0 vitest --run packages/desktop/test/workspace-layout.test.ts
npx pnpm@9.15.0 vitest --run packages/desktop/test/ui-style-system.test.ts
```

预期结果：

- 初次运行应失败。
- 失败点必须对应上面的结构和样式边界问题。
- 如果测试直接通过，说明断言没有覆盖真实问题，不能进入阶段 2。

### 阶段 2：让 `ProductShellHost` 成为唯一页面骨架所有者

修改文件：

- `packages/ui/src/workspace/ProductWorkspace.tsx`
- `packages/ui/src/product/ProductShellHost.tsx`
- `packages/ui/src/product/types.ts`
- `packages/ui/src/styles.css`

改动：

1. 在 `ProductWorkspace.tsx` 新增 `ProductWorkspaceHeader`。
2. `ProductShellHost` 渲染：

```tsx
<ProductWorkspacePage element="section" className="product-shell-page">
  {pageHeader ? (
    <ProductWorkspaceHeader actions={pageHeader.actions}>
      <h2>{pageHeader.title}</h2>
      <p>{pageHeader.subtitle}</p>
    </ProductWorkspaceHeader>
  ) : null}
  {props.renderPage(activePage, preferences)}
</ProductWorkspacePage>
```

3. `ProductWorkspaceHeader` 生成 `product-workspace-header` class，不再由 Host 手写 `page-header product-page-header product-workspace-header`。
4. `.shell-content` 只负责滚动、页面 padding 和背景，不再承担页面内容之间的业务 gap。
5. `.product-workspace-page` 负责标题到内容的统一 gap。

验收：

- `ProductShellHost` 下只有一个 `ProductWorkspacePage`。
- 页面标题和内容同属一个 workspace page。
- HTML 参考中的结构约束在 React 中有对应实现。

### 阶段 3：首页改成纯内容层

修改文件：

- `packages/ui/src/home/HomePageView.tsx`
- 如需拆分：新增 `packages/ui/src/home/HomePageContentView.tsx`
- `packages/ui/src/index.ts`
- `packages/prototype/src/main.tsx`
- `packages/web/src/main.tsx`
- `packages/desktop/src/renderer/features/home/HomeDashboard.tsx`

改动：

1. 将真实挂载的首页组件改为 `HomePageContentView`。
2. `HomePageContentView` 不 import `ProductWorkspacePage`。
3. 首页首层内容只返回 `home-briefing-grid` 和首层 `ProductWorkspacePanel`。
4. 移除 `app-page home-app-page product-home-page` 作为页面根。
5. 移除 `ProductWorkspacePanel className="app-panel app-panel-body ..."` 叠加，改为：

```tsx
<ProductWorkspacePanel className="home-daily-panel">
```

6. 如果需要 panel 内部 padding 或密度，增加 `.home-daily-panel > ...` 内部规则，不覆盖 `ProductWorkspacePanel` chrome。

验收：

- 首页内容组件不再包页面容器。
- 首页首层面板 chrome 只来自 `ProductWorkspacePanel`。
- `visual:home` 中 Prototype 和 Desktop 标题到内容距离一致。

### 阶段 4：仓库去掉双页面壳

修改文件：

- `packages/ui/src/vault/VaultPageContentView.tsx`
- `packages/ui/src/vault/VaultPageView.tsx`
- `packages/desktop/src/renderer/features/vault/VaultPage.tsx`
- `packages/prototype/src/main.tsx`
- `packages/web/src/main.tsx`

改动：

1. `VaultPageContentView` 删除 `ProductWorkspacePage` import。
2. `VaultPageContentView` 顶层直接返回 `ProductWorkspaceSplit className="vault-workbench-layout"`。
3. 删除 `showInternalHeading` props 和内部标题分支。
4. Desktop 账号已就绪时不再包 `VaultPageView`，直接渲染 `VaultPageContentView`。
5. `VaultPageView` 只保留未登录 / 空态 standalone 入口；如果仍用于真实壳，也必须不包已就绪内容。
6. `vault-side-summary` 如果是首层侧栏，必须只依赖 `ProductWorkspaceSideRail` chrome，不再自己定义首层 panel chrome。
7. 禁止 `VaultPageView -> VaultPageContentView` 双壳回归，测试必须扫描 Desktop 真实入口。

验收：

- 仓库标题下第一块内容和首页使用同一个 page gap。
- `VaultPageContentView` 不再出现 `ProductWorkspacePage` 和 `showInternalHeading`。
- Desktop 不再出现 `VaultPageView -> VaultPageContentView` 双页面壳。

### 阶段 5：配装、资料库、商人 ContentView 不再委托 PageView

修改文件：

- `packages/ui/src/loadouts/LoadoutsPageContentView.tsx`
- `packages/ui/src/loadouts/LoadoutsPageView.tsx`
- `packages/ui/src/library/LibraryPageContentView.tsx`
- `packages/ui/src/library/LibraryPageView.tsx`
- `packages/ui/src/vendors/VendorsPageContentView.tsx`
- `packages/ui/src/vendors/VendorsPageView.tsx`
- `packages/prototype/src/main.tsx`
- `packages/web/src/main.tsx`
- `packages/desktop/src/renderer/features/loadouts/LoadoutsPage.tsx`
- `packages/desktop/src/renderer/features/library/LibraryPage.tsx`
- `packages/desktop/src/renderer/features/vendors/VendorsPage.tsx`

改动：

1. `LoadoutsPageContentView` 直接返回 `ProductWorkspaceSplit` 和内容，不再渲染 `LoadoutsPageView`。
2. `LibraryPageContentView` 直接返回 `ProductWorkspaceSplit` 和内容，不再渲染 `LibraryPageView`。
3. `VendorsPageContentView` 直接返回 `ProductWorkspaceSplit` 和内容，不再渲染 `VendorsPageView`。
4. 删除这些 ContentView 的 `showInternalHeading` props。
5. PageView 文件只作为 standalone fallback 或空态包装，不作为平台真实入口。
6. 修正 `ProductWorkspaceContentStack className="... product-workspace-panel"`，改用 `ProductWorkspacePanel` 或把面板 chrome 放到子组件。

验收：

- 三个 ContentView 不再 import 对应 PageView。
- 三端平台入口不再传 `showInternalHeading={false}`。
- 资料库、商人、配装首层 chrome 与首页 / 仓库一致。

### 阶段 6：账号和设置清理过渡标题与旧面板层

修改文件：

- `packages/ui/src/account/AccountPageContentView.tsx`
- `packages/ui/src/settings/SettingsPageContentView.tsx`
- `packages/ui/src/account/AccountPageView.tsx`
- `packages/ui/src/settings/SettingsPageView.tsx`
- `packages/ui/src/styles.css`

改动：

1. `AccountPageContentView` 删除 `showInternalHeading` props 和页面标题分支。
2. `SettingsPageContentView` 保持内容自由度，但首层侧栏和首层内容必须使用 workspace 组件。
3. `ProductWorkspaceSideRail className="app-panel settings-menu"` 改为只保留 `settings-menu`，chrome 来自 `ProductWorkspaceSideRail` 或新的 `ProductWorkspacePanel` 包装。
4. 设置页内部配置块继续可以使用 `app-setting-group`，但不得作为页面首层 chrome 的来源。
5. 新增或迁移后的设置分组使用 `panel-subsection`；如果 `panel-subsection` 表达不了设置语义，再新增 `ProductSettingsSection`，不要继续扩散 `app-panel`。
6. `AccountPageView`、`SettingsPageView` 如果保留 standalone fallback，需标注用途并避免被平台真实入口引用。

验收：

- 账号和设置真实入口不再传 `showInternalHeading`。
- 设置页首层侧栏、首层内容区和其他菜单共用 workspace chrome。
- 设置内部表单块仍可保持低频配置页的密度差异。

### 阶段 7：样式语义收口

修改文件：

- `packages/ui/src/styles.css`
- `packages/desktop/test/ui-style-system.test.ts`
- `packages/desktop/test/workspace-layout.test.ts`

改动：

1. 明确 workspace chrome 只在以下类中定义：
   - `.product-workspace-page`
   - `.product-workspace-header`
   - `.product-workspace-panel`
   - `.product-command-bar`
   - `.product-split-workspace`
   - `.product-side-rail`
   - `.product-content-stack`
   - `.product-workspace-empty`
2. `app-panel` 不再定义会影响主菜单首层的页面级规则；如保留，注释为 legacy 内部块。
3. `product-card` 只保留对象卡片语义，不包含页面级 gap 或大面板阴影。
4. `tool-panel` 只服务 AI、诊断、设置工具区；如需产品化，后续新增 `ProductToolPanel`。
5. 删除或收窄 `.app-page`、`.app-page-head` 对主菜单真实页面的影响。
6. 子区块标题统一使用内容层 class，例如 `panel-subsection-heading`；`section-heading` 逐步白名单化。
7. 所有新增 / 保留颜色必须通过 `--surface-*`、`--border-*`、`--text-*`、`--status-*`、`--field-*`、`--chip-*`、`--item-*`、`--drawer-*` 表达。
8. `daily-source`、`source-ready`、`source-status-card` 收口为内容内部状态块；新状态文案优先使用 `status-message`。
9. `tool-panel` 白名单写入测试；新增 `tool-panel` 使用点必须说明所属容器。
10. 首层 panel chrome 的 computed style 校验纳入视觉脚本或专门测试，不能只依赖源码字符串断言。

验收：

- 测试能阻止菜单私有 class 覆盖 workspace chrome 属性。
- 暗色模式不再靠单页临时补丁修主面板白底。
- 首层面板的 border、radius、background、shadow 来源唯一。

### 阶段 8：参考 HTML 和文档同步

修改文件：

- `docs/work/references/d2-unified-workspace-layout-v0.html`
- `docs/development.md`
- `docs/todo.md`
- 本文档

改动：

1. 保持参考 HTML 中的页面结构与 React 目标结构一致。
2. 所有说明性内容继续使用 `d2-reference-only` 边界和 `data-reference-only="true"`。
3. `docs/development.md` 更新为最终结构规则，不再留下“页面内容根由 ProductWorkspacePage”这种可被误解为 ContentView 自己包页面的表述。
4. `docs/todo.md` T4 更新为“待实施：workspace 骨架与样式系统彻底收口”。

验收：

- 后续 agent 看到 `docs/development.md`、本文档和测试时，能得出同一个实现方向。
- HTML 是视觉和规则基准，不是复制到真实 UI 的内容来源。

## 提交边界

建议拆成 4 个提交：

1. `test: lock workspace ownership rules`
   - 只改测试和必要文档。
   - 允许测试红灯。

2. `refactor: make product shell own workspace page`
   - 改 `ProductShellHost`、`ProductWorkspace` 和平台挂载结构。
   - 让结构测试转绿。

3. `refactor: make page content views pure content`
   - 改首页、仓库、配装、资料库、商人、账号、设置 ContentView。
   - 移除 `showInternalHeading` 和 ContentView 内部页面壳。

4. `style: consolidate workspace chrome semantics`
   - 收口 `app-panel`、`product-card`、`tool-panel` 的使用边界。
   - 跑视觉脚本和全量 UI 验证。

如果工作区有其他 agent 的无关改动，提交前必须运行：

```powershell
tools\git-preflight.cmd
```

不要使用 `git add -A` 混提交无关工具、release、端口或用户本地改动。

阶段 1 开始前也要运行同一个 preflight。若已经存在其他 agent 正在改 `packages/ui`、`packages/app`、`packages/desktop/src/renderer/shared/`、renderer API 或 release 脚本，先分清边界再动手；必要时用 worktree 隔离。

## 验证清单

每个阶段至少运行对应定向测试。最终收口完成后必须运行：

```powershell
npx pnpm@9.15.0 verify:ui
npx pnpm@9.15.0 verify:desktop
npx pnpm@9.15.0 visual:home
npx pnpm@9.15.0 visual:settings
npx pnpm@9.15.0 visual:ai
npx pnpm@9.15.0 visual:all
npx pnpm@9.15.0 verify:docs
```

如果只完成前半段结构测试，不能声称视觉收口完成。

测试分层按以下边界维护：

- `packages/ui` 测页面结构、状态文案、copy key、组件 props。
- Prototype 测 mock 状态切换和 Host 组合。
- Web 测 adapter fallback、HTTP snapshot 和浏览器能力。
- Desktop 测 Electron adapter 接线、IPC callback、写操作边界和真实数据传参。
- 已迁出的页面不再要求 Desktop feature 文件包含旧 CSS class 或旧 JSX 结构。

视觉对比优先使用：

- `packages/prototype` 作为 reference。
- Desktop / Web 作为真实消费者。
- `visual:home`、`visual:settings`、`visual:ai` 和 `visual:all` 作为回归入口。
- `visual:all` 必须包含标题到内容 gap、首层面板 top 对齐、首层 chrome computed style 和暗色模式浅色背景检查。
- 静态 HTML 只作为视觉和规则参考基准，不作为活跃实现入口。

## 最终验收标准

1. `packages/ui/src/**/*ContentView.tsx` 不再 import 或渲染 `ProductWorkspacePage`。
2. 平台真实入口不再传 `showInternalHeading={false}`。
3. `ProductShellHost` 是唯一页面 workspace root 的所有者。
4. 首页、账号、仓库、配装、资料库、商人、设置在 Prototype / Web / Desktop 中共享同一页面骨架。
5. 首层面板不再叠加 `app-panel`、`product-card`、`tool-panel`。
6. `ProductWorkspaceContentStack` 和 `ProductWorkspaceSideRail` 不再通过 className 伪装成 `product-workspace-panel`。
7. 所有 `ProductWorkspace*` 组件都不通过 className 伪装成其他 workspace chrome。
8. `daily-source`、`source-ready`、`source-status-card` 不再作为首层 workspace 组件 class。
9. `tool-panel` 只出现在全局 AI 抽屉、设置诊断、设置工具或日志白名单中。
10. 设置页新增和迁移后的分组使用 `panel-subsection` 或 `ProductSettingsSection`，不继续扩散 `app-panel`。
11. 主菜单页面标题只来自 `ProductWorkspaceHeader`。
12. 说明性参考内容只存在于 `docs/work/references/` 的 `d2-reference-only` 标记块和测试断言中。
13. 暗色模式下 `visual:all` 不再发现主菜单大面积浅色背景或局部白底。
14. `visual:all` 能校验标题到内容 gap、首层 top 对齐和首层 chrome computed style。
15. 用户在 Prototype、Web、Desktop 打开同一个菜单时，页面顶部、首层面板、工具栏、侧栏和内容密度一致；差异只来自数据、平台能力和 mock 状态。
16. Desktop feature 只保留真实数据、写操作和平台能力接线，不再复制产品页面结构。
17. Web 有清楚的真实数据 provider / fallback provider 边界。
18. 新增页面文案默认进入共享 copy。
19. 旧测试不再依赖已迁出的 Desktop JSX / CSS 细节。
20. `packages/ui` 不新增 Electron / DOM window 特有依赖，后续移动 App 能作为壳复用同一套 UI。

## 和其他文档的关系

- `docs/development.md`：长期规则。本文实施完成后，如果发现规则需要固化，合并到该文件。
- `docs/todo.md`：当前短期待办入口。T4 只引用本文，不展开阶段细节。
- `docs/work/backlog/desktop-ui-account-detail-polish.md`：骨架收口后的视觉和真实体验打磨，包含装备详情、点击反馈、账号真实数据和仓库体验细节，不和本文合并。
- `docs/work/references/d2-unified-workspace-layout-v0.html`：冻结的静态视觉参考和约束样板，不是活跃原型、实现入口或菜单 UI 修改源。日常菜单 UI 改动直接进入 `packages/ui` 和 app ViewModel；只有全局工作区骨架、首层 chrome、reference-only 标记或视觉基准本身变化时才同步更新。说明性内容必须继续使用 `d2-reference-only` 标记。
