# T71：武器详情三区重排（推荐 Roll → 本件 Roll → 完整掉落池）

> 状态：🟢 代码已改并自验通过（2026-09-17），待用户实窗复验
> 来源：用户实窗截图 + 「排版改一下，这三个区域分开，推荐roll放最上面，当前roll放中间，完整放下面」。
> 这一条**覆盖**了 `equipment-details.md` 原有的两条固定口径（章节顺序、首屏定位与挂载集合），见第四节。

## 一、改前事实（截图里三个红框为什么是「两块」）

| 事实 | 位置 |
|---|---|
| 章节 DOM 顺序是 当前配置 → 推荐 Roll → 属性与获取 → 升级与锻造 | `WeaponDetailContent.tsx:261-288` |
| 导航顺序同上，默认激活「当前配置」 | `sectionLabels`（`:69-74`）、`internalSection` 初值 |
| 首屏懒挂载集合只有 `configuration`，推荐章节先渲染占位块 | `mountedSections` 初值（`:88`）+ `DeferredWeaponSection`（`:272-277`） |
| 「查看完整掉落池」是 `configuration` 章节**内部**的一块，自带 `border-top` 分隔线 | `.weapon-detail-full-pool`（`:776-802`；CSS `:401`） |

所以用户看到的红框里，「本件 Roll」与「查看完整掉落池」属于同一个章节盒子，只有一条 1px 分隔线；
「推荐判断」在下面自成一块。三块要「分开」成三个区域，就必须把完整掉落池从配置章节里拆出来。

## 二、目标顺序

```
推荐 Roll（推荐判断 / 这件武器的推荐 Roll）
本件 Roll（当前配置，含换 Perk 与写面板）
完整掉落池（查看完整掉落池 / 异域配置候选）
属性与获取
升级与锻造
```

三块共用同一条 section 盒模型（`.weapon-detail-section`：`padding: 20px 18px 24px` +
`border-bottom: 1px solid var(--section-divider)`），**不新增第二套几何**——「分开」靠的是
「三个兄弟 section + 章节分隔线」，不是新样式。

## 三、落地清单

| 位置 | 改动 |
|---|---|
| `packages/ui/src/item-detail/weapon/WeaponDetailContent.tsx` | 章节 DOM 顺序改为 推荐 → 配置 → 完整掉落池 → 属性 → 升级；`sectionLabels` 同步；默认激活章节、`mountedSections` 初值、`observedSectionRef` 初值、切武器重置值一律改为 `recommendations`；完整掉落池拆成新组件 `FullPoolSection`，渲染在**自己的** `.weapon-detail-section` 里；`ConfigurationSection` 不再接收 `poolOpen` / `onRequestFullRoll` / `onTogglePool` |
| `packages/ui/src/styles/components/09-weapon-detail.css` | `.weapon-detail-full-pool` 去掉自带的 `border-top`（改由章节分隔线承担），按钮去掉只为「贴着网格」而设的 `margin-top` |
| `packages/desktop/test/architecture-maintenance.test.ts` | 新增顺序守卫：详情页里三个章节的渲染顺序必须是 推荐 → 配置 → 完整掉落池；`sectionLabels` 顺序一致；完整掉落池不得再出现在 `ConfigurationSection` 的返回里 |
| `docs/work/references/ui-specs/equipment-details.md` | 按新口径改写章节顺序与首屏挂载（第四节） |
| `docs/todo.md` | 增加 T71 行 |

## 四、被这一条覆盖的旧口径（不是悄悄改的，列出来）

1. `equipment-details.md:76` 原文：「章节顺序固定为『当前配置 → 推荐 Roll → 属性与获取 → 升级与锻造』，
   推荐 Roll 必须紧接本件 Roll，不得被属性或获取信息隔开」。新顺序是**推荐 Roll 在前**，
   「紧接本件 Roll」改为「与 本件 Roll 相邻」（中间只有完整掉落池按钮的前后关系，见下）。
2. 同条原文：「武器详情默认定位『当前配置』」。新排版下首屏第一区是推荐 Roll，默认定位随之改为推荐 Roll。
3. `:27` 原文：「武器 Ready 首屏只挂载身份、当前配置、本件 Roll 和实例操作。推荐、属性与获取、升级和 AI
   保留稳定章节占位」。推荐章节现在在首屏最上方，**必须首屏挂载**；随之而来的行为变化：
   **推荐证据的读取时机从「滚到附近 / 点导航」提前到「打开详情」**（`activateItemDetailSection` 由
   章节挂载触发，见 `useItemDetailWorkspace.ts:362-370`）。这不是新增请求，只是提前；属性与获取
   仍然只在滚到附近时读。
