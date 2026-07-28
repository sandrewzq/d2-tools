const assetRoot = "https://www.bungie.net";
const statDefs = [
  { key: "health", label: "生命值", short: "生" },
  { key: "melee", label: "近战", short: "近" },
  { key: "grenade", label: "手雷", short: "雷" },
  { key: "super", label: "超能", short: "超" },
  { key: "class", label: "职业", short: "职" },
  { key: "weapons", label: "武器", short: "武" }
];

const sharedTargets = {
  personal: [
    {
      title: "个人目标 · 猎人高难属性",
      meta: "本地个人知识 · 今天 20:48",
      conditions: [
        { type: "stat", stat: "grenade", value: 24, label: "手雷属性不低于 24" },
        { type: "total", value: 80, label: "当前总属性不低于 80" }
      ]
    },
    {
      title: "个人目标 · 套装阈值",
      meta: "本地个人知识 · 昨天 18:20",
      conditions: [
        { type: "set-pieces", value: 2, label: "当前角色至少装备 2 件同套装护甲" }
      ]
    }
  ],
  loadout: [
    {
      title: "配装模板 · 虚空高难",
      meta: "本地模板 · 猎人",
      conditions: [
        { type: "class", value: "猎人", label: "职业必须为猎人" },
        { type: "stat", stat: "health", value: 12, label: "生命值属性不低于 12" },
        { type: "stat", stat: "grenade", value: 25, label: "手雷属性不低于 25" }
      ]
    },
    {
      title: "攻略解析 · 团队活动配置",
      meta: "小日向解析记录 · 已保存来源",
      conditions: [
        { type: "slot", value: "腿部护甲", label: "指定腿部护甲位置" },
        { type: "masterwork", value: true, label: "要求当前实例已大师杰作" }
      ]
    }
  ],
  community: [
    {
      title: "社区来源 · 属性条件记录",
      meta: "导入记录 · 保留原始出处 · 2026/07/21",
      conditions: [
        { type: "total", value: 82, label: "当前总属性不低于 82" },
        { type: "stat", stat: "weapons", value: 15, label: "武器属性不低于 15" }
      ]
    }
  ]
};

