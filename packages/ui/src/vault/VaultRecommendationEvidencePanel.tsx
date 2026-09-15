import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { VaultRecommendationScanState } from "@d2-tools/app/account";
import type { LocalCommunityRecommendationTable } from "@d2-tools/core/community-perks";
import { useState } from "react";
import { VaultRecommendationDataPanel, type VaultRecommendationManagedSource, type VaultWishlistActions } from "./VaultWishlistManager.js";
import { VaultRecommendationSourceManager } from "./VaultRecommendationSourceManager.js";

export type VaultRecommendationSourceState = {
  recommendationScan: VaultRecommendationScanState;
  customRules: LocalCommunityRecommendationTable | null;
  customRulesLoadState: "loading" | "ready" | "error";
  customRulesLoadError?: string;
};

export function VaultRecommendationEvidencePanel(props: {
  wishlist?: DimWishlist | null;
  sourceState?: VaultRecommendationSourceState;
  wishlistActions?: VaultWishlistActions;
  onCopyAuditReport?: () => void | Promise<void>;
  onManagedSourcesChange?: (sources: readonly VaultRecommendationManagedSource[]) => void;
}) {
  const [feedback, setFeedback] = useState<{ tone: "ready" | "error"; message: string } | null>(null);
  const scan = props.sourceState?.recommendationScan;

  return (
    <section className="vault-evidence-panel" data-surface="section" aria-label="推荐来源">
      <div className="vault-column-head">
        <div><h3>推荐来源管理</h3><span>导入与导出直接在本页完成；来源规则明细点击“查看详情”在弹框中查看。装备命中筛选与来源证据在“浏览装备”中查看。</span></div>
      </div>
      {feedback ? <p className={`status-message status-${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.message}</p> : null}
      {props.wishlistActions ? (
        <VaultRecommendationDataPanel
          wishlist={props.wishlist}
          actions={props.wishlistActions}
          showManagement={false}
          onApplied={(message: string) => setFeedback({ tone: "ready", message })}
        />
      ) : null}
      <div className="vault-recommendation-summary" data-ui-kind="callout" data-status="neutral">
        <span>{formatRecommendationScanDetail(scan)}</span>
      </div>
      {props.wishlistActions ? <VaultRecommendationSourceManager actions={props.wishlistActions} onApplied={(message) => setFeedback({ tone: "ready", message })} onSourcesChange={props.onManagedSourcesChange} onCopyAuditReport={props.onCopyAuditReport} /> : <div className="vault-evidence-empty" data-surface="empty"><strong>当前平台不支持来源管理</strong><span>请使用支持导入和来源管理的桌面端。</span></div>}
    </section>
  );
}

function formatRecommendationScanDetail(scan?: VaultRecommendationScanState): string {
  if (!scan) return "尚未核对账号武器的推荐来源。";
  if (scan.phase === "scanning") return `正在核对 ${scan.total_weapon_count} 件账号武器…`;
  if (scan.phase === "error") return "账号武器推荐来源核对失败。";
  if (scan.phase === "partial") return `当前保留 ${scan.retained_result_count} 件上次核对结果。`;
  // 按结构化原因给出下一步动作，不从错误字符串推断。
  if (hasRecommendationIssue(scan, "recommendation_unavailable")) {
    return "还没有可用的中文推荐数据，当前只核对 DIM 愿望单和本机自定义推荐；导入武器推荐 CSV 后才会参与核对。";
  }
  if (hasRecommendationIssue(scan, "recommendation_legacy_unverified")) {
    return "当前使用旧版中文推荐数据，还没按当前资料库版本复核；建议重新导入最新的武器推荐 CSV。";
  }
  if (scan.phase === "complete") {
    return `已核对 ${scan.scanned_weapon_count}/${scan.total_weapon_count} 件账号武器，${scan.covered_weapon_count} 件有推荐来源覆盖。`;
  }
  return scan.message ?? "尚未核对账号武器的推荐来源。";
}

function hasRecommendationIssue(
  scan: VaultRecommendationScanState,
  code: VaultRecommendationScanState["blocking_reason"]
): boolean {
  if (!code) return false;
  return scan.blocking_reason === code || Boolean(scan.issues?.some((issue) => issue.code === code));
}
