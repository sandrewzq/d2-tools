import {
  ammoFilterLabels,
  lockFilterLabels,
  sortLabels,
  tagLabels,
  type VaultAmmoFilter,
  type VaultArmorStatRule,
  type VaultFrameFilter,
  type VaultFrameOption,
  type VaultGroupFilter,
  type VaultGroupSummary,
  type VaultLockFilter,
  type VaultSlotFilter,
  type VaultSlotSummary,
  type VaultSortKey,
  type VaultTagFilter
} from "@d2-tools/app/vault";
import { VaultArmorFilterPanel } from "./VaultArmorFilterPanel.js";

export function VaultFilterToolbar(props: {
  query: string;
  sortKey: VaultSortKey;
  tagFilter: VaultTagFilter;
  armorStatRules: VaultArmorStatRule[];
  lockFilter: VaultLockFilter;
  slotFilter: VaultSlotFilter;
  ammoFilter: VaultAmmoFilter;
  frameFilters: VaultFrameFilter;
  group: VaultGroupFilter;
  groups: VaultGroupSummary[];
  slotFilters: VaultSlotSummary[];
  availableFrameFilters: VaultFrameOption[];
  onQueryChange: (value: string) => void;
  onSortKeyChange: (value: VaultSortKey) => void;
  onTagFilterChange: (value: VaultTagFilter) => void;
  onAddArmorStatRule: () => void;
  onClearArmorStatRules: () => void;
  onRemoveArmorStatRule: (index: number) => void;
  onUpdateArmorStatRule: (index: number, rule: VaultArmorStatRule) => void;
  onLockFilterChange: (value: VaultLockFilter) => void;
  onSlotFilterChange: (value: VaultSlotFilter) => void;
  onAmmoFilterChange: (value: VaultAmmoFilter) => void;
  onGroupChange: (value: VaultGroupFilter) => void;
  onToggleFrameFilter: (key: string) => void;
  onClearFilters: () => void;
}) {
  const isWeaponMode = props.group === "weapons";
  const isArmorMode = props.group === "armor";
  const currentGroup = props.groups.find((item) => item.key === props.group);

  return (
    <section className="vault-filter-workbench" aria-label="仓库筛选">
      <header className="vault-filter-head">
        <div className="vault-filter-title">
          <span>筛选工作台</span>
          <strong>{currentGroup?.label ?? "全部"}</strong>
        </div>
        <div className="vault-filter-actions">
          <span className="vault-filter-hint">先缩小结果范围，再决定排列方式</span>
          <button type="button" className="secondary-button vault-filter-reset" onClick={props.onClearFilters}>
            清空当前筛选
          </button>
        </div>
      </header>

      <div className="vault-filter-primary">
        <label className="vault-filter-search">
          <span>关键词</span>
          <input
            type="search"
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder="搜索名称、类型、Perk、标签或备注"
          />
        </label>
        <div className="vault-filter-scope-group">
          <span>范围</span>
          <div className="vault-filter-scope" aria-label="仓库筛选范围">
            {props.groups.map((item) => (
              <button
                type="button"
                key={item.key}
                aria-pressed={props.group === item.key}
                onClick={() => props.onGroupChange(item.key)}
              >
                <span>{item.label}</span>
                <small>{item.count}</small>
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="vault-filter-common">
        <div className="vault-filter-section-head">
          <span>基础条件</span>
          <span>共同条件会应用到当前范围</span>
        </div>
        <div className="vault-filter-common-row">
          <label className="vault-filter-field">
            <span>槽位</span>
            <select value={props.slotFilter} onChange={(event) => props.onSlotFilterChange(event.target.value)}>
              {props.slotFilters.map((item) => (
                <option key={item.key} value={item.key}>{item.label} {item.count}</option>
              ))}
            </select>
          </label>
          <label className="vault-filter-field">
            <span>本地标签</span>
            <select value={props.tagFilter} onChange={(event) => props.onTagFilterChange(event.target.value as VaultTagFilter)}>
              {(Object.keys(tagLabels) as VaultTagFilter[]).map((key) => (
                <option key={key} value={key}>{tagLabels[key]}</option>
              ))}
            </select>
          </label>
          <label className="vault-filter-field">
            <span>锁定状态</span>
            <select value={props.lockFilter} onChange={(event) => props.onLockFilterChange(event.target.value as VaultLockFilter)}>
              {(Object.keys(lockFilterLabels) as VaultLockFilter[]).map((key) => (
                <option key={key} value={key}>{lockFilterLabels[key]}</option>
              ))}
            </select>
          </label>
          <label className="vault-filter-field">
            <span>排序</span>
            <select value={props.sortKey} onChange={(event) => props.onSortKeyChange(event.target.value as VaultSortKey)}>
              {(Object.keys(sortLabels) as VaultSortKey[]).map((key) => (
                <option key={key} value={key}>{sortLabels[key]}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {isWeaponMode ? (
        <section className="vault-domain-filter vault-weapon-filter">
          <label className="vault-domain-field">
            <span>弹药类型</span>
            <select value={props.ammoFilter} onChange={(event) => props.onAmmoFilterChange(event.target.value as VaultAmmoFilter)}>
              {(Object.keys(ammoFilterLabels) as VaultAmmoFilter[]).map((key) => (
                <option key={key} value={key}>{ammoFilterLabels[key]}</option>
              ))}
            </select>
          </label>
          <details className="vault-frame-filter" open={Boolean(props.frameFilters.length)}>
            <summary>
              <span>武器框架</span>
              <small>{props.frameFilters.length ? `已选 ${props.frameFilters.length} 项` : "全部框架"}</small>
            </summary>
            {props.availableFrameFilters.length ? (
              <div className="vault-frame-chip-grid" aria-label="仓库武器框架筛选">
                {props.availableFrameFilters.map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    className={props.frameFilters.includes(item.key) ? "vault-frame-chip active" : "vault-frame-chip"}
                    onClick={() => props.onToggleFrameFilter(item.key)}
                  >
                    <span>{item.label}</span>
                    <small>{item.count}</small>
                  </button>
                ))}
              </div>
            ) : <p>当前范围没有可用的武器框架字段。</p>}
          </details>
        </section>
      ) : null}

      {isArmorMode ? (
        <div className="vault-domain-filter vault-armor-filter">
          <VaultArmorFilterPanel
            rules={props.armorStatRules}
            onAddRule={props.onAddArmorStatRule}
            onClearRules={props.onClearArmorStatRules}
            onRemoveRule={props.onRemoveArmorStatRule}
            onUpdateRule={props.onUpdateArmorStatRule}
          />
        </div>
      ) : null}

      {!isWeaponMode && !isArmorMode ? (
        <section className="vault-domain-filter vault-all-filter">
          <p>当前范围只使用关键词、槽位、本地标签和锁定状态等共同条件。</p>
        </section>
      ) : null}
    </section>
  );
}
