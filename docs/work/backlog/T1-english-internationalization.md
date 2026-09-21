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

S1 `VaultCopy` 类型与骨架 → S2 叶子组件（`VaultArmorFilterPanel` / `VaultWeaponFactIcons` / `VaultItemSections`）→ S3 `VaultListItem` → S4 筛选侧 `VaultFilterToolbar` → S5 整理与批量（`VaultOrganizePanel` / `useVaultBatchActions` / `vaultCleanupProtection`）→ S6 推荐来源（`VaultRecommendationEvidencePanel` / `VaultRecommendationSourceManager`）→ S7 `VaultPageContentView` 本体 → S8 `VaultWishlistManager` → S9 app 侧标签映射与摘要串 → S10 两个孤儿组件。

**四、必须先改代码、不能当文案翻译的地方**

改文案就会改行为，动手前先换掉：

- `VaultWeaponFactIcons.tsx:56-58`：用 `label.includes("动能" / "能量" / "威能")` 反查图标类型。
- `VaultPageContentView.tsx:825`：`message.includes("失败")` 决定 `status-error` 还是 `status-ready`，要换成结构化的 tone 字段。
- `VaultFilterToolbar.tsx:115-116`：用 `["动能武器", …]` / `["头盔", …]` 这两个中文数组判定槽位分类。
- 对中文标签做 `replace` 手术：`VaultFilterToolbar.tsx:202`（`replace("全部弹药", "全部")`）、`:225`（`replace("反", "")`）、`:452`（`shortSlotLabel` 三连 replace）、`VaultListItem.tsx:406`（`replace(/武器$/u, "")` 再拼「位」）。
- 中英混用的比较与查询别名：`vaultQueryIndex.ts:210-211`、`vaultList.ts:373/377/786-790/860-861/945`、`vaultRecommendationAudit.ts:91`。
- `VaultTargetRulesPanel.tsx:586`：`${armorStatLabels[...]}第三属性` 这类中文后缀拼接。
- `recommendationMatchView.ts:20-100`：匹配投影层的「符合 / 不符 / 无法判断 / 来源未要求」，被 `VaultListItem.tsx:191` 与 `VaultDuplicateGroups.tsx:733` 消费，属仓库文案的上游，要同批纳入或先冻结约定。

**五、会撞的测试**

zh-CN 的渲染结果必须逐字不变，否则这些断言会红：

- `packages/ui/test/vault-recommendation-filter-row.test.tsx`：唯一直接渲染 `VaultPageContentView` 的测试，断言 `title` / `aria-label` 全景串（`:221-222` `` "要求 2 项，命中 1 项，1 件" ``、`${AEGIS_LABEL}要求 2 项，命中 1 项，1 件`）、`getByText("1 件")`、`"完整 3/6 · 1"`。迁移时插值拼接的空格和标点要完全复刻。
- `packages/ui/test/vault-wishlist-link-sync.test.tsx`、`packages/ui/test/vault-recommendation-sources-refresh.test.tsx`：断言「从链接同步」「70 条规则」「列出 127 把武器」「仓库 5 件 / 全账号 7 件」等。
- `packages/app/test/vault-selection-workspace.test.ts`（`:106/108/110`）与 `packages/desktop/test/vault-panel.test.ts`（`:145/149/153`）把 `buildVaultSelectionSummary` 的同一批中文各断言了一遍，改 app 层会同时打破两处。
- `packages/app/test/vault-list-workspace.test.ts:94/178` 断言 `contextFacts` 的中文摘要串。
- 反向的一条：`` `已核对 N 件` `` 系列（`VaultPageContentView.tsx:1112`、`VaultRecommendationEvidencePanel.tsx:53`）没有任何测试覆盖，改起来没人拦。

**六、两个孤儿组件**

`VaultDuplicateGroups.tsx`（119 行中文）与 `VaultTargetRulesPanel.tsx`（65 行中文）没有在 `packages/ui/src/index.ts` 导出，全仓没有 importer，也没有测试。迁移前先定：接线还是删。它们合计 184 行，占了仓库文案的三分之一，却当前不在任何渲染路径上。

**七、双端挂载点**

`packages/desktop/src/renderer/features/vault/VaultPage.tsx:198` 与 `packages/web/src/main.tsx:504` 都要加 `interfaceLocale`。桌面端的来源是 `session.diagnostics.languagePreferences.interfaceLocale`（与 `AccountMenuProvider.tsx:19` 同源），`VaultMenuProvider.tsx` 现在完全没有 locale 字段；Web 端 `preferences` 已是真实 state，照 `AccountPageContentView`（`main.tsx:485-486`）加一行即可。`VaultPage.tsx` 的空态分支（`:166-192`）也是硬编码中文，别漏。

顺带两条：`VaultPageContentView.tsx:101-104` 的 `vaultWorkspaceTabs` 是模块级常量，要改成组件内 `useMemo` 才能随 locale 变；页面标题走的是 `ProductShellHost.tsx:201` 的硬编码 `productPageHeaderMeta.vault`，与 `vaultCopy.title` 无关，属于外壳层。

**八、相邻缺陷**

`scripts/run-test-set.mjs:9-18` 的 `exactSets.ui` 列了 8 个文件，其中 4 个已不存在（含 `packages/desktop/test/shared-ui-i18n.test.tsx`），`assertExistingFiles` 会直接 `process.exit(1)`，所以 `pnpm test:ui` 现在跑不起来。做 T1 时最该跑的是 `pnpm test:behavior`，没有现成的 i18n 回归网。

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
