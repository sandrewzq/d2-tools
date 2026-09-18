# T76：Bungie 请求 affinitize（持久化并回带 set-cookie）+ 写后读回留痕

> 状态：🟢 代码保留并生效，但**结论已被证伪** —— 亲和性不是这个 bug 的解。真因与修法见
> [`T77`](T77-perk-write-acceptance.md)；本文正文记录机制本身，第一节的结论段已就地更正。
> 来源：2026-09-18 用户实窗报「换 Perk 之后应用报『写入成功，详情同步失败』，手动重读也一样」
> 编号说明：本轮开工时计划里写的是 T74，落地前发现 T74（首页轮换活动掉落池）与 T75（启动黑屏）已被占用，
> 因此改用 **T76**。
> 用户口径：**先只做甲**（affinitize + 写后读回留痕），拿留痕看结果再决定要不要收敛「保证确认」的承诺。

## 一、问题与查证（都不是推测，是只读接口读出来的）

换 Perk 点「应用」后，界面报「Perk 更改请求已受理，但连续自动读取后游戏服务仍返回旧配置」；
再点「重新读取配置」还是同一句。用户进不了游戏，授权我直接用接口查。

2026-09-18 的只读取证（脚本在 `.local-data/tmp/bungie-read/`，只发 GET，临时 token 刷新只在内存里）：

1. **写入是真落地的。** 倾斜角度（instance `6917530199817605283`）的弹匣槽 `socketIndex 2` 现在就是
   轻质弹匣（plugHash `1807273211`，用 `?lc=zh-chs` 核对过中文名）。写入时刻 `2026-09-18T10:10:19.973Z`，
   耗时 3624ms。不是「写失败」，也不是「写了个空值」。
2. **不是仓库挡住了。** 装备在 `profileInventory` 里，插槽变更确实装上了。
3. **没有第二份更陈旧的读取来源。** 同一时刻分别读实例端点（GetItem）与档案端点
   （GetProfile `components=102,201,205,305`），13 个槽逐字节一致，都已是新值。
4. **本地读回链路是干净的。** `useItemDetail.ts` 传 `force: true` → `repository.getItemDetail("refresh")`
   → `refreshItem(force)` → `session.getItemDetail({freshness:"refresh"})`，内存缓存、持久 store、
   在途复用三样全跳过。
5. 每个响应都带 `cache-control: public, max-age=5` 和
   `set-cookie: __cflb=<不透明值>; HttpOnly; SameSite=None; Secure`。`__cflb` 是 Cloudflare
   负载均衡的粘滞 cookie。
6. 全仓 `grep -rniE "set-cookie|cookie|credentials:" packages/services/src packages/desktop/src/main packages/core/src`
   **命中数为 0**；生产环境 `fetchImpl` 是 Node 全局 fetch，没有任何东西替我们管 cookie。

**当时的结论（按排除法得出，不是直接观测）**：写入打到了一台后端，随后的读回落到另一台还留着旧副本的后端；
应用没有 affinitize，冲不掉那台缓存。这条结论的软肋是「排除法」本身——所以本轮同时加了读回留痕，
用它把「猜」变成「看」。

**结论更正（2026-09-18，见 T77）**：留痕确实把「猜」变成了「看」，而看到的是**另一个原因**。同一批留痕里：

- 12:12:09 写入被 Bungie 受理（ErrorCode 1）；12:12:04 → 12:12:35 的 6 次 `verification-read`
  每次读到的都是**同一个**旧值 `1807273211`，没有抖动。
- 这 6 条 trace **每一条都带 `affinity_cookie: true`** —— 粘滞标识确实在发，读回却一字不变，
  说明「落到另一台陈旧后端」这个解释不成立（否则至少会抖）。
- 12:15:09 直接探测实例端点，插槽 2 已经是 `550838496`（期望值）—— **写入落地了**。
- 12:15:22 实例端点与档案端点同一时刻逐槽一致 —— 没有第二份更陈旧的读取来源。

