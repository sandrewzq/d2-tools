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

- `packages/services`
  - 负责 Profile / Manifest / LocalData / AI 等服务接口
  - 负责桌面、本地、Web、移动端或远端 API 的 adapter
  - 负责把网络、存储、鉴权等平台能力收口到服务边界

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
5. `ProductShellHost` 是产品外壳统一入口；Prototype / Web / Desktop 都应挂同一个 Host。不得重新引入 Desktop 或 Web 专用 shell wrapper 来复制页面结构。
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

### 2.5 Renderer UI 样式系统

- 桌面端 UI 按“页面底层 / 主面板 / 子块或列表项”三层组织；页面必须有主工作区，辅助信息和低频信息下沉。
- 全局样式 token 定义在 `packages/ui/src/styles.css` 的 `:root` 和 `.app-shell[data-color-mode]`：间距使用 `--space-8/12/16/24/32`，圆角使用 `--radius-control/panel/pill`，颜色使用 `--surface-*`、`--border-*`、`--text-*` 和 `--status-*`。
- 共享 UI 设计系统继续补齐 `--field-*`、`--chip-*`、`--item-*`、`--drawer-*` 和 `--game-*` token：普通产品 UI 必须使用 field / chip / item / drawer 语义色，`--game-*` 只用于装备详情顶部等明确游戏视觉区域。
- AI 抽屉是桌面外壳的独立 pane：`.shell-content` 和 `.global-assistant-panel` 各自滚动，抽屉不得再用 fixed 遮罩覆盖主工作区。
- 明暗色模式由 `config.json` 的 `features.color_mode` 持久化，默认 `light`；桌面启动状态必须携带保存的颜色模式，避免应用重启或覆盖更新后回到默认外观。
- 新增状态文案统一使用 `status-message status-neutral|pending|ready|warning|error`，不要再在 TSX 中新增 `notice` 或 `error` 类。
- 新增列表、筛选和对象卡片优先复用 `ui-list-row`、`ui-filter-toolbar`、`ui-item-card`、`ui-badge`；设置页或工具区子块优先复用 `panel-subsection`。
- 主菜单页面统一使用 `ProductWorkspacePage`、`ProductWorkspacePanel`、`ProductWorkspaceCommandBar`、`ProductWorkspaceSplit`、`ProductWorkspaceSideRail`、`ProductWorkspaceContentStack` 和 `ProductWorkspaceEmptyState` 生成 `product-workspace-*` 共享工作区骨架；不要为某个菜单单独发明顶层间距、页面标题、左右分栏或空状态高度规则。
- 菜单允许有私有样式，但只能作用在菜单内容层：信息架构、领域组件、列表密度、装备卡、筛选控件、库存图标、perk 池、配装条目等可以使用 `.account-*`、`.vault-*`、`.library-*`、`.loadout-*`、`.vendor-*`、`.home-*` 自定义。页面根、顶部标题、主分栏、首层面板、首层工具栏、滚动容器、暗色背景和主 surface chrome 归共享工作区骨架所有。
- 菜单私有 class 和 `ProductWorkspace*` 叠加使用时，不得重新定义共享 chrome 属性，包括 `padding`、`border`、`border-radius`、`background`、`box-shadow` 和页面级 `gap`。如果首块区域需要不同密度，优先调整内部子元素；确实需要新的骨架能力时，先扩展 `ProductWorkspace*` 或 token，而不是在菜单 class 里覆盖。
- 私有样式必须使用共享 token 表达颜色、间距、圆角和状态；不要新增硬编码浅色背景、菜单专属暗色兼容块，或只在某一端生效的视觉修补。Prototype / Web / Desktop 的差异只能来自数据、平台 adapter 或 mock 状态，不能来自不同页面 CSS。
- `tool-panel` 是主面板层，不能挂到主菜单页面根上；不要把普通说明块做成嵌套大卡片。装备详情顶部可以保留游戏内视觉语义，但底部工具区继续使用桌面工具样式。
- `packages/desktop/test/ui-style-system.test.ts` 负责锁定 token、共享样式类、设置页布局、状态语言和 Desktop CSS 平台边界，防止产品样式回流到 Desktop 私有 CSS。
- `packages/desktop/test/workspace-layout.test.ts` 负责锁定主菜单工作区骨架和菜单私有样式权限，防止页面 class 覆盖 `ProductWorkspace*` 的首层间距、面板 chrome 和工具栏 chrome。
- 后续 UI 开发以本节和 `packages/desktop/test/ui-style-system.test.ts` 为准，不再维护单独的历史样式规范文档。

### 2.6 桌面外壳、更新和后台任务

- 桌面外壳必须稳定展示应用版本和资料库状态；后台任务不进入顶部状态条，也不在每个页面渲染大横幅，只通过共享右下角任务 Dock 在运行、重试或失败时轻量提示，设置页保留完整任务详情。
- 应用更新由主进程 `updates` IPC 和后台任务中心持有生命周期；renderer 只发起检查、下载、安装确认和订阅状态。
- 应用更新检查失败后进入后台重试，重试策略允许最后一个有限间隔持续复用；不要在网络失败后只提示一次就停止。
- 资料库版本检查由主进程 `manifest` IPC 和后台任务中心持有生命周期；每次启动应用会检查最新 Bungie Manifest。
- 本地 Manifest 未初始化、必要 definition component 缺失或版本落后时，必须提示并允许后台更新；未初始化或组件缺失时，资料库依赖功能应阻断搜索或详情入口。
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

