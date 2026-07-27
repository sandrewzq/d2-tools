# 共享 Shell 原型映射

本文件记录冻结原型到 `packages/ui` 共享 Shell 的组件映射。它不是实现计划，而是 UI 还原时必须满足的视觉与功能契约。

## 真相来源

- 视觉真相是三个冻结 HTML 加载全部样式后的浏览器最终计算结果，不是 HTML 中任意一段局部声明。
- 静态原型的主题 token 和 Shell / Surface 几何只在 `prototype-design-system.css` 定义；产品实现使用 `packages/ui/src/styles/foundation/00-tokens.css` 与 `03-surface-contract.css`。两侧不互相导入，通过本映射和视觉验收对齐。
- 应用侧必须重新实现原型视觉，但继续消费真实 ViewModel、actions、adapter、IPC、状态和错误恢复。
- 旧 DOM、旧 CSS、archive 样式和已有 class 不是兼容目标。与原型冲突的规则必须删除，不能通过不断增加更具体的覆盖选择器保留。

## 组件映射

| 原型组件 | 应用组件 | 样式所有者 | 功能边界 | 自动契约 |
|---|---|---|---|---|
| `.topbar[data-shell-role="titlebar"]` | `.shell-titlebar[data-shell-role="titlebar"]` | `styles/foundation/03-surface-contract.css` | 使用真实平台工具、窗口控制和状态数据 | Shell 契约 |
| `.brand` / `.brand-mark` | `.shell-window-brand` / `.shell-app-mark` | `styles/shell/01-chrome.css` | 品牌文案来自共享 copy | Shell 契约 |
| `.status-strip` | `.shell-status-strip` | `styles/shell/01-chrome.css` | 状态来自 `ShellStatusItem[]`；可操作项允许渲染为 button | Shell 契约 |
| `.status-item` | `.shell-status-group` | `styles/shell/01-chrome.css` | tone 只改变图标；可操作项必须保持相同盒模型 | Shell 契约 |
| `.top-tools` | `.shell-toolstrip` | `styles/shell/01-chrome.css` | 主题、语言、GitHub、AI 等真实工具 | 待补充 |
| `.window-tools` | `.shell-window-controls` | `styles/shell/01-chrome.css` | Electron 窗口能力；Web/Prototype 可以为空 | 待补充 |
| `.sidebar[data-shell-role="sidebar"]` | `.shell-sidebar[data-shell-role="sidebar"]` | `styles/foundation/03-surface-contract.css` | 真实菜单、账号摘要和仓库已读取数量 | 待补充 |
| `.page-head[data-shell-role="page-header"]` | `.product-workspace-header[data-shell-role="page-header"]` | `styles/foundation/03-surface-contract.css` | 页面标题与真实操作 | 待补充 |
| `[data-scroll-region]` | 共享纵向滚动容器或对应语义类 | foundation / components 公共滚动配方 | 只表达 page / pane / overlay 滚动所有权，不复制原型数据 | 待补充 |
| AI 抽屉 | `.global-assistant-panel` / `.assistant-workspace` | `styles/shell/01-chrome.css` | 真实 AI 会话、上下文和任务 | 待补充 |

## 顶部状态条配方

顶部状态条是一个紧凑的连续状态组合组，不是独立 Chip 集合，也不是筛选或分段控件：

- 容器使用 flex、`gap: 0`、左右 `12px` 内边距；状态项共同形成一圈连续外框。
- 每个状态项高度 `26px`，水平内边距 `8px`，内部间距 `5px`。
- 所有状态项的上、下边界使用 `--object-border`；中间只保留一条 `--divider`，不得绘制重复左右边框。
- 第一项补左边界并仅保留左侧 `4px` 圆角，最后一项使用右侧 `--object-border` 并仅保留右侧 `4px` 圆角；中间项全部直角。
- 在 `1280px` 以下，保留图标与状态值，隐藏重复状态名称；不得因此改变 Shell 列宽或把状态项改成独立胶囊。
- 背景使用 `--card-bg`。状态名称是 `support + meta`，状态值是 `context + primary`；不得为了让状态组紧凑而把状态值降为 trace。
- ready、warning、error、neutral 只改变图标颜色，不改变容器边框和背景。
- button 状态项必须显式重置浏览器外观、字体和盒模型，与 span 状态项完全一致。

