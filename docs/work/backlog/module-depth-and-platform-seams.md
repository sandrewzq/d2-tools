# 模块深度与跨端 seam 收口计划

> 执行规则覆盖：本文保留的测试、`Red / Verify` 和 `verify:*` 命令仅是历史计划记录，不是当前 agent 执行要求。只有 `AGENTS.md` 允许的高风险边界才能新增最小测试；用户主动本地测试时可以运行。

> 状态：待推进
> 关联任务：`docs/todo.md` T4 跨端 UI 壳、可交互原型与桌面视觉收口
> 前置：现有 `cross-platform-workspace-style-hardening.md` 已完成共享页面骨架与菜单 Provider 的第一轮拆分；本文只记录仍未收口的模块深度问题。

## 结论

仓库的 package 方向已经正确：

```text
core -> services -> app -> ui -> Desktop / Web / Prototype
```

当前问题不是再建立一套层级，而是让现有 module 的 interface 与实现职责一致。优先目标是：让运行时能力集中在 `services` 和平台 adapter，让 `app`、Desktop renderer 与 Web 只暴露调用者真正需要的少量 interface，并让测试从公开 interface 观察行为。

本计划不以代码行数作为深度指标。评估标准是：删除某个 module 后，复杂度是否会在多个调用处重新出现；调用者是否需要了解其内部数据组织、平台实现或历史兼容细节。

## 已确认事实

### 已形成的深 module

- `packages/ui/src/product/ProductShellHost.tsx` 把页面导航、偏好、语言、产品壳、工作区和平台动作收在同一个 interface 后；Prototype、Web、Desktop 都是其真实消费者。
- `packages/services/src/contracts.ts` 的 `D2Services` 已有 Desktop bridge 和 memory 两个 adapter，seam 真实存在；app workspace 通过 `Pick<D2Services, ...>` 只声明实际依赖，避免依赖整个集合。
- `packages/app/src/workspaces/*Page.ts` 的 selector 已为账号、仓库、配装、资料库、商人和设置提供跨端 ViewModel 测试表面。页面 UI 不再需要读取 Electron 或 Node 运行时。

### 需要收口的 module

| 优先级 | module / seam | 观察到的问题 | 对 locality 的影响 |
|---|---|---|---|
| P1 | `core -> services` 本地数据 seam | `core` 仍有操作日志、愿望单、目标规则、标签、别名、历史、配装模板、工具审计和社区缓存的 Node 文件读写实现 | 平台能力与领域类型共存，Web / 移动端 adapter 无法只替换实现 |
| P1 | Desktop 菜单 Provider seam | `useDesktopProductShell.tsx` 同时组装所有菜单；各 `*MenuProvider` 基本只从巨型 context 取 props 后转发 | 任意菜单字段变化会触碰产品级 hook 和 context，菜单无法独立演进 |
| P2 | `@d2-tools/app` package interface | 根 `index.ts` 暴露账号、仓库、配装、资料库、商人、AI 的完整符号集合 | 调用者必须面对不相关领域；根导出成为高冲突聚合点 |
| P2 | Web snapshot seam | `WebPageSnapshot.payload` 是 `unknown`，页面 snapshot 尚未被入口消费，router 未接到 `packages/http` | interface 没有真实消费者，fallback 数据和 transport 责任混在一起 |
| P3 | 测试 surface | 仍保留一批读取生产源码并断言 JSX、class、import 的 legacy 测试 | 实现重构会产生无业务价值的失败，module interface 无法成为唯一测试表面 |

此外，`createHomeDashboardWorkspace`、`createHomeDashboardActions` 与 `createAppServices` 当前只是输入转发。它们未隐藏复杂度，应删除为兼容性遗留，或在收口时承担明确的规范化与默认值行为；不得继续为此类 pass-through 增加测试。

## 目标结构

### 本地数据

```text
core
  领域类型、校验、默认值、纯转换和纯策略
          ^
          | type / pure helper
services
  本地文件实现、原子写入、目录定位、迁移和错误映射
          ^
          | D2Services 的分域 capability
app / Desktop 主进程
  只通过 capability 读取或写入
```

`core` 不新增文件路径、`node:fs`、`process`、缓存目录或 Electron 依赖。一次只有一个生产 adapter 时，不额外引入公共 port；文件系统测试可直接使用临时目录。只有出现第二个真实运行时实现，例如远端同步存储或浏览器存储，才把可替换的 interface 放在 `services` seam。

### Desktop 菜单