1. 构建 `@d2-tools/core` 和 `@d2-tools/http`
2. 编译 Electron 主进程和 preload
3. 启动 Vite 前端开发服务器，固定使用 `http://127.0.0.1:53172`
4. 打开 Electron 开发版桌面应用

这不是打包流程，不会生成或解压 `release/win-unpacked`。渲染层改动支持热更新；主进程、preload、core 或 http 改动后，关闭桌面窗口再重新运行 `npx pnpm@9.15.0 dev:desktop` 即可重新编译启动。开发端口启用 strict port；如果 `53172` 被占用，启动会直接失败并提示释放端口，不会自动跳到别的端口导致 Electron 打开错误页面。发布版不依赖这个端口；打包后的 Electron 会直接加载安装包内的 `dist/renderer/index.html`。

如果只想单独启动前端页面：

```powershell
npx pnpm@9.15.0 dev
```

如果要先做可交互原型，使用 React prototype：

```powershell
npx pnpm@9.15.0 dev:prototype
```

Prototype 使用 `packages/ui` 共享壳、产品 Host、页面 View 和 mock adapter，默认端口为 `http://127.0.0.1:53170`。视觉密集页面先在 Prototype 中验证，再接入 Desktop 或 Web。Web 默认端口为 `http://127.0.0.1:53171`。

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

- `tools/dev-prototype.cmd`：启动或打开 Prototype，本地端口 `53170`。
- `tools/dev-web.cmd`：启动或打开 Web，本地端口 `53171`。
- `tools/dev-desktop.cmd`：启动或打开 Desktop 开发版，本地端口 `53172`。
- `tools/dev-status.cmd`：只读查看 Prototype / Web / Desktop 开发端口占用情况。
- `tools/git-preflight.cmd`：只读按文档、工具、跨端 UI、Desktop、core/services/app/http 分组查看 Git 改动，识别菜单 lane / 共享层风险 / 多 lane 混改，并提示建议验证命令、高冲突文件和并行安全建议。
- `tools/git-commit-and-push.cmd`：全量提交并 push，不创建 release tag。
- `tools/git-auto-release.cmd`：先检查当前版本 GitHub Release 是否存在；失败或缺失时复用当前版本并更新同名 tag 重跑发布，已成功时才自动 patch +1 版本、生成 changelog、提交、push 并创建新 release tag。

命名规则：本地开发启动脚本使用 `dev-` 前缀，Git / Release 辅助脚本使用 `git-` 前缀，后续批量维护脚本优先使用 `maintenance-` 前缀。

## 4. 测试与检查

日常开发优先按改动范围跑快路径，不要每次都跑发布级全量链路。

### 4.0 Vibecoding 快路径

单 agent 做菜单或共享 UI 时，默认先跑 `verify:vibe:*`，只拿当前循环需要的反馈；交接、提交、合并或声称门禁通过前，再升级到对应 `verify:*`。

```powershell
npx pnpm@9.15.0 verify:vibe:docs
npx pnpm@9.15.0 verify:vibe:ui
npx pnpm@9.15.0 verify:vibe:desktop
npx pnpm@9.15.0 verify:vibe:desktop:account
npx pnpm@9.15.0 verify:vibe:desktop:ai
npx pnpm@9.15.0 verify:vibe:desktop:loadouts
npx pnpm@9.15.0 verify:vibe:desktop:vault
```

这些命令不替代收口门禁：`verify:vibe:*` 用来缩短 coding 循环，`verify:*` 用来交接和提交前兜底。视觉脚本默认放到收口阶段运行；只有当前改动直接影响视觉主题、页面壳或截图目标时，才在单 agent 循环里提前运行。

测试断言优先检查稳定契约，例如组件可渲染、导出存在、role / label、关键 class 结构和 ViewModel 输出。不要把普通功能测试写成源码中文、import 顺序、整段 HTML 或大段 CSS 的字符串匹配；这类检查只用于边界规则或迁移保护。

给 agent 的固定入口：

