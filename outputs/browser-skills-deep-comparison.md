# 已安装浏览器能力深度对比

> 审阅时间：2026-07-17  
> 对比对象：`webapp-testing`、`superpowers-chrome`、`agent-browser`、`Playwright Browser Automation`、`浏览器自动化（browser-use）`、`Web Access`、`QQ浏览器自动化`

## 1. 结论先行

这 7 项不是同一层级的产品：

- **Web Access**：以联网调研和登录后网页操作为中心，直连用户日常 Chrome/Edge，并自带 CDP Proxy 源码。
- **browser-use（浏览器自动化）**：功能最“全栈”的通用 CLI 说明，覆盖本地托管浏览器、现有 Chrome、Profile、Cookie、多会话、云浏览器和隧道。
- **agent-browser**：面向 Agent 的高能力通用 CLI。已安装套件文档只暴露基础流程，但上游当前版本实际还支持稳定 refs、多会话、Profile/State、网络拦截、HAR、PDF、Trace、差异比较等。
- **QQ浏览器自动化**：QQ 浏览器专用、索引式交互命令最完整，支持语义定位、下载、标签页和对话框；对 Cookie/Profile、网络拦截和测试资产的公开封装较弱。
- **Playwright Browser Automation**：不是现成运行器，而是一份“直接编写 Node Playwright 脚本”的能力指南；可编程上限最高，适合确定性脚本、网络 Mock、视频、PDF、移动模拟和 Trace。
- **webapp-testing**：不是通用网页浏览器，而是本地 Web 应用测试工作流；特色是管理一个或多个本地服务生命周期，并指导编写 Python Playwright 验收脚本。
- **superpowers-chrome**：自带 MCP 源码和专用只读浏览器 Agent，特色是每次动作自动保存 HTML、Markdown、截图及 DOM diff；但当前源码中控制台自动捕获仍是占位实现，也没有封装 Network/上传下载/PDF。

如果只看能力覆盖，`browser-use`、上游完整版 `agent-browser` 和直接 Playwright 属于第一梯队，但三者分别偏向：

1. **browser-use：开箱即用、多模式、多会话、云端**；
2. **agent-browser：Agent 友好的 refs、调试、网络和视觉差异工具链**；
3. **Playwright：自己写代码时的最大控制力和可重复性**。

## 2. 对比口径

报告严格区分三种证据：

- **实装能力**：本机 Skill 内有对应脚本、MCP 或实现源码。
- **Skill 声明**：本机 `SKILL.md` 明确要求/示范，但依赖外部 CLI 或库。
- **上游能力**：当前官方项目明确支持，但本机套件的简化文档没有完整暴露。

“底层框架理论上能做”不自动算当前 Skill 已封装。

## 3. 核心架构对比

| 项目 | 类型与版本 | 实际执行层 | 默认浏览器/会话 | 元素定位模型 | 主要优势 |
|---|---|---|---|---|---|
| Web Access | Skill 2.5.3 | 自带 Node CDP Proxy，HTTP API | 直连用户 Chrome/Edge；新建后台 tab | CSS + 任意 JS | 登录态联网、真实浏览器、浏览历史/书签、视频帧、并行 tab |
| browser-use | Skill 2.0.7 | 外部 `browser-use` CLI + daemon | Headless Chromium / 现有 Chrome / Profile / Cloud | `state` 返回索引 | 多模式、多会话、Cookie 管理、云浏览器、隧道 |
| agent-browser | 套件 1.3.0 | 外部 `agent-browser` CLI + daemon | 托管 Chromium；上游也支持 CDP/Profile | accessibility snapshot refs + selector | AI 友好 refs、上游网络/Trace/PDF/视觉 diff 很强 |
| QQ浏览器自动化 | Skill 0.9.0（本机） | 外部 Python CLI，经 WebSocket 控制 QQ 浏览器 | QQ 浏览器 | snapshot 索引 + role/text/label 等语义定位 | 命令覆盖细、QQ 浏览器、Markdown 快照、文件下载 |
| Playwright Browser Automation | Skill 2.0.0 | 临时编写 Node.js Playwright 脚本 | 新 Chromium/Firefox/WebKit context | Playwright Locator | 可编程上限最高、网络 Mock、视频、PDF、移动模拟、Trace |
| webapp-testing | 套件 | 临时编写 Python Playwright 脚本；自带服务管理器 | 新 Headless Chromium | Playwright selector/locator | 本地服务生命周期、前端验收、Console 监听 |
| superpowers-chrome | 套件 1.6.1/包 1.6.2 | 自带 CDP MCP + `chrome-ws-lib.js` | 独立持久 Profile，默认 headless | CSS/XPath | MCP 调用简单、动作自动留档、DOM 前后差异、专用分析 Agent |

