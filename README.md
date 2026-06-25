# d2-tools

d2-tools 是一个给普通玩家使用的、面向 Windows 的 Destiny 2 中文桌面工具。

它把账号查看、仓库整理、资料库搜索、今日 / 本周信息和 AI 辅助整合到一个本地运行的桌面客户端里，尽量减少你在多个网站、网页工具和零散信息源之间来回切换的成本。

- 中文界面，优先面向普通玩家而不是开发者
- Windows 本地运行，不需要自己部署服务
- 账号、仓库、资料库、今日 / 本周、AI 一体化
- 配置、OAuth token、标签和本地数据保存在本机
- 基于 Bungie 官方授权流程，不走第三方账号中转

## 下载与运行

当前公开测试版本和下载入口请查看 [GitHub Releases](https://github.com/sandrewzq/d2-tools/releases)。

系统要求：Windows x64；首次使用需要按 [Bungie 配置指南](docs/bungie-setup.md) 创建并填写自己的 Bungie Application。

Windows x64 安装器：

```text
d2-tools-setup-<version>.exe
```

你不需要安装 Node.js、Python、Docker，也不需要手动部署服务。下载安装器并运行，按向导完成安装后即可开始使用。

程序的本地数据默认保存在：

```text
%APPDATA%\d2-tools
```

这里会保存你的本地配置、Bungie OAuth token、Manifest 缓存、仓库标签、备注和操作日志。安装或更新程序时，这些数据不会被自动删除。

如果你以前用过旧项目名 `d2-service`，首次运行新版本时会自动把旧数据目录复制到 `%APPDATA%\d2-tools`。程序不会删除旧目录，确认新版本正常后再决定是否手动清理。

## 适合谁

- 想用中文界面查看 Destiny 2 账号、仓库、装备和材料的玩家
- 想整理仓库、标记可清理装备、做同名 roll 对比的玩家
- 想在一个工具里同时处理账号、资料库、今日 / 本周和 AI 分析的玩家
- 愿意自己创建 Bungie Application 并填写到本机配置里的玩家

## 三分钟快速开始

1. 下载安装器并运行。
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
- AI 助手：支持 OpenAI Responses、OpenAI Chat Completions 和 Anthropic Messages 三种协议配置
- 本地优先：配置、token、标签、备注和日志保存在本机

## 文档导航

玩家常用：

- [玩家使用指南](docs/user-guide.md)
- [Bungie 配置指南](docs/bungie-setup.md)
- [常见问题](docs/faq.md)
- [安全说明](docs/security.md)
- [支持与反馈](SUPPORT.md)

如果你遇到使用问题，建议先看 FAQ、Bungie 配置指南和支持文档；如果涉及敏感信息、凭据或安全边界，请改看 [安全策略](SECURITY.md)。

项目状态：

- [当前待办](docs/todo.md)
- [更新日志](CHANGELOG.md)

开发者：

- [开发说明](docs/development.md)
- [贡献指南](CONTRIBUTING.md)
- [安全策略](SECURITY.md)

## 安全边界

- 公开分发包不内置任何人的 Bungie `API Key`、`Client ID` 或 `Client Secret`
- 每个玩家都使用自己的 Bungie Application
- OAuth token 只保存在本机数据目录
- AI 不读取、也不发送 token、`Client Secret` 或 Bungie `API Key`
- 写操作默认关闭，需要 Bungie Scope、本地开关和确认流程
- d2-tools 不会直接分解装备，最终分解仍需进入游戏手动完成

更完整的边界说明见 [安全说明](docs/security.md)。

## 参考方向

这些项目只作为产品能力边界和交互方向参考。d2-tools 的核心数据优先来自 Bungie 官方接口、Destiny Manifest 和用户自己的本地授权数据。后续开发新功能时，可回顾这些参考工具的能力全集寻找灵感。

### [DIM](https://app.destinyitemmanager.com/)

Destiny 2 最强装备管理工具，网页端运行。核心能力：

- **仓库管理**：按武器/护甲/分类/位置/弹药/属性筛选，自由拖拽移动装备
- **同名装备对比**：自动检测重复装备，展示每件的 perk / 属性差异
- **Loadout 系统**：创建、保存、一键装备配装方案，支持 DIM 链接分享
- **愿望单（Wishlist）**：导入社区维护的 god roll 表格，仓库中自动标记命中装备
- **护甲优化器**：设定目标属性组合（如双百韧性恢复），自动从仓库中选出最优搭配
- **清算模式**：批量标记垃圾装备，生成清理清单辅助游戏内删除
- **进度追踪**：赛季等级、里程碑、悬赏、催化进度一览
- **农业模式**：自动将特定物品转入仓库，保持角色背包整洁

### [D2ArmorPicker](https://d2armorpicker.com/)

专业的护甲属性优化工具。核心能力：

- **属性优化**：设定目标属性组合（如韧性100、恢复100），自动计算仓库中所有护甲的最优搭配
- **模组支持**：可指定已拥有的模组，优化结果计入模组加成
- **异域锁定**：指定某件异域护甲后，围绕它优化其余五件
- **结果排序**：按总属性点数、浪费点数等排序，支持多方案对比
- **子类加成**：计入碎片（fragment）的属性加成

### [Destiny Recipes](https://destinyrecipes.com/)

综合性 Destiny 2 辅助工具集。核心能力：

- **清单（Checklist）**：赛季挑战、周常里程碑、催化任务等进度总览
- **光等进度**：可视化当前光等提升路径，显示每个栏位的最优掉落来源
- **战利品伴侣**：活动结束后弹窗提示是否保留刚获得的 roll
- **仓库清理（Vault Cleaner）**：按社区推荐批量标记可清理装备

### [Bray.tech](https://bray.tech/)

账号全貌查看器。核心能力：

- **收藏品追踪**：按类别查看武器/护甲/模组/催化剂的收集进度
- **地图与检查点**：查看各目的地的可收集物品、地区宝箱、遗失区域
- **里程碑总览**：当前所有可完成的里程碑和悬赏一览
- **赛季回顾**：赛季等级、神器进度、赛季挑战完成情况
- **活动记录**：最近的 Raid / Dungeon / PVP 活动历史

### [Destiny Sets](https://destinysets.com/)

装备收集追踪工具。核心能力：

- **按赛季/活动分类**：每个赛季的阵营任务和对应奖励一览
- **护甲套装**：各职业的赛季护甲、Raid 护甲、试炼护甲等收集进度
- **武器列表**：按活动来源列出所有可收集武器
- **催化与模组**：催化剂和战斗风格模组的获取方式追踪

### [d2-skill](https://github.com/Lin-Guanguo/d2-skill)

面向开发者的 Python CLI 工具，d2-tools 的 OAuth / Manifest / AI 实现参考了其架构。核心能力：

- **OAuth 登录**：完整的 Bungie OAuth 流程，本地 HTTPS callback 获取 token
- **Manifest 管理**：下载、解析、缓存 Destiny Manifest 关系型数据库
- **物品搜索**：按中文名、英文名、perk、别名搜索所有物品定义
- **AI 分析**：基于玩家真实账号数据，调用 LLM 分析仓库、推荐装备、解读 perk
- **愿望单集成**：解析 DIM 格式 wishlist，本地匹配仓库中的装备
- **写操作框架**：锁定/解锁/转移/装备，有安全边界和确认流程
- **工具接口**：留出 HTTP API 和 MCP server 扩展能力

### [命运之小日向 Bot](https://qun.qq.com/qunpro/robot/share?robot_appid=102076550)

QQ 群机器人，面向中文玩家的日报 / 周报推送。核心能力：

- **每日摘要**：今日遗失区域、突袭轮换、商人库存、活动列表
- **周报**：本周夜fall、试炼地图、赛季活动、双倍奖励轮换
- **商人详情**：Xur、枪匠、艾达、圣人、拉乎尔等常用商人的具体售卖物品和属性
- **掉落查询**：按武器名查询掉落来源、活动、perk 池
- **指令交互**：通过 QQ 消息指令查询装备、统计、活动信息

### [Light.gg](https://www.light.gg/)

Destiny 2 最全面的武器数据库和社区投票平台。核心能力：

- **武器数据库**：所有武器的完整 perk 池、来源、获取方式、分类浏览
- **God Roll 推荐**：社区投票选出每种武器的最佳 PVE / PVP perk 组合
- **装备评分**：社区对每件装备的评分和评论
- **个人库存**：关联 Bungie 账号后查看自己每件装备的 roll 质量
- **排行榜**：玩家使用率、击杀数等统计数据
- **资料库搜索**：按武器类型、弹药、赛季、来源等多维度筛选

### [D2 Gunsmith](https://d2gunsmith.com/)

武器 perk 模拟与预览工具。核心能力：

- **Perk 模拟**：选择任意武器和 perk 组合，预览实战属性数值（射程、稳定性、操控性等）
- **God Roll 对比**：同时配置多个 roll 方案，并排对比数值差异
- **Perk 池浏览**：查看任意武器的完整 perk 池，含推荐组合标记
- **无账号需求**：无需登录 Bungie，纯粹的前端模拟

### [destiny.report](https://destiny.report/)

武器数据库与 perk 反向搜索引擎。核心能力：

- **Perk 反向搜索**：选择一个 perk（如 Incandescent），找出所有可刷出该 perk 的武器
- **多条件组合筛选**：支持来源（Raid / 纪念碑 / 锻造）、制造商、属性、赛季等多维筛选
- **勇士反制标注**：每把武器标注当前赛季的 Anti-Barrier / Unstoppable / Overload 属性
- **实时更新**：标注每次更新中新增或改动的武器
- **双视图**：列表视图和平铺视图

### [Engram](https://engram.blue/)

综合性 Destiny 2 工具。核心能力：

- **武器制作**：武器图案（pattern）管理，追踪制作进度和解锁条件
- **Perk 分析**：查看武器的完整 perk 池和推荐组合
- **账号集成**：支持 Bungie 登录，读取个人库存

### [Today In Destiny](https://www.todayindestiny.com/)

每日 / 每周轮换信息的可视化呈现。核心能力：

- **每日总览**：遗失区域（含掉落护甲部位）、传奇 / 大师难度、地图
- **每周总览**：突袭 / 地牢轮换、夜fall、试炼地图、赛季挑战
- **商人库存**：显示商人当前售卖的具体物品列表
- **活动时间线**：以时间轴展示当天各项活动的起止时间
- **进度追踪**：赛季等级、光等提升路径的可视化

### [Destiny Tracker](https://destinytracker.com/)

PVP / PVE 玩家统计和排行榜。核心能力：

- **玩家档案**：总游戏时长、击杀/死亡、胜率、光等历史
- **PVP 详细统计**：各模式的 KD、ELO、胜率、武器使用率
- **PVE 统计**：Raid 完成次数、最快通关时间、击杀数
- **排行榜**：全球 / 好友排名，按模式/赛季筛选
- **比赛历史**：最近场次的详细数据（地图、队伍、个人表现）

### [Raid Report](https://raid.report/)

专精 Raid / Dungeon 记录的复盘工具。核心能力：

- **Raid 记录**：每个 Raid 的完成次数、最快通关时间、全程无 wipe 标记
- **Dungeon 记录**：Solo / Flawless 完成标识，详细通关历史
- **队友视角**：查看任意队伍成员的完整 Raid 记录
- **赛季回顾**：本季各 Raid 的活跃度、首通、效率统计
- **全球排行榜**：速度排名、完成总数排名

### [D2Checkpoint](https://d2checkpoint.com/)

Checkpoint 共享和获取平台。核心能力：

- **Checkpoint 浏览**：按 Raid / Dungeon / Boss 分类查找当前可用的 checkpoint
- **一键加入**：复制 `/join` 指令，在游戏中快速加入 checkpoint 持有者的火力战队
- **Checkpoint 提交**：玩家可提交自己持有的 checkpoint 供社区使用
- **Boss 专属**：支持直接跳转到指定 Boss（如 Templar、Atheon）的 checkpoint

### 数据基础设施

- [Bungie.Net API](https://bungie-net.github.io/multi/index.html)：官方 REST API 文档，涵盖 OAuth 认证、账号读取、物品操作、活动历史、商人库存等全部接口。d2-tools 不通过任何第三方中转，直接基于此文档实现 Bungie 通信。

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

## License

本项目基于 [MIT License](LICENSE) 开源。

## Star History

<a href="https://www.star-history.com/?repos=sandrewzq%2Fd2-tools&type=date&legend=top-left">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=sandrewzq/d2-tools&type=date&theme=dark&legend=top-left" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=sandrewzq/d2-tools&type=date&legend=top-left" />
    <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=sandrewzq/d2-tools&type=date&legend=top-left" />
  </picture>
</a>

