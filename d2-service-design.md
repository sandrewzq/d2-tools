# d2-service Windows 本地能力设计

日期：2026-06-18

## 目标

`d2-service` 是给 6 人小圈子使用的 Windows 本地 Destiny 2 工具。每个使用者在自己的 Windows 电脑上运行程序，程序直接访问 Bungie API，不再默认依赖 AstrBot、Hermes、NAS Docker 或中心 d2-service。

项目仍然叫 `d2-service`，但这里的 service 指“本机能力服务”：它可以作为桌面工具、CLI、localhost HTTP API 或 MCP 工具被调用。后续接入 AI 时，AI 通过这些稳定接口使用 Destiny 2 能力，而不是直接操作 token、Manifest 或 Bungie API。

第一版目标：

- 每个用户本机配置 Bungie API Key、Client ID、Client Secret。
- 每个用户本机完成 Bungie OAuth 登录。
- 每个用户本机保存 token、Manifest、缓存和日志。
- 支持武器、perk、遗失区域、商人等公共查询。
- 支持角色、装备、仓库、最近活动等个人查询。
- 为 AI 接入预留结构化工具接口。

## 当前结论

推荐采用：

```text
Windows 本地 d2-service
  ↓
Bungie API / OAuth / Manifest
  ↓
本地数据目录
```

不再把 AstrBot、Hermes 或远程 HTTP 服务作为第一入口。后续如果仍想在群聊中使用，可以让 AstrBot 调用某台机器上的 d2-service，或单独做一个轻量适配器，但这不是主线。

## 设计取舍

### 为什么不再默认做中心服务

数据源都在 Bungie 服务器，6 个使用者也都是 Windows 用户。每个人本机直接访问 Bungie 可以省掉：

- NAS Docker 部署。
- AstrBot 插件适配。
- Hermes/Open WebUI 网关。
- 中心服务的更新、备份和网络暴露。

6 个人的 OAuth token 本来就不同。中心服务不能减少 token 数量，只是把 token 和 `client_secret` 从 6 台电脑集中到一台服务上。对小圈子来说，每个人本机用 `.env` 配置自己的 Bungie 应用信息，可以接受。

### 小圈子安全模型

`client_secret` 属于 Bungie 应用，不属于某个 Bungie 账号。严格来说，桌面客户端不适合公开分发 `client_secret`。但本项目是 6 人可信小圈子使用，不公开发布，配置也不进仓库，因此可以采用：

```text
每个使用者本机 .env 配置 BUNGIE_API_KEY / BUNGIE_CLIENT_ID / BUNGIE_CLIENT_SECRET
```

这能避免 secret 写进代码仓库、安装包和提交历史。风险边界要写清楚：这不是公开软件的安全模型，只适合可信小圈子。

## 参考 d2-skill 的方式

