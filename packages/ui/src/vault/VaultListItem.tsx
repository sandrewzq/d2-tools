import { memo } from "react";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { VaultItemMatchInfo } from "@d2-tools/core/community-perks";
import type { VaultTags, VaultTagValue } from "@d2-tools/core/vault/tags";
import { matchesLoadoutTemplateItem, type LoadoutTemplateLookup } from "@d2-tools/app/loadouts";
import { ammoFilterLabels, formatArmorStatsInline, getVaultItemKey, tagLabels } from "@d2-tools/app/vault";

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
  const detailAvailable = props.item.group_key === "weapons" || props.item.group_key === "armor";
  const cardContent = <>
    <div className="vault-card-visual-stack">
      <div className="vault-card-visual">
        {props.item.icon ? <img alt="" decoding="async" loading="lazy" src={props.item.icon} /> : <div className="item-icon-placeholder" />}
        {gearTier > 0 ? (
          <span className={`vault-gear-tier vault-gear-tier-${gearTier}`} aria-label={`装备阶级 T${gearTier}`}>
            {Array.from({ length: gearTier }, (_, index) => <i aria-hidden="true" key={index} />)}
          </span>
        ) : null}
      </div>
      <span className="vault-card-power">{props.item.power ?? "—"}</span>
    </div>
    <div className="vault-card-body">
      <strong title={props.item.name}>{props.item.name}</strong>
      <span className="vault-card-meta">{formatVaultCardMeta(props.item)}</span>
      <span className="vault-card-footer">
        <small>{props.isOpening ? "打开中" : formatVaultCardContext(props.item)}</small>
        <span className={`vault-score-badge score-${disposition}`}>{dispositionShortLabel(disposition)}</span>
      </span>
    </div>
    {props.item.locked || isLoadoutMatch ? (
      <span className="vault-card-corner-flags" aria-label={[props.item.locked ? "已锁定" : "", isLoadoutMatch ? "配装引用" : ""].filter(Boolean).join("、")}>
        {props.item.locked ? <span title="已锁定">锁</span> : null}
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
    return [item.item_type, item.ammo_type ? ammoFilterLabels[item.ammo_type] : undefined].filter(Boolean).join(" · ") || "武器";
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
