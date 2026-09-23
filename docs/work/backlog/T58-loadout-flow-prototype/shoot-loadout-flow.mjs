// 出图 + 守卫：一屏一张，再整页一张。
//
// 复用 t73-prototype-workflow 记忆里的坑：
//   ②  判「渲染出来没有」一律量 getBoundingClientRect；display:none 也照报 computed width。
//   ③  page.evaluate 传真函数。
//   ⑪  .app-shell 是 height:100%; overflow:hidden，内层 .lf-page 才是滚动容器，
//      整页图要先把高度和 overflow 放开，否则只截到一屏。
//   ⑭  放开之后还要证一次「用户真的滚得动」——body 的 overflow 会传播给视口，
//      只看 .app-shell 会漏诊，页面锁死时 fullPage 照样出整页图。
import { chromium } from "playwright";
import { readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const here = import.meta.dirname;

// 屏的序号来自 SCREENS 数组下标，重排一次序号就全变。旧图不清掉就会留在目录里，
// 名字还叫 lf-03-dim.png —— 看图的人会以为那就是当前的第三屏。
for (const name of readdirSync(here)) {
  if (/^lf-.*\.png$/.test(name)) rmSync(join(here, name));
}

const html = readFileSync(join(here, "loadout-flow.html"), "utf8");

function fail(message) {
  console.error("守卫失败：" + message);
  process.exitCode = 1;
  throw new Error(message);
}

// ── 静态守卫 ──────────────────────────────────────────────────────────────
const problems = [];
if (html.includes("undefined")) problems.push("产物里有 undefined");
if (html.includes("[object Object]")) problems.push("产物里有 [object Object]");
const bodyOnly = html.slice(html.indexOf("<body>"), html.indexOf('<script>'));
if (/\*\*[^*]+\*\*/.test(bodyOnly)) problems.push("正文里漏了 Markdown 星号");
if (problems.length) {
  console.error("守卫失败：\n  " + problems.join("\n  "));
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2 });
await page.goto("file://" + join(here, "loadout-flow.html"));
await page.waitForTimeout(300);

// ── 导航行为必须在**真实滚动容器**下验，所以赶在放开 overflow 之前 ─────────
// 下面那段 addStyleTag 把 .lf-page 的 height/overflow 全放开了，之后 window 才是滚动者，
// 页内 scrollTop 恒为 0——在那里量「跳过去落在哪」量到的全是假的。
// 打开就看得见这是工作流：首屏不许自动滚到第一屏去。滚过去之后标题、矩阵总览和导航
// 全在视野外，打开的人只看到一个产品界面，就会说「工作流原型没体现出来」。
const firstPaint = await page.evaluate(() => {
  const container = document.querySelector(".lf-page");
  const flowRect = document.querySelector(".lf-flow").getBoundingClientRect();
  const firstRow = document.querySelector(".lf-matrix-row").getBoundingClientRect();
  return {
    scrollTop: Math.round(container.scrollTop),
    flowTop: Math.round(flowRect.top),
    firstRowTop: Math.round(firstRow.top),
    viewport: window.innerHeight
  };
});
if (firstPaint.scrollTop !== 0) {
  fail("打开时页面被自动滚走了，标题和矩阵总览看不到 → " + JSON.stringify(firstPaint));
}
// 四条入法 × 主干七步的矩阵比原来那排七阶段高得多，再要求「整块落在首屏内」就是要求一件
// 做不到的事。真正要保证的是「打开就看得到总览的开头」：矩阵第一行入法得在视野里。
if (firstPaint.firstRowTop < 0 || firstPaint.firstRowTop > firstPaint.viewport) {
  fail("矩阵第一行不在首屏视野里 → " + JSON.stringify(firstPaint));
}

// 跳屏统一走导航：先点这条路的路由钮（第二层导航只显示当前这条路的屏），
// 再点那一屏。直接用第二层的按钮会在别的路上的时候点一个 hidden 的节点。
async function goto(id) {
  const pathId = await page.evaluate((target) =>
    document.getElementById(target).getAttribute("data-path"), id);
  await page.click('.lf-nav-paths button[data-path-jump="' + pathId + '"]');
  await page.waitForTimeout(40);
  await page.click('.lf-nav-group[data-path="' + pathId + '"] button[data-goto="' + id + '"]');
  await page.waitForTimeout(60);
}

