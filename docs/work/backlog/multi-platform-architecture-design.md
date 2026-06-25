# 多端支持架构重构（第一阶段执行版）

> 2026-06-25 · 当前目标不是立刻上线 Web 或移动端，而是继续使用 Electron 交付桌面端的同时，把核心业务、服务编排和前端查询层收口成可复用边界，为 Win / Mac / Web / 后续 App 预留同一套架构基础。

## 1. 背景

d2-tools 当前主交付端仍然是 Windows Electron 桌面端，后续会扩展到：

- Win 桌面
- Mac 桌面
- Web
- 移动端 App（后续再接）

当前 renderer 层已经具备较好的隔离度：React 组件主要通过 `window.d2` preload bridge 调用能力，没有直接在组件中 import Electron。

但当前问题也很明确：

- `packages/core` 仍然混有大量 Node.js 文件存储依赖
- 页面级数据编排仍然有不少散落在 `desktop/renderer` 中
- 跨端 service contract 还没有稳定抽出来
- 如果现在继续堆功能，很容易把 Electron 当前的边界继续固化

因此第一阶段不追求一次性全仓迁移，而是要先让真实业务链路跑通新的分层结构，并用边界测试把方向钉死。

---

## 2. 第一阶段目标

第一阶段只做一件事：

> 让 AI 助手、账号、仓库三条真实业务链，逐步跑通 `UI -> app -> services -> adapter`，并让后续新增代码优先进入新边界。

### 第一阶段完成，不等于：
- 全仓都迁完
- 所有 Node 文件存储都抽象完
- Web / 移动端已经可运行
- 所有页面都完全按新层重写

### 第一阶段完成，等于：
- 已经有 2~3 条真实业务链跑在新边界上
- 新增功能不再继续塞回 desktop renderer
- 边界测试能拦截回退
- 后续扩到 web / app 时，不需要重新设计层级

---

## 3. 总体分层

第一阶段采用如下分层：

```text
UI 页面
  -> packages/app 查询 / 状态层 / workspace
  -> packages/services 服务契约 / adapter
  -> 平台实现（desktop bridge / 后续 web / mobile adapter）
  -> Bungie / Manifest / 本地存储 / AI / 后续远端 API
```

---

## 4. 包边界

```text
packages/
  core/        领域模型、业务规则、分析逻辑、schema、纯函数
  services/    Profile / Manifest / LocalData / AI 服务接口和平台 adapter
  app/         跨端前端查询层、状态模型、页面 workspace 编排
  desktop/     Electron 壳、IPC、preload、桌面端 UI 和系统能力
  http/        本地 HTTP / 工具接口层
```

### 4.1 `packages/core`

保留这些职责：
- 装备、仓库、账号、活动、配装等领域模型
- 愿望单、目标规则、重复装备分析、评分、过滤等纯规则
- Bungie / Manifest 返回值到领域模型的转换逻辑
- 可被所有端复用的 schema、类型、纯工具函数

第一阶段不要求一次性搬空历史 Node 依赖，但：
- 新增代码不要继续把平台存储、Electron、UI 状态塞进 core
- 能放 `services` 或 `desktop` 的新逻辑，不再往 core 堆

### 4.2 `packages/services`

承接跨端服务接口和平台 adapter：
- `ProfileService`：账号、角色、装备、仓库、货币、活动数据
- `ManifestService`：Manifest 定义读取和领域查询
- `LocalDataService`：标签、目标规则、愿望单、AI 历史、本地设置
- `AiService`：模型配置、会话、上下文组装、请求发送

桌面端第一阶段使用 `createDesktopBridgeServices(api)` 包住现有 `window.d2` 能力。
后续 Web / 移动端替换 adapter 即可，不需要改 app 层。

### 4.3 `packages/app`

承接跨端前端查询和 workspace 编排：
- `loadAccountWorkspace`
- `loadVaultWorkspace`
- `sendAssistantMessage`
- `QueryState`
- `ServiceError`
- 页面级 view model 和 workspace 状态

要求：
- UI 不直接关心数据来自 IPC、本地文件还是远端 API
- UI 只消费 app 层返回的状态和领域数据

### 4.4 `packages/desktop`

保留桌面端职责：
- Electron 主进程、preload、IPC、更新、安装器
- 桌面导航、布局、窗口级交互
- 桌面专属 UI 细节
- 当前 `window.d2` bridge

后续 renderer 页面逐步改为：

```text
UI -> packages/app -> packages/services
```

