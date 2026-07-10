# 开发说明

这份文档面向仓库维护者和贡献者，集中说明开发、测试、打包、发布和文档结构。

## 1. 技术栈

- Node.js 22
- pnpm 9
- TypeScript
- Electron
- React
- Vitest

## 2. 仓库结构

```text
packages/
  core/      领域模型、业务规则、分析逻辑、schema、纯函数
  services/  跨端服务接口和平台 adapter
  app/       跨端前端查询层、状态模型、页面 workspace 编排
  ui/        共享 React UI、产品 Host、设计系统和 i18n copy
  prototype/ 可交互 React 原型，使用 mock adapter
  web/       Web 平台壳，后续接 HTTP/API adapter
  http/      本地 HTTP / 工具接口层
  desktop/   Electron 桌面壳
docs/        正式文档
```

### 2.1 核心边界

- `packages/core`
  - 负责领域模型、schema 和跨端类型
  - 负责确定性分析、评分、愿望单、目标规则等纯业务规则
  - 负责 Bungie / Manifest 数据到领域模型的转换逻辑
  - 保留 `config/defaults`、`config/env`、`manifest/metadata`、`manifest/definitions` 等纯 helper；不承接本地文件、HTTP、OAuth callback server 或 Manifest cache 读写 adapter

- `packages/services`
  - 负责 Profile / Manifest / LocalData / AI 等服务接口
  - 负责桌面、本地、Web、移动端或远端 API 的 adapter
  - 负责把网络、存储、鉴权等平台能力收口到服务边界
  - OAuth callback server、OAuth token store / HTTP client、config store、Manifest metadata cache 和 definition component cache 的运行时实现统一放在这里；Desktop 主进程和 worker 通过 services subpath 调用，不从 core 直接取运行环境 adapter

- `packages/app`
  - 负责跨端前端查询层、状态模型和页面 workspace 编排
  - 复用 services，不直接依赖 Electron、Node runtime 或桌面 UI
  - 首页、账号页、仓库页、配装页和装备详情等平台无关 ViewModel / workspace 优先沉到这里，Desktop / Web 只传入真实数据和写操作 callback

- `packages/ui`
  - 负责共享 React UI、产品级 UI Host、设计系统 token 和 i18n copy
  - 不直接依赖 Electron、Web 部署、移动原生能力或 `window.d2`
  - 页面组件只接收 ViewModel、props 和 callback，真实数据由平台 adapter 提供
  - `src/styles.css` 是 Prototype、Web、Desktop 共用的唯一产品级样式入口；颜色、间距、页面布局、暗色模式和通用状态样式不得再落到平台壳私有 CSS

- `packages/prototype`
  - 负责可交互 React 原型，使用 mock 数据和 mock adapter
  - 只组合 `packages/ui`，不维护第二套页面结构
  - 允许维护原型专用状态切换面板，例如未登录、资料库过期、后台任务运行和正常状态
  - 首页、账号、仓库、配装、资料库和设置等主菜单必须挂共享 View 或明确的 mock 工作台，不允许回退到通用“后续接入”占位页

- `packages/web`
  - 负责 Web 平台壳、浏览器启动、Web 登录态和 HTTP/API adapter
  - 与 Prototype / Desktop 挂同一个产品 UI Host，不复制页面实现；后续移动 App 也按同一壳模式接入
  - 首页和页面数据通过 Web snapshot provider / adapter 边界读取，当前约定为 `/api/home-snapshot` 和 `/api/pages/:page/snapshot`，无服务时回退到共享 fallback snapshot

- `packages/http`
  - 暴露本地 HTTP / 工具接口
  - 复用 core / services，不单独维护业务真相

- `packages/desktop`
  - 负责 Electron 主进程、preload、IPC、窗口、本地文件和安装更新等系统能力
  - Renderer 中仍未迁出的页面逻辑继续按 feature 边界维护，平台无关 UI 逐步迁入 `packages/ui`
  - Renderer 入口必须导入 `@d2-tools/ui/styles.css`；`packages/desktop/src/renderer/styles.css` 只允许保留 Electron 平台级调整，不承载产品页面样式

### 2.2 Renderer feature 边界

- `packages/desktop/src/renderer/pages/HomePage.tsx` 是桌面端菜单 composition root，只做菜单接线和跨 feature 状态组装。
- `packages/desktop/src/renderer/features/<menu>/` 是菜单私有实现。feature 可以 import `shared/`、`components/`、`utils/` 和 `api/`，但不能 import 其他 feature。
- `packages/desktop/src/renderer/shared/` 只能放跨菜单复用能力，不能反向 import `features/`。
- 跨账号、仓库、资料库复用的装备详情、配装定位、状态卡片等能力应先进入 `shared/`，再由各 feature 引用。
- `packages/desktop/src/renderer/api/types.ts` 是 renderer 侧平台无关 API 聚合入口，只组合 `AppApi` 并重导出分域契约；账号、仓库、资料库、配装、AI、写操作等 DTO 应放在 `api/*Api.ts` 或 `api/sharedTypes.ts`，后续 Mac / 移动端适配应优先复用这些类型边界。
- `packages/desktop/src/renderer/api/client.ts` 只做 Electron renderer 运行时绑定：声明 `window.d2`、导出 `api`，并兼容性重导出 `types.ts` 里的类型；renderer / test 使用方不得从这里导类型，类型应从 `api/types.ts` 或分域 API 文件导入。
- 新增用户可见文案优先进入 `packages/ui/src/i18n/` 或对应领域 copy；界面语言使用 `zh-CN` / `en-US`，Bungie 资料库语言使用 `zh-chs` / `en`，不要在组件里分散写 `locale === ... ? ... : ...`。共享 UI 的 prototype fallback 也必须接收 `interfaceLocale`，不能只给正式内容页做 i18n。
- 默认数据目录由 `packages/core/src/config/defaults.ts` 的平台感知 helper 统一计算：Windows 使用 `%APPDATA%\d2-tools`，macOS 使用 `~/Library/Application Support/d2-tools`，Linux / 其他平台使用 `$XDG_DATA_HOME/d2-tools` 或 `~/.local/share/d2-tools`。
- `packages/desktop/test/renderer-boundaries.test.ts` 会拦截 feature 互相 import 和 shared 反向依赖 feature。
- `packages/desktop/test/renderer-api-boundaries.test.ts` 会拦截把大型 DTO 类型重新塞回 `api/client.ts`、renderer / test 从 `api/client.ts` 导类型，或重新塞回一个巨型 `api/types.ts`。
- 源码目录下的 `packages/*/src/**/*.js` 和 `packages/*/src/**/*.d.ts` 默认视为构建或迁移过程产生的衍生文件，不作为正式源码提交目标；常规开发应以 `.ts` / `.tsx` 为准，构建产物优先落到 `dist/`。

