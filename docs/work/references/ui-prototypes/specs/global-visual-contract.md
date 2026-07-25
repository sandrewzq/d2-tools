# 全局视觉合同

本合同把三个冻结原型与 `packages/ui` 的共享视觉层固定为同一套配方。它定义页面表面、文字、图标、控件状态、间距、层级、响应式和验收规则，而不是替代各菜单的真实数据绑定或领域布局。正式定义以 `docs/development.md` 的“全局视觉合同与原型先行门禁”为准；本文件记录原型与产品的具体映射。

## 两个实现，唯一规格

- 静态冻结原型：`prototype-design-system.css` 是自包含样式来源，三个 HTML 可以直接打开。
- 产品实现：`packages/ui/src/styles/foundation/00-tokens.css` 与 `03-surface-contract.css` 是 Prototype、Web、Desktop 的共享实现来源。
- 一致性来源：本合同、`shared-shell-component-mapping.md`、组件规格卡和跨端视觉验收。静态原型与产品 CSS 不得互相 `@import`。

禁止把颜色、圆角、边框或共享尺寸重新抄回菜单 CSS、平台壳 CSS 或三个 HTML 的页面私有样式。原型公共 CSS 和产品共享 CSS 可以各自实现同一规格，但必须由同一组件规格卡逐项对照，不能依赖运行时文件路径“自动同步”。

三个原型的 HTML 语义、装备详情骨架、Overlay、控件、导航、字号下限和层级规则分别以 [原型 HTML 语义合同](prototype-semantic-contract.md)、[统一装备详情骨架合同](detail-dossier-contract.md)、[Overlay 与 Dialog 合同](overlay-dialog-contract.md) 和 [控件、导航与响应式合同](controls-navigation-and-responsive-contract.md) 为准；本文件不再允许用页面私有 class 覆盖这些共享职责。

## 十类页面与表面配方映射

| 配方 | 静态原型 selector | 产品语义标记 / 组件 | 所有权要点 |
|---|---|---|---|
| `ShellChrome` | `.topbar`、`.sidebar`、`.page-head` | `data-shell-role="titlebar|sidebar|page-header"` | 连续结构线、直角 |
| `PrimaryNavigation` | `.main-nav` | `.shell-nav` / `data-ui-kind="primary-navigation"` | 容器无外框；只有行分隔 |
| `ContextSwitcher` | `.full-loadout-character-tabs`、`.account-character-switcher` | `data-ui-kind="context-switcher"` | 全宽上下文选择器拥有唯一控件外框；子项单分隔与底部指示线 |
| `SegmentedControl` | `.full-loadout-mode-tabs`、`.workflow-tabs`、`.mode-tabs`、`.section-nav > div`、`.match-source-tabs` | `data-ui-kind="segmented-control"` | 仅控件整体有外框和圆角 |
| `PageSection` | `.content-band`、`.dossier-section` | `data-surface="section"` | 仅章节结构线 |
| `WorkspaceSplit` | `.account-workspace`、`.vault-browse`、`.split-2`、`.library-workbench`、`.vendor-shell`、`.settings-shell`、`.full-loadout-workspace` | `data-surface="split"` | 只画栏位间单线，不画外框 |
| `SurfaceList` | `.list-nav`、`.ledger`、`.table-list` | `data-surface="standalone"` / `embedded-list` / `row` | 独立列表由自身拥有一圈边缘；嵌入侧栏列表继承栏位边缘；行只画分隔 |
| `SurfaceFrame` | 状态、摘要、空态、独立工具面板 | `data-surface="frame"` + `data-ui-kind="status-matrix|summary-frame|state-frame"` | 唯一完整外框和裁剪；数据型 frame 为直角 |
| `ObjectCard` | `.item-card`、`.offer`、`.perk-card` | `data-ui-kind="object-card"` | 仅独立对象使用完整外框 |
| `Callout` | `.notice`、`.data-note`、`.source-quote`、`.catalyst-panel`、`.ai-analysis`、`.vendor-detail-warning` | `data-ui-kind="callout"` | 唯一允许语义左色条 |

`Control` 是跨切面的基础控件规则，不计入十类页面与表面配方。按钮、字段、徽标和状态 Chip 使用 `data-ui-kind="control"` 对齐其控件边框、圆角及 hover / focus / disabled / status token，但不得作为页面、目录或工作区的布局表面。