4. 与本轮用户另一条口径不冲突：完整 Roll 仍然只在点「查看完整掉落池」时才读，打开详情不读完整掉落
   （T70 §9）。

## 五、明确不做

- 不动换 Perk 交互、写入面板行为、IPC、服务层与任何数据模型。
- 不动「属性与获取」「升级与锻造」的内容与相对位置（仍在最后两位）。
- 不给完整掉落池新增标题/眉标文案：它自带「查看完整掉落池 · 展开 N 个候选」按钮，
  展开后的说明句也照旧；新增文案属于再造，不做。
- 不新增测试文件（AGENTS.md）：只在既有架构守卫里补断言。
- 不改 `docs/work/references/equipment-detail-and-knowledge-analysis.md` 里那份早期分析稿的章节编号
  （「1 当前配置 / 2 属性与获取 / 3 玩法推荐 …」）——它在 T71 之前就已经与 `equipment-details.md` 对不上，
  属于历史分析记录，这次不跟着漂。

## 六、验证

### 6.1 结构（真组件、真模型，jsdom）

临时脚手架（用后即删）用真 `buildWeaponDetailView` + 真 `WeaponDetailContent` 渲染一件账号武器的
首屏，直接读 DOM（`.local-data/tmp/t71-order/`）：

| 断言 | 实测 |
|---|---|
| 章节 DOM 顺序 | `recommendations → configuration → full-pool → overview → upgrades` |
| 章节导航顺序 | `推荐 Roll | 当前配置 | 属性与获取 | 升级与锻造` |
| 首屏激活页签 | 推荐 Roll |
| 完整掉落池在配置章节内部 | 否（`configSection.contains(poolSection) === false`） |
| 完整掉落池是章节容器第 3 个子节 | 是 |
| 池子按钮文案 | 「查看完整掉落池」（未改） |

### 6.2 几何（真 DOM + 真样式表 + 无头 Chromium）

把 6.1 渲染出的首屏 HTML 原样喂进无头 Chromium，链上真的 `packages/ui/src/styles.css`
（`@import` 递归内联），在 `1280×900` 与 `980×900`、`dark / light` 四种组合下量：

| 区域 | 顶边 | 高 | 内边距 | 下分隔线 |
|---|---|---|---|---|
| 推荐 Roll | 0.0 | 167.8 | 20/18/24/18 | 1px |
| 本件 Roll | 167.8 | 187.8 | 20/18/24/18 | 1px |
| 完整掉落池 | 355.7 | 87.0 | 20/18/24/18 | 1px |
| 属性与获取 | 442.7 | 225.0 | 20/18/24/18 | 1px |
| 升级与锻造 | 667.7 | 224.0 | 20/18/24/18 | 0（末节） |

四种组合数值完全相同（几何与主题/这一档宽度无关），三区首尾相接、无重叠：
配置区底边 355.7 ＝ 完整掉落池顶边，中间就是那条 1px 分隔线。池子按钮顶边 375.7
（＝ 355.7 + 20px 上内边距）、高 42，与配置区内其它控件同级。

### 6.3 定向改坏表（每条都必须让守卫变红）

脚本 `.local-data/tmp/t71-mutate.py`；改坏 → `node scripts/run-test-set.mjs architecture` → 逐字节还原并核对 SHA-256。

改坏前 SHA-256 前 16 位：`WeaponDetailContent.tsx` `56eb28b96f71007e`、`09-weapon-detail.css` `ff8fa0ae983eae2e`。

| # | 改坏内容 | 结果 | 守卫报的错 |
|---|---|---|---|
| M20 | 章节顺序改回「本件 Roll 在推荐 Roll 前面」 | 红 | 推荐 Roll 又排到了 本件 Roll 后面 |
| M21 | 完整掉落池挂回配置章节（配置章节又收 `poolOpen`、又渲染池类名） | 红 | 完整掉落池又挂回了配置章节里 |
| M22 | 章节导航改回「当前配置」在前 | 红 | 章节导航顺序没跟着章节顺序走 |
| M23 | 首屏第一节改回当前配置 | 红 | 首屏第一节没改回推荐 Roll |
| M24 | 完整掉落池丢掉自己的章节盒子 | 红 | 完整掉落池没有自己的章节盒子（三区就没分开） |
| M25 | 完整掉落池又自带一条内部分隔线 | 红 | 完整掉落池还自带一条内部分隔线 |

