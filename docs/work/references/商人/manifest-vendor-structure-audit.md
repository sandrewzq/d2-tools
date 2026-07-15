# 商人页面结构核对表

> 状态：待人工核对
> 更新时间：2026-07-15
> Manifest：zh-chs，缓存时间 2026-07-14T09:16:02.354Z

## 口径

- **已确认**：有游戏内截图或现有功能实测支持。
- **Manifest 候选**：Manifest 只证明存在定义或入口，不代表当前游戏界面一定展示。必须再由 Live Vendor API 或实机核对。
- 空分类、帮助、引导、历史任务和预览 Vendor 不再作为当前页面结构，只合并到“内部或条件定义”。
- Manifest 定义条目数量不是当前库存数量，本文件不再把它显示成实际售卖数量。

## 高塔与仪式商人

### 仄

- Hash：`2190858386`
- vendorIdentifier：`TOWER_NINE`
- Manifest 周期：每周
- 特殊说明：已完成页面；后续通用化不得改变现有输出。
- 截图：[仄1.jpg](./仄1.jpg)、[仄2.jpg](./仄2.jpg)、[仄3.jpg](./仄3.jpg)

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 声望与等级 | 已确认 | 截图 + Live 页面 | 当前声望、等级进度、等级奖励 |
| 多样奇异优惠 | 已确认 | 截图 + `category_xur_offers_peculiar` | 主页面直接库存 |
| 更多奇异优惠 | 已确认 | 截图 + 子 Vendor `537912098` | 玖的忠诚计划；奇异材料优惠；奇异可重复优惠 |
| 奇异装备优惠 | 已确认 | 截图 + 子 Vendor `3751514131` | 异域装备；传说武器；传说护甲 |
| 已放弃的任务 | Manifest 候选，截图未确认 | `generic_quest_resume_display_category` | 只有 Live API 返回时才展示 |
| 异域密码 | Manifest 候选，截图未确认 | `xur_vendor_category` | 只有 Live API 返回时才展示 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 消耗品（category_consumables）；异域武器（category_exotic_weapons）；仄（xur_help_name）；一位老朋友（intro_step0_name） |

### 仄

- Hash：`3442679730`
- vendorIdentifier：`30TH_ANNIVERSARY_XUR`
- Manifest 周期：每周
- 特殊说明：与高塔仄是不同商人，不能按名称合并。

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 等级奖励 | 声望候选，需 Live progression 核对 | `category.rank_rewards_seasonal` | Manifest 定义包含 13 个候选条目 |
| 悬赏 | 任务候选，需 Live 库存核对 | `category_bounties` | Manifest 定义包含 22 个候选条目 |
| 奖励 | 子库存候选，需 Live 父入口核对 | `category_reward` | 辉煌奖励包裹（3456491759，隐藏定义）：奖励 |
| 任务 | 任务候选，需 Live 库存核对 | `category.quests` | Manifest 定义包含 3 个候选条目 |
| 杂项 | 子库存候选，需 Live 父入口核对 | `category_class_misc` | 时尚休闲猎人包（3918377289，隐藏定义）：奖励<br>时尚休闲泰坦包（3874142171，隐藏定义）：奖励<br>时尚休闲术士包（1757995518，隐藏定义）：奖励 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 一位老朋友（intro_step0_name） |

### 星马

- Hash：`3431983428`
- vendorIdentifier：`30TH_ANNIVERSARY_STARHORSE`
- Manifest 周期：每周

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 奖励 | 子库存候选，需 Live 父入口核对 | `category_reward` | 辉煌奖励包裹（3456491759，隐藏定义）：奖励 |
| 星马悬赏 | 直接区域候选，需 Live 库存核对 | `category.dares_cards` | Manifest 定义包含 17 个候选条目 |

### 班西-44

- Hash：`672118013`
- vendorIdentifier：`GUNSMITH`
- Manifest 周期：每日
- 特殊说明：售卖武器必须使用 Live Roll，不能只显示资料库候选 Perk 池。

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 任务 | 任务候选，需 Live 库存核对 | `category_pursuits` | Manifest 定义包含 1 个候选条目 |
| 等级奖励 | 声望候选，需 Live progression 核对 | `category.rank_rewards_seasonal` | Manifest 定义包含 13 个候选条目 |
| 武器 | 直接区域候选，需 Live 库存核对 | `category_weapon` | Manifest 定义包含 7 个候选条目 |
| 升级 | 子库存候选，需 Live 父入口核对 | `action_black_market_refine` | 至日猎人护甲升级（1493877378，隐藏定义）：包含记忆水晶、包含内容<br>至日泰坦护甲升级（4036562374，隐藏定义）：包含记忆水晶、包含内容<br>至日术士护甲升级（2370303981，隐藏定义）：包含记忆水晶、包含内容 |
| 杂项 | 直接区域候选，需 Live 库存核对 | `category_class_misc` | Manifest 定义包含 2 个候选条目 |
| 传承聚焦破译 | 子库存候选，需 Live 父入口核对 | `category.vendor_engram_purchase.legacy_name` | 传承聚焦破译（908529654，隐藏定义）：SUROS武器、Häkke武器、VEIST武器、Omolon武器、战铸武器、Cassoid、Nadir和特克斯武器 |
| 聚焦破译 | 子库存候选，需 Live 父入口核对 | `category.vendor_engram_purchase` | 武器（2484291326 / GUNSMITH_WEAPON_FOCUSING）：主动掉落装备、商人专属装备 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 枪匠（gunsmith.help.name）；一位老朋友（intro_step0_name） |

### 指挥官萨瓦拉

- Hash：`69482069`
- vendorIdentifier：`TITAN_VANGUARD`
- Manifest 周期：每周
- 截图：用户于 2026-07-15 提供的游戏内页面截图

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 任务 | 任务候选，需 Live 库存核对 | `category_pursuits` | Manifest 定义包含 1 个候选条目 |
| 赛季 | 直接区域候选，需 Live 库存核对 | `category_seasonal` | Manifest 定义包含 4 个候选条目 |
| 武装召唤奖励 | 直接区域候选，需 Live 库存核对 | `category_vendor_rewards` | Manifest 定义包含 7 个候选条目 |
| 声望与等级 | 已确认 | 截图 + Live progression + `category.rank_rewards_seasonal` | 当前声望、等级进度、等级奖励；截图中的奖励数量是当前 Live 轨道，不使用 Manifest 定义条目数代替 |
| 护甲 | 直接区域候选，需 Live 库存核对 | `category_preview` | Manifest 定义包含 4 个候选条目 |
| 装备 | 子库存候选，需 Live 父入口核对 | `category_gear` | 异域记忆水晶（685908770，隐藏定义）：异域装备 |
| 特殊订单 | 直接区域候选，需 Live 库存核对 | `category_crm_general` | Manifest 定义包含 5 个候选条目 |
| 周常：先锋武器奖励 | 已确认 | 截图 + 父入口 `40185715` | 父页面显示一个“周常：先锋武器奖励”入口，指向 `153857624 / TOWER_VANGUARD_WEEKLY_ARMS_REWARDS`；子页包含先锋军械库武器和先锋军械库护甲 |
| 聚焦破译 | 已确认 | 截图 + 父入口 `4052393863` | 父页面直接显示“护甲”和“武器”两个入口：`439609089 / VANGUARD_ARMOR_FOCUSING`、`3756955867 / VANGUARD_WEAPON_FOCUSING`；`1009334327` 是隐藏的聚焦代理定义，不应单独显示成第三个子页 |
| 传承聚焦破译 | 已确认 | 截图 + 父入口 `2110538051` | 父页面显示一个“传承装备”入口，指向 `3444362755 / VANGUARD_ENGRAM_FOCUSING_LEGACY`；子页包含传承先锋行动武器、传承日落武器和传承护甲 I-V |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 同调（category_attunement）；记忆水晶（bucket_sack）；先锋行动（vanguard.help.name）；一位老朋友（intro_step0_name） |

### 领主沙克斯

- Hash：`3603221665`
- vendorIdentifier：`CRUCIBLE`
- Manifest 周期：每周

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 赛季 | 直接区域候选，需 Live 库存核对 | `category_seasonal_rewards` | Manifest 定义包含 4 个候选条目 |
| 多人竞技级别奖励 | 直接区域候选，需 Live 库存核对 | `crucible.category_competitive_rewards` | Manifest 定义包含 3 个候选条目 |
| 铁旗 | 直接区域候选，需 Live 库存核对 | `type_pvp_iron_banner` | Manifest 定义包含 1 个候选条目 |
| 等级奖励 | 声望候选，需 Live progression 核对 | `category.rank_rewards_seasonal` | Manifest 定义包含 14 个候选条目 |
| 装备 | 直接区域候选，需 Live 库存核对 | `category_gear` | Manifest 定义包含 1 个候选条目 |
| 杂项 | 直接区域候选，需 Live 库存核对 | `category_class_misc` | Manifest 定义包含 2 个候选条目 |
| 事件奖励 | 直接区域候选，需 Live 库存核对 | `category_event_rewards` | Manifest 定义包含 8 个候选条目 |
| 周常：先锋武器奖励 | 子库存候选，需 Live 父入口核对 | `quartermaster_rewards` | 无名称（1354307756，隐藏定义）：先锋军械库 - 护甲（{var:2689630418}/{var:711942305}）、先锋军械库 - 武器（{var:398275339}/{var:3385258622}） |
| 聚焦破译 | 子库存候选，需 Live 父入口核对 | `category.vendor_engram_purchase` | 聚焦破译（3203996438，隐藏定义）：武器 |
| 传承聚焦破译 | 子库存候选，需 Live 父入口核对 | `category.vendor_engram_purchase.legacy_name` | 传承装备（2595490586 / CRUCIBLE_ENGRAM_FOCUSING_LEGACY）：传承护甲I、传承护甲II、传承护甲III、传承护甲IV、传承护甲V、武器、阿赛特纪念 |
| 熔炉竞技场聚焦破译 | 子库存候选，需 Live 父入口核对 | `tiered_focusing.category.pvp` | 护甲（892981972 / CRUCIBLE_ARMOR_FOCUSING）：阿赛特纪念、凯旋圣歌、狂野圣歌套装、灾难军团套装、最后纪律套装<br>武器（3459454558 / CRUCIBLE_WEAPON_FOCUSING）：阿赛特纪念、主动掉落装备、商人专属装备 |
| 血色浪漫悬赏 | 任务候选，需 Live 库存核对 | `daily_bounty_acquisition_display_category` | Manifest 定义包含 17 个候选条目 |
| 已放弃的任务 | 任务候选，需 Live 库存核对 | `generic_quest_resume_display_category` | Manifest 定义包含 6 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 任务（category_pursuits）；熔炉竞技场（crucible.help.name）；一位老朋友（intro_step0_name） |

