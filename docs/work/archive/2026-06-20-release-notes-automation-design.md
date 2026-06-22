# d2-tools Release 说明自动化设计

更新时间：2026-06-20

关联问题：
- 当前 `v0.0.4` GitHub Release 页面只有使用说明，缺少版本变更日志。

## 1. 背景

`d2-tools` 已经在 [`CHANGELOG.md`](../../../CHANGELOG.md) 中维护面向玩家的中文更新日志，但 GitHub Release 页面目前使用的是写死的固定文案：

```yaml
body: |
  Windows x64 绿色包，7z 格式。
  使用方式：...
```

这导致：

- 玩家下载时看不到当前版本修复或新增了什么
- 发版人可能忘记在 Release 页面补日志
- Release Body 与 CHANGELOG.md 两个来源不一致

本设计目标是把 Release Body 的生成自动化，同时补全几个发布链路缺口。

## 2. 版本目标

本次设计要达成：

1. Release Body 自动从 `CHANGELOG.md` 当前版本章节提取
2. 如果 CHANGELOG 未更新，CI 在打 tag 后失败，避免再次发布空日志
3. `v0.0.x` 测试版本自动标记为 `prerelease`
4. 提供本地预览脚本，开发者能在打 tag 前看到最终 Release Body
5. 把 `latest.yml` 一并发布，为后续 Electron 自动更新留下骨架

## 3. 明确边界

### 3.1 本设计要做

- 新增 CHANGELOG 解析脚本
- 修改 Release workflow，加入提取、校验、prerelease 标记
- 本地预览 Release Body 的脚本
- 上传 `latest.yml` 到 Release Assets
- 更新 `docs/development.md` 中的发版流程

### 3.2 本设计不做

- 不接入 Electron 客户端自动下载安装逻辑
- 不改现有的 7z 绿色包形态
- 不增加安装包（.exe / .msi）
- 不做代码签名
- 不做多平台 Release（macOS / Linux）

### 3.3 约束

- 保持 Release Body 中文、玩家友好的风格
- 不引入额外外部服务或密钥
- 改动只影响 CI 和开发者脚本，不影响运行时功能

## 4. 数据流

```
开发者更新版本号 + CHANGELOG.md
            ↓
git tag v0.0.5 && git push origin v0.0.5
            ↓
GitHub Actions
  ├─ 校验 root / core / desktop / http 的 package.json version 与 tag 一致
  ├─ 校验 CHANGELOG.md 存在 ## 0.0.5 章节
  ├─ 运行测试与类型检查
  ├─ pnpm package:win（生成 7z + latest.yml）
  ├─ 用 generate-release-notes.mjs 生成 release-notes.md
  └─ softprops/action-gh-release
       ├─ 上传 d2-tools-win-x64-0.0.5.7z
       ├─ 上传 latest.yml
       ├─ body = release-notes.md（已由 generate 脚本拼接 CHANGELOG + 固定使用说明）
       └─ prerelease: true
```

## 5. 模块设计

### 5.1 CHANGELOG 解析脚本

新增 `scripts/extract-changelog.mjs`：

```bash
node scripts/extract-changelog.mjs --version 0.0.5 --output release-notes.md
```

行为：

- 读取项目根目录 `CHANGELOG.md`
- 查找 `## {version}` 章节标题，例如 `## 0.0.5 - 2026-06-21`
- 提取到下一个 `## ` 或文件结束
- 去除首尾空白行
- 保留 Markdown 原格式
- 将结果写入 `--output` 指定的文件，或输出到 stdout

失败条件：

- `CHANGELOG.md` 不存在
- 找不到对应版本章节

其他情况：

- 章节只有标题没有内容：输出 warning，但允许继续生成 Release Body

### 5.2 生成完整 Release Body 脚本

新增 `scripts/generate-release-notes.mjs`：

```bash
node scripts/generate-release-notes.mjs --version 0.0.5 --output release-notes.md
```

行为：

- 调用 `extract-changelog.mjs` 获取当前版本 CHANGELOG 内容
- 拼接固定使用说明
- 将完整 Release Body 写入 `--output` 指定的文件

### 5.3 本地预览脚本

新增 `scripts/preview-release-notes.mjs`：

```bash
pnpm release:preview --version 0.0.5
```

行为：

- 调用 `generate-release-notes.mjs`
- 将完整 Release Body 输出到终端，方便打 tag 前检查

`package.json` 增加脚本：

```json
"release:preview": "node scripts/preview-release-notes.mjs"
```

### 5.4 Release Body 模板

最终 body 由两部分拼接：

