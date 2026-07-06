# d2-tools

d2-tools 是一个给普通玩家使用的、面向 Windows 的 Destiny 2 中文桌面工具。

它把账号查看、仓库整理、资料库搜索、今日 / 本周信息和 AI 辅助整合到一个本地运行的桌面客户端里，尽量减少你在多个网站、网页工具和零散信息源之间来回切换的成本。

- 中文界面，优先面向普通玩家而不是开发者
- Windows 本地运行，不需要自己部署服务
- 账号、仓库、资料库、今日 / 本周、AI 一体化
- 配置、OAuth token、标签和本地数据保存在本机
- 基于 Bungie 官方授权流程，不走第三方账号中转

## 下载与运行

当前公开测试版本和下载入口请查看 [GitHub Releases](https://github.com/sandrewzq/d2-tools/releases)。

系统要求：Windows x64；首次使用需要按 [Bungie 配置指南](docs/bungie-setup.md) 创建并填写自己的 Bungie Application。

Windows x64 安装器：

```text
d2-tools-setup-<version>.exe
```

你不需要安装 Node.js、Python、Docker，也不需要手动部署服务。下载安装器并运行，按向导完成安装后即可开始使用。

程序的本地数据默认保存在：

```text
%APPDATA%\d2-tools
```

这里会保存你的本地配置、Bungie OAuth token、资料库缓存、仓库标签、备注和操作日志。安装或更新程序时，这些数据不会被自动删除。

如果你以前用过旧项目名 `d2-service`，首次运行新版本时会自动把旧数据目录复制到 `%APPDATA%\d2-tools`。程序不会删除旧目录，确认新版本正常后再决定是否手动清理。

## 适合谁

- 想用中文界面查看 Destiny 2 账号、仓库、装备和材料的玩家
- 想整理仓库、标记可清理装备、做同名 roll 对比的玩家
- 想在一个工具里同时处理账号、资料库、今日 / 本周和 AI 分析的玩家
- 愿意自己创建 Bungie Application 并填写到本机配置里的玩家

## 三分钟快速开始

1. 下载安装器并运行。
2. 按 [Bungie 配置指南](docs/bungie-setup.md) 创建你自己的 Bungie Application。
3. 打开 d2-tools，在首次引导或设置页填写 `API Key`、`Client ID`、`Client Secret`。
4. 点击“登录 Bungie”，在浏览器里完成授权。
5. 点击“初始化资料库”，下载 Destiny 2 资料库。
6. 回到软件开始查看账号、仓库、资料库、今日 / 本周和 AI 助手。

## 核心功能

- 账号：读取角色、光等、当前装备、背包、邮政官和材料摘要
- 仓库：按武器、护甲、装备、位置、子弹、评分、锁定状态和本地标签筛选
- DIM 风格整理：同名装备对比、重复组建议、批量候选选择、清理清单、游戏内定位提示
- 写操作：锁定、解锁、装备、仓库转移、一键装备最高光等
- 资料库：按中文、英文、perk、别名搜索装备、perk 和来源信息
- 今日 / 本周：只展示 Bungie API 或本地资料库能确认的内容
- AI 助手：支持 OpenAI Responses、OpenAI Chat Completions 和 Anthropic Messages 三种协议配置
- 本地优先：配置、token、标签、备注和日志保存在本机

## 文档导航

玩家常用：

- [玩家使用指南](docs/user-guide.md)
- [Bungie 配置指南](docs/bungie-setup.md)
- [常见问题](docs/faq.md)
- [安全说明](docs/security.md)
- [支持与反馈](SUPPORT.md)

如果你遇到使用问题，建议先看 FAQ、Bungie 配置指南和支持文档；如果涉及敏感信息、凭据或安全边界，请改看 [安全策略](SECURITY.md)。

项目状态：

- [当前待办](docs/todo.md)
- [更新日志](CHANGELOG.md)

开发者：

- [开发说明](docs/development.md)
- [贡献指南](CONTRIBUTING.md)
- [安全策略](SECURITY.md)

## 安全边界

- 公开分发包不内置任何人的 Bungie `API Key`、`Client ID` 或 `Client Secret`
- 每个玩家都使用自己的 Bungie Application
- OAuth token 只保存在本机数据目录
- AI 不读取、也不发送 token、`Client Secret` 或 Bungie `API Key`
- 写操作默认关闭，需要 Bungie Scope、本地开关和确认流程
- d2-tools 不会直接分解装备，最终分解仍需进入游戏手动完成

更完整的边界说明见 [安全说明](docs/security.md)。

## 参考方向

参考工具分析已迁到 [Destiny 2 工具参考](docs/work/references/destiny-tool-reference.md)。README 只保留使用入口和正式文档导航；后续产品设计、竞品能力和外部数据源分析统一放在 `docs/work/references/`。

## 开发

一键本地打包（install + 测试 + 类型检查 + 打包）：

```powershell
powershell -File scripts/local-package.ps1
```

如需分步执行：

```powershell
npx pnpm@9.15.0 install      # 安装依赖
npx pnpm@9.15.0 test          # 运行测试
npx pnpm@9.15.0 typecheck     # 类型检查
npx pnpm@9.15.0 package:win   # 仅打包
```

更多开发和发布细节见 [开发说明](docs/development.md)。

## License

本项目基于 [MIT License](LICENSE) 开源。

## Star History

<a href="https://www.star-history.com/?repos=sandrewzq%2Fd2-tools&type=date&legend=top-left">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=sandrewzq/d2-tools&type=date&theme=dark&legend=top-left" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=sandrewzq/d2-tools&type=date&legend=top-left" />
    <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=sandrewzq/d2-tools&type=date&legend=top-left" />
  </picture>
</a>