### 浪客

- Hash：`248695599`
- vendorIdentifier：`GAMBIT`
- Manifest 周期：每周
- 截图：[浪客1.jpg](./浪客1.jpg)、[浪客2.jpg](./浪客2.jpg)、[浪客3.jpg](./浪客3.jpg)、[浪客4.jpg](./浪客4.jpg)

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 声望与等级 | 已确认 | 截图 | 智谋声望、等级奖励 |
| 聚焦破译 | 已确认 | 截图 + Manifest 子入口 | 护甲；武器 |
| 护甲 | 已确认 | 截图 + `GAMBIT_ARMOR_FOCUSING` | 按能量等级解锁的护甲 |
| 武器 | 已确认 | 截图 + `GAMBIT_WEAPON_FOCUSING` | 主动掉落装备；商人专属装备 |
| 传承聚焦破译 | 已确认 | 截图 + `GAMBIT_ENGRAM_FOCUSING_LEGACY` | 传承武器；多组传承护甲 |
| 任务 | Manifest 候选，截图未确认 | `category_pursuits` | 只有 Live API 返回时才展示 |
| 任务/悬赏 | Manifest 候选，截图未确认 | `bucket_bounties` | 只有 Live API 返回时才展示 |
| 赛季奖励 | Manifest 候选，截图未确认 | `category_seasonal` / `category_seasonal_rewards` | 着色器、徽标等候选定义，以 Live API 为准 |
| 已放弃的任务 | Manifest 候选，截图未确认 | `generic_quest_resume_display_category` | 只有 Live API 返回时才展示 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 特色护甲（category.armor_current）；过往赛季护甲（category.armor_past）；限时活动（vendor.eris.category.firecracker_access）；智谋（gambit.help.name）；一位老朋友（intro_step0_name） |

### 苏拉娅·霍桑

- Hash：`3347378076`
- vendorIdentifier：`FARM_CLANS`
- Manifest 周期：每周
- 特殊说明：公会/账号声望；隐藏子 Vendor 是否出现必须以父级 Live 入口为准。
- 截图：[霍桑1.jpg](./霍桑1.jpg)、[霍桑2.jpg](./霍桑2.jpg)、[霍桑3.jpg](./霍桑3.jpg)、[霍桑4.jpg](./霍桑4.jpg)、[霍桑5.jpg](./霍桑5.jpg)

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 声望与等级 | 已确认 | 截图 | 公会声望、等级奖励 |
| 公会悬赏 | 已确认 | 截图 + `clan_bounties_vendor_display` | 公会悬赏列表 |
| 突袭 | 已确认 | 截图 + `category_list.name` | 最后一愿突袭；救赎花园突袭 |
| 最后一愿突袭 | 已确认 | 截图 + `FARM_CLANS_SUBSCREEN_0` | 武器缓存箱 |
| 救赎花园突袭 | 已确认 | Manifest 子 Vendor | 武器缓存箱；奖励；任务 |
| 传承装备 | 已确认 | 截图 + 子 Vendor `2357508752` | 玻璃拱顶；克洛塔的末日；国王的陨落；最后一愿；救赎花园；深岩墓室；门徒誓约；梦魇根源；救赎的边缘 |
| 任务 | Manifest 候选，截图未确认 | `category_pursuits` / `pursuits_vendor_display` | 只有 Live API 返回时才展示 |
| 消耗品 | Manifest 候选，截图未确认 | `bucket_consumables` | 只有 Live API 返回时才展示 |
| 装备 | Manifest 候选，截图未确认 | `category_gear` | 只有 Live API 返回时才展示 |
| 已放弃的任务 | Manifest 候选，截图未确认 | `generic_quest_resume_display_category` | 只有 Live API 返回时才展示 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 霍桑（hawthorne_help.name）；一位老朋友（intro_step0_name） |

### 圣人14号

- Hash：`765357505`
- vendorIdentifier：`TOWER_SAINT_14`
- Manifest 周期：每周

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 入场券 | 直接区域候选，需 Live 库存核对 | `display_category_trials_mechanics_name` | Manifest 定义包含 6 个候选条目 |
| 等级奖励 | 声望候选，需 Live progression 核对 | `category.rank_rewards_seasonal` | Manifest 定义包含 12 个候选条目 |
| 聚焦破译 | 子库存候选，需 Live 父入口核对 | `category.vendor_engram_purchase` | 聚焦破译（4290587364，隐藏定义）：武器<br>护甲（1237018236 / TRIALS_ARMOR_FOCUSING）：残酷琥珀套装、新通俗套装、双重王冠套装<br>武器（142095858 / TRIALS_WEAPON_FOCUSING）：主动掉落装备、商人专属装备 |
| 传承聚焦破译 | 子库存候选，需 Live 父入口核对 | `category.vendor_engram_purchase.legacy_name` | 传承装备（4140351452 / TRIALS_ENGRAM_FOCUSING_LEGACY）：传承护甲I、传承护甲II、传承护甲III、传承护甲IV、传承护甲V |
| 悬赏 | 任务候选，需 Live 库存核对 | `category_bounties` | Manifest 定义包含 27 个候选条目 |
| 已放弃的任务 | 任务候选，需 Live 库存核对 | `generic_quest_resume_display_category` | Manifest 定义包含 4 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 任务（category_pursuits）；奥斯里斯试炼（trials.help.name）；一位老朋友（intro_step0_name） |

### 军政官萨拉丁

- Hash：`895295461`
- vendorIdentifier：`IRON_BANNER`
- Manifest 周期：每周
- 特殊说明：Manifest 未提供等级奖励分类，但游戏内存在声望；必须从 Live progression 补齐。

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 聚焦破译 | 子库存候选，需 Live 父入口核对 | `category.vendor_engram_purchase` | 聚焦破译（3388267042 / IRON_BANNER_ENGRAM_FOCUSING）：武器、护甲<br>护甲（3195172492 / IRON_BANNER_ARMOR_FOCUSING）：特色护甲、机械营套装、铁甲套装<br>武器（3013461870 / IRON_BANNER_WEAPON_FOCUSING）：主动掉落装备、商人专属装备 |
| 传承聚焦破译 | 子库存候选，需 Live 父入口核对 | `category.vendor_engram_purchase.legacy_name` | 传承装备（2672927612 / IRON_BANNER_ENGRAM_FOCUSING_LEGACY）：武器、传承护甲I、传承护甲II、传承护甲III、传承护甲IV、传承护甲V、传承护甲VI、传承护甲VII、传承护甲VIII |
| 已放弃的任务 | 任务候选，需 Live 库存核对 | `generic_quest_resume_display_category` | Manifest 定义包含 4 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 特色护甲（category.armor_current）；过往赛季护甲（category.armor_past）；任务（category_pursuits） |

### 拉乎尔大师

- Hash：`2255782930`
- vendorIdentifier：`CRYPTARCH`
- Manifest 周期：每周
- 特殊说明：解码、兑换和聚焦是服务动作，不等同于普通装备购买。

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 服务 | 子库存候选，需 Live 父入口核对 | `category_cryptarch_services` | 材料交换（2199358137 / CRYPTARCH_MATERIAL_EXCHANGE）：珍品、材料交换、特殊订单<br>聚焦破译（1248953136 / CRYPTARCH_EXOTIC_ARMOR_FOCUSING）：每日解码优惠、高级解码、精准解码、新奇解码 |
| 奖励 | 直接区域候选，需 Live 库存核对 | `category_reward` | Manifest 定义包含 6 个候选条目 |
| 救赎的边缘 | 直接区域候选，需 Live 库存核对 | `splinter_name` | Manifest 定义包含 1 个候选条目 |
| 飞船 | 直接区域候选，需 Live 库存核对 | `category_ship` | Manifest 定义包含 6 个候选条目 |
| 载具 | 直接区域候选，需 Live 库存核对 | `category_vanguard_vehicles` | Manifest 定义包含 4 个候选条目 |
| 装备 | 直接区域候选，需 Live 库存核对 | `category_gear` | Manifest 定义包含 4 个候选条目 |
| 已放弃的任务 | 任务候选，需 Live 库存核对 | `generic_quest_resume_display_category` | Manifest 定义包含 1 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | Bungie基金会奖励（category.promo.charity.bungie_foundation）；遗落之族预购物品（category.v400_preorder_items）；凌光之刻奖励物品（category.v500_bonus_items）；凌光之刻预购物品（category.v500_preorder_items）；邪姬魅影预购物品（category.v600_preorder_items）；邪姬魅影奖励物品（category.v600_bonus_items）；光陨之秋奖励物品（category.v700_bonus_items）；光陨之秋预购物品（category.v700_preorder_items）；拉乎尔的秘密藏货（category.v700_nebula_stash）；特别优惠（category_special_offers）；奖励（category_generic_rewards）；额外奖励（category_additional_rewards）；奖励（category_promo_rainforest）；特殊订单（category_crm_general）；一位老朋友（intro_step0_name） |

### 艾达-1

- Hash：`350061650`
- vendorIdentifier：`TOWER_ADA`
- Manifest 周期：每周
- 特殊说明：当前有效主 hash 为 350061650。

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 悬赏 | 任务候选，需 Live 库存核对 | `category_bounties` | Manifest 定义包含 12 个候选条目 |
| 护甲 | 子库存候选，需 Live 父入口核对 | `category_armor` | 护甲（164487829，隐藏定义）：传承护甲I、传承护甲II、传承护甲III、传承护甲IV、传承护甲V、传承护甲VI |
| 异域框架聚焦 | 子库存候选，需 Live 父入口核对 | `category.archetype_focusing` | 枪手异域聚焦（2741249995，隐藏定义）：猎人框架聚焦、泰坦框架聚焦、术士框架聚焦<br>堡垒异域聚焦（98286600，隐藏定义）：猎人框架聚焦、泰坦框架聚焦、术士框架聚焦<br>专家异域聚焦（2670715965，隐藏定义）：猎人框架聚焦、泰坦框架聚焦、术士框架聚焦<br>掷雷手异域聚焦（3269938981，隐藏定义）：猎人框架聚焦、泰坦框架聚焦、术士框架聚焦<br>楷模典范异域聚焦（719150859，隐藏定义）：猎人框架聚焦、泰坦框架聚焦、术士框架聚焦<br>搏击手异域聚焦（3027305922，隐藏定义）：猎人框架聚焦、泰坦框架聚焦、术士框架聚焦 |
| 材料交换 | 直接区域候选，需 Live 库存核对 | `category_materials_exchange` | Manifest 定义包含 81 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 一位老朋友（intro_step0_name） |