`data-ui-kind` 是后续共享组件接线时使用的稳定语义标记；在产品组件尚未迁入前，静态原型无需为了该标记复制产品 DOM。一个元素只能选择一个表面配方；状态、图标和文字不能取得第二个表面外框。

### 边界预算与页面宽度

十类配方描述组件语义，但不能允许一个区域同时取得多种边界。静态原型和产品实现都必须遵守以下预算：

| 可见边界角色 | 唯一允许的用途 | 所有权 |
|---|---|---|
| `ShellLine` | 顶栏底边、侧栏右边、页头底边、抽屉边界 | ShellChrome |
| `SplitLine` | 两栏或三栏工作区相邻栏位之间 | WorkspaceSplit 的相邻栏位；外层不画框 |
| `RowLine` | 页面章节、目录行、台账行、表格行的末端分隔 | PageSection 或 SurfaceList；同一行不能再作为 ObjectCard |
| `ObjectOutline` | 装备、Offer、Perk、实例、独立空态、弹层 | ObjectCard 或 SurfaceFrame |

`Control` 的控件边框不属于页面边界预算，只能用于按钮、字段、分段控件和状态 Chip。`Callout` 只可额外使用语义左色条，不能借用为目录、导航、页面分区或普通对象的边界。

- 一条外边只能有一个拥有者。父级、子级、状态样式和阴影不得同时绘制同一条边。
- `WorkspaceSplit` 的宽屏只画 `N - 1` 条纵向 `SplitLine`；窄屏折叠后，先移除纵线，再由后续栏位绘制一条横向 `SplitLine`。禁止使用 `border: 0` 后再由多个选择器补边。
- `SurfaceList` 在嵌入工作区时没有外框，只有 `RowLine`；standalone 列表才可拥有一圈 `ObjectOutline`。目录、表格化数据行和对象卡不能混用两种模式。
- 页面 section、目录、工作区和正文容器一律不得使用圆角。圆角只属于 `ObjectOutline`、`Control`、Chip、弹层及明确的独立 `SurfaceFrame`。
- 页面必须先归类为 `fluid-workspace`、`constrained-content` 或 `hybrid-workspace`。仓库、配装和账号的装备对照可使用满宽数据工作区；设置是“目录 + 宽数据轨道 + 局部受限说明”的混合工作区，不能把状态矩阵和操作台账缩进纯说明阅读轨道；首页、资料库和商人使用工作区与受限正文并存的混合轨道。

### 圆角合同

圆角由表面配方唯一拥有，页面私有 CSS 不得再直接声明 `border-radius`，也不得通过领域 class 改写公共值。

| 表面或组件 | 圆角 | 典型内容 |
|---|---:|---|
| Shell、Workspace、PageSection、SurfaceList、RowLine | `0` | 页头、目录、章节、表格与台账 |
| `status-matrix`、`summary-frame`、`state-frame` | `0` | 首页刷新节奏、周常摘要、周信号、商人摘要、加载/空/失败状态、设置状态矩阵 |
| `object-card`、独立 Callout、独立空态与 Overlay | `6px`，即 `--radius-panel` | 装备、Offer、Perk、可独立操作的对象、对话框 |
| Button、Field、SegmentedControl、缩略图与图标容器 | `4px`，即 `--radius-control` | 控件与紧凑媒体 |
| Chip、进度轨道、滚动条滑块 | `999px`，即 `--radius-pill` | 胶囊状态与进度 |

同一页面同一层级的摘要、状态和目录不得混入 `object-card`。首页中只有商人单件装备可使用 `object-card`；刷新节奏、周常、周信号、商人摘要和模块状态均为直角 frame。

### 设置页状态矩阵例外

设置页的应用概览和应用更新是同一组可比较的运行状态，不是连续目录行，也不是彼此独立的对象卡。它们必须使用一个 `SurfaceFrame` 作为矩阵唯一的外框拥有者：矩阵内部单元只绘制行、列分隔线，不单独圆角或补对象边框。不得为了避免卡片泛滥而删除这个外框，把状态矩阵退化为横向拉开的连续数据轨道。

常用操作、账号管理、资料库检查和运行诊断属于可执行的设置行：桌面宽度下固定为“说明列 + 右侧操作列”，同一组命令的起始边缘必须对齐；说明不能决定按钮的水平位置。连续 `RowLine` 只用于这些设置项、日志和诊断记录，不用于顶层状态总览。窄窗口才允许把操作列折到说明下方。

