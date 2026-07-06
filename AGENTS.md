# Agent 工作规则

这些规则适用于整个仓库。若本文件与 README、其他文档或本地习惯冲突，优先遵守本文件。

## 开始修改前

- 先阅读本文件，再检查 `docs/todo.md` 和 `docs/development.md`。
- 弱模型或上下文不足时，先运行 `tools\git-preflight.cmd` 判断改动范围、建议验证命令和高冲突文件，再按下方“快速执行矩阵”行动。
- 不要删除用户已有工作或无关改动。
- 修改应小而聚焦，遵循当前 package 边界。

## 快速执行矩阵

后续 agent 默认按这个矩阵行动；拿不准时先只读检查，不要扩大改动范围。

| 改动类型 | 优先修改位置 | 必跑验证 | 避免事项 |
|---|---|---|---|
| 文档、待办、README | `README.md`、`docs/`、`AGENTS.md` | `pnpm verify:docs` | 不重建 archive / superpowers 目录；不把阶段计划塞进 README |
| 维护者脚本、Git 辅助 | `tools/*.cmd`、必要时 `scripts/` | `pnpm verify:docs`，并运行脚本 `--help` 或只读模式 | 不提交 token、Cookie、profile、缓存库；不把用户本地数据放进仓库 |
| 跨端 UI / 原型 / Web | `packages/ui` 优先，`packages/prototype` 和 `packages/web` 只做壳或 mock | `pnpm verify:ui`；首页或设置页视觉改动追加 `pnpm visual:home` / `pnpm visual:settings` | 不在 prototype 长期维护第二套真实页面；不只改 Desktop 复制 UI |
| Desktop 接线、IPC、preload | `packages/desktop/src/main/ipc/*`、`api/*Api.ts`、对应 feature | `pnpm verify:desktop`；复杂改动再跑相关定向测试 | 尽量不碰 `api/client.ts`、`api/types.ts`、`ipc.ts` 等高冲突聚合文件 |
| 领域、服务、workspace | `packages/core`、`packages/services`、`packages/app` | 相关 `vitest --run packages/<pkg>/test/<name>.test.ts`，必要时 `pnpm test:fast` | 不跨层直接依赖平台能力；不要把业务真相写进平台壳 |
| 发布、版本、CHANGELOG | `CHANGELOG.md`、各 package 版本、release 脚本 | `pnpm verify:release`，发布前按需追加 `pnpm test` / `pnpm typecheck` | 不手写不一致版本号；不在未确认 tag 时推 release |

Vibecoding 快路径：

- 单 agent 编码循环优先跑 `verify:vibe:*`，只验证当前菜单或共享 UI 的测试集合，不默认跑类型检查、视觉检查或全量测试。
- 菜单私有循环优先使用 `pnpm verify:vibe:desktop:account`、`pnpm verify:vibe:desktop:ai`、`pnpm verify:vibe:desktop:loadouts`、`pnpm verify:vibe:desktop:vault`。
- 跨端 UI / Prototype / Web 的中途循环优先使用 `pnpm verify:vibe:ui`；文档或工具测试中途循环可用 `pnpm verify:vibe:docs`。
- 交接、提交、合并或声称门禁通过前，再按上表升级到 `verify:*`；视觉脚本默认由收口 agent 或最终检查运行。
- 测试断言优先检查稳定行为、结构、导出、role / label 或 ViewModel 输出；避免把中文文案、源码 import 顺序、整段 HTML 或 CSS 片段作为普通功能断言。

小参数模型工作约束：

- 先确认自己要改的文件属于上表哪一行；一次只处理一类改动。
- 优先使用已有脚本别名，不自行拼复杂命令。
- 发现无关脏文件时只记录，不回退、不格式化、不顺手修。
- 需要跨越两个以上 package 或触碰高冲突文件时，先说明影响范围再动手。
- 最终回答必须写清楚运行过哪些验证；没跑全量 `pnpm test` / `pnpm typecheck` 时直接说明。

## 并行开发边界