### 艾达-1

- Hash：`1990023985`
- vendorIdentifier：`TOWER_SHOOTING_RANGE_ADA`
- Manifest 周期：无固定周期
- 特殊说明：另一套艾达工作台，不能按名称与 TOWER_ADA 合并。

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 输入终端 | 子库存候选，需 Live 父入口核对 | `display_reward.name` | 武器周活动武器记忆水晶（4208534110，隐藏定义）：奖励 |
| 艾达的最新发现 | 任务候选，需 Live 库存核对 | `display_mod_pursuits` | Manifest 定义包含 2 个候选条目 |
| 原型调整任务 | 任务候选，需 Live 库存核对 | `display_pursuits.name` | Manifest 定义包含 2 个候选条目 |
| 输入终端 | 子库存候选，需 Live 父入口核对 | `display_reward.name` | 扭曲武器周记忆水晶（1034573023，隐藏定义）：奖励<br>扭曲武器周记忆水晶（1034573020，隐藏定义）：奖励<br>扭曲武器周记忆水晶（1034573021，隐藏定义）：奖励<br>扭曲武器周记忆水晶（1034573018，隐藏定义）：奖励<br>扭曲武器周记忆水晶（1034573019，隐藏定义）：奖励<br>扭曲武器周记忆水晶（4185525874，隐藏定义）：奖励<br>扭曲武器周记忆水晶（4185525875，隐藏定义）：奖励<br>扭曲武器周记忆水晶（4185525876，隐藏定义）：奖励<br>扭曲武器周记忆水晶（4185525877，隐藏定义）：奖励 |
| 艾达的实验室样本 | 直接区域候选，需 Live 库存核对 | `display_legacy_weapon` | Manifest 定义包含 16 个候选条目 |
| 艾达的工作台 | 子库存候选，需 Live 父入口核对 | `current_arms_week_items` | 武器周聚焦（4195846091 / TOWER_SHOOTING_RANGE_ADA_FOCUSING）：艾达的工作台、聚焦破译 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 原型调整任务（display_pursuits.name）；艾达的工作台（current_arms_week_items） |

### 艾可拉·蕾伊

- Hash：`1976548992`
- vendorIdentifier：`WARLOCK_VANGUARD`
- Manifest 周期：3 小时
- 特殊说明：按当前职业选择元素和子职业子页。
- 截图：[艾可拉.jpg](./艾可拉.jpg)

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 让你的光能成长 | 已确认 | 截图 + `subpage_categories.name` | 虚空；烈日；电弧 |
| 虚空子职业页 | Manifest 已确认，实机子页待核对 | 子 Vendor | 按职业进入超能、职业技能、移动、近战、手雷、星相、碎片 |
| 烈日子职业页 | Manifest 已确认，实机子页待核对 | 子 Vendor | 按职业进入超能、职业技能、移动、近战、手雷、星相、碎片 |
| 电弧子职业页 | Manifest 已确认，实机子页待核对 | 子 Vendor | 按职业进入超能、职业技能、移动、近战、手雷、星相、碎片 |
| 任务 | Manifest 候选，截图未确认 | `category_pursuits` / `vendor_category.pursuits` | 只有 Live API 返回时才展示 |
| 装备 | Manifest 候选，截图未确认 | `category_gear` | 只有 Live API 返回时才展示 |
| 新曙光装备包 | Manifest 候选，截图未确认 | `starter_loadouts.vendor_button.name` | 按当前职业进入对应装备包子 Vendor |
| 已放弃的任务 | Manifest 候选，截图未确认 | `generic_quest_resume_display_category` | 只有 Live API 返回时才展示 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | Vex数据种子（acquire_display_category）；Vex之攻略悬赏（vendor_display_category_vex_offensive_bounties_name）；特色护甲（category.armor_current）；过往赛季护甲（category.armor_past）；一位老朋友（intro_step0_name） |

### 艾可拉·蕾伊

- Hash：`4290765743`
- vendorIdentifier：`MARS_IKORA`
- Manifest 周期：每日
- 特殊说明：另一套艾可拉定义，不能与 WARLOCK_VANGUARD 合并。

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 一位老朋友（intro_step0_name） |

### 泰斯·艾夫瑞斯

- Hash：`3361454721`
- vendorIdentifier：`EVERVERSE`
- Manifest 周期：每周
- 特殊说明：高级货币和平台商店语义需要单独处理。

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 接受礼物 | 子库存候选，需 Live 父入口核对 | `interaction_body_gifts_instructional` | 旅行者，存活（1577523448，隐藏定义）：包含记忆水晶、包含内容<br>旅行者，存活（250070436，隐藏定义）：包含记忆水晶、包含内容<br>旅行者，存活（3956099989，隐藏定义）：包含记忆水晶、包含内容<br>无尽，已拯救（1012917217，隐藏定义）：包含记忆水晶、包含内容<br>战争思维，复兴（2985187070，隐藏定义）：包含记忆水晶、包含内容<br>猎人，复仇（616545409，隐藏定义）：包含记忆水晶、包含内容<br>守护者，飞速（3969494221，隐藏定义）：包含记忆水晶、包含内容 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 光尘（categories.featured.bright_dust）；周年纪念特惠（categories.anniversary）；聚焦光明记忆水晶（categories.focused）；推荐（categories.recommended）；扩展内容（categories.campaigns）；物品（categories.bright_dust.items）；装饰（categories.bright_dust.flair）；消耗品（categories.bright_dust.consumables）；选择数量（categories.engrams.multipurchase）；推荐物品（categories.recommended.multipurchase）；网络（category_nexus）；光明记忆水晶&包裹（sacks_header）；光明记忆水晶（categories.silver.engrams）；永恒之诗包裹（categories.silver.bundles）；专属永恒之诗包裹（categories.silver.bundles.persistent）；一位老朋友（intro_step0_name） |

### 伊娃·莱万特

- Hash：`919809084`
- vendorIdentifier：`EVA_LEVANTE_VENDOR`
- Manifest 周期：每周
- 特殊说明：活动商人；结构随活动变化，并存在自身引用。

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 至日锻炉 | 子库存候选，需 Live 父入口核对 | `inventory.armor_forge_subscreen.name` | 至日锻炉（3033500747 / TOWER_EVA_SOLSTICE_FORGE）：光泽护甲 |
| 至日奖励 | 直接区域候选，需 Live 库存核对 | `inventory.solstice_rewards.name` | Manifest 定义包含 5 个候选条目 |
| 节日奖励 | 直接区域候选，需 Live 库存核对 | `vendor_display_rewards` | Manifest 定义包含 7 个候选条目 |
| 聚焦 | 子库存候选，需 Live 父入口核对 | `subscreens.display_category.name` | 奇异武器记忆水晶（1130434764，隐藏定义）：奖励<br>奇异武器记忆水晶（1130434765，隐藏定义）：奖励<br>奇异武器记忆水晶（1130434762，隐藏定义）：奖励<br>奇异武器记忆水晶（1130434763，隐藏定义）：奖励<br>枪手异域聚焦（1895273434，隐藏定义）：猎人框架聚焦、泰坦框架聚焦、术士框架聚焦<br>堡垒异域聚焦（4236822819，隐藏定义）：猎人框架聚焦、泰坦框架聚焦、术士框架聚焦<br>专家异域聚焦（3224813824，隐藏定义）：猎人框架聚焦、泰坦框架聚焦、术士框架聚焦<br>掷雷手异域聚焦（3802343096，隐藏定义）：猎人框架聚焦、泰坦框架聚焦、术士框架聚焦<br>楷模典范异域聚焦（2372056470，隐藏定义）：猎人框架聚焦、泰坦框架聚焦、术士框架聚焦<br>搏击手异域聚焦（2856832041，隐藏定义）：猎人框架聚焦、泰坦框架聚焦、术士框架聚焦 |
| 事件奖励 | 直接区域候选，需 Live 库存核对 | `category_event_rewards` | Manifest 定义包含 3 个候选条目 |
| 任务 | 任务候选，需 Live 库存核对 | `category_pursuits` | Manifest 定义包含 1 个候选条目 |
| 卡片 | 直接区域候选，需 Live 库存核对 | `cards_category_title` | Manifest 定义包含 10 个候选条目 |
| 物品 | 直接区域候选，需 Live 库存核对 | `gear_category_title` | Manifest 定义包含 11 个候选条目 |
| 未领取的奖励 | 直接区域候选，需 Live 库存核对 | `unclaimed_rewards_category_title` | Manifest 定义包含 16 个候选条目 |
| 任务 | 任务候选，需 Live 库存核对 | `category_pursuits` | Manifest 定义包含 6 个候选条目 |
| 昔日曙光的礼物 | 直接区域候选，需 Live 库存核对 | `old_dawning_items_2` | Manifest 定义包含 8 个候选条目 |
| 友谊之力 | 直接区域候选，需 Live 库存核对 | `vendor_interaction.dispersal.name` | Manifest 定义包含 1 个候选条目 |
| 升级 | 直接区域候选，需 Live 库存核对 | `dawning_upgrades` | Manifest 定义包含 10 个候选条目 |
| 今日曙光的礼物 | 子库存候选，需 Live 父入口核对 | `current_dawning_items` | 曙光节武器记忆水晶（4277486421，隐藏定义）：奖励<br>曙光节武器记忆水晶（4277486420，隐藏定义）：奖励<br>曙光节武器记忆水晶（4277486419，隐藏定义）：奖励<br>曙光节武器记忆水晶（4277486418，隐藏定义）：奖励 |
| 奖励 | 直接区域候选，需 Live 库存核对 | `rewards_category_title` | Manifest 定义包含 1 个候选条目 |
| 已放弃的任务 | 任务候选，需 Live 库存核对 | `generic_quest_resume_display_category` | Manifest 定义包含 74 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 升级（upgrades.display_category.name）；节日面具（vendor_display_masks）；物品栏（category_consumables）；凯旋时刻奖励（390_mot_2021_vendor_list_name）；奖励（vendor_display_rewards）；竞争者卡片（contender_cards_category_title）；白金卡片（champion_cards_category_title）；职业效忠（pledges_category_title）；一位老朋友（intro_step0_name） |

