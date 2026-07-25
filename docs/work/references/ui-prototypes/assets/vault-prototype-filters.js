(() => {
  const weaponBuckets = new Set(["动能武器", "能量武器", "威能武器"]);
  const armorBuckets = new Set(["头盔", "臂铠", "胸甲", "腿甲", "职业物品"]);
  const armorStats = [
    ["health", "生命"],
    ["melee", "近战"],
    ["grenade", "手雷"],
    ["super", "超能"],
    ["class", "职业"],
    ["weapon", "武器"]
  ];
  const createDraft = (scope) => ({
    query: "",
    slot: "all",
    tag: "all",
    lock: "all",
    sort: scope === "armor" ? "selected-stats" : "name",
    weaponType: "all",
    armorRules: []
  });
  const filterState = {
    scope: "weapons",
    drafts: {
      weapons: createDraft("weapons"),
      armor: createDraft("armor"),
      all: createDraft("all")
    }
  };

  const root = document.querySelector('[data-page-view="vault"]');
  if (!root || !window.accountWorkspaceSnapshot) return;

  const snapshot = window.accountWorkspaceSnapshot;
  const items = snapshot.items;
  const vaultIndexes = snapshot.vaultIndexes;
  const matchedIndexes = new Set(snapshot.loadoutMatchedIndexes);
  const activeDraft = () => filterState.drafts[filterState.scope];
  const isWeapon = (item) => weaponBuckets.has(item.bucket);
  const isArmor = (item) => armorBuckets.has(item.bucket);
  const getArmorTotal = (item) => Number(/总属性\s*(\d+)/.exec(item.meta || "")?.[1] || 0);
  const getScopeItems = () => vaultIndexes.map((index) => ({ index, item: items[index] })).filter(({ item }) => {
    if (filterState.scope === "weapons") return isWeapon(item);
    if (filterState.scope === "armor") return isArmor(item);
    return true;
  });
  const optionList = (values, selected, allLabel) => [`<option value="all">${allLabel}</option>`, ...values.map(({ key, label, count }) => `<option value="${escapeHtml(key)}" ${selected === key ? "selected" : ""}>${escapeHtml(label)} ${count}</option>`)].join("");
  const uniqueOptions = (records, valueFor) => [...records.reduce((map, record) => {
    const value = valueFor(record);
    if (!value) return map;
    map.set(value, (map.get(value) || 0) + 1);
    return map;
  }, new Map()).entries()].map(([key, count]) => ({ key, label: key, count }));

  function renderSelect({ id, label, value, options, className = "" }) {
    const selected = options.find((option) => option.value === value) || options[0];
    return `<div class="vault-select ${className}" data-vault-select-root><button class="vault-select-trigger" type="button" data-ui-kind="button" data-control-variant="field" data-vault-select="${escapeHtml(id)}" aria-haspopup="listbox" aria-expanded="false" aria-controls="vault-select-menu-${escapeHtml(id)}"><span class="vault-select-value">${escapeHtml(selected.label)}</span><span class="vault-select-indicator" aria-hidden="true"><svg viewBox="0 0 12 8" fill="none"><path d="m1 1.5 5 5 5-5"/></svg></span></button><div class="vault-select-menu" id="vault-select-menu-${escapeHtml(id)}" role="listbox" aria-label="${escapeHtml(label)}" hidden>${options.map((option) => `<button type="button" role="option" class="vault-select-option" data-vault-select-option="${escapeHtml(id)}" data-vault-select-value="${escapeHtml(option.value)}" aria-selected="${option.value === value}"><span>${escapeHtml(option.label)}</span>${option.count !== undefined ? `<small>${option.count}</small>` : ""}</button>`).join("")}</div></div>`;
  }

  const plainOptions = (entries) => entries.map(([value, label]) => ({ value, label }));

  // 原型快照只记录总属性；这里将每件护甲的已读取总属性稳定投影为六项，
  // 仅用于演示组合条件、排序和草稿保留的交互模型，正式实现必须直接使用实例属性字段。
  function getArmorStatValues(item) {
    const source = item.armorStats || item.stats;
    if (source) return Object.fromEntries(armorStats.map(([key]) => [key, Number(source[key] || 0)]));
    const values = Object.fromEntries(armorStats.map(([key]) => [key, 2]));
    let remainder = Math.max(0, getArmorTotal(item) - armorStats.length * 2);
    let seed = [...String(item.instanceId || item.hash || item.name)].reduce((value, char) => ((value * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
    while (remainder > 0) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const key = armorStats[seed % armorStats.length][0];
      if (values[key] < 30) {
        values[key] += 1;
        remainder -= 1;
      }
    }
    return values;
  }

  function setScope(scope) {
    filterState.scope = scope;
  }

  function sortOptions() {
    const draft = activeDraft();
    const common = [
      ["name", "按名称"],
      ["power", "按光等"],
      ["bucket", "按槽位"]
    ];
    if (filterState.scope === "armor") common.unshift(["selected-stats", "按已选属性合计（降序）"], ["armor-total", "按总属性（降序）"]);
    return plainOptions(common);
  }

  function renderArmorRuleOptions(currentKey) {
    const used = new Set(activeDraft().armorRules.map((rule) => rule.stat));
    return armorStats.filter(([key]) => key === currentKey || !used.has(key)).map(([value, label]) => ({ value, label }));
  }

  function renderArmorRules() {
    const draft = activeDraft();
    const canAdd = draft.armorRules.length < armorStats.length;
    const rules = draft.armorRules.length
      ? draft.armorRules.map((rule, index) => `<div class="vault-armor-rule" data-surface="row"><div class="vault-armor-rule-field"><span data-ui-part="label" data-info-priority="support" data-text-tone="meta">属性</span>${renderSelect({ id: `armor-stat:${index}`, label: `第 ${index + 1} 条护甲属性`, value: rule.stat, options: renderArmorRuleOptions(rule.stat) })}</div><span class="vault-rule-operator" aria-hidden="true">≥</span><label class="vault-armor-rule-field"><span data-ui-part="label" data-info-priority="support" data-text-tone="meta">最低值</span><input type="number" min="0" step="1" inputmode="numeric" data-ui-kind="field" data-vault-armor-rule-min="${index}" value="${rule.min}" aria-label="${escapeHtml(armorStats.find(([key]) => key === rule.stat)?.[1] || "属性")}最低值"></label><button class="vault-armor-rule-remove" type="button" data-ui-kind="button" data-control-variant="quiet" data-vault-armor-rule-remove="${index}" aria-label="删除${escapeHtml(armorStats.find(([key]) => key === rule.stat)?.[1] || "")}条件">删除</button></div>`).join("")
      : '<p class="vault-armor-rule-empty" data-ui-part="detail" data-info-priority="reading" data-text-tone="body">尚未添加属性条件；可按需要组合生命、近战、手雷、超能、职业和武器。</p>';
    return `<section class="vault-domain-filter vault-armor-filter" data-surface="section" data-contract-id="vault.armor-filters"><div class="vault-domain-filter-heading"><div><h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">护甲属性条件</h3><p data-ui-part="detail" data-info-priority="reading" data-text-tone="body">所有条件同时成立。总属性不作为筛选门槛，只可用于排序。</p></div><button class="button vault-armor-rule-add" type="button" data-ui-kind="button" data-control-variant="secondary" data-vault-armor-rule-add ${canAdd ? "" : "disabled"}>${canAdd ? "添加属性条件" : "六项属性均已添加"}</button></div><div class="vault-armor-rule-list" role="group" aria-label="护甲属性组合条件">${rules}</div></section>`;
  }

  function renderDomainFilter(scoped) {
    const draft = activeDraft();
    if (filterState.scope === "weapons") {
      const types = uniqueOptions(scoped.filter(({ item }) => isWeapon(item)), ({ item }) => item.type);
      const typeOptions = [{ value: "all", label: "全部武器类型" }, ...types.map(({ key, label, count }) => ({ value: key, label, count }))];
      return `<section class="vault-domain-filter vault-weapon-filter" data-surface="section" data-contract-id="vault.weapon-filters"><div class="vault-domain-field" data-ui-part="label" data-info-priority="support" data-text-tone="meta"><span>武器类型</span>${renderSelect({ id: "filter:weaponType", label: "武器类型", value: draft.weaponType, options: typeOptions })}</div><p data-ui-part="detail" data-info-priority="reading" data-text-tone="body">弹药与框架仍依赖正式资料字段；当前原型只使用已读取的类型、槽位、Perk、锁定和本地标签。</p></section>`;
    }
    if (filterState.scope === "armor") return renderArmorRules();
    return '<section class="vault-domain-filter vault-all-filter" data-surface="section"><p data-ui-part="detail" data-info-priority="reading" data-text-tone="body">全部物品只使用共同条件。切换到武器或护甲后，继续编辑各自保留的筛选草稿。</p></section>';
  }

  function renderFilterControls() {
    const host = root.querySelector('[data-vault-filter-host]');
    if (!host) return;
    const draft = activeDraft();
    const scoped = getScopeItems();
    const slots = uniqueOptions(scoped, ({ item }) => item.bucket);
    const scopeLabel = filterState.scope === "weapons" ? "武器" : filterState.scope === "armor" ? "护甲" : "全部物品";
    const slotOptions = [{ value: "all", label: "全部槽位" }, ...slots.map(({ key, label, count }) => ({ value: key, label, count }))];
    const tagOptions = plainOptions([["all", "全部标签"], ["保留", "保留"], ["关注", "关注"], ["配装用", "配装用"], ["可清理", "可清理"], ["待刷", "待刷"], ["未标记", "未标记"]]);
    const lockOptions = plainOptions([["all", "全部状态"], ["locked", "已锁定"], ["unlocked", "未锁定"]]);
    host.innerHTML = `<section class="vault-filter-workbench" data-surface="frame" aria-label="仓库筛选"><header class="vault-filter-head"><div class="vault-filter-title"><span data-ui-part="label" data-info-priority="support" data-text-tone="meta">筛选工作台</span><strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">${scopeLabel}装备</strong></div><div class="vault-filter-actions"><span class="vault-filter-hint" data-ui-part="detail" data-info-priority="support" data-text-tone="body">条件按范围分别保留</span><button class="button vault-filter-reset" type="button" data-ui-kind="button" data-control-variant="secondary" data-vault-filter-reset>清空当前筛选</button></div></header><div class="vault-filter-primary"><label class="vault-filter-search" data-ui-part="label" data-info-priority="support" data-text-tone="meta"><span>关键词</span><input type="search" data-ui-kind="field" data-vault-filter="query" value="${escapeHtml(draft.query)}" placeholder="搜索名称、类型、Perk 或标签"></label><div class="vault-filter-scope-group"><span data-ui-part="label" data-info-priority="support" data-text-tone="meta">范围</span><div class="vault-filter-scope" data-ui-kind="segmented-control" aria-label="仓库筛选范围"><button type="button" data-ui-kind="button" data-control-variant="quiet" data-vault-scope="weapons" aria-pressed="${filterState.scope === "weapons"}">武器</button><button type="button" data-ui-kind="button" data-control-variant="quiet" data-vault-scope="armor" aria-pressed="${filterState.scope === "armor"}">护甲</button><button type="button" data-ui-kind="button" data-control-variant="quiet" data-vault-scope="all" aria-pressed="${filterState.scope === "all"}">全部物品</button></div></div></div><section class="vault-filter-common"><div class="vault-filter-section-head"><span data-ui-part="label" data-info-priority="support" data-text-tone="meta">基础条件</span><span data-ui-part="detail" data-info-priority="support" data-text-tone="body">缩小结果范围，再决定排列方式</span></div><div class="vault-filter-common-row"><div class="vault-filter-field" data-ui-part="label" data-info-priority="support" data-text-tone="meta"><span>槽位</span>${renderSelect({ id: "filter:slot", label: "槽位", value: draft.slot, options: slotOptions })}</div><div class="vault-filter-field" data-ui-part="label" data-info-priority="support" data-text-tone="meta"><span>本地标签</span>${renderSelect({ id: "filter:tag", label: "本地标签", value: draft.tag, options: tagOptions })}</div><div class="vault-filter-field" data-ui-part="label" data-info-priority="support" data-text-tone="meta"><span>锁定状态</span>${renderSelect({ id: "filter:lock", label: "锁定状态", value: draft.lock, options: lockOptions })}</div><div class="vault-filter-field" data-ui-part="label" data-info-priority="support" data-text-tone="meta"><span>排序</span>${renderSelect({ id: "filter:sort", label: "排序", value: draft.sort, options: sortOptions() })}</div></div></section>${renderDomainFilter(scoped)}</section>`;
    root.querySelector('[data-vault-filter-scope]').textContent = scopeLabel;
  }

  function filteredItems() {
    const draft = activeDraft();
    const query = draft.query.trim().toLocaleLowerCase();
    const records = getScopeItems().filter(({ item }) => {
      if (draft.slot !== "all" && item.bucket !== draft.slot) return false;
      if (draft.tag !== "all" && item.tag !== draft.tag) return false;
      if (draft.lock === "locked" && !item.locked) return false;
      if (draft.lock === "unlocked" && item.locked) return false;
      if (filterState.scope === "weapons" && draft.weaponType !== "all" && item.type !== draft.weaponType) return false;
      if (filterState.scope === "armor" && !draft.armorRules.every((rule) => getArmorStatValues(item)[rule.stat] >= rule.min)) return false;
      if (!query) return true;
      return [item.name, item.type, item.bucket, item.meta, item.tag, ...(item.perks || [])].filter(Boolean).some((value) => String(value).toLocaleLowerCase().includes(query));
    });
    return records.sort((left, right) => {
      if (draft.sort === "power") return (right.item.power || 0) - (left.item.power || 0);
      if (draft.sort === "bucket") return left.item.bucket.localeCompare(right.item.bucket, "zh-CN") || left.item.name.localeCompare(right.item.name, "zh-CN");
      if (filterState.scope === "armor") {
        const selected = draft.armorRules.reduce((sum, rule) => sum + (getArmorStatValues(right.item)[rule.stat] - getArmorStatValues(left.item)[rule.stat]), 0);
        const total = getArmorTotal(right.item) - getArmorTotal(left.item);
        if (draft.sort === "selected-stats") return selected || total || left.item.name.localeCompare(right.item.name, "zh-CN");
        if (draft.sort === "armor-total") return total || left.item.name.localeCompare(right.item.name, "zh-CN");
      }
      return left.item.name.localeCompare(right.item.name, "zh-CN");
    });
  }

  function renderVaultResults() {
    const records = filteredItems();
    const visible = records.slice(0, 72);
    const list = root.querySelector('[data-vault-items]');
    const matchedCount = snapshot.loadoutMatchedIndexes.filter((index) => vaultIndexes.includes(index)).length;
    root.querySelector('[data-vault-read-count]').textContent = `已读取 ${snapshot.account.vaultItemCount} 件`;
    root.querySelector('[data-vault-visible-count]').textContent = `当前命中 ${records.length} 件`;
    root.querySelector('[data-vault-loadout-count]').textContent = `配装命中 ${matchedCount} 件`;
    root.querySelector('[data-vault-result-summary]').textContent = records.length > visible.length ? `命中 ${records.length} 件 · 显示前 ${visible.length} 件` : `命中 ${records.length} 件 · 当前真实快照`;
    list.innerHTML = visible.length ? visible.map(({ index, item }) => {
      const matched = matchedIndexes.has(index);
      const status = matched ? "success" : item.locked ? "neutral" : "warning";
      const itemState = matched ? "配装引用" : item.locked ? "已锁定" : "未锁定";
      return `<button type="button" class="item-card" data-surface="object-card" data-ui-kind="object-card" data-status="${status}" data-vault-item="${index}" aria-label="查看${escapeHtml(item.name)}详情">${itemImage(item.icon, item.name)}<span class="vault-item-identity"><strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">${escapeHtml(item.name)}</strong><span data-ui-part="detail" data-info-priority="reading" data-text-tone="body">${escapeHtml(item.type)}${item.power ? ` · 光等 ${item.power}` : ""}</span></span><small class="vault-item-meta" data-ui-part="source" data-info-priority="trace" data-text-tone="meta">${escapeHtml(item.meta)}</small><span class="vault-item-location" data-ui-part="source" data-info-priority="trace" data-text-tone="meta">${escapeHtml(item.location || "位置未读取")}</span><em data-ui-part="state" data-info-priority="support" data-text-tone="${matched ? "status" : "meta"}"${matched ? ' data-status="success"' : ""}>${itemState}</em></button>`;
    }).join("") : '<div class="account-inline-state" data-surface="frame" data-ui-kind="state-frame" data-status="neutral"><strong data-ui-part="value" data-info-priority="decision" data-text-tone="primary">当前筛选没有匹配装备</strong><span data-ui-part="detail" data-info-priority="reading" data-text-tone="body">调整筛选条件或清空当前筛选后继续查看账号快照。</span></div>';
  }

  function renderVaultFilterWorkspace() {
    const browse = root.querySelector('[data-vault-workspace="browse"]');
    browse.innerHTML = `<div class="command-bar vault-filter-command"><span data-vault-filter-scope data-ui-part="value" data-info-priority="context" data-text-tone="primary"></span><span data-ui-part="detail" data-info-priority="support" data-text-tone="body">筛选草稿会按范围保留；护甲条件取交集。</span></div><div class="vault-browse" data-surface="list"><div data-vault-filter-host></div><section class="vault-browse-results" data-surface="list"><div class="column-head"><h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">当前筛选结果</h3><span data-ui-part="source" data-info-priority="trace" data-text-tone="meta" data-vault-result-summary></span></div><div class="item-list" data-surface="list" data-vault-items></div></section></div>`;
    renderFilterControls();
    renderVaultResults();
  }

  function closeSelectMenus(except = null) {
    root.querySelectorAll('[data-vault-select]').forEach((trigger) => {
      if (trigger === except) return;
      trigger.setAttribute("aria-expanded", "false");
      const menu = trigger.nextElementSibling;
      if (menu) menu.hidden = true;
    });
  }

  function applyArmorStat(index, value) {
    const draft = activeDraft();
    const duplicate = draft.armorRules.findIndex((rule, ruleIndex) => ruleIndex !== index && rule.stat === value);
    if (duplicate >= 0) {
      draft.armorRules[duplicate].min = draft.armorRules[index].min;
      draft.armorRules.splice(index, 1);
    } else {
      draft.armorRules[index].stat = value;
    }
  }

  root.addEventListener("click", (event) => {
    const selection = event.target.closest('[data-vault-select-option]');
    if (selection) {
      const [kind, key] = selection.dataset.vaultSelectOption.split(":");
      if (kind === "filter") activeDraft()[key] = selection.dataset.vaultSelectValue;
      if (kind === "armor-stat") applyArmorStat(Number(key), selection.dataset.vaultSelectValue);
      renderVaultFilterWorkspace();
      return;
    }
    const selectTrigger = event.target.closest('[data-vault-select]');
    if (selectTrigger) {
      const expanded = selectTrigger.getAttribute("aria-expanded") === "true";
      closeSelectMenus(selectTrigger);
      selectTrigger.setAttribute("aria-expanded", String(!expanded));
      const menu = selectTrigger.nextElementSibling;
      if (menu) menu.hidden = expanded;
      return;
    }
    const scope = event.target.closest('[data-vault-scope]');
    if (scope) {
      setScope(scope.dataset.vaultScope);
      renderVaultFilterWorkspace();
      return;
    }
    if (event.target.closest('[data-vault-filter-reset]')) {
      filterState.drafts[filterState.scope] = createDraft(filterState.scope);
      renderVaultFilterWorkspace();
      return;
    }
    if (event.target.closest('[data-vault-armor-rule-add]')) {
      const draft = activeDraft();
      const next = armorStats.find(([key]) => !draft.armorRules.some((rule) => rule.stat === key));
      if (next) draft.armorRules.push({ stat: next[0], min: 10 });
      renderVaultFilterWorkspace();
      return;
    }
    const remove = event.target.closest('[data-vault-armor-rule-remove]');
    if (remove) {
      activeDraft().armorRules.splice(Number(remove.dataset.vaultArmorRuleRemove), 1);
      renderVaultFilterWorkspace();
    }
  });

  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) closeSelectMenus();
  });

  root.addEventListener("keydown", (event) => {
    const selectTrigger = event.target.closest('[data-vault-select]');
    if (selectTrigger && (event.key === "ArrowDown" || event.key === "Escape")) {
      event.preventDefault();
      const open = event.key === "ArrowDown";
      closeSelectMenus(selectTrigger);
      selectTrigger.setAttribute("aria-expanded", String(open));
      const menu = selectTrigger.nextElementSibling;
      if (menu) menu.hidden = !open;
    }
    if (event.key === "Escape") closeSelectMenus();
  });

  root.addEventListener("input", (event) => {
    const field = event.target.closest('[data-vault-filter]');
    if (field) {
      activeDraft()[field.dataset.vaultFilter] = field.value;
      renderVaultResults();
      return;
    }
    const minimum = event.target.closest('[data-vault-armor-rule-min]');
    if (minimum) {
      const rule = activeDraft().armorRules[Number(minimum.dataset.vaultArmorRuleMin)];
      rule.min = Math.max(0, Number.parseInt(minimum.value, 10) || 0);
      renderVaultResults();
    }
  });

  root.addEventListener("change", (event) => {
    const field = event.target.closest('[data-vault-filter]');
    if (field) {
      activeDraft()[field.dataset.vaultFilter] = field.value;
      renderVaultResults();
      return;
    }
  });

  renderVaultFilterWorkspace();
})();