const armorData = {
  legendary: {
    hash: "1452324269",
    name: "移民号陨落腿铠",
    rarity: "传说",
    type: "腿部护甲",
    guardianClass: "猎人",
    version: "当前装备版本",
    season: "第 27 赛季",
    setName: "移民号护甲套装",
    icon: "/common/destiny2_content/icons/28217e5a4460d680f28dbd602f25123a.jpg",
    core: {
      type: "套装护甲",
      name: "移民号护甲套装",
      description: "属于移民号护甲套装。套装规则来自当前游戏资料，激活状态来自猎人账号最新状态。",
      icon: "/common/destiny2_content/icons/28217e5a4460d680f28dbd602f25123a.jpg"
    },
    capabilities: [
      ["装备规则", "传说护甲，可与一件异域护甲同时装备", "游戏规则"],
      ["护甲位置", "腿部护甲，使用腿部护甲模组插槽", "部位规则"],
      ["随机属性", "不同 Offer 和账号实例拥有独立属性分布", "实例级数据"]
    ],
    setBonus: {
      name: "移民号护甲套装",
      equippedPieces: 3,
      character: "猎人",
      tiers: [
        { pieces: 2, name: "战术协同", description: "2 件套装效果，以当前游戏资料中的套装规则为准。" },
        { pieces: 4, name: "移民号强化", description: "4 件套装效果，以当前游戏资料中的套装规则为准。" }
      ]
    },
    availableModSlots: [
      ["通用模组", "可安装通用属性模组", "可用位置"],
      ["腿部模组 1", "可安装腿部护甲模组", "可用位置"],
      ["腿部模组 2", "可安装腿部护甲模组", "可用位置"],
      ["腿部模组 3", "可安装腿部护甲模组", "可用位置"],
      ["调整模组", "可调整两项护甲属性", "护甲等级 5 解锁", "special"]
    ],
    sources: [
      ["官方获取方式", "涅索斯活动与升级包", "当前游戏资料记录的获取来源。", "来源已记录"],
      ["当前商人售卖", "暂未发现正在售卖", "实时读取没有返回有效 Offer，不显示旧价格或旧属性。", "当前未在售"]
    ],
    vendor: null,
    instances: [
      {
        id: "L-A",
        location: "猎人已装备",
        base: [12, 6, 15, 14, 4, 13],
        stats: [14, 8, 27, 16, 6, 15],
        energy: 10,
        masterwork: true,
        tuningMod: "平衡调整",
        locked: true,
        tag: "配装用",
        note: "虚空高难配装使用。",
        mods: [
          ["通用模组", "手雷模组", "当前已安装"],
          ["腿部模组 1", "复原", "当前已安装"],
          ["腿部模组 2", "电弧武器激涌", "当前已安装"],
          ["腿部模组 3", "强力吸引", "当前已安装"],
          ["调整模组", "平衡调整", "当前已安装", "special"]
        ]
      },
      {
        id: "L-B",
        location: "仓库",
        base: [21, 8, 12, 7, 7, 17],
        stats: [23, 10, 14, 8, 8, 19],
        energy: 7,
        masterwork: false,
        tuningMod: "武器调整",
        locked: false,
        tag: "关注",
        note: "生命值和武器属性分布。",
        mods: [
          ["通用模组", "生命值模组", "当前已安装"],
          ["腿部模组 1", "空插槽", "当前未安装"],
          ["腿部模组 2", "空插槽", "当前未安装"],
          ["腿部模组 3", "空插槽", "当前未安装"],
          ["调整模组", "武器调整", "当前已安装", "special"]
        ]
      }
    ],
    targets: sharedTargets,
    upgradeDefinition: {
      maxEnergy: 10,
      masterworkSupported: true,
      costLabel: "下一等级成本以当前游戏规则为准"
    }
  },
  exotic: {
    hash: "2002759681",
    name: "合成感受器",
    rarity: "异域",
    type: "臂铠",
    guardianClass: "泰坦",
    version: "当前装备版本",
    season: "第 27 赛季",
    setName: "生物强化",
    icon: "/common/destiny2_content/icons/9f51bbad83aeb142eb56d9faf7440662.jpg",
    core: {
      type: "异域固有能力",
      name: "生物强化",
      description: "被包围时增加近战和超能伤害，并提升武器操控性和填装速度。",
      icon: "/common/destiny2_content/icons/640d76fb6ab52e290116455379194b07.png"
    },
    capabilities: [
      ["异域限制", "同一时间只能装备一件异域护甲", "游戏规则"],
      ["固有能力", "生物强化属于固定装备能力", "不会随机变化"],
      ["随机属性", "不同 Offer 和账号实例拥有独立属性分布", "实例级数据"]
    ],
    setBonus: null,
    availableModSlots: [
      ["通用模组", "可安装通用属性模组", "可用位置"],
      ["手臂模组 1", "可安装手臂护甲模组", "可用位置"],
      ["手臂模组 2", "可安装手臂护甲模组", "可用位置"],
      ["手臂模组 3", "可安装手臂护甲模组", "可用位置"],
      ["调整模组", "可调整两项护甲属性", "护甲等级 5 解锁", "special"]
    ],
    sources: [
      ["官方获取方式", "异域记忆水晶与拉乎尔解码", "实际可用方式和资源要求以当前游戏数据为准。", "来源已记录"],
      ["当前商人售卖", "仄正在售卖", "当前售卖状态已经实时确认。", "当前在售"]
    ],
    vendor: {
      id: "XUR-OFFER",
      label: "仄当前 Offer",
      location: "仄 · 高塔机库",
      base: [20, 24, 7, 13, 9, 11],
      stats: [20, 24, 7, 13, 9, 11],
      energy: 5,
      masterwork: false,
      tuningMod: "近战调整",
      mods: [
        ["通用模组", "未安装", "当前售卖"],
        ["手臂模组 1", "空插槽", "当前售卖"],
        ["手臂模组 2", "空插槽", "当前售卖"],
        ["手臂模组 3", "空插槽", "当前售卖"],
        ["调整模组", "近战调整", "当前售卖", "special"]
      ]
    },
    instances: [
      {
        id: "E-A",
        location: "泰坦背包",
        base: [16, 17, 6, 12, 5, 10],
        stats: [18, 29, 8, 14, 7, 12],
        energy: 10,
        masterwork: true,
        tuningMod: "近战调整",
        locked: true,
        tag: "保留",
        note: "近战属性实例。",
        mods: [
          ["通用模组", "近战模组", "当前已安装"],
          ["手臂模组 1", "动量转移", "当前已安装"],
          ["手臂模组 2", "重手出击", "当前已安装"],
          ["手臂模组 3", "空插槽", "当前未安装"],
          ["调整模组", "近战调整", "当前已安装", "special"]
        ]
      },
      {
        id: "E-B",
        location: "仓库",
        base: [12, 13, 8, 20, 10, 16],
        stats: [14, 14, 9, 22, 10, 17],
        energy: 8,
        masterwork: false,
        tuningMod: "武器调整",
        locked: false,
        tag: "关注",
        note: "超能和武器属性实例。",
        mods: [
          ["通用模组", "超能模组", "当前已安装"],
          ["手臂模组 1", "空插槽", "当前未安装"],
          ["手臂模组 2", "空插槽", "当前未安装"],
          ["手臂模组 3", "空插槽", "当前未安装"],
          ["调整模组", "武器调整", "当前已安装", "special"]
        ]
      }
    ],
    targets: {
      personal: [
        {
          title: "个人目标 · 泰坦近战配置",
          meta: "本地个人知识 · 今天 19:20",
          conditions: [
            { type: "class", value: "泰坦", label: "职业必须为泰坦" },
            { type: "stat", stat: "melee", value: 24, label: "近战属性不低于 24" }
          ]
        }
      ],
      loadout: [
        {
          title: "配装模板 · 近战循环",
          meta: "本地模板 · 泰坦",
          conditions: [
            { type: "item", value: "合成感受器", label: "指定异域护甲：合成感受器" },
            { type: "masterwork", value: true, label: "要求当前实例已大师杰作" }
          ]
        }
      ],
      community: [
        {
          title: "社区来源 · 异域属性条件",
          meta: "导入记录 · 保留原始出处 · 2026/07/21",
          conditions: [
            { type: "total", value: 84, label: "当前总属性不低于 84" },
            { type: "stat", stat: "health", value: 16, label: "生命值属性不低于 16" }
          ]
        }
      ]
    },
    upgradeDefinition: {
      maxEnergy: 10,
      masterworkSupported: true,
      costLabel: "下一等级成本以当前游戏规则为准"
    }
  }
};

const initialHash = location.hash.slice(1);
const state = {
  armor: initialHash.startsWith("exotic") ? "exotic" : "legendary",
  mode: ["library", "vendor", "instance-a", "instance-b"].find((value) => initialHash.includes(value)) || "library",
  theme: localStorage.getItem("armor-detail-prototype-theme") || "dark",
  targetSource: "personal",
  railOpen: false,
  detailState: "normal",
  aiReady: false,
  aiSaved: false,
  instanceActionStatus: ""
};

