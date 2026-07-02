# 跨端 UI 壳与可交互原型重构

> 状态：实施中
> 目标：把当前桌面 renderer 中的平台无关 UI、视觉壳和页面组件抽成可被 Prototype / Web / Desktop / 后续 App 共同使用的产品 UI 层，保留“先做可交互原型，再接真实项目”的工作流。

## 背景

当前桌面端已经形成一套较完整的视觉语言：顶部状态条、左侧导航、主内容区、AI 抽屉、首页奖励工作台、账号装备工作区和设置分区。为了减少视觉返工，仓库里同时维护了一个 HTML 原型作为参考。

这个方式已经暴露出明显问题：

- HTML 原型和真实 React 应用是两套结构，确认后的设计还需要手工还原。
- 单个 HTML 文件越来越大，样式、结构和 mock 数据混在一起，局部修改成本变高。
- 桌面 renderer 中的 `ShellLayout`、页面路由、数据加载、Electron API 调用和具体页面组件耦合在一起，不适合直接复用到 Web。
- 用户期望继续保留“先原型，再项目”的开发方式，但原型需要变成真实可交互 React 原型，而不是一次性静态稿。

## 最终形态

```text
packages/
  app/          跨端业务 ViewModel / workspace，继续保持平台无关
  ui/           共享 React UI 壳、页面组件、设计系统和可交互控件
  prototype/    可交互原型入口，使用 mock 数据和状态面板
  product/      产品 UI Host，组合共享 UI、跨端状态、语言和平台 adapter
  web/          Web 壳，接 HTTP/API adapter
  desktop/      Electron 壳，接 IPC、本地文件、窗口和系统能力 adapter
  mobile/       后续移动 App 壳，接原生导航、存储、深链登录和权限 adapter
```

### `packages/ui`

`packages/ui` 是视觉和交互的主实现。它不直接 import `desktop`、不访问 `window.d2`、不读写本地文件、不知道 Electron IPC。

职责：

- 提供跨端 `AppShell`：顶部状态、导航 rail、主内容区、AI 抽屉插槽和主题切换入口。
- 提供页面组件：`HomePageView`、`AccountPageView`、`SettingsPageView` 等。
- 提供共享组件：状态条、按钮、面板、列表项、状态徽章、设置分区、奖励卡、角色 tab。
- 提供样式 token 和 CSS primitives。
- 只接收 props、回调和 ViewModel，不负责真实数据获取。

### `packages/prototype`

`packages/prototype` 是以后主要修改原型的地方。它是一个 Vite React 应用，不接真实接口。

职责：

- 使用 `packages/ui` 渲染完整可交互原型。
- 提供 mock 数据：账号已读取 / 未登录 / 资料库过期 / 后台任务运行 / 应用有新版 / 奖励已完成等状态。
- 提供原型控制面板，用来切换页面、主题和数据状态。
- 提供语言和资料库语言 mock，用来验证中英文切换、跟随界面语言和状态文案长度。
- 给用户和开发者快速验证布局、交互、文案和状态组合。

开发流程：

```text
先在 packages/prototype 改可交互原型
→ 用户确认视觉和交互
→ 稳定组件沉淀到 packages/ui
→ packages/web / packages/desktop 接入真实数据 adapter
→ 截图脚本对比 prototype 与真实端
```

### `packages/web`

`packages/web` 是 Web 壳，不承担原型职责，也不成为另一套页面实现。

职责：

- 挂载产品 UI Host。
- 使用 HTTP/API adapter 获取真实数据。
- 处理 Web 登录态、部署配置、Web 路由、浏览器存储和浏览器环境能力。
- 不包含 Electron IPC、本地数据目录或桌面更新逻辑。

### `packages/desktop`

`packages/desktop` 继续负责 Electron 壳和平台能力，不再承载主要产品 UI 结构。

职责：

- 提供 Electron adapter：IPC、OAuth 回调、本地目录、文件导入导出、更新、后台任务、窗口颜色。
- 把 adapter 返回的数据转换为 `packages/ui` 所需 ViewModel。
- 保留桌面启动、preload、main process 和打包发布能力。

### 产品 UI Host