// 逐屏点一遍：跳过去的落点不能被吸顶导航盖住，滚过之后导航必须真的吸住。
// 落点算错的坏法是「屏头被盖住」，图照样出得来，只有量才算得出来。
const walkIds = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".lf-screen")).map((node) => node.id));
const overlapping = [];
for (const id of walkIds) {
  await goto(id);
  // 槽位行里的角标压到名字上：这类坏法出图看得见，但没人会一行行去量。属性和栅格是一致的
  // 两半，少一个 data-clickable 就落到另一套列定义，两个子节点被塞进四个列里，正好叠上。
  // 所以这里量几何：copy / match 两块和 actions 不许相交。
  const hits = await page.evaluate((target) => {
    const rows = Array.from(document.querySelectorAll("#" + target + " .loadout-slot-editor-grid .loadout-item"));
    const relative = (a, b) => {
      const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      return x > 1 && y > 1;
    };
    return rows.map((row, index) => {
      const actions = row.querySelector(".loadout-item-actions");
      if (!actions) return null;
      const actionsRect = actions.getBoundingClientRect();
      const part = [".loadout-item-copy", ".loadout-item-match"]
        .map((selector) => row.querySelector(selector))
        .filter(Boolean)
        .find((node) => relative(node.getBoundingClientRect(), actionsRect));
      return part ? { screen: target, index: index, part: part.className,
        clickable: row.getAttribute("data-clickable") } : null;
    }).filter(Boolean);
  }, id);
  overlapping.push(...hits);
  const landing = await page.evaluate((target) => {
    const container = document.querySelector(".lf-page");
    const nav = document.querySelector(".lf-nav");
    const head = document.getElementById(target).querySelector(".lf-screen-head").getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    return {
      scrollTop: Math.round(container.scrollTop),
      navBottom: navRect.bottom,
      headTop: head.top,
      navOffset: Math.round(navRect.top - container.getBoundingClientRect().top)
    };
  }, id);
  if (landing.headTop < landing.navBottom - 0.5) {
    fail("跳「" + id + "」后屏头被吸顶导航盖住了 → " + JSON.stringify(landing));
  }
}
if (overlapping.length) {
  fail("有槽位行的角标压住了装备信息 → " + JSON.stringify(overlapping));
}
// 翻到最底下时导航必须还吸在容器顶部——不然走远了就不知道自己站在流程哪一段，
// 一堆界面又变回「没有工作流」。滚到中途导航还在自然位置是正常的，别在那时候断言。
// 先跳到护甲规划那一屏再滚：这一屏够长，滚到底才真的能把导航顶上去。
// 停在短屏上时容器根本没得滚，量到的 navOffset 是「还没滚到位」，不是吸顶坏了。
await goto("screen-b-armor");
await page.evaluate(() => {
  const container = document.querySelector(".lf-page");
  container.scrollTop = container.scrollHeight;
});
await page.waitForTimeout(60);
const stuckAtBottom = await page.evaluate(() => {
  const container = document.querySelector(".lf-page");
  const navRect = document.querySelector(".lf-nav").getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    scrollTop: Math.round(container.scrollTop),
    navOffset: Math.round(navRect.top - containerRect.top),
    navInViewport: navRect.bottom > containerRect.top && navRect.top < containerRect.bottom
  };
});
if (Math.abs(stuckAtBottom.navOffset) > 1) {
  fail("滚到底后导航没吸在容器顶部 → " + JSON.stringify(stuckAtBottom));
}
if (!stuckAtBottom.navInViewport) fail("滚动过程中导航跑出视野 → " + JSON.stringify(stuckAtBottom));
// 走完这一轮停在最后一屏。重载回干净状态——后面的守卫要验「刚打开时」的样子，
// 光把 scrollTop 归零是回不去的。
await page.reload();
await page.waitForTimeout(250);

// ── ⑪⑭ 先把滚动约束放开，再开始量、开始截 ────────────────────────────────
// `.lf-page` 是 height:100%; overflow:auto 的内层滚动容器。截某一屏时 Playwright 会把元素滚进视口，
// 但「capture beyond viewport」只在**文档**这一层展开，拆不开内层容器的裁切：屏幕盒子里超出容器可视区
// 的那一段取回来是空白。护甲规划那两屏 3200px 高，正好整块被吃掉，图上只剩一大片背景色——
// 看着像原型没渲染，其实是截图工具的锅。放开 html/body/.app-shell/.lf-page 的 overflow 后，
// 元素盒子在文档里完整铺开，逐屏图和整页图拿到的都是真实像素。
await page.addStyleTag({ content: "html,body{height:auto!important;overflow:visible!important}"
  + ".app-shell{height:auto!important;overflow:visible!important;display:block!important}"
  + ".lf-page{height:auto!important;overflow:visible!important}"
  // 吸顶导航也要摘掉定位。放开 overflow 之后 window 成了滚动者，`position:sticky; top:0` 的导航
  // 会一直贴在视口顶部；Playwright 拼一张 3400px 高的长图时，它就被画进正文中间当横条，
  // 看着像内容被切了一刀。吸顶本身的行为在图前面那些守卫里已经验过，这里只要静态像素。
  + ".lf-nav{position:static!important}"
  // 矩阵自己带 overflow-x。内容放得下时它不滚，但留着这个容器等于埋一颗雷：
  // 哪天某一列变宽，超出的那一段会被裁掉，图上就是「支线那一列没了」。放开它。
  + ".lf-matrix{overflow:visible!important}" });
await page.waitForTimeout(150);

// ── 路由守卫：每个 data-goto 都得指向真实存在的屏 ────────────────────────
// 拼错一个 id 只是「点了没反应」，截图看不出来，人会以为是自己点歪了。
const routing = await page.evaluate(() => {
  const screenIds = Array.from(document.querySelectorAll(".lf-screen")).map((node) => node.id);
  const gotoTargets = Array.from(document.querySelectorAll("[data-goto]"))
    .map((node) => node.getAttribute("data-goto"));
  return { screenIds, gotoTargets };
});
const screenIdSet = new Set(routing.screenIds);
const dangling = [...new Set(routing.gotoTargets)].filter((target) => !screenIdSet.has(target));
if (dangling.length) fail("有 data-goto 指向不存在的屏 → " + JSON.stringify(dangling));

// 屏序号和标题里的数字：整页只有 SCREENS 数组一个来源，这里回头核对有没有漂。
const listed = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".lf-screen")).map((node) => ({
    id: node.id,
    no: node.querySelector(".lf-screen-no").textContent,
    head: node.querySelector(".lf-screen-head strong").textContent
  })));
listed.forEach((screen, index) => {
  const expected = String(index + 1).padStart(2, "0");
  if (screen.no !== expected) fail("第 " + (index + 1) + " 屏的序号写成 " + screen.no + "，应为 " + expected);
});
const navCount = await page.locator(".lf-nav-group button").count();
if (navCount !== listed.length) fail("导航第二层有 " + navCount + " 个按钮，" + listed.length + " 屏");

// ── 矩阵总览：四条入法 × 主干七步 ─────────────────────────────────────────
// 「29 屏按顺序排」本身不构成工作流，四条入法各走一条完整主干才是。
// 每一屏都必须出现在矩阵某一格里——少一屏就等于某条路上缺一段，
// 而它在单屏图上完全看不出来（那一屏照样画得好好的）。
const flow = await page.evaluate(() => {
  const head = Array.from(document.querySelectorAll(".lf-matrix-head > span"))
    .map((node) => node.textContent);
  const rows = Array.from(document.querySelectorAll(".lf-matrix-row")).map((row) => {
    const pathId = row.querySelector(".lf-matrix-label").getAttribute("data-path");
    return {
      pathId,
      label: row.querySelector(".lf-matrix-label").textContent,
      // 每一列的格子；列序就是 1..7 加最后一格支线。
      cells: Array.from(row.querySelectorAll(".lf-matrix-cell")).map((cell) =>
        Array.from(cell.querySelectorAll("button")).map((button) => button.getAttribute("data-goto")))
    };
  });
  return {
    head,
    rows,
    skips: Array.from(document.querySelectorAll(".lf-matrix-skip")).length,
    skipLegend: document.querySelectorAll(".lf-flow-skips li").length,
    stepLegend: document.querySelectorAll(".lf-flow-legend li").length
  };
});
// 表头 = 一列角标 + 七步 + 支线。
if (flow.head.length !== 9) fail("矩阵表头应 9 格（角标 + 7 步 + 支线），实到 " + flow.head.length);
if (flow.rows.length !== 5) fail("矩阵应有 5 行（A/B/C/D + 四条路都会碰到），实到 " + flow.rows.length);
if (flow.stepLegend !== 7) fail("七步说明应 7 条，实到 " + flow.stepLegend);

