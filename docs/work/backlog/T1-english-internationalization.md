# T1：全应用英文国际化补齐

> 状态：📝 候选方案，待排期
> 优先级：P1
> 类型：跨端 UI 文案与语言切换完整性
> 当前判断：国际化基础设施已存在，但核心工作流覆盖不完整，暂不能宣称“完整英文版”
> 勘察：仓库切片已于 2026-09-20 只读勘察，结论见 §6「阶段 B 勘察记录：仓库切片」。

## 1. 背景与当前结论

应用已经建立 `zh-CN` / `en-US` 界面语言和 `zh-chs` / `en` Bungie Manifest 语言的区分，也已经为 Shell、首页、账号、资料库、商人、设置等页面提供部分英文 copy。

当前英文体验大致只有 **40%～50%** 的产品可见内容覆盖，属于“基础框架已完成、核心功能未完成”：

- 顶部导航、首页、账号、资料库、商人、设置：大部分文案可以切换为英文。
- 仓库、配装、武器/护甲详情、AI 助手：仍有大量中文硬编码。
- 页面标题、顶部状态、导航保护、弹窗、错误恢复和 Desktop 状态：存在中英文混用。
- Web 预览 fixture 与 unavailable 状态也有中文，但需要区分预览数据和正式产品文案处理。
- 装备名、Perk、活动名等游戏内容属于 Bungie Manifest 数据，是否英文由 Manifest 语言决定，不应和产品 UI copy 混为一谈。

切换 English 后，玩家会遇到“英文外壳 + 中文核心操作”的混合体验，因此当前不适合对外描述为完整英文支持。

## 2. 玩家问题

英文用户需要能够在不阅读中文的情况下完成主要流程：

1. 登录账号并理解账号、资料库和同步状态。
2. 浏览仓库、筛选装备、查看推荐和执行整理操作。
3. 打开武器/护甲详情，理解属性、Perk、位置、备注和操作按钮。
4. 创建、编辑、比较和穿戴配装。
5. 使用 AI 助手并理解配置、会话、上下文和失败提示。
6. 在加载、空数据、部分失败、重试、更新和权限不足时知道下一步该做什么。

## 3. 目标

- English 界面下，所有产品自有可见文案均使用英文，不能在核心工作流中出现未解释的中文。
- 界面语言和 Bungie Manifest 语言保持独立但默认联动；用户关闭联动后仍可分别选择。
- 翻译集中维护在 `packages/ui/src/i18n/` 或领域 copy 文件，不在组件内分散编写 `locale === ...` 判断。
- Web 与 Desktop 使用同一套共享 UI 和 copy，平台壳只负责 adapter、真实状态和平台能力。
- 动态游戏内容优先直接使用当前 Manifest 语言，不复制维护第二套游戏词典。
- 缺少翻译时有明确的开发期发现机制，避免新增中文硬编码后长期遗漏。

## 4. 范围

### 4.1 共享页面与高频工作流

需要完整迁移并接入 `interfaceLocale`：

- `packages/ui/src/vault/`：筛选、装备卡、整理、重复装备、愿望单、确认弹窗和失败状态。
- `packages/ui/src/loadouts/`：配装列表、方案详情、创建/编辑、比较、迁移和执行状态；接入已有 `loadoutsCopy` 英文资源。
- `packages/ui/src/item-detail/`：武器详情、护甲详情、共享详情弹窗、实例操作、位置账本和商人售卖信息。
- `packages/ui/src/assistant/`：AI 助手标题、空态、配置入口、会话、上下文、常用问题、同步状态和错误提示。

### 4.2 共享外壳与页面元数据

- `ProductShellHost` 页面 eyebrow、标题、副标题和导航保护文案。
- `packages/app/src/workspaces/pageMetadata.ts` 页面标题、上下文标签和辅助说明。
- Desktop renderer 顶部状态栏：账号、资料库、应用版本、同步、重试、缓存和失败状态。
- 共享弹窗、关闭/确认/取消按钮、加载/空/错误状态和 toast 文案。

### 4.3 平台壳与预览

- `packages/desktop` 的 adapter 状态文本、IPC 错误映射和 AI 分析面板传入的状态文案。
- `packages/web/src/main.tsx` fixture 中属于产品 UI 的状态、按钮和弹窗文案。
- `packages/web/src/webAdapter.ts` 的 unavailable snapshot 与降级状态。

### 4.4 语言与数据边界

- `interfaceLocale`：菜单、按钮、字段名、说明、状态、错误、空态和诊断。
- `bungieLocale`：Manifest 中的物品、Perk、活动、地点和定义文本。
- 第三方来源名称、官网地址和授权说明使用产品统一的来源 copy；不把第三方网站内容误翻译成游戏数据。

## 5. 非目标

- 不在 T1 内翻译 Bungie Manifest 的原始数据库；Manifest 语言由现有设置和下载链路负责。
- 不为每个外部网站维护本地化镜像或抓取外部正文。
- 不复制 Desktop 和 Web 两套页面实现。
- 不因为国际化顺手修改页面信息架构、业务规则、数据源或登录流程。
- 不隐藏暂未翻译的功能；功能必须保留，缺失翻译应明确登记并补齐。
- 不把开发日志、注释、内部 DTO 字段名或测试 fixture 的纯业务数据误判为用户界面文案。

## 6. 建议实施顺序

### 阶段 A：统一基础文案

- 完成页面标题、Shell 状态栏、导航保护、共享弹窗、确认/取消/关闭和通用错误文案。
- 建立共享 `common` / `shell` copy，避免各页面重复翻译同一状态。
- 统一英文大小写、术语和按钮动词风格，并同步玩家文案字典。

### 阶段 B：仓库与装备详情

- 先迁移仓库，因为它是最高频的账号工作流。
- 再迁移武器/护甲详情和实例操作，保证从仓库、账号、商人进入详情时语言一致。
- 保留推荐来源、Roll、位置、锁定、清理和账号状态等全部现有功能与状态。

### 阶段 B 勘察记录：仓库切片（2026-09-20）

2026-09-20 只读勘察了仓库菜单，结论记在这里，动手时不用重新摸。

**一、现状**

`packages/ui/src/vault/` 共 17 个文件、约 500 条中文。按含中文行数排：`VaultWishlistManager.tsx` 247、`VaultDuplicateGroups.tsx` 119、`VaultPageContentView.tsx` 96、`VaultListItem.tsx` 73、`VaultTargetRulesPanel.tsx` 65、`VaultFilterToolbar.tsx` 52、`VaultRecommendationSourceManager.tsx` 49、`VaultOrganizePanel.tsx` 36，其余 10 个文件 0～13（其中 `vaultCleanupProtection.ts` 的 13 条是拼进卡片显示的保护原因短语）。

`packages/app/src/workspaces/` 侧还有一批会流到界面的中文：`vaultList.ts` 144 行、`vaultActions.ts` 61 行、`vaultRecommendationAudit.ts` 28 行、`vaultSelection.ts` 3 行、`vaultPage.ts` 5 行。其中 13 张标签映射（`vaultGroupLabels` / `locationFilterLabels` / `tagLabels` / `sortLabels` / `lockFilterLabels` / `ammoFilterLabels` / `rarityFilterLabels` / `gearTierFilterLabels` / `classFilterLabels` / `damageFilterLabels` / `championFilterLabels` / `craftingFilterLabels` / `armorStatLabels`，`vaultList.ts:118-240`）由 UI 直接渲染成下拉项和筛选摘要。

**二、迁移机制**

