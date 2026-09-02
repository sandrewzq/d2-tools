# T20：武器推荐汇总与仓库精确清理

> 更新时间：2026-09-02
> 状态：阶段 1 已冻结；阶段 3/3A 数据底座已建立；阶段 4 代码完成、待真实账号验收，尚未接入来源级仓库实例 UI
> 优先级：P1
> 实施原则：先建立可审计数据，再依次改造 Core、SQLite、账号扫描、IPC/App 和现有仓库 UI；未完成实例级只读验收前不开放待处理操作

## 1. 目标与当前基线

用户仓库约有 1000 把武器，需要把多个推荐来源转换成可审计的中文知识库，再按玩家实际拥有的每个武器实例给出“哪个来源提出了哪些要求、这把枪符合了几项、还有哪些差异”的可解释证据。玩家据此自行设置保留、待复查或待处理。

T20 的最终目标是：

1. 汇总五个一级推荐来源，按“一个官方武器名称 + 一个推荐来源一行”保留各自的 Perk 池、用途、评级和说明；同名历史、复刻和高阶版本视为同一把玩家武器。
2. 使用 Bungie Manifest 校验官方中英文名称、关联武器 Hash、Perk Hash 和插槽；Hash 只作为官方证据和名称别名，不作为推荐主键。
3. 使用 `itemHash → 官方武器名称 + instanceId + 实际拥有的 Plug Hash` 匹配玩家每把武器；推荐按名称查询，结论按实例计算。
4. 在任何自动整理建议前保护锁定、配装引用、玩家手动保留和独特 Roll。
5. 复用现有仓库页面与本地整理状态，不直接分解游戏内装备。

当前正式知识库基线已经生成：

- `攻略/T20-武器推荐知识库/武器推荐.csv`：31 列、2,383 条唯一“武器名称 + 推荐来源”记录，覆盖 952 个官方武器名称和 1,627 个关联官方武器 ID。
- `攻略/T20-异域职业物品推荐/异域职业物品推荐组合.csv`：27 条独立组合，不混入武器知识库。
- LGpig 的传奇武器和异域武器两张 CSV 统一算作一个一级来源；异域固定配置保留武器级推荐，不伪造随机 Roll。
- 早期三位置审核样表已被完整正式知识库覆盖，不再保留平行样例数据。

## 2. 已确认的最终结论

### 2.1 一级推荐来源

五个一级来源使用稳定 `source_id`，玩家只看到固定显示名称：

| 顺序 | `source_id` | 显示名称 | 原始链接 |
|---|---|---|---|
| 1 | `aegis` | `Aegis推荐` | <https://docs.google.com/spreadsheets/d/1JM-0SlxVDAi-C6rGVlLxa-J1WGewEeL8Qvq4htWZHhY/edit?gid=346832350#gid=346832350> |
| 2 | `lgpig` | `LGpig推荐` | <https://destiny2-starside-dea-mods-d1g0j2rile2323f73.webapps.tcloudbase.com/pve-farming/index.html> |
| 3 | `yxcrallxy` | `YXCRALLXY推荐表` | <https://docs.qq.com/sheet/DYkR5enNIdUt1VFhK?tab=000001&_t=1788087335795&nlc=1> |
| 4 | `sayalarry` | `Sayalarry推荐表` | <https://sa7vp10ytxr.feishu.cn/wiki/W3ySwdahTiNRUJklJNBc0CMPnkb> |
| 5 | `dim_voltron` | `DIM社区愿望单` | <https://github.com/48klocs/dim-wish-list-sources> |

规则：