// 每屏至少出现在矩阵一格；同时把「屏 → 它落在哪几步」记下来，和屏头徽标对一遍。
const matrixSteps = new Map();
const matrixChips = [];
for (const row of flow.rows) {
  row.cells.forEach((ids, column) => {
    for (const id of ids) {
      matrixChips.push(id);
      if (column >= 7) continue; // 支线那一格不落在主干上
      if (!matrixSteps.has(id)) matrixSteps.set(id, []);
      matrixSteps.get(id).push(column + 1);
    }
  });
}
for (const id of routing.screenIds) {
  if (!matrixSteps.has(id) && !matrixChips.includes(id)) {
    fail("屏 " + id + " 没有出现在矩阵里——某条入法会缺一段");
  }
}
// 空格子不许留白：要么写着「不经过」并在下面给了原因，要么是这一行本来就不属于任何入法。
if (flow.skips < 1) fail("矩阵上一个「不经过」都没有——四条入法不可能把七步走齐");
if (flow.skips !== flow.skipLegend) {
  fail("矩阵上有 " + flow.skips + " 格写「不经过」，下面只解释了 " + flow.skipLegend + " 条");
}

// ── 每屏要说清自己在哪条路、哪几步，前后各是哪一屏 ────────────────────────
// 屏头徽标和矩阵必须是从同一份注册表出来的两半：对不上就是有一处写死了。
const steps = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".lf-screen")).map((node) => ({
    id: node.id,
    path: node.getAttribute("data-path"),
    pathBadge: node.querySelector(".lf-screen-path") ? node.querySelector(".lf-screen-path").textContent : null,
    badges: Array.from(node.querySelectorAll(".lf-screen-step em")).map((em) => em.textContent),
    branch: Boolean(node.querySelector('.lf-screen-step[data-kind="branch"]')),
    move: Array.from(node.querySelectorAll(".lf-screen-move button"))
      .map((button) => button.getAttribute("data-goto"))
  })));
steps.forEach((step, index) => {
  if (!step.pathBadge) fail("屏 " + step.id + " 缺入法徽标");
  const want = matrixSteps.get(step.id);
  if (!want) {
    // 不在矩阵任何一格主干列里 → 它只能是支线，而且必须在矩阵最后一格出现过。
    if (!step.branch) fail("屏 " + step.id + " 没落在矩阵任何一格主干里，也没标成支线");
    if (!matrixChips.includes(step.id)) fail("屏 " + step.id + " 在矩阵里找不到——某条入法会缺一段");
  } else {
    if (step.branch) fail("屏 " + step.id + " 落在矩阵第 " + want.join("/") + " 步上，不该标成支线");
    if (JSON.stringify(step.badges.map(Number)) !== JSON.stringify(want)) {
      fail("屏 " + step.id + " 的屏头步骤 " + JSON.stringify(step.badges)
        + " 和矩阵里的 " + JSON.stringify(want) + " 对不上");
    }
  }
  const prev = listed[index - 1];
  const next = listed[index + 1];
  const wantMove = [prev && prev.id, next && next.id].filter(Boolean);
  if (JSON.stringify(step.move) !== JSON.stringify(wantMove)) {
    fail("屏 " + step.id + " 的上一屏/下一屏是 " + JSON.stringify(step.move)
      + "，应为 " + JSON.stringify(wantMove));
  }
});
// 支线屏（方案对比）不该被错算进主干。
const compareSteps = steps.find((step) => step.id === "screen-shared-compare");
if (!compareSteps || !compareSteps.branch) {
  fail("方案对比应当标成支线，不在主干七步里 → " + JSON.stringify(compareSteps));
}

// ── 那条入法在显示范围里：导航第二层只显示当前这一路 ──────────────────────
const navGroupState = await page.evaluate(() => ({
  shown: Array.from(document.querySelectorAll(".lf-nav-group"))
    .filter((group) => group.getBoundingClientRect().height > 0)
    .map((group) => group.getAttribute("data-path")),
  pressed: Array.from(document.querySelectorAll(".lf-nav-paths button[aria-pressed='true']"))
    .map((button) => button.getAttribute("data-path-jump"))
}));
if (navGroupState.shown.length !== 1) {
  fail("导航第二层应只显示当前这条路的屏，实到 " + JSON.stringify(navGroupState.shown));
}
if (navGroupState.pressed.length !== 1) {
  fail("导航第一层应有且只有一个入法被按下，实到 " + JSON.stringify(navGroupState.pressed));
}

// ── 草稿是从哪来的，编辑头上必须写对 ──────────────────────────────────────
// 路径 C 是应用内新建的草稿，路径 D 是从方案库打开的已存方案。写反了读图的人会以为
// 「凑一套」改的是别人存的方案——这是流程起点的问题，不是文案问题。
const heads = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".lf-screen")).map((node) => {
    const eyebrow = node.querySelector(".loadout-eyebrow");
    const name = node.querySelector('input[aria-label="配装名称"]');
    return {
      id: node.id,
      eyebrow: eyebrow ? eyebrow.textContent : null,
      name: name ? name.value : null,
      save: node.querySelector(".loadout-editor-save-state")
        ? node.querySelector(".loadout-editor-save-state").textContent : null
    };
  }));
