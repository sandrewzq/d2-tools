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

#### 阶段 C 实施记录：配装页外壳与游戏内配装栏 + AI 助手面板（2026-10-13）

已迁移：

- 配装页页面外壳：导航离开确认、顶层操作状态条、角色/视图分段控件、新建配装菜单、应用配装与游戏内配装两个模式的入口说明。
- 装备数据条 `InGameAccountFreshness`：同步中、可能过期、用上次数据、已同步、待确认、来源与更新时间。
- 游戏内配装栏：左栏列表、槽位详情头、官方槽位操作组、配装辅助操作组、分组列表、槽位为空、页脚边界说明。
- 游戏内配装行与核对摘要：定位状态、装备标识/定义回退、配置摘要、展开后的「当前位置/配置类型/已确认配置/核对结果/装备操作」，以及右栏「应用前核对」三条计数与引导句。
- 装备选择抽屉：标题、搜索、位置筛选、结果计数、整行操作、空态与配置摘要。
- 官方标识编辑器与槽位选择器：配装槽/图标/颜色编号、覆盖确认、保存到槽位。
- AI 助手面板 `AiAssistantPanelView` 的全部静态文案：未配置引导、工具条、上下文 chip、空态、快捷问题、输入框、会话列表与上下文抽屉。
- Desktop 侧的助手状态文本：快照时间标签、会话标题、上下文 chip、能力结果引用、聊天失败与快照时间格式。
- `AI 助手` 常用问题从 Desktop 组件常量搬进 `shellCopy.assistant.quickPrompts`，中英各一份。

新增的 copy 契约：

- `LoadoutsCopy.labels` 增加 `armorStats` / `armorSlots`，作为护甲属性与部位名的唯一来源；本切片先给装备选择抽屉的配置摘要使用。
- `ShellCopy.assistant` 增加 `inline`、`quickPrompts`、`formatDateTime`；`inline` 沿用 zh-CN 留空、key 即中文原文的兜底表口径。
- 新增 `packages/ui/src/assistant/assistantCopy.ts`，导出 `assistantText` / `assistantTemplate`，已从 `@d2-tools/ui` 导出。
- 新增 `interfaceLocale` 接线：`useDesktopProductShell` → `GlobalAssistantSidebar` → `AiPage` → `AiAnalysisPanel` → `AiAssistantPanelView`；Web 预览在 `main.tsx` 直接传 copy。

本切片未动，留给后续：

- 护甲规划器整片（`LocalPlanEditor` 的规划面板、属性模组规则、优先属性、碎片调整、套装与库存约束、候选列表与比较、决策摘要）。`armorStatLabel` / `armorSlotLabel` 仍是中文 helper，转成 `copy.labels` 查表要同时改约 20 处调用点。
- 应用配装的方案库、详情、编辑器、比较页，以及槽位名当身份用的 `standardLoadoutSlots` / `standardSlotKey`。
- app 侧产出的展示串（`status_label`、`wear_label`、`source.label`、`wear_block_reasons`、`selection_message`、`column.title/subtitle`）仍是中文，UI 只是原样渲染。
- `join("、")` 这类列举分隔符仍按中文习惯拼接；这次没有为它新开 copy 字段，留在阶段 D 一起定。
- 两个孤儿组件（`VaultDuplicateGroups.tsx`、`VaultTargetRulesPanel.tsx`）的去留仍未定。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 C 实施记录：应用配装与对比表的 app 侧文案 token 化（2026-10-14）

这一刀切掉的是上一节最后一条遗留：app 直接把中文展示串塞进视图模型，UI 只负责原样渲染。改法是前面几个切片已经用熟的 `VaultFilterFactToken` 那套——**不透明值通过参数带走，枚举改成判别联合由 UI 查表**；回退逻辑跟着搬到 UI，保证 zh-CN 渲染逐字节不变。

app 侧改动：

- `loadoutCrossSource.ts`：`CrossSourceLink` 从 `{ tone, label }` 改成只报事实的 `{ tone, kind }` 四态（`no-matching-slot` / `in-game-slot` 带 `slot_index` / `equipped-now` / `equippable-for` 带 `class_name`）。顺带把槽位归一化从「中文串当 key」换成 `normalizeCompareSlot` 返回 `{ key, slot }`，其中 `slot` 是 `{ kind: "known", slot: LoadoutCompareSlotKey }` 或 `{ kind: "custom", key, label }`；认槽位的正则仍按中英双语匹配，因为 `bucketLabels` 给子职业 bucket 起的中文名「职业分支」还得能认出来。
- `applicationLoadoutWorkspace.ts`：新增 11 个 token 类型——`ApplicationLoadoutWearLabel`、`ApplicationLoadoutItemStatus`、`ApplicationLoadoutWearBlockReason`（九态，计数走字段）、`ApplicationLoadoutSelectionMessage`（三态）、`ApplicationLoadoutCompareEmpty`、`ApplicationLoadoutCountUnit`、`ApplicationLoadoutPlugGroupKey` / `PlugGroup`、`ApplicationLoadoutCompareValue`（十四个变体，含嵌套的 `series` / `plug-groups`）、`ApplicationLoadoutCompareRowLabel`、`ApplicationLoadoutCompareColumnTitle` / `Subtitle`。视图模型的 `source_label`、`status_label`、`wear_label`、`wear_block_reasons`、`selection_message`、`cell.value` / `cell.detail`、`column.title` / `subtitle` 全部换成 token。
- 删掉 `armorStatLabel`、`armorSlotLabel`、`applicationLoadoutSourceLabel`、`formatArmorSetConstraint`、`formatSubclassPlugHashGroups`、`formatApplicationSubclassConfiguration`（及两个 detail 变体），换成 `applicationSubclassConfigurationCounts` / `applicationSubclassConfigurationDetail` / `inGameSubclassConfigurationDetail` / `armorSetConstraintValue` 这些只产出 token 的函数。
- 对比表的 `fingerprint` 保持字符串，和取值 token 分开：差异检测比的是 `state:fingerprint` 组合，不能被展示文案带偏。哨兵值从 `未设置` / `未返回` / `无` 换成 `unset` / `unavailable` / `none`。
- `loadouts.ts` 补齐上面全部类型的重导出。

UI 侧改动：

- `LoadoutsPageContentView.tsx` 新增 11 个查表函数（来源、穿戴标签、装备状态、阻断原因、选择提示、跨来源标记、槽位名、列标题、列副标题、行标签、单元格取值）和两张记录表 `compareCountTemplates`、`comparePlugGroupLabels`；渲染点逐个改成调函数。
- 计数单位逐单位一条模板，不拼 `{count} {单位}`：中文量词贴数字、英文要复数形式，拼出来的固定词头两边都不对。
- 单元格 `detail` 复现 app 原来的 falsy 判断，展开后文本为空就不渲染 `<small>`。
- `packages/ui/src/i18n/copy/loadouts.ts` 补 78 个 en-US `inline` 键，现在共 756 键、无重复。

两处有意的 zh-CN 文案变更（不是等价迁移，需要单独验收）：

1. `armor:mode` 对比单元格原先直接渲染 `owned` / `theoretical` 原始枚举值，现在走 `armorPlannerModeLabel` 查表，中文从 `owned` 变成「当前库存」。这是修泄漏，中英界面都受影响。
2. 对比表的属性名统一取 `copy.labels.armorStats`，中文 `生命` → `生命值`、`职业技能` → `职业`。同一个 `& 装备` 位置上原来有三处写法不一致，这一刀统一成同一份。

顺带统一：游戏内行的 `+5 属性模组数量` 标签确认不可达（对比需至少 2 个方案，应用侧投影总是先捕获），合并成单个 `armor-mod-count` token。

本切片未动，留给后续：

- app 侧其余配装文案：`loadoutItemStatus.ts`（约 34 处）、`localsLoadoutPlanWorkbench.ts`（约 36 处）、`loadoutTransfer.ts`（约 8 处）、`loadoutViewModel.ts`（约 17 处）、`loadoutsPage.ts`（约 26 处）。其中 `loadoutViewModel.ts` 里的 `LoadoutCompareRow` 和 `loadoutsPage.ts` 的 `subtitle` / `statusLabel` / `preview` / `formatInGameLoadoutSlotPreview` 目前没有 UI 消费者，但 `packages/app/test/loadouts-page-workspace.test.ts` 会断言后四个，动之前先确认取舍。`loadoutActions.ts` 已由下一节处理。
- `loadoutActionFeedback.ts` 的 `actionLabels` 记录和 `getLoadoutActionButtonLabel` 无消费者，属死代码，留着没影响。
- 护甲规划器整片（`LocalPlanEditor` 的规划面板本体）。
- `join("、")` 这类列举分隔符，仍按中文习惯拼。
- 两个孤儿组件（`VaultDuplicateGroups.tsx`、`VaultTargetRulesPanel.tsx`）的去留仍未定。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 C 实施记录：配装写操作回执链 token 化（2026-10-14）

上一节把视图模型里的展示串换成了 token，写操作的回执那时还留在 app 侧。这一刀把配装写操作接进同一条链：app 出 token，UI 查表成句，Desktop 钩子只负责取 copy。

app 侧改动：

- `loadoutActions.ts` 的文案函数全部改成返回 token。`LoadoutActionMessageToken` 24 态：模板保存 / 删除 / 重命名、转移计划已复制、无目标角色、账号缺失、全部就绪、缺失件已复制、槽位动作进行中与失败、无可用动作、补齐准备、补齐步骤进度、补齐结果、单件补齐的通知 / 开始 / 取消 / 无目标 / 步骤进度 / 结果、单件装备的两类受阻与进行中、单个物品动作失败。`LoadoutConfirmToken` 4 态（槽位动作、批量补齐、单件转移、单件装备）；`LoadoutActionResultPart` 4 态（已转移 / 已自动装备 / 已准备 / 已阻断），`loadoutResultParts` 只保留非零计数。槽位动作名单独抽成 `LoadoutSlotActionLabelToken`，进度句和失败句都要复用它。角色默认模板名改由 `buildCharacterLoadoutTemplateName` 返回 `LoadoutTemplateNameToken`。
- `highestPower.ts` 的 4 个 builder 返回 `HighestPowerMessageToken`。`plan.summary`、`buildHighestPowerConfirmText`、`formatHighestPowerSource` 保持中文未动——这三个已经没有产品消费者。
- 两条「没有可用角色」的文案没有合并：`buildLoadoutTemplateTransferNoTargetMessage`（无法生成转移计划）和 `buildSingleLoadoutTransferNoTargetMessage`（无法补齐这件装备）措辞不同，中文回退要逐字一致，所以拆成 `no-target-character` 与 `single-transfer-no-target` 两个 token。
- 剪贴板文本保持中文未动：`buildLoadoutTemplateTransferClipboardText`、`buildMissingLoadoutItemsText`，理由与仓库侧的分享文本一致。

UI 侧改动：