6/6 变红；两份源文件还原后 SHA-256 与改坏前逐字节一致。

**没有兜住的方向（如实记）**：这六条都是「源码里按位置/字符串」的静态检查，能钉住「谁写在谁前面、
谁挂在谁里面」，量不出像素；三区真的首尾相接、分隔线只画一条，证据是 6.2 那张实测表，不是这条守卫。

### 6.4 本轮没做 / 没证的

- **没有在本机实窗跑过**：几何是「真 DOM + 真实样式表 + 无头 Chromium」量的，不是 Desktop 实窗截图；
  实窗（`light / dark × 1280 / 980 / 760`）按规矩留给用户复验。
- 6.1 的渲染是 jsdom，`IntersectionObserver` 缺席时组件走的是「全部章节已挂载」的兜底分支；
  本次要证的是**章节顺序与装配关系**，不受这个兜底影响（首屏是否懒挂载由 §四.3 的文字口径约定）。
- 量几何的临时页面第一版没给滚动容器高度，浏览器把内容排好但不往画布上画（截图全黑）；
  补上 `height: 900px; overflow: auto` 后截图正常，且**改前改后两次量的数值逐项相同**，
  几何表不是被这个页面设置造出来的。

### 6.5 本次闸门

| 闸门 | 结果 |
|---|---|
| `pnpm -r typecheck` | 通过（7 个包） |
| `pnpm test:architecture` | 85 passed（含 §6.3 的六条断言） |
| `pnpm test:behavior` | 147 files / 633 tests passed（临时脚手架已删，与改动前同数） |
| `pnpm check` | 通过（Encoding check passed.） |
| `pnpm test:quality` | 通过（UI 合同检查；许可证同步 63 个应用依赖） |
| `pnpm ci:local` | 通过（架构 15 files / 85 tests、共享 Shell 视觉契约、构建后全量类型检查） |

**构建这件事要分两半说**（2026-09-18 更正，原话把两边混在了一起）：桌面端**打包与部分测试**消费的是
`packages/ui/dist`（`tsc` 产物，见 `packages/ui/package.json` 的 `exports`），要跑测试或出打包产物
必须先 `pnpm build`；而本轮改的 `packages/ui/src` 与 `packages/desktop/src` 在 **dev 窗口里是热更的**
（`packages/desktop/vite.config.ts` 把 `@d2-tools/ui` 别名到 `../ui/src/index.ts`），实窗复验不需要构建。

## 七、验收判据

1. 打开一件账号武器的详情，从上往下依次是：**推荐 Roll（推荐判断 / 这件武器的推荐 Roll）→
   本件 Roll（当前配置）→ 查看完整掉落池 → 属性与获取 → 升级与锻造**。
2. 三个区域各自是一个独立区块（同一种内边距 + 一条 1px 分隔线），完整掉落池不再和本件 Roll
   挤在同一个块里。
3. 章节导航第一项是「推荐 Roll」，打开时那一项就是选中态；点第二项「当前配置」往下跳，不会往回跳。
4. 换 Perk、写面板、「查看完整掉落池」的加载与展开行为与改动前一致（完整 Roll 仍然只在点按钮时读）；
   打开详情不读完整掉落（T70 §9 的行为不变）。
5. 六道闸门全绿；架构守卫的新断言能被打坏（§6.3）。

## 八、请用户复验

在已经跑着的 dev 窗口里进武器详情即可（`packages/ui/src` 与 `packages/desktop/src/renderer` 是热更的，
不必重新构建；只有改动落在 `core` / `http` / `services` / `app` / main / preload 时才需要重启
`tools/mac-dev-desktop.command`）：

- 从上往下看：推荐判断在最上，接着是本件 Roll，再下面才是「查看完整掉落池」，最后是属性与获取。
- 三块之间应该各有一条分隔线，完整掉落池不再贴着本件 Roll 的网格。
- 顶部章节条第一项是「推荐 Roll」，打开时它高亮。
- 打开详情时推荐区如果还在读，那一区自己显示读取状态，不影响下面的本件 Roll 立刻出来。
