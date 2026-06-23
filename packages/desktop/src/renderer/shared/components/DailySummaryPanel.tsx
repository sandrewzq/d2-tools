import type { DailySummary } from "../../api/client";
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
    <section className="tool-panel">
      <div className="section-heading">
        <div>
          <h2>今日 / 本周</h2>
          <p>只展示可确认的真实数据；未接入或不可确认的内容不会猜测。</p>
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
      {dailyError ? <p className="error">{dailyError}</p> : null}
      {dailyMessage ? <p className="notice">{dailyMessage}</p> : null}
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
          <div className="daily-board">
            <section className="daily-column">
              <div className="daily-brief">
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
              <div className="daily-brief weekly-brief">
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
              <div className="source-status-card source-status-pending daily-source source-pending">
                <span className="source-status-badge source-status-pending">轮换细节</span>
                <strong>掉落地图 / 轮换细节</strong>
                <span>只展示 Bungie API 或本地资料库能确认的内容；未接入时保持为空，不猜测。</span>
              </div>
            </section>
          </div>
        </>
      ) : (
        <section className="source-status-card source-status-pending daily-panel-status" aria-live="polite">
          <span className="source-status-badge source-status-pending">今日 / 本周</span>
          <p>今日面板读取中。</p>
        </section>
      )}
    </section>
  );
}

function renderDailySourceCard(source: DailySummary["sources"][keyof DailySummary["sources"]]) {
  return (
    <div className={"source-status-card source-status-" + source.status + " daily-source source-" + source.status} key={source.label}>
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
