# UI 静态原型

本目录保存三个冻结静态 HTML 及其直接依赖。它们是共享 UI 的视觉验收基准，不是产品运行时代码，也不是业务逻辑模板。

## 入口

- [`全应用视觉原型.html`](全应用视觉原型.html)：共享 Shell、设置和各业务菜单。
- [`统一武器详情原型.html`](统一武器详情原型.html)：武器详情。
- [`统一护甲详情原型.html`](统一护甲详情原型.html)：护甲详情。
- [`prototype-design-system.css`](prototype-design-system.css)：三个原型的公共 token、文字、控件、表面、状态和层级。
- `assets/`：各原型的领域布局、交互脚本和响应式差异。
- `data/`：原型 mock 与脱敏本地快照生成器。

`全应用视觉原型.html` 的配装章节已承载本地方案工作台的冻结视觉和交互规格。产品实现以当前领域、数据和写操作边界为准，原型中的 mock 数据与演示行为不得直接进入运行时代码；实现状态仍由 [T1](../../backlog/T1-loadout-plans-and-guide-import.md) 跟踪，待验证通过后才能收口。

## 规格

`specs/` 只保留三份仍有效的规格：

- [`global-visual-contract.md`](specs/global-visual-contract.md)：全局语义、表面配方、文字、控件、状态、响应式、滚动和验收规则。
- [`application-workspaces.md`](specs/application-workspaces.md)：共享 Shell 和各菜单（含 T1 配装工作台）的真实数据与状态边界。
- [`equipment-details.md`](specs/equipment-details.md)：武器、护甲和共享详情档案骨架。

不再为单个迁移切片、差异编号保留平行规格；尚待验证的 T1 仍以其 backlog 为准。过程记录使用 Git 历史追溯。

## 所有权

| 文件 | 负责 | 不负责 |
|---|---|---|
| `prototype-design-system.css` | 公共视觉 token、组件 chrome、状态、焦点、滚动条和层级 | 菜单私有布局、mock 数据、产品 CSS |
| `assets/full-app-prototype.css` | 全应用布局、菜单领域结构和响应式差异 | 公共 palette、控件 reset、第二套组件配方 |
| `assets/weapon-detail-prototype.css` | 武器领域布局和响应式差异 | 公共详情 chrome 和公共 token |
| `assets/armor-detail-prototype.css` | 护甲领域布局和响应式差异 | 公共详情 chrome 和公共 token |
| 三个 HTML | 语义结构、静态样例和原型交互挂点 | 产品业务逻辑、真实 IPC、旧产品 DOM |

三个 HTML 不包含内联 `<style>`。静态原型与产品 CSS 运行时隔离，通过规格和最终计算样式对齐，不通过 `@import` 互相依赖。

## 还原边界

1. 原型决定布局、层级、尺寸、密度、颜色、排版、状态和响应式行为。
2. 产品 ViewModel、actions、adapter、IPC、真实数据和错误恢复决定功能真相。
3. mock 数组、固定数量、原型状态开关、演示 toast 和假按钮不得进入产品实现。
4. 页面只在 `packages/ui` 实现；Web 和 Desktop 共同消费同一个 `ProductShellHost`。
5. 与原型冲突的旧 DOM、旧 CSS 和视觉分支应删除，不使用覆盖层维持兼容。
6. 冻结 HTML 和 Web 只提供规格与中间预览证据，Desktop 实窗是最终完成依据。

## 本地快照

`data/generate-local-snapshots.mjs` 可从当前用户的本地数据生成脱敏原型快照：

```powershell
node docs/work/references/ui-prototypes/data/generate-local-snapshots.mjs
```

生成器不得写入 OAuth token、Bungie API Key、Client Secret 或 AI Key，只保留原型需要的非敏感状态。
