// 配装工作台原型的公共零件：示例数据、产品保真 DOM 片段、护甲规划面板。
//
// 从 T58 原型（.local-data/tmp/t58-subclass/build-t58-flow.mjs）抽出来，两个原型共用。
// 全部照产品的实现来（DOM 结构与类名逐条对齐 LoadoutsPageContentView.tsx）：
//   · 样式表   packages/ui/src/styles.css 整份内联，改产品 CSS 原型跟着变
//   · 顶栏     :353-411（loadout-context-toolbar / loadout-create-menu / loadout-create-options）
//   · 编辑器   :1435-1472（loadout-editor-head / loadout-build-canvas / 实时摘要）
//   · 槽位组   :1687-1718 + standardLoadoutSlots（3 武器 + 5 护甲）
//   · 子职业   :1452-1454（草稿编辑器里的只读卡）、:662-700（游戏内子职业明细）
//   · 手工框   :1888-1898（ArmorFragmentAdjustmentsEditor）、:1376-1395（护甲规划面板）
//   · 穿戴     :1409-1420 / :2283-2307（LocalPlanExecutionPanel、loadout-plan-step-list）
//   · 存槽位   :2362-2398（loadout-slot-picker）
//
// 类名核对：.loadout-subclass-section 在 03-workspace.css 里 **0 条规则**，只有 .loadout-subclass-slot
// （:1892）与 .loadout-subclass-slot-static（:1897）。分组面板那套是**候选样式**，前缀 t58f-，标了
// 「候选」——产品目前没有这些类的定义，定案后再搬进产品，别让原型留着反向覆盖。
//
// 数据是**示例**，不是真实账号读取结果。原型定的是交互与信息分层，不用来核对游戏里的六维数值。
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const here = import.meta.dirname;
// 比原型原来在 .local-data/tmp/loadout-flow/ 时多一层：这里离仓库根是四层。
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
//
// 三类改动各写各的脏原因，不能都用一句“设置已变化”。玩家得知道是哪一格动过，
// 才知道重算要重算什么（模组变了装备组合往往不变；六维目标或碎片变了可能整套都要换）。
const DIRTY_REASON = {
  stats: "六维最低值改过了，上一次可行性是按改前的目标判的。",
  mods: "逐部位属性模组改过了，上一次可行性是按改前的模组设置判的。",
  fragments: "技能与碎片的读数刚变过，上一次可行性是按改前的读数判的。"
};

// options.dirty：设置改过、还没重算。产品今天的做法是改一个输入就把 armor_plan 整个清掉
// （updateDraftClearingArmorPlan），旧候选当场消失；T92 定的是保留候选 + 打脏标记 + 禁用接受。
//
// options.dirtySource：是哪一类设置变了——`stats` 六维最低值 / `mods` 逐部位属性模组 /
// `fragments` 技能与碎片读数。三类都会把候选打成脏，但**执行前有没有闸门不一样**：
// 模组那类在 localPlanExecution.ts:291-330 会被核对（改完不重算、直接穿戴会判 gap 清空步骤），
// 六维目标和碎片这两类**没有任何校验**——`validatePlannedArmorAssignments` 不碰
// `stat_minimums`，也不碰 `fragment_stat_bonuses`；`getApplicationLoadoutWearState`
// （applicationLoadoutWorkspace.ts:405-415）只判 selected_count === item_targets.length。
// 所以“禁用接受”不是体验优化，是这两类唯一的一道闸门。脏标记必须点名是哪一类变了，
// 因为重算范围不同：模组变了装备组合可能不变，六维目标或碎片变了可能整套都要换。
function armorConstraintsPane(options) {
  const opts = options || {};
  const dirty = opts.dirty === true;
  const dirtySource = opts.dirtySource || "mods";
  const fragmentPanel = opts.fragmentPanel || fragmentAdjustmentsAfter();
  const modRules = opts.modRules || [
    ["头盔", "plus10", "韧性", "+10 × 1 · 自动 4"],
    ["臂铠", "plus5", "纪律", "+5 × 1"],
    ["胸甲", "auto", null, null],
    ["腿甲", "auto", null, null],
    ["职业物品", "none", null, null]
  ];
  const statMinimums = opts.statMinimums || { health: 100, class: 50 };
  const modSummary = opts.modSummary || "+5 × 1 · +10 × 1 · 自动 2";
  return '<aside class="loadout-armor-constraints-pane" aria-label="护甲配装设置">'
    + '<div class="loadout-decision-pane-head"><strong>配装设置</strong><small>修改后需要重新计算推荐方案</small></div>'
    + '<div id="loadout-armor-planner-panel" role="tabpanel">'
    + '<div class="loadout-armor-constraint-grid">'
    + STATS.map(([key, label]) => "<label><span>" + label
      + '最低值</span><input type="number" min="0" step="5" value="' + (statMinimums[key] ?? 0) + '" /></label>').join("")
    + "</div>"
    + '<section class="loadout-armor-mod-plan" aria-label="逐部位属性模组">'
    + '<div class="loadout-armor-constraint-head"><div><strong>逐部位属性模组</strong>'
    + "<small>每个部位独立决定自动、不安装、+5 或 +10；固定数值后仍可指定属性。</small></div>"
    + '<span aria-live="polite">' + modSummary + "</span></div>"
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
    + '<div class="loadout-armor-mod-preflight" data-status="' + (dirty && dirtySource === "mods" ? "warning" : "success") + '">'
    + "<strong>"
    + (dirty && dirtySource === "mods"
      ? "属性模组改成了 +10 × 2，上一次可行性是按 +10 × 1 判的，重算前一概不算数。"
      : "五个部位的属性模组设置可满足。")
    + "</strong></div></section>"
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
    + fragmentPanel
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
    + '<div class="loadout-armor-calculate-bar" data-status="' + (dirty ? "warning" : "neutral") + '">'
    + "<span>"
    + (dirty
      ? "设置已变化，需要重新计算。" + DIRTY_REASON[dirtySource]
        + "下面这轮结果还是按修改前的设置算出来的。"
      : "设置完成，可以查看推荐方案。")
    + "</span>"
    + '<button type="button" data-ui-kind="button" data-control-variant="primary">'
    + (dirty ? "重新计算达标方案" : "计算达标方案") + "</button></div>"
    + "</aside>";
}

