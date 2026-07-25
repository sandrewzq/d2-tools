# 配装工作台视觉合同

本规格固定 `全应用视觉原型.html` 中配装菜单的共享视觉结构。它只定义视觉与组件边界；游戏内配装、本地方案、DIM 导入、逐件转移和 Bungie 写入继续使用现有真实 ViewModel 与 action。

## 范围与前置条件

- 冻结视觉来源：`全应用视觉原型.html` 的 `data-page-view="loadouts"`。
- 静态样例只用于确认结构和状态，不得进入 `packages/ui`。
- 产品实现前必须完成配装功能清单、字段/action 绑定表，以及正常、加载、空、失败、部分失败、禁用、进行中状态矩阵。
- 当前阶段只冻结原型，不得为贴近旧产品 CSS 修改原型结构。

## 结构与配方

| 原型区域 | 静态 selector / 标记 | 配方 | 产品目标 | 边框所有权 |
|---|---|---|---|---|
| 页面标题 | `.page-head` | `ShellChrome` | `ProductWorkspaceHeader` | 仅页头底部分隔 |
| 角色选择 | `.full-loadout-character-tabs[data-ui-kind="context-switcher"]` | `ContextSwitcher` | 共享上下文切换组件或同等语义结构 | 容器仅底边；角色间单右分隔；当前项仅底部 2px 指示 |
| 配装类型 | `.full-loadout-mode-tabs[data-ui-kind="segmented-control"]` | `SegmentedControl` | 共享分段控件 | 外层唯一控件边框与圆角；内部仅单分隔 |
| 操作状态 | `.full-loadout-operation-status[data-surface="section"]` | `PageSection` | 状态带 | 仅底部分隔；状态点不承担容器边框 |
| 三栏主体 | `.full-loadout-workspace[data-surface="split"]` | `WorkspaceSplit` | `ProductWorkspaceSplit` | 外层无完整框；目录右边、摘要左边各只画一条分隔 |
| 方案目录 | `.full-loadout-directory-list[data-surface="list"]` | 嵌入式 `SurfaceList` | 目录列表 | 继承左栏边缘；行仅底部分隔 |
| 目录当前项 | `.full-loadout-directory-row.selected` | `SurfaceList` 选中行 | 目录行 | 只用背景与文字；禁止左色条、完整描边、圆角卡片 |
| 配装详情 | `.full-loadout-detail` 及内部章节 | `PageSection` | 真实详情内容 | 章节只画单条分隔 |
| 账号摘要 | `.full-loadout-summary` | `WorkspaceSplit` 右栏 | 真实核对摘要 | 仅左边分隔；不自建完整卡片 |
| DIM / 风险提示 | `.full-loadout-note` | `Callout` | 真实失败/提示 | 允许左侧语义色条；其他区域不得复用 |
| 物品条目 | `.full-loadout-item-row` | `SurfaceList` 行或 `ObjectCard` | 真实装备投影 | 在同一列表内二选一，当前为平面数据行 |

## 明确禁止的旧配方

- `.full-loadout-mode-tabs button` 不得使用独立四边边框、上圆角、负 `margin-left` 或用伪元素遮盖下边线。
- `.full-loadout-workspace` 不得拥有完整外框；左右栏不得在外框之外重复画相邻边。
- `.full-loadout-directory-row.selected` 不得使用 `inset 2px 0`、左侧蓝条或额外对象边框。
- 角色切换不得使用圆角卡片、每项完整边框或横向滚动轨道。
- 游戏内 / 本地模式不得复用角色上下文条的底部指示线；角色切换不得复用模式分段控件的外框。

## 响应式与状态

| 条件 | 行为 |
|---|---|
| 宽度大于 `1100px` | 目录、详情、摘要三栏同时显示；仅两条栏位分隔线可见。 |
| `760px` 到 `1100px` | 隐藏右侧摘要；目录和详情两栏保持单一分隔线。 |
| 小于等于 `760px` | 三栏纵向堆叠；目录和摘要取消左右边线，改为单条底部分隔；角色上下文文字可隐藏，但角色按钮不得产生横向滚动轨道。 |
| 当前项 | 角色为底部指示线；模式为分段控件选中背景；目录为行背景；三者不可互换。 |
| 空 / 加载 / 失败 | 保持同一分栏与章节顺序；状态内容进入详情或目录的既定区域，不额外创建首层卡片。 |

## 产品迁移顺序

1. 删除 `packages/ui/src/styles/menus/loadouts/03-workspace.css` 中旧文件夹 Tab、三栏完整外框、目录左色条和重复栏线。
2. 用共享 `ContextSwitcher`、`SegmentedControl`、`WorkspaceSplit` 和嵌入式 `SurfaceList` 语义替换对应产品 DOM / CSS。
3. 迁入真实游戏内配装、本地方案、DIM 导入提示、详情动作、逐件处理和状态恢复。
4. 在 Prototype 与 Desktop 依次按 light / dark、`1280 / 980 / 760` 宽度进行人工对照；任一差异回到第 1 步，不新增覆盖规则。
