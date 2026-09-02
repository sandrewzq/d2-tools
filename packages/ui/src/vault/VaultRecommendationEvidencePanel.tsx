import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { VaultRecommendationScanState } from "@d2-tools/app/account";
import type {
  LocalCommunityRecommendationTable,
  VaultItemInstanceMatchInfo
} from "@d2-tools/core/community-perks";
import type { LoadoutTemplateLookup } from "@d2-tools/app/loadouts";
import { useMemo, useState } from "react";
import { ControlButton } from "../control/ControlButton.js";
import { VaultWishlistManager, type VaultWishlistActions } from "./VaultWishlistManager.js";
import {
  buildVaultRecommendationSourceSummaries,
  formatRecommendationPurposes,
  getVaultCommunityInstanceKey,
  hasPositiveRecommendationSummary,
  type VaultRecommendationSourceSummary
} from "./vaultRecommendationMatch.js";

export type VaultRecommendationSourceState = {
  recommendationScan: VaultRecommendationScanState;
  customRules: LocalCommunityRecommendationTable | null;
  customRulesLoadState: "loading" | "ready" | "error";
  customRulesLoadError?: string;
};

export function VaultRecommendationEvidencePanel(props: {
  items: AccountItemSummary[];
  wishlist?: DimWishlist | null;
  communityInstanceMatch?: Map<string, VaultItemInstanceMatchInfo>;
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  sourceState?: VaultRecommendationSourceState;
  wishlistActions?: VaultWishlistActions;
  onCopyAuditReport?: () => void | Promise<void>;
  onOpenItem: (item: AccountItemSummary) => void;
}) {
  const [isWishlistManagerOpen, setIsWishlistManagerOpen] = useState(false);
  const [auditFeedback, setAuditFeedback] = useState("");
  const rows = useMemo(() => buildInstanceWeaponRows(
    props.items,
    props.communityInstanceMatch,
    props.wishlist
  ), [props.communityInstanceMatch, props.items, props.wishlist]);
  const positiveInstanceCount = rows.filter((row) => row.summaries.some(hasPositiveRecommendationSummary)).length;
  const uncheckableInstanceCount = rows.filter((row) => row.summaries.some((summary) => summary.state === "uncheckable")).length;
  const sourceLabels = [...new Set(rows.flatMap((row) => row.summaries.map((summary) => summary.sourceLabel)))];
  const sourceState = props.sourceState;
  const recommendationScan = sourceState?.recommendationScan;
  const hasInstanceScan = Boolean(props.communityInstanceMatch?.size) || recommendationScan?.phase === "complete";
  const hasConfiguredSource = Boolean(
    (recommendationScan && recommendationScan.phase !== "idle")
    || hasInstanceScan
    || props.wishlist
    || sourceState?.customRules
  );
  const emptyState = recommendationEvidenceEmptyState(recommendationScan, hasConfiguredSource);

  return (
    <section className="vault-evidence-panel" data-surface="section" aria-label="推荐来源对照">
      <div className="vault-column-head">
        <div><h3>推荐来源对照</h3><span>一行一件武器实例，各来源独立核对</span></div>
        <div className="button-row">
          {props.onCopyAuditReport ? <ControlButton size="compact" variant="quiet" onClick={() => {
            setAuditFeedback("");
            void Promise.resolve(props.onCopyAuditReport?.()).then(
              () => setAuditFeedback("只读验收报告已复制。"),
              () => setAuditFeedback("复制失败，请稍后重试。")
            );
          }}>复制验收报告</ControlButton> : null}
          {props.wishlistActions ? <ControlButton size="compact" variant="quiet" onClick={() => setIsWishlistManagerOpen((current) => !current)}>{isWishlistManagerOpen ? "收起推荐数据" : "管理推荐数据"}</ControlButton> : null}
        </div>
      </div>

      {auditFeedback ? <p className="status-message status-pending" role="status">{auditFeedback}</p> : null}

      {isWishlistManagerOpen && props.wishlistActions ? <VaultWishlistManager wishlist={props.wishlist} actions={props.wishlistActions} onClose={() => setIsWishlistManagerOpen(false)} /> : null}

      <div className="vault-evidence-metrics" data-ui-kind="status-matrix" data-surface="frame">
        <div><span>已有来源记录</span><strong>{rows.length} 件</strong><small>{sourceLabels.length ? `${sourceLabels.length} 个来源出现在当前账号` : recommendationScanMetricDetail(recommendationScan)}</small></div>
        <div><span>存在符合项</span><strong>{positiveInstanceCount} 件</strong><small>至少一个来源有符合项或仅推荐武器</small></div>
        <div><span>无法核对</span><strong>{uncheckableInstanceCount} 件</strong><small>实例 Roll 或来源原文不足以确认</small></div>
      </div>

      <div className="vault-evidence-source-strip" data-surface="list" aria-label="匹配数据状态">
        <RecommendationScanSourceState scan={recommendationScan} hasInstanceScan={hasInstanceScan} />
        <SourceState label="DIM Wishlist" enabled={Boolean(props.wishlist)} detail={props.wishlist ? `${props.wishlist.title} · ${props.wishlist.rules.length} 条规则` : "未配置"} />
        {sourceState?.customRules ? <SourceState label="遗留自定义规则" enabled detail={formatCustomSourceState(sourceState)} compatibility /> : null}
        {sourceState?.customRulesLoadState === "error" ? <SourceState label="遗留推荐数据" enabled={false} status="error" detail={formatCustomSourceState(sourceState)} /> : null}
      </div>

      {rows.length ? (
        <div className="vault-evidence-results" data-surface="list">
          {rows.map((row) => {
            const visibleSummaries = row.summaries.slice(0, 2);
            const hiddenSourceCount = Math.max(0, row.summaries.length - visibleSummaries.length);
            const protectionFacts = [
              row.item.locked ? "已锁定" : "",
              row.item.instance_id && props.highlightedItemKeys?.instanceIds.has(row.item.instance_id) ? "配装引用" : ""
            ].filter(Boolean);
            return (
              <button type="button" data-surface="row" key={row.key} onClick={() => props.onOpenItem(row.item)}>
                <span className="vault-evidence-result-identity">
                  <strong>{row.item.name}</strong>
                  <small>{formatWeaponInstanceMeta(row.item, protectionFacts)}</small>
                </span>
                <span className="vault-evidence-result-sources" aria-label={`${row.item.name}的推荐来源对照`}>
                  {visibleSummaries.map((summary) => (
                    <span className="vault-evidence-source-match" data-match-state={summary.state} key={summary.sourceId} title={summary.detail}>{summary.text}</span>
                  ))}
                  {hiddenSourceCount ? <small>另有 {hiddenSourceCount} 个来源</small> : null}
                </span>
                <span className="vault-evidence-result-purpose"><small>用途</small><strong>{formatRecommendationPurposes(row.purposes)}</strong></span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="vault-evidence-empty" data-surface="empty">
          <strong>{emptyState.title}</strong>
          <span>{emptyState.detail}</span>
        </div>
      )}
    </section>
  );
}

type InstanceWeaponRow = {
  key: string;
  item: AccountItemSummary;
  summaries: VaultRecommendationSourceSummary[];
  purposes: Array<"pve" | "pvp" | "general">;
};

function SourceState(props: { label: string; enabled: boolean; status?: "loading" | "ready" | "warning" | "error"; stateLabel?: string; detail: string; compatibility?: boolean }) {
  const label = props.stateLabel ?? (props.status === "loading" ? "读取中" : props.status === "error" ? "读取失败" : props.compatibility ? "兼容读取" : props.enabled ? "已启用" : "未配置");
  const status = props.status === "error" ? "error" : props.status === "loading" || props.status === "warning" ? "warning" : props.enabled ? "success" : "neutral";
  return <div className="vault-evidence-source"><span><strong>{props.label}</strong><small>{props.detail}</small></span><span className="ui-badge" data-ui-kind="status-chip" data-status={status}>{label}</span></div>;
}

function RecommendationScanSourceState(props: {
  scan?: VaultRecommendationScanState;
  hasInstanceScan: boolean;
}) {
  const scan = props.scan;
  if (!scan) {
    return <SourceState label="推荐知识库" enabled={props.hasInstanceScan} detail={props.hasInstanceScan ? "账号实例对照已读取" : "尚未完成账号实例对照"} />;
  }
  if (scan.phase === "scanning") {
    return <SourceState label="推荐知识库" enabled={Boolean(scan.retained_result_count)} status="loading" stateLabel="核对中" detail={formatRecommendationScanDetail(scan)} />;
  }
  if (scan.phase === "partial") {
    return <SourceState label="推荐知识库" enabled={Boolean(scan.retained_result_count)} status="warning" stateLabel="部分可用" detail={formatRecommendationScanDetail(scan)} />;
  }
  if (scan.phase === "complete") {
    return <SourceState label="推荐知识库" enabled status="ready" stateLabel="已完成" detail={formatRecommendationScanDetail(scan)} />;
  }
  if (scan.phase === "error") {
    return <SourceState label="推荐知识库" enabled={false} status="error" stateLabel="核对失败" detail={formatRecommendationScanDetail(scan)} />;
  }
  return <SourceState label="推荐知识库" enabled={false} stateLabel="未开始" detail="进入仓库后开始核对账号武器。" />;
}

function formatRecommendationScanDetail(scan: VaultRecommendationScanState): string {
  if (scan.message) return scan.message;
  if (scan.phase === "complete") {
    return `已核对 ${scan.scanned_weapon_count}/${scan.total_weapon_count} 件账号武器，${scan.covered_weapon_count} 件有推荐来源覆盖。`;
  }
  if (scan.phase === "scanning") return `正在核对 ${scan.total_weapon_count} 件账号武器。`;
  if (scan.phase === "partial") return `当前保留 ${scan.retained_result_count} 件上次核对结果。`;
  if (scan.phase === "error") return "账号武器推荐来源核对失败。";
  return "尚未开始账号武器推荐来源核对。";
}

function recommendationScanMetricDetail(scan?: VaultRecommendationScanState): string {
  if (!scan || scan.phase === "idle") return "尚未开始账号实例核对";
  if (scan.phase === "scanning") return scan.retained_result_count ? "正在重新核对，暂时显示上次结果" : "正在核对账号武器";
  if (scan.phase === "partial") return "本次核对未完整完成";
  if (scan.phase === "error") return "推荐来源核对失败";
  return "已完成核对，当前账号暂无来源记录";
}

function recommendationEvidenceEmptyState(
  scan: VaultRecommendationScanState | undefined,
  hasConfiguredSource: boolean
): { title: string; detail: string } {
  if (scan?.phase === "scanning") {
    return {
      title: "正在核对账号武器",
      detail: scan.retained_result_count
        ? "正在重新生成实例来源对照；完成前继续保留上次可用结果。"
        : "核对完成后会在这里按武器实例显示各来源结果。"
    };
  }
  if (scan?.phase === "partial") {
    return {
      title: "当前只有部分可用结果",
      detail: scan.message ?? "本次核对没有完整完成，未显示的武器不能据此判断为没有推荐。"
    };
  }
  if (scan?.phase === "error") {
    return {
      title: "推荐来源核对失败",
      detail: scan.message ?? "当前没有可用的实例核对结果；已有推荐数据不会因此被删除。"
    };
  }
  if (scan?.phase === "complete") {
    return {
      title: "当前账号武器没有推荐来源记录",
      detail: "账号武器已完成核对；当前推荐数据没有收录这些武器，或来源没有形成可显示的要求。"
    };
  }
  return {
    title: hasConfiguredSource ? "尚未核对账号武器" : "尚未读取推荐数据",
    detail: hasConfiguredSource
      ? "进入仓库后会按武器实例核对现有推荐数据。"
      : "可在这里导入武器推荐知识库，或启用 DIM 社区愿望单。"
  };
}

function buildInstanceWeaponRows(
  items: AccountItemSummary[],
  instanceMatchMap?: Map<string, VaultItemInstanceMatchInfo>,
  wishlist?: DimWishlist | null
): InstanceWeaponRow[] {
  return items
    .filter((item) => item.group_key === "weapons")
    .flatMap((item, index) => {
      const instanceKey = getVaultCommunityInstanceKey(item);
      const instanceMatch = instanceMatchMap?.get(instanceKey);
      const summaries = buildVaultRecommendationSourceSummaries(item, instanceMatch, wishlist);
      if (!summaries.length) return [];
      return [{
        key: item.instance_id ? `instance:${item.instance_id}` : `${instanceKey}:${index}`,
        item,
        summaries,
        purposes: [...new Set(summaries.flatMap((summary) => summary.purposes))]
      }];
    })
    .sort((left, right) => {
      const positiveDifference = Number(right.summaries.some(hasPositiveRecommendationSummary))
        - Number(left.summaries.some(hasPositiveRecommendationSummary));
      return positiveDifference || left.item.name.localeCompare(right.item.name, "zh-Hans-CN") || left.key.localeCompare(right.key);
    });
}

function formatWeaponInstanceMeta(item: AccountItemSummary, protectionFacts: string[]): string {
  return [
    item.item_type || "武器",
    item.bucket_name,
    item.power !== undefined ? `光等 ${item.power}` : "",
    ...protectionFacts
  ].filter(Boolean).join(" · ");
}

function formatCustomSourceState(sourceState?: VaultRecommendationSourceState): string {
  if (!sourceState || sourceState.customRulesLoadState === "loading") return "正在读取本机规则";
  if (sourceState.customRulesLoadState === "error") return sourceState.customRulesLoadError || "本机规则读取失败";
  if (!sourceState.customRules) return "未配置";
  return `${sourceState.customRules.title} · ${sourceState.customRules.rules.length} 条规则`;
}
