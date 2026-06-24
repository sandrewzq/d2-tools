# 开发说明

这份文档面向仓库维护者和贡献者，说明当前 clean slate 的 Tauri 2 架构底座、开发命令、验证命令和文档维护规则。

## 1. 当前技术栈

- 运行环境：Node.js 22、pnpm 9
- 桌面框架：Tauri 2
- 前端：React + TypeScript + Vite
- 测试：Vitest
- 包结构：`apps/desktop`、`packages/core`、`packages/data`、`packages/platform`、`packages/ui`、`packages/shared`
- 第一阶段不启用远程账号、PostgreSQL、队列同步或云同步

当前分支是 Tauri 2 架构底座主线。旧 Electron 版本只作为业务需求参考，不作为技术结构参考。

## 2. 仓库结构

```text
apps/
  desktop/          Tauri 2 桌面应用装配层
    src/            React 入口、App、providers、desktop adapter 装配
    src-tauri/      Rust 壳、Tauri 配置、capabilities、平台 commands

packages/
  shared/           通用错误、Result、时间工具等无业务依赖能力
  core/             纯业务模型和确定性领域逻辑
  platform/         平台能力 contracts、mock adapter、desktop adapter
  data/             local-first repository contracts 和最小本地数据服务
  ui/               React primitives、layouts 和薄功能展示组件

test/
  architecture-boundaries.test.ts

docs/
  todo.md
  development.md
  work/
    backlog/
    archive/
    references/
```

### 2.1 架构边界

- `apps/* -> ui -> core/shared`
- `apps/* -> data -> core/shared`
- `apps/* -> platform -> shared`
- `data` 可以依赖 `platform` contracts，但不能依赖具体 Tauri adapter 或 `apps/*`
- `platform` 不承载 Destiny 业务规则，不依赖 `data/core/ui/apps`
- `core` 不依赖 `data/platform/ui/apps`
- `ui` 不 import Tauri，不读写本地文件、SQLite 或安全存储
- `shared` 不依赖任何业务包

`test/architecture-boundaries.test.ts` 会约束这些依赖方向，防止 UI 直接调用 Tauri、data 直接依赖 app 或 core 反向依赖平台层。

### 2.2 第一阶段底座状态

当前已落地：

- pnpm workspace 覆盖 `apps/*` 和 `packages/*`
- `apps/desktop` Tauri 2 + Vite + React 桌面壳
- `packages/platform` 平台能力 contract、mock adapter、desktop adapter
- Rust commands：`app_get_info`、`path_get_data_dir`、`secure_get`、`secure_set`、`secure_delete`、`fs_read_app_file`、`fs_write_app_file`、`log_write`、`log_export`、`open_external`、`updates_check`、`updates_install`
- `packages/data` 设置、Manifest、AI 会话的最小 repository
- `packages/ui` 设置摘要、Manifest 状态、自动更新状态、AI 会话列表和应用壳组件
- 桌面首页薄切片验证 `apps/desktop -> ui -> data/platform -> core/Tauri/local storage` 的方向

仍未闭环：

- 本机已验证 Tauri 环境探针、`cargo check`、`tauri dev` 真实窗口启动和 `tauri build` 生成 Windows NSIS 安装器。
- `open_external`、`updates_check`、`updates_install` 已有 Rust command 和 TypeScript adapter，但 updater 真实检查、下载、安装和重启仍需用两个不同版本安装包验证。
- 当前底座首页已有手动检查更新、安装更新和打开 GitHub 发布页入口，能展示发现新版本、安装中、安装失败和等待重启状态；UI 通过 `packages/platform` 调用 updater，不直接依赖 Tauri API。
- OAuth、真实安全存储、SQLite、Manifest 下载、账号刷新、仓库完整列表、AI provider 请求和自动更新安装仍是后续功能切片，不属于本次底座收口完成项。

## 3. 本地开发

安装依赖：

```powershell
npx pnpm@9.15.0 install
```

启动前端开发服务器：

```powershell
npx pnpm@9.15.0 dev
```

该命令等价于：

```powershell
npx pnpm@9.15.0 --filter @d2-tools/desktop dev
```

尝试启动 Tauri 桌面窗口：

```powershell
npx pnpm@9.15.0 --filter @d2-tools/desktop dev:desktop
```