不要继续把页面数据编排散在 `HomePage.tsx`、`VaultPanel.tsx`、`AiAnalysisPanel.tsx` 等大组件中。

---

## 5. 强约束（必须执行）

### 规则 1
`desktop/renderer` 不再直接承担业务编排。

允许：
- 组件事件处理
- 展示状态
- 调用 app workspace / app action

不允许：
- 直接把多个数据源拼装成完整业务流
- 继续在 renderer 中承担跨 service 的查询编排

### 规则 2
`packages/app` 不能 import：
- `electron`
- `node:*`
- `desktop/*`
- `window.d2`

### 规则 3
`packages/services` 的契约层不能依赖 React。

它只暴露 service contract 和 adapter，不暴露 UI 状态或组件语义。

### 规则 4
新增业务功能默认先判断该放哪层：
- 规则 / 转换 / schema → `core`
- 访问 Bungie / Manifest / LocalData / AI → `services`
- 页面工作区编排 → `app`
- 窗口、IPC、更新、桌面行为 → `desktop`

---

## 6. 第一阶段业务链路

### 6.1 链路一：AI 助手

目标：把 AI 助手做成第一条完整的新架构链：

```text
desktop UI
  -> packages/app
  -> packages/services
  -> desktop bridge adapter
  -> window.d2 / IPC
  -> core / 本地数据 / AI
```

第一阶段至少收进去：
- 发送消息
- 上下文组装
- 历史列表读写
- 会话恢复 / 删除 / 清空
- 快捷提问
- 错误状态映射

不要求这阶段做：
- 复杂 agent 工作流
- 任务助手全链抽象到底
- 多模态

### 6.2 链路二：账号工作区

目标：把账号页的数据初始化和角色上下文统一收进 app 层。

第一阶段至少收进去：
- 读取账号摘要
- 读取仓库标签
- 读取本地目标规则
- 当前角色切换
- 当前角色摘要组装
- 账号页主区 view model

不要求这阶段做：
- 所有账号页 UI 一次性重构
- 每个子块都拆到极细 service

### 6.3 链路三：仓库工作区（最小版）

目标：不是一次抽完整个仓库，而是先抽最关键的数据流。

第一阶段优先收进去：
- 仓库基础查询状态
- 筛选条件 model
- 标签 + 目标命中 + 愿望单命中 的装配
- 列表结果 view model
- 批量选择状态
- 批量操作前的数据准备

暂时不要碰太深的：
- 全部写操作细节
- 所有整理模式分支
- 每一个局部工具栏交互都拆成独立 service

---

## 7. 目录级落地清单

### 7.1 `packages/services`

推荐目录：

```text
packages/services/
  src/
    profile/
      types.ts
      service.ts
      desktopAdapter.ts
    manifest/
      types.ts
      service.ts
      desktopAdapter.ts
    local-data/
      types.ts
      service.ts
      desktopAdapter.ts
    ai/
      types.ts
      service.ts
      desktopAdapter.ts
    index.ts
```

说明：
- `types.ts`：service contract
- `service.ts`：工厂或接口导出
- `desktopAdapter.ts`：把 `window.d2` 包装成该服务的桌面实现

以后新增 web / mobile 时，只要补：
- `webAdapter.ts`
- `mobileAdapter.ts`

### 7.2 `packages/app`

推荐目录：

```text
packages/app/
  src/
    query/
      state.ts
      errors.ts
    account/
      workspace.ts
      types.ts
    vault/
      workspace.ts
      filters.ts
      types.ts
    assistant/
      sendMessage.ts
      history.ts
      context.ts
      types.ts
    index.ts
```

说明：
- `workspace.ts`：页面级编排入口
- `types.ts`：UI 可直接消费的数据结构
- `query/state.ts`：统一 loading / success / error 模型
- `errors.ts`：统一 service error 到 UI error 的映射

### 7.3 `packages/desktop`

第一阶段目标不是删掉现有结构，而是逐步替换 renderer 的调用路径：

```text
UI component
  -> app workspace / action
  -> service adapter
```

保留 desktop 原有职责：
- main / preload / IPC
- shell layout / update / installer
- 桌面专属 UI 与窗口行为

---

## 8. 边界测试清单

第一阶段必须补 / 维持的测试：

### 8.1 `app` 不能依赖 desktop
检查：
- 不允许 import `packages/desktop/*`
- 不允许 import `electron`
- 不允许 import `node:*`

