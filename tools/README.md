# 开发者工具

`tools/` 用于保存可提交、可跨设备复用的维护者工具。

这里的脚本面向仓库维护者和开发协作流程，不是普通用户入口，也不是发布流程入口。适合放 Git 辅助、批量维护、迁移检查、一次性但需要跨设备保留的开发工具。

## 放置原则

- 项目自动化脚本继续放在 `scripts/`，例如 CI 检查、构建、打包、发版和视觉验证。
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
- `tools/git-commit-and-push.cmd`：全量 `git add -A`；有变更就提交，没有变更就跳过；随后 push 当前分支；不创建 release tag。
- `tools/git-auto-release.cmd`：自动把版本号 patch +1，例如 `0.0.10` 到 `0.0.11`；更新所有 package 版本和 `CHANGELOG.md`；随后全量提交、push、创建并 push release tag。
