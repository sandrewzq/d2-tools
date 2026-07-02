import type { DailySummary } from "../../api/types";
import {
  buildWeeklyDigestSections,
  formatDailySourceStatus
} from "../../utils/dailyShare";

export function DailySummaryPanel(props: {
  dailySummary: DailySummary | null;
  dailyMessage: string;
  dailyError: string;
  isLoading: boolean;
  onRefresh: () => void;
  onCopyDailySummary: () => void;
  onCopyWeeklyFocus: () => void;
}) {
  const {
    dailySummary,
    dailyMessage,
    dailyError,
    isLoading,
    onRefresh,
    onCopyDailySummary,
    onCopyWeeklyFocus
  } = props;

  return (
    <section className="app-panel app-panel-body home-dashboard-panel">
      <div className="app-section-title">
        <div>
          <h2>今日必看</h2>
          <span>只展示可确认数据，不可确认内容降级显示</span>
        </div>
        <div className="button-row">
          <button type="button" className="secondary-button" disabled={isLoading} onClick={onRefresh}>
            {isLoading ? "刷新中..." : "刷新"}
          </button>
          <button type="button" disabled={!dailySummary} onClick={onCopyDailySummary}>
            复制日报
          </button>
          <button type="button" className="secondary-button" disabled={!dailySummary} onClick={onCopyWeeklyFocus}>
            复制本周重点
          </button>
        </div>
      </div>
      {dailyError ? <p className="status-message status-error">{dailyError}</p> : null}
      {dailyMessage ? <p className="status-message status-ready">{dailyMessage}</p> : null}
      {dailySummary ? (
        <>
          <div className="daily-reset-grid">
            <div>
              <strong>{dailySummary.daily_reset.label}</strong>
              <span>{dailySummary.daily_reset.time_remaining_label}</span>
            </div>
            <div>
              <strong>{dailySummary.weekly_reset.label}</strong>
              <span>{dailySummary.weekly_reset.time_remaining_label}</span>
            </div>
          </div>
          <div className="daily-reward-progress">
            <div className="app-metric status-ready">
              <span className="source-status-badge source-status-ready">奖励进度</span>
              <strong>{dailySummary.checklist.length} 条今日行动</strong>
              <small>优先处理光等奖励、商人和可确认轮换。</small>
            </div>
            <div className="app-metric status-neutral">
              <span className="source-status-badge source-status-neutral">来源状态</span>
              <strong>{dailySummary.recommendations.length} 条本周重点</strong>
              <small>下方标明 Bungie API、本地资料库或暂未接入状态。</small>
            </div>
          </div>
          {renderDailySourceMatrix(dailySummary)}
          <div className="daily-board">
            <section className="daily-column">
              <div className="app-list-card daily-brief">
                <div className="daily-brief-heading">
                  <strong>今日行动</strong>
                  <div className="daily-brief-meta">
                    <span className="daily-date-badge">{dailySummary.date_label}</span>
                    <span className="daily-brief-count">{dailySummary.checklist.length} 条</span>
                  </div>
                </div>
                <ol className="daily-action-list">
                  {dailySummary.checklist.slice(0, 5).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>
              {renderDailySourceCard(dailySummary.sources.rotations)}
              {renderDailySourceCard(dailySummary.sources.lost_sector)}
              {renderDailySourceCard(dailySummary.sources.vendors)}
            </section>
            <section className="daily-column">
              <div className="app-list-card daily-brief weekly-brief">
                <div className="daily-brief-heading">
                  <strong>本周周报</strong>
                  <span className="daily-brief-count">{dailySummary.recommendations.length} 条</span>
                </div>
                <ul className="weekly-focus-list">
                  {dailySummary.recommendations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="weekly-focus-sections">
                  {buildWeeklyDigestSections(dailySummary).map((section) => (
                    <section className="weekly-focus-section" key={section.key}>
                      <strong>{section.title}</strong>
                      <ul>
                        {section.items.map((item) => (
                          <li key={section.key + item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>
              {renderDailySourceCard(dailySummary.sources.weekly_report)}
              <div className="app-source-card source-status-card source-status-pending daily-source source-pending">
                <span className="source-status-badge source-status-pending">轮换细节</span>
                <strong>掉落地图 / 轮换细节</strong>
                <span>只展示 Bungie API 或本地资料库能确认的内容；未接入时保持为空，不猜测。</span>
              </div>
            </section>
          </div>
        </>
      ) : (
        <section className="app-source-card source-status-card source-status-pending daily-panel-status" aria-live="polite">
          <span className="source-status-badge source-status-pending">今日必看</span>
          <p>今日面板读取中。</p>
        </section>
      )}
    </section>
  );
}

type DailySourceMatrixItem = {
  key: string;
  label: string;
  status: DailySummary["sources"]["rotations"]["status"];
  detail: string;
  count?: number;
};

function renderDailySourceMatrix(dailySummary: DailySummary) {
  const matrixItems: DailySourceMatrixItem[] = [
    {
      key: "milestones",
      label: "Bungie 公共里程碑",
      status: dailySummary.sources.rotations.status,
      detail: "今日轮换 / 本周活动线索",
      count: dailySummary.sources.rotations.items?.length ?? 0
    },
    {
      key: "vendors",
      label: "Bungie 公共商人",
      status: dailySummary.sources.vendors.status,
      detail: "关键商人库存和费用",
      count: dailySummary.sources.vendors.items?.length ?? 0
    },
    {
      key: "manifest",
      label: "资料库",
      status: dailySummary.sources.lost_sector.status,
      detail: "遗失区域 fallback / 名称解析",
      count: dailySummary.sources.lost_sector.items?.length ?? 0
    },
    {
      key: "pending-weekly",
      label: "待接入",
      status: "pending",
      detail: "夜幕 / 试炼 / 双倍奖励 / 图片化周报"
    }
  ];

  return (
    <section className="app-source-card daily-source-matrix source-status-card source-status-neutral" aria-label="数据源矩阵">
      <div className="daily-source-heading">
        <strong>数据源矩阵</strong>
        <span className="source-status-badge source-status-neutral">只展示可确认来源</span>
      </div>
      <div className="daily-source-matrix-grid">
        {matrixItems.map((item) => (
          <div className={"daily-source-matrix-item source-status-" + item.status} key={item.key}>
            <div>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </div>
            <div className="daily-source-meta">
              <span className={"source-status-badge source-status-" + item.status}>{formatDailySourceStatus(item.status)}</span>
              {typeof item.count === "number" ? <span className="daily-source-count">{item.count} 条</span> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function renderDailySourceCard(source: DailySummary["sources"][keyof DailySummary["sources"]]) {
  return (
      <div className={"app-source-card source-status-card source-status-" + source.status + " daily-source source-" + source.status} key={source.label}>
      <div className="daily-source-heading">
        <strong>{source.label}</strong>
        <div className="daily-source-meta">
          <span className={"source-status-badge source-status-" + source.status + " daily-source-status status-" + source.status}>{formatDailySourceStatus(source.status)}</span>
          {source.items?.length ? <span className="daily-source-count">{source.items.length} 条</span> : null}
        </div>
      </div>
      <span>{source.message}</span>
      {source.items?.length ? (
        <ul className="daily-source-items">
          {source.items.map((item) => (
            <li key={"${source.label}-" + item.title}>
              <b>{item.title}</b>
              {item.subtitle ? <small>{item.subtitle}</small> : null}
              {item.description ? <small>{item.description}</small> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
