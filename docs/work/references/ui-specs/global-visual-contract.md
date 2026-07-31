# 全局视觉合同

> 适用范围：`packages/ui` 共享产品 UI，以及 Web、Desktop 的最终渲染结果。

## 真相与所有权

- `packages/ui` 的共享页面决定视觉结构和最终表现；产品 ViewModel、actions、adapter、IPC 和状态决定真实功能。
- `packages/ui/src/styles/` 的 foundation、shell、workspace 和 components 分片负责公共 token、文字、控件、共享表面、状态、焦点、滚动条和层级。
- 菜单样式只负责对应领域布局、结构和响应式差异，不重复公共配方。
- 产品视觉只在 `packages/ui` 实现。Web 和 Desktop 不维护第二套页面或平台专属视觉修补。
- 一个视觉职责只能有一个所有者。发现父子重复边框、页面 CSS 覆盖公共配方或同一 token 多处定义时，先删除冲突来源。

## 稳定语义

共享产品组件使用以下稳定标记：

| 标记 | 用途 |
|---|---|
| `data-prototype-root="product-workspace|detail-dossier"` | 原型根与页面级状态 |
| `data-surface="page|section|frame|list|row|split|content-stack|dialog|drawer"` | 表面和布局职责 |
| `data-ui-kind` | 共享组件类型，如 Shell、导航、按钮、字段、对象卡、状态矩阵和弹层 |
| `data-contract-id` | 跨原型和产品稳定定位，不参与业务判断 |
| `data-ui-part="label|value|detail|state|source|action"` | 组件内部信息槽位 |
| `data-text-tone="primary|body|meta|action|countdown|status"` | 文字颜色语义 |
| `data-info-priority="display|metric|decision|context|reading|support|trace"` | 信息权重与排版 |
| `data-value-kind="fact|countdown|status"` | 区分事实值、动态倒计时与状态词 |
| `data-status="neutral|pending|success|warning|error"` | 业务状态 |

按钮额外使用：

- `data-control-variant="primary|secondary|danger|ai|quiet"`
- `data-control-size="compact|standard|prominent"`
- `data-control-width="content|uniform"`
- `data-control-shape="text|icon"`

当前、展开、忙碌和禁用分别使用原生 `aria-current`、`aria-expanded`、`aria-busy`、`disabled` 或 `aria-disabled`，不得只靠 class 或颜色表达。

## 表面配方

| 配方 | 典型对象 | 边框与圆角 | 禁止事项 |
|---|---|---|---|
| `ShellChrome` | 顶部栏、侧栏、页头 | 连续结构线，直角 | 包成浮动卡片 |
| `PrimaryNavigation` | 一级菜单、嵌入目录 | 连续行与单线分隔；当前项使用导航背景和定位指示 | 每项独立卡片或业务色条 |
| `ContextSwitcher` | 角色、账号、当前对象 | 控件外框，当前项使用底部指示 | 当成页面导航或独立按钮组 |
| `SegmentedControl` | 同层模式切换 | 整体一圈控件边框，内部单线分隔 | 每项完整外框、文件夹 Tab |
| `PageSection` | 页面章节 | 只画必要章节分隔，直角 | 页面 section 卡片化 |
| `WorkspaceSplit` | 两栏、三栏工作区 | 外层无完整框，相邻栏位只有一条分隔线 | 外框和栏位双重边线 |
| `SurfaceList` | 目录、台账、连续结果 | 父级拥有一次外边界或继承栏位边界；行只画底部分隔 | 每行圆角卡片 |
| `SurfaceFrame` | 状态矩阵、摘要、独立空态 | `4px` 轻圆角和唯一外框，内部单元直角 | 嵌套首层卡片或使用对象卡圆角 |
| `ObjectCard` | 装备、Offer、Perk、能力 | `6px` 圆角和唯一对象边框 | 用于页面、目录或普通数据行 |
| `Callout` | 信息、警告、失败、AI 提示 | 中性对象边框，可使用左侧语义色条 | 导航、Tab、对象卡复用色条 |

