# T70：Perk 卡片三处收尾（首屏固有能力、占位几何、当前已选的辨识度）

> 状态：🟢 代码已改并自验通过（2026-09-17），待用户实窗复验
> 后续：用户实窗复验时又报了「第一次打开就白屏」「一直在闪」，根因是 3.1 第一版拿整份详情的读取入口去补定义；
> 已按用户口径「打开详情不用读完整掉落，完整 Roll 等点按钮再请求」改成后台只补定义，见**第九节**。
> 来源：T69 统一样式之后，用户在本机实窗打开「本件 Roll」截图报的三个问题——「1.第一次打开的时候框架未显示
> 2.样式错位了 3.当前启用perk样式未做区分不好分辨」。先只做分析、逐条与用户对齐后开工。
> 用户确认：1 是（虚线「未返回固有能力」就是「框架未显示」）、2 是（占位比卡片高就是「错位」）、
> 3「你来判断」（用哪一档强度由我定，见第二节）。

## 一、三个问题的事实（都已定位到代码，不是感觉）

**1. 首屏「固有能力」格是终态空文案，等不来内容。**

- 「固有能力」这一格的候选只可能来自**武器定义**（`buildWeaponDetailView.ts:91`：从定义分类结果里取
  `role === "intrinsic"` 的第一项）。
- 但账号实例首屏**不会**自动读定义：`useItemDetail.ts:171-172`
  （`shouldAutoLoadDefinition = needsDefinitionDetail && (!instanceId || preview.group_key === "armor")`），
  武器实例被排除在外——首屏 Roll 用账号快照直接画，这是规格要的（`equipment-details.md:77`：
  「账号快照已经提供 `weapon_roll` 时，详情首屏必须直接显示其中已确认的当前启用与实例拥有项……
  不得让已有 Roll 等待第二次账号请求」）。
- 定义读没读、有没有请求过，界面分不出来：`WeaponDetailContent.tsx:686-690` 只判断
  `configuration.intrinsic` 有没有值、`isDefinitionLoading` 是不是真，两者都不是就画
  **终态**文案「未返回固有能力」（`.weapon-detail-intrinsic-empty`，虚线框 64 高）。
  于是首屏永远显示这句，一直等到用户点「查看完整掉落池」（那条路才会调 `loadConfiguration`）。
- 这正是规格禁止的（`equipment-details.md:81`：「未完成的可选数据不得显示『未返回』『没有可切换项』
  等终态文案」）。T69 之前格子 84.4 高、这句空文案只有 64 高，不显眼；T69 把格子压到 50 高之后，
  它比旁边的卡片还高，就成了用户看到的「框架未显示 + 错位」。

**2. 同一个格子在页面里有三套几何，T69 只统一了其中一套。**

| 实现 | 用什么画 | 盒子几何（实测/现行 CSS） |
|---|---|---|
| Perk 条目（T69 已统一） | `WeaponPerkEntry` | min-height 50、`padding 5px 9px 5px 6px`、圆角 4、图标 36 圆 |
| 固有能力空态 | `.weapon-detail-intrinsic-empty`（`:363`） | min-height 64、padding 10、虚线 |
| 配置加载骨架 | `.weapon-detail-config-placeholder-column`（`:352-359`） | min-height 66、padding 8、图标 38 方形、圆角 6（`--radius-object`） |

后两套是 T69 之前的老几何（`git diff` 可证 T69 一行未动它们），且骨架列的表头是
`<span>` 假条（16 高 + 7 外边距），与真表头 `<h4>`（14px 字号的行盒 + 7 外边距）也不等高。
结果：同一列里，加载/空态出现时卡片会跳高 14–16px、图标形状与圆角也对不上。

**3. 「当前已选」丢掉了整页通用的选中语义，只剩一个小点。**

- T69 把「当前」从「整格换底 + 换边框 + 格顶满宽横幅」改成了「名称后蓝点 + 状态行文字」，
  按的是推荐对照区的写法（`.weapon-detail-perk-entry-active`：10×10、`left: 32px; bottom: 4px`、
  `background: var(--selected-border)` = #557288），状态文字用 `--selected-fg`（#f2f6f8）。
- 但推荐对照区里「当前」只是辅助信息（主信号是绿色命中条），本件 Roll 里它是**唯一**要表达的状态：
  同一列两张卡片，边框、底色、图标、名称一模一样，只有右下角一个 10px 的灰蓝点、
  和一行 12px 的字（(242,246,248) 对 (145,161,174)）不同——实测下来确实难分。
- 规格对这两处的要求本来就不同：`equipment-details.md:93` 给推荐区定的是「蓝点 + 当前文字」、
  中性表面；`:102` 给配置区定的是「当前选中 Perk 使用蓝色选中语义」。T69 把两处并成一套时，
  把配置区那条规格一起并掉了。

## 二、用户已定的口径 + 第 3 条我的判断