- `VaultCopy`（`packages/ui/src/i18n/types.ts:216`）是仅有的两个还没有 `inline` 的页面级 copy 类型之一（另一个是 `DirectoryCopy`，`types.ts:93`），仓库这个要先补。消费侧沿用 `copy.inline[key] ?? key` 的兜底写法（`AccountPageContentView.tsx:1405`、`LibraryPageContentView.tsx:87`），所以 zh-CN 侧照 `library.ts` 写 `inline: {}` 就够，不必像 `account.ts` 那样写一遍恒等映射；只有「key 不是最终展示文本」时才在 zh-CN 侧写一条非恒等条目。`DirectoryCopy` 用的是另一条路（`categories: Record<ToolCategory, string>`、`resultCount: (count) => string`），没有使用 `inline`。
- app 侧那 13 张枚举标签映射可以照 `DirectoryCopy.categories` / `ShellCopy.navigation`（`types.ts:67`）的 `Record<枚举, string>` 写法搬进 copy，由 UI 按 key 查表，app 不需要知道 locale。
- app 侧拼好的摘要串（`buildVaultContextFacts` 的 `` `仓库筛选：…命中 N / M 件。` ``、`buildVaultSelectionSummary` 的三句）不能让 app 知道 locale：继续产出 key 由 UI 组装，或把 labels 当参数注入。
- 约 130 条模板串带插值（如 `` `已核对 ${scan.scanned_weapon_count} 件` ``、`` `仓库 ${a} 件 / 全账号 ${b} 件` ``），进不了 `Record<string,string>`。按 `ShellCopy` 已有的函数式约定建模（`types.ts:24-26` 的 `update.available(version?)`、`types.ts:47` 的 `backgroundTasks.itemCount(count)`），给 `VaultCopy` 加函数字段。这套约定够用：支持可选参数、分支和 en-US 单复数（`shell.ts:110`）。

**三、切片顺序**

S1 `VaultCopy` 类型与骨架 → S11 双端接线（提前，后面每个切片都要从父组件拿 copy）→ **槽位键修复**（新增前置，已落地，解开一整组按显示名判槽位的代码）→ S2 叶子组件（已落地）→ S3 `VaultListItem`（已落地）→ S4 `VaultFilterToolbar`（已落地）→ S5 整理与批量（已落地）→ S8 `VaultWishlistManager`（已落地）→ S6 推荐来源（`VaultRecommendationEvidencePanel` / `VaultRecommendationSourceManager`，已落地，因依赖 S8 的导出而与 S8 对调了次序）→ S7 `VaultPageContentView` 本体（已落地）→ S9 app 侧标签映射与摘要串（已落地）→ S10 两个孤儿组件。

**四、必须先改代码、不能当文案翻译的地方**

改文案就会改行为，动手前先换掉：

- ~~`VaultWeaponFactIcons.tsx:56-58`：用 `label.includes("动能" / "能量" / "威能")` 反查图标类型。~~ 已换成 `weaponSlotTypeFromKey(key)`。
- `VaultPageContentView.tsx:825`：`message.includes("失败")` 决定 `status-error` 还是 `status-ready`，要换成结构化的 tone 字段。
- ~~`VaultFilterToolbar.tsx:115-116`：用 `["动能武器", …]` / `["头盔", …]` 这两个中文数组判定槽位分类。~~ 已改成按 `item.group` 与当前分类比较。
- 对中文标签做 `replace` 手术：~~`VaultFilterToolbar.tsx:202`（`replace("全部弹药", "全部")`）~~、~~`:225`（`replace("反", "")`）~~ 已删：弹药和勇士的分段控件改成显式列表，`全部` / `屏障` / `过载` / `势不可挡` 各自进 `inline`，不再从筛选器全名上切字。~~`:452`（`shortSlotLabel` 三连 replace）~~已删、~~`VaultListItem.tsx:406`（`replace(/武器$/u, "")` 再拼「位」）~~ 已改：槽位名先按 `VaultSlotKey` 查表拿短名，只剩认不出的槽位还对 app 给的显示名做同一条 replace，兜底路径的 zh-CN 结果不变。
- 中英混用的比较与查询别名：`vaultQueryIndex.ts:210-211`、`vaultList.ts:373/377/786-790/860-861/945`、`vaultRecommendationAudit.ts:91`。
- `VaultTargetRulesPanel.tsx:586`：`${armorStatLabels[...]}第三属性` 这类中文后缀拼接。
- `recommendationMatchView.ts:20-100`：匹配投影层的「符合 / 不符 / 无法判断 / 来源未要求」，被 `VaultListItem.tsx:191` 与 `VaultDuplicateGroups.tsx:733` 消费，属仓库文案的上游，要同批纳入或先冻结约定。

**五、会撞的测试**

zh-CN 的渲染结果必须逐字不变，否则这些断言会红：

- `packages/ui/test/vault-recommendation-filter-row.test.tsx`：唯一直接渲染 `VaultPageContentView` 的测试，断言 `title` / `aria-label` 全景串（`:221-222` `` "要求 2 项，命中 1 项，1 件" ``、`${AEGIS_LABEL}要求 2 项，命中 1 项，1 件`）、`getByText("1 件")`、`"完整 3/6 · 1"`。迁移时插值拼接的空格和标点要完全复刻。S3 改了 `VaultListItem` 的卡片 `title` 与推荐来源 `aria-label` 的拼法，逐条比对后 zh-CN 串没变；这条断言要等本地跑过或 CI 才算数。
- `packages/ui/test/vault-wishlist-link-sync.test.tsx`、`packages/ui/test/vault-recommendation-sources-refresh.test.tsx`：断言「从链接同步」「70 条规则」「列出 127 把武器」「仓库 5 件 / 全账号 7 件」等。
- `packages/app/test/vault-selection-workspace.test.ts`（`:106/108/110`）与 `packages/desktop/test/vault-panel.test.ts`（`:145/149/153`）把 `buildVaultSelectionSummary` 的同一批中文各断言了一遍，改 app 层会同时打破两处。
- `packages/app/test/vault-list-workspace.test.ts:94/178` 断言 `contextFacts` 的中文摘要串。
- 槽位键修复动了 `VaultFilter.slot` 的取值口径：`packages/app/test/vault-list-workspace.test.ts` 里「keeps frame candidates constrained by the active slot filter」原本传 `slot: "能量武器"`，夹具也只有 `bucket_name`、没有 `equipment_bucket_hash`。已给两条夹具补上真实 bucket hash，并把筛选值改成 `"energy"`。这是**唯一**一处因槽位键改口径而需要动的断言。
- 反向的一条：`` `已核对 N 件` `` 系列（`VaultPageContentView.tsx:1112`、`VaultRecommendationEvidencePanel.tsx:53`）没有任何测试覆盖，改起来没人拦。

**六、两个孤儿组件**

`VaultDuplicateGroups.tsx`（119 行中文）与 `VaultTargetRulesPanel.tsx`（65 行中文）没有在 `packages/ui/src/index.ts` 导出，全仓没有 importer，也没有测试。迁移前先定：接线还是删。它们合计 184 行，占了仓库文案的三分之一，却当前不在任何渲染路径上。

**七、双端挂载点**

`packages/desktop/src/renderer/features/vault/VaultPage.tsx:198` 与 `packages/web/src/main.tsx:504` 都要加 `interfaceLocale`。桌面端的来源是 `session.diagnostics.languagePreferences.interfaceLocale`（与 `AccountMenuProvider.tsx:19` 同源），`VaultMenuProvider.tsx` 现在完全没有 locale 字段；Web 端 `preferences` 已是真实 state，照 `AccountPageContentView`（`main.tsx:485-486`）加一行即可。`VaultPage.tsx` 的空态分支（`:166-192`）也是硬编码中文，别漏。

