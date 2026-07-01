import type { DailySummary, StartupState } from "../../api/client";
import {
  type DiagnosticRow
} from "../../components/DiagnosticsPanel";
import type { ShellPageKey } from "../../components/ShellLayout";

export function HomeDashboard(props: {
  state: StartupState;
  isLoggingIn: boolean;
  isLoadingAccount: boolean;
  isInitializingManifest: boolean;
  isRefreshingDiagnostics: boolean;
  diagnosticRows: DiagnosticRow[];
  diagnosticError: string;
  accountError: string;
  hasAccountData: boolean;
  dailySummary: DailySummary | null;
  dailyMessage: string;
  dailyError: string;
  isLoadingDaily: boolean;
  onConfigure: () => void;
  onLogin: () => void;
  onLoadAccount: () => void;
  onInitializeManifest: () => void;
  onConfigureAi: () => void;
  onRefreshDiagnostics: () => void;
  onNavigate: (page: ShellPageKey) => void;
  onRefreshDaily: () => void;
  onCopyDailySummary: () => void;
  onCopyWeeklyFocus: () => void;
}) {
  const readinessCards = buildReadinessCards(props);
  const todayCards = buildTodayRotationCards(props.dailySummary);
  const weeklyCards = buildWeeklyRotationCards(props.dailySummary);

  return (
    <div className="app-page home-app-page product-home-page">
      <section className="app-page-head">
        <div>
          <h1>首页</h1>
          <p>查看账号、资料库和今日可确认内容。</p>
        </div>
        <div className="button-row">
          <button type="button" className="secondary-button" disabled={props.isLoadingDaily} onClick={props.onRefreshDaily}>
            {props.isLoadingDaily ? "刷新中..." : "刷新今日信息"}
          </button>
        </div>
      </section>

      <section className="home-readiness-grid" aria-label="准备状态">
        {readinessCards.map((card) => (
          <article className={`app-status-row home-readiness-card status-${card.tone}`} key={card.key}>
            <div>
              <strong>{card.title}</strong>
              <span>{card.message}</span>
            </div>
            {card.action ? (
              <button type="button" className="secondary-button" disabled={card.busy} onClick={card.action}>
                {card.actionLabel}
              </button>
            ) : null}
          </article>
        ))}
      </section>

      {props.dailyError ? <p className="status-message status-error">{props.dailyError}</p> : null}
      {props.dailyMessage ? <p className="status-message status-ready">{props.dailyMessage}</p> : null}

      <section className="app-panel app-panel-body">
        <div className="app-section-title">
          <h2>今日轮换</h2>
          <span>没有确认的数据不会占用大块空间</span>
        </div>
        <div className="home-rotation-grid">
          {todayCards.map((card) => renderRotationCard(card))}
        </div>
      </section>

      <section className="app-panel app-panel-body">
        <div className="app-section-title">
          <h2>本周轮换</h2>
          <span>按每周重置周期展示可确认内容</span>
        </div>
        <div className="home-weekly-grid">
          {weeklyCards.map((card) => renderRotationCard(card))}
        </div>
      </section>
    </div>
  );
}

type HomeReadinessCard = {
  key: string;
  title: string;
  message: string;
  tone: "neutral" | "ready" | "warning" | "error";
  actionLabel?: string;
  busy?: boolean;
  action?: () => void;
};

type HomeRotationCard = {
  key: string;
  title: string;
  message: string;
  tone: "neutral" | "ready" | "warning" | "error";
  badge: string;
};