const C_NEW_DRAFTS = ["screen-c-armor-entry", "screen-c-armor-candidate",
  "screen-c-armor-picked", "screen-c-weapons"];
for (const id of C_NEW_DRAFTS) {
  const head = heads.find((item) => item.id === id);
  if (!head || !head.eyebrow) fail("屏 " + id + " 缺编辑头");
  if (head.eyebrow.indexOf("未保存草稿") < 0) {
    fail("屏 " + id + " 是应用内新建的草稿，编辑头却写「" + head.eyebrow + "」");
  }
  if (head.name !== "") fail("屏 " + id + " 的草稿还没保存，名字不该是「" + head.name + "」");
}
for (const id of ["screen-d-editor", "screen-d-armor"]) {
  const head = heads.find((item) => item.id === id);
  if (head.eyebrow.indexOf("已保存方案") < 0) {
    fail("屏 " + id + " 是从方案库打开的，编辑头却写「" + head.eyebrow + "」");
  }
}

// ── 默认只显示第一屏 ──────────────────────────────────────────────────────
const claimed = await page.evaluate(() => {
  const text = document.querySelector(".lf-head p").textContent;
  const match = text.match(/(\d+)\s*屏/);
  return match ? Number(match[1]) : null;
});
if (claimed !== listed.length) fail("页面上写「" + claimed + " 屏」，实际 " + listed.length + " 屏");

// ── T58 注默认关 ──────────────────────────────────────────────────────────
const visibleNow = async () => page.evaluate(() =>
  Array.from(document.querySelectorAll(".lf-screen"))
    .filter((node) => node.getBoundingClientRect().height > 0)
    .map((node) => node.id));
let shown = await visibleNow();
if (shown.length !== 1 || shown[0] !== "screen-shared-in-game") {
  fail("初始应只显示 screen-in-game，实到 " + JSON.stringify(shown));
}

// ── T58 注默认关 ──────────────────────────────────────────────────────────
const noteDefault = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".lf-t58-note")).map((node) => {
    const rect = node.getBoundingClientRect();
    return { w: Math.round(rect.width), h: Math.round(rect.height) };
  }));
if (noteDefault.some((note) => note.h !== 0 || note.w !== 0)) {
  fail("T58 注默认该藏起来，实到 " + JSON.stringify(noteDefault.slice(0, 3)));
}

// ── 逐屏走一遍：点导航 → 只有这一屏可见 → 出图 ───────────────────────────
const sizes = [];
const shots = [];
for (const screen of listed) {
  await goto(screen.id);
  shown = await visibleNow();
  if (shown.length !== 1 || shown[0] !== screen.id) {
    fail("点「" + screen.head + "」后显示的屏是 " + JSON.stringify(shown));
  }
  const size = await page.evaluate((id) => {
    const node = document.getElementById(id);
    const rect = node.getBoundingClientRect();
    const stage = node.querySelector(".lf-stage");
    const stageRect = stage.getBoundingClientRect();
    // 每一屏都得装着一个真实的页面根：产品的 .loadout-page。
    // 只数 stage 的**直接子节点**——对比页嵌在 .loadout-page > .loadout-workspace-panel 里，
    // 用 stage.querySelector 会把它和外层一起数成两个根。
    const roots = Array.from(stage.children).filter((child) => child.classList.contains("loadout-page"));
    const pageRoot = roots[0] || null;
    return {
      id,
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      stageH: Math.round(stageRect.height),
      roots: roots.map((child) => child.className.split(" ")[0]),
      // 浏览态必须有顶栏和状态条，聚焦态必须两样都没有（产品 :413-420）。
      flow: pageRoot ? pageRoot.getAttribute("data-flow") : null,
      hasToolbar: pageRoot ? Boolean(pageRoot.querySelector(".loadout-context-toolbar")) : false,
      hasStatus: pageRoot ? Boolean(pageRoot.querySelector(".loadout-operation-status")) : false,
      // 顶栏少写一个收尾 </div>，后面整个 content frame 会被浏览器吞进顶栏里。
      // 顶栏是 display:flex，吞进去之后内容区变成它的一个弹性子项：宽屏下看着还行，
      // 一遇到 min-content 大的页面（4 列对比表）就把整页撑到视口外面，而且没人会报错。
      frameNestedInToolbar: pageRoot
        ? Boolean(pageRoot.querySelector(".loadout-context-toolbar .loadout-content-frame"))
        : false,
      // 屏头和导航按钮上的名字必须是一个：改名只改一处就会露馅。
      buttonText: document.querySelector('.lf-nav-group button[data-goto="' + id + '"]').textContent
    };
  }, screen.id);
  if (size.w < 1000 || size.stageH < 300) fail(screen.head + " 没撑开 → " + JSON.stringify(size));
  if (size.roots.length !== 1) fail(screen.head + " 的 .lf-stage 里页面根不对 → " + JSON.stringify(size.roots));
  if (size.flow === "browse" && !(size.hasToolbar && size.hasStatus)) {
    fail(screen.head + " 是浏览态，但顶栏或状态条没画出来 → " + JSON.stringify(size));
  }
  if (size.flow === "focused" && (size.hasToolbar || size.hasStatus)) {
    fail(screen.head + " 是聚焦态，但顶栏或状态条还在 → " + JSON.stringify(size));
  }
  if (!size.flow) fail(screen.head + " 的 .loadout-page 没写 data-flow → " + JSON.stringify(size));
  if (size.frameNestedInToolbar) {
    fail(screen.head + " 的 .loadout-content-frame 被套进了顶栏里（顶栏缺收尾 </div>）→ "
      + JSON.stringify(size));
  }
  if (!size.buttonText.includes(screen.head)) {
    fail("导航按钮写「" + size.buttonText + "」，屏头写「" + screen.head + "」");
  }
  sizes.push(size);
  const path = join(here, "lf-" + screen.no + "-" + screen.id.replace(/^screen-/, "") + ".png");
  await page.locator("#" + screen.id).screenshot({ path });
  shots.push(path);
}