- 新增 `packages/ui/src/loadouts/loadoutActionCopy.ts`，导出 `loadoutSlotActionLabelText`、`loadoutTemplateNameText`、`loadoutActionMessageText`、`loadoutConfirmText`、`highestPowerMessageText`。同一处补上 `loadoutText` / `loadoutTemplate` 的包入口导出：这两个函数 UI 内部一直在用，`packages/ui/src/index.ts` 却没导出，而 Desktop 已经在 import。
- 结果片段的连接符走 `loadoutText(copy, "，")`，不在渲染器里写死中文标点。步骤进度按阶段分成五条模板，用「有没有 `count` 字段」区分整段进度和单件进度。
- `packages/ui/src/i18n/copy/loadouts.ts` 的 en-US `inline` 从 756 键增到 859 键、无重复。另外补了两条纯占位骨架键 `{mode} · {stat}`、`{group} {hashes}`：key 和译文都是占位符，缺了照样渲染，但留空会让「哪些串已经入表」这件事说不清。

Desktop 侧改动：

- `useLoadoutTemplateActions.ts`、`useLoadoutWriteActions.ts` 的入参增加 `copy: LoadoutsCopy`，由 `useDesktopProductWriteActions` 传 `getLocaleCopy(interfaceLocale).loadouts`；两处内联中文和全部回执文案改成查表。
- 写操作状态条原先靠 `props.message.includes("失败")` 反推色调，英文回执里没有「失败」两个字，一换语言错误色就失灵。改成产出方直接给色调：`setLoadoutMessage(message, tone)` 多带一个参数，`useDesktopProductWriteActions` 多返回 `loadoutMessageTone`，经 provider、`LoadoutsPage` 透传到 `LoadoutsPageContentView`，Web 预览 fixture 补 `messageTone="info"`。

配套改动：

- `packages/app/test/highest-power-workspace.test.ts` 的两组断言从比对中文串改成比对 token 结构。这是更新既有断言，不是新增测试。

本切片未动，留给后续：

- `localLoadoutPlanWorkbench.ts` 的展示串目前**没有 UI 消费者**：`selectLocalLoadoutPlanWorkbench` 的结果经 `localPlanWorkspace` 传进 `LoadoutsPageContentView` 后从未被读取，`entries` / `item_rows` / `status_label` / `source_label` 都不出屏。同一文件的 `createEmptyLocalLoadoutPlanDraft` 等函数产出的方案名和 `source.label` 是写进本地存储的数据，不是临时回执。
- `未限定职业` 是 `packages/core/src/loadouts/dimImport.ts` 产出的哨兵，跟着 `class_name` 字段参与比较（`useLocalLoadoutPlans.ts` 三处）。它和「泰坦 / 猎人 / 术士」同族，而职业名本身取自游戏数据；换哨兵会动到已存方案的 `class_name`。
- **需要产品决定的一类**：方案名、装备目标名与 `note`、`guidance.warnings` / `evidence`、`source.label`，以及写进操作日志的 `verificationMessage`，都是产出入库的串。让它们跟随界面语言，等于让落盘数据带语言；不跟随，英文界面里这些位置就仍是中文。剪贴板文本已经选了「不跟随」，这一类需要同一个口径。
- `LoadoutsPageContentView` 还有两处按 `includes("失败")` 判色的地方——护甲待刷反馈和装备选择抽屉的回执。它们属于还没迁的护甲规划器那一刀，色调问题跟语言迁移一起解决。
- `loadoutItemStatus.ts`（约 34 处）、`loadoutsPage.ts`、`loadoutViewModel.ts` 的 `LoadoutCompareRow`、`loadoutTransfer.ts` 的 `describeMissingLoadoutBlockedReason`、`loadoutActionFeedback.ts` 的 `actionLabels` 都确认没有产品消费者。
- 护甲规划器整片（`LocalPlanEditor` 的规划面板本体仍在 Desktop 侧拼中文标签写进装备目标）。
- 两个孤儿组件（`VaultDuplicateGroups.tsx`、`VaultTargetRulesPanel.tsx`）的去留仍未定。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 C 实施记录：本地方案编辑器的临时回执跟随界面语言（2026-10-14）

这一刀只动「出屏即弃」的回执，落盘数据一律不碰。

- `useLocalLoadoutPlans.ts` 的入参增加 `copy: LoadoutsCopy`，由 `useDesktopProductShell` 传 `getLocaleCopy(diagnostics.languagePreferences.interfaceLocale).loadouts`；用到 `copy` 的 8 个 `useCallback` 一并补依赖（`getLocaleCopy` 返回按 locale 缓存的对象，引用稳定，不会把回调刷成每次新建）。
- 改成查表的文案：读取失败、DIM 完整链接导入失败、攻略源没有正文、攻略分析失败、未保存就执行、目标角色不在快照里、方案职业与目标角色不符、无可执行步骤与缺口列表、穿戴确认框（含缺口提示行）、执行前账号刷新与复核、执行后逐步失败与未通过核对、保存到游戏内槽位的确认框与复核、保存 / 另存 / 删除的失败兜底、DIM 预览里「有几件不属于配装槽位」的说明。
- 列表分隔符 `；` 也进表。中文用全角分号，英文用 `; `。
- `packages/ui/src/i18n/copy/loadouts.ts` 的 en-US `inline` 从 859 键增到 890 键、无重复。

这一刀划定的边界，未动并留下记录：

- 方案名（`攻略配装`、`AI 装备目标`、另存时的 `${name} 副本`）、`source.label`、`guidance.warnings` / `evidence`、`buildExecutionVerificationMessage` 与游戏内槽位保存验证文案、`未限定职业` 哨兵，全部保持中文。它们会写进本地方案或操作日志，跟随界面语言等于让落盘数据带语言；剪贴板文本已经选了「不跟随」，同类文本要同一个口径。确定口径后这批可以按同一套 token 方式再迁一遍。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 C 实施记录：护甲反馈色调与武器占位判据（2026-10-14）

护甲规划器这一刀的实际残留比预估少。`useArmorPlannerWorkspace.ts`、`armorPlannerViewModel.ts`、`armorPlannerContracts.ts` 各 0 处中文，`armorPlannerWorkspace.ts` 只有 1 处；`LocalPlanEditor` 面板文案大多早已走 `loadoutText(editorCopy, ...)`。真正要处理的只剩三处「靠中文字面判判据」的嗅探，加上一处键写错。

- `LoadoutsPage.tsx` 的 DIM 导出反馈和护甲待刷反馈原先按 `message.includes("失败")` 反推色调，英文文案里没有「失败」两个字。改成产出方直接给：状态拆成 `dimExportFeedback` / `dimExportTone`、`armorTargetFeedback` / `armorTargetTone`，两个 setter 多带一个 `tone: "info" | "error" = "info"` 参数，失败路径显式传 `"error"`。两个 `useEffect` 依赖补上 setter。
- `LoadoutsPageContentView.tsx` 新增 `localPlanDimExportTone`（必填）与 `armorTargetTone?`（可选）两个 props，`DimExportPanel` 也加 `tone` prop，两处调用点传入；`data-status` 由 props 决定，不再嗅探文案。
- 装备图标缺失时的占位字母靠 `bucketName.includes("武器")` 判断是武器还是护甲。`bucket_name` 是接口给的显示名，跟着接口语言变，只认中文的话英文账号下所有武器都会显示成 A。改为 `isWeaponBucketName()`，中英两套词都认（武器 / weapon、动能 / kinetic、能量 / energy、威能 / power、重型 / heavy）。
- `packages/ui/src/i18n/copy/loadouts.ts` 里 xiaoheihe 占位串的 key 被写成了双反斜杠 `\\n\\n`，调用点是真换行 `\n\n`，运行时永远匹配不上，英文界面这一段静默退回中文。已改回单反斜杠。扫描其余 copy 表，没有同类的双写转义。
- `packages/web/src/main.tsx` 的预览 fixture 补 `localPlanDimExportTone="info"`。

仍在护甲这一片、但这次不动的：

- `armorSlotLabel` / `armorStatLabel` 产出的装备目标数据（`name` / `bucket_name` / `tuning_label` / `note`）属于落盘写入，按上一节划的边界保持中文。
- `packages/services/src/errors.ts:57` 的 `toServiceError(error, fallbackMessage = "操作失败")` 是全应用共用的中文兜底，护甲规划处传 `"护甲规划失败"`。它属共享层、影响面覆盖所有菜单，只记录不改，留给阶段 D 统一处理。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 C 勘察记录：app 侧无消费者文案盘点（2026-10-15）

前几节多次提到「这批串没有产品消费者」，这一节是逐个符号的核对结果。结论：**确认无消费者，但本次不删**——删除属于清理动作，与语言迁移是两件事，等去留定了再单独做。核对方式是对每个符号全仓 grep（排除 `dist/`）看引用点。

确认无消费者：

- `getLoadoutActionButtonLabel`（UI 与 Desktop 各一份拷贝）。两份都只被自己引用；`useLoadoutActionFeedback.ts` 只用到同文件的 `LOADOUT_ACTION_FEEDBACK_TIMEOUT_MS` 和 `LoadoutActionFeedbackState` 类型。中文串是 `只补这一件 / 补齐中... / 已补齐 / 只装备这一件 / 装备中... / 已装备`。
- `loadoutItemStatus.ts` 的产出字段。`badge_label` / `summary_label` / `location_label` / `guidance_label` / `guidance_hint` 只有测试和 Web fixture 在引用，而 fixture 是自己另造一份 mock 对象，不是调用这个函数。共享页面 `LoadoutsPageContentView` 只从 `model.entries` 读 `source` / `characterId` / `id` 三个字段，标签类字段一个都没出屏。
- `LoadoutCompareRow`（`loadoutViewModel.ts`）与它喂的两条 `loadoutsPage.ts` 产物 `visibleCompareRows` / `visibleRows`。共享页面读的 `model` 字段是 `entries` / `selectedDetail` / `selectedEntryId`，`visibleCompareRows` / `visibleRows` 一次都没被读。桌面侧 `loadoutViewModel.ts` 只是转出口。
- `describeMissingLoadoutBlockedReason` 经 `getLoadoutItemBlockedDetails` 进模型，但该结果在 `loadoutsPage.ts:414` 取出后同样没有下游读者。
- `selectLocalLoadoutPlanWorkbench` 的整个视图模型：函数本身活着（`useLocalLoadoutPlans.ts:155`、`web/src/main.tsx:180` 都在调），但结果从 `LoadoutsMenuProvider` 一路当 `localPlanWorkspace` prop 传到 `LoadoutsPageContentView:165`，页面里除了这一行声明再无第二处引用。
- `VaultDuplicateGroups.tsx`、`VaultTargetRulesPanel.tsx`：除了自身定义和 `dist/` 产物，没有任何引用点，`packages/ui/src/index.ts` 也没导出。
- `renderer/components/DiagnosticsPanel.tsx`：组件本身没有消费者；导出的 `buildDiagnosticRows` 被 `useHomePageDerivedState.ts` 调用，但它产出的 `diagnosticRows` 在 `HomePageContentView.tsx:152` 只有类型声明、没有读取，Web fixture 也只传了 `[{ tone: "warning" }]`。整条链不出屏。