function buildReadinessCards(props: {
  state: StartupState;
  isInitializingManifest: boolean;
  isRefreshingDiagnostics: boolean;
  diagnosticRows: DiagnosticRow[];
  diagnosticError: string;
  accountError: string;
  hasAccountData: boolean;
  onConfigure: () => void;
  onInitializeManifest: () => void;
  onConfigureAi: () => void;
  onRefreshDiagnostics: () => void;
}): HomeReadinessCard[] {
  const bungie = props.state.cards.bungieConfig;
  const manifest = props.state.cards.manifest;
  const ai = props.state.cards.ai;
  const warnings = props.diagnosticRows.filter((row) => row.tone === "warning");

  return [
    {
      key: "account",
      title: props.accountError ? "账号读取失败" : props.hasAccountData ? "账号可用" : "账号待同步",
      message: props.accountError || (props.hasAccountData ? "启动自动读取，后台定时刷新" : "应用启动会自动读取；手动操作保留在账号页"),
      tone: props.accountError ? "error" : props.hasAccountData ? "ready" : "neutral"
    },
    {
      key: "manifest",
      title: props.isInitializingManifest ? "资料库更新中" : manifest.status === "ready" && !manifest.needsUpdate ? "资料库可用" : "资料库待更新",
      message: manifest.status === "ready" ? `版本 ${manifest.lastUpdated ?? "可用"}，可解析名称和图标` : manifest.label,
      tone: manifest.status === "ready" && !manifest.needsUpdate ? "ready" : "warning",
      actionLabel: props.isInitializingManifest ? "更新中" : manifest.status === "ready" && !manifest.needsUpdate ? undefined : "更新",
      busy: props.isInitializingManifest,
      action: manifest.status === "ready" && !manifest.needsUpdate ? undefined : props.onInitializeManifest
    },
    {
      key: "bungie",
      title: bungie.status === "ready" ? "Bungie App 已配置" : "Bungie App 待配置",
      message: bungie.status === "ready" ? "授权、Client ID 和 API Key 可用" : bungie.label,
      tone: bungie.status === "ready" ? "ready" : "warning",
      actionLabel: bungie.status === "ready" ? "设置" : "配置",
      action: props.onConfigure
    },
    {
      key: "ai",
      title: ai.status === "ready" ? "AI 已配置" : "AI 未配置",
      message: ai.status === "ready" ? "可以结合当前页面上下文分析装备和仓库" : "不影响本地资料库和账号功能",
      tone: ai.status === "ready" ? "ready" : "warning",
      actionLabel: ai.status === "ready" ? "设置" : "去配置",
      action: props.onConfigureAi
    },
    {
      key: "diagnostics",
      title: props.diagnosticError ? "健康检查失败" : warnings.length ? "健康检查有提醒" : "健康检查正常",
      message: props.diagnosticError || (props.isRefreshingDiagnostics ? "正在检查账号、资料库和后台任务" : warnings.length ? `${warnings.length} 项需要处理` : "无账号、资料库或后台阻断项"),
      tone: props.diagnosticError ? "error" : warnings.length ? "warning" : "neutral",
      actionLabel: props.isRefreshingDiagnostics ? "检查中" : "运行诊断",
      busy: props.isRefreshingDiagnostics,
      action: props.onRefreshDiagnostics
    }
  ];
}

function buildTodayRotationCards(dailySummary: DailySummary | null): HomeRotationCard[] {
  if (!dailySummary) {
    return [
      {
        key: "daily-loading",
        title: "今日信息读取中",
        message: "正在读取可确认轮换数据。",
        tone: "neutral",
        badge: "读取中"
      }
    ];
  }

  return [
    {
      key: "daily-reset",
      title: dailySummary.daily_reset.label,
      message: dailySummary.daily_reset.time_remaining_label,
      tone: "ready",
      badge: "已确认"
    },
    sourceCard("lost-sector", "遗失区域", dailySummary.sources.lost_sector),
    sourceCard("rotations", "活动线索", dailySummary.sources.rotations)
  ];
}

function buildWeeklyRotationCards(dailySummary: DailySummary | null): HomeRotationCard[] {
  if (!dailySummary) {
    return [
      {
        key: "weekly-loading",
        title: "本周信息读取中",
        message: "正在读取每周轮换与仄的金装摘要。",
        tone: "neutral",
        badge: "读取中"
      }
    ];
  }

  return [
    {
      key: "weekly-reset",
      title: dailySummary.weekly_reset.label,
      message: dailySummary.weekly_reset.time_remaining_label,
      tone: "ready",
      badge: "已确认"
    },
    sourceCard("weekly-report", "突袭与地牢", dailySummary.sources.weekly_report),
    {
      key: "weekly-reward",
      title: "奖励线索",
      message: dailySummary.recommendations[0] ?? "夜幕、试炼和双倍奖励未确认时保持低优先级。",
      tone: dailySummary.recommendations.length ? "ready" : "warning",
      badge: dailySummary.recommendations.length ? "已接入" : "待接入"
    },
    buildXurExoticCard(dailySummary)
  ];
}

function sourceCard(
  key: string,
  fallbackTitle: string,
  source: DailySummary["sources"][keyof DailySummary["sources"]]
): HomeRotationCard {
  const firstItem = source.items?.[0];
  return {
    key,
    title: firstItem?.title ?? fallbackTitle,
    message: firstItem ? [firstItem.subtitle, firstItem.description].filter(Boolean).join("，") : source.message,
    tone: source.status === "ready" ? "ready" : "warning",
    badge: source.status === "ready" ? "已接入" : "待确认"
  };
}

function buildXurExoticCard(dailySummary: DailySummary): HomeRotationCard {
  const xurItem = dailySummary.sources.vendors.items?.[0];
  return {
    key: "xur-exotic",
    title: "仄的金装",
    message: xurItem ? [xurItem.title, xurItem.subtitle, xurItem.description].filter(Boolean).join("，") : "等待仄的异域装备确认。",
    tone: xurItem ? "ready" : "warning",
    badge: xurItem ? "本周可买" : "待确认"
  };
}

function renderRotationCard(card: HomeRotationCard) {
  return (
    <article className={`app-metric home-rotation-card status-${card.tone}`} key={card.key}>
      <strong>{card.title}</strong>
      <span>{card.message}</span>
      <span className={`app-chip status-${card.tone}`}>{card.badge}</span>
    </article>
  );
}
