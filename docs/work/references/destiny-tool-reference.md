# Destiny 2 工具参考

> 这些项目只作为产品能力边界和交互方向参考。d2-tools 的核心数据优先来自 Bungie 官方接口、Destiny Manifest 和用户自己的本地授权数据。

## DIM

[DIM](https://app.destinyitemmanager.com/) 是 Destiny 2 最强装备管理工具，网页端运行。核心能力：

- 仓库管理：按武器、护甲、分类、位置、弹药和属性筛选，自由拖拽移动装备。
- 同名装备对比：自动检测重复装备，展示每件的 perk / 属性差异。
- Loadout 系统：创建、保存、一键装备配装方案，支持 DIM 链接分享。
- 愿望单：导入社区维护的 god roll 表格，仓库中自动标记命中装备。
- 护甲优化器：设定目标属性组合，自动从仓库中选出最优搭配。
- 清算模式：批量标记垃圾装备，生成清理清单辅助游戏内删除。
- 进度追踪：赛季等级、里程碑、悬赏、催化进度一览。
- 农业模式：自动将特定物品转入仓库，保持角色背包整洁。

## D2ArmorPicker

[D2ArmorPicker](https://d2armorpicker.com/) 是专业的护甲属性优化工具。核心能力：

- 属性优化：设定目标属性组合，自动计算仓库中所有护甲的最优搭配。
- 模组支持：可指定已拥有的模组，优化结果计入模组加成。
- 异域锁定：指定某件异域护甲后，围绕它优化其余五件。
- 结果排序：按总属性点数、浪费点数等排序，支持多方案对比。
- 子类加成：计入碎片属性加成。

## Destiny Recipes

[Destiny Recipes](https://destinyrecipes.com/) 是综合性 Destiny 2 辅助工具集。核心能力：

- 清单：赛季挑战、周常里程碑、催化任务等进度总览。
- 光等进度：可视化当前光等提升路径，显示每个栏位的最优掉落来源。
- 战利品伴侣：活动结束后弹窗提示是否保留刚获得的 roll。
- 仓库清理：按社区推荐批量标记可清理装备。

## Bray.tech

[Bray.tech](https://bray.tech/) 是账号全貌查看器。核心能力：

- 收藏品追踪：按类别查看武器、护甲、模组和催化剂的收集进度。
- 地图与检查点：查看各目的地的可收集物品、地区宝箱和遗失区域。
- 里程碑总览：当前所有可完成的里程碑和悬赏一览。
- 赛季回顾：赛季等级、神器进度、赛季挑战完成情况。
- 活动记录：最近的 Raid / Dungeon / PVP 活动历史。

## Destiny Sets

[Destiny Sets](https://destinysets.com/) 是装备收集追踪工具。核心能力：

- 按赛季和活动分类：每个赛季的阵营任务和对应奖励一览。
- 护甲套装：各职业的赛季护甲、Raid 护甲、试炼护甲等收集进度。
- 武器列表：按活动来源列出所有可收集武器。
- 催化与模组：催化剂和战斗风格模组的获取方式追踪。

## d2-skill

[d2-skill](https://github.com/Lin-Guanguo/d2-skill) 是面向开发者的 Python CLI 工具，d2-tools 的 OAuth / Manifest / AI 实现参考了其架构。核心能力：

- OAuth 登录：完整的 Bungie OAuth 流程，本地 HTTPS callback 获取 token。
- Manifest 管理：下载、解析、缓存 Destiny Manifest 关系型数据库。
- 物品搜索：按中文名、英文名、perk、别名搜索所有物品定义。
- AI 分析：基于玩家真实账号数据，调用 LLM 分析仓库、推荐装备、解读 perk。
- 愿望单集成：解析 DIM 格式 wishlist，本地匹配仓库中的装备。
- 写操作框架：锁定、解锁、转移、装备，有安全边界和确认流程。
- 工具接口：留出 HTTP API 和 MCP server 扩展能力。

## Destiny2 Checkinfo

[Destiny2 Checkinfo](https://github.com/hub380/Destiny2-Checkinfo) 是本地参考项目，已放在 `D:\sandrew\Destiny2-Checkinfo`。当前参考分支为 `feature/pvp-history-career-layout`。核心参考点：

- 轻量 Web 工具：用 Vite + React + TypeScript 多页面承载组队、玩家生涯、装备、Perk 和攻略入口。
- 组队信息：展示小黑盒组队列表，支持定时刷新、识别 `名称#数字代码`，并复制 `/j 名称#代码` 加入队伍。
- 公开玩家查询：不要求玩家本人 OAuth 登录，查询公开 Bungie 生涯数据、角色、Raid、地牢、PvP 分模式统计和锻造进度。
- 装备与 Perk 查询：搜索武器、护甲、Perk，展示 Perk 池、普通 / 强化差异、Perk 反查武器和 Manifest 来源提示。
- 后端聚合层：前端消费 `/api/*` 整理后的 DTO，可参考其“后端收口、前端少拼装”的页面数据组织方式。
- Cloudflare 部署：Workers、KV、R2 用于边缘部署、热点缓存、活动定义、装备索引、玩家大型历史快照和攻略内容。
- 攻略 / 资讯库骨架：`content/guides/`、R2 上传和校验流程可作为后续攻略证据工作台的轻量参考。

使用边界：

- 小黑盒组队来源没有稳定公开接口文档，不把其私有接口、Cookie 或绕过鉴权逻辑作为 d2-tools 的实现依据。
- 武器来源提示来自 Bungie Manifest 可读字段，只能参考信息组织方式，不能等同于精确掉落表。
- d2-tools 仍以 Bungie 官方接口、Destiny Manifest 和用户本地授权数据为数据真相；该项目主要作为公开查询、轻量页面和 Cloudflare 缓存部署的参考。

## 命运之小日向 Bot

[命运之小日向 Bot](https://qun.qq.com/qunpro/robot/share?robot_appid=102076550) 是面向中文玩家的 QQ 群日报 / 周报机器人。核心能力：

- 每日摘要：今日遗失区域、突袭轮换、商人库存、活动列表。
- 周报：本周夜fall、试炼地图、赛季活动、双倍奖励轮换。
- 商人详情：Xur、枪匠、艾达、圣人、拉乎尔等常用商人的售卖物品和属性。
- 掉落查询：按武器名查询掉落来源、活动、perk 池。
- 指令交互：通过 QQ 消息指令查询装备、统计、活动信息。

## Light.gg

[Light.gg](https://www.light.gg/) 是 Destiny 2 武器数据库和社区投票平台。核心能力：

- 武器数据库：所有武器的完整 perk 池、来源、获取方式和分类浏览。
- God Roll 推荐：社区投票选出每种武器的最佳 PVE / PVP perk 组合。
- 装备评分：社区对每件装备的评分和评论。
- 个人库存：关联 Bungie 账号后查看自己每件装备的 roll 质量。
- 排行榜：玩家使用率、击杀数等统计数据。
- 资料库搜索：按武器类型、弹药、赛季、来源等多维度筛选。

## D2 Gunsmith

[D2 Gunsmith](https://d2gunsmith.com/) 是武器 perk 模拟与预览工具。核心能力：

- Perk 模拟：选择任意武器和 perk 组合，预览实战属性数值。
- God Roll 对比：同时配置多个 roll 方案，并排对比数值差异。
- Perk 池浏览：查看任意武器的完整 perk 池，含推荐组合标记。
- 无账号需求：无需登录 Bungie，纯粹的前端模拟。

## destiny.report

[destiny.report](https://destiny.report/) 是武器数据库与 perk 反向搜索引擎。核心能力：

- Perk 反向搜索：选择一个 perk，找出所有可刷出该 perk 的武器。
- 多条件组合筛选：支持来源、制造商、属性、赛季等多维筛选。
- 勇士反制标注：每把武器标注当前赛季的 Anti-Barrier / Unstoppable / Overload 属性。
- 实时更新：标注每次更新中新增或改动的武器。
- 双视图：列表视图和平铺视图。

## Engram

[Engram](https://engram.blue/) 是综合性 Destiny 2 工具。核心能力：

- 武器制作：武器图案管理，追踪制作进度和解锁条件。
- Perk 分析：查看武器的完整 perk 池和推荐组合。
- 账号集成：支持 Bungie 登录，读取个人库存。

## Today In Destiny

[Today In Destiny](https://www.todayindestiny.com/) 是每日 / 每周轮换信息的可视化呈现。核心能力：

- 每日总览：遗失区域、传奇 / 大师难度和地图。
- 每周总览：突袭 / 地牢轮换、夜fall、试炼地图、赛季挑战。
- 商人库存：显示商人当前售卖的具体物品列表。
- 活动时间线：以时间轴展示当天各项活动的起止时间。
- 进度追踪：赛季等级、光等提升路径的可视化。

## Destiny Tracker

[Destiny Tracker](https://destinytracker.com/) 是 PVP / PVE 玩家统计和排行榜。核心能力：

- 玩家档案：总游戏时长、击杀 / 死亡、胜率、光等历史。
- PVP 详细统计：各模式的 KD、ELO、胜率、武器使用率。
- PVE 统计：Raid 完成次数、最快通关时间、击杀数。
- 排行榜：全球 / 好友排名，按模式和赛季筛选。
- 比赛历史：最近场次的详细数据。

## Raid Report

[Raid Report](https://raid.report/) 是专精 Raid / Dungeon 记录的复盘工具。核心能力：

- Raid 记录：每个 Raid 的完成次数、最快通关时间、全程无 wipe 标记。
- Dungeon 记录：Solo / Flawless 完成标识，详细通关历史。
- 队友视角：查看任意队伍成员的完整 Raid 记录。
- 赛季回顾：本季各 Raid 的活跃度、首通和效率统计。
- 全球排行榜：速度排名、完成总数排名。

## D2Checkpoint

[D2Checkpoint](https://d2checkpoint.com/) 是 checkpoint 共享和获取平台。核心能力：

- Checkpoint 浏览：按 Raid / Dungeon / Boss 分类查找当前可用 checkpoint。
- 一键加入：复制 `/join` 指令，在游戏中快速加入 checkpoint 持有者的火力战队。
- Checkpoint 提交：玩家可提交自己持有的 checkpoint 供社区使用。
- Boss 专属：支持直接跳转到指定 Boss 的 checkpoint。

## 数据基础设施

- [Bungie.Net API](https://bungie-net.github.io/multi/index.html)：官方 REST API 文档，涵盖 OAuth 认证、账号读取、物品操作、活动历史、商人库存等全部接口。d2-tools 不通过任何第三方中转，直接基于此文档实现 Bungie 通信。
