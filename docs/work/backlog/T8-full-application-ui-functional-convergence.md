# 全应用共享 UI 与视觉收口

> 状态：待视觉验收
> 更新时间：2026-07-30

## 目标

将产品界面收敛为 `packages/ui` 中唯一的共享页面结构，由 Web 和 Desktop 共同消费。冻结 HTML 决定视觉与规格交互，当前 ViewModel、actions、adapter、IPC 和真实状态决定功能；两者不得互相替代。

T8 不再保存逐日迁移记录、差异编号和已完成切片的过程描述。需要追溯时使用 Git 历史。

## 真相来源

| 内容 | 唯一来源 |
|---|---|
| 当前状态和下一步 | [`docs/todo.md`](../../todo.md) |
| 长期前端边界 | [`docs/development.md`](../../development.md) 与仓库根目录 `AGENTS.md` |
| 全应用视觉 | [`全应用视觉原型.html`](../references/ui-prototypes/全应用视觉原型.html) |
| 武器详情视觉 | [`统一武器详情原型.html`](../references/ui-prototypes/统一武器详情原型.html) |
| 护甲详情视觉 | [`统一护甲详情原型.html`](../references/ui-prototypes/统一护甲详情原型.html) |
| 全局视觉规则 | [`global-visual-contract.md`](../references/ui-prototypes/specs/global-visual-contract.md) |
| 菜单数据与状态边界 | [`application-workspaces.md`](../references/ui-prototypes/specs/application-workspaces.md) |
| 统一装备详情边界 | [`equipment-details.md`](../references/ui-prototypes/specs/equipment-details.md) |

三个静态 HTML 是视觉验收基准，不是生产代码模板。原型中的 mock 数据、固定数量、状态开关和演示反馈不得进入产品实现。

## 范围

T8 当前覆盖：

- 共享 Shell：顶部栏、连续状态组、侧栏、页头、主滚动区、AI 辅助栏和后台任务入口。
- 设置、首页、账号、资料库、仓库和商人菜单。
- 统一武器详情与统一护甲详情。
- Web、Desktop 对同一 `ProductShellHost` 和共享页面的消费边界。
- 账号页不展示“材料与消耗品”菜单，也不提供从当前角色装备直接创建本地方案的入口；材料快照和配装菜单中的创建入口不受影响。

配装菜单已接入共享 UI；本地方案、护甲优化、DIM 导入、应用与发布流程仍由 T1 跟踪并等待验证。旧 `LoadoutTemplate` 兼容切片与旧配装视觉规格已经失效，不作为 T8 完成依据。

## 当前状态

| 区域 | 代码状态 | T8 状态 |
|---|---|---|
| 共享 Shell 与 AI 辅助栏 | 已迁入 `packages/ui` | 待 Desktop 实窗视觉验收 |
| 设置 | 八个分区已使用共享页面 | 待 Desktop 实窗视觉验收 |
| 首页 | 已绑定真实每日、每周和商人数据 | 待 Desktop 实窗视觉验收 |
| 账号 | 已恢复 Tab、角色上下文和按位置装备对照 | 待 Desktop 实窗视觉验收 |
| 资料库 | 已恢复查询、历史、版本和完整性状态 | 待 Desktop 实窗视觉验收 |
| 仓库 | 四个工作区已共用真实实例和 actions | 待 Desktop 实窗视觉验收 |
| 商人 | 已恢复地点目录、完整库存、角色上下文和时效状态 | 待 Desktop 实窗视觉验收 |
| 武器与护甲详情 | 已共用档案骨架、实例栏和响应式 Drawer | 待 Desktop 实窗视觉验收 |
| 配装 | 旧兼容切片，不是最终目标 | 转由 T1 重建，不纳入本轮视觉完成判断 |

## 实施约束