**要更正的一点**：`loadoutsPage.ts` 这个文件整体并不死。它的主选择器 `selectLoadoutsPageModel` 被 `LoadoutsPage.tsx:201` 和 Web fixture 真实使用，`LoadoutsItemStatus` 之外的模型字段（`entries` / `selectedDetail` / `selectedEntryId`）也确实出屏。此前把它整个列进「死代码」不准确，死的只是上面点名的那几个字段和辅助函数。

需要说明的另一处：`packages/services/src/errors.ts:57` 的 `toServiceError(error, fallbackMessage = "操作失败")` 是活代码，只是兜底文案是中文。它被所有菜单共用，改它属于共享层改动，不在菜单切片范围内。

另外记一笔本次勘察中发现的同类问题：`actionLogResultLabel` 有两份（`packages/core/src/actions/log.ts:156`、`diagnosticsModel.ts:268`），UI 侧 `SettingsPageContentView.tsx:682` 的 `actionLogStatusLabel` 是第三份。三份都靠 `/请求已受理|正在确认/.test(entry.message)` 判「已受理」。这条消息由主进程写进操作日志、属于落盘数据，按现口径固定中文，所以嗅探暂时稳定，**不是当前的语言 bug**。但它把日志文案和状态判定绑在一起：主进程文案一改，「已受理」就静默失灵。真要修，应该在日志条目上补一个持久化状态字段，让判定不再读文案——这属于数据模型改动，不在本次范围。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 D 勘察记录：平台壳与主进程残留规模（2026-10-15）

阶段 D 原先写的是「清理 Desktop/Web adapter 中残留的产品中文文案」，实测下来这块比一句话大得多，需要单独拆阶段。

按「非注释行里出现中日韩字符」粗筛（排除 `node_modules` / `dist`），`packages/desktop/src` 与 `packages/web/src` 合计 **1356 行、91 个文件**。最多的几个文件：Web 预览 fixture（202 行）、`ItemDetailModal.tsx`（76）、`useLocalLoadoutPlans.ts`（63，大部分是已划定的落盘数据）、`main/ipc/actions.ts`（54）、`useItemDetailWorkspace.ts`（51）、`diagnosticsModel.ts`（49，本次已处理）、`useDesktopProductShell.tsx`（46）、`useAccountWorkspace.ts`（42）。

拆开看，这 1356 行至少分四类，不能一起迁：

1. **主进程文案**（`packages/desktop/src/main/**`）。这部分经 `toServiceError` 或 IPC 返回值上屏，但主进程并不持有 `@d2-tools/ui` 的 copy 表。要让它们跟着界面语言走，得先把 locale 传进主进程，或改成主进程只回 `kind`、渲染层查表——是架构改动，不是文案替换。
2. **剪贴板与落盘文本**。`buildDataBackupGuide`、`buildActionDiagnosticText`、`buildAppUpdateDiagnosticText`、`itemShare` / `dailyShare` 一类，已按前几节的口径定为固定中文。
3. **fixture 与模拟数据**。`createVisualAppUpdateSnapshot` 的模拟状态文案、Web 预览 fixture 的示例内容，阶段 D 的约定允许它们保留。
4. **真正该迁的渲染层临时回执**。本次设置切片处理的就是这一类。

设置切片已迁（详见下一节）。剩下的第 4 类散落在 items 详情、账号、商人、资料库、主页快捷键等 Desktop 私有组件里，需要按菜单逐个做。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 D 实施记录：设置菜单的渲染层临时回执（2026-10-15）

这一刀只动设置菜单渲染层里「出屏即弃」的回执，口径与前面几节一致。

- 新增 `packages/ui/src/settings/settingsCopy.ts`，导出 `settingsText` / `settingsTemplate`，并从 `packages/ui/src/index.ts` 导出。`SettingsPageContentView.tsx` 原本私有一份 `settingsText`，改为 import 同一个实现，不留第二份定义。
- `diagnosticsModel.ts` 入参增加 `copy: SettingsCopy`；模块级函数 `loadActionLog` / `copyDiagnosticsExport` / `copyDataBackupGuide` / `copyActionDiagnostic` 也都加上 `copy` 参数。迁走 11 条：状态诊断失败、颜色模式保存失败、信息密度保存失败、语言设置已保存、语言设置保存失败、操作日志读取失败、已复制脱敏诊断导出、诊断导出失败、已复制备份/迁移说明、已复制操作诊断、复制失败请检查剪贴板权限。
- `useAppUpdateFlow.ts` 入参增加 `copy`，迁走 10 条更新流程回执与失败兜底。
- `useDiagnosticsSettings.ts` 入参增加 `copy`，透传给上面两处，并迁走 `runConfigBackupAction` 的「配置操作失败」。
- `useDesktopProductShell.tsx` 接线时有个坑：`diagnostics.languagePreferences` 要等 `useDiagnosticsSettings` 返回才有，而 copy 得在调用它之前算出来，所以这里只能取启动状态里的 `props.state.languagePreferences.interfaceLocale`。文件里原有的「copy 必须在使用点之前声明」注释就是提醒同类问题。
- `packages/ui/src/i18n/copy/settings.ts` 的 en-US `inline` 从 372 键增到 394 键、无重复。

有意留在中文的：

- `buildDataBackupGuide`、`buildActionDiagnosticText`、`buildAppUpdateDiagnosticText`：复制到剪贴板的文本，按前面的口径不跟随界面语言。
- `createVisualAppUpdateSnapshot`：视觉测试模式的模拟快照，只在 `VITE_D2_VISUAL_UPDATE_STATUS` 下生效，属于允许保留中文的 fixture。
- `actionLogResultLabel`：只服务于剪贴板诊断文本，且判定要读主进程写的日志消息，理由见上一节。

顺带发现：`renderer/components/DiagnosticsPanel.tsx` 整个组件没有消费者，只有它导出的 `buildDiagnosticRows` 被 `useHomePageDerivedState.ts` 调用；而 `buildDiagnosticRows` 产出的 `diagnosticRows` 在 `HomePageContentView.tsx:152` 只有声明、没有任何读取，Web fixture 还只传了 `[{ tone: "warning" }]`。也就是说这个面板以及它喂给首页的那批标签同样不出屏，归入上一节的死代码盘点。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 D 实施记录：配装页死代码清理（2026-10-15）

上一节的盘点里，配装页那条链最长，这一刀把它清掉。核实手段是全仓 grep 逐个符号、排除 `dist/`，并区分只撞到子串的误命中——比如 `LoadoutItemStatus` 会命中 `ApplicationLoadoutItemStatus`，那是另一套还活着的类型。

清掉的内容：

- `packages/app/src/workspaces/loadoutItemStatus.ts` 整文件（`LoadoutItemStatus` / `LoadoutStatusSourceItem` / `buildLoadoutItemStatus` / `summarizeLoadoutItemStatuses`）。它产出的 `badge_label` / `summary_key` / `summary_label` / `location_label` / `guidance_label` / `guidance_hint` 都没有界面读取点。
- `loadoutsPage.ts` 里的产出字段：workspace 侧的 `statusSummary` / `visibleCompareRows` / `readyCount` / `actionableCount`，model 侧的 `riskSummary` / `compare`，以及 `LoadoutTemplateItemRowView` / `LoadoutRiskSummaryView` / `LoadoutCompareView` 三个类型。`itemRows` 只服务本地模板分支，而界面读的是游戏内槽位分支的 `InGameLoadoutItemRowView`，后者保留。
- 连带函数：`getLoadoutItemStatus`、`getLoadoutItemBlockedDetails`、`buildLoadoutTemplateItemRows`、`buildLoadoutActionFeedbackKey`。
- `loadoutViewModel.ts` 的对比行系列：`LoadoutCompareRow` / `LoadoutCompareCell` / `buildLoadoutCompareRows` / `isTemplateItemReady`，以及只服务它们的 `loadoutCompareSlotKey` / `formatLoadoutCompareItem`。界面上那张对比表用的是 `applicationLoadoutWorkspace.ts` 的 `ApplicationLoadoutCompareRow` 和 `ApplicationLoadoutCompareViewModel`，与这套同名但不相关，保留。
- `loadoutTransfer.ts` 的 `describeMissingLoadoutBlockedReason` / `MissingLoadoutBlockedDescription`，以及 `loadouts.ts`、Desktop `renderer/utils/loadoutTransfer.ts`、Desktop `features/loadouts/loadoutViewModel.ts` 里对应的转出口。
- 测试：删 `packages/desktop/test/loadout-item-status.test.ts`（整个文件只测被删的两个函数）；`packages/app/test/loadouts-page-workspace.test.ts` 删掉 `getLoadoutItemStatus` / `getLoadoutItemBlockedDetails` 的断言和 workspace 死字段断言；两个 `loadout-transfer-*.test.ts` 删掉「maps blocked reasons into player-facing guidance」用例。

要更正的一点：`formatLoadoutComparePerks` 名字里带 compare，实际是 `buildMissingLoadoutItemsText` 用它拼缺失清单里的 `Perk：` 那一行，所以函数保留，只是不再对外导出。

`loadoutsPage.ts` 从 533 行降到 380 行。

这一刀没动、只做记录的：

- `LoadoutsPageInput` 的 `showDiffOnly` / `compareTemplateId` 现在只喂 workspace 里已经没有消费者的字段，属于死入参。删它们要连着改 Desktop `LoadoutsPage.tsx`、Web `useWebFixtureRuntime.ts` 和 `useLoadoutTemplates.ts` 三处调用点，不在这一刀范围。
- `LoadoutEntryView` 的 `subtitle` / `statusLabel` / `statusTone` / `preview`，以及只服务 `preview` 的 `formatInGameLoadoutSlotPreview`。界面读 `LoadoutEntryView` 只取 `id` / `source` / `title` / `slotIndex` / `characterId` / `slot.item_count` / `sourceLink`。留着的原因是 app 层测试还在断言这四个字段，删法要连测试口径一起定。
- `LoadoutsSelectedDetailView` 里 `local-template` 分支除 `template` 外的 `analysis` / `transferPlan` 同样没人读，但 `kind` 判别本身仍在用。
- 首页的 `diagnosticError`：`HomePageContentView.tsx` 和 `HomePageDashboard.tsx` 里声明了却没有读取点。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

### 阶段 D：平台收口与门禁

- 清理 Desktop/Web adapter 中残留的产品中文文案。
- 增加静态检查或质量门禁：允许游戏数据、外部引用和明确标记的 fixture 保留中文；未标记的产品可见文案不得新增中文硬编码。
- 在明暗主题和窄屏下分别验收语言切换，重点检查英文文本变长后的溢出、截断和按钮布局。