const prototypeControls = String(new URLSearchParams(location.search).get("controls") !== "0");
document.querySelector("[data-prototype-root]").dataset.prototypeControls = prototypeControls;
document.body.dataset.prototypeControls = prototypeControls;

function closeRail() {
  state.railOpen = false;
}

const el = {
  icon: document.querySelector("[data-item-icon]"),
  name: document.querySelector("[data-item-name]"),
  subtitle: document.querySelector("[data-item-subtitle]"),
  version: document.querySelector("[data-item-version]"),
  versionBadge: document.querySelector("[data-version-badge]"),
  meta: document.querySelector("[data-item-meta]"),
  context: document.querySelector("[data-context]"),
  definitionDetails: document.querySelector("[data-definition-details]"),
  statOrigin: document.querySelector("[data-stat-origin]"),
  stats: document.querySelector("[data-stat-content]"),
  sources: document.querySelector("[data-sources]"),
  sourceNote: document.querySelector("[data-source-note]"),
  configTitle: document.querySelector("[data-config-title]"),
  configCopy: document.querySelector("[data-config-copy]"),
  configuration: document.querySelector("[data-configuration]"),
  targetMatches: document.querySelector("[data-target-matches]"),
  upgrades: document.querySelector("[data-upgrades]"),
  ai: document.querySelector("[data-ai]"),
  aiStatus: document.querySelector("[data-ai-status]"),
  saveAi: document.querySelector("[data-save-ai]"),
  instances: document.querySelector("[data-instances]"),
  instanceCount: document.querySelector("[data-instance-count]"),
  instanceActions: document.querySelector("[data-instance-actions]"),
  instanceRail: document.querySelector("[data-instance-rail]"),
  railScrim: document.querySelector("[data-rail-scrim]")
};

function armor() { return armorData[state.armor]; }
function total(values) { return values.reduce((sum, value) => sum + value, 0); }
function instanceIndex() { return state.mode === "instance-b" ? 1 : 0; }
function selectedInstance(data = armor()) { return state.mode.startsWith("instance-") ? data.instances[instanceIndex()] : null; }
function currentObject(data = armor()) { return state.mode === "vendor" ? data.vendor : selectedInstance(data); }
function updateHash() { history.replaceState(null, "", `#${state.armor}-${state.mode}`); }

function renderIdentity(data, object) {
  const entry = state.mode === "library" ? "资料库" : state.mode === "vendor" ? "商人" : "账号";
  const currentLabel = state.mode === "library" ? "装备定义" : state.mode === "vendor" ? (object ? "当前商人 Offer" : "当前未在售") : `账号实例 ${object.id}`;
  const objectType = state.mode === "vendor" ? "商人 Offer" : object ? "账号实例" : "护甲定义";
  el.icon.src = assetRoot + data.icon;
  el.icon.alt = data.name;
  el.name.textContent = data.name;
  el.subtitle.textContent = `${data.rarity} · ${data.type} · ${data.guardianClass}`;
  el.version.textContent = `${data.season} · ${data.version}`;
  el.versionBadge.className = `badge ${data.rarity === "异域" ? "exotic" : "mint"}`;
  el.meta.innerHTML = [
    `<span class="badge ${data.rarity === "异域" ? "exotic" : "violet"}" data-ui-kind="status-chip" data-ui-part="state" data-info-priority="support" data-text-tone="status" data-status="neutral">${data.rarity}</span>`,
    `<span class="badge" data-ui-kind="status-chip" data-ui-part="detail" data-info-priority="support" data-text-tone="body">${data.type}</span>`,
    `<span class="badge" data-ui-kind="status-chip" data-ui-part="detail" data-info-priority="support" data-text-tone="body">${data.guardianClass}</span>`,
    `<span class="badge blue" data-ui-kind="status-chip" data-ui-part="source" data-info-priority="trace" data-text-tone="action">${data.setName}</span>`
  ].join("");
  el.context.innerHTML = [
    ["入口", entry],
    ["当前查看", currentLabel],
    ["对象", objectType],
    ["位置", data.type]
  ].map(([key, value]) => `<div><dt data-ui-part="label" data-info-priority="support" data-text-tone="meta">${key}</dt><dd data-ui-part="value" data-info-priority="context" data-text-tone="primary">${value}</dd></div>`).join("")
    + `<div class="context-version"><dt data-ui-part="label" data-info-priority="support" data-text-tone="meta">版本</dt><dd data-ui-part="value" data-info-priority="context" data-text-tone="primary"><strong>#1 · 当前 Hash</strong></dd><span class="version-state" data-ui-part="state" data-info-priority="support" data-text-tone="status" data-status="success">${data.season}</span></div>`;
  el.definitionDetails.innerHTML = `
    <dl><dt data-ui-part="label" data-info-priority="support" data-text-tone="meta">装备 Hash</dt><dd data-ui-part="source" data-info-priority="trace" data-text-tone="meta">${data.hash}</dd></dl>
    <dl><dt data-ui-part="label" data-info-priority="support" data-text-tone="meta">职业限制</dt><dd data-ui-part="detail" data-info-priority="reading" data-text-tone="body">${data.guardianClass}</dd></dl>
    <dl><dt data-ui-part="label" data-info-priority="support" data-text-tone="meta">套装或固有能力</dt><dd data-ui-part="detail" data-info-priority="reading" data-text-tone="body">${data.setName}</dd></dl>
    <dl><dt data-ui-part="label" data-info-priority="support" data-text-tone="meta">资料状态</dt><dd data-ui-part="state" data-info-priority="support" data-text-tone="status" data-status="success">当前游戏资料 · 已确认</dd></dl>`;
}

