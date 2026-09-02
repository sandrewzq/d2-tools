import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalCommunityRecommendationTable, VaultItemMatchInfo } from "@d2-tools/core/community-perks";
import { useState } from "react";
import { ControlButton } from "../control/ControlButton.js";
import { VaultWishlistManager, type VaultWishlistActions } from "./VaultWishlistManager.js";

export type VaultRecommendationSourceState = {
  customRules: LocalCommunityRecommendationTable | null;
  customRulesLoadState: "loading" | "ready" | "error";
  customRulesLoadError?: string;
};

export function VaultRecommendationEvidencePanel(props: {
  items: AccountItemSummary[];
  wishlist?: DimWishlist | null;
  communityMatch?: Map<number, VaultItemMatchInfo>;
  sourceState?: VaultRecommendationSourceState;
  wishlistActions?: VaultWishlistActions;
  onOpenItem: (item: AccountItemSummary) => void;
}) {
  const [isWishlistManagerOpen, setIsWishlistManagerOpen] = useState(false);
  const matches = buildMatchedWeaponRows(props.items, props.communityMatch);
  const matchedInstanceCount = matches.reduce((sum, row) => sum + row.instanceCount, 0);
  const matchedComboCount = matches.reduce((sum, row) => sum + row.match.matched, 0);
  const modes = Array.from(new Set(matches.flatMap((row) => row.match.modes)));
  const sourceLabels = Array.from(new Set(matches.flatMap((row) => splitSourceLabels(row.match.source_label))));
  const sourceState = props.sourceState;
  const hasConfiguredSource = Boolean(props.wishlist || sourceState?.customRules);

  return (
    <section className="vault-evidence-panel" data-surface="section" aria-label="武器匹配">
      <div className="vault-column-head">
        <div><h3>武器匹配</h3><span>按当前账号和 Wishlist 核对</span></div>
        {props.wishlistActions ? <ControlButton size="compact" variant="quiet" onClick={() => setIsWishlistManagerOpen((current) => !current)}>{isWishlistManagerOpen ? "收起推荐数据" : "管理推荐数据"}</ControlButton> : null}
      </div>

      {isWishlistManagerOpen && props.wishlistActions ? <VaultWishlistManager wishlist={props.wishlist} actions={props.wishlistActions} onClose={() => setIsWishlistManagerOpen(false)} /> : null}

      <div className="vault-evidence-metrics" data-ui-kind="status-matrix" data-surface="frame">
        <div><span>命中装备</span><strong>{matchedInstanceCount} 件</strong><small>{matches.length} 个武器版本</small></div>
        <div><span>命中组合</span><strong>{matchedComboCount} 组</strong><small>{modes.length ? formatModes(modes) : "暂无模式命中"}</small></div>
        <div><span>匹配依据</span><strong>{sourceLabels.length || 0} 个</strong><small>{sourceLabels.length ? sourceLabels.join(" / ") : "当前没有命中依据"}</small></div>
      </div>

      <div className="vault-evidence-source-strip" data-surface="list" aria-label="匹配数据状态">
        <SourceState label="DIM Wishlist" enabled={Boolean(props.wishlist)} detail={props.wishlist ? `${props.wishlist.title} · ${props.wishlist.rules.length} 条规则` : "未配置"} />
        {sourceState?.customRules ? <SourceState label="遗留自定义规则" enabled detail={formatCustomSourceState(sourceState)} compatibility /> : null}
        {sourceState?.customRulesLoadState === "error" ? <SourceState label="遗留推荐数据" enabled={false} status="error" detail={formatCustomSourceState(sourceState)} /> : null}
      </div>

      {matches.length ? (
        <div className="vault-evidence-results" data-surface="list">
          {matches.map((row) => (
            <button type="button" data-surface="row" key={row.hash} onClick={() => props.onOpenItem(row.item)}>
              <span className="vault-evidence-result-identity"><strong>{row.item.name}</strong><small>{row.instanceCount} 件实例 · {row.match.matched}/{row.match.available} 组匹配</small></span>
              <span className="vault-evidence-result-modes">{row.match.modes.length ? formatModes(row.match.modes) : "通用"}</span>
              <span className="vault-evidence-result-source">{row.match.source_label || "本地匹配数据"}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="vault-evidence-empty" data-surface="empty">
          <strong>{hasConfiguredSource ? "当前账号没有命中 Wishlist 组合" : "尚未导入 DIM Wishlist"}</strong>
          <span>{hasConfiguredSource ? "匹配数据仍然有效，只是当前装备没有满足完整 Perk 组合。" : "需要外部武器愿望单时，可在这里导入 DIM Wishlist；攻略配装请从攻略页开始。"}</span>
        </div>
      )}
    </section>
  );
}

function SourceState(props: { label: string; enabled: boolean; status?: "loading" | "ready" | "error"; detail: string; compatibility?: boolean }) {
  const label = props.status === "loading" ? "读取中" : props.status === "error" ? "读取失败" : props.compatibility ? "兼容读取" : props.enabled ? "已启用" : "未配置";
  const status = props.status === "error" ? "error" : props.status === "loading" ? "warning" : props.enabled ? "success" : "neutral";
  return <div className="vault-evidence-source"><span><strong>{props.label}</strong><small>{props.detail}</small></span><span className="ui-badge" data-ui-kind="status-chip" data-status={status}>{label}</span></div>;
}

function buildMatchedWeaponRows(items: AccountItemSummary[], matchMap?: Map<number, VaultItemMatchInfo>) {
  const itemsByHash = new Map<number, AccountItemSummary[]>();
  items.forEach((item) => itemsByHash.set(item.hash, [...(itemsByHash.get(item.hash) ?? []), item]));
  return Array.from(matchMap?.entries() ?? [])
    .filter(([, match]) => match.matched > 0)
    .flatMap(([hash, match]) => {
      const matchingItems = itemsByHash.get(hash) ?? [];
      const item = matchingItems[0];
      return item ? [{ hash, item, instanceCount: matchingItems.length, match }] : [];
    })
    .sort((left, right) => right.match.matched - left.match.matched || left.item.name.localeCompare(right.item.name));
}

function formatCustomSourceState(sourceState?: VaultRecommendationSourceState): string {
  if (!sourceState || sourceState.customRulesLoadState === "loading") return "正在读取本机规则";
  if (sourceState.customRulesLoadState === "error") return sourceState.customRulesLoadError || "本机规则读取失败";
  if (!sourceState.customRules) return "未配置";
  return `${sourceState.customRules.title} · ${sourceState.customRules.rules.length} 条规则`;
}

function formatModes(modes: Array<"pve" | "pvp" | "general">): string {
  return modes.map((mode) => mode === "pve" ? "PVE" : mode === "pvp" ? "PVP" : "通用").join(" / ");
}

function splitSourceLabels(value?: string): string[] {
  return value?.split("/").map((label) => label.trim()).filter(Boolean) ?? [];
}