// ── 对比必须是浏览态 ──────────────────────────────────────────────────────
// 产品的 `focusedApplicationFlow` 把 library 和 compare 都排除在外（:217-219）：进编辑器要收顶栏，
// 进对比不收。上一版原型就是在这里画错的，上面那条顶栏守卫才补上。
const compareFlow = sizes.find((size) => size.id === "screen-shared-compare");
if (!compareFlow || compareFlow.flow !== "browse") {
  fail("方案对比被画成了非浏览态 → " + JSON.stringify(compareFlow));
}

// ── 对比表：4 列参照 + 未知字段不补造 ─────────────────────────────────────
// 参照列的值来自 `in_game_reference`，模型没给的就是没给。图里必须显示成「未返回」
// 并走 unknown 状态；按名字猜一个填上，等于把原型当成数据源。
const compareTable = await page.evaluate(() => {
  const table = document.querySelector("#screen-shared-compare .loadout-compare-table");
  if (!table) return null;
  const unknown = Array.from(table.querySelectorAll('[data-state="unknown"]'));
  const row = table.querySelector(".loadout-compare-table-row");
  const head = table.querySelector(".loadout-compare-table-head");
  return {
    unknownCount: unknown.length,
    unknownTexts: [...new Set(unknown.map((node) => node.textContent))],
    emptyCount: table.querySelectorAll('[data-state="empty"]').length,
    // 数格子用元素个数，不要在隐藏屏上读 gridTemplateColumns——
    // 隐藏子树拿到的是未求值的指定值（`repeat(4, minmax(...))`），按空格切会切成 4 段。
    columns: row.children.length,
    headColumns: head.children.length
  };
});
if (!compareTable) fail("对比屏里没找到对比表");
if (compareTable.unknownCount < 1) fail("游戏内只读参照一个未知字段都没画出来 → " + JSON.stringify(compareTable));
if (compareTable.unknownTexts.some((text) => text !== "未返回")) {
  fail("参照列的未知字段写成别的了 → " + JSON.stringify(compareTable.unknownTexts));
}
if (compareTable.columns !== 5) fail("对比表应是「比较项 + 4 列」，实到 " + compareTable.columns);
if (compareTable.headColumns !== 5) fail("对比表头应 5 格，实到 " + compareTable.headColumns);

// ── 「每角色上限 10」得在图上数得出 10 条槽位 ───────────────────────────
// 说明文字写 10、列表只画 5 条，是同一类「数字和画面对不上」，静态守卫看不出来。
const slotCounts = await page.evaluate(() => {
  const rail = document.querySelector("#screen-shared-in-game .loadout-entry-list");
  const picker = document.querySelector('#screen-shared-in-game section[aria-label="用当前装备覆盖目标槽位"] .loadout-slot-picker-list');
  const publish = document.querySelector("#screen-d-wear .loadout-slot-picker-list");
  return {
    rail: rail ? rail.children.length : null,
    picker: picker ? picker.children.length : null,
    publish: publish ? publish.children.length : null
  };
});
for (const [where, count] of Object.entries(slotCounts)) {
  if (count !== 10) fail("槽位列表（" + where + "）该有 10 条，实到 " + count);
}

// ── 护甲待重算：旧候选留着，接受按钮必须禁用 ─────────────────────────────
// 这是正确性不是文案：按钮还能点，玩家就能把按旧设置算出来的护甲写进草稿。
//
// 三屏各演示一类触发源（属性模组 / 六维目标 / 碎片读数）。三类都得满足同一条硬约束，
// 而且计算条和结果区的措辞必须点名**各自那一类**——都用一句「设置已变化」，
// 读图的人就看不出重算要重算什么。
const DIRTY_SCREENS = [
  { id: "screen-d-dirty-mods", source: "属性模组", reasonKey: "属性模组改过了" },
  { id: "screen-d-dirty-stats", source: "六维最低值", reasonKey: "六维最低值改过了" },
  { id: "screen-d-dirty-fragments", source: "碎片读数", reasonKey: "读数刚变过" }
];
const dirtyReasons = new Set();
for (const screen of DIRTY_SCREENS) {
  await goto(screen.id);
  const dirtyArmor = await page.evaluate(({ id }) => {
    const pane = document.querySelector("#" + id + " .loadout-armor-results-pane");
    if (!pane) return null;
    const accept = Array.from(pane.querySelectorAll(".loadout-armor-candidate button"))
      .find((button) => button.textContent.indexOf("使用这套方案") >= 0);
    const bar = document.querySelector("#" + id + " .loadout-armor-calculate-bar");
    const head = pane.querySelector(".loadout-decision-pane-head small");
    const note = document.querySelector("#" + id + " .lf-t92-note");
    return {
      candidates: pane.querySelectorAll(".loadout-armor-candidate").length,
      acceptDisabled: accept ? accept.disabled : null,
      acceptLabel: accept ? accept.textContent : "",
      barStatus: bar ? bar.getAttribute("data-status") : null,
      barText: bar ? bar.textContent : "",
      headText: head ? head.textContent : "",
      hasNote: Boolean(note)
    };
  }, { id: screen.id });
  if (!dirtyArmor) fail(screen.id + " 里没找到推荐方案区");
  if (dirtyArmor.candidates < 1) fail(screen.id + " 待重算时旧候选被清掉了，应当留在屏幕上 → " + JSON.stringify(dirtyArmor));
  if (dirtyArmor.acceptDisabled !== true) fail(screen.id + " 待重算时「使用这套方案」没禁用 → " + JSON.stringify(dirtyArmor));
  if (dirtyArmor.barStatus !== "warning") fail(screen.id + " 计算条没进 warning → " + JSON.stringify(dirtyArmor));
  if (dirtyArmor.barText.indexOf("重新计算") < 0) fail(screen.id + " 计算条没写清要重算 → " + JSON.stringify(dirtyArmor));
  // 计算条要说出是哪一类设置变了，不能只写「设置已变化」。
  if (dirtyArmor.barText.indexOf(screen.reasonKey) < 0) {
    fail(screen.id + " 计算条没点名是哪一类设置变了（应含「" + screen.reasonKey + "」）→ " + dirtyArmor.barText);
  }
  // 结果区要和计算条说同一件事，且三屏互不相同。
  if (dirtyArmor.headText.indexOf("修改前") < 0) {
    fail(screen.id + " 结果区没写清这是按修改前的设置算的 → " + dirtyArmor.headText);
  }
  if (dirtyReasons.has(dirtyArmor.headText)) {
    fail(screen.id + " 的结果区标题和别的待重算屏一模一样，看不出是哪一类触发 → " + dirtyArmor.headText);
  }
  dirtyReasons.add(dirtyArmor.headText);
  if (!dirtyArmor.hasNote) fail(screen.id + " 缺 T92 注（三类的闸门差别只写在这里）");
}
if (dirtyReasons.size !== DIRTY_SCREENS.length) fail("待重算屏的结果区标题没有区分开");