### 2.3 并行开发规则

- 普通功能按菜单并行：账号页改 `features/account/`，仓库页改 `features/vault/`，资料库改 `features/library/`，配装改 `features/loadouts/`，AI 改 `features/ai/`，设置改 `features/settings/`，每日 / 每周改 `features/daily/`。
- 跨菜单能力先抽到 `shared/`，再由各 feature 引用；不要让一个 feature 直接 import 另一个 feature。
- 共享详情、配装来源、仓库清理等跨菜单逻辑应放到 `shared/components/`、`shared/hooks/` 或 `shared/domain/`。
- Renderer API 按领域维护在 `api/*Api.ts`，`types.ts` 只聚合，`client.ts` 只绑定 Electron runtime。
- 主进程 IPC 按领域维护在 `src/main/ipc/` 子模块，`ipc.ts` 只聚合。
- 新增可见文案优先进入 copy 体系；跨端 UI 文案优先进入 `packages/ui/src/i18n/`，设置页和旧 renderer feature 迁移前可保留局部中文，但不得新增分散的语言判断。
- `HomePage.tsx`、`ItemDetailModal.tsx`、`useItemDetailWorkspace.ts`、`VaultPanel.tsx`、`api/types.ts`、`api/client.ts`、`ipc.ts` 等公共接线文件是并行开发高冲突区，修改前要确认是否真的需要，并说明影响范围。

### 2.4 跨端 UI 与原型开发流程

后续 UI 开发按“共享 UI 优先，平台壳只接能力”的方式推进：

1. 视觉、布局、组件结构、状态样式、通用交互和跨端文案默认进入 `packages/ui`。
2. `packages/prototype` 只组合 `packages/ui`，并提供 mock 数据、状态切换和演示入口；它不是第二套页面实现。
   - 主菜单页面必须覆盖到共享 View；如果某页尚未接真实数据，Prototype 也要提供可交互 mock，而不是显示 generic placeholder。
3. Web 和 Desktop 只负责平台 adapter。Web 处理浏览器登录态、HTTP/API、部署配置；Desktop 处理 Electron IPC、本地文件、窗口、更新和打包。
4. 如果先在 prototype 中探索 UI，确认后必须迁入 `packages/ui`，再让 Prototype / Web / Desktop 共同消费。
5. `ProductShellHost` 是产品外壳统一入口；Prototype / Web / Desktop 都应挂同一个 Host。不得重新引入 Desktop 或 Web 专用 shell wrapper 来复制页面结构。主菜单真实入口的页面根、页面标题和页面级 gap 归 `ProductShellHost` 统一管理，页面内容组件只返回内容层。
6. 顶部状态条等跨端状态对象必须使用稳定 key 做样式和逻辑判断，例如 `account`、`library`、`app-version`；本地化后的 `label` 只用于显示，不能参与逻辑判断。
7. 全局 AI 抽屉等产品级辅助面板也属于共享 UI：`assistantPanel` 不允许各端长期自建标题、对话结构或占位页面，必须复用 `packages/ui` 的 AI Assistant View；Desktop / Prototype / Web 只提供真实服务 adapter 或 mock 数据。
8. 窗口控制按钮由 `packages/ui` 的共享 `AppShell` 自绘，Desktop 只通过 `platformActions.windowControls` 注入最小化、最大化/还原和关闭动作；不要重新启用 Electron 原生 `titleBarOverlay`。
9. 改 `packages/ui` 后，至少运行相关共享 UI 测试和消费者类型检查；影响首页或设置页视觉时运行 `visual:home` 或 `visual:settings`；影响全局 AI 抽屉时运行 `visual:ai`，它会实际点击 Prototype / Web / Desktop 顶部 AI 并检查共享抽屉标题、旧占位文案和截图。跨页面、主题 token、暗色模式或共享样式大改后运行 `visual:all`，它会遍历 Prototype / Web / Desktop、明暗主题、主菜单和设置分区，并对 `.app-shell` 可见 DOM 做 computed style 扫描。
10. 产品样式不得再复制到 Desktop 私有样式文件；需要新增 class、token、暗色规则或页面布局时，直接修改 `packages/ui/src/styles.css`。Desktop 私有 CSS 只能放窗口、拖拽区或 Electron 特有平台差异。

常见改动归属：

- 首页、设置页、账号页的布局和样式：`packages/ui`
- 设置页、账号页、资料库页和配装页的内部复杂块已迁入 `packages/ui`；账号页和设置页主入口文案已进入 `packages/ui/src/i18n/`；Desktop feature 只保留真实数据 adapter、写操作 callback 和少量派生 ViewModel 接线。
- 原型里的“未登录 / 资料库过期 / 后台任务运行 / 更新可用”等状态切换：`packages/prototype`
- Web 的真实数据读取、snapshot provider、HTTP fallback 和浏览器外链打开：`packages/web/src/webAdapter.ts`
- 真实账号读取、资料库检查、导入导出、窗口颜色和应用更新：`packages/desktop` 或对应 service / adapter
- Web 登录态、浏览器存储和 HTTP adapter：`packages/web`
- 跨端状态模型、页面 workspace 和 ViewModel：`packages/app`，其中配装页状态汇总 / 迁移计划 / 比较行和装备详情同名对比 / 选中项合并等纯逻辑不应留在 Desktop renderer

### 2.4.1 多 agent 菜单 UI 并行规则