顺带两条：`VaultPageContentView.tsx:101-104` 的 `vaultWorkspaceTabs` 是模块级常量，要改成组件内 `useMemo` 才能随 locale 变；页面标题走的是 `ProductShellHost.tsx:201` 的硬编码 `productPageHeaderMeta.vault`，与 `vaultCopy.title` 无关，属于外壳层。

**八、相邻缺陷**

`scripts/run-test-set.mjs:9-18` 的 `exactSets.ui` 列了 8 个文件，其中 4 个已不存在（含 `packages/desktop/test/shared-ui-i18n.test.tsx`），`assertExistingFiles` 会直接 `process.exit(1)`，所以 `pnpm test:ui` 现在跑不起来。做 T1 时最该跑的是 `pnpm test:behavior`，没有现成的 i18n 回归网。

**九、实施记录（2026-09-20 起）**

已落地：

- S1：`VaultCopy` 骨架补 `inline` 兜底表、`labels` 13 张映射和插值句渲染器（`types.ts:231`、`copy/vault.ts`）。插值句最初写成 `renderLimitNotice(scope, shown, total)` 函数字段，S2/S3 落地时发现模板串会到十几条，整体换成 `vaultTemplate(copy, key, values)`，`renderLimitNotice` 已从类型和两份 copy 里删掉。
- S11 提前到最前，因为后面每个切片都要从父组件拿 `copy`：`VaultPageContentView` 加 `interfaceLocale` prop 并现算 `copy`，模块级 `vaultWorkspaceTabs` 改成按 copy 现算的 `useMemo`；新增 `vaultText(copy, key)` 兜底查表并从 `packages/ui/src/index.ts` 导出；`VaultPage.tsx` 两个空态分支（`:166-192`）全部改走 copy；`VaultMenuProvider` 与 web `main.tsx` 各加一行 `interfaceLocale`。
- S2：`VaultItemSections` 的加载上限提示（改走 `vaultTemplate`）、空态与「加载更多」三条文案走 copy；`VaultArmorFilterPanel` 收 `copy` prop，11 条文案走 `vaultText`，属性短名表换成 `copy.labels.armorStats`；`championTypeLabels` 从 `VaultWeaponFactIcons` 删除（`copy.labels.champions` 已经有一份，S3 改用 copy，全仓没有别的消费者）。`VaultVirtualWeaponGrid` 没有用户可见中文（只有代码注释），不需要改。

**S2 剩余与 S4 被一个结构问题挡住**：仓库拿槽位显示名当标识，而这个名字是 core 里写死的中文。

- `getAccountItemSlotLabel`（`packages/app/src/workspaces/vaultList.ts:680`）返回 `item.equipment_bucket_name?.trim() || item.bucket_name?.trim() || inferOtherSlotName(item)`。
- `equipment_bucket_name` 在 `packages/core/src/account/summary.ts:1593` 取 `bucket?.name ?? equipmentBucketDefinition?.displayProperties?.name`，其中 `bucket = classifyBucket(equipmentBucketHash)`（`:1536`）。对 `bucketLabels`（`packages/core/src/items/classification.ts:9`）里那 16 个规范桶，这个名字是表里写死的中文，和 `bungieLocale` 无关；不在这张表里的桶才回落到 manifest 显示名。
- `VaultSlotFilter` 只是 `string | "all"`，`matchesSlot`（`:805`）拿这个名字做相等比较；`buildVaultSections`（`:484`）拿它同时当 key 和 label；`slotRank`（`:910`）按中文名单排序。
- UI 侧同一个名字被三处当成判据：`VaultFilterToolbar.tsx:115-116` 用中文数组分武器 / 护甲 / 其它三档，`:452` `shortSlotLabel` 做中文 replace，`VaultWeaponFactIcons.tsx:56-58` 用中文 `includes` 反查图标类型。
- 落在 `bucketLabels` 外的桶走 `inferOtherSlotName`（`:940`），靠中英关键词猜分类。

所以要翻译槽位名，得先把标识从名字上摘下来。全仓已经有现成的按 hash 判定，仓库切片一条都没用：`classifyBucket(bucketHash).group`（core，返回 weapons / armor / equipment / other，`classification.ts:73`）和 `bucketHashToSlot`（`packages/core/src/account/power.ts:50`，8 个装备槽）。

顺带纠正一条先前记错的判断：规范桶的槽位名不跟 manifest 语言走，所以「`bungieLocale` 切英文时仓库槽位就乱了」只对 `bucketLabels` 之外的桶成立，不是普遍情况。真正的动机是两件事——T1 要把槽位显示名从 core 的硬编码中文搬到 `VaultCopy.labels.slots`；以及仓库切片按名字判槽位，和全仓按 hash 判的做法不一致，非规范桶那条路径还要靠关键词猜。

做法是在 `packages/app` 加 `getAccountItemSlotKey(item)`：用 `equipment_bucket_hash` 映射到稳定槽位键（16 个规范桶，认不出的走 `hash:<hash>`），`matchesSlot` / `buildVaultSections` / `slotRank` 改按 key；显示名由 `VaultCopy.labels.slots` 按 key 提供；UI 侧三档分类改用 `classifyBucket(...).group`，图标反查和 `shortSlotLabel` 也改成按 key 查表。不碰 core / services / API 契约。

两个待定项已定（2026-09-21）：

1. **槽位显示名跟界面语言。** 键 → 显示名写进 `VaultCopy.labels.slots`，中英文各一份。
2. **认不出的桶独立成组。** key 用 `hash:<equipment_bucket_hash>`，显示 manifest 原始名，按 `classifyBucket(...).group` 归组（认不出即 `other`），不再靠关键词猜。

**槽位键修复已落地（2026-09-21）**

- `packages/app/src/workspaces/vaultList.ts`：新增 `VaultKnownSlotKey`（16 个规范桶）与 `VaultSlotKey`（再加 `hash:<n>` / `label:<名字>` 两种兜底）、`vaultSlotKeyByBucketHash` 表、`getAccountItemSlotKey`；`VaultSection` 与 `VaultSlotSummary` 各加 `group`；`buildVaultSections` 按 key 分组、同时记 label 和 group；`buildVaultSlotFilters` 带上 group；`matchesSlot`、`vaultQueryIndex` 的 slot facet 与 `indexedItemSignature` 全改按 key；排序换成 `slotRank(key, label)` + `vaultSlotOrder` + `untrackedSlotOrder`。
- 兜底分两类，不合并：认不出的 bucket 走 `hash:<n>`，连 bucket hash 都没有的条目走 `label:<原显示名>`，后者完全沿用旧分组。这样原本按名字分开的记忆水晶 / 任务与追踪 / 材料与货币等 7 类不会并成一个分区，相对次序也不变（旧 `slotRank` 的 `999` 兜底位换成「表长 16 + 7 = 23」，仍在最后）。
- `VaultCopy.labels.slots`（16 条 `{ label, short }`）与 `labels.slotAll` 中英文各一份；`vaultCopy.ts` 新增 `vaultSlotLabel` / `vaultSlotShortLabel`，认不出的键回落到 app 给的原始名，`label:` 那批再过一次 `vaultText` 好跟着界面语言走（那 7 个分类名已补进 en-US `inline`）。
- `VaultWeaponFactIcons.tsx` 的 `weaponSlotTypeFromLabel` 换成 `weaponSlotTypeFromKey`；`VaultFilterToolbar` 收 `copy` prop，`visibleSlotFilters` 改成 `item.key === "all" || item.group === props.group`，三处 `shortSlotLabel` 换成 `vaultSlotShortLabel`，`shortSlotLabel` 函数删除。
- 摘要串两处要显示名的地方（`VaultPageContentView.buildActiveFilterLabels`、`buildVaultContextFacts`）加了 `slotLabel?: string`，照已有的 `armorSetLabel` / `frameLabel` 写法，由 UI 查表后传进来。
- **zh-CN 渲染结果逐字不变**：`getAccountItemSlotLabel` 完全没动，16 个槽位的 `short` 与旧的 `replace` 手术结果逐字相同（动能武器→动能、职业物品→职业、全部位置→全部，其余不变），7 个兜底类别走 fallback 原样返回。所以 `packages/app/test/vault-list-workspace.test.ts:90/92` 与 `packages/desktop/test/vault-panel.test.ts:416` 的 section / slot 显示名断言保持通过。
- 未碰 `packages/core`、`packages/services` 与 `api/types.ts` 等契约文件：`equipment_bucket_hash` 本来就在 `AccountItemSummary` 里。
- 已知遗留：`VaultListItem.formatWeaponSlot`（`:406`）仍对 `getAccountItemSlotLabel` 做 `replace(/武器$/u, "")` —— 因为显示名没动所以现在是对的，留到 S3 一起处理。

