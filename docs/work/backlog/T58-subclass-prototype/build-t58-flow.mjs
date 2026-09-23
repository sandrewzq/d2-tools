// T58 原型 v2：**完整的新建配装工作流**，一页走完「入口 → 目标角色 → 起点 → 逐槽位 → 子职业
// → 护甲约束与求解 → 采用并保存 → 穿戴核对 → 保存到游戏内槽位」。
//
// v1（build-t58.mjs / t58.html）是三档并列的对照，看不出流程怎么推进；这版按用户的反馈重做：
// 一条连续的步骤流，每步一个横向条带（左侧写「这一步在干什么、草稿变成什么」，右侧摆真实界面），
// 顶栏有锚点导航。T58 的三处改动织进对应步骤：
//
//   步骤 4  读准当前子职业（现状只读卡 → 分组面板：超能/技能/星象/碎片 + 空槽占位）
//   步骤 5  星象碎片的属性加成自动进求解器（替掉手输的「技能与碎片属性变化」）
//   步骤 7  应用前的子职业指纹闸门（通过 / 漂移拦截，两态并排）
//
// 全部照产品的实现来（DOM 结构与类名逐条对齐 LoadoutsPageContentView.tsx）：
//   · 样式表   packages/ui/src/styles.css 整份内联，改产品 CSS 原型跟着变
//   · 入口     :354-410（loadout-context-toolbar / loadout-create-menu / loadout-create-options）
//   · 编辑器   :1435-1472（loadout-editor-head / loadout-build-canvas / 实时摘要）
//   · 槽位组   :1687-1718 + standardLoadoutSlots（3 武器 + 5 护甲，**不是 16 格**）
//   · 子职业   :1452-1454（草稿编辑器里的只读卡）、:662-700（游戏内子职业明细）
//   · 手工框   :1888-1898（ArmorFragmentAdjustmentsEditor，步骤 5 要替掉的那块）
//   · 穿戴     :1409-1420 / :2283-2307（LocalPlanExecutionPanel、loadout-plan-step-list）
//   · 存槽位   :2362-2398（loadout-slot-picker）
//
// 类名核对：.loadout-subclass-section 在 03-workspace.css 里 **0 条规则**，只有 .loadout-subclass-slot
// （:1892）与 .loadout-subclass-slot-static（:1897）。分组面板那套是**候选样式**，前缀 t58f-，标了
// 「候选」——产品目前没有这些类的定义，定案后再搬进产品，别让原型留着反向覆盖。
//
// 数据是**示例**，不是真实账号读取结果。原型定的是交互与信息分层，不用来核对游戏里的六维数值。
//
// 跑法：node build-t58-flow.mjs → 生成 t58-flow.html
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

