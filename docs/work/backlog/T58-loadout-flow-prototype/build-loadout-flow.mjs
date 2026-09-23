// 配装工作台 · 完整工作流原型。
//
// 目标：把**整个配装工作台**画全，不是在 T58 子职业那一屏里打转。
// 屏幕按玩家走一遍的顺序排，一屏一屏可点着走（编号由 SCREENS 下标生成）：
//   游戏内配装        :421-443 / :449-532（InGameWorkspace 三栏）
//   方案库            :936-1009（LocalWorkspace 的三栏）
//   方案对比          :884-897 / :1093-1113（ApplicationLoadoutCompare）
//   导入 DIM·粘贴     :974 + :2140-2166（DimImportPanel 无预览态）
//   导入 DIM·预览     :2140-2166（DimImportPanel 有预览态）
//   AI 攻略导入       :975 + :2248-2263（GuideImportPanel 正文态）
//   AI 装备目标审阅   :2194-2247（equipment_target_candidates 态）
//   空草稿起点        :1433-1435（showBuildStart：三个真实起点）
//   编辑器·构筑       :1435-1472（子职业卡 + 3 武器 + 5 护甲 + 实时摘要）
//   编辑器·选装备     :1483-1566（ItemPickerDrawer）
//   编辑器·护甲规划   :1364-1407（内联面板展开）
//   编辑器·护甲待重算  T92 新状态，产品今天改设置就把 armor_plan 整个清掉。三屏各演示
//                     一类触发源：逐部位属性模组 / 六维最低值 / 碎片读数
//   穿戴核对          :1409-1420 + :2283-2307（LocalPlanExecutionPanel）
//   保存到游戏内槽位  :1422-1429（showPublish）
//
// 产品路由事实（照代码，不照想象）：
//   · 顶栏「新建配装」只在 mode === "local" 出现（:390）。
//   · 游戏内 → 应用配装不是「上一步/下一步」，是顶栏那个分段控件（:384-388）。
//   · 编辑器不是向导，是一页塞下子职业 + 8 个标准槽位 + 内联护甲规划（:1448-1462）；
//     穿戴核对 (:1409) 和存槽位 (:1422) 才是独立子页，用「返回配装编辑器 / 返回穿戴核对」回退。
//   · 进编辑器时顶栏收起——但**对比页不收**：`focusedApplicationFlow` 把 library 和
//     compare 都排除在外（:217-219），所以对比是浏览态，顶栏和状态条照旧在。
//
// T58 的三处改动是**叠在工作流上的一层**，不是主线：默认关，勾「显示 T58 注」才出现。
//
// 数据是示例，不是真实账号读取结果。
//
// 跑法：node build-loadout-flow.mjs → 生成 loadout-flow.html
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  inlineCss, STATS, STAT_LABEL, CHARACTERS, SUBCLASS, BONUS, GATE,
  itemVisual, slotGroup, subclassStaticCard, summaryHead, summaryChecks,
  fragmentAdjustmentsBefore, fragmentAdjustmentsAfter, fragmentSumDetail,
  armorConstraintsPane, armorResultsPane, armorSummaryPane, candidateCard,
  ARMOR_STAT_VALUES, DEFAULT_STAT_MINIMUMS, statGapSummary,
  EXECUTION_STEPS, gatePanel
} from "./kit.mjs";

const here = import.meta.dirname;
// 比原型原来在 .local-data/tmp/loadout-flow/ 时多一层：这里离仓库根是四层。
const repoRoot = join(here, "..", "..", "..", "..");
const productCss = inlineCss(join(repoRoot, "packages/ui/src/styles.css"));
const kitCss = readFileSync(join(here, "kit.css"), "utf8");

// ── 示例数据 ───────────────────────────────────────────────────────────────
// 应用配装方案库。四条覆盖四种状态，目录行的三种 tone 都能看到。
// `ingame` 是跨来源标记：两个来源各记各的，靠标记互相指认，不合并记录。
// 游戏内槽位每个角色只有 10 个（Bungie 上限），应用配装没有数量上限，所以两边不是一对一的。
const PLANS = [
  { id: "p1", title: "虚空哨兵 · 六维满值", class_name: "泰坦", item_count: 9, source_label: "从当前装备", tone: "success", status: "可穿戴", ingame: { tone: "success", label: "游戏内槽位 01 · 内容一致" } },
  { id: "p2", title: "缚丝预备 · 纪律向", class_name: "术士", item_count: 8, source_label: "导入 DIM", tone: "warning", status: "2 项待选择", ingame: { tone: "warning", label: "游戏内槽位 02 · 内容不同" } },
  { id: "p3", title: "棱镜猎人 · 手雷向", class_name: "猎人", item_count: 9, source_label: "AI 攻略", tone: "success", status: "可穿戴", ingame: { tone: "neutral", label: "猎人身上有可穿戴对应槽位" } },
  { id: "p4", title: "空白 · 待配置", class_name: "泰坦", item_count: 0, source_label: "空白方案", tone: "warning", status: "尚未配置", ingame: { tone: "neutral", label: "未对应游戏内槽位" } }
];

const COMPARE_PLANS = [PLANS[0], PLANS[1], PLANS[2]];

// 对比表：changed 的行加底色，值相同的不加。第 4 列是游戏内只读参照——
// 它参与比较但不改变身份，产品要求未返回的字段显示「未返回」，不按名字猜。
const COMPARE_ROWS = [
  ["子职业", ["虚空 · 哨兵", "缚丝 · 编织者", "棱镜 · 万花筒"], "虚空 · 哨兵", true],
  ["星象", ["无畏冲锋、壁垒", "织者之唤、冰霜护甲", "巨力、严冬之触"], "无畏冲锋、壁垒", true],
  ["碎片", ["记忆、收割、坚持", "觉醒、庇护、坚韧", "勇气、专注、洪流"], "未返回", true],
  ["动能武器", ["明日之眼", "隼月", "亡者传说"], "明日之眼", true],
  ["能量武器", ["无常", "无常", "无常"], "无常", false],
  ["威能武器", ["先兆", "铁锤", "凛冬之牙"], "先兆", true],
  ["头盔", ["先兆之壳 · 韧性 +10", "织者之冠 · 纪律 +10", "棱镜面具 · 手雷 +10"], "先兆之壳", true],
  ["臂铠", ["先兆之握 · 纪律 +5", "织者之握 · 纪律 +5", "棱镜护手 · 力量 +10"], "先兆之握", true],
  ["属性模组", ["+5 × 1 · +10 × 1 · 自动 2", "+5 × 2 · +10 × 1 · 自动 1", "+5 × 0 · +10 × 2 · 自动 2"], "未返回", true],
  ["方案备注", ["六维全部达标", "", "手雷冷却优先"], "未返回", true]
];

// 游戏内配装：Bungie 官方槽位，每个角色只有 10 个。头两个有内容，其余为空槽。
// 空槽位一条不落地画满 10 条——「每角色上限 10」这句说明得在图上看得见，只列 5 条就自相矛盾了。
// `link` 是反过来的跨来源标记：这个官方槽位对得上哪套应用配装。
const IN_GAME_SLOTS = [
  { index: 0, name: "虚空爆发", occupied: true, count: 9, link: "应用配装 · 虚空哨兵 · 六维满值" },
  { index: 1, name: "缚丝预备", occupied: true, count: 9, link: "应用配装 · 缚丝预备 · 纪律向（内容不同）" },
  { index: 2, name: "", occupied: false, count: 0, link: "" },
  { index: 3, name: "", occupied: false, count: 0, link: "" },
  { index: 4, name: "", occupied: false, count: 0, link: "" },
  { index: 5, name: "", occupied: false, count: 0, link: "" },
  { index: 6, name: "", occupied: false, count: 0, link: "" },
  { index: 7, name: "", occupied: false, count: 0, link: "" },
  { index: 8, name: "", occupied: false, count: 0, link: "" },
  { index: 9, name: "", occupied: false, count: 0, link: "" }
];

const IN_GAME_ITEMS = [
  { group: "武器", rows: [
    { name: "明日之眼", bucket: "动能武器", location: "目标角色 · 已装备", located: true, equipped: true, plugs: ["配置位置 1 · 自适应框架", "配置位置 2 · 爆炸弹", "配置位置 3 · 大师强化"], plugCount: 3 },
    { name: "无常", bucket: "能量武器", location: "目标角色 · 已装备", located: true, equipped: true, plugs: ["配置位置 1 · 精密框架", "配置位置 2 · 击杀追踪"], plugCount: 2 },
    { name: "先兆", bucket: "威能武器", location: "仓库", located: true, equipped: false, plugs: ["配置位置 1 · 高伤框架"], plugCount: 1 }
  ] },
  { group: "护甲", rows: [
    { name: "先兆之壳", bucket: "头盔", location: "目标角色 · 已装备", located: true, equipped: true, plugs: ["配置位置 1 · 韧性 +10", "配置位置 2 · 武器搜寻"], plugCount: 2 },
    { name: "先兆之握", bucket: "臂铠", location: "目标角色 · 已装备", located: true, equipped: true, plugs: ["配置位置 1 · 纪律 +5"], plugCount: 1 },
    { name: "先兆之胸", bucket: "胸甲", location: "猎人身上", located: true, equipped: false, plugs: [], plugCount: 0 },
    { name: "先兆之胫", bucket: "腿甲", location: "邮政官", located: true, equipped: false, plugs: [], plugCount: 0 },
    { name: "先兆印记", bucket: "职业物品", location: "仓库", located: true, equipped: false, plugs: [], plugCount: 0 }
  ] },
  { group: "子职业", rows: [
    { name: "虚空 · 哨兵", bucket: "子职业", location: "目标角色 · 已装备", located: true, equipped: true, subclass: true, plugs: ["配置位置 1 · 哨兵护盾", "配置位置 5 · 无畏冲锋", "配置位置 7 · 记忆碎片"], plugCount: 8 }
  ] },
  { group: "神器", rows: [
    { name: "星图", bucket: "神器", location: "目标角色 · 已装备", located: true, equipped: true, plugs: [], plugCount: 0 }
  ] }
];

// 编辑器草稿：8 个标准槽位全部选好具体装备 + 子职业已记录。
const EDITOR_SLOTS = [
  { name: "动能武器", dom: "kinetic", target: { name: "明日之眼", item_type: "火箭发射器", location: "目标角色 · 已装备", instance_tail: "4f21", plug_count: 3 }, match: { status: "selected" } },
  { name: "能量武器", dom: "energy", target: { name: "无常", item_type: "脉冲步枪", location: "目标角色 · 已装备", instance_tail: "9a03", plug_count: 2 }, match: { status: "selected" } },
  { name: "威能武器", dom: "power", target: { name: "先兆", item_type: "剑", location: "仓库", instance_tail: "1c77", plug_count: 1 }, match: { status: "selected" } },
  { name: "头盔", dom: "helmet", target: { name: "先兆之壳", item_type: "头盔", location: "目标角色 · 已装备", instance_tail: "3b90", plug_count: 2 }, match: { status: "selected" }, armorRule: "韧性 +10", armorAssignment: { final: 10, capacity: 10 } },
  { name: "臂铠", dom: "gauntlets", target: { name: "先兆之握", item_type: "臂铠", location: "目标角色 · 已装备", instance_tail: "7d15", plug_count: 1 }, match: { status: "selected" }, armorRule: "纪律 +5", armorAssignment: { final: 8, capacity: 10 } },
  { name: "胸甲", dom: "chest", target: { name: "先兆之胸", item_type: "胸甲", location: "猎人身上", instance_tail: "5e42", plug_count: 0 }, match: { status: "selected" }, armorRule: "自动", armorAssignment: { final: 9, capacity: 10 } },
  { name: "腿甲", dom: "legs", target: { name: "先兆之胫", item_type: "腿甲", location: "邮政官", instance_tail: "8f66", plug_count: 0 }, match: { status: "selected" }, armorRule: "自动", armorAssignment: { final: 7, capacity: 10 } },
  { name: "职业物品", dom: "class-item", target: { name: "先兆印记", item_type: "职业物品", location: "仓库", instance_tail: "2a08", plug_count: 0 }, match: { status: "selected" }, armorRule: "不装", armorAssignment: { final: 5, capacity: 10 } }
];

// 装备选择抽屉里的一屏候选。
const PICKER_ROWS = [
  { name: "明日之眼", location: "目标角色 · 已装备", detail: "光等 2013 · 大师强化", tail: "4f21", selected: true },
  { name: "亡者传说", location: "目标角色 · 背包", detail: "光等 2010", tail: "b713", selected: false },
  { name: "隼月", location: "仓库", detail: "光等 2008", tail: "6c50", selected: false },
  { name: "凛冬之牙", location: "仓库", detail: "光等 2005", tail: "e122", selected: false }
];

const PICKER_FILTERS = [
  ["全部", 4], ["已装备", 1], ["角色库存", 1], ["仓库", 2]
];

// ── 页面骨架零件 ───────────────────────────────────────────────────────────
// 顶栏：mode 决定有没有「新建配装」（产品 :390 只在 local 显示）。
function chromeToolbar({ mode, menuOpen }) {
  return '<div class="loadout-context-toolbar" data-surface="section">'
    + '<div class="loadout-context-group"><span class="loadout-context-label">角色</span>'
    + '<div class="loadout-character-tabs" data-ui-kind="context-switcher" role="group" aria-label="配装角色上下文">'
    + CHARACTERS.map((character, index) =>
      '<button type="button" aria-pressed="' + (index === 0) + '" tabIndex="' + (index === 0 ? 0 : -1) + '">'
      + '<span class="loadout-character-mark" aria-hidden="true">' + character.class_name.slice(0, 1) + "</span>"
      + "<strong>" + character.class_name + "</strong><small>" + character.slots + " 槽</small></button>").join("")
    + "</div></div>"
    + '<span class="loadout-context-divider" aria-hidden="true"></span>'
    + '<div class="loadout-context-group"><span class="loadout-context-label">视图</span>'
    + '<div class="loadout-mode-tabs" data-ui-kind="segmented-control" role="tablist" aria-label="配装类型">'
    + '<button type="button" role="tab" aria-selected="' + (mode === "in-game") + '" data-goto="screen-in-game">游戏内配装 <span>Bungie</span></button>'
    + '<button type="button" role="tab" aria-selected="' + (mode === "local") + '" data-goto="screen-library">应用配装 <span>d2-tools</span></button>'
    + "</div></div>"
    + (mode === "local"
      ? '<div class="loadout-context-actions"><details class="loadout-create-menu"' + (menuOpen ? " open" : "") + ">"
        + '<summary data-ui-kind="button" data-control-variant="primary" aria-haspopup="true">新建配装</summary>'
        + '<div class="loadout-create-options" data-surface="menu" data-ui-kind="command-menu" aria-label="应用配装创建方式">'
        + '<button type="button" data-goto="screen-editor"><strong>使用当前装备</strong><span>使用当前角色已装备内容</span></button>'
        + '<button type="button" data-goto="screen-dim"><strong>更多：导入 DIM</strong><span>从自包含的完整链接预填配装，全程本地解析</span></button>'
        + '<button type="button" data-goto="screen-start"><strong>空白方案</strong><span>带入目标角色后逐槽位创建</span></button>'
        + "</div></details></div>"
      : "")
    + "</div>";
}

function statusBar(tone, title, message) {
  const status = tone === "running" ? "pending" : tone === "ready" ? "success" : tone;
  return '<div class="loadout-operation-status ' + tone + '" data-surface="section" data-status="' + status + '" aria-live="polite">'
    + '<span aria-hidden="true"></span><strong>' + title + "</strong><p>" + message + "</p></div>";
}

function workspace(className, rail, detail, summary) {
  return '<div class="product-split-workspace ' + className + '" data-surface="split" data-ui-kind="workspace-frame">'
    + '<aside class="product-side-rail loadout-directory" data-shell-role="side-rail">' + rail + "</aside>"
    + '<section class="loadout-detail">' + detail + "</section>"
    + '<aside class="loadout-summary">' + summary + "</aside></div>";
}

function columnHead(title, sub) {
  return '<div class="loadout-column-head"><div><strong>' + title + "</strong><small>" + sub + "</small></div></div>";
}

// 产品里 .loadout-page 的两种包裹：浏览态带顶栏和状态条，聚焦态（编辑器/穿戴/存槽位）不带。
function browseStage(toolbar, status, inner) {
  return '<section class="loadout-page" data-flow="browse" aria-label="配装工作台">'
    + toolbar
    + '<div class="loadout-content-frame" data-surface="workspace-frame" data-ui-kind="workspace-frame">'
    + status
    + '<div class="loadout-workspace-panel" role="tabpanel">' + inner + "</div></div></section>";
}

function focusStage(inner) {
  return '<section class="loadout-page" data-flow="focused" aria-label="配装工作台">'
    + '<div class="loadout-content-frame loadout-content-frame-focused" data-surface="workspace-frame" data-ui-kind="workspace-frame">'
    + '<div class="loadout-workspace-panel" role="tabpanel">' + inner + "</div></div></section>";
}

