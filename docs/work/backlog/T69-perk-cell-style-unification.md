# T69：Perk 条目统一样式（本件 Roll / 固有能力 / 完整掉落池 对齐推荐区那套）

> 状态：✅ 已通过实窗验收（2026-09-19；代码 2026-09-17 完成）
> 用户诉求（截图 + 原文）：「现在 perk 样式没统一，上面区域应该改成下面那种风格」；
> 追问后定口径：「现在换 Perk 功能做的是有问题的，之后要重构，所以**先改样式**，不仅是上区要改，**完整 roll 区域也要改**」。
> 前置分析（两处条目的实测差异）见第一节；本次只动样式，换 Perk 交互一字不动（见第二节）。

## 一、问题：同一页两块地方各写了一套 Perk 条目

同一个武器详情页里，「本件 Roll／固有能力／完整掉落池」与「推荐判断 → 来源要求 ｜ 本件拥有」
各写了一个条目组件、各配一套 CSS：

| | 组件 | CSS |
|---|---|---|
| 上区（本件 Roll / 固有能力 / 完整掉落池） | `PerkColumn`（`WeaponDetailContent.tsx:934`） | `.weapon-detail-perk`（`09-weapon-detail.css:365-375`） |
| 下区（推荐判断的两列） | `RecommendationPerkIcon`（同文件 `:1435`） | `.weapon-detail-recommendation-perk`（同文件 `:469-498`） |

两边读的是**同一份事实**（这个插槽里这件武器拥有哪些 Perk、哪个是当前启用的），却长得完全不同。
实测（真实样式表 + 无头 Chromium，1680×900，compact 密度）：

| 项目 | 上区 `.weapon-detail-perk` | 下区 `.weapon-detail-recommendation-perk` |
|---|---|---|
| 格子 | 300×84.4，min-height 66，padding 8，圆角 6px | 220×50，min-height 50，padding 5/9/5/6，圆角 4px |
| 图标 | 38×38 方形、圆角 4px、3px 内边距 + 1px 边框（图案只有 30×30） | 36×36 圆形（radius 50%）、无内边距无边框、图案铺满 |
| 名称 | 14px，可换行 | 12px 700，一行省略号 |
| 说明 | 写在格子里（12px、可多行） | 在说明浮层里 |
| 状态词 | 格顶满宽横幅（实测 298/300 宽 × 26 高、自带底色） | 名称下第二行小字（159 宽、无底色） |
| 「当前」 | 整格换底色 + 换边框 | 蓝点 + 名称后文字 |
| 「命中」 | 无此概念 | 绿勾 + 左缘 3px 实色条 |
| 状态词表 | 待应用 / 当前已选 / 这件武器拥有 · 可切换 / 这件武器拥有 | 符合 · 当前 / 符合 / 当前启用 / 本件拥有 |

两处实现细节也分叉：上区的横幅靠 `margin: -8px -8px 0`（`:370`）反向吃掉父级内边距画出来，
绑死在 `padding: 8px` 上；下区用绝对定位徽标，不依赖父级。图标取值口径也不同——上区直接给
`perk.icon`，下区先过 `normalizeRecommendationIconUrl()` 补 `https://www.bungie.net` 前缀。

**方向只能是上区向下区靠**：下区那套已经被规格逐条钉死（`equipment-details.md` 武器规则「来源候选和本件拥有
均使用『图标 + 常驻 Perk 名称 + 短状态』条目」：绿勾、蓝点、「4–5px 左侧实色条」、「不得大面积铺底」、
「不得只靠颜色表达状态」），上区那套没有任何规格约束。

## 二、用户已定的口径（本次按这个做）

1. **先只改样式**：换 Perk 的交互（哪些格子可点、点了会发生什么）**一字不动**，之后单独重构。
2. **范围**：上区（本件 Roll / 固有能力）**与完整 Roll 区域（完整掉落池、异域配置候选）一起改**。
3. 说明文字随下区一起进浮层（下区条目本来就没有行内说明）。

## 三、改法：一个条目组件，一套规则

### 3.1 组件

新建 `packages/ui/src/item-detail/weapon/WeaponPerkEntry.tsx`，把下区现在的条目外观搬过来成为**共用条目**；
`RecommendationPerkIcon` 删除，`PerkColumn` 与 `RecommendationSlotComparison` 都用新组件。
外观只有一处实现，之后任何一边改样子另一边自动跟着，不会再分叉出第三套。