## 4. 能力矩阵

符号：**强**=直接且完整；**有**=明确支持；**间接**=可用 eval/自行编码实现；**无**=当前封装没有；**上游**=上游已有但本机 Skill 文档未完整暴露。

| 能力 | Web Access | browser-use | agent-browser | QQ浏览器 | Playwright API | webapp-testing | superpowers-chrome |
|---|---|---|---|---|---|---|---|
| 普通导航/点击/输入 | 有 | 强 | 强 | 强 | 强 | 有 | 有 |
| 复用用户当前登录 Chrome | **强** | 强（connect/profile） | 上游支持 CDP/Profile 快照 | 取决于 QQ 浏览器会话，文档未说明策略 | 需手工连 CDP/导入 state | 默认否 | 否；使用自己的持久 Profile |
| 独立干净测试环境 | 弱 | 强 | 强 | 不明确 | **强** | **强** | 强 |
| Profile 持久化 | 用户浏览器本身 | **强** | 上游强 | 未封装 | 手写 `storageState` | 手写 | 有，独立缓存 Profile |
| Cookie CRUD/导入导出 | eval 可做，未封装 | **强** | 上游强 | 未封装 | 手写 API | 手写 | eval 可做，未封装 |
| 多会话并行 | 共享浏览器多 target | **强，独立 daemon** | 上游强 | 未说明 | **强，context/browser** | 自行编码 | Profile 可切换，但单 MCP 运行实例不是多独立会话管理器 |
| 多标签页 | 强（targetId） | 有 | 上游强、稳定 tab ID | 强 | 强 | 自行编码 | 有，但用可变 `tab_index` |
| 元素语义定位 | 需自行 DOM 分析 | 索引式 | **强，refs + role/text 等** | **强，索引 + role/text/label/testid** | **强，Locator** | Locator/selector | 弱，CSS/XPath 为主 |
| 页面文本高效抽取 | eval/静态工具调度 | state/get/html | snapshot/read | **Markdown snapshot** | 自行编码 | 自行编码 | 自动 Markdown + extract |
| 任意 JS | 强 | 强 | 强 | 强 | 强 | 强 | 强 |
| 截图 | 有 | 有 | 强；上游支持标注/全页/JPEG | 强；全页/标注/WebP | 强；页面/元素 | 有 | 强；动作自动截图 |
| PDF | 无 | 未封装 | 上游有 | 无 | **强** | 可自行编码 | 无 |
| 视频录制 | 离散视频帧分析，不是录屏 | 未封装 | 上游未以录屏为主 | 无 | **强** | 可自行编码 | 无 |
| 文件上传 | **有** | 有 | 上游有 | 文档未列上传命令 | **强** | 可自行编码 | 无封装 |
| 文件下载 | 通过页面/URL自行处理 | 未见专门命令 | 上游支持下载路径/页面下载 | **强，按元素或 URL** | **强** | 可自行编码 | 无封装 |
| 弹窗/对话框 | eval/页面手工处理 | 未列专门命令 | 上游强 | **有 accept/dismiss/prompt** | **强** | 可自行编码 | 无专门动作 |
| iframe/Shadow DOM | eval 可递归穿透 | CDP/高级参考 | 上游有 frame | 未说明 | **强** | 可自行编码 | eval 间接 |
| 网络拦截/Mock | 无专门端点 | 未封装 | **上游强：route/request/HAR** | 无 | **强** | 可自行编码 | **当前没有封装 Network domain** |
| Console 日志 | 无专门端点 | 未封装 | 上游有 console/errors | 无 | 强 | **示例明确支持监听** | 文档声称自动捕获，但当前源码写明 TODO/placeholder |
| Trace/性能诊断 | 无 | 高级 CDP 可扩展 | **上游有 trace/profiler** | 无 | **强，Trace** | 可自行编码 | 文档提到性能测试，但 MCP action 未实现专门性能接口 |
| 测试断言 | 手工 eval | 自然语言验证/状态命令 | 上游状态检查和 diff，无独立 expect DSL | state/get_info 可手工判断 | **最强，代码断言** | **面向验收，但需自己写断言** | eval 返回 passed；非完整测试框架 |
| 视觉回归 | 无 | 未封装 | **上游截图 diff** | 无 | 可接测试框架 | 自行编码 | 自动前后截图/DOM diff，但没有像素基线断言 |
| 自动启动本地服务 | 无 | 可配隧道但不管本地服务 | 无 | 无 | 无 | **唯一内置，多服务** | 无 |
| 云浏览器 | 无 | **强，需 API Key** | 可连远程 CDP | 无 | 可连接远程服务 | 可自行连接 | 无 |
| 本地站点暴露到云端 | 无 | **内置 Cloudflare tunnel** | 无 | 无 | 无 | 无 | 无 |
| 浏览器书签/历史检索 | **唯一内置** | 无 | 无 | 无 | 无 | 无 | 无 |
| 动作自动留档 | 无 | 需主动 screenshot/state | 无默认全量留档 | 每条命令返回 snapshot | 自行编码 | 自行编码 | **唯一内置 HTML/MD/PNG/DOM diff** |