#### 阶段 D 勘察记录：渲染层残留分布（2026-10-15）

`packages/desktop/src/renderer` 下（不含测试）仍有 1048 行含中文，按文件排下来：

| 区域 | 主要文件 | 约计 |
|---|---|---|
| 装备详情 | `shared/components/ItemDetailModal.tsx` 94、`shared/hooks/useItemDetailWorkspace.ts` 93、`shared/components/item-detail/buildWeaponDetailView.ts` 73、`shared/hooks/useItemDetail.ts` 35、`ItemDetailStats.tsx` 27、`HomePageItemDetailModal.tsx` 27 | 约 300 |
| 配装 | `features/loadouts/useLocalLoadoutPlans.ts` 84、`useLoadoutWriteActions.ts` 46、`LoadoutsPage.tsx` 22 | 约 150 |
| 账号 | `features/account/useAccountWorkspace.ts` 62、`accountLoadError.ts` 15 | 约 80 |
| 主页外壳 | `pages/useDesktopProductShell.tsx` 57 | 约 60 |
| 设置 | `features/settings/diagnosticsModel.ts` 50、`useAppUpdateFlow.ts` 35 | 约 85（多为剪贴板、落盘和 fixture，已判不迁） |
| 资料库 / 商人 / 仓库 | `useLibraryWorkspace.ts` 19、`useVendorsWorkspace.ts` 15、`useVaultWriteActions.ts` 15 | 约 50 |

下一步按这块切（括号里是 2026-10-15 的状态）：

1. **装备详情**（已完成）：`shared/` 下的整套，改动面最大，且 `shared/` 是共享层，要单独立一轮。
2. **账号 + 主页外壳**（已完成）：`useAccountWorkspace.ts` 的错误与回执、`useDesktopProductShell.tsx` 的状态说明。
3. **配装剩余**（核对后确认无需再做）：`useLocalLoadoutPlans.ts` 与 `useLoadoutWriteActions.ts` 里还没 token 化的部分。实测两个文件剩下的中文是 `未限定职业` 哨兵、`source.label`、`guidance` 证据与警告、方案名 fallback 这些落盘文本，按「落盘文本固定中文」的口径不迁；`useLoadoutWriteActions.ts` 的展示串已全部走 `loadout*` 查表。
4. **资料库 / 商人 / 仓库**（已完成）：仓库核对后无需再动，资料库与商人见下一节。
5. **主进程**（未动）：先把 locale 传进主进程，或让主进程只回 `kind`，再谈文案。

前四步只动渲染层，第 5 步是架构改动，要单独评估。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 D 实施记录：装备详情切片（2026-10-15）

装备详情这一片迁完，剩下的是设计上不该迁的部分。

护甲那一份（`shared/components/item-detail/buildArmorDetailView.ts`）8 处展示串改查表，入参和三个内部函数改成接收 `copy`，文件本地那份护甲属性名表删掉——`packages/ui/src/item-detail/itemDetailLabels.ts` 里已有一张逐字相同的 `armorStatLabel`，两处重复合成一处。两个调用点（`ItemDetailModal.tsx`、`HomePageItemDetailModal.tsx`）补 `copy`。

武器那一份（`buildWeaponDetailView.ts`）改动更大，因为它把三张措辞表直接写死在文件里：

- 元素名（动能 / 电弧 / 烈日 / 虚空 / 冰影 / 缚丝）、勇士名（反屏障 / 反过载 / 反势不可挡）和勇士效果名（贯穿护盾 / 干扰 / 眩晕）迁进 `itemDetailLabels.ts`，新增 `weaponDamageLabel` / `weaponChampionLabel` / `weaponChampionEffectLabel` 三个查表函数，`WeaponDetailContent` 改读它们。
- 为此 `packages/app` 的 `WeaponDetailChampionEffect` 不再带 `label` / `effect_label` 两个成品串，改成 `key` + `effect_key`；`WeaponEnhancementSummary` 新增 `empty` 布尔，空强化槽的「未强化」由 UI 现查；`WeaponDetailDamage.label` 变成可选，元素名认得出时由 UI 查表，认不出时退回数据自带的名字。
- 版本列表的 `版本 N`、`专家`、`当前版本`，推荐卡的 `{purpose} Perk 池` / `{purpose} 武器推荐`，属性浮层的 `当前配置` 全部改查表；`buildWeaponDetailView` / `buildWeaponRecommendationViews` 增加 `copy` 入参。
- `instance.damage_type` 枚举值到元素 key 的映射提成 `damageTypeKeyByEnumValue` 一张表，元素名不再在这里拼。

`通用`、`未强化`、`当前配置` 三个 key 表里早有，直接复用；en-US 表本次新增 23 键。`packages/desktop/test/weapon-detail-view.test.ts` 的 5 个调用补 `copy`。

这一片没动的：

- `damageKey()`、`plugHasSemanticType()`、`extractDisplayedLevel()`、`normalizePerkVariantName()` 里的中文正则读的是游戏数据原文，只做判定、不产出展示串。
- `ItemDetailModal.tsx` 的「手动重读没有返回详情」写进 `write-action-debug.json`；`HomePageItemDetailModal.tsx` 的商人属性、武器数值两张表是游戏数据标签到字段 id 的反查，都不跟随界面语言。
- `features/loadouts/LoadoutsPage.tsx:531` 还有第三份私有 `armorStatLabel`，属于配装菜单，留给那一切片。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 D 实施记录：账号菜单的状态条回执（2026-10-15）

账号这一片迁完，动的是三个文件。

`packages/ui` 侧得先有个 desktop 能用的查表入口：`accountText` 原先只是 `AccountPageContentView.tsx` 里的模块私有函数，落到新文件 `packages/ui/src/account/accountCopy.ts` 并导出（同时补了 `accountTemplate`），`AccountPageContentView.tsx` 改成 import。

`features/account/useAccountWorkspace.ts` 里约 30 处展示串接上 `copy`，`copy` 取自 `input.state.languagePreferences.interfaceLocale`。`formatCachedTime`、`formatAccountWorkspaceWarnings`、`formatAccountWarningSource`、`formatAccountRefreshFailurePrefix`、`formatAccountSyncMessage` 五个模块级函数改成接收 `copy`；`formatCachedTime` 另外接收 `locale`，时间格式不再写死 `zh-CN`。同目录的 `accountLoadError.ts`（`formatAccountLoadFailure`、`accountErrorText`）和 `loginErrors.ts`（`formatBungieLoginError`）也补了 `copy` 参数。

没动的：`workspace.error`、`derived.error?.message`、`blockingIssue.message` 和 Bungie 返回的原文都是上游透传，这里只做拼接、不翻译。

en-US 表新增 48 键。zh-CN 表按现有风格同步填了 key=值：查不到会回落 key 本身，填与不填结果相同，填是为了两张表的 key 集合对得上。这 48 键里包含 `；` 和 `，` 两个分隔符——`formatAccountWorkspaceWarnings` 的 join 和 `formatAccountSyncMessage` 的 `changes.join` 之前写死中文标点。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 D 实施记录：主页外壳的状态条文案（2026-10-15）

这一片只动 `pages/useDesktopProductShell.tsx`，外加 `packages/ui` 侧的查表入口。

`ShellCopy` 原来是结构化字段加函数（`update.available(version?)` 那一套），这次在顶层补一张 `inline: Record<string, string>`，跟 `account` / `settings` 的范式对齐。选表不选字段，是因为这批文案基本是零散的状态短语和按钮名，逐条设计字段只会把类型撑大。新建 `packages/ui/src/shell/shellCopy.ts` 导出 `shellText` / `shellTemplate`，`packages/ui/src/index.ts` 一并导出——`assistantText` 那套仍在 `assistant` 子对象里，没跟着挪。

文件里接的 copy 是 `getLocaleCopy(productPreferences.interfaceLocale).shell`，跟已有的 `homeCopy` / `vaultCopy` 并排。改的地方：5 个页面头部按钮（重新登录 Bungie、同步账号数据、重新检查资料库、修复资料库、刷新商人库存）、`buildShellStatus` 里账号 / 资料库 / AI 三项的 `label` 和 `value`，以及 `formatAccountShellStatus`、`formatAccountAge`、`formatManifestShellStatus`、`formatManifestTaskPhase` 四个模块级函数改成收 `copy`。

三处 `interfaceLocale === "en-US" ? ... : ...` 全部收掉：`formatManifestShellStatus` 两处（重试、更新 / 准备中），`formatManifestTaskPhase` 那张 9 项双表。后者现在只留 phase → key 的映射，查表交给 `shellText`；phase 认不出时仍返回 `undefined`，跟上一条调用链「拿不到 phase 就退回按 availability 判断」的行为一致。

en-US 表新增 47 键，zh-CN 侧同步填 key=值——这 47 键含 5 个按钮名、状态值（已配置 / 未配置 / 可同步 / 未登录 / 增强数据异常等）、`formatAccountShellStatus` 的全部返回串、manifest 状态（等待重试 / 后台更新 / 准备中 / 读取中 / 未准备 / 需修复 / 可更新 / 可用）、`{count} 秒 / 分钟 / 小时` 三个模板和 9 个 phase 标签。品牌名（Bungie、AI）和版本号没进表。

改完这个文件里剩下的中文只有 `formatManifestTaskPhase` 里 phase → key 映射表的 9 个键，不是展示串。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 D 实施记录：资料库与商人菜单（2026-10-15）

两块都是给菜单目录做同样三件事：在 `packages/ui` 建查表入口、给 Desktop 的 hook 收入参、把展示串换成查表。

资料库新建 `packages/ui/src/library/libraryCopy.ts`（`libraryText` / `libraryTemplate`），`useLibraryWorkspace` 的入参加必填 `copy`，13 处展示串改查表：实时状态查看与搜索失败、关联装备读取失败、别名保存与失败、收藏与取消收藏失败、两处「运行时合同过旧」提示，以及 `buildVendorPathAvailability` 的 `label` / `description` 和 `paths.join` 的分隔符 `；`。这个文件里只剩 `console.warn("资料库社区推荐匹配失败：", error)` 是中文，属日志不迁。

商人新建 `packages/ui/src/vendors/vendorCopy.ts`。`useVendorsWorkspace` 加必填 `copy`，连同 `resolveVendorRefreshState` 合计 13 处展示串改查表，`resolveVendorRefreshState` 跟着加第 4 参 `copy`，`error` 从可选改成必填（调用点显式写 `undefined`）。原先两处把「继续显示上次库存。」和 `error.message` 拼成一句的写法，合成一个 `继续显示上次库存。{message}` 模板——前一处还带「有没有缓存快照」的条件分支，改成两条完整句子后分支仍在，只是不再拼前缀。`useVendorDefinitionDetail` 也加了 `copy`，5 处改查表（`异域`、`商人售卖`、`资料库定义读取失败`、两个 AI 分析失败）。`异域` 在 `account` 表里已有一份 `Exotic`，这里按各菜单各自的表再放一份：两张表互不引用，跨表复用会把两个菜单的文案耦在一起。