function renderStats(data, object) {
  if (!object) {
    el.statOrigin.textContent = state.mode === "vendor" ? "当前没有有效 Offer" : "装备定义没有固定属性";
    el.stats.innerHTML = `<div class="stat-empty" data-surface="frame" data-ui-kind="state-frame" data-status="neutral"><strong data-ui-part="value" data-info-priority="decision" data-text-tone="primary">${state.mode === "vendor" ? "当前没有可显示的售卖属性" : "护甲定义没有固定六维属性"}</strong><span data-ui-part="detail" data-info-priority="reading" data-text-tone="body">${state.mode === "vendor" ? "商人实时数据没有返回有效售卖内容，因此不显示旧价格、旧属性或旧模组。" : "实际属性只存在于商人 Offer 或账号实例。右侧栏可以切换账号中的同 Hash 护甲。"}</span></div>`;
    return;
  }
  const baseTotal = total(object.base);
  const currentTotal = total(object.stats);
  el.statOrigin.textContent = state.mode === "vendor" ? "商人 Offer 实际值" : "账号当前实例 · 已确认";
  el.stats.innerHTML = `
    <div class="stat-summary">
      <div><span data-ui-part="label" data-info-priority="support" data-text-tone="meta">基础总属性</span><strong data-ui-part="value" data-info-priority="metric" data-text-tone="primary">${baseTotal}</strong></div>
      <div><span data-ui-part="label" data-info-priority="support" data-text-tone="meta">当前总属性</span><strong data-ui-part="value" data-info-priority="metric" data-text-tone="primary">${currentTotal}</strong></div>
      <div><span data-ui-part="label" data-info-priority="support" data-text-tone="meta">升级状态</span><strong data-ui-part="state" data-info-priority="decision" data-text-tone="primary">${object.masterwork ? "大师杰作" : `${object.energy} 级能量`}</strong></div>
    </div>
    <p class="stat-note">当前实际值包含可确认的强化和已安装护甲模组影响；星象等角色级加成不计入单件护甲。</p>
    <div class="stat-table">
      ${statDefs.map((stat, index) => {
        const base = object.base[index];
        const current = object.stats[index];
        return `<div class="stat-row" data-surface="row"><strong data-ui-part="label" data-info-priority="context" data-text-tone="primary">${stat.label}</strong><span class="stat-base" data-ui-part="detail" data-info-priority="support" data-text-tone="body">基础 ${base}</span><span class="stat-track"><i class="current" style="width:${Math.min(100, current / 45 * 100)}%"></i><i class="base" style="width:${Math.min(100, base / 45 * 100)}%"></i></span><span class="stat-current" data-ui-part="value" data-info-priority="decision" data-text-tone="primary">${current}</span></div>`;
      }).join("")}
    </div>`;
}

function renderSources(data) {
  el.sources.innerHTML = data.sources.map(([type, name, note, status]) => `
    <div class="source-row" data-surface="row" data-status="${status.includes("未") ? "warning" : "success"}">
      <strong data-ui-part="label" data-info-priority="support" data-text-tone="meta">${type}</strong>
      <div><p data-ui-part="value" data-info-priority="context" data-text-tone="primary">${name}</p><small data-ui-part="detail" data-info-priority="reading" data-text-tone="body">${note}</small></div>
      <span class="source-state ${status.includes("未") ? "muted" : ""}" data-ui-part="state" data-info-priority="support" data-text-tone="status" data-status="${status.includes("未") ? "warning" : "success"}">${status}</span>
    </div>`).join("");
  el.sourceNote.textContent = "获取方式和当前售卖状态分别展示；实时读取失败时不回退显示旧 Offer。";
}

function renderSetBonus(data) {
  if (!data.setBonus) return "";
  const set = data.setBonus;
  return `<article class="set-bonus-panel">
    <div class="set-bonus-heading"><div><span class="eyebrow">套装效果</span><h4>${set.name}</h4></div><span class="badge mint">${set.character}当前装备 ${set.equippedPieces} 件</span></div>
    <div class="set-bonus-tiers">
      ${set.tiers.map((tier) => {
        const active = set.equippedPieces >= tier.pieces;
        const stateLabel = active ? "已激活" : `还差 ${tier.pieces - set.equippedPieces} 件`;
        return `<div class="set-bonus-tier ${active ? "is-active" : ""}"><span class="set-bonus-count">${tier.pieces} 件</span><div><strong>${tier.name}</strong><p>${tier.description}</p></div><em>${stateLabel}</em></div>`;
      }).join("")}
    </div>
    <small>套装规则来自当前游戏资料；激活件数来自${set.character}账号最新状态。</small>
  </article>`;
}

