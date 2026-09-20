/**
 * Destiny 2 社区工具站清单。
 *
 * 数据来源是 `docs/work/references/destiny-tool-reference.md` 的那份调研：只收公开地址和
 * 一句话用途，不复制任何站点的内容和素材，也不在应用里内置它们的页面或数据。
 *
 * 收录级别（`level`）决定它出现在哪：
 * - `recommended` / `optional` —— 首层导航直接展示；
 * - `reference` / `archived` —— 折叠在页面底部的「开发者与历史」区，不占首层位置。
 */

export type ToolCategory =
  | "vault"
  | "weapons"
  | "account"
  | "activities"
  | "knowledge"
  | "dev";

/** 使用方式：网页、桌面应用、移动应用、只有源码仓库。 */
export type ToolAccess = "web" | "desktop" | "mobile" | "github";

/** 推荐级别。 */
export type ToolLevel = "recommended" | "optional" | "reference" | "archived";

export type ToolEntry = {
  /** 稳定标识，用域名或仓库名，改文案不动它。 */
  key: string;
  /** 站点名，原样保留不翻译。 */
  name: string;
  /** 一句话用途。 */
  purpose: string;
  category: ToolCategory;
  access: ToolAccess;
  level: ToolLevel;
  /** 没有对应地址就留空，界面不显示这一项，也不写「未提供」。 */
  githubUrl?: string;
  onlineUrl?: string;
  mobileUrls?: { android?: string; ios?: string };
  /** 注意事项：数据新鲜度、授权范围、平台限制或维护状态。 */
  note?: string;
};

