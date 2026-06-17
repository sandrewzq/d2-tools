# AstrBot 接入 Destiny 2 能力设计

日期：2026-06-17

## 目标

在 NAS 上运行的 AstrBot 中接入 Destiny 2 能力，给约 6 位群友使用。目标体验参考“小日向 Bot”：先支持公共信息查询，再逐步支持 Bungie 账号绑定、个人角色、仓库、装备和有限的装备操作。

本设计优先保证三件事：

- 部署轻量，使用单个 Docker Compose 管理 AstrBot 和 d2-service。
- 更新安全，AstrBot 镜像更新和 d2-service 源码覆盖更新都不丢历史数据。
- 架构可扩展，功能可以慢慢加，但模块边界、持久化目录和 API 版本一开始就设计清楚。

## 结论

推荐采用：

```text
AstrBot 官方镜像 + AstrBot 插件 + Node.js 22 d2-service 源码服务
```

整体关系：

```text
群友消息
  ↓
聊天平台适配器
  ↓
AstrBot 官方容器
  ↓
astrbot_plugin_destiny2
  ↓ HTTP /api/v1
d2-service：node:22-bookworm + 自研 HTTP 服务
  ↓
Bungie API / Manifest / SQLite / Cache
```

d2-service 使用官方 `node:22-bookworm` 镜像运行，不单独构建业务镜像。代码通过宿主机目录挂载进容器，后续更新时覆盖 `./d2-service` 源码并重启容器即可。历史数据全部放到独立的 `./d2-data` 目录，源码覆盖和镜像更新都不能影响它。

`d2-skill` 不作为 d2-service 的运行时强依赖。它只作为参考资料，用来借鉴 Bungie OAuth、Manifest 查询、能力边界和数据模型。d2-service 自研实现核心能力，避免被第三方 CLI 的目录结构、命令格式、构建方式和输出格式绑定。

## 设计原则

### 镜像无状态

镜像和源码目录只放程序，不保存业务状态。所有用户绑定、token、数据库、Manifest、缓存、日志和待确认操作都必须写入 `/data`，对应宿主机的 `./d2-data`。

### 源码可覆盖

d2-service 通过源码目录更新：

```text
覆盖 ./d2-service
docker compose restart d2-service
```

覆盖源码不能删除 SQLite、Manifest 缓存、用户绑定、OAuth token 或操作日志。

### 数据可迁移

d2-service 启动时自动执行数据库 migration。新增功能需要表结构变化时，只能通过 migration 升级数据库，不能要求手动删库或重建数据。

### API 稳定

AstrBot 插件只调用 d2-service 的 HTTP API，不直接调用 Bungie API，不读取 SQLite，不执行 Node CLI。第一版 API 使用 `/api/v1` 前缀，后续大改时可以引入 `/api/v2`，避免插件和服务互相锁死。

### Manifest 可重建

Manifest 和搜索索引可以持久化以加快启动和查询，但不能作为唯一历史数据。即使删除 `./d2-data/manifest`，最多是重新下载和索引，不应该影响用户绑定和 token。

## 推荐目录结构

```text
deploy/
  docker-compose.yml
  .env

astrbot-data/
  ...

d2-service/
  package.json
  pnpm-lock.yaml
  start.sh
  src/
    server.ts
    config/
    db/
    modules/
      auth/
      manifest/
      public-info/
      profile/
      actions/
      render/
      admin/
      d2-skill-reference/

d2-data/
  d2.sqlite
  manifest/
  cache/
  logs/
  home/
```

目录职责：

- `./astrbot-data`：AstrBot 自己的数据目录，由 AstrBot 官方镜像使用。
- `./d2-service`：d2-service 源码目录，可以被覆盖更新。
- `./d2-data`：d2-service 持久化数据目录，不能被覆盖更新删除。
- `./d2-data/home`：容器内 `HOME`，给未来可能复用的 Node 工具、临时配置或兼容逻辑使用。

## Docker Compose 设计

示例：

```yaml
services:
  astrbot:
    image: soulter/astrbot:latest
    container_name: astrbot
    ports:
      - "6185:6185"
      - "6199:6199"
    volumes:
      - ./astrbot-data:/AstrBot/data
      - /etc/localtime:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
    restart: unless-stopped

  d2-service:
    image: node:22-bookworm
    container_name: d2-service
    working_dir: /app
    ports:
      - "8080:8080"
    volumes:
      - ./d2-service:/app
      - ./d2-data:/data
      - d2-node-modules:/app/node_modules
      - d2-pnpm-store:/pnpm/store
    environment:
      NODE_ENV: production
      HOME: /data/home
      DATA_DIR: /data
      DATABASE_PATH: /data/d2.sqlite
      MANIFEST_DIR: /data/manifest
      CACHE_DIR: /data/cache
      LOG_DIR: /data/logs
      PNPM_HOME: /pnpm
      BUNGIE_API_KEY: ${BUNGIE_API_KEY}
      BUNGIE_CLIENT_ID: ${BUNGIE_CLIENT_ID}
      BUNGIE_CLIENT_SECRET: ${BUNGIE_CLIENT_SECRET}
      PUBLIC_BASE_URL: ${PUBLIC_BASE_URL}
    command: bash ./start.sh
    restart: unless-stopped

volumes:
  d2-node-modules:
  d2-pnpm-store:
```