页面级可见边界只分为 `ShellLine`、`SplitLine`、`RowLine` 和 `ObjectOutline`。同一条边只能由一个 DOM 层绘制。

## 尺寸与响应式

- 间距只使用 `4 / 8 / 12 / 16 / 20 / 24 / 32px`。
- 结构面直角；状态矩阵、摘要和状态框 `4px`；按钮、字段、分段控件、缩略图和图标容器 `4px`；对象卡 `6px`；短标签、计数和进度使用胶囊。
- 控件高度：紧凑 `30px`、标准 `34px`、主要入口 `40px`。文本命令默认 `34px`，图标按钮默认 `34px × 34px`。
- 设置和诊断等重复操作列使用 `144px` 文本按钮；普通命令栏按内容自适应。
- 全局验收宽度为 `1280 / 980 / 760px`。装备详情在 `1360px` 增加实例栏转 Drawer 的领域断点。
- Shell 顶栏默认 `48px`；`760px` 及以下可增高为两行。侧栏、品牌轨道、页面 gutter 和页头高度只由共享 Shell token 决定。
- 页面宽度类型：账号装备和仓库为 `fluid-workspace`；设置阅读区为 `constrained-content`；首页、资料库和商人为 `hybrid-workspace`。
- 响应式优先重排网格、换行操作区和转为单列，不缩小关键文字，不建立水平滚动轨道。

## 颜色、边框与当前状态

- 蓝色只表达导航、当前对象和可跳转操作；绿色表达成功、可用和主要确认；黄色表达警告；红色表达危险或失败；紫色只用于 AI；珊瑚红时间强调色只表达动态倒计时，并与错误红使用不同 token 和色值。
- Shell、章节、对象和控件分别使用对应语义边界 token，不使用弱边界代替强边界。
- 导航当前状态、对象选择、角色上下文和分段控件是四种不同状态，不共用指示方式。
- `hover`、`current`、`focus-visible`、`disabled` 和 `loading` 必须可同时区分。焦点环至少 `2px`，相对相邻表面达到 `3:1`。
- 容器的 `data-status` 可以影响边框、图标或背景，但不得把日期、版本、数量、名称等事实值一起染成状态色。
- 浅色与深色必须使用同一套语义 selector，仅替换 token；菜单不得新增主题专属硬编码颜色。

## 文字与信息权重

`Tone` 决定颜色，`Priority` 决定字号、字重和行高，两者不得混用。

| Priority | 排版 | 用途 |
|---|---|---|
| `display` | 页面 `24px/700`，章节 `18px/700` | 页面名、章节名、装备身份 |
| `metric` | `20px/700` | 单独呈现的关键数值 |
| `decision` | `16px/600` | 时间、奖励、成本、可用性、缺失和操作结果 |
| `context` | `15px/600` | 账号、角色、对象、活动、商人和方案名称 |
| `reading` | `14px/400` | 说明、属性、字段值和错误恢复 |
| `support` | `13px/400-600` | 标签、影响范围和辅助状态 |
| `trace` | `12px/400` | 来源、快照、版本和技术追溯 |

- 最小可见字号为 `12px`，字重只使用 `400 / 600 / 700`，字距为 `0`。
- 页面说明、错误原因和恢复路径至少使用 `reading + body`，不得降为 `trace + meta`。
- 日期、版本、数量、名称和 ID 是事实值；只有明确状态词使用 `status` tone。
- 截断只用于不可避免的单行对象名，并提供完整 tooltip、详情入口或可换行布局。
- 普通正文相对实际背景至少达到 `4.5:1`；交互边界和焦点相对相邻表面至少达到 `3:1`。

## 时间合同

| 类型 | 数据 | 显示 |
|---|---|---|
| 绝对时间点 | UTC ISO 8601 | 渲染时转换到当前系统时区 |
| 日期值 | `YYYY-MM-DD` 或结构化日期 | `YYYY/MM/DD`，不做时区转换 |
| 周期边界 | UTC 规则与下一个时间点 | 动态生成当地日期、星期和时间 |
| 时长 | 目标时间减当前时间 | 动态计算，不保存会过期文案 |