function planEntry(entry, index, compareIds) {
  return '<div class="loadout-application-directory-item">'
    + '<button type="button" id="loadout-application-plan-' + entry.id + '" aria-pressed="' + (index === 0) + '" tabIndex="' + (index === 0 ? 0 : -1) + '"'
    + ' data-status="' + entry.tone + '" class="loadout-directory-row">'
    + '<span class="loadout-directory-index">' + (entry.tone === "warning" ? "!" : "A") + "</span>"
    + "<span><strong>" + entry.title + "</strong><small>" + entry.class_name + " · " + entry.item_count + " 个装备目标</small>"
    + "<small>" + entry.source_label + "</small>"
    + '<small data-status="' + entry.ingame.tone + '">' + entry.ingame.label + "</small></span>"
    + '<em data-status="' + entry.tone + '">' + entry.status + "</em></button>"
    + '<label class="loadout-compare-toggle"><input type="checkbox"' + (compareIds.includes(entry.id) ? " checked" : "") + " /><span>对比</span></label>"
    + "</div>";
}

// ── 01 游戏内配装 ─────────────────────────────────────────────────────────
function inGameItemCard(row) {
  const plugNames = row.plugs;
  return '<details class="loadout-in-game-item-card" data-surface="object-card" data-ui-kind="object-card" data-status="success">'
    + '<summary class="loadout-in-game-item-row">'
    + itemVisual(row.name, row.bucket)
    + '<span class="loadout-in-game-item-copy"><strong>' + row.name + '</strong>'
    + '<span class="loadout-in-game-item-meta">' + row.bucket + "</span>"
    + '<span class="loadout-in-game-item-trace">装备标识 …' + "4f21" + "</span></span>"
    + '<span class="loadout-in-game-item-facts"><span class="loadout-in-game-location">' + row.location + "</span>"
    + '<span class="loadout-in-game-plugs">'
    + (plugNames.length
      ? plugNames.slice(0, 3).map((plug) => "<span>" + plug + "</span>").join("")
        + (plugNames.length > 3 ? "<span>+" + (plugNames.length - 3) + "</span>" : "")
      : "<span>" + (row.plugCount ? row.plugCount + " 项配置" : "模组配置未返回") + "</span>")
    + "</span></span>"
    + '<span class="loadout-in-game-item-state"><em data-status="' + (row.located ? "success" : "warning") + '">'
    + (row.equipped ? "当前已装备" : row.located ? "已定位" : "未定位") + "</em>"
    + "<small>" + (row.equipped ? "目标角色" : row.located ? "等待 Bungie 应用" : "不阻止直接应用") + "</small></span>"
    + '<span class="loadout-in-game-item-chevron" aria-hidden="true">⌄</span></summary>'
    + '<dl class="loadout-in-game-item-extra">'
    + "<div><dt>当前位置</dt><dd>" + row.location + "</dd></div>"
    + "<div><dt>配置类型</dt><dd>" + (plugNames.length ? "已读取模组配置" : "未返回配置") + "</dd></div>"
    + "<div><dt>已确认配置</dt><dd>" + (plugNames.length ? plugNames.join("、") : row.plugCount ? row.plugCount + " 项配置" : "未返回配置") + "</dd></div>"
    + (row.subclass ? subclassDetailBlock() : "")
    + "<div><dt>核对结果</dt><dd>" + (row.equipped ? "目标角色已处于槽位保存状态" : "具体装备已找到，应用时由 Bungie 处理") + "</dd></div>"
    + '<div class="loadout-in-game-item-actions"><dt>装备操作</dt><dd><button type="button" data-ui-kind="button" data-control-variant="secondary">查看装备详情与操作</button>'
    + "<small>转移、穿戴和模组修改会作用于真实装备；如需更新此槽位，完成后再覆盖保存。</small></dd></div>"
    + "</dl></details>";
}

// :690-699 的子职业明细。T58 ① 要读的就是这一块。
function subclassDetailBlock() {
  return '<div class="loadout-in-game-subclass-detail"><dt>子职业构筑</dt><dd>'
    + '<section><strong>超能与技能</strong><span>配置位置 1 · 哨兵护盾、配置位置 2 · 虚空护盾猛击、配置位置 3 · 磁吸手雷、配置位置 4 · 高耸壁垒</span></section>'
    + '<section><strong>星象</strong><span>配置位置 5 · 无畏冲锋、配置位置 6 · 壁垒</span></section>'
    + '<section><strong>碎片</strong><span>配置位置 7 · 记忆碎片、配置位置 8 · 收割碎片、配置位置 9 · 坚持碎片</span></section>'
    + "</dd></div>";
}

function screenInGame() {
  const detail = '<section class="loadout-detail">'
    + '<div class="loadout-application-freshness loadout-in-game-freshness" data-status="success">'
    + '<span aria-hidden="true"></span><strong>装备数据已同步</strong>'
    + "<small>游戏数据 · 更新于 3 分钟前</small></div>"
    + '<header class="loadout-detail-head">'
    + '<div><span class="loadout-eyebrow">游戏内配装 · 槽位 01</span><h2>虚空爆发</h2>'
    + "<p>泰坦 · Bungie 保存的装备记录。未返回的 Perk、技能和模组不会在这里伪造显示。"
    + "这个槽位对得上应用配装「虚空哨兵 · 六维满值」；两侧是两条独立记录，改动应用配装不会写回这里。</p></div>"
    + '<div class="loadout-action-stack">'
    + '<div class="loadout-action-group" aria-label="官方槽位操作"><span>官方槽位</span>'
    + '<button type="button" data-ui-kind="button" data-control-variant="primary">应用游戏内配装</button>'
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary">用当前装备覆盖槽位</button>'
    + '<button type="button" data-ui-kind="button" data-control-variant="danger">清空槽位</button></div>'
    + '<div class="loadout-action-group" aria-label="配装辅助操作"><span>配装辅助</span>'
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-editor">复制到应用配装</button></div>'
    + "</div></header>"
    + '<div class="loadout-section-label"><span>保存的装备 · 当前账号状态</span><span>9 件记录</span></div>'
    + '<div class="loadout-in-game-item-groups" data-surface="content-stack">'
    + IN_GAME_ITEMS.map((group) =>
      '<section class="loadout-in-game-item-group" aria-label="' + group.group + '">'
      + "<header><strong>" + group.group + "</strong><span>" + group.rows.length + " 件</span></header>"
      + '<div class="loadout-in-game-item-list" data-surface="list">'
      + group.rows.map(inGameItemCard).join("") + "</div></section>").join("")
    + "</div>"
    + '<details class="loadout-slot-picker"><summary>修改官方标识</summary>'
    + "<p>仅可选择当前资料库已解析的 Bungie 标识 Hash，不支持自由文本命名。</p>"
    + '<div class="loadout-compare-controls">'
    + "<label><span>名称</span><select><option>虚空爆发</option><option>缚丝预备</option></select></label>"
    + "<label><span>图标</span><select><option>图标 1</option></select></label>"
    + "<label><span>颜色</span><select><option>颜色 1</option></select></label>"
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary">更新标识</button></div></details>'
    + '<section class="loadout-slot-picker" aria-label="用当前装备覆盖目标槽位">'
    + "<header><div><strong>用当前装备覆盖槽位</strong><small>选择 Bungie 真实槽位；已有内容的槽位会在写入前再次确认覆盖。每个角色只有 10 个槽位，用完就没有空位了。</small></div></header>"
    + '<div class="loadout-slot-picker-list" data-surface="list">'
    + IN_GAME_SLOTS.map((slot) =>
      '<button type="button" aria-pressed="' + (slot.index === 0) + '" data-status="' + (slot.occupied ? "warning" : "neutral") + '">'
      + "<span>" + String(slot.index + 1).padStart(2, "0") + "</span>"
      + "<span><strong>" + (slot.occupied ? slot.name : "空槽位 " + (slot.index + 1)) + "</strong><small>"
      + (slot.occupied ? slot.count + " 件装备 · 覆盖需要确认" : "保存当前角色已装备状态")
      + (slot.link ? " · 对得上 " + slot.link.replace("应用配装 · ", "") : "") + "</small></span></button>").join("")
    + "</div>"
    + '<footer><button type="button" data-ui-kind="button" data-control-variant="primary">确认覆盖</button></footer></section>'
    + '<footer class="loadout-detail-footer"><p>应用时直接调用 Bungie 槽位，d2-tools 不会预先转移或逐件装备。</p></footer>'
    + "</section>";

  const summary = columnHead("装备数据核对", "当前同步结果")
    + '<dl class="loadout-ledger">'
    + "<div><dt>保存装备</dt><dd><b>9</b><small>槽位实际返回的装备记录</small></dd></div>"
    + '<div data-status="success"><dt>已找到</dt><dd><b>9</b><small>当前账号中可以找到具体装备</small></dd></div>'
    + '<div data-status="success"><dt>未定位</dt><dd><b>0</b><small>不阻止 Bungie 直接应用</small></dd></div></dl>'
    + summaryChecks([["success", "6 件装备已在目标角色身上。"], ["success", "3 件装备已在背包、其他角色或仓库中定位。"],
      ["success", "槽位 01 对得上应用配装「虚空哨兵 · 六维满值」，两侧内容一致。"],
      ["warning", "槽位 02 的应用配装「缚丝预备 · 纪律向」内容不同，不是同一份构筑。"]])
    + '<p class="loadout-guidance">游戏内配装由 Bungie 直接应用。未定位记录用于账号核对，不代表官方槽位不可用，也不会被应用配装自动替换。'
    + "官方槽位每个角色只有 10 个；应用配装存在本地，数量没有上限，两侧不一对一。</p>";

  // 左栏：官方槽位。数量上限 10 是 Bungie 的，不是应用的——应用配装那栏没有上限。
  const occupied = IN_GAME_SLOTS.filter((slot) => slot.occupied).length;
  const rail = columnHead("Bungie 游戏内配装", occupied + " 个已保存槽位 · 每角色上限 10")
    + '<div class="loadout-entry-list" data-surface="list">'
    + IN_GAME_SLOTS.map((slot, index) =>
      '<button type="button" aria-pressed="' + (index === 0) + '" data-status="' + (slot.occupied ? "success" : "neutral") + '" class="loadout-directory-row">'
      + '<span class="loadout-directory-index">' + String(slot.index + 1).padStart(2, "0") + "</span>"
      + "<span><strong>" + (slot.name || "空槽位 " + (slot.index + 1)) + "</strong>"
      + "<small>" + (slot.occupied ? slot.count + " 件保存装备" : "未保存内容") + "</small>"
      + (slot.link ? '<small data-status="success">' + slot.link + "</small>" : "") + "</span>"
      + "<em>Bungie</em></button>").join("")
    + "</div>";

  return browseStage(
    chromeToolbar({ mode: "in-game", menuOpen: false }),
    statusBar("ready", "就绪", "选择游戏内配装槽位后再应用或保存当前装备。"),
    workspace("loadout-workspace loadout-native-workspace", rail, detail, summary)
  );
}

// ── 02 方案库 ─────────────────────────────────────────────────────────────
function libraryDetail(entry, options = {}) {
  if (options.panel) return options.panel;
  const detail = options.detail || PLANS[0];
  const note = options.note
    ? '<p class="loadout-callout" data-ui-kind="callout" data-status="neutral">' + options.note + "</p>"
    : "";
  return '<div class="loadout-application-detail">' + note
    + '<header class="loadout-detail-head">'
    + '<div><span class="loadout-eyebrow">应用配装 · ' + detail.class_name + "</span><h2>" + detail.title + "</h2>"
    + "<p>" + detail.source_label + " · 更新于 2026-09-20 14:20</p></div>"
    + '<div class="loadout-action-stack">'
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary">加入对比</button>'
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-editor">编辑</button>'
    + '<button id="loadout-wear-plan-p1" type="button" data-ui-kind="button" data-control-variant="primary" data-goto="screen-wear">穿戴此方案</button>'
    + "</div></header>"
    + '<div class="loadout-application-freshness" data-status="success"><span aria-hidden="true"></span>'
    + "<strong>装备数据已同步 · 游戏数据 · 更新于 3 分钟前</strong>"
    + "<small>穿戴前会刷新并重新核对具体装备、位置、模组与能量。</small></div>"
    + '<section class="loadout-build-overview" aria-label="构筑总览">'
    + "<article><span>子职业</span><strong>定义 2842471112</strong><small>2 星相 · 3 碎片</small></article>"
    + "<article><span>装备目标</span><strong>9 项</strong><small>9 项已选择具体装备</small></article>"
    + '<article data-status="success"><span>账号核对</span><strong>可穿戴</strong><small>基于当前账号数据</small></article></section>'
    + '<div class="loadout-section-label"><span>装备与模组</span><span>9 个目标 · 13 项模组配置</span></div>'
    + '<div class="loadout-readonly-slot-grid">'
    + EDITOR_SLOTS.map((slot) =>
      '<article class="loadout-readonly-slot" data-surface="object-card" data-ui-kind="object-card" data-status="success">'
      + itemVisual(slot.target.name, slot.name)
      + "<div><span>" + slot.name + "</span><strong>" + slot.target.name + "</strong><small>"
      + (slot.target.plug_count ? slot.target.plug_count + " 项目标模组" : "未指定模组") + "</small></div>"
      + '<em data-status="success">已选装备</em></article>').join("")
    + "</div>"
    + '<section class="loadout-plan-notes"><strong>方案备注</strong><p>六维全部达标，腿甲在邮政官，穿戴时会自动转移。</p></section>'
    + '<footer class="loadout-detail-footer loadout-danger-footer"><p>应用配装与游戏内配装相互独立；只有穿戴验证成功后才能保存到游戏内槽位。</p>'
    + '<button type="button" data-ui-kind="button" data-control-variant="danger">删除应用配装</button></footer></div>';
}

function librarySummary(entry) {
  return '<div class="loadout-quick-actions">'
    + columnHead("穿戴准备", entry.title)
    + '<dl class="loadout-ledger">'
    + '<div data-status="success"><dt>已绑定</dt><dd><b>9</b><small>账号中的具体装备</small></dd></div>'
    + '<div data-status="success"><dt>待处理</dt><dd><b>0</b><small>需选择或补齐</small></dd></div>'
    + "<div><dt>执行步骤</dt><dd><b>" + EXECUTION_STEPS.length + "</b><small>穿戴前重新生成</small></dd></div></dl>"
    + summaryChecks([["success", "穿戴前刷新账号并核对计划。"], ["success", "步骤失败后停止后续写入。"], ["success", "穿戴验证后才允许保存到游戏内槽位。"]])
    + '<div class="loadout-sticky-primary-actions">'
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-editor">编辑方案</button>'
    + '<button id="loadout-quick-wear-p1" type="button" data-ui-kind="button" data-control-variant="primary" data-goto="screen-wear">穿戴此方案</button>'
    + "</div></div>";
}

function screenLibrary(options = {}) {
  const compareIds = ["p1", "p2", "p3"];
  // 「不限数量」是和应用配装这一侧的真实差别：游戏内每角色封顶 10 个。
  const rail = columnHead("应用配装", PLANS.length + " 个完整构筑方案 · 本地保存，不限数量")
    + '<div class="loadout-entry-list" data-surface="list">'
    + PLANS.map((entry, index) => planEntry(entry, index, compareIds)).join("")
    + "</div>"
    + '<div class="loadout-compare-dock"><span>已选择 3 个方案，可以开始比较。</span>'
    + '<label><span>游戏内只读参照</span><select><option value="">不加入</option><option>泰坦 · 虚空爆发</option></select></label>'
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-compare">比较方案</button></div>';

  return browseStage(
    chromeToolbar({ mode: "local", menuOpen: options.menuOpen === true }),
    statusBar("ready", "就绪", "应用配装保存在本应用中，只有显式穿戴或保存到游戏内槽位才会写入 Bungie。"),
    workspace(
      "loadout-workspace loadout-local-workspace loadout-compact-detail",
      rail,
      libraryDetail(PLANS[0], options),
      options.panel ? summaryHead("warning", "仍需处理") + '<div class="loadout-summary-empty"><strong>先选择一个应用配装</strong><span>从左侧目录选择方案后，这里显示穿戴准备。</span></div>' : librarySummary(PLANS[0])
    )
  );
}

