import type { VaultRecommendationScanState } from "@d2-tools/app/account";
import { useState } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale, VaultCopy } from "../i18n/types.js";
import { vaultTemplate, vaultText } from "./vaultCopy.js";
import { VaultRecommendationDataPanel, type VaultRecommendationManagedSource, type VaultWishlistActions } from "./VaultWishlistManager.js";
import { VaultRecommendationSourceManager } from "./VaultRecommendationSourceManager.js";

export type VaultRecommendationSourceState = {
  recommendationScan: VaultRecommendationScanState;
};

export function VaultRecommendationEvidencePanel(props: {
  sourceState?: VaultRecommendationSourceState;
  wishlistActions?: VaultWishlistActions;
  /** 页面级入口：不传按中文渲染，老调用点（含测试）不用改。 */
  interfaceLocale?: InterfaceLocale;
  onCopyAuditReport?: () => void | Promise<void>;
  onManagedSourcesChange?: (sources: readonly VaultRecommendationManagedSource[]) => void;
}) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").vault;
  const [feedback, setFeedback] = useState<{ tone: "ready" | "error"; message: string } | null>(null);
  // 导入面板与来源管理各持一份快照；导入改动了存储就自增，让下面那份重读。
  const [storedSourcesRevision, setStoredSourcesRevision] = useState(0);
  const scan = props.sourceState?.recommendationScan;

  return (
    <section className="vault-evidence-panel" data-surface="section" aria-label={vaultText(copy, "推荐来源")}>
      <div className="vault-column-head">
        <div><h3>{vaultText(copy, "推荐来源管理")}</h3><span>{vaultText(copy, "导入与导出直接在本页完成；来源规则明细点击“查看详情”在弹框中查看。装备命中筛选与来源证据在“浏览装备”中查看。")}</span></div>
      </div>
      {feedback ? <p className={`status-message status-${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.message}</p> : null}
      {props.wishlistActions ? (
        <VaultRecommendationDataPanel
          copy={copy}
          actions={props.wishlistActions}
          showManagement={false}
          onApplied={(message: string) => setFeedback({ tone: "ready", message })}
          onStoredSourcesChanged={() => setStoredSourcesRevision((revision) => revision + 1)}
        />
      ) : null}
      <div className="vault-recommendation-summary" data-ui-kind="callout" data-status="neutral">
        <span>{formatRecommendationScanDetail(copy, scan)}</span>
      </div>
      {props.wishlistActions ? <VaultRecommendationSourceManager copy={copy} actions={props.wishlistActions} sourcesRevision={storedSourcesRevision} onApplied={(message) => setFeedback({ tone: "ready", message })} onSourcesChange={props.onManagedSourcesChange} onCopyAuditReport={props.onCopyAuditReport} /> : <div className="vault-evidence-empty" data-surface="empty"><strong>{vaultText(copy, "当前平台不支持来源管理")}</strong><span>{vaultText(copy, "请使用支持导入和来源管理的桌面端。")}</span></div>}
    </section>
  );
}

function formatRecommendationScanDetail(copy: VaultCopy, scan?: VaultRecommendationScanState): string {
  if (!scan) return vaultText(copy, "尚未核对账号武器的推荐来源。");
  if (scan.phase === "scanning") return vaultTemplate(copy, "正在核对 {count} 件账号武器…", { count: scan.total_weapon_count });
  if (scan.phase === "error") return vaultText(copy, "账号武器推荐来源核对失败。");
  if (scan.phase === "partial") return vaultTemplate(copy, "当前保留 {count} 件上次核对结果。", { count: scan.retained_result_count });
  // 按结构化原因给出下一步动作，不从错误字符串推断。
  if (hasRecommendationIssue(scan, "recommendation_unavailable")) {
    return vaultText(copy, "尚未导入任何推荐来源；当前只核对本机愿望单与自定义推荐，导入推荐 CSV 后才会参与核对。");
  }
  if (scan.phase === "complete") {
    return vaultTemplate(copy, "已核对 {scanned}/{total} 件账号武器，{covered} 件有推荐来源覆盖。", {
      scanned: scan.scanned_weapon_count,
      total: scan.total_weapon_count,
      covered: scan.covered_weapon_count
    });
  }
  return scan.message ?? vaultText(copy, "尚未核对账号武器的推荐来源。");
}

function hasRecommendationIssue(
  scan: VaultRecommendationScanState,
  code: VaultRecommendationScanState["blocking_reason"]
): boolean {
  if (!code) return false;
  return scan.blocking_reason === code || Boolean(scan.issues?.some((issue) => issue.code === code));
}
