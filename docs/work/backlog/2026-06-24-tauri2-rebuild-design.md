# d2-tools Tauri 2 架构底座重构设计

> 日期：2026-06-24
> 目标目录：`D:\sandrew\d2-tools`
> 决策：当前仓库进入新架构主线，旧 Electron 版本只作为业务需求参考，不作为技术结构参考。
> 主路线：先完成 Tauri 2 桌面端架构底座，再用薄功能切片验证；之后再恢复完整桌面功能，最后按需接 Capacitor、Web/PWA 和云同步。

## 1. 背景和目标

旧 Electron 版本已经验证了 Destiny 2 本地工具的业务方向，但这次重构不做 Electron 原地替换，也不沿用旧 renderer / IPC 架构。新主线按 clean slate 方式设计，目标是建立一个长期可维护、可多端复用、local-first 的桌面应用底座。

第一阶段的目标不是追平旧版全部功能，而是完成 **Tauri 2 架构底座 MVP**：

- 建立 `apps/desktop` 和 `packages/core/data/platform/ui/shared` 的 monorepo 边界。
- 跑通 Tauri 2 桌面壳、权限、插件、command、打包基础链路。
- 建立前端不能直接调用 Tauri 的约束，统一经 `packages/platform`。
- 建立本地数据访问约束，统一经 `packages/data`。
- 用少量薄功能验证底座：设置、授权、Manifest 状态、账号摘要、仓库基础列表、AI 基础聊天。

第一阶段明确不做：

- 不追平当前 Electron 全部功能。
- 不做移动端实际功能。
- 不做 Web/PWA 实际功能。
- 不接 API 服务、PostgreSQL、云同步、远程账号或队列同步。
- 不做完整配装优化器、DIM 级拖拽、社区推荐重做。

验收口径从“用户功能完整”改成“架构边界正确且可运行”。只要薄切片证明 `apps/desktop -> ui -> data/platform -> core/Tauri/local storage` 这条链路成立，第一阶段就合格。

## 2. 总体阶段

阶段顺序：

1. **Tauri 2 架构底座**
   - 建立 clean slate monorepo 和包边界。
   - 完成桌面壳、平台能力、数据层、本地存储和薄功能闭环。

2. **桌面功能恢复**
   - 在新架构上按垂直切片恢复首页、账号、仓库、装备详情、AI 助手、诊断、更新等功能。
   - 每个切片必须遵守 `ui/data/platform/core` 的依赖方向。

3. **Capacitor 移动端**
   - 复用 `core/data/ui`，新增移动端 platform adapter。
   - 单独处理 OAuth deep link、安全存储、小屏交互和离线缓存。

4. **Web/PWA**
   - 以浏览器能力为边界，优先支持离线资料库和可安全运行的本地能力。
   - 完整 Bungie 授权能力需单独验证 OAuth、安全存储和 CORS。

5. **API 服务和云同步**
   - 只有当明确需要多设备同步、共享方案、远程 AI 作业或账号体系时再引入。
   - PostgreSQL 只作为后续同步层，不是第一阶段依赖。

## 3. 推荐目录结构

```text
D:\sandrew\d2-tools
  apps/
    desktop/              Tauri 2 桌面应用装配层
      src-tauri/          Rust 壳、插件、commands、权限、系统能力
      src/                桌面入口、路由、providers、adapter 装配
    mobile/               第二阶段 Capacitor 装配层，第一阶段不落功能代码
    web/                  第三阶段 Web/PWA 装配层，第一阶段不落功能代码

  packages/
    core/                 纯业务逻辑和领域模型
    data/                 local-first 数据访问、缓存、repository、迁移
    platform/             平台能力 contracts 和各端 adapter
    ui/                   跨端 React 组件、设计系统、页面级组合组件
    shared/               无业务依赖的通用类型、工具、错误模型

  docs/
    work/
      backlog/            当前设计和未执行计划
      references/         技术调研和外部资料
```

## 4. 包边界和依赖方向

推荐依赖方向：

```text
apps/* -> ui -> core/shared
apps/* -> data -> core/shared
apps/* -> platform -> shared

data -> platform contracts
platform 不依赖 data/core/ui
core 不依赖 data/platform/ui/apps
ui 不依赖 apps，不直接依赖具体 platform adapter
shared 不依赖任何业务包
```