**槽位顺序兜底补回（2026-09-23）**

- 上面那条「`label:<原显示名>` 完全沿用旧分组、相对次序不变」当时只做到一半：`slotRank(key, label)` 只拿 key 去 `vaultSlotOrder` 里查，`label:<原显示名>` 一个都不命中，全部落到 `untrackedSlotOrder` 那段的末尾，段内次序改由拼音序决定——「能量武器 → 威能武器 → 头盔」被打成「能量武器 → 头盔 → 威能武器」。
- 补 `vaultSlotLabelOrder`（`vaultSlotOrder` 那 16 个槽位的中文显示名，一一对应），key 查不到时再按显示名查一次。规范键与 `hash:<n>` 的排序不受影响。
- 是本地 CI 里 `packages/desktop/test/vault-panel.test.ts:419` 那条 section 顺序断言抓到的。它不是陈旧断言：`packages/core/src/items/classification.ts:184` 写明 `bucket_hash` 与 `equipment_bucket_hash` 在不同来源下各有可能缺失，测试夹具里就有这种条目。

**S3 卡片与 S2 收尾已落地（2026-09-21）**

- `VaultListItem.tsx` 收 `copy` prop，并加进 `sameVaultListItemProps` 的比较（`MemoizedVaultListItem` 是手写比较，漏了这条 memo 就永远不更新）。
- 这张卡片上所有枚举标签改从 `copy.labels` 取：弹药（`labels.ammo`）、伤害类型（`labels.damage`）、勇士（`labels.champions`）、职业（`labels.classes`）、护甲属性（`labels.armorStats`）、标记（`labels.tags`）。app 侧的 `ammoFilterLabels` / `armorStatLabels` / `tagLabels` 在这个文件里的引用全部删掉，`VaultListItem` 不再 import 那三张表。
- 约 20 条插值句与一次性文案走 `vaultTemplate` / `vaultText`，其中 `formatVaultCardMeta`、`formatVaultCardContext`、`formatWeaponSlot`、`formatAmmoCompact`、`getStrongestArmorStat`、`compactArmorStatLabel`、`classTypeLabel`、`craftingLabel`、`formatVaultCardTitle`、`formatVaultItemMeta` 都改成第一参数收 `copy`。
- `dispositionShortLabel` 删除：它的四个返回值（`保留` / `待定` / `清理` / `未标记`）和 `dispositionLabel` 逐字相同，原来只是多一层 `review` / `junk` 分支，合并后卡片类名和徽标文案不变。
- `formatVaultItemMeta` 变成 `formatVaultItemMeta(copy, item)`，两个消费方跟上：`VaultOrganizePanel` 加 `copy` prop（由 `VaultPageContentView` 传入），孤儿组件 `VaultDuplicateGroups` 也加 `copy` prop 保持可编译（按用户 2026-09-21 的指示不接线、不删除，留在 S10）。这个函数里最后一段 `formatArmorStatsInline` 还是 app 侧的，属 S9。
- 位置显示名 `getVaultItemLocationLabel(item)` 外面套了一层 `vaultText`，`仓库` 这一条进了 en-US `inline`；`角色名 · 已装备 / 背包 / 邮政官` 那几种组合串要等 S9 改 `vaultPage.ts` 才跟得动界面语言。
- **zh-CN 渲染逐字不变**：弹药、伤害、勇士、职业、属性、标记六组值都与原来那几张表逐字相同；`formatWeaponSlot` 只对认不出的槽位保留原 replace；`formatVaultCardTitle` 仍按 `join("\n")` 拼、`formatVaultItemMeta` 仍按 `join(" / ")` 拼，拼接顺序没动。
- 未碰 `packages/core`、`packages/services`：`VaultItemSections` 只是往下传 `copy`。

**S4 筛选工具栏已落地（2026-09-21）**

- `VaultFilterToolbar.tsx` 里对 `@d2-tools/app/vault` 的 9 个标签表导入（`sortLabels` / `lockFilterLabels` / `ammoFilterLabels` / `rarityFilterLabels` / `gearTierFilterLabels` / `classFilterLabels` / `damageFilterLabels` / `championFilterLabels` / `craftingFilterLabels`）全部删掉，改成从 `copy.labels` 取；文件对 app 只剩 `type` 导入。分组按钮也用 `copy.labels.groups[item.key]`，不再读 app 拼好的 `item.label`。
- 两处 replace 手术换成显式列表：弹药分段控件从 `copy.labels.ammo` 生成，`all` 一项换成 `inline` 的 `全部`；勇士分段控件直接列 `全部 / 屏障 / 过载 / 势不可挡` 四条 `inline`。
- 其余约 30 条筛选块标签、`aria-label`、下拉选项与重置按钮提示走 `vaultText` / `vaultTemplate`；`armorSetCatalogLabel` 收 `copy`，「（持有 N）」改成模板串。
- **zh-CN 渲染逐字不变**：9 张表的取值与 `copy.labels` 逐字相同；分组按钮的 `item.label` 就是 `vaultGroupLabels[key]`；两个分段控件的短名与原来的 replace 结果逐字相同；`Object.entries` 的键序沿用同一份对象字面量顺序。
- 已知碰撞：`锻造` 这一个 `inline` 键同时给卡片上的锻造徽标和筛选块的标题用，en-US 只能取一个值，现在两处都是 `Crafted`。要分开得换 key，而换 key 会改 zh-CN 输出，所以留在这里不处理。

**S5 整理与批量已落地（2026-09-21）**