测试文件跟着改签名，没有新增用例：`vendors-page-ui.test.tsx` 的 8 个 `useVendorsWorkspace` 调用和 2 个 `useVendorDefinitionDetail` 调用补 `copy: getLocaleCopy("zh-CN").vendors`，`vendors-ipc.test.ts` 的 2 个 `resolveVendorRefreshState` 调用补第 4 参。取 zh-CN 是为了让原有的中文断言继续成立。

仓库这块核对后不需要再动：`useVaultWriteActions.ts` 的展示串已全部走 `vaultText` / `vaultTemplate`，目录里剩下的中文是注释。

en-US 表新增 30 键（资料库 13、商人 17），zh-CN 侧同步填 key=值。两个 hook 的 `copy` 都在 `useDesktopProductShell.tsx` 里就近声明（`libraryCopy`、`vendorsCopy`）。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 D 实施记录：查表 key 缺口（2026-10-15）

这一片是拿脚本扫出来的，不是靠人眼读文件。做法是把渲染层、Desktop 和 Web 里所有 `xxxText(copy, "字面量")` / `xxxTemplate(copy, "字面量", ...)` 的 key 抽出来，跟对应 copy 表的 key 集合做差。查出 66 条：资料库 44、装备详情 6、主页 12、设置 8、仓库 2。

这类缺口的症状是静默的。查表函数是 `copy.inline[key] ?? key`，zh-CN 侧 key 就是中文原文，查不到也看不出问题；只有切到英文界面才回落成中文。所以缺口攒到多少都不会有报错提示。

补齐方式按各表本来的风格走：zh 侧留空的（主页、装备详情、设置、仓库）只补 en-US；资料库那 6 条护甲属性（机动、韧性、恢复、纪律、智慧、力量）走 `libraryText`，跟其余 44 条一起补 en-US。

资料库的护甲属性标签另有接线问题：`LibraryPageContentView.tsx` 里护甲属性名直接渲染 `vendorArmorStatDefinitions` 带来的 `stat.label`，没进查表。改成 `<span>{libraryText(copy, stat.label)}</span>`，那 6 条 key 就是这么来的。

缺口归零后复查一次，确认没有新的字面量查表 key 落在表外。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 D 实施记录：Web 预览壳的页面头部与 DIM 回执（2026-10-15）

`packages/web/src/main.tsx` 里还有两处产品文案，都在 `getWebPageHeader` 和 DIM 导出回执上。

页面头部的 6 个按钮（账号两项：重新授权、刷新账号；仓库：刷新账号装备；资料库两项：重新检查资料库、修复资料库；商人：刷新商人库存）改成走 `shellText`。这批 key 里三个是这次新加的：`shell.ts` 的 zh-CN 与 en-US 两侧各补 3 键（重新授权、刷新账号、刷新账号装备），另外三键两侧本来就有。两侧都填是因为这张表本来就是 key=值风格。

DIM 导出回执两条（复制成功带件数、复制失败带错误原文）改走 `loadoutTemplate`，key 取 `loadouts` 表里现成的 `已复制包含 {count} 个真实实例的 DIM 链接。` 和 `DIM 链接复制失败：{error}`。取 locale 时用 `preferences.interfaceLocale`，不能用局部变量名顶替。

文件里剩下没迁的中文属 Web 预览的模拟数据：`喂食狂热`、`Web fixture 模型列表。`、`预览数据`、`副本`、`Web mock 会话`、`${entryLabel}中的账号装备实例。`、`异域`、`商人售卖`。这些是 fixture 或 mock 会话内容，按下面的边界保留。

#### 阶段 D 实施记录：硬编码中文静态门禁（2026-10-15）

新增 `scripts/check-i18n-hardcoded.mjs`，挂进 `package.json` 的 `i18n:hardcoded:check`，并由 `test:quality` 调用，跟 `check-ui-contract.mjs` 并列。

门禁只认两种形状，因为只有这两种能确定是渲染出来的可见文案：

1. JSX 文本节点里直接写的中文，`<button>刷新账号</button>` 这种；
2. `aria-label` / `aria-description` / `title` / `placeholder` / `alt` 五个展示属性上直接写的中文。

改法也只有一种：套 `{xxxText(copy, "中文原文")}`。形状单一，报出来就是真问题。

前面试过两版更宽的扫描，都作废了。第一版按行剥注释再剥查表 key，误报 912 条——单行 `/** ... */` 块注释没剥掉，别名 `text(` / `template(` 也认不出。第二版改成「字面量必须在某张 copy 表里出现过才放过」，误报 493 条——模板串里嵌的 `libraryText(copy, "...")` 被整体当成一个候选，fixture 目录、正则字面量、`data-*` 和 `kind:` 赋值也跟着报。误报堆在 CI 里只会变成噪音，最后收窄到上面两种形状。

扫描范围是 `packages/ui/src`、`packages/desktop/src/renderer`、`packages/web/src`，只扫 `.tsx`，跳过 `dist`、`node_modules`、`test`、`__tests__`、`fixtures` 目录，另跳过路径含 `/fixtures/` 的文件。脚本里有跨行块注释的状态机，拼装型文案（模板串带 `${}`）留给 review，不做模糊匹配。

实测两份数据：全仓跑一遍 0 命中；植入 `<div aria-label="临时探测属性">临时探测文本</div>` 后准确报 2 条。探测代码没留在仓库里。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 D 实施记录：Desktop 渲染层剩余展示串与助手页面上下文（2026-10-15）

**一、渲染层剩余硬编码**

- 日报摘要钩子 `useDailySummary` 改收 `{ copy: HomeCopy }`，7 处展示串（情报读取失败、已复制本周重点、复制失败提示、每日 / 每周重置标签、两条倒计时模板）改查表。新建 `packages/ui/src/home/homeCopy.ts`（`homeText` / `homeTemplate`），`HomePageContentView` 本地那份同名函数改成 import 同一实现，`HomeCopy` 与查表函数从 `@d2-tools/ui` 导出。
- `packages/desktop/src/renderer/utils/itemActions.ts` 的 `resolveItemTransferCharacterId` 加 `ItemDetailCopy` 入参，两条移仓失败提示改查表，两个调用文件补实参；`ItemDetailModal` 的配装草稿名走 `itemDetailTemplate`。
- en-US 表：home 7 键、itemDetail 3 键。zh 侧不动。
- `packages/desktop/test/item-actions.test.ts` 的 4 个调用补 zh-CN 的 `copy`，只改签名。

**二、助手页面名与页面分析重点**

原先上下文里的 `page_label` 和 `focus` 是 `packages/app` 产出的中文原文，经 `assistantContext` 直接上屏。改法：

- `shell.ts` 的 `assistant.inline` en 侧补 8 键，key 就是 `homePageFocus` 的 8 句中文原文（必须逐字一致，含「仄商人库存」这类原文用词），值是英文。zh 侧留空。
- `assistantContext.ts` 新增 `resolveAssistantPageLabel(shell, value)`：用 `shell.navigation[key]` 出页面名，值不是 8 个页面 key 时（旧会话记录里存的中文页名）原样返回，绝不拿去查表。页面名不在 `shell.inline` 里而在 `shell.navigation`，所以走后者。
- `AiAnalysisPanel.tsx` 的上下文条与 `pageLabel` 改用 `page_key` 出文案，`focus` 走 `assistantText`；会话历史在传给视图前逐条把 `page_label` 解析成文案；保存会话时改存 `page_key`。`AiPage.tsx` 的未配置分支同样处理。
- 上下文类型没改：`page_label` / `focus` 还要喂给 AI 提示词并写进落盘快照，属数据不算界面文案；`page_key` 本来就已产出，删字段还会连带破坏 `architecture-maintenance.test.ts` 对 `homePageLabels` 的断言。`assistantHistory.ts` 的字段名不动，只加注释说明新记录写页面 key、旧记录里的中文是已落盘数据只能原样显示。

这个改法有个已知代价：查表 key 是 app 侧那 8 句中文原文，谁改了那句中文，en 键就静默失效、英文界面退回中文。同类风险已由 `scripts/check-i18n-hardcoded.mjs` 之外的另一套扫描（字面量 key 与表比对）覆盖不到，因为这里是变量查表。留作已知项。

**三、报告未处理**

`homePageMetaMap` / `resolvePageMeta` 有真实调用链（`homePage.ts` → `useHomePageDerivedState.ts` → `useDesktopProductShell.tsx` 的 `pageHeader.title/subtitle`），但 `ProductShellHost.tsx` 会用自己的 `productPageHeaderMeta(shellCopy, activePage)` 覆盖标题与副标题、只取外部传来的 actions，这张中文表实际不出屏。按「本轮只记录不删除」处理。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 D 实施记录：商人菜单的 app 侧文案缺口（2026-10-15）

商人菜单的漏译不在渲染层——`VendorsPageContentView.tsx` 早就按「原文当 key」查表，缺的是表里没有这些 key。补法分两半：

- 表侧：`vendors.ts` zh 侧 +62 键、en 侧 +59 键（`属性读取中` / `部分详情失败` / `详情失败` 三条 en 侧本来就有）。渲染处接查表的点包括分节标题与分组名、来源、重置时间回落、刷新标签、状态标签、账号范围标签、当前机灵、库存摘要、单条摘要、账号拥有状态、来源路径、状态横幅。
- app 侧只动一处：`createVendorOfferOwnership` 里 4 条带计数的 `ownership.label`，由模板串拼计数改成 `{count}` 模板（`账号有 {count} 件同身份装备` 这一类），计数语义在渲染层拿不到，拼完就无法整串查表。
- `getVendorSectionTitle` 的 4 条硬编码分支加 `return section.name` 收敛成一个 `vendorsText(copy, section.name)`。`vendorStructure.ts` 的 `sections[].name` / `groupRules[].name` 不用动，加 key 即可命中。
- 地点名（`高塔` / `月球` 等）保留：它们参与 Manifest 地点名匹配。

**当时留了尾巴**：三处带计数的复合句（`N 个角色的属性与插槽详情读取失败`、状态横幅里两条 `N 个角色商人列表读取失败` / `N 个商人详情读取失败`、子库存描述的 `N 个入口` / `N 件`）由 app 拼成整串，渲染层拿不到计数，英文界面下仍显示中文。这三处由下一节处理。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 D 实施记录：商人复合句改成 token（2026-10-15）

上面留的三处尾巴有同一个毛病：app 侧把计数拼进整句，渲染层只拿到成品串，查表查的是「3 个角色商人列表读取失败」这种一次性字符串，表里不可能有。改法是让 app 只产出 `key` 和计数，成句交给渲染层，和仓库、配装那几片用的是同一个范式。

