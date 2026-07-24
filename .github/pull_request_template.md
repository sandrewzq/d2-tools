## Summary

- 

## Checks

- [ ] Updated `docs/todo.md` for completed, canceled, reprioritized, or otherwise changed current work.
- [ ] Updated `docs/todo.md` for fixed, invalid, or reclassified bugs and requirements when applicable.
- [ ] Put unfinished designs/plans/research under `docs/work/` only when they still have direct reference value.
- [ ] Did not add date-named or process documents directly under `docs/`.
- [ ] Did not keep stale historical/process documents that would now act as noise.
- [ ] Ran `pnpm docs:check`.
- [ ] Ran relevant tests or explained why not.

## UI / 原型变更

- [ ] 已在 `docs/work/references/ui-prototypes/specs/` 登记原型组件到应用组件的映射和真实功能边界，或本次不涉及 UI。
- [ ] 已按浏览器最终计算样式还原，没有从 HTML 局部声明或旧应用 CSS 推断视觉结果。
- [ ] 已删除冲突旧规则，没有通过新增更具体的覆盖保留旧视觉结构。
- [ ] 已补充对应计算样式契约；本地未运行时由 CI 执行。
- [ ] 在 CI 截图或人工对比完成前，相关待办保持“待视觉验收”。
