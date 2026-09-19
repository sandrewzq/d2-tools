# T89：仓库工作流栏加当前角色切换器（账号 / 仓库共用一个共享组件）

> 状态：✅ 已通过实窗验收（2026-09-19）
> 合同：`docs/work/references/ui-specs/application-workspaces.md`
> 计划：`.claude/plans/cosmic-dazzling-axolotl.md`（2026-09-19 获批）

## 一、问题

仓库工作流栏（`1 浏览装备 / 2 推荐来源` 那一行）右侧整块空着，而仓库页早就有「当前角色」这个概念：位置筛选的「当前背包 / 当前已装备 / 当前邮政官 / 其他角色」和卡片上的「取出」目标全按它算。
这个值由账号页的 `selectedCharacterId` 统一持有，桌面壳一路传到仓库，**唯独仓库菜单没有改它的入口**。

所以本轮不新建状态，是给已有的共享状态补第二个入口，并把账号页那套已经跑通的切换器抽成共享组件，
避免同一个视觉对象出现两种长相。

## 二、改法（已改完）

1. 新增共享组件 `packages/ui/src/control/ContextSwitcher.tsx`，`variant: "full" | "compact"`；
   组件自身不渲染任何用户可见字面量，`title` / `detail` / `meta` / `capacity.label` 全由调用方拼好传入，
   类名固定在 `.context-switcher` 上，外观只在新文件 `styles/components/14-context-switcher.css` 里定义。
   键盘用仓库通用的 `getRovingFocusIndex`（`orientation: "both"`），与另外 6 个切换器同一套。
2. 账号页改用 `<ContextSwitcher variant="full">`，删掉私有的 `characterRefs` 与 `handleCharacterKeyDown`；
   `accountText` 与 `formatCharacterCapacitySummary` 留在调用方拼 `detail` / `capacity`。
3. 角色页签 builder 从 `accountPage.ts` 挪到中性的 `packages/app/src/workspaces/characterTabs.ts`，
   账号与仓库两处 import 同一份；顺手删掉 `loadVaultPageWorkspace` 里写死的
   `selectedCharacterId: account.characters[0]…`（该函数没有真实调用点，留着会让人以为仓库角色钉死在第一个）。
4. `VaultPageInput.account` 放宽成结构性来源类型（`AccountPowerAccountSource` 那一族），
   账号全量快照和桌面端精简仓库快照都满足，不必把 `AccountSummary` 硬塞进桌面调用点。
5. `.vault-workflow-bar` 栅格从 `auto minmax(0, 1fr)` 改成 `auto auto minmax(0, 1fr)`，
   切换器插在页签与右侧状态徽标之间；`.vault-workflow-meta` 钉 `grid-column: -2 / -1`，
   没放切换器时状态徽标也留在右侧。

## 三、自验记录（产物在 `.local-data/tmp/t89-character-switcher/`，git 之外）

| 项 | 结果 |
|---|---|
| 账号 full 变体抽取前后 | 逐项相等，无差异（容器 1176×76.23，按钮 587×74.23 / 391.33×74.23，徽标 28×28，格 `28px 529px`，三行字号 15/13/12px） |
| 仓库 compact 变体 | 栏高 53px == 无切换器基线；切换器 36px == 页签 36px；中轴差 0；右侧余量 0；无横向溢出 |
| 宽度 | 1024 / 1280 / 1440 / 1512 四档稳定；2 角色 212px、3 角色 318px |
| ≤700px | 沿用既有的窄屏堆叠（栏高 128px），非本次引入 |
| full 的两条 `@container` | 加 `[data-variant="full"]` 后仍生效（≤700 → `flex-basis: 220px` + `overflow-x: auto`；≤420 → `210px`） |

**未跑**本地自动化验证。

## 四、与计划的两处偏离

1. builder 落在 `packages/app/src/workspaces/characterTabs.ts`，不是计划写的
   `packages/app/src/account/characterTabs.ts`。那个目录不存在，`workspaces/` 才是这类模块的归属。
2. compact 变体第二行显示 `power.currentLabel`（「当前 2010」），不是计划里写的裸 `lightLabel`（「光等 2010」）：
   同一行在账号页本来就念「当前 …」，两处口径一致比字面更短的标签更重要。

## 五、已知残留

2026-09-19 实窗验收通过。下面两条残留原样保留，都不是本轮引入的问题；本地自动化验证未跑，由 CI 负责。

- 配装页 `LoadoutsPageContentView.tsx:358` 是第三个 `context-switcher`（首字母标记 + `N 槽`，
  没有徽标和光等），内容集和本轮不同，未动。要不要也换成共享组件，等这一轮实窗验收后再看。
- 仓库侧的文案按 `VaultPageContentView.tsx` 现有习惯硬编码中文（该文件整体如此，
  `aria-label="仓库工作台"` 就是），没有走 `packages/ui/src/i18n/copy/vault.ts`。
  那个文件是个没有消费者的空壳。严格走 i18n 要连 `ProductShellHost` 一起动。
