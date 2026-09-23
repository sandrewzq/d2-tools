// T58 原型构建：一页三档，看「子职业怎么读、属性怎么进求解器、应用前怎么拦」。
//
//   A 现状   —— 今天界面上实际长什么样（手工输入框 / 拍平摘要 / 没有闸门）
//   B 改完   —— 要定的那套交互，可点：闸门在两档之间切，明细能展开
//   C 真配置 —— 三个子职业跑同一套面板，看空槽和长尾巴撑不撑得住
//
// 全部照产品的实现来：
//   · 样式表   packages/ui/src/styles.css（整份内联，改产品 CSS 原型跟着变）
//   · 面板 DOM packages/ui/src/loadouts/LoadoutsPageContentView.tsx:662-700（游戏内子职业明细）
//             同文件 :1452-1454（草稿编辑器的子职业槽）
//             同文件 :1886-1900（手工的「技能与碎片属性变化」输入框，本原型要替掉的那块）
//   · 类名     .loadout-subclass-section / .loadout-subclass-slot 产品有定义（03-workspace.css:1892-1897）
//             .loadout-in-game-subclass-detail 产品**没有**定义（见 T58 backlog 第 7 条），
//             原型里那条规则标了「候选」，定案后搬进产品，别让原型留着反向覆盖。
//
// 数据是**示例**，不是真实账号读取结果。原型定的是交互与信息分层，不用来核对六维数值。
//
// 跑法：node build-t58.mjs → 生成 t58.html
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const here = import.meta.dirname;
// 比原型原来在 .local-data/tmp/t58-subclass/ 时多一层：这里离仓库根是四层。
const repoRoot = resolve(here, "../../../..");

function inlineCss(entryPath, seen = new Set()) {
  if (seen.has(entryPath)) return "";
  seen.add(entryPath);
  return readFileSync(entryPath, "utf8").replace(/@import\s+["']([^"']+)["'];?/g, (whole, spec) => {
    if (!spec.startsWith(".")) return whole;
    return inlineCss(resolve(dirname(entryPath), spec), seen);
  });
}

const productCss = inlineCss(join(repoRoot, "packages/ui/src/styles.css"));