export const toolDirectoryEntries: ToolEntry[] = [
  // 一、仓库与配装
  {
    key: "destinyitemmanager.com",
    name: "Destiny Item Manager（DIM）",
    purpose: "账号、仓库和装备管理，含配装、愿望单、清理建议和装备转移。",
    category: "vault",
    access: "web",
    level: "recommended",
    githubUrl: "https://github.com/DestinyItemManager/DIM",
    onlineUrl: "https://app.destinyitemmanager.com/",
    note: "d2-tools 直接调用 Bungie API，不通过 DIM 读取账号；这里只作为产品与交互参考。"
  },
  {
    key: "d2armorpicker.com",
    name: "D2ArmorPicker",
    purpose: "按属性目标、碎片、模组和异域限制计算护甲组合。",
    category: "vault",
    access: "web",
    level: "recommended",
    githubUrl: "https://github.com/Mijago/D2ArmorPicker",
    onlineUrl: "https://d2armorpicker.com/",
    note: "护甲结果由 d2-tools 自己的账号快照和规则计算，不依赖它的服务。"
  },
  {
    key: "d2-armor-solver",
    name: "d2-armor-solver",
    purpose: "面向 Armor 3.0 的六维属性配装和可达性计算。",
    category: "vault",
    access: "web",
    level: "optional",
    githubUrl: "https://github.com/MIGO-OvO/d2-armor-solver",
    onlineUrl: "https://migo-ovo.github.io/d2-armor-solver/",
    note: "展示六维目标、+5 / +10 模组、可行组合和理论极限。"
  },
  {
    key: "destiny2ools.cloud",
    name: "Destiny2ools",
    purpose: "连接 Bungie 账号后分析库存、武器和护甲，按 PvE / PvP、属性和 Perk 条件筛选。",
    category: "vault",
    access: "web",
    level: "optional",
    onlineUrl: "https://destiny2ools.cloud/",
    note: "需要账号授权，使用前先确认它的隐私说明和服务可信度。"
  },
  {
    key: "littlelight",
    name: "Little Light",
    purpose: "移动端库存管理、快速转移、配装、收藏品、胜利和任务追踪。",
    category: "vault",
    access: "mobile",
    level: "optional",
    githubUrl: "https://github.com/LittleLightForDestiny/littlelight",
    mobileUrls: {
      android: "https://play.google.com/store/apps/details?id=me.markezine.luzinha",
      ios: "https://apps.apple.com/us/app/little-light-for-destiny/id1373037254"
    },
    note: "是移动应用，不是桌面端工具的替代品。"
  },
  {
    key: "d2-armor-calc",
    name: "D2 Armor Calc",
    purpose: "护甲属性计算。",
    category: "vault",
    access: "web",
    level: "reference",
    onlineUrl: "https://d2-armor-calc-lac.vercel.app/",
    note: "在线入口可以访问，但还没确认它稳定维护的源码仓库和数据更新方式。"
  },

  // 二、武器与 Perk
  {
    key: "dim-wish-list-sources",
    name: "DIM Wish List Sources",
    purpose: "社区维护和生成的武器愿望单来源文件，用来标记推荐 Roll。",
    category: "weapons",
    access: "github",
    level: "recommended",
    githubUrl: "https://github.com/48klocs/dim-wish-list-sources",
    note: "仓库内有多份文本，d2-tools 不固定引用任何一份，链接由玩家自己给。这是数据来源仓库，不是网页工具。"
  },
  {
    key: "d2arsenal.com",
    name: "D2 Arsenal",
    purpose: "武器数据库、Perk 组合、Roll 分享和部分伤害衰减计算。",
    category: "weapons",
    access: "web",
    level: "optional",
    githubUrl: "https://github.com/D2Arsenal/d2arsenal.com",
    onlineUrl: "https://www.d2arsenal.com/",
    note: "d2-tools 只用它做开发期的人工核对：对部分当前样本 Hash 它返回 404，没有可用性承诺。"
  },
  {
    key: "roll.report",
    name: "Roll Report",
    purpose: "发现同一把武器上的独特 Perk 组合和 Roll 差异。",
    category: "weapons",
    access: "web",
    level: "optional",
    githubUrl: "https://github.com/cecilbowen/roll-report",
    onlineUrl: "https://roll.report/",
    note: "d2-tools 借鉴了它的识别思路并在本地重写，不调用它的线上接口。"
  },
  {
    key: "d2gunlocker.com",
    name: "D2 Gun Locker",
    purpose: "不用登录就能浏览武器和护甲，查看 Perk、属性、催化剂并比较 Roll。",
    category: "weapons",
    access: "web",
    level: "optional",
    onlineUrl: "https://d2gunlocker.com/",
    note: "涉及账号操作时仍然要回到 Bungie 授权的工具。"
  },
  {
    key: "adasarmory.com",
    name: "Ada's Armory",
    purpose: "武器搜索、Perk 池、属性、伤害、射程和 Crucible TTK 资料。",
    category: "weapons",
    access: "web",
    level: "optional",
    onlineUrl: "https://adasarmory.com/",
    note: "部分 TTK 和射程数据还在完善。"
  },
  {
    key: "light.gg",
    name: "Light.gg",
    purpose: "武器资料库、Perk 池、社区 God Roll 推荐、装备评分和账号库存查看。",
    category: "weapons",
    access: "web",
    level: "optional",
    onlineUrl: "https://www.light.gg/",
    note: "应用不读取、抓取或缓存它的页面。社区流行度不等于专家共识，只当作玩家自己去看的外部入口。"
  },
  {
    key: "destiny.report",
    name: "destiny.report",
    purpose: "武器数据库、Perk 反向搜索、来源筛选和赛季反制属性提示。",
    category: "weapons",
    access: "web",
    level: "optional",
    onlineUrl: "https://destiny.report/",
    note: "从 Perk 反查武器、按来源聚合结果的检索方式值得参考。"
  },
  {
    key: "d2gunsmith.com",
    name: "D2 Gunsmith",
    purpose: "武器 Perk 配置、打造和数值预览。",
    category: "weapons",
    access: "web",
    level: "optional",
    onlineUrl: "https://d2gunsmith.com/",
    note: "在线地址可以访问，但没确认到对应的官方源码仓库。"
  },

  // 三、账号与统计
  {
    key: "destinytracker.com",
    name: "Destiny Tracker",
    purpose: "玩家档案、PvP / PvE 统计、比赛历史和排行榜。",
    category: "account",
    access: "web",
    level: "recommended",
    onlineUrl: "https://destinytracker.com/",
    note: "按玩家、模式、赛季和排行榜几个维度组织统计。"
  },
  {
    key: "destiny2.check-info.org",
    name: "Destiny2 Checkinfo",
    purpose: "玩家公开资料查询、装备与 Perk 搜索、生涯统计、组队信息和攻略入口。",
    category: "account",
    access: "web",
    level: "optional",
    githubUrl: "https://github.com/hub380/Destiny2-Checkinfo",
    onlineUrl: "https://destiny2.check-info.org/",
    note: "公开查询不依赖本人授权。旧站已归档，这是新的地址。"
  },
  {
    key: "bray.tech",
    name: "Bray.tech",
    purpose: "收藏品、地图、里程碑、赛季进度和活动记录查询。",
    category: "account",
    access: "web",
    level: "optional",
    onlineUrl: "https://bray.tech/",
    note: "分层浏览收藏进度、目的地地图和账号全貌。"
  },
  {
    key: "destinyrecipes.com",
    name: "Destiny Recipes",
    purpose: "赛季挑战、周常内容、光等提升、战利品保留和仓库清理辅助。",
    category: "account",
    access: "web",
    level: "optional",
    onlineUrl: "https://destinyrecipes.com/",
    note: "把多个日常和周常任务聚合成一份能照着做的清单。"
  },

  // 四、活动与轮换
  {
    key: "todayindestiny.com",
    name: "Today In Destiny",
    purpose: "每日和每周轮换、遗失区域、突袭、地牢、夜幕、试炼和商人库存。",
    category: "activities",
    access: "web",
    level: "recommended",
    onlineUrl: "https://www.todayindestiny.com/",
    note: "活动轮换和商人库存按玩家习惯展示，起止时间清楚。"
  },
  {
    key: "raid.report",
    name: "Raid Report",
    purpose: "Raid 和 Dungeon 完成记录、Solo / Flawless 标记、队友记录和排行榜。",
    category: "activities",
    access: "web",
    level: "recommended",
    onlineUrl: "https://raid.report/",
    note: "通关效率、队伍成员和挑战成就放在一起看。"
  },
  {
    key: "d2checkpoint.com",
    name: "D2Checkpoint",
    purpose: "查找和分享 Raid / Dungeon checkpoint，并复制加入队伍需要的游戏指令。",
    category: "activities",
    access: "web",
    level: "optional",
    onlineUrl: "https://d2checkpoint.com/",
    note: "按活动、Boss 和 checkpoint 状态快速定位可用进度。"
  },
  {
    key: "destiny-daily-bot",
    name: "命运之小日向 Bot",
    purpose: "通过 QQ 群机器人提供每日和每周摘要、轮换、商人库存、掉落来源和玩家查询。",
    category: "activities",
    access: "web",
    level: "optional",
    onlineUrl: "https://qun.qq.com/qunpro/robot/share?robot_appid=102076550",
    note: "把日常信息推到玩家常用的聊天工具里，省掉主动查询。"
  },
  {
    key: "d2-morgeth-kick",
    name: "D2-Morgeth-Kick",
    purpose: "与 Morgeth 相关的社区辅助项目。",
    category: "activities",
    access: "web",
    level: "reference",
    githubUrl: "https://github.com/MIGO-OvO/D2-Morgeth-Kick/",
    onlineUrl: "https://migo-ovo.github.io/D2-Morgeth-Kick/",
    note: "地址由仓库自带的 GitHub Pages 配置提供。"
  },

  // 五、资料与百科
  {
    key: "starside.work",
    name: "Starside · Destiny 2 中文资料台",
    purpose: "中文资料站，整理武器 Perk、武器框架、护甲模组、护甲套装、异域装备、职业分支、技能冷却、首领生命值、DPS、伤害机制和 Raid 攻略。",
    category: "knowledge",
    access: "web",
    level: "recommended",
    onlineUrl: "https://starside.work/",
    note: "轮换页是静态周期表，不能据此判断当前轮换；当前轮换只以 Bungie 登录后的角色活动数据为准。站点声明为非官方资料站。"
  },
  {
    key: "destinysets.com",
    name: "Destiny Sets",
    purpose: "按赛季、活动和职业追踪护甲套装、武器、催化剂和收集进度。",
    category: "knowledge",
    access: "web",
    level: "optional",
    onlineUrl: "https://destinysets.com/",
    note: "装备收集目录、活动来源和套装完成度的展示方式。"
  },
  {
    key: "destinypedia.com",
    name: "Destinypedia：Engram",
    purpose: "Destiny 世界观、物品、活动和术语百科资料。",
    category: "knowledge",
    access: "web",
    level: "optional",
    onlineUrl: "https://www.destinypedia.com/Engram",
    note: "面向玩家的术语解释、背景资料和交叉链接。"
  },
  {
    key: "destiny2.tools",
    name: "Destiny 2 Tools",
    purpose: "第三方工具聚合导航，按库存、统计、进度、资料和分析等用途收集社区站点。",
    category: "knowledge",
    access: "web",
    level: "optional",
    onlineUrl: "https://destiny2.tools/",
    note: "站内条目的新鲜度需要逐个核对。"
  },
  {
    key: "bungie-companion-apps",
    name: "Bungie Companion Apps",
    purpose: "Bungie 官方登记的第三方 Companion App 列表。",
    category: "knowledge",
    access: "web",
    level: "optional",
    onlineUrl: "https://www.bungie.net/7/en/registration/apps",
    note: "登记不等于 Bungie 对每个应用的功能和隐私做了全面担保。"
  },
  {
    key: "destinytools.net",
    name: "Destiny Tools 聚合站",
    purpose: "旧式链接目录。",
    category: "knowledge",
    access: "web",
    level: "reference",
    onlineUrl: "https://www.destinytools.net/",
    note: "内容以旧式链接目录为主，部分条目可能已经过期。"
  },

  // 六、开发参考
  {
    key: "bungie-net-api",
    name: "Bungie.Net API",
    purpose: "官方 REST API 文档，涵盖 OAuth、账号、角色、物品、活动历史、商人和写操作接口。",
    category: "dev",
    access: "web",
    level: "recommended",
    githubUrl: "https://github.com/Bungie-net/api",
    onlineUrl: "https://bungie-net.github.io/multi/index.html",
    note: "d2-tools 的官方数据和授权边界。真实账号数据、写操作和接口字段以这份文档为准。"
  },
  {
    key: "dim-api",
    name: "dim-api（DIM Sync）",
    purpose: "同步标签、备注、保存的配装和其他不属于 Bungie API 的用户数据。",
    category: "dev",
    access: "github",
    level: "optional",
    githubUrl: "https://github.com/DestinyItemManager/dim-api",
    onlineUrl: "https://api.destinyitemmanager.com/",
    note: "将来要做跨设备同步时，它是比界面参考更直接的后端协议参考；它不能读取库存，也不能代替 Bungie API 执行装备操作。"
  },
  {
    key: "bungie-api-ts",
    name: "bungie-api-ts",
    purpose: "Bungie.net API 的 TypeScript 类型定义、接口辅助函数和 Manifest 下载辅助。",
    category: "dev",
    access: "github",
    level: "optional",
    githubUrl: "https://github.com/DestinyItemManager/bungie-api-ts",
    note: "用来核对 API 请求参数、响应类型和 Manifest 辅助方法。它本身不是玩家网页工具。"
  },
  {
    key: "d2-additional-info",
    name: "d2-additional-info",
    purpose: "从 Destiny 2 Manifest 生成补充 JSON / TypeScript 数据，例如赛季、活动、来源、催化剂和模组映射。",
    category: "dev",
    access: "github",
    level: "optional",
    githubUrl: "https://github.com/DestinyItemManager/d2-additional-info",
    note: "适合参考「官方 Manifest 没有直接给出、但产品需要补充维护」的数据生成流程。d2-tools 只用它补充官方资料关系，不替代 Manifest。"
  },
  {
    key: "csv-wishlists-parser",
    name: "csv-wishlists-parser",
    purpose: "把社区愿望单 CSV 解析成 DIM 可以使用的结构。",
    category: "dev",
    access: "github",
    level: "reference",
    githubUrl: "https://github.com/DestinyItemManager/csv-wishlists-parser",
    note: "如果要扩展愿望单导入或转换，它比直接照搬 DIM 的页面实现更值得参考。"
  },
  {
    key: "d2-manifest-bot",
    name: "d2-manifest-bot",
    purpose: "通过 GitHub Actions 检查新的 Destiny 2 Manifest 版本。",
    category: "dev",
    access: "github",
    level: "reference",
    githubUrl: "https://github.com/DestinyItemManager/d2-manifest-bot",
    note: "面向维护者的自动化，不属于玩家日常使用的工具。"
  },
  {
    key: "d2-skill",
    name: "d2-skill",
    purpose: "中文 Destiny 2 工具项目，覆盖 OAuth、Manifest、物品搜索、Perk、AI 分析和愿望单等能力。",
    category: "dev",
    access: "github",
    level: "reference",
    githubUrl: "https://github.com/Lin-Guanguo/d2-skill",
    note: "参考它的 Bungie 登录、Manifest 生命周期、跨领域服务拆分和工具接口设计。"
  },
  {
    key: "d2-solo-enabler",
    name: "Destiny 2 Solo Enabler",
    purpose: "通过本地辅助方式限制匹配，让玩家进行单人活动测试或探索。",
    category: "dev",
    access: "github",
    level: "reference",
    githubUrl: "https://github.com/DrNoLife/Destiny-2-Solo-Enabler",
    note: "本地辅助工具，不属于账号查询服务。使用前要确认它和游戏规则、当前客户端版本是否兼容。"
  },
  {
    key: "dim-extension",
    name: "dim-extension",
    purpose: "DIM 的浏览器快捷入口。",
    category: "dev",
    access: "github",
    level: "reference",
    githubUrl: "https://github.com/DestinyItemManager/dim-extension",
    note: "不提供独立的装备管理能力。"
  },
  {
    key: "d2ai-module",
    name: "d2ai-module",
    purpose: "DIM 构建过程相关的数据模块。",
    category: "dev",
    access: "github",
    level: "reference",
    githubUrl: "https://github.com/DestinyItemManager/d2ai-module",
    note: "不是独立的玩家工具。"
  },
  {
    key: "dim-custom-symbols",
    name: "dim-custom-symbols",
    purpose: "DIM 的自定义字体资源。",
    category: "dev",
    access: "github",
    level: "reference",
    githubUrl: "https://github.com/DestinyItemManager/dim-custom-symbols",
    note: "和玩家工具功能无关。"
  },
  {
    key: "dim-bungie-platform",
    name: "dim-bungie-platform",
    purpose: "已归档的旧 REST Endpoint 代码。",
    category: "dev",
    access: "github",
    level: "archived",
    githubUrl: "https://github.com/DestinyItemManager/dim-bungie-platform",
    note: "只适合历史兼容排查，不要作为当前实现依据。"
  },
  {
    key: "dim-mobile",
    name: "dim-mobile / dim-mobile-client",
    purpose: "DIM 的移动端项目。",
    category: "dev",
    access: "github",
    level: "archived",
    githubUrl: "https://github.com/DestinyItemManager/dim-mobile",
    note: "两个项目都已归档，不作为当前实现依据。"
  }
];

export const toolCategoryOrder: ToolCategory[] = ["vault", "weapons", "account", "activities", "knowledge", "dev"];
