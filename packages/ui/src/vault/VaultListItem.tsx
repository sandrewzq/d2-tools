import { memo } from "react";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { VaultItemMatchInfo } from "@d2-tools/core/community-perks";
import type { ArmorStatKey } from "@d2-tools/core/loadouts/analysis";
import type { VaultTags, VaultTagValue } from "@d2-tools/core/vault/tags";
import { matchesLoadoutTemplateItem, type LoadoutTemplateLookup } from "@d2-tools/app/loadouts";
import { ammoFilterLabels, armorStatLabels, formatArmorStatsInline, getVaultItemKey, tagLabels } from "@d2-tools/app/vault";
import { VaultAmmoTypeIcon, VaultDamageTypeIcon } from "./VaultWeaponFactIcons.js";

export function VaultListItem(props: {
  item: AccountItemSummary;
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  tags: VaultTags;
  wishlist?: DimWishlist | null;
  localTargetRules?: LocalTargetRules | null;
  communityMatch?: VaultItemMatchInfo;
  isOrganizing: boolean;
  isSelected: boolean;
  isOpening?: boolean;
  onSelectItem: (item: AccountItemSummary) => void;
  onToggleSelected: (item: AccountItemSummary) => void;
}) {
  const isLoadoutMatch = matchesLoadoutTemplateItem(props.item, props.highlightedItemKeys);
  const tagValue = tagValueForItem(props.item, props.tags);
  const disposition = dispositionForTag(tagValue);
  const gearTier = displayGearTier(props.item.instance?.gear_tier);
  const isWeapon = props.item.group_key === "weapons";
  const isArmor = props.item.group_key === "armor";
  const detailAvailable = props.item.group_key === "weapons" || props.item.group_key === "armor";
  const gearTierOverlay = props.item.instance?.gear_tier_overlay ?? gearTierOverlayUrl(gearTier);
  const visual = (
    <div className="vault-card-visual" title={gearTier > 0 ? `装备阶级 T${gearTier}` : undefined}>
      {props.item.icon ? <img alt="" decoding="async" loading="lazy" src={props.item.icon} /> : <div className="item-icon-placeholder" />}
      {gearTierOverlay ? (
        <img className="vault-gear-tier" alt="" aria-hidden="true" src={gearTierOverlay} />
      ) : null}
      {props.item.locked ? <span className="vault-item-lock-icon" aria-label="已锁定" title="已锁定"><i /></span> : null}
    </div>
  );
  const stateFlags = (
    <span className="vault-card-state-flags">
      {isLoadoutMatch ? <small data-status="success">配装</small> : null}
      {props.isOpening ? <small data-status="pending">打开中</small> : null}
    </span>
  );
  const strongestArmorStat = isArmor ? getStrongestArmorStat(props.item) : undefined;
  const cardContent = isWeapon ? <>
      <div className="vault-weapon-identity">
        {visual}
        <div className="vault-weapon-copy">
          <strong title={props.item.name}>{props.item.name}</strong>
          <span>{props.item.item_type || "武器"}</span>
          <span title={props.item.bucket_name}>{formatWeaponSlot(props.item)}</span>
        </div>
      </div>
      <div className="vault-weapon-fact-row">
        <span className={`vault-weapon-fact ammo-${props.item.ammo_type ?? "unknown"}`} title={props.item.ammo_type ? ammoFilterLabels[props.item.ammo_type] : "弹药类型未知"}>
          <VaultAmmoTypeIcon type={props.item.ammo_type} />
          <span>{formatAmmoCompact(props.item.ammo_type)}</span>
        </span>
        <span className="vault-weapon-fact" title={formatVaultCardContext(props.item)}>
          <VaultDamageTypeIcon damageType={props.item.instance?.damage_type} src={props.item.instance?.damage_type_icon} />
          <span>{formatVaultCardContext(props.item) || "属性未知"}</span>
        </span>
        <span className="vault-weapon-power" title={`光等 ${props.item.power ?? "未知"}`}>
          <small>光</small><strong>{props.item.power ?? "—"}</strong>
        </span>
      </div>
      <div className="vault-weapon-status">
        <span className={`vault-score-badge score-${disposition}`}>{dispositionShortLabel(disposition)}</span>
        {stateFlags}
      </div>
    </> : isArmor ? <>
      <div className="vault-armor-identity">
        {visual}
        <div className="vault-armor-copy">
          <strong title={props.item.name}>{props.item.name}</strong>
          <span>{classTypeLabel(props.item.class_type) || "通用护甲"}</span>
          <span title={props.item.bucket_name}>{props.item.bucket_name || props.item.item_type || "未知部位"}</span>
        </div>
      </div>
      <div className="vault-armor-fact-row">
        <span className="vault-armor-fact"><small>总值</small><strong>{props.item.armor_stats?.total ?? "—"}</strong></span>
        <span className="vault-armor-fact" title={strongestArmorStat?.fullLabel}>
          <small>{strongestArmorStat?.label ?? "属性"}</small><strong>{strongestArmorStat?.value ?? "—"}</strong>
        </span>
        <span className="vault-weapon-power" title={`光等 ${props.item.power ?? "未知"}`}>
          <small>光</small><strong>{props.item.power ?? "—"}</strong>
        </span>
      </div>
      <div className="vault-armor-status">
        <span className={`vault-score-badge score-${disposition}`}>{dispositionShortLabel(disposition)}</span>
        {stateFlags}
      </div>
    </> : <>
      <div className="vault-card-visual-stack">
        {visual}
        <span className="vault-card-power">{props.item.power ?? "—"}</span>
      </div>
      <div className="vault-card-body">
        <strong title={props.item.name}>{props.item.name}</strong>
        <span className="vault-card-meta">{formatVaultCardMeta(props.item)}</span>
        <span className="vault-card-footer">
          <span className={`vault-score-badge score-${disposition}`}>{dispositionShortLabel(disposition)}</span>
          {stateFlags}
        </span>
      </div>
    {isLoadoutMatch ? (
      <span className="vault-card-corner-flags" aria-label="配装引用">
        {isLoadoutMatch ? <span title="配装引用">配</span> : null}
      </span>
    ) : null}
  </>;

  return (
    <article
      className={[
        "vault-item-card",
        props.isSelected ? "selected" : "",
        props.isOrganizing ? "is-organizing" : "",
        isLoadoutMatch ? "loadout-highlight" : "",
        props.isOpening ? "pending" : "",
        `vault-item-${props.item.group_key}`,
        detailAvailable ? "" : "is-readonly"
      ].filter(Boolean).join(" ")}
      data-ui-kind="object-card"
    >
      {props.isOrganizing ? (
        <label className="vault-card-select" aria-label={`选择${props.item.name}`}>
          <input
            checked={props.isSelected}
            type="checkbox"
            onChange={() => props.onToggleSelected(props.item)}
          />
        </label>
      ) : null}
      {detailAvailable ? (
        <button
          type="button"
          className="vault-card-main"
          title={formatVaultCardTitle(props.item, disposition, isLoadoutMatch)}
          aria-busy={props.isOpening}
          disabled={props.isOpening}
          onClick={() => props.onSelectItem(props.item)}
        >
          {cardContent}
        </button>
      ) : <div className="vault-card-main is-readonly">{cardContent}</div>}
    </article>
  );
}