真因是**服务端传播延迟**：写入被受理之后，Bungie 自己要过几十秒、实测约 2.5 分钟才把新配置
吐给读取端点。应用拿 14.75 秒的重试预算去判「服务器没跟上」，于是把正常传播定性成了失败——
这就是「写入成功，详情同步失败」这条假报的来源。

**那这套 cookie 机制为什么留着**：它本身是对的，只是不解决这个 bug。

- DIM 跑在浏览器里，浏览器**隐含**就带 cookie jar；我们跑在 Node 主进程里，不显式做就是没有。
- Bungie 对单用户应用的官方指引就是原样回带它下发的 cookie。
- 真正的跨后端抖动一旦发生（Bungie 换负载均衡策略、多账号并发），它就是那层防护，而代价只有
  一个布尔字段加一个本地 JSON。

运行期验证过机制本身可用（node v24.19.0）：`response.headers.getSetCookie()` 能拿到逐条 `set-cookie`；
手工设的 `Cookie` 头能真的发出线上（本地 `node:http` 服务端实测依次收到 `null` → `"__cflb=abc123"`）。

## 二、做了什么

### 2.1 新模块 `packages/services/src/bungie/cookies.ts`

```
createBungieAffinityCookieJar({ dataDir, now? }) → BungieCookieJar
  cookieHeader(): string | undefined      // 只回带未过期、在白名单里的 cookie
  capture(response: Response): void       // 捕获 set-cookie
configureBungieCookieJar(jar) / resetBungieCookieJar() / getActiveBungieCookieJar() / hasBungieAffinityCookie()
bungieAffinityPath(dataDir) → <dataDir>/bungie-affinity.json
```

几处不是可选项的取舍：

- **必须用 `getSetCookie()`**。`headers.get("set-cookie")` 会把多条 cookie 用 `", "` 拼起来，
  而 `Expires` 属性本身含逗号，用它必然把一条 cookie 切成两条。
- **`capture()` 对残缺的 `Response` 免疫**。`packages/desktop/test/account-token-refresh-coalescing.test.ts`
  用 `{ ok: true, status: 200, json } as unknown as Response` 打桩全局 fetch，那个对象没有 `headers`——
  写成 `typeof response?.headers?.getSetCookie === "function"` 并吞掉异常，否则会连带弄红一个既有测试。
- **墓碑必须删，不能存**。`Max-Age` 优先于 `Expires`（RFC 6265 §4.1.2.2）；`Max-Age<=0` 或已过的 `Expires`
  = 删除该条。只做「后写覆盖」的话，作废的值会被永久回带，**比没有 jar 更糟**。
- **白名单**，初始 `["__cflb"]`，内存与磁盘同一套名单（不落 `cf_clearance` / `__cf_bm` 这类安全 cookie）。
  若 Bungie 换了名字，失效信号是留痕里的 `verification-read` 又出现不匹配。
- **解析手写**（约 40 行，不引依赖）。按 `;` 切属性，第 0 段按**第一个** `=` 切名值（值可能含 `=`），
  属性名小写。引依赖会让 `licenses:check` 的 notices 过期。
- 落盘：**同步写**、仅在变化时写、`mkdirSync` 只在首次成功捕获时做、`mode: 0o600`，任何 fs 失败静默降级；
  读失败/版本不认识/JSON 坏 → 空 jar（**不**抄 `loadOAuthToken` 那种裸 `JSON.parse`）。
- **会话级 cookie（没有 Max-Age / Expires）留在内存，不落盘**，跨重启不存活——浏览器语义如此。

### 2.2 接入点：`client.ts` 一个漏斗

`FetchBungieJsonOptions` 加 `cookieJar?: BungieCookieJar | false`；`requestBungieJson` 里
`options.cookieJar === false ? undefined : options.cookieJar ?? getActiveBungieCookieJar()`，
在构造 headers 时条件加 `Cookie`，在 `try/catch` 之后、`if (!response.ok)` 之前 `capture(response)`
（成功与失败响应都可能续期/作废 cookie）。