// ── 占位图 ─────────────────────────────────────────────────────────────────
// 原型不接 Manifest。子职业图标在这套面板里承担「一眼分出超能/星象/碎片」的职责，
// 所以占位图必须带形状和色相，不能是纯色块——纯色块看不出分组到底分不分得开。
function icon(label, tone) {
  let hue = 0;
  for (const ch of String(label)) hue = (hue * 31 + ch.codePointAt(0)) % 360;
  if (typeof tone === "number") hue = tone;
  const glyph = String(label).slice(0, 1);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">'
    + '<rect width="36" height="36" fill="hsl(' + hue + ' 30% 20%)"/>'
    + '<circle cx="18" cy="18" r="11" fill="hsl(' + hue + ' 55% 52%)"/>'
    + '<text x="18" y="24" font-size="16" text-anchor="middle" fill="hsl(' + hue + ' 30% 12%)">' + glyph + "</text>"
    + "</svg>";
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

// ── 示例数据 ───────────────────────────────────────────────────────────────
const STATS = [
  ["health", "韧性"],
  ["melee", "力量"],
  ["grenade", "纪律"],
  ["super", "智力"],
  ["class", "职业"],
  ["weapon", "武器"]
];

const STAT_LABEL = Object.fromEntries(STATS);

const CHARACTERS = [
  { id: "c-titan", class_name: "泰坦", light: 2013, slots: 10 },
  { id: "c-hunter", class_name: "猎人", light: 2008, slots: 10 },
  { id: "c-warlock", class_name: "术士", light: 2001, slots: 8 }
];

// 虚空泰坦。星象 + 碎片的属性加成加起来必须等于面板合计（韧性 +20、职业 +10），
// 否则步骤 5 的求和表就对不上账，看不出「自动汇总」在做什么。
const SUBCLASS = {
  label: "虚空 · 哨兵",
  element: "虚空",
  subclass_hash: 2842471112,
  groups: [
    {
      key: "super", label: "超能", slots: 1, tone: 212,
      plugs: [{ name: "哨兵护盾", socket_index: 0 }]
    },
    {
      key: "ability", label: "近战", slots: 1, tone: 262,
      plugs: [{ name: "虚空护盾猛击", socket_index: 1 }]
    },
    {
      key: "ability", label: "手雷", slots: 1, tone: 262,
      plugs: [{ name: "磁吸手雷", socket_index: 2 }]
    },
    {
      key: "ability", label: "职业技能", slots: 1, tone: 262,
      plugs: [{ name: "高耸壁垒", socket_index: 3 }]
    },
    {
      // 2 个星象槽装满 —— 看「槽位数」和「装了几个」要不要分开说
      key: "aspects", label: "星象", slots: 2, tone: 168,
      plugs: [
        { name: "无畏冲锋", socket_index: 4, stats: { class: 10 } },
        { name: "壁垒", socket_index: 5 }
      ]
    },
    {
      // 5 个碎片槽只装 3 片 —— 空槽必须显式画出来，不能靠「少了就少了」
      key: "fragments", label: "碎片", slots: 5, tone: 42,
      plugs: [
        { name: "记忆碎片", socket_index: 6, stats: { health: 10 } },
        { name: "收割碎片", socket_index: 7, stats: { health: 10 } },
        { name: "坚持碎片", socket_index: 8, stats: { super: 10 } }
      ]
    }
  ]
};

// 求和：只加星象和碎片。超能/技能/职业技在游戏里不加属性，加进来会误导。
function subclassBonus(build) {
  const totals = {};
  const rows = [];
  for (const group of build.groups) {
    if (group.key !== "aspects" && group.key !== "fragments") continue;
    for (const plug of group.plugs) {
      if (!plug.stats) continue;
      rows.push({ name: plug.name, kind: group.label, changes: plug.stats });
      for (const [stat, value] of Object.entries(plug.stats)) totals[stat] = (totals[stat] ?? 0) + value;
    }
  }
  return { totals, rows };
}

const BONUS = subclassBonus(SUBCLASS);

// 闸门两态：配装记录的指纹 vs 角色此刻的配置。
// 按**集合**比，不按序列化顺序——DIM issue #8718 就是同一批碎片换个 socket 顺序被判成变化。
const GATE = {
  pass: {
    state: "pass",
    title: "配装假定的子职业配置 = 角色当前配置",
    detail: "虚空 · 哨兵 · 星象 2/2 · 碎片 3/5",
    rows: []
  },
  drift: {
    state: "block",
    title: "配装假定的子职业配置 ≠ 角色当前配置",
    detail: "配装记的是 3 片碎片，角色此刻只装了 2 片",
    rows: [
      { kind: "missing", label: "记忆碎片", note: "配装里有，角色当前没有" },
      { kind: "missing", label: "收割碎片", note: "配装里有，角色当前没有" },
      { kind: "same", label: "坚持碎片", note: "两边都有" },
      { kind: "extra", label: "勇气碎片", note: "角色当前装着，配装里没有" }
    ]
  }
};

// ── DOM 片段 ───────────────────────────────────────────────────────────────
function itemVisual(label, bucketName) {
  return '<span class="loadout-item-visual loadout-item-placeholder" aria-hidden="true">'
    + (String(bucketName).includes("武器") ? "W" : "A") + "</span>";
}

function slotRow(slot, index, target, match, armorRule, armorAssignment) {
  if (!target) {
    return '<li class="loadout-empty-standard-slot"><button type="button" id="loadout-slot-'
      + index + '" data-ui-kind="button">'
      + '<span class="loadout-slot-index">+</span>'
      + "<span><strong>" + slot + "</strong><small>"
      + (armorRule ? armorRule + " · 选择真实护甲" : "选择账号内真实装备")
      + "</small></span></button></li>";
  }
  const status = match.status;
  const tone = status === "selected" ? "success" : "warning";
  const statusLabel = {
    selected: "已选装备",
    available: "可选择装备",
    "needs-selection": "需要选择装备",
    "plug-unavailable": "目标模组无法安装",
    missing: "账号内未找到"
  }[status];
  return '<li class="loadout-item" data-status="' + tone + '" data-clickable="true" id="loadout-slot-' + index + '">'
    + '<button type="button" class="loadout-item-primary" aria-label="更换' + slot + '装备">'
    + itemVisual(target.name, slot)
    + '<div class="loadout-item-copy"><strong>' + target.name + "</strong><small>"
    + slot + " · " + target.item_type + "</small></div>"
    + '<div class="loadout-item-match"><strong>' + target.location + " · 装备标识 …" + target.instance_tail + "</strong><small>"
    + (armorAssignment ? armorRule + " · 计划能量 " + armorAssignment.final + "/" + armorAssignment.capacity
      : target.plug_count ? target.plug_count + " 项目标模组" : "未指定目标模组")
    + "</small></div></button>"
    + '<div class="loadout-item-actions"><span class="loadout-status-badge" data-status="' + tone + '">'
    + statusLabel + '</span><button type="button" data-ui-kind="button" data-control-variant="secondary">清空</button></div></li>';
}

function slotGroup(title, description, group, slots) {
  return '<section class="loadout-slot-editor-section loadout-slot-editor-' + group + '" aria-label="' + title + '">'
    + '<header class="loadout-local-section-head"><div><strong>' + title + "</strong><small>" + description + "</small></div>"
    + '<div class="loadout-section-head-actions"><span>' + slots.length + " 个固定槽位</span></div></header>"
    + '<ul class="loadout-item-list loadout-slot-editor-grid" data-group="' + group + '" data-surface="list">'
    + slots.map((slot) => slotRow(slot.name, slot.dom, slot.target, slot.match ?? { status: "unconfigured" }, slot.armorRule, slot.armorAssignment)).join("")
    + "</ul></section>";
}

// 分组面板：T58 步骤 4 的候选实现。产品今天没有这套类，前缀 t58f-。
function subclassPanel(build) {
  const groups = build.groups.map((group) => {
    const filled = group.plugs.length;
    const chips = group.plugs.map((plug) => {
      const bonuses = plug.stats
        ? Object.entries(plug.stats).map(([stat, value]) =>
          '<em class="t58f-chip-stat">' + STAT_LABEL[stat] + " +" + value + "</em>").join("")
        : "";
      return '<li class="t58f-chip"><img class="t58f-chip-icon" src="' + icon(plug.name, group.tone) + '" alt="" />'
        + '<span class="t58f-chip-name">' + plug.name + "</span>"
        + bonuses
        + '<span class="t58f-chip-socket">位置 ' + (plug.socket_index + 1) + "</span></li>";
    });
    const empties = Array.from({ length: Math.max(0, group.slots - filled) }, (_, i) =>
      '<li class="t58f-chip t58f-chip-empty"><span class="t58f-chip-icon t58f-chip-icon-empty" aria-hidden="true">+</span>'
      + '<span class="t58f-chip-name">未装' + group.label + "</span>"
      + '<span class="t58f-chip-socket">空位 ' + (filled + i + 1) + "/" + group.slots + "</span></li>").join("");
    return '<section class="t58f-group"><header class="t58f-group-head"><strong>' + group.label + "</strong>"
      + "<span>" + filled + "/" + group.slots + "</span></header>"
      + '<ul class="t58f-chip-list">' + chips.join("") + empties + "</ul></section>";
  });
  return '<div class="t58f-subclass-panel">'
    + '<header class="t58f-subclass-head">'
    + '<img class="t58f-subclass-icon" src="' + icon("虚", 212) + '" alt="" />'
    + "<div><strong>" + build.label + "</strong>"
    + "<small>定义 " + build.subclass_hash + " · 从角色当前装备读取 · 只读，不写回游戏</small></div>"
    + '<span class="t58f-pill">已读取</span></header>'
    + '<div class="t58f-groups">' + groups.join("") + "</div>"
    + '<p class="t58f-note">超能、技能、星象、碎片四组都来自角色当前装备的插槽，'
    + "空位显式画出来。面板只读：这四项不写回游戏（依据见 T58 backlog）。</p></div>";
}

// 今日的只读卡，用来对照步骤 4 之前长什么样。
function subclassStaticCard() {
  return '<article class="loadout-subclass-slot loadout-subclass-slot-static" data-surface="object-card" '
    + 'data-ui-kind="object-card" data-status="success"><span class="loadout-slot-index">S</span>'
    + "<div><strong>已记录子职业构筑</strong>"
    + "<small>4 技能 · 2 星相 · 5 碎片 · 定义 " + SUBCLASS.subclass_hash + "</small></div></article>";
}

function stepHead(no, title, copy, notes, draft) {
  return '<header class="t58f-step-head">'
    + '<span class="t58f-step-no">' + no + "</span>"
    + '<div class="t58f-step-copy"><h2>' + title + "</h2><p>" + copy + "</p>"
    + (notes && notes.length ? '<ul class="t58f-step-notes">' + notes.map((n) => "<li>" + n + "</li>").join("") + "</ul>" : "")
    + "</div>"
    + '<div class="t58f-draft"><span>草稿</span><strong>' + draft[0] + "</strong><small>" + draft[1] + "</small></div>"
    + "</header>";
}

function step(no, id, title, copy, notes, draft, stage) {
  return '<article class="t58f-step" id="' + id + '">'
    + stepHead(no, title, copy, notes, draft)
    + '<div class="t58f-stage" data-surface="page">' + stage + "</div>"
    + "</article>";
}

// 顶栏（角色 + 视图 + 新建配装菜单），步骤 1 与步骤 2 都用得上。
function loadoutToolbar(menuOpen) {
  return '<div class="loadout-context-toolbar" data-surface="section">'
    + '<div class="loadout-context-group"><span class="loadout-context-label">角色</span>'
    + '<div class="loadout-character-tabs" data-ui-kind="context-switcher" role="group" aria-label="配装角色上下文">'
    + CHARACTERS.map((character, index) =>
      '<button type="button" aria-pressed="' + (index === 0) + '" tabIndex="' + (index === 0 ? 0 : -1) + '" key="' + character.id + '">'
      + '<span class="loadout-character-mark" aria-hidden="true">' + character.class_name.slice(0, 1) + "</span>"
      + "<strong>" + character.class_name + "</strong><small>" + character.slots + " 槽</small></button>").join("")
    + "</div></div>"
    + '<span class="loadout-context-divider" aria-hidden="true"></span>'
    + '<div class="loadout-context-group"><span class="loadout-context-label">视图</span>'
    + '<div class="loadout-mode-tabs" data-ui-kind="segmented-control" role="tablist" aria-label="配装类型">'
    + '<button type="button" role="tab" aria-selected="false">游戏内配装 <span>Bungie</span></button>'
    + '<button type="button" role="tab" aria-selected="true">应用配装 <span>d2-tools</span></button>'
    + "</div></div>"
    + '<div class="loadout-context-actions"><details class="loadout-create-menu"' + (menuOpen ? " open" : "") + ">"
    + '<summary data-ui-kind="button" data-control-variant="primary" aria-haspopup="true">新建配装</summary>'
    + '<div class="loadout-create-options" data-surface="menu" data-ui-kind="command-menu" aria-label="应用配装创建方式">'
    + "<button type=\"button\"><strong>使用当前装备</strong><span>使用当前角色已装备内容</span></button>"
    + "<button type=\"button\"><strong>更多：导入 DIM</strong><span>从自包含的完整链接预填配装，全程本地解析</span></button>"
    + "<button type=\"button\"><strong>空白方案</strong><span>带入目标角色后逐槽位创建</span></button>"
    + "</div></details></div></div>";
}

function editorHead(draft, options) {
  const state = options.saved ? "已保存" : options.dirty ? "有未保存修改" : "尚未保存";
  const stateTone = options.saved && !options.dirty ? "ready" : "warning";
  return '<header class="loadout-subpage-head loadout-editor-head">'
    + '<button class="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary">返回方案库</button>'
    + '<div class="loadout-editor-title-block">'
    + '<span class="loadout-eyebrow">' + (draft.source_label || "应用内创建") + " · " + (options.saved ? "编辑已保存方案" : "未保存草稿") + "</span>"
    + '<div class="loadout-editor-title-fields">'
    + "<label><span>方案名称</span><input value=\"" + draft.name + "\" aria-label=\"配装名称\" placeholder=\"未命名方案\" /></label>"
    + "<label><span>目标角色</span><select aria-label=\"目标角色\">"
    + '<option value="">仅限定 ' + (draft.class_name || "职业") + "</option>"
    + CHARACTERS.map((character) => '<option value="' + character.id + '"'
      + (character.id === draft.target_character_id ? " selected" : "") + ">"
      + character.class_name + " · " + character.slots + " 个游戏内槽位</option>").join("")
    + "</select></label></div></div>"
    + '<div class="loadout-action-stack">'
    + '<span class="loadout-editor-save-state" data-status="' + stateTone + '">' + state + "</span>"
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary"' + (options.saved && !options.dirty ? "" : " disabled") + ">保存</button>"
    + '<button id="loadout-open-wear-review" type="button" data-ui-kind="button" data-control-variant="primary"'
    + (options.saved ? "" : " disabled") + ">" + (options.saved ? "穿戴" : "保存后穿戴") + "</button>"
    + "</div></header>";
}

// 实时摘要。DOM 严格照 EditorDecisionSummary（:1639-1651）：dl/dt/dd、.loadout-summary-metrics、
// .loadout-persisted-armor-pieces 的 span/strong/small、以及 .loadout-summary-checks 的「span + span」。
// 少一层 span，li 的 16px 首列会把文字挤成一字一行——那种坏法看着不像坏，像排得怪。
function summaryHead(status, label) {
  return '<div class="loadout-decision-pane-head"><div><strong>实时摘要</strong>'
    + "<small>基于当前草稿和账号装备数据</small></div>"
    + '<span data-status="' + status + '">' + label + "</span></div>";
}

function summaryChecks(rows) {
  return '<section class="loadout-summary-checks"><h3>当前问题</h3><ul>'
    + rows.map((row) => '<li data-status="' + row[0] + '"><span>' + (row[0] === "warning" ? "!" : "✓")
      + "</span><span>" + row[1] + "</span></li>").join("")
    + "</ul></section>";
}

function decisionSummary() {
  return '<aside class="loadout-build-summary" aria-label="构筑实时摘要">'
    + summaryHead("warning", "仍需处理")
    + '<div class="loadout-summary-empty"><strong>尚未选择护甲方案</strong>'
    + "<span>在“护甲与模组”中运行自动配甲并使用一个库存或升级方案后，这里会显示最终六维和逐件安排。</span></div>"
    + summaryChecks([
      ["success", "目标角色：泰坦"],
      ["warning", "0 个装备目标等待选择具体装备"],
      ["success", "0 个缺失或模组无法安装问题"]
    ])
    + "</aside>";
}

// 采用求解结果之后的实时摘要。
function decisionSummaryAccepted() {
  const stats = [["韧性", 102, 100], ["力量", 38, undefined], ["纪律", 62, undefined],
    ["智力", 45, undefined], ["职业", 58, 50], ["武器", 34, undefined]];
  const pieces = [
    ["头盔", "先兆之壳", "属性模组 +10 韧性 · 最终能量 8/8"],
    ["臂铠", "先兆之握", "属性模组 +5 纪律 · 最终能量 9/9"],
    ["胸甲", "先兆之心", "其余模组 4 项 · 最终能量 10/10"],
    ["腿甲", "先兆之胫", "其余模组 3 项 · 最终能量 8/8"],
    ["职业物品", "先兆之印", "其余模组 2 项 · 最终能量 7/7"]
  ];
  return '<aside class="loadout-build-summary" aria-label="构筑实时摘要">'
    + summaryHead("ready", "可准备穿戴")
    + '<div class="loadout-selected-candidate-title" data-status="ready"><span>已保存逐件护甲计划</span>'
    + "<strong>五个部位已恢复</strong>"
    + "<small>摘要来自草稿中的具体装备、模组与能量安排，不依赖临时计算结果。</small></div>"
    + '<dl class="loadout-summary-stat-grid">'
    + stats.map(([label, value, min]) => '<div data-status="ready"><dt>' + label + "</dt><dd><strong>"
      + value + "</strong><small>" + (min === undefined ? "未设目标" : "目标 " + min) + "</small></dd></div>").join("")
    + "</dl>"
    + '<div class="loadout-summary-metrics">'
    + "<div><span>距离目标</span><strong>0</strong></div>"
    + "<div><span>超出目标</span><strong>12</strong></div>"
    + "<div><span>逐件计划</span><strong>5/5</strong></div>"
    + "<div><span>属性模组</span><strong>+5 × 2 · +10 × 1</strong></div></div>"
    + '<div class="loadout-persisted-armor-pieces">'
    + pieces.map((piece) => "<div><span>" + piece[0] + "</span><strong>" + piece[1]
      + "</strong><small>" + piece[2] + "</small></div>").join("")
    + "</div>"
    + summaryChecks([
      ["success", "目标角色：泰坦"],
      ["success", "0 个装备目标等待选择具体装备"],
      ["success", "0 个缺失或模组无法安装问题"]
    ])
    + "</aside>";
}

const ARMOR_RULES = [
  ["头盔", "属性模组 +10 韧性"],
  ["臂铠", "属性模组 +5 纪律"],
  ["胸甲", "自动"],
  ["腿甲", "自动"],
  ["职业物品", "不装"]
];

// 「技能与碎片属性变化」在护甲规划面板里的位置：折叠区「更多配装条件」里面。
// 两边都套同一层，读的人才知道这块挂在哪儿。
function advancedSettingsShell(inner) {
  return '<details class="loadout-armor-advanced-settings" open>'
    + "<summary><span>更多配装条件</span>"
    + "<small>当前库存 · 优先顺序、碎片、套装与装备范围</small></summary>"
    + inner + "</details>";
}

// ── 步骤 1 · 选入口 ────────────────────────────────────────────────────────
const W = "W";
// 入口条数只在这一个数组里数。之前标题改成「五条」、末尾卡片还留着「四条」，
// 两处各写一份数字就会这样漂——凡是页面里报了数的地方，都从这个数组拼。
const ENTRY_ROWS = [
  ["顶栏 · 使用当前装备", "current-equipment", "把目标角色身上 16 格装备逐条搬成 item_targets，每件抄下当前已装的全部 plug。"],
  ["顶栏 · 空白方案", "manual", "只带目标角色的 class_name / character_id，item_targets 为空，逐槽位从头选。"],
  ["顶栏 · 导入 DIM", "dim-import", "从自包含链接本地解析出装备目标与护甲约束，不联网、不调 Bungie。"],
  ["游戏内槽位 · 复制到应用配装", "bungie-loadout", "复制某个 Bungie 官方槽位。**唯一一条会把子职业单独摘出来的入口**（见步骤 4）。"],
  ["AI 助手产出物 · 预填草稿", "assistant", "助手给出的装备目标或护甲方案落成草稿，带 guidance.warnings，编辑器顶部出「攻略解析待确认」。"]
];
const ENTRY_WORDS = ["零", "一", "两", "三", "四", "五", "六", "七", "八", "九"];
const ENTRY_COUNT = ENTRY_WORDS[ENTRY_ROWS.length];
const STAGE_1 =
  '<section class="loadout-page">'
  + loadoutToolbar(true)
  + '<div class="t58f-stage-note">菜单展开的那一项就是入口。' + ENTRY_COUNT + '条入口的差别只有「草稿预填了什么」，'
  + "选定后都进同一个草稿编辑器。菜单是绝对定位的浮层，下面这几张卡是给它让出位置才空开的。</div>"
  + '<div class="t58f-entry-grid">'
  + ENTRY_ROWS.concat([
    ["（共同点）", "", ENTRY_COUNT + "条入口的产物都是同一个 CreateLocalLoadoutPlanInput：没有 id / created_at / updated_at，保存时才补。"]
  ]).map((row, index) => {
    const danger = row[1] === "" ? ' data-muted="true"' : "";
    return '<article class="t58f-entry"' + danger + '><span class="t58f-entry-no">' + String(index + 1).padStart(2, "0") + "</span>"
      + "<div><strong>" + row[0] + "</strong><p>" + row[2].replace(/\*\*/g, "") + "</p>"
      + (row[1] ? '<code>source.kind = "' + row[1] + '"</code>' : "") + "</div></article>";
  }).join("")
  + "</div></section>";

// ── 步骤 2 · 目标角色 + 起点 ───────────────────────────────────────────────
const STAGE_2 =
  '<section class="loadout-page">'
  + editorHead({
    name: "泰坦 光等 2013",
    class_name: "泰坦",
    target_character_id: "c-titan",
    source_label: "当前装备"
  }, { saved: false, dirty: true })
  + '<section class="loadout-editor-decision-workspace">'
  + '<main class="loadout-build-canvas">'
  + '<div class="loadout-decision-pane-head"><div><strong>当前构筑</strong>'
  + "<small>子职业、三件武器和五件护甲使用同一个未保存草稿</small></div><span>0/8 槽已配置</span></div>"
  + '<section class="loadout-build-start" aria-label="开始创建配装"><div>'
  + '<span class="loadout-eyebrow">选择构筑起点</span><h3>先确定从哪里开始</h3>'
  + "<p>可以带入当前角色装备、先运行护甲规划，或直接选择第一个装备槽位。</p></div>"
  + '<div class="loadout-build-start-actions">'
  + '<button type="button" data-ui-kind="button" data-control-variant="primary">从当前装备开始</button>'
  + '<button id="loadout-open-armor-planner" type="button" data-ui-kind="button" data-control-variant="secondary">按属性目标自动配甲</button>'
  + '<button type="button" data-ui-kind="button" data-control-variant="secondary">手动选择装备</button>'
  + "</div></section>"
  + '<div class="t58f-stage-note">「从当前装备开始」会把 16 格全搬成 item_targets——'
  + "<strong>包括子职业那一格</strong>（见 T58 现状第 5 条：plans.ts 无过滤映射 equipped_items，"
  + "characterEquipment 前 16 格含子职业）。步骤 4 要修的就是这条。</div>"
  + "</main>"
  + decisionSummary()
  + "</section></section>";

// ── 步骤 3 · 逐槽位选装备 ─────────────────────────────────────────────────
const WEAPON_SLOTS = [
  {
    name: "动能武器", dom: "kinetic",
    target: { name: "伊卡洛斯之矛", item_type: "脉冲步枪", instance_tail: "9c41", location: "已装备", plug_count: 5 },
    match: { status: "selected" }
  },
  {
    name: "能量武器", dom: "energy",
    target: { name: "淬火之刃", item_type: "融合步枪", instance_tail: "2ab7", location: "角色库存", plug_count: 4 },
    match: { status: "selected" }
  },
  {
    name: "威能武器", dom: "power",
    target: { name: "明日之眼", item_type: "火箭发射器", instance_tail: "77e0", location: "仓库", plug_count: 3 },
    match: { status: "selected" }
  }
];

const ARMOR_SLOTS = [
  {
    name: "头盔", dom: "helmet",
    target: { name: "先兆之壳", item_type: "头盔", instance_tail: "31f5", location: "仓库" },
    match: { status: "selected" }, armorRule: "属性模组 +10 韧性"
  },
  { name: "臂铠", dom: "arms", armorRule: "属性模组 +5 纪律" },
  { name: "胸甲", dom: "chest", armorRule: "自动" },
  { name: "腿甲", dom: "legs", armorRule: "自动" },
  { name: "职业物品", dom: "class", armorRule: "不装" }
];

const STAGE_3 =
  '<section class="loadout-page">'
  + editorHead({
    name: "泰坦 光等 2013",
    class_name: "泰坦",
    target_character_id: "c-titan",
    source_label: "当前装备"
  }, { saved: false, dirty: true })
  + '<section class="loadout-editor-decision-workspace">'
  + '<main class="loadout-build-canvas">'
  + '<div class="loadout-decision-pane-head"><div><strong>当前构筑</strong>'
  + "<small>子职业、三件武器和五件护甲使用同一个未保存草稿</small></div><span>4/8 槽已配置</span></div>"
  + '<section class="loadout-slot-editor-section loadout-subclass-section" aria-label="子职业">'
  + '<header class="loadout-local-section-head"><div><strong>子职业构筑</strong>'
  + "<small>优先展示已确认的技能、星相和碎片语义</small></div>"
  + '<div class="loadout-section-head-actions"><span>当前仅记录</span></div></header>'
  + subclassStaticCard()
  + "</section>"
  + slotGroup("武器", "动能、能量和威能紧凑排列，空槽不占据构筑主视野", "weapon", WEAPON_SLOTS)
  + slotGroup("护甲与模组", "五件护甲分别保存调整、属性模组、其他模组与能量占用", "armor", ARMOR_SLOTS)
  + '<div class="t58f-stage-note">点空槽开 ItemPickerDrawer（搜索 + 位置筛选：全部/已装备/角色库存/仓库，带计数）。'
  + "选中实例时产品把该实例<strong>当前已装的全部 plug 原样抄进</strong> <code>plug_hashes</code>"
  + "（selectItemForStandardSlot，:1336）——所以武器特长是「照抄现状」，不是逐项挑。</div>"
  + "</main>"
  + decisionSummary()
  + "</section></section>";

// ── 步骤 4 · 子职业（T58 改动 ①）──────────────────────────────────────────
const STAGE_4 =
  '<section class="loadout-page"><div class="t58f-compare">'
  + '<section class="t58f-compare-col t58f-compare-before">'
  + '<header class="t58f-compare-head"><span class="t58f-tag t58f-tag-before">现状</span>'
  + "<strong>一张只读卡，什么都看不见</strong>"
  + "<small>LoadoutsPageContentView.tsx:1452-1454</small></header>"
  + '<section class="loadout-slot-editor-section loadout-subclass-section">'
  + '<header class="loadout-local-section-head"><div><strong>子职业构筑</strong>'
  + "<small>优先展示已确认的技能、星相和碎片语义</small></div>"
  + '<div class="loadout-section-head-actions"><span>当前仅记录</span></div></header>'
  + subclassStaticCard()
  + "</section>"
  + '<ul class="t58f-issue">'
  + "<li>只报计数：<code>4 技能 · 2 星相 · 5 碎片</code>。装的到底是哪几片，看不到。</li>"
  + "<li>图标上游已经取到了（<code>summary.ts:1915</code>），展示时被丢掉（<code>:643-646</code>）。</li>"
  + "<li>空位不建模：碎片槽 5 个装了 3 片，界面上看不出还差 2 片。</li>"
  + "<li>没有英文 key，英文界面回落中文（<code>i18n/copy/loadouts.ts</code> 无子职业术语）。</li>"
  + "<li><strong>不能编辑</strong>——也确实不该能编辑：这一组不写回游戏。</li>"
  + "</ul></section>"
  + '<section class="t58f-compare-col t58f-compare-after">'
  + '<header class="t58f-compare-head"><span class="t58f-tag t58f-tag-after">候选</span>'
  + "<strong>四组分开、图标在位、空槽显式</strong>"
  + "<small>t58f-* 是候选样式，产品暂无同名类</small></header>"
  + subclassPanel(SUBCLASS)
  + '<ul class="t58f-issue t58f-issue-ok">'
  + "<li>分组用 Manifest 自己的 <code>plugCategoryIdentifier</code> 后缀（<code>.aspects</code> / <code>.fragments</code>），"
  + "不靠关键词猜。ability 那条兜底也要改走 Manifest 分类。</li>"
  + "<li>每片带属性加成的直接标在 chip 上——这一步的产出就是步骤 5 的输入。</li>"
  + "<li>面板仍然只读。<strong>不做写回</strong>：DIM issue #10344 / #8750 记录无谓改动会让玩家丢掉全部超能/技能能量。</li>"
  + "</ul></section>"
  + "</div></section>";

// ── 步骤 5 · 护甲约束与求解（T58 改动 ②）─────────────────────────────────
function fragmentAdjustmentsBefore() {
  return '<section class="loadout-armor-fragment-adjustments" aria-label="技能与碎片属性变化">'
    + '<div class="loadout-armor-constraint-head"><div><strong>技能与碎片属性变化</strong>'
    + "<small>填写构筑中已经确定的额外属性变化，可使用负数。</small></div></div>"
    + "<div>" + STATS.map(([, label]) =>
      "<label><span>" + label + '</span><input type="number" step="5" value="0" /></label>').join("") + "</div>"
    + "</section>";
}

function fragmentAdjustmentsAfter() {
  // 注意：产品那条输入栅格写在 `.loadout-armor-fragment-adjustments > div:last-child`
  // （03-workspace.css:1391）。**这个 section 里最后那个 div 必须是输入行**——
  // 在后面追加任何东西（求和明细、说明、按钮），栅格立刻塌成单列。
  // 所以求和明细做成兄弟节点，不塞进这个 section。
  return '<section class="loadout-armor-fragment-adjustments t58f-auto" aria-label="技能与碎片属性变化">'
    + '<div class="loadout-armor-constraint-head"><div><strong>技能与碎片属性变化</strong>'
    + "<small>从角色当前子职业的星象与碎片求和，随步骤 4 的读数自动更新。</small></div>"
    + '<div class="t58f-head-actions"><span class="t58f-pill">自动</span>'
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary">手动覆盖</button></div></div>'
    + "<div>" + STATS.map(([key, label]) => {
      const value = BONUS.totals[key] ?? 0;
      return "<label" + (value ? ' data-auto="true"' : "") + "><span>" + label + "</span>"
        + '<input type="number" step="5" value="' + value + '" readonly /></label>';
    }).join("") + "</div>"
    + "</section>"
    + fragmentSumDetail();
}

function fragmentSumDetail() {
  const rows = BONUS.rows.map((row) =>
    '<li><strong>' + row.name + '</strong><span class="t58f-kind">' + row.kind + "</span>"
    + Object.entries(row.changes).map(([stat, value]) =>
      '<em class="t58f-change">' + STAT_LABEL[stat] + " +" + value + "</em>").join("")
    + "</li>").join("");
  return '<details class="t58f-sum-detail" open><summary>求和明细 · ' + BONUS.rows.length + " 项</summary>"
    + '<ul class="t58f-sum-list">' + rows + "</ul>"
    + '<p class="t58f-note">只加星象和碎片。超能、近战、手雷、职业技能在游戏里不加属性，收进来会误导。'
    + "玩家在游戏里换了碎片，这里跟着变——所以穿戴前那道闸门（步骤 7）是必需的。</p></details>";
}

// 护甲规划面板的左栏。DOM 照 LoadoutsPageContentView.tsx:1372-1396，逐块对齐，
// 类名全部用产品自己的（loadout-armor-mod-plan / -constraint-head / -advanced-section …）。
function armorConstraintsPane() {
  const modRules = [
    ["头盔", "plus10", "韧性", "+10 × 1 · 自动 4"],
    ["臂铠", "plus5", "纪律", "+5 × 1"],
    ["胸甲", "auto", null, null],
    ["腿甲", "auto", null, null],
    ["职业物品", "none", null, null]
  ];
  return '<aside class="loadout-armor-constraints-pane" aria-label="护甲配装设置">'
    + '<div class="loadout-decision-pane-head"><strong>配装设置</strong><small>修改后需要重新计算推荐方案</small></div>'
    + '<div id="loadout-armor-planner-panel" role="tabpanel">'
    + '<div class="loadout-armor-constraint-grid">'
    + STATS.map(([key, label]) => "<label><span>" + label
      + '最低值</span><input type="number" min="0" step="5" value="' + ({ health: 100, class: 50 }[key] ?? 0) + '" /></label>').join("")
    + "</div>"
    + '<section class="loadout-armor-mod-plan" aria-label="逐部位属性模组">'
    + '<div class="loadout-armor-constraint-head"><div><strong>逐部位属性模组</strong>'
    + "<small>每个部位独立决定自动、不安装、+5 或 +10；固定数值后仍可指定属性。</small></div>"
    + '<span aria-live="polite">+5 × 1 · +10 × 1 · 自动 2</span></div>'
    + '<div class="loadout-armor-mod-slot-rules">'
    + modRules.map(([slot, mode, stat]) => '<div class="loadout-armor-mod-slot-rule" data-status="ready">'
      + '<div class="loadout-armor-mod-slot-head"><strong>' + slot + "</strong></div>"
      + '<div class="loadout-armor-mod-mode" role="radiogroup" aria-label="' + slot + '属性模组">'
      + [["auto", "自动"], ["none", "不装"], ["plus5", "+5"], ["plus10", "+10"]]
        .map(([value, label]) => '<label' + (mode === value ? ' data-selected="true"' : "") + '>'
          + '<input type="radio" name="armor-stat-mod-' + slot + '" value="' + value + '"'
          + (mode === value ? " checked" : "") + " /><span>" + label + "</span></label>").join("")
      + "</div>"
      + (stat ? '<label class="loadout-armor-mod-stat"><span>增加属性</span><select><option>' + stat
        + "</option></select></label>" : "")
      + "</div>").join("")
    + "</div>"
    + '<details class="loadout-armor-tuning-note"><summary>计算说明</summary>'
    + "<p>T5 护甲调整由系统逐件自动选择，不消耗能量，也不计入属性模组数量。</p></details>"
    + '<div class="loadout-armor-mod-preflight" data-status="success">'
    + "<strong>五个部位的属性模组设置可满足。</strong></div></section>"
    + '<details class="loadout-armor-advanced-settings" open>'
    + "<summary><span>更多配装条件</span><small>当前库存 · 优先顺序、碎片、套装与装备范围</small></summary>"
    + '<section class="loadout-armor-advanced-section" aria-label="规划方式">'
    + '<div class="loadout-armor-constraint-head"><div><strong>规划方式</strong>'
    + "<small>普通配装直接使用当前库存；其他方式用于理论、待刷和升级分析。</small></div></div>"
    + '<div class="loadout-armor-mode-control">'
    + [["owned", "当前库存"], ["theoretical", "理论上限"], ["acquisition", "待刷目标"], ["upgrade", "升级路径"]]
      .map(([value, label]) => '<button type="button" aria-pressed="' + (value === "owned") + '">' + label + "</button>").join("")
    + "</div></section>"
    + '<section class="loadout-armor-priority-editor" aria-label="属性优先顺序">'
    + '<div class="loadout-armor-constraint-head"><div><strong>属性优先顺序</strong>'
    + "<small>求解遇到多个等优方案时按这个顺序取舍。</small></div></div>"
    + "<ol>" + [["1", "韧性"], ["2", "职业"], ["3", "纪律"]]
      .map(([no, label]) => "<li><span>" + no + "</span><strong>" + label + "</strong></li>").join("")
    + "</ol></section>"
    + fragmentAdjustmentsAfter()
    + '<section class="loadout-armor-constraint-section" aria-label="套装要求">'
    + '<div class="loadout-armor-constraint-head"><div><strong>套装要求</strong>'
    + "<small>不限制 / 指定 2 件套 / 指定 4 件套 / 两个 2 件套。</small></div></div>"
    + '<p class="t58f-note">组合方式：<strong>两个 2 件套</strong> · 先兆（2）· 星火（2）</p></section>'
    + '<section class="loadout-armor-constraint-section" aria-label="装备范围">'
    + '<div class="loadout-armor-constraint-head"><div><strong>当前库存范围</strong>'
    + "<small>已装备 / 角色背包 / 仓库 / 邮政官，至少留一个。</small></div></div>"
    + '<p class="t58f-note">四个位置全部勾选 · 未固定异域护甲 · 排除 1 件</p></section>'
    + "</details>"
    + "</div>"
    + '<div class="loadout-armor-calculate-bar" data-status="neutral">'
    + "<span>设置完成，可以查看推荐方案。</span>"
    + '<button type="button" data-ui-kind="button" data-control-variant="primary">计算达标方案</button></div>'
    + "</aside>";
}

function armorResultsPane() {
  return '<main class="loadout-armor-results-pane">'
    + '<div class="loadout-decision-pane-head"><div><strong>推荐方案</strong>'
    + "<small>5 个结果 · 已选 0/3 比较</small></div></div>"
    + '<p class="loadout-callout" data-ui-kind="callout" data-status="success">已找到 5 个达标方案。</p>'
    + candidateCard()
    + "</main>";
}

function armorSummaryPane() {
  const stats = [["韧性", 102, 100], ["力量", 38, undefined], ["纪律", 62, undefined],
    ["智力", 45, undefined], ["职业", 58, 50], ["武器", 34, undefined]];
  return '<aside class="loadout-armor-summary-pane" aria-label="方案摘要">'
    + '<div class="loadout-decision-pane-head"><strong>方案摘要</strong><small>选中候选的六维对照</small></div>'
    + '<dl class="loadout-summary-stat-grid">'
    + stats.map(([label, value, min]) => '<div data-status="ready"><dt>' + label + "</dt><dd><strong>"
      + value + "</strong><small>" + (min === undefined ? "未设目标" : "目标 " + min) + "</small></dd></div>").join("")
    + "</dl>"
    + '<div class="loadout-summary-metrics">'
    + "<div><span>距离目标</span><strong>0</strong></div>"
    + "<div><span>超出目标</span><strong>12</strong></div>"
    + "<div><span>套装效果</span><strong>先兆 ×2 · 星火 ×2</strong></div>"
    + "<div><span>属性模组</span><strong>+5 × 2 · +10 × 1</strong></div></div>"
    + "</aside>";
}

const STAGE_5 =
  '<section class="loadout-page"><div class="t58f-compare">'
  + '<section class="t58f-compare-col t58f-compare-before">'
  + '<header class="t58f-compare-head"><span class="t58f-tag t58f-tag-before">现状</span>'
  + "<strong>用户自己数、自己敲</strong>"
  + "<small>LoadoutsPageContentView.tsx:1888-1898</small></header>"
  + '<div class="t58f-pane">' + advancedSettingsShell(fragmentAdjustmentsBefore()) + "</div>"
  + '<ul class="t58f-issue">'
  + "<li>六个框，默认全 0。要填对，得先在游戏里把星象和碎片加起来数个遍。</li>"
  + "<li>这个值直接决定求解结果：<code>fragment_stat_bonuses</code> 被加进基础属性"
  + "（<code>armorSolver.ts:201</code>）并作为 <code>fragment_adjustments</code> 传给 planner（<code>:1182</code>）。</li>"
  + "<li>填错了求解器不会报错——它会照着一个错的起点算出一套达标的护甲，然后穿戴时才翻车。</li>"
  + "</ul></section>"
  + '<section class="t58f-compare-col t58f-compare-after">'
  + '<header class="t58f-compare-head"><span class="t58f-tag t58f-tag-after">候选</span>'
  + "<strong>从步骤 4 自动求和，可覆盖</strong>"
  + "<small>手工框保留，只是不再是默认来源</small></header>"
  + '<div class="t58f-pane">' + advancedSettingsShell(fragmentAdjustmentsAfter()) + "</div>"
  + '<ul class="t58f-issue t58f-issue-ok">'
  + "<li>加成的来源是每个 plug 自带的 <code>armor_stat_modifiers</code>（<code>summary.ts:2034</code>），"
  + "由早就加载的 <code>investmentStats</code> 算出——不需要新数据、不用 full 模式。</li>"
  + "<li>空槽不加分，所以读数和游戏内六维面板能对上；对不上就说明分类收错了。</li>"
  + "<li>「手动覆盖」保留：求解器契约本来就有这个入口，只是默认值不再靠人填。</li>"
  + "<li>实现注意：输入栅格挂在 <code>.loadout-armor-fragment-adjustments &gt; div:last-child</code>"
  + "（<code>03-workspace.css:1391</code>）。要往这个 section 里追加求和明细或说明，栅格会塌成单列——"
  + "所以明细做成兄弟节点。</li>"
  + "</ul></section>"
  + "</div>"
  + '<div class="t58f-stage-note">这支线接在护甲规划面板里：'
  + '<code>details.loadout-armor-advanced-settings</code>「更多配装条件」→ 第 3 块。'
  + "求解入口是 <code>loadout-armor-calculate-bar</code> 的主按钮，按 <code>planner_mode</code> 分派到"
  + "owned / theoretical / acquisition / upgrade 四个 planner，<code>limit: 5</code>。</div>"
  + "</section>";

// ── 步骤 6 · 采用方案 + 保存 ──────────────────────────────────────────────
// 候选卡。DOM 照 ArmorCandidateList（:2029-2033）：header 的序号 + 标题/副文 + 比较复选框，
// dl/dt/dd 的六维对照，.loadout-candidate-pieces > .loadout-armor-piece-list 的逐件明细。
function candidateCard() {
  const stats = [["韧性", 102, 100], ["力量", 38, undefined], ["纪律", 62, undefined],
    ["智力", 45, undefined], ["职业", 58, 50], ["武器", 34, undefined]];
  return '<article class="loadout-armor-candidate" data-status="success">'
    + "<header><span>01</span>"
    + "<div><strong>方案 1 · 库存内可达</strong>"
    + "<small>已装备 2 件 · 需转移 3 件 · 相对目标角色替换 0 件</small></div>"
    + '<div class="loadout-candidate-header-actions"><em>全部要求已满足</em>'
    + '<label><input type="checkbox" /><span>加入比较</span></label></div></header>'
    + '<div class="loadout-candidate-metrics">'
    + "<div><span>距离目标</span><strong>0</strong></div>"
    + "<div><span>最大单项差值</span><strong>0</strong></div>"
    + "<div><span>超出目标</span><strong>12</strong></div>"
    + "<div><span>套装效果</span><strong>先兆 ×2 · 星火 ×2</strong></div></div>"
    + '<dl class="loadout-armor-stat-comparison">'
    + stats.map(([label, value, min]) => '<div data-status="success"><dt>' + label + "</dt><dd><strong>"
      + value + "</strong><small>" + (min === undefined ? "未设下限" : "目标 ≥ " + min) + "</small></dd></div>").join("")
    + "</dl>"
    + '<details class="loadout-candidate-pieces"><summary>查看五件护甲、调整、模组与能量</summary>'
    + '<div class="loadout-armor-piece-list">'
    + [["头盔", "先兆之壳", "仓库 · 装备标识 …31f5 · 属性模组 +10 韧性 · 其他模组 4 项 · 最终能量 8/8"],
      ["臂铠", "先兆之握", "已装备 · 装备标识 …a902 · 属性模组 +5 纪律 · 其他模组 5 项 · 最终能量 9/9"],
      ["胸甲", "先兆之心", "角色库存 · 装备标识 …8d2a · 其余模组 4 项 · 最终能量 10/10"],
      ["腿甲", "先兆之胫", "仓库 · 装备标识 …4f19 · 其余模组 3 项 · 最终能量 8/8"],
      ["职业物品", "先兆之印", "角色库存 · 装备标识 …b703 · 其余模组 2 项 · 最终能量 7/7"]]
      .map((piece) => "<div><span>" + piece[0] + "</span><strong>" + piece[1]
        + "</strong><small>" + piece[2] + "</small></div>").join("")
    + "</div></details>"
    + "<footer><span>+5 属性模组 × 2，+10 属性模组 × 1 · 超出目标 12</span>"
    + "<span>先兆 ×2 · 星火 ×2</span>"
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary">使用这套方案</button></footer>'
    + "</article>";
}

const STAGE_6 =
  '<section class="loadout-page">'
  + editorHead({
    name: "泰坦 光等 2013",
    class_name: "泰坦",
    target_character_id: "c-titan",
    source_label: "当前装备"
  }, { saved: true, dirty: false })
  + '<section class="loadout-editor-decision-workspace">'
  + '<main class="loadout-build-canvas">'
  + '<div class="loadout-decision-pane-head"><div><strong>当前构筑</strong>'
  + "<small>子职业、三件武器和五件护甲使用同一个未保存草稿</small></div><span>8/8 槽已配置</span></div>"
  + '<section class="loadout-slot-editor-section loadout-subclass-section">'
  + '<header class="loadout-local-section-head"><div><strong>子职业构筑</strong>'
  + "<small>优先展示已确认的技能、星相和碎片语义</small></div>"
  + '<div class="loadout-section-head-actions"><span>当前仅记录</span></div></header>'
  + '<div class="t58f-compact">' + subclassPanel(SUBCLASS) + "</div></section>"
  + slotGroup("武器", "动能、能量和威能紧凑排列，空槽不占据构筑主视野", "weapon", WEAPON_SLOTS)
  + slotGroup("护甲与模组", "五件护甲分别保存调整、属性模组、其他模组与能量占用", "armor",
    ARMOR_SLOTS.map((slot, index) => index === 0 ? slot : {
      name: slot.name, dom: slot.dom, armorRule: slot.armorRule,
      target: { name: ["", "", "先兆之心", "先兆之胫", "先兆之印"][index], item_type: slot.name, instance_tail: ["", "", "8d2a", "4f19", "b703"][index], location: ["", "", "角色库存", "仓库", "角色库存"][index] },
      match: { status: "selected" },
      armorAssignment: { final: [8, 9, 10, 8, 7][index], capacity: [8, 9, 10, 8, 7][index] }
    }))
  + '<section class="loadout-inline-armor-planner" aria-label="按属性目标自动配甲">'
  + '<header class="loadout-inline-armor-head"><div><span class="loadout-eyebrow">护甲与模组 · 当前库存</span>'
  + '<h3 id="loadout-inline-armor-title" tabIndex="-1">按属性目标自动配甲</h3>'
  + "<p>先设置五个部位的属性模组，再从推荐方案中选择一套写回当前构筑。</p></div>"
  + '<div><button type="button" data-ui-kind="button" data-control-variant="secondary">收起</button></div></header>'
  + '<section class="loadout-armor-decision-workspace" aria-label="按属性目标自动配甲">'
  + armorConstraintsPane()
  + armorSummaryPane()
  + armorResultsPane()
  + "</section></section>"
  + '<div class="t58f-stage-note">点「使用这套方案」→ <code>selectArmorCandidate</code>（:1240-1291）：'
  + "非护甲目标原样保留 + 5 条护甲目标重写（<code>plug_hashes</code> = 非属性模组 ∪ 调整 plug ∪ 属性模组 plug），"
  + "同时写入 <code>armor_plan.planned_armor_plugs</code>。"
  + "<strong>任何一次改动护甲约束或装备目标都会清掉 armor_plan</strong>——包括改目标角色。</div>"
  + "</section>"
  + decisionSummaryAccepted()
  + "</section>"
  + '<div class="t58f-stage-note t58f-wide">写到草稿里的形状：'
  + "<code>item_targets[]</code> 5 条护甲（<code>slot / item_hash / selected_instance_id / plug_hashes</code>）"
  + "＋ <code>armor_plan</code>（<code>result_id / cache_key / checked_at / expires_at / candidate_id / mode / ruleset_version / "
  + "selected_instance_ids / planned_armor_plugs[]</code>）。"
  + "<code>planned_armor_plugs</code> 每件带 <code>energy_capacity / reserved_energy / final_energy / "
  + "armor_stat_mod_plug_hash / armor_stat_mod_socket_index</code>——穿戴时的护甲核对全靠它。"
  + "<strong>草稿本身还不含子职业记录</strong>：骨架里的 <code>subclass_target</code> 只有从游戏内槽位复制时才会被填上，"
  + "「从当前装备开始」这条路径今天不产出它（T58 切片 5 要收敛的就是这条）。</div>";

// ── 步骤 7 · 穿戴核对 + 子职业闸门（T58 改动 ③）────────────────────────
const EXECUTION_STEPS = [
  "转移「明日之眼」到仓库",
  "从仓库取出「先兆之壳」到泰坦",
  "穿戴「先兆之壳」",
  "写入「属性模组 +10 韧性」",
  "从仓库取出「先兆之胫」到泰坦",
  "穿戴「先兆之胫」",
  "穿戴「先兆之握」",
  "写入「属性模组 +5 纪律」"
];

function gatePanel(gate) {
  return '<section class="t58f-gate" data-state="' + gate.state + '">'
    + '<header class="t58f-gate-head"><span class="t58f-gate-mark" aria-hidden="true">'
    + (gate.state === "pass" ? "✓" : "!") + "</span>"
    + "<div><strong>子职业闸门 · " + gate.title + "</strong><small>" + gate.detail + "</small></div>"
    + '<span class="t58f-gate-state">' + (gate.state === "pass" ? "通过，可继续" : "拦截，零写入") + "</span></header>"
    + (gate.rows.length
      ? '<ul class="t58f-diff">' + gate.rows.map((row) => '<li><span class="t58f-diff-tag" data-kind="'
        + row.kind + '">' + { missing: "缺", extra: "多", same: "同" }[row.kind] + "</span>"
        + "<strong>" + row.label + "</strong><small>" + row.note + "</small></li>").join("") + "</ul>"
      : "")
    + '<p class="t58f-note">'
    + (gate.state === "pass"
      ? "配装记录的指纹与角色当前配置按集合比较，相等。指纹按集合有序化后再比，不按序列化顺序——"
        + "DIM issue #8718 就是同一批碎片换个 socket 顺序被判成变化、剥离再插一遍。"
      : "不一致时不执行任何写操作。给两条出路：「去游戏里切回该配置」或「按当前配置重新生成草稿」。"
        + "注意这里<strong>只提示、不写回</strong>——写子职业插槽会让玩家丢掉全部超能/技能能量。")
    + "</p></section>";
}

function executionPanel(gate) {
  return '<section class="t58f-pane">'
    + '<div class="loadout-decision-pane-head"><div><strong>穿戴核对</strong>'
    + "<small>执行前会刷新权威账号数据并重新生成不可变计划；任一步骤失败后停止。</small></div></div>"
    + '<section class="loadout-armor-workbench">'
    + '<div class="loadout-decision-pane-head"><div><strong>穿戴步骤</strong>'
    + "<small>计划 local-loadout-plan:8f2a91c4:512；确认后先刷新账号复核，计划未变化才会逐步执行。</small></div>"
    + '<button type="button" data-ui-kind="button" data-control-variant="primary"'
    + (gate.state === "pass" ? "" : " disabled") + ">穿戴此方案</button></div>"
    + gatePanel(gate)
    + '<ol class="loadout-plan-step-list">'
    + EXECUTION_STEPS.map((label, index) => "<li><span>" + String(index + 1).padStart(2, "0")
      + "</span><strong>" + label + "</strong></li>").join("")
    + "</ol>"
    + '<section class="loadout-capability-notice" data-ui-kind="callout" data-status="warning">'
    + "<strong>未执行缺口</strong><span>「先兆之印」在邮政官，取出后再执行这一步。</span></section>"
    + "</section></section>";
}

const STAGE_7 =
  '<section class="loadout-page">'
  + '<header class="loadout-subpage-head loadout-editor-head">'
  + '<button class="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary">返回配装编辑器</button>'
  + '<div class="loadout-editor-title-block"><span class="loadout-eyebrow">泰坦 光等 2013</span>'
  + "<h2>穿戴核对</h2>"
  + "<p>执行前会刷新权威账号数据并重新生成不可变计划；任一步骤失败后停止。</p></div>"
  + "</header>"
  + '<div class="t58f-compare">'
  + '<section class="t58f-compare-col t58f-compare-before">'
  + '<header class="t58f-compare-head"><span class="t58f-tag t58f-tag-before">现状</span>'
  + "<strong>没有子职业闸门</strong><small>比对只覆盖装备与护甲模组</small></header>"
  + executionPanel(GATE.pass)
  + '<ul class="t58f-issue"><li>装备、护甲模组、能量都核对了，<strong>唯独没核对配装是按哪套星象/碎片算出来的</strong>。</li>'
  + "<li>玩家在游戏里换了碎片再来点穿戴：护甲是照旧配置算的，六维再也对不上，而这里一声不响。</li>"
  + "<li>参考项目 d2-armor-solver 的 <code>fragmentAdjustmentsMatch</code>（<code>src/app.mjs:3178-3190</code>）"
  + "就是这一步，对不上直接拒绝装备。</li></ul></section>"
  + '<section class="t58f-compare-col t58f-compare-after">'
  + '<header class="t58f-compare-head"><span class="t58f-tag t58f-tag-after">候选 · 通过</span>'
  + "<strong>集合相等，照常执行</strong><small>通过时不加步骤，不挡正常路径</small></header>"
  + executionPanel(GATE.pass)
  + "</section>"
  + '<section class="t58f-compare-col t58f-compare-after">'
  + '<header class="t58f-compare-head"><span class="t58f-tag t58f-tag-before">候选 · 漂移</span>'
  + "<strong>集合不等，零写入拦下</strong><small>主按钮禁用，差异逐项列出</small></header>"
  + executionPanel(GATE.drift)
  + "</section>"
  + "</div>"
  + '<div class="t58f-stage-note t58f-wide">指纹按<strong>集合</strong>比较（切片 6 的硬要求）：'
  + "等价配置被判成差异，将来一旦接上写回就等于每次穿戴都清空玩家能量。"
  + "通过时只是多一次比对，不增加任何写操作。</div>"
  + "</section>";

// ── 步骤 8 · 保存到游戏内槽位 ────────────────────────────────────────────
const STAGE_8 =
  '<section class="loadout-page">'
  + editorHead({
    name: "泰坦 光等 2013",
    class_name: "泰坦",
    target_character_id: "c-titan",
    source_label: "当前装备"
  }, { saved: true, dirty: false })
  + '<div class="loadout-editor-sticky-actions">'
  + "<span>穿戴后账号刷新核对通过，可以选择写入一个 Bungie 官方槽位。</span>"
  + '<div><button id="loadout-open-publish" type="button" data-ui-kind="button" data-control-variant="primary">保存到游戏内槽位</button></div>'
  + "</div>"
  + '<section class="loadout-page t58f-publish">'
  + '<header class="loadout-subpage-head loadout-editor-head">'
  + '<button class="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary">返回穿戴核对</button>'
  + '<div class="loadout-editor-title-block"><h2>保存到游戏内槽位</h2>'
  + "<p>应用配装已成功穿戴并刷新核对；选择官方槽位后才会执行 Bungie 写入。</p></div></header>"
  + '<div class="loadout-slot-picker">'
  + '<header><div><strong>保存到游戏内槽位</strong><small>方案已穿戴并经账号刷新核对。保存前会再次核对当前装备和目标槽位，变化时保持零写入。</small></div></header>'
  + '<div class="loadout-slot-picker-list" data-surface="list">'
  + [["01", "虚空爆发", true], ["02", "缚丝预备", true], ["03", "", false],
    ["04", "", false], ["05", "", false]]
    .map((row, index) => '<button type="button" aria-pressed="' + (index === 2) + '">'
      + "<span>" + row[0] + "</span><span><strong>" + (row[2] ? row[1] : "空槽位")
      + "</strong><small>" + (row[2] ? "覆盖已有槽位" : "空槽") + "</small></span></button>").join("")
  + "</div>"
  + '<p class="loadout-callout" data-ui-kind="callout" data-status="success">'
  + "槽位已保存，刷新后的 Bungie 槽位内容核对通过。"
  + "<small>保存 …41b7e0 · 计划 …8f2a91c4</small></p>"
  + '<footer><button type="button" data-ui-kind="button" data-control-variant="primary">保存到槽位</button></footer>'
  + "</div>"
  + '<div class="t58f-stage-note">这一步是<strong>唯一</strong>会写 Bungie 的地方，而且写的是官方配装槽，'
  + "不是逐插槽写子职业。确认弹框会再刷新一次账号；装备状态或槽位内容变化时不执行写入。</div>"
  + "</section></section>"
  + '<div class="t58f-stage-note t58f-wide t58f-final">'
  + "<strong>流程到此闭合。</strong>子职业那块从头到尾只读：读来算属性加成（步骤 5）、读来当闸门（步骤 7），"
  + "唯一的结果是「这次穿戴该不该发生」。"
  + "DIM 导出面板在穿戴核对屏里也有一份（<code>loadout-dim-export</code>），未核对通过时按钮呈「DIM 导出已阻断」。</div>"
  + "</section>";

// ── 页面 ───────────────────────────────────────────────────────────────────
const STEPS = [
  ["01", "step-1", "选入口", "五条入口，差别只在草稿预填了什么。选定后都进同一个草稿编辑器。", [
    "顶栏「新建配装」只在 mode === \"local\"（应用配装）时出现，三项：使用当前装备 / 导入 DIM / 空白方案。",
    "游戏内配装视图的槽位详情里另有一个「复制到应用配装」——它是唯一会把子职业单独摘出来的入口。"
  ], ["（还没有草稿）", "item_targets 为空 · 无 subclass_target · 无 armor_plan"], STAGE_1],
  ["02", "step-2", "定目标角色，选起点", "草稿一建好就自动压入编辑器。名称、目标角色、三个起点按钮。", [
    "草稿工厂产出的字段：name / class_name / target_character_id / source / item_targets: []，没有 id、没有时间戳。",
    "改目标角色会清掉 armor_plan（updateDraftClearingArmorPlan）——换角色就得重新求解。"
  ], ["尚未保存 · 0/8 槽已配置", "子职业未记录 · 护甲计划无"], STAGE_2],
  ["03", "step-3", "逐槽位选装备", "8 个标准槽位：3 武器 + 5 护甲。子职业单独一格，不进这 8 格。", [
    "空槽按钮开 ItemPickerDrawer（搜索 + 位置筛选带计数），每件装备按位置进列表。",
    "选中实例时把该实例当前已装的全部 plug 原样抄进 plug_hashes——武器特长是照抄现状，不是逐项挑。",
    "护甲空槽的副文带出该部位的属性模组规则（自动 / 不装 / +5 / +10）。"
  ], ["尚未保存 · 4/8 槽已配置", "子职业未记录（只有一张只读卡）· 护甲计划无"], STAGE_3],
  ["04", "step-4", "读准当前子职业（T58 ①）", "从角色当前装备读出超能、技能、星象、碎片，分组显示，空位显式画出。", [
    "分组判据是 Manifest 自己的 plugCategoryIdentifier 后缀（.aspects / .fragments / .trinkets），不靠关键词猜。",
    "每个 plug 自带 armor_stat_modifiers，由早就加载的 investmentStats 算出——不需要新数据、不用 full 模式。",
    "整块只读：星象、碎片、超能、技能一律不写回游戏。"
  ], ["尚未保存 · 4/8 槽已配置", "子职业已读取（超能 1 · 技能 3 · 星象 2/2 · 碎片 3/5）"], STAGE_4],
  ["05", "step-5", "护甲约束与求解（T58 ②）", "设最低值、逐部位模组，碎片属性加成从步骤 4 自动求和，然后求解。", [
    "fragment_stat_bonuses 被加进基础属性并作为 planner 请求的 fragment_adjustments 传入。",
    "手工框保留，但默认值不再靠人填；它决定求解起点，填错不会报错，只会算出一套错的护甲。",
    "planner_mode 四选：当前库存 / 理论上限 / 待刷目标 / 升级路径。"
  ], ["尚未保存 · 4/8 槽已配置", "子职业已读取 · 护甲计划计算中（5 个候选）"], STAGE_5],
  ["06", "step-6", "采用方案，存进草稿", "选一套推荐方案写回 5 条护甲目标，同时写入 armor_plan，然后保存。", [
    "采用后非护甲目标原样保留，5 条护甲目标按候选重写，plug_hashes = 非属性模组 ∪ 调整 plug ∪ 属性模组 plug。",
    "armor_plan 里 planned_armor_plugs 每件带能量与属性模组信息，穿戴时的护甲核对全靠它。",
    "反过来说：任何一次改护甲约束或装备目标都会清掉 armor_plan，得重新求解。"
  ], ["已保存 · 8/8 槽已配置", "子职业已读取 · 护甲计划 5 件已绑定实例"], STAGE_6],
  ["07", "step-7", "穿戴核对 + 子职业闸门（T58 ③）", "执行前刷新账号、重新生成计划，并比对配装假定的子职业配置与角色此刻的配置。", [
    "闸门按集合比较，不按序列化顺序——等价配置被判成差异，将来接上写回就等于每次穿戴清空玩家能量。",
    "不一致时零写入，给两条出路：去游戏里切回该配置，或按当前配置重新生成草稿。",
    "参考项目 d2-armor-solver 的 fragmentAdjustmentsMatch 是同一道闸门。"
  ], ["已保存 · 8/8 槽已配置", "子职业指纹已记录 · 穿戴闸门就位"], STAGE_7],
  ["08", "step-8", "保存到游戏内槽位", "穿戴核对通过后，把整个构筑写进一个 Bungie 官方槽位。", [
    "这是全流程唯一会写 Bungie 的地方，写的是官方配装槽，不是逐插槽写子职业。",
    "确认弹框会再刷新一次账号；装备状态或槽位内容变化时不执行写入。",
    "DIM 导出面板同屏可见，核对未通过时呈「已导出阻断」。"
  ], ["已保存 · 已穿戴核对通过", "子职业仍是只读 · 官方槽位已写入并核对"], STAGE_8]
];

const nav = STEPS.map(([no, id, title]) =>
  '<a href="#' + id + '"><span>' + no + "</span>" + title + "</a>").join("");

const body = STEPS.map((step_) => step(...step_)).join("");

const PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>T58 完整新建配装工作流 · 交互原型</title>
<style>
${productCss}
</style>
<style>
/* ── 原型自有的排版样式，全部 t58f- 前缀，不与产品规则抢同名类 ─────────────
   产品里 .loadout-subclass-section / .loadout-subclass-slot 有定义，直接用产品的，不覆盖。
   t58f-subclass-panel 那套是**候选样式**：产品今天没有这些类（T58 现状第 7 条），
   定案后搬进产品，别让原型留着反向覆盖。 */
html { height: 100%; }
body { margin: 0; background: var(--page); color: var(--text); height: 100%; }
/* .app-shell 是 2 行网格 + overflow:hidden，页面得自己占满两行并滚动，否则被顶栏那一行裁掉。 */
.t58f-page { grid-row: 1 / -1; grid-column: 1; overflow: auto; height: 100%; padding: 24px 20px 96px; box-sizing: border-box; }
.t58f-head h1 { margin: 0 0 6px; font-size: 20px; color: var(--text-title); }
.t58f-warn { margin: 0 0 16px; padding: 8px 12px; border-inline-start: 4px solid var(--status-warning); border-radius: 4px; background: var(--status-warning-bg); color: var(--text-body); font-size: var(--font-caption); line-height: 1.6; }
.t58f-nav { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 24px; padding: 0 0 14px; border-bottom: 1px solid var(--border-subtle); }
.t58f-nav a { display: inline-flex; align-items: center; gap: 7px; min-height: 32px; padding: 0 12px 0 6px; border: 1px solid var(--control-border); border-radius: 4px; background: var(--surface-panel); color: var(--text-body); font-size: var(--font-caption); text-decoration: none; }
.t58f-nav a span { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 999px; background: var(--surface-interactive-strong); color: var(--text-title); font-size: 11px; font-weight: 700; }
.t58f-nav a:hover { border-color: var(--accent-primary); }

.t58f-step { margin: 0 0 8px; scroll-margin-top: 16px; }
.t58f-step-head { display: grid; grid-template-columns: 44px minmax(0, 1fr) 300px; gap: 16px; align-items: start; padding: 16px; border: 1px solid var(--border-control); border-bottom: 0; background: var(--surface-subtle); }
.t58f-step-no { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 4px; background: var(--accent-primary); color: var(--page); font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
.t58f-step-copy h2 { margin: 0 0 5px; font-size: 17px; color: var(--text-title); }
.t58f-step-copy p { margin: 0; color: var(--text-body); font-size: var(--font-caption); line-height: 1.65; }
.t58f-step-notes { margin: 8px 0 0; padding: 0 0 0 16px; color: var(--text-muted); font-size: var(--font-caption); line-height: 1.75; }
.t58f-step-notes li + li { margin-top: 3px; }
.t58f-draft { display: grid; gap: 3px; padding: 10px 12px; border: 1px solid var(--object-border); border-radius: 4px; background: var(--card-bg); }
.t58f-draft > span { color: var(--text-muted); font-size: 11px; letter-spacing: .08em; }
.t58f-draft strong { color: var(--text-title); font-size: var(--font-caption); }
.t58f-draft small { color: var(--text-muted); font-size: var(--font-caption); line-height: 1.5; }

.t58f-stage { padding: 16px; border: 1px solid var(--border-control); background: var(--page); }
.t58f-stage > .loadout-page { display: block; }
/* 产品里这三条是 sticky：编辑器头部（03-workspace.css:1917，top: 顶部栏高度）、
   底部动作条（:1906）、护甲计算条（:1396，bottom: 0）。原型是一张长页，
   sticky 会让它们浮到别的步骤上面，看着像内容串了。原型里还原成静态，
   只表示「它在这个位置」。产品里保持 sticky，这不算产品问题。
   特异性：产品是 .app-shell .x（0,2,0），这里是 .t58f-stage .x（0,2,0），同分、本文档靠后，赢。 */
.t58f-stage .loadout-editor-head,
.t58f-stage .loadout-editor-sticky-actions,
.t58f-stage .loadout-armor-calculate-bar { position: static; }
.t58f-stage-note { margin: 12px 0 0; padding: 10px 12px; border-inline-start: 3px solid var(--accent-primary); border-radius: 4px; background: var(--surface-subtle); color: var(--text-body); font-size: var(--font-caption); line-height: 1.7; }
.t58f-stage-note.t58f-wide { margin: 0 0 32px; }
.t58f-stage-note.t58f-final { border-inline-start-color: var(--status-ready); background: var(--status-ready-bg); }

/* 「新建配装」是绝对定位浮层（产品里也是），展开时会盖住下面的内容。
   给入口卡让出高度，不然前三张卡会被菜单压掉一半，看着像没渲染。
   注意这里必须用 CSS 注释：CSS 不认双斜杠，那两行会把下面这条规则的选择器
   拼成一串匹配不到东西的垃圾，整条规则静默失效——表现只是「栅格没生效」。 */
.t58f-entry-grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); margin-top: 160px; }
.t58f-entry { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 10px; padding: 12px; border: 1px solid var(--object-border); border-radius: 6px; background: var(--card-bg); }
.t58f-entry[data-muted="true"] { border-style: dashed; background: transparent; }
.t58f-entry-no { color: var(--text-muted); font-size: var(--font-caption); font-variant-numeric: tabular-nums; }
.t58f-entry strong { display: block; margin-bottom: 4px; color: var(--text-title); font-size: var(--font-caption); }
.t58f-entry p { margin: 0 0 6px; color: var(--text-body); font-size: var(--font-caption); line-height: 1.65; }
.t58f-entry code { font-size: 11px; }

