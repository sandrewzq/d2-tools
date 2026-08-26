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
  win-dev-*.cmd      Windows 本地开发启动脚本
  mac-dev-*.command  macOS Finder 双击开发启动脚本
  mac-git-*.command  macOS Finder 双击 Git / Release 入口
  win-git-*.cmd      Windows 双击 Git / Release 入口
  maintenance-*.cmd  批量维护或迁移脚本
```

## 当前工具

- `tools/win-dev-desktop.cmd`：Windows 双击 Desktop 开发入口，转交统一的 `pnpm dev:desktop` 增量启动器。
- `tools/win-dev-web.cmd`：Windows 双击 Web 开发入口；启动前会清理占用 `53171` 的残留监听进程，并在服务就绪后自动打开浏览器。
- `tools/mac-dev-desktop.command`：macOS Finder 双击 Desktop 开发入口；失败时保留终端窗口便于查看错误。
- `tools/mac-dev-web.command`：macOS Finder 双击 Web 开发入口；失败时保留终端窗口便于查看错误。
- `tools/mac-git-preflight.command`：macOS Finder 双击运行 Git 预检，只读查看改动范围。
- `tools/mac-git-commit-and-push.command`：macOS Finder 双击执行 `git add -A`、默认提交并 push 当前分支；在工作区存在无关改动时不要使用。
- `tools/mac-git-auto-release.command`：macOS Finder 双击执行完整 Release 门禁；会运行 frozen install、测试、类型检查、版本准备、提交、推送、tag 和 GitHub Release workflow。
- `tools/win-git-preflight.cmd`：Windows 双击运行 Git 预检，只读查看改动范围。
- `tools/win-git-commit-and-push.cmd`：Windows 双击执行 `git add -A`、默认提交并 push 当前分支；在工作区存在无关改动时不要使用。
- `tools/win-git-auto-release.cmd`：Windows 双击执行完整 Release 门禁、版本准备、提交、推送、tag 和 GitHub Release workflow。

## Agent 快路径

弱模型或上下文不足时，先运行只读预检：

Windows：双击 `tools\win-git-preflight.cmd`；macOS：双击 `tools/mac-git-preflight.command`。

`git-preflight` 只报告改动范围、并行风险和高冲突文件，不执行也不推荐本地验证。

- 开发、完成、检查、验收、交接和普通提交：不自动运行测试、类型检查、构建、`verify:*` 或视觉脚本。
- 普通 push：push 后由 GitHub CI 异步验证，agent 不等待结果。
- Release：只使用对应平台的 Git Release 入口，等待本地门禁和 GitHub Release 全部成功。
- 用户明确点名某个命令时：只运行该命令，不自行追加检查。