### 3.2 状态映射（旧 → 新），词表向下区那套收

| 旧表达（上区） | 新表达 | 备注 |
|---|---|---|
| 格顶满宽横幅「当前已选」+ 整格换底 | 名称后**蓝点** + 状态行「当前已选」，格子底色不变 | 去掉大面积铺底（规格已禁） |
| 「这件武器拥有 · 可切换」 | 状态行「**本件拥有** · 可切换」 | 「这件武器拥有」→ 下区的「本件拥有」，同一件事一个词 |
| 「这件武器拥有」 | 状态行「本件拥有」 | 同上 |
| 「待应用」+ 整格换 pending 底色 | 状态行「待应用」+ 边框与文字用 pending 色 | 仍是待提交的显眼提示，只是不再铺底 |
| — | 「强化版本」后缀保留 | 与状态词用「 · 」连 |
| 行内说明（12px） | **说明浮层**（悬停 / 键盘聚焦打开，Escape、点外部关闭） | 格子 84.4 → 50 高 |
| 38 方形图标 | 36 圆形图标（`◆` 占位、`object-fit: cover`） | 与下区同形 |

### 3.3 点击语义（本次唯一的行为变化，写进验收判据）

- **能换 Perk 的格子（`interactive && can_apply`）**：点击＝切换 Perk，与今天**完全一致**
  （`aria-pressed`、staged → 应用面板流程、可点范围都不动）；说明浮层靠**悬停 / 键盘聚焦**打开。
  代价：触屏上这条路的说明浮层打不开——换 Perk 重构时一并解决，本次如实记着。
- **本来点了没反应的格子**（完整掉落池的全部、固有能力、以及当前不可切换的项）：今天点击**不做任何事**，
  改成**点击＝看说明**（与下区同一套）。这是为了让「说明进浮层」之后说明还能被读出来，
  也是键盘和触屏唯一的入口；不涉及换 Perk。
- 下区（推荐判断两列）点击＝看说明，不变。

### 3.4 类名中性化

`weapon-detail-recommendation-perk*` → `weapon-detail-perk-entry*`，列表容器
`weapon-detail-recommendation-perks` → `weapon-detail-perk-entries`。理由：这套条目现在两处共用，
名字里再带 `recommendation` 就是记账不实。纯机械改名（全仓只有这两个文件引用它们），
改完用实测对照确认**推荐区几何逐项不变**。注意改名要**同时**改样式与标记两侧：第一版落地只改了样式，
三个列表容器还留着旧名，静默丢了整段列表布局（见 6.1 收尾记录）。

条目宽度约束（`min-width 132 / max-width 220 / flex 1 1 148`）从条目挪到**列表容器**上，
条目本身只留 `width: 100%`：下区是 `flex-wrap` 列表（几个候选并排换行），上区是「一列一格一行、占满列宽」，
两种排布都不需要条目自己管宽度。

## 四、明确不做

- 不动换 Perk 的交互与流程（可点范围、`stagePerk` / `cancelPendingPerks` / `applyPendingPerks`、
  写入面板、数据层、IPC、服务层），那是用户已说明要单独重构的部分。
- 不动推荐区的语义（绿勾 = 命中来源要求、蓝点 = 当前启用、左缘条 = 命中），只改类名与组件归属。
- **发现但本次不接**：`unresolved_in_definition_pool`（`weaponDetail.ts:137`）由
  `buildWeaponDetailView.ts:582/614` 真实算出，但**界面上没有任何落点**，从来没人读。
  统一样式后条目有了 `data-unknown` 这个槽位（虚线边框），接上它只要一行——但那是补信息、不是改样式，
  单列一条待办，不在本次范围内。
- 不新增测试文件（AGENTS.md：普通 UI / 样式改动不新增测试）；在既有架构守卫里加一条不变量断言。
- 不改 `packages/app` 的类型与数据（`WeaponPerkCandidate` / `WeaponOwnedPerkCandidate` 原样）。

## 五、落地清单

