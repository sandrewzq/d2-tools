# 安全说明

这份文档描述当前 Tauri 2 架构底座的安全边界，不承诺旧 Electron 完整功能已经可用。

## 1. 当前本地数据范围

当前底座只实现最小本地数据验证：

- settings JSON
- Manifest 状态 metadata
- AI 会话列表基础数据
- 最小日志和文件读写 command

真实 OAuth token、Bungie 账号快照、仓库完整数据、SQLite 缓存和自动更新状态仍属于后续切片。

## 2. 敏感字段边界

settings repository 读写时只保留白名单字段：

- `dataDir`
- `bungie.apiKeyConfigured`
- `ai.providerConfigured`
- `ai.providerId`
- `ai.model`

额外字段如 `apiKey`、`refreshToken`、`token` 不应从 settings JSON 透出，也不应写回普通 settings JSON。敏感凭据后续应走 platform secure store。

## 3. AI 边界

当前没有真实 AI provider 请求，也没有基于账号或仓库数据的完整 AI 分析。已有 UI 只展示 AI 会话列表基础状态。

因此当前分支不应承诺：

- 已支持 OpenAI / Anthropic 请求
- 已把账号数据发送给模型
- 已完成 AI 聊天或自动分析

## 4. Bungie 和写操作边界

当前没有 Bungie OAuth 登录闭环，也没有账号、仓库或写操作。锁定、解锁、转移、装备和一键最高光等能力都尚未迁回当前 Tauri 底座。

## 5. Tauri 安全默认值

当前 Tauri 配置使用显式 CSP，不使用 `csp: null`。当前 app 没有使用 shell open，因此不授予 `shell:allow-open`，也不加载 shell plugin。

## 6. 仍需验证的安全缺口

- Rust/Cargo 环境下的真实 Tauri 编译和启动
- 真实安全存储方案
- Manifest 下载、账号缓存和 SQLite 数据边界
- `open_external`、`updates_check`、`updates_install` Rust commands
- 正式安装器和自动更新链路

这些缺口的当前状态以 [todo.md](todo.md) 为准。
