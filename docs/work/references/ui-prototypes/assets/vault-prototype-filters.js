(() => {
  const weaponBuckets = new Set(["动能武器", "能量武器", "威能武器"]);
  const armorBuckets = new Set(["头盔", "臂铠", "胸甲", "腿甲", "职业物品"]);
  const filterState = {
    scope: "weapons",
    query: "",
    slot: "all",
    tag: "all",
    lock: "all",
    sort: "name",
    weaponType: "all",
    minArmorTotal: ""
  };

  const root = document.querySelector('[data-page-view="vault"]');
  if (!root || !window.accountWorkspaceSnapshot) return;

  const snapshot = window.accountWorkspaceSnapshot;
  const items = snapshot.items;
  const vaultIndexes = snapshot.vaultIndexes;
  const matchedIndexes = new Set(snapshot.loadoutMatchedIndexes);

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

  function setScope(scope) {
    filterState.scope = scope;
    filterState.slot = "all";
    if (scope !== "armor" && filterState.sort === "armor-total") filterState.sort = "name";
    if (scope === "weapons") filterState.minArmorTotal = "";
    if (scope === "armor") filterState.weaponType = "all";
    if (scope === "all") {
      filterState.weaponType = "all";
      filterState.minArmorTotal = "";
    }
  }

  function sortOptions() {
    const common = [
      ["name", "按名称"],
      ["power", "按光等"],
      ["bucket", "按槽位"]
    ];
    if (filterState.scope === "armor") common.push(["armor-total", "按护甲总属性"]);
    return common.map(([value, label]) => `<option value="${value}" ${filterState.sort === value ? "selected" : ""}>${label}</option>`).join("");
  }

  function renderFilterControls() {
    const host = root.querySelector('[data-vault-filter-host]');
    if (!host) return;
    const scoped = getScopeItems();
    const slots = uniqueOptions(scoped, ({ item }) => item.bucket);
    const types = uniqueOptions(scoped.filter(({ item }) => isWeapon(item)), ({ item }) => item.type);
    const scopeLabel = filterState.scope === "weapons" ? "武器" : filterState.scope === "armor" ? "护甲" : "全部物品";
    const domain = filterState.scope === "weapons"
      ? `<section class="vault-domain-filter" data-surface="section" data-contract-id="vault.weapon-filters"><div><h4 data-ui-part="value" data-info-priority="context" data-text-tone="primary">武器条件</h4><p data-ui-part="detail" data-info-priority="reading" data-text-tone="body">按已读取的武器类型、槽位、Perk、锁定和本地标签筛选。</p></div><label data-ui-part="label" data-info-priority="support" data-text-tone="meta">武器类型<select data-ui-kind="field" data-vault-filter="weaponType">${optionList(types, filterState.weaponType, "全部武器类型")}</select></label><div class="vault-filter-unavailable" data-surface="row"><strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">弹药与框架</strong><span data-ui-part="detail" data-info-priority="support" data-text-tone="body">当前冻结快照未提供这两个字段，原型不显示虚构选项。</span></div></section>`
      : filterState.scope === "armor"
        ? `<section class="vault-domain-filter" data-surface="section" data-contract-id="vault.armor-filters"><div><h4 data-ui-part="value" data-info-priority="context" data-text-tone="primary">护甲属性条件</h4><p data-ui-part="detail" data-info-priority="reading" data-text-tone="body">按已读取的总属性设置最低值；每条条件都以当前 Profile 快照为准。</p></div><label data-ui-part="label" data-info-priority="support" data-text-tone="meta">总属性最低值<input type="number" min="0" inputmode="numeric" data-ui-kind="field" data-vault-filter="minArmorTotal" value="${filterState.minArmorTotal}" placeholder="例如 65"></label><div class="vault-filter-unavailable" data-surface="row"><strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">六维属性条件</strong><span data-ui-part="detail" data-info-priority="support" data-text-tone="body">当前冻结快照未返回生命、近战、手雷、超能、职业、武器六维属性，不能伪造阈值筛选。</span></div></section>`
        : `<section class="vault-domain-filter" data-surface="section"><div><h4 data-ui-part="value" data-info-priority="context" data-text-tone="primary">全部物品</h4><p data-ui-part="detail" data-info-priority="reading" data-text-tone="body">只使用共同条件。选择武器或护甲后才显示对应的领域筛选。</p></div></section>`;

    host.innerHTML = `<div class="filter-stack" data-surface="list"><div class="vault-filter-mode" data-ui-kind="segmented-control" aria-label="仓库筛选范围"><button type="button" data-ui-kind="button" data-control-variant="quiet" data-vault-scope="weapons" aria-pressed="${filterState.scope === "weapons"}">武器</button><button type="button" data-ui-kind="button" data-control-variant="quiet" data-vault-scope="armor" aria-pressed="${filterState.scope === "armor"}">护甲</button><button type="button" data-ui-kind="button" data-control-variant="quiet" data-vault-scope="all" aria-pressed="${filterState.scope === "all"}">全部</button></div><label data-ui-part="label" data-info-priority="support" data-text-tone="meta">搜索<input type="search" data-ui-kind="field" data-vault-filter="query" value="${escapeHtml(filterState.query)}" placeholder="名称、类型、Perk、标签"></label><label data-ui-part="label" data-info-priority="support" data-text-tone="meta">槽位<select data-ui-kind="field" data-vault-filter="slot">${optionList(slots, filterState.slot, "全部槽位")}</select></label><label data-ui-part="label" data-info-priority="support" data-text-tone="meta">本地标签<select data-ui-kind="field" data-vault-filter="tag"><option value="all">全部标签</option>${["保留", "关注", "配装用", "可清理", "待刷", "未标记"].map((tag) => `<option value="${tag}" ${filterState.tag === tag ? "selected" : ""}>${tag}</option>`).join("")}</select></label><label data-ui-part="label" data-info-priority="support" data-text-tone="meta">锁定状态<select data-ui-kind="field" data-vault-filter="lock"><option value="all">全部</option><option value="locked" ${filterState.lock === "locked" ? "selected" : ""}>已锁定</option><option value="unlocked" ${filterState.lock === "unlocked" ? "selected" : ""}>未锁定</option></select></label><label data-ui-part="label" data-info-priority="support" data-text-tone="meta">排序<select data-ui-kind="field" data-vault-filter="sort">${sortOptions()}</select></label><button class="button vault-filter-reset" type="button" data-ui-kind="button" data-control-variant="secondary" data-vault-filter-reset>清空筛选</button></div>${domain}`;
    root.querySelector('[data-vault-filter-scope]').textContent = scopeLabel;
  }

  function filteredItems() {
    const query = filterState.query.trim().toLocaleLowerCase();
    const minArmorTotal = Number(filterState.minArmorTotal || 0);
    const records = getScopeItems().filter(({ item }) => {
      if (filterState.slot !== "all" && item.bucket !== filterState.slot) return false;
      if (filterState.tag !== "all" && item.tag !== filterState.tag) return false;
      if (filterState.lock === "locked" && !item.locked) return false;
      if (filterState.lock === "unlocked" && item.locked) return false;
      if (filterState.scope === "weapons" && filterState.weaponType !== "all" && item.type !== filterState.weaponType) return false;
      if (filterState.scope === "armor" && minArmorTotal && getArmorTotal(item) < minArmorTotal) return false;
      if (!query) return true;
      return [item.name, item.type, item.bucket, item.meta, item.tag, ...(item.perks || [])].filter(Boolean).some((value) => String(value).toLocaleLowerCase().includes(query));
    });
    return records.sort((left, right) => {
      if (filterState.sort === "power") return (right.item.power || 0) - (left.item.power || 0);
      if (filterState.sort === "bucket") return left.item.bucket.localeCompare(right.item.bucket, "zh-CN") || left.item.name.localeCompare(right.item.name, "zh-CN");
      if (filterState.sort === "armor-total") return getArmorTotal(right.item) - getArmorTotal(left.item);
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
      return `<button type="button" class="item-card" data-surface="object-card" data-ui-kind="object-card" data-status="${status}" data-vault-item="${index}" aria-label="查看${escapeHtml(item.name)}详情">${itemImage(item.icon, item.name)}<span><strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">${escapeHtml(item.name)}</strong><span data-ui-part="detail" data-info-priority="reading" data-text-tone="body">${escapeHtml(item.type)}${item.power ? ` · 光等 ${item.power}` : ""}</span><small data-ui-part="source" data-info-priority="trace" data-text-tone="meta">${escapeHtml(item.meta)} · ${escapeHtml(item.location || "位置未读取")}</small><em data-ui-part="state" data-info-priority="support" data-text-tone="${matched ? "status" : "meta"}"${matched ? ' data-status="success"' : ""}>${itemState}</em></span></button>`;
    }).join("") : '<div class="account-inline-state" data-surface="frame" data-ui-kind="state-frame" data-status="neutral"><strong data-ui-part="value" data-info-priority="decision" data-text-tone="primary">当前筛选没有匹配装备</strong><span data-ui-part="detail" data-info-priority="reading" data-text-tone="body">调整筛选条件或清空筛选后继续查看当前账号快照。</span></div>';
  }

  function renderVaultFilterWorkspace() {
    const browse = root.querySelector('[data-vault-workspace="browse"]');
    browse.innerHTML = `<div class="command-bar"><span data-vault-filter-scope data-ui-part="value" data-info-priority="context" data-text-tone="primary"></span><span data-ui-part="detail" data-info-priority="support" data-text-tone="body">武器与护甲使用不同的领域条件。</span></div><div class="vault-browse" data-surface="split"><aside class="panel-column" data-surface="list"><div class="column-head"><h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">筛选条件</h3><span data-ui-part="detail" data-info-priority="support" data-text-tone="body">组合筛选</span></div><div data-vault-filter-host></div></aside><section class="panel-column" data-surface="list"><div class="column-head"><h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">当前筛选结果</h3><span data-ui-part="source" data-info-priority="trace" data-text-tone="meta" data-vault-result-summary></span></div><div class="item-list" data-surface="list" data-vault-items></div></section></div>`;
    renderFilterControls();
    renderVaultResults();
  }

  root.addEventListener("click", (event) => {
    const scope = event.target.closest('[data-vault-scope]');
    if (scope) {
      setScope(scope.dataset.vaultScope);
      renderVaultFilterWorkspace();
      return;
    }
    if (event.target.closest('[data-vault-filter-reset]')) {
      Object.assign(filterState, { scope: "weapons", query: "", slot: "all", tag: "all", lock: "all", sort: "name", weaponType: "all", minArmorTotal: "" });
      renderVaultFilterWorkspace();
    }
  });

  root.addEventListener("input", (event) => {
    const field = event.target.closest('[data-vault-filter]');
    if (!field) return;
    filterState[field.dataset.vaultFilter] = field.value;
    renderVaultResults();
  });

  root.addEventListener("change", (event) => {
    const field = event.target.closest('[data-vault-filter]');
    if (!field) return;
    filterState[field.dataset.vaultFilter] = field.value;
    if (field.dataset.vaultFilter === "sort") renderFilterControls();
    renderVaultResults();
  });

  renderVaultFilterWorkspace();
})();
