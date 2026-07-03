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
} from "@d2-tools/app";
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

  return (
    <>
      <div className="ui-filter-toolbar vault-toolbar">
        <div className="vault-toolbar-top">
          <input
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder="自然搜索名称、类型、perk 或备注"
          />
          <div className="vault-filter-mode-tabs segmented-control" role="tablist" aria-label="仓库筛选类型">
            <button
              type="button"
              role="tab"
              className={props.group === "weapons" ? "active" : ""}
              aria-selected={props.group === "weapons"}
              onClick={() => props.onGroupChange("weapons")}
            >
              武器
            </button>
            <button
              type="button"
              role="tab"
              className={props.group === "armor" ? "active" : ""}
              aria-selected={props.group === "armor"}
              onClick={() => props.onGroupChange("armor")}
            >
              装备
            </button>
            <button
              type="button"
              role="tab"
              className={props.group === "all" ? "active" : ""}
              aria-selected={props.group === "all"}
              onClick={() => props.onGroupChange("all")}
            >
              全部
            </button>
          </div>
        </div>
        <div className="vault-filter-common-row">
          <label className="compact-field">
            排序
            <select value={props.sortKey} onChange={(event) => props.onSortKeyChange(event.target.value as VaultSortKey)}>
              {(Object.keys(sortLabels) as VaultSortKey[]).map((key) => (
                <option key={key} value={key}>{sortLabels[key]}</option>
              ))}
            </select>
          </label>
          <label className="compact-field">
            标记
            <select value={props.tagFilter} onChange={(event) => props.onTagFilterChange(event.target.value as VaultTagFilter)}>
              {(Object.keys(tagLabels) as VaultTagFilter[]).map((key) => (
                <option key={key} value={key}>{tagLabels[key]}</option>
              ))}
            </select>
          </label>
          <label className="compact-field">
            锁定
            <select value={props.lockFilter} onChange={(event) => props.onLockFilterChange(event.target.value as VaultLockFilter)}>
              {(Object.keys(lockFilterLabels) as VaultLockFilter[]).map((key) => (
                <option key={key} value={key}>{lockFilterLabels[key]}</option>
              ))}
            </select>
          </label>
          <label className="compact-field">
            位置
            <select value={props.slotFilter} onChange={(event) => props.onSlotFilterChange(event.target.value)}>
              {props.slotFilters.map((item) => (
                <option key={item.key} value={item.key}>{item.label} {item.count}</option>
              ))}
            </select>
          </label>
          <button type="button" className="secondary-button" onClick={props.onClearFilters}>
            清空筛选
          </button>
        </div>
        {isWeaponMode ? (
          <div className="weapon-filter-panel">
            <div className="weapon-filter-heading">
              <strong>Perk / 推荐</strong>
              <span>武器条件只保留弹药和框架，护甲属性在装备 Tab 中处理。</span>
            </div>
            <div className="weapon-filter-lane">
              <label className="compact-field">
                弹药
                <select value={props.ammoFilter} onChange={(event) => props.onAmmoFilterChange(event.target.value as VaultAmmoFilter)}>
                  {(Object.keys(ammoFilterLabels) as VaultAmmoFilter[]).map((key) => (
                    <option key={key} value={key}>{ammoFilterLabels[key]}</option>
                  ))}
                </select>
              </label>
              {props.availableFrameFilters.length ? (
                <div className="compact-field vault-frame-filter">
                  <span>框架</span>
                  <div className="vault-frame-chip-grid" aria-label="仓库武器框架筛选">
                    {props.availableFrameFilters.map((item) => (
                      <button
                        type="button"
                        key={item.key}
                        className={props.frameFilters.includes(item.key) ? "vault-frame-chip active" : "vault-frame-chip"}
                        onClick={() => props.onToggleFrameFilter(item.key)}
                      >
                        {item.label} <span>{item.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {isArmorMode ? (
          <div className="armor-filter-panel armor-filter-lane">
            <VaultArmorFilterPanel
              rules={props.armorStatRules}
              onAddRule={props.onAddArmorStatRule}
              onClearRules={props.onClearArmorStatRules}
              onRemoveRule={props.onRemoveArmorStatRule}
              onUpdateRule={props.onUpdateArmorStatRule}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