### `packages/core`

职责：

- Bungie 领域类型和 API client 抽象。
- Manifest 类型、解析和索引规则。
- 账号、仓库、装备、活动、配装、愿望单、AI 上下文等确定性业务逻辑。
- 纯函数、领域服务、输入输出 schema。

约束：

- 不访问 Tauri、Capacitor、DOM、SQLite、IndexedDB、localStorage。
- 不 import `apps/*`、`packages/data`、`packages/platform`、`packages/ui`。
- 不承载用户界面状态。

### `packages/data`

职责：

- local-first repository、cache、schema、migration。
- 设置、会话 metadata、Manifest cache metadata、账号快照、仓库缓存、标签、备注、AI 会话。
- Query key、数据刷新策略和 repository contract tests。

约束：

- 可以依赖 `core` 的领域类型和纯函数。
- 可以依赖 `platform` 的 contracts，但不能依赖具体 Tauri adapter。
- 不直接 import Tauri API。
- 不直接读 DOM、localStorage 或 UI copy。

### `packages/platform`

职责：

- 平台能力 contracts。
- 桌面、移动、Web adapter。
- OAuth redirect、安全存储、文件系统、日志、系统打开、通知、剪贴板、应用信息、更新检查。

约束：

- 不承载 Destiny 业务规则。
- 不依赖 `data/core/ui/apps`。
- 桌面 adapter 内部可以调用 Tauri plugin 或 `invoke`，但外部只能看到 contract。

### `packages/ui`

职责：

- React 设计系统和可复用组件。
- 页面布局、基础控件、状态展示、装备卡片、装备详情、AI 聊天、设置表单等展示组件。

约束：

- 不 import Tauri。
- 不读写 SQLite、文件、localStorage。
- 不知道 `apps/desktop`。
- 通过 props、事件回调和 hooks 表达行为。

### `packages/shared`

职责：

- 无业务倾向的通用类型。
- `Result` / `AppError` / 时间工具 / ID 工具 / 常量。
- 跨包使用的基础工具函数。

约束：

- 不依赖任何业务包。
- 不放具体 Destiny 业务模型。

## 5. Tauri 2 平台底座

Tauri 侧按“薄 Rust 壳 + 明确权限 + TypeScript adapter”设计。

Rust 只负责平台能力：

- 应用窗口、单实例、应用生命周期。
- OAuth 回调：localhost callback 或 deep link。
- 安全存储：token、refresh token、provider key 等敏感信息。
- 本地数据目录：创建、探测、迁移入口。
- 文件读写：只开放受控目录。
- SQLite 连接或本地文件访问的底层执行。
- 日志写入和诊断导出。
- 自动更新检查和安装。
- 系统打开链接、通知、剪贴板等轻平台能力。

Rust 不负责：

- 装备评分。
- Manifest 业务解析。
- 配装推荐。
- AI prompt / context 组织。
- 账号、仓库、愿望单等业务规则。

第一阶段 Tauri command 按平台能力收敛：

```text
auth_start
auth_exchange_callback
secure_get
secure_set
app_get_info
path_get_data_dir
fs_read_app_file
fs_write_app_file
db_execute
db_query
log_write
log_export
updates_check
updates_install
open_external
notify
```

前端调用路径统一为：

```text
apps/desktop React
  -> packages/data 或 packages/platform
  -> desktop adapter
  -> Tauri invoke / plugin
  -> Rust command / plugin
```

禁止出现：

```text
UI component -> invoke("some_command")
```

第一阶段把 Tauri 2 权限清单作为架构产物维护，至少覆盖：

- `shell/open`
- `fs` 受控目录
- `http` 或请求代理能力
- `updater`
- `deep-link` 或 localhost OAuth callback
- `notification`
- `clipboard`
- 必要窗口能力

Tauri 是平台能力边界，不是业务后端。

## 6. 数据层底座

`packages/data` 做 local-first repository 层，第一阶段不做同步引擎。

第一阶段数据范围：