// options.dirty：候选还在屏幕上，但它们是按修改前的设置算出来的。
// options.dirtySource：见 DIRTY_REASON——结果区要跟计算条说同一件事，否则两处对不上。
// options.truncated：搜索撞到 state_limit 被截断——`search.truncated` 今天只到 ViewModel，
// 产品里没有任何区域渲染它，玩家看到的结果像是一次完整搜索。
// opts.pending：还没算过。路径 C 是「先凑护甲再配武器」，打开规划时结果区必须是空的——
// 画几张候选就等于伪造了一次没跑过的计算。
function armorResultsPane(options) {
  const opts = options || {};
  const dirty = opts.dirty === true;
  const dirtySource = opts.dirtySource || "mods";
  const truncated = opts.truncated === true;
  const pending = opts.pending === true;
  const STALE_HEAD = {
    stats: "上一轮结果 · 按修改前的六维目标算的",
    mods: "上一轮结果 · 按修改前的属性模组设置算的",
    fragments: "上一轮结果 · 按修改前的碎片读数算的"
  };
  if (pending) {
    return '<main class="loadout-armor-results-pane">'
      + '<div class="loadout-decision-pane-head"><div><strong>推荐方案</strong>'
      + "<small>还没算过</small></div></div>"
      + '<div class="loadout-summary-empty"><strong>还没有可选的方案</strong>'
      + "<span>左边设好六维最低值和逐部位属性模组，点下面的「重新计算达标方案」才会出结果。"
      + "改过设置之后旧结果会作废，需要再算一次。</span></div>"
      + '<div class="loadout-armor-calculate-bar">'
      + "<span>设置改完了就可以算。这一次会按当前设置从零开始搜。</span>"
      + '<button type="button" data-ui-kind="button" data-control-variant="primary">重新计算达标方案</button></div>'
      + "</main>";
  }
  const head = dirty
    ? '<div class="loadout-decision-pane-head"><div><strong>推荐方案</strong>'
      + "<small>" + STALE_HEAD[dirtySource] + "</small></div></div>"
      + '<p class="loadout-callout" data-ui-kind="callout" data-status="warning">'
      + "设置改过之后这 5 个方案就不能采用了。重新计算会换成按当前设置算出的结果。</p>"
    : '<div class="loadout-decision-pane-head"><div><strong>推荐方案</strong>'
      + "<small>5 个结果 · 已选 0/3 比较</small></div></div>"
      + '<p class="loadout-callout" data-ui-kind="callout" data-status="success">已找到 5 个达标方案。</p>';
  return '<main class="loadout-armor-results-pane">'
    + head
    + (truncated
      ? '<p class="loadout-callout" data-ui-kind="callout" data-status="warning">'
        + "搜索在上限处截断，这 5 个方案来自被裁剪过的搜索空间，不是全部达标方案。</p>"
      : "")
    + [0, 1, 2, 3, 4].map((index) => candidateCard({ stale: dirty, index })).join("")
    + "</main>";
}

