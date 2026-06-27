# 多端支持架构重构

> 2026-06-27 · 当前目标不是立刻上线 Web 或移动端，而是继续使用 Electron 交付桌面端的同时，把业务规则、服务访问和前端查询层收口成可复用边界，为 Win / Mac / Web / 后续 App 预留同一套架构基础。

## 1. 背景

d2-tools 当前主交付端仍然是 Windows Electron 桌面端，后续会扩展到 Win 桌面、Mac 桌面、Web 和移动端 App。

renderer 层已经具备一定隔离度：React 组件主要通过 `window.d2` preload bridge 调用能力，没有直接在组件中 import Electron。但历史代码仍有几个问题：

- `packages/core` 里仍有部分 Node.js 文件存储依赖。
- 页面级数据编排仍有不少散落在 `desktop/renderer`。
- 跨端 service contract 需要继续稳定。
- 如果继续把新功能堆进 Electron renderer，后续多端适配会被桌面实现固化。

本需求采用持续迁移，而不是一次性全仓重写。每个切片都要可验收、可回归，并保持桌面端功能不回退。

## 2. 目标与非目标

### 目标

- 让真实业务链逐步跑通 `UI -> app -> services -> adapter`。
- 新增业务编排优先进入 `packages/app`，新增平台能力优先进入 `packages/services`。
- 桌面端继续交付，renderer 保留 UI、交互事件和桌面专属执行能力。
- 用边界测试阻止 `app` / `services` 反向依赖 desktop、Electron、React UI 或 Node runtime。
- 后续 Web / Mac / mobile 通过替换 services adapter 复用 app workspace。

### 非目标

- 不在当前阶段上线 Web UI 或移动端 UI。
- 不一次性迁移所有页面。
- 不把桌面专属写操作执行逻辑强行塞进 `packages/app`。
- 不为了抽象而改动 Electron 主进程、preload 或 IPC 结构。

## 3. 总体分层

```text
UI 页面
  -> packages/app 查询 / 状态层 / workspace
  -> packages/services 服务契约 / adapter
  -> 平台实现（desktop bridge / 后续 web / mobile adapter）
  -> Bungie / Manifest / 本地存储 / AI / 后续远端 API
```

包职责：

- `packages/core`：领域模型、schema、确定性分析、评分、愿望单、目标规则、Bungie / Manifest 到领域模型的转换逻辑。
- `packages/services`：Profile、Manifest、LocalData、AI 等服务接口和平台 adapter。
- `packages/app`：跨端前端查询层、状态模型、页面 workspace 和 view model 编排。
- `packages/desktop`：Electron 主进程、preload、IPC、桌面导航、窗口级交互、安装更新和桌面 UI。
- `packages/http`：本地 HTTP / 工具接口层，复用 core / services。

## 4. 强约束

### renderer 边界

`desktop/renderer` 不再直接承担跨 service 业务编排。

允许：

- 组件事件处理
- 展示状态
- 调用 app workspace / app action
- 桌面专属确认弹窗、IPC 写操作执行、窗口级交互

不允许：

- 直接拼装多个数据源形成完整业务流
- 在 renderer 中维护复杂查询编排逻辑
- 让 feature 之间直接 import

### app 边界

`packages/app` 不能 import：

- `electron`
- `node:*`
- `desktop/*`
- `window.d2`
- React 组件或桌面 UI

### services 边界

`packages/services` 负责服务契约和 adapter，不依赖 React，不暴露 UI 状态或组件语义。

### 新增代码归属

- 规则 / 转换 / schema -> `core`
- Bungie / Manifest / LocalData / AI 访问 -> `services`
- 页面工作区编排 / view model / 写操作前计划 -> `app`
- 窗口、IPC、更新、桌面行为 -> `desktop`

## 5. 阶段口径

### 第一阶段：骨架和真实链路

目标：让 AI 助手、账号、仓库三条真实业务链跑通新边界。

验收口径：

- `packages/app` 和 `packages/services` 可独立构建。
- `app` 不依赖 desktop / Electron / Node runtime。
- `services` 契约层不依赖 React。
- AI 助手完整链已迁到 `UI -> app -> services -> adapter`。
- 账号读取链已迁到 `UI -> app -> services -> adapter`。
- 仓库至少有一条主链迁到新边界。
- 边界测试能拦截回退。
- 桌面端现有功能不被打断。

当前状态：第一阶段验收已满足。

### 第二阶段：扩大 app 覆盖面

目标：继续减少 `desktop/renderer` 的业务编排。

推进口径：

- 账号页更多页面级 view model 下沉到 `packages/app`。
- 仓库批量选择、整理模式候选、写操作前数据准备下沉到 `packages/app`。
- 配装页的模板命中、缺失件计划、最高光等计划和文案下沉到 `packages/app`。
- desktop 保留 UI 状态、组件展示、按钮事件、确认弹窗和桌面专属写操作执行。
- 每个切片必须有 app 行为测试，避免只靠文本 wiring 断言。

当前状态：第二阶段验收已满足。账号页页面级 view model、仓库列表 / 选择 / 清理 / 重复组 / 批量写操作前文案、配装模板命中 / 来源定位 / 对比 view model / 缺失件计划 / 最高光等计划 / 写操作前文案已迁到 `packages/app`；desktop 保留 UI 状态、confirm、clipboard 和 IPC/API 执行。