当多个 agent 同时推进不同菜单时，默认按“菜单内容层并行、共享骨架串行”的规则执行。用户不需要额外指定这些边界；agent 开工前必须先按本节判断自己的改动范围。

推荐分工：

| 菜单 | 默认修改范围 | 可改内容 |
|---|---|---|
| 首页 | `packages/ui/src/home/`、必要时 `home-*` 内容样式 | 今日 / 本周信息架构、首页内容卡片、周商人摘要、首页内部列表密度 |
| 账号 | `packages/ui/src/account/`、必要时 `account-*` 内容样式 | 角色、装备、背包、账号操作、账号页内部布局 |
| 仓库 | `packages/ui/src/vault/`、必要时 `vault-*` 内容样式 | 筛选、装备卡、标签、同名对比、清理工作台、仓库内部工具栏 |
| 配装 | `packages/ui/src/loadouts/`、必要时 `loadout-*` 内容样式 | 配装列表、方案详情、迁移计划、比较行、执行状态 |
| 资料库 | `packages/ui/src/library/`、必要时 `library-*` 内容样式 | 搜索、结果列表、来源矩阵、版本状态页内展示 |
| 商人 | `packages/ui/src/vendors/`、必要时 `vendor-*` 内容样式 | 商人目录、库存卡、推荐判断、商人详情 |
| 设置 | `packages/ui/src/settings/`、必要时 `settings-*` 内容样式 | 设置分区、表单、诊断、备份迁移、低频工具区 |

菜单 agent 可以改：

- 对应菜单目录下的 `*ContentView.tsx`、菜单专属组件、菜单专属 copy 和菜单专属 ViewModel props。
- `packages/ui/src/styles.css` 中对应菜单前缀的内容层规则，例如 `.vault-*`、`.loadout-*`、`.library-*`。
- Prototype / Web / Desktop 的 adapter 或 mock 数据，仅限把该菜单需要的数据接入共享 View。

菜单 agent 不得改：

- `ProductShellHost`、`ProductWorkspacePage`、`ProductWorkspaceHeader`、`ProductWorkspacePanel`、`ProductWorkspaceSplit`、`ProductWorkspaceSideRail`、`ProductWorkspaceCommandBar` 的结构或 chrome，除非本次任务明确是共享骨架改造。
- `.product-workspace-*`、`.product-side-rail`、`.product-command-bar`、`.shell-*`、全局 token、暗色模式 token、页面级 gap、页面背景、首层面板 `padding / border / radius / background / shadow`。
- Desktop 私有 CSS 中的产品样式。`packages/desktop/src/renderer/styles.css` 只允许保留 Electron 平台调整。
- `app-panel`、`product-card`、`tool-panel` 作为主菜单首层页面壳或叠加到 `ProductWorkspacePanel` 上。
- 其他菜单目录下的实现，除非先把复用能力抽到共享层。

需要升级为共享改动的情况：

1. 两个以上菜单都需要同一种布局、按钮、卡片、空态、状态条或工具栏。
2. 需要修改页面标题区、页面级左右分栏、首层侧栏、首层 panel chrome、顶部状态条、AI 抽屉或后台任务 Dock。
3. 需要改 `packages/ui/src/styles.css` 中无菜单前缀的规则。
4. 需要动 `ProductShellHost.tsx`、`ProductWorkspace.tsx`、`AppShell.tsx`、`styles.css` token 区或跨端入口。

升级为共享改动时，agent 必须先说明影响范围，并补测试红线。不能把共享骨架问题伪装成某个菜单的私有样式补丁。

每个菜单 agent 收尾至少运行：

```powershell
npx pnpm@9.15.0 verify:ui
```

如果碰到 Desktop adapter、IPC、真实数据接线或 renderer feature，再追加：

```powershell
npx pnpm@9.15.0 verify:desktop
```

如果影响首页、设置、AI 抽屉、暗色模式、全局 token 或共享 workspace chrome，再追加对应视觉脚本：

```powershell
npx pnpm@9.15.0 visual:home
npx pnpm@9.15.0 visual:settings
npx pnpm@9.15.0 visual:ai
npx pnpm@9.15.0 visual:all
```

提交或交接前，如果工作区已有多个菜单或共享层改动，必须先运行：

```powershell
tools\git-preflight.cmd
```

如果 preflight 显示多条 lane，agent 不得使用全量提交脚本或 `git add -A`，除非明确确认这些改动都属于同一交付范围。

### 2.5 Renderer UI 样式系统