- `settingsRepository`：Bungie API 配置、AI provider 配置、应用偏好、数据目录信息。
- `sessionRepository`：登录状态 metadata，敏感 token 本体走 `platform.secureStore`。
- `manifestRepository`：Manifest 版本、缓存状态、刷新记录、本地文件索引。
- `accountRepository`：账号摘要和最近一次快照。
- `vaultRepository`：仓库基础列表缓存、标签、备注。
- `aiRepository`：会话列表、消息历史、provider 使用记录。
- `diagnosticsRepository`：日志索引、导出记录、健康检查结果。

桌面第一阶段推荐 **SQLite + 文件缓存**：

- SQLite 存结构化数据：设置、索引、标签、备注、AI 会话、快照 metadata。
- 文件缓存存大体积内容：Manifest definition、账号快照原始 JSON、诊断包。
- token、API key、refresh token 不进普通 SQLite，走平台安全存储。
- 如果安全存储能力在目标平台不稳定，再设计加密文件兜底。

接口示例：

```ts
interface SettingsRepository {
  getSettings(): Promise<AppSettings>;
  saveSettings(input: AppSettingsPatch): Promise<AppSettings>;
}

interface ManifestRepository {
  getStatus(): Promise<ManifestStatus>;
  refresh(): Promise<ManifestRefreshResult>;
}

interface AccountRepository {
  getSummary(): Promise<AccountSummary | null>;
  refreshSummary(): Promise<AccountSummary>;
}
```

同步相关只预留最小字段，例如 `updatedAt`、`source`、`schemaVersion`。第一阶段不引入冲突解决、远程账号、PostgreSQL、消息队列或云同步。

## 7. UI 层和应用装配

`packages/ui` 按跨端 React UI 设计，但第一阶段只沉淀底座验证需要的组件。

建议结构：

```text
packages/ui/
  primitives/     Button、Input、Tabs、Dialog、Toast、Tooltip、List 等基础组件
  layouts/        AppShell、Sidebar、Topbar、SplitPane、PageHeader、EmptyState
  features/       AccountSummary、VaultList、ItemDetail、AiChat、SettingsForm 等业务展示组件
```

第一阶段页面：

- 设置页：数据目录、Bungie、AI provider、诊断入口。
- 登录 / 授权状态页。
- 首页 / 概览页：账号摘要、Manifest 状态、基础健康状态。
- 仓库页：基础列表。
- AI 页或全局面板：基础聊天。

`apps/desktop` 负责装配：

```text
apps/desktop
  src/
    main.tsx
    App.tsx
    routes/
    providers/
    platform/
    data/
    styles/
  src-tauri/
```

装配层职责：

- 初始化 Tauri desktop adapter。
- 初始化 data repositories。
- 初始化 TanStack Query / Zustand store。
- 处理路由和页面布局。
- 把 repository hooks 的数据传给 `packages/ui`。
- 处理桌面专属快捷键、窗口行为、更新提示。

视觉策略：

- 第一阶段先建立稳定设计系统，不追求完整游戏内风格复刻。
- 装备详情、仓库卡片、AI 面板先做可扩展结构，后续按功能切片增强。

## 8. OAuth 和安全

桌面端：

- 使用系统浏览器打开 Bungie 授权。
- 回调通过 localhost callback 或 deep link 接回 Tauri。
- token 存储在平台安全存储或加密文件兜底中。
- 不把 client secret、access token、refresh token 暴露给 UI 组件。
- AI provider key 同样走安全存储。

移动端：

- 第二阶段使用 Capacitor deep link。
- token 使用平台安全存储。

Web/PWA：

- 第三阶段前单独评估 Bungie OAuth 是否能安全直接在浏览器完成。
- 如果不能安全处理，则 Web/PWA 只开放离线资料库或需要后端中转。

## 9. AI 能力边界

第一阶段继续本地优先：

- 用户在设置中配置 AI provider、model、API key。
- AI key 存平台安全存储。
- AI 请求由 `platform` 或 data service 代理，UI 组件不直接持有 key。
- AI 上下文由 `packages/core` 生成。
- AI 会话历史存 `packages/data`。

后续如果引入 API 服务，再考虑服务器代理 AI 请求、共享模型配置和多设备同步。

## 10. 架构里程碑

### M1：Workspace 和包边界

内容：

