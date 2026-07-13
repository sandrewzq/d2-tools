# 首页本周作战桌实施计划

> 执行规则覆盖：本文保留的测试、`Red / Verify`、`verify:*` 和视觉命令仅是历史计划记录，不是当前 agent 执行要求。不得据此自动新增测试或执行旧命令；用户主动本地测试时照常运行现有测试。

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` inline，按任务逐项执行；本计划不启用子 agent。

**Goal:** 将共享首页改为连续的“本周作战桌”，完整展示仄的全部可读库存，并消除固定两排布局产生的大面积空洞。

**Architecture:** `HomePageContentView` 继续只消费归一化后的 weekly summary 与 public vendor source；本切片不接入尚未验证的第三方周常源。首页用三个清晰区域表达数据：顶部周常情报带、左侧完整仄库存矩阵、右侧实时情报栏。Prototype、Web 和 Desktop 继续消费同一个共享 View。

**Tech Stack:** TypeScript、React、Vitest、服务端静态渲染测试、共享 CSS、Bungie Public Vendors。

## Global Constraints

- 首页不展示每日区域、每日重置卡片、遗失区域或账号个人数据。
- 首页不新增网页正文抓取、硬编码轮换或未经验证的第三方数据。
- Manifest 只翻译名称、图标、类型和说明，不能作为当前活动激活证据。
- 仄展示当前 public vendor source 返回的全部可读库存，不再 `.slice(0, 4)`。
- 没有确认数据的分类完全隐藏，不显示等待、错误或推测卡片。
- 1920×1080 使用连续作战桌，不设置强制填满视口的固定两排高度。
- 不修改共享 `ProductWorkspace`、全局 token 或其他菜单内容。
- 当前工作区已有多 lane 改动，本轮不自动提交、不使用 `git add -A`。
- 稳定公开周常 provider 注册属于后续独立数据接入切片；本计划只消费现有已确认 weekly props。

---

### Task 1: Red: 首页仄完整库存测试

**Files:**
- Modify: `packages/desktop/test/home-weekly-briefing.test.tsx`

**Interfaces:**
- Consumes: `HomePageContentView`、`HomeDailySummary`。
- Produces: 仄完整库存、不截断和禁用时隐藏的渲染契约。

- [ ] **Step 1: 将四件上限测试改为完整库存测试**

构造 12 件有名称、类型和价格的库存，并追加第 13 件不可读空名称数据。关键断言：

```ts
expect(html.match(/home-operations-stock-item/g)).toHaveLength(12);
expect(html).toContain("第十二件库存");
expect(html).not.toContain("第十三件空库存");
```

- [ ] **Step 2: 运行测试并确认因当前 `.slice(0, 4)` 失败**

Run:

```powershell
npx pnpm@9.15.0 exec vitest --run packages/desktop/test/home-weekly-briefing.test.tsx
```

Expected: FAIL，渲染结果只有 4 个库存项且缺少“第十二件库存”。

### Task 2: Green: 仄完整库存最小实现

**Files:**
- Modify: `packages/ui/src/home/HomePageContentView.tsx`

**Interfaces:**
- Produces: `buildConfirmedXur(source, copy)` 返回全部可读 `HomeDailyItem[]`。

- [ ] **Step 1: 删除仄库存四件截断**

将：

```ts
const items = (vendor?.items ?? []).filter((item) => item.title.trim()).slice(0, 4);
```

改为：

```ts
const items = (vendor?.items ?? []).filter((item) => item.title.trim());
```

- [ ] **Step 2: 将库存项根类名改为新作战桌契约**

库存项使用稳定类名：

```tsx
<article className="home-operations-stock-item" key={item.title}>
```

- [ ] **Step 3: 运行定向测试并确认通过**

Run:

```powershell
npx pnpm@9.15.0 exec vitest --run packages/desktop/test/home-weekly-briefing.test.tsx
```

Expected: PASS。

### Task 3: Red: 本周作战桌结构测试

**Files:**
- Modify: `packages/desktop/test/home-weekly-briefing.test.tsx`

**Interfaces:**
- Produces: 连续周常带、库存区、实时情报栏和多条轮换活动的 DOM 契约。

- [ ] **Step 1: 新增连续作战桌渲染断言**

构造两个高亮突袭和两个高亮地牢 entry。关键断言：

```ts
expect(html).toContain("home-operations-desk");
expect(html).toContain("home-operations-week");
expect(html).toContain("home-operations-body");
expect(html).toContain("home-operations-live");
expect(html.match(/home-operations-entry/g)).toHaveLength(4);
expect(html).not.toContain("home-weekly-command-grid");
```

- [ ] **Step 2: 新增 fail-closed 结构断言**

当事件、加成和异域任务没有 ready 数据时，不生成空实时状态行：

```ts
expect(html).not.toContain("等待同步");
expect(html).not.toContain("待确认");
```

- [ ] **Step 3: 运行测试并确认旧结构失败**

Run:

```powershell
npx pnpm@9.15.0 exec vitest --run packages/desktop/test/home-weekly-briefing.test.tsx
```

Expected: FAIL，缺少 `home-operations-*` 结构并仍存在 `home-weekly-command-grid`。

### Task 4: Green: 本周作战桌最小结构

**Files:**
- Modify: `packages/ui/src/home/HomePageContentView.tsx`
- Modify: `packages/ui/src/i18n/copy.ts`

**Interfaces:**
- Produces: `home-operations-desk`、`home-operations-week`、`home-operations-body`、`home-operations-stock`、`home-operations-live`。

- [ ] **Step 1: 将首页根面板替换为连续作战桌**

根结构：

```tsx
<ProductWorkspacePanel className="home-operations-desk">
  <header className="home-operations-heading">...</header>
  <section className="home-operations-week">...</section>
  <div className="home-operations-body">...</div>
  <footer className="home-operations-source">...</footer>