说明：

- `node:22-bookworm` 比 alpine 或 slim 类镜像更适合 NAS 场景，系统依赖更完整，后续扩展截图、字体、图片处理、SQLite 原生依赖时少踩坑。
- `./d2-service:/app` 用于源码覆盖更新。
- `./d2-data:/data` 是唯一业务持久化目录。
- `d2-node-modules` 避免依赖安装污染源码目录。
- `d2-pnpm-store` 加快依赖安装，减少重复下载。

## d2-service 启动流程

`start.sh` 建议负责：

```text
1. 创建 /data、/data/home、/data/manifest、/data/cache、/data/logs
2. 启用 corepack 和 pnpm
3. 根据 package.json / pnpm-lock.yaml 安装或复用依赖
4. 执行数据库 migration
5. 检查关键环境变量
6. 启动 HTTP API 服务
```

示例启动策略：

```text
corepack enable
pnpm install --frozen-lockfile
pnpm run migrate
pnpm run start
```

如果后续希望启动更快，可以在 `start.sh` 中记录依赖指纹。只有 `pnpm-lock.yaml` 变化时才重新安装依赖。

## 更新策略

### AstrBot 镜像更新

```bash
docker compose pull astrbot
docker compose up -d astrbot
```

AstrBot 数据保存在 `./astrbot-data`，更新镜像不会丢配置和插件数据。

### d2-service 源码覆盖更新

```bash
# 上传并覆盖 ./d2-service 源码
docker compose restart d2-service
```

d2-service 历史数据保存在 `./d2-data`。覆盖源码时不要覆盖 `./d2-data`。

### d2-service 依赖更新

如果 `package.json` 或 `pnpm-lock.yaml` 变化，重启后 `start.sh` 自动安装新依赖。依赖安装结果保存在 Docker volume `d2-node-modules` 和 `d2-pnpm-store`，不会写入宿主机源码目录。

### 数据库升级

每次 d2-service 启动都执行 migration。migration 必须幂等，可以重复执行。升级失败时服务应停止启动并写入日志，避免半升级状态继续对外服务。

## AstrBot 插件职责

插件名建议：

```text
astrbot_plugin_destiny2
```

插件只负责聊天入口：

- 识别 Destiny 2 命令。
- 提取平台、群 ID、用户 ID 和命令参数。
- 调用 d2-service `/api/v1`。
- 根据 d2-service 返回结果发送文本、图片或确认提示。

插件不负责：

- 保存 Bungie token。
- 下载或索引 Manifest。
- 直接调用 Bungie API。
- 直接执行 d2-skill 或其他 CLI。
- 保存装备操作的 pending state。

插件配置示例：

```yaml
d2_service_base_url: http://d2-service:8080
request_timeout_seconds: 15
enable_dangerous_actions: false
```

## d2-service 职责

d2-service 是核心后端，使用 Node.js 22 自研实现 HTTP API。

核心模块：

- `auth`：Bungie OAuth 登录、回调、token 刷新、解绑。
- `users`：聊天平台用户与 Bungie 账号绑定关系。
- `manifest`：Manifest 下载、版本检测、中文索引。
- `public-info`：日报、周报、遗失区域、商人售卖、武器查询。
- `profile`：角色、光等、装备、仓库、战绩、最近活动。
- `actions`：转移物品、装备物品、锁定物品、loadout 操作。
- `render`：图片化输出，第一版可以先不做。
- `admin`：健康检查、Manifest 刷新、版本信息、维护命令。
- `d2-skill-reference`：只保留对 d2-skill 思路的适配或移植代码，不把 d2-skill 作为运行时入口。

建议服务内部继续拆分为：

```text
HTTP controller
  ↓
application service
  ↓
Bungie client / repository / cache
```

这样后续换缓存、换数据库、增加图片渲染或补充新命令时，不需要改 AstrBot 插件。

## 和 d2-skill 的关系

`d2-skill` 可以作为参考，但不作为运行时强依赖。

可借鉴：

- Bungie OAuth 流程。
- Manifest 查询思路。
- Destiny 2 数据模型封装。
- 命令能力边界。
- 高风险操作的确认和审计思路。

不建议直接依赖：

