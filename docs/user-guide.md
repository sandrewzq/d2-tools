# 开发者预览使用说明

这份说明只适用于当前 Tauri 2 架构底座分支。它不是正式玩家安装和日常使用指南。

## 1. 当前能看到什么

当前桌面壳用于验证底座链路，首屏是 foundation dashboard，包含：

- 设置摘要
- Manifest 状态
- AI 会话列表基础展示

这些内容来自最小化的 data repository 和 mock / desktop platform contract。它们不等同于完整 Bungie 登录、账号读取、仓库管理或 AI 聊天。

## 2. 本地运行

安装依赖：

```powershell
npx pnpm@9.15.0 install
```

启动前端开发服务器：

```powershell
npx pnpm@9.15.0 dev
```

尝试启动 Tauri：

```powershell
npx pnpm@9.15.0 --filter @d2-tools/desktop dev:desktop
```

`dev:desktop` 需要 Rust/Cargo。当前本机尚未完成 Rust 编译、真实窗口启动和打包验证。

## 3. 当前不要期待的功能

当前分支暂未提供：

- 可下载给普通玩家使用的正式安装器
- Bungie OAuth 登录闭环
- 账号摘要、角色详情、仓库列表和装备详情
- 锁定、解锁、转移、装备等 Bungie 写操作
- Manifest 下载和完整资料库搜索
- AI provider 请求、真实聊天和账号数据分析
- 自动更新检查、下载和安装

这些能力会按 `docs/todo.md` 的短期待办继续拆成后续切片。

## 4. 数据和安全

当前底座只验证设置 JSON、Manifest 状态和 AI 会话列表的最小本地读写。敏感字段如 `apiKey`、`refreshToken`、`token` 不应进入普通 settings JSON，已由 repository 测试覆盖。

更完整的安全边界见 [security.md](security.md)。

## 5. 下一步看什么

- 当前目标和缺口：[todo.md](todo.md)
- 架构和开发命令：[development.md](development.md)
- 常见状态解释：[faq.md](faq.md)