- 桌面端 UI 按“页面底层 / 主面板 / 子块或列表项”三层组织；页面必须有主工作区，辅助信息和低频信息下沉。
- 全局样式 token 定义在 `packages/ui/src/styles.css` 的 `:root` 和 `.app-shell[data-color-mode]`：间距使用 `--space-8/12/16/24/32`，圆角使用 `--radius-control/panel/pill`，颜色使用 `--surface-*`、`--border-*`、`--text-*` 和 `--status-*`。
- 共享 UI 设计系统继续补齐 `--field-*`、`--chip-*`、`--item-*`、`--drawer-*` 和 `--game-*` token：普通产品 UI 必须使用 field / chip / item / drawer 语义色，`--game-*` 只用于装备详情顶部等明确游戏视觉区域。
- AI 抽屉是桌面外壳的独立 pane：`.shell-content` 和 `.global-assistant-panel` 各自滚动，抽屉不得再用 fixed 遮罩覆盖主工作区。
- 明暗色模式由 `config.json` 的 `features.color_mode` 持久化，默认 `light`；桌面启动状态必须携带保存的颜色模式，避免应用重启或覆盖更新后回到默认外观。
- 新增状态文案统一使用 `status-message status-neutral|pending|ready|warning|error`，不要再在 TSX 中新增 `notice` 或 `error` 类。
- 新增列表、筛选和对象卡片优先复用 `ui-list-row`、`ui-filter-toolbar`、`ui-item-card`、`ui-badge`；设置页或工具区子块优先复用 `panel-subsection`。
- 主菜单页面统一使用 `ProductWorkspacePage`、`ProductWorkspaceHeader`、`ProductWorkspacePanel`、`ProductWorkspaceCommandBar`、`ProductWorkspaceSplit`、`ProductWorkspaceSideRail`、`ProductWorkspaceContentStack` 和 `ProductWorkspaceEmptyState` 生成 `product-workspace-*` 共享工作区骨架；不要为某个菜单单独发明顶层间距、页面标题、左右分栏或空状态高度规则。`ProductWorkspacePage` 和 `ProductWorkspaceHeader` 只能由 `ProductShellHost` 或明确的 standalone fallback 使用，主菜单真实挂载的 `*ContentView.tsx` 不得 import、渲染或间接委托到它们。
- 菜单允许有私有样式，但只能作用在菜单内容层：信息架构、领域组件、列表密度、装备卡、筛选控件、库存图标、perk 池、配装条目等可以使用 `.account-*`、`.vault-*`、`.library-*`、`.loadout-*`、`.vendor-*`、`.home-*` 自定义。页面根、顶部标题、主分栏、首层面板、首层工具栏、滚动容器、暗色背景和主 surface chrome 归共享工作区骨架所有。
- 菜单私有 class 和 `ProductWorkspace*` 叠加使用时，不得重新定义共享 chrome 属性，包括 `padding`、`border`、`border-radius`、`background`、`box-shadow` 和页面级 `gap`。如果首块区域需要不同密度，优先调整内部子元素；确实需要新的骨架能力时，先扩展 `ProductWorkspace*` 或 token，而不是在菜单 class 里覆盖。
- 私有样式必须使用共享 token 表达颜色、间距、圆角和状态；不要新增硬编码浅色背景、菜单专属暗色兼容块，或只在某一端生效的视觉修补。Prototype / Web / Desktop 的差异只能来自数据、平台 adapter 或 mock 状态，不能来自不同页面 CSS。
- `app-panel`、`product-card` 和 `tool-panel` 可以保留，但不能参与主菜单页面骨架：`app-panel` 只作为 legacy 内部块或逐步迁移对象，`product-card` 只用于面板内部的重复对象卡片，`tool-panel` 只用于 AI、诊断、设置工具和日志区。它们不得和 `ProductWorkspacePanel` 叠加，也不得作为主菜单首层面板、页面根或首层工具栏 chrome。
- `packages/desktop/test/ui-style-system.test.ts` 负责锁定 token、共享样式类、设置页布局、状态语言和 Desktop CSS 平台边界，防止产品样式回流到 Desktop 私有 CSS。
- `packages/desktop/test/workspace-layout.test.ts` 负责锁定主菜单工作区骨架和菜单私有样式权限，防止页面 class 覆盖 `ProductWorkspace*` 的首层间距、面板 chrome 和工具栏 chrome。
- 后续 UI 开发以本节和 `packages/desktop/test/ui-style-system.test.ts` 为准，不再维护单独的历史样式规范文档。
- `docs/work/references/` 里的静态 HTML 只能作为冻结视觉基准、规则样板和对比标注，不是活跃原型、开发入口或 UI 修改源。菜单 UI、样式和交互改动必须直接进入 `packages/ui`、Prototype/Web/Desktop 共享壳或对应 app ViewModel；不得要求 agent “先改 HTML 再照抄实现”。只有调整全局工作区骨架、首层 chrome 或 reference-only 规则时，才同步更新静态 HTML。
- 静态 HTML 可以保留规范说明、边界解释和对比标注，但必须同时使用 `<!-- d2-reference-only:start ... -->` / `<!-- d2-reference-only:end -->` 包住，并在对应 HTML 元素上标记 `data-reference-only="true"`；标记块只用于设计评审和规则表达，不得迁入 `packages/ui`、`packages/prototype`、`packages/web` 或 Desktop 真实页面。`packages/desktop/test/workspace-layout.test.ts` 会抽取这些标记块的文案，拦截说明内容进入共享产品 UI。

### 2.6 桌面外壳、更新和后台任务

- 桌面外壳必须稳定展示应用版本和资料库状态；后台任务不进入顶部状态条，也不在每个页面渲染大横幅，只通过共享右下角任务 Dock 在运行、重试或失败时轻量提示，设置页保留完整任务详情。
- 应用更新由主进程 `updates` IPC 和后台任务中心持有生命周期；renderer 只发起检查、下载、安装确认和订阅状态。
- 应用更新检查失败后进入后台重试，重试策略允许最后一个有限间隔持续复用；不要在网络失败后只提示一次就停止。
- 资料库版本检查由主进程 `manifest` IPC 和后台任务中心持有生命周期；每次启动应用会检查最新 Bungie Manifest。
- 本地 Manifest 未初始化、必要 definition component 缺失或版本落后时，必须提示并允许后台更新；未初始化或组件缺失时，资料库依赖功能应阻断搜索或详情入口。
- 面向用户的普通 UI 统一使用“资料库”命名，不展示 `Manifest`、`本地 Manifest`、`最新 Manifest`、`必要组件`、`资料包` 等开发者概念；内部 API、类型和诊断技术字段可以继续保留 Manifest 命名。
- 顶部状态栏只展示短状态：资料库日期版本、可用、可更新、未准备、需修复、读取中或检查失败等；完整 Bungie Manifest 版本号只放在设置页或诊断导出。
- 资料库日期版本从 Bungie 原始版本号中的 `YY.MM.DD` 片段解析为 `YYYY/MM/DD`；解析失败时普通 UI 显示“资料库 可用”，不要把长版本号泄漏到顶部。
- 设置页“资料库”区域负责展示完整状态：资料库版本、当前版本、最新版本、上次更新、上次检查、更新方式和资料完整性；按钮使用“检查更新”“立即更新”“修复资料库”等用户可理解文案。
- 自动资料库检查应按本地日期做每日节流；本地资料库未初始化、资料库不完整、手动检查、立即更新和修复资料库不受每日节流限制。
- 检查失败但本地资料库可用时，继续允许依赖资料库的功能使用旧数据；更新失败时保留旧资料库，不把旧数据删除或标记为不可用。
- 切换菜单、卸载页面或重新进入页面不得中断资料库更新、应用更新下载等长任务；页面只订阅 `useBackgroundTasks` 和 `useManifestStatus` 等共享状态。
- 设置页负责详细管理入口：应用更新、资料库状态、后台任务、AI、写操作、备份迁移、诊断导出和操作日志。
- 新增长任务优先进入 `packages/desktop/src/shared/backgroundTasks.ts`、`packages/desktop/src/main/backgroundTasks.ts` 和对应领域 IPC，不要把长任务生命周期藏在 renderer feature hook 中。

