# 开发者工具

`tools/` 用于保存可提交、可跨设备复用的维护者工具。

这里的脚本面向仓库维护者和开发协作流程，不是普通用户入口。适合放本地开发启动、Git 辅助、维护者一键发布、批量维护、迁移检查、一次性但需要跨设备保留的开发工具。

## 放置原则

- 项目自动化 helper 继续放在 `scripts/`，例如 CI 检查、构建、打包、发版准备和视觉验证。
- 本机运行态输出继续放在 `.local-data/tmp/`，例如日志、截图、pid、Chrome profile、临时缓存和调试产物。
- 可复用的开发者工具放在 `tools/`，按用途使用文件名前缀区分，例如 `git-`。
- 不要把 token、Cookie、浏览器 profile、缓存数据库或用户本地数据放进 `tools/`。

## 目录建议

```text
tools/
  dev-*.cmd          本地开发启动脚本
  git-*.cmd          Git 辅助脚本
  maintenance-*.cmd  批量维护或迁移脚本
```

## 当前工具

- `tools/dev-desktop.cmd`：启动本地 desktop 开发版，内部调用 `npx pnpm@9.15.0 dev:desktop`。
- `tools/dev-prototype.cmd`：启动本地 prototype 开发版，内部调用 `npx pnpm@9.15.0 dev:prototype`。
- `tools/dev-web.cmd`：启动本地 web 开发版，内部调用 `npx pnpm@9.15.0 dev:web`。
- `tools/dev-status.cmd`：只读查看 desktop/prototype/web 开发端口是否已被占用，不启动或结束任何进程。
- `tools/git-preflight.cmd`：只读按文档、工具、跨端 UI、Desktop、core/services/app/http 分组查看 Git 改动，识别菜单 lane / 共享层风险 / 多 lane 混改，并提示建议验证命令、高冲突文件和并行安全建议；后续 agent 开工前优先运行它。
- `tools/git-commit-and-push.cmd`：全量 `git add -A`；有变更就提交，没有变更就跳过；随后 push 当前分支；不创建 release tag。
- `tools/git-auto-release.cmd`：维护者一键发布入口；先用 GitHub CLI 检查当前包版本对应的 GitHub Release 是否已存在；如果当前版本发布失败或 Release 缺失，则复用当前版本并更新同名 tag 重新触发发布；如果当前版本已发布成功，才自动把版本号 patch +1，例如 `0.0.11` 到 `0.0.12`，并更新所有 package 版本和 `CHANGELOG.md`；随后运行 `check`、`test:docs` 和 `release:preview`，全量提交、push、创建或更新 release tag。

## Agent 快路径

弱模型或上下文不足时，不要先跑全量测试。先运行：

```cmd
tools\git-preflight.cmd
```

再按改动范围选择：

- 文档 / 工具说明：`npx pnpm@9.15.0 verify:docs`
- 跨端 UI / Prototype / Web：`npx pnpm@9.15.0 verify:ui`
- Desktop 接线 / IPC / preload：`npx pnpm@9.15.0 verify:desktop`
- Release / CHANGELOG / 版本脚本：`npx pnpm@9.15.0 verify:release`

只有发布、release、声称全仓通过或用户明确要求时，才默认跑全量 `pnpm test` 和 `pnpm typecheck`。
