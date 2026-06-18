# d2-service

d2-service 是一个面向 Windows 的本地 Destiny 2 助手客户端。它的目标是把 DIM、Light.gg、Today In Destiny、Destiny Tracker、Raid Report 等常用工具里最适合日常使用的能力，做成一个打开即用的中文图形界面，并在后续接入 AI 分析能力。

第一版采用绿色包分发：下载 ZIP、解压、运行 `d2-service.exe`。配置、OAuth token、Manifest 缓存和历史数据都保存在用户自己的电脑里，覆盖更新程序目录不会丢失本地数据。

## 当前状态

已实现：

- 首次启动配置引导，支持重新打开并修改已保存配置。
- Bungie OAuth 登录，回调地址使用本地 HTTPS。
- Destiny Manifest 初始化和本地缓存。
- 物品搜索，支持中文/英文名称和 perk 信息预览。
- 账号摘要，读取 Bungie 账号、角色、光等、装备分组和仓库预览。
- 物品详情弹窗，展示图标、类型、描述、perk/socket 信息。
- Windows x64 绿色包构建。

计划中：

- 仓库完整列表、筛选、排序和标签。
- 装备详情增强，展示来源、perk 组合、收藏状态和推荐说明。
- AI 装备分析、perk 解读、配装建议和每周内容摘要。
- DIM 方向：移动、装备、锁定物品等操作能力。
- Light.gg 方向：perk 数据、获取来源、热门推荐。
- Today In Destiny / 老九方向：每周轮换、商人库存、遗失区域。
- Destiny Tracker / Raid Report 方向：PVP、PVE、Raid 记录和队伍复盘。

## 快速开始

1. 下载 Windows 绿色包。
2. 解压 ZIP 到任意目录，例如 `D:\Apps\d2-service`。
3. 双击运行 `d2-service.exe`。
4. 按首次启动向导填写 Bungie 应用配置。
5. 点击“登录 Bungie”完成授权。
6. 点击“初始化”下载 Manifest 数据。
7. 读取账号数据或搜索装备。

绿色包升级方式：

1. 关闭正在运行的 d2-service。
2. 下载新版 ZIP。
3. 解压覆盖旧的程序目录。
4. 重新打开 `d2-service.exe`。

本地用户数据不会放在程序目录，而是保存在：

```text
%APPDATA%\d2-service
```

## Bungie 应用配置

公开分发版本不会内置 `API Key`、`Client ID` 或 `Client Secret`。每个用户需要自己在 Bungie 开发者页面创建应用，然后把参数填到本机客户端里。这样做虽然多一步，但可以避免公开包泄露密钥，也更适合长期分发。

创建 Bungie App 时建议这样填：

- Application Status: 任意可用状态，个人使用一般保持默认即可。
- OAuth Client Type: `Confidential`。
- Redirect URL: `https://127.0.0.1:28780/oauth/callback`
- Origin Header: 可以留空。
- Scope: 第一版至少需要读取账号和仓库相关权限；后续如果支持移动、装备、锁定物品，需要再增加对应写入权限。

客户端里需要填写：

- `API Key`: Bungie 应用页面提供的 API Key。
- `Client ID`: Bungie 应用页面提供的 OAuth Client ID。
- `Client Secret`: Bungie 应用页面提供的 OAuth Client Secret。

注意：

- 回调地址必须和 Bungie 应用页面完全一致，包括 `https`、端口和路径。
- `Client Secret` 不和 Destiny 账号绑定，它属于 Bungie 开发者应用。
- 不要把自己的 `Client Secret` 发到公开仓库、群聊截图或 issue 里。

## AI 能力方向

d2-service 会参考 `d2-skill` 这类工具的思路，但不会强依赖 AstrBot、Hermes 或中心服务。默认形态是本地 Windows 客户端，AI 配置也保存在用户自己的电脑里。

后续 AI 功能会优先做这些场景：

- 根据当前角色和仓库，解释装备强度、perk 组合和适用玩法。
- 给出 PVE / PVP 配装建议。
- 把复杂物品说明翻译成更容易理解的中文。
- 总结每周商人、活动、突袭和地牢重点。
- 生成可复制给朋友的装备、Raid 或活动摘要。

## 数据和安全

d2-service 的设计原则是本地优先：

- 配置文件、OAuth token、Manifest 缓存和日志保存在 `%APPDATA%\d2-service`。
- 绿色包覆盖更新只替换程序文件，不删除本地数据。
- 项目仓库不应提交 `.env`、`config.json`、token、数据库、日志或 release 包。
- 公开发布时不要把任何个人 Bungie App 密钥打进安装包。

如果后续要做更傻瓜式的大规模分发，可以再评估“官方统一应用 + 安全授权服务”的方案；第一版先保持本地配置，风险最低，也方便快速迭代。

## 开发

安装依赖：

```powershell
npx pnpm@9.15.0 install
```

运行测试：

```powershell
npx pnpm@9.15.0 test
```

类型检查：

```powershell
npx pnpm@9.15.0 typecheck
```

开发模式运行图形界面：

```powershell
npx pnpm@9.15.0 --filter @d2-service/desktop dev
```

另开一个终端：

```powershell
npx pnpm@9.15.0 --filter @d2-service/desktop build
npx pnpm@9.15.0 --filter @d2-service/desktop dev:electron
```

构建 Windows 绿色包：

```powershell
npx pnpm@9.15.0 package:win
```

构建产物会输出到：

```text
packages/desktop/release/d2-service-win-x64-0.1.0.zip
```

## 项目结构

```text
packages/core      Bungie API、OAuth、Manifest、账号和物品能力
packages/desktop   Electron + React 图形客户端
packages/http      后续可复用的本地 HTTP 服务能力
docs               阶段计划和设计文档
```

## 参考方向

- [d2-skill](https://github.com/Lin-Guanguo/d2-skill)：AI 工具化和 Bungie OAuth 思路参考。
- [DIM](https://app.destinyitemmanager.com)：仓库、装备移动、配装体验参考。
- [Light.gg](https://www.light.gg/db/category/1/weapons/)：武器、perk、来源和推荐信息参考。
- [Today In Destiny](https://www.todayindestiny.com/)：每周活动、轮换内容参考。
- [Destiny Tracker](https://destinytracker.com/)：PVP / PVE 数据统计参考。
- [Raid Report](https://raid.report/)：Raid 记录和队伍复盘参考。
- [Destiny Sets](https://destinysets.com/)：赛季收藏和奖励追踪参考。
- [FTW Xur](https://ftw.in/game/destiny-2/find-xur)：老九位置和库存参考。

这些工具是产品体验和功能方向参考，d2-service 不复制它们的数据或页面，核心数据优先来自 Bungie 官方接口和用户本地授权。
