# 参考资料目录

这个目录保存仍对当前实现有直接参考价值的设计基准、外部资料分析和数据源调研。这里不是正式文档入口，也不记录阶段性进度；正式开发规则以 `docs/development.md` 为准，当前待办以 `docs/todo.md` 为准。

## 当前可用参考

- `d2-unified-workspace-layout-v0.html`：当前跨端页面设计参考基准。用于讨论首页、账号、仓库、配装、资料库、商人和设置各页面应该承载什么信息，以及共享 UI 的布局约束。
- `destiny-tool-reference.md`：Destiny 工具和信息组织参考。
- `desktop-framework-comparison.md`：桌面技术方案对比参考。
- `2026-06-21-destiny2-weapon-sheet-analysis.md`：武器表格和数据分析参考。

## 使用规则

- UI 方案先用 `d2-unified-workspace-layout-v0.html` 讨论页面职责和信息架构。
- 工作区骨架、首层面板和样式系统收口执行计划见 `docs/work/backlog/cross-platform-workspace-style-hardening.md`；不要再新建平行的 UI 壳计划。
- 用户确认后，真实实现必须迁入 `packages/ui`，再由 `packages/prototype`、`packages/web` 和 `packages/desktop` 共同消费。
- `packages/prototype` 是活跃可交互原型；HTML 参考文件不能长期维护成第二套产品页面。
- 不要把短期进度、路线图、调试日志或一次性讨论记录放在这里。