// 六维目标那屏：改了最低值，候选六维没变，摘要区必须冒出「差 N」——但按钮仍然是禁用的。
// 这一屏是「红字看得见、按钮点不动」的形状：摘要不是闸门，禁用接受才是。
await goto("screen-d-dirty-stats");
const statsDirty = await page.evaluate(() => {
  const pane = document.querySelector("#screen-d-dirty-stats .loadout-armor-summary-pane");
  if (!pane) return null;
  const cells = Array.from(pane.querySelectorAll(".loadout-summary-stat-grid > div"));
  const shortfalls = cells.filter((cell) => cell.getAttribute("data-status") === "warning");
  const inputs = Array.from(document.querySelectorAll(
    "#screen-d-dirty-stats .loadout-armor-constraint-grid input"));
  const accept = Array.from(document.querySelectorAll(
    "#screen-d-dirty-stats .loadout-armor-candidate button"))
    .find((button) => button.textContent.indexOf("使用这套方案") >= 0);
  return {
    warningCells: shortfalls.length,
    warningText: shortfalls.map((cell) => cell.textContent).join(" | "),
    // 红的只是那一格的 <small>（「差 8」），不是整格文字——整格文字里还带着实测值 102。
    shortfallText: shortfalls.length ? shortfalls[0].querySelector("small").textContent : "",
    minimums: inputs.map((input) => input.value),
    acceptDisabled: accept ? accept.disabled : null,
    // 右栏实时摘要和护甲区方案摘要是同一屏上的两块地方，比的必须是同一组数。
    // 各写一份的结果就是右栏「韧性 目标 100」配护甲区「最低值 110」——读图的人只会觉得原型坏了。
    rail: (() => {
      const aside = document.querySelector("#screen-d-dirty-stats .loadout-build-summary");
      if (!aside) return null;
      const cells = Array.from(aside.querySelectorAll(".loadout-summary-stat-grid > div"));
      return {
        targetText: cells.length ? cells[0].querySelector("small").textContent : "",
        metricText: (() => {
          const metric = aside.querySelector(".loadout-summary-metrics > div");
          return metric ? metric.querySelector("strong").textContent : "";
        })(),
        warningCells: cells.filter((cell) => cell.getAttribute("data-status") === "warning").length
      };
    })()
  };
});
if (!statsDirty) fail("六维目标那屏里没找到方案摘要");
if (statsDirty.warningCells !== 1) fail("改了六维最低值后摘要区应当有且只有 1 格冒红字 → " + JSON.stringify(statsDirty));
if (statsDirty.warningText.indexOf("差 8") < 0) fail("摘要区没把差多少写出来 → " + statsDirty.warningText);
if (statsDirty.minimums[0] !== "110") fail("六维目标那屏的最低值没显示成改后的 110 → " + statsDirty.minimums.join(","));
if (statsDirty.acceptDisabled !== true) fail("六维目标那屏的接受按钮没禁用——这正是当前产品缺的那道闸门");
if (!statsDirty.rail) fail("六维目标那屏里没找到右栏实时摘要");
if (statsDirty.rail.warningCells !== 1) {
  fail("右栏实时摘要也该标出同一格缺口 → " + JSON.stringify(statsDirty.rail));
}
// 右栏那块走的是「差 N」而不是「目标 N」——缺口一旦出现，目标值本身就换了说法。
if (statsDirty.rail.targetText !== statsDirty.shortfallText) {
  fail("右栏实时摘要和护甲区摘要对同一格的写法不一致 → 右栏 " + statsDirty.rail.targetText
    + " / 护甲区 " + statsDirty.shortfallText);
}
if (statsDirty.rail.metricText.replace(/[^\d]/g, "") !== statsDirty.shortfallText.replace(/[^\d]/g, "")) {
  fail("右栏「距离目标」和护甲区摘要的红字对不上 → 右栏 " + statsDirty.rail.metricText
    + " / 护甲区 " + statsDirty.shortfallText);
}

// 属性模组那屏：改的是逐部位规则，摘要六维不该跟着冒红字（目标没动）。
const modsDirty = await page.evaluate(() => {
  const pane = document.querySelector("#screen-d-dirty-mods .loadout-armor-summary-pane");
  if (!pane) return null;
  return Array.from(pane.querySelectorAll(".loadout-summary-stat-grid > div"))
    .filter((cell) => cell.getAttribute("data-status") === "warning").length;
});
if (modsDirty !== 0) fail("属性模组那屏的摘要六维不该冒红字，目标值没改 → warning 格数 " + modsDirty);

// 碎片那屏：碎片面板要显示成自动求和（读数来自子职业），不是一片 0。
// `data-auto` 挂在 label 上，不在 input 上——量的时候别数错节点。
const fragmentDirty = await page.evaluate(() => {
  const panel = document.querySelector("#screen-d-dirty-fragments .loadout-armor-fragment-adjustments");
  if (!panel) return null;
  const inputs = Array.from(panel.querySelectorAll("input"));
  return {
    autoLabels: panel.querySelectorAll('label[data-auto="true"]').length,
    nonZero: inputs.filter((input) => Number(input.value) !== 0).length,
    nonZeroAuto: inputs.filter((input) => Number(input.value) !== 0
      && input.closest("label") && input.closest("label").getAttribute("data-auto") === "true").length
  };
});
if (!fragmentDirty) fail("碎片那屏里没找到碎片属性面板");
if (fragmentDirty.autoLabels < 1 || fragmentDirty.nonZeroAuto < 1) {
  fail("碎片那屏没把自动求和的读数画出来，看不出碎片变过 → " + JSON.stringify(fragmentDirty));
}