### 第三阶段：adapter 形态验证

目标：证明 app workspace 可以脱离 desktop bridge 运行。

推进口径：

- 使用测试型内存 services adapter 验证账号、仓库和 AI app workspace。
- services 契约层继续禁止 React、Electron、desktop UI 和平台运行时依赖。
- 后续 Web / Mac / mobile 只替换 services adapter，不改 app workspace。

当前状态：第三阶段轻量验收已满足。`createMemoryServices()` 覆盖 Profile、LocalData、Manifest 和 AI 四类服务形态，支持本地数据写入状态变化、Manifest definition seed、动态 AI reply，并已验证账号、仓库和 AI app workspace 可脱离 `window.d2` / desktop bridge 运行。

## 6. 当前进度

### 已完成

- `packages/services`、`packages/app` 已建立并可独立构建。
- `createDesktopBridgeServices(api)` 已把现有 `window.d2` 能力包装成桌面 services adapter。
- AI 助手发送消息链已迁到 `UI -> app -> services -> adapter`。
- 账号读取主链已迁到 `loadAccountWorkspace(services)`。
- 账号衍生链已开始下沉：`loadAccountDerivedWorkspace(services, summary)` 已承接活动摘要与社区命中装配。
- vault 的 localData 读写链已开始收口到 `services.localData.*`，包括愿望单、本地社区推荐表、目标规则、装备备注 / 标签 / 批量标签。
- `loadVaultLocalData()` 已作为仓库本地数据读取入口。
- `createVaultListWorkspace()` 已承接仓库列表、筛选、分组、标签命中、愿望单命中、本地目标命中摘要和 assistant facts 主链。
- `HomePage.tsx` 已收敛为桌面端页面 composition root，dashboard、派生状态、菜单路由、装备详情弹窗和写操作组合已拆出。
- `useDiagnosticsSettings` 已拆分为诊断状态、AI / 写操作设置状态、操作日志状态等子 hook，外部保留兼容 facade。
- `packages/services/src/memoryAdapter.ts` 已提供测试型内存 adapter，可驱动账号、仓库和 AI app workspace，不依赖 `window.d2`；adapter 覆盖 Profile、LocalData、Manifest 和 AI 四类服务形态。
- 边界测试和 wiring 测试已覆盖 `packages/app`、`packages/services`、desktop renderer 的核心接线。

### 已落地切片

- `packages/app/src/workspaces/vaultSelection.ts` 承接仓库批量选择、整理候选、清理候选、选择摘要和标签输入构造；desktop feature 文件保留兼容 barrel。
- `packages/app/src/workspaces/accountPage.ts` 承接账号页角色 tab、选中角色、账号摘要文案、角色装备组合、装备 key、装备 meta 格式化、已装备 / 背包 slot 分组、当前角色配装命中计数、材料行、邮政官预览和游戏内配装栏行。
- `packages/app/src/workspaces/loadoutTemplateLookup.ts` 承接配装模板 lookup 和装备命中判断；desktop shared 保留兼容 barrel。
- `packages/app/src/workspaces/loadoutTransfer.ts` 承接配装缺失件转移计划和 blocked reason 文案；desktop utils 保留兼容 barrel。
- `packages/app/src/workspaces/highestPower.ts` 承接最高光等装备计划、执行计划、确认文案和执行反馈文案；desktop utils 保留兼容 barrel。
- `packages/app/src/workspaces/vaultActions.ts` 承接仓库清理清单、重复组计划、批量标签 / 批量移动 / 清理写操作前文案和候选选择 helper；desktop shared / feature 文件保留兼容 barrel。
- `packages/app/src/workspaces/loadoutActions.ts` 承接配装保存、游戏内配装栏、模板转移计划、缺失件补齐、单件补齐 / 装备的确认、进度和结果文案；desktop utils 保留兼容 barrel。
- `packages/app/src/workspaces/loadoutSources.ts` 承接配装模板来源定位；desktop shared 保留兼容 barrel。
- `packages/app/src/workspaces/loadoutViewModel.ts` 承接配装对比行、缺失件清单文案和模板就位判断；desktop feature 文件保留兼容 barrel。

## 7. 后续持续项

- 新增 app workspace 时同步补测试型内存 services adapter 用例，防止新业务重新绑定 desktop bridge。
- desktop：新增 UI 行为时继续优先调用 app workspace / action，避免把新的业务编排写回 renderer。
- 资料库 / 每日 / 设置：按页面新增 services contract，不反向污染 app。
- core：后续逐步清理历史 Node 文件存储依赖，但不阻塞当前桌面端交付。

## 8. 验证要求

涉及此需求的代码切片完成前至少运行：

```powershell
npx pnpm@9.15.0 docs:check
npx pnpm@9.15.0 typecheck
npx pnpm@9.15.0 test
git diff --check
```

如果只是文档整理，至少运行：

```powershell
npx pnpm@9.15.0 docs:check
git diff --check
```

## 9. 最终一句话定义

> 多端支持架构重构不是“把项目全部抽象”，而是让真实业务链持续迁入 `core -> services -> app -> 端 UI` 边界，并用测试防止回退。