| 位置 | 改动 |
|---|---|
| `packages/ui/src/item-detail/weapon/WeaponPerkEntry.tsx`（新） | 共用条目：圆形图标 + 名称 + 状态行 + 蓝点/绿勾/待提交标记 + 说明浮层；`normalizeRecommendationIconUrl` 一并搬进来（本来只服务这一个组件） |
| `packages/ui/src/item-detail/weapon/WeaponDetailContent.tsx` | 删除本地 `RecommendationPerkIcon`；`PerkColumn` 改渲染 `WeaponPerkEntry`（状态词按 3.2 映射，`contextLabel` 取所在区块名：当前配置 / 固有能力 / 完整掉落池 / 异域配置候选）；`RecommendationSlotComparison` 两列改用同一组件，传参与今天一致 |
| `packages/ui/src/styles/components/09-weapon-detail.css` | 删除 `.weapon-detail-perk` 的格子几何与横幅规则（保留 `-column` 部分）；`weapon-detail-recommendation-perk*` → `weapon-detail-perk-entry*`、`-perks` → `-entries`；宽度约束移到 `-entries > -entry`；新增 `[data-pending="true"]`（边框 + 状态行文字用 pending 色，不铺底）；第 125 行共享规则里的 `.weapon-detail-perk p` 改为新类名 |
| `packages/desktop/test/architecture-maintenance.test.ts` | 新增守卫「条目外观只许在一个组件里造」：详情页不得出现条目类名、必须 ≥2 处调用 `<WeaponPerkEntry`；两个标记文件里出现的**每个** `weapon-detail-*` 类名都要在 `packages/ui/src/styles` 里查得到（改名只改一半会红）；样式里不得再有 `weapon-detail-recommendation-perk` 字样与裸 `.weapon-detail-perk` 规则；条目宽度规则必须挂在列表上 |
| `docs/work/references/ui-specs/equipment-details.md` | 补一句：本件 Roll / 固有能力 / 完整掉落池与推荐对照共用同一条目（图标 + 常驻名称 + 短状态），说明在浮层里 |
| `docs/development.md` | 新增不变量：同一种小卡片只许有一个组件（T69） |
| `docs/todo.md` | 增加 T69 行 |

## 六、验证记录

### 6.1 落地对账（与第五节逐条对照）

| 位置 | 实际改动 |
|---|---|
| `packages/ui/src/item-detail/weapon/WeaponPerkEntry.tsx`（新，约 120 行） | 共用条目：36 圆图标（`◆` 占位、`object-fit: cover`）+ 名称一行省略号 + 短状态行 + 绿勾 / 蓝点 + 浮层（中英文名称、官方说明、来源身份与完整状态）；外层 `data-hit / -active / -muted / -unknown / -pending / -action / -open` 七个状态位；`normalizePerkIconUrl()` 一并搬入 |
| `packages/ui/src/item-detail/weapon/WeaponDetailContent.tsx` | 删除本地 `RecommendationPerkIcon` 与旧 `normalizeRecommendationIconUrl`；`PerkColumn` 改渲染 `WeaponPerkEntry`（状态词按 3.2 映射）；4 处 Roll 调用点补 `contextLabel`（固有能力 / 当前配置 / 完整掉落池 / 异域配置候选）；3 处推荐调用点改用同一组件，传参与今天一致 |
| `packages/ui/src/styles/components/09-weapon-detail.css` | 删除 11 条旧 `.weapon-detail-perk` 几何 / 横幅 / 选中规则，保留 `-column` 三列规则；52 处类名改中性；宽度约束移到 `.weapon-detail-perk-entries > .weapon-detail-perk-entry`；新增 `[data-action="true"]` 指针与两条 `[data-pending="true"]`（边框 + 状态行文字，不铺底） |
| `packages/desktop/test/architecture-maintenance.test.ts` | 新增守卫「条目外观只许在一个组件里造」（见 6.3） |
| `docs/work/references/ui-specs/equipment-details.md` | 武器规则新增一条：四处共用同一种 Perk 条目，说明与来源身份只在浮层里 |
| `docs/development.md` | 2.5 新增第 9 条不变量：同一个视觉对象只保留一个实现组件；宽度属于列表 |
| `docs/todo.md` | 新增 T69 行 |

**收尾时发现并修掉的漏改**：3.4 的机械改名漏了标记那一侧——CSS 已改叫 `weapon-detail-perk-entries`，
但 `WeaponDetailContent.tsx` 里三处推荐列表容器还写着 `weapon-detail-recommendation-perks`。
后果不是报错，而是这 3 个列表**静默失去**整段列表样式（`display: flex`、`gap: 7px`、`min-height: 50px`），
条目会退回块级堆叠——正是「改名只改一半」的典型。已改齐，并由 6.3 的守卫按整条 `weapon-detail-*`
前缀兜住这一类（第一版守卫只扫 `weapon-detail-perk` 前缀，**抓不到这个 bug**，改坏表 M1 就是照着它写的）。

