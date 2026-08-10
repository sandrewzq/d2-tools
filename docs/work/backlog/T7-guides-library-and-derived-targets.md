# AI 工作台、原生能力与攻略配装工作流

> 状态：进行中
> 更新时间：2026-08-08

## 目标

在 `d2-service` 内建设一组可独立使用、可组合、可追溯的 Destiny 原生能力，并让当前页面、AI 工作台和后续自动化入口复用同一份领域真相。

T7 首期围绕攻略、装备目标、护甲规划和配装工作流交付：玩家可以保存攻略，提取待确认要求，结合当前账号与 Manifest 生成装备目标、护甲方案和配装候选，并在明确确认后执行现有安全写操作。没有配置 AI 时，攻略管理、确定性查询、Armor Planner、装备目标和操作计划仍然可用。

AI 负责理解自然语言、选择内部能力、比较结果和解释取舍；确定性模块负责事实、证据、计算、计划、执行和验证。AI 输出不能直接成为业务真相，也不能直接调用 Bungie 写接口。

## 整体判断

T7 不是重新建设一套覆盖全应用的“通用能力平台”，而是在现有领域模块之上补齐三类缺口：可追溯结果、Armor Planner 深模块，以及 AI/攻略/目标到配装的受控交接。当前账号、资料库、商人、仓库和配装已经有成熟的类型化 workspace 与真实数据链路，强制它们全部改为消费 `CapabilityResult<unknown>` 会扩大接口、削弱类型信息，并让大量稳定页面承担无直接玩家价值的迁移风险。

重新设计后的 seam 如下：

1. 领域专用深模块继续拥有业务真相，例如资料库搜索、商人库存、账号实例、本地配装和 Armor Planner；页面继续消费类型化 ViewModel。
2. `DomainResult<T>` 与 `EvidenceRef` 作为可选的共享结果外壳，用于需要时效、来源、警告或追溯的领域结果，不要求每个内部函数和页面状态都包装。
3. `AssistantCapabilityCatalog` 是现有领域模块面向 AI 的受控 Adapter/投影，只暴露首批稳定、只读、可审计能力，不成为页面的新中间层。
4. 写操作保持独立 seam，按 `plan -> confirm -> execute -> verify` 渐进迁移；T7 只接入会由 Armor、攻略或 AI 触发的现有安全动作，不以一次性重写全部 Desktop handler 作为前置条件。
5. T7 的首个玩家价值应来自原生 Armor Planner 和配装工作流，而不是先完成不可见的平台化工程。

按访问频率和职责分配产品权重：

| 层级 | 权重 | 产品位置 | 原因 |
|---|---|---|---|
| 直接确定性能力 | 最高 | 账号、仓库、配装、资料库、商人、Armor Planner | 高频使用，承载事实、编辑和执行，是玩家完成任务的主路径 |
| 攻略与装备目标 | 中高 | 独立攻略页、仓库/详情/配装交接 | 负责保存长期意图和跨页面复用，但不替代原页面 |
| AI 工作台 | 中 | 全局侧栏 | 降低查询和组合门槛，解释结果并发起交接，不拥有业务对象 |
| 审计与诊断 | 低可见、高约束 | 计划审阅、日志与诊断入口 | 低频访问，但必须完整支撑安全、追溯和故障恢复 |

## 当前实现状态