// ── 03 导入 DIM · 粘贴链接 ────────────────────────────────────────────────
// 产品是两个状态（:2140-2166）：没读出预览时只有输入框和「读取并预览」，
// 读出预览后才长出预览块和「使用此预览」。上一版只画了后半段，前半段是玩家的第一步。
function screenDimInput() {
  return screenLibrary({ menuOpen: true, panel: '<section class="loadout-capability-notice" data-status="neutral" aria-label="DIM 配装导入">'
    + "<div><strong>导入 DIM 配装</strong>"
    + "<p>粘贴包含配装数据的完整链接后在本地解析；不支持 dim.gg 短链接，也不会请求 DIM 接口。确认后只会预填应用配装编辑器。</p>"
    + '<label class="loadout-dim-url-field"><span>DIM 完整配装链接</span>'
    + '<input value="https://app.destinyitemmanager.com/loadouts?loadout=..." /></label></div>'
    + '<div class="loadout-action-stack">'
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-library">取消</button>'
    + '<button type="button" data-ui-kind="button" data-control-variant="primary" data-goto="screen-dim-preview">读取并预览</button>'
    + "</div></section>" });
}

// ── 04 导入 DIM · 预览确认 ────────────────────────────────────────────────
function screenDimPreview() {
  return screenLibrary({ menuOpen: true, panel: '<section class="loadout-capability-notice" data-status="neutral" aria-label="DIM 配装导入">'
    + "<div><strong>导入 DIM 配装</strong>"
    + "<p>粘贴包含配装数据的完整链接后在本地解析；不支持 dim.gg 短链接，也不会请求 DIM 接口。确认后只会预填应用配装编辑器。</p>"
    + '<label class="loadout-dim-url-field"><span>DIM 完整配装链接</span>'
    + '<input value="https://app.destinyitemmanager.com/loadouts?loadout=..." /></label>'
    + '<div class="loadout-dim-preview" data-surface="list"><strong>虚空哨兵 · 六维满值</strong>'
    + "<small>泰坦 · 9 个装备目标</small><small>2 条提示：护甲属性模组按 +10 目标还原；子职业配置不在 DIM 链接里。</small></div></div>"
    + '<div class="loadout-action-stack">'
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-library">取消</button>'
    + '<button type="button" data-ui-kind="button" data-control-variant="primary" data-goto="screen-editor">使用此预览</button>'
    + "</div></section>" });
}

// ── 04 AI 攻略导入 ────────────────────────────────────────────────────────
function screenGuide() {
  return screenLibrary({ panel: '<section class="loadout-capability-notice loadout-guide-intake" data-status="neutral" aria-label="从攻略生成方案">'
    + "<div><strong>从攻略生成方案</strong>"
    + "<p>粘贴攻略链接或正文。系统会读取内容、识别装备要求并与当前泰坦账号装备核对。</p>"
    + '<label class="loadout-dim-url-field"><span>攻略链接或正文</span>'
    + '<textarea rows="6">虚空泰坦六维满值配装：超能带哨兵护盾，星象用无畏冲锋 + 壁垒，碎片带记忆、收割、坚持。'
    + "头部优先韧性 100，职业 50。武器用明日之眼 / 无常 / 先兆。</textarea></label></div>"
    + '<div class="loadout-action-stack">'
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-library">取消</button>'
    + '<button type="button" data-ui-kind="button" data-control-variant="primary" data-goto="screen-targets">分析并生成草稿</button>'
    + "</div></section>" });
}

// ── 05 AI 装备目标审阅 ────────────────────────────────────────────────────
function screenTargets() {
  const candidates = [
    { name: "明日之眼", group: "武器", note: "目标角色 · 已装备", owned: true },
    { name: "无常", group: "武器", note: "目标角色 · 已装备", owned: true },
    { name: "先兆", group: "武器", note: "仓库", owned: true },
    { name: "先兆之壳", group: "护甲", note: "目标角色 · 已装备", owned: true },
    { name: "先兆之握", group: "护甲", note: "目标角色 · 已装备", owned: true },
    { name: "先兆之胸", group: "护甲", note: "当前只有资料记录，待获取具体装备", owned: false },
    { name: "先兆之胫", group: "护甲", note: "当前只有资料记录，待获取具体装备", owned: false }
  ];
  const owned = candidates.filter((candidate) => candidate.owned).length;
  return screenLibrary({ panel: '<section class="loadout-capability-notice loadout-assistant-target-review" data-status="neutral" aria-label="装备目标审阅">'
    + '<div class="loadout-assistant-target-content"><strong>审阅 AI 装备目标</strong>'
    + "<p>选择要带入草稿的装备。账号中已有的装备会直接选中；仅有装备定义的目标仍需先获取，再选择具体装备。</p>"
    + '<p data-status="neutral">目标角色：泰坦 · 账号已有 ' + owned + " 件 · 待获取 " + (candidates.length - owned) + " 件 · 已选 " + candidates.length + " 项</p>"
    + '<ul class="loadout-assistant-target-list" data-surface="list">'
    + candidates.map((candidate) =>
      "<li data-status=\"" + (candidate.owned ? "success" : "warning") + "\"><label>"
      + '<input type="checkbox" checked /><span><strong>' + candidate.name + "</strong><small>"
      + candidate.group + " · " + candidate.note + "</small></span></label></li>").join("")
    + "</ul></div>"
    + '<div class="loadout-action-stack">'
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-library">取消</button>'
    + '<button type="button" data-ui-kind="button" data-control-variant="primary" data-goto="screen-editor">生成未保存草稿</button>'
    + "</div></section>" });
}

// ── 07 方案对比 ───────────────────────────────────────────────────────────
// 对比是**浏览态**：产品 `focusedApplicationFlow`（:217-219）把 library 和 compare 都排除在外，
// 所以顶栏和状态条照旧在，对比页只是内容区里的一页。上一版拿 focusStage 画，把顶栏收掉了。
function screenCompare() {
  const head = '<header class="loadout-subpage-head">'
    + '<button class="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-library">返回方案库</button>'
    + '<div><span class="loadout-eyebrow">应用配装</span><h2>方案对比</h2>'
    + "<p>已选择 3 个方案 + 1 个游戏内只读参照 · 共 9 处差异。</p></div>"
    + '<label class="loadout-diff-toggle"><input type="checkbox" checked /><span>仅显示差异</span></label></header>';
  const columns = COMPARE_PLANS.map((plan) =>
    "<div><strong>" + plan.title + "</strong><small>" + plan.class_name + " · " + plan.item_count + " 个装备目标</small>"
    + "<footer>"
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary">移出</button>'
    + '<button type="button" data-ui-kind="button" data-control-variant="primary" data-goto="screen-library">查看</button></footer></div>').join("")
    // 游戏内只读参照：拿一份官方槽位快照参与共同字段比较，但不改变身份。
    + "<div><strong>虚空爆发</strong><small>游戏内槽位 01 · Bungie</small>"
    + "<em>游戏内只读参照 · 部分字段未知</em>"
    + "<footer>"
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary">移出参照</button></footer></div>';
  // 单元格状态照产品的取值：changed / same / empty / unknown。
  // 空值走 `empty`（破折号），游戏内只读参照没返回的字段走 `unknown`——
  // 产品对这两个状态各有自己的样式（03-workspace.css:2094-2095），不区分就看不出来。
  const cellState = (value, changed) => (!value ? "empty" : changed ? "changed" : "same");
  const rows = COMPARE_ROWS.map(([label, cells, reference, changed]) =>
    '<div class="loadout-compare-table-row"' + (changed ? ' data-changed="true"' : "") + "><strong>" + label + "</strong>"
    + cells.map((cell) => '<span data-state="' + cellState(cell, changed) + '">' + (cell || "—") + "</span>").join("")
    + '<span data-state="' + (reference === "未返回" ? "unknown" : "same") + '">' + reference + "</span></div>").join("");
  return browseStage(
    chromeToolbar({ mode: "local", menuOpen: false }),
    statusBar("ready", "就绪", "对比不修改草稿；游戏内只读参照未返回的字段显示「未返回」，不按名字补造。"),
    '<section class="loadout-compare-page" aria-label="应用配装对比">'
    + head
    + '<div class="loadout-compare-table" style="--loadout-compare-count: 4">'
    + '<div class="loadout-compare-table-head"><span>比较项</span>' + columns + "</div>"
    + rows + "</div></section>"
  );
}

// ── 07 编辑器 · 构筑 ──────────────────────────────────────────────────────
// 编辑头。三种非默认状态各有各的来路，混在一起会看不出「这套草稿是哪来的」：
//   empty       新建 → 空白方案（:1435-1458）。草稿在进编辑器时就自动建好了，名字还空着，
//               保存按钮按产品规则禁用，穿戴要等保存之后（`props.localPlanEditingId` 才有值）。
//   created     路径 C：草稿也是应用内新建的，但已经配了东西（护甲先落定、武器还没补）。
//               和 empty 同样是「未保存草稿」，只是内容不再是空的——所以两个标记分开。
//   fromCurrent 路径 A：读当前角色身上这套落成草稿，内容满、名字空、还没保存过。
//   loaded      路径 D：从方案库打开一套已保存的，内容是它的，改动是未保存的。
function editorHead(options = {}) {
  const empty = options.empty === true;
  const created = options.created === true;
  const fromCurrent = options.fromCurrent === true;
  const loaded = options.loaded === true;
  const unsaved = empty || created || fromCurrent;
  const eyebrow = empty || created
    ? "应用内创建 · 未保存草稿"
    : fromCurrent
      ? "当前装备 · 未保存草稿"
      : loaded
        ? "应用方案库 · 已保存方案"
        : "当前装备 · 编辑已保存方案";
  const nameField = unsaved
    ? "<label><span>方案名称</span><input value=\"\" aria-label=\"配装名称\" placeholder=\"未命名方案\" /></label>"
    : "<label><span>方案名称</span><input value=\"虚空哨兵 · 六维满值\" aria-label=\"配装名称\" /></label>";
  const saveState = unsaved ? "尚未保存" : "有未保存修改";
  const saveDisabled = empty ? " disabled" : "";
  return '<header class="loadout-subpage-head loadout-editor-head">'
    + '<button class="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-library">返回方案库</button>'
    + '<div class="loadout-editor-title-block"><span class="loadout-eyebrow">' + eyebrow + "</span>"
    + '<div class="loadout-editor-title-fields">' + nameField
    + "<label><span>目标角色</span><select aria-label=\"目标角色\"><option>泰坦 · 10 个游戏内槽位</option><option>猎人 · 10 个游戏内槽位</option></select></label>"
    + "</div></div>"
    + '<div class="loadout-action-stack">'
    + '<span class="loadout-editor-save-state" data-status="warning">' + saveState + "</span>"
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary"' + saveDisabled + ">保存</button>"
    + (empty
      ? '<button type="button" data-ui-kind="button" data-control-variant="primary" disabled>保存后穿戴</button>'
      : '<button id="loadout-open-wear-review" type="button" data-ui-kind="button" data-control-variant="primary" data-goto="screen-wear">穿戴</button>')
    + "</div></header>";
}

// 子职业那一段：产品今天是一张只读卡（:1452-1454），T58 ① 候选是右边那张分组面板。
function editorSubclassSection() {
  return '<section class="loadout-slot-editor-section loadout-subclass-section" aria-label="子职业">'
    + '<header class="loadout-local-section-head"><div><strong>子职业构筑</strong>'
    + "<small>优先展示已确认的技能、星相和碎片语义</small></div>"
    + '<div class="loadout-section-head-actions"><span>当前仅记录</span></div></header>'
    + subclassStaticCard()
    + "</section>";
}

// 空草稿的摘要：右侧栏不能因为没内容就空着，也不能伪造六维和缺口。
function editorSummaryEmpty() {
  return '<aside class="loadout-build-summary" aria-label="构筑实时摘要">'
    + '<div class="loadout-decision-pane-head"><div><strong>实时摘要</strong>'
    + "<small>基于当前草稿和账号装备数据</small></div>"
    + '<span data-status="neutral">尚未配置</span></div>'
    + '<div class="loadout-selected-candidate-title" data-status="neutral"><span>草稿已创建</span>'
    + "<strong>还没有可核对的内容</strong><small>选好起点之后，这里显示目标差值、缺口、套装、能量和可执行状态。</small></div>"
    + '<dl class="loadout-summary-stat-grid">'
    + [["韧性"], ["力量"], ["纪律"], ["智力"], ["职业"], ["武器"]]
      .map(([label]) => '<div><dt>' + label + '</dt><dd><strong>—</strong><small>未设目标</small></dd></div>').join("")
    + "</dl>"
    + '<div class="loadout-summary-metrics">'
    + "<div><span>距离目标</span><strong>—</strong></div><div><span>超出目标</span><strong>—</strong></div>"
    + "<div><span>逐件计划</span><strong>0/5</strong></div><div><span>属性模组</span><strong>未设置</strong></div></div>"
    + summaryChecks([["warning", "8 个标准槽位都还空着。"],
      ["warning", "还没有护甲计划；穿戴入口要等方案保存之后才可用。"]])
    + "</aside>";
}

// options.statMinimums：六维最低值。改了目标之后右栏要跟护甲区说同一件事——候选是旧目标下
// 算的，现在差多少。右栏和「方案摘要」共用 kit 里的 ARMOR_STAT_VALUES / statGapSummary。
function editorSummary(options = {}) {
  const minimums = options.statMinimums || DEFAULT_STAT_MINIMUMS;
  const values = ARMOR_STAT_VALUES;
  const { distance, overshoot } = statGapSummary(minimums, values);
  return '<aside class="loadout-build-summary" aria-label="构筑实时摘要">'
    + '<div class="loadout-decision-pane-head"><div><strong>实时摘要</strong>'
    + "<small>基于当前草稿和账号装备数据</small></div>"
    + '<span data-status="ready">可准备穿戴</span></div>'
    + '<div class="loadout-selected-candidate-title" data-status="ready"><span>已保存逐件护甲计划</span>'
    + "<strong>五个部位已恢复</strong><small>摘要来自草稿中的具体装备、模组与能量安排，不依赖临时计算结果。</small></div>"
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
    + "<div><span>逐件计划</span><strong>5/5</strong></div><div><span>属性模组</span><strong>+5 × 1 · +10 × 1</strong></div></div>"
    + '<div class="loadout-persisted-armor-pieces">'
    + ["头盔|先兆之壳|韧性 +10 · 能量 10/10", "臂铠|先兆之握|纪律 +5 · 能量 8/10", "胸甲|先兆之胸|自动 · 能量 9/10", "腿甲|先兆之胫|自动 · 能量 7/10", "职业物品|先兆印记|不装 · 能量 5/10"]
      .map((row) => { const [slot, name, detail] = row.split("|"); return "<div><span>" + slot + "</span><strong>" + name + "</strong><small>" + detail + "</small></div>"; }).join("")
    + "</div>"
    + summaryChecks([["success", "目标角色：泰坦"], ["success", "0 个装备目标等待选择具体装备"], ["success", "0 个缺失或模组无法安装问题"]])
    + "</aside>";
}

// 路径 A 第三屏：草稿是从当前角色身上读回来的。六维是身上这套的实测值，没有任何护甲计划——
// 右栏必须说清这一点，否则读图的人会以为「没跑规划」是漏画了。
const WORN_STAT_VALUES = { health: 61, melee: 34, grenade: 45, super: 28, class: 42, weapon: 30 };
function editorSummaryWorn() {
  return '<aside class="loadout-build-summary" aria-label="构筑实时摘要">'
    + '<div class="loadout-decision-pane-head"><div><strong>实时摘要</strong>'
    + "<small>基于当前草稿和账号装备数据</small></div>"
    + '<span data-status="neutral">还未保存</span></div>'
    + '<div class="loadout-selected-candidate-title" data-status="neutral"><span>来自当前角色身上</span>'
    + "<strong>没有护甲计划</strong><small>六维是身上这套的实测值。想让它达标就展开护甲规划，直接存也可以。</small></div>"
    + '<dl class="loadout-summary-stat-grid">'
    + STATS.map(([key, label]) => '<div><dt>' + label + "</dt><dd><strong>" + WORN_STAT_VALUES[key]
      + "</strong><small>未设目标</small></dd></div>").join("")
    + "</dl>"
    + '<div class="loadout-summary-metrics">'
    + "<div><span>距离目标</span><strong>—</strong></div><div><span>超出目标</span><strong>—</strong></div>"
    + "<div><span>逐件计划</span><strong>0/5</strong></div><div><span>属性模组</span><strong>读到的现状</strong></div></div>"
    + summaryChecks([["success", "3 把武器、5 件护甲、子职业都读自当前角色。"],
      ["warning", "威能武器的 Perk 列表 Bungie 没返回，这一件不带 Perk。"],
      ["warning", "六维没有一项设了目标，也就没有可算的差值。"]])
    + "</aside>";
}

