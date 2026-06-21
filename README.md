# d2-tools

d2-tools 是一个面向 Windows 玩家、本地运行的 Destiny 2 中文桌面助手。它不是去复制某一个现成网站，而是把 DIM、命运之小日向 Bot、d2-skill、Light.gg、Today In Destiny、Raid Report、Destiny Tracker、D2Checkpoint 这些方向里适合日常使用的能力，整理成一个更适合普通玩家的图形界面。

你不需要安装 Node.js、Python、Docker，也不需要部署服务端。下载绿色包、解压、双击 `d2-tools.exe` 就能用。

## 适合谁

- 想用中文界面查看 Destiny 2 账号、仓库、装备和材料的玩家
- 想整理仓库、标记可清理装备、做同名 roll 对比的玩家
- 想用 AI 基于自己账号数据做分析，但不想把工具做成命令行的玩家
- 愿意自己创建 Bungie Application 并填写到本机配置里的玩家

## 下载与运行

当前公开测试版本：`0.0.4`

Windows x64 绿色包：

```text
d2-tools-win-x64-0.0.4.7z
```

解压后直接打开：

```text
d2-tools.exe
```

程序的本地数据默认保存在：

```text
%APPDATA%\d2-tools
```

这里会保存你的本地配置、Bungie OAuth token、Manifest 缓存、仓库标签、备注和操作日志。覆盖升级程序目录时，这些数据不会被自动删除。

如果你以前用过旧项目名 `d2-service`，首次运行新版本时会自动把旧数据目录复制到 `%APPDATA%\d2-tools`。程序不会删除旧目录，确认新版本正常后再决定是否手动清理。

## 三分钟快速开始

1. 下载并解压绿色包。
2. 按 [Bungie 配置指南](docs/bungie-setup.md) 创建你自己的 Bungie Application。
3. 打开 d2-tools，在首次引导或设置页填写 `API Key`、`Client ID`、`Client Secret`。
4. 点击“登录 Bungie”，在浏览器里完成授权。
5. 点击“初始化资料库”，下载 Destiny Manifest。
6. 回到软件开始查看账号、仓库、资料库、今日 / 本周和 AI 助手。

## 核心功能

- 账号：读取角色、光等、当前装备、背包、邮政官和材料摘要
- 仓库：按武器、护甲、装备、位置、子弹、评分、锁定状态和本地标签筛选
- DIM 风格整理：同名装备对比、重复组建议、批量候选选择、清理清单、游戏内定位提示
- 写操作：锁定、解锁、装备、仓库转移、一键装备最高光等
- 资料库：按中文、英文、perk、别名搜索 Manifest 里的物品和 perk
- 今日 / 本周：只展示 Bungie API 或本地资料库能确认的内容
- AI 助手：支持 OpenAI Responses、OpenAI Chat Completions、OpenAI 兼容接口和 Anthropic Claude
- 本地优先：配置、token、标签、备注和日志保存在本机

## 文档导航

玩家常用：

- [玩家使用指南](docs/user-guide.md)
- [Bungie 配置指南](docs/bungie-setup.md)
- [常见问题](docs/faq.md)
- [安全说明](docs/security.md)

项目状态：

- [项目状态](docs/project-status.md)
- [路线图](docs/roadmap.md)
- [更新日志](CHANGELOG.md)

开发者：

- [开发说明](docs/development.md)

## 安全边界

- 公开分发包不内置任何人的 Bungie `API Key`、`Client ID` 或 `Client Secret`
- 每个玩家都使用自己的 Bungie Application
- OAuth token 只保存在本机数据目录
- AI 不读取、也不发送 token、`Client Secret` 或 Bungie `API Key`
- 写操作默认关闭，需要 Bungie Scope、本地开关和确认流程
- d2-tools 不会直接分解装备，最终分解仍需进入游戏手动完成

更完整的边界说明见 [安全说明](docs/security.md)。

## 参考方向

- [DIM](https://app.destinyitemmanager.com/)：仓库、装备移动、loadout 体验参考
- [命运之小日向 Bot](https://qun.qq.com/qunpro/robot/share?robot_appid=102076550)：中文日报、周报、遗失区域和商人摘要体验参考
- [d2-skill](https://github.com/Lin-Guanguo/d2-skill)：OAuth、Manifest、AI、安全写操作和工具接口参考
- [Bungie.Net API](https://bungie-net.github.io/multi/index.html)：官方 API、OAuth 和 Scope 文档
- [Light.gg](https://www.light.gg/db/category/1/weapons/)：武器、perk、来源和推荐信息参考
- [Today In Destiny](https://www.todayindestiny.com/)：每日 / 每周轮换内容参考
- [Destiny Tracker](https://destinytracker.com/)：PVP / PVE 统计方向参考
- [Raid Report](https://raid.report/)：Raid 记录和复盘方向参考
- [D2Checkpoint](https://d2checkpoint.com/)：checkpoint 获取、保存流程和入口体验参考

这些项目只作为产品能力边界和交互方向参考。d2-tools 的核心数据优先来自 Bungie 官方接口、Destiny Manifest 和用户自己的本地授权数据。

## 开发

一键本地打包（install + 测试 + 类型检查 + 打包）：

```powershell
powershell -File scripts/local-package.ps1
```

如需分步执行：

```powershell
npx pnpm@9.15.0 install      # 安装依赖
npx pnpm@9.15.0 test          # 运行测试
npx pnpm@9.15.0 typecheck     # 类型检查
npx pnpm@9.15.0 package:win   # 仅打包
```

更多开发和发布细节见 [开发说明](docs/development.md)。