- 已建立 `DomainResult<T>`、`EvidenceRef`、只读能力目录 Adapter 和有界结果缓存；AI 工作台已真实接入装备搜索、Perk 搜索、账号实例搜索、商人 Offer 搜索、本地攻略搜索、本地配装检查和 `armor.plan`，页面仍消费各领域的类型化 ViewModel。
- Armor Core 已覆盖 Armor 3.0 规则、属性账本、理论组合、库存成装、待刷规划、升级路径，以及 Manifest 套装 `2件 / 4件 / 2+2` 约束。
- 当前 Manifest 可推导 Armor 3.0 框架规则；规则集、套装目录和账号护甲实例由 Desktop 主进程统一补齐，renderer 不上传规则、账号数组或套装目录。
- App 已提供平台无关 Armor workspace、自动 revision、旧请求保护和 `idle / loading / ready / stale / error` ViewModel；Services 提供输入指纹、同请求合并和有界缓存；Desktop 使用独立 Worker 执行计算。
- 配装页已接入理论上限、库存成装、待刷目标和升级路径四种模式，支持六维目标、模组预算、优先级、套装、位置范围、固定异域、锁定和排除，并区分理论身份、待刷要求与真实实例。
- 库存和升级候选可以预填真实实例；本地方案只保存候选缓存键、候选 ID、规则与来源 revision 和实例 ID，不持久化完整搜索结果，也不改变攻略、DIM 或手工来源身份。
- 攻略中的护甲属性已派生为五件护甲聚合约束，不再按单件护甲属性匹配；当前六维直接映射，旧六维仅作为兼容别名并强制进入待确认。
- 攻略可将唯一确认的异域实例预填到 Armor 约束；同名多实例、缺失实例和无法确认的模组预算保持待确认，不会任意锁定账号装备或猜测预算。
- 原生攻略上下文、攻略 workspace 和任务状态已替代旧运行时命名；应用不调用、嵌入或复制外部攻略工具。
- Armor Planner 已将确定性输入指纹拆分为缓存键和稳定 `result_id`；工作台传递首次计算时间与缓存过期时间，本地方案保存结果 ID、候选 ID、规则版本和账号/Manifest/规则来源 revision，不持久化完整求解结果。
- 本地配装应用计划已拥有稳定内容标识；用户确认后、首个写操作前强制刷新账号并重新生成完整步骤，账号身份、目标角色、实例数量、装备位置、来源角色替换、可写 Plug 或缺口任一变化都会将计划标记为失效并保持零写入。
- 本地配装确认后生成独立 `confirmation_id` 与 `execution_id`；每个转移、装备和 Plug 步骤将 `plan_id / confirmation_id / execution_id / step_id` 写入现有操作日志，设置页和复制诊断可按同一次执行追溯逐项结果。
- 执行后刷新验证会追加独立 `execution-verification` 日志，复用同一组计划、确认和执行 ID，并区分 `verified / partial / mismatch / unavailable`；设置页可单独筛选验证结论。
- 本地配装已支持 DIM 当前 `equipped / unequipped` 内联格式和旧 `items` 格式导入；完整真实实例方案可在本地生成 DIM 链接，实例缺失、Hash 漂移、Plug 无法映射、理论或待刷模式都会返回结构化阻断原因。
- 全局侧栏已删除固定攻略任务 Tab、任务树和第二套解析流程，只保留单一 AI 工作台；旧 `d2-tools.assistant.task-context` 文本会在配装页攻略导入中一次性恢复，成功生成草稿后再清除。
- AI 工作台每轮按保守关键词最多调用三个受控只读能力，将确定性结果、警告、证据和完整 `result_id` 发送给模型，并在可见回答底部追加缩短后的数据引用；宽泛整理和推荐问题继续使用页面上下文，不伪造实体查询。
- AI 成功问答会保存轻量不可变上下文快照，记录基础上下文和实际提示指纹、页面与账号范围、Manifest 版本、能力结果引用、失败能力和前文数量；消息通过快照 ID 关联，恢复旧会话时可识别历史上下文，后续追问携带有限前文并生成新快照。快照不保存完整提示、账号装备正文或密钥。
- 能力目录会持久化最近 100 条脱敏审计，包含能力名、输入摘要、结果引用、状态、耗时、警告码、数量和证据 ID；设置页现有脱敏诊断导出会附加最近记录，不保存完整结果、完整提示或凭证。
- 首个 `guide_capture` 成果已接入：明确的配装、构筑或攻略问题可生成带上下文快照和结果引用的草稿卡，用户点击后只预填配装页现有攻略解析面板；解析、账号匹配、待确认项和显式保存仍由配装页负责。
- `armor_solution_comparison` 已接入：`armor.plan` 返回候选时保存目标、模式、结果状态、前三个候选摘要、能力结果和底层 Armor `result_id`。成果卡可交给配装页，但只带入原始职业与六维目标并重新解析；候选最终属性不会被误当成新约束，也不会直接选择实例或保存方案。
- `equipment_target_candidates` 已接入：明确要求“加入配装、作为目标、想刷或查找某件装备”时，AI 编排会同时查询账号实例与 Manifest 定义。账号真实实例优先，同 Hash 的定义不重复；成果最多保留八项，在配装页复选后生成 `assistant-targets` 未保存草稿。真实实例写入 `selected_instance_id`，仅定义候选只保存 `item_hash` 并保持待获取、待选择状态。
- 攻略库与提取切片已接入：`GuideSource`、带章节分段的 `GuideSnapshot`、`GuideDocument` 和 `GuideExtraction` 进入 Core。Services 使用 `guide-library.json` 保存最多 200 篇文档和每篇最近 20 个不可变正文快照，使用 `guide-extractions.json` 保存快照绑定的轻量确认。共享一级页面支持文本、笔记和来源 URL、受控链接读取预览、全文搜索、分类、标签、收藏、归档、恢复、删除及候选复选确认，并纳入便携备份；损坏文件不会被当作空库覆盖，容量达到上限时不会静默淘汰旧文档。阅读、人工编辑和确定性提取不依赖 AI。
- `armor.plan` 只在问题同时包含明确职业和 Armor 3.0 当前六维数值目标时调用，复用现有 Worker、缓存、规则集和账号护甲归一化；旧六维、缺职业和升级基线不明确时不会猜测或静默执行。能力只投影前三个候选并引用底层 Armor `result_id`。
- 独立装备目标领域已建立：`WeaponTarget | ArmorAcquisitionTarget`、版本化 `equipment-targets.json`、用户手动创建、旧 `LocalTargetRules` 与 DIM Wishlist 单向同步、Manifest 武器/Perk 校验、同名多版本待确认、来源与 Manifest 双证据、便携备份、仓库筛选/同名整理证据及装备详情目标匹配已接入。已确认攻略中的 `weapon_specific` 可在攻略页显式同步；只有武器版本唯一且每个 Perk 在该武器定义内唯一时才落库。配装页可把用户选中的 acquisition 候选缺口保存为 `armor_planner_gap` 目标，保留 Armor `result_id`、候选 ID、槽位、框架、第三属性、调整、套装和大师杰作上下文，并只按基础属性门槛提示命中。两类转换都不会自动修改标签、锁定或整理决定。
- 攻略确认的五件聚合属性与异域护甲要求已派生为独立 `armor_constraint_draft`：成果 ID 绑定攻略文档、正文快照和提取确认，攻略页显示聚合目标与待确认项，并经显式操作进入配装工作台形成未保存草稿；不会写入单件装备目标或自动运行 Planner。
- `loadout_candidates` 已接入：攻略页按当前选中角色刷新账号并匹配已确认要求，成果 ID 绑定攻略提取、角色和账号匹配指纹；唯一完整命中默认选中，同名多实例、抽象要求与部分 Perk 命中保持替代候选。配装页复选后只生成未保存草稿，账号不一致或实例已消失时阻断交接。
- `GuideDerivedRelation` 索引已接入：Core 定义稳定实体关系，Services 使用版本化 `guide-derived-relations.json` 保存轻量索引；攻略确认、候选生成、正式装备目标写入、Armor 缺口目标写入，以及 `armor_constraint_draft / loadout_candidates` 来源本地方案显式保存会维护关系，删除攻略、目标或本地方案时清理对应索引。攻略页可查看正式目标、Armor 约束、账号候选及其已保存本地方案，并可跳转到现有目标管理或配装入口；打开攻略页时会为仍有有效攻略父关系的已有本地方案补建下游索引，已删除攻略不会从残留 `source_id` 重建；便携备份已包含关系索引。
- 派生成果反向精确定位已接入：攻略页可定位仓库中的具体装备目标行或配装页中的具体本地方案；攻略来源目标和本地方案通过 `GuideDerivedRelation` 确认有效关系后返回具体攻略，关系失效时保留业务对象并显示明确提示。Armor 缺口目标可把稳定 `result_id / candidate_id` 带回配装页核对来源，但完整求解结果不持久化，页面不得伪恢复旧候选，只能要求按当前账号、Manifest 和规则重算。
- T7 本轮代码切片已收口，尚未完成真实账号与 Desktop 实窗验收。`guide_extraction_patch` 缺少独立的领域修订命令和人工审阅收益，暂作为后续可选增强搁置；当前确定性提取与逐项人工确认继续作为攻略要求真相，不把 AI 建议混入已确认记录。

## 设计依据

`d2-skill` 只作为能力边界和安全模型参考，不作为运行时依赖，也不复制其 CLI、命令名称或实现代码。T7 吸收以下原则：

- 搜索、检查、匹配、评分、规划和执行保持可组合，不隐藏在一个含糊的“智能处理”动作中。
- 确定性能力返回稳定 ID、查询条件、来源、时间、理由、证据和可复用结果，而不是只返回自然语言摘要。
- 复合结果必须保留底层结果引用，主观推荐不能伪装成确定性事实。
- 写操作遵循 `plan -> confirm -> execute -> verify`，AI 最多发起计划，不能确认或执行。
- 中间结果可被页面、AI 会话、攻略、装备目标和配装继续引用，避免重复读取和重复推理。

`d2-armor-solver` 只作为护甲规划能力范围参考。T7 吸收它对五类玩家问题的拆分：理论方案、可达范围、已有库存组合、已有与待刷混合规划、当前配装升级顺序。Armor Planner 必须结合当前项目的 Armor 3.0 数据、账号实例、Manifest 套装目录、配装模型和 UI 重新实现，不复制静态套装数据、DIM CSV 推断或算法代码。

核心原则：参考能力，重新设计；原生实现，不复制代码；不存在外部运行依赖，也不保留外部产品名称。

## 当前基础与问题

### 已有基础

| 当前能力 | 现有位置 | T7 可用程度 |
|---|---|---|
| 账号摘要、角色、装备实例与位置 | `packages/core/src/account/summary.ts`、`packages/services/src/account/` | 可直接作为 Armor、配装和 AI 只读查询真相 |
| Manifest、装备、Perk、版本与来源 | `packages/core/src/items/`、`packages/services/src/gameData/`、`packages/app/src/workspaces/libraryPage.ts` | 可直接复用，只需增加结果/证据 Adapter |
| 商人实时库存、Offer 与页面模型 | `packages/core/src/vendors/inventory.ts`、`packages/services/src/vendors/`、`packages/app/src/workspaces/vendorsPage.ts` | 可直接复用，不重写刷新与资格判断 |
| 仓库装备决策证据和本地目标 | `packages/core/src/evidence/itemDecision.ts`、`packages/core/src/analysis/targets.ts` | 证据可扩展；旧目标模型只适合作兼容迁移输入 |
| 本地配装、账号匹配和执行步骤 | `packages/core/src/loadouts/plans.ts`、`localPlanExecution.ts`、`packages/app/src/workspaces/localLoadoutPlanWorkbench.ts` | 保持配装所有权，增加 Armor 候选和来源交接 |
| DIM 配装链接 | `packages/core/src/loadouts/dimImport.ts`、`packages/services/src/loadouts/dimImport.ts` | 已支持当前与旧内联格式导入，并可从账号核对后的真实实例方案生成本地 DIM 链接；仍需真实 DIM 往返验收 |
| Bungie 安全写操作与日志 | `packages/desktop/src/main/ipc/actions.ts`、`packages/services/src/bungie/actions.ts`、`packages/core/src/actions/log.ts`、`packages/services/src/actions/logStore.ts` | 已能执行和记录，缺少不可变计划、确认对象与独立验证 |
| 工具元数据和 AI 会话 | `packages/core/src/tools/registry.ts`、`packages/core/src/ai/chat.ts`、`packages/app/src/capabilities/` | 七个只读能力、不可变会话快照和脱敏审计已接入，仍需补齐升级基线、仓库证据和更多成果交接 |
| 攻略与基础护甲原型 | `packages/core/src/assistant/guide*.ts`、`loadoutDraft.ts`、`packages/core/src/loadouts/armorSolver.ts` | 只作为迁移输入，不能继续在旧接口外叠加 T7 全部能力 |