## 5. 每项的真实定位与边界

### 5.1 Web Access：登录态联网与真实浏览器操作

**源码证据**：自带 `check-deps.mjs`、`browser-discovery.mjs`、`cdp-proxy.mjs` 和 CDP API 文档，不只是提示词。

强项：

- 直连日常 Chrome/Edge，自然继承账号登录态、站内上下文和用户浏览环境。
- 默认新建后台 tab，不碰用户原有 tab；完成后只关闭自己创建的 tab。
- 两种点击：JS `el.click()` 与真实 CDP 鼠标点击。
- 文件上传、懒加载滚动、任意 JS、截图、视频 seek + 采帧。
- 唯一支持搜索本地浏览器书签和历史的方案。
- 上层还定义了 WebSearch/WebFetch/curl/Jina/CDP 的智能路由，因此它不是纯浏览器 CLI，而是完整联网策略。

边界：

- API 端点较少，没有高级 Locator、网络拦截、HAR、Console、PDF、Trace、下载事件和测试断言封装。
- 高度依赖用户浏览器开启远程调试并授权。
- 操作真实账号环境，风险和误操作影响高于隔离浏览器。
- 文档中的“GUI 交互不会被网站限制”表达过度绝对；真实点击也不能保证不触发风控。

最佳用途：登录后台、内部系统、社交媒体、需要当前会话的联网调研和代操作。

### 5.2 browser-use：覆盖面最均衡的通用 CLI

本机 Skill 描述的 CLI 功能非常完整：

- 默认 headless Chromium，也可 headed、连接现有 Chrome、使用真实 Profile、连接云浏览器。
- daemon 常驻，命令约 50ms 调用延迟。
- state 索引、点击/输入/选择/上传/hover/右键、等待 selector/text。
- Cookie get/set/clear/import/export。
- 多会话，每个会话独立 daemon、socket、PID、浏览器实例和 tab 所有权。
- Cloud API、Profile 同步、Cloudflare tunnel。

边界：

- 当前 Skill 没有给出网络 Mock、HAR、PDF、视频、Trace 或传统测试断言。
- 依赖外部 `browser-use` CLI；Skill 文件本身不带实现源码。
- 云浏览器需要 API Key，可能产生外部服务成本。

最佳用途：需求经常变化、需要在“隔离浏览器/真实 Chrome/云浏览器”之间切换，或需要多 Agent 并行会话。

### 5.3 agent-browser：Agent 交互与调试工具链上限高

本机套件文档是简化版，只写了 open/wait/snapshot/click/type/screenshot/close；但上游当前 README 明确支持更多：

- accessibility snapshot + 稳定 `@eN` refs、语义定位。
- 多 session、命名稳定 tab ID、Profile/State、加密状态和 Auth Vault。
- Cookies、local/session storage。
- 网络 route、Mock、request 过滤、HAR。
- iframe、对话框、上传、下载目录、PDF。
- console/errors、trace、profiler。
- snapshot diff、截图像素 diff、两个 URL 的差异比较。
- 可连接现有/远程 CDP，甚至 Electron/WebView2。

