# UI 静态原型

本目录集中保存全应用与装备详情的三个冻结静态 HTML 原型。它们是当前 UI 还原的唯一视觉真相，用于确定信息层级、布局、组件结构、尺寸、密度、颜色、排版、图标、状态和响应式规则，但不是产品运行时代码或业务逻辑模板。

当前应用的 DOM、CSS、旧组件 chrome 和 archive 页面不属于兼容目标；正式实现应抛弃与原型不一致的视觉结构。当前应用只提供真实 ViewModel、actions、adapter、IPC、数据规则、状态和错误恢复等功能真相，必须完整绑定到原型 UI，不能把本目录中的 mock 数据或演示交互复制为产品功能。

## 入口

- `全应用视觉原型.html`：全应用外壳、主菜单和各业务菜单的视觉基准。
- `统一武器详情原型.html`：武器详情的信息与交互基准。
- `统一护甲详情原型.html`：护甲详情的信息与交互基准。
- `统一配装工作台原型.html`：T1 配装工作台的高仿真交互原型，含 Bungie 槽位、本地方案和 DIM 配装分享链接导入；在用户确认后收口为冻结规格。
- `prototype-design-system.css`：三个原型唯一的公共视觉规则入口。
- `assets/full-app-prototype.css`：全应用原型的页面布局、菜单领域结构和响应式差异。
- `assets/weapon-detail-prototype.css`：武器详情原型的页面布局、武器领域结构和响应式差异。
- `assets/armor-detail-prototype.css`：护甲详情原型的页面布局、护甲领域结构和响应式差异。
- `assets/loadouts-workspace-prototype.css`：配装工作台高仿真原型的专属布局与响应式差异。
- `assets/loadouts-workspace-prototype.js`：配装工作台高仿真原型的状态、确认与交互演示。
- `specs/`：功能契约、状态矩阵和向真实应用还原时的字段与操作边界。

当前冻结规格包括：

- `specs/home-vendor-inventory.md`：首页商人库存展示与数据边界。
- `specs/account-slot-comparison.md`：账号页按类型、位置、当前装备和背包候选分区。
- `specs/vault-workspace.md`：仓库四个工作区、真实实例、标签和写操作边界。
- `specs/loadouts-workspace.md`：Bungie 游戏内配装与本地配装方案的对象和操作边界。
- `specs/library-workspace.md`：Manifest 查询、版本、历史和更新状态。
- `specs/vendors-workspace.md`：地点目录、完整库存、角色上下文和时效。
- `specs/settings-workspace.md`：八个设置分区、敏感数据和真实 action 边界。
- `specs/weapon-detail-layout.md`：武器详情章节、对象模式、数据来源和写操作状态。
- `specs/armor-detail-layout.md`：护甲五章正文、事实属性、独立目标来源和响应式实例栏。
- `specs/prototype-state-matrix.md`：三个原型统一的正常、加载、空、失败、部分可用、禁用和进行中状态。
- `specs/prototype-css-ownership.md`：公共设计系统、页面 CSS 和 HTML 的样式所有权与清理规则。
- `specs/scrolling-and-overflow.md`：统一纵向滚动条、滚动容器所有权和禁止水平滚动的验收契约。
- `specs/shared-shell-component-mapping.md`：共享 Shell 的原型 selector、应用 selector、样式所有权、功能边界和自动契约。

三个 HTML 不再包含内联 `<style>`。页面 CSS 只保留页面布局、领域内容和响应式差异；颜色 token、控件基础状态、目录、分段选择、数据组、对象卡、表格、Callout 和焦点规则统一由共享 CSS 提供。

三个 HTML 的样式加载顺序统一为“页面 CSS 在前、`prototype-design-system.css` 在后”。共享设计系统因此拥有公共 token、控件和 chrome 的最终级联权；页面 CSS 只能补充布局与领域结构，不能依赖更晚加载覆盖公共配方。

公共组件不得同时在页面 CSS 和 `prototype-design-system.css` 维护两套相互覆盖的配方。页面 CSS 与公共 CSS 同时命中一个元素时，声明职责必须互斥：页面 CSS 负责布局和领域差异，公共 CSS 负责共享 chrome 和状态。评审和还原一律以浏览器加载全部样式后的最终计算结果为准，不能从某一条历史声明单独推断视觉。

## 边框模型

| 类型 | 规则 | 典型组件 |
|---|---|---|
| 结构分隔 | 单条低对比分隔线，无圆角 | 页面栏位、章节、数据行 |
| 组合组 | 外框一圈、内部零间距、子项单线分隔 | 菜单目录、详情 Tab、状态组、摘要数据 |
| 独立对象 | 每项完整对象边框、圆角、明确间距 | 装备、Offer、Perk、能力卡 |
| 标签 | 默认使用底色和文字，不绘制中性对象边框 | 武器位置、弹药、伤害、普通 Badge |
| Callout | 中性对象边界配合左侧语义色条 | 信息、警告、错误、AI 内容 |

同一列表层级不能混用组合数据行和独立卡片。表格选中态只改变背景与文字状态，不增加对象卡边框或左侧色条。

## 还原到应用

确认原型后，公共视觉规则迁移到 `packages/ui/src/styles/` 的 foundation、workspace、components 或对应菜单分片；页面结构迁移到 `packages/ui` 的共享 View。迁移不是保留旧 DOM 后换颜色或补 CSS，而是按原型重建唯一 `*ContentView`。Prototype、Web 和 Desktop 继续消费同一个 `ProductShellHost`，不得复制静态 HTML 结构形成第二套产品页面。

迁移时按以下顺序核对：

1. 先建立现有功能清单、原型视觉结构清单、组件到真实字段/action 的绑定表和完整状态矩阵。
2. 保留真实 ViewModel 字段、状态、操作、数据来源和错误恢复，先迁移共享 token 与组件配方，再迁移菜单或详情布局。
3. 静态示例数据、固定数量、演示 toast 和假按钮只用于视觉对照，不进入产品组件。
4. 原型没有现有功能的位置时先更新并确认原型；原型控件没有真实能力时先确认契约，不伪造行为。
5. 每个菜单只保留一套真实页面结构，并在该菜单完成时同步删除 `presentation="archive"`、`Archive*Content` 和对应 archive CSS。
6. 共享 Shell 修改必须先更新 `specs/shared-shell-component-mapping.md`，并扩展对应的计算样式契约；没有 CI 契约和截图复核时只能标记“待视觉验收”。

## 真实本地快照

`data/generate-local-snapshots.mjs` 从当前用户的 d2-tools 本地数据生成账号工作区和设置页快照：

```powershell
node docs/work/references/ui-prototypes/data/generate-local-snapshots.mjs
```

生成结果包含账号名、角色、仓库、材料、配装、资料库历史、Manifest 状态和非敏感设置状态。生成器不会写入 OAuth token、Bungie API Key、Client Secret 或 AI Key；只保留“已配置”标记、协议、模型、Base URL 和回调地址等原型需要的信息。
