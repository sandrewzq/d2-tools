# 全局视觉合同

本合同把三个冻结原型与 `packages/ui` 的共享视觉层固定为同一套配方。它解决的是边框、圆角、页面区和滚动所有权，而不是替代各菜单的真实数据绑定或领域布局。

## 两个实现，唯一规格

- 静态冻结原型：`prototype-design-system.css` 是自包含样式来源，三个 HTML 可以直接打开。
- 产品实现：`packages/ui/src/styles/foundation/00-tokens.css` 与 `03-surface-contract.css` 是 Prototype、Web、Desktop 的共享实现来源。
- 一致性来源：本合同、`shared-shell-component-mapping.md`、组件规格卡和跨端视觉验收。静态原型与产品 CSS 不得互相 `@import`。

禁止把颜色、圆角、边框或共享尺寸重新抄回菜单 CSS、平台壳 CSS 或三个 HTML 的页面私有样式。原型公共 CSS 和产品共享 CSS 可以各自实现同一规格，但必须由同一组件规格卡逐项对照，不能依赖运行时文件路径“自动同步”。

## 五类配方

| 配方 | 语义标记 | 唯一拥有者 | 可拥有的视觉职责 | 禁止事项 |
|---|---|---|---|---|
| ShellChrome | `data-shell-role="titlebar"`、`sidebar`、`page-header` | 外壳或共享工作区组件 | 连续结构线、背景、直角、页头高度与内边距 | 菜单 CSS 再画页头/侧栏外框或改圆角 |
| PageSection | `data-surface="page"`、`section` | 页面或工作区结构 | 内容承载、栅格、垂直节奏 | 绘制独立对象边框、圆角或阴影 |
| SurfaceFrame | `data-surface="frame"` | 唯一外框元素 | 一圈对象边框、面板圆角、背景、裁剪 | 子项再画完整面板外框 |
| SurfaceList | `data-surface="list"` 与直接子项 `row` | 列表父级 | 外框、圆角、行分隔线 | 每行使用圆角卡片或同时画父/子外框 |
| Control / Chip | 现有按钮、字段、徽标语义 class | 组件公共样式 | 控件高度、控件圆角、状态与焦点 | 用于页面首层结构，或以状态色承担普通边框 |

一条可见外边只能由一个元素拥有。PageSection、split 和左右栏只使用单条低对比结构线；独立对象才使用 `SurfaceFrame`。列表必须在“组合行”与“独立对象卡”之间二选一，不能混用。

主侧栏的一级菜单是 ShellChrome，不是 `SurfaceList`：容器没有外框、圆角或独立底色，菜单项只使用水平分隔线；当前项仅使用选中背景和文字，不增加完整对象边框。二级目录、分段控件和真正的组合列表才允许使用外框。

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

后续菜单重建只能在这些语义上添加领域 class。若确实需要新共享配方，先扩展本合同与共享组件，不能在某一个菜单中发明新的首层 panel chrome。

## 实施与验收顺序

1. 先记录原型 selector、计算样式和对应产品的稳定 `data-reference-id`。
2. 先删除会与合同争夺同一边框、圆角、背景或 padding 所有权的旧规则，再接入共享语义标记。
3. 再迁移菜单领域布局和真实字段、action、加载/空/失败状态；不得把静态 mock 带入产品。
4. 每个菜单必须在 Prototype 后，再在 Desktop 的 light / dark、1280 / 980 / 760 宽度复核。发现任一旧视觉覆盖时，回到第 2 步，不追加高优先级补丁。

当前阶段只完成共享合同和共享工作区接线。各菜单内容层仍须按本合同逐个迁移并完成视觉验收，不能因为共享层已接入而标记为“已还原”。