全局 CSS 的职责也必须唯一：`prototype-design-system.css` 与产品 `03-surface-contract.css` 只拥有上述边界、圆角、背景和主题 token；页面私有 CSS 只拥有领域网格、行高、内容列和对象内部排版。私有 CSS 不得再重设 Shell、Split、目录、章节或对象边界。

### 当前定位合同

`--selected-bg`、`--selected-border` 与 `--selected-fg` 不再承担所有“选中”语义。它们只服务对象卡、实例和分段控件等对象选择；导航当前定位使用独立的 `--nav-current-*` token，避免为了让目录可见而加重装备、Offer 或 Tab 的状态。

| 组件 | 当前定位配方 | 禁止事项 |
|---|---|---|
| `PrimaryNavigation` | `--nav-current-bg` 背景、`--nav-current-fg` 文字、`700` 字重、图标底色、起始侧 `3px` 内嵌 `--nav-current-indicator` | 完整外框、圆角卡片、业务语义色条 |
| 嵌入式 `SurfaceList` | 与一级菜单相同的背景、文字、字重和起始侧内嵌指示 | 父级外框、每行对象卡、额外状态徽标 |
| `ContextSwitcher` | 容器拥有 `--control-border` 外框与控件圆角；当前背景、文字和底部 `2px` 指示线 | 每项完整按钮外框、导航起始侧指示 |
| `SegmentedControl` | 控件整体外框不变；当前项只改变填充与文字 | 导航起始侧指示、每项完整边框 |
| `ObjectCard` | 对象选中背景与对象边框 | 导航当前定位指示 |

导航当前指示是固定的中性定位色，不表达成功、警告、失败或 AI 等业务语义；因此它不是 `Callout` 的语义左色条。使用 `box-shadow: inset` 或等效的无布局变化实现，不能因选中而改变行宽、padding 或分隔线位置。

亮色主题的最低要求：`--nav-current-indicator` 相对默认导航面必须达到 `3:1`，当前文字相对 `--nav-current-bg` 必须达到 `4.5:1`；背景本身至少达到 `1.25:1` 的可扫描差异。对象、角色上下文和分段控件的 `--selected-border` 相对 `--selected-bg` 也必须达到 `3:1`。`hover` 只能使用较弱的 `--hover-bg`，不得与当前背景相同。`focus-visible` 使用独立焦点环，当前项在获得焦点时同时保留当前背景与当前指示。禁用项不显示当前指示。

### 亮色边框合同

十类配方同时规定亮色边框的对比层级，不能只规定“由谁画”：

| 用途 | token | 亮色目标对比度（相对 `--panel`） | 适用配方 |
|---|---|---:|---|
| Shell 与工作区分隔 | `--shell-divider` | `>= 2.2:1` | `ShellChrome`、`WorkspaceSplit` |
| 章节与列表行分隔 | `--section-divider` | `>= 1.65:1` | `PageSection`、`SurfaceList` |
| 独立对象外边框 | `--object-border` | `>= 2.4:1` | `SurfaceFrame`、`ObjectCard`、`Callout` |
| 可操作控件边框 | `--control-border` | `>= 3:1` | `SegmentedControl`、`Control` |
| 当前导航指示 | `--nav-current-indicator` | `>= 3:1` | `PrimaryNavigation`、嵌入式 `SurfaceList` |

`--line`、`--line-strong` 和 `--divider` 只作为静态原型的兼容别名，分别映射到章节线、对象边框和章节线；新规则不得再以它们表达 Shell 或工作区结构线。亮色验收必须读取最终计算样式，确认目录、侧栏、栏位分隔不落到 `--section-divider`，对象卡和控件也不退化为章节线。

## 文字、颜色与信息权重合同

文字颜色与信息大小是两条独立的轴。`Tone` 只表达内容语义和颜色，`Priority` 只表达当前决策重要性、字号、字重、行高与空间。不得因为一项内容的语法像“标签、时间或来源”就默认缩小；重置时间、活动奖励、当前账号、缺失件数、价格和可用性都可能是用户当前要读的高权重信息。

### Tone：颜色语义

