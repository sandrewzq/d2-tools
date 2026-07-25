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
| `.status-chip` | `.shell-status-chip` | `styles/shell/01-chrome.css` | tone 只改变图标；可操作项必须保持相同盒模型 | Shell 契约 |
| `.top-tools` | `.shell-toolstrip` | `styles/shell/01-chrome.css` | 主题、语言、GitHub、AI 等真实工具 | 待补充 |
| `.window-tools` | `.shell-window-controls` | `styles/shell/01-chrome.css` | Electron 窗口能力；Web/Prototype 可以为空 | 待补充 |
| `.sidebar[data-shell-role="sidebar"]` | `.shell-sidebar[data-shell-role="sidebar"]` | `styles/foundation/03-surface-contract.css` | 真实菜单、账号摘要和仓库已读取数量 | 待补充 |
| `.page-head[data-shell-role="page-header"]` | `.product-workspace-header[data-shell-role="page-header"]` | `styles/foundation/03-surface-contract.css` | 页面标题与真实操作 | 待补充 |
| `[data-scroll-region]` | 共享纵向滚动容器或对应语义类 | foundation / components 公共滚动配方 | 只表达 page / pane / overlay 滚动所有权，不复制原型数据 | 待补充 |
| AI 抽屉 | `.global-assistant-panel` / `.assistant-workspace` | `styles/shell/01-chrome.css` | 真实 AI 会话、上下文和任务 | 待补充 |

## 顶部状态条配方

顶部状态条是紧凑的状态 Chip 集合，不是分段控件，也不是一个连续外框：

- 容器使用 flex、`gap: 6px`、左右 `12px` 内边距；它不绘制外框。
- 每个状态项高度 `26px`，水平内边距 `8px`，内部间距 `5px`。
- 每个状态项独立拥有完整 `--object-border` 与 `999px` 胶囊圆角；不得用首尾圆角和中间分隔线拼接。
- 在 `1280px` 以下，保留图标与状态值，隐藏重复状态名称并将间距收为 `4px`；不得因此改变 Shell 列宽。
- 背景使用 `--card-bg`。状态名称是 `support + meta`，状态值是 `context + primary`；不得为了让 Chip 紧凑而把状态值降为 trace。
- ready、warning、error、neutral 只改变图标颜色，不改变容器边框和背景。
- button 状态项必须显式重置浏览器外观、字体和盒模型，与 span 状态项完全一致。

## Shell 几何

所有值按 CSS viewport 计算，Shell 以 token 为唯一来源：

| 视口 | 顶栏 | 侧栏 | 页面 gutter | 章节间距 | 说明 |
|---|---:|---:|---:|---:|---|
| `>= 1281px` | `52px` | `184px` | `20px` | `16px` | 页头 / 侧栏摘要 `84px`；完整菜单与完整状态标签 |
| `981px - 1280px` | `52px` | `160px` | `18px` | `16px` | 页头 / 侧栏摘要 `84px`；状态 Chip 隐藏重复标签 |
| `761px - 980px` | `52px` | `72px` | `16px` | `16px` | 页头 / 侧栏摘要 `84px`；侧栏仅保留图标 |
| `<= 760px` | `96px` | `64px` | `12px` | `12px` | 页头静态流式；顶栏分两行，状态 Chip 保持独立对象 |

侧栏只拥有其右侧结构线，页头只拥有其底部结构线，内容页使用 gutter 对齐对象；任何首页、菜单或对象卡都不得补画 Shell 边界。

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
