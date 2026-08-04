import { memo } from "react";
import { evaluateWishlistRoll } from "@d2-tools/core/analysis/wishlist";
import { evaluateLocalTargets } from "@d2-tools/core/analysis/targets";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { VaultItemMatchInfo } from "@d2-tools/core/community-perks";
import type { VaultTags, VaultTagValue } from "@d2-tools/core/vault/tags";
import { matchesLoadoutTemplateItem, type LoadoutTemplateLookup } from "@d2-tools/app/loadouts";
import { ammoFilterLabels, formatArmorStatsInline, getVaultItemKey, normalizeCoreItem, tagLabels } from "@d2-tools/app/vault";

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
  const note = props.tags.items[getVaultItemKey(props.item)]?.note;
  const wishlist = evaluateWishlistRoll(normalizeCoreItem(props.item), props.wishlist ?? undefined);
  const localTarget = evaluateLocalTargets(normalizeCoreItem(props.item), props.localTargetRules ?? undefined);
  const communityMatch = props.communityMatch;
  const isLoadoutMatch = matchesLoadoutTemplateItem(props.item, props.highlightedItemKeys);
  const tagValue = tagValueForItem(props.item, props.tags);
  const disposition = dispositionForTag(tagValue);
  const evidenceLabels = [
    isLoadoutMatch ? "配装" : "",
    wishlist.matched ? "DIM" : "",
    localTarget.matched ? "目标" : "",
    communityMatch && communityMatch.matched > 0 ? "社区" : "",
    tagValue === "farm" ? "待刷" : "",
    tagValue === "loadout" ? "配装用" : ""
  ].filter(Boolean);
  const detailAvailable = props.item.group_key === "weapons" || props.item.group_key === "armor";
  const cardContent = <>
    <div className="vault-card-visual">
      {props.item.icon ? <img alt="" src={props.item.icon} /> : <div className="item-icon-placeholder" />}
      {props.item.locked ? <span className="vault-card-lock">锁</span> : null}
      {props.item.power ? <span className="vault-card-power">{props.item.power}</span> : props.item.instance?.gear_tier !== undefined ? <span className="vault-card-power">T{props.item.instance.gear_tier}</span> : null}
      <span className="vault-card-marker-row">
        <span className={`vault-score-badge score-${disposition}`}>{dispositionLabel(disposition)}</span>
        {evidenceLabels.length ? <span className="vault-card-evidence" title={evidenceLabels.join(" / ")}>{evidenceLabels[0]}{evidenceLabels.length > 1 ? ` +${evidenceLabels.length - 1}` : ""}</span> : null}
      </span>
    </div>
    <div className="vault-card-body">
      <strong>{props.item.name}</strong>
      <span className="vault-card-meta">{formatVaultCardMeta(props.item)}</span>
      {props.item.socket_plugs?.length ? (
        <small className="vault-card-roll">{props.item.socket_plugs.slice(0, 2).map((plug) => plug.name).join(" · ")}</small>
      ) : null}
      {note ? <small className="vault-note-snippet">备注：{note}</small> : null}
      {props.isOpening ? <small className="vault-card-open-state">正在打开详情...</small> : null}
    </div>
  </>;

  return (
    <article
      className={[
        "vault-item-card",
        props.isSelected ? "selected" : "",
        isLoadoutMatch ? "loadout-highlight" : "",
        props.isOpening ? "pending" : "",
        detailAvailable ? "" : "is-readonly"
      ].filter(Boolean).join(" ")}
    >
      {props.isOrganizing ? (
        <label className="vault-card-select">
          <input
            checked={props.isSelected}
            type="checkbox"
            onChange={() => props.onToggleSelected(props.item)}
          />
          选择
        </label>
      ) : null}
      {detailAvailable ? (
        <button
          type="button"
          className="vault-card-main"
          title={[formatVaultItemMeta(props.item), evidenceLabels.length ? `证据：${evidenceLabels.join(" / ")}` : "", wishlist.matched ? formatWishlistHint(wishlist.labels) : "", localTarget.matched ? localTarget.labels.join(" / ") : "", communityMatch?.modes.length ? communityMatch.modes.map(formatCommunityMode).join(" / ") : ""].filter(Boolean).join("\n")}
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

function formatWishlistHint(labels: string[]): string {
  const detailLabels = labels.filter((label) => label !== "DIM Wishlist");
  return detailLabels.length ? detailLabels.join(" / ") : "已命中";
}

function formatCommunityMode(mode: "pve" | "pvp" | "general"): string {
  switch (mode) {
    case "pve": return "PvE";
    case "pvp": return "PvP";
    case "general": return "通用";
    default: return mode;
  }
}

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

function formatVaultCardMeta(item: AccountItemSummary): string {
  return [
    item.weapon_frame?.name,
    item.item_type,
    item.tier,
    item.armor_stats ? `总值 ${item.armor_stats.total}` : undefined
  ].filter(Boolean).slice(0, 2).join(" · ");
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