1. 三条都改，仍**只改样式与加载呈现**；换 Perk 的交互（可点范围、待提交、写入面板、数据层、
   服务层）一字不动。
2. 沿用 T69 的做法：一处实现，不在详情页里再抄第二份盒子几何。
3. **第 3 条（我的判断）：本件 Roll 的「当前已选」恢复成整页通用的蓝色选中语义——
   选中底 + 选中边框 + 左缘 3px 实色条（结构信号），蓝点与状态文字保留并加粗**；
   推荐对照区**维持**「蓝点 + 当前文字、中性表面」不变。

   理由：

   - 规格就是这么分的（`:102` 配置区=蓝色选中语义；`:93` 推荐区=蓝点+文字），T69 统一外形时
     把这条语义差异一起抹了，属于统一过头。
   - 左缘条是本页表达状态的主信号位（命中=绿条），「当前」用同位置、同宽度的蓝条＝同一种语言，
     换的是颜色含义；且它是**结构**信号，不违反「不得只靠颜色表达状态」。
   - 选中底用整页同名的 `--state-selected-*`（深色 #203445 / 浅色 #dbeaf2），不是规格点名禁止的
     薄荷绿或灰粉红大片铺底；一格最大 220 宽，也不是「铺满整行」。
   - 与「待应用」分得清：待应用走 `--status-pending`（亮蓝 #8cc7ef，边框 + 文字），
     当前已选走 `--selected-*`（灰蓝 #557288 + 深蓝底），一个是「还没写入」的亮蓝，一个是「已经装上」的沉蓝。
   - 两处状态语义不同，就在共用组件上用一个显式入参分开（`emphasis`），而不是让同名字段在两地
     各长一样——这样组件仍只有一份实现，调用方只声明「这一处按哪条规格」。

   如果实窗复验下来仍觉得不够，升级路径是只加一行：整格底换成更实的混色或把左条加宽到 4px；
   本轮先按上表做，不再往上加。

## 三、改法

### 3.1 首屏固有能力：按需读定义，读的过程画骨架、读完没有才是终态

`useItemDetail` 新增 `loadSelectedItemDefinition`（**后台补读**，见第九节；第一版用的是整份详情的读取入口，
导致白屏与闪烁，已改），`WeaponDetailContent.tsx` 的 `ConfigurationSection`：

- 新增判断 `definitionPending`（账号实例 + `kind !== "random_roll" || 没有 configuration.intrinsic`
  + 调用方还给着 `actions.loadDefinition`）。
- `useEffect` 里对同一个武器只触发一次 `actions.loadDefinition()`，本地 settle/fail 状态
  （`idle → pending → done | failed`）：`failed` 不再自动重试，`done` 之后不再重发。
- 渲染分支改成：有固有能力→条目；待触发/正在读→加载骨架；读完确实没有→「未返回固有能力」；
  这一次没读回来→「固有能力未能读取」（两种文案必须分得开，见第九节）。
- 首屏不阻塞：账号快照已有的那几列照旧立刻画，只有固有能力这一格先骨架后填。

### 3.2 占位与骨架共用条目盒子（几何只有一处）

`WeaponPerkEntry.tsx`：新增 `WeaponPerkPlaceholder`（同文件，两种形态）——

- `variant="loading"`：骨架（圆形图标位 + 两行灰条），带 `aria-busy`，对读屏隐藏；
- `variant="empty"`：一句话文案。

两者都渲染 `.weapon-detail-perk-entry` 外壳 + **同一个盒子类**
`.weapon-detail-perk-entry-box`；条目自己的 `<button>` 也挂这个类。
`09-weapon-detail.css` 把盒子几何（grid 两列、min-height 50、`padding 5px 9px 5px 6px`、边框圆角、
底色）从 `.weapon-detail-perk-entry > button` 挪到 `.weapon-detail-perk-entry-box`，
`> button` 只留行为（指针、hover、focus-visible）。

骨架列改成复用真表头：`ConfigurationLoadingColumn` 渲染
`section.weapon-detail-perk-column` + `<h4><span class="…-bar"/></h4>`（条形画在 h4 的行盒里，
表头高度与真列逐像素相同）+ 一个 `WeaponPerkPlaceholder variant="loading"`。
删掉 `.weapon-detail-config-placeholder-column*` 与 `.weapon-detail-intrinsic-empty` 两段 CSS。

### 3.3 当前已选（见第二节第 3 条）

`WeaponPerkEntry` 新增入参 `emphasis?: "marker" | "selected"`（默认 `marker`）；
4 处 Roll 调用点（固有能力 / 当前配置 / 完整掉落池 / 异域配置候选）传 `selected`，
3 处推荐调用点不传（维持现状）。`emphasis="selected"` 时外层加 `data-emphasis="selected"`：

