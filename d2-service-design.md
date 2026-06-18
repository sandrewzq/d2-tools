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

## 功能路线图

路线图参考“小日向 Bot”的使用体验和 `d2-skill` 的工具化思路，但不追求第一版完整复刻。优先顺序是：先让用户稳定查资料，再查自己的账号，随后接入 AI，最后谨慎开放装备写操作。

### P0：本地基础能力

目标：让每台 Windows 机器都能独立跑起来。

能力：

- 配置检测：检查 `.env`、Bungie API Key、Client ID、Client Secret。
- 本地数据目录：初始化 `%APPDATA%\d2-service`。
- 健康检查：CLI 和 HTTP API 都能确认服务状态。
- 日志：记录启动、配置错误、Bungie API 错误。
- 结构化输出：所有命令都能返回 JSON，方便 AI 和脚本使用。

验收：

- 新用户按 `.env.example` 配好后能启动。
- 缺配置时给出明确提示。
- `d2 health` 和 `/api/v1/health` 都可用。

### P1：公共资料查询

目标：先做不需要登录 Bungie 的能力，最快形成可用价值。

能力：

- 武器查询：名称、类型、框架、伤害属性、弹药类型、来源、图标。
- perk 查询：perk 效果、可出现在哪些武器上。
- 模糊搜索：中文名、英文名、别名、关键词。
- 商人查询：Xur、枪匠、常用供应商售卖。
- 遗失区域：当日遗失区域、掉落部位、难度。
- 周期信息：周常、赛季活动、轮换信息，后续补齐。

验收：

- `d2 item search 风险管理者` 能返回可读摘要和原始结构化数据。
- `d2 perk search 爆破专家` 能返回 perk 说明和关联物品。
- 公共查询不要求用户登录。

### P2：个人账号与角色查询

目标：每个用户能查看自己的 Destiny 2 账号数据。

能力：

- Bungie OAuth 登录。
- token 本地保存和刷新。
- 角色列表：职业、光等、当前装备。
- 仓库搜索：按名称、类型、属性、perk 搜索。
- 装备详情：武器 roll、perk、masterwork、锁定状态。
- 最近活动：活动名称、时间、结果、KD/击杀等基础数据。

验收：

- `d2 auth login` 完成登录。
- `d2 profile characters` 能列出角色。
- `d2 inventory search 风险管理者` 能找到本账号拥有的物品。

### P3：小日向式体验增强

目标：从“能查”升级到“好用、像 Bot 一样懂玩家”。

能力：

- 玩家名片：Bungie 名称、主要角色、光等、常用职业、近期活动摘要。
- 武器卡片：图标、名称、roll、perk、来源、收藏状态。
- 查询结果分页：大量结果可翻页、过滤、排序。
- 别名系统：支持常用简称、黑话和中英文混查。
- 收藏和快捷查询：本地记录常查武器、常用角色、关注商人。
- 文本摘要：给 CLI、HTTP、MCP 都提供人类可读摘要。

验收：

- 查询武器时能输出接近 Bot 卡片的信息层次。
- 查询个人数据时能给出一段适合直接展示给用户的摘要。
- 同一个能力可以同时被 CLI、HTTP 和 MCP 复用。

### P4：AI 助手能力

目标：让 AI 不只是转述数据，而是能基于事实帮助分析。

能力：

- MCP 工具：向 AI 暴露物品、perk、角色、仓库、活动查询。
- 自然语言查询：把“我有没有爆破专家+萤火虫的手炮”转换成结构化查询。
- 装备解释：解释某个 roll 适合什么活动。
- 仓库分析：根据用户仓库给出保留、关注、可清理建议。
- 配装建议：基于当前角色、装备和活动目标给出建议。
- 活动复盘：摘要最近活动表现。

验收：

- AI 能调用工具查询真实数据，而不是凭记忆回答。
- AI 输出中区分事实、推断和建议。
- AI 不能读取 `.env`、token 或直接执行写操作。

### P5：装备操作

目标：在查询稳定后，谨慎支持写操作。

能力：

- 转移物品：仓库到角色、角色到仓库、角色之间转移。
- 装备物品：给指定角色装备武器或护甲。
- 锁定/解锁物品。
- loadout 切换。
- 操作计划：先生成 plan，展示影响，再确认执行。
- 审计日志：记录每次写操作的发起方式、计划、结果。

验收：

- 所有写操作都必须 `plan → confirm → execute`。
- AI 只能生成 plan，不能自动 execute。
- 失败时能说明原因，不留下半执行状态。

### P6：Windows 桌面体验

目标：让非技术用户也能轻松使用。

能力：

- 配置向导：填写 Bungie API 配置和数据目录。
- 登录向导：一键打开浏览器完成 OAuth。
- 查询面板：武器、perk、仓库、角色。
- AI 面板：自然语言提问和建议。
- 本地更新提示。
- 数据备份/恢复：导出 token 以外的本地配置、别名和收藏。

验收：

- 新用户不需要命令行也能完成配置和登录。
- 桌面 UI 调用同一套本地 API，不另写业务逻辑。

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

### 阶段 1：公共资料查询

目标：先做不需要登录的能力，让工具尽快有可用价值。

范围：

- Manifest 下载和版本检测。
- 中文物品和 perk 索引。
- 武器查询。
- perk 查询。
- 遗失区域查询。
- Xur、枪匠和常用供应商查询。

完成标志：

- `d2 item search 风险管理者` 返回结构化结果。
- `d2 perk search 爆破专家` 返回结构化结果。
- 公共查询不要求用户登录。

### 阶段 2：OAuth 和个人查询

目标：能查询每个用户自己的角色和仓库。

范围：

- 本地 OAuth callback。
- token 保存和刷新。
- 角色列表。
- 当前装备。
- 仓库搜索。
- 装备详情。
- 最近活动。

完成标志：

- `d2 auth login` 完成登录。
- `d2 auth status` 显示当前账号。
- 每个用户本机能查到自己的角色、装备和仓库。
- token 过期后能自动刷新。

### 阶段 3：小日向式体验增强

目标：从命令式查询升级到更接近 Bot 的信息组织方式。

范围：

- 玩家名片。
- 武器卡片。
- 查询结果分页。
- 常用别名。
- 收藏和快捷查询。
- 适合 CLI、HTTP、MCP 复用的文本摘要。

完成标志：

- 武器查询能返回卡片级信息层次。
- 个人查询能返回适合直接展示的摘要。
- 同一能力可以被 CLI、HTTP 和 MCP 复用。

### 阶段 4：AI 工具接入

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

### 阶段 5：装备操作

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

### 阶段 6：桌面体验

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