```markdown
{CHANGELOG 当前版本内容}

---

Windows x64 绿色包，7z 格式。

使用方式：
1. 下载 d2-tools-win-x64-*.7z。
2. 用 7-Zip、Bandizip、WinRAR 等工具解压到任意目录。
3. 双击 d2-tools.exe。

覆盖升级不会删除 %APPDATA%\d2-tools 里的本地配置、token 和缓存。
从旧版 d2-service 升级时，首次启动会复制 %APPDATA%\d2-service 到 %APPDATA%\d2-tools。
```

### 5.5 自动更新骨架

`electron-builder` 在打包 Windows 时默认会生成 `latest.yml`，路径大致为：

```
packages/desktop/release/latest.yml
```

CI 中需要把它和 7z 一起收集并上传：

```yaml
files: |
  release-artifacts/d2-tools-win-x64-*.7z
  release-artifacts/latest.yml
```

本次只做到“发布 latest.yml”，不接入客户端自动下载安装逻辑。

## 6. 修改清单

### 6.1 `.github/workflows/release.yml`

- 新增 `Checkout` 步骤（publish-github job 中需要读取 CHANGELOG）
- 新增 CHANGELOG 校验步骤
- 新增 `generate-release-notes.mjs` 生成 release-notes.md 步骤
- `action-gh-release` 增加 `prerelease: true`
- `action-gh-release` 的 `body_path` 指向生成的 `release-notes.md`
- `action-gh-release` 的 `files` 增加 `latest.yml`

### 6.2 `package.json`

- 新增 `"release:preview": "node scripts/preview-release-notes.mjs"`

### 6.3 `docs/development.md`

- 补充发版流程：
  1. 更新所有 `package.json` 版本号
  2. 更新 `CHANGELOG.md`
  3. 本地运行 `pnpm release:preview --version x.y.z` 检查
  4. 提交并打 tag
  5. 推送 tag，由 CI 自动发布

## 7. 错误处理与风险

### 7.1 CHANGELOG 未更新

处理原则：

- CI 在校验步骤失败，不会生成 Release
- 错误信息明确提示“CHANGELOG.md 缺少 x.y.z 章节”

### 7.2 CHANGELOG 格式解析异常

处理原则：

- 如果找不到章节标题，按未找到处理
- 如果提取内容为空，给出 warning 但允许继续
- 不因为解析问题影响已有内容展示

### 7.3 latest.yml 未生成

处理原则：

- 如果文件不存在，`action-gh-release` 的 `fail_on_unmatched_files: true` 会导致失败
- 这样能在第一时间发现 electron-builder 配置变化

### 7.4 prerelease 标记

处理原则：

- `v0.0.x` 全部标记为 prerelease
- 等进入 `v1.x` 或明确稳定版策略后再改为 conditional

## 8. 测试策略

### 8.1 本地测试

- 运行 `pnpm release:preview --version 0.0.4`，检查输出与 CHANGELOG 一致
- 运行 `node scripts/generate-release-notes.mjs --version 0.0.4 --output tmp.md`，检查 tmp.md 包含完整 body
- 运行 `node scripts/extract-changelog.mjs --version 0.0.99`，确认会失败

### 8.2 CI 测试

- 校验步骤本身即为测试
- 发布后可检查 Release 页面是否包含：
  - CHANGELOG 当前版本内容
  - 7z 文件
  - latest.yml
  - Pre-release 标签

### 8.3 手工验收

- 推送一个测试 tag 到 fork 或临时分支，确认 Release 生成正确
- 删除测试 tag 和 Release

## 9. 推荐实施顺序

1. 编写 `scripts/extract-changelog.mjs`
2. 编写 `scripts/generate-release-notes.mjs`
3. 编写 `scripts/preview-release-notes.mjs`
4. 修改 `package.json` 增加 preview 脚本
5. 修改 `.github/workflows/release.yml`
6. 更新 `docs/development.md` 发版流程
7. 本地验证 preview 脚本
8. 可选：在已有 `v0.0.4` tag 上手动补 Release Body（本次不改历史 tag）

## 10. 验收定义

若本设计完成，应满足：

1. 推送新 tag 后，GitHub Release Body 自动显示对应版本的 CHANGELOG 内容
2. 如果 CHANGELOG 未更新对应版本，CI 失败且不发布 Release
3. Release 自动标记为 Pre-release
4. 开发者本地可预览最终 Release Body
5. Release Assets 中同时包含 7z 包和 latest.yml
6. `docs/development.md` 中有清晰的发版操作步骤

## 11. 本设计的结论

本次改动不大，但能补齐 `d2-tools` 发布链路中最明显的缺口：Release 页面与 CHANGELOG 不同步。同时通过 prerelease 标记和 latest.yml 发布，为后续测试阶段传播和自动更新打下基础。