// 路径 C 第三屏：护甲先凑出来了，武器还空着。这条路武器在后，右栏要按这个顺序说。
function editorSummaryArmorOnly() {
  const { distance, overshoot } = statGapSummary(DEFAULT_STAT_MINIMUMS, ARMOR_STAT_VALUES);
  return '<aside class="loadout-build-summary" aria-label="构筑实时摘要">'
    + '<div class="loadout-decision-pane-head"><div><strong>实时摘要</strong>'
    + "<small>基于当前草稿和账号装备数据</small></div>"
    + '<span data-status="warning">还差 3 把武器</span></div>'
    + '<div class="loadout-selected-candidate-title" data-status="ready"><span>护甲已按候选写入草稿</span>'
    + "<strong>五个部位已确定</strong><small>六维按这套候选算的，武器还没选，选了之后六维不变。</small></div>"
    + '<dl class="loadout-summary-stat-grid">'
    + STATS.map(([key, label]) => {
      const minimum = DEFAULT_STAT_MINIMUMS[key];
      const value = ARMOR_STAT_VALUES[key];
      const shortfall = minimum === undefined ? 0 : Math.max(0, minimum - value);
      return '<div data-status="' + (shortfall ? "warning" : "ready") + '"><dt>' + label + "</dt><dd><strong>"
        + value + "</strong><small>" + (minimum === undefined ? "未设目标" : shortfall ? "差 " + shortfall : "目标 " + minimum)
        + "</small></dd></div>";
    }).join("")
    + "</dl>"
    + '<div class="loadout-summary-metrics">'
    + "<div><span>距离目标</span><strong>" + distance + "</strong></div>"
    + "<div><span>超出目标</span><strong>" + overshoot + "</strong></div>"
    + "<div><span>逐件计划</span><strong>5/5</strong></div><div><span>属性模组</span><strong>+5 × 1 · +10 × 1</strong></div></div>"
    + summaryChecks([["success", "五件护甲的属性模组与能量已写进草稿。"],
      ["warning", "动能、能量、威能三个槽位还空着。"],
      ["warning", "子职业还没读；碎片读数已经按当前角色算进六维了。"]])
    + "</aside>";
}

// options.dirty：护甲设置改过、还没重算——候选留着，接受按钮禁用（T92 第 4 条）。
// options.dirtySource：是哪一类设置变了（`stats` / `mods` / `fragments`，见 kit 的 DIRTY_REASON）。
//   三类都会作废候选，但执行前有没有闸门不一样，所以原型要各出一屏、各说各的。
// options.truncated：搜索撞到 state_limit 被截断，结果区要明说。
// options.empty：新建 → 空白方案，草稿已自动建好但一个槽位都没配（:1433-1435 的 showBuildStart）。
// options.fromCurrent：路径 A 的草稿，从当前角色身上读回来的，8 个槽都满、没有护甲计划。
// options.weaponsPending：路径 C 的中间态，护甲先凑出来了，三把武器还空着（这条路武器在后）。
function editorBody(options = {}) {
  const armorOpen = options.armorOpen === true;
  const dirty = options.dirty === true;
  const dirtySource = options.dirtySource || "mods";
  const truncated = options.truncated === true;
  const empty = options.empty === true;
  const created = options.created === true;
  const fromCurrent = options.fromCurrent === true;
  const loaded = options.loaded === true;
  const weaponsPending = options.weaponsPending === true;
  const screenKey = empty
    ? "build-start"
    : armorOpen
      ? (dirty ? (dirtySource === "mods" ? "armor-dirty" : "armor-dirty-" + dirtySource) : "armor")
      : fromCurrent
        ? "from-current"
        : weaponsPending
          ? "armor-picked"
          : "editor";
  // 每屏只演示改了**一类**设置，其余输入保持原样——玩家不会同时改三类，
  // 全都标成“已改”反而看不出是哪一格触发的重算。
  const dirtyMods = dirty && dirtySource === "mods";
  // 六维最低值在三处出现：设置面板的输入框、方案摘要的对照、右栏实时摘要。只能有一个值。
  const statMinimums = dirty && dirtySource === "stats" ? { health: 110, class: 50 } : undefined;
  const armorPanel = armorOpen
    ? '<section class="loadout-inline-armor-planner" aria-label="按属性目标自动配甲">'
      + '<header class="loadout-inline-armor-head">'
      + '<div><span class="loadout-eyebrow">护甲与模组 · 当前库存</span><h3 id="loadout-inline-armor-title" tabIndex="-1">按属性目标自动配甲</h3>'
      + "<p>先设置五个部位的属性模组，再从推荐方案中选择一套写回当前构筑。</p></div>"
      + '<div><button type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-editor">收起</button></div></header>'
      + (options.armorNote ? '<p class="loadout-callout" data-ui-kind="callout" data-status="neutral">'
        + options.armorNote + "</p>" : "")
      + '<section class="loadout-armor-decision-workspace" aria-label="按属性目标自动配甲">'
      + armorConstraintsPane({
        fragmentPanel: dirtySource === "fragments" ? fragmentAdjustmentsAfter() : fragmentAdjustmentsBefore(),
        dirty: dirty,
        dirtySource: dirtySource,
        statMinimums: statMinimums,
        modSummary: dirtyMods ? "+5 × 0 · +10 × 2 · 自动 3" : undefined,
        modRules: dirtyMods
          ? [["头盔", "plus10", "韧性", "+10 × 1 · 自动 4"], ["臂铠", "plus10", "纪律", "+10 × 1"],
            ["胸甲", "auto", null, null], ["腿甲", "auto", null, null], ["职业物品", "none", null, null]]
          : undefined
      })
      + armorSummaryPane({
        dirty: dirty,
        dirtySource: dirtySource,
        statMinimums: statMinimums,
        modSummary: dirtyMods ? "+5 × 0 · +10 × 2 · 自动 3" : undefined,
        pending: options.armorPending === true
      })
      + armorResultsPane({ dirty: dirty, dirtySource: dirtySource, truncated: truncated, pending: options.armorPending === true })
      + "</section></section>"
    : "";
  const buildStart = empty
    ? '<section class="loadout-build-start" aria-label="开始创建配装">'
      + '<div><span class="loadout-eyebrow">选择构筑起点</span><h3>先确定从哪里开始</h3>'
      + "<p>可以带入当前角色装备、先运行护甲规划，或直接选择第一个装备槽位。</p></div>"
      + '<div class="loadout-build-start-actions">'
      + '<button type="button" data-ui-kind="button" data-control-variant="primary" data-goto="screen-editor">从当前装备开始</button>'
      + '<button id="loadout-open-armor-planner" type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-armor">按属性目标自动配甲</button>'
      + '<button type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-picker">手动选择装备</button>'
      + "</div></section>"
    : "";
  const weaponSlots = empty || weaponsPending
    ? [{ name: "动能武器", dom: "kinetic" }, { name: "能量武器", dom: "energy" }, { name: "威能武器", dom: "power" }]
    : [
      { name: "动能武器", dom: "kinetic", target: EDITOR_SLOTS[0].target, match: EDITOR_SLOTS[0].match },
      { name: "能量武器", dom: "energy", target: EDITOR_SLOTS[1].target, match: EDITOR_SLOTS[1].match },
      { name: "威能武器", dom: "power", target: EDITOR_SLOTS[2].target, match: EDITOR_SLOTS[2].match }
    ];
  const armorSlots = empty
    ? ["头盔", "臂铠", "胸甲", "腿甲", "职业物品"].map((name, index) => ({
      name: name, dom: ["helmet", "gauntlets", "chest", "legs", "class-item"][index], armorRule: "自动"
    }))
    : EDITOR_SLOTS.slice(3);
  const filledCount = empty ? "0/8" : weaponsPending ? "5/8" : "8/8";
  const summary = empty
    ? editorSummaryEmpty()
    : fromCurrent
      ? editorSummaryWorn()
      : weaponsPending
        ? editorSummaryArmorOnly()
        : editorSummary({ statMinimums: statMinimums });

  return '<div class="loadout-subpage" data-screen="' + screenKey + '">'
    + editorHead({ empty: empty, created: created, fromCurrent: fromCurrent, loaded: loaded })
    + '<section class="loadout-editor-decision-workspace" aria-label="应用配装决策工作区">'
    + '<main class="loadout-build-canvas">'
    + '<div class="loadout-decision-pane-head"><div><strong>当前构筑</strong>'
    + "<small>子职业、三件武器和五件护甲使用同一个未保存草稿</small></div><span>"
    + filledCount + " 槽已配置</span></div>"
    + (options.entryNote
      ? '<p class="loadout-callout" data-ui-kind="callout" data-status="neutral">' + options.entryNote + "</p>"
      : "")
    + buildStart
    + editorSubclassSection()
    + slotGroup("武器", "动能、能量和威能紧凑排列，空槽不占据构筑主视野", "weapon", weaponSlots)
    + '<section class="loadout-slot-editor-section loadout-slot-editor-armor" aria-label="护甲与模组">'
    + '<header class="loadout-local-section-head"><div><strong>护甲与模组</strong>'
    + "<small>五件护甲分别保存调整、属性模组、其他模组与能量占用</small></div>"
    + '<div class="loadout-section-head-actions"><span>5 个固定槽位</span>'
    + '<button' + (empty ? "" : ' id="loadout-open-armor-planner"') + ' type="button" data-ui-kind="button" data-control-variant="' + (empty || armorOpen ? "secondary" : "primary") + '" aria-expanded="' + armorOpen + '" data-goto="' + (armorOpen ? "screen-editor" : "screen-armor") + '">'
    + (armorOpen ? "收起护甲规划" : "按属性目标自动配甲") + "</button></div></header>"
    + '<ul class="loadout-item-list loadout-slot-editor-grid" data-group="armor" data-surface="list">'
    + armorSlots.map((slot) => slotRowFromEditor(slot)).join("")
    + "</ul></section>"
    + armorPanel
    + "</main>"
    + (empty ? editorSummaryEmpty() : editorSummary({ statMinimums: statMinimums }))
    + "</section></div>";
}

// 编辑器的护甲槽位行。抽出来是因为空草稿那屏用的是同一份 DOM，只是没有 target。
// `data-clickable="true"` 不能漏：产品在 LoadoutsPageContentView.tsx:2119 那行 li 上是有的。
// 掉了它，`.loadout-item` 就落到「非 clickable」那套栅格（44px + 三个内容列），
// 而 li 的实际子节点只有主按钮和 actions 两个，于是角标和「清空」正好压到名字上。
function slotRowFromEditor(slot) {
  if (!slot.target) {
    return '<li class="loadout-empty-standard-slot"><button type="button" id="loadout-slot-' + slot.dom + '" data-ui-kind="button" data-goto="screen-picker">'
      + '<span class="loadout-slot-index">+</span>'
      + "<span><strong>" + slot.name + "</strong><small>" + slot.armorRule + " · 选择真实护甲</small></span></button></li>";
  }
  return '<li class="loadout-item" data-status="success" data-clickable="true" id="loadout-slot-' + slot.dom + '">'
    + '<button type="button" class="loadout-item-primary" aria-label="更换' + slot.name + '装备" data-goto="screen-picker">'
    + itemVisual(slot.target.name, slot.name)
    + '<div class="loadout-item-copy"><strong>' + slot.target.name + "</strong><small>" + slot.name + " · " + slot.target.item_type + "</small></div>"
    + '<div class="loadout-item-match"><strong>' + slot.target.location + " · 装备标识 …" + slot.target.instance_tail + "</strong><small>"
    + slot.armorRule + " · 计划能量 " + slot.armorAssignment.final + "/" + slot.armorAssignment.capacity + "</small></div></button>"
    + '<div class="loadout-item-actions"><span class="loadout-status-badge" data-status="success">已选装备</span>'
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary">清空</button></div></li>';
}

function screenEditor() {
  return focusStage(editorBody({ armorOpen: false }));
}

function screenStart() {
  return focusStage(editorBody({ empty: true }));
}

// 路径 A 第 3 屏：草稿已经按读回来的内容建好了，8 个槽都满、没有护甲计划。
function screenEditorFromCurrent() {
  return focusStage(editorBody({
    fromCurrent: true,
    entryNote: "草稿是从当前角色身上读回来的：三把武器、五件护甲、子职业都填好了。"
      + "护甲没有计划——现在这五件就是身上穿的，连模组一起读的。"
  }));
}

// 路径 C 第 4 屏：护甲那一步落定了，这里补三把武器。武器不参与六维，补完不用重算护甲。
function screenWeaponsAfterArmor() {
  return focusStage(editorBody({
    created: true,
    entryNote: "护甲已经按候选写进草稿。这里补三把武器——武器不影响六维，补完之后护甲不用重算。"
  }));
}

// 路径 D 第 1 屏：从已有方案进去。方案库这一屏同时是「两个来源」里应用侧那一条，
// 所以它既是浏览入口，也是「改一套」的起点。
function screenLibraryOpen() {
  return screenLibrary({
    note: "这是「改一套」的起点：从目录里打开一套已经存好的方案。"
      + "游戏内槽位那一侧不能这样改——Bungie 的槽位只能整体覆盖，改不了其中一件。"
  });
}

function screenEditorLoaded() {
  return focusStage(editorBody({
    loaded: true,
    entryNote: "从方案库打开的「六维满值」：装备目标、护甲计划和属性模组都是这套存下来的。"
      + "接下来动任何一处，都是对这套已有方案的修改，还没保存。"
  }));
}

// 路径 D 第 4 屏：打开护甲面板，还没动任何设置。这份候选就是方案里存下来的那份。
function screenArmorLoaded() {
  return focusStage(editorBody({
    loaded: true,
    armorOpen: true,
    truncated: true,
    armorNote: "这一套的护甲计划是存下来的：五个部位、逐部位属性模组都在。"
      + "下面任何一处设置改动都会让这份候选作废——改完旧候选留在屏幕上、打脏标记、禁用接受。"
  }));
}

// 护甲规划面板：算出结果后又改了设置。旧候选留在屏幕上但打了脏标记。
function screenArmor() {
  return focusStage(editorBody({ armorOpen: true, truncated: true }));
}

// 三类设置改动各出一屏。产品今天是一刀切：`updateDraft()`（LoadoutsPageContentView.tsx:1143-1146）
// 默认 `resetArmor = true`，任何设置改动都会 `resetArmorPlanner()` 并把 `armor_plan` 从草稿里剥掉，
// 候选当场消失——六维最低值（:1377）、逐部位属性模组（:1379）、规划方式/优先顺序/碎片/套装/范围
// （:1384-1389）、装备目标（:1160-1170）走的都是这条路。T92 第 4 条改的就是这个一刀切。
function screenArmorDirty() {
  return focusStage(editorBody({ armorOpen: true, dirty: true, dirtySource: "mods", truncated: true }));
}

function screenArmorDirtyStats() {
  return focusStage(editorBody({ armorOpen: true, dirty: true, dirtySource: "stats", truncated: true }));
}

function screenArmorDirtyFragments() {
  return focusStage(editorBody({ armorOpen: true, dirty: true, dirtySource: "fragments", truncated: true }));
}

// ── 08 选择装备抽屉 ───────────────────────────────────────────────────────
function screenPicker() {
  const drawer = '<div class="loadout-item-picker-backdrop" role="presentation">'
    + '<aside class="loadout-item-picker-drawer" role="dialog" aria-modal="true" aria-label="选择具体装备">'
    + '<header><div><span class="loadout-eyebrow">选择具体装备</span><h3>动能武器</h3>'
    + "<p>当前装备优先显示；按存放位置筛选后，点击整行即可替换。</p></div>"
    + '<button id="loadout-item-picker-close" type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-editor">关闭</button></header>'
    + '<label class="loadout-item-picker-search"><span>搜索当前槽位</span><input placeholder="搜索名称、类型、光等或位置" /></label>'
    + '<div class="loadout-item-picker-filters" role="group" aria-label="按装备位置筛选">'
    + PICKER_FILTERS.map(([label, count], index) =>
      '<button type="button" aria-pressed="' + (index === 0) + '"><span>' + label + "</span><small>" + count + "</small></button>").join("")
    + "</div>"
    + '<div class="loadout-item-picker-result-meta"><span>' + PICKER_ROWS.length + " / " + PICKER_ROWS.length + " 件可选装备</span><small>整行点击即可选择</small></div>"
    + '<div class="loadout-item-picker-drawer-list">'
    + PICKER_ROWS.map((row) =>
      '<button type="button" class="loadout-item-picker-row" data-surface="object-card" data-ui-kind="object-card"'
      + (row.selected ? ' data-selected="true"' : "") + ' aria-pressed="' + row.selected + '" data-goto="screen-editor">'
      + itemVisual(row.name, "动能武器")
      + '<span class="loadout-item-picker-copy"><strong>' + row.name + "</strong><small>" + row.location + " · " + row.detail + "</small>"
      + "<small>未指定模组 · 装备标识 …" + row.tail + "</small></span>"
      + "<em>" + (row.selected ? "当前" : "选择") + "</em></button>").join("")
    + "</div></aside></div>";
  return focusStage(editorBody({ armorOpen: false }) + drawer);
}