// ── 搜索截断要露出来（`search.truncated` 产品里没人渲染）──────────────────
const truncatedNotice = await page.evaluate(() => {
  const pane = document.querySelector("#screen-b-armor .loadout-armor-results-pane");
  if (!pane) return null;
  return Array.from(pane.querySelectorAll(".loadout-callout"))
    .filter((callout) => callout.getAttribute("data-status") === "warning").length;
});
if (!truncatedNotice) fail("护甲规划那屏没把搜索截断画出来 → " + JSON.stringify(truncatedNotice));

// ── 「N 个结果」和屏幕上的候选卡数量必须是一个数 ─────────────────────────
// 面板头写 5、下面只画 1 张，读图的人会当成原型漏渲染。数字只认卡片数量。
const resultConsistency = await page.evaluate(() => {
  const pane = document.querySelector("#screen-b-armor .loadout-armor-results-pane");
  if (!pane) return null;
  const head = pane.querySelector(".loadout-decision-pane-head small");
  const match = head ? head.textContent.match(/(\d+)\s*个结果/) : null;
  return {
    claimed: match ? Number(match[1]) : null,
    cards: pane.querySelectorAll(".loadout-armor-candidate").length
  };
});
if (!resultConsistency || resultConsistency.claimed === null) {
  fail("推荐方案面板头没写清结果数量 → " + JSON.stringify(resultConsistency));
}
if (resultConsistency.claimed !== resultConsistency.cards) {
  fail("面板写「" + resultConsistency.claimed + " 个结果」，屏上只有 "
    + resultConsistency.cards + " 张候选卡");
}

// ── 图里带 T58 注的几屏，再各出一张 ──────────────────────────────────────
// 先站到一屏有注的屏上：注只长在编辑器 / 护甲规划 / 核对落盘这几类屏里，
// 停在待重算那三屏上时满页只有 T92 注，勾了开关也量不到东西。
await goto("screen-b-armor");
await page.check("#lf-t58");
await page.waitForTimeout(120);
const notesOn = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".lf-t58-note")).map((node) => {
    const rect = node.getBoundingClientRect();
    const head = node.querySelector("header strong");
    return { h: Math.round(rect.height), w: Math.round(rect.width), title: head ? head.textContent : "" };
  }));
// 只该在「勾上之后」可见的屏上量：默认关的那些此刻仍是 0×0。
const visibleNotes = notesOn.filter((note) => note.h > 0);
if (visibleNotes.length === 0) fail("勾上「显示 T58 注」后一条注都没出现");
if (notesOn.some((note, index) => note.h < 0 || note.w < 0)) fail("T58 注量到负尺寸");

// ── T58 注：三块注里的对照栅格必须真两列 ─────────────────────────────────
// 产品那条栅格挂在 `> div:last-child` 上（03-workspace.css:1391），往里追加兄弟节点会静默塌成单列。
const t58Cols = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".lf-t58-note")).map((note) => {
    const grid = note.querySelector(".lf-t58-cols");
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    if (rect.height === 0) return null;
    const children = Array.from(grid.children).map((node) => {
      const child = node.getBoundingClientRect();
      return { top: Math.round(child.top), left: Math.round(child.left), w: Math.round(child.width) };
    });
    return {
      count: children.length,
      cols: children.filter((child) => Math.abs(child.top - children[0].top) <= 1).length,
      display: getComputedStyle(grid).display
    };
  }).filter(Boolean));
if (t58Cols.length === 0) fail("T58 注里没量到展开的对照栅格");
for (const grid of t58Cols) {
  if (grid.display !== "grid") fail("对照栅格 display 是 " + grid.display + "，规则没生效");
  if (grid.count !== 2 || grid.cols !== 2) {
    fail("对照栅格塌成 " + grid.cols + " 列（应为 2 列），实到 " + JSON.stringify(grid));
  }
}

// ── 属性变化输入行：必须是两列 ────────────────────────────────────────────
// 同一条产品栅格规则。要看的那两块在护甲规划那屏（T58 ② 注里，现状和候选各一块）；
// 编辑器那屏没有属性变化输入，之前点错了屏，这条断言一直是空转。
await goto("screen-b-armor");
await page.check("#lf-t58");
await page.waitForTimeout(80);
const adjustments = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".loadout-armor-fragment-adjustments")).map((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.height === 0) return null;
    const labels = Array.from(section.querySelectorAll("label")).map((label) => {
      const box = label.getBoundingClientRect();
      return { top: Math.round(box.top), left: Math.round(box.left) };
    });
    return {
      count: labels.length,
      cols: labels.filter((label) => Math.abs(label.top - labels[0].top) <= 1).length
    };
  }).filter(Boolean));
if (adjustments.length === 0) fail("没量到展开的属性变化输入区");
for (const table of adjustments) {
  if (table.count !== 6) fail("属性变化框应有 6 个，实到 " + table.count);
  if (table.cols !== 2) fail("属性变化栅格塌成 " + table.cols + " 列（应为 2 列）");
}

// ── 原型覆盖的 position: static 必须真的生效 ─────────────────────────────
// ①：sticky 的头部会浮在别的屏上面，截图里只像「排得怪」，不像坏掉。
const stickyTargets = [".loadout-editor-head", ".loadout-editor-sticky-actions",
  ".loadout-armor-calculate-bar", ".loadout-item-picker-backdrop", ".loadout-item-picker-drawer"];
const stickyLeaks = await page.evaluate((selectors) => {
  const leaks = [];
  for (const selector of selectors) {
    for (const node of document.querySelectorAll(".lf-stage " + selector)) {
      if (node.getBoundingClientRect().height === 0) continue;
      const position = getComputedStyle(node).position;
      if (position === "sticky" || position === "fixed") leaks.push(selector + " 仍是 " + position);
    }
  }
  return leaks;
}, stickyTargets);
if (stickyLeaks.length) fail("原型里还有浮起来的元素 →\n  " + stickyLeaks.join("\n  "));