- 普通功能开发优先只改对应 `packages/desktop/src/renderer/features/<menu>/` 目录，避免一个菜单的改动影响其他菜单。
- 单个菜单私有目录改动默认不要求 worktree；例如一个 agent 只改 `features/account/`，另一个只改 `features/vault/`，且都不碰共享层时，可以在当前工作区轻量并行。
- 菜单私有快路径：只改 `features/account/`、`features/ai/`、`features/loadouts/` 或 `features/vault/` 时，优先运行对应 `pnpm verify:desktop:account`、`pnpm verify:desktop:ai`、`pnpm verify:desktop:loadouts`、`pnpm verify:desktop:vault`；碰到 `shared/`、`packages/ui`、`packages/app`、API 或 IPC 后再升级到 `pnpm verify:desktop` / `pnpm verify:ui`。
- worktree 是隔离复杂并行现场的工具，不是所有任务的默认要求。触碰 `packages/ui`、`packages/app`、`packages/desktop/src/renderer/shared/`、renderer API、主进程 IPC、release / 版本号 / CHANGELOG，或当前工作区已有多条无关脏改动时，才优先考虑 worktree 或暂停其他 agent。
- 多 agent 共用同一工作区时，提交前必须先运行 `tools\git-preflight.cmd`；如果输出多条 lane 或高冲突文件，不要使用全量 `git add -A` 提交脚本，除非确认这些改动都属于本次提交。
- 跨菜单复用能力必须先进入 `packages/desktop/src/renderer/shared/`，不要让 feature 之间直接 import。
- `shared/` 不能 import `features/`，也不能通过 `components/VaultPanel.tsx` 等菜单桥接文件间接依赖 feature。
- 新增 renderer API 契约时放到对应 `packages/desktop/src/renderer/api/*Api.ts`；跨领域 DTO 放到 `sharedTypes.ts`；不要把大型 DTO 塞回 `api/types.ts` 或 `api/client.ts`。
- `api/client.ts` 只做 Electron renderer 运行时绑定：声明 `window.d2`、导出 `api` 和兼容性重导出类型。
- 新增主进程 IPC handler 时放到对应 `packages/desktop/src/main/ipc/<domain>.ts`；`ipc.ts` 只做聚合注册。
- 新增用户可见文案时，优先沉淀到 `shared/copy.ts` 或对应领域 copy 文件；当前默认中文，不做语言切换 UI。
- 多人或多 agent 并行时，尽量避免同时修改 `HomePage.tsx`、`ItemDetailModal.tsx`、`useItemDetailWorkspace.ts`、`VaultPanel.tsx`、`api/types.ts`、`api/client.ts`、`ipc.ts` 等公共接线文件；确需修改时先说明影响范围。

## 跨端 UI / Prototype 工作流

- UI 需求默认改 `packages/ui`，包括页面布局、组件结构、颜色、间距、状态样式、通用交互和跨端文案；不要只在 Desktop 或 Web 里重做一份页面。
- `packages/prototype` 只放 mock 数据、原型状态开关、演示入口和少量原型专用控制面板；不得在 prototype 中长期维护第二套真实页面结构。
- 如果为了探索先在 `packages/prototype` 写了临时 UI，用户确认后必须在同一次收口中迁入 `packages/ui`，再让 Prototype / Web / Desktop 共同消费；不能声称“应用已改好”但只改了 prototype。
- `packages/web` 和 `packages/desktop` 是平台壳：只处理 Web / Electron 特有 adapter、登录态、IPC、本地文件、窗口、更新、端口和打包能力；页面实现应通过 `ProductShellHost` 和 `packages/ui` 共享。
- 新增或调整产品级外壳时，Prototype / Web / Desktop 都应继续挂同一个 `ProductShellHost`。不得重新引入 Desktop 专用 shell wrapper，除非先更新本文件和 `docs/development.md` 说明新的边界。
- 改 `packages/ui` 后，至少验证相关共享 UI 测试和消费者类型检查；影响首页或设置页视觉时，还要运行 `visual:home` 或 `visual:settings`。
- 原型对比应优先使用 React prototype 和视觉脚本；旧 HTML 只能作为历史参考，不得作为新的活跃实现入口。

### 多 agent 菜单 UI 默认边界

这些规则是仓库默认工作流，不需要用户每次在 prompt 里重复。任何 agent 接到“改某个菜单 UI / 原型 / 页面”的任务时，必须先按这里判断改动范围。

- 菜单 agent 默认只改菜单内容层，不改共享 workspace chrome，不改 `.product-*` / `.shell-*` / token / Desktop 私有 CSS。
- 默认菜单范围：
  - 首页：`packages/ui/src/home/` + `.home-*`
  - 账号：`packages/ui/src/account/` + `.account-*`
  - 仓库：`packages/ui/src/vault/` + `.vault-*`
  - 配装：`packages/ui/src/loadouts/` + `.loadout-*`
  - 资料库：`packages/ui/src/library/` + `.library-*`
  - 商人：`packages/ui/src/vendors/` + `.vendor-*`
  - 设置：`packages/ui/src/settings/` + `.settings-*`
