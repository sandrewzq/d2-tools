import { memo } from "react";
import { evaluateWishlistRoll } from "@d2-tools/core/analysis/wishlist";
import { evaluateLocalTargets } from "@d2-tools/core/analysis/targets";
import {
  buildItemDecision, summarizeItemDecision
} from "@d2-tools/core/evidence/itemDecision";
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
  const tagLabel = tagLabelForItem(props.item, props.tags);
  const decision = buildItemDecision({
    itemKey: getVaultItemKey(props.item),
    itemName: props.item.name,
    locked: props.item.locked,
    localTag: tagValue,
    wishlistMatched: wishlist.matched,
    localTargetMatched: localTarget.matched,
    communityMatched: Boolean(communityMatch && communityMatch.matched > 0)
  });

  return (
    <article
      className={[
        "vault-item-card",
        props.isSelected ? "selected" : "",
        isLoadoutMatch ? "loadout-highlight" : "",
        props.isOpening ? "pending" : ""
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
      <button
        type="button"
        className="vault-card-main"
        aria-busy={props.isOpening}
        disabled={props.isOpening}
        onClick={() => props.onSelectItem(props.item)}
      >
        <div className="vault-card-visual">
          {props.item.icon ? <img alt="" src={props.item.icon} /> : <div className="item-icon-placeholder" />}
        </div>
        <div className="vault-card-body">
          <div className="vault-title-row">
            <strong>{props.item.name}</strong>
            <span className={`vault-score-badge score-${tagValue}`}>{tagLabel}</span>
          </div>
          <small className={`decision-badge decision-${decision.decision}`}>
            {summarizeItemDecision(decision)}
          </small>
          <span className="vault-card-meta">{formatVaultItemMeta(props.item)}</span>
          <div className="vault-card-signals">
            {isLoadoutMatch ? <small className="loadout-template-badge">方案命中</small> : null}
            {wishlist.matched ? (
              <small className="wishlist-hit">
                <span className="wishlist-hit-badge">DIM 愿望单</span>
                <span>{formatWishlistHint(wishlist.labels)}</span>
              </small>
            ) : null}
            {localTarget.matched ? (
              <small className="target-hit">
                <span className="target-hit-badge">本地目标</span>
                <span>{localTarget.labels.join(" / ")}</span>
              </small>
            ) : null}
            {communityMatch && communityMatch.matched > 0 ? (
              <small className="community-match">
                <span className="community-match-badge">社区推荐</span>
                <span>命中 {communityMatch.matched} 个组合{communityMatch.modes.length ? ` · ${communityMatch.modes.map(formatCommunityMode).join(" / ")}` : ""}</span>
              </small>
            ) : null}
          </div>
          {props.item.socket_plugs?.length ? (
            <small className="vault-card-roll">{props.item.socket_plugs.slice(0, 4).map((plug) => plug.name).join(" / ")}</small>
          ) : null}
          {note ? <small className="vault-note-snippet">备注：{note}</small> : null}
          {props.isOpening ? <small className="vault-card-open-state">正在打开详情...</small> : null}
        </div>
      </button>
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

function tagLabelForItem(item: AccountItemSummary, tags: VaultTags): string {
  const tag = tagValueForItem(item, tags);
  return tag === "none" ? "未标记" : tagLabels[tag];
}

function tagValueForItem(item: AccountItemSummary, tags: VaultTags): VaultTagValue {
  const tag = tags.items[getVaultItemKey(item)]?.tag;
  return tag ?? "none";
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
