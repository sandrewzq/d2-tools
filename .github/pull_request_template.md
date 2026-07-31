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

## UI 变更

- [ ] 已在 `docs/work/references/ui-specs/` 更新共享结构、状态或真实功能边界，或本次不涉及合同变化。
- [ ] 已直接检查 `packages/ui` 的实际页面，没有维护平行 HTML 原型。
- [ ] 已删除冲突旧规则，没有通过新增更具体的覆盖保留旧视觉结构。
- [ ] 已补充对应计算样式合同；本地未运行时由 CI 执行。
- [ ] 在 CI 截图或人工对比完成前，相关待办保持“待视觉验收”。