- 菜单 agent 可以改对应菜单目录下的 `*ContentView.tsx`、菜单专属组件、菜单专属 copy、菜单专属 ViewModel props，以及 `packages/ui/src/styles.css` 中对应菜单前缀的内容层规则。
- Prototype / Web / Desktop 只允许为该菜单接 adapter、mock 数据或真实数据回调；不得在平台壳复制页面结构。
- 遇到共享问题时，菜单 agent 不得私自改全局规则；必须先说明“需要共享改动”，由共享 / 集成 agent 修改 `ProductWorkspace`、token、全局样式或 shell。
- 需要升级为共享改动的情况包括：两个以上菜单需要同一种布局或组件；需要改页面标题区、页面级分栏、首层侧栏、首层 panel chrome、顶部状态条、AI 抽屉、后台任务 Dock；需要改 `ProductShellHost.tsx`、`ProductWorkspace.tsx`、`AppShell.tsx`、无菜单前缀的 CSS 规则或 token。
- 多 agent 并行时，首页菜单尽量最后集成；首页依赖账号、资料库、仓库、商人和配装摘要，其他菜单未稳定前不要让首页 agent 私自固化跨菜单数据结构。
- 每个菜单完成后至少运行 `npx pnpm@9.15.0 verify:ui`；碰 Desktop adapter / IPC / 真实数据接线再运行 `npx pnpm@9.15.0 verify:desktop`。
- 全部菜单合并后由集成 agent 运行 `npx pnpm@9.15.0 visual:all`，并检查跨菜单页面顶部、首层面板、工具栏、侧栏和内容密度是否统一。

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
- `docs/work/references/` 保存外部资料分析、数据源调研和作为实现依据的视觉基准。
- 不设 `docs/work/archive/`。已完成且仍有效的结论合并进正式文档；只剩历史追溯价值或已过时的过程材料直接删除，需要追溯时使用 git 历史。
- 不要把日期命名、设计、计划、进度或分析文档直接放在 `docs/` 根目录。
- 不要重建 `docs/superpowers/`；如果外部流程要求写入该目录，统一改写到 `docs/work/backlog/` 或 `docs/work/references/`。
- `docs/work/` 不是正式入口目录；只保留仍对当前工作有直接参考价值的材料，历史已完成或已失效的内容可以删除。
- 删除任何文档前，必须确认它已经合并进正式文档，或明确没有剩余参考价值。
- 任务完成、取消或方向变化且影响当前短期待办、验收状态或优先级时，必须在同一次改动里更新 `docs/todo.md`。
- bug 修复、确认无效或转为长期需求时，必须在同一次改动里更新 `docs/todo.md` 对应条目。
- `docs/todo.md` 中的 `Bug #数字` 必须全局唯一；需要按领域区分时，在标题中加领域前缀，不要复用编号。
- 本地临时日志、调试输出、pid / port / token 等运行态文件统一写到 `.local-data/tmp/`；不要把 `tmp-*`、`.tmp-*`、`*.err.log` 直接写到仓库根目录。

## 验证规则

- 日常开发优先按改动范围选择最小验证，不要默认运行发布级重链路。
- Vibecoding 中途循环优先运行 `verify:vibe:*`；收口、交接或提交前再升级到对应 `verify:*`。
- 文档、待办、README 或工具说明改动运行 `pnpm verify:docs`。
- `pnpm docs:check` 同时检查文档结构和全仓文本编码；如果发现疑似 mojibake、Unicode replacement character 或连续问号造成的信息丢失，先修复乱码再继续开发。
- 改 `packages/ui`、`packages/prototype` 或 `packages/web` 时，至少运行 `pnpm verify:ui`；影响首页或设置页视觉时追加 `pnpm visual:home` 或 `pnpm visual:settings`。
- 改 Desktop 主进程、preload、renderer adapter 或 IPC 接线时，至少运行 `pnpm verify:desktop`；如果触到底层依赖再追加 `pnpm typecheck:desktop`。
- 改 release、CHANGELOG、版本号或发布脚本时，至少运行 `pnpm verify:release`。
- 普通功能改动优先运行相关定向测试；需要一轮中等门禁时运行 `pnpm verify`。
- 只有在发布、提交 release、声称全仓检查通过、或用户明确要求全量验证前，才运行发布级 `pnpm test` 和 `pnpm typecheck`。
- 如果没有运行全量测试，最终回答必须明确说明已运行哪些定向验证，以及没有运行全量 `pnpm test` / `pnpm typecheck`。