// ── 10 穿戴核对 ───────────────────────────────────────────────────────────
function executionPanelBody({ showPublish, gate }) {
  const report = showPublish
    ? "已完成 " + EXECUTION_STEPS.length + " 步，刷新核对通过。"
    : "已完成 " + EXECUTION_STEPS.length + " 步，刷新核对通过。";
  return '<section class="loadout-armor-workbench" aria-label="穿戴核对">'
    + "<header><div><strong>穿戴步骤</strong><small>计划 8f2a91c4:512；确认后先刷新账号复核，计划未变化才会逐步执行。</small></div>"
    + '<button type="button" data-ui-kind="button" data-control-variant="primary">穿戴此方案</button></header>'
    + '<div class="loadout-dim-export" data-status="success"><div><strong>DIM 链接可生成</strong>'
    + "<small>" + EXECUTION_STEPS.length + " 个装备目标已核对为当前账号中的具体装备。</small></div>"
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary">复制 DIM 链接</button></div>'
    + '<ol class="loadout-plan-step-list">'
    + EXECUTION_STEPS.map((label, index) => "<li><span>" + String(index + 1).padStart(2, "0") + "</span><strong>" + label + "</strong></li>").join("")
    + "</ol>"
    + '<p class="loadout-callout" data-ui-kind="callout" data-status="success">' + report
    + "<small>执行 …8f2a91c4 · 验证 通过</small></p>"
    + (showPublish ? publishPanel() : "")
    + "</section>";
}

// :2362-2384。标题和说明包在 <header> 里，CSS 的 .loadout-slot-picker > header（03-workspace.css:858-879）
// 才命中；产品曾经是裸 strong + small 直接挂着，Bug #104 已修，原型跟着改。
function publishPanel() {
  return '<div class="loadout-slot-picker">'
    + '<header><div><strong>保存到游戏内槽位</strong><small>方案已穿戴并经账号刷新核对。保存前会再次核对当前装备和目标槽位，变化时保持零写入。</small></div></header>'
    + '<div class="loadout-slot-picker-list" data-surface="list">'
    + IN_GAME_SLOTS.map((slot) =>
      '<button type="button" aria-pressed="' + (slot.index === 0) + '" data-status="' + (slot.occupied ? "warning" : "neutral") + '">'
      + "<span>" + String(slot.index + 1).padStart(2, "0") + "</span>"
      + "<span><strong>" + (slot.occupied ? slot.name : "空槽位 " + (slot.index + 1)) + "</strong><small>"
      + (slot.occupied ? "覆盖已有槽位" : "空槽") + "</small></span></button>").join("")
    + "</div>"
    + '<p class="loadout-callout" data-ui-kind="callout" data-status="success">槽位已保存，刷新后的 Bungie 槽位内容核对通过。'
    + "<small>保存 …4b7e0c · 计划 …8f2a91c4</small></p>"
    + '<footer><button type="button" data-ui-kind="button" data-control-variant="primary">确认覆盖并保存</button></footer></div>';
}

function screenWear() {
  const head = '<header class="loadout-subpage-head">'
    + '<button class="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-editor">返回配装编辑器</button>'
    + '<div><span class="loadout-eyebrow">虚空哨兵 · 六维满值</span><h2>穿戴核对</h2>'
    + "<p>执行前会刷新权威账号数据并重新生成不可变计划；任一步骤失败后停止。</p></div></header>";
  const sticky = '<div class="loadout-editor-sticky-actions"><span>穿戴后账号刷新核对通过，可以选择写入一个 Bungie 官方槽位。</span>'
    + '<div><button id="loadout-open-publish" type="button" data-ui-kind="button" data-control-variant="primary" data-goto="screen-publish">保存到游戏内槽位</button></div></div>';
  return focusStage(head + executionPanelBody({ showPublish: false }) + sticky);
}

// ── 11 保存到游戏内槽位 ───────────────────────────────────────────────────
function screenPublish() {
  const head = '<header class="loadout-subpage-head">'
    + '<button class="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-wear">返回穿戴核对</button>'
    + '<div><span class="loadout-eyebrow">虚空哨兵 · 六维满值</span><h2>保存到游戏内槽位</h2>'
    + "<p>应用配装已成功穿戴并刷新核对；选择官方槽位后才会执行 Bungie 写入。</p></div></header>";
  return focusStage(head + executionPanelBody({ showPublish: true }) );
}

// ── 四条路径各自缺的屏 ────────────────────────────────────────────────────
// 四条入法共用一条主干，差别在「第 1 步带进来什么」和「哪几步是空的」。
// 这里补齐每条路独有的那几屏；共用步骤（编辑器 / 护甲 / 核对 / 落盘）复用上面已有的构造器。

// 路径 A 第 1 屏：读哪一身。产品里这条是顶栏「新建配装 → 使用当前装备」（:1435-1472），
// 读的是**当前角色身上正穿着的**，不读背包、仓库和邮政官——那些位置留到穿戴核对时再找。
function screenReadSource() {
  return screenLibrary({ menuOpen: true, panel: '<section class="loadout-capability-notice" data-status="neutral" aria-label="从当前装备开始">'
    + "<div><strong>读取当前装备</strong>"
    + "<p>读的是<em>当前角色身上正穿着</em>的三把武器、五件护甲，加上这个角色的子职业配置。"
    + "不读背包、仓库和邮政官——那三处的位置留到穿戴核对时再找。</p>"
    + '<label class="loadout-dim-url-field"><span>读哪个角色</span>'
    + '<select><option>泰坦 · 光等 2013（当前登录）</option><option>猎人 · 光等 2006</option><option>术士 · 光等 1998</option></select></label>'
    + '<div class="loadout-dim-preview" data-surface="list"><strong>会读到 9 项装备 + 1 份子职业</strong>'
    + "<small>3 把武器 · 5 件护甲 · 1 份子职业配置</small>"
    + "<small>护甲会连当前装着的属性模组和能量一起读进来，作为这套的现状；读不到的部分不会凭空补。</small></div></div>"
    + '<div class="loadout-action-stack">'
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-library">取消</button>'
    + '<button type="button" data-ui-kind="button" data-control-variant="primary" data-goto="screen-a-read">读取</button>'
    + "</div></section>" });
}

// 路径 A 第 2 屏：读回来什么。tone 只表示「读全了没」，不表示这件装备好不好——
// 混在一起读图的人会以为「warning」是这件装备有问题。
const READ_RESULT = [
  ["动能武器", "明日之眼", "当前角色身上", "3 项 Perk 已读到", "success"],
  ["能量武器", "无常", "当前角色身上", "2 项 Perk 已读到", "success"],
  ["威能武器", "先兆", "当前角色身上", "Bungie 没返回 Perk 列表，这件不带 Perk", "warning"],
  ["头盔", "先兆之壳", "当前角色身上", "属性模组 1 项 · 能量 10/10", "success"],
  ["臂铠", "先兆之握", "当前角色身上", "属性模组 1 项 · 能量 8/10", "success"],
  ["胸甲", "先兆之胸", "当前角色身上", "其余模组 4 项 · 能量 9/10", "success"],
  ["腿甲", "先兆之胫", "当前角色身上", "其余模组 3 项 · 能量 7/10", "success"],
  ["职业物品", "先兆印记", "当前角色身上", "没有装模组 · 能量 5/10", "warning"],
  ["子职业", "虚空 · 哨兵", "当前角色身上", "2 星相 · 3 碎片 · 属性加成 +10 / +5", "success"]
];
function screenReadResult() {
  const partial = READ_RESULT.filter((row) => row[4] === "warning").length;
  return screenLibrary({ menuOpen: true, panel: '<section class="loadout-capability-notice" data-status="neutral" aria-label="读取结果">'
    + "<div><strong>读了 9 项装备</strong>"
    + "<p>其中 " + (READ_RESULT.length - partial) + " 项读全，" + partial + " 项只有部分数据。"
    + "没读到的部分照实写出来，草稿里对应的位置会空着等你补。</p>"
    + '<div class="lf-read" data-surface="list">'
    + READ_RESULT.map((row) => '<div data-status="' + row[4] + '">'
      + "<span>" + row[0] + "</span><strong>" + row[1] + "</strong>"
      + "<small>" + row[2] + " · " + row[3] + "</small></div>").join("")
    + "</div></div>"
    + '<div class="loadout-action-stack">'
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-a-read">换一个来源</button>'
    + '<button type="button" data-ui-kind="button" data-control-variant="primary" data-goto="screen-a-editor">用这套建草稿</button>'
    + "</div></section>" });
}

// 路径 A 第 4 屏：护甲这一步在这条路上是可选的。身上这身的六维没达标，
// 但玩家可能就想照原样存下来——所以这里给的是选择，不是必经步骤。
function screenArmorOptional() {
  return focusStage(editorBody({
    armorOpen: true,
    armorPending: true,
    armorNote: "这套是从身上读回来的，六维是现状（韧性 61 · 职业 42），没有一项达标。"
      + "想让它达标就在下面设要求、跑一次；不改也可以直接存——这条来源不强制跑护甲规划。"
  }));
}

// 路径 B 第 4 屏：同一个名字有多个副本，属性和 Perk 不一样，得挑一件。
// 产品今天没有这一步：DIM 和攻略给的都是物品 hash，落到哪一件是随机的。
const ASSIGN_TARGETS = [
  { slot: "威能武器", name: "先兆", need: "目标 Perk：重建 · 斩击", rows: [
    { tail: "1c77", where: "仓库", detail: "Perk 3/4 · 就是目标那两条", selected: true },
    { tail: "9a03", where: "泰坦 · 背包", detail: "Perk 2/4 · 缺「重建」" },
    { tail: "5f21", where: "猎人 · 身上", detail: "Perk 4/4 · 但这件要留给另一套" }
  ] },
  { slot: "头盔", name: "先兆之壳", need: "目标属性模组：韧性 +10", rows: [
    { tail: "3b90", where: "泰坦 · 身上", detail: "韧性模组 · 能量 10/10", selected: true },
    { tail: "7d15", where: "仓库", detail: "纪律模组 · 能量 9/10" }
  ] },
  { slot: "腿甲", name: "先兆之胫", need: "目标属性模组：自动", rows: [
    { tail: "8f66", where: "邮政官", detail: "没有装模组 · 穿戴时要先取回" }
  ] }
];
function screenAssignInstances() {
  const total = ASSIGN_TARGETS.reduce((sum, target) => sum + target.rows.length, 0);
  return screenLibrary({ menuOpen: true, panel: '<section class="loadout-capability-notice" data-status="neutral" aria-label="目标装备配副本">'
    + "<div><strong>目标装备要落在哪一件</strong>"
    + "<p>DIM 链接和攻略给的都是物品 hash，不是具体那一件。同名副本的属性、Perk 和能量不一样，"
    + "选错就等于这套配装白抄。共 " + ASSIGN_TARGETS.length + " 个目标、" + total + " 个候选副本。</p>"
    + '<div class="lf-assign" data-surface="list">'
    + ASSIGN_TARGETS.map((target, index) => "<section>"
      + "<header><span>" + target.slot + "</span><strong>" + target.name + "</strong><small>" + target.need + "</small></header>"
      + '<div class="lf-assign-rows">'
      + target.rows.map((row) => '<label data-status="' + (row.selected ? "success" : "neutral") + '">'
        + '<input type="radio" name="lf-assign-' + index + '"' + (row.selected ? " checked" : "") + " />"
        + "<span><strong>" + row.where + "</strong><small>装备标识 …" + row.tail + " · " + row.detail + "</small></span></label>").join("")
      + "</div></section>").join("")
    + "</div></div>"
    + '<div class="loadout-action-stack">'
    + '<button type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="screen-b-preview">返回预览</button>'
    + '<button type="button" data-ui-kind="button" data-control-variant="primary" data-goto="screen-b-editor">用这些副本</button>'
    + "</div></section>" });
}

// 路径 C 第 1 屏：这条路不读当前装备，起点是仓库。所以一进来就是护甲规划，
// 武器那三个槽还空着——它们是后面才配的。
function screenArmorEntry() {
  return focusStage(editorBody({
    created: true,
    armorOpen: true,
    armorPending: true,
    weaponsPending: true,
    armorNote: "这条路不读当前装备：起点是「我仓库里有什么」。所以三把武器还空着，先凑护甲。"
      + "「当前库存」只用已经在你身上的东西算，凑不出来就会告诉你差多少；"
      + "「理论上限」放开位置限制，用来看这套能到多高。"
  }));
}

// 路径 C 第 2 屏：算出来之后挑一套。护甲先落定，武器还是空的。
function screenArmorCandidate() {
  return focusStage(editorBody({
    created: true,
    armorOpen: true,
    weaponsPending: true,
    armorNote: "按「当前库存」算出来的 5 套达标方案。选一套写进草稿，三把武器之后再加。"
  }));
}

// 路径 C 第 3 屏：护甲已经按候选写进草稿了，武器还是空着。
function screenArmorPicked() {
  return focusStage(editorBody({ created: true, weaponsPending: true }));
}

// 路径 B 第 5 屏 / 路径 D 第 5 屏等多处共用的「核对能不能穿 + 落盘」。
// 四条路走到这里跑的是同一段代码（刷新账号 → 复核计划 → 逐步执行 → 写槽位），
// 差别只在「这一步还要额外决定什么」，所以用一条 note 带过，不另起一套面板。
function screenWearAndPublish(options = {}) {
  const head = '<header class="loadout-subpage-head">'
    + '<button class="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary" data-goto="'
    + (options.back || "screen-editor") + '">返回配装编辑器</button>'
    + '<div><span class="loadout-eyebrow">' + (options.plan || "虚空哨兵 · 六维满值") + '</span><h2>核对能不能穿与落盘</h2>'
    + "<p>执行前刷新权威账号数据并重新生成不可变计划；任一步骤失败就停下，不再往下写。</p></div></header>";
  const note = options.note
    ? '<p class="loadout-callout" data-ui-kind="callout" data-status="neutral">' + options.note + "</p>"
    : "";
  const exit = options.exit
    ? '<section class="loadout-plan-notes" aria-label="存回哪里"><strong>这一套存回哪里</strong>'
      + "<p>存回原方案会把它覆盖掉；另存为会新建一套，原来那套原样不动。</p>"
      + '<div class="loadout-action-stack">'
      + '<button type="button" data-ui-kind="button" data-control-variant="primary">存回「六维满值 · 改前」</button>'
      + '<button type="button" data-ui-kind="button" data-control-variant="secondary">另存为新配装</button>'
      + "</div></section>"
    : "";
  return focusStage(head + note + executionPanelBody({ showPublish: true }) + exit);
}

// ── T58 注：叠在工作流上的一层，默认关 ────────────────────────────────────
function t58Note(title, body) {
  return '<section class="lf-t58-note"><header><span class="lf-t58-tag">T58 注</span><strong>' + title + "</strong></header>"
    + '<div class="lf-t58-body">' + body + "</div></section>";
}

const T58_EDITOR = t58Note("① 读准当前子职业",
  "<p>工作流这一步今天只画得出一张「尚未配置子职业」的只读卡（<code>LoadoutsPageContentView.tsx:1454</code>）——"
  + "草稿里的 <code>subclass_target</code> 只有「从游戏内槽位复制」这条入口会填（<code>plans.ts:243-249</code>）。"
  + "候选是把角色当前装备的子职业按超能 / 技能 / 星象 / 碎分成组读出来，空槽显式画，整块只读。</p>"
  + '<div class="lf-t58-cols">' + '<div>' + subclassStaticReadOnly() + "</div>"
  + '<div class="lf-t58-candidate">' + '<span class="lf-t58-tag">候选</span>' + '<div class="lf-subclass-candidate">' + subclassPanelHtml() + "</div></div></div>"
  + "<p class=\"lf-t58-foot\">判据是 Manifest 的 <code>plugCategoryIdentifier</code> 后缀（.aspects / .fragments），不靠关键词猜。</p>");

function subclassStaticReadOnly() {
  return '<div class="lf-subclass-current">' + subclassStaticCard() + "</div>";
}

function subclassPanelHtml() {
  return SUBCLASS.groups.map((group) =>
    '<section class="t58f-subclass-group"><header><strong>' + group.label + "</strong><small>"
    + group.plugs.length + "/" + group.slots + "</small></header><div class=\"t58f-subclass-chips\">"
    + group.plugs.map((plug) => '<span class="t58f-chip" data-kind="' + group.key + '"><span class="t58f-chip-name">' + plug.name + "</span>"
      + (plug.stats ? Object.entries(plug.stats).map(([stat, value]) => '<em class="t58f-chip-stat">' + (STAT_LABEL[stat] || stat) + " +" + value + "</em>").join("") : "")
      + "</span>").join("")
    + Array.from({ length: Math.max(group.slots - group.plugs.length, 0) })
      .map(() => '<span class="t58f-chip t58f-chip-empty"><span class="t58f-chip-name">空槽</span></span>').join("")
    + "</div></section>").join("");
}