边界：

- 本机套件文档明显落后于上游能力，Agent 若只遵循本地 `SKILL.md`，大量高级功能不会被主动使用。
- 依赖外部 CLI 和浏览器运行时，套件安装脚本使用全局 npm 安装。
- 冷启动和 Chromium 占用较大。

最佳用途：需要 Agent 友好、可调试、可记录、能做网络 Mock 或视觉差异的通用网页自动化。

### 5.4 QQ浏览器自动化：QQ 浏览器专用且交互命令细

本机 Skill 公开的命令覆盖非常细：

- snapshot 索引与 clean Markdown 两种模式。
- click/double-click/focus/input、完整键盘按下/释放、滚动容器、下拉框、复选框。
- role/text/label/placeholder/testid 语义定位。
- get text/url/title/html/value/attribute/count/bbox/styles 与 visible/enabled/checked。
- 全页/标注截图、标签页、对话框、任意 JS。
- 唯一明确提供 `browser_download_file` 和 `browser_download_url` 的 CLI。

边界：

- 本机为 0.9.0，而 PyPI 当前是 1.4.5，已明显落后。
- 本机 Skill 只链接 PyPI 和 QQ 浏览器主页，没有公开仓库链接；本地也没有实现源码，因此无法审计 WebSocket 客户端内部实现。
- 文档没有 Cookie/Profile、多会话、上传、网络拦截、Console、Trace、PDF/视频。

最佳用途：明确要操控 QQ 浏览器、使用其专属环境，或下载与表单交互较多的任务。

### 5.5 Playwright Browser Automation：代码式自动化能力上限最高

这是指导 Agent 临时编写 Node Playwright 脚本的 Skill，不是自带运行器。它明确覆盖：

- Chromium/Firefox/WebKit。
- Locator 自动等待、isolated context、多 page。
- request route/mock/abort。
- 截图、元素截图、PDF、视频。
- 移动模拟、认证 state、Cookie/localStorage。
- 上传下载、对话框、iframe/Shadow DOM、Trace。

边界：

- 每个任务都要写和运行脚本，交互探索速度不如 CLI。
- 不自动复用用户当前浏览器；需要显式设计 CDP 或 state。
- Skill 第 39 行建议 `npm install -g playwright`，与当前工作台的隔离依赖策略冲突，不应照搬全局安装。
- 附带的 `examples.py` 内容与 Skill 主体不一致：声称演示 MCP，实际上只是打印概念调用，不执行浏览器；应视为低价值/过时示例。

最佳用途：CI/E2E、可重复脚本、精确断言、网络 Mock、跨浏览器、PDF/视频/Trace。

### 5.6 webapp-testing：本地 Web 验收工作流

独有能力是 `with_server.py`：

- 可启动一个或多个前后端服务。
- 按端口等待服务就绪。
- 运行 Python Playwright 脚本。
- 无论成功失败都会清理服务进程。

它还给出动态页面“先侦察再操作”的流程，以及 Console 监听示例。

边界：

- 只针对本地 Web 应用，默认要求 headless Chromium。
- 没有现成测试框架、断言 DSL、报告器或视觉基线工具；仍需临时写 Python 脚本。
- `with_server.py` 使用 `shell=True`，只应运行可信的本地命令。
- 示例固定写 `/mnt/user-data/outputs/console.log`，在 Windows 环境不合适，需调整路径。

最佳用途：启动本地前后端后做一次性功能验收、截图、Console 检查。

### 5.7 superpowers-chrome：动作留档和 DOM 差异分析

它是三项套件中实现最完整、最可审计的一项：自带 MCP TypeScript 源码与 `chrome-ws-lib.js`。

独有强项：

- 一个 `use_browser` MCP 工具统一提供 navigate/click/type/select/eval/extract/screenshot/tab/profile。
- navigate、click、type、select、eval 自动保存 HTML、Markdown、PNG 和前后 DOM diff。
- 独立 Profile 跨重启持久化。
- 自带只读 `browser-user` 子 Agent，可把大量页面检查隔离在子上下文。
- click/type 使用 CDP 输入事件，兼容 React。

重要源码发现：