// 摘要区的六维对照。产品在 LoadoutsPageContentView.tsx:1646 是拿**候选里保存的六维值**
// （persistedArmorPlan.stats）去比**当前 constraints 的最低值**，所以改了六维目标之后
// 这里立刻会冒出红字“差 N”——但穿戴状态不看这个（applicationLoadoutWorkspace.ts:405-415
// 只判 selected_count === item_targets.length）。所以“红字看得见、按钮照样能点”就是
// 当前缺陷的形状：摘要区是唯一提示，而它不是闸门。
//
// 候选六维和默认最低值只留这一份。编辑器右栏的「实时摘要」和护甲区的「方案摘要」是两块地方，
// 比的却是同一组数；各写一份的结果就是同一屏上右栏写「韧性 目标 100」、护甲区写「最低值 110」，
// 读图的人只会觉得原型坏了，看不出「改了目标所以候选要重算」这件事。
const ARMOR_STAT_VALUES = { health: 102, melee: 38, grenade: 62, super: 45, class: 58, weapon: 34 };
const DEFAULT_STAT_MINIMUMS = { health: 100, class: 50 };

// 距离目标 / 超出目标：只在设了最低值的维度上算。
function statGapSummary(minimums, values) {
  let distance = 0;
  let overshoot = 0;
  for (const [key] of STATS) {
    const minimum = minimums[key];
    if (minimum === undefined) continue;
    distance += Math.max(0, minimum - values[key]);
    overshoot += Math.max(0, values[key] - minimum);
  }
  return { distance, overshoot };
}