## 目的地与剧情商人

### 德弗里姆·卡伊

- Hash：`396892126`
- vendorIdentifier：`PLANET_EDZ`
- Manifest 周期：每周

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 护甲 | 直接区域候选，需 Live 库存核对 | `category_armor` | Manifest 定义包含 15 个候选条目 |
| 杂项 | 直接区域候选，需 Live 库存核对 | `category_weapon_misc` | Manifest 定义包含 4 个候选条目 |
| 提高阵营声望 | 子库存候选，需 Live 父入口核对 | `category_token_reward` | 欧洲无人区记忆水晶（1045341587，隐藏定义）：阵营装备、阵营武器、额外奖励 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 一位老朋友（intro_step0_name） |

### 德弗里姆·卡伊

- Hash：`4060517507`
- vendorIdentifier：`TOWER_RALLY_DEVRIM`
- Manifest 周期：每周

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 武器同调 | 直接区域候选，需 Live 库存核对 | `category_vendor_attunement` | Manifest 定义包含 14 个候选条目 |
| 武装召唤奖励 | 直接区域候选，需 Live 库存核对 | `category_vendor_rewards` | Manifest 定义包含 7 个候选条目 |

### 智能失效保险

- Hash：`1576276905`
- vendorIdentifier：`PLANET_NESSUS`
- Manifest 周期：每周

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 阵营奖励 | 直接区域候选，需 Live 库存核对 | `category_faction_rewards` | Manifest 定义包含 15 个候选条目 |
| 杂项 | 直接区域候选，需 Live 库存核对 | `category_weapon_misc` | Manifest 定义包含 4 个候选条目 |
| 提高阵营声望 | 子库存候选，需 Live 父入口核对 | `category_token_reward` | 涅索斯记忆水晶（281325420，隐藏定义）：阵营装备、阵营武器、额外奖励 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 一位老朋友（intro_step0_name） |

### 佩特拉·万吉

- Hash：`1841717884`
- vendorIdentifier：`DREAMING_CITY_PETRA_VENJ`
- Manifest 周期：每周

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 消耗品 | 直接区域候选，需 Live 库存核对 | `bucket_consumables` | Manifest 定义包含 5 个候选条目 |
| 材料交换 | 直接区域候选，需 Live 库存核对 | `category_materials_exchange` | Manifest 定义包含 2 个候选条目 |
| 任务 | 任务候选，需 Live 库存核对 | `category_pursuits` | Manifest 定义包含 4 个候选条目 |
| 可进行的悬赏 | 任务候选，需 Live 库存核对 | `category_city_bounty` | Manifest 定义包含 23 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 一位老朋友（intro_step0_name） |

### 埃里斯·摩恩

- Hash：`1616085565`
- vendorIdentifier：`ERIS_MORN`
- Manifest 周期：每周

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 战役 | 直接区域候选，需 Live 库存核对 | `category_campaign` | Manifest 定义包含 1 个候选条目 |
| 死去的机灵 | 直接区域候选，需 Live 库存核对 | `category_secret_spirits` | Manifest 定义包含 10 个候选条目 |
| 任务 | 任务候选，需 Live 库存核对 | `bucket_bounties` | Manifest 定义包含 2 个候选条目 |
| 已放弃的任务 | 任务候选，需 Live 库存核对 | `generic_quest_resume_display_category` | Manifest 定义包含 17 个候选条目 |
| 月球悬赏 | 任务候选，需 Live 库存核对 | `category_luna_bounties_public_loop` | Manifest 定义包含 24 个候选条目 |
| 接受 | 直接区域候选，需 Live 库存核对 | `action_generic_accept` | Manifest 定义包含 1 个候选条目 |
| 预订奖励 | 直接区域候选，需 Live 库存核对 | `category_preorder_rewards` | Manifest 定义包含 2 个候选条目 |
| 豪华奖励 | 直接区域候选，需 Live 库存核对 | `category_deluxe_rewards` | Manifest 定义包含 3 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 材料交换（category_materials_exchange）；限时活动（vendor.eris.category.firecracker_access）；一位老朋友（intro_step0_name） |

### 忠臣瓦里克斯

- Hash：`2531198101`
- vendorIdentifier：`EUROPA_FACTION`
- Manifest 周期：每日

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 凌光之刻奖励物品 | 直接区域候选，需 Live 库存核对 | `category.v500_bonus_items` | Manifest 定义包含 1 个候选条目 |
| 木卫二悬赏 | 任务候选，需 Live 库存核对 | `category_bounties` | Manifest 定义包含 45 个候选条目 |
| 堕落者帝国 | 直接区域候选，需 Live 库存核对 | `category_fallen_empire` | Manifest 定义包含 9 个候选条目 |
| 蓄意破坏 | 子库存候选，需 Live 父入口核对 | `category_sabotage` | 蓄意破坏（3705882217 / EUROPA_FACTION_SABOTAGE）：第I阶、第II阶、第III阶 |
| 武器任务 | 直接区域候选，需 Live 库存核对 | `category_weapon` | Manifest 定义包含 5 个候选条目 |
| 消耗品 | 直接区域候选，需 Live 库存核对 | `category_consumables` | Manifest 定义包含 1 个候选条目 |
| 任务 | 任务候选，需 Live 库存核对 | `category_pursuits` | Manifest 定义包含 5 个候选条目 |
| 战役 | 任务候选，需 Live 库存核对 | `quest_archive.category_campaign.name` | Manifest 定义包含 1 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 一位老朋友（intro_step0_name） |

### Exo陌客

- Hash：`4254652401`
- vendorIdentifier：`EUROPA_STRANGER`
- Manifest 周期：每日

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 拥抱暗影 | 子库存候选，需 Live 父入口核对 | `subpage_categories.darkness_name` | 巨兽（3529215660 / SUBCLASS_STASIS_TITAN_CLASS）：技能、星相和碎片<br>冰魂（1942263816 / SUBCLASS_STASIS_HUNTER_CLASS）：技能、星相和碎片<br>影宗（2223896103 / SUBCLASS_STASIS_WARLOCK_CLASS）：技能、星相和碎片 |
| 凌光之刻：专属奖励 | 直接区域候选，需 Live 库存核对 | `display.exclusives` | Manifest 定义包含 2 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 任务（display.pursuits）；一位老朋友（intro_step0_name） |

### 芬奇

- Hash：`2384113223`
- vendorIdentifier：`THRONEWORLD_FACTION`
- Manifest 周期：每日

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 等级奖励 | 声望候选，需 Live progression 核对 | `category_rank_rewards` | Manifest 定义包含 31 个候选条目 |
| 邪姬魅影奖励物品 | 直接区域候选，需 Live 库存核对 | `category.v600_bonus_items` | Manifest 定义包含 1 个候选条目 |
| 悬赏 | 任务候选，需 Live 库存核对 | `category_bounties` | Manifest 定义包含 40 个候选条目 |
| 战役 | 任务候选，需 Live 库存核对 | `quest_archive.category_campaign.name` | Manifest 定义包含 1 个候选条目 |
| 任务 | 任务候选，需 Live 库存核对 | `category_pursuits` | Manifest 定义包含 1 个候选条目 |
| 任务 | 任务候选，需 Live 库存核对 | `pursuit_category` | Manifest 定义包含 1 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 一位老朋友（intro_step0_name） |

### 宁博思

- Hash：`1021220385`
- vendorIdentifier：`NEOMUNA_FACTION`
- Manifest 周期：每日

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 等级奖励 | 声望候选，需 Live progression 核对 | `category_rank_rewards` | Manifest 定义包含 32 个候选条目 |
| 光陨之秋奖励物品 | 直接区域候选，需 Live 库存核对 | `category.v700_bonus_items` | Manifest 定义包含 1 个候选条目 |
| 悬赏 | 任务候选，需 Live 库存核对 | `category_bounties` | Manifest 定义包含 36 个候选条目 |
| 战役 | 任务候选，需 Live 库存核对 | `quest_archive.category_campaign.name` | Manifest 定义包含 1 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 一位老朋友（intro_step0_name） |

### 普卡池

- Hash：`1413212512`
- vendorIdentifier：`NEOMUNA_STRAND`
- Manifest 周期：每日

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 拥抱暗影之力 | 子库存候选，需 Live 父入口核对 | `subpage_categories.name` | 缚丝（1100958339，隐藏定义）：技能、星相和碎片<br>缚丝（732837095，隐藏定义）：技能、星相和碎片<br>缚丝（4159957372，隐藏定义）：技能、星相和碎片 |
| 任务 | 任务候选，需 Live 库存核对 | `strand_vendor_category.exotic_pursuit` | Manifest 定义包含 2 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 获取缚丝冥想（tooltip.help.name） |

### 昆恩·菈咖利

- Hash：`1664326810`
- vendorIdentifier：`NEOMUNA_ARCHIVIST`
- Manifest 周期：无固定周期

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 云端行者记录 | 任务候选，需 Live 库存核对 | `pursuits_category` | Manifest 定义包含 9 个候选条目 |
| 已放弃的任务 | 任务候选，需 Live 库存核对 | `generic_quest_resume_display_category` | Manifest 定义包含 16 个候选条目 |

### 韩潇