1. 每个菜单只保留一棵产品页面，不得恢复 `presentation="archive"`、`Archive*Content`、`visualVariant` 或平台专属视觉分支。
2. `packages/ui` 持有页面结构和视觉；Web 和 Desktop 只持有平台 adapter、预览数据与真实能力接线。
3. 原型决定布局、层级、尺寸、密度、颜色、排版、状态和响应式行为；产品现有数据合同决定字段、操作、权限、加载、空、失败、部分失败和进行中状态。
4. 原型缺少现有功能时，先更新原型再实施；原型出现产品没有的能力时，先确认契约，不得伪造成功行为。
5. 与共享 Shell、全局 token、首层工作区、跨菜单组件有关的规则进入共享层；菜单 CSS 只负责对应领域内容。
6. 不使用更高 specificity、`!important` 或平台私有 CSS 覆盖旧结构。发生冲突时删除旧 DOM 或旧规则。
7. 新的配装需求只更新 T1 和其后续原型，不在 T8 重新建立平行配装规格。

## 验收

T8 只有在以下条件全部满足后才能标记完成：

1. Desktop 实际窗口使用当前共享 UI 和当前 CSS 资源。
2. Shell、设置、首页、账号、资料库、仓库、商人、武器详情和护甲详情均完成 `light / dark × 1280 / 980 / 760` 对照。
3. 核对区域顺序、边框所有权、栅格、间距、字号、颜色、控件状态、焦点、Drawer、滚动和零横向溢出。
4. 真实数据、actions、加载、空、失败、部分失败、禁用和进行中状态没有丢失。
5. 没有旧视觉分支、平台复制页面或 mock 业务逻辑进入产品实现。
6. 视觉差异已经修正，验收结果回写 `docs/todo.md`；过程截图和临时差异记录不长期留在正式文档中。

冻结 HTML 和 Web 只能提供规格与中间预览证据，Desktop 实窗是 T8 的最终完成依据。

### Bug #6、#7 手工验收

前提：使用 `tools\dev-desktop.cmd` 启动当前 Desktop。对每个主题 `light`、`dark`，将 Desktop 渲染区分别调整为 `1280`、`980`、`760` CSS 像素宽；使用真实已有数据，不能用原型或空状态替代。

1. Bug #6：分别打开一件武器和一件护甲详情，使用包含“来源说明”的推荐数据。确认实例 Drawer 触发按钮的高度、边框、圆角和背景仍符合详情样式，来源说明保持零外边距与正确前景色；鼠标悬停和键盘焦点状态不得被通用按钮或段落规则覆盖。若当前数据没有来源说明，记录为“未覆盖”，不得标记该项通过。
2. Bug #7：在每个主题和宽度下，依次打开首页主滚动区、武器详情、护甲详情、账号、设置、资料库与商人。确认正文、Drawer、账号目录、设置目录、资料库查询栏和商人目录没有横向滚动条、被截断的长 ID / URL / 英文名称或超出边框的控件；`760` 宽度下目录和详情内容必须按既有断点堆叠或换行。
3. Bug #7：在上述页面打开时，于 Desktop renderer DevTools 控制台执行以下检查；结果必须为 `true`。这只检查横向尺寸，不能替代目视核对。

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
  [...document.querySelectorAll(".shell-content, .item-modal, .shared-item-detail-body, .account-directory, .settings-directory, .library-query, .vendor-rail")]
    .every((element) => element.scrollWidth <= element.clientWidth)
```

4. 任一主题、宽度或页面失败时，在 `docs/todo.md` 将对应 Bug 改回“待修”，并简要记录失败区域；全部通过后，将 Bug #6、Bug #7 标记完成，并将 T8 转为可收口状态。

## 修改边界

- 共享 UI：`packages/ui`
- Web 壳：`packages/web`
- Desktop 平台接线：`packages/desktop`
- 视觉基准与规格：`docs/work/references/ui-prototypes/`

本任务不修改领域真相、平台能力或发布流程；发现这类缺口时应转入对应任务，而不是塞进 T8。
