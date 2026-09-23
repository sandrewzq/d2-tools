// 出图 + 守卫：v2 是长流程页，先按步截，再整页截一张。
//
// 两个坑（见 t73-prototype-workflow 记忆）：
//   ⑪ .app-shell 是 height:100%; overflow:hidden，内部 .t58f-page 才是滚动容器，
//      直接 fullPage 只会截到一屏。整页图要先把高度和 overflow 放开。
//   ②  判「有没有渲染出来」一律量 getBoundingClientRect，不读 computed style 的 width。
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const here = import.meta.dirname;
const html = readFileSync(join(here, "t58-flow.html"), "utf8");

// ── 静态守卫：构建产物里不该出现的东西 ────────────────────────────────────
const problems = [];
if (html.includes("undefined")) problems.push("产物里有 undefined");
if (html.includes("[object Object]")) problems.push("产物里有 [object Object]");
// 页面正文里不该留 Markdown 星号（代码块除外；本页没有 <pre>，正文里也不该有）
const bodyOnly = html.slice(html.indexOf("<body>"));
if (/\*\*[^*]+\*\*/.test(bodyOnly)) problems.push("正文里漏了 Markdown 星号");
if (problems.length) {
  console.error("守卫失败：\n  " + problems.join("\n  "));
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2 });
await page.goto("file://" + join(here, "t58-flow.html"));
await page.waitForTimeout(300);

// 先放开滚动容器的约束**再**截图。⑪：.app-shell 是 height:100%; overflow:hidden，
// .t58f-page 才是滚动容器；比视口高的步骤条按元素截会被裁在半路，
// 而且裁的位置看着像「内容没渲染出来」，不像截图问题。顺序反了就白跑。
await page.addStyleTag({ content: "html,body{height:auto!important;overflow:visible!important}"
  + ".app-shell{height:auto!important;overflow:visible!important}"
  + ".t58f-page{height:auto!important;overflow:visible!important}" });
await page.waitForTimeout(150);

// 步骤条：每步一张，看单步有没有塌
const steps = await page.locator(".t58f-step").all();
const stepIds = [];
for (let i = 0; i < steps.length; i += 1) {
  const id = await steps[i].getAttribute("id");
  stepIds.push(id);
  await steps[i].screenshot({ path: join(here, "flow-" + id + ".png") });
}

// 整页一张
await page.screenshot({ path: join(here, "flow-all.png"), fullPage: true });

// 尺寸守卫：每步的 rect 高度必须 > 0（display:none 时 rect 是 0×0，computed width 照样报数）
const sizes = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".t58f-step")).map((node) => {
    const rect = node.getBoundingClientRect();
    return { id: node.id, w: Math.round(rect.width), h: Math.round(rect.height) };
  }));

const bad = sizes.filter((size) => size.w < 400 || size.h < 200);
if (bad.length) {
  console.error("守卫失败：步骤条没撑开 → " + JSON.stringify(bad));
  await browser.close();
  process.exit(1);
}