- `vendorsPage.ts` 新增 `VendorTextTokenWorkspace = { key: string; count?: number }`。三处字段换成它：`VendorContentSectionWorkspace.description` 由 `string` 变单个 token，`VendorInventoryGroupWorkspace.detailFailureMessage` 与 `VendorStatusBannerWorkspace.message` 由 `string` 变 token 数组。
- `getVendorDetailFailureMessage()`：只有一条失败时把上游的错误文案原样包成 `[{ key: failures[0].message }]`；多条时给 `{ key: "{count} 个角色的属性与插槽详情读取失败", count: N }`。上游文案仍然透传，不翻译。
- `createStatusBanner()` 所有分支统一返回数组，原来用 `；` 拼两条汇总的写法去掉。子库存描述同样改成 `{count} 个入口` / `{count} 件`。
- `vendorStructure.ts` 新增 `mergeVendorDetailFailureMessages()`，替掉两处 `map(...).filter(...).join("；")`。它只摊平 token，不再拼串。
- `vendors.ts` 里与这处相关的键共 6 条：三条带计数的失败汇总（`{count} 个角色商人列表读取失败` / `{count} 个商人详情读取失败` / `{count} 个角色的属性与插槽详情读取失败`）、分隔符 `；`（en 侧是 `"; "`）、`{count} 个入口`、`{count} 项`。分隔符进表是因为它跟界面语言走。
- 渲染层：`VendorsPageContentView.tsx` 新增 `VendorTextTokenView`，以及模块级 helper `vendorTextTokenText()`（有 count 走 `vendorsTemplate`，否则 `vendorsText`）和 `vendorTextTokensText()`（用 `vendorsText(copy, "；")` 拼数组）。状态横幅、详情失败提示、子库存描述和列表搜索都改走它们。

测试跟着契约改，没新增用例：`packages/app/test/vendorsPage.test.ts` 与 `packages/ui/test/vendors-page.test.tsx` 的断言改成比对 token 结构，`packages/desktop/test/vendors-page-ui.test.tsx` 那条状态横幅断言也从字符串改成 `[{ key: "新账号商人数据读取失败" }]`。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 D 实施记录：Web 预览壳的降级快照本地化（2026-10-15）

Web 壳在后端 `/api/home-snapshot` 拿不到数据时会自己造一份兜底快照。这份快照原来是模块级 const，串写死中文，切英文也照样出中文。

- 改成工厂 `createUnavailableHomeSnapshot(copy)`。入参类型 `WebSnapshotCopy = { home: HomeCopy; shell: ShellCopy }` 是结构类型，`webAdapter.ts` 对 `@d2-tools/ui` 只做 `import type`，不引入运行时依赖——`webApi.ts` 跑在 Node 侧，value-import 会连带拉进 React。这与主进程另起 `mainCopy.ts` 是同一个约束，但这次不用重复维护表，只借类型。
- `createWebSnapshotProvider` / `createWebShellAdapter` 的入参新增必填 `copy`，两处兜底改调工厂。跑在 Node 侧的 `webApi.ts` 同样把 copy 放在第一位：`createWebApiRouter(copy, provider = {})`。
- `main.tsx` 用 `useMemo` 按 `preferences.interfaceLocale` 重建 `localeCopy` 和 `unavailableSnapshot`，adapter 的 `useMemo` 依赖跟着加上这两项。
- `home.ts` en 侧新增 11 键：`Web 服务未连接。` / `Web 服务未连接` / `资料库服务未连接` / `日落数据不可用` / `轮换突袭不可用` / `轮换地牢不可用` / `本周活动挑战不可用` / `活动激涌不可用` / `限时活动不可用` / `铁旗状态不可用` / `无法读取`。快照顶部状态条的 `服务未连接` / `不可用` 两条在 `shell.ts` 两侧各补一版。zh 侧 `inline` 仍留空，key 就是中文原文。

顺带两处修正：一是这份快照原先用的 `读取失败` 与首页其它兜底串的 `无法读取` 不是同一个 key，迁移时被统一成了前者，这会悄悄改掉 zh-CN 下的措辞，已改回 `无法读取` 并补键；二是 Web 壳没跟上 `packages/ui` 早先给 `ShellSidebarAccountSummary` / `ShellSidebarActions` 加的必填 `copy`，`main.tsx` 两处补上。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 D 实施记录：更新进度组件的内联双语（2026-10-15）

`packages/ui/src/update/SystemUpdateProgress.tsx` 一直拿着 `interfaceLocale` 自己写双语：进度条的 `aria-label`（更新处理中 / 更新进度：N%）、后台任务 Dock 的「另有 N 项」、字节进度的「已下载 X」。四处调用点（资料库、设置两处、AppShell）都传了 `interfaceLocale`，所以切英文时这几句还是中文。

改法是往 `shell` 表的 `inline` 补 4 键（更新处理中、更新进度：{progress}%、另有 {count} 项、已下载 {bytes}），组件内部取 `getLocaleCopy(props.interfaceLocale ?? "zh-CN").shell`，`formatProgressMetrics` 多收一个 `copy`。四处 `interfaceLocale === "en-US" ? ... : ...` 收掉。

这几句之前没进过 copy 表，静态门禁也抓不到——它们不是 JSX 文本节点，是三元里的字符串字面量。测试里没有断言过这几句，所以改动对现有用例无影响。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 D 实施记录：主进程用户可见文案（2026-10-15）

主进程原来有一批不管界面语言是什么都显示中文的文案：原生文件对话框标题与筛选项、后台任务标题与进度、更新卡片的用户提示。它们不像错误文本那样有「要不要改成 code」的问题，纯属没翻译。

**为什么不用「把 locale 传进主进程」**：不需要走 IPC 传。界面语言是持久化配置 `features.interface_locale`，主进程本来就每次都 `loadConfig()`，直接读即可，没有跨进程契约改动。

**为什么另起一张表**：`packages/ui` 的 exports 只有 `.` / `./fixtures` / `./styles.css`，根入口带 React peerDependency，而 `typecheck:desktop` 只构建 core / http / services / app、不构建 ui。主进程 value-import 它会连带拉进 React，所以 `packages/desktop/src/main/i18n/mainCopy.ts` 自己带一张 en 覆盖表，**key 就是中文原文**（zh-CN 侧不维护表），查不到退回 key。译法优先照抄 `packages/ui/src/i18n/copy/` 里已经出现的同义句，避免同一句话两种英文。这是有意的重复，代价是两边可能漂移。

**`currentMainLocale()` 的代价**：它每次调用同步读一次 config.json（`loadConfig` 无缓存）。所以取值策略是——调用点已经拿到 `config` 就直接用 `config.features.interface_locale`；一个函数里多处用先取一次存局部变量；下载进度这类高频回调在任务开始时取一次并缓存在模块级变量，回调里不再读 config。

**接线范围**：8 处 dialog 调用（19 条字符串，含 `main.ts` 启动失败的错误框）、10 处 `startBackgroundTask` 的 title / message、8 处任务 `update({message})`、`updates.ts` 的 `user_message` 与 `update_source_label`、`community.ts` / `config.ts` 返回给界面显示的 `message`、`heavyTaskWorker.ts` 里会进任务快照的 13 条进度文案（语言取 `workerData.config.features.interface_locale`，不额外读 config）。en 表 86 键。

**顺带修掉一个回归风险**：`restorePersistedUpdateSnapshot` 原先用 `state.update_source_label?.includes("镜像")` 判断持久化的镜像源；标签翻译后英文不再含「镜像」，恢复逻辑会失效。改成中英两种标签等值比较。

**没迁**：`throw new Error("中文…")` 与 `createServiceError` 的 message（见下节口径问题）、`console.*` 与 worker 日志、`defaultPath` 文件名与 CSV 内容、`phase` / `type` / `status` 等参与比较或查表的值、`packages/desktop/src/shared/updateError.ts` 的 `normalizeUpdateError`（不在主进程目录内）。`wishlist.ts` 没有返回给界面显示的 `message` 字段，未改。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 D 登记：本轮不迁的剩余项（2026-10-15）

这些是核对后判定保留的，不是忘掉，写在这里以免后面重复排查。

- `packages/services/src/errors.ts:57` 的 `toServiceError` 中文兜底：4 个调用点全部传 `""`，`packages/desktop/src/contracts/errors.ts:37` 的注释写明「兜底文案留空：这一层不知道界面语言，渲染层会按 `code` 或 copy 出文案。」主进程与契约层的架构已经就位，这行兜底不会出屏。
- AI 能力层的 `descriptor.title` / `descriptor.description`：全仓没有读取点，属死元数据。同层的 capability `failedResult` 消息与 `assistantPrelude` 的 warnings 也不在 `AiAssistantPanelView.tsx`、`AiAnalysisPanel.tsx`、`AiPage.tsx` 渲染。不上屏就不迁。
- `packages/web/src/webAdapter.ts` 的降级快照原先按「模块级 const 不好本地化」登记为不迁，本轮已改成工厂迁完（见上一节）；`预览数据` 这个 fixture 状态值原先也在这条里，实跑后判定过于显眼，已收进 `shell` 表迁完。Web 壳剩下保留的是 fixture 与 mock 串（`Web mock 会话`、`Web fixture 模型列表。` 等）和 `main.tsx` 里按 `name.endsWith("副本")` 判重的落盘哨兵——`packages/web` 是预览壳，这些串不出真实产品界面。
- `packages/ui/src/media/GameCombatIcon.tsx` 的中文表（中文反查表，不是展示串）、`packages/ui/src/time/formatTime.ts` 的 `defaultFallback`（该分支不可达）同样保留。
- `packages/app/src/workspaces/accountPage.ts:537` 的 `|| \`位置 ${bucketHash}\``：`bucketLabels`（`packages/core/src/items/classification.ts:42-75`）的键已经涵盖 `accountEquipmentBucketHashes` 的全部 8 个哈希，`limit?.bucket_name` 再兜一层，这条分支不可达，与 `formatTime.ts` 的 `defaultFallback` 同类。
- `accountPage.ts` 里只被测试断言、界面不读的两个字段：`selectedCharacterSummary`（`:377`，合成串 `光等 2015 / 已装备 1 件 / 背包 1 件`，只有 `account-page-workspace.test.ts:131` 读）与 `AccountCharacterDetailView.lightLabel`（`:443`）。UI 侧读 `selectedCharacter` 只取 `characterId` / `className` / `power`（`lightLabel` 与它同级的 `summary` 都没有读取点）。

**还差一步、需要先定口径的两类：**