| `data-text-tone` | 颜色 | 用途 | 禁止事项 |
|---|---|---|---|
| `primary` | `--text` | 名称、关键值、明确结论 | 用于大段说明或普通字段标签 |
| `body` | `--body` | 可阅读说明、对象属性、表单当前值 | 用 `meta` 降低正文可读性 |
| `meta` | `--muted` | 非决策性的标签、来源、版本、追溯信息 | 承载当前可用性、重置时间、错误原因、主要奖励或操作结果 |
| `action` | `--blue` / action token | 链接、可跳转对象、可展开入口、非破坏性操作 | Perk、锁定、普通元数据或装饰性副标题 |
| `status` | 由 `data-status` 选择 success / pending / warning / error token 对 | 成功、警告、失败、进行中 | 缺少 `data-status`，或仅靠颜色表达状态；必须同时有图标、文字或状态标签 |

状态文字必须同时声明 `data-text-tone="status"` 与 `data-status="success|pending|warning|error"`。`data-status` 是唯一的状态色来源；`.mint`、`.warning`、`.is-ready`、`.error` 等 class 只能保留结构、行为或兼容选择，不能直接决定文字颜色。主题切换只替换 token，不能在菜单 CSS 中额外反转状态文字。

### Priority：决策权重

| `data-info-priority` | 最终字号 / 字重 / 行高 | 用途 | 典型内容 |
|---|---|---|---|
| `display` | 页面 `24px/700/1.25`；章节 `18px/700/1.3` | 页面结构标题 | 页面名、章节名、装备详情身份标题 |
| `metric` | `20px/700/1.2` | 单独呈现的关键数值 | 可清理数量、缺失件数、仓库已读取数、进度值 |
| `decision` | `16px/600/1.35` | 直接决定下一步操作的信息 | 刷新时间、倒计时、奖励名、可用/不可用结论、成本、写操作结果 |
| `context` | `15px/600/1.35` | 定位当前对象、位置或工作范围 | 账号名、导航项、角色名、装备名、活动名、商人名、配装名 |
| `reading` | `14px/400/1.5` | 用户需要连续阅读的说明与属性 | 类型/光等、活动说明、空状态解释、字段当前值、错误恢复说明 |
| `support` | `13px/400-600/1.45` | 辅助理解但不单独驱动决策 | “每日更新”、影响范围、筛选标签、确认状态、对象副标签 |
| `trace` | `12px/400/1.45` | 可追溯而非当前决策的信息 | 来源、快照时间、版本、技术诊断、内部标记 |

- `display` 属于结构标题，`metric` 属于独立数值组件；两者不能用来伪造普通信息的权重。
- 页面标题下的描述、详情说明、空/失败原因和可读副标题至少是 `reading + body`，不是 `trace + meta`。
- `support` 和 `trace` 的区别取决于是否帮助理解当前操作，而不是元素标签名。重置时间的标签可以是 `support`，具体时间必须是 `decision`；来源才是 `trace`。
- 全局最小可读层为 `trace 12px`。禁止最终可见 `8px`、`9px`、`10px`、`11px` 文本；不得以“高信息密度”为理由把 `decision`、`context` 或 `reading` 降级。
- 字重只使用 `400`、`600`、`700`；数字、库存、倒计时、版本和表格计数使用 tabular figures。文本默认不使用负字距，不按 viewport 缩放字体。
- 截断只允许用于单行对象名称或不可避免的紧凑状态值；必须保留完整名称的 tooltip、详情入口或可换行布局。说明、错误和字段标签优先换行。

### 共享组件槽位

共享组件使用 `data-ui-part="label|value|detail|state|source"` 表达内部信息，不由菜单 CSS 猜测字号。每个槽位同时标注 `data-text-tone` 与 `data-info-priority`。

| 组件 | `label` | `value` | `detail` | `state` / `source` |
|---|---|---|---|---|
| Shell 状态 Chip | `support + meta` | `context + primary` | 无 | 状态图标；无来源 |
| 账号摘要 | 无 | 账号名 `context + primary` | 角色/仓库已读取 `reading + body` | 无 |
| 一级导航 | 无 | 菜单名 `context + primary` | 无 | 当前定位独立于文字 Tone |
| 页头 | 域类别 `support + meta` | `display + primary` | 描述 `reading + body` | 操作按 Control 合同 |
| 刷新节奏 | 每日 / 每周 / 仄类别 `support + body` | 时间/倒计时 `decision + primary` | 影响范围 `support + body` | 可用性 `status + support` |
| 对象行/卡片 | 对象分类 `support + meta`；可扫描的区域标题 `context + primary` | 名称 `context + primary`，关键奖励/成本 `decision + primary` | 奖励类型、光等、说明 `reading + body` | 可用性 `decision + status`；来源 `trace + meta` |
| 空/失败/部分可用 | 范围 `support + meta` | 结论 `decision + primary/status` | 原因与恢复 `reading + body` | 来源/快照 `trace + meta` |
| 表单与设置项 | 标签 `support + meta` | 当前值 `reading + body`；关键状态 `decision + primary/status` | 帮助与恢复 `reading + body` | 技术说明 `trace + meta` |