- Hash：`1816541247`
- vendorIdentifier：`COSMODROME_FACTION`
- Manifest 周期：每周

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 新手包 | 直接区域候选，需 Live 库存核对 | `offers_kiosk.category_starter_pack` | Manifest 定义包含 10 个候选条目 |
| 凌光之刻奖励物品 | 直接区域候选，需 Live 库存核对 | `category.v500_bonus_items` | Manifest 定义包含 1 个候选条目 |
| 邪姬魅影奖励物品 | 直接区域候选，需 Live 库存核对 | `category.v600_bonus_items` | Manifest 定义包含 1 个候选条目 |
| 终焉之形奖励物品 | 直接区域候选，需 Live 库存核对 | `category.v800_bonus_items` | Manifest 定义包含 4 个候选条目 |
| 宿命边缘奖励物品 | 直接区域候选，需 Live 库存核对 | `category.v900_bonus_items` | Manifest 定义包含 2 个候选条目 |
| 凌光之刻预购物品 | 直接区域候选，需 Live 库存核对 | `category.v500_preorder_items` | Manifest 定义包含 3 个候选条目 |
| 邪姬魅影预购物品 | 直接区域候选，需 Live 库存核对 | `category.v600_preorder_items` | Manifest 定义包含 3 个候选条目 |
| 异域 | 直接区域候选，需 Live 库存核对 | `exotic_category` | Manifest 定义包含 1 个候选条目 |
| 终焉之形预购物品 | 直接区域候选，需 Live 库存核对 | `category.v800_preorder_items` | Manifest 定义包含 6 个候选条目 |
| 预言之年预购物品 | 子库存候选，需 Live 父入口核对 | `category.v900_preorder_items` | 半机械复仇神套装（3055714495，隐藏定义）：包含记忆水晶、包含内容<br>黑曜石耐用钢套装（2649645901，隐藏定义）：包含记忆水晶、包含内容<br>狂暴劫匪后裔套装（140522330，隐藏定义）：包含记忆水晶、包含内容 |
| Marathon预购物品 | 直接区域候选，需 Live 库存核对 | `category.goliath_preorder_items` | Manifest 定义包含 3 个候选条目 |
| 终焉之形 | 直接区域候选，需 Live 库存核对 | `warp_category` | Manifest 定义包含 1 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 光陨之秋奖励物品（category.v700_bonus_items）；一位老朋友（intro_step0_name） |

### 凯德6号

- Hash：`1857431946`
- vendorIdentifier：`SCHISM_EXOTIC`
- Manifest 周期：每日

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 已放弃的任务 | 任务候选，需 Live 库存核对 | `generic_quest_resume_display_category` | Manifest 定义包含 3 个候选条目 |

### 机灵

- Hash：`1660659508`
- vendorIdentifier：`SCHISM_FACTION`
- Manifest 周期：每日

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 聚焦破译和升级 | 子库存候选，需 Live 父入口核对 | `display_category.focusing_upgrades` | 聚焦破译（444807002 / SCHISM_FOCUSING）：苍白之心武器聚焦、苍白之心护甲聚焦 |
| 同调 | 子库存候选，需 Live 父入口核对 | `attunement` | 同调（2734167 / SCHISM_FACTION_ATTUNEMENT）：同调、相对主义 - 第I栏、相对主义 - 第II栏、关闭同调 - 相对主义、克己主义 - 第I栏、克己主义 - 第II栏、关闭同调 - 克己主义、唯我主义 - 第I栏、唯我主义 - 第II栏、关闭同调 - 唯我主义、猛攻同调 |
| 等级奖励 | 声望候选，需 Live progression 核对 | `category.rank_rewards_seasonal` | 苍白之心武器（2648770314，隐藏定义）：奖励 |
| 已放弃的任务 | 任务候选，需 Live 库存核对 | `generic_quest_resume_display_category` | Manifest 定义包含 19 个候选条目 |
| 超越极限 | 直接区域候选，需 Live 库存核对 | `display_category.transcendent` | Manifest 定义包含 2 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 提高阵营声望（category_token_reward）；机灵声望（faction.help.name） |

### 米迦的联系频道

- Hash：`3352059696`
- vendorIdentifier：`SCHISM_TROPHY_HALL`
- Manifest 周期：每日

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 终焉岁月 | 直接区域候选，需 Live 库存核对 | `vendor.category` | Manifest 定义包含 11 个候选条目 |
| 已放弃的任务 | 任务候选，需 Live 库存核对 | `generic_quest_resume_display_category` | Manifest 定义包含 54 个候选条目 |
| 失踪的机灵 | 直接区域候选，需 Live 库存核对 | `vendor.category` | Manifest 定义包含 1 个候选条目 |

### 相对论圣坛

- Hash：`1474045886`
- vendorIdentifier：`KEPLER_CENOTE`
- Manifest 周期：无固定周期

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 战役 | 直接区域候选，需 Live 库存核对 | `category.campaign` | Manifest 定义包含 2 个候选条目 |
| 追猎任务 | 任务候选，需 Live 库存核对 | `category.pursuits` | Manifest 定义包含 5 个候选条目 |
| 奖励 | 子库存候选，需 Live 父入口核对 | `category.rewards` | 同调（714148153 / KEPLER_CENOTE_ATTUNEMENT）：武器、护甲、护甲版本<br>聚焦破译（2326799670，隐藏定义）：剩余每日购买：{var:2587524223}、开普勒记忆水晶<br>聚焦破译（4038780559，隐藏定义）：剩余每日购买：{var:2587524223}、开普勒记忆水晶<br>聚焦破译（406176502，隐藏定义）：剩余每日购买：{var:2587524223}、开普勒记忆水晶<br>聚焦破译（3550596112，隐藏定义）：剩余每日购买：{var:2587524223}、开普勒记忆水晶 |
| 升级与交换 | 直接区域候选，需 Live 库存核对 | `category.economy` | Manifest 定义包含 15 个候选条目 |
| 已放弃的任务 | 任务候选，需 Live 库存核对 | `generic_quest_resume_display_category` | Manifest 定义包含 110 个候选条目 |
| 战役 | 任务候选，需 Live 库存核对 | `quest_archive.category_campaign.name` | Manifest 定义包含 1 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 帮助（help） |

### 蛛王

- Hash：`1054786807`
- vendorIdentifier：`BEHEMOTH_SPIDER`
- Manifest 周期：每周

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 奖励 | 直接区域候选，需 Live 库存核对 | `category_rewards` | Manifest 定义包含 6 个候选条目 |
| 特殊订单 | 子库存候选，需 Live 父入口核对 | `category_crm_general` | 无序边界装备（387540574，隐藏定义）：奖励<br>无序边界装备（2640234444，隐藏定义）：奖励<br>无序边界装备（3634971627，隐藏定义）：奖励 |
| 反叛者技能 | 子库存候选，需 Live 父入口核对 | `category_abilities` | 反叛者技能（3995168008，隐藏定义）：复苏、侦察机、空中扫射 |
| 已放弃的任务 | 任务候选，需 Live 库存核对 | `generic_quest_resume_display_category` | Manifest 定义包含 2 个候选条目 |
| 任务 | 任务候选，需 Live 库存核对 | `category_pursuits` | Manifest 定义包含 1 个候选条目 |

### 护甲商阿戈尔

- Hash：`1499949918`
- vendorIdentifier：`BEHEMOTH_CABAL_QUARTERMASTER`
- Manifest 周期：每周

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 声望奖励 | 声望候选，需 Live progression 核对 | `category_rank_rewards` | Manifest 定义包含 6 个候选条目 |
| 反叛者技能 | 子库存候选，需 Live 父入口核对 | `category_abilities` | 反叛者技能（424914393，隐藏定义）：帝国空降仓、帝国巨兽 |
| 周常补给 | 直接区域候选，需 Live 库存核对 | `category_shipments` | Manifest 定义包含 3 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 帮助（category_help） |

### 机械师德欧里克斯

- Hash：`1305220558`
- vendorIdentifier：`BEHEMOTH_ELIKSNI_QUARTERMASTER`
- Manifest 周期：每周

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 声望奖励 | 声望候选，需 Live progression 核对 | `category_rank_rewards` | Manifest 定义包含 6 个候选条目 |
| 反叛者技能 | 子库存候选，需 Live 父入口核对 | `category_abilities` | 反叛者技能（2374004633，隐藏定义）：派克组迫击炮、派克组拆车厂 |
| 周常补给 | 直接区域候选，需 Live 库存核对 | `category_shipments` | Manifest 定义包含 3 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 帮助（category_help） |

### 革新师古筝

- Hash：`1664442954`
- vendorIdentifier：`BEHEMOTH_VEX_QUARTERMASTER`
- Manifest 周期：每周

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 声望奖励 | 声望候选，需 Live progression 核对 | `category_rank_rewards` | Manifest 定义包含 6 个候选条目 |
| 反叛者技能 | 子库存候选，需 Live 父入口核对 | `category_abilities` | 反叛者技能（2157480145，隐藏定义）：Vex偏转器、Vex眩晕力场 |
| 周常补给 | 直接区域候选，需 Live 库存核对 | `category_shipments` | Manifest 定义包含 3 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 帮助（category_help） |

## 系统、终端与档案入口

### 失落光能纪念碑

- Hash：`4230408743`
- vendorIdentifier：`TOWER_EXOTIC_ARCHIVE`
- Manifest 周期：每周

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 异域装备档案 | 子库存候选，需 Live 父入口核对 | `exotic_archive_subcategory.header` | 光明与黑暗传奇异域装备（2779423129，隐藏定义）：终焉之形异域装备、光陨之秋异域装备、邪姬魅影异域装备、《凌光之刻》异域装备、《暗影要塞》异域装备、《遗落之族》异域装备、《猩红战争》异域装备<br>宿命传奇异域装备（523199268，隐藏定义）：宿命边缘、反叛 |
| 传承装备 | 子库存候选，需 Live 父入口核对 | `exotic_archive_subcategory.pinnacle.header` | 传承装备（1092954315 / TOWER_EXOTIC_ARCHIVE_PINNACLE）：武器、熔炉竞技场武器、智谋武器、先锋武器、武器皮肤 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 光明与黑暗传奇异域装备（exotic_archive_category_light_and_dark_saga.name）；宿命传奇异域装备（exotic_archive_category_fate_saga.name）；传承装备（exotic_archive_category_pinnacle.name）；异域装备档案II（exotic_archive_subcategory.header2） |

### 过往赛季纪念碑

