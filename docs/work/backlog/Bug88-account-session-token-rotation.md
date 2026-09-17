# Bug #88：登录正常却提示「登录可能已失效」

> 状态：✅ 代码已完成，四门判据全绿 + 四处变异验证（2026-09-16），待用户重启后确认
> 现象（用户截图，v0.0.26）：首次读取装备数据失败，红条「读取装备数据失败，仍显示上次装备数据。登录可能已失效，请重新登录 Bungie。Bungie account session changed while the request was running」。用户确认登录本身没问题。

## 症状拆开看

红条里有两句话，来源完全不同：

| 文案 | 谁说的 | 对不对 |
|---|---|---|
| 「Bungie account session changed while the request was running」 | 应用内部错误原文（`account/session.ts` 的 `assertActiveRequest`） | 是事实，但它描述的是**应用自己的并发竞态**，与登录无关 |
| 「登录可能已失效，请重新登录 Bungie」 | 渲染层兜底文案（`useAccountWorkspace.ts` 的 `getAccountLoadErrorMessage`） | **错的**。它是「Bungie 已配置 + 账号已就绪」时对**任何**错误的统一措辞，没有看错误类型 |

也就是说：真正发生的是一个内部竞态，渲染层却把它翻译成了「你去重新登录」。用户什么都不做，过一会儿数据其实就正常了。

## 根因（两级，都要修）

### 一级：启动时并发刷新同一个 access token

Bungie 的 access token 有效期约 1 小时，过期后靠 refresh token 换新的。**换 token 这件事全仓没有并发合并**：

- `packages/desktop/src/main/ipc/authSession.ts` 的 `loadFreshOAuthToken` 每次调用都自己发一次 HTTP 刷新并写盘，没有在途合并；
- 调用方至少四处，且启动时天然并发：账号 Session（`runtime/accountSession.ts:294` 的 `getAccessToken`）、最近活动（`ipc/activities.ts:11`）、首页简报（`runtime/homeBriefing.ts:493`，它**自己**做了合并，但只覆盖自己）、写操作（`ipc/actions.ts:594/761`）。

于是「隔夜后再打开应用」（token 已过期）这一最常见的场景是：几个通道同时读到「已过期」→ 各自刷新 → 拿到**不同的** access token → 后写盘的覆盖先写盘的。而账号 Session 里：

```
getScopedAccessToken()：token 字符串一变 → clearAccountCaches() + sessionEpoch += 1
assertActiveRequest()：token 字符串一变 → 抛「session changed」
```

旁路刷新（比如最近活动那条）换了 token，正在飞行中的账号请求一落地就撞上检查、被判为「会话变了」而丢弃——**它明明是同一个账号的数据**。

### 二级：把「token 换了」等同于「换账号了」

`assertActiveRequest` 只能看到 token 字符串，于是无法区分两种完全不同的情况：

| 情况 | 数据还能不能用 | 现在怎么处理 |
|---|---|---|
| 同一个账号，token 到点轮换 | **能用**（账号没变） | 清空全部缓存 + 丢弃在途请求（错） |
| 真的换了 Bungie 账号 | 不能用 | 清空全部缓存 + 丢弃在途请求（对） |

账号身份其实一直都在手上：桌面侧的 token provider 已经写了 `activeAccountId = token.membership_id`，只是没往 Session 传。

## 处置（三条，一起做）

1. **合并刷新**（治根）：`loadFreshOAuthToken` 按「data 目录 + client_id」做在途合并，并发调用共享同一次刷新、同一个新 token。顺带消掉一个更坏的风险——Bungie 的 refresh token 可能轮换，并发刷新有概率互相作废，那会真的变成「必须重新登录」。
2. **按账号身份判会话，不按 token 字符串**（治根）：token provider 顺带返回账号身份（`membership_id`）；token 只是轮换时不丢缓存、不打断在途请求；账号确实变了才清空并打断。拿不到身份时（测试、旧调用方）退回按 token 字符串判，行为与今天一致。
3. **文案说实话**（治标，也是兜底）：渲染层只在错误确实是认证类（IPC 错误里的 `causeCategory === "authentication"` 或 `code` 以 `AUTH_REQUIRED` 结尾）时才说「登录可能已失效」；其它错误说中性话，并把原始信息附在后面。今天渲染层只取了 `error.message`、把 `code` / `causeCategory` 丢了，所以要先保住错误对象再判断。

## 落地清单

| 位置 | 内容 |
|---|---|
| `desktop/main/ipc/authSession.ts` | `loadFreshOAuthToken` 拆出 `refreshTokenOnce`（按「data 目录 + client_id」在途合并，完成后清空）+ `performRefresh`（真正的刷新与错误包装） |
| `services/account/session.ts` | 新增 `AccountAccessToken = { access_token, account_id? }`，`getAccessToken` 放宽为可返回它；`currentAccessToken` 换成 `currentIdentity = account_id ?? accessToken`，**只有身份变了**才清缓存、bump epoch；`assertActiveRequest(requestEpoch)` 不再比 token 字符串（换账号必然 bump epoch，保护没有丢） |
| `desktop/main/runtime/accountSession.ts` | token provider 带上 `account_id: token.membership_id` |
| `desktop/renderer/features/account/accountLoadError.ts`（新） | `formatAccountLoadFailure` / `isAuthenticationFailure`：只有 `causeCategory` 为 authentication / authorization 或 `code` 以 `AUTH_REQUIRED` 结尾才说登录失效 |
| `desktop/renderer/features/account/useAccountWorkspace.ts` | 抛 `workspace.error` 错误对象本身（原来只取 `message`，把 `code` / `causeCategory` 丢了）；删掉旧的 `getAccountLoadErrorMessage` |
| `docs/development.md` 2.6 | 把「刷新合并 + 会话身份按账号判」写进账号读取那条不变量 |

## 测试与变异（`pnpm exec vitest --run` 逐文件）

| 用例 | 变异 | 结果 |
|---|---|---|
| services：同一账号换 access token → 在途请求照常返回 | 身份改回只看 token 字符串 | **只有这条变红** |
| services：账号身份变了 → 在途结果丢弃 | 换账号时不清缓存、不 bump epoch | **这两条变红** |
| services：provider 不给身份时退回按 token 判 | 同上 | 同上 |
| desktop：并发刷新只发一次请求、三个调用拿到同一个 token | 去掉在途合并直接刷新 | **这条变红**（实测 3 次刷新） |
| desktop：内部竞态 / 网络错误不冒充登录失效 | 任何错误都返回「登录可能已失效」 | **这两条变红** |

四门判据复跑：`pnpm typecheck` 7 包 ✅、`pnpm test:behavior` 137 文件 / **543** 用例 ✅、`pnpm test:architecture` 15 文件 / 66 用例 ✅、`pnpm docs:check` ✅。

## 残余风险 / 明确不做

- 不做「失败自动重试」：合并刷新 + 身份判定之后，这个错误不该再出现；再加一层重试会掩盖真正的账号切换。
- token 里没有 `membership_id` 时（provider 也没给身份），身份退回 token 字符串 → 轮换仍会被当成换账号。此时**合并刷新已经把并发刷新这个根因去掉了**，只剩每小时一次的理论边界窗口；不为此再加机制。
- 登录态本身坏了（token 文件损坏、refresh token 被 Bungie 作废）不在此列——那种情况确实要重新登录，文案保持现状。