### 跨菜单最低映射

| 菜单 | 必须使用 `decision` 的信息 | 必须使用 `context` 的信息 | 只可使用 `trace` 的信息 |
|---|---|---|---|
| 首页 | 重置时间、倒计时、活动奖励、仄可用性 | 活动名、商人名 | 数据来源、快照确认时间 |
| 账号 | 当前角色关键状态、邮政官风险、写操作结果 | 账号名、角色名、装备名 | Membership、快照时间 |
| 仓库 | 筛选结果、可清理/配装命中、批量操作结果 | 装备名、筛选工作区 | 查询来源、刷新时间 |
| 配装 | 缺失件数、可应用状态、转移结果 | 方案名、角色、槽位 | 模板来源、创建时间 |
| 资料库 | 定义可用性、账号持有结论、资料库异常 | 搜索结果名、查询范围 | Manifest 版本、检查时间 |
| 商人 | Offer 成本、可购买/缺失、刷新时间 | 商人名、地点、Offer 名 | Vendor 来源、读取时间 |
| 设置 | 当前配置异常、更新可用、操作结果 | 设置项名称、账号/资料库状态 | 诊断编号、版本、日志时间 |
| 武器/护甲详情 | 属性数值、Perk 状态、写操作结果、实例可用性 | 装备名、当前实例、来源条目 | 定义版本、证据与追溯信息 |

### 首页响应式信息架构

- 刷新节奏在 `>1280px` 保持三列；`1280px` 及以下改为两列，仄独占第二行；`980px` 及以下改为单列。每个单元固定为“类别 + 时间 / 倒计时 + 影响范围”的受控网格，不能由 flex 剩余空间决定换行。
- 本周核心活动在 `>1280px` 三列并列；`1280px` 及以下日落打击独占首行，轮换突袭和轮换地牢并列；`760px` 及以下单列。活动条目先给活动名和说明完整宽度，再在下方横向排列可换行的奖励，不能把奖励塞进右侧窄列。
- “限时活动”“本周加成”等可扫描区域标题为 `context + primary`；奖励类型为 `reading + body`。来源、快照和技术追溯才可使用 `meta` / `trace`。
- 以上断点只改变网格与排列，不缩小时间、倒计时、活动名、奖励名或奖励类型；当空间不足时切换到下一个受控布局，不以单个文本临时换行作为布局策略。

### 对比度与密度

- 所有最终可见文字相对实际背景必须达到 `4.5:1`；`decision`、`context`、`reading` 的亮色目标为 `>= 7:1`，`support` 目标为 `>= 5.5:1`。`trace` 最低 `4.5:1`，且不得承担当前决策。
- 密度只调整 padding、gap、行高和同层对象数量；不得改变 `Tone`、不得将 `decision/context/reading` 降到较低字号。紧凑模式也必须保留以上最小字号。
- 在 `1280 / 980 / 760` 三个合同宽度，优先让 `decision` 和 `context` 换行或独占一行；不得为了保持单行而缩小文字、截断关键信息或建立横向滚动轨道。

### 图标与状态合同

- 产品 UI 使用同一套 Lucide 图标；冻结原型维持同一线性语言、圆角和 `1.7` 左右描边，不能混入填充图标、表情或不同线宽的手绘图形。
- 紧凑状态图标为 `14px`，标准导航/控件图标为 `16px`，主操作图标为 `18px` 或 `20px`。图标颜色继承对应文字角色；禁用、当前和状态图标不能另造一套颜色逻辑。
- 图标按钮必须有可见 tooltip 和可访问名称；只靠图标区分成功、警告、失败、锁定或写操作是不合格的。
- 状态必须区分 `default`、`hover`、`pressed`、`current`、`focus-visible`、`disabled`、`loading`、`success`、`warning`、`error`。`current` 不等于 `focus`，`disabled` 不等于 `loading`，任何状态不得只通过降低不透明度表达。
- `focus-visible` 使用独立至少 `2px` 的焦点环，并相对相邻表面达到 `3:1`；禁用控件保留可读标签和紧邻的原因；加载控件保留原标签、目标和进行中反馈，不能提前显示成功。

