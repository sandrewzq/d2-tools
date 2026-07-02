# 桌面 UI 视觉基准

这个目录保存桌面端 UI 的参考说明。活跃原型已经从静态 HTML 迁移到 React prototype：`packages/prototype`。

## 使用规则

- 视觉密集页面先改 `packages/prototype` 的 React prototype，再改真实应用代码。
- 原型确认后，用 `npx pnpm@9.15.0 visual:home` 等截图链路对比 React prototype 和 Electron 实际页面。
- 布局、颜色、间距和组件层级应尽量与原型一致；允许差异只包括真实数据内容差异和平台渲染细节。
- 不要把短期进度、路线图或一次性讨论记录放在这里。

## 当前入口

- `packages/prototype`：当前活跃可交互原型。
- `packages/ui`：Prototype / Web / Desktop 共享 UI 壳和页面 View。