- `[data-emphasis="selected"][data-active="true"] > button`：`border-color: var(--state-selected-border)`、
  `background: var(--state-selected-bg)`、`box-shadow: inset 3px 0 0 var(--state-selected-border)`；
- 状态文字 `font-weight: 700`（颜色仍是 `--selected-fg`）；
- 与命中同格时（推荐区不会出现，仅作兜底）：`[data-hit="true"]` 的绿条与绿底照旧优先。

## 四、明确不做

- 不动换 Perk 交互、写入流程、IPC、服务层与任何数据模型（用户已说明之后单独重构）。
- **不改账号快照的插槽分类**：`AccountWeaponRollSlot`（`core/src/account/summary.ts:209`）只有
  barrel/magazine/masterwork/perk1/perk2/origin/other，固有能力落在 `other`（`unclassified_socket`）。
  想让首屏零请求拿到固有能力，就得动 core 的分类契约与推荐匹配（T56 范围）。本轮不碰：
  固有能力这一格的定义读取本来就在首屏的必读路径上，按需补读一次是它能拿到内容的唯一来源。
- 不在推荐对照区加左条/加底色（规格 `:93` 那套保持不变）。
- 不新增测试文件（AGENTS.md）；在既有架构守卫里补两条断言（见 5）。
- 不动 `--status-pending` 与「待应用」的现有表达。

## 五、落地清单

| 位置 | 改动 |
|---|---|
| `packages/ui/src/item-detail/weapon/WeaponPerkEntry.tsx` | 新增 `WeaponPerkPlaceholder`（loading / empty 两形态，共用盒子类）；条目 `<button>` 挂 `.weapon-detail-perk-entry-box`；新增 `emphasis` 入参 → `data-emphasis` |
| `packages/ui/src/item-detail/weapon/WeaponDetailContent.tsx` | 4 处 Roll 调用点传 `emphasis="selected"`；固有能力分支改为「有→条目 / 在读或待触发→骨架 / 读完没有→空态」＋只触发一次的按需读定义 effect；`ConfigurationLoadingColumn` 改用真列外壳 + 骨架条目；`ConfigurationLoadingGrid` 相应调整 |
| `packages/ui/src/styles/components/09-weapon-detail.css` | 盒子几何移到 `.weapon-detail-perk-entry-box`（`.weapon-detail-perk-entry > button, .weapon-detail-perk-entry-box`）；新增骨架条与 `[data-emphasis="selected"]` 选中表达；删除 `.weapon-detail-config-placeholder-column*`、`.weapon-detail-intrinsic-empty` |
| `packages/desktop/test/architecture-maintenance.test.ts` | 既有守卫补两条：详情页不得自建占位盒子（两个旧类名与盒子类名都不得出现在详情页）；样式里不得再有 `weapon-detail-config-placeholder-column` / `weapon-detail-intrinsic-empty` 规则 |
| `docs/work/references/ui-specs/equipment-details.md` | 补一句：占位与骨架也用同一条目盒子；本件 Roll 的「当前已选」按蓝色选中语义（选中底 + 选中边框 + 左缘条 + 蓝点） |
| `packages/desktop/src/renderer/shared/hooks/useItemDetail.ts` | 新增后台补读 `loadSelectedItemDefinition`（只读定义、不置加载态、单飞、失败不重试）＋ `mergeDefinitionWithoutLoadingState`（§9） |
| `packages/desktop/src/renderer/shared/components/ItemDetailModal.tsx` | 新增 `onLoadSelectedItemDefinition` → `actions.loadDefinition`（§9） |
| `packages/desktop/src/renderer/pages/HomePageItemDetailModal.tsx`、`.../hooks/useItemDetailWorkspace.ts` | 透传 `loadSelectedItemDefinition`（§9） |
| `docs/todo.md` | 增加 T70 行 |

## 六、验证记录

### 6.1 实测对照（不是看截图，是量盒子）

量法：无头 Chromium（Playwright）加载一份只挂**真组件 + 真样式表**的临时页面
（`.local-data/tmp/perk-proof/`，逐字复刻 `PerkColumn` / `ConfigurationLoadingColumn` /
`IntrinsicEmptyColumn` 的产出标记），用 `getBoundingClientRect()` 与 `getComputedStyle()` 读数；
明暗两套主题各量一遍（同时切 `html[data-theme]` 与 `.app-shell[data-color-mode]`，等 500ms 让
按钮 120ms 的 `background-color` 过渡落定，否则会量到中间色）。

