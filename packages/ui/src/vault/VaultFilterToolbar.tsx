import type { ReactNode } from "react";
import {
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
  weaponSlotTypeFromKey
} from "./VaultWeaponFactIcons.js";
import type { VaultCopy } from "../i18n/types.js";
import { vaultSlotShortLabel, vaultTemplate, vaultText } from "./vaultCopy.js";

export type VaultArmorSetCatalogStatus = "loading" | "ready" | "error";

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
  copy: VaultCopy;
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
  const copy = props.copy;
  const isWeaponMode = props.group === "weapons";
  const isArmorMode = props.group === "armor";
  const visibleGroups = props.groups.filter((item) => item.key === "weapons" || item.key === "armor" || item.key === "equipment");
  const visibleSlotFilters = props.slotFilters.filter((item) => {
    // 槽位按 `VaultSlotKey` 比，`group` 由 `buildVaultSlotFilters` 从 `item.group_key` 带出来，
    // 不再靠关键词猜显示名是不是某个槽位。
    if (item.key === "all") return true;
    if (isWeaponMode || isArmorMode) return item.group === props.group;
    return true;
  });
  const allFilterLabel = vaultText(copy, "全部");
  const dispositionOptions: Array<{ key: Extract<VaultTagFilter, "all" | "keep" | "review" | "junk">; label: string }> = [
    { key: "all", label: allFilterLabel },
    { key: "keep", label: copy.labels.tags.keep },
    { key: "review", label: copy.labels.tags.review },
    { key: "junk", label: copy.labels.tags.junk }
  ];
  // 弹药与勇士分段控件用的是短名：「全部弹药」在按钮里缩成「全部」，「反屏障」缩成「屏障」。
  const ammoOptions: Array<[string, string]> = Object.entries(copy.labels.ammo)
    .map(([key, label]) => [key, key === "all" ? allFilterLabel : label]);
  const championOptions: Array<[string, string]> = [
    ["all", allFilterLabel],
    ["barrier", vaultText(copy, "屏障")],
    ["overload", vaultText(copy, "过载")],
    ["unstoppable", vaultText(copy, "势不可挡")]
  ];

  return (
    <aside className="vault-filter-workbench" aria-label={vaultText(copy, "仓库筛选")} data-surface="section" data-contract-id="vault.filters">
      <div className="vault-filter-search">
        <label className="vault-search-field">
          <svg className="vault-search-field-icon" aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            type="search"
            aria-label={vaultText(copy, "搜索仓库装备")}
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder={vaultText(copy, "搜索名称、Perk、标签或备注")}
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
            ? vaultTemplate(copy, "重置全部筛选，共 {count} 项；包括左侧条件和推荐命中筛选", { count: props.activeFilterCount })
            : vaultText(copy, "当前没有需要重置的筛选条件")}
          title={props.activeFilterCount
            ? vaultText(copy, "清除左侧条件和推荐命中筛选")
            : vaultText(copy, "当前没有需要重置的筛选条件")}
          onClick={props.onResetFilters}
        >
          <svg className="vault-filter-reset-icon" aria-hidden="true" viewBox="0 0 24 24">
            <path d="M20 11a8 8 0 1 0-2.3 5.7" />
            <path d="M20 4v7h-7" />
          </svg>
          <span>{vaultText(copy, "重置")}</span>
          <small className="vault-filter-reset-count" aria-hidden="true">{props.activeFilterCount}</small>
        </button>
      </div>

      <FilterBlock>
        <div className="vault-filter-label-field">
          <span>{vaultText(copy, "物品类型")}</span>
          <div className="vault-filter-option-grid vault-filter-category-grid" role="group" aria-label={vaultText(copy, "物品类型")}>
            {visibleGroups.map((item) => (
              <button type="button" key={item.key} aria-pressed={props.group === item.key} onClick={() => props.onGroupChange(item.key)}>
                <span>{copy.labels.groups[item.key]}</span><small>{item.count}</small>
              </button>
            ))}
          </div>
        </div>
      </FilterBlock>

      {isWeaponMode ? (
        <>
          <FilterBlock>
            <div className="vault-filter-label-field">
              <span>{vaultText(copy, "槽位")}</span>
              <div className="vault-filter-option-grid vault-filter-slot-grid" role="group" aria-label={vaultText(copy, "武器槽位")}>
                {visibleSlotFilters.map((item) => {
                  const slotType = weaponSlotTypeFromKey(item.key);
                  return (
                    <button
                      type="button"
                      key={item.key}
                      data-slot-tone={slotType}
                      aria-pressed={props.slotFilter === item.key}
                      onClick={() => props.onSlotFilterChange(item.key)}
                    >
                      {slotType ? <VaultSlotTypeIcon type={slotType} size="compact" /> : null}
                      <span>{vaultSlotShortLabel(copy, item.key, item.label)}</span><small>{item.count}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          </FilterBlock>

          <FilterBlock>
            <SegmentedFilter
              label={vaultText(copy, "弹药")}
              value={props.ammoFilter}
              options={ammoOptions}
              icon={(key) => isVaultAmmoType(key) ? <VaultAmmoTypeIcon type={key} size="compact" /> : null}
              tone={(key) => key === "all" ? undefined : `ammo-${key}`}
              onChange={(value) => props.onAmmoFilterChange(value as VaultAmmoFilter)}
            />
          </FilterBlock>

          <FilterBlock>
            <SegmentedFilter
              label={vaultText(copy, "伤害")}
              value={props.damageFilter}
              options={Object.entries(copy.labels.damage)}
              icon={(key) => key === "all" ? null : <VaultDamageTypeIcon damageType={damageTypeIds[key]} size="compact" />}
              tone={(key) => key === "all" ? undefined : `damage-${key}`}
              wrap
              onChange={(value) => props.onDamageFilterChange(value as VaultDamageFilter)}
            />
          </FilterBlock>

          <FilterBlock>
            <SegmentedFilter
              label={vaultText(copy, "反勇士")}
              value={props.championFilter}
              options={championOptions}
              icon={(key) => key === "all" ? null : <VaultChampionTypeIcon type={key as "barrier" | "overload" | "unstoppable"} src={props.championIcons?.[key as "barrier" | "overload" | "unstoppable"]} size="compact" />}
              tone={(key) => key === "all" ? undefined : `champion-${key}`}
              wrap
              onChange={(value) => props.onChampionFilterChange(value as VaultChampionFilter)}
            />
          </FilterBlock>

          <FilterBlock>
            <SegmentedFilter
              label={vaultText(copy, "阶级")}
              value={props.gearTierFilter}
              options={Object.entries(copy.labels.gearTiers)}
              compact
              onChange={(value) => props.onGearTierFilterChange(value as VaultGearTierFilter)}
            />
          </FilterBlock>

          <FilterBlock>
            <SegmentedFilter
              label={vaultText(copy, "稀有度")}
              value={props.rarityFilter}
              options={Object.entries(copy.labels.rarity)}
              tone={(key) => key === "legendary" ? "rarity-legendary" : key === "exotic" ? "rarity-exotic" : undefined}
              onChange={(value) => props.onRarityFilterChange(value as VaultRarityFilter)}
            />
          </FilterBlock>

          <FilterBlock>
            <SegmentedFilter
              label={vaultText(copy, "锻造")}
              value={props.craftingFilter}
              options={Object.entries(copy.labels.crafting)}
              icon={(key) => key === "all" ? null : <VaultCraftingGlyph kind={key as "crafted" | "uncrafted"} />}
              tone={(key) => key === "all" ? undefined : `crafting-${key}`}
              onChange={(value) => props.onCraftingFilterChange(value as VaultCraftingFilter)}
            />
          </FilterBlock>

          <FilterBlock>
            <label className="vault-filter-field">
              <span>{vaultText(copy, "武器类型")}</span>
              <select aria-label={vaultText(copy, "武器类型")} value={props.itemTypeFilter} onChange={(event) => props.onItemTypeFilterChange(event.target.value)}>
                <option value="all">{vaultText(copy, "全部类型")}</option>
                {props.itemTypeFilters.map((item) => <option key={item.key} value={item.key}>{item.label} {item.count}</option>)}
              </select>
            </label>
          </FilterBlock>

          <FilterBlock>
            <label className="vault-filter-field">
              <span>{vaultText(copy, "武器框架")}</span>
              <select
                aria-label={vaultText(copy, "武器框架")}
                value={props.frameFilter || "all"}
                disabled={!props.availableFrameFilters.length}
                onChange={(event) => props.onFrameFilterChange(event.target.value)}
              >
                <option value="all">{props.availableFrameFilters.length ? vaultText(copy, "全部框架") : vaultText(copy, "当前范围没有可用的武器框架")}</option>
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
              <span>{vaultText(copy, "部位")}</span>
              <div className="vault-filter-option-grid vault-filter-slot-grid" role="group" aria-label={vaultText(copy, "护甲部位")}>
                {visibleSlotFilters.map((item) => (
                  <button type="button" key={item.key} aria-pressed={props.slotFilter === item.key} onClick={() => props.onSlotFilterChange(item.key)}>
                    <span>{vaultSlotShortLabel(copy, item.key, item.label)}</span><small>{item.count}</small>
                  </button>
                ))}
              </div>
            </div>
          </FilterBlock>

          <FilterBlock>
            <SegmentedFilter
              label={vaultText(copy, "职业")}
              value={props.classFilter}
              options={Object.entries(copy.labels.classes)}
              onChange={(value) => props.onClassFilterChange(value as VaultClassFilter)}
            />
          </FilterBlock>

          <FilterBlock>
            <SegmentedFilter
              label={vaultText(copy, "阶级")}
              value={props.gearTierFilter}
              options={Object.entries(copy.labels.gearTiers)}
              compact
              onChange={(value) => props.onGearTierFilterChange(value as VaultGearTierFilter)}
            />
          </FilterBlock>

          <FilterBlock>
            <SegmentedFilter
              label={vaultText(copy, "稀有度")}
              value={props.rarityFilter}
              options={Object.entries(copy.labels.rarity)}
              tone={(key) => key === "legendary" ? "rarity-legendary" : key === "exotic" ? "rarity-exotic" : undefined}
              onChange={(value) => props.onRarityFilterChange(value as VaultRarityFilter)}
            />
          </FilterBlock>

          <FilterBlock>
            <label className="vault-filter-field">
              <span>{vaultText(copy, "护甲套装")}</span>
              <select
                value={props.armorSetFilter}
                disabled={props.armorSetCatalogStatus !== "ready" || !props.armorSetFilters.length}
                onChange={(event) => props.onArmorSetFilterChange(event.target.value)}
              >
                <option value="all">{armorSetCatalogLabel(copy, props.armorSetCatalogStatus, props.armorSetFilters.length)}</option>
                {props.armorSetFilters.map((item) => (
                  <option key={item.key} value={item.key}>{item.label}{vaultTemplate(copy, "（持有 {count}）", { count: item.count })}</option>
                ))}
              </select>
            </label>
          </FilterBlock>

          <FilterBlock>
            <VaultArmorFilterPanel
              copy={copy}
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
            <span>{vaultText(copy, "位置")}</span>
            <div className="vault-filter-option-grid vault-filter-slot-grid" role="group" aria-label={vaultText(copy, "物品位置")}>
              {visibleSlotFilters.map((item) => (
                <button type="button" key={item.key} aria-pressed={props.slotFilter === item.key} onClick={() => props.onSlotFilterChange(item.key)}>
                  <span>{vaultSlotShortLabel(copy, item.key, item.label)}</span><small>{item.count}</small>
                </button>
              ))}
            </div>
          </div>
        </FilterBlock>
      ) : null}

      <FilterBlock>
        <SegmentedFilter
          label={vaultText(copy, "锁定")}
          value={props.lockFilter}
          options={Object.entries(copy.labels.locks)}
          onChange={(value) => props.onLockFilterChange(value as VaultLockFilter)}
        />
      </FilterBlock>

      <FilterBlock>
        <div className="vault-filter-label-field">
          <span>{vaultText(copy, "玩家标记")}</span>
          <div className="vault-filter-option-grid vault-disposition-grid" role="group" aria-label={vaultText(copy, "玩家标记")}>
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
          <span>{vaultText(copy, "结果排序")}</span>
          <select
            aria-label={vaultText(copy, "结果排序")}
            title={props.sortKey === "recommendation" ? vaultText(copy, "推荐权重：优先级 → 比较 → 未收录") : vaultText(copy, "结果排序规则")}
            value={props.sortKey}
            onChange={(event) => props.onSortKeyChange(event.target.value as VaultSortKey)}
          >
            {(Object.keys(copy.labels.sorts) as VaultSortKey[]).map((key) => <option key={key} value={key}>{copy.labels.sorts[key]}</option>)}
          </select>
        </label>
        {props.sortKey === "recommendation" ? (
          <p className="vault-filter-sort-note">{vaultText(copy, "权重：优先级 → 比较 → 未收录")}</p>
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

function isVaultAmmoType(value: string): value is VaultAmmoType {
  return value === "primary" || value === "special" || value === "heavy";
}

function armorSetCatalogLabel(copy: VaultCopy, status: VaultArmorSetCatalogStatus, count: number): string {
  if (status === "loading") return vaultText(copy, "套装目录加载中");
  if (status === "error") return vaultText(copy, "套装目录不可用");
  return count ? vaultText(copy, "全部套装") : vaultText(copy, "暂无套装目录");
}