只在 **Bungie 自己的 host** 上读写（`hostname === "bungie.net" || endsWith(".bungie.net")`）。
生产里 `baseUrl` 恒为 Platform，但测试与将来可能的覆盖会把它指到别处，粘滞标识不能跟着跑。

**为什么用模块级「当前 jar」而不是逐层穿参**：`BungieJsonFetcher = (path, accessToken) => Promise<T>`
没有放 jar 的位置，而这个类型在 `bungie/session.ts` 与 `core/src/bungie/transport.ts` 各有一份。
显式穿参要改约 12 处，而**漏掉任何一处都会静默退回「没有 cookie」**——写入走 `actions.ts`、
读回走 `accountSession.ts` → `bungieSession.ts`，两处在不同模块构造请求，只做一半和完全不做是一样的。
`cookieJar?: ... | false` 这个按调用覆盖的口子留着给测试隔离。

### 2.3 装配（两处）

- **配置**：`packages/desktop/src/main/main.ts` 的 `app.whenReady()` 内、`initializeRuntimeCoordinator()`
  之前。放组合根，**不放** `runtimeCoordinator.ts`：`packages/desktop/test/runtime-coordinator.test.ts`
  把 `loadConfig` 打桩成 `data_dir: "D:/data"`，在那里配置会让一个重度 mock 的单测去对不存在的盘符
  做真实文件系统操作。
- **复位：没做。** 计划里原本要折进 `resetSharedBungieSession()`，落地时发现它的**唯一调用方**是
  `shutdownRuntimeCoordinator()`（进程即将退出），而它只清模块引用、不删文件——真折进去只会得到
  「会话中途把活跃 jar 摘掉、此后所有请求静默不粘」这个有百害无一利的后果。计划的理由里还把
  「manifest 激活链路」也算上了，实际 `quiesceRuntimeForManifestActivation()` 并不调它。
  要复位的时候再显式调 `configureBungieCookieJar(undefined)` 即可。

### 2.4 覆盖范围（已审计）

桌面主进程发往 Platform host 的请求**全部**经过 `client.ts`：写入（10 个 action）、本条读回路径、
两个默认 `fetchJson` 闭包、activity history、vendor inventory。生产代码里没有任何 `baseUrl`/`fetchImpl` 覆盖。

不覆盖且**不需要**覆盖：`manifest/cache.ts`（同 host 但只读不可变元数据）、`manifest/definitions.ts`
与 `artifacts.ts`（静态 CDN）、`oauth/client.ts`（token 端点，不在同步窗口里）、
`vendors/liveInventory.ts`（生产不走的默认实现）、`net/publicUrlReader.ts`（外来 host，**绝不能**拿到
这个 cookie —— 已在那个文件加注释说明为什么它必须继续自己发 fetch，守卫也钉了）。

已知局限（如实记）：`heavyTaskWorker.ts` 是 `worker_threads` 线程，模块注册表独立，看不到模块级 jar。
它只做 manifest 工作，对本体无影响。

### 2.5 写后读回留痕

目标是让「猜」变成「看」。词汇是现成的——`ActionDebugTraceInput` 早有
`verification-read` / `verification-complete` 两个 phase 与 `attempt` / `total_attempts` /
`expected_count` / `matched_count` / `reflected` / `ok`，主进程的账号写入轮询已经在用，
只是 Perk 这条路的读回发生在渲染进程、以前只记了 `submit-start` / `submit-complete`。

- `useItemDetailWorkspace.ts` 的 `refreshItemDetailUntilVerified` 加
  `describeRefreshedItem?: (detail) => RefreshedItemVerification` 与 `trace` 两个入口：
  每次**校验失败**补一条 `verification-read`（带 `attempt` / `total_attempts` / 两个 count，
  `message` 写「插槽 2：期望 1807273211，读到 4269546394」这种逐槽对照），循环结束**总是**记一条
  `verification-complete`。一次就读对时只有 1 条 complete，不产生噪声。
