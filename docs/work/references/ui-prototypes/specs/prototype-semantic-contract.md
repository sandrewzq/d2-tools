# 原型 HTML 语义合同

本合同适用于 `全应用视觉原型.html`、`统一武器详情原型.html` 和 `统一护甲详情原型.html`。它定义静态原型的稳定语义标记；CSS class 只能描述布局或领域内容，不能承担跨原型的组件、文字或状态语义。

## 根节点与页面状态

每份原型必须有唯一 `data-prototype-root`：全应用使用 `product-workspace`，装备详情使用 `detail-dossier`。根节点同时声明 `data-reference-only="true"`、`data-visual-contract="surface-v2"`、`data-theme="light|dark"` 和 `data-state="normal|loading|empty|error|partial|disabled|running"`。`data-detail-state` 等页面私有状态不得再作为并列协议。

## 表面与组件

- 页面结构使用 `data-surface="page|section|frame|list|row|split|content-stack|dialog|drawer"`。
- 共享组件使用 `data-ui-kind`，至少覆盖 `shell-chrome`、`shell-status-strip`、`shell-status-item`、`primary-navigation`、`context-switcher`、`segmented-control`、`button`、`field`、`object-card`、`callout`、`status-chip`、`status-matrix`、`summary-frame`、`state-frame`、`dialog`、`drawer`、`toast`。`shell-status-item` 属于连续状态组，内部直角且只允许整体首尾小圆角；`status-chip` 只用于可独立识别的短标签。`status-matrix`、`summary-frame` 与 `state-frame` 使用统一 `4px` 轻圆角，内部连续单元保持直角，不得借用 `object-card` 的 `6px` 圆角。
- 跨页面稳定视觉对象使用 `data-contract-id`；顶部状态组固定为 `shell.status-strip`。该标记只用于合同定位，不参与业务状态判断。
- 组件内部可见槽位使用 `data-ui-part="label|value|detail|state|source|action"`。动态模板必须在生成 HTML 时直接输出这些标记，不能在运行后扫描 DOM 补齐。

## 文字、状态与数据来源

- 每个可见槽位都声明 `data-text-tone="primary|body|meta|action|status"` 与 `data-info-priority="display|metric|decision|context|reading|support|trace"`。
- 状态矩阵、摘要和台账中的主要值额外声明 `data-value-kind="fact|status"`。日期、版本、数量、名称和普通数值属于 `fact`，使用 `primary` 或 `body`；只有“已配置、进行中、空闲、警告、失败”等业务状态词属于 `status`，同时使用 `data-text-tone="status"` 与 `data-status`。
- 组件或槽位存在业务状态时，使用 `data-status="neutral|pending|success|warning|error"`；状态不得只依赖 `.ready`、`.mint`、`.error` 等 class。
- `data-status` 可以放在容器上供状态逻辑和边框读取，但不得让后代文字自动继承状态色。文字是否着色只由该文字自身的 `data-text-tone` 决定。
- 需要追溯的内容声明 `data-source`；展示来源的槽位仍使用 `data-ui-part="source"`。

## 控制状态

所有按钮声明 `data-ui-kind="button"` 与 `data-control-variant="secondary|primary|danger|ai|quiet"`，并声明 `data-control-size="compact|standard|prominent"`、`data-control-width="content|uniform"` 和 `data-control-shape="text|icon"`。静态原型可省略默认值，但产品共享 `ControlButton` 必须输出完整属性。Primary 固定为绿色主要操作，AI 固定为紫色智能命令；CSS class 只能表达领域布局或图标结构，不能表达按钮颜色。当前、展开、加载和禁用分别使用原生 `aria-current`、`aria-expanded`、`aria-busy`、`disabled` 或 `aria-disabled`，不得只通过 `active` / `is-active` class 传达状态。

## 迁移要求

原型重构期间，先为根节点、共享骨架和静态组件补齐标记；动态渲染函数在其所属原型切片内补齐。新增 HTML 不得再引入未登记的根节点、状态名或共享组件 class 体系，也不得恢复 `.primary-button/.secondary-button/.danger-button`、`.button.primary/.danger/.violet` 或 `is-primary`。