- **主进程抛出的中文错误文本**：`packages/desktop/src/main`、`packages/services`、`packages/core` 里共 143 处 `throw new Error("中文…")` / `createServiceError({ message })`。它们经 `toServiceError(error, "")` 归一化后以 `message` 字段透传给渲染层，渲染层在拿不到 `code` 映射时会把这段中文当错误说明显示出来。这跟主进程弹窗、后台任务文案不是一回事：后两者是「框架已经知道该显示什么，只是没翻译」，前者是「要不要把错误文本从自然语言改成 code + 参数」的产品与架构决定。两条路：一是保留上游文本、只在渲染层按 `code` 兜底（现状，英文界面下这类错误会露中文，但排查信息最完整）；二是把高频错误收敛成 code + 参数、由渲染层出句（彻底但要动 services / core，且丢掉部分上游细节）。定口径前不动。
- **`ownership.locationLabels`**（`仓库 N 件`、`角色 · 已装备 N 件`）：渲染点是装备详情弹窗里的商人持有条，属 `item-detail` 的表，不在商人菜单范围内，本轮只登记。

**已知脆弱点（不是漏翻，是机制脆弱）：**

- 助手「页面分析重点」的 en 键是 app 侧 8 句中文原文，改原文就会静默失去译文；普通字面量 key 扫描覆盖不到变量查表。已在实施记录里写明。

验证状态：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。

#### 阶段 D 实施记录：职业名占位符与 Web 壳预览状态值（2026-10-15）

英文界面实跑（见下节验收记录）扫出来的真漏译集中在职业名上：`Switch to 猎人`、`Application loadout · 猎人`、`猎人 has wearable matching slots`。

**职业名算文案，不算数据**。`class_name` 是应用对 Bungie `classType` 的映射结果（`packages/core/src/account/summary.ts:2702`、`packages/core/src/items/search.ts:386`、`packages/core/src/loadouts/dimImport.ts:456` 都写了「猎人」这类字面量），不是上游返回的原文，所以和其它界面文本一样要过 copy 表。

**占位符层统一处理**。新增 `packages/ui/src/i18n/placeholders.ts` 的 `replacePlaceholders(template, values, text)`，10 个 `xxxTemplate`（shell / home / vault / itemDetail / loadouts / library / vendors / account / settings / assistant）都改走它。只有 `{class}` 和 `{className}` 两个占位符的值会过表，其余占位符原样替换——**不能统一查表**：仓库表里有 `"武器": "Weapon"`，而 `item_type` 字段的值正好也可能是「武器」，统一查表会把数据译错。

**copy 表新增键**：account / vault / loadouts / itemDetail 四张表的 en 侧各补「泰坦 / 猎人 / 术士 / 全职业」四条（library 上一节已加，home 本来就有）。zh 侧不加，`xxxText` 查不到就退回 key 本身。

**不走模板的地方单独接线**：account 的 `ContextSwitcher` 传值（`className` 字段）、`战斗装备` 与 `邮政官` 两处相邻拼接、最高光等确认框的 `{name}` 占位符；vault 的 `ContextSwitcher` 传值、整理面板 `<option>` 里的角色名；loadouts 的角色 tab（含首字缩写）、目录行的角色名；护甲详情的 4 处 `identity.class_name`。

**`{class}{label}` 这个键解决中英空格差异**：`猎人邮政官` 在中文里不留空格，英文要写 `Hunter Postmaster`。原先的两处相邻拼接改成查这条模板，zh 值是 `"{class}{label}"`、en 值是 `"{class} {label}"`。

**Web 壳的 `预览数据` 一并迁完**：它是 fixture 预览模式的状态条取值，8 个菜单的顶栏都显示，原先按「Web 壳 fixture 串」登记为不迁，实跑后判定过于显眼，收进 `shell` 表的 `inline`（zh / en 各一条），`packages/web/src/main.tsx` 的 `shellStatus` 改成从 `localeCopy.shell.inline` 取。

**没迁的 app 侧拼接串**：`loadoutsPage.ts:334` 的 `${class_name} / ${n} 件装备`、`:351` 的 `${class_name} / 槽位 ${i} / ${n} 件装备`、`preview` 的 `更新于 {time}` 都挂在 `LoadoutEntryView.subtitle` / `.preview` 上，而 UI 侧渲染 `props.entries` 时只读 `title`、`slotIndex`、`slot`、`sourceLink`（`LoadoutsPageContentView.tsx:513-522`），这两个字段没有读取点，和 app 侧其它无消费者文案同类。

#### 阶段 D 实施记录：账号进度条的 progressLabel（2026-10-15）

职业名那节收口时漏了一处：`packages/app/src/workspaces/accountPage.ts` 的 `buildReadonlyItemProgress` 产出的 `progressLabel`，多目标分支拼的是 `${count}/${total} 项目标`（`:753-768`），而 `AccountPageContentView.tsx:921-922` 把它同时交给 `<progress>` 的 `aria-label` 和 `<small>` 直接渲染，英文界面下会露中文。当时按「静态门禁没扫到」判为不出屏，是判错了——它不在 JSX 文本节点上，也不在五个展示属性上（`aria-label` 的值是表达式，表达式里套的是变量），扫描器抓不到不代表没人读。

**改法**：按仓库既有的 `AccountTextToken` 套路迁。app 侧 `progressLabel` 的类型从 `string` 改成 `AccountTextToken[]`，单目标时整句都是数据（上游 `progress_description` 加 `0/3` 这种计数），用 `filterTextTokens([literalText(...), literalText(...)])` 原样带出；多目标时「项目标」是界面文案、计数是数据，出一个 `{ key: "{count}/{total} 项目标", values: { count, total } }`。UI 侧两处改成 `accountTokensText(props.copy, props.item.progressLabel ?? [], accountText(props.copy, " · "))`，单目标那条会把分隔符 ` · ` 插在两段之间，和改前的 `" · "` 拼接逐字一致。

**copy 表新增**：account 两侧各加 `" · "`（zh / en 同值）与 `"{count}/{total} 项目标"`（en 为 `"{count}/{total} objectives"`）。

验证状态：改完重跑了 `pnpm typecheck`（8 个包）、`pnpm test`（153 文件 / 691 用例 + 架构 15 文件 / 92 用例）、`node scripts/check-i18n-hardcoded.mjs`（零命中），均通过；又按同一方法重扫了一遍英文界面的四个场景，横向溢出仍为 0；账号页剩下的 41 处残留逐条核过，仍是装备名、桶名、`item_type` 和 tier 这些数据，没有新增漏译。

#### 阶段 D 验收记录：英文界面实跑（2026-10-15）

**方法**：起 Web 预览壳（`127.0.0.1:53171`），用 Playwright 切英文，逐个点开 8 个菜单，在 1280 暗色 / 1280 亮色 / 980 暗色 / 760 暗色四个场景下扫全页：文本节点（`TreeWalker`，跳过 `display:none`、`visibility:hidden` 和零尺寸元素）加 `placeholder`、`title`、`aria-label`、`aria-description`、`alt` 五个展示属性，匹配含中日韩统一表意文字（`[一-鿿]`）的取值；同时量 `main` 下每个元素是否越过视口左右边界，并逐页截图。

**结果**：1280 暗色 / 1280 亮色 / 980 暗色各剩 133 处中文，760 暗色 115 处；四个场景的横向溢出为 0，明暗共用同一套语义 token。

**133 处全是数据或壳，逐类核过**：

- Manifest 数据：装备名（`快速命中脉冲`、`铁血意志头盔`）、桶名（`动能武器`、`头盔`）、tier（`传说`）、类型（`脉冲步枪`）、弹药与框架（`轻质框架`）、赛季与版本（`第6年 · 第21赛季 · 深渊赛季`）、来源描述（`深渊赛季活动奖励记录。`）。资料库状态条显示 `Language: zh-chs`，说明 manifest 语言没跟着界面语言切——这是数据源配置，不是界面漏翻。
- 账户数据的派生值：`武器 · 传说 · Power 2023` 里的 `武器` 是 `item_type`。
- Web 壳 fixture：`Web mock：…` 两条提示、`Web 预览中的完整应用配装…` 描述、`应用内创建`、配装名（`宗师夜幕 · 生存控场`）、工具站名（`命运之小日向 Bot` 等）。

**修掉的真漏译**（改动见上一节）：职业名相关的那几处、Web 壳的 `预览数据`。第一遍扫完后另外揪出账号进度条的 `progressLabel`——它的取值是表达式、不在扫描面上，属静态扫描和这份实跑都抓不到的那类，改动见上一节。

**英文长文本暴露的布局瑕疵，本轮只记录不动共享样式**：760 宽度下配装页标签 `Character` 断词成 `Chara cter`；设置概览 `Characters 2 , Vault 485 items` 有孤立逗号；账号页 `猎人 Combat gear` 缺空格——这条在 `{class}{label}` 模板改完后已变成 `Hunter Combat gear`，另外两条属 §8 已预判的英文长度风险，留给布局专项。

**术语观察**：资料库菜单的页头 eyebrow 是 `Manifest`，侧栏导航是 `Library`。同一个中文 key「资料库」被页头元数据和状态条共用，按「页面名 vs 数据源名」有意区分，不改。

**质量验收（实跑）**：

- `pnpm test` → 153 文件 / 691 用例通过，架构测试 15 文件 / 92 用例通过，退出码 0
- `pnpm typecheck` → 8 个包全过，退出码 0
- `node scripts/check-i18n-hardcoded.mjs` → 零命中

#### 阶段 D 验收记录：Desktop 实窗英文验收（2026-10-16）

**方法**：把本机真实数据目录（`~/Library/Application Support/d2-tools`，含已登录的 `oauth-token.json` 与 9 MB 账号快照缓存、zh-chs 资料库）用 `cp -Rc` 克隆到 `.local-data/tmp/desktop-en`，Playwright 的 `_electron.launch` 直接起 `packages/desktop/dist/main/main.js`，渲染层走 dev server（`D2_RENDERER_URL=http://127.0.0.1:53172`，vite 把 `@d2-tools/ui` / `@d2-tools/app` 别名到源码，所以跑的是当前工作区的代码）。界面语言用 `D2_INTERFACE_LOCALE=en-US` 强制（见下面「环境变量这条路的坑」），`D2_MANIFEST_LANGUAGE_FOLLOWS_INTERFACE=0` 让资料库保持已缓存的 zh-chs，避免为了验收去下整份英文 Manifest。亮色 / 暗色各起一次，逐个点开 8 个菜单，扫文本节点与 `placeholder` / `title` / `aria-label` / `aria-description` / `alt`，匹配含 `[一-鿿]` 的取值，并量 `main` 下的横向溢出。

整条链路用的是真实账号数据、真实资料库和真实 IPC。

**结果**：8 个菜单在两个主题下横向溢出都是 0，非网络类的 console 错误 0 条（只有 `bungie.net` 图片在 dev origin 下的 CORS 报错，与本次改动无关）。残留中文逐类核对过：Manifest 数据（装备名、桶名、tier、类型、弹药框架、赛季、活动名）、账号派生值（`脉冲步枪 · 传说 · Power 531` 里的 `脉冲步枪` 是 `item_type`）、平台数据（工具站名、Aegis 心愿单文件名），以及上游 API 直接返回的本地化文本（商人页 `需要等级7` 来自 `failureMessages`，属数据不是界面文案）。