function renderConfiguration(data, object) {
  const sockets = object?.mods ?? data.availableModSlots;
  el.configTitle.textContent = data.rarity === "异域" ? "异域能力与当前配置" : "套装效果与当前配置";
  el.configCopy.textContent = object ? "固定能力、套装规则和当前实例实际插槽分别展示。" : "资料库定义只说明固定能力、套装规则和支持的插槽。";
  el.configuration.innerHTML = `
    <div class="configuration-grid">
      <article class="core-feature">
        <img src="${assetRoot + data.core.icon}" alt="${data.core.name}">
        <div><span class="eyebrow">${data.core.type}</span><h4>${data.core.name}</h4><p>${data.core.description}</p><small>固定能力与实例随机属性分开存储。</small></div>
      </article>
      <div class="capability-table">
        ${data.capabilities.map(([label, value, status]) => `<div class="capability-row"><strong>${label}</strong><span>${value}</span><em>${status}</em></div>`).join("")}
      </div>
    </div>
    ${renderSetBonus(data)}
    <div class="socket-block">
      <div class="socket-heading"><strong>${object ? "5 个模组位与当前配置" : "5 个可用模组位"}</strong><span>${object ? (state.mode === "vendor" ? "当前商人 Offer" : "账号当前实例") : "当前装备版本"}</span></div>
      ${sockets.map(([label, value, note, tone]) => `<div class="socket-row ${tone === "special" ? "is-special" : ""}"><strong>${label}</strong><p>${value}</p><small>${note}</small></div>`).join("")}
    </div>`;
}

function conditionResult(condition, data, object) {
  if (condition.type === "class") return { hit: data.guardianClass === condition.value, actual: data.guardianClass };
  if (condition.type === "slot") return { hit: data.type === condition.value, actual: data.type };
  if (condition.type === "item") return { hit: data.name === condition.value, actual: data.name };
  if (condition.type === "set-pieces") {
    if (!data.setBonus) return { hit: false, actual: "不属于护甲套装" };
    return { hit: data.setBonus.equippedPieces >= condition.value, actual: `当前装备 ${data.setBonus.equippedPieces} 件` };
  }
  if (!object) return { unknown: true, actual: "当前对象没有实例属性" };
  if (condition.type === "total") return { hit: total(object.stats) >= condition.value, actual: `当前 ${total(object.stats)}` };
  if (condition.type === "masterwork") return { hit: object.masterwork === condition.value, actual: object.masterwork ? "已大师杰作" : "未大师杰作" };
  if (condition.type === "stat") {
    const index = statDefs.findIndex((stat) => stat.key === condition.stat);
    return { hit: object.stats[index] >= condition.value, actual: `${statDefs[index].label} ${object.stats[index]}` };
  }
  return { unknown: true, actual: "无法匹配" };
}

