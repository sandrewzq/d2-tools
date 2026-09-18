# T75：启动黑屏（窗口先显示 + 页面底色在 shell 之外仍是深色）

> 状态：📝 **已完成诊断，候选修法待拍板**，尚未动代码
> 来源：2026-09-18 用户实窗截图「为什么每次打开都要黑屏呢？你先分析一下」。
> 关联：无直接前置任务；与 T70 的「打开白屏」是两回事（那条是详情补读置了整份加载态，已修）。

## 一、现象

每次打开应用（含 macOS 上关掉窗口后点 Dock 重开）都先出现一块纯黑窗口，之后才出现界面。
用户 `config.json` 为 `features.color_mode = "light"`——**亮色主题下也黑**。

## 二、机制（三段，缺一不可）

```
main.ts:54   show: !isVisualCapture           窗口构造出来就显示，不等渲染
main.ts:57-58 titleBarStyle: "hidden" / autoHideMenuBar: true
                                             没有标题栏与菜单栏，整个窗口矩形就是一块纯色
main.ts:59   backgroundColor: getWindowBackgroundColor(color_mode)
main.ts:69/74 loadURL（dev）/ loadFile（生产）  之后才开始加载渲染进程
             → 模块图 + startup:get IPC（ipc/startup.ts:10）
             → .app-shell 挂载，才覆盖掉那块底色
```

**黑不是 `backgroundColor` 画的，是页面自己画的。** 渲染进程在 `.app-shell` 挂载前，
窗口里只有 `body`：

- `ui/src/styles/foundation/02-elements.css:3` `body { background: var(--surface-page) }`
- `ui/src/styles/foundation/00-tokens.css:117` `--surface-page: var(--page)`
- `ui/src/styles/foundation/00-tokens.css:3` `:root { --page: #070b10 }` ← 接近纯黑

## 三、亮色主题下也黑的独立成因（死选择器）

亮色配色只挂在 `.app-shell[data-color-mode="light"]`（`00-tokens.css:209`）上，
`<body>` 在 shell 外面，永远吃 `:root` 的深色值。

而 `00-tokens.css:210` 与 `03-surface-contract.css:24` 里的 `html[data-theme="light"]`
是**死选择器**：全仓搜索 `data-theme`，`packages/` 与 `scripts/` 下没有任何一处设置它
（命中只有这两个 CSS 文件与 T70 文档里的一句话）。

连带后果：`App.tsx` 的两屏回退 `正在启动 d2-tools...` / `加载中...` 是
`<main className="page">` 直接挂在 `#root` 下，而 `.page` 只有 `width / min-height`
没有背景（`02-elements.css:45`）——**连这两行字也是打在近乎纯黑上的**。

## 四、实测时间线（2026-09-18）

方法：无头 Chromium 打**当时正在运行的** Vite dev server（`127.0.0.1:53172`，只读），
`window.d2` 换成桩返回 `nextStep: "home"` 的 `StartupState`，逐帧记录
`getComputedStyle(document.body).backgroundColor`、`.app-shell` 是否挂载、屏上文字。
脚本：`/tmp/timeline.mjs`（临时件，未入库）。

```
t(ms) | body 背景            | 主题      | 屏上文字
  35  | rgba(0,0,0,0)      | no-shell  |
  89  | rgb(7, 11, 16)     | no-shell  |          ← 开始纯黑
  95  | rgb(7, 11, 16)     | no-shell  | 正在启动 d2-tools...
 106  | rgb(7, 11, 16)     | no-shell  | 加载中...
 418  | rgb(7, 11, 16)     | light     | D2 / d2-tools ...   ← 亮色壳挂上，黑结束
```

`89ms → 418ms` ≈ **330ms** 是渲染侧的黑色区间（dev、模块已热）。
真实打开时还要叠加：Electron 建窗到渲染进程首帧、`startup:get` 的 IPC 往返、
冷启动时 Vite 逐个 transform 的部分。

生产路径（`loadFile`）因为 CSS 是 `<head>` 里的阻塞 `<link>`，首帧直接就是
`#070b10`，不会先闪一下白；dev 路径会先白（`t=35` 无 CSS）再黑。

## 五、为什么是「每次」

`main.ts:96` 的 `app.on("activate")`：macOS 上关掉窗口不退出进程，
再点 Dock 会重走一遍 `createWindow()` —— `show:true` → 黑 → `.app-shell` 挂载。
所以是每次打开闪一次，不是只有冷启动。

## 六、没测到的（本次的边界）

**真实会话里的时长未测。** 要拿到它需要再起一个应用实例，而它会走真实 IPC
写用户正在使用的数据目录（`account-snapshot-cache.json` 等），本次没有做，
以免干扰正在运行的会话。渲染侧黑色区间下限是第四节那 330ms。

用户侧可自查：**设置 → 诊断** 里的 `startup.window-load`
（预算见 `runtime/runtimeMetrics.ts` 的 `runtimeBudgets`，p95 1500ms）。

## 七、候选修法

| | 做法 | 效果 | 代价 |
|---|---|---|---|
| **A** | `show: false` + `once("ready-to-show")` 再 `show()`（`main.ts:46-66`） | 窗口在渲染就绪前根本不存在，黑色区间消失 | 打开手感略慢；`ready-to-show` 的时机要实测确认不会退化成「晚出来但出来就是好的」 |
| **B** | 把 `data-theme` 真的写到 `<html>` 上（CSS 已写好，现在是死的），或让 `App.tsx` 的两屏回退落在带主题宿主的容器里 | 修掉「亮色主题下启动画面是深色」；`html[data-theme]` 那两条规则不再是死代码 | 要定 `data-theme` 与 `.app-shell[data-color-mode]` 谁是唯一真源，别做成两套口径 |
| **C** | 只把 `body` 的底色按当前 `color_mode` 给一个兜底（不引入 `data-theme`） | 最小改动，黑色变浅灰 | 治标；启动回退屏仍是深色文字配色 |

A 与 B/C 正交：A 管「什么时候显示窗口」，B/C 管「显示出来是什么颜色」。
只做 A 也已经能消掉黑屏观感，但 B/C 描述的是一处真实的口径不一致（死选择器）。

`backgroundColor` 本身没错（已跟 `color_mode` 对齐），错的在页面侧，不要动 `ipc/window.ts:9`。

## 八、验收标准

- 冷启动、以及 macOS 关窗后点 Dock 重开，`light` 与 `dark` 两种模式下都看不到整块纯色底；
- `light` 模式下启动回退屏（`正在启动 d2-tools...` / `加载中...`）不再是深色底；
- `设置 → 诊断` 的 `startup.window-load` 不因本次改动变差（基准 p95 1500ms）。

## 九、等拍板

- 选 A / B / C，或 A+（B 或 C）。
- 若做 B：`data-theme` 与 `.app-shell[data-color-mode]` 的唯一真源定在哪一侧。
- 第六节那个「真实会话时长」要不要补测（需要临时占用数据目录，或让用户自查诊断页报数）。