### 6.2 实测对照（真实样式表 + 无头 Chromium 1680×900、compact 密度）

方法：把**真实组件**（`WeaponPerkEntry`）与**真实样式表**（`packages/ui/src/styles.css`）装进一个临时 vite 页，
标记结构照抄产品（`.weapon-detail-source-slot > header + .weapon-detail-source-slot-comparison > section`），
用 `getBoundingClientRect` / `getComputedStyle` 读数值。脚本与页面在 `.local-data/tmp/`，验证完已删除。

改动后（同一测法）：

| 项目 | 本件 Roll / 固有能力 / 完整掉落池 | 推荐对照（3 条 / 544 列） | 推荐对照（2 条 / 544 列） |
|---|---|---|---|
| 容器 | `.weapon-detail-perk-column > div`，`display: grid`，gap 6px | `.weapon-detail-perk-entries`，`display: flex`，gap 7px，min-height 50 | 同左 |
| 格子 | 272.5×50 | 169.7×50 | 220×50（上限生效） |
| 圆角 / 内边距 | 4px / `5px 9px 5px 6px` | 同 | 同 |
| 图标 | 36×36，radius 50% | 同 | 同 |
| 名称 / 状态字号 | 12px 700 一行省略号 / 12px | 同 | 同 |
| 行内说明 | 无（在浮层里） | 无 | 无 |

- 改动前本件 Roll 实测 300×84.4（说明写在格子里、格顶满宽横幅、38 方形图标），现在 272.5×50，
  与推荐区那条**逐项同形**；推荐区自身的三个宽度值与几何**未变**（`min-width: 132 / max-width: 220 /
  flex: 1 1 148` 三个计算值仍在，只是约束挪到了列表上）。
- 状态与交互（同一次实测）：可切换格子 `cursor: pointer` / `aria-pressed="false"`；已选与待应用格子
  `aria-pressed="true"`；只读格子 `cursor: help` / `aria-expanded="false"`；悬停任一格子浮层
  `visibility: visible`、304×146；点只读格子 `data-open="true"`（展开），点可切换格子不展开
  （点击仍是换 Perk，交给调用方）；`data-action="true"` 只出现在可切换格子上；旧类名残留计数 0。
- 「下区点击＝看说明不变」是对着改动前的实现核过的：改动前的 `RecommendationPerkIcon` 就是
  `<button aria-expanded={open} onClick={() => setOpen(v => !v)}>`（`git show HEAD:…WeaponDetailContent.tsx`），
  新组件在只读分支上一字不差地保留了这套属性。

### 6.3 定向改坏表（每条都必须让守卫变红，改完全部还原并核对 SHA-256）

守卫：`packages/desktop/test/architecture-maintenance.test.ts` → 「builds perk entries in one component…」。

| # | 改坏什么 | 结果 | 断言信息 |
|---|---|---|---|
| M0 | 不改（基线） | 绿 | — |
| M1 | 标记里把一个列表容器类名改回 `weapon-detail-recommendation-perks` | 红 | `WeaponDetailContent.tsx 里这些类名在样式里不存在：weapon-detail-recommendation-perks` |
| M2 | 条目组件把 `-hit` 改成 `-mark`（样式不动） | 红 | `WeaponPerkEntry.tsx 里这些类名在样式里不存在：weapon-detail-perk-entry-mark` |
| M3 | 列表宽度规则删掉 `max-width: 220px` | 红 | `列表没有约束条目宽度` |
| M4 | 在详情页里手搓一个 `weapon-detail-perk-entry` | 红 | `expected '…' not to contain 'weapon-detail-perk-entry'` |
| M5 | 样式里重新出现裸 `.weapon-detail-perk` 规则 | 红 | `expected '…' not to match /\.weapon-detail-perk(?![\w-])/` |
| M6 | 四处复用删到只剩一处 | 红 | `expected 1 to be greater than or equal to 2` |

还原核对（三次改动文件的 SHA-256 前 16 位，改坏前＝改完后）：