## Shell 几何

所有值按 CSS viewport 计算，Shell 以 token 为唯一来源：

| 视口 | 顶栏 | 侧栏 | 页面 gutter | 章节间距 | 说明 |
|---|---:|---:|---:|---:|---|
| `>= 1281px` | `52px` | `184px` | `20px` | `16px` | 页头 / 侧栏摘要 `84px`；完整菜单与完整状态标签 |
| `981px - 1280px` | `52px` | `160px` | `18px` | `16px` | 页头 / 侧栏摘要 `84px`；状态组隐藏重复标签 |
| `761px - 980px` | `52px` | `72px` | `16px` | `16px` | 页头 / 侧栏摘要 `84px`；侧栏仅保留图标 |
| `<= 760px` | `52px` | `64px` | `12px` | `12px` | 页头静态流式；窗口控制隐藏，状态入口展开为覆盖式连续直角状态列表 |

侧栏只拥有其右侧结构线，页头只拥有其底部结构线，内容页使用 gutter 对齐对象；任何首页、菜单或对象卡都不得补画 Shell 边界。

## AI 辅助栏配方

- 宽屏使用 `360px` 停靠栏，`1280px` 以下使用 `330px`；`980px` 以下切换为右侧 Drawer，`760px` 以下接管顶部栏下方的完整工作区宽度。
- 抽屉头部高度 `64px`、内边距 `10px 12px`，标题 `14px`，当前页面说明 `12px`；设置和关闭均使用 `34px` 图标按钮。
- 对话 / 任务页签紧接抽屉头部，使用两等分连续分段控件，不添加外部卡片留白。
- 对话工具栏高度至少 `48px`、内边距 `7px 12px`；消息列表使用 `12px` 内边距和 `8px` 间距，消息属于 `ObjectCard`，不是新的页面分区。
- 输入区固定在辅助栏内容末端，使用顶部结构线、`10px 12px` 内边距和“弹性文本框 + `76px` 发送命令”两列结构；不得再包一层浮动卡片或阴影。
- 对话页保留真实会话记录、页面上下文、错误与禁用状态；任务页只承载 AI 任务、攻略解析、账号对照和配装草稿，不得混入 Manifest 更新、应用下载等后台运行任务。应用后台任务继续由设置菜单的诊断与操作日志分区管理。设置入口可以迁到抽屉头部，但不能删除对应操作。

## 修改流程

1. 在本文件登记原型 selector、应用 selector、样式所有者和功能边界。
2. 使用浏览器检查冻结原型最终计算样式，不从单个 CSS 声明推断结果。
3. 删除应用侧与原型冲突的旧规则，再完整实现组件配方。
4. 保留并接回真实数据、操作、状态和错误恢复，不复制原型 mock 行为。
5. 为共享组件扩展 `pnpm visual:shell-contract` 或对应视觉契约。
6. CI 契约通过且截图完成人工复核前，只能标记“待视觉验收”，不能标记“已修复”。

滚动容器还原时同时遵守 `scrolling-and-overflow.md`：公共层统一外观，菜单只声明纵向所有权，商品、标签、导航和表格不得使用水平滚动。

## 完成定义

- 原型与应用组件映射已登记。
- DOM 结构能够表达原型视觉和现有真实功能。
- 冲突旧规则已删除，没有新增主题或平台专属补丁。
- light / dark、普通状态和可操作状态使用同一配方。
- 计算样式契约已进入 CI。
- CI 截图产物可供评审。
- `docs/todo.md` 在视觉验收前保持“待视觉验收”。
