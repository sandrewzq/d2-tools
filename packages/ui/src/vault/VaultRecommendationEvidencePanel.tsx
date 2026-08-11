import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalCommunityRecommendationTable, VaultItemMatchInfo } from "@d2-tools/core/community-perks";
import { ControlButton } from "../control/ControlButton.js";

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
  onOpenItem: (item: AccountItemSummary) => void;
  onManageSources?: () => void;
}) {
  const matches = buildMatchedWeaponRows(props.items, props.communityMatch);
  const matchedInstanceCount = matches.reduce((sum, row) => sum + row.instanceCount, 0);
  const matchedComboCount = matches.reduce((sum, row) => sum + row.match.matched, 0);
  const modes = Array.from(new Set(matches.flatMap((row) => row.match.modes)));
  const sourceLabels = Array.from(new Set(matches.flatMap((row) => splitSourceLabels(row.match.source_label))));
  const sourceState = props.sourceState;
  const hasConfiguredSource = Boolean(props.wishlist || sourceState?.customRules);

  return (
    <section className="vault-evidence-panel" data-surface="section" aria-label="推荐证据">
      <div className="vault-column-head">
        <div><h3>推荐证据</h3><span>当前账号实际命中</span></div>
        {props.onManageSources ? <ControlButton size="compact" variant="quiet" onClick={props.onManageSources}>管理推荐来源</ControlButton> : null}
      </div>

      <div className="vault-evidence-metrics" data-ui-kind="status-matrix" data-surface="frame">
        <div><span>命中装备</span><strong>{matchedInstanceCount} 件</strong><small>{matches.length} 个武器版本</small></div>
        <div><span>命中组合</span><strong>{matchedComboCount} 组</strong><small>{modes.length ? formatModes(modes) : "暂无模式命中"}</small></div>
        <div><span>实际来源</span><strong>{sourceLabels.length || 0} 个</strong><small>{sourceLabels.length ? sourceLabels.join(" / ") : "当前没有命中来源"}</small></div>
      </div>

      <div className="vault-evidence-source-strip" data-surface="list" aria-label="已配置推荐来源">
        <SourceState label="DIM Wishlist" enabled={Boolean(props.wishlist)} detail={props.wishlist ? `${props.wishlist.title} · ${props.wishlist.rules.length} 条规则` : "未配置"} />
        <SourceState
          label="自定义推荐规则"
          enabled={Boolean(sourceState?.customRules)}
          status={sourceState?.customRulesLoadState}
          detail={formatCustomSourceState(sourceState)}
        />
      </div>

      {matches.length ? (
        <div className="vault-evidence-results" data-surface="list">
          {matches.map((row) => (
            <button type="button" data-surface="row" key={row.hash} onClick={() => props.onOpenItem(row.item)}>
              <span className="vault-evidence-result-identity"><strong>{row.item.name}</strong><small>{row.instanceCount} 件实例 · {row.match.matched}/{row.match.available} 组匹配</small></span>
              <span className="vault-evidence-result-modes">{row.match.modes.length ? formatModes(row.match.modes) : "通用"}</span>
              <span className="vault-evidence-result-source">{row.match.source_label || "本地推荐来源"}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="vault-evidence-empty" data-surface="empty">
          <strong>{hasConfiguredSource ? "当前账号没有命中推荐组合" : "尚未启用本地推荐来源"}</strong>
          <span>{hasConfiguredSource ? "推荐来源仍然有效，只是当前装备没有满足完整 Perk 组合。" : "仓库会在启用 DIM Wishlist 或自定义规则后显示真实命中结果。"}</span>
        </div>
      )}
    </section>
  );
}

function SourceState(props: { label: string; enabled: boolean; status?: "loading" | "ready" | "error"; detail: string }) {
  const label = props.status === "loading" ? "读取中" : props.status === "error" ? "读取失败" : props.enabled ? "已启用" : "未配置";
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