- Skill 文件本身作为 AstrBot 或 d2-service 功能入口。
- 在 HTTP 请求中调用 d2-skill CLI 子进程。
- 依赖 d2-skill 的本地 `127.0.0.1` OAuth callback 体验。
- 依赖它的输出格式作为稳定 API。

如果某个能力确实值得复用，优先把思路或小段逻辑移植进 d2-service，并用自己的接口、数据库和日志系统承接。

## OAuth 绑定流程

群友发送：

```text
/绑定命运2
```

AstrBot 插件调用：

```http
POST http://d2-service:8080/api/v1/auth/start
```

请求体：

```json
{
  "platform": "qq",
  "group_id": "群ID",
  "user_id": "发送者ID"
}
```

d2-service 返回：

```json
{
  "ok": true,
  "reply_type": "text",
  "text": "请打开链接完成 Bungie 登录：https://你的域名/d2/auth/bungie?state=..."
}
```

群友在浏览器打开链接并登录 Bungie。Bungie 回调到：

```text
https://你的域名/d2/oauth/callback
```

d2-service 校验 `state`，保存绑定关系和 token：

```text
platform + user_id -> bungie_membership_id + access_token + refresh_token
```

`PUBLIC_BASE_URL` 建议统一配置为：

```text
https://你的域名/d2
```

反向代理需要明确一种模式：

- 剥离 `/d2` 前缀后转发给 d2-service。
- 或者 d2-service 自己挂载 `/d2` 路由前缀。

两者只能选一种，避免 OAuth callback URL 和实际服务路由不一致。

## 命令设计

### 阶段 1：公共查询

```text
/遗失区域
/老九
/商人
/武器 风险管理者
/perk 爆破专家
```

第一版公共查询建议从查询链路最稳定的命令开始。日报、周报可以放到后续，因为它们常常涉及更多活动轮换、供应商和缓存规则。

### 阶段 2：个人查询

```text
/绑定命运2
/解绑命运2
/角色
/装备
/仓库 风险管理者
/战绩
/最近活动
```

### 阶段 3：装备操作

```text
/转移 风险管理者 到 泰坦
/装备 伊邪那岐的重担
/锁定 风险管理者
/loadout 切换 日落
```

装备操作必须加二次确认，例如：

```text
将 风险管理者 从仓库转移到泰坦。确认执行请输入：/确认 4821
```

确认码短期有效，例如 60 秒。确认请求必须绑定发起人，不能让其他群友代确认。

## HTTP API 设计

公共查询：

```http
GET /api/v1/public/lost-sector
GET /api/v1/public/vendors
GET /api/v1/items/search?q=风险管理者
GET /api/v1/perks/search?q=爆破专家
```

账号绑定：

```http
POST /api/v1/auth/start
GET /api/v1/oauth/callback
POST /api/v1/auth/unbind
GET /api/v1/auth/status?platform=qq&user_id=...
```

个人查询：

```http
GET /api/v1/profile/characters?platform=qq&user_id=...
GET /api/v1/profile/equipment?platform=qq&user_id=...
GET /api/v1/profile/inventory/search?q=风险管理者&platform=qq&user_id=...
GET /api/v1/profile/activities/recent?platform=qq&user_id=...
```

装备操作：

```http
POST /api/v1/actions/transfer
POST /api/v1/actions/equip
POST /api/v1/actions/lock
POST /api/v1/actions/loadout
POST /api/v1/actions/confirm
```

健康检查和维护：

```http
GET /api/v1/health
GET /api/v1/admin/version
POST /api/v1/admin/manifest/refresh
```

统一返回格式建议：

```json
{
  "ok": true,
  "reply_type": "text",
  "text": "文本回复",
  "images": [],
  "requires_confirm": false,
  "confirm_token": null
}
```

失败时：

```json
{
  "ok": false,
  "error_code": "NOT_BOUND",
  "message": "你还没有绑定 Bungie 账号，请先发送 /绑定命运2"
}
```

`reply_type` 可选值：

```text
text
image
mixed
confirm
```

这样 AstrBot 插件只处理回复形态，不理解 Destiny 2 业务细节。

## 数据存储

6 人群使用规模不大，SQLite 足够。

建议表：

```text
schema_migrations
- version
- applied_at

users
- id
- platform
- group_id
- user_id
- display_name
- created_at
- updated_at

bungie_accounts
- id
- user_id
- membership_type
- membership_id
- display_name
- access_token_encrypted
- refresh_token_encrypted
- expires_at
- created_at
- updated_at

manifest_versions
- id
- version
- locale
- manifest_path
- indexed_at
- created_at

pending_actions
- id
- platform
- user_id
- action_type
- payload_json
- confirm_code
- expires_at
- created_at

operation_logs
- id
- platform
- group_id
- user_id
- action_type
- request_json
- result_json
- created_at
```

