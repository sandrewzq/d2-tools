# 桌面安装器与自动更新设计

## 背景

当前桌面发布链路只生成 Windows x64 `.7z` 绿色包，并上传到 GitHub Release。这个形态适合手动解压使用，但不适合标准的 Electron 自动更新：应用无法可靠替换正在运行的绿色目录，也缺少 `electron-updater` 需要的发布元数据。

后续发布形态切换为 Windows NSIS `.exe` 安装器，不再发布 `.7z` 绿色包。自动更新基于 `electron-updater` 和 GitHub Release。

## 已确认要求

- 只发布 `.exe` 安装器，不再发布 `.7z`。
- 安装器文件名带版本号，例如 `d2-tools-setup-0.0.7.exe`。
- 默认安装文件夹不带版本号，例如 `D:\Apps\d2-tools\` 或系统默认的 `d2-tools` 目录。
- 安装器必须支持选择安装位置。
- 用户选择同一目录时覆盖更新。
- 用户选择不同目录时允许多个版本目录并存。
- 开始菜单快捷方式统一叫 `d2-tools`，后安装的版本可以覆盖快捷方式指向。
- 手动安装覆盖已有目录时，需要在目标目录文件被占用时提示用户关闭对应实例，避免覆盖失败。
- 应用内自动更新入口放在设置页。

## 推荐方案

使用 `electron-builder` 的 NSIS target 生成 Windows 安装器，并引入 `electron-updater` 处理检查、下载、安装和状态事件。

构建配置方向：

```yaml
artifactName: "d2-tools-setup-${version}.${ext}"

win:
  target:
    - target: nsis
      arch:
        - x64

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  shortcutName: "d2-tools"
  uninstallDisplayName: "d2-tools"
```

发布到 GitHub Release 时上传：

- `d2-tools-setup-${version}.exe`
- `latest.yml`
- 安装器对应的 blockmap 文件

不再上传 `d2-tools-win-x64-${version}.7z`。

## 用户体验

设置页新增“应用更新”区块：

- 显示当前版本。
- 显示当前安装位置，用于解释自动更新只作用于当前运行实例。
- 提供“检查更新”按钮。
- 发现新版本后显示“下载更新”按钮。
- 下载完成后显示“重启并安装”按钮。
- 无新版本、网络失败、Release 元数据缺失、安装器下载失败等状态用中文提示。

应用启动后可以延迟自动检查一次更新，但不自动下载。下载和重启安装都由用户确认。

开发环境不检查更新，避免本地 `dev:desktop` 读取线上 Release 并误报。

## 覆盖与并存规则

手动安装时：

- 如果用户选择当前已有安装目录，新版本覆盖旧文件。
- 如果用户选择另一个目录，新旧版本目录可以并存。
- 开始菜单快捷方式统一指向最后安装的版本。
- 用户要运行旧版本时，可以从旧安装目录中的 `d2-tools.exe` 启动。

应用内自动更新时：

- 只更新当前正在运行的安装实例。
- 不扫描或修改其他目录中的旧版本。
- 设置页需要明确显示当前安装位置，避免用户误以为所有版本都会一起更新。

## 目标目录占用提示

安装器不能按进程名全局拦截所有 `d2-tools.exe`。项目允许多个安装目录并存，其他目录中的旧版本正在运行时，不应该阻止用户把新版安装到当前选择的目标目录。

手动安装路径：

- 用户选择安装目录后，安装器只关心目标目录中的文件是否被占用。
- 如果目标目录里的 `d2-tools.exe` 或相关文件被占用，提示用户关闭该目录对应的应用实例后重试。
- 如果用户选择的是新目录，即使其他目录有 `d2-tools.exe` 正在运行，也不阻止安装。
- 不做强制杀进程，避免中断正在进行的账号读取、装备操作或本地写入。

应用内自动更新路径：

- 设置页按钮文案是“重启并安装”，不是“关闭后安装”。
- 用户点击后，当前应用主动退出，再交给更新器安装当前实例的新版本。
- 这条路径不展示“请先关闭应用”的安装前提示；如果退出后仍有文件占用，再显示安装失败或重试提示。
- 自动更新只处理当前运行实例，不扫描或处理其他目录中的并存版本。

## 代码边界

主进程新增更新领域模块：

- `packages/desktop/src/main/ipc/updates.ts`
- `packages/desktop/src/main/ipc.ts` 只负责注册

Renderer API 新增更新契约，避免继续扩大 `api/client.ts`：

- `packages/desktop/src/renderer/api/updateApi.ts`
- 只在 `client.ts` 做运行时绑定和类型聚合

设置页负责展示和触发操作，不直接依赖 `electron-updater`。

建议状态类型：

```ts
export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "not_available"
  | "downloading"
  | "downloaded"
  | "error";
```

## 测试与验收

需要调整或新增测试：

- `packages/desktop/test/package-format.test.ts`：从断言 7z 改为断言 NSIS 安装器。
- `packages/desktop/test/release-workflow.test.ts`：断言 Release 上传 `.exe`、`latest.yml` 和 blockmap，不再上传 `.7z`。
- 新增更新 API wiring 测试，确认 preload、renderer API、设置页入口存在。
- 文档测试继续通过 `pnpm docs:check`。

验收标准：

- 打 tag 后 CI 只产出 Windows 安装器，不再产出 `.7z`。
- GitHub Release 包含自动更新需要的元数据。
- 安装器文件名带版本号，默认安装目录不带版本号。
- 安装器支持选择安装位置。
- 同目录安装可以覆盖更新，不同目录安装可以并存。
- 手动覆盖安装时，如果目标目录文件被占用，会提示用户关闭对应实例。
- 应用内自动更新时，点击“重启并安装”后由当前应用主动退出，不要求用户先手动关闭。
- 已安装旧版本打开设置页能检查到新版本。
- 下载完成后能重启并安装。
- 无网络、无新版本、元数据缺失时都有中文反馈。
- 开发环境不会触发线上更新检查。

## 不做范围

- 不做 MSI。
- 不再发布 7z 绿色包。
- 不做自研绿色包替换器。
- 不扫描或统一管理多个安装目录。
- 不做强制后台下载。
- 不做强制杀进程。