**验收抓出两个真漏译，都已修**：

- **资料库整页在 Desktop 下不跟界面语言**。`LibraryPageContentView` 靠 `interfaceLocale` prop 取 copy，而 Desktop 的 `LibraryPage` 既没有这个 prop 也没往下传，`LibraryMenuProvider` 同样没传，于是 ContentView 一直落回 `zh-CN`。修法是补齐这条链：`LibraryPage` 加 `interfaceLocale?: InterfaceLocale` 并转给 ContentView，`LibraryMenuProvider` 传 `session.diagnostics.languagePreferences.interfaceLocale`。其余 7 个菜单的 provider 本来就传了，只有资料库漏。修完资料库页的中文从 45 处降到 5 处（剩下的全是装备名）。
- **商人页持有状态条渲染原始模板**。`VendorsPageContentView` 的 `VendorOfferButton` 分支直接渲染 `props.item.ownership.label`，而 app 侧产出的已经是 `账号有 {count} 件同身份装备` 这种带占位符的模板，于是英文界面下既露中文又原样打出 `{count}`。改成 `vendorsTemplate(props.copy, label, { count })`，与服务条目那条路径（`:760`）对齐。商人页中文从 566 处降到 563 处，`账号` 开头的那三条彻底消失。

**环境变量这条路的坑（记录备查，不是本次改动引起）**：`packages/services/src/config/store.ts:39` 的 `selectDataDir` 判的是 `options.env?.D2_DATA_DIR`，而主进程一律裸调 `loadConfig()`（`options` 是空对象），所以 **`D2_DATA_DIR` 实际不影响读哪个 config.json**——读的仍是 `defaultDataDir()`，只有 `applyEnvOverrides` 把 `config.data.data_dir` 覆盖成了新值，写盘又按覆盖后的值走。表现出来就是「读真实目录的配置、写克隆目录」。本次靠 `D2_INTERFACE_LOCALE` 这个走 `applyEnvOverrides` 的开关绕过；`scripts/visual-all-check.mjs` 也踩在同一个坑上，它写进 `desktop-data/config.json` 的配置同样没被读到。这条要单独修，不属于 T1。

**首页周报的 core 文案已按方案 A 迁完（2026-10-16）**：这三句出自 `packages/core/src/weekly/liveData.ts`，是 core 直接产出的界面文案，渲染层原样打印。方案 A 是让 core 产出 key + 参数、渲染层成句，与商人（`VendorTextTokenWorkspace`）、账号（`AccountTextToken`）已经用过的 token 套路一致；方案 B（渲染层按中文原文查表）盖不住 `限时熔炉竞技场` 拼进 detail、`Bungie 公共里程碑：{name}` 这类混合串。实施记录见下方「阶段 D 实施记录：首页周报 core 文案 token 化（2026-10-16）」。

**其它已登记不迁的**：`document.documentElement.lang` 在英文界面下仍是 `zh-CN`（`index.html` 写死，属可访问性细节不是界面文案）；商人页 93 处装备图标占位字母是中文装备名的首字（数据派生）。

**质量验收（实跑）**：`pnpm typecheck` 8 个包、`pnpm test` 153 文件 / 691 用例 + 架构 15 文件 / 92 用例、`node scripts/check-i18n-hardcoded.mjs` 零命中，都在上面两处修复之后重跑通过。

#### 阶段 D 实施记录：首页周报 core 文案 token 化（2026-10-16）

背景：首页周报区块的界面文案由 `packages/core` 直接产出成品中文串，渲染层原样打印。上一轮实窗验收看到三句（`铁旗当前未开放`、`固定保留此区域；当前角色活动列表没有返回铁旗玩法。`、`仅对活动详情中列出对应修饰词的 PvE 内容生效；不作用于全部 PvE 或 PvP。`），同一个文件里还有一批同类文案只是当前账号数据下没渲染出来（`铁旗已开放`、`铁旗即将开放`、`限时熔炉竞技场`、`日落挑战` 等）。按方案 A 让 core 产出 key + 参数、渲染层成句，与商人 / 账号的 token 套路一致。

- **新增 token 类型**（`packages/core/src/weekly/summary.ts`）：`WeeklyTextToken = { key, params?, literal? }`，配 `weeklyCopy`（界面文案，key 是中文原文模板）、`weeklyLiteral`（数据原文，渲染层原样输出、不查表）、`weeklyTokenSource`（把 token 还原成不查表的中文原文，只给 core 内部的文本判定用）。`literal` 是必须的：core 产出的 `铁旗` 这类数据名会撞上 copy 表里同名的界面文本，统一查表会译错。
- **改哪些字段**：`WeeklySummaryItem.title / subtitle / description`、`WeeklySummaryPriority.title / detail`、`WeeklyActivityEntry.title / detail`、`WeeklyIronBannerSummary.title / detail / activity_name / playlist_name`。范围只到这些字段的**渲染点**：首页实际读的是优先级卡片的标题与说明、活动行的标题与说明、铁旗卡片的标题 / 说明 / 活动名 / 玩法名。同一个结构里的 `source` / `evidence` / `activity_kind` / `reward_groups[].label` / `loot_pool.source` 仍是中文串，但首页没有读取点，本轮不动、只登记。
- **core 内部判定改用 `.key`**：`weeklyItemText`、`extractKnownActivityName`、`splitWeeklyActivityCandidates`、`sanitizeWeeklyText`、`uniqueByTitle` 这些前缀剥离与类别正则都吃 `weeklyTokenSource(item.xxx)`。`sanitizeWeeklyText` 和 `splitWeeklyActivityCandidates` 的前缀正则补了 `公共活动`：原先只剥 `公共里程碑` / `公共数据`，`Bungie 公共活动：X` 会原样进标题。这一处会改变 zh-CN 输出（标题不再带该前缀），是刻意的。
- **渲染层**：`packages/ui/src/home/homeCopy.ts` 新增 `homeToken` / `homeTokenList`，后者用 `" · "` 这个 copy 键拼多段说明。首页 `HomePageContentView.tsx` 的五个渲染点（活动行标题/说明、优先级卡片、铁旗卡片、铁旗活动名与玩法名）改走它们，`homePriorityEntries` 也改成查表后再判空。
- **类型透传**：`packages/app/src/workspaces/homeDashboard.ts`、`packages/desktop/src/renderer/api/weeklyApi.ts` 各自那份重抄的周报类型换成 core 的 token，避免类型说 `string`、运行时是对象。
- **缓存版本**：`packages/services/src/home/briefingStore.ts` 的 `CachedHomeBriefing.version` 从 11 提到 12，旧缓存里是成品中文串，留着会让英文界面继续显示中文；主进程写入处 `packages/desktop/src/main/runtime/homeBriefing.ts` 同步。
- **Web 降级快照**：`packages/web/src/webAdapter.ts` 的 `createUnavailableHomeSnapshot` 产出 token，文案已按当前语言查好，标 `literal` 让渲染层原样输出。
- **文案表**：`packages/ui/src/i18n/copy/home.ts` 的 en 段补 41 键（铁旗四态、里程碑与掉落地图模板、六类优先级的待确认标题与说明、`{label}挑战` 一组、`" · "` 分隔符）。核过一遍：这批中文原文在 en 段原本有 7 条是「差一个句号」的近似键（如 `确认后展示可刷奖励状态` vs `确认后展示可刷奖励状态。`），补齐的是带句号的原样键，不改 zh-CN 输出。
- **测试**：`packages/core/test/weekly.summary.test.ts` 的断言改成比对 token 结构与 `weeklyTokenSource` 输出，没新增用例。
- **实窗复核（英文 + 真实账号克隆）**：铁旗卡片渲染 `Iron Banner is not open` / `This area stays in the layout; the current character activities did not return an Iron Banner mode.`；活动激涌卡片渲染 `Only applies to PvE activities that explicitly list the modifier; it is not active across all PvE or PvP.`；活动行渲染 `Nightfall challenge` / `Dungeon challenge` / `Raid challenge`（这三条来自 `classification.subtitle`，原本也会露中文）。首页 144 处残留中文按关键词（铁旗 / 里程碑 / 挑战 / 待确认 / 轮换 / 日落等）过滤后为 0，剩下的全是 Manifest 数据（武器名、活动名、`item_type`）。亮暗两轮横向溢出 0、console 错误 0；`pnpm typecheck` 8 个包、`pnpm test` 153 文件 / 691 用例 + 架构 15 文件 / 92 用例、`node scripts/check-i18n-hardcoded.mjs` 零命中全部通过。

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
- `pnpm i18n:hardcoded:check` 保持零命中：JSX 文本节点与五个展示属性上不得再出现中文硬编码。
- 发布说明明确英文支持范围；在全部核心工作流完成前，不标记为“完整英文支持”。

本轮实跑结果见 §6「阶段 D 验收记录：英文界面实跑（2026-10-15）」与「阶段 D 验收记录：Desktop 实窗英文验收（2026-10-16）」：Web 预览壳下 8 个菜单在 1280 暗色 / 1280 亮色 / 980 暗色 / 760 暗色横向溢出为 0；Desktop 实窗下 8 个菜单在亮色 / 暗色横向溢出为 0，残留中文逐条归属到 Manifest 数据、账号派生值与上游 API 文本。`pnpm test`、`pnpm typecheck`、`node scripts/check-i18n-hardcoded.mjs` 均通过。首页周报那批 core 直接产出的文案已按方案 A 迁完（见 §6「阶段 D 实施记录：首页周报 core 文案 token 化（2026-10-16）」），英文实窗复核后残留中文为 0。

## 8. 依赖与风险

- 依赖现有 `interfaceLocale`、`bungieLocale` 和 `getLocaleCopy` 体系稳定。
- 共享组件和页面元数据涉及多个 package，需避免与其他菜单 UI 改造同时修改高冲突文件。
- 英文文本通常比中文更长，可能暴露现有固定宽度、按钮和状态栏布局问题。
- 动态数据可能仍为中文：必须明确区分 Manifest 语言未切换、第三方来源原文和产品 UI 漏翻，不能用统一替换掩盖问题。
- AI 返回的自然语言内容不应被强制翻译；应在请求上下文中传递用户界面语言，并在服务不支持时明确说明。

## 9. 完成定义

只有当仓库、配装、装备详情、AI 助手、页面标题/状态和平台 adapter 均完成英文接入，并通过英文主流程、窄屏、明暗主题和质量门禁验收之后，T1 才能标记完成。首页周报 core 文案这一条已解决（见 §6「阶段 D 实施记录：首页周报 core 文案 token 化（2026-10-16）」），Web 与 Desktop 两侧的实窗验收也都跑过（见 §6）。

在此之前，T1 保持「部分完成」，对外只能描述为「英文界面部分可用」。