export const MemoizedVaultListItem = memo(VaultListItem);

function tagValueForItem(item: AccountItemSummary, tags: VaultTags): VaultTagValue {
  const tag = tags.items[getVaultItemKey(item)]?.tag;
  return tag ?? "none";
}

function dispositionForTag(tag: VaultTagValue): "none" | "keep" | "review" | "junk" {
  return tag === "keep" || tag === "review" || tag === "junk" ? tag : "none";
}

function dispositionLabel(tag: "none" | "keep" | "review" | "junk"): string {
  return tag === "none" ? "未标记" : tag === "review" ? "待复查" : tagLabels[tag];
}

function dispositionShortLabel(tag: "none" | "keep" | "review" | "junk"): string {
  if (tag === "review") return "待查";
  if (tag === "junk") return "清理";
  return dispositionLabel(tag);
}

function formatVaultCardMeta(item: AccountItemSummary): string {
  if (item.group_key === "weapons") {
    return item.item_type || "武器";
  }
  if (item.group_key === "armor") {
    return [classTypeLabel(item.class_type), item.bucket_name ?? item.item_type].filter(Boolean).join(" · ") || "护甲";
  }
  return [
    item.item_type,
    item.bucket_name
  ].filter(Boolean).slice(0, 2).join(" · ") || "装备";
}

