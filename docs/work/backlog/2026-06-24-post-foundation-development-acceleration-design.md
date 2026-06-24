# Tauri 2 底座完成后开发加速方案

> 日期：2026-06-24
> 状态：设计中，待执行
> 前提：Tauri 2 架构底座已完成，当前主线为 `tauri2-rebuild`
> 核心约束：后续 agent 可以改代码和跑验证，但 **不自动提交**；提交必须等待用户明确命令。

## 1. 背景

Tauri 2 架构底座重构采用了逐任务实现、逐任务 review、逐任务修复和最终整分支 review 的安全流程。该流程适合 clean slate 底座搭建，但实际耗时超过两小时。主要原因不是 agent 数量不足，而是：

- 任务切得过细，每个小任务都承担固定调度、报告、review、修复和 re-review 成本。
- 前半段存在强依赖链：`shared -> core -> platform -> data/ui -> desktop`，天然难以并行。
- 计划没有提前覆盖旧 workflow、正式文档口径、platform 根出口、边界测试漏报等最终 review 问题，导致后置返工。
- 当时本机缺 Rust/Cargo，Tauri 相关任务无法完成运行态闭环，只能反复记录验证缺口；当前已补齐并验证 `cargo check`、`dev:desktop` 和 `package:desktop`。

后续恢复功能时，不应继续使用“2-5 分钟小任务 + 每任务重 review + 每任务提交”的模式。新的目标是：在不破坏架构边界的前提下，提高 2-3 个 agent 的实际吞吐。

## 2. 总体策略

采用 **质量和速度平衡** 的批次制开发：

```text
批次开始
  -> 定义本批次切片、文件边界和共享接口变更
  -> 按风险选择同工作区并行或独立 worktree
  -> 并行派 2-3 个 agent
  -> agent 只改代码、跑切片验证、写报告，不提交
  -> controller 整合冲突和共享变更
  -> 跑批次验证
  -> 高风险 diff 做 review
  -> 用户确认后再统一提交
```

后续开发按三类工作区策略执行：

| 类型 | 隔离方式 | 适用场景 |
|---|---|---|
| 普通功能切片 | 同一工作区，严格文件边界 | UI feature、core domain、data repository 的单领域功能 |
| 高风险基础设施 | 独立 worktree | package / lockfile、Rust、Tauri capability、release、security、storage migration |
| 混合批次 | 按文件归属拆分 | 一个批次同时包含普通功能和少量公共接口变更 |

## 3. 提交策略

后续 agent 默认不提交。

agent 完成后只产出：

- 修改文件列表
- 运行命令和结果
- 风险点
- 是否需要 review
- 是否触碰共享接口或高风险文件

只有用户明确说“提交”时，controller 才统一提交。提交粒度建议是：

- 普通功能：一个切片一个提交，或一个批次一个提交。
- 高风险基础设施：独立提交。
- 文档同步：和影响当前待办 / 验收状态的代码改动同批提交。

禁止 agent 在未授权时执行：

```powershell
git commit
git push
git merge
git branch -D
git reset --hard
```

## 4. Review 策略

### 4.1 普通切片

普通切片不再默认走完整 task reviewer。

默认流程：

1. agent 跑切片相关测试和 typecheck。
2. controller 查看 diff。
3. controller 跑定向测试。
4. 批次收尾跑全量验证。

适用例子：

- `packages/ui/src/features/ManifestStatus/`
- `packages/core/src/manifest/`
- `packages/data/src/repositories/manifestRepository.ts`
- `apps/desktop/src/routes/ManifestPage.tsx`

### 4.2 高风险切片

以下改动必须做 task review：

- `package.json` / `pnpm-lock.yaml`
- `apps/desktop/src-tauri/**`
- `.github/workflows/**`
- `packages/platform/src/contracts.ts`
- `packages/platform/src/desktop.ts`
- `test/architecture-boundaries.test.ts`
- release、packaging、security、storage migration
- 会改变跨包 contract 的共享接口

### 4.3 批次收尾

每个批次完成后做一次 batch review，重点检查：

