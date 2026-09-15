import type { ReactNode } from "react";
import {
  ammoFilterLabels,
  classFilterLabels,
  championFilterLabels,
  craftingFilterLabels,
  damageFilterLabels,
  gearTierFilterLabels,
  lockFilterLabels,
  rarityFilterLabels,
  sortLabels,
  type VaultAmmoFilter,
  type VaultArmorSetFilter,
  type VaultArmorSetOption,
  type VaultArmorStatRule,
  type VaultClassFilter,
  type VaultChampionFilter,
  type VaultCraftingFilter,
  type VaultDamageFilter,
  type VaultFrameFilter,
  type VaultFrameOption,
  type VaultGearTierFilter,
  type VaultGroupFilter,
  type VaultGroupSummary,
  type VaultLockFilter,
  type VaultRarityFilter,
  type VaultSlotFilter,
  type VaultSlotSummary,
  type VaultSortKey,
  type VaultTagFilter
} from "@d2-tools/app/vault";
import { VaultArmorFilterPanel } from "./VaultArmorFilterPanel.js";
import {
  VaultAmmoTypeIcon,
  VaultChampionTypeIcon,
  VaultCraftingGlyph,
  VaultDamageTypeIcon,
  VaultSlotTypeIcon,
  weaponSlotTypeFromLabel
} from "./VaultWeaponFactIcons.js";

export type VaultArmorSetCatalogStatus = "loading" | "ready" | "error";

const dispositionOptions: Array<{ key: Extract<VaultTagFilter, "all" | "keep" | "review" | "junk">; label: string }> = [
  { key: "all", label: "全部" },
  { key: "keep", label: "保留" },
  { key: "review", label: "待定" },
  { key: "junk", label: "清理" }
];

const damageTypeIds: Record<string, number> = {
  kinetic: 1,
  arc: 2,
  solar: 3,
  void: 4,
  stasis: 6,
  strand: 7
};

type VaultAmmoType = Exclude<VaultAmmoFilter, "all">;