## 3. 本地开发

安装依赖：

```powershell
npx pnpm@9.15.0 install
```

日常开发桌面端时，推荐用命令行启动：

```powershell
npx pnpm@9.15.0 dev:desktop
```

也可以直接运行底层 PowerShell 脚本：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev-desktop.ps1
```

这条链路会：

1. 构建 `@d2-tools/core`、`@d2-tools/http` 和 `@d2-tools/services`
2. 编译 Electron 主进程和 preload
3. 启动 Vite 前端开发服务器，固定使用 `http://127.0.0.1:53172`
4. 打开 Electron 开发版桌面应用

这不是打包流程，不会生成或解压 `release/win-unpacked`。渲染层改动支持热更新；主进程、preload、core、http 或 services 改动后，关闭桌面窗口再重新运行 `npx pnpm@9.15.0 dev:desktop` 即可重新编译启动。开发端口启用 strict port；如果 `53172` 被占用，启动会直接失败并提示释放端口，不会自动跳到别的端口导致 Electron 打开错误页面。发布版不依赖这个端口；打包后的 Electron 会直接加载安装包内的 `dist/renderer/index.html`。

如果只想单独启动前端页面：

```powershell
npx pnpm@9.15.0 dev
```

如果要先做可交互原型，使用 React prototype：

```powershell
npx pnpm@9.15.0 dev:prototype
```

Prototype 使用 `packages/ui` 共享壳、产品 Host、页面 View 和 mock adapter，默认端口为 `http://127.0.0.1:53170`。视觉密集页面先在 Prototype 中验证，再接入 Desktop 或 Web。Web 默认端口为 `http://127.0.0.1:53171`。通过 `tools/dev-prototype.cmd`、`tools/dev-web.cmd` 或 `tools/dev-desktop.cmd` 启动时，脚本会先清理对应固定端口上的残留监听进程，再重新启动当前 dev 服务。

正式 Web 入口使用：

```powershell
npx pnpm@9.15.0 dev:web
```

Web 是浏览器平台壳，不是第二套原型。日常验证真实产品页面时优先看 Web / Desktop 挂载的同一套产品 Host；原型只用于 mock 状态和视觉方案确认。

如果你已经手动启动了 Vite，并且只想单独启动 Electron 主进程：

```powershell
npx pnpm@9.15.0 dev:electron
```

### 3.1 维护者脚本

`tools/` 保存可提交、可跨设备复用的维护者脚本，不是普通玩家入口，也不保存 token、Cookie、浏览器 profile、缓存数据库或用户本地数据。详细清单见 [开发者工具说明](../tools/README.md)。

常用脚本：

- `tools/dev-prototype.cmd`：清理 `53170` 残留监听进程后启动 Prototype。
- `tools/dev-web.cmd`：清理 `53171` 残留监听进程后启动 Web。
- `tools/dev-desktop.cmd`：清理 `53172` 残留监听进程后启动 Desktop 开发版。
- `tools/dev-status.cmd`：只读查看 Prototype / Web / Desktop 开发端口占用情况。
- `tools/git-preflight.cmd`：只读按文档、工具、跨端 UI、Desktop、core/services/app/http 分组查看 Git 改动，识别菜单 lane / 共享层风险 / 多 lane 混改，并提示建议验证命令、高冲突文件和并行安全建议。
- `tools/git-commit-and-push.cmd`：全量提交并 push，不创建 release tag。
- `tools/git-auto-release.cmd`：先检查当前版本 GitHub Release 是否存在，并在任何版本修改、commit、push 或 tag 之前执行与 GitHub CI 一致的 frozen install、发布测试门禁和全量类型检查。失败时保留错误输出、显示失败阶段并等待按键；通过后，Release 缺失则复用当前版本更新同名 tag，已成功才自动 patch +1、生成 changelog、提交、push 并创建新 release tag。

命名规则：本地开发启动脚本使用 `dev-` 前缀，Git / Release 辅助脚本使用 `git-` 前缀，后续批量维护脚本优先使用 `maintenance-` 前缀。

## 4. 测试与检查

日常开发优先按改动范围跑快路径，不要每次都跑发布级全量链路。

### 4.0 Vibecoding 快路径

单 agent 做菜单或共享 UI 时，默认先运行能覆盖当前改动的单个定向测试。找不到更小的稳定测试集合时，才使用 `verify:vibe:*`；交接、提交、合并或声称门禁通过前，只选择与实际改动范围匹配的一个主 `verify:*`。

```powershell
npx pnpm@9.15.0 verify:vibe:docs
npx pnpm@9.15.0 verify:vibe:ui
npx pnpm@9.15.0 verify:vibe:desktop
npx pnpm@9.15.0 verify:vibe:desktop:account
npx pnpm@9.15.0 verify:vibe:desktop:ai
npx pnpm@9.15.0 verify:vibe:desktop:loadouts
npx pnpm@9.15.0 verify:vibe:desktop:vault
```

这些命令是可选的中途反馈，不是收口门禁的前置步骤。同一代码状态下禁止先运行 `verify:vibe:*`，随后马上运行包含相同测试集合的 `verify:*`；如果下一步就是收尾，直接运行最终门禁。如果中途整组测试已经通过，收尾使用 `verify:finish:*` 只补类型检查或文档检查。只有两次验证之间又修改了代码，才需要重新运行完整门禁。

默认验证层级：

| 阶段 | 默认动作 | 不要做 |
|---|---|---|
| Red / Green | 只跑当前行为对应的单个测试文件 | 不跑类型检查、视觉检查或整组门禁 |
| Tidy | 必要时运行 `git diff --check` | 不重复运行已经通过且代码未变化的测试 |
| 收尾 | 未跑中途整组测试时选一个完整 `verify:*`；已经跑过时选对应 `verify:finish:*` | 不重复执行相同测试集合，不把多个范围门禁固定串联 |
| 视觉 | 只运行一个与实际视觉改动匹配的 `visual:*` | 纯数据、类型、IPC、文案和接线改动不跑视觉脚本 |
| 发布 | 按发布流程运行全量 `test` / `typecheck` | 日常小改动不提前支付发布级成本 |