| 对象 | 改前（旧 CSS 声明值 / 实测） | 改后（实测，dark / light 相同） |
|---|---|---|
| 空态占位盒子 | `min-height: 64`、`padding: 10`（`.weapon-detail-intrinsic-empty`）；无列名外壳 | 高 **50**、圆角 **4px**、`padding 5px 9px 5px 6px`、虚线边、`--surface-interactive` 底 |
| 骨架盒子 | `min-height: 66`、`padding: 8`、图标 **38 方形**、圆角 `--radius-object` | 高 **50**、圆角 **4px**、`padding 5px 9px 5px 6px`、实线边；图标位 **36 圆**（`border-radius: 50%`，实测 36×36 @ x=7,y=+7） |
| 骨架列表头 | 假条 `<span>`：高 16 + `margin-bottom: 7` | 真 `<h4>` 行盒里的 12 高条：列名高 **21**＝真列 21 |
| 六列盒子顶边 y | 空态列没有列名，内容从 y=0 起，比邻列高约一格 | `#grid-empty` 六列盒子顶边全部 **y=28**，列名高全部 **21** |
| 骨架列 vs 真列 | 列宽/表头/盒子都不同 | `#grid-loading` 五列盒子顶边全部 **y=162**，骨架列宽 235.2 ＝真列 235.2，表头 21 ＝ 21 |
| 本件 Roll「当前已选」（dark） | 与同栏其它项只差一个 10px 蓝点 + 一行 12px 文字 | 底 `rgb(32,52,69)`＝`--state-selected-bg`、边框 `rgb(85,114,136)`＝`--state-selected-border`、`inset 3px 0 0` 左缘条、蓝点在、状态文字 `font-weight: 700` |
| 本件 Roll「当前已选」（light） | 同上 | 底 `rgb(219,234,242)`＝`#dbeaf2`、边框 `rgb(80,120,142)`＝`#50788e`、同样 3px 左缘条 |
| 推荐对照区「当前」（未传 `emphasis`） | — | 无底色无左条，仍是 10×10 蓝点 + “当前”文字（`rgb(242,246,248)` / `rgb(19,35,45)`），与改动前一致 |

一处量法坑记下来：第一遍量到浅色按钮底是 `rgb(235,240,243)`、`rgb(216,231,239)` 两次数值不同，
查下来是按钮的 `background-color` 有 120ms 过渡、主题刚切完就读到的中间色；占位是 `<span>` 无过渡
所以立刻是新值。等 500ms 后两者都回到 `rgb(238,243,246)`＝`--surface-interactive`，不是样式不一致。

### 6.2 定向改坏表（每条都必须让守卫变红）

脚本 `.local-data/tmp/t70-mutate.py`；每条改坏 → 跑 `node scripts/run-test-set.mjs architecture`
→ 逐字节还原并核对 SHA-256。

改坏前三份源文件 SHA-256 前 16 位：`WeaponDetailContent.tsx` `e36b5d17e4f0806f`、
`WeaponPerkEntry.tsx` `72feae5f358ba4ba`、`09-weapon-detail.css` `d3768cdf767de5b5`
（守卫文件 `architecture-maintenance.test.ts` 收尾后 `285047869cfdb3ad`）。

| # | 改坏内容 | 结果 | 守卫报的错 |
|---|---|---|---|
| M7 | 空态列删掉 `<h4>固有能力</h4>` | 红 | 固有能力空态丢了列名，整格会比邻列高一格 |
| M8 | 空态改回手搓 `.weapon-detail-intrinsic-empty` div | 红 | 详情页用了样式里不存在的类名：weapon-detail-intrinsic-empty |
| M9 | CSS 里重新长出 `.weapon-detail-config-placeholder-column` 旧几何 | 红 | 样式里还留着旧的占位几何 |
| M10 | 盒子几何退回只写在 `.weapon-detail-perk-entry > button` 上 | 红 | 条目盒子几何（栅格、最小高度、内边距）必须定义在 `.weapon-detail-perk-entry-box` 上，占位与骨架才吃得到 |
| M11 | 当前已选去掉左缘实色条（只剩颜色） | 红 | 本件 Roll 的当前已选缺少结构信号（左缘实色条） |
| M12 | 完整掉落池那一列不传 `emphasis="selected"` | 红 | 有 Roll 列没打开选中表达（`emphasis="selected"` 计数 3 < 4） |
| M13 | 骨架图标位退回 38 方形 | 红 | 骨架图标位要与真图标同形（36 圆） |

7/7 变红；三份源文件还原后 SHA-256 与改坏前逐字节一致（脚本末行输出「全部逐字节还原」）。

过程中两处说明，免得后来人以为守卫一开始就能兜住：

- M10 第一次没杀掉：正则 `\.weapon-detail-perk-entry-box` 命中了 `-box-never` 这个子串，加 `(?![\w-])`
  才准；第二次仍没杀掉：`[^{]*` 从上一行的注释里跨行吃到了下一条规则的花括号，改成行内绑定
  `^[^\n{]*…[^\n{]*\{` 才准。两次都改了断言、没改产品代码。
- 首次跑 `pnpm test:architecture` 时守卫是真红：`@media (prefers-reduced-motion: reduce)` 块里还留着
  已删除的 `.weapon-detail-config-placeholder-column *` 选择器，已一并换成新的骨架类。也就是说这条
  守卫除了改坏表，还真的抓到了一次删样式删漏。

