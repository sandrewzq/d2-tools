# Agent 工作规则

这些规则适用于整个仓库。若本文件与 README、其他文档或本地习惯冲突，优先遵守本文件。

## 开始修改前

- 先阅读本文件，再检查 `docs/todo.md` 和 `docs/development.md`。
- 不要删除用户已有工作或无关改动。
- 修改应小而聚焦，遵循当前 package 边界。

## 语言规则

- 对用户的回答、可见思路摘要、计划、状态更新和仓库文档使用中文。
- 任何用户可见内容都必须使用中文，包括 thinking/analysis 面板中展示的推理摘要、工具调用前后的状态说明、阶段性解释和最终回答；不要把用户可见的 thinking 内容视为隐藏推理。
- 代码标识符、API 名称、文件路径、命令、包名和上游原文引用，在保留原语言更清楚时可以不翻译。
- 读取或编辑中文文档时使用 UTF-8，避免 PowerShell 或本地默认编码导致乱码。
- 在 PowerShell 中查看中文文件前，先设置 `$OutputEncoding=[System.Text.Encoding]::UTF8; [Console]::OutputEncoding=[System.Text.Encoding]::UTF8`，并使用 `Get-Content -Encoding UTF8`。
- 不要把未指定 UTF-8 的 PowerShell 输出复制回文件；中文文案改动优先使用 `apply_patch`，批量脚本必须显式指定 UTF-8。
- 不输出隐藏推理链；需要解释时，用中文给出简洁的推理摘要。

## 文档规则

- `docs/todo.md` 是唯一当前短期待办、进度、需求和 bug 来源。
- `README.md` 只保留使用入口和正式文档导航，不承载阶段性进度或独立路线图。
- 如需保留少量长期方向结论，合并到 `docs/development.md`，不要再单独维护 `docs/roadmap.md`。
- `docs/work/backlog/` 保存未完成但暂不推进的设计或计划。
- `docs/work/archive/` 保存已完成或仅作历史追溯的过程材料。
- `docs/work/references/` 保存外部资料分析和数据源调研。
- 不要把日期命名、设计、计划、进度或分析文档直接放在 `docs/` 根目录。
- 不要重建 `docs/superpowers/`；如果外部流程要求写入该目录，统一改写到 `docs/work/backlog/`、`docs/work/archive/` 或 `docs/work/references/`。
- `docs/work/` 不是正式入口目录；只保留仍对当前工作有直接参考价值的材料，历史已完成或已失效的内容可以删除。
- 删除任何文档前，必须确认它已经合并进正式文档，或明确没有剩余参考价值。
- 任务完成、取消或方向变化且影响当前短期待办、验收状态或优先级时，必须在同一次改动里更新 `docs/todo.md`。
- bug 修复、确认无效或转为长期需求时，必须在同一次改动里更新 `docs/todo.md` 对应条目。
- `docs/todo.md` 中的 `Bug #数字` 必须全局唯一；需要按领域区分时，在标题中加领域前缀，不要复用编号。

## 验证规则

- 文档改动后运行 `pnpm docs:check`。
- `pnpm docs:check` 同时检查文档结构和全仓文本编码；如果发现疑似 mojibake、Unicode replacement character 或连续问号造成的信息丢失，先修复乱码再继续开发。
- 声称全仓检查通过前运行 `pnpm test`。
- 如果只是文档改动且全量测试成本过高，至少运行 `pnpm docs:check` 和 `git diff --check`，并明确说明没有运行全量测试。