export function VaultFilterToolbar(props: {
  query: string;
  sortKey: VaultSortKey;
  tagFilter: VaultTagFilter;
  armorStatRules: VaultArmorStatRule[];
  lockFilter: VaultLockFilter;
  slotFilter: VaultSlotFilter;
  ammoFilter: VaultAmmoFilter;
  itemTypeFilter: string;
  rarityFilter: VaultRarityFilter;
  gearTierFilter: VaultGearTierFilter;
  classFilter: VaultClassFilter;
  damageFilter: VaultDamageFilter;
  championFilter: VaultChampionFilter;
  championIcons?: Partial<Record<Exclude<VaultChampionFilter, "all">, string>>;
  craftingFilter: VaultCraftingFilter;
  armorSetFilter: VaultArmorSetFilter;
  frameFilter: VaultFrameFilter;
  group: VaultGroupFilter;
  groups: VaultGroupSummary[];
  slotFilters: VaultSlotSummary[];
  itemTypeFilters: Array<{ key: string; label: string; count: number }>;
  armorSetFilters: VaultArmorSetOption[];
  armorSetCatalogStatus: VaultArmorSetCatalogStatus;
  availableFrameFilters: VaultFrameOption[];
  activeFilterCount: number;
  onQueryChange: (value: string) => void;
  onResetFilters: () => void;
  onSortKeyChange: (value: VaultSortKey) => void;
  onTagFilterChange: (value: VaultTagFilter) => void;
  onAddArmorStatRule: () => void;
  onClearArmorStatRules: () => void;
  onRemoveArmorStatRule: (index: number) => void;
  onUpdateArmorStatRule: (index: number, rule: VaultArmorStatRule) => void;
  onLockFilterChange: (value: VaultLockFilter) => void;
  onSlotFilterChange: (value: VaultSlotFilter) => void;
  onAmmoFilterChange: (value: VaultAmmoFilter) => void;
  onItemTypeFilterChange: (value: string) => void;
  onRarityFilterChange: (value: VaultRarityFilter) => void;
  onGearTierFilterChange: (value: VaultGearTierFilter) => void;
  onClassFilterChange: (value: VaultClassFilter) => void;
  onDamageFilterChange: (value: VaultDamageFilter) => void;
  onChampionFilterChange: (value: VaultChampionFilter) => void;
  onCraftingFilterChange: (value: VaultCraftingFilter) => void;
  onArmorSetFilterChange: (value: VaultArmorSetFilter) => void;
  onGroupChange: (value: VaultGroupFilter) => void;
  onFrameFilterChange: (value: VaultFrameFilter) => void;
}) {
  const isWeaponMode = props.group === "weapons";
  const isArmorMode = props.group === "armor";
  const visibleGroups = props.groups.filter((item) => item.key === "weapons" || item.key === "armor" || item.key === "equipment");
  const visibleSlotFilters = props.slotFilters.filter((item) => {
    if (item.key === "all") return true;
    if (isWeaponMode) return ["动能武器", "能量武器", "威能武器"].includes(item.label);
    if (isArmorMode) return ["头盔", "臂铠", "胸甲", "腿甲", "职业物品"].includes(item.label);
    return true;
  });

  return (
    <aside className="vault-filter-workbench" aria-label="仓库筛选" data-surface="section" data-contract-id="vault.filters">
      <div className="vault-filter-search">
        <label className="vault-search-field">
          <svg className="vault-search-field-icon" aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            type="search"
            aria-label="搜索仓库装备"
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder="搜索名称、Perk、标签或备注"
          />
        </label>
        <button
          type="button"
          className="vault-filter-reset"
          data-ui-kind="button"
          data-control-variant="quiet"
          data-has-active-filters={props.activeFilterCount ? "true" : "false"}
          disabled={!props.activeFilterCount}
          aria-label={props.activeFilterCount
            ? `重置全部筛选，共 ${props.activeFilterCount} 项；包括左侧条件和推荐命中筛选`
            : "当前没有需要重置的筛选条件"}
          title={props.activeFilterCount
            ? "清除左侧条件和推荐命中筛选"
            : "当前没有需要重置的筛选条件"}
          onClick={props.onResetFilters}
        >
          <svg className="vault-filter-reset-icon" aria-hidden="true" viewBox="0 0 24 24">
            <path d="M20 11a8 8 0 1 0-2.3 5.7" />
            <path d="M20 4v7h-7" />
          </svg>
          <span>重置</span>
          <small className="vault-filter-reset-count" aria-hidden="true">{props.activeFilterCount}</small>
        </button>
      </div>

      <FilterBlock>
        <div className="vault-filter-label-field">
          <span>物品类型</span>
          <div className="vault-filter-option-grid vault-filter-category-grid" role="group" aria-label="物品类型">
            {visibleGroups.map((item) => (
              <button type="button" key={item.key} aria-pressed={props.group === item.key} onClick={() => props.onGroupChange(item.key)}>
                <span>{item.label}</span><small>{item.count}</small>
              </button>
            ))}
          </div>
        </div>
      </FilterBlock>

      {isWeaponMode ? (
        <>
          <FilterBlock>
            <div className="vault-filter-label-field">
              <span>槽位</span>
              <div className="vault-filter-option-grid vault-filter-slot-grid" role="group" aria-label="武器槽位">
                {visibleSlotFilters.map((item) => {
                  const slotType = weaponSlotTypeFromLabel(item.label);
                  return (
                    <button
                      type="button"
                      key={item.key}
                      data-slot-tone={slotType}
                      aria-pressed={props.slotFilter === item.key}
                      onClick={() => props.onSlotFilterChange(item.key)}
                    >
                      {slotType ? <VaultSlotTypeIcon type={slotType} size="compact" /> : null}
                      <span>{shortSlotLabel(item.label)}</span><small>{item.count}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          </FilterBlock>

          <FilterBlock>
            <SegmentedFilter
              label="弹药"
              value={props.ammoFilter}
              options={Object.entries(ammoFilterLabels).map(([key, label]) => [key, label.replace("全部弹药", "全部")])}
              icon={(key) => isVaultAmmoType(key) ? <VaultAmmoTypeIcon type={key} size="compact" /> : null}
              tone={(key) => key === "all" ? undefined : `ammo-${key}`}
              onChange={(value) => props.onAmmoFilterChange(value as VaultAmmoFilter)}
            />
          </FilterBlock>

          <FilterBlock>
            <SegmentedFilter
              label="伤害"
              value={props.damageFilter}
              options={Object.entries(damageFilterLabels)}
              icon={(key) => key === "all" ? null : <VaultDamageTypeIcon damageType={damageTypeIds[key]} size="compact" />}
              tone={(key) => key === "all" ? undefined : `damage-${key}`}
              wrap
              onChange={(value) => props.onDamageFilterChange(value as VaultDamageFilter)}
            />
          </FilterBlock>

          <FilterBlock>
            <SegmentedFilter
              label="反勇士"
              value={props.championFilter}
              options={Object.entries(championFilterLabels).map(([key, label]) => [key, label.replace("反", "")])}
              icon={(key) => key === "all" ? null : <VaultChampionTypeIcon type={key as "barrier" | "overload" | "unstoppable"} src={props.championIcons?.[key as "barrier" | "overload" | "unstoppable"]} size="compact" />}
              tone={(key) => key === "all" ? undefined : `champion-${key}`}
              wrap
              onChange={(value) => props.onChampionFilterChange(value as VaultChampionFilter)}
            />
          </FilterBlock>

          <FilterBlock>
            <SegmentedFilter
              label="阶级"
              value={props.gearTierFilter}
              options={Object.entries(gearTierFilterLabels)}
              compact
              onChange={(value) => props.onGearTierFilterChange(value as VaultGearTierFilter)}
            />
          </FilterBlock>

          <FilterBlock>
            <SegmentedFilter
              label="稀有度"
              value={props.rarityFilter}
              options={Object.entries(rarityFilterLabels)}
              tone={(key) => key === "legendary" ? "rarity-legendary" : key === "exotic" ? "rarity-exotic" : undefined}
              onChange={(value) => props.onRarityFilterChange(value as VaultRarityFilter)}
            />
          </FilterBlock>

          <FilterBlock>
            <SegmentedFilter
              label="锻造"
              value={props.craftingFilter}
              options={Object.entries(craftingFilterLabels)}
              icon={(key) => key === "all" ? null : <VaultCraftingGlyph kind={key as "crafted" | "uncrafted"} />}
              tone={(key) => key === "all" ? undefined : `crafting-${key}`}
              onChange={(value) => props.onCraftingFilterChange(value as VaultCraftingFilter)}
            />
          </FilterBlock>

          <FilterBlock>
            <label className="vault-filter-field">
              <span>武器类型</span>
              <select aria-label="武器类型" value={props.itemTypeFilter} onChange={(event) => props.onItemTypeFilterChange(event.target.value)}>
                <option value="all">全部类型</option>
                {props.itemTypeFilters.map((item) => <option key={item.key} value={item.key}>{item.label} {item.count}</option>)}
              </select>
            </label>
          </FilterBlock>

          <FilterBlock>
            <label className="vault-filter-field">
              <span>武器框架</span>
              <select
                aria-label="武器框架"
                value={props.frameFilter || "all"}
                disabled={!props.availableFrameFilters.length}
                onChange={(event) => props.onFrameFilterChange(event.target.value)}
              >
                <option value="all">{props.availableFrameFilters.length ? "全部框架" : "当前范围没有可用的武器框架"}</option>
                {props.availableFrameFilters.map((item) => (
                  <option key={item.key} value={item.key}>{item.label} {item.count}</option>
                ))}
              </select>
            </label>
          </FilterBlock>
        </>
      ) : null}

      {isArmorMode ? (
        <>
          <FilterBlock>
            <div className="vault-filter-label-field">
              <span>部位</span>
              <div className="vault-filter-option-grid vault-filter-slot-grid" role="group" aria-label="护甲部位">
                {visibleSlotFilters.map((item) => (
                  <button type="button" key={item.key} aria-pressed={props.slotFilter === item.key} onClick={() => props.onSlotFilterChange(item.key)}>
                    <span>{shortSlotLabel(item.label)}</span><small>{item.count}</small>
                  </button>
                ))}
              </div>
            </div>
          </FilterBlock>

          <FilterBlock>
            <SegmentedFilter
              label="职业"
              value={props.classFilter}
              options={Object.entries(classFilterLabels)}
              onChange={(value) => props.onClassFilterChange(value as VaultClassFilter)}
            />
          </FilterBlock>

          <FilterBlock>
            <SegmentedFilter
              label="阶级"
              value={props.gearTierFilter}
              options={Object.entries(gearTierFilterLabels)}
              compact
              onChange={(value) => props.onGearTierFilterChange(value as VaultGearTierFilter)}
            />
          </FilterBlock>

          <FilterBlock>
            <SegmentedFilter
              label="稀有度"
              value={props.rarityFilter}
              options={Object.entries(rarityFilterLabels)}
              tone={(key) => key === "legendary" ? "rarity-legendary" : key === "exotic" ? "rarity-exotic" : undefined}
              onChange={(value) => props.onRarityFilterChange(value as VaultRarityFilter)}
            />
          </FilterBlock>

          <FilterBlock>
            <label className="vault-filter-field">
              <span>护甲套装</span>
              <select
                value={props.armorSetFilter}
                disabled={props.armorSetCatalogStatus !== "ready" || !props.armorSetFilters.length}
                onChange={(event) => props.onArmorSetFilterChange(event.target.value)}
              >
                <option value="all">{armorSetCatalogLabel(props.armorSetCatalogStatus, props.armorSetFilters.length)}</option>
                {props.armorSetFilters.map((item) => (
                  <option key={item.key} value={item.key}>{item.label}（持有 {item.count}）</option>
                ))}
              </select>
            </label>
          </FilterBlock>

          <FilterBlock>
            <VaultArmorFilterPanel
              rules={props.armorStatRules}
              onAddRule={props.onAddArmorStatRule}
              onClearRules={props.onClearArmorStatRules}
              onRemoveRule={props.onRemoveArmorStatRule}
              onUpdateRule={props.onUpdateArmorStatRule}
            />
          </FilterBlock>
        </>
      ) : null}

      {!isWeaponMode && !isArmorMode ? (
        <FilterBlock>
          <div className="vault-filter-label-field">
            <span>位置</span>
            <div className="vault-filter-option-grid vault-filter-slot-grid" role="group" aria-label="物品位置">
              {visibleSlotFilters.map((item) => (
                <button type="button" key={item.key} aria-pressed={props.slotFilter === item.key} onClick={() => props.onSlotFilterChange(item.key)}>
                  <span>{shortSlotLabel(item.label)}</span><small>{item.count}</small>
                </button>
              ))}
            </div>
          </div>
        </FilterBlock>
      ) : null}

      <FilterBlock>
        <SegmentedFilter
          label="锁定"
          value={props.lockFilter}
          options={Object.entries(lockFilterLabels)}
          onChange={(value) => props.onLockFilterChange(value as VaultLockFilter)}
        />
      </FilterBlock>

      <FilterBlock>
        <div className="vault-filter-label-field">
          <span>玩家标记</span>
          <div className="vault-filter-option-grid vault-disposition-grid" role="group" aria-label="玩家标记">
            {dispositionOptions.map((item) => (
              <button type="button" key={item.key} aria-pressed={props.tagFilter === item.key} onClick={() => props.onTagFilterChange(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </FilterBlock>

      <FilterBlock>
        <label className="vault-filter-field">
          <span>结果排序</span>
          <select
            aria-label="结果排序"
            title={props.sortKey === "recommendation" ? "推荐权重：优先级 → 比较 → 未收录" : "结果排序规则"}
            value={props.sortKey}
            onChange={(event) => props.onSortKeyChange(event.target.value as VaultSortKey)}
          >
            {(Object.keys(sortLabels) as VaultSortKey[]).map((key) => <option key={key} value={key}>{sortLabels[key]}</option>)}
          </select>
        </label>
        {props.sortKey === "recommendation" ? (
          <p className="vault-filter-sort-note">权重：优先级 → 比较 → 未收录</p>
        ) : null}
      </FilterBlock>

    </aside>
  );
}

function FilterBlock(props: { children: ReactNode }) {
  return <div className="vault-filter-block">{props.children}</div>;
}

function SegmentedFilter(props: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  compact?: boolean;
  wrap?: boolean;
  icon?: (key: string) => ReactNode;
  tone?: (key: string) => string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <div className="vault-segmented-field">
      <span>{props.label}</span>
      <div className={["vault-choice-strip", props.compact ? "compact" : "", props.wrap ? "wrap" : ""].filter(Boolean).join(" ")} role="group" aria-label={props.label}>
        {props.options.map(([key, label]) => (
          <button type="button" key={key} data-filter-tone={props.tone?.(key)} aria-pressed={props.value === key} onClick={() => props.onChange(key)}>
            {props.icon?.(key)}<span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function shortSlotLabel(label: string): string {
  return label.replace("武器", "").replace("物品", "").replace("全部位置", "全部");
}

function isVaultAmmoType(value: string): value is VaultAmmoType {
  return value === "primary" || value === "special" || value === "heavy";
}

function armorSetCatalogLabel(status: VaultArmorSetCatalogStatus, count: number): string {
  if (status === "loading") return "套装目录加载中";
  if (status === "error") return "套装目录不可用";
  return count ? "全部套装" : "暂无套装目录";
}
