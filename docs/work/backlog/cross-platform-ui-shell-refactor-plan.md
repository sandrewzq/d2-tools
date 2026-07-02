# 跨端 UI 壳重构实施计划

> 对应设计：[跨端 UI 壳与可交互原型重构](cross-platform-ui-shell-refactor.md)
> 执行原则：每个阶段都保持 Desktop 可运行，Prototype 可单独打开；Prototype 只组合共享 UI 和 mock 数据，不维护第二套页面结构。
> 当前进度：Phase 1 的包结构、共享 `AppShell`、共享 PageView、`packages/web` 入口和 React prototype reference 已落地；Phase 4.5 的共享 `ProductShellHost`、shell i18n copy、语言偏好模型、Desktop 持久化和设置页语言入口已落地；Prototype / Web / Desktop 均已挂共享 Host，旧 Desktop `ShellLayout` wrapper 已退役；后续继续迁移页面内部子组件和页面文案。

## Phase 1：共享 Shell 和 Prototype 入口

### Task 1：包结构与边界测试

文件：

- 新增 `packages/ui/package.json`
- 新增 `packages/ui/tsconfig.json`
- 新增 `packages/ui/src/index.ts`
- 新增 `packages/prototype/package.json`
- 新增 `packages/prototype/tsconfig.json`
- 新增 `packages/prototype/index.html`
- 新增 `packages/prototype/src/main.tsx`
- 修改 `package.json`
- 新增或修改边界测试

步骤：

1. 写失败测试：断言 workspace 中存在 `@d2-tools/ui`、`@d2-tools/prototype`，根脚本包含 `dev:prototype`。
2. 跑测试，确认失败原因是包和脚本不存在。
3. 新增两个包的最小 Vite / TypeScript 配置。
4. 增加 `dev:prototype`、`build` 和 `typecheck` 脚本。
5. 跑目标测试、`pnpm --filter @d2-tools/ui typecheck`、`pnpm --filter @d2-tools/prototype typecheck`。

验收：

- 包可被 pnpm workspace 识别。
- Prototype 能启动一个空 React 页面。

### Task 2：抽离平台无关 Shell 类型

文件：

- 新增 `packages/ui/src/shell/types.ts`
- 新增 `packages/ui/src/shell/navigation.ts`
- 修改 `packages/desktop/src/renderer/components/ShellLayout.tsx`

步骤：

1. 写失败测试：断言 `@d2-tools/ui` 导出 `ShellPageKey`、`ShellAssistantMode`、`ShellStatusItem` 和 `navItems`。
2. 跑测试确认失败。
3. 从 desktop 迁移类型和导航项到 `packages/ui`。
4. Desktop 从 `@d2-tools/ui` 引用类型和导航项。
5. 跑 UI typecheck、Desktop renderer typecheck。

验收：

- 类型从共享包导出。
- Desktop shell 行为不变。

### Task 3：抽离 `AppShell`

文件：

- 新增 `packages/ui/src/shell/AppShell.tsx`
- 新增 `packages/ui/src/styles.css`
- 修改 `packages/desktop/src/renderer/components/ShellLayout.tsx`
- 修改 `packages/desktop/src/renderer/main.tsx`
- 修改 `packages/prototype/src/main.tsx`

步骤：

1. 写失败测试：渲染 `AppShell`，断言导航按钮、顶部状态、AI 插槽和 children 出现。
2. 跑测试确认失败。
3. 把 `ShellLayout` 中平台无关 JSX 移到 `AppShell`。
4. 用 `platformActions` 替代直接访问 `window.d2`。
5. Desktop `ShellLayout` 变成薄 wrapper，注入 Electron platform actions。
6. Prototype 直接使用 `AppShell` 和 mock status。

验收：

- Prototype 展示真实 shell。
- Desktop 继续展示同一套 shell。
- `packages/ui` 不 import `packages/desktop`。

### Task 4：Prototype mock 状态面板

文件：

- 新增 `packages/prototype/src/mock/shellMock.ts`
- 新增 `packages/prototype/src/PrototypeApp.tsx`
- 新增 `packages/prototype/src/styles.css`

步骤：

1. 写失败测试：断言 prototype 可切换页面、主题和 AI 抽屉状态。
2. 跑测试确认失败。
3. 实现 mock shell status、导航状态、主题状态和 AI drawer 状态。
4. 加一个轻量控制区，只用于 prototype，不进入 `packages/ui`。
5. 跑 prototype typecheck 和测试。

验收：

- Prototype 是可交互的，不再只是静态页面。
- 用户可以在浏览器中切换主题、页面和 AI 抽屉。

## Phase 2：首页迁移

### Task 5：抽 `HomePageView`

文件：

- 新增 `packages/ui/src/home/HomePageView.tsx`
- 新增 `packages/ui/src/home/types.ts`
- 修改 `packages/desktop/src/renderer/features/home/HomeDashboard.tsx`
- 修改 `packages/prototype/src/mock/homeMock.ts`

验收：

- Prototype 首页和 Desktop 首页共用 `HomePageView`。
- 首页数据由 ViewModel / mock 提供，不在 UI 组件里读取平台 API。