- 三个文件全部迁完，各自收 `copy`：`VaultOrganizePanel.tsx`（新增 `copy` prop）、`useVaultBatchActions.ts`（hook 输入加 `copy`）、`vaultCleanupProtection.ts`（`buildVaultCleanupProtectionIndex` 的输入加 `copy`）。迁移后这三个文件里没有剩余中文。
- `vaultCleanupProtection` 的 13 条保护原因短语全部改走 `vaultText(input.copy, "...")`；其中 `已锁定` 复用 S3 那条键，另外 12 条新增。
- 三个确认弹窗的标题与正文、批量标记 / 移动 / 转移的按钮与结果反馈、清理边界说明、`游戏内定位 · 本次处理 {count} 件` 与 `按位置、光等、锁定状态和 Perk 核对；…` 等长句都走 `vaultTemplate`；`取消` 那条传的是 `返回检查`。
- **`buildVaultCleanupProtectionIndex` 加了必填的 `copy`，所以两个调用方要跟上**：`VaultPageContentView`（`copy` 进了那个 memo 的依赖数组）与 desktop 的 `useDesktopProductShell.tsx`（新增 `vaultCopy = getLocaleCopy(productPreferences.interfaceLocale).vault`，紧挨已有的 `homeCopy`）。`packages/ui/test/recommendation-source-parity.test.ts` 也传了 `vaultCopy["zh-CN"]`——这条断言比的是 dim ⇄ csv 两种来源逐字段相同，用哪份语言都一样，取 zh-CN 跟旧输出对齐。
- **zh-CN 渲染逐字不变**：`vaultText` 在 zh-CN 侧 `inline` 为空、原样返回 key，所以这 30 余条字符串就是原来的中文；三处确认弹窗的插值位置和标点没动。
- 未碰 `packages/app` 的 `buildVault*` 系列：它们仍返回中文，属 S9。
- 遗留一条跨包缝：`useItemDetailWorkspace.ts:537` 的 `` `不能标为清理：${protection.join("、")}` `` 会把上面这些保护原因拼进装备详情。它没有 `copy` 通路，且是 AGENTS.md 列的高冲突文件，留给装备详情切片处理——在此之前英文界面下这行会中英混排。

**S8 与 S6 已落地（2026-09-21）**（先 S8 后 S6：S6 的两个面板要 import S8 导出的那批来源行文案函数，反过来做会把 `copy` 从两个方向往同一个文件里塞。）

- `VaultWishlistManager.tsx`：`VaultRecommendationDataPanel`、`DimImportPreviewCard`、`ImportIdentityChoice` 各收必填 `copy: VaultCopy`，正文里的反馈消息、管理区标记、导入 / 导出按钮组和三个弹框全部改走 `vaultText` / `vaultTemplate`。新增 `formatDimIssue` / `formatKnowledgeIssue` 两个模块级函数：问题行原来是 JSX 里 `第 {line} 行 · 武器 · perk：原因（原文：…）` 的表达式拼串，改成模板串时按 JSX 空白折叠规则逐段复刻，zh-CN 输出与原来逐字相同。
- 模块级那批来源行文案函数改成第一参数收 `copy`：`managedSourceStateLabel`、`managedSourceMetaLabel`、`managedSourceRuleLabel`、`managedSourceWeaponLabel`、`managedSourceImpactLabel`、`managedSourceScaleLabel`、`formatManagedRequirements`、`formatModes`、`dimPreviewNotice`、`shortRevision`；`managedSourceCountsTitle` 从 `export const` 字符串改成 `export function managedSourceCountsTitle(copy)`。`managedRequirementSlotLabel` 从 `Record<string, string>` 换成 `switch`：`Record` 在 `strict` 下接不住联合类型，而且 `perk1` / `perk2` 是 DIM 的固定列名，中英都照原样显示，不进 copy。`sourceConfirmation` / `ruleConfirmation` / `ruleImportsConfirmation` 同样收 `copy`。
- 文件里原来的本地 `formatDateTime` 删除，改用 `VaultCopy.formatDateTime`（见下）。
- `VaultRecommendationSourceManager.tsx` 整体迁完：整个文件收必填 `copy`，`SyncFromLinkDialog` 与 `SourceDetailDialog` 各收 `copy` 并往下传。来源行三个按钮的确认框标题用 `停用{label}` / `启用{label}` / `删除{label}` 三条模板串——`{label}` 紧贴动词，**不能写成 `停用 {label}`**，那会多出一个空格、改掉 zh-CN 输出。动作回执同理，拆成 `{label}已启用。` / `{label}已停用。` / `{label}已删除。` 三条：合并成 `{label}已{action}。` 加一个动词查表时，en-US 侧会拼出 `Foo Remove.` 这种残句。
- `VaultRecommendationEvidencePanel.tsx` 收**可选** `interfaceLocale?: InterfaceLocale`，边界上 `?? "zh-CN"`，两个子面板都从这里拿 `copy`。可选是为了让两个既有测试文件里的 26 处 `render(<VaultRecommendationEvidencePanel wishlistActions={…} />)` 一行都不用改，且它们断言的中文在 zh-CN 下逐字不变。`VaultPageContentView` 的调用点传 `props.interfaceLocale`。
- `VaultCopy` 加函数字段 `formatDateTime: (value: string) => string`：日期写法本身也是语言的一部分，而渲染层只拿得到 `copy`。两份 copy 各持一个 `Intl.DateTimeFormat` 实例（`zh-CN` / `en-US`，`dateStyle: "medium"`、`timeStyle: "short"`），解析不出时间的值原样返回。这样不必把 `interfaceLocale` 一路穿进这些 helper 的签名。
- `copy/vault.ts` 的 en-US `inline` 从 176 条加到 402 条，两轮查重都是 0 重复。查重与「有没有漏」各写了一个一次性脚本（`.local-data/tmp/`，未入库）：一个按 en-US `inline` 的键名数重复，一个把 `packages/ui/src/vault/` 里所有含中文的双引号字面量抠出来跟键集比。后者是权威检查——`vaultText(copy, x === a ? "甲" : "乙")` 这种三元写法正则抓不到，只有按字面量比才不会漏。跑完 S8/S6 后该文件的中文字面量只剩 `已停用` 与 `读取链接` 两条，已补进 copy。
- `packages/desktop/test/architecture-maintenance.test.ts` 四处断言跟上新签名：`:612` 的定义正则加 `\(\s*copy: VaultCopy,`（仍要求 4 条），`:619` / `:631` 的行内正则、`:624` 的反向断言都加 `(copy)` / `(copy, source)`；`:189-190` 的预览提示从 `{preview.merged_row_count} 行是展开写法的冗余` 改成 `vaultTemplate(copy, …)` 形态；`:295-297` 的确认按钮文案从 `confirmLabel: "确认…"` 改成 `confirmLabel: vaultText(copy, "确认…")`——不留这条，必填 `copy` 之后那三条断言会全部落空。
- **zh-CN 渲染逐字不变**：所有模板串的插值位置、标点和连接符（` · `、`：`、`（）`）都按原拼接位置摆放；`停用{label}` 这类紧贴写法的空格按原文保留。
- 未碰 `packages/core`、`packages/services`：这一轮只动 `packages/ui/src/vault/` 三个文件、`packages/ui/src/i18n/copy/vault.ts` 与 desktop 的架构测试。

**S7 已落地（2026-09-21）**