// ── 存槽位面板：标题必须包在 header 里，才吃得到 03-workspace.css:858-879 那组样式 ──
// Bug #104 修之前，产品的标题和说明是裸 strong + small，两行挤在一起贴左缘。
await goto("screen-d-wear");
const publishHead = await page.evaluate(() => {
  const publish = document.querySelector("#screen-d-wear .loadout-slot-picker");
  if (!publish) return null;
  const head = publish.querySelector(":scope > header");
  if (!head) return { hasHeader: false };
  const strong = head.querySelector("strong").getBoundingClientRect();
  const small = head.querySelector("small").getBoundingClientRect();
  const headBox = head.getBoundingClientRect();
  return {
    hasHeader: true,
    stacked: Math.abs(strong.top - small.top) > 8,
    strongInset: Math.round(strong.left - headBox.left),
    headInset: Math.round(headBox.left - publish.getBoundingClientRect().left)
  };
});
if (!publishHead || !publishHead.hasHeader) fail("存槽位面板的标题没包在 <header> 里，Bug #104 又回来了");
if (!publishHead.stacked) fail("存槽位面板的标题和说明还在同一行，header 那组样式没生效");
if (publishHead.strongInset < 8 || publishHead.headInset > 4) {
  fail("存槽位面板标题的内边距不对 → " + JSON.stringify(publishHead));
}

// ── 「新建配装」菜单：展开后要看得见，且锚在顶栏上 ────────────────────────
// 菜单长在带顶栏的那几屏上（顶栏只在 mode === "local" 画「新建配装」）。上一段停在存槽位那屏，
// 那是聚焦态、没有顶栏，先走回方案库，否则量到的是一屏隐藏 DOM 的 0×0。
await goto("screen-d-open");
await page.check("#lf-menu");
await page.waitForTimeout(80);
const menuBox = await page.evaluate(() => {
  const menu = document.querySelector("#screen-d-open .loadout-create-options") ||
    document.querySelector(".loadout-create-options");
  if (!menu) return null;
  const details = menu.closest("details");
  const rect = menu.getBoundingClientRect();
  const toolbar = menu.closest(".loadout-context-toolbar").getBoundingClientRect();
  return {
    open: details ? details.hasAttribute("open") : false,
    w: Math.round(rect.width),
    h: Math.round(rect.height),
    top: Math.round(rect.top),
    toolbarTop: Math.round(toolbar.top)
  };
});
if (!menuBox || !menuBox.open) fail("勾了「展开新建配装菜单」但 details 没 open");
if (menuBox.w < 200 || menuBox.h < 80) fail("菜单没撑开 → " + JSON.stringify(menuBox));
if (menuBox.top < menuBox.toolbarTop - 4) fail("菜单跑到顶栏上面去了 → " + JSON.stringify(menuBox));

// ── 平铺模式：每一屏都得有实体尺寸 ───────────────────────────────────────
await page.check("#lf-tile");
await page.waitForTimeout(150);
const tiled = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".lf-screen")).map((node) => {
    const rect = node.getBoundingClientRect();
    return { id: node.id, w: Math.round(rect.width), h: Math.round(rect.height) };
  }));
const collapsed = tiled.filter((screen) => screen.h < 400 || screen.w < 1000);
if (collapsed.length) fail("平铺模式下有屏没撑开 → " + JSON.stringify(collapsed));

// ── ⑭ 到这里滚动早已放开（脚本开头就放），再证一次「用户真的滚得动」 ────────
// body 的 overflow 会传播给视口；只改 .app-shell 会漏诊。锁死时 window.scrollY 恒为 0。
const scrollState = await page.evaluate(() => {
  const last = document.querySelector(".lf-screen:last-of-type");
  last.scrollIntoView({ block: "center" });
  return { y: Math.round(window.scrollY) };
});
await page.waitForTimeout(120);
const afterScroll = await page.evaluate(() => {
  const last = document.querySelector(".lf-screen:last-of-type");
  const rect = last.getBoundingClientRect();
  const clippers = [];
  for (let node = last.parentElement; node && node !== document.documentElement; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (node.scrollHeight > node.clientHeight && style.overflowY !== "visible") {
      clippers.push(node.className + " (" + style.overflowY + ")");
    }
  }
  return {
    y: Math.round(window.scrollY),
    top: Math.round(rect.top),
    bottom: Math.round(rect.bottom),
    innerHeight: window.innerHeight,
    clippers,
    docHeight: document.documentElement.scrollHeight
  };
});
if (afterScroll.clippers.length) fail("还有裁切滚动区 → " + afterScroll.clippers.join("、"));
if (afterScroll.docHeight < 4000) fail("整页高度只有 " + afterScroll.docHeight + "px，看着没铺开");
if (afterScroll.y === 0 && afterScroll.bottom < afterScroll.innerHeight) {
  fail("滚不动：scrollY 恒为 0 且最后一屏也没进视口 → " + JSON.stringify(afterScroll));
}

// 出整页图（放在最后：前面已经改过平铺和滚动约束）
await page.screenshot({ path: join(here, "lf-all.png"), fullPage: true });

await browser.close();
writeFileSync(join(here, "lf-sizes.json"), JSON.stringify(sizes, null, 2), "utf8");
console.log("出图完成");
console.log("  " + shots.length + " 屏一屏一张，整页一张 lf-all.png");
console.log("  屏序号/导航/屏头三处一致 × " + listed.length + " 屏；data-goto 无悬空");
console.log("  T58 注默认 0×0，勾上后可见 " + visibleNotes.length + " 条，对照栅格 "
  + t58Cols.length + " 处 × 2 列");
console.log("  属性变化输入 " + adjustments.length + " 处 × 2 列；浮起元素残留 " + stickyLeaks.length);
console.log("  存槽位标题：header 内缩 " + publishHead.headInset + "px，标题内缩 "
  + publishHead.strongInset + "px，两行分开 " + publishHead.stacked);
console.log("  滚动放开后 scrollY=" + afterScroll.y + "，文档高 " + afterScroll.docHeight + "px");
console.log(sizes.map((size) =>
  "  " + size.id + "  " + size.w + "×" + size.h + "（stage " + size.stageH + "）").join("\n"));