### Task 6：更新视觉对比脚本

文件：

- 修改 `scripts/visual-home-check.mjs`
- 修改 `packages/desktop/test/visual-prototype-harness.test.ts`

验收：

- 脚本可以截 Prototype 首页作为 reference。
- 旧 HTML 原型已删除，不再是活跃开发入口。

## Phase 3：账号和设置迁移

### Task 7：抽 `AccountPageView`

验收：

- Prototype 可切换账号已读取 / 未登录 / 角色切换 / 装备操作 disabled 状态。
- Desktop 账号页复用同一视图。

### Task 8：抽 `SettingsPageView`

验收：

- Prototype 可切换应用更新、资料库、AI、账号、备份迁移和后台任务状态。
- Desktop 设置页平台操作通过 callback 注入。

## Phase 4：正式 Web 入口

### Task 9：新增 `packages/web`

验收：

- Web 使用 `packages/ui` 和 `packages/app`。
- Web 不 import `packages/desktop`。
- Web 可用 mock adapter 或 HTTP adapter 跑起来。

## Phase 4.5：产品 UI Host 和语言切换

目标：把当前散落在 Prototype / Web / Desktop 的页面、主题、语言和 shell 状态组合收口成同一套产品 Host 契约，避免 Web、Desktop 和后续 App 分叉。

### Task 11：跨端语言模型和 copy dictionary

文件：

- 新增 `packages/ui/src/i18n/types.ts`
- 新增 `packages/ui/src/i18n/copy.ts`
- 新增 `packages/ui/src/i18n/preferences.ts`
- 修改 `packages/ui/src/index.ts`
- 新增或修改 `packages/desktop/test/shared-ui-i18n.test.ts`

验收：

- `zh-CN` 和 `en-US` 两套界面 copy 覆盖 shell 导航、顶部工具、状态条基础标签和设置语言入口。
- Bungie 资料库语言独立建模为 `zh-chs` / `en`。
- `followInterfaceLocaleForBungie` 为真时，界面语言切换会派生对应资料库语言。
- 测试锁定 copy key 不允许只在一门语言中存在。

状态：已完成，新增 `packages/ui/src/i18n/` 和 `packages/desktop/test/shared-ui-i18n.test.tsx`。

### Task 12：AppShell 接入语言切换

文件：

- 修改 `packages/ui/src/shell/types.ts`
- 修改 `packages/ui/src/shell/navigation.ts`
- 修改 `packages/ui/src/shell/AppShell.tsx`
- 修改 `packages/prototype/src/main.tsx`
- 修改 `packages/web/src/main.tsx`
- 修改 `packages/desktop/src/renderer/components/ShellLayout.tsx`

验收：

- 顶部工具区显示 `中 / EN` 紧凑切换入口。
- shell 导航、设置按钮、主题按钮、AI 按钮和 GitHub aria 文案来自 copy dictionary。
- Prototype / Web / Desktop 都通过同一个 props 契约传入语言和切换回调。
- 没有在 shell 组件里散落 `locale === ... ? ... : ...` 判断。

状态：已完成，`AppShell`、Prototype、Web 和 Desktop shell 已接入。

### Task 13：产品 Host 契约

文件：

- 新增 `packages/ui/src/product/types.ts`
- 新增 `packages/ui/src/product/ProductShellHost.tsx`
- 修改 `packages/ui/src/index.ts`
- 修改 `packages/prototype/src/main.tsx`
- 修改 `packages/web/src/main.tsx`

验收：

- Prototype 和 Web 不再各自复制 shell 状态、页面状态、语言状态和平台 action 组合逻辑。
- `ProductShellHost` 接收 `adapter`、`initialPreferences`、`shellStatus` 和页面 slot / route renderer。
- Desktop 支持受控模式挂载 `ProductShellHost`，页面、AI 抽屉、颜色和语言偏好由 Desktop 状态驱动，Electron 能力通过 platform actions 注入。

状态：已完成，Prototype / Web / Desktop 均已挂 `ProductShellHost`，旧 Desktop `ShellLayout` wrapper 已删除。

### Task 14：Desktop 偏好持久化预留

文件：

- 修改 `packages/desktop/src/renderer/pages/HomePage.tsx`
- 修改 `packages/desktop/src/renderer/api/configApi.ts`
- 修改 `packages/desktop/src/main/ipc/config.ts`
- 修改配置 schema 相关文件时必须先确认没有覆盖无关改动。

验收：

- Desktop 能读取并保存界面语言、资料库语言和跟随选项。
- 如果配置文件没有语言字段，默认 `zh-CN` 且资料库语言跟随界面语言。
- 本任务若与当前 `packages/core/src/config/*` 未提交改动冲突，先暂停确认，不直接覆盖。

状态：已完成，配置字段、启动状态、设置页语言区和顶部语言切换已接入；未覆盖无关配置改动。

## Phase 5：退役 HTML 原型

### Task 10：替换旧 HTML reference

验收：

- 视觉流程默认使用 `packages/prototype`。
- 旧静态 HTML 已删除，`docs/work/references/desktop-ui/README.md` 指向 `packages/prototype`。
- 文档中只保留新的原型入口。
