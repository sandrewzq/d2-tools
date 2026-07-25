# 设置工作台契约

稳定契约标识：`settings.workspace`。

## 分区

设置页固定包含概览、语言与外观、账号、资料库、Bungie 接口、AI 助手、数据备份与迁移、诊断与操作日志。不得为了视觉简化删除现有设置项。

## 数据边界

- 原型快照可保存账号名、状态、版本、协议、模型、Base URL、回调地址和“已配置”标记。
- OAuth token、Bungie API Key、Client Secret 和 AI Key 永远不写入仓库快照。
- 原型交互只修改页面本地状态；正式实现继续调用现有配置保存、更新、备份、诊断和日志 action。
- 界面语言与 Manifest 语言分开建模，跟随开关只负责同步选择。
- “语言与外观”必须同时提供界面语言、Manifest 语言、语言跟随、深浅主题和信息密度控件；不能只保留语言设置。
- 主题与密度是产品设置，与原型验收工具中的快速切换器共享同一份页面状态，但正式还原时不复制原型工具。

## 状态

更新不可用、账号未授权、资料库不完整、接口未配置、操作失败、后台任务进行中和日志为空都必须有独立状态，禁用按钮显示真实条件。

## 视觉与字段映射

设置页属于 `hybrid-workspace`：左侧是嵌入式 `SurfaceList` 目录；右侧的状态、版本和操作数据使用完整可用工作轨道，不得再设置页面级最大宽度，只有标题说明、帮助说明和长文本字段限制阅读行长。Shell 只拥有目录与正文之间的 `SplitLine`；设置 section 和设置项使用 `RowLine`。概览状态不是装备、Offer 一类独立对象，必须使用连续的 `SurfaceList` 状态矩阵，不得拆成多个 `ObjectCard`。

### 概览切片

| 区域 | 结构 | 文字映射 | 状态与边界 |
|---|---|---|---|
| 设置目录 | `SurfaceList` | 菜单名 `context + primary`；提示 `support + body` | 当前项使用导航定位配方，不使用业务状态色 |
| 概览标题 | `PageSection` | 标题 `display + primary`；说明 `reading + body` | 无独立外框 |
| 状态指标 | 连续三列 `SurfaceList` 状态矩阵 | 标签 `support + meta`；状态/关键值 `context + primary` 或 `decision + status`；摘要 `reading + body` | 矩阵只拥有一圈方形外框；单元只画行/列分隔，不使用圆角或独立对象边框 |
| 应用更新 | `PageSection` + 连续字段矩阵 | 标题 `context + primary`；更新结果 `decision + status`；说明和版本字段 `reading + body` | 更新字段与概览矩阵使用同一连续边界；进度只在下载或安装中显示 |
| 常用操作 | `SurfaceList` | 操作名 `context + primary`；原因/影响 `reading + body` | 行只画 `RowLine`；命令按 Control 合同 |
| 反馈 | `Callout` | 结论 `decision + status`；失败恢复 `reading + body` | 必须有 `data-status`，不通过 `.ready/.error` class 着色 |

### 概览响应式

- `>1280px`：状态指标三列两行；更新字段三列；操作行保留“说明 + 命令”两列。
- `1280px` 及以下：状态指标和更新字段改两列，文本与按钮先换行，不能缩小状态值。
- `980px` 及以下：状态指标、更新字段和操作行全部单列；命令保持自然换行。
- `760px` 及以下：目录折叠为窄轨，正文 gutter 使用全局 `12px`；状态指标仍为单列，字段、说明和状态不得截断或建立横向滚动。

设置页的动态模板必须直接输出 `data-ui-part`、`data-text-tone`、`data-info-priority`；状态项额外输出 `data-status`。不得用运行后扫描 DOM 的兼容脚本补齐语义。
