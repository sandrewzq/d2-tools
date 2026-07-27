# 控件、导航与响应式合同

## 控件与状态

按钮、字段、目录项、分段控件、对象行和短状态标签分别使用 `data-ui-kind="button|field|primary-navigation|segmented-control|object-card|status-chip"`。顶部持久 Shell 状态使用 `shell-status-strip` / `shell-status-item`，不复用独立胶囊标签。视觉 variant 一律使用 `data-control-variant`，class 只保留领域布局。

所有控件必须定义 `default`、`hover`、`pressed`、`focus-visible`、`disabled`；可选择对象额外定义 `current`，异步命令额外定义 `loading`、`success`、`warning`、`error`。`current`、`focus-visible`、`disabled` 与 `loading` 是不同状态，不能互相替代。

### 尺寸与宽度

- 文本命令默认使用 `data-control-size="standard"`，固定高度 `34px`、水平 padding `12px`、字号 `12px`。Primary、Secondary、Danger 和 AI 只改变颜色与语义，不改变高度、padding 或字体。
- `compact` 为 `30px`，只用于高密度工具栏；`prominent` 为 `40px`，只用于单一主流程入口。两者必须显式声明，不能根据按钮颜色或文案长度自动升级。
- 图标按钮使用标准 `34px × 34px` 正方形；窗口控制由 Shell 合同决定，不套文本按钮宽度。
- 普通命令栏按钮按内容自适应，但同一重复操作列必须使用 `data-control-width="uniform"`。设置页、诊断行等重复操作按钮统一为 `144px`；超出可用宽度时整组换行或降为单列，不缩小按钮或字体。
- Select、Input 和 Textarea 填充所属字段列，不与文本按钮共享固定宽度。按钮组中的各 variant 必须保持相同盒模型，禁用或加载状态不得改变尺寸。

## 导航模式

- 路由和页面内章节定位：使用 `nav`、链接或按钮，加 `aria-current="page|location"`，不使用 Tab role。
- 互斥内容切换：使用完整 `tablist` / `tab` / `tabpanel`，每个 Tab 有 `aria-controls`，每个面板有 `aria-labelledby`；支持左右方向键、Home、End 和焦点移动。
- 单选筛选或标签：使用按钮组与 `aria-pressed`，不伪装成导航或 Tab。

## 文字

最终可见文字的最小字号为 `12px`。`Tone + Priority` 是唯一的文字角色来源；CSS 不得以领域 class 为标题、正文或元信息重新指定字号、字重和颜色。紧凑密度只能调整间距、行高和对象数量，不能将信息降到 `12px` 以下。

## 断点与层级

全局工作区断点是 `1280 / 980 / 760px`。详情工作区在 `1360px` 增加“实例栏变抽屉”例外，`1150px` 和 `1040px` 只能作为详情内部网格重排，不得改变全局 Shell。所有层级使用 [Overlay 与 Dialog 合同](overlay-dialog-contract.md) 的 token；不得在页面 CSS 重写层级数值。