产品 UI Host 是 Web / Desktop / 后续 App 共同挂载的 React 组合层。它不直接知道 Electron、浏览器部署或移动原生能力，只依赖平台 adapter。

职责：

- 持有当前页面、主题、语言、AI 抽屉等产品级 UI 状态。
- 把 `packages/app` 的 workspace / ViewModel 和 `packages/ui` 的展示组件组合起来。
- 接收平台 adapter：打开外链、持久化偏好、读取账号、检查资料库、导入导出、清理缓存、应用更新等。
- 对 Prototype 提供 mock adapter，对 Web 提供 HTTP/browser adapter，对 Desktop 提供 Electron IPC adapter。
- 保证同一个页面在 Web / Desktop / 后续 App 中只存在一份产品 UI 实现。

Host 不负责：

- Electron 窗口、preload、IPC 注册和自动更新主进程逻辑。
- Web 部署、OAuth 回调服务、远端 API 实现。
- 移动原生导航、权限、深链和系统存储。

## 语言切换

语言分成两层，避免把界面语言和 Bungie 资料库语言绑死：

- 界面语言：`zh-CN` / `en-US`，控制菜单、按钮、设置、状态、提示、诊断和空状态文案。
- Bungie 资料库语言：`zh-chs` / `en`，控制装备名、perk、活动名等 Bungie 数据。

默认策略：

- 新用户界面语言默认 `zh-CN`。
- 资料库语言默认跟随界面语言；用户可以在设置里改为独立选择。
- 顶部工具区提供紧凑切换入口：`中 / EN`。
- 设置页提供完整选项：界面语言、资料库语言、是否跟随界面语言。

实现规则：

- `packages/ui` 不直接写 `locale === "zh" ? ... : ...` 这种分散判断。
- 可见文案通过 copy key / dictionary 渲染。
- 平台壳只负责持久化偏好：Desktop 写入本地 `config.json`，Web 使用浏览器存储或后续用户设置 API，移动端使用原生存储。
- Bungie 资料库语言变化只影响后续资料库读取和展示，不强制立即破坏当前页面状态。

## Adapter 边界

共享 UI 和产品 Host 通过平台能力接口接入外部能力，接口由 `packages/app`、产品 Host 或 `packages/ui` 定义，平台端实现。

初始接口建议：

```ts
export type PlatformActions = {
  openExternal: (url: string) => Promise<void> | void;
  setColorMode?: (mode: "light" | "dark") => Promise<void> | void;
  persistPreferences?: (preferences: ProductPreferences) => Promise<void> | void;
};

export type ShellStatusItem = {
  label: string;
  value: string;
  tone?: "neutral" | "ready" | "warning" | "error";
};

export type ProductPreferences = {
  interfaceLocale: "zh-CN" | "en-US";
  bungieLocale: "zh-chs" | "en";
  followInterfaceLocaleForBungie: boolean;
  colorMode: "light" | "dark";
};
```

Desktop adapter：

- `openExternal` 调用 `window.d2.openExternal`
- `setColorMode` 调用 `window.d2.setWindowColorMode`

Prototype adapter：

- `openExternal` 使用 `window.open`
- `setColorMode` 只更新 DOM / React state

Web adapter：

- `openExternal` 使用普通浏览器跳转或新窗口
- 不提供窗口颜色 API

## 迁移阶段

### Phase 1：建立共享 UI 包和原型入口

目标：让 `packages/prototype` 可以跑起来，并复用从 desktop 抽出的 shell 基础组件。

范围：

- 新增 `packages/ui`
- 新增 `packages/prototype`
- 将 `ShellLayout` 抽为平台无关 `AppShell`
- 将 shell 类型、导航项、状态项移动到 `packages/ui`
- Prototype 使用 mock shell status 和首页占位内容跑通
- 新增 `pnpm dev:prototype`

验收：

- `pnpm --filter @d2-tools/ui typecheck` 通过
- `pnpm --filter @d2-tools/prototype typecheck` 通过
- `pnpm dev:prototype` 可打开可交互 shell
- Desktop 仍可编译，shell 外观不回退

### Phase 2：首页迁移到共享 UI

