import {
  ammoFilterLabels,
  armorStatFilterLabels,
  lockFilterLabels,
  sortLabels,
  tagLabels,
  type VaultAmmoFilter,
  type VaultArmorStatFilter,
  type VaultFrameFilter,
  type VaultFrameOption,
  type VaultGroupFilter,
  type VaultGroupSummary,
  type VaultLockFilter,
  type VaultSlotFilter,
  type VaultSlotSummary,
  type VaultSortKey,
  type VaultTagFilter
} from "./vaultFilters";

export function VaultFilterToolbar(props: {
  query: string;
  sortKey: VaultSortKey;
  tagFilter: VaultTagFilter;
  armorStatFilter: VaultArmorStatFilter;
  armorStatMin: string;
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
  onArmorStatFilterChange: (value: VaultArmorStatFilter) => void;
  onArmorStatMinChange: (value: string) => void;
  onLockFilterChange: (value: VaultLockFilter) => void;
  onSlotFilterChange: (value: VaultSlotFilter) => void;
  onAmmoFilterChange: (value: VaultAmmoFilter) => void;
  onGroupChange: (value: VaultGroupFilter) => void;
  onToggleFrameFilter: (key: string) => void;
  onClearFilters: () => void;
}) {
  return (
    <div className="vault-toolbar">
      <input
        value={props.query}
        onChange={(event) => props.onQueryChange(event.target.value)}
        placeholder="自然搜索名称、类型、perk 或备注"
      />
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
        护甲属性
        <select value={props.armorStatFilter} onChange={(event) => props.onArmorStatFilterChange(event.target.value as VaultArmorStatFilter)}>
          {(Object.keys(armorStatFilterLabels) as VaultArmorStatFilter[]).map((key) => (
            <option key={key} value={key}>{armorStatFilterLabels[key]}</option>
          ))}
        </select>
      </label>
      <label className="compact-field">
        最低值
        <input
          type="number"
          min="0"
          max="100"
          value={props.armorStatMin}
          disabled={props.armorStatFilter === "all"}
          onChange={(event) => props.onArmorStatMinChange(event.target.value)}
          placeholder="20"
        />
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
      <label className="compact-field">
        弹药
        <select value={props.ammoFilter} onChange={(event) => props.onAmmoFilterChange(event.target.value as VaultAmmoFilter)}>
          {(Object.keys(ammoFilterLabels) as VaultAmmoFilter[]).map((key) => (
            <option key={key} value={key}>{ammoFilterLabels[key]}</option>
          ))}
        </select>
      </label>
      {props.availableFrameFilters.length ? (
        <div className="compact-field">
          <span>框架</span>
          <div className="segmented-control" aria-label="仓库武器框架筛选">
            {props.availableFrameFilters.map((item) => (
              <button
                type="button"
                key={item.key}
                className={props.frameFilters.includes(item.key) ? "active" : ""}
                onClick={() => props.onToggleFrameFilter(item.key)}
              >
                {item.label} <span>{item.count}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="segmented-control" aria-label="仓库分组">
        {props.groups.map((item) => (
          <button
            className={item.key === props.group ? "active" : ""}
            key={item.key}
            type="button"
            onClick={() => props.onGroupChange(item.key)}
          >
            {item.label} <span>{item.count}</span>
          </button>
        ))}
      </div>
      <button type="button" className="secondary-button" onClick={props.onClearFilters}>
        清空筛选
      </button>
    </div>
  );
}