### 需要解决的问题

- 当前装备、Perk、账号、商人、配装、攻略和 Armor 只读能力已有统一目录与 Desktop Adapter，但升级基线、仓库决策证据和更多页面结果交接仍不完整。
- 当前 `ItemActionPlan` 与真实执行脱节，执行阶段会重新读取和判断，计划本身不能作为不可变确认对象。
- 工具审计与写操作日志分离，无法从建议追溯到计划、确认、执行和验证。
- 现有攻略流程固定为“解析 -> 账号匹配 -> 草稿”，名称匹配、版本处理和旧六维映射存在语义风险。
- 当前护甲求解只覆盖账号实例、基础六维目标和模组预算，且把最终属性直接当作实例基础值组合；缺少规则版本、属性账本、理论方案、可达范围、套装、异域职业物品、调整身份、待刷规划和逐步替换顺序。
- AI 会话已有轻量上下文快照、结果引用和历史状态提示，但尚未把模型输出转成可进入攻略、目标或配装页面审阅的类型化成果。

## 产品决策

- 一级导航增加“攻略”，顺序为“首页 / 账号 / 仓库 / 配装 / 攻略 / 资料库 / 商人 / 设置”。
- 全局侧栏只保留一个 AI 工作台，删除现有固定攻略任务 Tab 和任务树。
- 各领域页面仍是直接使用能力和确认业务对象的主入口；AI 工作台不是第二套资料库、仓库、商人、攻略或配装页面。
- T7 不重新实现当前已经可用的账号、资料库、商人和仓库逻辑；只在 AI、攻略、目标或跨页面追溯确有需要时，为其增加结果与证据 Adapter。
- AI 可以自动执行只读能力，也可以请求生成写操作计划；确认、执行和失败恢复必须回到对应页面或统一计划审阅界面。
- 攻略、装备目标、护甲约束、配装草稿和操作计划是不同业务对象，不合并成一个通用“AI 结果”。
- DIM Wishlist、DIM 配装、用户目标和攻略继续是独立来源，保存来源关系但不互相伪装。
- 日报、周报、主动提醒和变化通知不属于 T7，继续按独立搁置文档评估。

## 玩家心智模型

| 模块 | 玩家问题 | 职责 |
|---|---|---|
| AI 工作台 | 我可以怎么问、比较或继续处理当前内容？ | 理解意图、调用只读能力、解释证据、提出候选和打开审阅 |
| 攻略库 | 这份攻略原文是什么，我确认了哪些要求？ | 来源、正文快照、结构化整理、人工确认和引用 |
| 资料库 / 商人 | 游戏定义、版本、Perk、来源和当前 Offer 是什么？ | Manifest 与 Bungie 实时事实 |
| 账号 / 仓库 | 我拥有什么，实例在哪里，哪些证据命中？ | 账号实例、重复对比、本地标记和装备目标命中 |
| Armor Planner | 这些护甲目标是否可达，怎么组合或升级？ | 确定性约束求解、差距、替换和待刷规划 |
| 配装工作台 | 我准备保存和使用哪套配置？ | 实例选择、本地方案、游戏内配装和安全执行 |
| 操作计划 | 将要修改什么，是否成功且已验证？ | 计划、确认、执行、逐步结果和刷新验证 |

## 领域模块与 AI 能力目录

### 能力粒度

领域模块应回答稳定的业务问题，而不是暴露 Bungie 原始端点，也不把完整工作流压成一个大命令。AI 目录只投影 T7 首期确实需要组合的只读能力：

| 领域 | 原生能力 | 当前基础 |
|---|---|---|
| Manifest | 搜索装备、搜索 Perk、检查具体版本与 Plug | 资料库与装备详情已有 |
| 来源 | 解析官方来源、检查当前商人或活动可用性 | T3 与资料库已有 |
| 账号 | 读取账号摘要、搜索实例、检查实例详情与位置 | 账号与仓库已有 |
| 仓库 | 重复分组、目标命中、证据汇总 | 仓库与证据模块已有 |
| 商人 | 搜索当前 Offer、价格、购买条件和刷新边界 | 商人页已有 |
| 配装 | 检查游戏内配装、本地方案和实例缺口 | 配装页已有 |
| 护甲 | 理论方案、可达范围、库存求解、待刷规划和升级分析 | 需要深化 |
| 攻略 | 保存、搜索、读取快照和解析待确认要求 | 需要建设 |
| 操作 | 为现有安全写操作生成计划；执行和验证走独立 seam | 需要渐进统一 |

活动、公会、排行榜、原始 Bungie API fallback、CLI 和 MCP 不因 `d2-skill` 已有对应能力而自动进入 T7。

### 深模块接口

每个领域保留自己的小接口，例如资料库搜索、商人 Offer 查询、账号实例检索和 Armor Planner。App 层只增加 AI 所需的受控目录：

```ts
type AssistantCapabilityName =
  | "manifest.search-items"
  | "manifest.search-perks"
  | "account.find-items"
  | "vendors.find-offers"
  | "loadouts.inspect"
  | "armor.plan"
  | "guides.search";

interface AssistantCapabilityCatalog {
  list(): AssistantCapabilityDescriptor[];
  invoke<N extends AssistantCapabilityName>(
    name: N,
    input: AssistantCapabilityInput<N>,
    context: AssistantCapabilityContext
  ): Promise<AssistantCapabilityOutput<N>>;
}
```

目录隐藏鉴权、缓存、数据新鲜度、Adapter 选择、错误归一化、证据投影和审计。调用方只能提交领域输入，不传 Bungie endpoint、Profile components、缓存路径或提示词。

页面不调用这个目录，继续消费领域专用 ViewModel。目录 Adapter 与页面 ViewModel 复用同一个 core/services/app 实现，而不是相互调用。当前 `D2ToolDefinition` 迁为目录描述信息的投影，不再单独维护一份与执行脱节的工具真相。

### 统一结果

需要跨页面引用、交给 AI、缓存或审计的结果使用统一外壳；页面内部的瞬时筛选、布局状态和简单 ViewModel 不强制包装：

```ts
type DomainResult<TData, TQuery> = {
  result_id: string;
  kind: string;
  version: number;
  status: "complete" | "partial" | "failed";
  checked_at: string;
  expires_at?: string;
  query: TQuery;
  data: TData;
  evidence: EvidenceRef[];
  warnings: DomainWarning[];
  composed_from?: string[];
};
```

规则：

- `result_id` 在会话、攻略、目标、配装和操作日志中稳定引用。
- `checked_at / expires_at` 表达数据时效；过期结果可以查看，但不能伪装成当前事实。
- `status=partial` 必须说明缺失来源，不能把网络失败写成“没有结果”。
- 复合能力使用 `composed_from` 引用底层结果，不复制一份失去来源关系的数据。
- UI 摘要、AI 输入和诊断导出都是结果的投影，不改变原结果语义；AI 只接收经过字段白名单处理的投影。
- 能力结果默认进入有界缓存和审计索引，不作为永久业务对象；攻略、目标和配装只保存确认后的领域数据及必要结果/证据引用，不长期复制完整账号快照。

### 证据模型

`EvidenceRef` 统一表达事实从哪里来：

- Bungie Profile、Vendor、Milestone 等实时响应快照。
- Manifest 定义与 Manifest 版本。
- 用户确认的本地标记、装备目标和攻略快照。
- DIM Wishlist 等明确导入来源。
- 确定性分析结果及其底层结果引用。