目标：把首页视觉和主要交互从 desktop 迁到 `packages/ui`，prototype 和 desktop 共用同一套首页视图。

范围：

- 抽 `HomePageView`
- 抽首页 mock 数据
- Desktop 保留数据读取和 action wiring，只传 ViewModel / callbacks
- Prototype 支持切换首页状态：正常、资料库过期、账号未读、奖励已完成
- 更新视觉截图脚本，从 HTML reference 逐步转向 prototype reference

验收：

- Prototype 首页可交互
- Desktop 首页仍可用
- 视觉脚本可截图 prototype 和 desktop

### Phase 3：账号页与设置页迁移

目标：把当前返工最多的账号页和设置页纳入共享 UI。

范围：

- 抽 `AccountPageView`
- 抽 `SettingsPageView`
- Account prototype 支持角色切换、装备/背包状态和未登录状态
- Settings prototype 支持应用更新、资料库、AI、账号、备份迁移和诊断状态
- Desktop 平台能力通过 adapter 回调接入

验收：

- Prototype 可验证账号页和设置页状态
- Desktop 账号和设置功能不丢失
- 相关 renderer 测试更新为 `ui` 组件结构断言

### Phase 4：正式 Web 入口

目标：新增正式 Web app，复用 `packages/ui`，接 HTTP/API adapter。

范围：

- 新增 `packages/web`
- 接入 `packages/app` workspace
- 接入 HTTP 服务或远端 API
- 保留 Web 与 Prototype 不同入口：Prototype 用 mock，Web 用真实 adapter

验收：

- `pnpm --filter @d2-tools/web build` 通过
- Web 首页可以使用真实或本地服务数据渲染
- Desktop 不依赖 Web 构建产物

### Phase 5：退役 HTML 原型

目标：旧静态 HTML 不再作为活跃开发入口，视觉截图脚本默认使用 `packages/prototype`。

范围：

- 视觉截图脚本使用 `packages/prototype`
- 测试从 HTML 字符串断言迁移到 React / screenshot / component boundary
- README 更新为新的原型入口说明

验收：

- 没有脚本依赖旧 HTML 原型
- 新原型工作流写入 `docs/development.md`
- 旧 HTML 已删除，`docs/work/references/desktop-ui/README.md` 指向 React prototype

## 测试策略

- `packages/ui`：组件结构、状态渲染、平台 action 注入测试。
- `packages/prototype`：mock 状态切换和 shell navigation 测试。
- `packages/desktop`：adapter wiring、Electron API 调用边界、真实页面传参测试。
- 视觉验证：prototype screenshot 与 desktop screenshot 对比。
- 文档验证：`pnpm docs:check`。

## 风险和处理

- 风险：一次迁移所有页面会长时间不可运行。
  - 处理：每个 phase 都保持 Prototype 和 Desktop 至少一个页面可运行。
- 风险：Desktop 特有能力泄漏进 `packages/ui`。
  - 处理：`packages/ui` 不允许 import `packages/desktop`，后续增加边界测试。
- 风险：Prototype 变成第二套实现。
  - 处理：Prototype 只能组合 `packages/ui` 和 mock 数据，不单独维护页面结构。
- 风险：样式继续分裂。
  - 处理：样式 token 先从 `packages/desktop/src/renderer/styles.css` 提取到 `packages/ui/src/styles.css`，Desktop 和 Prototype 都引用同一份。

## 当前决策

- 选择完整 C 方案：Web 壳成为主实现，Desktop 作为 Electron 平台入口。
- 保留“先原型，再项目”的工作流。
- 原型升级为可交互 React prototype，不再继续扩大单 HTML 文件。
- 已建立 `packages/ui`、`packages/prototype` 和 `packages/web`。
- Web、Prototype 和 Desktop 均已挂共享 `ProductShellHost`；旧 Desktop `ShellLayout` wrapper 已删除，Desktop 只保留 Electron 平台能力 adapter。
- 继续推进方向调整为“产品 UI Host + 平台壳”：Web / Desktop / 后续 App 都挂同一个产品 Host，壳只提供平台 adapter。
- 新增中英文切换：界面语言和 Bungie 资料库语言分开建模，默认资料库语言跟随界面语言。
