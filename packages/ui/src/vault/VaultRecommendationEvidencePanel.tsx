import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { VaultRecommendationScanState } from "@d2-tools/app/account";
import type {
  LocalCommunityRecommendationTable,
  VaultItemInstanceMatchInfo
} from "@d2-tools/core/community-perks";
import type { VaultTags } from "@d2-tools/core/vault/tags";
import type { LoadoutTemplateLookup } from "@d2-tools/app/loadouts";
import { getAccountItemSlotLabel, getVaultItemLocationLabel } from "@d2-tools/app/vault";
import { useEffect, useMemo, useState } from "react";
import { ControlButton } from "../control/ControlButton.js";
import { VaultWishlistManager, type VaultWishlistActions } from "./VaultWishlistManager.js";
import {
  formatRecommendationPurposes,
  getVaultCommunityInstanceKey,
  hasPositiveRecommendationSummary,
  type VaultRecommendationSourceSummary,
  type VaultRecommendationSummaryIndex
} from "./vaultRecommendationMatch.js";

export type VaultRecommendationSourceState = {
  recommendationScan: VaultRecommendationScanState;
  customRules: LocalCommunityRecommendationTable | null;
  customRulesLoadState: "loading" | "ready" | "error";
  customRulesLoadError?: string;
};

export function VaultRecommendationEvidencePanel(props: {
  items: AccountItemSummary[];
  tags: VaultTags;
  wishlist?: DimWishlist | null;
  communityInstanceMatch?: Map<string, VaultItemInstanceMatchInfo>;
  recommendationSummaryByInstance?: VaultRecommendationSummaryIndex;
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  sourceState?: VaultRecommendationSourceState;
  wishlistActions?: VaultWishlistActions;
  canOrganizeItem?: (item: AccountItemSummary) => boolean;
  onCopyAuditReport?: () => void | Promise<void>;
  onOpenItem: (item: AccountItemSummary) => void;
  onOrganizeItem?: (item: AccountItemSummary) => void;
}) {
  const [isWishlistManagerOpen, setIsWishlistManagerOpen] = useState(false);
  const [panelFeedback, setPanelFeedback] = useState<{ tone: "ready" | "error"; message: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<RecommendationEvidenceFilter>("all");
  const [visibleLimit, setVisibleLimit] = useState(200);
  const recommendationScan = props.sourceState?.recommendationScan;
  const rows = useMemo(() => buildInstanceWeaponRows(
    props.items,
    props.recommendationSummaryByInstance,
    recommendationScan?.phase === "complete",
    props.tags
  ), [props.items, props.recommendationSummaryByInstance, props.tags, recommendationScan?.phase]);
  const rowMetrics = useMemo(() => summarizeRecommendationRows(rows), [rows]);
  const { coveredRows, positiveInstanceCount, conflictInstanceCount, uncheckableInstanceCount, reviewInstanceCount, sourceLabels } = rowMetrics;
  const sourceState = props.sourceState;
  const hasInstanceScan = Boolean(props.communityInstanceMatch?.size) || recommendationScan?.phase === "complete";
  const hasConfiguredSource = Boolean(
    (recommendationScan && recommendationScan.phase !== "idle")
    || hasInstanceScan
    || props.wishlist
    || sourceState?.customRules
  );
  const emptyState = recommendationEvidenceEmptyState(recommendationScan, hasConfiguredSource);
  const recommendationUnavailable = recommendationScan?.blocking_reason === "recommendation_unavailable"
    || recommendationScan?.issues?.some((issue) => issue.code === "recommendation_unavailable");
  const sourceMissing = !coveredRows.length
    && !props.wishlist
    && !sourceState?.customRules
    && (!hasConfiguredSource || recommendationUnavailable);
  const filterOptions = useMemo(() => recommendationFilterOptions(rows), [rows]);
  const filteredRows = useMemo(
    () => rows.filter((row) => matchesRecommendationFilter(row, activeFilter)),
    [activeFilter, rows]
  );
  const visibleRows = filteredRows.slice(0, visibleLimit);

  useEffect(() => {
    setVisibleLimit(200);
  }, [activeFilter]);

  return (
    <section className="vault-evidence-panel" data-surface="section" aria-label="推荐 Roll 匹配">
      <div className="vault-column-head">
        <div><h3>武器推荐</h3><span>按每一件实际武器核对来源要求，结果只提供证据，不替你决定分解</span></div>
        <div className="button-row">
          {props.onCopyAuditReport ? <ControlButton size="compact" variant="quiet" onClick={() => {
            setPanelFeedback(null);
            void Promise.resolve(props.onCopyAuditReport?.()).then(
              () => setPanelFeedback({ tone: "ready", message: "只读验收报告已复制。" }),
              () => setPanelFeedback({ tone: "error", message: "复制失败，请稍后重试。" })
            );
          }}>复制验收报告</ControlButton> : null}
          {props.wishlistActions ? <ControlButton size="compact" variant="secondary" onClick={() => setIsWishlistManagerOpen(true)}>管理推荐数据</ControlButton> : null}
        </div>
      </div>

      {panelFeedback ? <p className={`status-message status-${panelFeedback.tone}`} role={panelFeedback.tone === "error" ? "alert" : "status"}>{panelFeedback.message}</p> : null}

      {isWishlistManagerOpen && props.wishlistActions ? (
        <VaultWishlistManager
          wishlist={props.wishlist}
          actions={props.wishlistActions}
          onApplied={(message) => setPanelFeedback({ tone: "ready", message })}
          onClose={() => setIsWishlistManagerOpen(false)}
        />
      ) : null}

      {sourceMissing ? (
        <div className="vault-recommendation-setup" data-ui-kind="state-frame" data-surface="frame">
          <div>
            <span className="ui-badge" data-ui-kind="status-chip" data-status="warning">尚未准备推荐数据</span>
            <h3>先导入武器推荐数据，再核对仓库</h3>
            <p>选择正式的“武器推荐.csv”后，应用会自动核对账号中的每一件武器；DIM 社区推荐可以作为可选补充。</p>
          </div>
          {props.wishlistActions ? <ControlButton variant="primary" onClick={() => setIsWishlistManagerOpen(true)}>导入武器推荐数据</ControlButton> : null}
          <small>导入只更新本机推荐资料，不会修改、转移、解锁或分解游戏装备。</small>
        </div>
      ) : null}

      <div className="vault-recommendation-explainer" data-ui-kind="callout" data-status="neutral">
        <strong>这些结果怎么看？</strong>
        <span>“全部符合”表示当前 Roll 拥有该来源列出的所有推荐项；“符合 5/6”表示 6 项中符合 5 项。DIM 按完整推荐组合核对，显示符合几套，或最接近的一套还缺几项。这些是匹配结果，不是武器评分。</span>
      </div>

      <div className="vault-evidence-metrics" data-ui-kind="status-matrix" data-surface="frame">
        <div><span>已核对账号武器</span><strong>{recommendationScan?.scanned_weapon_count ?? 0}/{recommendationScan?.total_weapon_count ?? props.items.filter((item) => item.group_key === "weapons").length}</strong><small>{formatRecommendationScanDetail(recommendationScan)}</small></div>
        <div><span>已有来源记录</span><strong>{coveredRows.length} 件</strong><small>{sourceLabels.length ? `${sourceLabels.length} 个来源出现在当前账号` : recommendationScanMetricDetail(recommendationScan)}</small></div>
        <div><span>存在符合项</span><strong>{positiveInstanceCount} 件</strong><small>至少一个来源有符合项或仅推荐武器</small></div>
        <div><span>需要人工复查</span><strong>{reviewInstanceCount} 件</strong><small>来源结论不同 {conflictInstanceCount} 件 · 数据不完整 {uncheckableInstanceCount} 件</small></div>
      </div>

      <div className="vault-evidence-source-strip" data-surface="list" aria-label="匹配数据状态">
        <RecommendationScanSourceState scan={recommendationScan} hasInstanceScan={hasInstanceScan} />
        <SourceState label="DIM 社区推荐" enabled={Boolean(props.wishlist)} detail={props.wishlist ? `${props.wishlist.title} · ${props.wishlist.rules.length} 条规则` : "未配置"} />
        {sourceState?.customRules ? <SourceState label="遗留自定义规则" enabled detail={formatCustomSourceState(sourceState)} compatibility /> : null}
        {sourceState?.customRulesLoadState === "error" ? <SourceState label="遗留推荐数据" enabled={false} status="error" detail={formatCustomSourceState(sourceState)} /> : null}
      </div>

      {rows.length ? (
        <>
          <div className="vault-evidence-filter-bar">
            <div className="vault-evidence-filters" role="group" aria-label="筛选武器推荐结果">
              {filterOptions.map((option) => (
                <button type="button" key={option.key} aria-pressed={activeFilter === option.key} onClick={() => setActiveFilter(option.key)}>{option.label} <strong>{option.count}</strong></button>
              ))}
            </div>
            <small>这些是查看条件，不是评级；同一把武器可能同时出现在“有符合项”和“来源冲突”中。</small>
          </div>
          <div className="vault-evidence-results" data-surface="list">
            {visibleRows.map((row) => {
              const visibleSummaries = row.summaries.slice(0, 2);
              const hiddenSourceCount = Math.max(0, row.summaries.length - visibleSummaries.length);
              const protectionFacts = [
                row.item.locked ? "已锁定" : "",
                row.item.instance_id && props.highlightedItemKeys?.instanceIds.has(row.item.instance_id) ? "配装引用" : ""
              ].filter(Boolean);
              return (
                <article data-surface="row" key={row.key} className="vault-evidence-result-row">
                  <button type="button" className="vault-evidence-result-identity" onClick={() => props.onOpenItem(row.item)}>
                    <strong>{row.item.name}</strong>
                    <small>{formatWeaponInstanceMeta(row.item, protectionFacts)}</small>
                    {row.dispositionLabel ? <small>人工标记：{row.dispositionLabel}</small> : null}
                  </button>
                  <span className="vault-evidence-result-sources" aria-label={`${row.item.name}的推荐 Roll 匹配`}>
                    {visibleSummaries.length ? visibleSummaries.map((summary) => (
                      <span className="vault-evidence-source-match" data-match-state={summary.state} key={summary.sourceId} title={summary.detail}>{summary.text}</span>
                    )) : <span className="vault-evidence-source-match" data-match-state="not-covered">没有来源记录</span>}
                    {hiddenSourceCount ? <small>另有 {hiddenSourceCount} 个来源</small> : null}
                  </span>
                  <span className="vault-evidence-result-purpose"><small>用途</small><strong>{formatRecommendationPurposes(row.purposes)}</strong></span>
                  <span className="vault-evidence-result-actions">
                    <ControlButton size="compact" variant="quiet" onClick={() => props.onOpenItem(row.item)}>查看详细证据</ControlButton>
                    {props.onOrganizeItem && props.canOrganizeItem?.(row.item) ? <ControlButton size="compact" variant="secondary" onClick={() => props.onOrganizeItem?.(row.item)}>整理同名武器</ControlButton> : null}
                  </span>
                </article>
              );
            })}
          </div>
          {!filteredRows.length ? <div className="vault-evidence-empty" data-surface="empty"><strong>当前分类没有武器</strong><span>请选择其他推荐结果分类。</span></div> : null}
          {visibleRows.length < filteredRows.length ? <div className="vault-evidence-load-more"><span>已显示 {visibleRows.length}/{filteredRows.length} 件</span><ControlButton size="compact" variant="secondary" onClick={() => setVisibleLimit((current) => current + 200)}>加载更多</ControlButton></div> : null}
        </>
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
  disposition?: "keep" | "review" | "junk" | "farm" | "loadout";
  dispositionLabel?: string;
};

type RecommendationEvidenceFilter = "all" | "covered" | "matched" | "zero" | "conflict" | "uncheckable" | "uncovered" | "organized";

function summarizeRecommendationRows(rows: InstanceWeaponRow[]) {
  const coveredRows = rows.filter((row) => row.summaries.length > 0);
  const positiveInstanceCount = coveredRows.filter((row) => row.summaries.some(hasPositiveRecommendationSummary)).length;
  const conflictInstanceCount = coveredRows.filter(hasRecommendationConflict).length;
  const uncheckableInstanceCount = coveredRows.filter((row) => (
    row.summaries.some((summary) => summary.state === "uncheckable")
  )).length;
  const reviewInstanceCount = coveredRows.filter((row) => (
    hasRecommendationConflict(row)
    || row.summaries.some((summary) => summary.state === "uncheckable")
  )).length;
  const sourceLabels = [...new Set(coveredRows.flatMap((row) => (
    row.summaries.map((summary) => summary.sourceLabel)
  )))];
  return {
    coveredRows,
    positiveInstanceCount,
    conflictInstanceCount,
    uncheckableInstanceCount,
    reviewInstanceCount,
    sourceLabels
  };
}

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
    return <SourceState label="中文武器推荐" enabled={props.hasInstanceScan} detail={props.hasInstanceScan ? "账号实例对照已读取" : "尚未完成账号实例对照"} />;
  }
  if (scan.phase === "scanning") {
    return <SourceState label="中文武器推荐" enabled={Boolean(scan.retained_result_count)} status="loading" stateLabel="核对中" detail={formatRecommendationScanDetail(scan)} />;
  }
  if (scan.phase === "partial") {
    return <SourceState label="中文武器推荐" enabled={Boolean(scan.retained_result_count)} status="warning" stateLabel="部分可用" detail={formatRecommendationScanDetail(scan)} />;
  }
  if (scan.phase === "complete") {
    return <SourceState label="中文武器推荐" enabled status="ready" stateLabel="已完成" detail={formatRecommendationScanDetail(scan)} />;
  }
  if (scan.phase === "error") {
    return <SourceState label="中文武器推荐" enabled={false} status="error" stateLabel="核对失败" detail={formatRecommendationScanDetail(scan)} />;
  }
  return <SourceState label="中文武器推荐" enabled={false} stateLabel="未开始" detail="进入仓库后开始核对账号武器。" />;
}

function formatRecommendationScanDetail(scan?: VaultRecommendationScanState): string {
  if (!scan) return "尚未开始账号武器推荐来源核对。";
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
        ? "正在重新核对每件武器的推荐 Roll；完成前继续保留上次可用结果。"
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
  recommendationSummaryByInstance?: VaultRecommendationSummaryIndex,
  includeUncovered = false,
  tags?: VaultTags
): InstanceWeaponRow[] {
  return items
    .filter((item) => item.group_key === "weapons")
    .flatMap((item, index) => {
      const instanceKey = getVaultCommunityInstanceKey(item);
      const summaries = recommendationSummaryByInstance?.get(instanceKey) ?? [];
      if (!summaries.length && !includeUncovered) return [];
      const disposition = tags?.items[instanceKey]?.tag;
      return [{
        key: item.instance_id ? `instance:${item.instance_id}` : `${instanceKey}:${index}`,
        item,
        summaries,
        purposes: [...new Set(summaries.flatMap((summary) => summary.purposes))],
        ...(disposition ? { disposition, dispositionLabel: dispositionLabel(disposition) } : {})
      }];
    })
    .sort((left, right) => {
      const coverageDifference = Number(right.summaries.length > 0) - Number(left.summaries.length > 0);
      if (coverageDifference) return coverageDifference;
      const positiveDifference = Number(right.summaries.some(hasPositiveRecommendationSummary))
        - Number(left.summaries.some(hasPositiveRecommendationSummary));
      return positiveDifference || left.item.name.localeCompare(right.item.name, "zh-Hans-CN") || left.key.localeCompare(right.key);
    });
}

function recommendationFilterOptions(rows: InstanceWeaponRow[]): Array<{ key: RecommendationEvidenceFilter; label: string; count: number }> {
  const options: Array<{ key: RecommendationEvidenceFilter; label: string }> = [
    { key: "all", label: "全部武器" },
    { key: "covered", label: "有来源记录" },
    { key: "matched", label: "有符合项" },
    { key: "zero", label: "未符合" },
    { key: "conflict", label: "来源结论不同" },
    { key: "uncheckable", label: "数据不完整" },
    { key: "uncovered", label: "无来源记录" },
    { key: "organized", label: "有人工标记" }
  ];
  return options.map((option) => ({
    ...option,
    count: rows.filter((row) => matchesRecommendationFilter(row, option.key)).length
  }));
}

function matchesRecommendationFilter(row: InstanceWeaponRow, filter: RecommendationEvidenceFilter): boolean {
  const hasPositive = row.summaries.some(hasPositiveRecommendationSummary);
  const hasDifferent = row.summaries.some((summary) => summary.state === "different");
  const hasUncheckable = row.summaries.some((summary) => summary.state === "uncheckable");
  if (filter === "all") return true;
  if (filter === "covered") return row.summaries.length > 0;
  if (filter === "matched") return hasPositive;
  if (filter === "zero") return row.summaries.length > 0 && !hasPositive && hasDifferent;
  if (filter === "conflict") return hasRecommendationConflict(row);
  if (filter === "uncheckable") return hasUncheckable;
  if (filter === "uncovered") return row.summaries.length === 0;
  return Boolean(row.disposition);
}

function hasRecommendationConflict(row: InstanceWeaponRow): boolean {
  return row.summaries.some(hasPositiveRecommendationSummary)
    && row.summaries.some((summary) => summary.state === "different");
}

function dispositionLabel(value: NonNullable<InstanceWeaponRow["disposition"]>): string {
  if (value === "keep") return "保留";
  if (value === "review") return "待复查";
  if (value === "junk") return "待处理";
  if (value === "farm") return "待刷";
  return "配装用";
}

function formatWeaponInstanceMeta(item: AccountItemSummary, protectionFacts: string[]): string {
  return [
    item.item_type || "武器",
    getAccountItemSlotLabel(item),
    getVaultItemLocationLabel(item),
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