function renderTargets(data, object) {
  const entries = data.targets[state.targetSource] ?? [];
  document.querySelectorAll("[data-target-source]").forEach((button) => {
    const source = button.dataset.targetSource;
    const active = source === state.targetSource;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    if (active) document.querySelector("[data-target-matches]").setAttribute("aria-labelledby", button.id);
    button.querySelector("span").textContent = String((data.targets[source] ?? []).length);
  });
  el.targetMatches.innerHTML = entries.map((entry) => `
    <article class="armor-match-card" data-surface="object-card" data-ui-kind="object-card">
      <header><div><h4 data-ui-part="value" data-info-priority="context" data-text-tone="primary">${entry.title}</h4><p data-ui-part="detail" data-info-priority="reading" data-text-tone="body">${entry.meta}</p></div><span data-ui-part="source" data-info-priority="trace" data-text-tone="meta">独立来源</span></header>
      <div class="armor-condition-list">
        ${entry.conditions.map((condition) => {
          const result = conditionResult(condition, data, object);
          const stateClass = result.unknown ? "unknown" : result.hit ? "hit" : "miss";
          const stateLabel = result.unknown ? "无实例数据" : result.hit ? "达到条件" : "未达到条件";
          const tone = result.unknown ? "warning" : result.hit ? "success" : "warning";
          return `<div class="armor-condition-row" data-surface="row" data-status="${tone}"><span data-ui-part="label" data-info-priority="support" data-text-tone="meta">${condition.label}</span><strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">${result.actual}</strong><em class="condition-state ${stateClass}" data-ui-part="state" data-info-priority="support" data-text-tone="status" data-status="${tone}">${stateLabel}</em></div>`;
        }).join("")}
      </div>
    </article>`).join("") || `<div class="stat-empty"><strong>当前来源没有护甲目标</strong><span>没有生成默认推荐，也不会从其他来源补齐。</span></div>`;
}

function renderUpgrades(data, object) {
  const definition = data.upgradeDefinition;
  const energy = object ? `${object.energy} / ${definition.maxEnergy}` : "需要实例数据";
  const masterwork = object ? (object.masterwork ? "已完成" : "未完成") : "定义支持";
  const tuningMod = object?.tuningMod ?? data.availableModSlots.find((socket) => socket[3] === "special")?.[1] ?? "未解锁";
  el.upgrades.innerHTML = `
    <div class="upgrade-summary">
      <div><span>当前能量</span><strong>${energy}</strong></div>
      <div><span>大师杰作</span><strong>${masterwork}</strong></div>
      <div><span>调整模组</span><strong>${tuningMod}</strong></div>
      <div><span>下一等级成本</span><strong>${object && object.energy < definition.maxEnergy ? "当前定义可查询" : object?.masterwork ? "已达到当前上限" : definition.costLabel}</strong></div>
    </div>
    <div class="table-scroll">
      <table class="upgrade-table">
        <thead><tr><th>项目</th><th>定义能力</th><th>当前对象</th><th>数据来源</th></tr></thead>
        <tbody>
          <tr><td><strong>能量等级</strong></td><td>最高 ${definition.maxEnergy}</td><td>${energy}</td><td>${object ? "账号当前实例" : "游戏规则"}</td></tr>
          <tr><td><strong>大师杰作</strong></td><td>${definition.masterworkSupported ? "支持" : "不支持"}</td><td>${masterwork}</td><td>${object ? "账号当前实例" : "游戏规则"}</td></tr>
          <tr><td><strong>属性变化</strong></td><td>装备资料不包含随机 Roll</td><td>${object ? `基础 ${total(object.base)} → 当前 ${total(object.stats)}` : "需要 Offer 或账号实例"}</td><td>${object ? "账号属性与模组" : "装备资料"}</td></tr>
          <tr><td><strong>材料成本</strong></td><td>${definition.costLabel}</td><td>${object && object.energy < definition.maxEnergy ? "按当前等级读取" : "无待执行升级"}</td><td>游戏规则</td></tr>
        </tbody>
      </table>
    </div>`;
}

function renderInstances(data) {
  el.instanceCount.textContent = `${data.instances.length} 件`;
  el.instances.innerHTML = data.instances.map((instance, index) => {
    const mode = index === 0 ? "instance-a" : "instance-b";
    const current = state.mode === mode;
    const status = instance.locked ? "success" : "warning";
    return `<button type="button" class="armor-instance-card ${current ? "is-current" : ""}" data-surface="object-card" data-ui-kind="object-card" data-status="${status}" data-instance-mode="${mode}" aria-current="${current ? "true" : "false"}">
      <header><strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">实例 ${instance.id}</strong><span data-ui-part="detail" data-info-priority="support" data-text-tone="body">${instance.location}</span></header>
      <div class="armor-instance-total"><strong data-ui-part="value" data-info-priority="metric" data-text-tone="primary">${total(instance.stats)}</strong><span data-ui-part="state" data-info-priority="support" data-text-tone="body">${instance.masterwork ? "大师杰作" : `${instance.energy} 级能量`}</span></div>
      <div class="armor-stat-strip">${statDefs.map((stat, statIndex) => `<span data-ui-part="detail" data-info-priority="support" data-text-tone="body">${stat.short}<b data-ui-part="value" data-info-priority="decision" data-text-tone="primary">${instance.stats[statIndex]}</b></span>`).join("")}</div>
      <div class="armor-instance-foot"><span data-ui-part="state" data-info-priority="support" data-text-tone="status" data-status="${status}">${instance.locked ? "已锁定" : "未锁定"}</span><span data-ui-part="detail" data-info-priority="support" data-text-tone="body">${instance.tag || "未标记"}</span><span data-ui-part="detail" data-info-priority="support" data-text-tone="body">${instance.tuningMod}</span></div>
    </button>`;
  }).join("");
}

function renderInstanceActions(data, instance) {
  if (!instance) {
    el.instanceActions.className = "rail-actions is-empty";
    el.instanceActions.innerHTML = `<div data-status="neutral"><span class="eyebrow" data-ui-part="label" data-info-priority="support" data-text-tone="meta">当前对象只读</span><h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">${state.mode === "vendor" ? "正在查看商人 Offer" : "正在查看护甲定义"}</h3><p data-ui-part="detail" data-info-priority="reading" data-text-tone="body">从下方选择账号中的同 Hash 护甲后，可执行装备、转移、锁定、标签和备注操作。</p></div>`;
    return;
  }
  const inVault = instance.location === "仓库";
  const equipped = instance.location.includes("已装备");
  const primaryLabel = equipped ? `已装备到${data.guardianClass}` : inVault ? `取出到${data.guardianClass}` : `装备到${data.guardianClass}`;
  const primaryCommand = inVault ? "transfer" : "equip";
  const secondaryLabel = inVault ? "直接装备" : "移入仓库";
  const tags = ["保留", "关注", "待刷", "配装用", "可清理"];
  el.instanceActions.className = "rail-actions";
  el.instanceActions.innerHTML = `
    <div class="rail-current"><div><span class="eyebrow" data-ui-part="label" data-info-priority="support" data-text-tone="meta">当前实例</span><h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">${data.name} · ${instance.id}</h3><p data-ui-part="detail" data-info-priority="reading" data-text-tone="body">${instance.location} · 总属性 ${total(instance.stats)}</p></div><span class="badge mint" data-ui-kind="status-chip" data-ui-part="state" data-info-priority="support" data-text-tone="status" data-status="success">正在查看</span></div>
    <div class="rail-current-meta"><span data-ui-part="state" data-info-priority="support" data-text-tone="body">${instance.masterwork ? "大师杰作" : `${instance.energy} 级能量`}</span><span data-ui-part="state" data-info-priority="support" data-text-tone="status" data-status="${instance.locked ? "success" : "warning"}">${instance.locked ? "已锁定" : "未锁定"}</span><span data-ui-part="detail" data-info-priority="support" data-text-tone="body">${instance.tuningMod}</span></div>
    <div class="rail-compatible"><span data-ui-part="label" data-info-priority="support" data-text-tone="meta">兼容角色</span><strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">${data.guardianClass} · 仅限同职业</strong></div>
    <div class="rail-primary-actions"><button type="button" class="instance-command" data-ui-kind="button" data-control-variant="primary" data-instance-command="${primaryCommand}" ${equipped ? "disabled" : ""}>${primaryLabel}</button><button type="button" class="instance-command" data-ui-kind="button" data-control-variant="secondary" data-instance-command="${inVault ? "equip" : "transfer"}">${secondaryLabel}</button><button type="button" class="instance-command" data-ui-kind="button" data-control-variant="secondary" data-instance-command="lock">${instance.locked ? "解锁" : "锁定"}</button></div>
    <div class="rail-tag-group"><span>本地标记</span><div>${tags.map((tag) => `<button type="button" class="instance-command" data-ui-kind="button" data-control-variant="secondary" data-instance-tag="${tag}" aria-pressed="${instance.tag === tag}">${tag}</button>`).join("")}</div></div>
    <details class="rail-more"><summary>备注与复用</summary><div class="rail-more-content"><textarea data-instance-note aria-label="实例备注" placeholder="记录属性用途、配装方向或后续处理计划">${instance.note || ""}</textarea><div class="instance-command-row"><button type="button" class="instance-command" data-ui-kind="button" data-control-variant="primary" data-instance-command="save-note">保存备注</button><button type="button" class="instance-command" data-ui-kind="button" data-control-variant="secondary" data-instance-command="copy">复制摘要</button><button type="button" class="instance-command" data-ui-kind="button" data-control-variant="secondary" data-instance-command="loadout">加入配装草稿</button></div></div></details>
    <p class="instance-action-status" data-ui-part="state" data-info-priority="support" data-text-tone="status" data-status="${state.instanceActionStatus ? "success" : "neutral"}" role="status" aria-live="polite">${state.instanceActionStatus}</p>`;
}