### 8.2 `services` 不能依赖 React
检查：
- 不允许 import `react`
- 不允许 import renderer UI
- 不允许 import desktop component

### 8.3 renderer 不继续直接承担业务编排
不是完全禁止 `window.d2`，但要阻止：
- renderer 直接拼装跨 service 业务流
- renderer 自己维护复杂查询编排逻辑

### 8.4 core 不继续新增平台污染
阻止新增 Electron / UI / 平台运行时依赖进入 core。

---

## 9. 第一阶段各层应交付的内容

### `packages/core`
- 保持现有纯规则能力
- 不新增平台污染
- 补必要的 schema / mapper / domain helper

### `packages/services`
- `ProfileService`
- `ManifestService`
- `LocalDataService`
- `AiService`
- 对应 desktop adapter
- 统一导出入口

### `packages/app`
- `loadAccountWorkspace`
- `loadVaultWorkspace`
- `sendAssistantMessage`
- `QueryState`
- `ServiceError`

### `packages/desktop`
- 用 service adapter 接现有 `window.d2`
- UI 侧逐步切到 app 层入口
- 现有功能不回退

---

## 10. 当前进度（2026-06-25）

### 已完成

- `packages/services`、`packages/app` 已建立并可独立构建。
- AI 助手链已迁到 `UI -> app -> services -> adapter`。
- 账号读取主链已迁到 `loadAccountWorkspace(services)`。
- 账号衍生链已开始下沉：`loadAccountDerivedWorkspace(services, summary)` 已承接活动摘要与社区命中装配。
- vault 的 localData 读写链已开始成体系收口到 `services.localData.*`，包括愿望单、本地社区推荐表、目标规则、装备备注 / 标签 / 批量标签。
- `packages/app` 已新增 `loadVaultLocalData()` 作为仓库本地数据读取入口。
- `useDiagnosticsSettings` 已开始拆分：更新逻辑抽到 `useUpdateFlow.ts`，diagnostics / action log / 写开关等抽到 `diagnosticsModel.ts`。
- 边界测试和相关 wiring 测试已建立，当前全量 `docs:check + build + vitest` 通过（110 文件 / 386 测试）。

### 未完成

- `vault workspace` 还未完全收口到 `packages/app`：当前 localData 已下沉，但仓库主结果编排、筛选结果装配、摘要 view model 仍未全部迁出 renderer。
- `account` 衍生链仍未完全收尾：虽然活动摘要 / 社区命中已开始下沉，但页面级 view model 还未完全进入 app 层。
- `HomePage.tsx` 仍然过重，尚未真正收成轻量 composition root。
- `useDiagnosticsSettings` 虽已拆分出子模块，但聚合 hook 仍偏重，尚未完全清理职责边界。

---

## 11. 第一阶段验收标准

做到以下几点，就算第一阶段完成：

### 必须满足
1. `packages/app` 能独立构建
2. `packages/services` 能独立构建
3. `app` 不依赖 `desktop` / Electron / Node runtime
4. `services` 契约层不依赖 React
5. AI 助手完整链已迁到：`UI -> app -> services -> adapter`
6. 账号读取链已迁到：`UI -> app -> services -> adapter`
7. 仓库至少有一条主链（列表 / 筛选 / 标签命中装配）迁到新边界
8. 边界测试能拦截回退
9. 桌面端现有功能不被打断

### 不要求满足
- 全仓都迁完
- 所有 Node 文件存储都抽象完
- Web / 移动端已经可运行
- 每个页面都完全按新层重写

---

## 11. 建议的 agent 拆分

### Agent 1：services contract + desktop adapters
输出：
- 4 个 service contract
- desktop adapter 实现
- index.ts 导出

### Agent 2：app query state + assistant chain
输出：
- QueryState / ServiceError
- sendAssistantMessage
- assistant history / context 编排

### Agent 3：account workspace chain
输出：
- loadAccountWorkspace
- 角色 / 摘要 / 标签 / 本地目标规则初始化

### Agent 4：vault workspace minimum chain
输出：
- 仓库基础 workspace
- 筛选状态 model
- 标签 / 命中状态装配

### Agent 5：boundary tests + docs
输出：
- app / services 边界测试
- development / todo / backlog 文档更新

---

## 12. 最终一句话定义

> 第一阶段不是“把项目全部抽象”，而是先让 AI 助手、账号、仓库三条真实业务链跑通 `UI -> app -> services -> adapter`，并用测试把边界钉死。