- `ItemDetailModal.tsx` 的 `hasAppliedPerkChanges` 改成由 `summarizeAppliedPerkChanges`
  的汇总派生（`matched_count === expected_count`，与原 `changes.every(...)` 的空数组语义一致），
  谓词与留痕共用同一份实现；写入路径（`verifyRefreshedItem` + `describeRefreshedItem`）与手动
  「重新读取配置」两个调用点都跟着改。
- **手动重读也记一条 `verification-read`**：用户第二张截图就是手动重读失败，这条留痕直接回答它。
- `ActionDebugTraceInput` 加 `affinity_cookie?: boolean`。它由**主进程**在
  `writeActionDebugTrace()` 里盖章（jar 住在主进程，渲染进程看不见，调用方传的值不采信），
  所以每条留痕都带上，读回不匹配时才分得清「jar 是空的（亲和性没起来）」和「jar 非空却仍读不回
  （另有原因）」。它是布尔，**不是 cookie 值**。
  口径：这是**记录时刻**的 jar 状态，不是请求发出时刻的精确快照（首个请求就会填上 jar，两者通常同值）。

**没有收敛承诺（这一段已被 T77 取代）**：这里当时保留 `[0, 750, 1_500, 2_500, 4_000, 6_000]`
那 14.75 秒重试当安全网，`ItemDetailModal.tsx` 的两句用户可见文案一字未动。T77 把这条重试从
**阻塞门闸**改成了**后台静默核对**（台阶 `[0, 5, 15, 30, 60, 90]` 秒），写入受理时界面就已经
显示新配置，「服务器还没吐回来」不再进任何失败态。

> T77 / T78 之后的名字对不上是正常的：`verifyRefreshedItem` / `describeRefreshedItem` 两个选项已经删掉，
> 合成 `runItemWriteAction` 的 `backgroundVerification` 一个包（`verify` / `describeAttempt`），
> 由 `startSocketPlugBackgroundVerification` 以 `mode: "probe"` 跑。它**只留痕、不回调改界面文案**
> —— 最初的 `onSettled` 会让面板在「一次读回读到期望值」时改口说「已与服务器确认」，
> 而读回在收到旧值时同样会成功返回，那个位置区分不开「服务器认了」和「服务器还没跟上」（T78 已删）。
> 受理状态另有一份活得比弹框久的落点（`shared/stores/acceptedSocketPlugs.ts`）。留痕的词汇与字段一字未改。

## 三、测试与守卫

- 新增 `packages/services/test/bungie.cookies.test.ts`（10 条）：值里的 `=`、`Max-Age` 优先于 `Expires`
  并按时间过期、墓碑删除且不落盘、白名单过滤、落盘/跨实例读回（含首次建目录）、会话级 cookie 不落盘、
  过期条目载入即丢、版本不认识被忽略、坏文件降级为空 jar 且之后仍能重新捕获、无 `headers` 的 `Response` 免疫。
- 扩 `packages/services/test/bungie.client.test.ts`（5 条）：捕获后下次回带、空 jar 不发 `Cookie`、
  `cookieJar: false` 关整条链路（**先给活跃 jar 灌值再断言没发**，否则是空 jar 的必然结果、证明不了什么）、
  非 Bungie host 既不回带也不捕获、无 `headers` 的 `Response` 不抛异常。
- `packages/desktop/test/architecture-maintenance.test.ts` 补一条守卫（**在既有白名单文件里加**，
  不新增架构测试文件，否则要动 `check-test-quality.mjs`）：漏斗必须同时具备捕获与回带、
  不得用 `headers.get("set-cookie")`、jar 必须用 `getSetCookie()`、组合根必须 configure、
  `publicUrlReader.ts` 不得碰 jar、亲和性文件不得进 `configBackup.ts` 的便携备份与
  `cache/maintenance.ts` 的清理清单。
