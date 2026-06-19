# d2-service

d2-service 是一个面向 Windows 的本地 Destiny 2 中文助手。普通玩家下载绿色包后，解压、双击 `d2-service.exe` 就能使用，不需要安装 Node.js、Python、Docker，也不需要部署服务器。

项目目标是把 DIM、Light.gg、Today In Destiny、Destiny Tracker、Raid Report、小日向 Bot 和 `d2-skill` 里适合日常使用的能力，逐步整理成一个更傻瓜式的图形界面。`d2-skill` 只作为功能和安全思路参考，不照抄 CLI 使用方式；d2-service 的主入口始终是 GUI。

第一版采用 Windows x64 绿色包分发。用户配置、OAuth token、Manifest 缓存、仓库标签、备注、操作日志都保存在用户自己的电脑里，覆盖更新程序目录不会丢历史记录。

## 当前状态

当前发布基线为 `0.0.3`。这个版本是第一版公开测试基线，核心目标是让普通玩家能用 GUI 完成配置、登录、资料查询、仓库整理、今日信息查看、AI 分析和有限写操作。

`0.0.3` 已纳入的能力：

- Windows Electron + React 图形客户端。
- 首次启动配置引导，支持重新打开配置页并修改已保存配置。
- Bungie OAuth 登录，本地 HTTPS callback。
- OAuth token 本地保存和过期刷新。
- Destiny Manifest 初始化、本地缓存、中文物品搜索。
- 账号页：读取 Bungie 账号、角色、光等、当前装备、角色背包和材料数量；装备按位置分组。
- 一键最高光等：从当前角色已装备、角色背包和仓库中选出 8 个光等位置的最高光等装备，执行前二次确认。
- 仓库页：完整仓库列表、搜索、主分类、位置分段、位置筛选、弹药筛选、排序、锁定筛选、标签筛选、评分筛选和高级搜索语法。
- 仓库标签和备注：保留、关注、可清理、本地备注。
- DIM 式整理：同名装备分组、同名 roll 对比、重复装备建议、批量标记、清理清单复制。
- 清理模式：批量解锁、转移到角色背包；d2-service 不会直接分解装备，最终分解仍需进游戏完成。
- 物品详情：图标、类型、描述、实际 roll、perk/socket、锁定状态。
- 本地仓库评分和愿望单 MVP：根据稀有度、perk、锁定、标签和本地规则生成保留/关注/可清理建议。
- 今日/本周面板：每日重置、每周重置、Bungie 公开里程碑、商人和遗失区域基础信息；缺数据时会明确显示待接入。
- 活动摘要：近期 PVE/PVP 基础统计、Raid/Dungeon 完成次数和尝试次数。
- 本地 loadout 模板和转移计划。
- AI 配置和连接测试：支持 OpenAI 兼容接口、DeepSeek、自定义兼容接口。
- AI 分析：仓库深度建议、单件装备解读，输出分为事实、分析、建议和操作提醒。
- 分享文本：生成可复制到 QQ/微信的装备说明、清理清单和今日摘要。
- 写操作候选能力：锁定/解锁、装备、仓库转移。
- 写操作安全保护：本地开关、二次确认、Bungie 权限提示、操作日志。
- 交互反馈：登录、初始化、仓库批量操作和清理操作都有等待文案、禁用态和忙碌态提示。
- d2-skill 参考能力：`d2.*` 工具清单、AI 安全边界、工具审计日志、诊断脱敏和本地 HTTP 工具入口骨架。
- GitHub tag 自动构建 Windows `.7z` 绿色包并发布 Release。

`0.0.3` 之后继续增强的方向：

- DIM 方向：更细的 roll 对比、护甲属性组合、装备转移队列和更强批量规则。
- 小日向方向：更完整的商人库存、遗失区域、周报/掉落地图和图片化分享。
- d2-skill 方向：MCP server、HTTP 工具开关、自然语言查询转结构化查询。
- Raid Report / Destiny Tracker 方向：更完整的 Raid/Dungeon 进度、小队导入和复盘。

