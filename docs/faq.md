# 常见问题

这份 FAQ 面向当前 Tauri 2 架构底座 / 开发者预览。

## 现在可以下载安装使用吗

还不应按正式玩家软件使用。当前分支已有本地 NSIS 安装器打包验证，但 GitHub Release 产物、旧版到新版自动更新和发布体验仍未验收。

## 为什么没有 Bungie 登录

Bungie OAuth 登录闭环还没有迁回当前 Tauri 底座。现阶段只保留 settings、Manifest 状态和 AI 会话列表基础展示，登录、授权状态、账号刷新属于后续切片。

## 为什么看不到账号和仓库

账号摘要、角色详情、仓库列表和装备详情还没有在当前底座实现。文档中的当前状态以 [todo.md](todo.md) 为准。

## 为什么 AI 不能聊天

当前只有 AI conversation list foundation，不包含 provider 请求、模型调用、账号数据上下文或完整聊天工作台。

## 写操作能用吗

不能。锁定、解锁、转移、装备、一键最高光等 Bungie 写操作都不属于当前底座已实现范围。

## Tauri 能打包吗

能。本机已验证 `cargo check`、`dev:desktop` 启动和 `package:desktop` 生成 Windows NSIS 安装器。还不能把它理解为发布体验已闭环，因为 GitHub Release 产物和旧版到新版自动更新仍未真实验收。

## external 和 updates commands 实现了吗

已接入最小链路。TypeScript contract 中有 `external.openExternal` 和 `updates.check/install`，Rust 侧已有 `open_external`、`updates_check`、`updates_install` commands。真实 updater 检查、下载、安装和重启仍需用两个不同版本的安装包验收。

## 当前应该如何验证

```powershell
npx pnpm@9.15.0 docs:check
npx pnpm@9.15.0 typecheck
npx pnpm@9.15.0 test
git diff --check
```

依赖或 lockfile 变化后先运行：

```powershell
npx pnpm@9.15.0 install
```