证据记录稳定实体 ID、来源类型、观察时间、时效和可打开位置。AI 推测、社区文字和启发式评分不能升级为官方证据；它们只能作为带来源的建议或分析理由。

## 安全执行链

### 四阶段接口

写操作使用独立深模块，不通过 `AssistantCapabilityCatalog` 执行：

```ts
createActionPlan(request: ActionPlanRequest): Promise<ActionPlan>
confirmActionPlan(input: ActionPlanConfirmationInput): Promise<ActionConfirmation>
executeConfirmedPlan(input: ExecuteConfirmedPlanInput): Promise<ActionExecutionResult>
verifyActionExecution(input: VerifyActionExecutionInput): Promise<ActionVerificationResult>
```

首期只统一当前应用已经支持的安全写操作：锁定/解锁、转移、装备、邮政官取回、免费可复用 Plug 插入和游戏内配装栏操作。不增加拆解、删除、购买或其他不可逆动作。

### `ActionPlan`

计划必须是不可变、可审阅的业务对象，至少包含：

- `plan_id`、版本、创建时间、过期时间和计划指纹。
- 发起来源：页面、AI 成果、配装、仓库或用户直接操作。
- 账号与实例快照版本。
- 逐步动作、目标实例、来源位置、目标位置和预期变化。
- 无操作项、阻断项、前置条件、风险和可恢复说明。
- 使用的能力结果与证据引用。
- `requires_confirmation=true`，以及是否允许部分执行。

计划生成不能修改账号，也不能把无法执行的步骤标记为成功。

### 确认与执行

- 确认必须来自用户可见的计划审阅界面，不能由模型文本或后台任务代替。
- `ActionConfirmation` 绑定 `plan_id` 和计划指纹；计划变化、过期或账号快照失效后必须重新确认。
- 执行必须消费已确认计划，不得静默重建另一份计划后继续。
- 执行前重新校验关键前置条件；实例位置、锁定状态或配装状态变化时返回失效，不猜测新目标。
- 批量动作保存逐项结果、Bungie 状态码、跳过原因和部分成功，不用汇总成功掩盖失败项。

### 验证与审计

- 执行后刷新必要的账号或实例数据，比较预期状态与观察状态。
- 验证状态统一为 `verified / partial / mismatch / unavailable`。
- “接口返回成功”与“账号状态已验证”分开显示。
- 能力调用审计与写操作日志通过 `result_id / plan_id / execution_id` 关联。
- 审计只保存脱敏输入摘要、结果摘要、来源引用和错误码，不保存 token、Cookie、完整 AI 提示或不必要的账号快照。

## AI 工作台

### 定位

AI 工作台是原生能力的自然语言入口和解释层，不拥有账号、攻略、目标、配装或操作计划。它可以自动运行只读能力，不能直接调用执行接口。

### 上下文快照

每次发送消息创建不可变 `AssistantContextSnapshot`：

- 当前页面、选中实体和选中角色。
- 账号、Manifest 和来源数据版本。
- 用户允许发送的字段与正文片段。
- 已引用的 `DomainResult`、攻略快照和业务对象 ID。
- 创建时间、范围摘要和内容指纹。

历史会话继续引用原快照。当前账号或 Manifest 变化时显示“基于旧快照”，允许重新运行能力，但不覆盖旧回答和旧成果。

### 调用流程

当前已接入 `manifest.search-items`、`manifest.search-perks`、`account.find-items`、`vendors.find-offers`、`loadouts.inspect`、`guides.search` 和 `armor.plan`。每轮最多执行三次，只读取当前 Manifest、账号摘要、本地方案、本地攻略摘要与确认、已缓存商人快照和 Armor Planner 确定性结果；攻略能力最多投影八篇文档、每篇三个命中章节，并绑定当前正文快照。能力失败或无结果也作为结构化状态交给模型，不触发写操作或后台刷新。成功问答生成 `AssistantContextSnapshot`，历史对话只用于理解追问，不能覆盖本轮能力事实。

只读问题：

```text
用户问题
-> 意图与参数候选
-> 确定性输入校验
-> AssistantCapabilityCatalog.invoke
-> 结果与证据投影
-> AI 解释和页面入口
```

写操作问题：

```text
用户意图
-> AI 提议动作
-> 确定性校验
-> createActionPlan
-> 打开计划审阅
-> 用户确认
-> executeConfirmedPlan
-> verifyActionExecution
-> 展示执行与验证结果
```

AI 不能将“好的”“确认”“继续”等聊天文本转换成操作确认。确认必须发生在明确的计划 UI 中。

### 工作台成果

`AssistantArtifact` 只保存 AI 产生的待确认领域草稿：

- `guide_capture`
- `guide_extraction_patch`
- `equipment_target_candidates`
- `armor_constraint_draft`
- `armor_solution_comparison`
- `loadout_candidates`

操作计划和执行结果不是 AI 成果，分别由 `ActionPlan` 和 `ActionExecutionResult` 承载。成果可以引用确定性结果，但不能复制或篡改证据。

当前已实现 `guide_capture`、`armor_solution_comparison` 和 `equipment_target_candidates`。前者根据明确的配装/攻略意图保存本轮问题、回答、`source_snapshot_id` 与底层 `result_ids`；护甲成果直接引用确定性 `armor.plan`，保存目标与候选摘要，并额外记录底层 Armor `result_id`；装备目标成果合并 `account.find-items` 与 `manifest.search-items`，区分真实实例和仅定义候选。三类成果都只能交给配装页审阅入口，不能直接保存或执行；接受后上下文快照和数据结果引用进入方案 guidance 证据。`guide_extraction_patch` 保留为未来可选类型，不属于当前 T7 完成标准。

成果状态统一为 `draft / handed_off / accepted / dismissed / stale / failed`。只有目标领域命令可以将成果转成正式攻略结构、装备目标、护甲约束或配装草稿。

## 原生 Armor Planner

### 领域对象

Armor Planner 不直接消费 UI 表单或原始 `AccountItemSummary`，先建立三个不同身份层级：

1. `ArmorPieceSnapshot`：账号中的真实实例，包含实例 ID、定义 Hash、职业、槽位、异域、套装、位置、基础属性、大师杰作、调整、护甲模组和数据完整度。
2. `ArmorConfiguration`：理论护甲配置，描述框架、第三属性、调整模式和可分配模组，不伪装成已拥有实例。
3. `ArmorAcquisitionRequirement`：仍需刷取的抽象要求，描述槽位、套装、异域身份、框架、第三属性和不可重选的调整目标，不生成虚假实例 ID 或装备 Hash。

同一件护甲的“框架 + 第三属性 + 调整模式 + 固定的 `+5` 目标”构成刷取身份。可自由重排的 `-5` 来源和护甲属性模组不进入实例身份，避免把无需重刷的变化误判为新装备。

### 规则集

`ArmorRuleset` 是版本化业务对象，集中描述：

- Armor 3.0 六维字段、上下限和总预算规则。
- 护甲槽位、职业限制、异域限制和异域职业物品规则。
- 框架、主要/次要/第三属性及大师杰作贡献。
- `+5/+10` 护甲模组、`+3` 与 `+5/-5` 调整的可用条件和逐件限制。
- 套装定义与 `2件 / 4件 / 2+2` 约束。
- 规则来源、Manifest 版本、生效时间和兼容版本。

套装身份优先来自当前 Manifest 的 `equipableItemSetHash` 和套装目录，不复制外部求解器生成的静态清单。规则无法从官方数据确认时必须显式标为本地规则版本，不能伪装成 Bungie 实时事实。

账号实例优先使用 Bungie 返回的属性、Socket 和定义数据。基础值、调整或模组无法唯一还原时，`ArmorPieceSnapshot.completeness` 标为 `partial / ambiguous`；严格求解默认排除歧义实例，用户允许后才能作为带警告候选进入计算。

### 模块接口