- `VaultPageContentView.tsx`：从 `@d2-tools/app/vault` 删掉 12 张标签表导入（`armorStatLabels` / `ammoFilterLabels` / `classFilterLabels` / `championFilterLabels` / `craftingFilterLabels` / `damageFilterLabels` / `gearTierFilterLabels` / `locationFilterLabels` / `rarityFilterLabels` / `tagLabels` / `lockFilterLabels` / `sortLabels`），改读 `copy.labels.sorts / locations / rarity / gearTiers / ammo / damage / champions / crafting / classes / tags / locks`。`addArmorStatRule` 只拿 `Object.keys(copy.labels.armorStats)` 当键名枚举，不取显示值。
- 四个模块级函数第一参数收 `copy`：`buildActiveFilterLabels`、`formatVaultRecommendationMetricOptionDescription`、`buildVaultRecommendationFilterState`、`vaultResourceStatusLabel`、`vaultRecommendationWorkflowStatus`；`buildVaultWorkspaceTabs(copy)` 由模块级常量改成函数。`vaultRecommendationPrimaryFilterLabel` 在 `recommendationMatchView.ts`，全仓只有本文件消费，这轮一并收 `copy`（该文件因此多两条 import，无循环：`vaultCopy.ts` 只依赖 `app` 的类型与 `i18n/types.js`）。
- **批量回执的色调从字符串反推改成结构化字段。** 原来是 `batchMessage.includes("失败") ? "status-error" : "status-ready"`；英文回执里不会出现「失败」两个字，反推必定失手，而且武器名或角色名里碰巧带「失败」时会把一条正常回执染红。`useVaultBatchActions` 现在导出 `VaultBatchMessage = { text; tone: "ready" | "error" }`，内部 `report(text, tone = "ready")`，真错误路径与 `failed_count > 0` 的结果标 `"error"`；页面本地那份状态同型，加 `reportBatchMessage(text, tone = "ready")`，空文本仍旧回落到批量面板回执（原来是 `batchMessage || batchActions.batchMessage`，空串 falsy 触发回落，现在等价地写 `batchMessage ?? batchActions.batchMessage` 并在 helper 里把空文本归 `null`）。渲染改读 `tone`。
- 硬编码排序器 `localeCompare(..., "zh-Hans-CN")` 三处（本文件 `:556`、`recommendationMatchView.ts:452` / `:548`）复核后**不动**：排的是 Manifest 数据里的名字（武器框架、来源作者），与界面语言无关；实测拉丁文本在 `zh-Hans-CN` 下与默认排序同序，只有中英混排才不同。全仓另有 12 处同类硬编码，散在账号、资料库、装备详情、配装等后续阶段，一起改会把本切片扩成跨阶段改动。
- `vaultQueryIndex.ts` 的 `传说` / `异域` 是查询词表里的别名（`tier === "legendary" || tier === "传说"`），不是显示文案，保留。
- en-US `inline` 从 402 条加到 482 条，0 重复。收尾时 `packages/ui/src/vault/` 剩余缺失字面量只剩两个孤儿文件的 82 条（S10），加上 `传说` / `异域` 这两条查询词。
- **zh-CN 渲染逐字不变**：所有模板串按原拼接位置摆插值，`{count} 件`、`，已选中`、`已{action}：{item}` 这类的前后标点一律原样。
- 未跑本地验证；类型检查、行为测试与视觉验收交给 CI 与后续本地测试。
- 2026-09-23 本地 CI 补上当时没跑的门禁：`packages/desktop/test/architecture-maintenance.test.ts` 里两条按源码形态断言的用例跟着 `copy` 迁移更新——说明函数多了 `copy` 参数、分段按钮里「全部」改成查表、固有能力空态占位组件多了 props。断言的意图（悬停与读屏同一句话、空态带列名）不变。

**S9 已落地（2026-09-21）**

- 摘要串不再由 app 拼中文：`buildVaultContextFacts` 返回 `VaultFilterFactToken[]`（19 个变体），措辞与整句搬到 `vaultCopy.ts` 的 `vaultFilterFactLabel` / `vaultContextFactLine`；`filteredCount` / `totalCount` 从入参移除，成句时由 UI 传入。`VaultListWorkspace.contextFacts` 的类型跟着变成 token 数组。`buildVaultSelectionSummary` 改返回 `VaultSelectionSummary` 判别联合（`none` / `all-visible` / `partial`），成句在 `vaultSelectionSummaryText`。
- `vaultActions.ts` 的十来个回执串改返回 `VaultActionMessageToken`，由 `vaultActionMessageText` 成句：批量标记的动作名与进行中提示、批量移动的准备与结果、清理的解锁/转移、写回结果。清点文本（`buildVaultCleanupText` / `buildVaultCleanupLocatorText`）和 `buildVaultRecommendationAuditReport` 进的是剪贴板和验收报告，字段名与口径要跨版本稳定，保持中文，不进 `copy`。
- `vaultPage.ts` 的 `VaultLocatedItem` 补 `source_location_label` 与 `source_character_class`；`source_label` 仍是拼好的显示串，留给剪贴板清单这类不看界面语言的输出。`VaultListItem` 改用 `vaultItemLocationLabel`，卡片 `title` 与槽位行的槽位名改用 `vaultSlotLabel`。
- `formatArmorStatsInline` 从 `@d2-tools/app/vault` 的公开导出移除，改由 UI 的 `vaultArmorStatsInline(copy, item)` 拼。
- 删掉 12 张已无消费者的 app 侧标签表（`vaultGroupLabels` / `locationFilterLabels` / `tagLabels` / `sortLabels` / `lockFilterLabels` / `ammoFilterLabels` / `rarityFilterLabels` / `gearTierFilterLabels` / `classFilterLabels` / `damageFilterLabels` / `championFilterLabels` / `craftingFilterLabels`），以及 `VaultGroupSummary.label` 与 `VaultLocationSummary.label`。`armorStatLabels` 保留：只剩孤儿组件 `VaultTargetRulesPanel.tsx` 在用，等 S10 决定去留。
- Desktop 侧跟着接线：`useVaultWriteActions` 收 `copy`，`useDesktopProductWriteActions` 收 `interfaceLocale`，`useDesktopProductShell.tsx` 传 `diagnostics.languagePreferences.interfaceLocale`；该文件原有的中文回执（同步提示、缺少实例 ID、加锁/解锁提交、写回校准、批量转移失败）一并查表。
- `VaultArmorFilterPanel.tsx:68` 的 `aria-label` 原来是模板串直接拼中文，改为 `vaultTemplate(copy, "删除{stat}条件", …)`。
- en-US `inline` 从 482 条加到 533 条，0 重复。
- 会撞的测试同步改了：`vault-list-workspace.test.ts` 两处 `contextFacts` 断言改断言 token；`vault-panel.test.ts` 的 `buildVaultGroups` 断言去掉 `label`，`buildVaultBulkMoveResultMessage` 从断言中文串改成断言 token。
- 未跑本地验证；类型检查、行为测试与视觉验收交给 CI 与后续本地测试。

### 阶段 B 勘察记录：装备详情切片（2026-09-21）

仓库切片落地后，按 T1 的既定顺序接装备详情。2026-09-21 只读勘察，结论记在这里。

**一、现状**

装备详情横跨三个 package，界面上看到的中文分三层：

- `packages/ui/src/item-detail/`（唯一产品实现）：`weapon/WeaponDetailContent.tsx` 353 行含中文、`armor/ArmorDetailContent.tsx` 218、`weapon/WeaponPerkEntry.tsx` 41、`SharedItemDetailDialog.tsx` 13、`DetailInstanceActionPanel.tsx` 11、`EquipmentDetailContextLedger.tsx` 7。
- `packages/app/src/workspaces/`：`weaponDetail.ts` 85、`armorDetail.ts` 30、`itemDetail.ts` 16。
- `packages/desktop/src/renderer/`：`shared/hooks/useItemDetailWorkspace.ts` 92、`shared/components/ItemDetailModal.tsx` 87、`shared/components/item-detail/buildWeaponDetailView.ts` 69、`shared/hooks/useItemDetail.ts` 34、`ItemDetailTools.tsx` 28、`ItemDetailStats.tsx` 27、`utils/itemShare.ts` 22、`ItemDetailSameName.tsx` 15、`itemDetailFormatters.ts` 14、`ItemDetailActions.tsx` 13、`buildArmorDetailView.ts` 12、`ItemDetailAi.tsx` 10、`ItemDetailPerks.tsx` 5、`ItemDetailHeader.tsx` 3。