- `chrome-ws-lib.js` 多处明确写着 Console capture 为 `TODO`、`Placeholder`，生成的 `-console.txt` 也是占位文件。因此卡片和 Agent 文档中的“自动捕获 Console 日志”目前不能视为可靠实现。
- 没有 Network domain action、上传/下载、Cookie API、PDF、视频或 Trace 的 MCP 封装。
- 显示/隐藏浏览器会重启 Chrome，以 GET 重载所有 tab，丢失 POST 和前端内存状态。
- tab 用数字位置，关闭 tab 后索引会变化，不如 agent-browser 的稳定 tab ID。

最佳用途：需要每一步自动留痕、DOM 变更分析、截图审阅和专用子 Agent 的网页检查。

## 6. 真实重叠与互补关系

### 高度重叠，可以按主次保留

- `browser-use` 与 `agent-browser`：都是持久 daemon + 索引/refs 的通用 CLI。完整上游能力下，agent-browser 更偏网络/Trace/diff；browser-use 更偏多模式/云端/tunnel。
- `Web Access` 与 browser-use 的 `connect/profile` 模式：都能利用已有登录，但 Web Access 更强调直接操作用户日常浏览器与联网调度，browser-use 更强调模式切换和会话隔离。
- `Playwright Browser Automation` 与 `webapp-testing`：后者本质上是“Python Playwright + 本地服务器生命周期”的窄场景套件。

### 明显互补

- Web Access + Playwright：真实登录站点操作与隔离测试分别处理。
- agent-browser + webapp-testing：通用网页调试/差异能力与本地多服务启动验收互补。
- QQ 浏览器 Skill：只有明确需要 QQ 浏览器时才有不可替代性。
- superpowers-chrome：自动动作留档是其他 6 项默认没有的能力，可作为审阅/证据工具保留。

## 7. 选型规则（不预设你的需求）

| 你的首要条件 | 第一候选 | 第二候选 | 不优先的原因 |
|---|---|---|---|
| 必须直接使用当前 Chrome/Edge 登录态 | Web Access | browser-use connect | Playwright/webapp-testing 默认是新环境 |
| 需要真实浏览器，但不想碰用户原 tab | Web Access | browser-use profile | Web Access 明确规定新后台 tab 与清理边界 |
| 经常在本地、现有 Chrome、云端之间切换 | browser-use | agent-browser | Web Access 没云端与独立 session 管理 |
| AI 要可靠识别页面元素并减少猜 selector | agent-browser | QQ浏览器 / browser-use | superpowers-chrome 主要依赖 CSS/XPath |
| 写可重复 E2E、强断言、网络 Mock、跨浏览器 | Playwright API | agent-browser | 其他 CLI 更偏交互任务而非代码资产 |
| 自动启动本地前后端并做验收 | webapp-testing | Playwright API + 自己管理服务 | 只有 webapp-testing 自带多服务生命周期工具 |
| 需要每步 HTML/截图/DOM diff 证据 | superpowers-chrome | agent-browser diff/trace | 其他方案默认不全量留档 |
| 需要网络请求 Mock/HAR/性能 Trace | agent-browser 上游 / Playwright | — | superpowers-chrome 名称虽含 DevTools，但当前 MCP 未封装 Network/Trace |
| 明确要 QQ 浏览器 | QQ浏览器自动化 | — | 其余方案不以 QQ 浏览器为目标 |
| 要网页下载，且希望现成 CLI 命令 | QQ浏览器自动化 | Playwright / agent-browser | Web Access 和 superpowers-chrome 无下载事件封装 |
| 要 PDF、视频、移动设备模拟 | Playwright API | agent-browser（PDF） | 其他方案缺少这些输出 |
| 多 Agent 同时操作互不干扰 | browser-use multi-session | Playwright contexts / agent-browser sessions | Web Access 多 target 仍共享同一用户浏览器 |

## 8. 当前电脑的可运行性审计

界面中的“我安装的 7”表示 Skill/插件描述文件已经安装和启用，**不代表底层依赖已安装**。

实际检查结果：