### 6.3 闸门

| 闸门 | 结果 |
|---|---|
| `pnpm typecheck:ui` | 通过 |
| `pnpm test:architecture` | 84 passed |
| `pnpm test:behavior` | 147 files / 633 tests passed |
| `pnpm check` | 通过（Encoding check passed.） |
| `pnpm test:quality` | 通过（含许可证同步 63 个应用依赖） |
| `pnpm ci:local` | 通过：架构测试集 15 files / 84 tests、共享 Shell 视觉契约 4 个状态、构建后全量类型检查（7 个包） |

### 6.4 如实记录（本轮没做 / 没证的）

- **没有在本机实窗跑过**：几何与颜色是上面那套「真组件 + 真样式表 + 无头 Chromium」量出来的，
  不是 Desktop 实窗截图；实窗（`light / dark × 1280 / 980 / 760`）按规矩留给用户复验。
- **无新测试文件**（AGENTS.md）：本轮只在既有架构守卫里补断言，且断言是文本包含式的静态检查，
  验证的是「谁吃到了几何 / 谁开了选中表达」，不是像素。
- **定义读取失败时的行为**（修复后）：后台补读失败只红字报一次，固有能力格显示
  「固有能力未能读取」，**不自动重试**、不会循环。重试入口是详情里显式的按钮（「查看完整掉落池」/
  「刷新」——它们走的是正片读取）。
- 触发按需读定义的 effect 用 state 去重，同一件武器只触发一次；切换当前选中武器时组件重建，
  会重新触发一次（符合首屏每次都要拿到固有能力的要求），没有做跨武器的请求缓存。


## 九、回归修复：打开详情不再读完整掉落（用户实窗报「白屏 + 一直在闪」之后）

### 9.1 症状与根因

用户实窗报两件事：「为什么第一次打开就会白屏，之前没有这个问题」「为什么一直在闪」。两者同一个根因：
第三节 3.1 的第一版把「补定义」接到了**整份详情的读取入口**上（`ItemDetailModal` 的 `loadConfiguration`
→ `useItemDetail.loadSelectedItemFullDetail`）。那条路会：

1. 置 `detail_loading = {definition: true, instance: true}`（`useItemDetail.ts:276-278`）；
2. `is_detail_loading = definition || instance`（`:509`），宿主 `HomePageItemDetailHost.tsx:109-113` 的
   `selectedItemReady` 因此为假，`ItemDetailModal.tsx:115/154` 把整份详情换成 `<SharedItemDetailLoading/>`
   ——就是用户截图里那块「武器档案 / 正在读取装备定义与实时状态…」；
3. 于是**打开详情**这一步就自动多等一次定义 + 一次 Bungie 实例往返（白屏），而用户要的只是「打开」；
4. 骨架挂载会卸载详情内容，`ConfigurationSection` 本地那个「已触发」的 state 随之清零；定义读回后若这一格
   仍判定为缺内容，就再次触发 → 读取失败或迟迟不返回时，就成了「一直在闪」。

用户口径：「打开详情不用读完整掉落啊。完整roll，等点击按钮再请求」。规格本来也是这么分的
（`equipment-details.md:77` 首屏不得等第二次请求；`:82` 局部更新不得把整份详情退回全屏 Loading）。

### 9.2 修法

`useItemDetail` 新增 `loadSelectedItemDefinition`（**后台补读**）：

- 只读 `api.getItemDetail(hash)`——**不读**完整实例 Roll（正文里没有 `loadAccountItemDetailCached`）；
- **不置** `detail_loading` / `is_detail_loading` / `itemDetailLoadingKey`：合并走
  `mergeDefinitionWithoutLoadingState`，把这两个加载态字段原样保留
  （`mergeSelectedItemDetail` 会把 `is_detail_loading` 置假，那是「正片读取」的语义）；
- 同一件物品单飞（`definitionRequestsRef` 存 in-flight Promise），scope / sequence 守卫照旧；
- 失败只 `appendItemDetailError` 一次，**不自动重试**；
- 接线：`ItemDetailModal.tsx` 新增 `onLoadSelectedItemDefinition` → `actions.loadDefinition`
  （定义已加载时不传），`HomePageItemDetailModal.tsx` 与 `useItemDetailWorkspace.ts` 透传；
  `WeaponDetailContent` 的触发条件从 `loadConfiguration` 换成 `loadDefinition`；
  「查看完整掉落池」按钮仍走 `loadConfiguration`（正片读取），一字未动。

固有能力这一格多了一档文案：「未返回固有能力」= 定义真的读完了、确实没有；
「固有能力未能读取」= 这一次没读回来（后面跟着详情顶部的红字）。两者混用会让用户以为这件武器没有固有能力。

