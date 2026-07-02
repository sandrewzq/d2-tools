# 跨端 UI 壳与可交互原型收口

> 状态：实施中
> 当前目标：让 Prototype / Web / Desktop 继续共享同一个 `ProductShellHost` 和 `packages/ui` 页面结构，平台壳只提供 adapter、端能力和真实数据接线。

## 当前事实

已完成的方向不再作为待办重复追踪：

- 已建立 `packages/ui`、`packages/prototype` 和 `packages/web`。
- Prototype / Web / Desktop 均已挂共享 `ProductShellHost`。
- 旧 Desktop 专用 shell wrapper 已退役，Desktop 只保留 Electron 平台能力 adapter。
- 界面语言和 Bungie 资料库语言已分开建模，Desktop 偏好持久化已接入。
- 首页、设置页、账号页、资料库页、配装页和部分仓库页面结构已迁入 `packages/ui`。
- Prototype 已成为当前活跃原型入口，旧静态 HTML 不再作为活跃实现入口。

后续文档和开发不再回到“Phase 1/2/3/4/5”历史计划；当前只追踪剩余收口工作。

## 长期边界

### `packages/ui`

`packages/ui` 是产品 UI 和跨端页面结构的主实现：

- 提供 `ProductShellHost`、shell、页面视图、共享组件、设计系统 token 和 i18n copy。
- 页面组件只接收 ViewModel、props 和 callback，不直接访问 Electron、浏览器部署、Node 文件系统或 `window.d2`。
- 可见文案优先进入 `packages/ui/src/i18n/` 或对应领域 copy。

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

## 当前剩余工作

### 1. 页面内部复杂块继续迁入 `packages/ui`

优先处理仍在 Desktop feature 中维护但具有跨端复用价值的页面内部块：

- 仓库页：筛选列表、清理工作台、同名对比、目标规则、推荐数据入口。
- 账号页：真实账号装备区、材料 / 邮政官 / 活动复盘中仍可复用的展示块。
- 资料库页：出处查询、Perk 查询、掉落状态、收藏 / 历史 / 别名入口。
- 配装页：列表、详情、草稿和写操作确认的展示层。

原则：业务读取、写操作和平台能力留在 Desktop / Web adapter；展示结构和可复用文案迁到 `packages/ui`。

### 2. Adapter 边界继续收口

当前重点不是新增一套页面，而是让各端 adapter 更清楚：

- Prototype adapter 只提供 mock 数据和 mock action。
- Web adapter 优先接 `/api/home-snapshot`、`/api/pages/:page/snapshot` 等 HTTP 边界；无服务时允许 fallback snapshot。
- Desktop adapter 继续接 Electron IPC、本地文件、窗口、更新和后台任务。
- 跨端 DTO 放到 `packages/app`、`packages/services`、`packages/ui` 的类型边界，不把大型 DTO 塞回 Desktop renderer API 聚合文件。

### 3. i18n 和 copy 收口

剩余中文文案应逐步收进共享 copy：

- shell、首页、设置页、账号页、仓库页、资料库页和配装页的产品文案优先进入 `packages/ui/src/i18n/`。
- 旧 Desktop feature 中暂留的中文可以保留，但新增文案不要继续分散。
- 不在组件中新增 `locale === ... ? ... : ...` 的临时判断。

### 4. 测试断言同步到新边界

旧测试如果仍检查 Desktop feature 内部具体结构，应迁到新边界：

- `packages/ui` 测页面结构、状态文案、copy key、组件 props。
- Prototype 测 mock 状态切换和 Host 组合。
- Web 测 adapter fallback 和浏览器能力。
- Desktop 测 Electron adapter 接线、IPC callback、写操作边界和真实数据传参。

已迁出的页面不再要求 Desktop feature 文件包含旧 CSS class 或旧 JSX 结构。

### 5. 视觉验证继续以 React Prototype 为准

视觉对比优先使用：

- `packages/prototype` 作为 reference。
- Desktop / Web 作为真实消费者。
- `visual:home`、`visual:settings` 或后续页面视觉脚本作为回归入口。

旧 HTML 只可作为历史参考，不作为新的活跃实现入口。

## 测试要求

改 `packages/ui` 后，至少验证：

```powershell
npx pnpm@9.15.0 --filter @d2-tools/ui typecheck
npx pnpm@9.15.0 --filter @d2-tools/prototype typecheck
npx pnpm@9.15.0 --filter @d2-tools/web typecheck
npx pnpm@9.15.0 docs:check
```

影响 Desktop adapter 或真实页面接线时，补跑相关 Desktop vitest。影响首页或设置页视觉时，继续跑对应视觉脚本。

## 完成标准

这条 backlog 完成时应满足：

1. Prototype / Web / Desktop 页面结构稳定共享 `ProductShellHost` 和 `packages/ui`。
2. Desktop feature 只保留真实数据、写操作和平台能力接线，不再复制产品页面结构。
3. Web 有清楚的真实数据 provider / fallback provider 边界。
4. 新增页面文案默认进入共享 copy。
5. 旧测试不再依赖已迁出的 Desktop JSX / CSS 细节。