function renderAi(data, object) {
  if (!state.aiReady) {
    el.ai.innerHTML = `<span class="badge violet">AI 区域</span><h4>尚未运行分析</h4><p>属性、获取来源、护甲配置、升级状态和三个独立目标来源已经分别展示。只有点击右侧按钮后才生成主观分析。</p>`;
    el.saveAi.disabled = true;
    return;
  }
  const external = document.querySelector("[data-ai-external]").checked;
  const objectLabel = state.mode === "library" ? "护甲定义" : state.mode === "vendor" ? "当前商人 Offer" : `账号实例 ${object.id}`;
  el.ai.innerHTML = `<span class="badge violet">AI 生成 · 用户尚未确认</span><h4>${data.name} · ${objectLabel}分析</h4><p>分析会结合当前对象事实、套装状态、独立目标匹配和获取来源。这里是主观解释区域，不会改写前面的可靠数据。</p><div class="ai-evidence"><div><small>护甲事实</small><strong>装备资料 + 账号状态</strong></div><div><small>实时来源</small><strong>商人实时数据</strong></div><div><small>目标数据</small><strong>个人 + 配装攻略 + 社区${external ? " + 外部引用" : ""}</strong></div></div>`;
  el.saveAi.disabled = false;
}

function render() {
  const data = armor();
  const object = currentObject(data);
  document.querySelector(".overview-grid").classList.toggle("is-stat-empty", !object);
  document.documentElement.dataset.theme = state.theme;
  document.querySelector("[data-prototype-root]").dataset.state = state.detailState;
  document.querySelector("[data-detail-state-layer]").dataset.status = ({ normal: "neutral", loading: "pending", empty: "neutral", error: "error", partial: "warning", disabled: "warning", running: "pending" })[state.detailState];
  document.querySelectorAll("[data-theme]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.theme === state.theme)));
  document.querySelectorAll("[data-armor]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.armor === state.armor)));
  document.querySelectorAll("[data-mode]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode)));
  document.querySelectorAll("[data-prototype-state]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.prototypeState === state.detailState)));
  const drawerOpen = window.matchMedia("(max-width: 1360px)").matches && state.railOpen;
  el.instanceRail.classList.toggle("is-open", drawerOpen);
  el.instanceRail.setAttribute("aria-hidden", String(window.matchMedia("(max-width: 1360px)").matches && !drawerOpen));
  el.railScrim.classList.toggle("is-open", drawerOpen);
  document.querySelector(".dossier-toolbar").inert = drawerOpen;
  document.querySelector(".identity").inert = drawerOpen;
  document.querySelector(".detail-sticky").inert = drawerOpen;
  document.querySelector(".dossier-main").inert = drawerOpen;
  document.querySelector("[data-toggle-rail]").setAttribute("aria-expanded", String(drawerOpen));
  renderIdentity(data, object);
  renderStats(data, object);
  renderSources(data);
  renderConfiguration(data, object);
  renderTargets(data, object);
  renderUpgrades(data, object);
  renderInstances(data);
  renderInstanceActions(data, selectedInstance(data));
  renderAi(data, object);
  const detailStateCopy = {
    normal: ["完整状态", "真实对象已读取", "正文、实例和操作区按当前入口显示。"],
    loading: ["加载状态", "正在读取护甲详情", "保留档案尺寸，等待 Manifest、Profile 或 Vendor 数据返回。"],
    empty: ["空状态", "当前没有可显示的护甲对象", "保留返回与切换入口，不使用示例装备填充。"],
    error: ["失败状态", "护甲详情读取失败", "显示明确错误与重试入口，不把旧数据冒充当前结果。"],
    partial: ["部分可用", "部分定义或实例数据缺失", "已确认字段继续显示，缺失区域单独标记，操作按依赖条件禁用。"],
    disabled: ["禁用状态", "当前对象不允许执行写操作", "只读事实仍可查看，禁用原因必须紧邻对应控件。"],
    running: ["进行中", "正在等待 Bungie 写操作返回", "保留原配置和当前实例状态，成功后才更新结果。"]
  }[state.detailState];
  document.querySelector("[data-detail-state-kicker]").textContent = detailStateCopy[0];
  document.querySelector("[data-detail-state-title]").textContent = detailStateCopy[1];
  document.querySelector("[data-detail-state-copy]").textContent = detailStateCopy[2];
}

document.querySelectorAll("[data-prototype-state]").forEach((button) => button.addEventListener("click", () => {
  state.detailState = button.dataset.prototypeState;
  render();
}));

document.querySelector("[data-detail-state-reset]").addEventListener("click", () => {
  state.detailState = "normal";
  render();
});

document.querySelectorAll("[data-theme]").forEach((button) => button.addEventListener("click", () => {
  state.theme = button.dataset.theme;
  localStorage.setItem("armor-detail-prototype-theme", state.theme);
  render();
}));

document.querySelectorAll("[data-armor]").forEach((button) => button.addEventListener("click", () => {
  state.armor = button.dataset.armor;
  state.mode = "library";
  state.targetSource = "personal";
  state.aiReady = false;
  state.aiSaved = false;
  state.instanceActionStatus = "";
  closeRail();
  updateHash();
  render();
}));

document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => {
  state.mode = button.dataset.mode;
  state.aiReady = false;
  state.aiSaved = false;
  state.instanceActionStatus = "";
  closeRail();
  updateHash();
  render();
}));

function scrollDossierTo(sectionName) {
  const scroller = document.querySelector(".dossier-scroll");
  const target = document.querySelector(`[data-section="${sectionName}"]`);
  if (!scroller || !target) return;
  scroller.scrollTo({ top: Math.max(0, target.offsetTop - 56), behavior: "smooth" });
}

document.querySelectorAll("[data-target]").forEach((button) => button.addEventListener("click", () => {
  scrollDossierTo(button.dataset.target);
  document.querySelectorAll("[data-target]").forEach((item) => {
    const active = item === button;
    item.classList.toggle("is-active", active);
    item.toggleAttribute("aria-current", active);
  });
}));

document.querySelectorAll("[data-target-source]").forEach((button) => button.addEventListener("click", () => {
  state.targetSource = button.dataset.targetSource;
  renderTargets(armor(), currentObject());
}));

document.querySelector("[role=tablist]").addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const tabs = [...event.currentTarget.querySelectorAll('[role="tab"]')];
  const current = tabs.indexOf(document.activeElement);
  let next = current;
  if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
  if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = tabs.length - 1;
  event.preventDefault();
  tabs[next].focus();
  tabs[next].click();
});