Armor Planner 使用一个稳定入口隐藏枚举、剪枝、动态规划、评分、缓存和执行 Adapter：

```ts
planArmor(request: ArmorPlanRequest): Promise<ArmorPlanResult>
```

`request.mode` 支持五种领域问题：

- `theoretical`：不使用账号实例，从规则集计算满足目标的理论护甲配置。
- `reachability`：在固定配置、碎片和模组预算下计算每项精确可达值或范围，并解释冲突约束。
- `owned`：只使用当前账号真实实例求解，不把缺失件替换为理论装备。
- `acquisition`：先求理论方案，再匹配已有实例，输出最少待刷件和每个缺口的抽象要求。
- `upgrade`：以当前五件护甲为基线，锁定指定实例，比较单件收益并生成可复现的替换顺序。

调用方只提交领域输入：目标、硬约束、偏好、固定件、允许位置和引用的账号/规则快照。Worker 请求 ID、搜索上限、缓存键和 fallback 不属于公开接口。

### 目标与约束

`ArmorTargetProfile` 区分硬约束与排序偏好：

- 每项最低值、最高值、精确值或强制为零。
- 必须达标属性和显式优先顺序。
- 固定异域定义、异域职业物品特性和锁定实例。
- 套装单套数量或 `2+2` 组合要求。
- 允许账号位置、排除实例和最大转移数量。
- 碎片变化、护甲模组预算和允许的调整模式。
- 最大待刷件数、最大替换件数和是否允许只改变不可重选调整目标。

旧攻略中的敏捷、韧性、恢复、纪律、智慧和力量不能静默映射到 Armor 3.0 属性。解析只能保留原文语义并生成 `ArmorConstraintDraft`，由用户确认六维字段和规则版本后才能调用 Planner。

### 排序策略

结果不能依赖不可解释的单一隐藏分数。排序采用版本化字典序，并在结果中展示：

1. 硬约束是否全部满足。
2. 必须达标属性的总缺口与最大单项缺口。
3. 待刷件数或替换件数。
4. 固定异域和套装约束的满足程度。
5. 需要转移的实例数和当前已装备实例数。
6. 优先属性、属性浪费和方案集中度。

玩家可以选择“优先达标”“尽量少刷”“尽量少换”三种确定性排序策略。AI 可以解释策略差异，但不能自行改变玩家已选择的硬约束或排序策略。

### 结果合同

`ArmorPlanResult` 作为 `DomainResult` 的数据部分，至少包含：

- 规则集、Manifest、账号和当前配装快照引用。
- 可达、不可达或部分可达状态，以及冲突约束和最近可行目标。
- 每个候选的五槽位分配，明确区分 `owned_instance / theoretical_config / acquisition_requirement`。
- 六维属性账本：实例基础值、大师杰作、调整、护甲模组、碎片和最终值。
- 模组与调整逐件分配，使结果可以按展示配置复现。
- 已拥有数量、待刷数量、替换数量、转移数量、套装覆盖和激活奖励。
- `owned` 模式的真实实例候选与位置证据。
- `acquisition` 模式的缺口要求、最近已有实例和不匹配字段。
- `upgrade` 模式的当前基线、单槽位收益排行、最终方案和逐步替换后的中间属性。
- 每个候选的交接能力：可保存本地草稿、可生成操作计划、可导出 DIM，或因缺少真实实例/Plug 身份而不可交接。
- 计算策略、搜索截断、近似标记、警告和性能统计。

理论配置和待刷要求不能直接进入转移或装备计划。只有用户接受真实实例候选并保存到本地配装后，才能生成 `ActionPlan`。

### 执行与性能

- `planArmor` 的接口与计算位置解耦。Web 和 Desktop 优先通过 Worker Adapter 执行重计算，Worker 不可用时才使用 inline Adapter。
- 每次请求携带 revision；旧请求晚返回时不能覆盖新的目标、角色或账号快照。
- 缓存键包含规则集版本、Manifest 版本、账号快照、目标和约束指纹，不能跨规则或账号复用。
- 结果必须说明是否完整枚举、剪枝近似或达到搜索上限；近似结果不能显示为“唯一最优”。
- UI 可以取消长计算，切换页面后结果仍按 request ID 归属，不串到其他配装。

Armor Planner 计算本身不负责选择攻略语义、不直接创建装备目标、不保存配装，也不执行装备操作。用户在配装页审阅 acquisition 候选后，可以通过目标领域命令把明确缺口保存到独立目标库；保存动作不回写或篡改 Planner 结果。

## 攻略库

### 业务对象

- `GuideSource`：URL、文本或个人笔记的来源身份与读取状态。
- `GuideSnapshot`：不可变正文、章节、引用位置、内容指纹和抓取时间。
- `GuideDocument`：标题、分类、收藏、标签、当前快照和管理状态。
- `GuideExtraction`：待确认的摘要、机制、步骤、装备语义、Armor 约束和配装候选。
- `GuideDerivedRelation`：攻略快照与装备目标、Armor 约束、本地配装及 AI 成果的追溯关系。

攻略保存、阅读、搜索和人工编辑不依赖 AI。链接读取遵守站点限制，不绕过登录、验证码和付费墙。

### 解析规则

攻略解析先保留原文引用，再生成待确认候选。装备语义必须区分：

| 语义 | 后续动作 |
|---|---|
| 普通提及 | 只进入正文索引和相关攻略 |
| 抽象配装要求 | 保留为配装或 Armor 约束，不强行匹配第一件实例 |
| 替代方案 | 作为互斥或优先候选，由用户选择 |
| 明确装备推荐 | 可审阅为装备目标候选 |
| 明确 Roll 推荐 | Manifest 校验后可审阅为武器目标 |
| 护甲属性要求 | 先确认 Armor 3.0 字段，再交给 Armor Planner |

AI 返回名称和语义候选，Manifest 能力负责 Hash、版本和 Plug 校验。名称模糊、多版本冲突和无法映射项必须保留为待确认。

### 页面结构

攻略作为独立一级菜单。宽屏使用“目录 / 列表 / 详情”三栏连续工作区，窄屏逐级进入。详情连续展示：

1. 来源与正文状态。
2. 摘要、机制、步骤和分工。
3. 装备与 Armor 要求。
4. 待确认成果。
5. 已派生目标和配装。
6. 原文与引用。

AI 工作台可以生成攻略成果，但复杂确认、版本选择和批量保存必须在攻略页完成。

## 装备目标与配装派生

### 装备目标

装备目标拆成明确联合类型，不继续扩张混合 `WeaponRecommendation`：

- `WeaponTarget`：装备版本范围、模式、用途、Perk 条件、理由和来源。
- `ArmorAcquisitionTarget`：职业、槽位、套装、异域身份、框架、第三属性、不可重选调整目标、Planner 缺口、刷取预算和来源。

目标来源可以是 DIM Wishlist、用户手动创建、用户确认的攻略成果或 Armor Planner 缺口。武器目标必须经过 Manifest 校验；护甲待刷目标可以保持抽象配置，不得为了复用装备目标字段伪造具体装备 Hash。两类目标都必须由用户确认，同名多版本不能静默选择。

目标命中只提供证据，不自动修改仓库标记、锁定状态或清理决策。

### 配装候选

攻略或 AI 成果生成配装时：

```text
确认后的攻略要求
-> Manifest 与能力结果校验
-> Armor Planner / 账号实例匹配
-> 一套或多套候选
-> 配装工作台未保存草稿
-> 用户选择实例和补齐字段
-> 显式保存
```

配装候选不能显示为已保存方案，也不能自动应用。后续转移或装备必须单独生成 `ActionPlan`。

## 跨菜单合同

### 首页

- 只复用已有每日、每周、账号和商人能力结果，不在 T7 新增提醒系统。
- 可以把当前摘要作为 AI 上下文，但 AI 不能改写活动状态。

### 仓库