- 五个来源不直接平均成统一分数。
- Aegis、LGpig 的评级与 Sayalarry 获取优先级分别保存，不换算为统一分数。
- `DIM社区愿望单` 是非官方社区 Wishlist，不是 Bungie 官方推荐或独立玩家投票。
- 同一来源出现多行或多个作者块，仍只算一个一级来源。
- `DIM社区愿望单` 的作者、标题、`//notes:` 和标签作为来源证据保存，不能冒充多个一级来源。
- Aegis 当前本地输入为 `攻略/Starside-PVE终局刷取数据快照/Aegis武器推荐.csv`；废弃的 `aegis推荐表.xlsx` 及其旧转换目录已经删除。
- LGpig 当前本地输入为同目录下的 `LGpig传说武器推荐.csv` 与 `LGpig异域武器推荐.csv`；两张表合并成同一个 `source_id=lgpig`。
- Starside CSV 页面标注更新于 2026.8.30，已校正一批中文组件名称；页面未声明可再分发许可，当前只作为本地知识库输入，公开打包前必须重新确认许可。
- 详细时效性、许可和工具能力结论统一维护在 [Destiny 2 工具收集](../references/destiny-tool-reference.md#t20-武器推荐数据源结论)。

### 2.2 数据分层

```text
四份本地输入数据集 + 固定 revision 的 DIM社区愿望单
                    ↓
       UTF-8 BOM 单 CSV 人工知识库
                    ↓ 生成期 Manifest 校验；运行期按指纹事务导入
       SQLite 推荐数据库（应用运行时查询）
                    ↓ itemHash 解析官方名称，按名称查询来源 Perk 池
         Core 按 instanceId 与来源明确要求的全部实际插槽逐项对照
                    ↓
       JSON 兼容 TypeScript DTO / Electron IPC
                    ↓
               现有仓库页面
```

各格式定位固定如下：

| 格式 | 定位 |
|---|---|
| 单 CSV | 本地知识库、人工审核和批量维护格式 |
| DIM Wishlist | 可分享、可订阅、可导入 DIM 的第三方交换格式 |
| SQLite | 应用内部推荐数据存储和查询层；旧 JSON 迁移完成后成为唯一运行时真相 |
| JSON 兼容 DTO | Core、App、HTTP 和 Electron IPC 的接口数据，不是磁盘推荐库 |

不再生成或维护 `weapon-recommendations.v1.json` 一类推荐持久化文件。

### 2.3 安全边界

- 推荐资料未覆盖不等于可以分解。
- 每条来源记录独立核对；不得把 Aegis、LGpig、YXCRALLXY、Sayalarry 与 DIM 的字段交叉拼成一个结论。
- 来源明确写出的枪管/瞄具、弹匣/电池/弓弦等第二列、大师、Perk 1、Perk 2、起源特性和其他可映射插槽都属于该来源的要求；只比较来源实际给出的项目。
- 面向玩家的结果只使用“`x/y 项符合`”“仅推荐这把武器”“该来源未收录”“无法核对”及逐项“符合/不符/来源未要求/无法核对”，不使用“完整命中、部分命中、核心已齐”等概括词。
- 推荐对照不自动把实例写为保留、待复查或待处理；整理状态始终由玩家确认。
- 系统建议与玩家本地标签保持独立，用户确认后才能写入整理状态。
- 应用不调用不存在的远程分解能力，不自动解锁武器。
- 账号 OAuth Token、Cookie 和私有库存不发送给第三方推荐站点。

## 3. 数据合同

### 3.1 武器推荐.csv

一行表示一个 Bungie 官方武器名称在一个一级来源中的推荐，固定 31 列。前 26 列沿用 Aegis/Starside 表头，末尾补充应用导入所需字段：

```text
页面, 分类, 武器, 评级, 排名, 来源URL, 页面更新时间, 来源位置, 图标, 图标图标URL,
属性, 框架, 赛季, 来源, 勇士, 勇士图标URL, 弹药生成, 枪管, 弹匣, 大师,
Perk 1, Perk 2, 起源特性, 注解, 护盾, 充能效率,
武器ID, 英文名称, 版本, 推荐来源, 用途
```

规则：

- 唯一键是 `英文名称 + 推荐来源`；英文名称缺失时回退官方中文名称。同一武器名称最多出现五行，不再维护独立推荐组合表。
- `武器ID` 保留该来源记录在当前 Manifest 中已验证的关联 `itemHash`，多个 ID 用 ` / ` 分隔；它们用于导入校验和证据追溯，不限制应用按官方名称识别其他同名 `itemHash`。
- 原表的 `来源` 表示武器获取地点；新增的 `推荐来源` 才表示 Aegis、LGpig、YXCRALLXY、Sayalarry 或 DIM。
- 同名历史、复刻、普通和高阶版本按玩家视角合并为一个武器族；不同显示名称仍分开。
- `YXCRALLXY推荐表` 与 `Sayalarry推荐表` 未提供 `itemHash` 时，先使用官方中英文名称精确匹配；来源错字、旧译或简称只能建立“来源位置级”明确别名，不启用全局模糊匹配。
- 同名多版本使用 Manifest `releases.v*` 从新到旧校验，把各版本能证明的第三栏、第四栏和附加推荐汇入同一名称级来源行。
- 来源明确写出万神殿、众神殿、玖的仪式、专家、痛苦、失时或其他版本标记时，该标记作为来源证据保留；仓库判断仍按玩家实例实际 Perk 匹配，不因同名版本不同直接失去推荐覆盖。
- 某项枪管、弹匣或起源特性只能在部分同名版本中证明时，仍保留来源原文，并在 `版本` 栏标注“部分版本具备”；例如“光明前景”的“加速突击”。
- `Perk 1` 和 `Perk 2` 是该来源对当前武器名称的两个独立候选池；它们不再表达作者逐套组合关系。
- 同一来源原来存在多个用途或作者记录时，在同一行聚合用途、Perk 池、注解和来源位置；不得跨来源合并。
- 某个来源候选在所有同名版本中都无法证明时才排除；排除后来源仍保留原文说明，并将无法映射的要求作为非阻塞提示。
- `评级` 与 `排名` 只保存原来源值，不派生统一评级或跨来源排名。
- 异域固定配置可以进入此表，随机 Perk 池留空并在说明中写明原因。

名称、版本和 Perk 校验仍遵循以下规则：来源组件名称先与当前武器对应栏位的官方中英文名称精确匹配；精确失败后，只接受当前栏位内双向包含且最终唯一的官方名称。无法唯一确认的名称、Hash 或栏位进入异常清单；旧译、错字、错栏和旧 Hash 只能使用来源位置级明确规则，不启用全局模糊匹配。

### 3.2 DIM Wishlist

- DIM Wishlist 是交换格式，不是应用内部数据库。
- DIM Wishlist 只作为社区推荐匹配来源，不把每条标准组合复制成个人装备目标；导入时移除历史 DIM 派生目标，玩家手工目标、攻略目标和 Armor Planner 目标不受影响。
- 正向推荐使用精确 `itemHash` 和 `perkHash`。
- 导入 `DIM社区愿望单` 时必须解析标题、作者、分段标题/说明、`//notes:...|tags:...`、用途标签和精确 Hash 规则；块级说明与标签只保存一次并由规则引用，不能为 Voltron 的大量组合逐行复制长说明。
- DIM 推荐 Perk 在官方实现中是无序必需 Hash 集合。DIM 原始规则保留为独立交换数据；只有能唯一映射到当前武器真实插槽的项目才进入该规则的对照分母，同栏多个必需 Perk、跨栏歧义与特殊异域插槽均明确标为无法核对，不弱化成普通两栏推荐。
- DIM 旧 Plug Hash 允许通过官方 Plug 中英文名称精确映射到目标武器当前插槽；无法唯一归属的 Hash 保留原始规则和诊断，不猜测分配栏位。
- 必须固定具体 Git commit SHA；移动中的 `master` 地址只作入口，不作可复现版本。
- 发布版普通玩家不需要先访问 GitHub 再手工下载。应用提供“更新 DIM 社区推荐”，直接从 `https://github.com/48klocs/dim-wish-list-sources` 查询 `voltron.txt` 的最新提交并下载原始文件；文件导入继续作为 GitHub 不可用、自定义 Wishlist 和离线环境的备用入口。
- 在线更新仍要经过与本地文件相同的解析、预览统计、SHA256 校验和 SQLite 事务导入；“在线更新”只是替玩家完成下载，不允许绕过导入校验。
- Trash List 第一版禁用，负向规则不参与待处理结论。

### 3.3 SQLite 推荐库

当前已落地的内置知识库使用 `node:sqlite`，数据库固定保存到：

```text
<data_dir>/knowledge/weapon-recommendations.sqlite
```

CSV 是人工维护源，SQLite 是应用查询库。应用导出的 UTF-8 BOM、31 列空模板是唯一列合同；选择按模板填写的 CSV 后，Desktop 主进程先校验固定表头顺序、行列数、唯一“武器 + 来源”键和武器 ID，只把文件名、武器数、记录数、来源数与错误摘要传给 Renderer。用户确认后再次核对 SHA256，并事务替换 SQLite，同时把文件托管为 `<data_dir>/imports/weapon-recommendations.csv`；预览、确认或写入失败不主动清空当前数据库。Desktop 在首次推荐详情或仓库匹配前同步一次；内容 SHA256 与 schema 版本未变化时跳过重导。其他开发输入依次支持 `D2_WEAPON_RECOMMENDATIONS_CSV`、私有包的 `resources/knowledge/weapon-recommendations.csv` 和开发仓库正式 CSV。CSV 不存在、同步失败或数据库不可读时，内置来源安全降级为空，不阻断 DIM 和用户自定义来源。第三方再分发许可确认前，公开安装包不内置该 CSV。

当前 schema version 为 `3`。前六张关系表保存完整 31 列知识库，后六张关系表承接 DIM Wishlist 与遗留本地社区推荐：

| 表 | 责任 |
|---|---|
| `knowledge_metadata` | schema 版本、CSV SHA256 指纹和导入时间 |
| `recommendation_sources` | `aegis`、`lgpig`、`yxcrallxy`、`sayalarry`、`dim_voltron` 五个稳定来源 ID、显示名和原始链接 |
| `weapon_recommendations` | 一条“官方武器名称 + 推荐来源”记录；保存中英文名称、页面、分类、评级、排名、版本、框架、赛季、获取来源、图标、说明、护盾等所有标量列 |
| `weapon_recommendation_item_ids` | 来源行关联的全部官方武器 ID，只作名称、版本和证据追溯 |
| `weapon_recommendation_purposes` | PVE、PVP、通用用途关系 |
| `weapon_recommendation_perks` | 枪管、弹匣、大师、第三栏、第四栏和起源特性候选，保留原始顺序和规范化名称 |
| `external_recommendation_sets` | DIM Wishlist 与本地社区推荐的数据集标题、作者、上游地址、revision、SHA256 和激活时间 |
| `external_recommendation_blocks` | DIM 分段标题、说明、notes 和作者；每个来源块只保存一次 |
| `external_recommendation_block_tags` | DIM 来源块标签及原始顺序 |
| `external_recommendation_rules` | 外部推荐的武器 Hash、用途、说明、作者、来源证据和可选来源块引用 |
| `external_recommendation_rule_perks` | 每条外部规则的无序必需 Perk Hash 集合，以 ordinal 保留输入顺序 |
| `external_recommendation_rule_tags` | 每条外部规则的标签及原始顺序 |

数据库约束：

- 所有关系都有外键，并为外键建立索引。
- 来源依附记录使用 `ON DELETE CASCADE`；用途与组件角色使用 `CHECK` 固定枚举。
- `(normalized_weapon_name, source_id)`、`(recommendation_id, item_hash)`、`(recommendation_id, purpose)` 和 `(recommendation_id, slot, normalized_perk_name)` 唯一。
- 主查询索引覆盖官方中文名、官方英文名、来源 ID、关联武器 ID、用途和组件名称。
- schema version `2 → 3` 原地增加外部推荐关系表，不删除已有知识库；其他不受支持的旧 schema 才整库重建。
- 导入先校验 31 列表头和有效行，再使用单事务整体替换；任何重复键或写入错误都完整回滚。
- 输入内容指纹相同不得重复导入。

当前查询规则：

- 先从当前 Manifest 读取武器官方中文名，必要时可使用官方英文名。
- SQLite 按规范化名称查询所有来源行，不用 CSV 中的某个历史 Hash 限制当前实例。
- 推荐组件名称在当前武器版本的官方可用池中解析为 Plug Hash，再交给 Core 比对实例实际 Plug。
- 每个组合说明保留具体来源名称，多个来源合并后仍可追溯。

旧 JSON 迁移规则：

- `dim-wishlist.json` 和 `local-community-recommendations.json` 已改为首次读取时一次性事务迁移；正常查询、保存和清理只使用 SQLite，不再双写 JSON。
- 迁移数据、规则数/来源块数校验和迁移完成标记在同一事务提交；JSON 解析或 SQLite 写入失败时完整回滚，不写完成标记。
- 迁移成功后旧文件继续保留在磁盘上作为人工回退证据，但运行时忽略；执行“清除推荐”后会写清理标记，旧文件不会再次复活。

### 3.4 发布版数据获取与更新

发布后的普通玩家主流程不是手工寻找 CSV 或 DIM 文件，而是在仓库“推荐数据”中使用统一的“检查更新 / 更新推荐数据”。文件导入只保留为离线、自定义数据和维护者调试入口。

```text
在线检查上游版本
  → 下载到临时文件
  → 校验来源、revision、大小、SHA256 和格式
  → 展示武器数 / 规则数 / 来源数 / 版本变化
  → 用户确认或按已授权策略自动激活
  → 事务写入本机 SQLite
  → 重新计算当前仓库匹配
```

发布版数据渠道：

| 数据 | 普通玩家主入口 | 上游与版本 | 备用入口 |
|---|---|---|---|
| DIM 社区推荐 | 应用直接检查并更新 | `48klocs/dim-wish-list-sources` 的 `voltron.txt`；记录准确 Git commit SHA，不只保存 `master` | 导入 `.txt` / `.wishlist` |
| 五来源中文知识库 | 应用从维护者控制的版本化数据地址检查并更新 | 每个发布资产必须有数据集版本、schema 版本、SHA256、大小、生成时间、来源 revision 和许可状态 | 导入应用标准 31 列 CSV |
| 玩家自定义数据 | 不参与在线自动覆盖 | 只保存在本机，来源标记为用户导入 | 重新导入对应文件 |

更新合同：

- 在线下载的是交换文件，激活后的唯一运行时数据仍是 SQLite；不得把远端 CSV、Wishlist 或小型更新元数据当作第二套业务数据库。
- DIM 优先从上游 GitHub 直接获取，应用只保存上游 URL、commit SHA、ETag、SHA256、检查时间、激活时间和解析统计；GitHub API 限流、网络失败或国内访问困难时继续使用上一次有效数据，并提示使用文件导入。
- 中文知识库只有在 Aegis、LGpig、YXCRALLXY、Sayalarry 和 DIM 汇总数据的再分发许可逐项确认后，才能发布到维护者控制的下载地址或随安装包提供。许可未确认时，公开版本只能保留本地文件导入，不得以“在线更新”名义镜像第三方内容。
- 中文知识库推荐使用版本化发布资产，不直接让客户端抓取五个页面的内部接口。服务端/维护流程完成来源抓取、Manifest 校验和人工审核后发布标准 CSV，客户端只负责下载、校验和导入。
- 更新检查可以每日节流；用户手动“检查更新”必须绕过节流。不得在每次进入仓库页时重复下载大文件。
- 下载、解析、校验或 SQLite 写入任一步失败，都不得替换当前活动数据；临时文件写入 `.local-data/tmp/` 或系统临时目录，失败后可安全清理。
- 远端版本回退、相同 SHA256、schema 不兼容和来源数量异常必须显示明确结果。相同内容不重复导入；schema 不兼容不得强行激活。
- 首次没有任何推荐数据时，页面显示“尚未安装推荐数据”，提供“更新 DIM 社区推荐”“导入 DIM 文件”“导入知识库 CSV”三个明确入口，不把空数据解释成玩家仓库没有好枪。
- 普通界面显示来源名称、更新时间、数据版本、规则/武器数量和更新结果；commit SHA、ETag、完整指纹和下载错误细节进入展开信息或诊断，不堆在仓库列表。

推荐更新状态至少保存：

```ts
type RecommendationDatasetRevision = {
  sourceId: "dim_voltron" | "curated_knowledge";
  revision: string;
  schemaVersion: number;
  sha256: string;
  checkedAt: string;
  activatedAt?: string;
  recordCount: number;
  sourceCount: number;
  status: "current" | "update_available" | "failed" | "license_blocked";
};
```

### 3.5 接口 DTO

- IPC/API 返回普通数组或对象，保证 JSON 可序列化。
- 每个仓库结果必须包含 `instanceId`、`itemHash` 和解析后的规范武器名称。
- `itemHash` 只用于解析官方名称与实例插槽；推荐按规范武器名称查询，`instanceId` 用于区分玩家实际拥有的每一把枪。
- `Map` 只允许在 App 内部按需重建，不能直接作为 IPC 契约。
- DTO 至少包含 `instanceId`、来源级覆盖状态、每条来源记录的要求总数/符合数、每个插槽的来源候选/实例拥有值/当前启用值/对照状态、来源证据、保护事实和解释文本；不得只返回来源无关的“完整/部分命中”汇总。

## 4. 匹配与整理规则

### 4.1 实例输入

每把账号武器至少需要：

```text
itemHash
instanceId
当前启用 Plug Hash
该实例实际拥有的可切换 Plug Hash
按真实 socket 角色归类的枪管/瞄具、第二列、大师、普通特性和起源特性
锁定状态
位置与装备状态
精确配装引用
玩家本地标签
```

Manifest Perk 池、角色级解锁项或账号级候选不得冒充该实例实际拥有的 Roll。

### 4.2 来源级逐项对照

对每条“武器 + 推荐来源”记录分别计算；一条来源记录内每个明确要求都是一个独立对照项。

| 来源级状态 | 含义 | 列表展示 |
|---|---|---|
| `checked` | 该来源的全部明确要求均可核对 | `来源：x/y 项符合` |
| `weapon_only` | 来源只推荐该武器本身，没有随机配置要求 | `来源：仅推荐这把武器` |
| `not_covered` | 该来源没有这把武器的记录 | 详情显示“该来源未收录”，不在列表制造负面结论 |
| `uncheckable` | 实例 Roll、官方名称、版本或插槽归属无法确认 | `来源：无法核对` |

逐项状态固定为 `match`（符合）、`different`（不符）、`source_not_specified`（来源未要求）和 `uncheckable`（无法核对）。`x/y` 的分母只包含该来源明确且可映射的要求；来源写“任意”或未提供某栏时不计入分母，不能把缺失信息伪装成符合。

实例“拥有”与“当前启用”必须同时保存：只要该实例实际拥有的当前或可切换 Plug 符合来源候选，就计为“拥有符合”；当前启用仅作为玩家切换配置的事实展示，不能替代拥有对照。枪管/瞄具、第二列、大师、普通特性、起源特性和来源可映射的其他插槽一律按真实 `socket_index`/语义角色核对，不按武器类型硬编码。

### 4.3 玩家整理与系统证据

- 系统不将多来源数量换算为“必留”“建议保留”或任何整理状态；不同来源的 `x/y` 始终独立显示。
- 玩家整理状态只有未标记、保留、待复查、待处理；它与锁定、精确配装引用、Wishlist、个人目标和推荐来源证据分开保存与呈现。
- “资料库未收录”与“来源已有记录但 0/y 项符合”必须区分；两者都不等于可以分解。
- 受锁定、精确配装引用、玩家手动保留或实例数据无法核对的武器，不得被系统自动改为待处理；后续批量整理只写玩家已经确认的本地状态。

### 4.4 同名武器与独特 Roll 保护

- 按规范武器名称比较账号实例，同名历史、复刻和高阶版本进入同一组；`itemHash` 只作为版本证据展示。
- PVE 清怪、PVE 输出、PVE 功能和 PVP 可以分别保留，不强制同名武器只留一把。
- 只有另一同名实例完整覆盖当前实例的所有已确认用途，并至少多出一项高可信用途，才可标记“同名有更优”。
- 独特性只说明组合少见，不说明强度。
- 独特组合必须显示比较范围和其他可出武器数量，不能只给黑盒分数。

## 5. 与应用的关系

### 5.1 当前实现缺口

- 正式 `武器推荐.csv` 已能指纹导入永久 SQLite，并作为优先级最高的本地内置来源参与推荐详情和仓库匹配；DIM Wishlist 与遗留本地社区推荐也已迁入同一数据库，运行时数据源已经收口。
- DIM 原生文件导入已改由主进程读取，可处理 Voltron 大文件，并保留标题、作者、`//notes`、tags、用途和原始 Hash；确认导入后直接事务写入统一 SQLite，不再生成新的 `dim-wishlist.json`。
- Core 和 Desktop 已新增逐输入实例结果：包含 `instance_id`、官方名称与来源覆盖状态；内置 SQLite 来源已经按官方名称查询，同名不同版本可共用来源池。旧的完整/部分/未命中聚合语义将由来源级逐项结果替代。
- 账号快照已通过一次 Profile 请求读取 `ItemSockets` 与 `ItemReusablePlugs`，并为每个武器实例生成紧凑 `weapon_roll`：只保留实例实际拥有值和当前启用值，按真实 `socket_index` 归类枪管/瞄具、第二列、大师、Perk 1、Perk 2 与起源特性，同时保存完整性原因和 Roll 指纹。当前缺口已转为 SQLite 来源记录尚未输出全部栏位要求，Core 仍保留旧的来源无关组合汇总结果，因此还不能用于玩家整理判断。
- App 已保留 `vaultCommunityInstanceMatch`，但现有仓库 UI 仍消费兼容的 `Map<itemHash, VaultItemMatchInfo>`；同版本多实例尚未在页面上分别展示。

### 5.2 Package 边界

| Package | T20 责任 |
|---|---|
| `packages/core` | 推荐 DTO、DIM 文本纯解析、规范化类型、实例级来源 Perk 池匹配和安全规则；不读文件和 SQLite |
| `packages/services` | CSV/DIM 文件读取、Manifest 校验、完整 Profile 扫描、SQLite 导入/查询、迁移和外部来源 adapter |
| `packages/app` | 以 `instanceId` 为键的扫描 workspace、进度、筛选和 ViewModel |
| `packages/ui` | 复用现有仓库筛选、同名整理、推荐数据和单件详情，不新增平行页面 |
| `packages/desktop` | 调用账号与推荐服务、承接缓存和最小 IPC；renderer 不直接读 SQLite |

T20 后续会跨越多个 package 和公共接线文件，必须按阶段串行集成。数据准确性和真实仓库只读报告通过前，不修改批量整理行为。

## 6. 结合当前应用的完整实施计划

### 6.1 总体顺序与应用改动时点

| 阶段 | 状态 | 切片 | 是否改应用 | 核心结果 |
|---|---|---|---|---|
| 0 | ✅ 已完成 | 整理：数据合同与样表 | 否 | 单 CSV 表头、五来源命名和“一武器 + 一来源一行”已确认 |
| 1 | ✅ 已完成 | 实现：完整推荐知识库 | 否 | 当前五来源单 CSV 已冻结；0 阻塞，39 条 DIM 特殊结构只作非阻塞提示 |
| 2 | 🟡 底座已完成 | 实现：Core 名称级推荐与实例匹配 | 是，领域层 | 已新增名称参数、逐实例结果和 DIM 标准注释元数据；实例完整 Roll 语义仍待补齐 |
| 3 | 🟡 数据存储完成，诊断待补 | 实现：SQLite 推荐库与迁移 | 是，服务层 | schema version 3 已统一承接知识库、DIM 和本地社区推荐；两套旧 JSON 已完成一次性迁移与单一真相收口，后续数据状态诊断并入阶段 6/8 |
| 3A | 🟡 DIM 已完成，中文许可待确认 | 实现：发布版推荐数据在线更新 | 是，服务层与现有推荐数据 UI | DIM 已从上游 GitHub 直连检查并导入；中文知识库在许可确认后再从版本化资产更新；两者都保留文件导入回退 |
| 4 | 🟡 代码完成，待真实账号验收 | 实现：完整仓库 Roll 扫描 | 是，账号服务 | 一次 Profile 请求得到每个武器实例实际拥有的全部可对照插槽，并生成紧凑 Roll 指纹与完整性状态 |
| 5 | ⏳ 待实施 | 实现：Desktop IPC 与 App workspace | 是，接线层 | 以 `instanceId` 把来源级逐项对照、保护事实和解释传到仓库页与详情 |
| 6 | ⏳ 待实施 | 实现：现有仓库三视图接入 | 是，共享 UI | 原筛选与目标保持不变，接入武器来源摘要、同名来源比较和详情对照 |
| 7 | ⏳ 待实施 | 整理：安全候选与批量整理 | 是，受控写操作 | 人工确认后才开放本地标签或已有安全转移 |
| 8 | ⏳ 待实施 | 整理：旧链路收口 | 是，删除兼容层 | 发布验收后删除一次性 JSON 迁移代码和旧的武器级聚合路径 |

阶段 1 本身不修改应用代码，但不是整个任务的终点。当前已开始阶段 2/3 的底层实现；阶段 6 才出现玩家可见的仓库交互，阶段 7 才允许任何整理写操作。数据底座可以并行铺设，但实例准确性必须在 UI 和整理结论前完成。

### 6.2 阶段 1：生成完整推荐知识库

目标：把五个一级来源转换为可重复生成、可人工审核的标准输入，先解决“每个来源推荐这把武器保留哪些 Perk”。

工作内容：

1. 固定 Aegis、LGpig、YXCRALLXY、Sayalarry 四组本地输入的文件指纹、读取时间和原始链接。
2. 固定 `DIM社区愿望单` 的 Git commit SHA，不使用移动中的 `master` 作为数据版本。
3. 批量解析武器、版本、用途、场景、第三栏、第四栏、枪管、弹匣、大师加成、说明和来源记录。
4. 使用当前 Bungie Manifest 校验官方中英文名称、关联 `itemHash`、Plug Hash、插槽归属、普通/专家/复刻版本和固定配置异域。
5. 正式只输出 `武器推荐.csv`；任何未解析项不得混入主表，并仅在存在异常时写入 `.local-data/tmp/` 下的临时校验报告。
6. 来源 URL、revision、输入指纹和 Manifest 版本属于生成记录，不再单独复制成一份 `推荐来源摘要.csv`。
7. DIM Wishlist 是后续按需导出格式，不作为第一阶段知识库产物。
8. 将当前 `.local-data/tmp/build_t20_player_sample.py` 的有效规则整理为仓库内可复用的离线生成入口，临时目录只保留运行产物。

正式产物：

```text
武器推荐.csv
```

生成过程允许出现但不作为知识库交付的内容：

```text
.local-data/tmp/T20-推荐知识库生成/异常报告.csv  # 仅有异常时生成
.local-data/tmp/T20-推荐知识库生成/生成记录.txt  # 来源 revision、输入指纹和 Manifest 版本
```

完成门槛：

- 主表中的每条自动匹配记录都有官方名称、关联 Hash 和明确插槽证据。
- 每行严格表示“一个武器名称 + 一个推荐来源”，`英文名称 + 推荐来源` 全表唯一。
- 不出现跨来源拼接或名称猜测；Perk 1/2 只表达同一来源的两个名称级候选池，部分版本才能证明的附加项必须明示标注。
- 如存在异常，其数量、原因和原始位置可在临时报告中追溯，但异常文件不作为第三份知识库长期维护。
- 人工抽查五来源、三武器位置、传奇/异域和普通/专家版本均符合合同。

当前进展：

- 已新增可重复执行入口：`scripts/generate-t20-weapon-knowledge.py`。
- 已固定 DIM revision `ce2cbcc3b3b3d4b7ebc62f2ddf0502b00f4dadfd` 和 Manifest `244213.26.06.29.2000-1-bnet.65583`。
- 已生成 `攻略/T20-武器推荐知识库/武器推荐.csv`：31 列、2,383 条唯一名称级来源行，覆盖 952 个官方武器名称和 1,627 个关联官方武器 ID。
- 当前来源行分布：Aegis 729、LGpig 280、YXCRALLXY 455、Sayalarry 70、DIM 849。
- 已将同名历史、复刻和高阶版本合并为名称级推荐；例如“光明前景”的 Aegis 记录只保留一行，关联 `3625635456 / 1832481283`，“加速突击”保留并标注“部分版本具备”。
- 已将 DIM 中的“唯我主义、相对主义、坚忍克己”转入 `攻略/T20-异域职业物品推荐/异域职业物品推荐组合.csv`；28 条原始规则去除 1 条同来源块重复后得到 27 条独立组合，不混入武器推荐 CSV。
- DIM 的附加枪管、弹匣或握把 Hash 不匹配时不再误删已经确认的核心第三栏 + 第四栏 Perk。
- 已按“官方名称 + `releases.v*` 倒序版本 + 来源分区 + 各版本官方插槽校验”处理同名版本；万神殿、专家和历史 Hash 保留为证据，最终按名称 + 来源汇总为玩家推荐。
- 已将 DIM 失效 Hash `616582331/332` 按官方英文名 `Cry Mutiny` 精确匹配，再选择最新官方发布版本 `768696858`；原始 Hash 与映射过程保留在生成证据中。
- Sayalarry 的“痛苦结局”和“闰蚀”已按已确认语义将空白核心栏解释为任意，保留为来源行中的通配 Perk 池。
- 本地表不再把旧 Hash 强制改绑最新版；同名版本从新到旧逐版检查，再合并为名称级推荐。“金刚磐石”的旧版 `2987244302/3229982889` 已证明“切割 + 羸弱能量球”推荐；来源名称“信任”已按武器类型和 Perk 池校正为“受托”，“明日答案”已校正为当前官方名称“明日回答”。
- 已增加来源级确定性清理：LGpig 固定错字/旧译、Aegis `B 计划`、作者明确划除项、明确标注的旧版/绝版项、Manifest 可证明的三四栏写反，以及 LGpig 原表单栏建议的空白栏通配；因此恢复 25 条来源行。
- 已使用 14 条来源位置级武器名称别名处理官方译名变化或原表错字；每条都有武器类型和官方 Perk 池唯一支持证据。
- 已排除 Manifest `itemType=20` Dummy 武器定义；DIM“呼啸之惑”通过完整官方英文名映射到可装备武器。
- 已增加“当前武器对应栏位内官方名称唯一包含匹配”：例如 aegis 的“全口径”可确定映射为“全口径枪膛”，Sayalarry 带括号的来源文本也可在唯一官方名称成立时映射；本轮消除 56 条附加栏位误报，匹配过程保存在组件证据中。
- 附加栏位不再固定假设枪管、弹匣和起源特性位于插槽 `1/2/8`：生成器按 `plugCategoryIdentifier` 和官方物品类型识别枪管/发射管/导轨、弹匣/电池/弩弹/枪托以及 `origins` 起源特性；DIM 附加 Hash 也使用同一语义分类。名称匹配依次使用官方名称精确、忽略空格标点、忽略拉丁变音符和唯一包含匹配。
- “目标修订”的“未足之饥”已由官方插槽 14 证明，“长命”的“灾难计划”已由官方插槽 11 证明；“以防万一”的 `1139727256` 具备“灾难计划”、`715338174` 不具备，因此保留并标注“部分版本具备”。Aegis 的 `T20-ADD-01` 已清零。
- Aegis 传奇武器已切换到 Starside 校对 CSV；武器名称按官方中文精确匹配、忽略空格/标点后的唯一匹配、官方英文名称匹配和页面版本标记处理，0 条武器身份阻塞。
- Starside Aegis CSV 只包含 748 条传奇武器，不再读取旧 Aegis XLSX 的异域分析；LGpig 的 200 条传奇与 83 条异域快照已经作为一个新一级来源接入。
- 临时报告当前为 0 条阻塞、39 条非阻塞提示，均为 DIM 两候选池无法无损表达的结构提示。
- Aegis、LGpig、YXCRALLXY 和 Sayalarry 当前没有剩余生成提示；Sayalarry 原有 25 条无法由官方组件唯一证明的附加栏位按已确认规则标记忽略，来源原表保持不变，但这些内容不进入正式匹配池，也不再作为当前问题。
- 本地四表的“来源核心 Perk 不属于版本”和“缺少完整两栏推荐”均已清零。
- DIM 的 5,027 条不同原始说明继续保留英文原文，避免在没有人工复核时猜译；它们作为后续中文阅读增强，不阻塞当前结构化推荐池和应用接入。
- 已建立 `攻略/T20-武器推荐知识库/人工审核问题清单.md`，用稳定问题编号记录逐项结论；该文件仅用于人工审核，不是第三份应用导入数据。

阶段 1 冻结结论：

1. `T20-EX-01`、`T20-EX-02`、`T20-SRC-01`、`T20-SRC-02`、`T20-PERK-01`、`T20-PERK-02`、`T20-VER-01`、`T20-VER-02` 和 `T20-DIM-CORE-01` 已处理，核心阻塞为 0。
2. `T20-ADD-01` 已按产品规则关闭：任一同名官方版本能在正确官方组件类型中证明的附加项保留并标注“部分版本具备”；所有同名版本都无法唯一证明的附加原文标记忽略并留空，不参与应用匹配，也不再进入问题清单。
3. 39 条 DIM 特殊结构提示不弱化成普通两栏组合，继续作为非阻塞提示保留。
4. 当前 31 列 CSV 作为应用 v1 导入基线冻结；DIM 原始说明中文化和更广泛人工抽查转为后续数据增强，不阻塞阶段 2–5。

### 6.3 阶段 2：建立名称级 Core 推荐与 DIM 解析

目标：先让底层能够表达“玩家的某一把枪命中了哪个来源行、命中了哪些栏位”，再接数据库和 UI。

当前代码入口：

- `packages/core/src/analysis/wishlistImport.ts`
- `packages/core/src/community-perks/types.ts`
- `packages/core/src/community-perks/communityPerkRecommendationService.ts`

当前缺口：

- 旧 `matchVaultItems` 仍按 `itemHash` 聚合并返回 `Map<itemHash, ...>`，只作兼容；新 `matchVaultItemInstances` 已逐输入返回实例结果，下一步由 App/UI 完成切换。

改造内容：

1. 解析 DIM 标题、作者块、`//notes:...|tags:...`、用途标签、原始说明和精确 Hash 规则。
2. 扩展推荐来源元数据，保留 `sourceId`、来源记录键、revision、作者、标签和证据位置。
3. `VaultItemMatchInput` 增加 `instanceId` 和由 Manifest 解析的规范武器名称，并接收按插槽分组的实例实际 Plug Hash。
4. 先用 `itemHash` 解析官方名称，再按名称查询来源 Perk 池；匹配函数逐实例返回普通数组，不再返回以 `itemHash` 为键的 Map。
5. 每条来源记录输出 `checked / weapon_only / not_covered / uncheckable` 之一，并保留要求总数、符合数、逐项对照与来源位置。
6. 来源明确要求的所有可映射插槽均进入分母；不得跨来源补齐，也不得把未指定、任意或无法归属的项目当作符合。

当前进展：

- `VaultItemMatchInput` 已增加 `instance_id` 和 `item_name`。
- `VaultItemInstanceMatchInfo` 已返回官方名称和覆盖状态；旧的 `full_match / partial_match / no_match / indeterminate` 与来源无关汇总将替换为来源级逐项对照。
- Desktop IPC 已改用逐实例方法；App 同时保留 `vaultCommunityInstanceMatch` 和供现有 UI 兼容的 Hash 聚合结果。
- DIM 作者、标签、notes、标题和用途解析已经完成；尚缺按全部真实插槽归类的实例 Plug 输入，以及 UI 对实例结果的正式消费。

建议领域输出：

```ts
type VaultWeaponRecommendationMatch = {
  instanceId: string;
  itemHash: number;
  canonicalWeaponName: string;
  sourceMatches: RecommendationSourceMatch[];
  protections: RecommendationProtection[];
};

type RecommendationSourceMatch = {
  sourceId: string;
  state: "checked" | "weapon_only" | "not_covered" | "uncheckable";
  matchedRequirementCount: number;
  requirementCount: number;
  slots: Array<{
    role: string;
    state: "match" | "different" | "source_not_specified" | "uncheckable";
    sourceCandidates: string[];
    instanceOwned: string[];
    currentEnabled: string[];
  }>;
};
```

完成门槛：同名不同 `itemHash` 能查到同一名称级推荐池，每个 `instanceId` 仍根据自身 Roll 得到独立结果；DIM 的作者、标签、用途和 notes 不再丢失。

### 6.4 阶段 3：建立 SQLite 推荐库并迁移旧 JSON

目标：让应用只从一个结构化数据库查询推荐，解决当前两套 JSON 同时存在、查询和迁移难以审计的问题。

当前代码入口：

- `packages/services/src/analysis/wishlistStore.ts`
- `packages/services/src/community/localCommunityRecommendations.ts`
- `packages/services/src/community/perkRecommendation.ts`
- 可复用 `packages/services/src/account/itemDetailStore.ts` 和 `packages/services/src/gameData/sqliteSearchIndex.ts` 的 `node:sqlite`、WAL、事务和 schema 校验模式

已新增：

```text
packages/services/src/community/weaponRecommendationKnowledge.ts
```

改造内容：

1. 建立第 3.3 节定义的十二张关系表、外键、唯一约束和主查询索引。
2. 从已经过生成期 Manifest 校验的统一 `武器推荐.csv` 事务导入；运行期再次检查 31 列表头、有效行、唯一键和内容指纹。
3. 名称级来源提供按官方中英文名称查询来源 Perk 池、读取来源证据和数据集状态的接口；`itemHash → 官方名称` 继续由 GameData Catalog 负责。
4. 将 `dim-wishlist.json` 与 `local-community-recommendations.json` 一次性迁移到 SQLite。
5. 旧 JSON 只在首次读取时参与迁移，不双写；SQLite 校验成功后写完成标记并停止兼容读取，原文件暂留作磁盘回退。
6. 数据库损坏或 schema 不兼容时重建派生库并给出明确诊断，不使用半套推荐。

当前进展：

- 已实现 schema version 3、外键、枚举约束、名称/来源/用途/关联 ID/组件索引；version 2 原地升级，其他不支持版本保留整库可重建策略。
- 已实现完整 31 列 CSV 解析、多行引号字段、UTF-8 BOM、SHA256 指纹、固定表头顺序、唯一键与武器 ID 校验和单事务整体替换。
- 仓库“推荐数据”已接入标准模板导出、CSV 文件选择、只读统计预览和确认导入；大文件正文不经过 Renderer，确认后的 CSV 由应用托管供后续启动复用。
- DIM Wishlist 保持独立 `.txt` / `.wishlist` 标准格式，文件选择、解析、预览和确认均由主进程完成；不要求也不允许先转成知识库 CSV。
- 已把 SQLite 名称级来源插到 DIM 和遗留自定义规则之前；推荐组件在当前 Manifest 武器池中解析为 Hash。
- LGpig 的 80 条固定配置异域使用独立“武器级推荐”语义进入 DTO 和逐实例匹配；Perk 池保持为空，不伪造随机组合，也不会再被误判成无推荐。
- Desktop 支持开发仓库、用户数据导入目录、显式环境变量和私有资源目录；同步失败时保留其他社区来源可用。公开安装包在第三方再分发许可确认前不内置 CSV。
- 已新增六张通用外部推荐关系表；DIM 来源块、规则、Perk 和标签关系化保存，本地社区规则复用同一模型但保持独立数据集。
- `dim-wishlist.json` 与 `local-community-recommendations.json` 已实现失败安全的一次性迁移；迁移成功后所有新写入和运行时查询只走 SQLite，旧文件保留但忽略。
- 数据状态展示已覆盖 DIM 当前 revision、启用时间、规则数、武器数和上次检查时间；知识库 schema、五来源 revision 与异常诊断仍待阶段 6/8 接入普通界面和诊断导出。

阶段 3A 当前进展：

- 已实现 DIM 上游在线检查：GitHub commit API 按 `voltron.txt` 路径获取最新 40 位 commit SHA，并保存 ETag、最新 SHA、提交时间和检查时间。
- 已实现固定 revision 下载：通过 GitHub Contents API 下载准确 SHA 对应的 `voltron.txt`，不使用移动中的 `master`；下载超时为 180 秒，正文上限为 128 MB。
- 检查阶段只把文件写入 `<data_dir>/tmp/recommendation-updates/` 并生成标题、武器数、规则数、用途、作者和标签预览；确认阶段重新检查临时文件 SHA256，解析成功后才事务替换 SQLite。
- DIM 数据集现在保存上游 URL、准确 commit SHA、原始下载文件 SHA256 和激活时间；在线更新失败不会清空当前数据，并明确提示改用本地 `.txt` / `.wishlist` 文件。
- 仓库现有“推荐数据”区域已显示当前短 SHA、启用时间、规则数和武器数，并提供“检查社区更新 / 确认更新”；在线更新、文件导入、粘贴和移除后都会重新计算当前仓库推荐匹配。
- 五来源中文知识库的客户端在线更新继续等待 Aegis、LGpig、YXCRALLXY、Sayalarry 和 DIM 汇总数据的再分发许可，不因 DIM 上游更新完成而默认开放。

完成门槛：相同输入重复导入不会产生重复行；失败可完整回滚；应用查询结果可追溯到数据集、来源和原始记录；SQLite 已能独立承接现有两套推荐来源。

### 6.5 阶段 4：一次性读取完整仓库 Roll

目标：获得每个 `instanceId` 真正拥有的 Perk，而不是把 Manifest 可选池当成玩家 Roll，也不逐把请求详情。

当前代码基础：

- `packages/services/src/account/session.ts` 已在 Armor Planner 和单件详情路径请求 `ItemInstances`、`ItemSockets`、`ItemReusablePlugs` 等组件。
- `packages/core/src/account/summary.ts` 的 `summarizeSockets` 已能区分 `instance`、`character`、`profile`、`manifest` 来源。

改造内容：

1. 在 AccountSession 增加武器推荐扫描摘要，或抽取并复用现有完整 Profile 组件请求，不逐把调用 `getItemDetail`。
2. 一次读取 `ItemInstances`、`ItemSockets` 和 `ItemReusablePlugs`，合并角色、背包和仓库中的武器实例。
3. 只把 `source === "instance"` 的可切换 Plug 视为该实例实际拥有；其他来源只作诊断，不参与精确匹配。
4. 按实际 `socket_index` 和 Manifest 插槽语义归类枪管/瞄具、第二列、大师、普通特性、起源特性与其他来源可映射插槽；不按枪种固定列位猜测。
5. 为每把枪生成稳定 Roll 指纹，并携带锁定、装备、位置和扫描完整性。

当前进展：

- `AccountSession` 的紧凑账号快照已增加 `ItemReusablePlugs` 组件；与原有 `ItemInstances`、`ItemSockets` 在同一次 Profile 请求中返回，不逐把调用 `getItemDetail`。
- `AccountItemSummary.weapon_roll` 只收集 `ItemReusablePlugs` 中当前 `instanceId` 的 Plug，并补入当前启用 Plug；角色级、账号级和 Manifest 候选不进入实例拥有值。
- 每个真实插槽保存 `socket_index`、推荐栏位、当前启用值、实例拥有值、完整性和原因；普通特性按真实插槽顺序映射为 `Perk 1 / Perk 2`，系统插槽和不可见未知插槽不会污染 Roll。
- 每个实例生成 `roll-v1-*` 稳定指纹；缺少 socket 数据、reusable plug 数据、Plug 定义或可见插槽无法归类时明确标记不完整。
- `VaultItemMatchInput` 已接收 `weapon_roll`，App 现有账号派生链路会把它送入 Desktop 匹配；旧组合匹配优先使用实例全部拥有值，扫描不完整且存在配置要求时返回不可确定，不再误报未命中。
- 尚未完成真实账号抽查，也尚未把 SQLite 的枪管、弹匣、大师和起源特性等来源栏位转换成最终来源级 `x/y` DTO；后者继续作为阶段 2/5 的下一切片。

建议扫描输出：

```ts
type WeaponRollScanItem = {
  instanceId: string;
  itemHash: number;
  actualPlugHashesBySocket: Record<number, number[]>;
  rollFingerprint: string;
  locked: boolean;
  equipped: boolean;
  location: string;
  complete: boolean;
  incompleteReasons: string[];
};
```

完成门槛：同版本每个实例都有独立 Roll 指纹；缺少 reusable plugs 或无法确认栏位的实例明确标记“无法核对”，不得预填或改写任何玩家整理状态。

### 6.6 阶段 5：接通 Desktop IPC 和 App workspace

目标：把实例扫描、SQLite 推荐和 Core 匹配组合成仓库页面可消费的数据，而不是让 renderer 直接访问数据库。

当前代码入口：

- `packages/desktop/src/main/ipc/community.ts`
- `packages/desktop/src/preload/preload.ts`
- 对应 `packages/desktop/src/contracts/` transport contract 与 renderer 分域 API
- `packages/app/src/workspaces/accountDerived.ts`
- `packages/app/src/workspaces/vaultPage.ts`

当前缺口：

- `community:vault:match` 输入和输出都没有 `instanceId`。
- App 的 `vaultCommunityMatch` 是 `Map<number, VaultItemMatchInfo>`，仍以 `itemHash` 为键。

改造内容：

1. 在 `packages/desktop/src/contracts/` 增加实例级请求/响应契约，main、preload 和 renderer API 共用同一 transport 类型。
2. IPC 输入包含 `instanceId`、`itemHash` 和完整实例 Plug；输出为 JSON 兼容数组，不传 Map。
3. 主进程调用 SQLite Repository 将 `itemHash` 解析为规范武器名称，查询名称级推荐，再调用 Core 完成实例级匹配。
4. App workspace 将结果重建为 `Map<string, VaultWeaponRecommendationMatch>`，键固定为 `instanceId`。
5. 增加扫描状态：未开始、扫描中、部分完成、完成、失败、Manifest 过期和推荐库不可用。
6. 无实例 ID 的资料库定义、商人售卖和静态武器仍可由 `itemHash` 解析名称后查看推荐详情，但不得参与仓库清理结论。

完成门槛：从 IPC 到 App 不再存在仓库匹配用的 `Map<itemHash, ...>`；刷新账号后每个真实实例都能得到独立覆盖和解释状态。

### 6.7 阶段 6：接入现有仓库三个视图

目标：不增加第四个仓库页面，直接让玩家在现有工作流中完成“找枪、比同名枪、看证据”。

当前代码入口：

- `packages/ui/src/vault/VaultPageContentView.tsx`
- `packages/ui/src/vault/VaultItemSections.tsx`
- `packages/ui/src/vault/VaultListItem.tsx`
- `packages/ui/src/vault/VaultDuplicateGroups.tsx`
- `packages/ui/src/vault/VaultRecommendationEvidencePanel.tsx`

现有三个视图的调整：

1. `筛选列表`
   - 保留现有物品范围、栏位、稀有度、装备阶段、武器类型、弹药、伤害属性、武器框架、锁定状态、排序和整理状态筛选；护甲筛选与行为不被 T20 改动。
   - 仅在武器条件中增加“推荐来源”和“对照结果”筛选。对照结果使用要求全部符合、有部分符合、仅推荐这把武器、资料库未收录、无法核对等事实筛选，不引入“核心已齐”等术语。
   - 武器卡只显示玩家整理状态、保护事实和最多两条来源摘要（如 `Aegis：5/6 项符合`、`DIM：2/2 项符合`）；不堆放逐槽位细节，不从来源摘要推导整理状态。
   - 点击实例在现有详情中定位到“目标匹配”章节；宽屏不把详情永久挤入仓库网格，窄屏复用详情 Drawer 与焦点恢复规则。
2. `同名整理`
   - 保留现有同名组目录、比较基准、当前启用/完整 Roll 模式、待应用整理状态和保护提示。
   - 新增“比较来源”选择；一次只以一个来源展开矩阵，按该来源明确要求的真实插槽比较每个实例的符合/不符/无法核对。其他来源在实例列底部以独立 `x/y` 摘要显示，不跨来源拼接。
   - 在相同规范武器名称内比较，允许历史、复刻和高阶 `itemHash` 进入同一组；基准只突出差异，不自动决定保留哪一把。
3. `目标与匹配`
   - 保留现有 DIM Wishlist 武器匹配、个人/装备目标、跨页定位和原有推荐数据管理入口。
   - 在武器匹配区增加“推荐来源对照”列表：一行一个实例，显示来源级 `x/y` 摘要、保护事实并可打开单件详情；不替换现有装备目标区，也不把护甲纳入 T20。
   - 数据管理作为本页低频入口，显示五个来源的状态、DIM 上游版本与知识库导入状态；不另做平行管理页。
4. `单件详情`
   - 复用现有武器详情的“目标匹配”章节，不新增平行详情页。一级分段保留 DIM Wishlist、推荐来源、个人知识；推荐来源内以来源卡展开 Aegis、LGpig、YXCRALLXY、Sayalarry，DIM 不重复显示。
   - 每张来源卡显示来源名称、用途、原始评级/说明、原始链接、版本/更新时间和 `x/y 项符合`；逐行列出来源要求、这把实例拥有的值、当前启用值及符合/不符/来源未要求/无法核对。
   - 异域固定配置显示“仅推荐这把武器”、使用说明和催化剂事实，不伪造随机 Roll 对照；未收录和读取失败显示局部中性状态与重试入口。
   - light.gg 只作为用户主动打开的单件复核入口，不参与批量主判定。

UI 数据必须继续来自真实 ViewModel 和 IPC；不得用样例 CSV、mock Roll 或固定状态直接驱动产品页面。

完成门槛：玩家能从列表判断先看哪把枪，在同名整理中按选定来源比较实例，并在详情中逐项确认结论来自哪个来源、哪些要求和本件实际拥有的哪些插槽。

### 6.8 阶段 7：人工确认的本地整理

目标：先提供只读来源对照，经过真实仓库抽查后再开放可撤销、可预览的玩家本地整理操作；系统不自动生成待处理结论。

实施顺序：

1. 第一轮只显示来源对照与既有玩家整理状态，收集真实账号中的映射缺失和数据差异案例。
2. 人工抽查五来源、0/y 项符合、资料库未收录、同名跨版本多实例、异域、专家版和配装引用实例。
3. 确认实例数据完整且安全规则稳定后，才允许玩家手动标记待处理。
4. 批量操作必须先展示预览、数量和保护冲突；第一版只写本地整理标签或调用已有安全转移能力。
5. 应用不自动分解、不自动解锁、不覆盖玩家手动保留，也不把推荐对照伪装成绝对强度或自动整理结论。

强制保护：

```text
locked
精确配装实例引用
玩家手动 keep
独特 Roll
来源冲突
Roll 或官方名称解析不完整
推荐库未覆盖
```

完成门槛：玩家在手动标记待处理前能看到来源对照、实例保护与同名比较；撤销本地整理状态不会影响游戏内物品。

### 6.9 阶段 8：旧链路收口和运行诊断

目标：只在新链路真实可用后删除兼容层，避免长期维护两套业务真相。

工作内容：

1. 在新链路经过发布验收后，删除只剩一次性迁移用途的旧 JSON 兼容读取代码；用户磁盘上的旧文件不主动删除。
2. 删除仓库匹配中的 `Map<itemHash, VaultItemMatchInfo>` 和按武器版本聚合推荐的逻辑；推荐改为名称级，匹配结果仍以 `instanceId` 为键。
3. DIM 新解析格式成为唯一导入入口，旧数据通过一次性迁移或重新导入处理。
4. 推荐数据状态页和诊断信息显示 schema 版本、数据集指纹、Manifest 版本、五来源 revision、异常数和最后扫描时间。
5. 保留 CSV 作为人工知识库、DIM Wishlist 作为交换格式、SQLite 作为运行时存储、JSON 兼容 DTO 作为接口格式。

完成门槛：运行时只有一个活动推荐数据库；旧 JSON 不再影响查询结果；诊断信息足以定位数据版本、导入和实例扫描问题。

### 6.10 外部数据源的接入顺序

- 五个一级来源是第一版主数据。发布版先完成 SQLite 单一真相，再完成阶段 3A 的数据获取渠道；没有稳定更新来源时，不能把开发机上的本地 CSV 当成所有玩家都能获得的数据。
- DIM Voltron 优先实现 GitHub 上游直连更新；中文知识库在线更新必须等待逐来源再分发许可确认。两者在应用内部都经过同一套校验与 SQLite 激活流程。
- light.gg 保持单件按需复核，不批量抓取，不作为“没命中就分解”的依据。
- D2Clarity、D2Foundry、d2-additional-info、Checkinfo 和 D2 Arsenal 作为后置增强来源，只有在许可、版本和稳定接口确认后才进入新的独立阶段。
- 后置来源只能增加证据或解释，不能绕过实例完整性和安全保护规则。

## 7. 验收标准

### 数据

- 五个一级来源有稳定身份、URL、版本或 revision、读取时间和内容指纹。
- 每条参与匹配的武器和 Perk 都有官方 Hash，且 Perk 属于目标武器对应插槽。
- `武器推荐.csv` 一行一个“官方武器名称 + 推荐来源”，`英文名称 + 推荐来源` 唯一；同名关联 Hash 只作为版本与官方证据。
- 不把不同来源的 Perk 池混成新的推荐行。
- 普通与强化 Perk 的兼容关系有官方可验证依据。
- 异域固定配置不生成虚假随机组合。
- DIM 来源块、作者、用途、标签和原始精确 Hash 规则不会在解析中丢失。
- CSV/DIM 导入失败不会留下半套 SQLite 数据集。
- 全新安装不需要玩家离开应用寻找 DIM 文件；“更新 DIM 社区推荐”能从 GitHub 上游取得版本、记录 commit SHA 并激活到本机 SQLite。
- GitHub 不可用、更新内容无效或 SQLite 激活失败时继续使用上一版数据，并允许改用 `.txt` / `.wishlist` 文件导入。
- 五来源中文知识库在线渠道在逐来源许可确认前保持 `license_blocked`，不得把本地开发数据误发布给普通玩家。

### 实例匹配

- 同名不同版本共享名称级推荐池，但只用每个玩家实例实际拥有的可对照插槽计算来源级结果。
- 每个 `instanceId` 得到独立结果，不因 `itemHash` 相同或不同共享实例命中状态。
- 完整扫描只使用该实例实际拥有的 Plug，并按真实插槽角色涵盖枪管/瞄具、第二列、大师、普通特性、起源特性和其他来源明确要求。
- 扫描不完整、来源冲突或官方名称无法解析时返回来源级“无法核对”，不改变玩家整理状态。
- 每个来源都能解释为 `x/y 项符合`、仅推荐这把武器、该来源未收录或无法核对；不得产生来源无关的共识或命中等级。

### 安全与产品

- 锁定、配装引用、玩家手动保留和独特 Roll 在待处理前触发保护。
- 默认扫描不自动修改玩家标签。
- IPC/API 返回 JSON 兼容的实例级 DTO，renderer 不直接访问 SQLite。
- 仓库页复用真实数据和现有页面，不引入 mock Roll 或第二套仓库页面。
- 批量操作最多写本地整理状态或执行已有安全转移；最终分解仍由用户在游戏内完成。

## 8. 不在本任务范围

- 自动或远程分解 Destiny 2 装备。
- 把未获授权的第三方资料打包进公开安装包。
- 批量抓取或镜像 light.gg。
- 未确认 Partnership 条件前打包 D2Clarity 数据。
- 把站点内部接口当作有 SLA 的产品主数据源。
- 使用 AI 猜测武器 Hash、Perk Hash、版本或作者未表达的组合。
- 自动写入配装、自动锁定武器或覆盖玩家手动标签。
- 护甲清理和 Armor Planner 规则改造。

## 9. 交付方式与进度维护

T20 按阶段交付，不把“生成 CSV”描述为整个任务的唯一下一步：

1. 每个阶段完成后更新本文件状态、实际产物、遗留异常和下一阶段前置条件。
2. `docs/todo.md` 只保留当前阶段、总体顺序和最近交付结果，详细设计继续维护在本文件。
3. 阶段 1 可独立进行数据审核；阶段 2–5 是准确性主链，必须在 UI 前完成。
4. 阶段 6 只接入现有仓库三个视图，不新增平行页面。
5. 阶段 7 必须由真实仓库只读结果和人工抽查驱动，不能仅凭样表完成就开放。
6. 阶段 8 只在新链路稳定后执行，不提前删除旧 JSON 回退数据。

当前阶段 1 已冻结，阶段 2/3 底座已经开始；后续继续按以下主线推进：

```text
完整知识库
  → Core 实例匹配与 DIM 语义
  → SQLite 推荐库
  → 发布版 DIM / 中文知识库更新渠道
  → 完整仓库 Roll 扫描
  → Desktop IPC / App workspace
  → 现有仓库三视图
  → 安全候选与批量整理
  → 旧链路收口
```