### 9.3 实测（真 hook + 真 `buildWeaponDetailView` + 真 `WeaponDetailContent` + 照抄宿主门控）

临时脚本（用后即删，见 §6.4 的「无新测试文件」口径）。`整屏骨架`＝宿主把整份详情换成全屏骨架的次数，
就是用户眼里的白屏 / 闪。两条「改坏对照」把 `loadDefinition` 接回整份详情的读取入口（＝修复前的接线），
用同一套 harness 量：

| 场景 | 定义读取 | 实例读取 | 整屏骨架 |
|---|---|---|---|
| 现状·打开详情 | 1 | 0 | 1（开框首帧；真实点开时 openItemDetail 的状态与弹窗开关同一次提交，不先画骨架） |
| 现状·定义读回但没有固有能力 | 1 | 0 | 1 |
| 现状·定义读取失败 | 1 | 0 | 1（停在「固有能力未能读取」+ 一条红字） |
| 现状·点「查看完整掉落池」（定义没读到时） | 3 | 1 | 2（正片读取，用户主动发起） |
| 改坏·打开详情（定义读取成功） | 1 | 1 | 2（打开就被顶回全屏骨架＝白屏） |
| 改坏·定义读取失败 | 12 | 1 | 13（1.5 秒内＝「一直在闪」） |

「现状·点完整掉落池」那 3 次定义读取＝打开时后台补读 1 ＋ 按按钮的正片读取里的定义 1 ＋ 正片读取把内容
换回骨架后内容重挂载、又补读 1；次数有界，不是循环（正片读取成功时定义已到位，第三次不会发生）。

顺带记一条**与本轮无关的既有行为**：点「查看完整掉落池」走正片读取，也会把整份详情换成全屏骨架一瞬
（T70 之前就是这样，用户要的也是「点了按钮才请求」）。实窗上若觉得这一下刺眼，另开一条收敛。

### 9.4 定向改坏表（每条都必须让守卫变红）

脚本 `.local-data/tmp/t70b-mutate.py`；改坏 → `node scripts/run-test-set.mjs architecture` → 逐字节还原并核对 SHA-256。

改坏前三份源文件 SHA-256 前 16 位：`useItemDetail.ts` `301ace711de03ba1`、
`WeaponDetailContent.tsx` `8c8d3bdf7db49c1e`、`ItemDetailModal.tsx` `c07285f3748bcafa`。

| # | 改坏内容 | 结果 | 守卫报的错 |
|---|---|---|---|
| M14 | 后台补读定义顺手置了详情加载键 | 红 | 后台补读定义改了详情加载态：setItemDetailLoadingKey |
| M15 | 后台补读定义顺手读了完整实例 Roll | 红 | 后台补读定义顺手读了完整实例 Roll |
| M16 | 触发条件又接回 `loadConfiguration` | 红 | 按需读定义又接回了整份详情的读取入口 |
| M17 | 固有能力空态 `variant` 从 empty 改成 loading | 红 | 固有能力空态丢了列名，整格会比邻列高一格 |
| M18 | 详情弹框把 `loadDefinition` 接回整份详情的读取入口 | 红 | 详情页的按需读定义接回了整份详情的读取入口 |
| M19 | 固有能力空态丢掉列名（回到裸 div 的错位写法） | 红 | 同上（列名断言） |

6/6 变红；三份源文件还原后 SHA-256 与改坏前逐字节一致。

**没有兜住的方向（如实记）**：这几条守卫是「正文里不许出现某个字符串」式的静态检查，挡得住「顺手多读、
多置状态、接线接错」，挡不住「把本来该有的保护删掉」。所以 §9.3 那两条改坏对照（同一个 harness 量到
12 次定义读取 / 13 次整屏骨架）才是「修复真的生效」的证据。

### 9.5 本次修复后的闸门

| 闸门 | 结果 |
|---|---|
| `pnpm -r typecheck` | 通过（7 个包） |
| `pnpm test:architecture` | 84 passed（含 §9.4 的六条断言） |
| `pnpm test:behavior` | 147 files / 633 tests passed（临时脚本已删，与 §6.3 同数） |
| `pnpm check` | 通过（Encoding check passed.） |
| `pnpm test:quality` | 通过（UI 合同检查通过；许可证同步 63 个应用依赖） |
| `pnpm ci:local` | 通过（架构 15 files / 84 tests、共享 Shell 视觉契约 4 个状态、构建后全量类型检查） |

**构建这件事要分两半说**（2026-09-18 更正，原话把两边混在了一起）：

- **测试与打包**消费的是 `packages/ui/dist`（`tsc` 产物，见 `packages/ui/package.json` 的 `exports`），
  跑 `pnpm test:*` 或走打包流程之前必须先 `pnpm build`。