// 守卫：步骤 1 的入口卡必须是真栅格，且「新建配装」浮层不许压住它们。
// 踩过一次：浮层前的两行 `//` 注释让 `.t58f-entry-grid` 整条失效（CSS 不认 `//`），
// 卡片竖着堆成一列、浮层照旧压在上面——两种都只像「排得松」，不像坏了。
// 页面上报的入口条数也必须和实际卡片数对上（改标题忘改卡片就是这么来的）。
const step1 = await page.evaluate(() => {
  const step = document.querySelector("#step-1");
  const grid = step.querySelector(".t58f-entry-grid");
  const cards = Array.from(step.querySelectorAll(".t58f-entry")).map((node) => {
    const rect = node.getBoundingClientRect();
    return { top: Math.round(rect.top), left: Math.round(rect.left) };
  });
  const popup = step.querySelector(".loadout-create-options");
  const words = Array.from(step.querySelectorAll(".t58f-stage-note, .t58f-entry p"))
    .map((node) => node.textContent)
    .join(" ")
    .match(/([\d一二三四五六七八九十])条入口/g) || [];
  return {
    display: getComputedStyle(grid).display,
    cards,
    popupBottom: popup ? Math.round(popup.getBoundingClientRect().bottom) : null,
    mentions: words
  };
});
if (step1.display !== "grid") {
  console.error("守卫失败：.t58f-entry-grid 的 display 是 " + step1.display + "，规则没生效");
  process.exit(1);
}
if (step1.cards[1] && Math.abs(step1.cards[0].top - step1.cards[1].top) > 1) {
  console.error("守卫失败：入口卡塌成单列（第 1、2 张 top 差 "
    + Math.abs(step1.cards[0].top - step1.cards[1].top) + "px）");
  process.exit(1);
}
if (step1.popupBottom !== null && step1.cards[0].top < step1.popupBottom) {
  console.error("守卫失败：展开的「新建配装」浮层压住第 1 张入口卡（浮层底 " + step1.popupBottom
    + "，卡片顶 " + step1.cards[0].top + "）");
  process.exit(1);
}
// 卡片数减掉末尾那张「（共同点）」摘要卡，就是真正的入口条数。
const entryTotal = step1.cards.length - 1;
const claimed = [...new Set(step1.mentions.map((text) => text.replace("条入口", "")))];
if (claimed.length !== 1) {
  console.error("守卫失败：页面上入口条数说法不一致 → " + JSON.stringify(claimed));
  process.exit(1);
}
const numeral = { "一": 1, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9 };
const claimedCount = /^\d$/.test(claimed[0]) ? Number(claimed[0]) : numeral[claimed[0]];
if (claimedCount !== entryTotal) {
  console.error("守卫失败：页面写「" + claimed[0] + "条入口」，实际有 " + entryTotal + " 条");
  process.exit(1);
}

// 守卫：两个「技能与碎片属性变化」section 的输入行必须都是**两列**。
// 产品栅格挂在 `> div:last-child`（03-workspace.css:1391），往里追加任何兄弟节点都会塌成单列，
// 而单列看着不像坏掉，只像「排得松」——所以按矩形量：同一行两个 label 的 top 必须相等。
const tabletops = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".loadout-armor-fragment-adjustments"))
    .map((section) => {
      const labels = Array.from(section.querySelectorAll("label")).map((label) => {
        const rect = label.getBoundingClientRect();
        return { top: Math.round(rect.top), left: Math.round(rect.left), w: Math.round(rect.width) };
      });
      const first = labels[0];
      const sameRow = labels.filter((label) => Math.abs(label.top - first.top) <= 1);
      return { count: labels.length, sameRow: sameRow.length, cols: sameRow.length };
    }));

for (const table of tabletops) {
  if (table.count !== 6) { console.error("守卫失败：属性变化框应有 6 个，实到 " + table.count); process.exit(1); }
  if (table.cols !== 2) {
    console.error("守卫失败：输入栅格塌成 " + table.cols + " 列（应为 2 列）——"
      + "多半是往 .loadout-armor-fragment-adjustments 里追加了兄弟节点");
    process.exit(1);
  }
}

// 守卫：原型覆盖的 position: static 必须真的生效。
// ①：写了一条不生效的覆盖 CSS 比不写更糟——sticky 的头部会浮在别的步骤上面，
// 而截图里它「看着只是排得怪」，不会像坏掉。
const stickyLeaks = await page.evaluate(() => {
  const targets = [".loadout-editor-head", ".loadout-editor-sticky-actions", ".loadout-armor-calculate-bar"];
  const leaks = [];
  for (const selector of targets) {
    for (const node of document.querySelectorAll(".t58f-stage " + selector)) {
      const position = getComputedStyle(node).position;
      if (position === "sticky" || position === "fixed") {
        leaks.push(selector + " 仍是 " + position);
      }
    }
  }
  return leaks;
});
if (stickyLeaks.length) {
  console.error("守卫失败：原型里还有 sticky 的元素 →\n  " + stickyLeaks.join("\n  "));
  process.exit(1);
}

await browser.close();
writeFileSync(join(here, "flow-sizes.json"), JSON.stringify(sizes, null, 2), "utf8");
console.log("出图完成 · " + stepIds.length + " 步 · 属性变化栅格 2 列 × " + tabletops.length
  + " 处 · sticky 已还原静态 × " + stickyLeaks.length + " 处残留");
console.log(sizes.map((size) => "  " + size.id + "  " + size.w + "×" + size.h).join("\n"));