- `packages/services/package.json` 的 `exports` 加 `./bungie/cookies`；**不**从 services 的 `index.ts`
  再导出（那个文件的导入清单有守卫守着，而且往浏览器入口塞 `node:fs` 是错的方向）。
- 不引任何运行时依赖。

## 四、验证

### 4.1 已做的（机制层）

- node v24.19.0 实测：`getSetCookie()` 拿得到逐条 `set-cookie`；手工设的 `Cookie` 头真的发到线上
  （本地 `node:http` 服务端依次收到 `null` → `"__cflb=abc123"`）。
- 仓库里的自动化闸门**未运行**（按约定留给本地测试 / CI / Release）。**未运行**的部分包括：
  `pnpm typecheck:*`、`test:behavior`、`test:architecture`、`test:quality`、`ci:local`。
  收尾如实写：**未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。**

### 4.2 复验步骤（这是唯一能证明修复的）

1. **重启 `tools/mac-dev-desktop.command`。**（2026-09-18 更正：原文写的是「重新构建，桌面端消费
   `packages/ui/dist`」——这里说错了两处。① 本轮根本没碰 `packages/ui`，碰的是
   `packages/services/src/bungie/{client,cookies}.ts`、`packages/services/src/net/publicUrlReader.ts`
   与 `packages/desktop/src/main/main.ts`，而 `packages/ui/dist` 只在**测试与打包**时被消费；
   ② 这些改动的正确生效方式是**重启 dev 脚本**：`scripts/dev-desktop.mjs` 在启动时按 mtime 增量构建
   `core` / `http` / `services` / `app` / main / preload 六个产物，跑起来之后不会自己重算。
   渲染层（`packages/ui/src` 与 `packages/desktop/src/renderer`）才是 Vite 别名直读源码、热更。）
2. 进游戏外的应用里换一个 Perk，点「应用」。
3. 看 `~/Library/Application Support/d2-tools/write-action-debug.json`（只读脚本读，不打印 cookie 值）：
   - **成功**：`phase: "verification-complete"` 且 `reflected: true`、`attempt: 1`，
     且**没有** `verification-read` 行 —— 一次就读对了。
   - **仍然失败**：`verification-read` 行给出逐槽「期望 vs 读到」。若那些行的 `affinity_cookie: false`，
     是亲和性没起来（装配没生效）；若是 `true` 却仍读不回，则本轮的解释被证伪，要另找原因。

   > **T77 之后的读法**：`attempt: 1` 这个期待来自「写后立刻读」的前提，已经不成立了——写入受理后
   > 界面立刻显示新配置，后台核对才开始跑，所以正常会看到若干条 `verification-read`，
   > 直到最后一条 `verification-complete` 变成 `reflected: true`（实测约 2.5 分钟）。
   > `affinity_cookie` 仍然值得看，但它现在只用来确认漏斗没被摘掉，不再用来解释这个 bug。
4. 顺带确认 `<dataDir>/bungie-affinity.json` 出现了、里面有 `__cflb` 条目、`ls -l` 权限是 `600`。

## 五、明确不做

- ~~不收敛「连续读取保证确认」的承诺（用户口径：先只做甲，拿留痕看结果再定）。~~
  已由 T77 收敛：写后读回不再是阻塞门闸，也不再产生用户可见失败。
- 不碰 `useItemDetail.ts`、`is_detail_loading` 的字段语义、之前那处宿主就绪闩锁修复。
- 不把 `manifest/cache.ts`、`oauth/client.ts`、`publicUrlReader.ts` 接进漏斗。
- 不删 jar 文件、不提供应用内的「清掉亲和性」入口。
- 不做 `resetSharedBungieSession()` 里的复位（理由见 2.3）。
