# Overlay 与 Dialog 合同

本合同适用于配装确认弹窗、实例抽屉、Popover、Toast 和详情状态覆盖层。

## Dialog

Dialog 使用 `data-surface="dialog"`、`data-ui-kind="dialog"`、`role="dialog"`、`aria-modal="true"` 和可解析的 `aria-labelledby`。打开时记录触发元素，焦点移动到标题后的首个可操作元素；焦点必须限制在 Dialog 内。`Escape`、关闭按钮和允许时的遮罩点击都走同一个关闭函数，关闭后恢复触发元素焦点。打开期间背景不可获得焦点且不滚动。

## Drawer

Drawer 使用 `data-surface="drawer"`、`data-ui-kind="drawer"` 和 `aria-expanded` 触发器。它必须有可见标题、关闭按钮、遮罩、`Escape` 和焦点恢复；打开时不得让背景内容保持可操作。详情实例栏的宽屏栏位和窄屏抽屉共享同一数据与操作区。

### AI 助手

AI 助手在宽度大于 `980px` 时是停靠在工作区右侧的辅助栏：不使用遮罩、不捕获焦点，主工作区仍可并行操作。`980px` 及以下才是覆盖式 Drawer，必须启用遮罩、背景 `inert`、焦点捕获、`Escape` 和关闭后焦点恢复。

AI 内部固定为“标题与上下文、对话/任务 Tab、当前视图”的三层结构。对话视图再固定为“会话工具栏、唯一可滚动消息区、固定输入区”；后台任务进入任务 Tab，不允许重新出现覆盖输入区的固定 Dock。对话/任务是实际内容切换，必须使用完整 Tab 语义。

## 其他覆盖层

- Popover 使用 `data-ui-kind="popover"`，失焦、`Escape` 与触发器再次点击关闭，关闭后返回触发器。
- Toast 使用 `data-ui-kind="toast"`、`role="status"`、`aria-live="polite"`，不抢占焦点；失败或需要立即处理的结果才使用 `role="alert"`。
- 状态覆盖层不伪装为 Dialog；它只用 `role="status"` 公告状态，不截获正常导航。

## 层级

只允许使用 `--layer-base: 0`、`--layer-sticky: 10`、`--layer-popover: 20`、`--layer-drawer-scrim: 30`、`--layer-drawer: 40`、`--layer-modal: 50`、`--layer-toast: 60`、`--layer-prototype-tools: 90`。页面 CSS 不得写魔法 `z-index`。