测试断言优先检查稳定契约，例如真实函数输出、组件渲染结果、导出、role / label 和 ViewModel 输出。禁止新增读取生产源码后匹配中文文案、变量名、import 顺序、HTML、class 或 CSS 片段的普通功能测试；`test:quality` 会阻止这类测试进入遗留层。只有少量明确登记的包依赖、renderer 隔离、格式和 Release 契约可以作为架构测试。

用户提出菜单功能或交互需求时，不需要提供 Red / Green / Tidy 模板、精确文件清单或测试命令。agent 必须自行识别菜单和改动类型，并按以下默认循环拆任务：

1. `Red: <菜单>边界测试`：只写或调整会失败的测试，不改实现文件，不运行 `git diff --check`，不清 BOM、空白或无关 diff。
2. `Green: <菜单>最小实现`：只做让当前失败测试通过的最小实现，不做顺手重构，不扩大到其他菜单。
3. `Tidy: <菜单>整理`：只处理编码、空白、`git diff --check` 和机械整理，不引入新行为。
4. `Verify: <菜单>验证`：只运行当前切片需要的定向验证；交接、提交或声明门禁通过前再升级到对应 `verify:*`。

计划任务名必须短、阶段明确、范围明确；不要生成“补失败测试锁定 xxx model + actions 边界”这类混合任务名，因为它会让一个计划项同时承担测试、实现、整理和验证，导致 vibecoding 循环变慢。

给 agent 的固定入口：

1. 开工前先运行 `tools\git-preflight.cmd`，确认当前脏文件属于哪个菜单或共享 lane、建议跑哪个验证命令、是否触碰高冲突文件，以及是否需要 worktree 隔离。
2. 独立文档或工具说明改动运行 `npx pnpm@9.15.0 verify:docs`；业务改动仅顺带更新 `docs/todo.md` 一行状态时只运行 `npx pnpm@9.15.0 docs:check`。
3. 跨端 UI、Prototype 或 Web 改动收尾运行一次 `npx pnpm@9.15.0 verify:ui`；只有实际布局、CSS、主题或响应式变化才追加一个匹配的视觉命令。`visual:all` 只用于共享 token、全局页面壳或多菜单视觉集成。
4. Desktop 接线、IPC、preload 或 renderer adapter 改动收尾运行一次 `npx pnpm@9.15.0 verify:desktop`；它已经包含 Desktop 快速类型检查和 wiring 测试。
5. Release / CHANGELOG / 版本脚本改动运行 `npx pnpm@9.15.0 verify:release`，发布前再按需要跑全量 `test` 和 `typecheck`。
6. 如果只改某个领域测试覆盖明确的业务模块，优先跑对应 `vitest --run packages/<pkg>/test/<name>.test.ts`；只有跨领域改动才考虑通用 `verify`。
7. 同一代码状态不得连续运行 `verify:vibe:ui` + `verify:ui`、`verify:vibe:desktop` + `verify:desktop` 等包含关系命令；前者已通过时分别改跑 `verify:finish:ui` 或 `verify:finish:desktop`。

中途整组测试已经通过时的增量收尾命令：

```powershell
npx pnpm@9.15.0 verify:finish:docs
npx pnpm@9.15.0 verify:finish:ui
npx pnpm@9.15.0 verify:finish:desktop
```

它们只补完整门禁中尚未执行的部分，不重复运行 `test:docs`、`test:ui` 或 `test:desktop-wiring`。

基础检查：

```powershell
npx pnpm@9.15.0 check
```

这会运行 `docs:check` 和 `git diff --check`，适合文档、脚本说明和小范围整理。改了文档检查或编码检查脚本时，追加：

```powershell
npx pnpm@9.15.0 test:docs
```

开发态测试：

```powershell
npx pnpm@9.15.0 test:fast
npx pnpm@9.15.0 test:behavior
npx pnpm@9.15.0 test:architecture
npx pnpm@9.15.0 test:quality
npx pnpm@9.15.0 test:legacy
npx pnpm@9.15.0 test:all
npx pnpm@9.15.0 test:ui
npx pnpm@9.15.0 test:desktop
npx pnpm@9.15.0 test:desktop:account
npx pnpm@9.15.0 test:desktop:ai
npx pnpm@9.15.0 test:desktop:loadouts
npx pnpm@9.15.0 test:desktop:vault
npx pnpm@9.15.0 test:desktop-wiring
npx pnpm@9.15.0 test:release
```

`test:behavior` 运行真实调用模块或渲染组件的行为测试；`test:architecture` 只运行显式登记的架构和发布契约；`test:quality` 禁止新增源码字符串测试并要求遗留清单只能缩小；`test:legacy` 运行现有源码文本护栏，仅用于报告和逐步迁移；`test:all` 才会运行仓库内全部 Vitest 文件。`test:fast` 是 `test:behavior` 的别名，不预先 build。`test:ui` 跑共享 UI / 跨端页面收口相关测试；`test:desktop` 跑桌面端测试；`test:desktop:account`、`test:desktop:ai`、`test:desktop:loadouts`、`test:desktop:vault` 是菜单私有快测；`test:desktop-wiring` 只跑桌面接线、边界和打包格式相关快测；`test:release` 只跑 release 规则、changelog 提取和安装包格式相关快测。测试集合由 `scripts/run-test-set.mjs` 维护，避免 Windows shell 通配差异导致漏跑。普通功能改动优先跑相关定向测试，例如：

```powershell
npx pnpm@9.15.0 vitest --run packages/desktop/test/package-format.test.ts
```

跨端 UI 快速类型检查：

```powershell
npx pnpm@9.15.0 typecheck:ui
```

它覆盖 `packages/ui`、`packages/prototype` 和 `packages/web`。改 Desktop 主进程、preload、renderer adapter 或 IPC 接线时，使用：