- Hash：`2572415929`
- vendorIdentifier：`TOWER_SEASONAL_ARCHIVE`
- Manifest 周期：每周
- 特殊说明：多层归档树，需要按入口懒加载。

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 兑换时序币 | 子库存候选，需 Live 父入口核对 | `seasonal_archive_exchange.name` | 兑换时序币（3949128738 / TOWER_SEASONAL_ARCHIVE_EXCHANGE）：材料、货币、记忆水晶 |
| 预言之年 | 子库存候选，需 Live 父入口核对 | `seasonal_archive_category.name5` | 溯回（4213004375，隐藏定义）：购买归档通票、职业奖励、异域奖励、传说奖励<br>铁旗余灰（4213004374，隐藏定义）：购买归档通票、职业奖励、异域奖励、传说奖励<br>无序（41140288，隐藏定义）：购买归档通票、职业奖励、异域奖励、传说奖励 |
| 《终焉之形》年 | 子库存候选，需 Live 父入口核对 | `seasonal_archive_category.name4` | 篇章：回响（3394295932 / TOWER_SEASONAL_ARCHIVE_SEASON24）：购买归档通票、职业奖励、异域奖励、传说奖励<br>篇章：怨魂（3394295933 / TOWER_SEASONAL_ARCHIVE_SEASON25）：购买归档通票、职业奖励、异域奖励、传说奖励<br>篇章：异端（3394295934 / TOWER_SEASONAL_ARCHIVE_SEASON26）：购买归档通票、职业奖励、异域奖励、传说奖励 |
| 《光陨之秋》年 | 子库存候选，需 Live 父入口核对 | `seasonal_archive_category.name3` | 抗战赛季（3394295928 / TOWER_SEASONAL_ARCHIVE_SEASON20）：购买归档通票、职业奖励、异域奖励、传说奖励<br>深渊赛季（3394295929 / TOWER_SEASONAL_ARCHIVE_SEASON21）：购买归档通票、职业奖励、异域奖励、传说奖励<br>奇巫赛季（3394295930 / TOWER_SEASONAL_ARCHIVE_SEASON22）：购买归档通票、职业奖励、异域奖励、传说奖励<br>终愿赛季（3394295931 / TOWER_SEASONAL_ARCHIVE_SEASON23）：购买归档通票、职业奖励、异域奖励、传说奖励 |
| 《邪姬魅影》年 | 子库存候选，需 Live 父入口核对 | `seasonal_archive_category.name2` | 苏生赛季（3444628791 / TOWER_SEASONAL_ARCHIVE_SEASON16）：购买归档通票、职业奖励、异域奖励、传说奖励<br>宿怨赛季（3444628790 / TOWER_SEASONAL_ARCHIVE_SEASON17）：购买归档通票、职业奖励、异域奖励、传说奖励<br>侠盗赛季（3444628793 / TOWER_SEASONAL_ARCHIVE_SEASON18）：购买归档通票、职业奖励、异域奖励、传说奖励<br>炽天使赛季（3444628792 / TOWER_SEASONAL_ARCHIVE_SEASON19）：购买归档通票、职业奖励、异域奖励、传说奖励 |
| 《凌光之刻》年 | 子库存候选，需 Live 父入口核对 | `seasonal_archive_category.name1` | 狂猎赛季（3444628787 / TOWER_SEASONAL_ARCHIVE_SEASON12）：购买归档通票、职业奖励、异域奖励、传说奖励<br>天选赛季（3444628786 / TOWER_SEASONAL_ARCHIVE_SEASON13）：购买归档通票、职业奖励、异域奖励、传说奖励<br>永夜赛季（3444628789 / TOWER_SEASONAL_ARCHIVE_SEASON14）：购买归档通票、职业奖励、异域奖励、传说奖励<br>神隐赛季（3444628788 / TOWER_SEASONAL_ARCHIVE_SEASON15）：购买归档通票、职业奖励、异域奖励、传说奖励 |
| 《暗影要塞》年 | 子库存候选，需 Live 父入口核对 | `seasonal_archive_category.name0` | 不朽赛季（2890273682 / TOWER_SEASONAL_ARCHIVE_SEASON8）：购买归档通票、职业奖励、异域奖励、传说奖励<br>黎明赛季（2890273683 / TOWER_SEASONAL_ARCHIVE_SEASON9）：购买归档通票、职业奖励、异域奖励、传说奖励<br>英杰赛季（3444628785 / TOWER_SEASONAL_ARCHIVE_SEASON10）：购买归档通票、职业奖励、异域奖励、传说奖励<br>影临赛季（3444628784 / TOWER_SEASONAL_ARCHIVE_SEASON11）：购买归档通票、职业奖励、异域奖励、传说奖励 |

### 任务档案

- Hash：`3484140575`
- vendorIdentifier：`TOWER_QUEST_ARCHIVE`
- Manifest 周期：每周

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 新曙光与战役 | 任务候选，需 Live 库存核对 | `quest_archive_subcategory.header0` | 新曙光（3884814177 / TOWER_QUEST_ARCHIVE_LAUNCHPAD）：任务步骤、新曙光、已放弃的任务<br>战役（4030123077 / TOWER_QUEST_ARCHIVE_CAMPAIGN）：战役、已放弃的任务 |
| 赛季与仪式 | 任务候选，需 Live 库存核对 | `quest_archive_subcategory.header1` | 赛季（1879603427 / TOWER_QUEST_ARCHIVE_SEASONAL）：赛季、已放弃的任务<br>仪式游戏列表（1099523204 / TOWER_QUEST_ARCHIVE_PLAYLISTS）：仪式游戏列表 |
| 异域与遗产 | 任务候选，需 Live 库存核对 | `quest_archive_subcategory.header2` | 异域（2776510816 / TOWER_QUEST_ARCHIVE_EXOTICS）：异域、已放弃的任务<br>过去（4242059374 / TOWER_QUEST_ARCHIVE_LEGACY）：过去、已放弃的任务 |
| 已放弃的任务 | 任务候选，需 Live 库存核对 | `generic_quest_resume_display_category` | Manifest 定义包含 2 个候选条目 |

### 圣物通道

- Hash：`3642056527`
- vendorIdentifier：`CRAFTING_RELIC_CONDUIT`
- Manifest 周期：无固定周期

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|

### 证据板

- Hash：`1670274555`
- vendorIdentifier：`MARS_EVIDENCE_BOARD`
- Manifest 周期：无固定周期

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 隐秘者报告 | 直接区域候选，需 Live 库存核对 | `category_case_files` | Manifest 定义包含 16 个候选条目 |

### 附魔台

- Hash：`3411552308`
- vendorIdentifier：`RUNE_TABLE`
- Manifest 周期：每周

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 梦魇悬赏 | 任务候选，需 Live 库存核对 | `category_luna_bounties_nightmare` | Manifest 定义包含 17 个候选条目 |
| 梦魇精华 | 任务候选，需 Live 库存核对 | `pursuit_vendor_category` | Manifest 定义包含 14 个候选条目 |
| 材料交换 | 直接区域候选，需 Live 库存核对 | `category_materials_exchange` | Manifest 定义包含 3 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 奖励（category_reward） |

### 同调

- Hash：`4288512789`
- vendorIdentifier：`SHARED_ATTUNEMENT`
- Manifest 周期：无固定周期
- 特殊说明：导航入口，不是直接售卖 NPC。

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 装备同调 | 子库存候选，需 Live 父入口核对 | `subscreens.title` | 扭曲同调（3339357685 / SPOTLIGHTS_ATTUNEMENT）：武器、护甲<br>世界同调（3611756231 / WORLD_ATTUNEMENT）：武器、护甲<br>单人行动同调（4035770216 / SOLO_ATTUNEMENT）：武器、护甲<br>火力战队行动同调（1137601706 / FIRETEAM_ATTUNEMENT）：武器、护甲<br>竞技场行动同调（2345012294 / ARENA_ATTUNEMENT）：武器、护甲<br>巅峰行动同调（2266106659 / PINNACLE_ATTUNEMENT）：武器、护甲 |

### ORDER_REWARDS

- Hash：`2966953990`
- vendorIdentifier：`ORDER_REWARDS`
- Manifest 周期：无固定周期

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 奖励 | 子库存候选，需 Live 父入口核对 | `preview.name` | 扭曲记忆水晶（800951684，隐藏定义）：奖励<br>异域记忆水晶（1092685591，隐藏定义）：异域装备、特色内容<br>虹彩记忆水晶（862719203，隐藏定义）：可能包括： |

### EVENT_CARD

- Hash：`1939805579`
- vendorIdentifier：`EVENT_CARD`
- Manifest 周期：每周
- 特殊说明：活动卡系统，不是普通 NPC 商人。

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 至日 | 直接区域候选，需 Live 库存核对 | `event_card.name` | Manifest 定义包含 26 个候选条目 |
| 英灵日 | 子库存候选，需 Live 父入口核对 | `event_card.name` | 英灵日活动包（1193651647，隐藏定义）：包含记忆水晶、包含内容 |
| 英灵日 | 直接区域候选，需 Live 库存核对 | `fotl_event_card.name` | Manifest 定义包含 23 个候选条目 |
| 守护者游戏 | 子库存候选，需 Live 父入口核对 | `event_card.name` | 守护者游戏卡片升级（2090116705，隐藏定义）：包含记忆水晶、包含内容 |
| 守护者游戏 | 子库存候选，需 Live 父入口核对 | `spring_event_card.name` | 守护者游戏记忆水晶（3747005007，隐藏定义）：奖励<br>守护者游戏记忆水晶（3747005006，隐藏定义）：奖励<br>守护者游戏记忆水晶（3747005001，隐藏定义）：奖励<br>守护者游戏记忆水晶（3747005000，隐藏定义）：奖励 |
| 重金属 | 子库存候选，需 Live 父入口核对 | `heavy_metal.name` | 重金属记忆水晶（1814426466，隐藏定义）：奖励<br>重金属记忆水晶（1814426467，隐藏定义）：奖励<br>重金属记忆水晶（1814426468，隐藏定义）：奖励<br>重金属记忆水晶（1814426469，隐藏定义）：奖励 |
| 武器周 | 直接区域候选，需 Live 库存核对 | `arms_week_event_card.name` | Manifest 定义包含 20 个候选条目 |
| 武器周 | 直接区域候选，需 Live 库存核对 | `v910_display_event_shop` | Manifest 定义包含 20 个候选条目 |
| 新领土：收复 | 直接区域候选，需 Live 库存核对 | `new_territories.reclaim.name` | Manifest 定义包含 20 个候选条目 |
| 铁旗 | 子库存候选，需 Live 父入口核对 | `iron_banner.name` | 铁旗武器记忆水晶（703289292，隐藏定义）：奖励<br>铁旗武器记忆水晶（703289293，隐藏定义）：奖励<br>铁旗武器记忆水晶（703289290，隐藏定义）：奖励<br>铁旗武器记忆水晶（703289291，隐藏定义）：奖励<br>铁旗护甲记忆水晶（491291905，隐藏定义）：奖励<br>铁旗护甲记忆水晶（491291904，隐藏定义）：奖励<br>铁旗护甲记忆水晶（491291911，隐藏定义）：奖励<br>铁旗护甲记忆水晶（491291910，隐藏定义）：奖励 |
| 武装召唤 | 子库存候选，需 Live 父入口核对 | `rally_event_card.name` | 武装召唤武器记忆水晶（1088286490，隐藏定义）：奖励<br>武装召唤武器记忆水晶（1088286491，隐藏定义）：奖励<br>武装召唤武器记忆水晶（1088286492，隐藏定义）：奖励 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 未命名（v950_display_event_shop） |

