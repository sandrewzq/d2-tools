# d2-tools

d2-tools 当前处在 **Tauri 2 架构底座 / 开发者预览** 阶段。这个分支的目标是建立 clean slate 的桌面架构、包边界、本地数据层和平台能力 adapter，不代表旧 Electron 版本的账号、仓库、写操作、Bungie 登录、安装器或完整 AI 功能已经迁回。

当前第一屏只用于验证薄链路：

- 设置摘要
- Manifest 状态
- AI 会话列表基础展示
- `apps/desktop -> ui -> data/platform -> core/Tauri/local storage` 的架构方向

短期待办、缺口和验收状态以 [docs/todo.md](docs/todo.md) 为准。

## 当前状态

已落地：

- `apps/desktop` Tauri 2 + React + Vite 桌面壳
- `packages/core`、`packages/data`、`packages/platform`、`packages/ui`、`packages/shared` 包边界
- platform contracts、mock adapter、desktop adapter 子入口
- settings、Manifest、AI conversation list 的最小 repository 和 UI 薄切片
- 架构边界测试，约束 UI 不直接调用 Tauri、data 不依赖具体 desktop adapter

仍未完成：

- 正式安装器和真实发布体验验收
- Bungie OAuth 登录和授权状态闭环
- 账号摘要、仓库列表、装备详情、写操作和 AI provider 请求
- Manifest 下载、真实安全存储、SQLite、自动更新安装
- Rust/Cargo 环境下的 Tauri 编译、真实窗口启动和打包验证
- Rust 侧 `open_external`、`updates_check`、`updates_install` commands

## 本地开发

安装依赖：

```powershell
npx pnpm@9.15.0 install
```

前端开发服务器：

```powershell
npx pnpm@9.15.0 dev
```

尝试启动 Tauri 桌面窗口：

```powershell
npx pnpm@9.15.0 --filter @d2-tools/desktop dev:desktop
```

`dev:desktop` 需要本机安装 Rust/Cargo 和 Tauri 所需系统依赖。当前仓库仍保留 Rust/Cargo 未验证的缺口说明。

## 验证

```powershell
npx pnpm@9.15.0 docs:check
npx pnpm@9.15.0 typecheck
npx pnpm@9.15.0 test
git diff --check
```

如果修改依赖或 lockfile：

```powershell
npx pnpm@9.15.0 install
```

## 文档导航

- [当前待办](docs/todo.md)
- [开发说明](docs/development.md)
- [开发者预览使用说明](docs/user-guide.md)
- [常见问题](docs/faq.md)
- [安全说明](docs/security.md)
- [更新日志](CHANGELOG.md)