.t58f-compare { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); align-items: start; }
.t58f-compare-col { display: grid; gap: 10px; min-width: 0; }
.t58f-compare-head { display: grid; gap: 4px; padding: 10px 12px; border: 1px solid var(--object-border); border-radius: 4px; background: var(--card-bg); }
.t58f-compare-head strong { color: var(--text-title); font-size: var(--font-caption); }
.t58f-compare-head small { color: var(--text-muted); font-size: 11px; }
.t58f-tag { justify-self: start; padding: 2px 9px; border-radius: 999px; font-size: 11px; }
.t58f-tag-before { background: var(--status-warning-bg); color: var(--status-warning); }
.t58f-tag-after { background: var(--status-ready-bg); color: var(--status-ready); }
.t58f-issue { margin: 0; padding: 10px 12px 10px 28px; border: 1px solid var(--border-subtle); border-radius: 4px; color: var(--text-muted); font-size: var(--font-caption); line-height: 1.75; }
.t58f-issue-ok { border-inline-start: 3px solid var(--status-ready); }
.t58f-pane { min-width: 0; }
.t58f-compact { margin: 12px 16px 16px; }
.t58f-constraint-block { padding: 12px; border-bottom: 1px solid var(--border-subtle); }
.t58f-constraint-block > header { display: grid; gap: 3px; margin-bottom: 10px; }
.t58f-constraint-block > header strong { color: var(--text-title); font-size: var(--font-caption); }
.t58f-constraint-block > header small { color: var(--text-muted); font-size: 11px; }
.t58f-rule-list, .t58f-priority, .t58f-piece-list, .t58f-sum-list { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
.t58f-rule-list li, .t58f-priority li, .t58f-piece-list li, .t58f-sum-list li { display: flex; align-items: center; gap: 8px; padding: 7px 0; border-top: 1px solid var(--border-subtle); font-size: var(--font-caption); }
.t58f-rule-list li:first-child, .t58f-priority li:first-child { border-top: 0; }
.t58f-rule-list span, .t58f-piece-list small, .t58f-sum-list span { color: var(--text-muted); }
.t58f-rule-list strong, .t58f-piece-list strong, .t58f-sum-list strong { color: var(--text-body); font-weight: 400; }
.t58f-priority span { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 999px; background: var(--surface-interactive-strong); color: var(--text-title); font-size: 11px; }
.t58f-piece-list li { display: grid; gap: 2px; }

.t58f-subclass-panel { border: 1px solid var(--object-border); border-radius: 6px; background: var(--card-bg); overflow: hidden; }
.t58f-subclass-head { display: flex; align-items: center; gap: 10px; padding: 12px; border-bottom: 1px solid var(--border-subtle); }
.t58f-subclass-head strong { display: block; color: var(--text-title); font-size: var(--font-content); }
.t58f-subclass-head small { display: block; margin-top: 3px; color: var(--text-muted); font-size: var(--font-caption); }
.t58f-subclass-icon { width: 36px; height: 36px; border-radius: 4px; }
.t58f-pill { margin-inline-start: auto; padding: 3px 10px; border-radius: 999px; background: var(--status-ready-bg); color: var(--status-ready); font-size: var(--font-caption); }
.t58f-head-actions { display: flex; align-items: center; gap: 8px; margin-inline-start: auto; }
.t58f-groups { display: grid; gap: 10px; padding: 12px; }
.t58f-group { min-width: 0; }
.t58f-group-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px; }
.t58f-group-head strong { color: var(--text-title); font-size: var(--font-caption); }
.t58f-group-head span { color: var(--text-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.t58f-chip-list { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.t58f-chip { display: inline-flex; align-items: center; gap: 6px; max-width: 100%; padding: 4px 10px 4px 4px; border: 1px solid var(--object-border); border-radius: 999px; background: var(--surface-panel); font-size: var(--font-caption); }
.t58f-chip-icon { width: 20px; height: 20px; border-radius: 4px; flex: 0 0 auto; }
.t58f-chip-name { color: var(--text-body); white-space: nowrap; }
.t58f-chip-socket { color: var(--text-muted); font-size: 11px; white-space: nowrap; }
.t58f-chip-stat { padding: 1px 7px; border-radius: 999px; background: var(--status-ready-bg); color: var(--status-ready); font-size: 11px; font-style: normal; white-space: nowrap; }
.t58f-chip-empty { border-style: dashed; background: transparent; }
.t58f-chip-icon-empty { display: grid; place-items: center; background: transparent; border: 1px dashed var(--border-subtle); color: var(--text-muted); }
.t58f-chip-empty .t58f-chip-name { color: var(--text-muted); }
.t58f-note { margin: 0; color: var(--text-muted); font-size: var(--font-caption); line-height: 1.7; }
.t58f-subclass-panel > .t58f-note { margin: 0; padding: 10px 12px; border-top: 1px solid var(--border-subtle); }

.t58f-auto { border-inline-start: 3px solid var(--status-ready); }
.t58f-auto input[readonly] { color: var(--text-title); }
.t58f-auto label[data-auto="true"] span { color: var(--status-ready); }
.t58f-sum-detail { padding: 10px 12px; border: 1px solid var(--border-subtle); border-top: 0; border-radius: 0 0 4px 4px; background: var(--surface-subtle); }
.t58f-sum-detail summary { color: var(--text-body); cursor: pointer; font-size: var(--font-caption); }
.t58f-sum-list { margin-top: 6px; }
.t58f-sum-list .t58f-kind { padding: 2px 8px; border-radius: 999px; background: var(--surface-interactive); color: var(--text-muted); font-size: 11px; }
.t58f-change { color: var(--status-ready); font-size: var(--font-caption); font-style: normal; }
.t58f-sum-detail .t58f-note { margin-top: 8px; }

.t58f-candidate-head { display: flex; align-items: center; gap: 10px; padding: 12px; border-bottom: 1px solid var(--border-subtle); }
.t58f-candidate-no { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 999px; background: var(--surface-interactive-strong); color: var(--text-title); font-size: var(--font-caption); font-weight: 700; }
.t58f-candidate-head strong { display: block; color: var(--text-title); font-size: var(--font-content); }
.t58f-candidate-head small { display: block; margin-top: 3px; color: var(--text-muted); font-size: var(--font-caption); }
.t58f-candidate-head .loadout-status-badge { margin-inline-start: auto; }
.t58f-candidate-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border-top: 1px solid var(--border-subtle); }
.t58f-candidate-foot span { color: var(--text-muted); font-size: var(--font-caption); }

.t58f-gate { margin: 0 12px 12px; padding: 12px; border: 1px solid var(--object-border); border-radius: 4px; }
.t58f-gate[data-state="pass"] { border-inline-start: 4px solid var(--status-ready); }
.t58f-gate[data-state="block"] { border-inline-start: 4px solid var(--status-error); }
.t58f-gate-head { display: flex; align-items: center; gap: 10px; }
.t58f-gate-mark { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 999px; font-weight: 700; }
.t58f-gate[data-state="pass"] .t58f-gate-mark { background: var(--status-ready-bg); color: var(--status-ready); }
.t58f-gate[data-state="block"] .t58f-gate-mark { background: var(--status-error-bg, var(--status-warning-bg)); color: var(--status-error, var(--status-warning)); }
.t58f-gate-head strong { display: block; color: var(--text-title); font-size: var(--font-caption); }
.t58f-gate-head small { display: block; margin-top: 3px; color: var(--text-muted); font-size: var(--font-caption); }
.t58f-gate-state { margin-inline-start: auto; flex: 0 0 auto; font-size: var(--font-caption); }
.t58f-gate[data-state="pass"] .t58f-gate-state { color: var(--status-ready); }
.t58f-gate[data-state="block"] .t58f-gate-state { color: var(--status-error, var(--status-warning)); }
.t58f-gate .t58f-note { margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-subtle); }
.t58f-diff { margin: 10px 0 0; padding: 0; list-style: none; }
.t58f-diff li { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-top: 1px solid var(--border-subtle); font-size: var(--font-caption); }
.t58f-diff strong { color: var(--text-body); font-weight: 400; }
.t58f-diff small { color: var(--text-muted); }
.t58f-diff-tag { padding: 2px 8px; border-radius: 999px; font-size: 11px; }
.t58f-diff-tag[data-kind="extra"] { background: var(--status-warning-bg); color: var(--status-warning); }
.t58f-diff-tag[data-kind="missing"] { background: var(--status-error-bg, var(--status-warning-bg)); color: var(--status-error, var(--status-warning)); }
.t58f-diff-tag[data-kind="same"] { background: var(--surface-interactive); color: var(--text-muted); }

.t58f-publish { border: 1px solid var(--border-control); }
code { padding: 1px 5px; border-radius: 4px; background: var(--surface-recessed); font-size: .92em; }
</style>
</head>
<body>
<div class="app-shell">
<main class="t58f-page" data-surface="page">
  <header class="t58f-head">
    <h1>T58 完整新建配装工作流 · 交互原型</h1>
    <p class="t58f-warn">示例数据，不是真实账号读取结果。这一版定的是<strong>流程</strong>与信息分层：
      八个步骤一条线走完，T58 的三处改动（读准子职业、属性自动进求解器、应用前闸门）织在步骤 4 / 5 / 7。
      六维数值要在实窗验收时对。</p>
    <nav class="t58f-nav">${nav}</nav>
  </header>
  ${body}
</main>
</div>
</body>
</html>
`;

writeFileSync(join(here, "t58-flow.html"), PAGE, "utf8");

// 守卫：`<style>` 里不许出现 JS 风格的 `//` 注释。
// CSS 不认 `//`，解析器会把后面的注释行连同下一条规则的选择器一起当成一个
// 匹配不到任何东西的选择器，**那条规则整条静默失效**。踩过一次：
// `.t58f-entry-grid` 前面写了两行 `//`，于是 grid 和 margin-top 全没生效，
// 卡片竖着堆成一列、浮层照样压住卡——看着只像「排得松」，不像坏了。
for (const style of PAGE.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
  const lines = style[1].split("\n");
  const bad = lines.map((line, index) => ({ line, index })).filter((row) => /^\s*\/\//.test(row.line));
  if (bad.length) {
    console.error("构建失败：内联样式里有 " + bad.length + " 行 `//` 注释（CSS 不认），"
      + "它下面那条规则会整条失效：");
    for (const row of bad.slice(0, 5)) console.error("  样式表第 " + (row.index + 1) + " 行：" + row.line.trim());
    process.exit(1);
  }
}
console.log("生成 t58-flow.html · " + PAGE.length + " 字节 · " + STEPS.length + " 步");