- 创建 `apps/desktop`。
- 创建 `packages/core/data/platform/ui/shared`。
- 配好 pnpm workspace、TypeScript project references 或等价构建链路。
- 加依赖边界测试：`core` 不依赖 `platform/ui/apps`，`ui` 不依赖 Tauri，`data` 不依赖 apps。

验收：

- `install`、`build`、`typecheck`、`test` 能跑通。
- 空壳 Tauri 应用可启动。

### M2：Tauri 平台能力底座

内容：

- Tauri 2 初始化。
- capabilities / permissions 初版。
- platform contracts。
- desktop adapter。
- 基础 commands：app info、data dir、secure store、open external、log export。
- updater、deep link、OAuth 先做最小探针，不做完整业务。

验收：

- React 通过 `packages/platform` 调用 Tauri 能力。
- UI 和页面代码不直接调用 `invoke`。

### M3：Data local-first 底座

内容：

- SQLite + 文件缓存策略。
- repository contracts。
- settings、session、manifest、account、ai 的最小 schema。
- migration / version 机制。
- repository contract tests。

验收：

- 设置、Manifest 状态、AI 会话历史能走统一 data 层读写。
- repository tests 可在不启动 Tauri UI 的情况下运行。

### M4：薄功能闭环

内容：

- 设置读写。
- Bungie 授权状态。
- Manifest 状态 / 刷新。
- 账号摘要。
- 仓库基础列表。
- AI 基础聊天。
- 打包安装和更新检查最小链路。

验收：

- 证明 `apps/desktop -> ui -> data/platform -> core/Tauri/local storage` 链路成立。
- 不以功能完整度作为第一阶段完成标准。

## 11. 测试策略

### 单元测试

- `packages/core`：领域规则、Manifest 解析、装备分析、AI 上下文。
- `packages/data`：repository contract、schema migration、cache 行为。
- `packages/platform`：contract mock、desktop adapter 输入输出。
- `packages/ui`：关键组件渲染和交互。

### 集成测试

- Tauri command contract。
- OAuth callback。
- Manifest 缓存刷新。
- SQLite migration。
- AI provider 配置读写。

### 端到端验证

- 桌面端启动。
- 设置保存。
- 登录授权。
- Manifest 状态刷新。
- 账号摘要读取。
- 仓库基础列表打开。
- AI 助手发起一次聊天。
- 打包安装。
- 检查更新。

## 12. 风险和决策点

### 风险 1：Rust 侧过重

如果把业务逻辑迁到 Rust，会拖慢开发并破坏多端复用。第一阶段必须限制 Rust 只做平台能力。

### 风险 2：平台抽象过早复杂

移动端和 Web 只定义接入约束，不提前做空 adapter 和复杂同步引擎。第一阶段优先验证桌面真实链路。

### 风险 3：数据层抽象污染业务

`data` 只做 repository 和 local-first 存储，不引远程账号、PostgreSQL、队列同步或冲突解决。

### 风险 4：Tauri 权限和发布链路后置

Tauri 2 的插件、permissions、capabilities、updater、deep link 必须在 M2 提前验证，不能等功能完成后才处理。

### 风险 5：UI 包过度设计

`packages/ui` 第一阶段只放底座验证需要的 primitives、layouts 和少量 feature 组件，不追求完整游戏内风格。

## 13. 设计阶段验收

- 架构能解释桌面、移动、Web、云同步四个阶段的关系。
- 第一阶段范围收敛为架构底座 MVP。
- `core/data/platform/ui/shared` 边界清晰。
- 没有把 PostgreSQL、API 服务、远程账号或队列同步作为第一阶段依赖。
- 没有把 Tauri commands 直接散落到 UI 组件里。
- 里程碑能直接转成实施计划。

## 14. 当前结论

采用 **Tauri 2 + React + TypeScript + Vite** 作为新主线第一阶段技术栈。

第一阶段不是功能迁移，而是：

```text
Tauri 2 架构底座
Local-first 数据模型
packages/core/data/platform/ui/shared 清晰边界
少量薄功能闭环验证
后续再恢复桌面功能
再接 Capacitor 移动端
再接 Web/PWA
最后才接 API 服务 + PostgreSQL 同步
```

这条路线短期可见功能少，但能先把长期架构定稳，避免把旧桌面壳、IPC 和 renderer 习惯带进新主线。