详细路线图见 [docs/ROADMAP.md](docs/ROADMAP.md)。

## 玩家使用说明

这一节是给普通玩家看的。你只需要会下载、解压、双击运行。

### 你需要准备什么

- 一台 Windows 电脑。
- 一个能正常登录 Bungie.net 的账号，也就是绑定 Steam、Epic、Xbox 或 PlayStation 的那个 Bungie 账号。
- 一个自己创建的 Bungie 开发者应用，用来生成 `API Key`、`Client ID`、`Client Secret`。

你不需要准备：

- 不需要服务器。
- 不需要 AstrBot、Hermes 或机器人框架。
- 不需要填写 Steam、Epic、Xbox、PlayStation 密码。
- 不需要把自己的 Bungie 配置发给作者或其他玩家。

### 第一步：下载并打开

1. 打开 GitHub Release 页面。
2. 下载 Windows 绿色包，文件名类似：

```text
d2-service-win-x64-0.0.3.7z
```

3. 用 7-Zip、Bandizip、WinRAR 等工具解压。
4. 解压到一个你找得到的位置，例如：

```text
D:\Apps\d2-service
```

5. 双击 `d2-service.exe`。

如果 Windows 弹出安全提醒：

- 如果是从项目 Release 下载的包，可以点“更多信息”，再点“仍要运行”。
- 如果来源不可信，不要运行。

### 第二步：创建 Bungie 应用

第一次使用需要去 Bungie 创建一个应用。这个应用不是游戏账号，也不是机器人账号，只是用来让 d2-service 调用 Bungie API。