- **实窗（dev 窗口）不需要为了 `packages/ui/src` 与 `packages/desktop/src/renderer` 重新构建**：
  `packages/desktop/vite.config.ts` 把 `@d2-tools/ui` 别名到 `../ui/src/index.ts`，渲染层直读源码、热更。
  本轮改的正是这两处，所以复验只需刷新 dev 窗口。
- 反过来，改动一旦落在 `core` / `http` / `services` / `app` / desktop `main` / `preload`，
  **必须重启 `tools/mac-dev-desktop.command`**：`scripts/dev-desktop.mjs` 只按 mtime 增量构建这六个产物，
  启动时算一次，跑起来之后不会自己重算。

## 七、验收判据

1. 打开一件账号里的武器，首屏「固有能力」格**不再**显示「未返回固有能力」：先是骨架，
   随后出现框架（如「精密框架」）；只有定义读回来确实没有这一栏时才显示那句空文案。
2. 「固有能力」空态/骨架与 Perk 卡片**同高同宽同圆角同内边距**（实测：都是 50 高、4px 圆角、
   `5px 9px 5px 6px` 内边距），骨架图标是 36 圆不是 38 方；加载态列的表头高度与真列一致，卡片不跳位。
3. 「当前已选」在本件 Roll 里一眼可辨：整格有选中底与选中边框、左缘有 3px 蓝灰实色条，
   蓝点与加粗状态文字仍在；推荐对照区的「当前」**保持原样**（只有蓝点 + 文字、无底色无左条）。
4. 换 Perk 行为与改动前一致；「待应用」表达不变。
5. 五道闸门全绿；架构守卫的新断言能被打坏（§6.2、§9.4）。
6. （§9 修复）打开武器详情**不再出现整屏「武器档案 / 正在读取装备定义与实时状态…」**，
   打开这一步的请求数只有 1 次定义读取、0 次完整实例 Roll；「固有能力」那一格在页面内先骨架后填。
7. （§9 修复）后台补读失败时：只报一次红字、停在「固有能力未能读取」，**不自动重试、不闪烁**；
   点「查看完整掉落池」才去读完整 Roll（此时允许出现一次整屏加载，那是用户主动发起的正片读取）。

## 八、请用户复验

在 dev 窗口里进武器详情（改动全在 `packages/ui/src` 与 `packages/desktop/src/renderer`，热更；见 §9.5）：

- 首屏别动鼠标，看「固有能力」那一格：应该先是个灰条骨架，然后变成框架条目；不该出现
  「未返回固有能力」的虚线框（除非这件武器确实没有固有能力）。
- 看「当前配置」每栏的当前项：应该有蓝色选中底 + 蓝灰左缘条 + 右下蓝点，和同栏其它项一眼分得开。
- 点开「查看完整掉落池」，里面的当前项同样处理；往下推荐对照区里的「当前」应该还是只有蓝点 + 文字。
- 换 Perk（选一个「本件拥有 · 可切换」→ 应用）流程与以前一样。
- （本轮修复）打开武器详情时不要动鼠标：窗口不该先整屏白一下再出现内容，也不该内容与骨架来回切换；
  重复开关几次同一件武器，每次都应立刻出内容，「固有能力」那一格在页面内先骨架后填。
- （本轮修复）如果当时 Bungie 那边读不到（限流 / 断网）：「固有能力」那格应显示「固有能力未能读取」并
  在详情顶部给一条红字，然后**停住**（不再反复请求）；点「查看完整掉落池」是重新读取的入口。
- （2026-09-18，见第十节）换 Perk 点「应用」之后的十几秒里，正文**不该再整屏变骨架**：内容留在原地，
  只在底部写面板上显示「正在同步最新配置 · 第 2/2 步」和「正在重新读取（n/6）…」。
  这十几秒里写面板上的选择、滚动位置、所在章节都应该还在。

## 十、第二处同类回归（2026-09-18）：换 Perk 后的「写回读」把整屏又换回骨架

用户实窗截图（打包版 v0.0.26）：换 Perk 点应用之后，整屏变成「武器档案 / 正在读取装备定义与实时状态…」。

**根因不是置位的人错了，是视图层把这个标志当成了内容闸门。** §9 修的是「补定义不许置加载态」——
挡住了那个入口，没挡住这一类。链路：

1. 点应用 → `ItemDetailModal.tsx:325-365` 的 `applyPendingPerks` → `onRunItemWriteAction(..., { keepDetailOpen: true, verifyRefreshedItem, … })`；
2. 主进程 `main/ipc/actions.ts:143-175` 的 `applySocketPlugs` **没有**回 `account_patch`（对比 `transfer` 在 `:185-190` 传了），
   所以 `useItemDetailWorkspace.ts:666-687`「接口受理即返回」那条近路走不到，落进 `:688` 的 `keepDetailOpen` 分支，
   调 `refreshItemDetailUntilVerified`（`:691-698`），重试延迟 `[0, 750, 1_500, 2_500, 4_000, 6_000]`（`:758`）——最多 6 次、累计约 14.75 秒；