`d2-service` 参考 [Lin-Guanguo/d2-skill](https://github.com/Lin-Guanguo/d2-skill)，但不直接复制它的项目形态。

可借鉴：

- Node.js 22 + TypeScript 的技术路线。
- `.env` 放配置，仓库不包含用户密钥。
- 本地 OAuth callback 流程。
- Manifest 下载、缓存和中文查询思路。
- CLI 命令返回结构化 JSON，方便自动化和 AI 调用。
- 高风险操作采用“先 plan，再 execute”的安全模型。
- 审计日志记录工具调用和装备操作。

不建议照搬：

- 把项目做成只给 Codex/Claude 使用的 skill 包。
- 让 AI 直接持有 token 或直接拼 Bungie API 请求。
- 把所有功能藏在单一 CLI 命令里，导致桌面 UI、HTTP API、MCP 无法共享。

## 推荐技术路线

### 核心运行时

```text
Node.js 22 + TypeScript
```

选择 Node.js 的原因：

- 和 d2-skill 的生态接近，后续参考或迁移思路更顺。
- 适合同时提供 CLI、localhost HTTP API、MCP server 和桌面壳。
- JSON、HTTP、OAuth、工具协议和 AI 接入生态成熟。

### 第一版形态

第一版不急着做完整桌面 UI，建议先做：

```text
CLI + localhost HTTP API + 可选 MCP server
```

这样可以尽快跑通 OAuth、Manifest、查询和 AI 调用。等核心能力稳定后，再包一层 Windows 桌面壳。

### 后续桌面形态

可选方向：

- Tauri：更轻，适合做 Windows 桌面壳。
- Electron：生态成熟，但体积更大。
- Web UI + localhost API：开发简单，先作为调试和本地管理界面。

推荐顺序：

```text
CLI / HTTP / MCP → 本地 Web UI → Windows 桌面包
```

## 本地架构

```text
d2-service
  ├─ CLI
  ├─ localhost HTTP API
  ├─ MCP server
  ├─ OAuth manager
  ├─ Bungie API client
  ├─ Manifest manager
  ├─ Profile service
  ├─ Item search service
  ├─ AI tool adapter
  └─ Local storage
```

数据流：

```text
用户 / AI / 本地 UI
  ↓
CLI / HTTP API / MCP tool
  ↓
d2-service 应用层
  ↓
Bungie API client / Manifest cache / Local storage
  ↓
结构化结果
```

AI 只能通过工具接口拿到结构化结果。AI 不直接读取 `.env`、token 文件或 SQLite。

## 本地目录结构

项目目录：

```text
d2-service/
  package.json
  pnpm-lock.yaml
  .env.example
  src/
    cli/
    http/
    mcp/
    config/
    auth/
    bungie/
    manifest/
    profile/
    items/
    vendors/
    actions/
    ai/
    storage/
    audit/
```

用户数据目录建议放到：

```text
%APPDATA%\d2-service\
  config.json
  tokens.json
  d2.sqlite
  manifest\
  cache\
  logs\
  audit\
```

开发环境可以支持：

```text
./.local-data/
```

但生产 Windows 程序默认写入 `%APPDATA%\d2-service`，避免覆盖源码或升级程序时丢数据。

## 配置设计

仓库只提供：

```text
.env.example
```

示例：

```env
BUNGIE_API_KEY=
BUNGIE_CLIENT_ID=
BUNGIE_CLIENT_SECRET=
BUNGIE_REDIRECT_URI=http://127.0.0.1:28780/oauth/callback
D2_DATA_DIR=%APPDATA%\d2-service
D2_MANIFEST_LANGUAGE=zh-chs
AI_PROVIDER=
AI_API_KEY=
AI_MODEL=
```

规则：

- `.env` 不提交 Git。
- `tokens.json` 不提交 Git。
- `d2.sqlite` 不提交 Git。
- 用户可以各自使用自己的 Bungie Application，也可以小圈子共享同一组 Bungie 应用配置。
- 如果共享同一组 Bungie 应用配置，必须只在可信范围内分发。

## OAuth 设计

每个 Windows 客户端本机完成 OAuth。

流程：

```text
1. 用户运行 d2 auth login
2. d2-service 启动本地 callback server
3. 浏览器打开 Bungie 授权页面
4. Bungie 回调 http://127.0.0.1:28780/oauth/callback
5. d2-service 用 code + client_secret 换取 token
6. token 加密或至少限制权限后保存到本机数据目录
```

本机保存：

```text
access_token
refresh_token
expires_at
membership_type
membership_id
display_name
```

token 刷新由本机 d2-service 完成。刷新失败时提示用户重新登录。

## Manifest 设计

Manifest 由每台 Windows 客户端本机下载和缓存。

第一版只索引必要数据：

- `DestinyInventoryItemDefinition`
- `DestinyPlugSetDefinition`
- `DestinySandboxPerkDefinition`
- 必要的 socket / perk / icon 字段

不一开始做完整资料库。

搜索能力：

- 中文精确匹配。
- 英文名匹配。
- 常用别名。
- 简单模糊匹配。

Manifest 缓存可删除重建，不影响 OAuth token 和用户配置。

## 命令能力

### 公共查询

```text
d2 item search 风险管理者
d2 perk search 爆破专家
d2 vendor xur
d2 lost-sector
```

### 个人查询

```text
d2 auth login
d2 auth status
d2 profile characters
d2 profile equipment
d2 inventory search 风险管理者
d2 activities recent
```

### 装备操作

装备操作放到后续阶段，必须采用两段式：

```text
d2 action plan transfer --item 风险管理者 --to 泰坦
d2 action execute <plan_id>
```

第一步只生成计划，不执行写操作。第二步必须确认后才执行。

## HTTP API

本机 HTTP API 默认只监听：

```text
127.0.0.1
```

不要默认监听 `0.0.0.0`。

示例：

```http
GET  /api/v1/health
POST /api/v1/auth/login
GET  /api/v1/auth/status
GET  /api/v1/items/search?q=风险管理者
GET  /api/v1/perks/search?q=爆破专家
GET  /api/v1/profile/characters
GET  /api/v1/profile/equipment
GET  /api/v1/inventory/search?q=风险管理者
POST /api/v1/actions/plan
POST /api/v1/actions/execute
```

统一返回：

```json
{
  "ok": true,
  "data": {},
  "message": "文本摘要",
  "warnings": []
}
```

失败返回：

```json
{
  "ok": false,
  "error_code": "NOT_AUTHENTICATED",
  "message": "请先登录 Bungie 账号"
}
```

## AI 接入设计

AI 能力分两类：让 AI 使用 d2-service 的工具，以及让 d2-service 调用 AI。

### AI 使用 d2-service

推荐优先支持 MCP server：

```text
AI Agent / Claude / Codex / 其他 MCP 客户端
  ↓ MCP tools
d2-service
  ↓
Bungie API / Manifest / 本地缓存
```

工具示例：

```text
d2_search_item(query)
d2_search_perk(query)
d2_get_characters()
d2_get_equipment()
d2_search_inventory(query)
d2_plan_transfer(item, target)
d2_execute_action(plan_id)
```

工具返回必须是结构化 JSON，并包含适合 AI 阅读的摘要字段。高风险工具必须拆成 plan 和 execute，execute 必须要求用户确认。

### d2-service 调用 AI

这部分作为后续增强，不放在第一版核心路径。用户可以在 `.env` 里配置 AI provider：

```env
AI_PROVIDER=openai-compatible
AI_API_KEY=
AI_MODEL=
```

可做能力：

- 用自然语言解释装备和 perk。
- 根据仓库和角色状态给配装建议。
- 把用户自然语言转换成 d2-service 查询。
- 对活动记录做摘要。

AI 输出只能作为建议。涉及装备转移、装备、锁定、loadout 的写操作，必须由 d2-service 生成可审计计划并要求用户确认。

## 安全边界

必须遵守：

- `.env`、token、SQLite、日志不进 Git。
- HTTP API 默认只监听 `127.0.0.1`。
- MCP 工具只能访问 d2-service 暴露的能力。
- AI 不直接读取 `.env` 和 token 文件。
- 写操作必须二次确认。
- 所有写操作写入 audit log。
- 出错时不要把 access token、refresh token、client secret 打进日志。

小圈子可接受：

- 每个用户本机保存 `client_secret`。
- 共享 Bungie Application 配置。

不适合：

- 公开发布带 `client_secret` 的安装包。
- 把本机 API 暴露到公网。
- 让 AI 自动执行装备写操作。

## 分阶段计划

### 阶段 0：本地骨架

目标：先跑通本地程序结构。

范围：

- Node.js 22 + TypeScript 工程。
- 配置加载和 `.env.example`。
- `%APPDATA%\d2-service` 数据目录。
- CLI 入口。
- `/api/v1/health`。
- 基础日志和错误格式。

完成标志：

- Windows 上能启动 d2-service。
- CLI 和 HTTP health 都可用。
- 配置缺失时有清晰提示。

### 阶段 1：OAuth 和 Manifest

目标：能登录 Bungie，能下载和查询 Manifest。

范围：

- 本地 OAuth callback。
- token 保存和刷新。
- Manifest 下载和版本检测。
- 中文物品和 perk 索引。

完成标志：

- `d2 auth login` 完成登录。
- `d2 auth status` 显示当前账号。
- `d2 item search 风险管理者` 返回结构化结果。

### 阶段 2：个人查询

目标：能查询每个用户自己的角色和仓库。

范围：

- 角色列表。
- 当前装备。
- 仓库搜索。
- 最近活动。

完成标志：

- 每个用户本机能查到自己的角色、装备和仓库。
- token 过期后能自动刷新。

### 阶段 3：AI 工具接入

目标：让 AI 能安全使用 d2-service。

范围：

- MCP server。
- item/perk/profile/inventory 工具。
- 结构化 JSON 返回。
- 工具调用审计日志。

完成标志：

- AI 客户端能通过 MCP 调用物品查询。
- AI 客户端能读取角色、装备、仓库摘要。
- AI 不能直接读取 secret 和 token。

### 阶段 4：装备操作

目标：支持有限的装备管理能力。

范围：

- 转移物品。
- 装备物品。
- 锁定物品。
- loadout 切换。
- plan/execute 两段式确认。
- 操作日志。

完成标志：

- 用户能安全完成装备操作。
- 误触不会直接执行。
- 所有写操作可审计。

### 阶段 5：桌面体验

目标：做成更像 Windows 程序的体验。

范围：

- 本地 Web UI 或 Tauri/Electron 壳。
- 配置向导。
- 登录状态展示。
- 查询面板。
- AI 建议面板。
- 自动更新策略。

## 风险

主要风险：

- Bungie API 限流和不稳定。
- Manifest 首次下载和索引耗时。
- 中文搜索需要别名、繁简和模糊匹配。
- 本机 `client_secret` 只适合可信小圈子。
- AI 可能给出错误建议。
- 装备写操作存在误触风险。

规避方式：

- 优先做缓存。
- Manifest 可重建，token 独立保存。
- 查询结果保留原始 Bungie 数据和本地摘要。
- AI 输出标记为建议，不作为事实来源。
- 写操作必须 plan/execute。
- HTTP API 默认只监听 localhost。

## 当前推荐决策

主线改为：

```text
d2-service = Windows 本地 Destiny 2 能力程序
```

它直接访问 Bungie API，本地保存配置、token、Manifest、缓存和日志。AstrBot、Hermes、NAS Docker 和远程 d2-service 都不作为第一阶段目标。

技术路线：

```text
Node.js 22 + TypeScript + CLI + localhost HTTP API + MCP server
```

`d2-skill` 作为重要参考项目，借鉴它的 OAuth、Manifest、CLI、AI 工具和安全操作思路，但 `d2-service` 保持自己的架构边界：本地优先、用户数据本机保存、AI 通过结构化工具接口接入。