document.querySelector("[data-toggle-rail]").addEventListener("click", () => {
  state.railOpen = !state.railOpen;
  render();
  if (state.railOpen) requestAnimationFrame(() => document.querySelector("[data-close-rail]")?.focus());
});

el.railScrim.addEventListener("click", () => {
  closeRail();
  render();
});

document.querySelector("[data-close-rail]").addEventListener("click", () => {
  closeRail();
  render();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !state.railOpen) return;
  closeRail();
  render();
  document.querySelector("[data-toggle-rail]")?.focus();
});

document.addEventListener("click", (event) => {
  const instanceButton = event.target.closest("[data-instance-mode]");
  if (instanceButton) {
    state.mode = instanceButton.dataset.instanceMode;
    closeRail();
    state.aiReady = false;
    state.aiSaved = false;
    state.instanceActionStatus = "";
    updateHash();
    render();
    return;
  }
  const tagButton = event.target.closest("[data-instance-tag]");
  if (tagButton) {
    const instance = selectedInstance();
    if (!instance) return;
    instance.tag = tagButton.dataset.instanceTag;
    state.instanceActionStatus = `已标记为“${instance.tag}”。`;
    render();
    return;
  }
  const commandButton = event.target.closest("[data-instance-command]");
  if (!commandButton) return;
  const data = armor();
  const instance = selectedInstance(data);
  if (!instance) return;
  const command = commandButton.dataset.instanceCommand;
  if (command === "equip") {
    data.instances.forEach((other) => {
      if (other !== instance && other.location === `${data.guardianClass}已装备`) other.location = `${data.guardianClass}背包`;
    });
    instance.location = `${data.guardianClass}已装备`;
    state.instanceActionStatus = `原型已模拟：${instance.id} 已装备到${data.guardianClass}。`;
  } else if (command === "transfer") {
    instance.location = instance.location === "仓库" ? `${data.guardianClass}背包` : "仓库";
    state.instanceActionStatus = `原型已模拟：${instance.id} 已${instance.location === "仓库" ? "移入仓库" : `取出到${data.guardianClass}背包`}。`;
  } else if (command === "lock") {
    instance.locked = !instance.locked;
    state.instanceActionStatus = `原型已模拟：${instance.id} 已${instance.locked ? "锁定" : "解锁"}。`;
  } else if (command === "save-note") {
    instance.note = document.querySelector("[data-instance-note]")?.value ?? instance.note;
    state.instanceActionStatus = "本地备注已保存。";
  } else if (command === "copy") {
    state.instanceActionStatus = `已模拟复制摘要：${data.name} · 总属性 ${total(instance.stats)}。`;
  } else if (command === "loadout") {
    state.instanceActionStatus = `${instance.id} 已加入本地配装草稿。`;
  }
  render();
});

document.querySelector("[data-run-ai]").addEventListener("click", () => {
  state.aiReady = true;
  state.aiSaved = false;
  el.aiStatus.textContent = document.querySelector("[data-ai-external]").checked ? "已生成分析，并保留模拟外部引用。" : "已根据当前护甲事实和三个独立目标来源生成分析。";
  renderAi(armor(), currentObject());
});

document.querySelector("[data-save-ai]").addEventListener("click", () => {
  if (!state.aiReady) return;
  state.aiSaved = true;
  el.aiStatus.textContent = "已确认并保存为个人知识。";
});

render();