```text
HomePage
  ProductShellHost + 路由 + DesktopShellSession
                         |
                         +-- HomeMenuProvider
                         +-- AccountMenuProvider
                         +-- VaultMenuProvider
                         +-- LoadoutsMenuProvider
                         +-- LibraryMenuProvider
                         +-- VendorsMenuProvider
                         +-- SettingsMenuProvider
```

`DesktopShellSession` 只包含跨菜单事实：导航、偏好、当前账号快照、选中角色、装备详情打开动作、全局 AI 与后台任务。每个 Provider 自己组合本菜单的 ViewModel、读写动作和 loading / error 状态；Provider 不再接收或转发 `ComponentProps<typeof 其他菜单>`。这会让 `useDesktopProductShell` 回到真正全局状态，而不是所有菜单的 props 工厂。

### `app` 与 Web

- `@d2-tools/app` 根导出只保留少数稳定公共类型；按领域提供 `./account`、`./vault`、`./loadouts`、`./library`、`./home`、`./vendors`、`./settings`、`./assistant` 子路径。子路径是组织同一 package interface 的方式，不是新增运行时 seam。
- Web 只能二选一：把 `/api/home-snapshot` 与 `/api/pages/:page/snapshot` 接入真实 transport，并为每页定义可判别的 payload；或删除未使用的 page snapshot contract，继续明确为 fixture-only 展示。不能长期保留 `unknown` payload 和未接线 router。

## 执行切片

所有切片遵循 Red、Green、Tidy、Verify。一个切片只跨越一个主要 seam；涉及 `packages/services`、`packages/app`、Desktop renderer shared 或 renderer API 时串行推进，并在开始前运行 `tools\\git-preflight.cmd`。

### 切片 1：迁出剩余本地数据运行时实现

范围按领域分批迁移，不做“一次性大搬家”：

1. 愿望单、目标规则、仓库标签、社区推荐。
2. 装备别名、资料库历史、配装模板。
3. 操作日志、工具审计、Light.gg 缓存。

保留在 `core`：DTO、sanitize / normalize / merge 等纯函数、路径无关业务策略。

迁至 `services`：文件路径解析、读写、删除、目录创建、缓存过期和 I/O 错误映射。Desktop IPC 改从对应 services subpath 调用；`D2Services.localData` 只在 app 真的需要时扩展。

- Red: 为一个领域的 services 本地存储 module 写临时目录行为测试，并补架构测试禁止对应 `core` 文件 import `node:`。
- Green: 最小迁移该领域的运行时实现与 Desktop 调用点，保持 DTO 和用户行为不变。
- Tidy: 删除重复的 `core` I/O 实现与过时 re-export，统一错误语义和 UTF-8 写入。
- Verify: 运行该领域定向测试，再运行 `npx pnpm@9.15.0 verify:desktop`；仅文件不涉及 Desktop 时运行 `npx pnpm@9.15.0 verify`。

验收：`packages/core/src` 不再包含本地持久化、缓存或审计的 `node:fs` 实现；所有保留的 Node 能力均为已记录的纯平台默认值 helper。

### 切片 2：收窄 `app` interface，删除浅层转发

先添加 package export map 子路径和迁移调用者；稳定后再收缩根 barrel。不要在一次改动里重命名页面 ViewModel 或调整 UI props。

- Red: 为子路径导出写类型与行为测试，覆盖一个跨端调用者只导入其所在领域。
- Green: 先迁移 Desktop / Prototype / Web 的一个领域调用者，再迁移其余调用者；删除 `createHomeDashboardWorkspace`、`createHomeDashboardActions` 等无行为的转发，或将必要规范化收进单一 selector。
- Tidy: 移除失效 root re-export 与兼容别名，检查 package exports 的声明文件输出。
- Verify: 运行受影响 app 测试、`npx pnpm@9.15.0 verify:ui`；若 Desktop renderer import 有变化，改跑 `npx pnpm@9.15.0 verify:desktop`。

验收：调用者只学习本领域的 interface；根 `@d2-tools/app` 不再是所有页面模型、辅助函数和类型的默认入口；没有只返回输入的公开 creator。

### 切片 3：让 Desktop Provider 成为真实 module

先选依赖最少的商人或资料库 Provider 试点。不要同时修改多个菜单，也不要把 `ProductShellHost`、共享 UI 或全局样式混入该切片。

- Red: 为试点 Provider 写行为测试，证明它只依赖 `DesktopShellSession` 和本菜单 runtime；测试不读取源码字符串。
- Green: 将试点菜单的 props 组装从 `useDesktopProductShell` 移入 Provider；缩小 `DesktopMenuProviderContextValue`。
- Tidy: 删除只负责 `const { menu } = context; return <Menu {...menu} />` 的转发文件；将仅本菜单使用的写动作下沉。
- Verify: 运行菜单定向测试与 `npx pnpm@9.15.0 verify:desktop`。