- “推荐数据”逐步收口为“装备目标”。
- 展示目标命中、DIM、本地标记、攻略和 Armor Planner 证据，不合并成隐藏总分。
- 同名整理继续由用户选择保留、复查或清理，不由 AI 自动决策。

### 配装

- 保留游戏内配装和本地配装方案，不新增攻略专属第三页。
- 新建方案支持空白、复制当前、DIM、攻略成果和 Armor Planner 候选。
- 接受 Armor Planner 候选后保存来源类型 `armor-plan`、结果 ID、规则版本和实例选择；不把完整求解缓存复制进配装。
- 已完成真实实例选择的方案可以导出 DIM 配装链接；理论配置、待刷要求或缺少实例 ID 的槽位只能导出缺口清单，不能生成伪完整链接。
- 所有写操作使用统一计划审阅、执行和验证结果。

### 资料库与商人

- 提供 Manifest 身份、官方来源、当前 Offer 和购买条件能力结果。
- AI、攻略和装备目标只能引用这些结果，不能把推测写回官方来源。

### 装备详情

- 显示装备目标、相关攻略和证据来源。
- 当前实例可以作为 Armor Planner、配装候选或操作计划输入。
- AI 回答不能直接修改锁定、Perk、位置或配装状态。

## 现有能力处理矩阵

| 当前能力 | 决策 | T7 处理 |
|---|---|---|
| 账号摘要、角色、真实实例和位置 | 直接复用 | 继续由 `core/account` 与 `services/account` 提供，只增加 Armor 归一化和 AI 白名单投影 |
| Manifest、资料库、Perk、版本、来源和套装目录 | 直接复用 | 继续由 `core/items`、`services/gameData` 和资料库 workspace 提供；套装规则读取当前 Manifest，不复制外部静态目录 |
| 商人实时 Offer、价格、资格和刷新边界 | 直接复用 | 保持商人领域真相，只增加只读查询 Adapter 和证据引用 |
| 仓库装备证据、重复对比和本地标记 | 扩展 | 将目标命中与 Armor 缺口作为独立证据展示，不引入隐藏总分 |
| 本地配装、游戏内配装和执行步骤 | 扩展 | 增加 Armor 方案来源、未保存候选、DIM 导出和计划引用，不迁移配装所有权 |
| DIM 配装链接导入 | 保留并补齐 | 保留确定性导入；为完整真实实例方案新增导出，理论和待刷方案只导出缺口清单 |
| `D2ToolDefinition` 静态注册表 | 迁移后替换 | 改为 `AssistantCapabilityCatalog` 的描述投影，删除与执行脱节的第二份工具真相 |
| 当前 AI 上下文序列化与单轮模型调用 | 深化 | 增加不可变快照、受控只读调用循环、结果引用和成果交接，不让模型直接接触写接口 |
| 固定攻略解析、匹配和草稿流水线 | 已替换 | 侧栏固定任务入口已删除；确定性解析、账号匹配和草稿生成保留在配装页攻略导入，旧本地文本通过一次性恢复交接 |
| `solveLoadoutArmorCandidates` | 作为迁移输入后替换 | 先复用账号实例筛选经验，最终由版本化 Armor Planner 的 `owned` 模式取代 |
| `LocalTargetRules` | 兼容读取后迁移 | 武器规则迁为 `WeaponTarget`，单件护甲阈值迁为兼容来源；新 Armor 缺口使用 `ArmorAcquisitionTarget` |
| Desktop `runWriteAction` 与操作日志 | 渐进扩展 | 先为 T7 会触发的转移、装备、锁定、Plug 和配装动作增加计划/确认/验证关联，再收口其余现有安全动作 |

## 改动范围

| package / 文档 | 主要改动 | 控制范围 |
|---|---|---|
| `packages/core` | 新增 `DomainResult`、证据引用补充、Armor 规则集与求解领域、攻略领域、装备目标联合类型、不可变 `ActionPlan` 与验证状态 | 保持纯领域，不访问网络、文件、Worker、Electron 或 AI；优先新增分域目录，不扩大聚合文件 |
| `packages/services` | 账号/Manifest/商人结果 Adapter、攻略与结果/审计存储、正文读取、Armor Worker Adapter、DIM 导出所需编码 | 复用现有 Bungie 与本地数据源，不新增外部项目依赖，不用 DIM CSV 推断替代账号真相 |
| `packages/app` | `AssistantCapabilityCatalog`、组合结果、Armor/攻略 workspace、AI 上下文快照、成果交接和 ActionPlan 生命周期编排 | 页面 ViewModel 保持类型化；目录只面向 AI/诊断，不成为所有页面的通用查询层 |
| `packages/ui` | 配装页 Armor 区、独立攻略页、AI 工作台成果卡、仓库/详情目标证据、计划审阅与执行/验证状态 | 使用共享 `ProductShellHost`；菜单内容优先放各自目录，跨菜单 chrome 最后集中修改 |
| `packages/desktop` | 分域 IPC、preload/API 接线、攻略本地文件与受控网络、Worker 承载、Bungie 写执行和验证 Adapter | 主进程只承载平台能力，不放推荐、攻略语义和 Armor 规则 |
| `packages/web` | 共享页面预览、浏览器存储/Worker Adapter、无真实写能力状态 | 不复制页面；无法写 Bungie 时明确显示不可执行 |
| `docs` | T7 backlog、`todo.md`、攻略/配装/AI 的正式 UI 合同和用户指南 | 实现过程中只保留一个当前 T7 计划，不建立平行原型或外部产品说明 |

预计主要触及 `packages/core`、`packages/services`、`packages/app`、`packages/ui` 和 Desktop 分域接线，属于跨五个 package 的中大型改动。应按切片逐步合入，不能一次性铺开。

高冲突接线集中在 `ProductShellHost.tsx`、`AppShell.tsx`、Desktop `preload.ts`、`ipc.ts`、renderer `api/types.ts` 和 `api/client.ts`。这些文件只在对应分域模块稳定后做最后聚合；新增契约优先放 `*Api.ts`、`sharedTypes.ts` 和 `main/ipc/<domain>.ts`，避免把大型 DTO 塞回聚合文件。

## 关键风险与依赖

| 风险 | 影响 | 设计处理 |
|---|---|---|
| Armor 3.0 实例字段或调整身份不完整 | 可能把最终属性误当基础属性，产生不可复现方案 | 先建立规则集和实例完整度；不完整实例只进入保守或近似结果，不能伪装为严格解 |
| 套装定义随 Manifest 变化 | 静态目录会过期，套装约束错误 | 从当前 Manifest 生成版本化目录，缓存键包含 Manifest 和规则集版本 |
| 搜索空间快速膨胀 | 库存、套装、异域和调整组合可能阻塞 UI | 使用 Worker、revision、剪枝、上限和取消；结果明确完整或近似，不宣称唯一最优 |
| AI 输出名称、版本或属性语义错误 | 错误目标可能污染攻略和配装 | AI 只生成候选，Manifest/领域模块校验后进入待确认，无法映射项保留原文和冲突 |
| 攻略链接受登录、验证码或付费墙限制 | 正文无法稳定读取 | 支持粘贴文本和个人笔记作为完整回退，不绕过站点限制，不把读取失败当空正文 |
| 写操作执行时账号状态变化 | 已确认计划可能作用于错误位置或实例 | 计划绑定指纹和账号快照，执行前复核，失效后重新生成；执行成功与刷新验证分开 |
| 多 package 同时修改共享接线 | 容易产生高冲突和页面能力丢失 | 先完成分域模块和菜单内容，再集中接 Product Shell、preload、IPC 与 renderer API |

T7 不应作为一个大提交或一次性版本开发。每个切片都应保留现有页面功能，能够独立停止、验收和回退；Armor Core、攻略领域和 AI 目录之间通过稳定 ID 交接，不通过互相 import 页面状态来耦合。

## 数据与模块边界