```powershell
npx pnpm@9.15.0 typecheck:desktop-fast
npx pnpm@9.15.0 typecheck:desktop
```

`typecheck:desktop-fast` 会先 build `services` 再跑 Desktop 自身类型检查，适合日常接线快验；`typecheck:desktop` 会先 build `core`、`http` 和 `services`，适合碰到底层依赖或准备发布前使用。

收尾时按改动范围选择一个主门禁，不要把下面命令全部执行：

```powershell
npx pnpm@9.15.0 verify:docs
npx pnpm@9.15.0 verify:ui
npx pnpm@9.15.0 verify:desktop
npx pnpm@9.15.0 verify:desktop:account
npx pnpm@9.15.0 verify:desktop:ai
npx pnpm@9.15.0 verify:desktop:loadouts
npx pnpm@9.15.0 verify:desktop:vault
npx pnpm@9.15.0 verify:release
```

`verify:vibe:*` 只用于还要继续修改代码的中途循环；若已经准备收尾，不再运行。若它已经在当前代码状态通过，使用对应 `verify:finish:*` 完成剩余检查。通用 `verify` 只用于跨领域且没有更精确范围门禁的情况。

发布测试门禁：

```powershell
npx pnpm@9.15.0 test
```

类型检查：

```powershell
npx pnpm@9.15.0 typecheck
```

`test` 会先跑 `docs:check` 和全仓 build，再依次运行行为测试、测试质量门禁和架构测试；它不执行 `test:legacy`。`typecheck` 会先 build `core`、`http` 和 `services`，再全仓类型检查。它们更适合发布、release、CI 或声称“发布门禁通过”前使用，不作为每次 vibecoding 小改动的默认动作。

GitHub Actions 中的最小 CI 会在 Windows runner 上执行：

1. `pnpm install --frozen-lockfile`
2. `pnpm test`
3. `pnpm test:legacy`，`continue-on-error`，只报告遗留护栏
4. `pnpm typecheck`

也就是说，真实行为、架构契约、类型边界、文档检查和新增低质量测试会在 PR / push 阶段被拦截；旧 UI 源码字符串护栏仍展示结果，但不会因为实现变量名、class 或 CSS 数值变化阻止发布。

如果你只想跑桌面端某个定向测试，也可以直接用：

```powershell
npx pnpm@9.15.0 vitest --run packages/desktop/test/vault-panel.test.ts
```

## 5. 打包

一键本地打包（安装依赖 + 测试 + 类型检查 + 打包，完成后自动打开产物目录）：

```powershell
powershell -File scripts/local-package.ps1
```

该脚本内部执行：

1. `pnpm install`
2. `pnpm test`
3. `pnpm typecheck`
4. `pnpm package:win`

打包链路主要用于发布前或需要验证 Windows NSIS 安装器时；日常开发优先使用 `npx pnpm@9.15.0 dev:desktop`，不要为了看一次本地改动反复打包安装。

仅构建 Windows NSIS 安装器（跳过测试和类型检查）：

```powershell
npx pnpm@9.15.0 package:win
```

当前产物一般会落在：

```text
packages/desktop/release/
```

常见目录：

- `win-unpacked/`
- `d2-tools-setup-<version>.exe`
- `latest.yml`
- `d2-tools-setup-<version>.exe.blockmap`

## 6. 发布

当前发布主路径是 GitHub Release 自动打包 Windows NSIS 安装器，并上传自动更新元数据。

### 6.1 发版流程

使用 `tools\git-auto-release.cmd` 时，脚本按以下顺序执行：

1. 检查 Git、GitHub CLI、当前 Release 和目标 tag 状态。
2. 在修改发布文件之前执行本地 CI：`pnpm install --frozen-lockfile`、`pnpm test`、`pnpm typecheck`。
3. 任一 CI 步骤失败时停止流程，显示失败阶段和原始命令输出，并等待按键确认；此时不会 commit、push、打 tag 或触发 GitHub Release。
4. CI 通过后才更新所有 `package.json` 版本号和 `CHANGELOG.md`；重试当前失败版本时复用已有版本。
5. 运行 `pnpm verify:release` 和 Release Body 预览：
   ```powershell
   npx pnpm@9.15.0 release:preview --version x.y.z
   ```
6. 提交改动：
   ```powershell
   git add .
   git commit -m "release: prepare vX.Y.Z"
   ```
7. push 分支、创建或更新 tag，并推送 tag：
   ```powershell
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
8. GitHub Release workflow 自动构建安装包、校验 CHANGELOG、生成 Release Body 并发布 GitHub Release。

### 6.2 注意事项

- 如果 `CHANGELOG.md` 没有对应版本章节，CI 会失败，不会发布 Release
- 只有 tag 名包含 `-beta` 或 `-rc` 时，GitHub Release 才会自动标记为 Pre-release，例如 `v0.0.8-beta.1`、`v1.0.0-rc.1`
- Release workflow 接受两类 tag：正式版 `vX.Y.Z`，或与当前包版本一致的预发布 tag（例如 `vX.Y.Z-beta.1`、`vX.Y.Z-rc.1`）
- Release Assets 当前包含 `d2-tools-setup-<version>.exe`、`latest.yml` 和安装器 blockmap

### 6.3 发布前检查

1. `pnpm install --frozen-lockfile` 通过
2. `test` 通过
3. `typecheck` 通过
4. `pnpm release:preview --version x.y.z` 输出符合预期
5. README 和核心文档没有明显失真
6. 版本号和 tag 一致

### 6.4 备份与恢复

桌面端当前使用本地数据目录保存配置、Manifest 缓存、愿望单、本地标签、目标规则和操作日志。发布安装器、覆盖安装、迁移电脑或排查数据问题时，按下面的规则处理：

1. 备份前先关闭 d2-tools。
2. 关闭 d2-tools 后复制整个数据目录。Windows 默认目录来自 `%APPDATA%\d2-tools`，实际路径以设置页“本地数据目录”为准。
3. 恢复或迁移时，先在目标电脑安装并首次启动 d2-tools，让程序创建数据目录。
4. 关闭 d2-tools，再用备份目录覆盖目标电脑的数据目录。
5. 重新启动后检查 Bungie 配置、Manifest、愿望单、本地标签、目标规则和操作日志。

设置页提供“复制备份/迁移说明”和“复制脱敏诊断”。诊断导出不包含 token、client secret 或 API Key，可用于排查更新、配置、Manifest 和写操作问题。

## 7. 文档结构

当前只保留这些文档入口：

```text
README.md
CHANGELOG.md
docs/
  user-guide.md
  bungie-setup.md
  faq.md
  security.md
  todo.md
  development.md
  work/
    backlog/
    references/