### 密度、层级与响应式合同

- 全局间距只使用 `4 / 8 / 12 / 16 / 20 / 24 / 32px` 刻度；页面 gutter、章节间距、行内 gap 和对象 padding 都必须从该刻度取值。Shell 固定几何继续以 `shared-shell-component-mapping.md` 为准。
- 高度使用三档：紧凑控件 `30px`，标准控件 `34px`，主控件 `40px`。触控断点的实际命中区不得低于 `44px`，可通过透明 hit area 扩展，不能只放大边框。
- 阴影只用于 sticky、drawer、popover、modal 和 toast 等层级关系，普通页面区、目录、列表和对象卡不能用阴影伪造边界。层级使用语义 token：base `0`、sticky `10`、popover `20`、drawer `30`、modal `40`、toast `50`、原型验收工具 `90`；禁止菜单私有魔法 `z-index`。
- 在 `1280 / 980 / 760` 三个合同宽度，标题和说明先换行，操作区再换行，分段控件和上下文切换器再折行；不得建立横向滚动轨道。工作区按既定宽度类型重排，字段、表格和对象卡必须换行或单列堆叠。
- 响应式只改变布局、内容优先级和命中区，不改变文字角色、颜色含义、状态表达或信息真相。小屏隐藏的辅助文字必须保留等价图标、tooltip 或可访问名称。

### 文本与交互验收

每个共享组件和菜单完成前，都必须在最终计算样式而不是源码片段上检查：

1. light / dark 与 `1280 / 980 / 760` 下每个 `Tone + Priority` 组合的背景对比度、字号、字重、行高和换行行为。
2. default、hover、pressed、current、focus-visible、disabled、loading、error 的可辨性，以及状态是否同时有文字或图标。
3. 图标尺寸、描边、颜色继承、tooltip / accessible name 与图标按钮命中区。
4. 间距刻度、z-index 语义、文字换行、数字对齐和零横向滚动。

任何页面私有 `color`、`font-size`、`font-weight`、阴影、`z-index` 或图标尺寸若无法映射到本节 `Tone + Priority` 或 token，必须先补充全局规格，不能以菜单补丁保留。

## 共享组件映射

`ProductWorkspace` 已输出稳定语义标记：

| 组件 | 标记 | 用途 |
|---|---|---|
| `ProductWorkspacePage` | `data-surface="page"` | 菜单页面承载层 |
| `ProductWorkspaceHeader` | `data-shell-role="page-header"` | 共享页头 |
| `ProductWorkspacePanel` | `data-surface="frame"` | 独立空态或独立面板外框 |
| `ProductWorkspaceCommandBar` | `data-shell-role="command-bar"` | 连续工作区命令带 |
| `ProductWorkspaceSplit` / `SideRail` | `data-surface="split"` / `data-shell-role="side-rail"` | 分栏结构与单一栏位分隔线 |
| `ProductWorkspaceContentStack` / `EmptyState` | `content-stack` / `empty` | 无外框内容列与空态 |

后续菜单重建只能在这些语义上添加领域 class。若确实需要新共享配方，先更新 `docs/development.md`、本合同和共享组件，不能在某一个菜单中发明新的首层 panel chrome。

## 实施与验收顺序

1. 先登记配方、原型 selector、计算样式和对应产品的稳定 `data-reference-id`。
2. 先修改三个静态原型并确认配方，再修改产品 UI；禁止反向依赖产品 CSS 或从旧产品 CSS 推导原型。
3. 删除会与合同争夺同一边框、圆角、背景、文字角色、图标、阴影或 padding 所有权的旧规则，再接入共享语义标记。
4. 再迁移菜单领域布局和真实字段、action、加载/空/失败状态；不得把静态 mock 带入产品。
5. 每个菜单必须在 Prototype 后，再在 Desktop 的 light / dark、1280 / 980 / 760 宽度复核边界、文字对比度、图标、状态和无横向滚动。发现任一旧视觉覆盖时，回到第 3 步，不追加高优先级补丁。

当前阶段只完成共享合同和共享工作区接线。各菜单内容层仍须按本合同逐个迁移并完成视觉验收，不能因为共享层已接入而标记为“已还原”。
