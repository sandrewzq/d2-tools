import type { KeyboardEvent, ReactNode } from "react";
import type {
  LibraryWeeklyFarmingItemView,
  LibraryWeeklyFarmingView
} from "@d2-tools/app/library";
import { formatStandardDateTime } from "../time/formatTime.js";
import { GameAssetImage } from "../media/GameAssetImage.js";
import { ProductWorkspaceEmptyState } from "../workspace/ProductWorkspace.js";

export type WeeklyFarmingPanelActions = {
  onRefreshWeeklyRotation: () => void;
  onRefreshWeeklyFarming: () => void;
  onOpenWeeklyFarmingItem: (item: LibraryWeeklyFarmingItemView) => void;
};

export function WeeklyFarmingPanel(props: {
  weekly: LibraryWeeklyFarmingView;
  actions: WeeklyFarmingPanelActions;
  compact?: boolean;
}): ReactNode {
  const { weekly, actions } = props;
  const resetLabel = weekly.resetAt
    ? formatStandardDateTime(weekly.resetAt)
    : "等待本周轮换数据";
  const fetchedLabel = weekly.fetchedAt
    ? formatStandardDateTime(weekly.fetchedAt)
    : "尚未读取";

  return (
    <div className={`library-weekly-panel${props.compact ? " library-weekly-panel--compact" : ""}`}>
      <div className="library-weekly-summary" data-ui-kind="summary-frame">
        <div className="library-column-head">
          <div>
            <h3>本周判断</h3>
            <span>{weekly.activityCount} 个活动 · {weekly.itemCount} 件已核对</span>
          </div>
          <span className={`ui-badge status-${weekly.isLoading || weekly.isRefreshingRotation ? "pending" : weekly.error || weekly.rotationError || weekly.recommendationError ? "warning" : "ready"}`} data-ui-kind="status-chip" role="status" aria-live="polite">
            {weekly.isLoading || weekly.isRefreshingRotation ? "更新中" : `${weekly.actionableCount} 项建议`}
          </span>
        </div>
        <dl>
          <div><dt>建议继续刷</dt><dd className="status-warning">{weekly.actionableCount}</dd></div>
          <div><dt>图样有缺口</dt><dd>{weekly.patternGapCount}</dd></div>
          <div><dt>已有合格结果</dt><dd className="status-ready">{weekly.satisfiedCount}</dd></div>
          <div><dt>下次周重置</dt><dd>{resetLabel}</dd></div>
        </dl>
        <div className="library-weekly-refresh">
          <span>本次读取：{fetchedLabel}</span>
          <span>掉落关系：{weekly.revision ?? "尚未载入"}</span>
          <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={weekly.isRefreshingRotation} aria-busy={weekly.isRefreshingRotation} onClick={actions.onRefreshWeeklyRotation}>
            {weekly.isRefreshingRotation ? "轮换更新中..." : "刷新本周轮换"}
          </button>
          <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={weekly.isLoading} aria-busy={weekly.isLoading} onClick={actions.onRefreshWeeklyFarming}>
            {weekly.isLoading ? "核对中..." : "重新核对图样与推荐"}
          </button>
        </div>
      </div>

      <div className="library-weekly-content" aria-busy={weekly.isLoading || weekly.isRefreshingRotation}>
        <div className="library-results-head">
          <div><h3>本周刷取清单</h3><span>活动来源 + 推荐 Roll + 账号持有 + 图样进度</span></div>
        </div>
        <p className="library-result-note">这里只回答“为了获得值得使用或可制作的装备，本周刷什么”；提高光等仍以账号页的光等路线为准。</p>
        {(weekly.isLoading || weekly.isRefreshingRotation) && weekly.activities.length ? <p className="status-message status-pending" role="status">正在重新核对，暂时保留上一次已确认清单。</p> : null}
        {weekly.error ? <p className="status-message status-warning" role="status">本周轮换或图样数据无法更新：{weekly.error}。以下保留上一份已确认结果。</p> : null}
        {weekly.rotationError ? <p className="status-message status-warning" role="status">本周轮换无法更新：{weekly.rotationError}。以下保留上一份轮换结果。</p> : null}
        {weekly.recommendationError ? <p className="status-message status-warning" role="status">T20 推荐暂时无法核对：{weekly.recommendationError}。账号持有与图样数据仍可查看。</p> : null}
        {weekly.warnings.map((warning) => <p className="status-message status-warning" role="status" key={warning}>{warning}</p>)}
        {!weekly.activities.length ? (
          <ProductWorkspaceEmptyState className="library-empty-state">
            <strong>{weekly.isLoading || weekly.isRefreshingRotation ? "正在读取本周轮换与掉落关系" : "本周清单暂不可用"}</strong>
            <span>{weekly.isLoading || weekly.isRefreshingRotation ? "读取完成前不会用缓存数量或固定周期猜测结果。" : "首页轮换尚未返回，或当前轮换还没有完成可靠的掉落关系核对。"}</span>
          </ProductWorkspaceEmptyState>
        ) : (
          <div className="library-weekly-activities">
            {weekly.activities.map((activity) => (
              <section className="library-weekly-activity" key={activity.key} aria-labelledby={`library-weekly-${activity.key}`}>
                <header>
                  <div>
                    <span className="library-weekly-kicker">{activity.kind === "raid" ? "轮换突袭" : "轮换地牢"}</span>
                    <h3 id={`library-weekly-${activity.key}`}>{activity.title}</h3>
                    <p>{activity.rotationSource} · {activity.coverageNote}</p>
                  </div>
                  <div className="library-weekly-activity-counts" aria-label="活动判断摘要">
                    <span>{activity.itemCount} 件已核对</span>
                    <strong>{activity.actionableCount} 件建议继续</strong>
                    <span>{activity.patternGapCount} 件图样有缺口</span>
                  </div>
                </header>
                {activity.coverage === "not_covered" ? (
                  <ProductWorkspaceEmptyState className="library-weekly-coverage-empty">
                    <strong>轮换已确认，掉落关系尚未核对</strong>
                    <span>当前不会根据名称、活动奖励预览或历史印象猜测掉落装备。</span>
                  </ProductWorkspaceEmptyState>
                ) : (
                  <div className="library-weekly-items" role="list">
                    {activity.items.map((item) => renderWeeklyFarmingItem(item, actions))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function renderWeeklyFarmingItem(row: LibraryWeeklyFarmingItemView, actions: WeeklyFarmingPanelActions): ReactNode {
  const decisionClass = weeklyFarmingDecisionClass(row.decision);
  return (
    <article className="library-weekly-item" key={row.item.hash} role="listitem">
      <GameAssetImage className="library-weekly-item-icon" alt="" loading="lazy" src={row.item.icon} fallback={<span className="library-result-icon-placeholder" aria-hidden="true" />} />
      <div className="library-weekly-item-body">
        <div className="library-weekly-item-title">
          <div><h4>{row.item.name}</h4><span>{[row.item.item_type ?? "武器", formatWeeklyVariant(row.item.variant)].filter(Boolean).join(" · ")}</span></div>
          <span className={`app-chip ${decisionClass}`}>{row.decisionLabel}</span>
        </div>
        <p className="library-weekly-decision">{row.decisionDetail}</p>
        <div className="library-weekly-facts">
          <span><strong>推荐</strong>{row.recommendationLabel}</span>
          <span><strong>图样</strong>{row.patternLabel}</span>
          <span><strong>账号持有</strong>{row.ownedCount ? `${row.ownedCount} 件` : "未持有"}</span>
          <span><strong>当前最佳</strong>{row.bestInstance?.label ?? (row.ownedCount ? "等待实例核对" : "无实例")}</span>
        </div>
        {row.item.pattern.status === "in_progress" ? <div className="library-weekly-pattern-progress"><progress value={row.item.pattern.progress} max={row.item.pattern.completion_value} aria-label={`${row.item.name} 图样进度`} /><span>{row.patternDetail}</span></div> : null}
        <details className="library-source-details library-weekly-evidence">
          <summary><strong>判断依据</strong><span>{row.ownedLocations.join(" · ") || "账号未持有"}</span></summary>
          <dl className="library-version-source">
            <div><dt>活动来源</dt><dd>{row.item.source_label}</dd></div>
            <div><dt>来源范围</dt><dd>{formatWeeklyDropScope(row.item.drop_scope)}；只确认活动级归属，不保证指定遭遇战掉落。</dd></div>
            <div><dt>推荐核对</dt><dd>{row.recommendationLabel}</dd></div>
            <div><dt>图样状态</dt><dd>{row.patternDetail}</dd></div>
            <div><dt>证据确认</dt><dd>{row.item.verified_at} · {row.item.source_license}</dd></div>
            {row.bestInstance ? <div><dt>当前最佳实例</dt><dd>{row.bestInstance.detail}</dd></div> : null}
          </dl>
        </details>
      </div>
      <div className="library-weekly-item-action">
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => actions.onOpenWeeklyFarmingItem(row)} onKeyDown={handleWeeklyFarmingItemKeyDown}>查看装备与推荐</button>
      </div>
    </article>
  );
}

function handleWeeklyFarmingItemKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
  const currentRow = event.currentTarget.closest<HTMLElement>(".library-weekly-item");
  const content = currentRow?.closest<HTMLElement>(".library-weekly-content");
  if (!currentRow || !content) return;
  const rows = [...content.querySelectorAll<HTMLElement>(".library-weekly-item")];
  const currentIndex = rows.indexOf(currentRow);
  const nextRow = rows[currentIndex + (event.key === "ArrowDown" ? 1 : -1)];
  const nextButton = nextRow?.querySelector<HTMLButtonElement>(".library-weekly-item-action button");
  if (!nextButton) return;
  event.preventDefault();
  nextButton.focus();
}

function weeklyFarmingDecisionClass(decision: LibraryWeeklyFarmingItemView["decision"]): string {
  switch (decision) {
    case "satisfied":
    case "qualified_roll": return "status-ready";
    case "complete_pattern":
    case "worth_farming": return "status-warning";
    case "information_insufficient": return "status-pending";
  }
}

function formatWeeklyDropScope(scope: LibraryWeeklyFarmingItemView["item"]["drop_scope"]): string {
  switch (scope) {
    case "final_chest": return "最终宝箱候选";
    case "secret_chest": return "隐藏宝箱候选";
    case "challenge": return "挑战候选";
    case "encounter": return "遭遇战候选";
    case "activity": return "活动掉落候选";
  }
}

function formatWeeklyVariant(variant: LibraryWeeklyFarmingItemView["item"]["variant"]): string {
  switch (variant) {
    case "normal": return "";
    case "reprised": return "复刻版本";
    case "adept": return "专家版本";
    case "timelost": return "失时版本";
    case "harrowed": return "苦难版本";
    case "other": return "特殊版本";
  }
}