function armorSummaryPane(options) {
  const opts = options || {};
  const dirty = opts.dirty === true;
  const dirtySource = opts.dirtySource || "mods";
  const minimums = opts.statMinimums || DEFAULT_STAT_MINIMUMS;
  const values = ARMOR_STAT_VALUES;
  const pending = opts.pending === true;
  const summaryNote = pending
    ? "还没算过 · 这里会显示选中候选的六维"
    : dirty
      ? "上一轮候选的六维对照 · 待重算 · " + DIRTY_REASON[dirtySource]
      : "选中候选的六维对照";
  const { distance, overshoot } = statGapSummary(minimums, values);
  // 没算过就没有候选六维可比：目标照写（那是输入），实测值只能是「—」。
  if (pending) {
    return '<aside class="loadout-armor-summary-pane" aria-label="方案摘要">'
      + '<div class="loadout-decision-pane-head"><strong>方案摘要</strong><small>' + summaryNote + "</small></div>"
      + '<dl class="loadout-summary-stat-grid">'
      + STATS.map(([key, label]) => '<div><dt>' + label + "</dt><dd><strong>—</strong><small>"
        + (minimums[key] === undefined ? "未设目标" : "目标 " + minimums[key]) + "</small></dd></div>").join("")
      + "</dl>"
      + '<div class="loadout-summary-metrics">'
      + "<div><span>距离目标</span><strong>—</strong></div>"
      + "<div><span>超出目标</span><strong>—</strong></div>"
      + "<div><span>套装效果</span><strong>未选</strong></div>"
      + "<div><span>属性模组</span><strong>未选</strong></div></div>"
      + "</aside>";
  }
  return '<aside class="loadout-armor-summary-pane" aria-label="方案摘要">'
    + '<div class="loadout-decision-pane-head"><strong>方案摘要</strong><small>' + summaryNote + "</small></div>"
    + '<dl class="loadout-summary-stat-grid">'
    + STATS.map(([key, label]) => {
      const value = values[key];
      const minimum = minimums[key];
      const shortfall = minimum === undefined ? 0 : Math.max(0, minimum - value);
      return '<div data-status="' + (shortfall ? "warning" : "ready") + '"><dt>' + label + "</dt><dd><strong>"
        + value + "</strong><small>"
        + (minimum === undefined ? "未设目标" : shortfall ? "差 " + shortfall : "目标 " + minimum)
        + "</small></dd></div>";
    }).join("")
    + "</dl>"
    + '<div class="loadout-summary-metrics">'
    + "<div><span>距离目标</span><strong>" + distance + "</strong></div>"
    + "<div><span>超出目标</span><strong>" + overshoot + "</strong></div>"
    + "<div><span>套装效果</span><strong>先兆 ×2 · 星火 ×2</strong></div>"
    + "<div><span>属性模组</span><strong>" + (opts.modSummary || "+5 × 2 · +10 × 1") + "</strong></div></div>"
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
// options.stale：这一轮候选是按修改前的设置算的，接受按钮必须禁用——
// 否则玩家能把旧设置算出的护甲写进草稿，这是正确性问题，不是提示文案问题。
// options.variant：五张卡照 planner 的实现方式铺开（owned / 升级 / 理论）。
// 面板头上写「5 个结果」（planner 请求就是 `limit: 5`），下面就必须真出 5 张——
// 图上写 5 张却只画 1 张，读的人会当成原型漏渲染，而不是「这里省略了」。
const CANDIDATE_VARIANTS = [
  { title: "方案 1 · 库存内可达", note: "已装备 2 件 · 需转移 3 件 · 相对目标角色替换 0 件", gap: 0, over: 12 },
  { title: "方案 2 · 库存内可达", note: "已装备 1 件 · 需转移 4 件 · 相对目标角色替换 1 件", gap: 0, over: 9 },
  { title: "方案 3 · 需要转移装备", note: "已装备 0 件 · 需转移 5 件 · 相对目标角色替换 2 件", gap: 0, over: 14 },
  { title: "方案 4 · 需要升级装备", note: "库存内 3 件、需先升级 2 件 · 6 项模组待补", gap: 0, over: 7 },
  // 最后一张故意差 2 点：planner 的 best-effort 结果本来就可能不达标，
  // 六维格里必须跟着变红，否则「距离目标 2」和满屏达标对不上。
  { title: "方案 5 · 理论配装", note: "不受当前库存限制 · 仅用于看方向，不能直接穿戴", gap: 2, over: 0, shortfall: 2 }
];

function candidateCard(options) {
  const opts = options || {};
  const stale = opts.stale === true;
  const index = opts.index || 0;
  const variant = CANDIDATE_VARIANTS[index] || CANDIDATE_VARIANTS[0];
  const shortfall = variant.shortfall || 0;
  const stats = [["韧性", 102 - shortfall, 100], ["力量", 38, undefined], ["纪律", 62, undefined],
    ["智力", 45, undefined], ["职业", 58, 50], ["武器", 34, undefined]];
  return '<article class="loadout-armor-candidate" data-status="' + (stale ? "warning" : "success") + '">'
    + "<header><span>" + String(index + 1).padStart(2, "0") + "</span>"
    + "<div><strong>" + variant.title + "</strong>"
    + "<small>" + variant.note + "</small></div>"
    + '<div class="loadout-candidate-header-actions"><em>'
    + (stale ? "按修改前的设置计算"
      : (variant.gap === 0 ? "全部要求已满足" : "距目标还差 " + variant.gap)) + "</em>"
    + '<label><input type="checkbox" /><span>加入比较</span></label></div></header>'
    + '<div class="loadout-candidate-metrics">'
    + "<div><span>距离目标</span><strong>" + variant.gap + "</strong></div>"
    + "<div><span>最大单项差值</span><strong>" + variant.gap + "</strong></div>"
    + "<div><span>超出目标</span><strong>" + variant.over + "</strong></div>"
    + "<div><span>套装效果</span><strong>先兆 ×2 · 星火 ×2</strong></div></div>"
    + '<dl class="loadout-armor-stat-comparison">'
    + stats.map(([label, value, min]) => {
      const short = min !== undefined && value < min;
      return '<div data-status="' + (short ? "warning" : "success") + '"><dt>' + label + "</dt><dd><strong>"
        + value + "</strong><small>" + (min === undefined ? "未设下限"
          : "目标 ≥ " + min + (short ? " · 差 " + (min - value) : "")) + "</small></dd></div>";
    }).join("")
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
    + "<div><span>+5 属性模组 × 2，+10 属性模组 × 1 · 超出目标 " + variant.over + "</span>"
    + "<span>先兆 ×2 · 星火 ×2</span>"
    + '<button type="button" data-ui-kind="button" data-control-variant="primary"'
    + (stale ? " disabled" : "") + ">使用这套方案</button></footer>"
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


export {
  inlineCss, icon, STATS, STAT_LABEL, CHARACTERS, SUBCLASS, BONUS, GATE,
  itemVisual, slotRow, slotGroup, subclassPanel, subclassStaticCard,
  loadoutToolbar, editorHead, summaryHead, summaryChecks,
  decisionSummary, decisionSummaryAccepted, ARMOR_RULES, advancedSettingsShell,
  WEAPON_SLOTS, ARMOR_SLOTS,
  fragmentAdjustmentsBefore, fragmentAdjustmentsAfter, fragmentSumDetail,
  armorConstraintsPane, armorResultsPane, armorSummaryPane, candidateCard,
  ARMOR_STAT_VALUES, DEFAULT_STAT_MINIMUMS, statGapSummary,
  DIRTY_REASON,
  EXECUTION_STEPS, gatePanel, executionPanel
};