1. 开工前先运行 `tools\git-preflight.cmd`，确认当前脏文件属于哪个菜单或共享 lane、建议跑哪个验证命令、是否触碰高冲突文件，以及是否需要 worktree 隔离。
2. 文档或工具说明改动运行 `npx pnpm@9.15.0 verify:docs`。
3. 跨端 UI、Prototype 或 Web 改动运行 `npx pnpm@9.15.0 verify:ui`；首页或设置页视觉改动追加 `visual:home` 或 `visual:settings`，全局 AI 抽屉改动追加 `visual:ai`。如果改动影响共享 CSS token、暗色模式、页面壳或多个菜单，追加 `visual:all`。
4. Desktop 接线、IPC、preload 或 renderer adapter 改动运行 `npx pnpm@9.15.0 verify:desktop`。
5. Release / CHANGELOG / 版本脚本改动运行 `npx pnpm@9.15.0 verify:release`，发布前再按需要跑全量 `test` 和 `typecheck`。
6. 如果只改某个领域测试覆盖明确的业务模块，优先跑对应 `vitest --run packages/<pkg>/test/<name>.test.ts`；准备提交或范围变大时再跑 `verify`。

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
npx pnpm@9.15.0 test:ui
npx pnpm@9.15.0 test:desktop
npx pnpm@9.15.0 test:desktop:account
npx pnpm@9.15.0 test:desktop:ai
npx pnpm@9.15.0 test:desktop:loadouts
npx pnpm@9.15.0 test:desktop:vault
npx pnpm@9.15.0 test:desktop-wiring
npx pnpm@9.15.0 test:release
```

`test:fast` 直接运行 Vitest，不预先全仓 build；`test:ui` 跑共享 UI / 跨端页面收口相关测试；`test:desktop` 跑桌面端测试；`test:desktop:account`、`test:desktop:ai`、`test:desktop:loadouts`、`test:desktop:vault` 是菜单私有快测；`test:desktop-wiring` 只跑桌面接线、边界和打包格式相关快测；`test:release` 只跑 release 规则、changelog 提取和安装包格式相关快测。测试集合由 `scripts/run-test-set.mjs` 维护，避免 Windows shell 通配差异导致漏跑。普通功能改动优先跑相关定向测试，例如：

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

`typecheck:desktop-fast` 只跑 Desktop 自身类型检查，适合日常接线快验；`typecheck:desktop` 会先 build `core` 和 `http`，适合碰到底层依赖或准备发布前使用。

提交前如果需要一轮中等门禁：

```powershell
npx pnpm@9.15.0 verify:vibe:ui
npx pnpm@9.15.0 verify:vibe:desktop:loadouts
npx pnpm@9.15.0 verify
npx pnpm@9.15.0 verify:docs
npx pnpm@9.15.0 verify:ui
npx pnpm@9.15.0 verify:desktop
npx pnpm@9.15.0 verify:desktop:account
npx pnpm@9.15.0 verify:desktop:ai
npx pnpm@9.15.0 verify:desktop:loadouts
npx pnpm@9.15.0 verify:desktop:vault
npx pnpm@9.15.0 verify:release
```

发布级全量测试：

```powershell
npx pnpm@9.15.0 test
```

类型检查：

```powershell
npx pnpm@9.15.0 typecheck
```

`test` 会先跑 `docs:check`，再全仓 build，最后全量 Vitest；`typecheck` 会先 build `core` 和 `http`，再全仓类型检查。它们更适合发布、release、CI 或声称“全仓通过”前使用，不作为每次 vibecoding 小改动的默认动作。

GitHub Actions 中的最小 CI 会在 Windows runner 上执行：

1. `pnpm install --frozen-lockfile`
2. `pnpm test`
3. `pnpm typecheck`

也就是说，任何会影响依赖锁文件、测试结果、类型边界或文档检查脚本的改动，都会在 PR / push 阶段被拦截。

如果你只想跑桌面端某个定向测试，也可以直接用：

```powershell
npx pnpm@9.15.0 vitest --run packages/desktop/src/vault-panel.test.ts
```

## 5. 打包

一键本地打包（安装依赖 + 测试 + 类型检查 + 打包，完成后自动打开产物目录）：

```powershell
powershell -File scripts/local-package.ps1
```

该脚本内部执行：

1. `pnpm install`
2. `pnpm build`
3. `vitest --run`
4. `pnpm typecheck`
5. `pnpm package:win`

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

1. 更新所有 `package.json` 版本号（root、core、app、services、desktop、http 保持一致）
2. 更新 `CHANGELOG.md`，新增 `## x.y.z - YYYY-MM-DD` 章节
3. 本地预览 Release Body：
   ```powershell
   npx pnpm@9.15.0 release:preview --version x.y.z
   ```
4. 提交改动：
   ```powershell
   git add .
   git commit -m "release: prepare vX.Y.Z"
   ```
5. 打 tag 并推送：
   ```powershell
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
6. CI 自动构建、校验 CHANGELOG、生成 Release Body 并发布 GitHub Release

### 6.2 注意事项

- 如果 `CHANGELOG.md` 没有对应版本章节，CI 会失败，不会发布 Release
- 只有 tag 名包含 `-beta` 或 `-rc` 时，GitHub Release 才会自动标记为 Pre-release，例如 `v0.0.8-beta.1`、`v1.0.0-rc.1`
- Release workflow 接受两类 tag：正式版 `vX.Y.Z`，或与当前包版本一致的预发布 tag（例如 `vX.Y.Z-beta.1`、`vX.Y.Z-rc.1`）
- Release Assets 当前包含 `d2-tools-setup-<version>.exe`、`latest.yml` 和安装器 blockmap

### 6.3 发布前检查

1. `test` 通过
2. `typecheck` 通过
3. `pnpm release:preview --version x.y.z` 输出符合预期
4. README 和核心文档没有明显失真
5. 版本号和 tag 一致

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
