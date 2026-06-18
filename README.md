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

## 玩家使用说明

这一节是给普通玩家看的，不需要安装 Node.js、Python、Docker，也不需要会写代码。

### 你需要提前准备什么

- 一台 Windows 电脑。
- 一个能正常登录 Bungie.net 的账号，也就是你平时绑定 Steam、Epic、Xbox 或 PlayStation 的那个 Bungie 账号。
- 一个自己创建的 Bungie 开发者应用。这个应用只用来让 d2-service 读取你自己的 Destiny 2 数据。

不需要准备：

- 不需要服务器。
- 不需要 AstrBot、Hermes 或机器人框架。
- 不需要把账号密码交给 d2-service。
- 不需要把配置发给作者或其他玩家。

### 第一步：下载并打开

1. 下载 Windows 绿色包，文件名类似 `d2-service-win-x64-0.1.0.7z`。
2. 用 7-Zip、Bandizip、WinRAR 等工具解压。
3. 解压到一个你找得到的位置，例如：

```text
D:\Apps\d2-service
```

4. 打开解压后的文件夹。
5. 双击 `d2-service.exe`。

如果 Windows 弹出安全提醒：

- 如果是自己构建或可信来源下载的包，可以选择“更多信息”，再点“仍要运行”。
- 如果来源不可信，不要运行。

### 第二步：创建 Bungie 应用

第一次使用需要先到 Bungie 创建一个应用，用来拿到 `API Key`、`Client ID` 和 `Client Secret`。

