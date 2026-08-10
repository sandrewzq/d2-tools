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

- `tools/dev-desktop.cmd`：唯一的双击 Desktop 开发入口。自动清理 `53172` 残留监听进程和本仓库 Electron 进程；直接比较 Core、HTTP、Services、Electron main 与 preload 的实际产物和对应源码修改时间，自动选择增量构建或完整重建。首次运行、产物缺失、依赖或根构建配置变化时自动完整重建；仅 Renderer / UI / CSS 变化时直接启动。
- `tools/dev-web.cmd`：启动本地 web 开发版；启动前会清理占用 `53171` 的残留监听进程，并在服务就绪后自动打开浏览器。
- `tools/git-preflight.cmd`：只读按文档、工具、跨端 UI、Desktop、core/services/app/http 分组查看 Git 改动，识别菜单 lane / 共享层风险 / 多 lane 混改，并提示当前验证策略、高冲突文件和并行安全建议；后续 agent 开工前优先运行它。
- `tools/git-commit-and-push.cmd`：全量 `git add -A`、提交并 push 当前分支；在工作区存在无关改动时不要使用。
- `tools/git-auto-release.cmd`：维护者一键发布入口。发布前必须在 `CHANGELOG.md` 准备包含 `### 中文` 和 `### English` 的 `## Unreleased` 玩家更新日志；脚本先执行与 GitHub CI 一致的 `install --frozen-lockfile`、发布测试门禁和全量 `typecheck`，通过后才把该段提升为新版本、更新 package 版本、提交、推送 tag 并等待 GitHub Release workflow 成功。任一步失败都会停止发布并保留完整原因。

## Agent 快路径

弱模型或上下文不足时，先运行只读预检：

```cmd
tools\git-preflight.cmd
```

`git-preflight` 只报告改动范围、并行风险和高冲突文件，不执行也不推荐本地验证。

- 开发、完成、检查、验收、交接和普通提交：不自动运行测试、类型检查、构建、`verify:*` 或视觉脚本。
- 普通 push：push 后由 GitHub CI 异步验证，agent 不等待结果。
- Release：只使用 `tools\git-auto-release.cmd`，等待本地门禁和 GitHub Release 全部成功。
- 用户明确点名某个命令时：只运行该命令，不自行追加检查。