const T58_ARMOR = t58Note("② 星象碎片的属性加成自动进求解器",
  "<p>左边是产品今天的做法：<code>ArmorFragmentAdjustmentsEditor</code>（<code>:1888-1898</code>），六个框默认全 0，"
  + "用户得先在游戏里把星象碎片加起来数一遍。求解器契约早就收这个值——"
  + "<code>fragment_stat_bonuses</code> 加进基础属性（<code>armorSolver.ts:201</code>）并作为 planner 请求的 "
  + "<code>fragment_adjustments</code> 传入（<code>:1182</code>）——只是界面上没人替用户填。</p>"
  + '<div class="lf-t58-cols"><div><span class="lf-t58-tag">现状</span><div class="lf-part">' + fragmentAdjustmentsBefore() + "</div></div>"
  + '<div class="lf-t58-candidate"><span class="lf-t58-tag">候选</span><div class="lf-part">' + fragmentAdjustmentsAfter() + fragmentSumDetail() + "</div></div></div>"
  + "<p class=\"lf-t58-foot\">手工框保留可覆盖，只是不再当默认来源。求和明细是 section 的兄弟节点——"
  + '往里追加兄弟会把 <code>.loadout-armor-fragment-adjustments &gt; div:last-child</code>（<code>03-workspace.css:1391</code>）的两列栅格塌成单列。</p>');

const T58_WEAR = t58Note("③ 应用前的子职业校验闸门",
  "<p>工作流这一步今天只核对装备、位置、模组和能量，不比对子职业。候选是执行前多一道闸门："
  + "把配装记录的子职业指纹和角色此刻的配置比一遍，不一致就零写入。"
  + "参考项目 d2-armor-solver 的 <code>fragmentAdjustmentsMatch</code>（<code>src/app.mjs:3178-3190</code>）是同一道闸门。</p>"
  + '<div class="lf-t58-cols"><div><span class="lf-t58-tag">通过</span>' + gatePanel(GATE.pass) + "</div>"
  + '<div><span class="lf-t58-tag">漂移拦截</span>' + gatePanel(GATE.drift) + "</div></div>"
  + '<p class="lf-t58-foot">指纹按<strong>集合</strong>比较，不按序列化顺序——DIM issue #8718 就是同一批碎片换个 socket 顺序被判成变化、剥离再插一遍。</p>');

// ── T92 注：待重算状态覆盖哪几类设置改动 ─────────────────────────────────
// 三屏各演示一类。关键差别不是文案而是闸门：模组那类执行前会被核对，另外两类不会。
function t92Note(title, body) {
  return '<section class="lf-t92-note"><header><span class="lf-t92-tag">T92 注</span><strong>' + title + "</strong></header>"
    + '<div class="lf-t58-body">' + body + "</div></section>";
}

const T92_DIRTY_BASE =
  "<p>产品今天是一刀切：<code>updateDraft()</code>（<code>LoadoutsPageContentView.tsx:1143-1146</code>）"
  + "默认 <code>resetArmor = true</code>，所以<strong>任何</strong>设置改动都会 <code>resetArmorPlanner()</code> "
  + "并把 <code>armor_plan</code> 从草稿里剥掉——六维最低值（<code>:1377</code>）、逐部位属性模组（<code>:1379</code>）、"
  + "规划方式/优先顺序/碎片/套装/范围（<code>:1384-1389</code>）、装备目标（<code>:1160-1170</code>）走的是同一条路，"
  + "候选当场消失。T92 第 4 条改的就是这个一刀切。</p>"
  + "<p>但三类触发源的<strong>执行前闸门不一样</strong>，所以不能只用一句「设置已变化」带过：</p>"
  + '<ul class="lf-t92-list">'
  + "<li><strong>六维目标（本屏左边改了韧性最低值）</strong>：<strong>没有闸门</strong>。"
  + "<code>validatePlannedArmorAssignments</code>（<code>localPlanExecution.ts:213-332</code>）全文不引用 "
  + "<code>stat_minimums</code>；穿戴状态 <code>getApplicationLoadoutWearState</code>"
  + "（<code>applicationLoadoutWorkspace.ts:405-415</code>）只判 <code>selected_count === item_targets.length</code>。"
  + "摘要区会拿候选里保存的六维去比新目标、冒出「差 N」红字（<code>LoadoutsPageContentView.tsx:1646</code>），"
  + "但那只是文字——按钮照样能点。<strong>「禁用接受」是这一类唯一的一道闸门。</strong></li>"
  + "<li><strong>技能与碎片读数</strong>：也<strong>没有闸门</strong>。碎片加成进求解器当起点"
  + "（<code>armorSolver.ts:201</code>，planner <code>:1182</code>），改了它旧候选就是按旧起点算的。</li>"
  + "<li><strong>逐部位属性模组</strong>：有闸门——<code>localPlanExecution.ts:291-309</code> 逐部位核对 "
  + "none / +5 / +10 / 指定属性，<code>:324-330</code> 核对旧式 +5 / +10 预算，不一致判 gap，"
  + "<code>strictArmorPlan</code>（<code>:187-188</code>）一见 gap 就清空执行步骤。"
  + "但报错发生在<strong>穿戴那一刻</strong>，玩家点下去才知道白填。</li>"
  + "</ul>"
  + "<p>脏标记要点名是哪一类变了，因为重算范围不同：模组改了装备组合往往不变，六维目标或碎片改了可能整套都要换。</p>";

const T92_DIRTY_MODS = t92Note("待重算 · 改了逐部位属性模组", T92_DIRTY_BASE
  + "<p>本屏演示：头盔从 +5 改成 +10、臂铠从 +5 改成 +10。这一类的旧候选即便被接受，"
  + "穿戴时也会被逐部位核对拦下——但那是事后，不是事前。</p>");

const T92_DIRTY_STATS = t92Note("待重算 · 改了护甲要求", T92_DIRTY_BASE
  + "<p>本屏演示：韧性最低值从 100 改成 110。候选六维还是 102，摘要区因此显示「差 8」——"
  + "红字看得见，可它不拦人。</p>");

const T92_DIRTY_FRAGMENTS = t92Note("待重算 · 改了碎片读数", T92_DIRTY_BASE
  + "<p>本屏演示：星象碎片换了，读数比上一轮多了 4 点。候选是按旧读数算的，"
  + "所以它到底达不达标要重算才知道——这也是 T58 第 ③ 条那道穿戴前闸门要挡的东西。</p>");

// ── 屏幕组装 ──────────────────────────────────────────────────────────────
// 主干七步。四条入法都从同一条主干走，差别只在「第 1 步带进来什么」和「哪几步是空的」。
const SPINE = [
  { key: 1, title: "定来源", note: "身上这身 / 外面抄来的 / 自己的库存 / 已存的一套" },
  { key: 2, title: "装武器", note: "三把武器：用哪一件、装什么 Perk" },
  { key: 3, title: "定子职业", note: "只读当前角色的当前配置，不写回" },
  { key: 4, title: "调护甲", note: "六维最低值 / 逐部位属性模组 / 规划方式 / 优先顺序 / 套装要求" },
  { key: 5, title: "挑候选", note: "看六维和距离目标，选中一套写进草稿" },
  { key: 6, title: "核对能不能穿", note: "装备在哪儿、模组能量够不够、目标角色对不对" },
  { key: 7, title: "落盘", note: "存应用配装（不限量）/ 写游戏内槽位（每角色 10 个）" }
];

// 玩家为什么会打开这个菜单。四条入法，第四条是唯一改已有方案的。
// skips 写清这条路故意不走的那几步——空格子本身是信息，不能让它看起来像漏画。
const PATHS = [
  { key: "A", id: "path-a", title: "存下现在这一身",
    note: "起点是身上这套，想以后一键换回来。",
    skips: { 5: "这条路不强制跑护甲规划，所以没有可挑的候选。想跑就跑，不想跑直接把现状存下来。" } },
  { key: "B", id: "path-b", title: "抄一套",
    note: "起点是攻略、视频或 DIM 链接，想把这套弄进游戏。",
    skips: {} },
  { key: "C", id: "path-c", title: "凑一套",
    note: "起点是「我仓库里有什么」，目标是六维达标。",
    skips: {} },
  { key: "D", id: "path-d", title: "改一套",
    note: "起点是应用里已存的某套，只动其中一件。",
    skips: { 5: "改的是已有方案，候选在设置变动那一刻就作废了，没有可挑的。" } },
  // 这一行不是一条入法，是四条路都会经过的零件：分岔口、装备抽屉、方案对比。
  // 所以它只填 1–2 步，剩下的空格不算「跳过」——partial 让覆盖校验放过它。
  { key: "•", id: "path-shared", title: "四条路都会碰到", partial: true,
    note: "分岔口、装备抽屉、两个来源的浏览、方案对比。它们不属于某一条入法。",
    skips: {} }
];

// 每屏归到一条路径和主干里的几步。屏序号从数组下标来，不手写（记忆 ⑬）。
// steps: [] 表示它不在主干上（支线）。
const SCREENS = [
  // ── 路径 A · 存下现在这一身 ──
  { id: "screen-a-read", path: "A", steps: [1], title: "新建 · 读取当前装备",
    subtitle: "读当前角色身上穿着的，不读背包和仓库", route: "顶栏「新建配装 → 使用当前装备」（:1435-1472）", body: screenReadSource() },
  { id: "screen-a-read-result", path: "A", steps: [1], title: "新建 · 读取结果",
    subtitle: "读全了什么、哪几项只有部分数据", route: "读取返回后的同一面板（:1435-1472）", body: screenReadResult() },
  { id: "screen-a-editor", path: "A", steps: [2, 3], title: "编辑器 · 草稿已填好",
    subtitle: "8 个槽都满、没有护甲计划", route: "「用这套建草稿」→ 编辑器（:1452-1472）", body: screenEditorFromCurrent() },
  { id: "screen-a-armor", path: "A", steps: [4], title: "编辑器 · 护甲规划（可选）",
    subtitle: "不跑也能存；跑了就让六维达标", route: "编辑器「按属性目标自动配甲」（:1364-1407）", body: screenArmorOptional() },
  { id: "screen-a-wear", path: "A", steps: [6, 7], title: "核对能不能穿与落盘",
    subtitle: "从身上读的，核对必然通过", route: "编辑器「穿戴」→ wear-review → publish（:1409-1429）", body: screenWearAndPublish({
      plan: "虚空哨兵（未命名）",
      note: "草稿就是从目标角色身上读的，位置核对不会有意外——这一步主要是确认子职业和模组没被别处改过。"
    }) },

  // ── 路径 B · 抄一套 ──
  { id: "screen-b-dim", path: "B", steps: [1], title: "新建 · 导入 DIM",
    subtitle: "第一步：粘贴完整链接", route: "createFlow === \"dim\"（:974 / :2140-2166）", body: screenDimInput() },
  { id: "screen-b-preview", path: "B", steps: [1], title: "新建 · DIM 预览确认",
    subtitle: "读出预览后才长出「使用此预览」", route: "dimPreview 有值后的同一面板（:2140-2166）", body: screenDimPreview() },
  { id: "screen-b-guide", path: "B", steps: [1], title: "新建 · AI 攻略导入",
    subtitle: "「AI 助手产出物」落成草稿", route: "createFlow === \"guide\"（:975 / :2248-2263）", body: screenGuide() },
  { id: "screen-b-targets", path: "B", steps: [1], title: "新建 · AI 装备目标审阅",
    subtitle: "逐件勾选要带入草稿的目标", route: ":2194-2247（equipment_target_candidates 态）", body: screenTargets() },
  { id: "screen-b-assign", path: "B", steps: [2], title: "新建 · 目标装备配副本",
    subtitle: "同名多副本挑哪一件", route: "产品今天没有这一步（T92 待补）", body: screenAssignInstances() },
  { id: "screen-b-editor", path: "B", steps: [2, 3], title: "编辑器 · 解析结果已填好",
    subtitle: "武器 Perk 与护甲模组按链接还原", route: "「使用此预览」→ 编辑器（:1435-1472）", body: screenEditor() },
  { id: "screen-b-armor", path: "B", steps: [4, 5], title: "编辑器 · 护甲规划",
    subtitle: "算一次，确认六维真的达标", route: "编辑器「按属性目标自动配甲」（:1364-1407）", body: screenArmor() },
  { id: "screen-b-wear", path: "B", steps: [6, 7], title: "核对能不能穿与落盘",
    subtitle: "抄来的装备多半不在身上", route: "编辑器「穿戴」→ wear-review → publish（:1409-1429）", body: screenWearAndPublish({
      note: "抄来的这套装备分散在仓库、其他角色和邮政官，核对会逐件给出位置；找不到的那件会挡住穿戴。"
    }) },

  // ── 路径 C · 凑一套 ──
  { id: "screen-c-armor-entry", path: "C", steps: [1, 4], title: "编辑器 · 从护甲开始",
    subtitle: "不读当前装备，武器还空着", route: "「按属性目标自动配甲」直接进（:1364 起）", body: screenArmorEntry() },
  { id: "screen-c-armor-candidate", path: "C", steps: [4, 5], title: "编辑器 · 挑候选",
    subtitle: "按当前库存算出的 5 套", route: "护甲规划的计算结果区（:1364-1407）", body: screenArmorCandidate() },
  { id: "screen-c-armor-picked", path: "C", steps: [4], title: "编辑器 · 护甲已写进草稿",
    subtitle: "五个部位落定，武器还空", route: "「使用这套方案」之后（:1364-1407）", body: screenArmorPicked() },
  { id: "screen-c-weapons", path: "C", steps: [2, 3], title: "编辑器 · 补武器与子职业",
    subtitle: "武器不影响六维，补完不用重算", route: "编辑器槽位（:1483-1566）", body: screenWeaponsAfterArmor() },
  { id: "screen-c-wear", path: "C", steps: [6, 7], title: "核对能不能穿与落盘",
    subtitle: "护甲是刚算的，模组还没装", route: "编辑器「穿戴」→ wear-review → publish（:1409-1429）", body: screenWearAndPublish({
      note: "护甲是按当前库存算的，都在你身上或包里；属性模组要现装，核对会逐件查能量够不够。"
    }) },

  // ── 路径 D · 改一套 ──
  { id: "screen-d-open", path: "D", steps: [1], title: "方案库 · 打开一套",
    subtitle: "从目录里进去，不是新建", route: "方案库详情「编辑」（:936-1009）", body: screenLibraryOpen() },
  { id: "screen-d-editor", path: "D", steps: [2, 3], title: "编辑器 · 已保存方案",
    subtitle: "内容来自存下来的那份", route: "「编辑」→ 编辑器（:1435-1472）", body: screenEditorLoaded() },
  { id: "screen-d-armor", path: "D", steps: [4], title: "编辑器 · 打开护甲规划",
    subtitle: "还没动任何设置，候选是存下来的那份", route: "编辑器「按属性目标自动配甲」（:1364-1407）", body: screenArmorLoaded() },
  { id: "screen-d-dirty-mods", path: "D", steps: [4], title: "护甲待重算 · 属性模组",
    subtitle: "改了逐部位属性模组：旧候选留着，接受禁用", route: "护甲规划（本屏是 T92 定下的新状态）", body: screenArmorDirty() },
  { id: "screen-d-dirty-stats", path: "D", steps: [4], title: "护甲待重算 · 六维目标",
    subtitle: "改了护甲要求：候选还按旧目标算的", route: "同上（T92 第 4 条覆盖的三类触发源之一）", body: screenArmorDirtyStats() },
  { id: "screen-d-dirty-fragments", path: "D", steps: [4], title: "护甲待重算 · 碎片读数",
    subtitle: "星象碎片换了：候选还按旧读数算的", route: "同上（T92 第 4 条覆盖的三类触发源之一）", body: screenArmorDirtyFragments() },
  { id: "screen-d-wear", path: "D", steps: [6, 7], title: "核对能不能穿与落盘",
    subtitle: "改完之后存回哪里", route: "编辑器「穿戴」→ 出口选择（:1409-1429）", body: screenWearAndPublish({
      plan: "虚空哨兵 · 六维满值",
      note: "改完的这套要先核对能不能穿，再决定存回原方案还是另存为新的一套。",
      exit: true,
      back: "screen-d-editor"
    }) },

  // ── 共同：分岔口和四条路都会经过的零件 ──
  { id: "screen-shared-start", path: "•", steps: [1], title: "新建 · 起点",
    subtitle: "四条入法在这里分岔", route: "「新建配装 → 空白方案」（:1433-1435）", body: screenStart() },
  { id: "screen-shared-picker", path: "•", steps: [2], title: "编辑器 · 选择装备",
    subtitle: "按槽位开抽屉，搜索 + 位置筛选", route: "点槽位 → item-picker（:1483-1566）", body: screenPicker() },
  { id: "screen-shared-in-game", path: "•", steps: [1], title: "游戏内配装",
    subtitle: "Bungie 官方槽位 · 每角色上限 10", route: "顶栏「视图」分段控件 → 游戏内配装（:384-388）", body: screenInGame() },
  { id: "screen-shared-compare", path: "•", steps: [], title: "方案对比",
    subtitle: "最多 3 个应用方案 + 1 个游戏内只读参照 · 支线，不在主干上", route: "方案库 → 比较方案（:886-897 / :1093-1113）", body: screenCompare() }
].map((screen, index) => Object.assign(screen, { no: String(index + 1).padStart(2, "0") }));