1. 打开 [Bungie Application 页面](https://www.bungie.net/en/Application)。
2. 登录你的 Bungie 账号。
3. 找到创建应用的位置，通常是 `Create New App`、`New Application` 或类似按钮。
4. 按下面表格填写。

| 页面字段 | 建议填写 |
| --- | --- |
| Application Name | `d2-service`，也可以写你喜欢的名字 |
| Application Status | 个人使用选默认或私有状态即可 |
| Website | `https://127.0.0.1:28780`，如果页面不接受，就填项目主页或你自己的说明页 |
| OAuth Client Type | `Confidential` |
| Redirect URL | `https://127.0.0.1:28780/oauth/callback` |
| Origin Header | 留空 |
| Scope | 勾选 `ReadDestinyInventoryAndVault` |

Scope 说明：

- 第一版只读账号、角色、装备和仓库，必须勾选 `ReadDestinyInventoryAndVault`。
- 如果页面显示的是中文或描述文字，大意会是“读取 Destiny 物品栏和仓库”。
- 暂时不要勾选写入类权限。以后支持移动、装备、锁定物品时，再考虑 `MoveEquipDestinyItems`。

5. 保存应用。
6. 保存后页面会显示 `API Key`、`OAuth Client ID`、`Client Secret` 等信息。
7. 不要关闭这个页面，下一步要复制这些值。

### 第三步：填写 d2-service 配置

回到 d2-service 窗口，在首次启动配置页填写：

| d2-service 字段 | 从 Bungie 页面复制 |
| --- | --- |
| API Key | `API Key` |
| Client ID | `OAuth Client ID` 或 `Client ID` |
| Client Secret | `Client Secret` |
| Redirect URL | `https://127.0.0.1:28780/oauth/callback` |

填完后点击“保存配置”。

注意：

- `Redirect URL` 必须一字不差，尤其是 `https`、端口 `28780`、路径 `/oauth/callback`。
- `Client Secret` 是 Bungie 应用的密钥，不是你的游戏账号密码。
- d2-service 不会要求你输入 Steam、Epic、Xbox 或 PlayStation 密码。

### 第四步：登录 Bungie

1. 在 d2-service 首页点击“登录 Bungie”。
2. 浏览器会自动打开 Bungie 授权页面。
3. 登录 Bungie，并同意授权。
4. 授权完成后，浏览器会跳回本机地址。
5. 回到 d2-service，看到“Bungie 登录成功”就可以继续。

如果浏览器打开 `https://127.0.0.1:28780/oauth/callback` 后显示证书或隐私提醒：

- 这是因为 d2-service 在你的电脑上临时启动了本地 HTTPS 回调服务。
- 只要地址确实是 `127.0.0.1:28780`，这表示它在访问你自己的电脑。
- 授权成功后可以直接回到 d2-service 查看状态。

### 第五步：初始化资料库

1. 在 d2-service 首页点击“初始化”。
2. 等待 Manifest 下载和缓存完成。
3. 成功后会显示资料库版本。

Manifest 是 Destiny 2 的物品资料库。搜索装备、显示 perk、展示中文名称都依赖它。

### 第六步：开始使用

现在可以测试这些功能：

- 点击“读取账号数据”：查看当前账号、角色、光等、装备分组和仓库预览。
- 在“物品搜索”里输入装备中文名或英文名，例如 `风险管理者` 或 `Riskrunner`。
- 点击装备卡片或搜索结果，查看物品详情和 perk 信息。
- 点击“去配置”：可以重新查看和修改之前保存的 Bungie 配置。

### 日常升级

绿色包升级不会删除你的登录状态和历史数据。

1. 关闭正在运行的 d2-service。
2. 下载新版 ZIP。
3. 解压新版文件。
4. 覆盖旧的程序目录。
5. 重新打开 `d2-service.exe`。

本地用户数据保存在：

```text
%APPDATA%\d2-service
```

只要不删除这个目录，覆盖程序一般不会丢配置、token、Manifest 缓存和后续历史数据。

### 常见问题

**打开是空白窗口怎么办？**

先确认你用的是最新绿色包。旧版本曾修复过打包后空白窗口的问题。

**点击登录没反应怎么办？**

检查是否已经填写并保存 `API Key`、`Client ID`、`Client Secret` 和 `Redirect URL`。还可以关闭 d2-service 后重新打开再试。

**登录后提示 redirect 或 callback 错误怎么办？**

重点检查 Bungie 页面和 d2-service 里是不是都写成：

```text
https://127.0.0.1:28780/oauth/callback
```

常见错误是写成了 `http`、少了 `s`、端口写错、路径写错，或者用了 `localhost`。

**账号数据读取失败怎么办？**

确认 Bungie 应用 Scope 勾选了 `ReadDestinyInventoryAndVault`。这个权限是读取 Destiny 2 私有数据所需的读取权限。

**搜索不到装备怎么办？**

先点“初始化”更新 Manifest。搜索时可以换中文名、英文名或装备名的一部分。

**我可以把自己的 API Key 和 Client Secret 发给别人吗？**

不要。每个玩家自己创建应用、自己填写到本机最安全。公开发包也不要内置任何人的 Bungie 密钥。

## 快速检查清单

1. 下载 Windows 绿色包。
2. 解压 ZIP 到任意目录，例如 `D:\Apps\d2-service`。
3. 双击运行 `d2-service.exe`。
4. 按首次启动向导填写 Bungie 应用配置。
5. 点击“登录 Bungie”完成授权。
6. 点击“初始化”下载 Manifest 数据。
7. 读取账号数据或搜索装备。

## Bungie 应用配置

公开分发版本不会内置 `API Key`、`Client ID` 或 `Client Secret`。每个用户需要自己在 Bungie 开发者页面创建应用，然后把参数填到本机客户端里。这样做虽然多一步，但可以避免公开包泄露密钥，也更适合长期分发。

Bungie 官方文档说明，API 请求需要使用应用页面生成的 `X-API-Key`；需要用户授权的请求走 OAuth；如果设置了 Redirect URL，授权请求里的地址必须和应用里登记的地址匹配。

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

## 下载和发布

普通玩家只需要去 Release 页面下载绿色包：

- GitHub Release：适合能正常访问 GitHub 的玩家。
- Gitee Release：适合 GitHub 下载慢的玩家。

维护者发布新版本时，构建产物统一使用 `.7z`。Gitee 普通项目发行版单个附件有 100M 限制，当前 Electron 绿色包用 `.zip` 会超过限制，用 `.7z` 可以压到 100M 以下。

GitHub Release 已配置 GitHub Actions 自动上传 `.7z`：

1. 在 `package.json` 和 `packages/desktop/package.json` 里把版本号改成同一个值，例如 `0.1.1`。
2. 提交代码。
3. 打 tag，tag 必须和版本号一致，例如：

```powershell
git tag v0.1.1
git push origin v0.1.1
```

4. GitHub Actions 会自动执行：

- 安装依赖。
- 运行测试。
- 运行类型检查。
- 构建 Windows x64 `.7z` 绿色包。
- 上传到 GitHub Release。

Gitee 优先使用官方发行版页面发布：

1. 先同步代码和 tag 到 Gitee。

```powershell
git push gitee codex/phase-0-local-gui-bootstrap
git push gitee v0.1.1
```

2. 打开 Gitee 仓库右侧“发行版”，点击“创建”。
3. 选择对应 tag，例如 `v0.1.1`。
4. 标题填写 `d2-service v0.1.1`。
5. 上传本地构建出的 `.7z` 文件。
6. 保存发行版。

如果希望 Gitee 上的源码分支也同步更新，平时合并代码后再执行：

```powershell
git push origin main
git push gitee main
```

Release 文件名类似：

```text
d2-service-win-x64-0.1.1.7z
```

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
packages/desktop/release/d2-service-win-x64-0.1.0.7z
```

## 项目结构

```text
packages/core      Bungie API、OAuth、Manifest、账号和物品能力
packages/desktop   Electron + React 图形客户端
packages/http      后续可复用的本地 HTTP 服务能力
docs               阶段计划和设计文档
```

## 参考方向

- [Bungie Application](https://www.bungie.net/en/Application)：创建 API Key、Client ID 和 Client Secret。
- [Bungie.Net API](https://bungie-net.github.io/multi/index.html)：Bungie 官方 API、OAuth 和 Scope 文档。
- [d2-skill](https://github.com/Lin-Guanguo/d2-skill)：AI 工具化和 Bungie OAuth 思路参考。
- [DIM](https://app.destinyitemmanager.com)：仓库、装备移动、配装体验参考。
- [Light.gg](https://www.light.gg/db/category/1/weapons/)：武器、perk、来源和推荐信息参考。
- [Today In Destiny](https://www.todayindestiny.com/)：每周活动、轮换内容参考。
- [Destiny Tracker](https://destinytracker.com/)：PVP / PVE 数据统计参考。
- [Raid Report](https://raid.report/)：Raid 记录和队伍复盘参考。
- [Destiny Sets](https://destinysets.com/)：赛季收藏和奖励追踪参考。
- [FTW Xur](https://ftw.in/game/destiny-2/find-xur)：老九位置和库存参考。

这些工具是产品体验和功能方向参考，d2-service 不复制它们的数据或页面，核心数据优先来自 Bungie 官方接口和用户本地授权。