### 特殊货物

- Hash：`296729347`
- vendorIdentifier：`TOWER_OFFERS`
- Manifest 周期：每周

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| Bungie基金会奖励 | 子库存候选，需 Live 父入口核对 | `category.promo.charity.bungie_foundation` | 灵动光谱（1496560794，隐藏定义）：包含记忆水晶、包含内容<br>骄傲着色器包（2822420121，隐藏定义）：包含记忆水晶、包含内容 |
| 遗落之族预购物品 | 直接区域候选，需 Live 库存核对 | `category.v400_preorder_items` | Manifest 定义包含 4 个候选条目 |
| 凌光之刻奖励物品 | 直接区域候选，需 Live 库存核对 | `category.v500_bonus_items` | Manifest 定义包含 1 个候选条目 |
| 邪姬魅影奖励物品 | 直接区域候选，需 Live 库存核对 | `category.v600_bonus_items` | Manifest 定义包含 1 个候选条目 |
| 光陨之秋奖励物品 | 直接区域候选，需 Live 库存核对 | `category.v700_bonus_items` | Manifest 定义包含 2 个候选条目 |
| 终焉之形奖励物品 | 直接区域候选，需 Live 库存核对 | `category.v800_bonus_items` | Manifest 定义包含 3 个候选条目 |
| 宿命边缘奖励物品 | 直接区域候选，需 Live 库存核对 | `category.v900_bonus_items` | Manifest 定义包含 2 个候选条目 |
| 凌光之刻预购物品 | 直接区域候选，需 Live 库存核对 | `category.v500_preorder_items` | Manifest 定义包含 3 个候选条目 |
| 邪姬魅影预购物品 | 直接区域候选，需 Live 库存核对 | `category.v600_preorder_items` | Manifest 定义包含 3 个候选条目 |
| 光陨之秋预购物品 | 直接区域候选，需 Live 库存核对 | `category.v700_preorder_items` | Manifest 定义包含 4 个候选条目 |
| 终焉之形预购物品 | 直接区域候选，需 Live 库存核对 | `category.v800_preorder_items` | Manifest 定义包含 6 个候选条目 |
| 预言之年预购物品 | 子库存候选，需 Live 父入口核对 | `category.v900_preorder_items` | 半机械复仇神套装（3055714495，隐藏定义）：包含记忆水晶、包含内容<br>黑曜石耐用钢套装（2649645901，隐藏定义）：包含记忆水晶、包含内容<br>狂暴劫匪后裔套装（140522330，隐藏定义）：包含记忆水晶、包含内容 |
| Marathon预购物品 | 直接区域候选，需 Live 库存核对 | `category.goliath_preorder_items` | Manifest 定义包含 3 个候选条目 |
| 拉乎尔的秘密藏货 | 直接区域候选，需 Live 库存核对 | `category.v700_nebula_stash` | Manifest 定义包含 20 个候选条目 |
| 拉乎尔的秘密藏货 | 直接区域候选，需 Live 库存核对 | `category.v800_warp_stash` | Manifest 定义包含 15 个候选条目 |
| 拉乎尔的秘密藏货 | 直接区域候选，需 Live 库存核对 | `category.v900_slingshot_stash` | Manifest 定义包含 16 个候选条目 |
| 特别优惠 | 子库存候选，需 Live 父入口核对 | `category_special_offers` | 九元记忆水晶（2568871258，隐藏定义）：可能包括： |
| 新手包 | 直接区域候选，需 Live 库存核对 | `offers_kiosk.category_starter_pack` | Manifest 定义包含 10 个候选条目 |
| 奖励 | 直接区域候选，需 Live 库存核对 | `category_generic_rewards` | Manifest 定义包含 176 个候选条目 |
| 额外奖励 | 子库存候选，需 Live 父入口核对 | `category_additional_rewards` | 合成虚无套装（662227347，隐藏定义）：包含记忆水晶、包含内容<br>残暴战织套装（1494201273，隐藏定义）：包含记忆水晶、包含内容<br>破局者套装（1258586114，隐藏定义）：包含记忆水晶、包含内容<br>永恒之诗记忆水晶（1968811824，隐藏定义）：最近添加<br>疾行包（858305680，隐藏定义）：包含记忆水晶、包含内容 |
| 认证 | 直接区域候选，需 Live 库存核对 | `category_sony_cert` | Manifest 定义包含 49 个候选条目 |
| 奖励 | 直接区域候选，需 Live 库存核对 | `category_promo_rainforest` | Manifest 定义包含 108 个候选条目 |
| 奖励 | 直接区域候选，需 Live 库存核对 | `category_reward` | Manifest 定义包含 1 个候选条目 |
| 比赛反应 | 直接区域候选，需 Live 库存核对 | `match_reactions_name` | Manifest 定义包含 5 个候选条目 |
| 10周年纪念礼物 | 子库存候选，需 Live 父入口核对 | `category.v805_anniversary` | 10周年纪念奖励组合包（3923873857，隐藏定义）：包含记忆水晶、包含内容<br>10周年纪念奖励组合包（4117847739，隐藏定义）：包含记忆水晶、包含内容<br>10周年纪念奖励组合包（3990247390，隐藏定义）：包含记忆水晶、包含内容 |

### 忠诚信条

- Hash：`561095104`
- vendorIdentifier：`TOWER_MOT_TENET_BRAVERY`
- Manifest 周期：无固定周期

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 特色奖励 | 子库存候选，需 Live 父入口核对 | `category.vendor_mot_upper` | 不朽传奇（2003979358，隐藏定义）：包含记忆水晶、包含内容<br>不朽传奇（4281864250，隐藏定义）：包含记忆水晶、包含内容<br>不朽传奇（2006509709，隐藏定义）：包含记忆水晶、包含内容<br>合成虚无套装（662227347，隐藏定义）：包含记忆水晶、包含内容<br>残暴战织套装（1494201273，隐藏定义）：包含记忆水晶、包含内容<br>破局者套装（1258586114，隐藏定义）：包含记忆水晶、包含内容<br>前线（2003979356，隐藏定义）：包含记忆水晶、包含内容<br>前线（4281864248，隐藏定义）：包含记忆水晶、包含内容<br>前线（2006509711，隐藏定义）：包含记忆水晶、包含内容 |
| 纪念碑奖励 | 子库存候选，需 Live 父入口核对 | `category.vendor_mot_left` | 溯回：活动武器记忆水晶（3920765440，隐藏定义）：奖励<br>溯回：活动武器记忆水晶（3920765443，隐藏定义）：奖励<br>溯回：活动武器记忆水晶（3920765442，隐藏定义）：奖励<br>溯回：活动武器记忆水晶（3920765445，隐藏定义）：奖励<br>溯回：活动武器记忆水晶（3920765444，隐藏定义）：奖励<br>无序：活动武器记忆水晶（3599103484，隐藏定义）：奖励<br>无序：活动武器记忆水晶（3599103487，隐藏定义）：奖励<br>无序：活动武器记忆水晶（3599103486，隐藏定义）：奖励<br>无序：活动武器记忆水晶（3599103481，隐藏定义）：奖励<br>无序：活动武器记忆水晶（3599103480，隐藏定义）：奖励<br>至日武器记忆水晶（1703914293，隐藏定义）：奖励<br>至日武器记忆水晶（1703914294，隐藏定义）：奖励<br>至日武器记忆水晶（1703914295，隐藏定义）：奖励<br>至日武器记忆水晶（1703914288，隐藏定义）：奖励<br>至日武器记忆水晶（1703914289，隐藏定义）：奖励<br>至日护甲记忆水晶（3246076012，隐藏定义）：奖励<br>至日护甲记忆水晶（3246076015，隐藏定义）：奖励<br>至日护甲记忆水晶（3246076014，隐藏定义）：奖励<br>至日护甲记忆水晶（3246076009，隐藏定义）：奖励<br>至日护甲记忆水晶（3246076008，隐藏定义）：奖励<br>奇异武器记忆水晶（2701556456，隐藏定义）：奖励<br>奇异武器记忆水晶（2701556459，隐藏定义）：奖励<br>奇异武器记忆水晶（2701556458，隐藏定义）：奖励<br>奇异武器记忆水晶（2701556461，隐藏定义）：奖励<br>奇异武器记忆水晶（2701556460，隐藏定义）：奖励<br>曙光节武器记忆水晶（1383027445，隐藏定义）：奖励<br>曙光节武器记忆水晶（1383027446，隐藏定义）：奖励<br>曙光节武器记忆水晶（1383027447，隐藏定义）：奖励<br>曙光节武器记忆水晶（1383027440，隐藏定义）：奖励<br>曙光节武器记忆水晶（1383027441，隐藏定义）：奖励<br>守护者游戏武器记忆水晶（2076213794，隐藏定义）：奖励<br>守护者游戏武器记忆水晶（2076213793，隐藏定义）：奖励<br>守护者游戏武器记忆水晶（2076213792，隐藏定义）：奖励<br>守护者游戏武器记忆水晶（2076213799，隐藏定义）：奖励<br>守护者游戏武器记忆水晶（2076213798，隐藏定义）：奖励<br>火力战队行动武器记忆水晶（3275816382，隐藏定义）：奖励<br>火力战队行动武器记忆水晶（3275816381，隐藏定义）：奖励<br>火力战队行动武器记忆水晶（3275816380，隐藏定义）：奖励<br>火力战队行动武器记忆水晶（3275816379，隐藏定义）：奖励<br>火力战队行动武器记忆水晶（3275816378，隐藏定义）：奖励<br>巅峰行动武器记忆水晶（3653115777，隐藏定义）：奖励<br>巅峰行动武器记忆水晶（3653115778，隐藏定义）：奖励<br>巅峰行动武器记忆水晶（3653115779，隐藏定义）：奖励<br>巅峰行动武器记忆水晶（3653115780，隐藏定义）：奖励<br>巅峰行动武器记忆水晶（3653115781，隐藏定义）：奖励<br>熔炉竞技场行动武器记忆水晶（390265306，隐藏定义）：奖励<br>熔炉竞技场行动武器记忆水晶（390265305，隐藏定义）：奖励<br>熔炉竞技场行动武器记忆水晶（390265304，隐藏定义）：奖励<br>熔炉竞技场行动武器记忆水晶（390265311，隐藏定义）：奖励<br>熔炉竞技场行动武器记忆水晶（390265310，隐藏定义）：奖励<br>赛季武器记忆水晶（4148619005，隐藏定义）：奖励<br>赛季武器记忆水晶（4148619006，隐藏定义）：奖励<br>赛季武器记忆水晶（4148619007，隐藏定义）：奖励<br>赛季武器记忆水晶（4148619000，隐藏定义）：奖励<br>赛季武器记忆水晶（4148619001，隐藏定义）：奖励 |
| 装备套装 | 直接区域候选，需 Live 库存核对 | `display_category.right_icons.00.name` | Manifest 定义包含 6 个候选条目 |
| 装备套装 | 直接区域候选，需 Live 库存核对 | `display_category.right_icons.01.name` | Manifest 定义包含 6 个候选条目 |
| 装备套装 | 直接区域候选，需 Live 库存核对 | `display_category.right_icons.02.name` | Manifest 定义包含 6 个候选条目 |
| 装备套装 | 直接区域候选，需 Live 库存核对 | `display_category.right_icons.03.name` | Manifest 定义包含 4 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 装备套装（display_category.right_icons.04.name）；装备套装（display_category.right_icons.05.name）；装备套装（display_category.right_icons.06.name）；装备套装（display_category.right_icons.07.name） |

