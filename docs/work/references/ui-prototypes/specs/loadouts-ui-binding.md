# 配装页实现对照

本文件是 T1 从 `全应用视觉原型.html` 的配装章节迁入 `packages/ui/src/loadouts/` 前的实施对照。它不定义 mock 数据；所有产品字段和操作必须来自现有 ViewModel、IPC 或后续明确新增的契约。

## 现有功能清单

| 现有能力 | 当前来源 | 迁入后的归属 | 处理方式 |
|---|---|---|---|
| 读取 Bungie 游戏内配装槽及其装备实例 | `AccountSummary.characters[].loadout_slots` | 游戏内配装 | 保留，按当前角色分组显示 |
| 直接应用游戏内槽位 | `equipSavedLoadout` | 游戏内配装详情 | 保留，调用 Bungie 后刷新真实账号状态 |
| 以当前装备覆盖游戏内槽位 | `snapshotCurrentLoadout` | 游戏内配装详情 / 保存当前配装 | 保留，空槽选择和覆盖确认需要后续补齐 |
| 旧本地模板列表、重命名、删除 | `LoadoutTemplate` 与 templates IPC | 本地配装方案 | 先完整保留真实行为；领域切片完成后替换为新方案模型 |
| 旧模板的缺失分析、转移计划、逐件转移 / 装备、来源查看 | app workspace 与 renderer write actions | 本地配装方案的兼容操作区 | 不隐藏；在新批量应用完成前保留为“逐件处理” |
| 两个本地模板对比 | `LoadoutCompareView` | 本地配装方案的对比区 | 保留，不再与游戏内槽位混在目录中 |
| 从当前角色新建本地方案 | `saveCharacterLoadout` | 本地配装方案目录顶部 | 复用当前角色已装备物品创建本地模板；新模型完成后替换为可编辑方案创建流程 |
| DIM 配装分享链接导入 | 无实现 | 本地配装方案目录底部 | 保留入口位置；能力完成前点击只说明解析服务未接通且不创建空方案，后续接入 Services / IPC / renderer 契约 |
| 本地方案批量应用及指定 Perk | `EquipItems`、`InsertSocketPlug` 已有平台接线；本地模板未保存 socket 选择 | 本地配装方案 | 计划只处理 3 武器 + 5 护甲；仅当已保存并验证 `socket_index` / `plug_hash` 时才追加职业分支 Plug，星象、碎片和技能否则仅记录 |

## 原型结构对照

| 原型区域 | 产品组件 | 数据 / 行为边界 |
|---|---|---|
| 页面标题、顶部状态 | `LoadoutsPageContentView` | 使用真实页面消息和写操作进行中状态 |
| 角色切换栏 | `LoadoutsPageContentView` | 从 `AccountSummary.characters` 读取；只影响游戏内槽位视图 |
| 游戏内 / 本地方案页签 | `LoadoutsPageContentView` 本地状态 | 两种对象分开渲染，不能用“来源筛选”混成一张目录 |
| 游戏内槽位目录与详情 | `LoadoutsPageContentView`、`LoadoutsPageModel` | 使用现有 `in-game` entry、slot、items、应用和快照 action |
| 本地方案目录与详情 | `LoadoutsPageContentView`、`LoadoutsPageModel` | 使用现有 `local-template` entry、模板项、状态、对比和旧写操作 |
| 右侧状态 / 操作摘要 | `LoadoutsPageContentView` | 仅显示当前模型可证明的就绪、可处理、缺失 / 阻塞数据 |
| DIM 导入弹窗 | 后续领域、IPC 和 renderer adapter | 读取、预览、确认写入必须同一条真实流程，不从静态原型复制 |

## 真实字段与 action 绑定

| UI 信息或操作 | 字段 / action | 约束 |
|---|---|---|
| 角色名称、职业、槽位 | `AccountSummary.characters`、`loadout_slots` | 不从名称反推实例，不显示 Bungie 未返回的配置 |
| 游戏内槽位名称、编号、装备数量、装备实例 | `slot.name`、`slot.index`、`slot.item_count`、`slot.items` | 只显示实际返回项目；空槽不伪造成已保存槽位 |
| 应用游戏内配装 | `actions.equipSavedLoadout` | 等待 Bungie 返回，随后刷新账号实际状态 |
| 当前装备写入槽位 | `actions.snapshotCurrentLoadout` | 覆盖确认由 renderer 写入 action 负责 |
| 本地方案名称、职业、装备与更新时间 | `LoadoutTemplate` | 当前是旧模板字段；新模型完成前不声称支持未拥有条目或目标 Perk 编辑 |
| 方案条目位置、可操作状态、来源 | `LoadoutTemplateItemRowView` | 用实例和真实分析结果展示，不能用同名替代实例 |
| 本地构筑配置 | 后续 `LoadoutTemplate` 构筑字段：职业分支实例、`socket_index`、`plug_hash`、星象 / 碎片 / 技能记录 | 装备应用列表固定排除非装备收藏项；未保存或未验证 Plug 时必须就地显示“仅记录 / 不可用”与原因 |
| 转移、装备、查看来源 | `executeSingleItemTransfer`、`equipSingleItem`、`openTemplateSourceItem` | 保留现有确认、写操作开关和成功后刷新逻辑 |
| 批量补齐、复制缺失、对比 | `executeMissingTransfer`、`copyMissingItems`、`LoadoutCompareView` | 保留现有语义，直到新批量应用完成 |

## 状态矩阵

| 状态 | 游戏内配装 | 本地配装方案 | 交互规则 |
|---|---|---|---|
| 加载 | 保留角色栏和槽位栏骨架 | 保留方案区域和创建 / 导入位置 | 不显示旧快照为最新结果 |
| 空 | 提示当前角色没有已保存槽位，仍保留保存当前配装入口 | 提示没有本地方案，保留真实可用创建入口 | 不用示例方案占位 |
| 失败 | 显示账号读取失败范围和重试入口 | 显示本地读取失败范围和重试入口 | 不静默回退为空白页 |
| 部分可用 | 可定位实例继续显示，未定位条目单独标记 | 可分析条目继续显示，缺失 / 阻塞项单独标记 | 不把部分结果描述为完整配装 |
| 禁用 | 写操作关闭时保留详情，按钮就地解释原因 | 同左 | 不隐藏已有操作 |
| 进行中 | 保留写入前详情，操作按钮显示处理中 | 保留计划和每项当前结果 | API 返回前不显示成功 |

## 当前切片

本切片只重建唯一配装页的视觉结构和对象分栏，保留现有真实字段与 action。领域模型替换、DIM 解析、导入预览和完整批量应用由下一切片接入，期间不得以 mock 控件填充产品页面。