**二、挂载点**

`SharedItemDetailDialog` 的三个变体（`weapon` / `armor` / `loading`）由三处挂：

- `packages/desktop/src/renderer/shared/components/ItemDetailModal.tsx:147`，账号、仓库、商人、资料库进详情都走这里。
- `packages/desktop/src/renderer/pages/HomePageItemDetailModal.tsx:88/129/175`，首页入口，同时传 `vendorContext`。
- `packages/web/src/main.tsx:814/825/836`，预览壳。

`closeLabel` 早就是消费方注入的字符串（五个调用点各自传「关闭装备详情」/「关闭武器详情」/「关闭护甲详情」/「关闭奖励详情」），只有 dialog 内部的 `canonicalTitle` / `canonicalDescription`、商人售卖区的六个字段名和加载态那句没有出口。`VendorOfferContext` 的值全部由调用方拼，字段名归 dialog。

**三、迁移机制**

- 新增页面级 `ItemDetailCopy`（`inline` + 三个变体的标题与描述 + 商人售卖区字段名），按仓库那条路走：zh-CN 侧 `inline: {}`，en-US 用中文字符串当键，消费侧 `itemDetailText(copy, key)`。
- `SharedItemDetailDialog` 是跨端叶片组件，不是页面边界。做法照 `VaultArmorFilterPanel`：收**必填** `copy`，由 `ItemDetailModal` / `HomePageItemDetailModal` / web `main.tsx` 三处现算并传入。`packages/ui/test/shared-item-detail.test.tsx` 直接渲染该组件，会跟着改断言或补一个 zh-CN copy。
- `closeLabel` 已经是注入式的，保持不动，不改成查表。
- `DetailInstanceActionPanel` / `EquipmentDetailContextLedger` 是 dialog 的兄弟导出，同样收必填 `copy`。

**四、必须先改代码、不能当文案翻译的地方**

暂未在 `packages/ui/src/item-detail/` 找到拿中文当判据的代码。`ArmorDetailContent.tsx` 里大量 `context.kind === "account_item" ? … : …` 判的是判别联合，不是中文，照原样保留结构，只换字面量；`WeaponPerkEntry.tsx:52` 那条 `state === "different"` 已在 T84 处理过。收尾时按仓库切片的做法跑一次「按字面量比键集」的脚本，确认没有漏网。

**五、会撞的测试**

- `packages/ui/test/shared-item-detail.test.tsx`：直接渲染 `SharedItemDetailDialog`，断言 `region` 名「商人售卖信息」与 `closeLabel`。
- `packages/desktop/test/weapon-detail-view.test.ts`：断言 `buildWeaponDetailView` 产出的 `label` 与插槽名。
- `packages/desktop/test/item-share-text.test.ts`：断言 `itemShare.ts` 拼出的分享文本逐段中文。
- `packages/desktop/test/item-detail-cache-scope.test.tsx`、`item-detail-socket-plug-acceptance.test.tsx`：夹具里有中文，断言的是行为不是文案，预计不动。

**六、切片顺序**

D1 `ItemDetailCopy` 类型与 copy 骨架 → D2 对话框外壳（`SharedItemDetailDialog` / `SharedItemDetailLoading` / `DetailInstanceActionPanel` / `EquipmentDetailContextLedger`）→ D3 武器详情（`WeaponDetailContent` / `WeaponPerkEntry`）→ D4 护甲详情（`ArmorDetailContent`）→ D5 app 侧详情标签与摘要串（`weaponDetail` / `armorDetail` / `itemDetail`）→ D6 Desktop 接线与残留文案（`ItemDetailModal` / `item-detail/*` / `useItemDetailWorkspace` / `useItemDetail` / `itemActions`）→ D7 收尾。

**七、有意保持中文的部分**

`utils/itemShare.ts` 与 `utils/dailyShare.ts` 拼的是发给别人的分享文本，`buildArmorDetailView` / `buildWeaponDetailView` 里进验收与剪贴板清单的引用串同理，口径与仓库切片的清点文本一致：保持中文，不进 `copy`。这条沿用既有结论，不单独开决定项。

### 阶段 B 实施记录：装备详情切片（2026-09-21）

勘察结论落到代码，切片按 D1–D7 走完。下面记实际结果和偏离勘察的地方。

**一、交付形状**

- `ItemDetailCopy`（`packages/ui/src/i18n/types.ts`）：`inline` 键值表 + 三个变体各自的标题与描述 + 商人售卖区字段名。zh-CN 侧 `inline: {}`，en-US 侧拿中文字面量当键，消费侧走 `itemDetailText(copy, "…")`。
- `packages/ui/src/item-detail/itemDetailCopy.ts` 提供 `itemDetailText` 与 `itemDetailTemplate`（模板用 `{name}` 占位）。结构化数据不进 copy。
- 页面级导出（`SharedItemDetailDialog` / `WeaponDetailContent` / `ArmorDetailContent` / `DetailInstanceActionPanel` / `EquipmentDetailContextLedger`）在边界取 `props.interfaceLocale ?? "zh-CN"`，内部子组件收**必填** `copy`。
- `closeLabel` 原本就是调用方注入的字符串，保持原样，没改成查表。

**二、token 范式：不透明值注入，枚举走判别联合**

装备详情有一批标签由 `packages/app` 判种类、词表在 UI 侧。照仓库切片 S9 的做法分两类：

- **不透明值**（机制名、商人名、来源名、时间文本）走注入参数，例如 `entry_label`、`ArmorSocket.location`。
- **枚举**走判别联合，措辞留在 UI：`WeaponSocketColumnLabel`（`{ kind: "perk_index", index }` / `{ kind: "slot", index }` / `{ kind: "role", role }`）、`ArmorSocketLabel`、`WeaponDetailEntryKind`、`SelectedItemSourceKind`、`WeaponDetailAmmo`、`ArmorStatTrack`。
- 新建 `packages/ui/src/item-detail/itemDetailLabels.ts` 把这些 token 翻成词表：武器 13 项属性、护甲 6 项属性、三类弹药、锻造状态、五类 Perk 列名、六类来源位置。
- `WeaponPerkColumnRole` 含 `"other"`，但 app 只在兜底分支产出 `{ kind: "slot" }`，所以 token 收窄成 `Exclude<WeaponPerkColumnRole, "other">`，UI 的 switch 才能穷尽。
- `WeaponPerkSelectionColumn.label` 从 `string` 改成 `WeaponSocketColumnLabel`：`WeaponDetailContent` 拿它和 `pool_columns` 共用一段渲染，两边必须同类型。
- **快照路径单独一个 token**：定义还没加载时，`selection_columns` 来自账号快照的 `weapon_roll`，栏位名原本是 core 的 `weaponRollSlotLabel` 词表（`枪管/瞄具`、`第二列`、`大师`）。这一路不能拿插件分类重猜——重猜会变成 `枪管`、`弹匣`、`插槽 N`，zh-CN 就不是原话了。所以新增 `{ kind: "roll_slot"; slot: AccountWeaponRollSlot }`，槽位身份用 core 已经判好的 `slot`，UI 侧 `weaponRollSlotLabel` 逐字复现那套中文。

**三、app 侧（D5）**