也可以使用脚本入口，脚本会先构建 workspace 依赖，再启动 Tauri dev：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev-desktop.ps1
```

环境补齐后，可以先运行轻量探针确认 WebView2、Rust/Cargo 和 MSVC / Windows SDK 是否齐全：

```powershell
npx pnpm@9.15.0 tauri:env
```

注意：`dev:desktop` 需要本机安装 Rust/Cargo、MSVC / Windows SDK、WebView2 和 Tauri 所需系统依赖。当前本机已验证可以启动真实 Tauri 窗口。

开发态热更新口径：

- 前端开发使用 Vite HMR。`dev:desktop` 打开后，React / TypeScript / CSS 改动应在 Tauri 窗口内自动刷新或局部热替换。
- Rust command、Tauri config、capability 和 Cargo 依赖改动需要重启 `dev:desktop`。
- 开发态 HMR 不等于生产环境无重启热替换；生产更新仍通过 Tauri updater 下载、安装并重启。

## 4. 测试与检查

文档和编码检查：

```powershell
npx pnpm@9.15.0 docs:check
```

类型检查：

```powershell
npx pnpm@9.15.0 typecheck
```

全量测试：

```powershell
npx pnpm@9.15.0 test
```

定向运行架构边界测试：

```powershell
npx pnpm@9.15.0 vitest --run test/architecture-boundaries.test.ts
```

提交前检查尾随空格：

```powershell
git diff --check
```

## 5. 构建和打包

前端构建：

```powershell
npx pnpm@9.15.0 --filter @d2-tools/desktop build
```

Tauri 打包入口：

```powershell
npx pnpm@9.15.0 --filter @d2-tools/desktop package:desktop
```

本地完整打包脚本：

```powershell
powershell -File scripts/local-package.ps1
```

注意：Tauri 打包需要 Rust/Cargo 和 Windows 构建工具链。当前本机已验证 `package:desktop` 可以生成 NSIS 安装器，但不能把第一阶段底座理解为发布体验已完整闭环；GitHub Release 产物和自动更新仍需真实验收。

## 6. 发布状态

当前优先补齐 Windows-only GitHub Release 与 Tauri updater 自动更新闭环。

发布入口：

```powershell
git tag v0.0.6
git push origin v0.0.6
```

发布 workflow：`.github/workflows/release.yml`

发布前必须满足：

- `package.json`、`apps/desktop/package.json`、`apps/desktop/src-tauri/Cargo.toml`、`apps/desktop/src-tauri/tauri.conf.json` 版本一致。
- `CHANGELOG.md` 存在对应版本小节。
- GitHub Secrets 配置：
  - `TAURI_SIGNING_PRIVATE_KEY`
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
  - `TAURI_UPDATER_PUBLIC_KEY`

本地静态发布检查：

```powershell
npx pnpm@9.15.0 release:check
```

发布后先跑总体验证，确认 GitHub Release 同时有 NSIS 安装器、`latest.json`，且 `latest.json` 的 Windows x64 updater 元数据可用：

```powershell
npx pnpm@9.15.0 release:verify -- v0.0.6
```

如需分开排查资产清单和本地下载的 `latest.json`，可以运行：

```powershell
npx pnpm@9.15.0 release:verify-assets -- v0.0.6
npx pnpm@9.15.0 release:verify-updater -- latest.json
```

发布 workflow 会在 CI 中临时写入 updater endpoint 和 public key，生成 Windows NSIS 安装器、签名更新产物和 `latest.json`，并上传到同一个 GitHub Release。

注意：自动更新真实链路仍需用两个不同版本安装包验证：先安装旧版，再发布新版，旧版应用内检查更新、下载、安装并重启。备份恢复、诊断导出、商业代码签名、多平台发布、灰度和回滚仍属于后续桌面发布体验任务。

## 7. 文档结构

当前只保留这些正式入口：

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
    archive/
    references/
```

不要把一次性设计稿、执行计划、阶段进度或临时分析文档放在 `docs/` 根目录。确实需要记录当前短期待办、验收状态、需求或 bug 时，统一更新 `docs/todo.md`；确实需要保留未完成设计或调研材料时，放进 `docs/work/`。外部流程如果要求写入 `docs/superpowers/`，本仓库统一改写到 `docs/work/backlog/`、`docs/work/archive/` 或 `docs/work/references/`。确实需要记录长期规则或少量长期方向结论时，更新 `docs/development.md`；已发布变化写入 `CHANGELOG.md`。

## 8. 长期方向

这里只保留不适合写进 `todo.md` 的长期演进方向，不单独维护路线图文档：

- 桌面功能恢复：在新架构上按垂直切片恢复首页、账号、仓库、装备详情、AI 助手、诊断和更新体验。
- 仓库整理体验：继续增强同名对比、批量处理、护甲属性价值判断和评分解释。
- 今日 / 本周信息：优先补齐可确认的商人、遗失区域和轮换线索，保持“只展示可确认数据”。
- AI 助手：围绕真实账号数据问答、仓库建议、结果结构化和安全边界继续打磨。
- 活动与桌面体验：逐步补齐基础复盘、安装更新、备份恢复和诊断导出体验。
- 多端和云同步：只在桌面底座稳定后再评估 Capacitor、Web/PWA、API 服务、远程账号和云同步。

## 9. 文档维护原则

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
- `work/archive/` 保存已实现或仅作历史追溯的过程材料
- `work/references/` 保存外部资料分析和数据源调研
- 完成、取消或改变方向且影响当前短期待办、验收状态或优先级时，必须在同一次开发收尾时更新 `todo.md`
- 修复、确认无效或转为长期需求的 bug，必须在同一次开发收尾时更新 `todo.md` 对应条目
- `todo.md` 中的 `Bug #数字` 必须全局唯一；需要按领域区分时，在标题中加领域前缀，不要复用编号
- 设计/计划文档默认不作为正式入口；需要长期保留的结论应合并进正式文档
- `docs/work/` 只保留仍对当前工作有直接帮助的材料，不再额外维护索引文档
- 只有确认已合并到正式文档或明确无参考价值的材料，才可以删除