function formatVaultCardContext(item: AccountItemSummary): string {
  if (item.group_key !== "weapons") return "";
  if (item.instance?.damage_type_name) return item.instance.damage_type_name;
  switch (item.instance?.damage_type) {
    case 1: return "动能";
    case 2: return "电弧";
    case 3: return "烈日";
    case 4: return "虚空";
    case 6: return "冰影";
    case 7: return "缚丝";
    default: return "";
  }
}

function formatWeaponSlot(item: AccountItemSummary): string {
  const slot = item.bucket_name?.replace(/武器$/u, "").trim();
  return slot || "未知槽位";
}

function formatAmmoCompact(type: AccountItemSummary["ammo_type"]): string {
  if (type === "primary") return "主弹药";
  if (type === "special") return "特殊";
  if (type === "heavy") return "重型";
  return "未知";
}

function getStrongestArmorStat(item: AccountItemSummary): {
  label: string;
  fullLabel: string;
  value: number;
} | undefined {
  if (!item.armor_stats) return undefined;
  const keys = Object.keys(armorStatLabels) as ArmorStatKey[];
  const strongest = keys.reduce<ArmorStatKey | undefined>((current, key) => {
    if (!current || item.armor_stats![key] > item.armor_stats![current]) return key;
    return current;
  }, undefined);
  if (!strongest) return undefined;
  return {
    label: compactArmorStatLabel(strongest),
    fullLabel: armorStatLabels[strongest],
    value: item.armor_stats[strongest]
  };
}

function compactArmorStatLabel(stat: ArmorStatKey): string {
  if (stat === "health") return "生命";
  if (stat === "grenade") return "手雷";
  if (stat === "super") return "超能";
  if (stat === "class") return "职业";
  if (stat === "weapon") return "武器";
  return "近战";
}

function gearTierOverlayUrl(gearTier: number): string | undefined {
  if (gearTier <= 0) return undefined;
  return `https://www.bungie.net/img/destiny_content/items/inventory-item-tier${gearTier}.png`;
}

function classTypeLabel(classType: number | undefined): string | undefined {
  if (classType === 0) return "泰坦";
  if (classType === 1) return "猎人";
  if (classType === 2) return "术士";
  return undefined;
}

function displayGearTier(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return 0;
  return Math.min(5, Math.floor(value));
}

function formatVaultCardTitle(
  item: AccountItemSummary,
  disposition: "none" | "keep" | "review" | "junk",
  isLoadoutMatch: boolean
): string {
  return [
    item.name,
    formatVaultCardMeta(item),
    item.group_key === "weapons" ? formatWeaponSlot(item) : "",
    item.group_key === "weapons" && item.ammo_type ? ammoFilterLabels[item.ammo_type] : "",
    formatVaultCardContext(item),
    item.power !== undefined ? `光等 ${item.power}` : "",
    `整理状态：${dispositionLabel(disposition)}`,
    item.locked ? "已锁定" : "",
    isLoadoutMatch ? "配装引用" : ""
  ].filter(Boolean).join("\n");
}

export function formatVaultItemMeta(item: AccountItemSummary): string {
  return [
    item.bucket_name,
    item.item_type,
    item.ammo_type ? ammoFilterLabels[item.ammo_type] : undefined,
    item.tier,
    item.power ? `光等 ${item.power}` : undefined,
    formatArmorStatsInline(item),
    item.locked ? "已锁定" : undefined
  ].filter(Boolean).join(" / ");
}