- 是否越过文件边界
- 是否绕开 `platform/data/core/ui` 分层
- 是否引入旧 Electron 结构
- 是否把未实现功能写成已实现
- 是否有未同步到 `docs/todo.md` 的需求、验收或缺口变化

### 4.4 最终集成

进入合并或发布前，仍做整分支 review。

## 5. 验证策略

### 5.1 agent 切片验证

agent 只跑和切片直接相关的验证，避免每个 agent 都跑全仓：

```powershell
npx pnpm@9.15.0 --filter <package> typecheck
npx pnpm@9.15.0 --filter <package> test
git diff --check -- <changed-paths>
```

如果只改文档：

```powershell
npx pnpm@9.15.0 docs:check
git diff --check
```

### 5.2 controller 批次验证

批次收尾由 controller 统一运行：

```powershell
npx pnpm@9.15.0 docs:check
npx pnpm@9.15.0 typecheck
npx pnpm@9.15.0 test
git diff --check
```

### 5.3 Tauri / Rust 验证

Rust/Cargo 环境由其他 agent 处理。本方案只记录要求，不展开实现。

一旦环境补齐，涉及 `apps/desktop/src-tauri/**` 的批次必须补跑：

```powershell
cargo --version
npx pnpm@9.15.0 --filter @d2-tools/desktop dev:desktop
npx pnpm@9.15.0 --filter @d2-tools/desktop package:desktop
```

不能在未跑通 Rust/Cargo 前声称 Tauri 窗口、Rust 编译或打包已通过。

## 6. 文件边界

### 6.1 普通功能切片边界

普通功能切片优先使用以下目录结构：

```text
packages/core/src/<domain>/
packages/data/src/repositories/<domain>Repository.ts
packages/ui/src/features/<FeatureName>/
apps/desktop/src/routes/<FeatureName>Page.tsx
apps/desktop/src/features/<FeatureName>/        # 仅桌面专属装配需要时使用
```

每个 agent 只能修改分配给自己的切片目录。需要改共享接口时，必须在报告中声明：

- 需要改哪个 contract
- 为什么不能放在切片私有类型里
- 会影响哪些其他切片

### 6.2 高风险文件

以下文件默认不参与同工作区并行，除非本批次明确指定：

```text
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
tsconfig.base.json
vitest.config.ts
test/architecture-boundaries.test.ts
.github/workflows/**
apps/desktop/src-tauri/**
packages/platform/src/contracts.ts
packages/platform/src/desktop.ts
packages/platform/src/index.ts
docs/todo.md
docs/development.md
```

### 6.3 当前架构边界

保持现有依赖方向：

```text
apps/* -> ui -> core/shared
apps/* -> data -> core/shared
apps/* -> platform contracts/adapter
data -> core/shared + platform contracts
platform -> shared
core -> shared
shared -> no business deps
```

禁止：

- `ui` import Tauri、`apps/*` 或 `@d2-tools/platform`
- `data` import `apps/*`、Tauri API 或具体 desktop adapter
- `core` import `data/platform/ui/apps`
- `shared` import 任何业务包

## 7. Phase 1：外部前置

Rust/Cargo 环境已补齐。本方案不展开安装步骤，后续 Tauri 相关切片可以直接跑 `tauri:env`、`cargo check`、`dev:desktop` 和 `package:desktop` 验证。

外部前置完成后，应回填到 `docs/todo.md`：

- Rust/Cargo 是否可用
- `dev:desktop` 是否能打开真实 Tauri 窗口
- `package:desktop` 是否能产出安装包
- release workflow 是否能在 CI 里跑通

## 8. Phase 2：薄切片并行验证

Phase 2 目标不是追平旧功能，而是用多个小功能证明新架构开发节奏。

推荐批次：