试点通过后，以商人 -> 资料库 -> 账号 -> 配装 -> 仓库 -> 首页顺序迁移。首页最后处理，避免它提前固化其他菜单数据结构。

验收：新增或变更某个菜单 props 时，不需要修改所有菜单的 context 类型；`useDesktopProductShell` 的 interface 只返回产品壳所需状态；每个 Provider 的测试跨自身 interface，而非检查转发文件内容。

### 切片 4：让 Web snapshot seam 真实或消失

先做技术选择，不与产品页面功能混合：

1. **接通方案**：`packages/http` 承载 router，Web adapter 用真实 fetch；每个 page payload 定义判别字段与版本，入口实际调用 `loadPageSnapshot`，失败才使用明确的 fallback。
2. **收缩方案**：删除未消费的 page snapshot / router；Web 保留 fixture runtime，待有真实后端需求时再从已验证的页面 ViewModel 设计 transport。

- Red: 为选择的行为写 HTTP 或 fixture 行为测试，覆盖成功、无数据与失败回退。
- Green: 只实现所选方案，不同时引入登录、写操作或服务端业务真相。
- Tidy: 将 fallback 内容移入 Web fixture，adapter 只处理 transport 与错误回退。
- Verify: 运行 Web 定向测试与 `npx pnpm@9.15.0 verify:ui`。

验收：没有未使用的 Web interface；若保留 snapshot，则 payload 不为 `unknown` 且存在端到端调用者。

### 切片 5：以深 module 的 interface 替换 legacy 测试

迁移顺序必须跟随前四个切片，不单独“清理测试文件”。每新增一个 selector、Provider 或本地存储 module 的行为测试，就删除一组对应源码字符串断言，并同步缩小 `scripts/test-classification.mjs` 的 legacy 清单。

- Red: 先写跨 module interface 的行为测试或 UI 渲染测试，不能读取生产源码。
- Green: 让当前实现通过测试；不得为了迁移测试恢复旧文件结构、class 或 import。
- Tidy: 删除已覆盖的 legacy 断言并收缩清单。
- Verify: 运行相关定向测试和 `npx pnpm@9.15.0 test:quality`；最终范围按改动选择一个 `verify:*`。

验收：legacy 清单只减不增；行为测试断言输出、角色、可见动作、ViewModel 或 adapter 结果，而不是源码文本。

## 不做的事

- 不把所有 core function 机械抽成 interface，也不为单一 adapter 新建 port。
- 不新建第二套产品壳、页面结构或 Desktop 专属 UI。
- 不把 Web fallback 当成真实产品数据，不让 `packages/http` 复制业务真相。
- 不在迁移 interface 的同时改变页面视觉、中文 copy 或领域规则。
- 不通过全量 `git add -A` 混合提交架构迁移与无关工作。

## 风险与顺序

| 风险 | 控制方式 |
|---|---|
| 本地存储迁移改变用户数据位置或格式 | 沿用现有路径与 JSON 格式；每个领域迁移前后用临时目录回归读写与迁移行为 |
| Provider 收深导致跨菜单状态丢失 | 先定义最小 `DesktopShellSession`，由一个低风险菜单试点；装备详情、导航和选中角色仍由产品壳拥有 |
| app 子路径迁移造成大量 import churn | 一次一个领域，先添加再迁移，最后收缩根 export；不与 ViewModel 结构调整并行 |
| Web transport 过早固定后端协议 | 在实现前选择接通或收缩；接通时先只传已稳定的页面 ViewModel，不暴露内部 workspace 缓存 |
| legacy 测试迁移降低覆盖 | 新行为测试先通过，再删除旧断言；`test:quality` 继续阻止新增源码字符串测试 |

## 完成标准

1. `core` 不再承担本地文件、缓存和审计的运行时实现。
2. `services` 中每个真实 adapter 都有稳定行为测试；app 只声明其实际 capability。
3. `@d2-tools/app` 按领域暴露 interface，根导出不再是默认巨型入口。
4. Desktop Provider 不再是大 context 的薄转发，产品壳不再组装全部菜单 props。
5. Web snapshot 要么有真实调用链和判别 DTO，要么被删除。
6. 每个完成的模块迁移都对应减少 legacy 源码检查；测试通过 module interface 观察行为。
7. 收口时按实际范围运行一个主 `verify:*`，并在 `docs/todo.md` 更新完成状态。