| 文件 | 改坏前 | 全部还原后 |
|---|---|---|
| `WeaponDetailContent.tsx` | `a3b017a33be5448a` | `a3b017a33be5448a` |
| `WeaponPerkEntry.tsx` | `3087c25bc71a2ef3` | `3087c25bc71a2ef3` |
| `09-weapon-detail.css` | `21baacfcf57fd3bb` | `21baacfcf57fd3bb` |

### 6.4 闸门

| 闸门 | 结果 |
|---|---|
| `pnpm check`（docs:check + `git diff --check`） | 通过 |
| `pnpm test:architecture` | 通过（15 文件 / 84 用例，含新守卫） |
| `pnpm test:behavior` | 通过（147 文件 / 633 用例） |
| `pnpm test:quality`（分层 / exports / UI 合同 / 许可证） | 通过（行为 147 + 架构 15；「没有架构白名单之外的源码字符串测试」） |
| `pnpm ci:local`（frozen install → 完整测试门禁 → 构建后全量类型检查 → Shell 视觉契约） | 通过（退出码 0；行为 633 + 架构 84；类型检查 7/7；Shell 视觉契约扫 4 个状态） |

**闸门实况**：`pnpm ci:local` 一次跑完，最后一行「本地 CI 门禁全部通过」。
冻结安装与构建后的全量 `typecheck:ci`（core / http / services / app / ui / desktop / web）全绿，
Shell 视觉契约用构建产物在真实窗口里复验 4 个状态。

### 6.5 如实记录（本次验证覆盖不到的地方）

- **没有在本机实窗里跑武器详情**：本机账号数据里没有「已完成 Perk 配置的传说武器 + 推荐来源命中」
  这种组合，`selection_columns` / `pool_columns` 在预览 fixtures 里也不生成，因此这条路径的几何是
  用「真实组件 + 真实样式表 + 照抄的标记结构」的临时页量出来的，不是从实窗截屏量的。
  实窗请用户按第八节复验——特别是「完整掉落池」展开后的列宽。
- **触屏限制照旧**：可切换的格子点击＝换 Perk，浮层只能靠悬停 / 键盘打开，触屏上打不开说明。
  这是改动前就有的限制（本次不动换 Perk），换 Perk 重构时一并解决。
- **`unresolved_in_definition_pool` 仍未接**（第四节）：条目已有 `data-unknown` 槽位，接线只要一行，
  但没有数据落点证明它当前该显示什么，故单列待办。
- 守卫的类名扫描是**文本包含**判断（`styles.includes("." + token)`），判断不了「这条规则是否真的作用于
  该元素」；它挡的是改名残留与手搓回流，不替代实测。

## 七、验收判据

1. 武器详情里「本件 Roll」「固有能力」「完整掉落池」（含异域配置候选）的每个条目，与推荐判断区
   的「来源要求 / 本件拥有」条目**同形**：圆形图标、名称一行省略号、名称下一行短状态、无行内说明。
2. 说明：悬停或键盘聚焦（Tab 到条目）浮层出现，Escape / 点外部关闭；浮层里有名称与官方说明。
3. 「当前已选 / 待应用 / 本件拥有 · 可切换」等状态仍在，并且**不再靠整格底色**表达：
   当前已选＝蓝点 + 文字，待应用＝pending 色边框与文字。
4. 换 Perk 的行为与改动前一致：能切换的格子点击仍进入待提交、写入面板仍照旧。
5. 完整掉落池的条目点击能打开说明（今天点击无反应）。
6. 推荐判断区（来源要求 / 本件拥有）的排布与几何**逐项不变**（只是换了类名与组件归属）。
7. 五道闸门全绿。

## 八、请用户复验

在 dev 窗口里进武器详情（改动全在 `packages/ui/src` 与 `packages/desktop/src/renderer`，
Vite 别名直读源码、热更；2026-09-18 更正原来的「重新打包后」）：

- 看「当前配置」那几栏（枪管 / 弹匣 / Perk 1 / Perk 2 / 起源特性）：每个 Perk 应该是小方块——
  圆形图标 + 一行名称 + 一行状态，说明不再挤在格子里；鼠标停上去（或 Tab 到它）出说明浮层。
- 点「查看完整掉落池」：里面的条目应该和上面同形，点击能看说明。
- 换 Perk（点一个「本件拥有 · 可切换」的项 → 底部出现待提交 → 应用）与以前一样。
- 往下看推荐判断区：样子应该和上面统一了，位置和宽窄跟以前一样。