// 构建时校验：屏和路径两头都不许悬空，steps 必须是主干里的编号。
const PATH_BY_KEY = new Map(PATHS.map((path) => [path.key, path]));
const SCREEN_BY_ID = new Map(SCREENS.map((screen) => [screen.id, screen]));
const STEP_KEYS = SPINE.map((step) => step.key);
for (const screen of SCREENS) {
  if (!PATH_BY_KEY.has(screen.path)) throw new Error("屏 " + screen.id + " 的路径 " + screen.path + " 不存在");
  for (const step of screen.steps) {
    if (!STEP_KEYS.includes(step)) throw new Error("屏 " + screen.id + " 归到了主干里没有的第 " + step + " 步");
  }
  if (!screen.steps.length && screen.path !== "•") {
    throw new Error("屏 " + screen.id + " 没有归到任何主干步骤——只有支线才允许 steps 为空");
  }
}
for (const path of PATHS) {
  if (!SCREENS.some((screen) => screen.path === path.key)) throw new Error("路径 " + path.key + " 一屏都没有");
}

// 路径自己在哪一步停了，从屏反推：没被任何屏覆盖的步骤就是它跳过的那几步。
// 跳过的步骤必须在 PATHS 里写明原因，否则矩阵上会出现没人解释的空格。
// 「四条路都会碰到」那一行不是入法，允许留空。
const STEP_COVERAGE = new Map();
for (const path of PATHS) {
  const covered = new Set();
  for (const screen of SCREENS) {
    if (screen.path !== path.key) continue;
    for (const step of screen.steps) covered.add(step);
  }
  STEP_COVERAGE.set(path.key, covered);
  for (const step of Object.keys(path.skips || {})) {
    if (covered.has(Number(step))) throw new Error("路径 " + path.key + " 明明画了第 " + step + " 步，却写着跳过");
  }
  if (path.partial) continue;
  for (const step of STEP_KEYS) {
    if (covered.has(step)) continue;
    if (!path.skips || !path.skips[step]) {
      throw new Error("路径 " + path.key + " 没走第 " + step + " 步，也没写为什么跳过");
    }
  }
}

// 屏构造函数里写的是通用目标名（screen-editor、screen-armor、screen-wear…）：
// 同一个「编辑器」在四条路径里落在不同的屏上，一个「穿戴」在 A 路和 D 路也不是同一屏。
// 这里按当前屏所属的路径统一翻译成本路径的那一屏；个别屏自己带 targets 覆盖（分岔口就是）。
const SHARED_TARGETS = {
  "screen-start": "screen-shared-start",
  "screen-picker": "screen-shared-picker",
  "screen-in-game": "screen-shared-in-game",
  "screen-compare": "screen-shared-compare",
  "screen-library": "screen-d-open",
  // 共用行里的「编辑器」没有唯一答案——装备抽屉从哪条路的编辑器都能开，
  // 静态原型没有历史，统一回到「改一套」那条的编辑器。
  "screen-editor": "screen-d-editor",
  "screen-dim": "screen-b-dim",
  "screen-dim-preview": "screen-b-preview",
  "screen-guide": "screen-b-guide",
  "screen-targets": "screen-b-targets",
  "screen-armor": "screen-b-armor",
  "screen-wear": "screen-b-wear",
  "screen-publish": "screen-b-wear"
};
const TARGETS_BY_PATH = {
  A: { "screen-editor": "screen-a-editor", "screen-armor": "screen-a-armor", "screen-wear": "screen-a-wear", "screen-publish": "screen-a-wear" },
  B: {},
  C: { "screen-editor": "screen-c-weapons", "screen-armor": "screen-c-armor-candidate", "screen-wear": "screen-c-wear", "screen-publish": "screen-c-wear" },
  D: { "screen-editor": "screen-d-editor", "screen-armor": "screen-d-armor", "screen-wear": "screen-d-wear", "screen-publish": "screen-d-wear" },
  "•": {}
};
// 分岔口那一屏自己决定四条入口各自去哪儿，不跟着任何一条路径走。
// C 的两屏护甲面板「收起」只是把面板折起来，不该往前跳到补武器那一屏。
const TARGETS_BY_SCREEN = {
  "screen-shared-start": { "screen-editor": "screen-a-read", "screen-armor": "screen-c-armor-entry" },
  "screen-c-armor-entry": { "screen-editor": "screen-c-armor-entry" },
  "screen-c-armor-candidate": { "screen-editor": "screen-c-armor-entry" }
};

const GENERIC_TARGETS = new Set(["screen-in-game", "screen-library", "screen-compare", "screen-editor",
  "screen-dim", "screen-dim-preview", "screen-guide", "screen-targets", "screen-start", "screen-picker",
  "screen-armor", "screen-wear", "screen-publish"]);

for (const screen of SCREENS) {
  const table = Object.assign({}, SHARED_TARGETS, TARGETS_BY_PATH[screen.path] || {}, TARGETS_BY_SCREEN[screen.id] || {});
  screen.body = screen.body.replace(/data-goto="([^"]+)"/g, (match, id) => {
    if (!GENERIC_TARGETS.has(id)) return match;
    const resolved = table[id];
    if (!resolved) throw new Error("屏 " + screen.id + " 用了通用目标 " + id + "，但路径 " + screen.path + " 没有对应的屏");
    return 'data-goto="' + resolved + '"';
  });
}
// 翻译完再验一遍：页面上剩下的每一个 data-goto 都必须指向真实存在的屏。
// 悬空 id 在静态原型里表现为「点了没反应」，看图的人只会以为那个按钮是坏的（记忆 ⑬）。
const GOTO_TARGETS = new Set(SCREENS.map((screen) => screen.id));
for (const screen of SCREENS) {
  for (const match of screen.body.matchAll(/data-goto="([^"]+)"/g)) {
    if (!GOTO_TARGETS.has(match[1])) throw new Error("屏 " + screen.id + " 跳到不存在的屏 " + match[1]);
  }
}

// T58 注挂在哪几屏：编辑器类挂 ①（子职业只读），护甲规划类挂 ②（碎片加成），
// 四屏核对落盘挂 ③（穿戴前的子职业闸门）。护甲面板还没算过的那几屏不挂 ②——
// 那块注演示的是求解器入参，面板里得先有一份算出来的候选才谈得上。
const T58_BY_SCREEN = {
  "screen-shared-start": T58_EDITOR,
  "screen-shared-picker": T58_EDITOR,
  "screen-a-editor": T58_EDITOR,
  "screen-a-armor": T58_EDITOR,
  "screen-b-editor": T58_EDITOR,
  "screen-b-armor": T58_ARMOR,
  "screen-c-armor-entry": T58_EDITOR,
  "screen-c-armor-candidate": T58_EDITOR,
  "screen-c-armor-picked": T58_EDITOR,
  "screen-c-weapons": T58_EDITOR,
  "screen-d-editor": T58_EDITOR,
  "screen-d-armor": T58_ARMOR,
  "screen-a-wear": T58_WEAR,
  "screen-b-wear": T58_WEAR,
  "screen-c-wear": T58_WEAR,
  "screen-d-wear": T58_WEAR
};

// T92 自己的注：三屏待重算各配一条，说清这一类的闸门在哪。
const T92_BY_SCREEN = {
  "screen-d-dirty-mods": T92_DIRTY_MODS,
  "screen-d-dirty-stats": T92_DIRTY_STATS,
  "screen-d-dirty-fragments": T92_DIRTY_FRAGMENTS
};

const STEP_TITLE = new Map(SPINE.map((step) => [step.key, step.title]));
const firstScreenOf = (pathKey) => SCREENS.find((screen) => screen.path === pathKey).id;

// 导航分两层：上面一行是四条入法（点一下进这条路的第一屏），下面一行是当前这条路的屏。
// 29 屏平铺在一行里，读的人只看到一堆界面名，看不出自己站在哪条路上。
const nav = '<div class="lf-nav-paths">'
  + PATHS.map((path) => '<button type="button" data-path-jump="' + path.id + '" data-goto="' + firstScreenOf(path.key) + '">'
    + '<em data-path="' + path.id + '">' + path.key + "</em>" + path.title + "</button>").join("")
  + "</div>"
  + PATHS.map((path) => '<div class="lf-nav-group" data-path="' + path.id + '" hidden>'
    + SCREENS.filter((screen) => screen.path === path.key).map((screen) =>
      '<button type="button" data-goto="' + screen.id + '"><span>' + screen.no + "</span>" + screen.title + "</button>").join("")
    + "</div>").join("");

// 总览：横着读是一条入法走完主干七步，竖着读是同一步在四条路上各长什么样。
// 空格子必须写明是「这条路不经过」还是「这一步不适用」——留个纯空白的格子，
// 看图的人分不清是设计如此还是漏画了。
const skippedCells = [];
function matrixCharts(pathKey, stepKey) {
  const charts = SCREENS.filter((screen) => screen.path === pathKey && screen.steps.includes(stepKey));
  if (charts.length) {
    return charts.map((screen) => '<button type="button" data-goto="' + screen.id + '">'
      + "<span>" + screen.no + "</span>" + screen.title + "</button>").join("");
  }
  const path = PATH_BY_KEY.get(pathKey);
  const reason = path.skips && path.skips[stepKey];
  if (!reason) return '<span class="lf-matrix-na">—</span>';
  skippedCells.push(path.key + " 第 " + stepKey + " 步 · " + reason);
  return '<span class="lf-matrix-skip">不经过</span>';
}
const flowMap = '<section class="lf-flow" aria-label="四条入法 × 主干七步">'
  + '<div class="lf-flow-head"><strong>四条入法 × 主干七步</strong>'
  + "<small>横着读是一条路走完整条主干；竖着读是同一步在四条路上各长什么样。点任意一屏直接跳过去。</small></div>"
  + '<div class="lf-matrix">'
  + '<div class="lf-matrix-head"><span class="lf-matrix-corner">入法 \\ 步骤</span>'
  + SPINE.map((step) => '<span><em>' + step.key + "</em>" + step.title + "</span>").join("")
  + "<span><em>·</em>支线</span></div>"
  + PATHS.map((path) => '<div class="lf-matrix-row">'
    + '<div class="lf-matrix-label" data-path="' + path.id + '"><em>' + path.key + "</em>"
    + "<strong>" + path.title + "</strong><small>" + path.note + "</small></div>"
    + SPINE.map((step) => '<div class="lf-matrix-cell">' + matrixCharts(path.key, step.key) + "</div>").join("")
    + '<div class="lf-matrix-cell">'
    + (SCREENS.filter((screen) => screen.path === path.key && !screen.steps.length).map((screen) =>
      '<button type="button" data-goto="' + screen.id + '"><span>' + screen.no + "</span>" + screen.title + "</button>").join("")
      || '<span class="lf-matrix-na">—</span>')
    + "</div></div>").join("")
  + "</div>"
  + '<ol class="lf-flow-legend">' + SPINE.map((step) => "<li><em>" + step.key + "</em><strong>"
    + step.title + "</strong><span>" + step.note + "</span></li>").join("") + "</ol>"
  + (skippedCells.length ? '<ul class="lf-flow-skips">' + skippedCells.map((line) =>
    "<li>" + line + "</li>").join("") + "</ul>" : "")
  + "</section>";

const body = SCREENS.map((screen, index) => {
  const note = (T58_BY_SCREEN[screen.id] || "") + (T92_BY_SCREEN[screen.id] || "");
  const path = PATH_BY_KEY.get(screen.path);
  const prev = SCREENS[index - 1];
  const next = SCREENS[index + 1];
  const steps = screen.steps.length
    ? screen.steps.map((key) => '<span class="lf-screen-step"><em>' + key + "</em>" + STEP_TITLE.get(key) + "</span>").join("")
    : '<span class="lf-screen-step" data-kind="branch">支线</span>';
  return '<section class="lf-screen" id="' + screen.id + '" data-path="' + path.id + '" data-screen-label="' + screen.title + '">'
    + '<header class="lf-screen-head"><span class="lf-screen-no" data-path="' + path.id + '">' + screen.no + "</span>"
    + "<div><strong>" + screen.title + "</strong><small>" + screen.subtitle + "</small></div>"
    + '<span class="lf-screen-path" data-path="' + path.id + '"><em>' + path.key + "</em>" + path.title + "</span>"
    + steps
    + '<div class="lf-screen-move">'
    + (prev ? '<button type="button" data-goto="' + prev.id + '">← ' + prev.no + "</button>" : "")
    + (next ? '<button type="button" data-goto="' + next.id + '">' + next.no + " →</button>" : "")
    + "</div>"
    + '<span class="lf-screen-route">' + screen.route + "</span></header>"
    + '<div class="lf-stage">' + screen.body + "</div>"
    + (note ? '<div class="lf-note-wrap">' + note + "</div>" : "")
    + "</section>";
}).join("");

// ── 页面脚本 ──────────────────────────────────────────────────────────────
// ④ 这段活在构建脚本的模板字符串里，所以它自己不能再写模板字符串，一律字符串拼接。
const PAGE_SCRIPT = `
var screens = Array.prototype.slice.call(document.querySelectorAll(".lf-screen"));
var navButtons = Array.prototype.slice.call(document.querySelectorAll(".lf-nav-group button"));
var navGroups = Array.prototype.slice.call(document.querySelectorAll(".lf-nav-group"));
var navPaths = Array.prototype.slice.call(document.querySelectorAll(".lf-nav-paths button"));
var page = document.querySelector(".lf-page");
var nav = document.querySelector(".lf-nav");
// 导航第二层只显示当前这条路的那一排屏——29 屏全铺开就没有「我在哪条路上」这回事了。
// 切换靠 hidden，不重建 DOM：重建的话上面缓存的 navButtons 会全部失效。
// 第一层按路径判，不按「当前屏是不是这条路的第一屏」——一条路的第一屏和玩家此刻站在
// 这条路哪一屏是两回事，按后者判的话走到半路第一层就全灭了。
function showPath(pathId) {
  navGroups.forEach(function (group) {
    if (group.getAttribute("data-path") === pathId) group.removeAttribute("hidden");
    else group.setAttribute("hidden", "");
  });
  navPaths.forEach(function (button) {
    button.setAttribute("aria-pressed", String(button.getAttribute("data-path-jump") === pathId));
  });
}
// 导航是吸顶的：跳屏时必须把目标屏停在导航下沿，否则屏头被盖住。
// keepScroll 给首次加载用——打开就停在页首，先让人看见标题和矩阵总览，而不是一头扎进第一屏。
function show(id, keepScroll) {
  screens.forEach(function (node) {
    if (node.id === id) node.removeAttribute("hidden");
    else node.setAttribute("hidden", "");
  });
  var current = document.getElementById(id);
  if (current) showPath(current.getAttribute("data-path"));
  navButtons.forEach(function (button) {
    button.setAttribute("aria-pressed", String(button.getAttribute("data-goto") === id));
  });
  if (keepScroll || !current || !page) return;
  // 用 rect 算落点，不用 offsetTop——offsetTop 是相对 offsetParent 的，不是相对 .lf-page，
  // 混用会让目标屏停在吸顶导航底下。clearance 直接取导航自身高度：容器上边距已经归零
  // （见 .lf-page 那条注释），导航吸顶后正好占住滚动容器顶部这么多像素。
  var pageTop = page.getBoundingClientRect().top;
  var clearance = nav ? nav.offsetHeight : 0;
  var delta = current.getBoundingClientRect().top - pageTop - clearance - 12;
  page.scrollTop = Math.max(page.scrollTop + delta, 0);
}
document.addEventListener("click", function (event) {
  var trigger = event.target.closest("[data-goto]");
  if (!trigger) return;
  event.preventDefault();
  show(trigger.getAttribute("data-goto"));
});
document.getElementById("lf-tile").addEventListener("change", function (event) {
  document.documentElement.setAttribute("data-tile", event.target.checked ? "on" : "off");
});
document.getElementById("lf-t58").addEventListener("change", function (event) {
  document.documentElement.setAttribute("data-t58", event.target.checked ? "on" : "off");
});
document.getElementById("lf-menu").addEventListener("change", function (event) {
  // 「新建配装」菜单不止一屏上有（方案库、路径 A 的读取来源都带顶栏）。
  // 只开第一个的话，看别的屏时勾上没反应，像是开关坏了。
  var menus = document.querySelectorAll(".loadout-create-menu");
  Array.prototype.forEach.call(menus, function (menu) {
    if (event.target.checked) menu.setAttribute("open", "");
    else menu.removeAttribute("open");
  });
});
show("screen-shared-in-game", true);
`;