- `weaponDetail.ts` / `armorDetail.ts` 去掉显示名：`ArmorStatTrack.label` 删除、`ArmorSocket` 的文案部分改 token、`status_label` 与 `location` 改可选。
- **回退等价**是这次迁移的硬要求。app 原来的兜底是 `label: "历史获取途径"`、`description: source.description || "Bungie 官方资料没有标注这件武器的历史获取途径。"`。现在 app 只透传 `source.label` 与 `source.description || undefined`（空串必须转 `undefined`，不然 `??` 不触发），UI 侧用 `entry.label ?? itemDetailText(copy, "历史获取途径")` 复现同样的兜底。
- `itemDetail.ts` 不用改：`formatVaultTagLabel` 只有剪贴板文本在用。

**四、Desktop / Web 接线（D6）**

- 三个挂载点各自算一份 copy 往下传：`ItemDetailModal.tsx`、`HomePageItemDetailModal.tsx`、`packages/web/src/main.tsx`。
- `LibraryDefinitionDialog` 新增必填 `itemDetailCopy`。它的武器 Perk 列名沿用装备详情词表，不自己维护第二份。
- 清掉一处平台壳重复兜底：`buildVendorArmorSources` 里两条 `status_label`（`当前可获得` / `来源已记录`）与 UI 兜底逐字相同，删掉后 en-US 才生效、zh-CN 不变；另一条 `当前在售` 没有兜底，改成查表。
- 桌面 builder 也清了两处重复兜底：`withManifestSourceStatus` 的 `label: "历史获取途径"` 与描述兜底交回 UI（`WeaponDetailContent` 用的就是逐字相同的两句），`labelTraitColumns` 的 `` `Perk ${n}` `` 改成 `{ kind: "perk_index", index: n }`。空串同样转 `undefined`，否则 UI 的 `??` 不触发。

**五、zh-CN 逐字不变**

`itemDetailText` 在 zh-CN 下返回键本身，而键就是原字面量，token 化只换取值路径不换文本。收尾时用 grep 扫了 `packages/ui/src/item-detail/` 和 Desktop 详情目录的中文字面量：剩下的全部落在 `itemDetailText` / `itemDetailTemplate` / `itemDetailLabels.ts` 的键位置，没有裸渲染。

**六、有意保持中文**

- 剪贴板与分享文本：`utils/itemShare.ts`、`utils/dailyShare.ts`、`buildItemActionPlanText`、`buildTargetInsightText`、`buildVaultCleanupText`。
- 写进账号的数据：新建配装草稿的名字（`ItemDetailModal.tsx` 的 `${selectedItem.name} 配装草稿`）。它写进 Bungie 数据、之后在配装页显示，跟着界面语言变会让同一账号里的草稿名一半中文一半英文。
- 诊断留痕与日志：`write-action-debug.json` 的 `message`（`describeSocketPlugResponseMismatches`、手动重读失败原因）、各处 `console.warn`。
- manifest 数据的**识别**串（`装备阶级升级`、`武器模组`、`大师杰作`、`能量核心` 等）：判的是 Bungie 返回的原文，不是界面标签。

**七、本轮没迁、留给后续**

- `packages/core/src/items/source.ts` 整套「获取方式」来源文案（`describeOfficialSource` + `sourceLabel` + `missingSourceDescription`）。它在 core 层直接产中文界面串，和 `weaponRollSlotLabel`、`equipmentGroupLabels`、`className`、`weaponStatHashMap` 显示名是同一批，一起排期。
- 桌面 builder 里还没接 copy 的那几处：`championLabels` / `championEffectLabels`、`damageFromInstance` 的伤害类型兜底、版本列的 `版本 N` / `专家` / `当前版本`、推荐卡标题、`buildArmorDetailView` 的 `armorStatLabels` 与推荐 `reason`。它们要等 builder 整体拿到 `copy` 才能一次性接上；其中 `本地目标规则`、`历史获取途径`、`未强化`、`当前配置` 四句的 en-US 译法已经躺在 `itemDetail.ts` 里。
- `packages/web/src/main.tsx` 的预览 fixture 文案：属于预览数据不是产品文案，交给阶段 D 判定。

**八、会撞的测试**

- `packages/ui/test/shared-item-detail.test.tsx`：`LibraryDefinitionDialog` 补 `itemDetailCopy`。
- `packages/desktop/test/weapon-detail-view.test.ts`：`label` 断言从中文串改成 token（`{ kind: "perk_index", index }`、`{ kind: "sword_core" }`、`{ kind: "grip" }`、`{ kind: "core_upgrade" }`）。断言的是判别联合本身，不是文案。
- `packages/desktop/test/item-share-text.test.ts`：断言分享文本逐段中文，分享文本按口径保持中文，不动。

**九、验证状态**

未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

### 阶段 C：配装与 AI 助手
- 让配装页真正消费已有 `loadoutsCopy`，补齐编辑器、比较、迁移和执行状态。
- 迁移 AI 助手面板及 Desktop 传入的状态文本，确保配置缺失、上下文载入和服务失败可理解。

### 阶段 D：平台收口与门禁

- 清理 Desktop/Web adapter 中残留的产品中文文案。
- 增加静态检查或质量门禁：允许游戏数据、外部引用和明确标记的 fixture 保留中文；未标记的产品可见文案不得新增中文硬编码。
- 在明暗主题和窄屏下分别验收语言切换，重点检查英文文本变长后的溢出、截断和按钮布局。

## 7. 验收标准

### 功能验收

- 设置页切换 English 后，应用重载仍保持 English。
- English 与中文切换不改变账号、资料库、仓库、配装和 AI 状态数据。
- Manifest 跟随开关开启时，界面语言改变会选择对应 Manifest 语言；关闭后两者可独立设置。
- English 下可完成登录、刷新账号、资料库更新、仓库筛选/整理、装备详情查看、配装编辑和 AI 会话等主流程。
- 加载、空、部分成功、失败、重试、禁用和更新状态均有英文文案，且不通过错误字符串猜测状态。

### 视觉与可用性验收

- 1280、980、760 宽度下英文长文本不溢出、不覆盖按钮、不改变既定信息层级。
- 明暗主题均使用同一语义 token，不能因英文切换回暗色或丢失状态颜色。
- 键盘焦点、按钮可访问名称和关闭/确认操作在英文下仍完整。
- Web 和 Desktop 共享同一页面结构，不出现平台特有的另一套英文页面。

### 质量验收

- 组件不再直接散落 `locale === ... ? ... : ...`；新增产品文案进入 i18n copy。
- 通过现有 UI 合同、质量门禁和类型检查；不新增仅匹配中文源码的普通功能测试。
- 发布说明明确英文支持范围；在全部核心工作流完成前，不标记为“完整英文支持”。

## 8. 依赖与风险

- 依赖现有 `interfaceLocale`、`bungieLocale` 和 `getLocaleCopy` 体系稳定。
- 共享组件和页面元数据涉及多个 package，需避免与其他菜单 UI 改造同时修改高冲突文件。
- 英文文本通常比中文更长，可能暴露现有固定宽度、按钮和状态栏布局问题。
- 动态数据可能仍为中文：必须明确区分 Manifest 语言未切换、第三方来源原文和产品 UI 漏翻，不能用统一替换掩盖问题。
- AI 返回的自然语言内容不应被强制翻译；应在请求上下文中传递用户界面语言，并在服务不支持时明确说明。

## 9. 完成定义

只有当仓库、配装、装备详情、AI 助手、页面标题/状态和平台 adapter 均完成英文接入，并通过英文主流程、窄屏、明暗主题和质量门禁验收后，T1 才能标记完成。

在此之前，T1 保持“候选方案，待排期”，对外只能描述为“英文界面部分可用”。