3. 每次 `refreshSelectedItemDetail` 一进门就置 `{ instance: true }`（`useItemDetail.ts:397-399`），合成 `is_detail_loading: true`（`:555-563`）；
4. 宿主的就绪判断把它和闩锁**合取**在一起（`HomePageItemDetailHost.tsx:130` 的 `&& selectedItemReady`），
   于是 `isReady` 跟着它反复真假 → `ItemDetailModal.tsx:117` 的 `showReadyContent` 变假 → 整块正文换成 `<SharedItemDetailLoading/>`；
5. 每次读完都写回 `instance: false`，下一轮再置真 → **十几秒的反复闪**（不是永久白屏：`getItemKey` 取 `instance_id`，
   Perk 改了它不变，所以每次都还认得出是同一件、能重挂出来）；
6. 附带损伤：`pendingPerks` / `perkWriteFeedback` 是 `ItemDetailReadyContent` 的局部 state（`:187-188`），
   组件一卸载就没了；滚动位置与所在章节也回到顶部。

同一条路还有第二个入口：`ItemDetailModal.tsx:370` 的「重新读取配置」也调 `onRefreshSelectedItemDetail`，
所以手动点它同样白一次。用户 2026-09-18 拍板口径 **乙**：手动那颗按钮也不要把内容收回去。

### 10.1 修法（改视图层的读法，不改数据层）

数据层继续如实置位——它是实情，`application-workspaces.md:154` 也写着 `is_detail_loading` 是「两条关键请求的总忙碌状态」，
是**忙碌**不是**闸门**。改的是宿主：就绪只看那条**单调闩锁**，不与实时忙碌标志合取。

```ts
// HomePageItemDetailHost.tsx
isReady: readyRevision === command.revision   // 原来还 && 了 selectedItemReady
```

`readyRevision` 本来就是闩锁（`:115-119` 的 effect 只在「属这件装备的内容第一次可用」时记下 revision，之后只往前走）；
`selectedItemReady` 留着管**闩锁什么时候合上**。换装备时 `command.revision` 递增，闩锁重开、照旧等首帧，首屏行为不变。

忙碌的反馈不用新做：写面板本来就有这一档——`WeaponDetailContent.tsx:1044-1045` 的 `refreshing` 段渲染
「正在同步最新配置 · 第 2/2 步」+「正在重新读取（n/6）…」，`:822` 另有一颗「处理中」。三个调用点
（`ItemDetailModal.tsx:370`、`useItemDetailWorkspace.ts:692`、`:743`）在刷新前都会先写这句话，没有反馈空档。

`aria-busy` / `data-state="loading"` 照常输出（`SharedItemDetailDialog.tsx:121`、`WeaponDetailContent.tsx:231-232`），
但当前没有 CSS 消费 `.weapon-detail[data-state="loading"]`（扫过 `packages/ui/src/styles/`），所以不会顺带把内容调暗。

### 10.2 守卫（两头都钉）

`architecture-maintenance.test.ts` 新增 `keeps the item detail readiness gate latched so a background read cannot blank the screen`：
合取加回来会白屏（断言 `isReady` 取值不含 `selectedItemReady`），闩锁改成无条件前进会反过来——
第一次打开就画一份还没有内容的详情（断言合闩锁的 effect 里仍然有 `selectedItemReady` 守卫）。

`docs/development.md` 第 10 条补了一句分界：**「谁可以置位」和「置了位之后视图层拿它做什么」是两件事，
加载态是忙碌、不是能不能渲染**；写后读回与「已有内容之后的任何重新读取」都算后台读取。

### 10.3 闸门（**未跑**，复验前统一跑一次）

本轮只有一处产品代码改动（宿主一行），改动落地的直接证据还没取：`pnpm test:architecture` 未跑、
实窗未复验。守卫的正则已对着真实文件核对过（`isReady` 取值解析为 `readyRevision === command.revision`、
闩锁 effect 能被单独找到），但「守卫本身能跑绿、能被定向改坏」尚未执行。
**实窗复验不需要重新构建**（更正，理由同 §9.5）：本轮改的是 `packages/ui/src` 与
`packages/desktop/src/renderer`，两处都由 Vite 别名直读源码、热更。要跑测试或出打包产物才需要 `pnpm build`。

### 10.4 明确不改

- `useItemDetail` 一行不动：`refreshSelectedItemDetail` 继续如实置加载态。
- `is_detail_loading` 的字段语义（定义 ∥ 实例）与 `application-workspaces.md:154` 那句规格不动。
- `ItemDetailModal.tsx:151` 的 `isBusy` 继续消费 `is_detail_loading`——规格允许的用法。
- 「完整掉落池」那颗按钮的正片读取也走同一套规则，因此同样不再整屏白一次；它自己那一格本来就有
  pending 表达（§9.3 记过这一下刺眼，现在顺手没了）。
