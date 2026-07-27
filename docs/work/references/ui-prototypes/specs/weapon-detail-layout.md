# 武器详情契约

稳定契约标识：`weapon.detail`。

## 章节

统一武器详情固定包含身份与入口上下文、属性与获取、武器配置、目标匹配、升级与锻造、AI 分析，以及实例与操作栏。

## 对象模式

- 资料库：定义级只读对象，不标记实际 Roll。
- 商人 Offer：当前售卖配置，只读；购买前不能远程切换 Perk。
- 账号实例：展示实际拥有和已选 Perk，可在满足 Bungie 条件时执行切换、装备、转移、锁定和本地标记。
- 异域固定配置不显示随机池命中；传说武器区分完整掉落池与当前实例可切换项。

## 数据与判断

属性标准值来自 Manifest，实际值和实例插槽来自 Profile，商人配置来自 Vendor API。DIM、社区和个人知识独立匹配；AI 只能在独立分析区生成主观解释，不回写事实区域。

## 状态

原型提供正常、加载、空、失败、部分可用、禁用和进行中开关。正式实现必须用真实 ViewModel 状态替换开关，并保留原配置直到写操作成功。

## 滚动与响应式

- 档案正文和实例抽屉可独立纵向滚动，滚动条外观由公共设计系统统一接管。
- 章节导航、快速标记、目标来源和上下文摘要必须换行，不得建立水平滚动轨道。
- 属性、升级和实例表格必须使用固定表格布局、单元格换行或窄屏重排，不使用固定最小宽度触发水平滚动。

## 现有功能清单

| 功能域 | 现有真实能力 |
|---|---|
| 身份与版本 | 武器名称、图标、类型、框架、槽位、弹药、伤害类型、勇士效果、入口上下文、对象类型、配置类型、版本切换和定义追溯 |
| 属性与来源 | Manifest 标准属性、Profile 当前属性、待应用属性变化、官方来源、实时可获取状态、商人价格/限制/刷新时间和来源跳转 |
| 武器配置 | 固定配置、当前实例配置、完整掉落池、实例真实拥有 Perk、待应用选择、提交、刷新、错误恢复和只读边界 |
| 目标匹配 | DIM Wishlist、社区推荐、个人知识独立切换，Perk / 大师杰作 / 模组的拥有与启用匹配 |
| 升级与锻造 | 大师杰作、模组、催化剂、强化阶级、锻造等级、进度和数据来源 |
| AI 与知识 | 基于当前对象分析、可选外部查询、引用、个人知识新增/修改/启停/删除 |
| 实例与操作 | 当前 Hash 同名实例切换、装备、转移、锁定、本地标记、备注、复制结论、群聊说明和加入配装草稿 |

## 原型视觉结构清单

| 原型区域 | 产品实现 |
|---|---|
| `dossier-toolbar` | `SharedItemDetailDialog` 的共享档案头，只显示档案标题、说明和关闭图标 |
| `identity` | `WeaponIdentity`，承载对象身份、版本、摘要事实和定义追溯 |
| `detail-sticky / section-nav` | `weapon-detail-nav`，页内锚点导航和实例栏开关 |
| `dossier-main` | 五个连续章节，不使用首层浮动卡片 |
| `instance-rail` | 宽屏停靠栏；`<=1360px` 右侧 Drawer，拥有独立标题、关闭、遮罩和焦点返回 |
| `detail-state-layer` | 产品真实状态由加载骨架、区块空态、部分可用提示、写操作反馈和禁用控件分别承载 |

浅色主题下，配置区与同名实例区的透明白色 Perk 图标统一使用深色图标承载底和内边距；实例卡片本身仍使用当前主题的对象背景，不得用浅色底直接承载白色图标。

浅色主题下，AI 主命令使用亮色紫底与白色文字，Hover 保持白字；禁用命令使用不透明的中性浅灰底、灰色边框和可读灰字，不得通过整体半透明造成文字与背景同时失去对比度。

## 字段与操作绑定

| 原型对象 | 真实字段 / action |
|---|---|
| 身份和上下文 | `model.identity`、`model.context`、`model.versions`、`actions.selectVersion` |
| 属性表 | `model.stats`，区分 `standard_value`、`current_value`、`pending_value` 和 modifiers |
| 获取来源 | `model.sources`、`actions.openSource` |
| 当前配置 / 掉落池 | `model.configuration.selection_columns`、`pool_columns`、`stagePerk`、`applyPendingPerks`、`refreshConfiguration` |
| 目标数据源 | `model.personal_targets`、`model.recommendations`，只切换展示来源，不合并结论 |
| 升级状态 | `model.upgrades` |
| AI 分析 | `analysis`、`actions.runAnalysis`，外部查询由 `allow_external_search` 显式控制 |
| 个人知识 | `personalKnowledge`、`saveKnowledge`、`setKnowledgeEnabled`、`deleteKnowledge` |
| 实例和操作 | `model.same_hash_instances`、`actions.selectInstance`、`instanceActions` |

## 状态矩阵

| 状态 | 产品表现 | 保留能力 |
|---|---|---|
| 加载 | `SharedItemDetailLoading` 保留档案、身份、导航和正文尺寸 | 关闭详情 |
| 空 | 对应章节显示局部空态，不替换整个档案 | 章节导航、实例栏、关闭 |
| 失败 | 来源、AI 或写操作在所属区域显示错误和恢复命令 | 已确认事实和当前配置 |
| 部分可用 | 来源状态显示不完整提示；缺失字段不伪造 | 其余已确认章节 |
| 禁用 | 只读对象、未配置写操作或不满足实例条件时禁用对应命令并保留原因 | 阅读、切换章节和查看来源 |
| 进行中 | 写操作和 AI 使用 `aria-busy`、阶段文案及禁用重复提交 | 当前配置在成功前保持不变 |
| 正常 | 五个章节和实例栏完整显示 | 全部满足条件的真实操作 |