```

不要把一次性设计稿、执行计划、阶段进度或临时分析文档放在 `docs/` 根目录。确实需要记录当前短期待办、验收状态、需求或 bug 时，统一更新 `docs/todo.md`；确实需要保留未完成设计或调研材料时，放进 `docs/work/backlog/` 或 `docs/work/references/`。已经作为实现依据的视觉基准原型放在 `docs/work/references/`。外部流程如果要求写入 `docs/superpowers/`，本仓库统一改写到 `docs/work/backlog/` 或 `docs/work/references/`。确实需要记录长期规则或少量长期方向结论时，更新 `docs/development.md`；已发布变化写入 `CHANGELOG.md`。

本仓库不设 `docs/work/archive/`。已完成且仍有效的规则、架构边界或长期结论应合并进正式文档；只剩历史追溯价值或已经过时的过程材料直接删除，需要追溯时使用 git 历史。

`docs/work/` 不维护 README 索引，也不为每次讨论新建平行计划。当前任务入口只看 `docs/todo.md`，长期开发规则只看 `docs/development.md`；`docs/work/backlog/` 中只保留仍未完成或暂不推进的计划，`docs/work/references/` 中只保留仍能作为实现依据的外部资料、数据源调研或视觉基准。

当前仍有效的 reference 文件：

- `docs/work/references/d2-unified-workspace-layout-v0.html`：冻结的跨端工作区视觉基准和规则样板，不是活跃原型或 UI 开发入口。日常菜单 UI 改动不要先改它；只有全局工作区骨架、首层 chrome、reference-only 标记或视觉基准本身变化时才同步更新。
- `docs/work/references/destiny-tool-reference.md`：竞品能力和信息组织参考。
- `docs/work/references/desktop-framework-comparison.md`：桌面技术方案对比参考。
- `docs/work/references/2026-06-21-destiny2-weapon-sheet-analysis.md`：社区武器表和数据分析参考。

## 7.1 长期方向（简版）

这里只保留不适合写进 `todo.md` 的长期演进方向，不单独维护路线图文档：

- 多端架构：按 `core -> services -> app -> ui/product host -> 平台壳` 收口业务、服务、前端查询层、产品 UI 和端能力。Desktop、Web 和后续移动 App 都只提供平台 adapter，页面实现共享。
- 国际化：界面语言和 Bungie 资料库语言分开建模；默认资料库语言跟随界面语言，用户后续可在设置中独立调整。
- 仓库整理体验：继续增强同名对比、批量处理、护甲属性价值判断和评分解释。
- 今日 / 本周信息：优先补齐可确认的商人、遗失区域和轮换线索，保持“只展示可确认数据”。
- AI 助手：围绕真实账号数据问答、仓库建议、结果结构化和安全边界继续打磨。
- 活动与桌面体验：逐步补齐基础复盘、安装更新、备份恢复和诊断导出体验。

## 8. 文档维护原则

- 对用户的回答、可见思路摘要、计划、状态更新和仓库文档默认使用中文
- 任何用户可见内容都必须使用中文，包括 thinking/analysis 面板中展示的推理摘要、工具调用前后的状态说明、阶段性解释和最终回答；不要把用户可见的 thinking 内容视为隐藏推理
- 代码标识符、API 名称、文件路径、命令、包名和上游原文引用可保留原语言
- 读取或编辑中文文档时使用 UTF-8，避免 PowerShell 或本地默认编码导致乱码
- Windows PowerShell 查看中文文件时，先执行：
  ```powershell
  $OutputEncoding=[System.Text.Encoding]::UTF8
  [Console]::OutputEncoding=[System.Text.Encoding]::UTF8
  Get-Content -Encoding UTF8 path\to\file
  ```
- 不要把未指定 UTF-8 的 PowerShell 输出复制回源码或文档；中文文案改动优先使用 `apply_patch`，批量脚本必须显式指定 UTF-8。
- `pnpm docs:check` 会同时执行文档结构检查和编码检查，拦截非法 UTF-8、典型 mojibake、Unicode replacement character 和连续问号造成的信息丢失。
- README 只做入口，不塞太多细节
- 同一件事只保留一个权威文档
- 玩家文档优先讲“怎么做”
- `todo.md` 是唯一当前待办、短期进度、需求和 bug 来源
- 长期方向如确实需要保留，合并到 `docs/development.md`，不要再单独维护 `roadmap.md`
- `work/backlog/` 保存未完成但暂不推进的设计和计划
- `work/references/` 保存外部资料分析、数据源调研和作为实现依据的视觉基准
- 不设 `work/archive/`；已完成且仍有效的内容合并进正式文档，过时或仅剩过程价值的材料直接删除
- 完成、取消或改变方向且影响当前短期待办、验收状态或优先级时，必须在同一次开发收尾时更新 `todo.md`
- 修复、确认无效或转为长期需求的 bug，必须在同一次开发收尾时更新 `todo.md` 对应条目
- `todo.md` 中的 `Bug #数字` 必须全局唯一；需要按领域区分时，在标题中加领域前缀，不要复用编号
- 设计/计划文档默认不作为正式入口；需要长期保留的结论应合并进正式文档
- `docs/work/` 只保留仍对当前工作有直接帮助的材料，不再额外维护索引文档
- 已完成或仅作历史追溯的过程材料直接删除，不再放入 archive 目录
- 本地临时日志、调试输出、pid / port / token 等运行态文件统一写到 `.local-data/tmp/`；不要把 `tmp-*`、`.tmp-*`、`*.err.log` 直接写到仓库根目录
