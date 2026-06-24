# Windows Release 与自动更新闭环设计

> 日期：2026-06-24
> 状态：主体实现中，待 Rust/Tauri 和真实 Release 验收
> 适用分支：`tauri2-rebuild`
> 范围：Windows-only GitHub Release + Tauri 2 Updater + 开发态 HMR 验证

## 1. 背景

当前 Tauri 2 架构底座已经落地，仓库已有 `.github/workflows/release.yml` 的 tag 发布骨架，也已有 `packages/platform` 中的 `updates.check/install` TypeScript adapter。

已完成的主体实现：

- `apps/desktop/src-tauri` 已接入 Tauri updater / opener plugin。
- Rust 侧已实现并注册 `open_external`、`updates_check`、`updates_install` commands。
- Release workflow 已改为通过 `tauri-apps/tauri-action` 构建 Windows NSIS 安装器并上传 updater JSON。
- root `package.json`、desktop package、Tauri config 和 Cargo 版本已统一到 `0.0.6`。
- 底座首页已有手动检查更新和安装更新入口。

仍未完成的关键验收：

- 本机已验证 Tauri 环境探针、`cargo check`、`dev:desktop` 真实窗口启动和 `package:desktop` 生成 NSIS 安装器。
- 尚未用真实 GitHub Release 验证 installer、`latest.json` 和旧版到新版自动更新。

用户已确认：发布 Release 和自动更新优先级最高。第一阶段选择 Windows-only GitHub Release + Tauri Updater，不做 macOS/Linux、多渠道、商业代码签名证书、灰度发布或回滚平台。

## 2. 目标

本批次目标是跑通最小可用发布闭环：

```text
开发者打 tag
  -> GitHub Actions 构建 Windows NSIS 安装包
  -> 生成 Tauri updater 需要的签名更新元数据
  -> 上传到 GitHub Release
  -> 已安装旧版应用检查到新版
  -> 下载更新
  -> 安装并重启进入新版
```

同时保留开发态热更新体验：

```text
pnpm dev
pnpm --filter @d2-tools/desktop dev:desktop
  -> Tauri 窗口加载 Vite dev server
  -> React / TypeScript / CSS 改动通过 Vite HMR 刷新
```

Rust command、Tauri config、capability 和 Cargo 依赖改动需要重启 `dev:desktop`，不承诺 Rust 侧热替换。

## 3. 非目标

本批次不做：

- macOS / Linux 打包和更新。
- Windows 商业代码签名证书。
- stable / beta / rc 多渠道发布。
- 灰度发布、回滚平台和远程发布服务。
- 本地模拟 updater server。
- 生产环境无重启替换前端资源。
- PostgreSQL、队列同步、远程账号或云同步。
- 复杂自动更新 UI。

## 4. 架构设计

### 4.1 Tauri updater 接入

在 `apps/desktop/src-tauri` 接入 Tauri 2 updater plugin：

- `Cargo.toml` 增加 updater 相关依赖。
- `lib.rs` 注册 updater plugin。
- `tauri.conf.json` 增加 updater endpoint 和 public key。
- 实现 `updates_check` command，返回是否有更新、版本号和说明。
- 实现 `updates_install` command，执行下载、安装和重启。

Tauri 2 updater 要求更新包签名。仓库只保存 public key，release 私钥只放 GitHub Secrets。

### 4.2 Platform contract 对齐

当前 `packages/platform` 已有：

```ts
updates: {
  check(): Promise<{ available: boolean; version: string | null }>;
  install(): Promise<void>;
}
```

本批次优先保持最小 contract，不扩展复杂 UI 状态。若 Rust updater 能稳定返回更多信息，可以小幅扩展为：

```ts
type UpdateCheckResult = {
  available: boolean;
  version: string | null;
  notes?: string;
};
```

扩展时必须同步 mock adapter、desktop adapter 和测试。

### 4.3 Release workflow

改造现有 `.github/workflows/release.yml`，仍由 tag 触发：

```text
vX.Y.Z
```

workflow 需要完成：

- 校验 tag 与项目版本一致。
- 校验 root `package.json`、desktop package、Cargo、Tauri config 的版本一致。
- 运行 `docs:check`、`typecheck`、`test`。
- 构建 Windows NSIS 安装包。
- 使用 `TAURI_SIGNING_PRIVATE_KEY` 和 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 签名更新产物。
- 创建或更新 GitHub Release。
- 上传安装包和 updater 元数据。

失败时必须让 workflow 失败，不能静默产出缺少 updater 元数据的 Release。

