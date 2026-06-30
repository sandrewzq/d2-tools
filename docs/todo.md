# 当前待办

> 更新时间：2026-06-24
> 本 worktree 的 Tauri 2 迁移已经确认失败并作废。后续开发继续回到 `D:\sandrew\d2-service` 的 Electron 主线。本文件不再作为当前产品待办来源，只保留取消结论，避免后续 agent 误把 Tauri 分支当作主线继续开发。

## 当前结论

- `D:\sandrew\d2-tools` / `tauri2-rebuild` 分支不再作为 d2-tools 主线。
- Tauri 2 架构底座、Tauri Windows Release、Tauri updater、Capacitor / Web / PWA 多端路线全部取消。
- 已有 Tauri 设计、计划和发布闭环文档已删除，不再进入待办。
- 当前有效产品待办、Bug、需求和验收口径以 `D:\sandrew\d2-service\docs\todo.md` 为准。
- 后续继续使用 Electron + React + TypeScript + pnpm 的既有架构开发。

## 后续处理

- 不再在本 worktree 新增 Tauri 2 相关功能。
- 如果需要保留历史，可以保留 git 历史；如果不再需要该分支，可后续删除 `tauri2-rebuild` worktree / 分支。
- 若后续重新讨论迁移，需要重新立项，不复用本次失败方案。