| 切片 | 主要文件范围 | 隔离方式 | Review |
|---|---|---|---|
| Settings 完整页 | `packages/ui/src/features/Settings/`、`packages/data/src/repositories/settingsRepository.ts`、`apps/desktop/src/routes/SettingsPage.tsx` | 同工作区 | 轻量 |
| Manifest 状态 / 刷新 | `packages/core/src/manifest/`、`packages/data/src/repositories/manifestRepository.ts`、`packages/ui/src/features/Manifest/` | 同工作区 | 轻量 |
| OAuth 探针 | `packages/platform/src/contracts.ts`、`apps/desktop/src-tauri/**`、`packages/core/src/auth/` | 独立 worktree | 重 review |
| 账号摘要 mock -> real adapter | `packages/core/src/account/`、`packages/data/src/repositories/accountRepository.ts`、`packages/ui/src/features/AccountSummary/` | 同工作区，若改 Rust 则 worktree | 轻量 / 重 review |
| 仓库基础列表 | `packages/core/src/vault/`、`packages/data/src/repositories/vaultRepository.ts`、`packages/ui/src/features/VaultList/` | 同工作区 | 轻量 |
| AI 基础聊天 | `packages/core/src/ai/`、`packages/data/src/repositories/aiRepository.ts`、`packages/ui/src/features/AiChat/` | 同工作区，若改 secure store 则 worktree | 轻量 / 重 review |

并行建议：

```text
Batch A:
  Agent 1: Settings 完整页
  Agent 2: Manifest 状态 / 刷新

Batch B:
  Agent 1: OAuth 探针（worktree）
  Agent 2: AI 基础聊天（不碰 secure store 时同工作区）

Batch C:
  Agent 1: 账号摘要
  Agent 2: 仓库基础列表
```

## 9. Phase 3：功能恢复

Phase 3 才进入旧 Electron 业务能力恢复。

旧代码参考规则：

```text
✅ 可以参考 / 移植：
   - 类型定义、数据结构
   - Manifest 解析、商人售卖解析等纯业务逻辑
   - 确定性计算规则

❌ 不能移植：
   - Electron IPC 模式
   - main / renderer / preload 分层结构
   - Electron API
   - 旧 UI 文件组织方式
```

如果移植旧业务逻辑，必须在报告中说明来源路径。是否写入代码注释按具体可读性判断，不强制每段都加注释。

推荐批次：

| 批次 | 功能 | 并行策略 |
---|---|---|
| 功能恢复 A | 装备详情、首页工作台 | 同工作区，目录隔离 |
| 功能恢复 B | 账号页、仓库页 | 同工作区，若共享 item detail 则先抽公共组件 |
| 功能恢复 C | 配装页、愿望单、AI 抄作业 | 按依赖拆批 |
| 功能恢复 D | 全局 AI 助手、活动复盘、自动更新 | 高风险项用 worktree |

## 10. Agent 报告模板

后续 agent 不提交，只写报告：

```markdown
# <切片名> 报告

## 状态

DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED

## 修改文件

- ...

## 验证

- 命令：
- 结果：

## 边界检查

- 是否修改共享 contract：
- 是否触碰高风险文件：
- 是否需要 review：

## 风险

- ...
```

## 11. AGENTS.md 后续建议

后续如果要把本方案固化到仓库规则，建议在用户确认后再更新 `AGENTS.md`。不要由 agent 自动改写。

建议新增规则：

```markdown
## Tauri 主线并行开发规则

- 后续 agent 默认不提交；提交必须等待用户明确命令。
- 普通功能切片可在同一工作区并行，但必须遵守分配的文件边界。
- 高风险切片使用独立 worktree，包括 package/lockfile、Rust、Tauri capability、release、security、storage migration。
- 切片 agent 只跑相关 package 的 typecheck/test；批次收尾由 controller 跑 docs:check、typecheck、test 和 git diff --check。
- 改共享 contract、Rust command、Tauri capability、release workflow、安全存储或架构边界测试时必须做 review。
```

## 12. 当前结论

后续开发不再使用“每个小任务都提交 + 每个小任务都重 review”的流程。

推荐执行方式：

```text
按批次规划
普通切片同工作区并行
高风险切片独立 worktree
agent 不自动提交
controller 批次验证
用户确认后提交
批次收尾 review
```

这能保留 Tauri 2 底座已经建立的边界，同时把主要时间花在功能切片本身，而不是流程固定成本上。