### 4.4 开发态 HMR

保持当前开发入口：

```powershell
npx pnpm@9.15.0 dev
npx pnpm@9.15.0 --filter @d2-tools/desktop dev:desktop
```

验收口径：

- `dev:desktop` 加载 `http://127.0.0.1:5173`。
- 修改 React / TypeScript / CSS 后，Tauri 窗口内页面自动刷新或局部热替换。
- 改 Rust command、Tauri config 或 Cargo 依赖后，重启 `dev:desktop`。

## 5. 文件边界

预计修改范围：

```text
.github/workflows/release.yml
apps/desktop/package.json
apps/desktop/src-tauri/**
packages/platform/src/contracts.ts
packages/platform/src/desktop.ts
packages/platform/src/desktop.test.ts
packages/platform/src/mock.ts
package.json
docs/development.md
docs/todo.md
docs/work/backlog/2026-06-24-windows-release-auto-update-design.md
```

高风险文件：

```text
.github/workflows/release.yml
apps/desktop/src-tauri/**
package.json
pnpm-lock.yaml
packages/platform/src/contracts.ts
```

这些改动必须做批次 review。agent 不自动提交，提交必须等待用户明确命令。

## 6. 实施批次

### Batch 1：Updater 最小链路

内容：

- 接入 Tauri updater plugin。
- 实现并注册 `updates_check` 和 `updates_install`。
- 配置 updater endpoint 和 public key。
- 对齐 platform adapter、mock adapter 和测试。

验收：

- TypeScript adapter 测试通过。
- Rust 代码能在有 Rust/Cargo 环境时编译。
- 无更新、发现更新和错误路径有清晰返回。

### Batch 2：Release workflow

内容：

- 改造 `.github/workflows/release.yml`。
- 增加版本一致性校验。
- 增加 signing secrets 要求。
- 上传 installer 和 updater metadata。

验收：

- tag `vX.Y.Z` 能触发 workflow。
- 缺少 signing secret 时 workflow 明确失败。
- Release 产物包含 Windows 安装器和 updater 所需元数据。

### Batch 3：开发验证和文档

内容：

- 记录开发态 HMR 验证步骤。
- 记录 GitHub Secrets 配置要求。
- 记录从旧版安装包验证自动更新的步骤。
- 更新 `docs/development.md` 和 `docs/todo.md`。

验收：

- 文档说明开发态 HMR 和发布态自动更新的边界。
- 不把未验证的 Rust 编译、真实窗口启动或打包写成已完成。

## 7. 验收标准

### 7.1 本地开发态 HMR

在 Rust/Cargo 环境可用后验证：

```powershell
npx pnpm@9.15.0 dev
npx pnpm@9.15.0 --filter @d2-tools/desktop dev:desktop
```

确认：

- Tauri 窗口正常打开。
- 页面加载 Vite dev server。
- 修改前端代码后窗口内页面热刷新。

### 7.2 CI 发布

确认：

- tag 和版本不一致时失败。
- 缺少签名 secret 时失败。
- 文档、类型和测试检查失败时不发布。
- Windows 安装包和 updater metadata 上传到同一个 GitHub Release。

### 7.3 应用内自动更新

在至少两个不同版本间验证：

- 已安装旧版能检查到新版。
- 用户触发安装后能下载更新。
- 安装完成后应用重启进入新版。
- 没有更新、网络失败、签名失败、下载失败时有可读错误。

## 8. 风险和处理

| 风险 | 处理 |
|---|---|
| GitHub Release 真实产物尚未验收 | 通过 tag 触发 workflow 后，用 `release:verify`、`release:verify-assets` 和 `release:verify-updater` 校验 installer、`latest.json` 和 updater metadata |
| Updater 签名配置错误导致发布产物不可更新 | CI 中强制检查 signing secrets 和 updater metadata |
| 版本号不一致导致客户端无法识别更新 | workflow 校验 root package、desktop package、Cargo、Tauri config 版本 |
| GitHub Release 只有 installer 没有 updater metadata | release workflow 将 metadata 作为必需产物 |
| 开发态 HMR 被误解为生产热替换 | 文档明确 HMR 只用于 dev，生产自动更新需要安装并重启 |

## 9. 后续增强

本批次完成后再考虑：

- Windows 代码签名证书。
- 本地模拟 updater server。
- stable / beta / rc 渠道。
- macOS / Linux 发布。
- 自动更新进度 UI 和诊断日志。
- 安装失败恢复和回滚策略。