- `packages/core`：结果合同、证据、攻略、装备目标、`ArmorRuleset`、护甲归一化、Armor Planner、操作计划与验证规则；不访问网络、文件或 AI。
- `packages/services`：Profile、Manifest、Vendor、本地存储、正文读取、Worker、AI 和审计 Adapter。
- `packages/app`：领域 workspace、AI 能力目录、组合结果、会话快照、成果交接和安全执行生命周期。
- `packages/ui`：类型化领域页面、AI 工作台、成果卡、计划审阅、逐项执行结果和状态矩阵。
- `packages/web`：共享页面预览和浏览器 Adapter；没有真实写能力时明确返回不可执行。
- `packages/desktop`：OAuth、IPC、本地文件、受控网络和 Bungie 写 Adapter；不承载推荐、解析或规划判断。

深模块 seam：

- 账号、资料库、商人、仓库和配装保持现有类型化 interface，AI Adapter 在这些 seam 之外投影结果。
- `AssistantCapabilityCatalog` 隐藏 AI 可见能力选择、输入白名单、结果投影、时效和审计，不隐藏领域模块本身。
- `planArmor` 隐藏护甲规则、归一化、算法、缓存与 Worker Adapter。
- `createActionPlan / executeConfirmedPlan / verifyActionExecution` 隐藏写操作边缘条件和恢复。
- AI 工作台只学习以上小接口和成果交接接口，不学习各页面内部状态。

## 状态矩阵

| 状态 | 可见内容 | 允许操作 | 禁止伪造 |
|---|---|---|---|
| AI 未配置 | 全部确定性页面和能力 | 查询、规划、保存攻略和目标 | 不禁用核心功能 |
| 账号未登录 | Manifest、公共来源和本地攻略 | 阅读、搜索、登录 | 不声称账号匹配 |
| 能力结果部分成功 | 已得结果、缺失来源和警告 | 查看、重试缺失来源 | 不显示为完整结果 |
| 结果过期 | 原结果和过期时间 | 只读查看、重新运行 | 不当作当前事实 |
| AI 生成中 | 会话和调用进度 | 取消、后台继续 | 不提前显示成果成功 |
| 成果待确认 | 引用、冲突和目标页面 | 打开审阅、放弃、重做 | 不直接写业务对象 |
| Armor 规则未准备 | 缺失规则、Manifest 或实例字段 | 完成资料读取、使用保守模式 | 不套用旧规则静默计算 |
| 护甲实例语义歧义 | 原始属性、可能调整和警告 | 排除实例、人工确认后继续 | 不当作完整实例进入严格求解 |
| Armor 不可达 | 冲突约束和最接近结果 | 调整约束、比较方案 | 不返回伪达标组合 |
| 计划待确认 | 全部步骤、阻断项和风险 | 确认、取消、返回修改 | 不自动执行 |
| 计划已失效 | 变化的实例或账号状态 | 重新生成计划 | 不沿用旧确认 |
| 执行部分成功 | 逐项成功、失败和跳过 | 重试失败项、刷新验证 | 不汇总成全部成功 |
| 验证不一致 | 预期与观察差异 | 重新读取、人工处理 | 不把 API 成功当作已验证 |

## 迁移与兼容

- 当前静态 `D2ToolDefinition` 迁为 `AssistantCapabilityCatalog` 的描述投影；先建立真实只读 Adapter，再让 AI 使用。
- 当前 `ItemActionPlan` 扩展为不可变计划；既有 Desktop 写 handler 逐步成为执行 Adapter，不并行维护第二套写逻辑。
- 工具审计和操作日志保留现有数据，新增关联 ID 后再逐步统一查看入口。
- `BuildGuideRequirement`、解析、匹配和草稿函数只作为迁移输入；名称匹配、旧属性映射和实例选择按新合同替换。
- 当前 `LoadoutPlanArmorConstraints` 迁入版本化 `ArmorTargetProfile`；已有字段继续读取，但新增套装、调整、硬约束和排序策略不反向塞回旧扁平结构。
- 当前 `solveLoadoutArmorCandidates` 作为 `owned` 模式迁移输入，替换其直接累加最终属性和贪心模组分配；不在旧函数外继续叠加理论、待刷和升级分支。
- `LocalLoadoutPlan` 保持配装所有权，只增加接受后的 `armor_plan_result_id`、规则版本和候选快照，不持久化完整求解缓存。
- `LocalLoadoutPlanSourceKind` 增加 `armor-plan` 和 `assistant-targets`，DIM 导入仍为 `dim-link`；三种来源不能合并成同一含糊类型。
- `ShellAssistantMode` 删除 `tasks`；现有固定任务面板、任务分支和本地任务上下文完成可恢复迁移后删除。
- 旧任务文本可生成一次 `guide_capture` 恢复成果，由用户保存或放弃，不自动创建攻略。
- DIM Wishlist 迁入装备目标来源；DIM 配装继续走确定性预览，不经过 AI 解析。
- 现有本地配装和游戏内配装不迁移所有权，只增加结果、来源和操作计划引用。

## 大致实现方案

实施分为八个里程碑、十二个可独立交付切片。每个切片只暴露真实可用能力，不增加空按钮或 Mock 结果；前半段不依赖 AI，也不要求先完成全量写操作重构。

| 里程碑 | 切片 | 可见结果 |
|---|---|---|
| A：结果基础 | 1 | 首批跨页面结果有稳定证据和时效，现有页面无需迁移调用路径 |
| B：Armor Core | 2-4 | 理论、可达性、库存、待刷和升级规划形成原生确定性能力 |
| C：配装工作流 | 5 | 玩家能在现有配装页配置、比较、接受 Armor 候选 |
| D：攻略库 | 6-7 | 攻略可保存、搜索、整理、解析并人工确认 |
| E：AI 只读编排 | 8 | AI 能调用受控只读能力、引用证据并生成待确认成果 |
| F：目标与派生 | 9-10 | 攻略和 Planner 能派生装备目标与配装草稿 |
| G：安全执行 | 11 | T7 相关动作拥有不可变计划、显式确认、执行和验证 |
| H：迁移收口 | 12 | 旧任务、混合推荐和重复工具入口完成迁移 |

### 切片 1：结果、证据与首批只读 Adapter

实现 `DomainResult`、`EvidenceRef`、警告和结果缓存/审计索引。先为 Manifest 装备/Perk、账号实例、商人 Offer 和配装检查建立类型化 Adapter；页面行为和 ViewModel 调用路径保持不变，暂不建设通用执行器，也不接 AI。

### 切片 2：Armor 规则集与实例归一化

实现版本化 `ArmorRuleset`、`ArmorPieceSnapshot`、`ArmorConfiguration`、属性账本和数据完整度。接入当前 Manifest 套装目录与 Bungie 账号实例，明确框架、第三属性、调整身份、大师杰作、护甲模组、固定异域和异域职业物品，不使用 DIM CSV 推断作为真相。

### 切片 3：理论方案与可达性

交付 `theoretical / reachability`，支持六维硬目标、碎片、模组预算、调整模式、套装 `2件 / 4件 / 2+2` 和确定性排序。旧六维名称只生成待确认草稿；不可达结果返回冲突约束和最近可行目标。

### 切片 4：库存、待刷与升级规划

交付 `owned / acquisition / upgrade`：库存模式使用真实五槽位实例；待刷模式输出抽象刷取身份和最近已有实例；升级模式输出当前基线、最少替换与逐步中间属性。接入 Worker、revision、防过期覆盖、有界缓存和近似结果说明。

### 切片 5：配装页 Armor 工作流

在现有配装工作台增加目标编辑、约束审阅、候选比较、实例/理论/待刷身份区分和未保存草稿。接受候选后只保存必要来源、规则版本和实例选择；真实完整方案提供 DIM 导出，理论或待刷方案只提供缺口清单。

### 切片 6：攻略领域、存储与一级页面