1. 打开 [Bungie Application 页面](https://www.bungie.net/en/Application)。
2. 登录你的 Bungie 账号。
3. 点击创建应用，页面上可能叫 `Create New App`、`New Application` 或类似名字。
4. 按下面关系填写。

| Bungie 页面字段 | 建议填写 |
| --- | --- |
| Application Name | `d2-service`，也可以写你喜欢的名字 |
| Application Status | 个人使用选默认或私有状态即可 |
| Website | `https://127.0.0.1:28780`，如果不接受就填项目主页 |
| OAuth Client Type | `Confidential` |
| Redirect URL | `https://127.0.0.1:28780/oauth/callback` |
| Origin Header | 留空 |
| Scope | 见下面说明 |

Scope 勾选建议：

- 只查看账号、角色、装备和仓库：勾选 `ReadDestinyInventoryAndVault`。
- 如果要使用锁定、装备、仓库转移等写操作：额外勾选 `MoveEquipDestinyItems`。
- “装备最高光等”也属于写操作，需要 `MoveEquipDestinyItems` 和本地写操作开关。

写操作需要同时满足两件事：

- Bungie 应用里勾选了 `MoveEquipDestinyItems`，并且重新登录授权。
- d2-service 设置页里打开“写操作”本地开关。

这样设计是为了避免误触。就算 Bungie 授权了写权限，只要本地开关没打开，d2-service 也不会执行装备移动、装备、锁定这类操作。

### 第三步：填写 d2-service 配置

回到 d2-service 的首次启动配置页，按下面关系复制：

| d2-service 字段 | 从 Bungie 页面复制 |
| --- | --- |
| API Key | `API Key` |
| Client ID | `OAuth Client ID` 或 `Client ID` |
| Client Secret | `Client Secret` |
| Redirect URL | `https://127.0.0.1:28780/oauth/callback` |

注意：

- `Redirect URL` 必须和 Bungie 页面里一字不差。
- `Client Secret` 是 Bungie 应用的密钥，不是你的游戏账号密码。
- 公开发布包不会内置任何人的 `API Key`、`Client ID` 或 `Client Secret`。

### 第四步：登录 Bungie

1. 在 d2-service 里点击“登录 Bungie”。
2. 浏览器会打开 Bungie 授权页面。
3. 登录 Bungie 并同意授权。
4. 授权完成后，浏览器会跳回本机地址。
5. 回到 d2-service，看到登录成功后继续使用。

如果浏览器打开 `https://127.0.0.1:28780/oauth/callback` 后出现证书或隐私提醒：

- 这是因为 d2-service 在你的电脑上临时启动了本地 HTTPS 回调服务。
- 地址是 `127.0.0.1:28780`，表示访问的是你自己的电脑。
- 授权完成后回到 d2-service 查看状态即可。

如果登录后提示权限不足：

- 检查 Bungie 应用是否勾选了对应 Scope。
- 修改 Scope 后需要重新点击“登录 Bungie”，重新授权。

### 第五步：初始化资料库

1. 点击“初始化”。
2. 等待 Manifest 下载和缓存完成。
3. 成功后就能搜索装备、查看 perk、读取中文名称。

Manifest 是 Destiny 2 的物品资料库。它可以随时重建，不会影响登录状态和个人配置。

### 第六步：开始使用

你可以先测试这些功能：

- “账号”：查看角色、光等、当前装备和背包；需要冲光等时可以使用“装备最高光等”。
- “仓库”：查看完整仓库，按武器/护甲/装备分类，也可以按具体位置和弹药类型筛选。
- “资料库”：搜索中文或英文物品名，例如 `风险管理者` 或 `Riskrunner`。
- “物品详情”：查看实际 roll、perk、评分、标签、备注。
- “AI 助手”：先做本地分析；如果配置了 AI，再生成深度建议。
- “设置”：修改 Bungie 配置、AI 配置和写操作开关。

### 可选：配置 AI

AI 不是必填项。不配置 AI 时，d2-service 仍然可以登录 Bungie、读取账号、搜索装备、查看仓库和做本地分析。

如果要使用 AI 深度建议：

1. 打开“AI 助手”或“设置”里的 AI 配置。
2. 选择提供方：
   - `DeepSeek`
   - `OpenAI 兼容接口`
   - `自定义兼容接口`
3. 填写自己的 AI API Key。
4. 填写模型名。
5. 如果是自定义接口，填写类似：

```text
http://127.0.0.1:11434/v1
```

6. 点击保存并测试连接。

注意：

- AI 配置只保存在本机。
- AI 分析会把当前仓库摘要、实际 roll、本地标签等发送给你配置的 AI 服务。
- 如果不想把装备数据发给第三方模型，只使用本地分析即可。

## 写操作说明

d2-service 已经支持有限写操作，但默认关闭。

当前写操作包括：

- 锁定/解锁物品。
- 装备物品。
- 一键给指定角色装备最高光等武器和护甲。
- 从仓库取出到角色。
- 从角色移入仓库。

使用写操作前必须确认：

1. Bungie 应用 Scope 勾选了 `MoveEquipDestinyItems`。
2. 修改 Scope 后重新登录 Bungie。
3. 在 d2-service 设置页打开写操作开关。
4. 每次执行前确认弹窗内容。

d2-service 会把写操作结果记录到本机操作日志。AI 后续只能生成建议或计划，不能绕过确认自动执行写操作。

## 日常升级

绿色包升级不会删除你的登录状态和历史数据。

1. 关闭正在运行的 d2-service。
2. 下载新版 `.7z`。
3. 解压新版文件。
4. 覆盖旧的程序目录。
5. 重新打开 `d2-service.exe`。

本地用户数据默认保存到：

```text
%APPDATA%\d2-service
```

只要不删除这个目录，覆盖程序目录一般不会丢配置、token、Manifest 缓存、仓库标签、备注和操作日志。

## 常见问题

**打开是空白窗口怎么办？**

先确认使用的是最新绿色包。旧版本曾修复过打包后空白窗口的问题。

**点击登录没有反应怎么办？**

检查是否已经填写并保存 `API Key`、`Client ID`、`Client Secret` 和 `Redirect URL`。也可以关闭 d2-service 后重新打开再试。

**登录后提示 redirect 或 callback 错误怎么办？**

重点检查 Bungie 页面和 d2-service 里是不是都写成：

```text
https://127.0.0.1:28780/oauth/callback
```

常见错误是写成 `http`、少了 `s`、端口写错、路径写错，或者把 `127.0.0.1` 改成了 `localhost`。

**账号数据读取失败怎么办？**

确认 Bungie 应用 Scope 勾选了 `ReadDestinyInventoryAndVault`。如果刚刚修改过 Scope，需要重新登录 Bungie。

**写操作失败怎么办？**

确认 Bungie 应用 Scope 勾选了 `MoveEquipDestinyItems`，然后重新登录 Bungie。再确认 d2-service 设置页里的写操作开关已经打开。

**搜索不到装备怎么办？**

先点击“初始化”更新 Manifest。搜索时可以换中文名、英文名或装备名的一部分。

**可以把 API Key 和 Client Secret 发给别人吗？**

不要。每个玩家最好自己创建 Bungie 应用，自己填到本机。公开发布包也不会内置任何人的 Bungie 密钥。

## 下载和发布

普通玩家只需要到 GitHub Release 页面下载 Windows `.7z` 绿色包。

维护者发布新版本时：

1. 修改根目录 `package.json` 和 `packages/desktop/package.json` 版本号。
2. 提交代码。
3. 打 tag，tag 必须和版本号一致，例如：

```powershell
git tag v0.0.3
git push origin v0.0.3
```

GitHub Actions 会自动：

- 安装依赖。
- 运行测试。
- 运行类型检查。
- 构建 Windows x64 `.7z` 绿色包。
- 创建或更新 GitHub Release。
- 把 `.7z` 作为下载附件挂到 Release 上。

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

## 项目结构

```text
packages/core      Bungie API、OAuth、Manifest、账号、仓库、AI、写操作等核心能力
packages/desktop   Electron + React 图形客户端
packages/http      后续可复用的本地 HTTP 服务能力
docs               设计文档、阶段计划和路线图
```

## 设计原则

- 本地优先：用户配置、token、缓存、标签、日志都保存在本机。
- 不内置密钥：公开发布包不包含任何人的 Bungie API Key 或 Client Secret。
- GUI 优先：普通玩家打开就是完整图形界面。
- 能力复用：核心能力优先服务 GUI，后续可被 HTTP API、MCP 和 AI 复用。
- 写操作谨慎：默认关闭，需要 Bungie 权限、本地开关和二次确认。
- AI 不越权：AI 只能基于 d2-service 提供的事实做分析，不能直接读取 secret/token，也不能自动执行写操作。

## 参考方向

- [Bungie Application](https://www.bungie.net/en/Application)：创建 API Key、Client ID 和 Client Secret。
- [Bungie.Net API](https://bungie-net.github.io/multi/index.html)：Bungie 官方 API、OAuth 和 Scope 文档。
- [d2-skill](https://github.com/Lin-Guanguo/d2-skill)：功能能力、OAuth、Manifest、AI 分析和安全写操作思路参考，不照抄 CLI 形态。
- [命运2小日向 Bot](https://qun.qq.com/qunpro/robot/share?robot_appid=102076550)：中文 Bot 指令体验、日报、周报、遗失区域、商人售卖、武器 perk 查询参考。
- [DIM](https://app.destinyitemmanager.com)：仓库、装备移动、配装、loadout 体验参考。
- [Light.gg](https://www.light.gg/db/category/1/weapons/)：武器、perk、来源和推荐信息参考。
- [Today In Destiny](https://www.todayindestiny.com/)：每日/每周轮换内容参考。
- [Destiny Tracker](https://destinytracker.com/)：PVP / PVE 数据统计参考。
- [Raid Report](https://raid.report/)：Raid 记录和队伍复盘参考。
- [Destiny Sets](https://destinysets.com/)：赛季收藏和奖励追踪参考。
- [FTW Xur](https://ftw.in/game/destiny-2/find-xur)：老九位置和库存参考。

这些工具是产品体验和功能方向参考，d2-service 不复制它们的数据或页面。核心数据优先来自 Bungie 官方接口和用户本地授权。