const PAGE = `<!doctype html>
<html lang="zh-CN" data-tile="off" data-t58="off">
<head>
<meta charset="utf-8" />
<title>配装工作台 · 完整工作流原型</title>
<style>
${productCss}
</style>
<style>
${kitCss}
</style>
<style>
/* ── 原型外壳：lf- 前缀，不与产品规则抢同名类 ────────────────────────────── */
.lf-page { grid-row: 1 / -1; grid-column: 1; overflow: auto; height: 100%; padding: 0 20px 96px; box-sizing: border-box; }
/* 上边距挪到标题块自己身上：吸顶导航在滚动容器的 padding box 上沿就位，
   容器留上边距的话会空出一条 20px 缝，内容从缝里穿过去。 */
.lf-head { margin-bottom: 14px; padding-top: 20px; }
.lf-head h1 { margin: 0 0 6px; font-size: 20px; color: var(--text-title); }
.lf-head p { margin: 0 0 12px; max-width: 1080px; color: var(--text-body); font-size: var(--font-caption); line-height: 1.75; }
.lf-head .lf-warn { padding: 10px 12px; border-inline-start: 3px solid var(--status-warning); border-radius: 4px; background: var(--status-warning-bg); color: var(--text-body); }
.lf-controls { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 12px; color: var(--text-body); font-size: var(--font-caption); }
.lf-controls label { display: inline-flex; align-items: center; gap: 6px; }

/* ── 总览：四条入法 × 主干七步 ──────────────────────────────────────────── */
/* 矩阵要能横着读（一条路走完）也要能竖着读（同一步在四条路上的差别），
   所以用真表格栅格，不用一排卡片——卡片一排就退回「一堆界面名」了。 */
.lf-flow { margin-bottom: 12px; padding: 14px 16px; border: 1px solid var(--border-control); border-radius: 4px; background: var(--surface-subtle); }
.lf-flow-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.lf-flow-head strong { color: var(--text-title); font-size: var(--font-caption); }
.lf-flow-head small { color: var(--text-muted); font-size: 11px; }
.lf-matrix { display: grid; gap: 6px; overflow-x: auto; }
.lf-matrix-head, .lf-matrix-row { display: grid; grid-template-columns: 168px repeat(7, minmax(112px, 1fr)) 108px; gap: 6px; align-items: stretch; }
.lf-matrix-head > span { display: flex; align-items: baseline; gap: 5px; padding: 0 2px 4px; color: var(--text-muted); font-size: 11px; }
.lf-matrix-head em, .lf-matrix-label em, .lf-matrix-row .lf-screen-step em { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 4px; background: var(--surface-interactive-strong); color: var(--text-title); font-size: 10px; font-style: normal; }
.lf-matrix-corner { color: var(--text-muted); font-size: 11px; }
.lf-matrix-label { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; padding: 9px 10px; border: 1px solid var(--border-control); border-radius: 4px; background: var(--card-bg); }
.lf-matrix-label strong { color: var(--text-title); font-size: var(--font-caption); }
.lf-matrix-label small { flex-basis: 100%; color: var(--text-muted); font-size: 11px; line-height: 1.55; }
.lf-matrix-cell { display: flex; flex-direction: column; gap: 4px; padding: 6px; border: 1px solid var(--border-control); border-radius: 4px; background: var(--card-bg); }
.lf-matrix-cell button { display: flex; align-items: baseline; gap: 6px; padding: 4px 7px; border: 1px solid var(--border-control); border-radius: 4px; background: var(--surface-subtle); color: var(--text-body); font-size: 11px; line-height: 1.4; text-align: start; cursor: pointer; }
.lf-matrix-cell button span { flex: none; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.lf-matrix-na { color: var(--text-muted); font-size: 11px; }
/* 「不经过」和「不适用」要能分开：前者是这条入法故意不走，后者是这一格不属于任何入法。
   两者都写出来，免得空格子被读成漏画。 */
.lf-matrix-skip { align-self: flex-start; padding: 3px 7px; border-radius: 999px; background: var(--status-warning-bg); color: var(--status-warning); font-size: 11px; }
.lf-flow-legend { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 6px 14px; margin: 12px 0 0; padding: 0; list-style: none; }
.lf-flow-legend li { display: flex; align-items: baseline; gap: 6px; color: var(--text-body); font-size: 11px; line-height: 1.6; }
.lf-flow-legend em { flex: none; display: grid; place-items: center; width: 16px; height: 16px; border-radius: 4px; background: var(--surface-interactive-strong); color: var(--text-title); font-size: 10px; font-style: normal; }
.lf-flow-legend strong { flex: none; color: var(--text-title); font-size: 11px; }
.lf-flow-legend span { color: var(--text-muted); }
.lf-flow-skips { margin: 10px 0 0; padding-left: 18px; color: var(--text-muted); font-size: 11px; line-height: 1.7; }

/* ── 路径徽标：A/B/C/D 各一色，扫一眼就知道这一屏属于哪条路 ──────────────── */
/* 颜色只做区分，不做顺序；同一路径在矩阵标签、屏头徽标、导航上用的是同一个色。 */
[data-path="path-a"] > em, em[data-path="path-a"] { background: var(--accent-primary); color: var(--surface-page, var(--card-bg)); }
[data-path="path-b"] > em, em[data-path="path-b"] { background: var(--status-warning); color: var(--surface-page, var(--card-bg)); }
[data-path="path-c"] > em, em[data-path="path-c"] { background: var(--status-success, var(--accent-primary)); color: var(--surface-page, var(--card-bg)); }
[data-path="path-d"] > em, em[data-path="path-d"] { background: var(--text-title); color: var(--surface-page, var(--card-bg)); }
[data-path="path-shared"] > em, em[data-path="path-shared"] { background: var(--surface-interactive-strong); color: var(--text-title); }
.lf-screen-path { display: inline-flex; align-items: baseline; gap: 6px; padding: 3px 9px; border-radius: 999px; background: var(--surface-subtle); color: var(--text-body); font-size: 11px; }
.lf-screen-path em { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 4px; font-size: 10px; font-style: normal; }
.lf-screen-step { display: inline-flex; align-items: baseline; gap: 5px; padding: 3px 9px; border-radius: 999px; background: var(--surface-subtle); color: var(--text-muted); font-size: 11px; }
.lf-screen-step em { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 4px; background: var(--surface-interactive-strong); color: var(--text-title); font-size: 10px; font-style: normal; }
.lf-screen-step[data-kind="branch"] { color: var(--text-muted); font-style: italic; }

/* ── 路径 A 读取结果 / 路径 B 目标配副本：两屏各自的小列表 ────────────────── */
.lf-read { display: grid; gap: 4px; margin-top: 10px; }
.lf-read > div { display: grid; grid-template-columns: 92px 1fr; gap: 4px 10px; padding: 7px 10px; border: 1px solid var(--border-control); border-radius: 4px; background: var(--card-bg); }
.lf-read > div[data-status="warning"] { border-color: var(--status-warning); }
.lf-read span { color: var(--text-muted); font-size: 11px; }
.lf-read strong { color: var(--text-title); font-size: var(--font-caption); }
.lf-read small { grid-column: 2; color: var(--text-body); font-size: 11px; }
.lf-assign { display: grid; gap: 10px; margin-top: 10px; }
.lf-assign > section { padding: 10px; border: 1px solid var(--border-control); border-radius: 4px; background: var(--card-bg); }
.lf-assign > section > header { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.lf-assign > section > header span { color: var(--text-muted); font-size: 11px; }
.lf-assign > section > header strong { color: var(--text-title); font-size: var(--font-caption); }
.lf-assign > section > header small { color: var(--text-muted); font-size: 11px; }
.lf-assign-rows { display: grid; gap: 4px; }
.lf-assign-rows label { display: flex; align-items: center; gap: 9px; padding: 7px 9px; border: 1px solid var(--border-control); border-radius: 4px; cursor: pointer; }
.lf-assign-rows label[data-status="success"] { border-color: var(--accent-primary); }
.lf-assign-rows strong { color: var(--text-title); font-size: var(--font-caption); }
.lf-assign-rows small { display: block; margin-top: 2px; color: var(--text-muted); font-size: 11px; }

.lf-nav { position: sticky; top: 0; z-index: 6; display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; padding: 10px 0; background: var(--surface-page, var(--card-bg)); box-shadow: 0 6px 10px -8px rgba(0, 0, 0, 0.5); }
.lf-nav-paths { display: flex; flex-wrap: wrap; gap: 6px; }
.lf-nav-paths button { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border: 1px solid var(--border-control); border-radius: 4px; background: var(--card-bg); color: var(--text-body); font-size: var(--font-caption); cursor: pointer; }
.lf-nav-paths button[aria-pressed="true"] { border-color: var(--accent-primary); background: var(--surface-interactive-strong); color: var(--text-title); }
.lf-nav-paths em { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 4px; font-size: 11px; font-style: normal; }
.lf-nav-group { display: flex; flex-wrap: wrap; gap: 6px; }
.lf-nav-group[hidden] { display: none; }
.lf-nav-group button { display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border: 1px solid var(--border-control); border-radius: 4px; background: var(--card-bg); color: var(--text-body); font-size: var(--font-caption); cursor: pointer; }
.lf-nav-group button span { color: var(--text-muted); font-variant-numeric: tabular-nums; }
.lf-nav-group button[aria-pressed="true"] { border-color: var(--accent-primary); background: var(--surface-interactive-strong); color: var(--text-title); }
.lf-nav-group button[aria-pressed="true"] span { color: var(--accent-primary); }

/* ⑩ 给容器写基础显示规则时加 :not([hidden])，否则会盖掉 UA 样式表的 [hidden]{display:none}。 */
.lf-screen:not([hidden]) { display: block; }
.lf-screen { margin-bottom: 32px; }
.lf-screen-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
.lf-screen-no { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 4px; background: var(--surface-interactive-strong); color: var(--text-title); font-size: var(--font-caption); font-weight: 700; }
.lf-screen-head strong { color: var(--text-title); font-size: 16px; }
.lf-screen-head small { display: block; margin-top: 3px; color: var(--text-muted); font-size: var(--font-caption); }
.lf-screen-stage { padding: 3px 9px; border-radius: 999px; background: var(--surface-subtle); color: var(--text-muted); font-size: 11px; }
.lf-screen-move { display: flex; gap: 6px; margin-inline-start: auto; }
.lf-screen-move button { padding: 3px 9px; border: 1px solid var(--border-control); border-radius: 4px; background: var(--card-bg); color: var(--text-body); font-size: 11px; cursor: pointer; font-variant-numeric: tabular-nums; }
.lf-screen-route { color: var(--text-muted); font-size: 11px; }
.lf-stage { padding: 16px; border: 1px solid var(--border-control); background: var(--page); }
.lf-note-wrap { margin-top: 10px; }

/* 平铺模式：所有屏一起显示。特异度 0,3,0 压过 UA 的 [hidden]{display:none}（0,1,0）。 */
html[data-tile="on"] .lf-screen[hidden] { display: block; }
html[data-tile="on"] .lf-screen[hidden] .lf-screen-head::after { content: "（平铺模式）"; margin-inline-start: 8px; color: var(--text-muted); font-size: 11px; }

/* 产品里这三条是 sticky：编辑器头部（03-workspace.css:1917）、底部动作条（:1906）、护甲计算条（:1396）。
   原型一屏一屏摆着看，sticky 会浮到别的屏上面。特异性同为 0,2,0，本表靠后，赢。 */
.lf-stage .loadout-editor-head,
.lf-stage .loadout-editor-sticky-actions,
.lf-stage .loadout-armor-calculate-bar { position: static; }
/* 抽屉在产品里是 fixed 浮层；原型要它在流里占位，不然截不到、也看不见底下的编辑器。 */
.lf-stage .loadout-item-picker-backdrop { position: static; background: transparent; }
.lf-stage .loadout-item-picker-drawer { position: static; max-height: none; width: 100%; }
/* 浮层菜单展开时会盖住下面：原型里给它让出高度，让「新建配装」三项看得见又不压内容。 */
.lf-stage .loadout-create-options { z-index: 5; }
.lf-stage .loadout-context-toolbar { margin-bottom: 8px; }

/* ── T58 注：叠在工作流上的一层 ─────────────────────────────────────────── */
.lf-t58-note { padding: 12px 14px; border: 1px dashed var(--border-control); border-radius: 4px; background: var(--surface-subtle); }
.lf-t58-note > header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.lf-t58-note > header strong { color: var(--text-title); font-size: var(--font-caption); }
.lf-t58-note p { margin: 0 0 8px; color: var(--text-body); font-size: var(--font-caption); line-height: 1.8; }
.lf-t58-tag { padding: 2px 8px; border-radius: 999px; background: var(--status-warning-bg); color: var(--status-warning); font-size: 11px; }
.lf-t58-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 12px; align-items: start; margin: 10px 0; }
.lf-t58-candidate { position: relative; padding: 10px; border: 1px solid var(--accent-primary); border-radius: 4px; }
.lf-t58-candidate > .lf-t58-tag { margin-bottom: 8px; display: inline-block; }
.lf-t58-foot { margin: 6px 0 0; color: var(--text-muted); font-size: 11px; }
.lf-part { margin-top: 8px; }
html[data-t58="off"] .lf-t58-note { display: none; }

/* ── T92 注：待重算状态覆盖哪几类设置改动 ──────────────────────────────── */
/* 和 T58 注同一个版式，只换标签配色——两套注同时出现在一屏时得能分清是谁的。 */
.lf-t92-note { margin-top: 10px; padding: 12px 14px; border: 1px dashed var(--border-control); border-radius: 4px; background: var(--surface-subtle); }
.lf-t92-note > header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.lf-t92-note > header strong { color: var(--text-title); font-size: var(--font-caption); }
.lf-t92-note p { margin: 0 0 8px; color: var(--text-body); font-size: var(--font-caption); line-height: 1.8; }
.lf-t92-tag { padding: 2px 8px; border-radius: 999px; background: var(--accent-subtle, var(--surface-subtle)); color: var(--accent-primary); font-size: 11px; }
.lf-t92-list { margin: 0 0 8px; padding-left: 18px; color: var(--text-body); font-size: var(--font-caption); line-height: 1.8; }
.lf-t92-list li { margin-bottom: 6px; }
.lf-t92-note code { font-size: 11px; }
</style>
</head>
<body>
<div class="app-shell">
<main class="lf-page" data-surface="page">
  <header class="lf-head">
    <h1>配装工作台 · 完整工作流原型</h1>
    <p class="lf-warn">示例数据，不是真实账号读取结果。这一版按<strong>玩家的四种入法</strong>排：
      横着看是一条路走完整条主干，竖着看是同一步在四条路上各长什么样，共 ${SCREENS.length} 屏，点任意一屏直接跳过去。
      四条入法是「存下现在这一身 / 抄一套 / 凑一套 / 改一套」；主干七步是「定来源 → 装武器 → 定子职业 → 调护甲 → 挑候选 → 核对能不能穿 → 落盘」。
      空格子写着「不经过」的，是这条入法故意不走那一步，下面列了原因。
      两条来源（游戏内 / 应用）分开记，靠标记互相指认；草稿进编辑器就自动建，保存要玩家点；
      护甲改过设置不自动重算，旧候选留在屏幕上、打脏标记并禁用接受。T58 的三处改动是叠在流程上的一层，
      勾上「显示 T58 注」才出现。</p>
    <div class="lf-controls">
      <label><input id="lf-tile" type="checkbox" /><span>平铺显示全部屏（默认一次只看一屏）</span></label>
      <label><input id="lf-t58" type="checkbox" /><span>显示 T58 注</span></label>
      <label><input id="lf-menu" type="checkbox" /><span>展开「新建配装」菜单</span></label>
    </div>
  </header>
  ${flowMap}
  <nav class="lf-nav" aria-label="屏导航">${nav}</nav>
  ${body}
</main>
</div>
<script>${PAGE_SCRIPT}</script>
</body>
</html>
`;

writeFileSync(join(here, "loadout-flow.html"), PAGE, "utf8");

// 守卫：模板串里的注释就是内容（记忆 ⑧），页面正文里不许漏出 Markdown 星号或构建占位。
const problems = [];
if (PAGE.includes("undefined")) problems.push("产物里有 undefined");
if (PAGE.includes("[object Object]")) problems.push("产物里有 [object Object]");
const bodyOnly = PAGE.slice(PAGE.indexOf("<body>"));
if (/\*\*[^*]+\*\*/.test(bodyOnly)) problems.push("正文里漏了 Markdown 星号");
if (/^\s*\/\//m.test(PAGE.slice(PAGE.indexOf("<style>"), PAGE.indexOf("</style>")))) problems.push("样式表里有 JS 风格的 // 注释");
if (problems.length) {
  console.error("构建失败：\n  " + problems.join("\n  "));
  process.exit(1);
}

console.log("生成 loadout-flow.html · " + PAGE.length + " 字节 · " + SCREENS.length + " 屏");
console.log("  T58 注：默认关，挂在 " + Object.keys(T58_BY_SCREEN).length + " 屏上");
