# 桌面发布、更新与迁移体验

> 状态：Backlog
> 更新时间：2026-06-29

## 目标

让 d2-tools 的安装、更新、迁移和排查体验继续靠近正式桌面软件。当前已有 GitHub Release、NSIS 安装器、更新检查、备份说明和诊断导出基础，后续重点是真实发布链路验收和关键体验补齐。

## 用户场景

玩家希望：

- 安装后能正常启动。
- 有新版本时提示足够明显。
- 能检查更新、下载更新、重启安装。
- GitHub 连接失败时知道原因和下一步。
- 换电脑或重装时能迁移本地数据。
- 出问题时能导出脱敏诊断。

## 产品原则

1. 更新提示要明确：不能只有弱提示，用户要知道是否有新版本、是否下载中、是否需要重启。
2. 网络失败要可解释：GitHub 失败、SSL 失败、代理问题、无 release 都要区分。
3. 本地数据优先保护：迁移和备份不能误导用户覆盖 token 或配置。
4. 诊断脱敏：不能导出 token、Client Secret、API Key。
5. 日常开发不反复打包：开发仍优先 `dev:desktop`。

## 功能范围

### 更新链路

必须验证：

- 检查更新。
- 发现新版本。
- 下载更新。
- 下载进度。
- 下载完成。
- 重启安装。
- 无更新。
- GitHub 连接失败。
- SSL / 代理问题。

### 发布链路

必须验证：

- GitHub Release 产物包含安装器、`latest.yml` 和 blockmap。
- `CHANGELOG.md` 对应版本存在。
- Release body 预览正常。
- tag 与 package 版本一致。

### 备份 / 迁移

当前可以先保留复制说明；如要升级成实际操作流，需要支持：

- 选择备份目录。
- 复制本地数据目录。
- 恢复前提醒关闭 d2-tools。
- 恢复后检查关键配置。

### 托盘图标

评估是否进入首版：

- 如果只是后台常驻，没有明确使用价值，可以暂缓。
- 如果更新下载、同步或长任务需要后台状态，可以进入候选。

## 代码边界

建议落点：

- `packages/desktop/src/main/ipc/updates.ts`
- `packages/desktop/src/shared/updateTypes.ts`
- `packages/desktop/src/renderer/api/updateApi.ts`
- `packages/desktop/src/renderer/features/settings/SettingsPage.tsx`
- `packages/desktop/src/renderer/features/settings/useUpdateFlow.ts`
- `packages/desktop/src/renderer/features/settings/useDiagnosticsSettings.ts`
- `scripts/local-package.ps1`
- `.github/workflows/` 相关发布流程。

## 开发切片

### 切片 1：真实 GitHub Release 验收

产出：

- 用真实 release 验证检查更新到重启安装的主链路。
- 记录失败原因和修复点。

验收：

- 成功链路可复现。
- 失败链路有明确中文提示。

### 切片 2：更新提示增强

产出：

- 设置页或全局状态更明确显示更新状态。
- 下载中、下载完成、重启安装有强状态提示。

验收：

- 用户不需要看日志也知道下一步。

### 切片 3：诊断与迁移体验

产出：

- 复制备份 / 迁移说明继续清晰。
- 脱敏诊断覆盖更新、配置、Manifest 和写操作状态。
- 评估是否升级成一键备份 / 恢复。

验收：

- 诊断不包含敏感字段。
- 迁移说明能指导用户完成换机。

### 切片 4：托盘图标评估

产出：

- 明确是否进入首版。
- 如果进入，列出托盘菜单、退出、打开窗口、更新状态。

验收：

- 只有在有明确产品价值时实现。

## 测试要求

推荐命令：

```powershell
npx pnpm@9.15.0 test
npx pnpm@9.15.0 typecheck
npx pnpm@9.15.0 docs:check
```

真实发布前额外执行：

```powershell
npx pnpm@9.15.0 release:preview --version x.y.z
powershell -File scripts/local-package.ps1
```

## 完成标准

1. 检查更新、下载、重启安装主链路真实可用。
2. GitHub 或网络失败时提示清楚。
3. 诊断导出保持脱敏。
4. 迁移说明或迁移工具能覆盖常见换机需求。
5. 托盘图标是否进入首版有明确结论。