| 项目 | Skill/插件文件 | 底层运行时检查 | 当前判断 |
|---|---|---|---|
| Web Access | 完整源码存在 | Node 22 已有；尚未生成 `config.env`，且未执行浏览器远程调试授权检查 | 最接近可用，首次需选择/授权 Chrome 或 Edge |
| superpowers-chrome | MCP 源码存在 | `mcp/dist/index.js` 与 `node_modules` 未发现；当前会话也没有激活其 MCP 连接 | 源码已装，但 MCP 构建/激活状态存疑 |
| agent-browser | 套件存在 | 命令不在 Bash/PowerShell PATH；`.initialized` 不存在 | 底层 CLI/Chromium 尚未就绪 |
| browser-use | Skill 存在 | 命令不在 PATH，Python 模块也不存在 | 只有 Skill 说明，底层 CLI 未就绪 |
| QQ浏览器自动化 | Skill 存在 | 命令和 Python 包不存在 | 只有 Skill 说明，且 Skill 版本落后上游 |
| Playwright Browser Automation | Skill 存在 | `playwright` 命令和 Python模块不存在，Node 全局也无包 | 指南已装，Playwright 运行时未就绪 |
| webapp-testing | 套件与 Python helper 存在 | 当前托管 Python 无 `playwright` 模块 | helper 可读，但浏览器测试运行时未就绪 |

注意：本次只做了只读检查，没有替你安装或修改任何依赖。

## 9. 安装质量与文档问题

1. **agent-browser 套件文档落后上游**：只展示基础 8 个命令，隐藏了大量已存在的上游能力，会导致 Agent 低配使用。
2. **Playwright Skill 安装建议不安全/不合环境规则**：建议全局 npm 安装；应改为隔离项目或托管 runtime 安装。
3. **Playwright `examples.py` 自相矛盾**：Skill 说无需 MCP、直接 API；示例却只打印 MCP 概念调用，且不执行浏览器。
4. **superpowers-chrome Console 声明失真**：文档/Agent 说自动捕获，源码实际写 TODO placeholder。
5. **QQ浏览器 Skill 版本陈旧**：本机 0.9.0，PyPI 1.4.5；且无公开源码仓库链接，无法完整源码审计。
6. **webapp-testing Windows 适配不完整**：Console 示例输出路径为 Linux 风格 `/mnt/user-data/outputs/`。
7. **多项 Skill 触发描述重叠**：`agent-browser`、browser-use、QQ浏览器、Web Access 都声明覆盖“任何浏览器任务”，可能造成路由冲突；最好按需求明确主工具。

## 10. 最终判断

不要把 7 项全部视作同等候选：

- **联网与真实账号层**：Web Access。
- **通用 Agent 浏览器层**：browser-use 或 agent-browser 二选一作为主力。
- **确定性自动化代码层**：Playwright Browser Automation。
- **本地应用验收层**：webapp-testing。
- **证据与 DOM diff 分析层**：superpowers-chrome。
- **QQ 浏览器专用层**：QQ浏览器自动化。

它们可以同时安装，但执行时应先确定任务属于哪一层，否则多个“通用浏览器”Skill 会竞争同一请求。需求未知时，正确做法不是盲选一个，而是先按上表确定：**浏览器环境、是否复用登录态、是否要代码资产、是否需要云端/多会话、是否需要网络与调试证据**。

## 11. 主要证据路径

- `C:\Users\dell\.workbuddy\skills\web-access\SKILL.md`
- `C:\Users\dell\.workbuddy\skills\web-access\scripts\cdp-proxy.mjs`
- `C:\Users\dell\.workbuddy\skills\browser-use\SKILL.md`
- `C:\Users\dell\.workbuddy\skills\qqbrowser-skill\SKILL.md`
- `C:\Users\dell\.workbuddy\skills\playwright-browser-automation\SKILL.md`
- `C:\Users\dell\.workbuddy\plugins\marketplaces\codebuddy-plugins-official\plugins\agent-browser\SKILL.md`
- `C:\Users\dell\.workbuddy\plugins\marketplaces\codebuddy-plugins-official\external_plugins\webapp-testing\SKILL.md`
- `C:\Users\dell\.workbuddy\plugins\marketplaces\codebuddy-plugins-official\external_plugins\webapp-testing\scripts\with_server.py`
- `C:\Users\dell\.workbuddy\plugins\marketplaces\codebuddy-plugins-official\external_plugins\superpowers-chrome\mcp\src\index.ts`
- `C:\Users\dell\.workbuddy\plugins\marketplaces\codebuddy-plugins-official\external_plugins\superpowers-chrome\skills\browsing\chrome-ws-lib.js`
- 上游：`vercel-labs/agent-browser` 官方仓库与 `qqbrowser-skill` PyPI 页面。