</ProductWorkspacePanel>
```

- [ ] **Step 2: 将周常分类改为横向情报分区**

- 夜幕使用 `home-operations-nightfall`，奖励为同区右侧列。
- 突袭和地牢的 `entries` 分别映射为 `home-operations-entry`，不再 `join(" / ")`。
- 没有 ready 数据的分类不生成空分区。

- [ ] **Step 3: 将仄库存与实时情报组成主体区**

```tsx
<div className="home-operations-body">
  {xur ? renderConfirmedXur(xur, copy) : null}
  {hasLiveSignals ? <aside className="home-operations-live">...</aside> : null}
</div>
```

- [ ] **Step 4: 补齐新标题、来源和状态文案的英文 copy**

只增加作战桌实际渲染需要的 key，不引入新的语言切换逻辑。

- [ ] **Step 5: 运行定向测试并确认通过**

Run:

```powershell
npx pnpm@9.15.0 exec vitest --run packages/desktop/test/home-weekly-briefing.test.tsx
```

Expected: PASS。

### Task 5: Tidy: 作战桌样式与死代码整理

**Files:**
- Modify: `packages/ui/src/home/HomePageContentView.tsx`
- Modify: `packages/ui/src/styles.css`

**Interfaces:**
- Produces: 1920×1080 四列库存、连续分隔线和无固定空洞的响应式样式。

- [ ] **Step 1: 新增 `.home-operations-*` 内容层样式**

- 作战桌使用单个外层边界和内部 hairline 分隔线。
- 周常带使用 `4.2fr 2.1fr 2.1fr 1.9fr`，分类缺失时允许剩余分区自然扩展。
- 主体使用约 `8.8fr / 3.2fr`，库存默认四列三行。
- 不设置 `min-height: clamp(...)` 或固定两排 `grid-template-rows`。
- 中等宽度库存降为三列；窄屏改为单列顺序。

- [ ] **Step 2: 删除不再渲染的旧首页 helper**

移除旧 daily、lost-sector、weekly support 和旧 command card 的未调用 helper/type，保留当前 props 契约避免扩大跨端改动。

- [ ] **Step 3: 删除或隔离旧 `.home-weekly-command-*` 活跃样式**

确保新页面只命中 `.home-operations-*`，不依赖旧布局固定高度。

- [ ] **Step 4: 运行定向测试与 diff 检查**

Run:

```powershell
npx pnpm@9.15.0 exec vitest --run packages/desktop/test/home-weekly-briefing.test.tsx
git diff --check
```

Expected: PASS，且无空白错误。

### Task 6: Green: Prototype 完整数据场景

**Files:**
- Modify: `packages/prototype/src/mock/scenarios.ts`
- Modify: `packages/desktop/test/visual-prototype-harness.test.ts`

**Interfaces:**
- Produces: Prototype 首页可视化 12 件库存、两个突袭、两个地牢和实时情报栏。

- [ ] **Step 1: 先补 Prototype 行为测试**

测试通过公开 fixture 渲染共享首页，断言 12 个库存项、两个突袭名称和两个地牢名称均存在。

- [ ] **Step 2: 运行测试并确认现有两件 mock 库存失败**

Run:

```powershell
npx pnpm@9.15.0 exec vitest --run packages/desktop/test/visual-prototype-harness.test.ts
```

Expected: FAIL，缺少完整库存或第二条轮换数据。

- [ ] **Step 3: 扩展 ready fixture**

Prototype 数据只用于视觉验收，明确保持 mock 身份；补足 12 件库存、两个突袭、两个地牢和已确认信号，不新增伪远程图标 URL。

- [ ] **Step 4: 运行测试并确认通过**

Run:

```powershell
npx pnpm@9.15.0 exec vitest --run packages/desktop/test/visual-prototype-harness.test.ts
```

Expected: PASS。

### Task 7: Tidy: 页面元数据与视觉脚本

**Files:**
- Modify: `packages/desktop/test/desktop-product-redesign-wiring.test.ts`
- Modify: `scripts/visual-home-check.mjs`
- Modify: `docs/todo.md`

**Interfaces:**
- Produces: 新作战桌源码护栏、视觉选择器和当前任务状态。

- [ ] **Step 1: 更新旧源码护栏**

将 `home-weekly-command` 断言替换为 `home-operations-desk`、`home-operations-stock` 和 `home-operations-live`；不新增匹配中文实现细节的功能测试。

- [ ] **Step 2: 更新视觉脚本等待和 computed selector**

视觉脚本等待 `.home-operations-desk`，并采集库存矩阵与实时情报栏的尺寸。

- [ ] **Step 3: 更新 `docs/todo.md`**

记录首页作战桌和完整仄库存已实现；稳定公开周常 provider 仍是下一独立数据接入步骤。

- [ ] **Step 4: 运行机械检查**

Run:

```powershell
git diff --check
npx pnpm@9.15.0 docs:check
```

Expected: PASS。

### Task 8: Verify: 首页范围验证

**Files:**
- Test: `packages/desktop/test/home-weekly-briefing.test.tsx`
- Test: `packages/desktop/test/visual-prototype-harness.test.ts`

- [ ] **Step 1: 运行首页定向行为测试**

```powershell
npx pnpm@9.15.0 exec vitest --run packages/desktop/test/home-weekly-briefing.test.tsx packages/desktop/test/visual-prototype-harness.test.ts
```

- [ ] **Step 2: 运行共享 UI 范围门禁**

```powershell
npx pnpm@9.15.0 verify:ui
```

- [ ] **Step 3: 运行 Desktop 范围门禁**

本轮修改 Desktop 接线测试与视觉脚本，运行：

```powershell
npx pnpm@9.15.0 verify:desktop
```

- [ ] **Step 4: 运行 1920×1080 视觉检查**

```powershell
npx pnpm@9.15.0 visual:home
```

人工检查：12 件库存完整、周常分区连续、实时情报栏无空洞、无页面级横向溢出。

- [ ] **Step 5: 收尾检查**

```powershell
npx pnpm@9.15.0 docs:check
git diff --check
tools\git-preflight.cmd
```

- [ ] **Step 6: 发布门禁说明**

不运行发布级 `pnpm test` / `pnpm typecheck`，除非用户另行要求；最终回答明确列出实际验证命令。
