(() => {
  const state = { character: "hunter", mode: "native", nativeSlot: 0, planId: "nightfall", modal: null, selectedSaveSlot: null, dimUrl: "", dimPreview: false };
  const data = {
    hunter: { label: "猎人", slots: [
      { name: "日落速刷", items: ["遗产", "漏斗网", "边缘运输", "金枪头", "坚忍护手", "坚忍胸甲", "坚忍腿甲", "坚忍披风"] },
      { name: "虚空输出", items: ["凋零者", "漏斗网", "尖顶捕食者", "金枪头", "坚忍护手", "坚忍胸甲", "坚忍腿甲"] },
      { name: "突袭清图", items: ["遗产", "伊凯洛斯冲锋枪", "冷漠无情", "金枪头", "坚忍护手", "坚忍胸甲", "坚忍腿甲"] }
    ] },
    titan: { label: "泰坦", slots: [{ name: "日落堡垒", items: ["遗产", "漏斗网", "边缘运输", "合成感情", "坚忍护手", "坚忍胸甲", "坚忍腿甲"] }] },
    warlock: { label: "术士", slots: [{ name: "虚空支援", items: ["遗产", "漏斗网", "边缘运输", "坠星苔原", "坚忍护手", "坚忍胸甲", "坚忍腿甲"] }] }
  };
  const plans = [
    { id: "nightfall", name: "日落清图", className: "猎人", source: "攻略导入", updated: "今天 14:26", items: [
      { glyph: "⚔", bucket: "动能武器", name: "遗产", choice: "遗产 · 当前角色", perk: "Perk：重建 / 斩首武器" },
      { glyph: "✦", bucket: "能量武器", name: "漏斗网", choice: "漏斗网 · 仓库", perk: "Perk：喂食狂热 / 杀戮弹匣" },
      { glyph: "◆", bucket: "威能武器", name: "边缘运输", choice: "未指定实例", perk: "候选 3 件" },
      { glyph: "◉", bucket: "异域头部", name: "金枪头", choice: "金枪头 · 仓库", perk: "" },
      { glyph: "◒", bucket: "传说手臂", name: "未拥有", choice: "未拥有", perk: "保留为未完成条目" }
    ] },
    { id: "void", name: "虚空猎人 - 爆发", className: "猎人", source: "手动方案", updated: "昨天 21:40", items: [
      { glyph: "⚔", bucket: "动能武器", name: "凋零者", choice: "凋零者 · 当前角色", perk: "" },
      { glyph: "✦", bucket: "能量武器", name: "漏斗网", choice: "漏斗网 · 仓库", perk: "Perk：喂食狂热 / 杀戮弹匣" },
      { glyph: "◉", bucket: "异域头部", name: "金枪头", choice: "金枪头 · 仓库", perk: "" }
    ] }
  ];
  const workspace = document.querySelector("[data-workspace]");
  const modal = document.querySelector("[data-modal]");
  const modalTitle = document.querySelector("[data-modal-title]");
  const modalEyebrow = document.querySelector("[data-modal-eyebrow]");
  const modalBody = document.querySelector("[data-modal-body]");
  const modalFooter = document.querySelector("[data-modal-footer]");
  const status = document.querySelector("[data-operation-status]");
  const glyphs = ["⚔", "✦", "◆", "◉", "◒", "◈", "◑", "◌"];
  function getCurrentPlan() { return plans.find((plan) => plan.id === state.planId) ?? plans[0]; }
  function setStatus(kind, title, message) { status.innerHTML = `<span class="status-dot ${kind}"></span><strong>${title}</strong><span>${message}</span>`; }
  function render() {
    document.querySelectorAll("[data-character]").forEach((button) => button.classList.toggle("active", button.dataset.character === state.character));
    document.querySelectorAll("[data-mode]").forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode));
    document.querySelector("[data-character-context]").textContent = `当前查看：${data[state.character].label}的游戏内配装`;
    workspace.innerHTML = state.mode === "native" ? renderNative() : renderLocal();
  }
  function renderNative() {
    const character = data[state.character];
    const selected = character.slots[state.nativeSlot] ?? character.slots[0];
    const items = selected.items.map((name, index) => ({ name, glyph: glyphs[index], bucket: index < 3 ? ["动能武器", "能量武器", "威能武器"][index] : ["头部", "手臂", "胸部", "腿部", "职业物品"][index - 3] || "装备" }));
    return `<section class="native-workspace"><aside class="workspace-rail"><div class="workspace-rail-head"><strong>Bungie 游戏内配装</strong><small>${character.slots.length} 个已保存槽位 · ${character.label}</small></div><div>${character.slots.map((slot, index) => `<button class="native-slot-row ${index === state.nativeSlot ? "active" : ""}" type="button" data-select-slot="${index}"><span class="slot-index">0${index + 1}</span><span><strong>${slot.name}</strong><small>${slot.items.length} 件保存装备</small></span><span class="badge">Bungie</span></button>`).join("")}</div></aside><section class="native-detail"><header class="detail-head"><div><span class="eyebrow">游戏内配装 · 槽位 ${String(state.nativeSlot + 1).padStart(2, "0")}</span><h2>${selected.name}</h2><p>已保存装备来自 Bungie；Perk、技能和模组等未返回字段不在此伪造显示。</p></div><div class="action-stack"><button class="button primary" type="button" data-apply-native>应用游戏内配装</button><button class="button" type="button" data-copy-native>复制为本地方案</button></div></header><div class="detail-section-label"><span>保存的装备 · 当前账号状态</span><span>${items.filter((_, index) => index !== 2).length} 件可定位 · 1 件在仓库</span></div>${items.map((item, index) => `<article class="game-gear-row"><span class="item-glyph ${index > 2 ? "armor" : ""}">${item.glyph}</span><div><strong>${item.name}</strong><span>${item.bucket} · ${index === 2 ? "仓库" : index === 3 ? "当前角色已装备" : "当前角色背包"}</span></div><span class="badge ${index === 2 ? "warning" : "ready"}">${index === 2 ? "可定位" : "当前角色"}</span></article>`).join("")}</section><aside class="native-context"><div class="context-head"><strong>账号核对</strong><small>不影响 Bungie 应用</small></div><div class="context-metric"><div><strong>保存装备</strong><span>${items.length} 件</span></div><b>${items.length}</b></div><div class="context-metric"><div><strong>当前角色已装备</strong><span>与本槽位重合 5 件</span></div><b>5</b></div><div class="context-metric"><div><strong>可定位但未装备</strong><span>背包或仓库中仍可找到</span></div><b>3</b></div><p class="context-note"><b>应用规则</b><br>点击应用后直接调用 Bungie。d2-tools 不会预先转移或逐件装备。</p></aside></section>`;
  }
  function renderLocal() {
    const plan = getCurrentPlan();
    const sameClass = plan.className === data[state.character].label;
    const executable = plan.items.filter((item) => !item.choice.includes("未")).length;
    return `<section class="local-workspace"><aside class="plan-list"><div class="workspace-rail-head"><strong>本地配装方案</strong><small>按职业保存 · 本机数据</small></div>${plans.map((item) => `<button class="plan-list-row ${item.id === plan.id ? "active" : ""}" type="button" data-select-plan="${item.id}"><header><strong>${item.name}</strong><span class="badge ${item.items.some((entry) => entry.choice.includes("未")) ? "warning" : "ready"}">${item.className}</span></header><span>${item.source} · ${item.items.length} 个条目</span><footer><small>${item.updated}</small><small>${item.items.filter((entry) => !entry.choice.includes("未")).length} 项已指定</small></footer></button>`).join("")}</aside><section class="plan-detail"><header class="detail-head"><div><span class="eyebrow">本地配装方案 · ${plan.className}</span><h2>${plan.name}</h2><p>${plan.source} · ${plan.updated} · 保存方案不写入 Bungie 槽位</p></div><div class="action-stack"><button class="button" type="button" data-save-plan>保存方案</button><button class="button primary" type="button" data-apply-plan ${sameClass ? "" : "disabled"}>应用本地方案</button></div></header><div class="plan-toolbar"><span>每个条目必须指定实例才会参与应用；未拥有条目可保留在方案中。</span><button class="button" type="button" data-add-item>添加装备</button></div>${plan.items.map((item, index) => `<article class="plan-item-row"><span class="item-glyph ${item.choice.includes("未") ? "missing" : index > 2 ? "armor" : ""}">${item.choice.includes("未") ? "?" : item.glyph}</span><div><strong>${item.name}</strong><span>${item.bucket}</span><span class="perk-line">${item.perk || "未指定 Perk"}</span></div><div class="assignment"><select data-plan-choice="${index}"><option ${item.choice.includes("当前") ? "selected" : ""}>${item.choice}</option><option>候选实例 · 当前角色</option><option>候选实例 · 仓库</option><option>未指定实例</option></select></div><button class="icon-button" type="button" data-remove-item="${index}" title="删除条目" aria-label="删除条目">×</button></article>`).join("")}</section><aside class="plan-context"><div class="context-head"><strong>应用前核对</strong><small>${sameClass ? "目标职业一致" : `请切换到${plan.className}`}</small></div><div class="context-metric"><div><strong>可执行条目</strong><span>已指定实例，可转移、装备并切换目标 Perk</span></div><b>${executable}</b></div><div class="context-metric"><div><strong>待处理条目</strong><span>未拥有或未指定实例，应用时保留未完成</span></div><b>${plan.items.length - executable}</b></div><div class="pending-list"><div class="pending-row"><strong>批量确认</strong><span>若来源角色已装备物品，执行计划会一次列出所有受影响角色和物品。</span></div><div class="pending-row"><strong>保存与应用分开</strong><span>应用本地方案不会自动保存到 Bungie 槽位。</span></div></div><div class="context-actions"><button class="button" type="button" data-new-plan>新建方案</button><button class="button danger" type="button" data-delete-plan>删除方案</button></div></aside></section>`;
  }
  function openModal(type) {
    state.modal = type;
    modal.hidden = false;
    if (type === "native") {
      modalEyebrow.textContent = "写入前确认"; modalTitle.textContent = "应用 Bungie 游戏内配装";
      modalBody.innerHTML = steps([["01", "调用 Bungie", "d2-tools 将直接请求应用选中的游戏内配装槽，不预先转移或逐件装备。"], ["02", "刷新账号", "Bungie 返回后重新读取角色状态，只显示实际结果。"]]);
      modalFooter.innerHTML = `<button class="button" type="button" data-close-modal>取消</button><button class="button primary" type="button" data-confirm-action>确认应用</button>`;
    } else if (type === "plan") {
      modalEyebrow.textContent = "执行计划"; modalTitle.textContent = "应用本地配装方案";
      modalBody.innerHTML = steps([["01", "转移 2 件装备", "从仓库及其他角色准备已指定实例；未拥有或未指定条目保持未完成。"], ["02", "装备 3 件物品", "将可执行条目装备到当前猎人角色。"], ["03", "切换 1 个 Perk", "在漏斗网上切换方案指定的可用 Perk。"], ["04", "刷新实际状态", "任一步失败即停止后续步骤，并读取账号的真实结果。"]]);
      modalFooter.innerHTML = `<button class="button" type="button" data-close-modal>取消</button><button class="button primary" type="button" data-confirm-action>确认执行计划</button>`;
    } else if (type === "save") {
      modalEyebrow.textContent = "保存当前配装"; modalTitle.textContent = "选择 Bungie 游戏内槽位";
      const slots = data[state.character].slots;
      modalBody.innerHTML = `<div class="slot-picker">${[0,1,2,3].map((index) => { const slot = slots[index]; return `<button class="${state.selectedSaveSlot === index ? "active" : ""} ${slot ? "" : "empty-slot"}" type="button" data-save-slot="${index}"><strong>${slot ? slot.name : `空槽位 ${index + 1}`}</strong><span>${slot ? `${slot.items.length} 件保存装备 · 覆盖需确认` : "保存当前角色已装备状态"}</span></button>`; }).join("")}</div>`;
      modalFooter.innerHTML = `<button class="button" type="button" data-close-modal>取消</button><button class="button primary" type="button" data-confirm-save ${state.selectedSaveSlot === null ? "disabled" : ""}>${state.selectedSaveSlot !== null && slots[state.selectedSaveSlot] ? "确认覆盖" : "保存到槽位"}</button>`;
    } else if (type === "copy") {
      modalEyebrow.textContent = "创建本地方案"; modalTitle.textContent = "从游戏内配装复制";
      modalBody.innerHTML = steps([["01", "复制 Bungie 可读字段", "复制当前槽位保存的装备实例到一个本地方案。"], ["02", "保留未知配置", "Bungie 未返回的 Perk、技能和模组不猜测填入，可在本地方案中后续编辑。"]]);
      modalFooter.innerHTML = `<button class="button" type="button" data-close-modal>取消</button><button class="button primary" type="button" data-confirm-copy>创建本地方案</button>`;
    } else if (type === "dim") {
      modalEyebrow.textContent = "导入本地方案"; modalTitle.textContent = "导入 DIM 配装分享链接";
      const preview = state.dimPreview ? `<div class="import-preview"><div class="import-preview-head"><strong>读取结果</strong><span>猎人 · 5 个装备条目</span></div><div class="import-preview-row"><div><strong>遗产</strong><span>动能武器 · 重建 / 斩首武器</span></div><em>匹配</em></div><div class="import-preview-row"><div><strong>漏斗网</strong><span>能量武器 · 喂食狂热 / 杀戮弹匣</span></div><em>匹配</em></div><div class="import-preview-row"><div><strong>边缘运输</strong><span>威能武器 · Perk 未在链接中给出</span></div><em>待选择</em></div><div class="import-preview-row"><div><strong>金枪头、坚忍护手</strong><span>护甲条目 · 第一阶段只记录装备</span></div><em>匹配</em></div></div>` : "";
      modalBody.innerHTML = `<div class="import-form"><label for="dim-share-url">DIM 配装分享链接</label><input id="dim-share-url" data-dim-url value="${state.dimUrl}" placeholder="https://dim.gg/..." autocomplete="off"><small>仅支持 DIM 配装分享链接，不支持 DIM Wishlist。读取成功后先核对装备和明确 Perk，再创建本地方案。</small></div>${preview}`;
      modalFooter.innerHTML = state.dimPreview ? `<button class="button" type="button" data-close-modal>取消</button><button class="button primary" type="button" data-confirm-dim>确认导入方案</button>` : `<button class="button" type="button" data-close-modal>取消</button><button class="button primary" type="button" data-preview-dim ${state.dimUrl.trim() ? "" : "disabled"}>读取并预览</button>`;
    }
  }
  function steps(rows) { return rows.map((row) => `<div class="modal-step"><b>${row[0]}</b><div><strong>${row[1]}</strong><span>${row[2]}</span></div></div>`).join(""); }
  function closeModal() { modal.hidden = true; state.modal = null; state.selectedSaveSlot = null; state.dimPreview = false; }
  function runOperation(title, message) {
    closeModal(); setStatus("running", title, message);
    window.setTimeout(() => setStatus("", "已刷新", "演示状态：正式产品将以 Bungie 返回和最新账号快照更新页面。"), 850);
  }
  document.addEventListener("click", (event) => {
    const target = event.target.closest("button,[data-close-modal]"); if (!target) return;
    if (target.matches("[data-theme-toggle]")) document.documentElement.dataset.theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    if (target.matches("[data-character]")) { state.character = target.dataset.character; state.nativeSlot = 0; render(); }
    if (target.matches("[data-mode]")) { state.mode = target.dataset.mode; render(); }
    if (target.matches("[data-select-slot]")) { state.nativeSlot = Number(target.dataset.selectSlot); render(); }
    if (target.matches("[data-select-plan]")) { state.planId = target.dataset.selectPlan; render(); }
    if (target.matches("[data-apply-native]")) openModal("native");
    if (target.matches("[data-apply-plan]")) openModal("plan");
    if (target.matches("[data-save-current]")) openModal("save");
    if (target.matches("[data-copy-native]")) openModal("copy");
    if (target.matches("[data-import-dim]")) openModal("dim");
    if (target.matches("[data-save-slot]")) { state.selectedSaveSlot = Number(target.dataset.saveSlot); openModal("save"); }
    if (target.matches("[data-confirm-action]")) runOperation(state.modal === "native" ? "正在应用 Bungie 配装" : "正在应用本地方案", state.modal === "native" ? "已提交给 Bungie，等待账号状态刷新。" : "正在按确认计划处理指定实例和 Perk。" );
    if (target.matches("[data-confirm-save]")) runOperation("正在保存当前配装", "正在将当前角色已装备状态快照到选择的 Bungie 槽位。" );
    if (target.matches("[data-confirm-copy]")) { const id = `copy-${Date.now()}`; plans.unshift({ id, name: "日落速刷（副本）", className: data[state.character].label, source: "游戏内配装复制", updated: "刚刚", items: data[state.character].slots[state.nativeSlot].items.map((name, index) => ({ glyph: glyphs[index], bucket: index < 3 ? ["动能武器", "能量武器", "威能武器"][index] : "装备", name, choice: `${name} · 当前账号实例`, perk: "" })) }); state.planId = id; state.mode = "local"; closeModal(); setStatus("", "已创建本地方案", "已复制 Bungie 官方可读的装备实例；未返回配置保持空白。"); render(); }
    if (target.matches("[data-preview-dim]")) { if (!/^https?:\/\/(?:www\.)?dim\.gg\/.+/i.test(state.dimUrl.trim())) { closeModal(); setStatus("error", "无法读取 DIM 链接", "仅支持完整的 dim.gg 配装分享链接；未创建本地方案。"); return; } state.dimPreview = true; openModal("dim"); }
    if (target.matches("[data-confirm-dim]")) { const id = `dim-${Date.now()}`; plans.unshift({ id, name: "DIM 导入 - 日落清图", className: "猎人", source: "DIM 配装链接", updated: "刚刚", items: [{ glyph: "⚔", bucket: "动能武器", name: "遗产", choice: "遗产 · 当前角色", perk: "Perk：重建 / 斩首武器" }, { glyph: "✦", bucket: "能量武器", name: "漏斗网", choice: "漏斗网 · 仓库", perk: "Perk：喂食狂热 / 杀戮弹匣" }, { glyph: "◆", bucket: "威能武器", name: "边缘运输", choice: "未指定实例", perk: "" }, { glyph: "◉", bucket: "异域头部", name: "金枪头", choice: "金枪头 · 仓库", perk: "" }, { glyph: "◒", bucket: "传说手臂", name: "坚忍护手", choice: "未指定实例", perk: "" }] }); state.planId = id; state.mode = "local"; closeModal(); setStatus("", "DIM 配装已导入", "已保存为本地方案；未指定实例和链接未提供的 Perk 仍需在方案内核对。"); render(); }
    if (target.matches("[data-new-plan]")) { const id = `new-${Date.now()}`; plans.unshift({ id, name: "未命名本地方案", className: data[state.character].label, source: "当前角色创建", updated: "刚刚", items: [] }); state.planId = id; state.mode = "local"; setStatus("", "已创建本地方案", "可添加装备条目并显式保存。" ); render(); }
    if (target.matches("[data-add-item]")) { const plan = getCurrentPlan(); plan.items.push({ glyph: "?", bucket: "装备", name: "未指定装备", choice: "未指定实例", perk: "" }); render(); }
    if (target.matches("[data-remove-item]")) { getCurrentPlan().items.splice(Number(target.dataset.removeItem), 1); render(); }
    if (target.matches("[data-save-plan]")) setStatus("", "本地方案已保存", "保存仅写入本机数据，未触发任何 Bungie 写操作。" );
    if (target.matches("[data-delete-plan]")) { const index = plans.findIndex((plan) => plan.id === state.planId); plans.splice(index, 1); state.planId = plans[0]?.id; setStatus("", "本地方案已删除", "演示状态：剩余方案保持不变。" ); render(); }
    if (target.matches("[data-close-modal]")) closeModal();
  });
  document.addEventListener("input", (event) => { const field = event.target.closest("[data-dim-url]"); if (!field) return; state.dimUrl = field.value; const previewButton = modal.querySelector("[data-preview-dim]"); if (previewButton) previewButton.disabled = !state.dimUrl.trim(); });
  document.addEventListener("change", (event) => { const select = event.target.closest("[data-plan-choice]"); if (!select) return; const item = getCurrentPlan().items[Number(select.dataset.planChoice)]; item.choice = select.value; setStatus("", "方案存在未保存更改", "选择实例后需要点击“保存方案”写入本机数据。" ); render(); });
  render();
})();