已实现 `GuideSource`、`GuideSnapshot`、`GuideDocument`、确定性全文搜索和 `guide-library.json` 本地存储；共享攻略页面支持文本/笔记/来源保存、收藏、分类、标签、归档、恢复、删除、正文快照追溯和读取失败重试，并纳入便携备份。损坏文件与容量上限都显式阻断写入，不静默覆盖或淘汰旧文档。攻略阅读和人工编辑不依赖 AI；该切片只建立 URL 来源记录，正文读取由切片 7 的受控读取能力承接。

### 切片 7：链接读取、提取与人工确认

已实现公开 HTTP(S) 地址的受控正文读取、HTML 清洗、章节分段、引用定位、`GuideExtraction`、确定性解析和逐项复选确认。读取限制协议、凭证、内网地址、重定向、超时、内容类型和响应大小，不执行页面脚本或绕过站点限制；链接正文必须先预览、采用并保存。确认绑定正文快照与解析器版本，所有职业、装备和 Armor 属性候选都保持待确认，不直接创建目标或配装。可选 AI 补丁已搁置，确定性提取与人工确认是当前正式边界。

### 切片 8：AI 受控只读能力调用

已建立 `AssistantCapabilityCatalog`、七个只读 Adapter、保守调用计划、有界结果缓存、可见结果引用、轻量 `AssistantContextSnapshot` 和脱敏持久化审计，并接入 Desktop AI 工作台的连续追问、历史快照提示及设置页诊断导出。`guides.search` 已接入本地攻略摘要、命中章节、当前快照和人工确认要求；`armor.plan` 已通过现有 Desktop Armor Client 接入理论、库存和待刷模式。旧六维、缺少职业/目标或升级基线不明确时不自动调用。后续补齐升级基线选择及更多成果交接；AI 仍不能调用 execute，也不能把聊天文本当确认。

### 切片 9：独立装备目标

实现 `WeaponTarget` 与 `ArmorAcquisitionTarget`，兼容迁移 DIM、用户和旧 `LocalTargetRules` 来源。仓库与装备详情显示目标命中证据，但不自动修改本地标记、锁定状态或整理决策。

当前已完成领域联合类型、确定性匹配、版本化本地存储、Desktop 分域 API/IPC、便携备份、用户手动创建，以及旧规则和 DIM 在显式保存时按来源单向同步。武器目标必须通过当前 Manifest 的武器与 Perk 归属校验后才参与命中；同名查询存在多个版本时保留 `ambiguous` 候选，不静默选择。护甲待刷目标保持属性、职业和槽位约束，不生成虚假实例或装备 Hash。仓库目标筛选、同名整理证据和武器/护甲详情已消费正式目标库；旧规则编辑与显示暂作为兼容区保留。

攻略与 Armor Planner 的受控转换已由切片 10 接入，目标与攻略、Armor 结果、本地方案之间的双向追溯也已完成；剩余工作是使用真实账号验收命中、跳转和删除清理。

### 切片 10：攻略与 Armor Planner 派生

已实现首批正式派生：攻略页对确认后的 `weapon_specific` 提供显式同步，主进程按精确名称检查同名武器版本，并在武器自身 Manifest 定义内逐项确认 Perk；零命中或多命中只返回问题，不自动落库。配装页对用户选中的 acquisition 候选提供“保存待刷缺口”，每个缺口保存基础六维门槛、槽位和 Planner 身份上下文，命中后仍要求回 Planner 复核框架、调整、套装与大师杰作。

独立 `armor_constraint_draft` 与 `loadout_candidates` 交接已完成：两者只消费当前正文的已确认候选；前者保留攻略文档、快照、提取与解析器版本，后者额外绑定账号、角色和匹配指纹。同名多实例不会静默选择，确定命中和替代项必须在配装页复选，最终仍只形成未保存草稿。`GuideDerivedRelation` 已覆盖两类成果到显式保存本地方案的下游关系，并提供双向精确定位。

### 切片 11：T7 安全执行交接

已完成 T7 直接触发的本地方案应用与发布收口。本地方案应用使用不可变执行计划，确认后强制刷新账号并复核账号、角色、实例位置、来源角色替换、可写 Plug 和缺口；每个转移、装备与免费 Plug 步骤都携带计划、确认、执行和步骤 ID，任一步失败后停止并刷新账号写入验证记录。

应用成功且刷新核对通过后，保存到 Bungie 槽位会生成独立的 `LocalLoadoutPlanPublishPlan`，绑定来源执行计划、账号、角色、已确认实例、目标槽位内容指纹和发布步骤。用户确认后再次刷新账号；装备状态或目标槽位变化时保持零写入。写入完成后重新读取账号，按已确认实例核对槽位内容，并用同一组发布计划、确认和执行 ID 记录验证结果。草稿变化会立即废弃旧执行与发布报告。

本切片不重构配装页中独立的“直接应用游戏内配装、清空槽位、修改名称/图标”等既有操作；这些操作继续使用现有安全写入口，后续可按独立范围渐进迁移。不得增加拆解、删除或购买。

### 切片 12：追溯、迁移与旧入口收口

已实现攻略、目标、Armor 方案、配装、结果和操作日志双向追溯。旧任务文本与混合推荐读取边界已迁移，固定任务 UI、重复攻略入口和失效命名已删除；导航、preload、IPC 聚合、正式 UI 合同与用户文档已同步，当前只待真实账号与 Desktop 实窗验收。

## 不在本期范围

- CLI、MCP server、Agent Skill 或对外通用工具平台。
- 对 `d2-skill`、`d2-armor-solver` 或其他外部项目的调用、嵌入或代码复制。
- 导入 `d2-armor-solver` 的静态套装目录、浏览器草稿、DIM CSV 推断结果或本地存储格式。
- 公会统计、排行榜、完整 PGCR 分析、原始 Bungie API fallback 和所有 `d2-skill` 命令等量复刻。
- 日报/周报重做、系统推送、后台订阅和变化通知。
- 公共攻略市场、排行、点赞、评论和作者关注。
- 绕过来源站点限制或无限抓取内容。
- AI 自主确认或执行写操作。
- 自动拆解、删除、购买装备或自动决定保留/清理。
- 自动把攻略条件绑定到账号中的第一件近似装备。
- 云端同步攻略库、能力结果和 AI 会话。

## 完成标准

1. T7 不存在外部运行依赖，全部能力由 `d2-service` 原生模块实现。
2. 页面和 AI 复用同一领域模块实现，但分别消费类型化 ViewModel 和受控目录投影，不维护平行查询或业务算法。
3. 需要跨页面、AI 或审计引用的领域结果包含稳定 ID、版本、状态、时间、查询、证据、警告和复合来源引用。
4. AI 未配置时，攻略、装备目标、Armor Planner、配装和操作计划仍可直接使用。
5. AI 只能自动运行只读能力，不能确认或执行写操作。
6. T7 直接触发的本地方案应用与 Bungie 槽位发布经过不可变计划、显式确认、逐项执行和账号状态验证；其他既有安全写操作按独立范围渐进迁移。
7. Armor Planner 使用版本化规则集和属性账本，支持理论方案、可达范围、已有库存、待刷规划和升级分析。
8. 护甲结果明确区分真实实例、理论配置和待刷要求，并正确处理 Armor 3.0、异域职业物品、套装、调整身份与实例数据歧义。
9. 攻略原文、快照、解析确认、装备目标、Armor 约束和配装候选保持独立且可追溯。
10. 同名版本、旧属性语义、抽象装备要求和账号实例冲突不会被静默解决。
11. 配装候选始终先进入未保存草稿，后续写操作独立生成计划。
12. 能力审计、计划、确认、执行和验证可以通过稳定 ID 串联，敏感信息不会进入日志。
13. 全应用只保留一个 AI 工作台和一套共享产品页面，旧固定任务 UI 与重复入口完成迁移。
14. 已匹配真实实例的 Armor 方案可以保存为本地配装并导出 DIM；理论方案和待刷方案不会生成伪造实例链接。