// 官方图标：原型不接 Manifest，用带字形的合成图占位。
// 图标在这套面板里承担「一眼分出超能/星象/碎片」的职责，所以占位图必须带形状，
// 不能用纯色块——纯色块看不出分组到底分不分得开。
function icon(label) {
  let hue = 0;
  for (const ch of label) hue = (hue * 31 + ch.codePointAt(0)) % 360;
  const glyph = label.slice(0, 1);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">'
    + '<rect width="36" height="36" fill="hsl(' + hue + ' 30% 20%)"/>'
    + '<circle cx="18" cy="18" r="11" fill="hsl(' + hue + ' 55% 52%)"/>'
    + '<text x="18" y="24" font-size="16" text-anchor="middle" fill="hsl(' + hue + ' 30% 12%)">' + glyph + "</text>"
    + "</svg>";
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

const STATS = [
  ["health", "韧性"],
  ["melee", "力量"],
  ["grenade", "纪律"],
  ["super", "智力"],
  ["class", "职业"],
  ["weapon", "武器"]
];

// 示例构筑：虚空泰坦。数值是编的，只保证自洽（星象+碎片的和 = 面板上的合计）。
const BUILDS = {
  voidTitan: {
    key: "voidTitan",
    element: "虚空",
    class_name: "泰坦",
    branch: "哨兵",
    subclass_label: "虚空 · 哨兵",
    source: "当前装备",
    groups: [
      { key: "super", label: "超能", plugs: [["哨兵护盾", 0]], slots: 1 },
      { key: "ability", label: "近战", plugs: [["虚空护盾猛击", 1]], slots: 1 },
      { key: "ability", label: "手雷", plugs: [["磁吸手雷", 2]], slots: 1 },
      { key: "ability", label: "职业技能", plugs: [["高耸壁垒", 3]], slots: 1 },
      { key: "aspects", label: "星象", plugs: [["无畏冲锋", 4], ["壁垒", 5]], slots: 2 },
      { key: "fragments", label: "碎片", plugs: [["记忆碎片", 6], ["收割碎片", 7], ["坚持碎片", 8]], slots: 5 }
    ],
    stat_bonus: { health: 20, melee: 0, grenade: 0, super: 0, class: 10, weapon: 0 },
    // 每一项加在哪：展开明细用
    stat_sources: [
      { name: "记忆碎片", kind: "碎片", changes: [["health", 10]] },
      { name: "收割碎片", kind: "碎片", changes: [["health", 10]] },
      { name: "无畏冲锋", kind: "星象", changes: [["class", 10]] }
    ]
  },
  strandWarlock: {
    key: "strandWarlock",
    element: "缚丝",
    class_name: "术士",
    branch: "编织者",
    subclass_label: "缚丝 · 编织者",
    source: "当前装备",
    groups: [
      { key: "super", label: "超能", plugs: [["织针风暴", 0]], slots: 1 },
      { key: "ability", label: "近战", plugs: [["缚丝之刃", 1]], slots: 1 },
      { key: "ability", label: "手雷", plugs: [["线织手雷", 2]], slots: 1 },
      { key: "ability", label: "职业技能", plugs: [["治愈裂痕", 3]], slots: 1 },
      { key: "aspects", label: "星象", plugs: [["织丝者", 4], ["心灵之术", 5], ["碎地者", 6]], slots: 3 },
      { key: "fragments", label: "碎片", plugs: [["勇气之线", 7], ["守护之线", 8], ["上升之线", 9], ["连续之线", 10], ["世代之线", 11]], slots: 5 }
    ],
    stat_bonus: { health: 10, melee: 0, grenade: 10, super: 0, class: 10, weapon: 0 },
    stat_sources: [
      { name: "勇气之线", kind: "碎片", changes: [["health", 10]] },
      { name: "守护之线", kind: "碎片", changes: [["grenade", 10]] },
      { name: "碎地者", kind: "星象", changes: [["class", 10]] }
    ]
  },
  prismaticHunter: {
    key: "prismaticHunter",
    element: "棱镜",
    class_name: "猎人",
    branch: "收割者",
    subclass_label: "棱镜 · 收割者",
    source: "当前装备",
    groups: [
      { key: "super", label: "超能", plugs: [["黄金枪：猎鹰", 0]], slots: 1 },
      { key: "ability", label: "近战", plugs: [["投掷小刀", 1]], slots: 1 },
      { key: "ability", label: "手雷", plugs: [["治疗手雷", 2]], slots: 1 },
      { key: "ability", label: "职业技能", plugs: [["赌徒闪避", 3]], slots: 1 },
      // 空槽：只装了一片星象，碎片槽也不满 —— 看面板撑不撑得住
      { key: "aspects", label: "星象", plugs: [["飞刀杂耍", 4]], slots: 2 },
      { key: "fragments", label: "碎片", plugs: [["勇气碎片", 5]], slots: 5 }
    ],
    stat_bonus: { health: 0, melee: 10, grenade: 0, super: 0, class: 0, weapon: 10 },
    stat_sources: [
      { name: "勇气碎片", kind: "碎片", changes: [["melee", 10], ["weapon", 10]] }
    ]
  }
};

// 应用前闸门的两档：配装记录的配置 vs 角色此刻的配置。
const GATE_RECORDED = {
  aspects: ["无畏冲锋", "壁垒"],
  fragments: ["记忆碎片", "收割碎片", "坚持碎片"]
};
const GATE_CASES = {
  same: { label: "当前配置 = 配装记录的配置", aspects: GATE_RECORDED.aspects.slice(), fragments: GATE_RECORDED.fragments.slice() },
  drifted: { label: "在游戏里换过碎片", aspects: ["无畏冲锋", "壁垒"], fragments: ["记忆碎片", "虚空抑制", "坚持碎片"] }
};

const STATUS_CHIP = {
  "super": "超能",
  "ability": "技能"
};

// ── 渲染 ────────────────────────────────────────────────────────────────────

function chip(name, socketIndex, kind, state) {
  // state: "filled" | "empty"
  if (state === "empty") {
    return '<li class="t58-chip t58-chip-empty" data-ui-kind="object-card"><span class="t58-chip-icon t58-chip-icon-empty">·</span><span class="t58-chip-name">空槽</span></li>';
  }
  return '<li class="t58-chip" data-ui-kind="object-card" data-plug-kind="' + kind + '">'
    + '<img class="t58-chip-icon" src="' + icon(name) + '" alt="" />'
    + "<span class=\"t58-chip-name\">" + name + "</span>"
    + '<span class="t58-chip-socket">socket ' + socketIndex + "</span>"
    + "</li>";
}

function groupRows(build) {
  return build.groups.map(function (group) {
    const filled = group.plugs.map(function (pair) { return chip(pair[0], pair[1], group.key, "filled"); });
    const emptyCount = Math.max(0, group.slots - group.plugs.length);
    const empties = [];
    for (let i = 0; i < emptyCount; i += 1) empties.push(chip("", 0, group.key, "empty"));
    return '<div class="t58-group" data-plug-kind="' + group.key + '" data-empty="' + (emptyCount > 0 ? "yes" : "no") + '">'
      + '<div class="t58-group-head"><strong>' + group.label + "</strong>"
      + "<span>" + group.plugs.length + "/" + group.slots + "</span></div>"
      + '<ul class="t58-chip-list">' + filled.join("") + empties.join("") + "</ul>"
      + "</div>";
  }).join("");
}

function subclassPanel(build, options) {
  const opts = options || {};
  const head = '<header class="t58-panel-head">'
    + '<img class="t58-panel-icon" src="' + icon(build.element + build.branch) + '" alt="" />'
    + "<div><strong>" + build.subclass_label + "</strong>"
    + "<small>" + build.class_name + " · 读取自" + build.source + "</small></div>"
    + '<span class="t58-pill" data-status="success">已读取</span>'
    + "</header>";
  const groups = '<div class="loadout-in-game-subclass-detail t58-groups">' + groupRows(build) + "</div>";
  const note = opts.note ? '<p class="t58-note">' + opts.note + "</p>" : "";
  return '<section class="loadout-subclass-section" aria-label="子职业" data-surface="frame" data-ui-kind="summary-frame">'
    + head + groups + note + "</section>";
}

function statTable(build) {
  const rows = STATS.map(function (pair) {
    const key = pair[0];
    const label = pair[1];
    const total = build.stat_bonus[key] || 0;
    return "<tr><th scope=\"row\">" + label + "</th>"
      + "<td>" + total + "</td>"
      + "<td>" + (total ? "+" + total : "—") + "</td></tr>";
  }).join("");
  return '<table class="t58-stat-table"><thead><tr><th scope="col">属性</th><th scope="col">子职业合计</th><th scope="col">求解器收到的修正</th></tr></thead><tbody>' + rows + "</tbody></table>";
}

function statSources(build) {
  return build.stat_sources.map(function (source) {
    const changes = source.changes.map(function (change) {
      const stat = STATS.find(function (pair) { return pair[0] === change[0]; });
      return '<span class="t58-change">' + (stat ? stat[1] : change[0]) + " +" + change[1] + "</span>";
    }).join("");
    return "<li><strong>" + source.name + "</strong>"
      + '<span class="t58-kind">' + source.kind + "</span>"
      + "<span>" + changes + "</span></li>";
  }).join("");
}

// ── 页面 ────────────────────────────────────────────────────────────────────

const TAB_A = `
<section class="t58-view" id="view-a" hidden>
  <div class="t58-problem-grid">
    <article class="t58-problem" data-ui-kind="state-frame">
      <h2>① 属性加成靠手数</h2>
      <p>星象和碎片各加多少，用户自己在游戏里看一遍、回来敲六个数字。敲错一位，整套护甲就偏了，而且界面上看不出是敲的。</p>
      <div class="t58-demo">
        <section class="loadout-armor-fragment-adjustments" aria-label="技能与碎片属性变化">
          <div class="loadout-armor-constraint-head"><div><strong>技能与碎片属性变化</strong><small>填写构筑中已经确定的额外属性变化，可使用负数。</small></div></div>
          <div>${STATS.map(function (pair) {
            return "<label><span>" + pair[1] + '</span><input type="number" step="5" value="0" readonly /></label>';
          }).join("")}</div>
        </section>
      </div>
      <p class="t58-verdict">这一块是唯一填属性的入口，而求解器契约里早就有 <code>fragment_adjustments</code>，只是没人喂它。</p>
    </article>

    <article class="t58-problem" data-ui-kind="state-frame">
      <h2>② 子职业被拍平</h2>
      <p>折叠摘要取前 3 个、拼成一行；上游已经带了官方图标，但到这一层被丢掉了。同一份数据在详情里还渲染了两遍。</p>
      <div class="t58-demo">
        <div class="t58-flat">子职业构筑：哨兵护盾、虚空护盾猛击、磁吸手雷…</div>
      </div>
      <p class="t58-verdict">分不出超能和星象，碎片多的时候后面全被截掉。</p>
    </article>

    <article class="t58-problem" data-ui-kind="state-frame">
      <h2>③ 应用前不比对子职业</h2>
      <p>配装不记「当时读到的是哪套子职业」，应用时也不看角色现在装的是什么。玩家中途在游戏里换了星象，应用照走不误。</p>
      <div class="t58-demo">
        <div class="t58-gate t58-gate-off">应用配装<span class="t58-gate-state">未校验子职业</span></div>
      </div>
      <p class="t58-verdict">护甲求解是按旧配置算的，点下去结果对不上，还得自己回游戏里找原因。</p>
    </article>
  </div>
  <p class="t58-foot">三件事的修法都在 <code>docs/work/backlog/T58-ingame-loadout-subclass-fidelity.md</code>；数据写入的前置 <code>Bug #103</code> 已修。</p>
</section>`;

const TAB_B = `
<section class="t58-view" id="view-b">
  <div class="t58-block">
    <h2>1. 读准当前子职业</h2>
    <p class="t58-sub">超能、技能、星象、碎片各是什么，从角色当前装备读；空槽显式占位，不再被过滤掉。</p>
    ${subclassPanel(BUILDS.voidTitan, { note: "读到的配置参与配装计算，但不会写回游戏——星象、碎片、超能、技能一律不写。" })}
  </div>

  <div class="t58-block">
    <h2>2. 属性加成自动进求解器</h2>
    <p class="t58-sub">星象和碎片加的属性自动求和，替掉手工输入。手工框保留成覆盖项，只在用户想手动改时出现。</p>
    <div class="t58-two-col">
      <section class="t58-panel" data-surface="frame" data-ui-kind="status-matrix" aria-label="属性加成合计">
        <header class="t58-panel-head"><div><strong>子职业提供的属性</strong><small>求解时按「目标属性 − 这一份」来配护甲</small></div></header>
        ${statTable(BUILDS.voidTitan)}
        <button type="button" class="t58-toggle" id="sources-toggle" data-ui-kind="button" data-control-variant="secondary" aria-expanded="false">展开来源明细</button>
        <ul class="t58-source-list" id="sources-list" hidden>${statSources(BUILDS.voidTitan)}</ul>
      </section>
      <section class="t58-panel" data-surface="frame" data-ui-kind="status-matrix" aria-label="求解器契约">
        <header class="t58-panel-head"><div><strong>求解器拿到什么</strong><small>契约没变，变的是谁把值填进去</small></div></header>
        <pre class="t58-code">armor_constraints.fragment_stat_bonuses
  = 从当前子职业求和</pre>
        <ul class="t58-plain">
          <li>读到的子职业变了，这一份跟着变，不用用户重敲。</li>
          <li>用户想手动覆盖时，覆盖结果记进配装，应用前会被闸门一起校验。</li>
        </ul>
      </section>
    </div>
  </div>

  <div class="t58-block">
    <h2>3. 应用前校验闸门</h2>
    <p class="t58-sub">配装记下当时读到的那一套；点应用时先比对角色此刻的配置，对不上就拦住。这一档可以点着切。</p>
    <div class="t58-demo-row" role="group" aria-label="闸门演示">
      <button type="button" class="t58-seg" data-gate="same" aria-pressed="true" data-ui-kind="button">当前配置 = 记录</button>
      <button type="button" class="t58-seg" data-gate="drifted" aria-pressed="false" data-ui-kind="button">角色已改过碎片</button>
    </div>
    <div class="t58-gate-panel" data-surface="frame" data-ui-kind="summary-frame">
      <div id="gate-body"></div>
    </div>
  </div>

  <p class="t58-foot">写回游戏不做（DIM 的 issue #10344 / #8750 记录无谓改动会让玩家丢掉全部超能/技能能量；参考项目 d2-armor-solver 也只写五个护甲槽和护甲模组）。</p>
</section>`;

function buildView(build) {
  return '<div class="t58-build">'
    + "<h3>" + build.subclass_label + "</h3>"
    + subclassPanel(build, {})
    + "</div>";
}

const TAB_C = `
<section class="t58-view" id="view-c" hidden>
  <p class="t58-sub">三个子职业跑同一套面板：星象槽不满、碎片槽不满、棱镜子职业的长尾巴。</p>
  <div class="t58-build-grid">
    ${buildView(BUILDS.voidTitan)}
    ${buildView(BUILDS.strandWarlock)}
    ${buildView(BUILDS.prismaticHunter)}
  </div>
</section>`;

const PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>T58 子职业保真 · 交互原型</title>
<style>
${productCss}
</style>
<style>
/* ── 原型自有的排版样式，全部 .t58- 前缀，不与产品规则抢同名类 ─────────────
   产品里 .loadout-subclass-section / .loadout-subclass-slot 有定义，
   本原型直接把产品那条用上，不覆盖。 */
body { margin: 0; background: var(--page); color: var(--text); height: 100%; }
html { height: 100%; }
/* .app-shell 是 2 行网格 + overflow:hidden，页面得自己占满两行并滚动，否则会被顶部栏那一行裁掉。 */
.t58-page { grid-row: 1 / -1; grid-column: 1; overflow: auto; height: 100%; max-width: 1180px; margin: 0 auto; padding: 24px 20px 64px; box-sizing: border-box; }
.t58-head h1 { margin: 0 0 6px; font-size: 20px; color: var(--text-title); }
.t58-warn { margin: 0 0 16px; padding: 8px 12px; border-inline-start: 4px solid var(--status-warning); border-radius: 4px; background: var(--status-warning-bg); color: var(--text-body); font-size: var(--font-caption); }
.t58-tabs { display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px; }
.t58-tab { min-height: 34px; padding: 0 14px; border: 1px solid var(--control-border); border-radius: 4px; background: var(--surface-panel); color: var(--text-body); font: inherit; cursor: pointer; }
.t58-tab[aria-selected="true"] { border-color: var(--accent-primary); color: var(--text-title); background: var(--surface-interactive-strong); }
/* 不能写 .t58-view { display:block }：那会盖掉 [hidden] 自带的 display:none，三个标签页会同时出现。 */
.t58-view:not([hidden]) { display: block; }
.t58-block { margin: 0 0 28px; }
.t58-block h2 { margin: 0 0 4px; font-size: 16px; color: var(--text-title); }
.t58-sub { margin: 0 0 12px; color: var(--text-muted); font-size: var(--font-caption); }
.t58-problem-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
.t58-problem { padding: 14px; background: var(--card-bg); border: 1px solid var(--object-border); }
.t58-problem h2 { margin: 0 0 6px; font-size: 15px; color: var(--text-title); }
.t58-problem p { margin: 0 0 10px; color: var(--text-body); font-size: var(--font-caption); line-height: 1.6; }
.t58-verdict { padding-top: 8px; border-top: 1px solid var(--border-subtle); color: var(--text-muted) !important; }
.t58-demo { margin: 0 0 10px; border: 1px solid var(--border-subtle); border-radius: 4px; overflow: hidden; }
.t58-flat { padding: 10px 12px; color: var(--text-muted); font-size: var(--font-caption); }
.t58-two-col { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
.t58-panel { padding: 0 0 12px; }
.t58-panel-head { display: flex; align-items: center; gap: 10px; padding: 12px; border-bottom: 1px solid var(--border-subtle); }
.t58-panel-head strong { display: block; color: var(--text-title); }
.t58-panel-head small { display: block; margin-top: 3px; color: var(--text-muted); font-size: var(--font-caption); }
.t58-panel-icon { width: 36px; height: 36px; border-radius: 4px; }
.t58-pill { margin-inline-start: auto; padding: 3px 10px; border-radius: 999px; font-size: var(--font-caption); background: var(--status-ready-bg); color: var(--status-ready); }
.t58-groups { display: grid; gap: 10px; padding: 12px; }
.t58-group-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px; }
.t58-group-head strong { color: var(--text-title); font-size: var(--font-caption); }
.t58-group-head span { color: var(--text-muted); font-size: var(--font-caption); }
.t58-chip-list { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.t58-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 4px; border: 1px solid var(--object-border); border-radius: 999px; background: var(--surface-panel); font-size: var(--font-caption); }
.t58-chip-icon { width: 20px; height: 20px; border-radius: 4px; }
.t58-chip-name { color: var(--text-body); }
.t58-chip-socket { color: var(--text-muted); font-size: 11px; }
.t58-chip-empty { border-style: dashed; background: transparent; padding-right: 12px; }
.t58-chip-icon-empty { display: grid; place-items: center; background: transparent; border: 1px dashed var(--border-subtle); color: var(--text-muted); }
.t58-chip-empty .t58-chip-name { color: var(--text-muted); }
.t58-note { margin: 0; padding: 10px 12px; border-top: 1px solid var(--border-subtle); color: var(--text-muted); font-size: var(--font-caption); line-height: 1.6; }
.t58-stat-table { width: 100%; border-collapse: collapse; font-size: var(--font-caption); }
.t58-stat-table th, .t58-stat-table td { padding: 8px 12px; border-bottom: 1px solid var(--border-subtle); text-align: start; }
.t58-stat-table thead th { color: var(--text-muted); font-weight: 400; }
.t58-stat-table tbody th { color: var(--text-body); font-weight: 400; }
.t58-stat-table td:last-child { color: var(--status-ready); }
.t58-toggle { margin: 12px; min-height: 34px; padding: 0 12px; border: 1px solid var(--control-border); border-radius: 4px; background: var(--surface-panel); color: var(--text-body); font: inherit; cursor: pointer; }
.t58-source-list { margin: 0; padding: 0 12px; list-style: none; }
.t58-source-list li { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-top: 1px solid var(--border-subtle); font-size: var(--font-caption); }
.t58-source-list strong { color: var(--text-body); font-weight: 400; }
.t58-kind { padding: 2px 8px; border-radius: 999px; background: var(--surface-interactive); color: var(--text-muted); font-size: 11px; }
.t58-change { display: inline-block; margin-inline-end: 6px; color: var(--status-ready); }
.t58-code { margin: 12px; padding: 10px 12px; border-radius: 4px; background: var(--surface-recessed); color: var(--text-body); font-size: var(--font-caption); line-height: 1.6; white-space: pre-wrap; }
.t58-plain { margin: 0; padding: 0 12px 0 26px; color: var(--text-muted); font-size: var(--font-caption); line-height: 1.8; }
.t58-demo-row { display: flex; gap: 8px; margin-bottom: 12px; }
.t58-seg { min-height: 34px; padding: 0 14px; border: 1px solid var(--control-border); border-radius: 4px; background: var(--surface-panel); color: var(--text-body); font: inherit; cursor: pointer; }
.t58-seg[aria-pressed="true"] { border-color: var(--accent-primary); background: var(--surface-interactive-strong); color: var(--text-title); }
.t58-gate-panel { padding: 14px; }
.t58-gate { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 4px; border: 1px solid var(--object-border); }
.t58-gate-state { margin-inline-start: auto; font-size: var(--font-caption); }
.t58-gate[data-state="pass"] { border-inline-start: 4px solid var(--status-ready); }
.t58-gate[data-state="pass"] .t58-gate-state { color: var(--status-ready); }
.t58-gate[data-state="block"] { border-inline-start: 4px solid var(--status-error); }
.t58-gate[data-state="block"] .t58-gate-state { color: var(--status-error); }
.t58-diff { margin: 12px 0 0; padding: 0; list-style: none; font-size: var(--font-caption); }
.t58-diff li { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-top: 1px solid var(--border-subtle); }
.t58-diff-tag { padding: 2px 8px; border-radius: 999px; font-size: 11px; }
.t58-diff-tag[data-kind="extra"] { background: var(--status-warning-bg); color: var(--status-warning); }
.t58-diff-tag[data-kind="missing"] { background: var(--status-error-bg, var(--status-warning-bg)); color: var(--status-error, var(--status-warning)); }
.t58-diff-tag[data-kind="same"] { background: var(--surface-interactive); color: var(--text-muted); }
.t58-build-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
.t58-build h3 { margin: 0 0 8px; font-size: 14px; color: var(--text-title); }
.t58-foot { margin-top: 24px; padding-top: 12px; border-top: 1px solid var(--border-subtle); color: var(--text-muted); font-size: var(--font-caption); line-height: 1.7; }
code { padding: 1px 5px; border-radius: 4px; background: var(--surface-recessed); font-size: 0.92em; }
</style>
</head>
<body>
<div class="app-shell">
<main class="t58-page" data-surface="page">
  <header class="t58-head">
    <h1>T58 子职业保真 · 交互原型</h1>
    <p class="t58-warn">示例数据，不是真实账号读取结果。这一版定的是交互与信息分层，不用来核对游戏里的六维数值。</p>
    <nav class="t58-tabs" role="tablist">
      <button type="button" class="t58-tab" role="tab" data-tab="view-a" aria-selected="false">A · 现状</button>
      <button type="button" class="t58-tab" role="tab" data-tab="view-b" aria-selected="true">B · 改完</button>
      <button type="button" class="t58-tab" role="tab" data-tab="view-c" aria-selected="false">C · 三个子职业</button>
    </nav>
  </header>
  ${TAB_A}
  ${TAB_B}
  ${TAB_C}
</main>
</div>
<script>
(function () {
  var GATE_RECORDED = ${JSON.stringify(GATE_RECORDED)};
  var GATE_CASES = ${JSON.stringify(GATE_CASES)};

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderGate(key) {
    var current = GATE_CASES[key];
    var same = key === "same";
    var body = document.getElementById("gate-body");
    body.textContent = "";

    var gate = el("div", "t58-gate");
    gate.setAttribute("data-state", same ? "pass" : "block");
    gate.appendChild(el("strong", null, same ? "配置一致，可以穿戴" : "配置对不上，已拦住"));
    gate.appendChild(el("span", "t58-gate-state", same ? "可穿戴" : "需先切回子职业"));
    body.appendChild(gate);

    var list = el("ul", "t58-diff");
    var all = [];
    GATE_RECORDED.aspects.concat(GATE_RECORDED.fragments).forEach(function (name) {
      all.push({ name: name, recorded: true });
    });
    current.aspects.concat(current.fragments).forEach(function (name) {
      if (!all.some(function (item) { return item.name === name; })) all.push({ name: name, recorded: false });
    });
    all.forEach(function (item) {
      var inCurrent = current.aspects.indexOf(item.name) >= 0 || current.fragments.indexOf(item.name) >= 0;
      var kind = item.recorded && inCurrent ? "same" : item.recorded ? "missing" : "extra";
      var label = kind === "same" ? "一致" : kind === "missing" ? "配装记了，角色没装" : "角色多出这一项";
      var row = el("li");
      var tag = el("span", "t58-diff-tag", label);
      tag.setAttribute("data-kind", kind);
      row.appendChild(tag);
      row.appendChild(el("span", null, item.name));
      list.appendChild(row);
    });
    body.appendChild(list);

    var action = el("button", "t58-seg", same ? "穿戴此方案" : "穿戴此方案（不可点）");
    action.setAttribute("data-ui-kind", "button");
    action.disabled = !same;
    action.style.marginTop = "12px";
    if (!same) action.setAttribute("data-control-variant", "secondary");
    body.appendChild(action);

    if (!same) {
      var hint = el("p", "t58-sub", "先去游戏里把这套星象和碎片切回来，再回来点穿戴。");
      hint.style.marginTop = "8px";
      body.appendChild(hint);
    }
  }

  document.querySelectorAll(".t58-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".t58-tab").forEach(function (other) {
        other.setAttribute("aria-selected", String(other === tab));
      });
      document.querySelectorAll(".t58-view").forEach(function (view) {
        view.hidden = view.id !== tab.getAttribute("data-tab");
      });
    });
  });

  document.querySelectorAll(".t58-seg[data-gate]").forEach(function (button) {
    button.addEventListener("click", function () {
      document.querySelectorAll(".t58-seg[data-gate]").forEach(function (other) {
        other.setAttribute("aria-pressed", String(other === button));
      });
      renderGate(button.getAttribute("data-gate"));
    });
  });

  var toggle = document.getElementById("sources-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var list = document.getElementById("sources-list");
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.textContent = open ? "展开来源明细" : "收起来源明细";
      list.hidden = open;
    });
  }

  renderGate("same");
})();
</script>
</body>
</html>`;

writeFileSync(join(here, "t58.html"), PAGE);
console.log("t58.html 已生成：" + join(here, "t58.html"));