### 死亡信条

- Hash：`3538522383`
- vendorIdentifier：`TOWER_MOT_TENET_DEATH`
- Manifest 周期：无固定周期

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 特色奖励 | 子库存候选，需 Live 父入口核对 | `category.vendor_mot_upper` | 永恒日出（2003979352，隐藏定义）：包含记忆水晶、包含内容<br>永恒日出（4281864252，隐藏定义）：包含记忆水晶、包含内容<br>永恒日出（2006509707，隐藏定义）：包含记忆水晶、包含内容<br>新朝圣卫士（2003979351，隐藏定义）：包含记忆水晶、包含内容<br>新朝圣卫士（4281864243，隐藏定义）：包含记忆水晶、包含内容<br>新朝圣卫士（2006509700，隐藏定义）：包含记忆水晶、包含内容 |
| 纪念碑奖励 | 直接区域候选，需 Live 库存核对 | `category.vendor_mot_left` | Manifest 定义包含 34 个候选条目 |
| 装备套装 | 直接区域候选，需 Live 库存核对 | `display_category.right_icons.00.name` | Manifest 定义包含 6 个候选条目 |
| 装备套装 | 直接区域候选，需 Live 库存核对 | `display_category.right_icons.01.name` | Manifest 定义包含 6 个候选条目 |
| 装备套装 | 直接区域候选，需 Live 库存核对 | `display_category.right_icons.02.name` | Manifest 定义包含 6 个候选条目 |
| 装备套装 | 直接区域候选，需 Live 库存核对 | `display_category.right_icons.03.name` | Manifest 定义包含 6 个候选条目 |
| 装备套装 | 直接区域候选，需 Live 库存核对 | `display_category.right_icons.04.name` | Manifest 定义包含 6 个候选条目 |
| 装备套装 | 直接区域候选，需 Live 库存核对 | `display_category.right_icons.05.name` | Manifest 定义包含 4 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 装备套装（display_category.right_icons.06.name）；装备套装（display_category.right_icons.07.name） |

### 奉献信条

- Hash：`1459475265`
- vendorIdentifier：`TOWER_MOT_TENET_DEVOTION`
- Manifest 周期：无固定周期

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 特色奖励 | 子库存候选，需 Live 父入口核对 | `category.vendor_mot_upper` | 超声（3104370871，隐藏定义）：包含记忆水晶、包含内容<br>热血（1146842625，隐藏定义）：包含记忆水晶、包含内容<br>光速（994095102，隐藏定义）：包含记忆水晶、包含内容<br>光明（3104370867，隐藏定义）：包含记忆水晶、包含内容<br>光明（1146842629，隐藏定义）：包含记忆水晶、包含内容<br>光明（994095098，隐藏定义）：包含记忆水晶、包含内容<br>玉兔（3104370866，隐藏定义）：包含记忆水晶、包含内容<br>玉兔（1146842628，隐藏定义）：包含记忆水晶、包含内容<br>玉兔（994095099，隐藏定义）：包含记忆水晶、包含内容<br>竞速（3104370864，隐藏定义）：包含记忆水晶、包含内容<br>竞速（1146842630，隐藏定义）：包含记忆水晶、包含内容<br>竞速（994095097，隐藏定义）：包含记忆水晶、包含内容<br>动量（3104370865，隐藏定义）：包含记忆水晶、包含内容<br>动量（1146842631，隐藏定义）：包含记忆水晶、包含内容<br>动量（994095096，隐藏定义）：包含记忆水晶、包含内容 |
| 纪念碑奖励 | 直接区域候选，需 Live 库存核对 | `category.vendor_mot_left` | Manifest 定义包含 30 个候选条目 |
| 装备套装 | 直接区域候选，需 Live 库存核对 | `display_category.right_icons.00.name` | Manifest 定义包含 6 个候选条目 |
| 装备套装 | 直接区域候选，需 Live 库存核对 | `display_category.right_icons.01.name` | Manifest 定义包含 6 个候选条目 |
| 装备套装 | 直接区域候选，需 Live 库存核对 | `display_category.right_icons.02.name` | Manifest 定义包含 6 个候选条目 |
| 装备套装 | 直接区域候选，需 Live 库存核对 | `display_category.right_icons.03.name` | Manifest 定义包含 4 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 装备套装（display_category.right_icons.04.name）；装备套装（display_category.right_icons.05.name）；装备套装（display_category.right_icons.06.name）；装备套装（display_category.right_icons.07.name） |

### 牺牲信条

- Hash：`665961858`
- vendorIdentifier：`TOWER_MOT_TENET_SACRIFICE`
- Manifest 周期：无固定周期

| 页面/区域 | 当前判断 | 依据 | 子页面或内容 |
|---|---|---|---|
| 特色奖励 | 子库存候选，需 Live 父入口核对 | `category.vendor_mot_upper` | 致幻寄生虫（2003979359，隐藏定义）：包含记忆水晶、包含内容<br>致幻寄生虫（4281864251，隐藏定义）：包含记忆水晶、包含内容<br>致幻寄生虫（2006509708，隐藏定义）：包含记忆水晶、包含内容<br>捕蝇草（2003979353，隐藏定义）：包含记忆水晶、包含内容<br>捕蝇草（4281864253，隐藏定义）：包含记忆水晶、包含内容<br>捕蝇草（2006509706，隐藏定义）：包含记忆水晶、包含内容<br>自主劫掠者（2003979355，隐藏定义）：包含记忆水晶、包含内容<br>自主劫掠者（4281864255，隐藏定义）：包含记忆水晶、包含内容<br>自主劫掠者（2006509704，隐藏定义）：包含记忆水晶、包含内容<br>幼态星旅者（2003979357，隐藏定义）：包含记忆水晶、包含内容<br>幼态星旅者（4281864249，隐藏定义）：包含记忆水晶、包含内容<br>幼态星旅者（2006509710，隐藏定义）：包含记忆水晶、包含内容<br>无氏族（2003979354，隐藏定义）：包含记忆水晶、包含内容<br>无氏族（4281864254，隐藏定义）：包含记忆水晶、包含内容<br>无氏族（2006509705，隐藏定义）：包含记忆水晶、包含内容<br>不法骑手（2003979350，隐藏定义）：包含记忆水晶、包含内容<br>不法骑手（4281864242，隐藏定义）：包含记忆水晶、包含内容<br>不法骑手（2006509701，隐藏定义）：包含记忆水晶、包含内容 |
| 纪念碑奖励 | 直接区域候选，需 Live 库存核对 | `category.vendor_mot_left` | Manifest 定义包含 32 个候选条目 |
| 装备套装 | 直接区域候选，需 Live 库存核对 | `display_category.right_icons.00.name` | Manifest 定义包含 6 个候选条目 |
| 装备套装 | 直接区域候选，需 Live 库存核对 | `display_category.right_icons.01.name` | Manifest 定义包含 6 个候选条目 |
| 装备套装 | 直接区域候选，需 Live 库存核对 | `display_category.right_icons.02.name` | Manifest 定义包含 6 个候选条目 |
| 装备套装 | 直接区域候选，需 Live 库存核对 | `display_category.right_icons.03.name` | Manifest 定义包含 6 个候选条目 |
| 内部或条件定义 | 不作为当前页面结构 | Manifest only | 装备套装（display_category.right_icons.04.name）；装备套装（display_category.right_icons.05.name）；装备套装（display_category.right_icons.06.name）；装备套装（display_category.right_icons.07.name） |

## 仄的固定结构

高塔仄已经完成，并作为统一四结构模型的首个完整配置。后续增加其他商人时不得改变以下已验收输出，也不得重新引入仄专属编排流程：

| 顺序 | 页面 | 内部区域 |
|---:|---|---|
| 1 | 声望与等级 | 等级进度、等级奖励 |
| 2 | 多样奇异优惠 | 当前主库存 |
| 3 | 更多奇异优惠 | 玖的忠诚计划、奇异材料优惠、奇异可重复优惠 |
| 4 | 奇异装备优惠 | 异域装备、传说武器、传说护甲 |

以下内容不得重新加入仄的主页面：Manifest 空分类、帮助页、引导页、未命名历史条目、未由 Live API 返回的任务或预览 Vendor。

## 人工核对方式

请直接核对每个商人的“页面/区域”列：

1. 游戏内确实存在：把“Manifest 候选”改成“已确认”。
2. 游戏内没有：标记删除或条件性隐藏。
3. 名称不同：记录游戏内实际中文名。
4. 只在特定职业、活动或任务阶段出现：补充出现条件。

本文件是数据核对材料，不是实现清单。