token 不建议明文保存。最少要把 `./d2-data` 放在 NAS 私有目录，最好再加应用级加密密钥：

```text
D2_TOKEN_ENCRYPTION_KEY
```

## 权限和安全

权限建议分层：

- 公共查询：所有群友可用。
- 个人查询：绑定用户可用。
- 装备操作：绑定用户可用，并且需要配置开关。
- 管理命令：群主或白名单可用。

装备操作默认关闭：

```yaml
enable_dangerous_actions: false
```

安全要求：

- OAuth `state` 必须随机且短期有效。
- OAuth callback 必须校验 `state`。
- token 刷新失败时提示用户重新绑定。
- 装备操作必须二次确认。
- 确认码只允许发起人使用。
- 所有写操作记录操作日志。
- 管理类 API 不能直接暴露到公网。

## 分阶段计划

### 阶段 0：部署骨架

目标：先跑通轻量部署和可覆盖更新。

范围：

- `docker-compose.yml`
- `d2-service` Node.js 22 HTTP 服务骨架
- `/api/v1/health`
- `./d2-service` 源码挂载
- `./d2-data` 数据持久化
- 启动脚本、依赖安装、日志目录

完成标志：

- `docker compose up -d` 后 AstrBot 和 d2-service 都能启动。
- 覆盖 `./d2-service` 后重启服务，`./d2-data` 不受影响。
- `/api/v1/health` 返回服务状态。

### 阶段 1：公共查询 MVP

目标：不用绑定账号也能给群友使用。

范围：

- AstrBot 插件命令解析。
- Bungie API Key 配置。
- Manifest 下载和中文索引。
- 遗失区域、商人、武器查询。

完成标志：

- 群里发送 `/遗失区域` 能返回当前信息。
- 群里发送 `/武器 风险管理者` 能返回武器基础信息。
- 服务重启后 Manifest 缓存仍可用。

### 阶段 2：账号绑定和个人查询

目标：每个群友都能绑定自己的 Bungie 账号。

范围：

- OAuth 登录链接。
- OAuth callback。
- token 保存和刷新。
- `/角色`
- `/装备`
- `/仓库 关键词`
- `/最近活动`

完成标志：

- 6 个群友可以分别绑定。
- 每个人查到的是自己的角色和装备。
- token 过期后能自动刷新。

### 阶段 3：装备操作

目标：支持有限的装备管理能力。

范围：

- 转移物品。
- 装备物品。
- 锁定物品。
- loadout 切换。
- 二次确认。
- 操作日志。

完成标志：

- 群友能安全完成转移和装备操作。
- 误触不会直接执行。
- 失败时能返回可理解的原因。

### 阶段 4：体验增强

目标：接近小日向式体验。

范围：

- 图片化日报。
- 武器卡片。
- perk 图标。
- 常用别名。
- 群友昵称绑定。
- 查询结果分页。

## 风险

主要风险：

- Bungie API 限流和服务不稳定。
- Manifest 数据较大，首次下载和索引耗时。
- 中文名搜索需要处理别名、繁简和模糊匹配。
- OAuth 回调需要 NAS 有可访问的域名或反向代理。
- 装备操作需要谨慎，避免群聊误触。
- 源码覆盖更新时误删 `./d2-data`。

规避方式：

- 公共查询优先做缓存。
- Manifest 定时更新，不在每次查询时下载。
- 装备操作默认关闭。
- 所有写操作必须二次确认。
- `./d2-service` 和 `./d2-data` 明确分离。
- d2-service 启动时检查数据目录和关键环境变量。
- 升级数据库只通过 migration。

## 依赖资料

- AstrBot 插件开发文档：https://docs.astrbot.app/dev/star/plugin-new.html
- AstrBot MCP 文档：https://docs.astrbot.app/use/mcp.html
- AstrBot Skills 文档：https://docs.astrbot.app/use/skills.html
- Bungie API 文档：https://bungie-net.github.io/multi/index.html
- d2-skill README：https://github.com/Lin-Guanguo/d2-skill/blob/main/README_zh.md

## 当前推荐决策

采用“HTTP sidecar 作为主通道”的设计：

```text
AstrBot 插件负责聊天体验，d2-service 负责 Destiny 2 业务。
```

d2-service 使用 `node:22-bookworm` 官方镜像运行自研 Node.js HTTP 服务，不单独构建业务镜像。代码通过 `./d2-service` 覆盖更新，数据通过 `./d2-data` 持久化保存。

`d2-skill` 只作为参考资料，不作为运行时强依赖。第一版先实现部署骨架和公共查询闭环；第二版再做绑定和个人查询；第三版再谨慎开放装备操作。