完整时间使用 `YYYY/MM/DD HH:mm:ss`，普通列表使用 `YYYY/MM/DD HH:mm`，Shell 紧凑时间今天使用 `HH:mm`、非今天使用 `MM/DD HH:mm`。动态倒计时统一使用 `countdown` tone 和 `--time-accent`，绝对更新时间仍使用普通事实值颜色。不得写死 `Asia/Shanghai`、地域时区名或预格式化相对时间。

## 导航与控件

- 页面或章节定位使用链接/按钮和 `aria-current`，不使用 Tab role。
- 互斥内容使用完整 `tablist / tab / tabpanel`，提供 `aria-controls`、`aria-labelledby`、方向键、Home 和 End。
- 单选筛选使用按钮组和 `aria-pressed`，不伪装为导航或 Tab。
- Primary、Secondary、Danger、AI 和 Quiet 只改变颜色语义，不改变按钮盒模型。
- 禁用控件保留可读标签和紧邻原因；加载控件保留目标与进行中反馈，不提前显示成功。
- 图标按钮必须有 tooltip 和可访问名称。产品使用同一套 Lucide 线性图标语言。

## 状态矩阵

三个原型和产品页面都必须表达：正常、加载、空、失败、部分可用、禁用和进行中。

| 状态 | 展示要求 |
|---|---|
| 正常 | 展示当前确认数据和可用操作 |
| 加载 | 保留稳定尺寸和主要导航，不以过期数据冒充当前结果 |
| 空 | 保留查询、切换、刷新或创建入口 |
| 失败 | 标明失败范围、原因和恢复入口 |
| 部分可用 | 展示已确认内容，并单独标记缺失范围 |
| 禁用 | 保留只读内容，并在控件附近说明原因 |
| 进行中 | 保留当前事实，展示目标和进度，成功后再更新结果 |

页面级状态写在原型根 `data-state`；业务状态写在具体组件或槽位的 `data-status`。产品必须绑定真实 ViewModel 状态，不复制原型状态开关。

## Overlay、Drawer 与层级

- Dialog 必须具有 `role="dialog"`、`aria-modal="true"`、标题关联、焦点限制、`Escape`、统一关闭路径和焦点恢复。
- Drawer 必须有标题、关闭按钮、遮罩、`Escape` 和焦点恢复；打开时背景不可操作。
- AI 助手在宽度大于 `980px` 时是停靠辅助栏；`980px` 及以下才是覆盖式 Drawer。
- Popover 在失焦、`Escape` 或触发器再次点击时关闭；Toast 不抢焦点，普通结果使用 `role="status"`。
- 层级只使用语义 token：base、sticky、popover、drawer-scrim、drawer、modal、toast。页面 CSS 不写数字 `z-index`。

## 滚动与溢出

- 产品页面只允许纵向滚动，不允许水平滚动条；不得用 `overflow-x: hidden` 掩盖超宽布局。
- 同一列最多只有一个纵向滚动容器。普通菜单由主内容区滚动，长目录可拥有独立纵向滚动，弹层内容使用 `overscroll-behavior: contain`。
- 小屏分栏改为纵向堆叠，不改成水平轨道。
- 滚动容器使用 `data-scroll-region="page|pane|overlay"` 标记所有权。

## 实施与验收

1. 先确认当前共享页面结构、最终计算样式和对应 Markdown 合同，再修改产品 UI。
2. 建立页面区域到真实字段、actions 和状态的绑定，不复制 mock 业务逻辑。
3. 删除冲突旧 DOM、旧 CSS 和兼容分支，再实现共享语义；不得追加高优先级覆盖。
4. Web 用于快速预览共享 React UI 和浏览器平台接线，Desktop 实窗作为真实功能的最终验收对象。
5. 在 `light / dark × 1280 / 980 / 760` 下检查边框所有权、布局、文字、图标、控件状态、焦点、滚动和零横向溢出。
6. 未完成 Desktop 对照前，任务状态只能是“待视觉验收”。
