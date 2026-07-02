import type { ReactNode } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale, HomeCopy } from "../i18n/types.js";
import type { ShellPageKey } from "../shell/types.js";

export type HomeTone = "neutral" | "ready" | "warning" | "error";

export type HomeDataPoint = {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone: HomeTone;
};

export type HomeDailyItem = {
  title: string;
  subtitle?: string;
  description?: string;
  source?: string;
};

export type HomeDailySource = {
  status: HomeTone | "pending";
  message: string;
  items?: HomeDailyItem[];
};

export type HomeDailySummary = {
  daily_reset: {
    label: string;
    time_remaining_label: string;
  };
  weekly_reset: {
    label: string;
    time_remaining_label: string;
  };
  sources: {
    weekly_report: HomeDailySource;
    rotations: HomeDailySource;
    vendors: HomeDailySource;
    lost_sector: HomeDailySource;
  };
  checklist: string[];
};

export type HomeStartupState = {
  cards: {
    manifest: {
      label: string;
      status: string;
      lastUpdated?: string;
      needsUpdate?: boolean;
    };
  };
};

export type HomeDiagnosticRow = {
  tone?: string;
};

type HomeRewardGroup = {
  key: string;
  title: string;
  meta: string;
  items: Array<{
    label: string;
    detail: string;
    tone: HomeTone;
  }>;
};

type HomeIntelSection = {
  key: string;
  title: string;
  rows: Array<{
    label: string;
    detail: string;
    tone: HomeTone;
  }>;
};

type HomeSummaryCard = {
  key: string;
  title: string;
  message: string;
  tone: HomeTone;
  badge: string;
};

export type HomePageViewProps = {
  children?: ReactNode;
  interfaceLocale?: InterfaceLocale;
  state?: HomeStartupState;
  isLoggingIn?: boolean;
  isLoadingAccount?: boolean;
  isInitializingManifest?: boolean;
  isRefreshingDiagnostics?: boolean;
  diagnosticRows?: HomeDiagnosticRow[];
  diagnosticError?: string;
  accountError?: string;
  hasAccountData?: boolean;
  dailySummary?: HomeDailySummary | null;
  dailyMessage?: string;
  dailyError?: string;
  isLoadingDaily?: boolean;
  onConfigure?: () => void;
  onLogin?: () => void;
  onLoadAccount?: () => void;
  onInitializeManifest?: () => void;
  onConfigureAi?: () => void;
  onRefreshDiagnostics?: () => void;
  onNavigate?: (page: ShellPageKey) => void;
  onRefreshDaily?: () => void;
  onCopyDailySummary?: () => void;
  onCopyWeeklyFocus?: () => void;
};

const noop = () => undefined;

function homeText(copy: HomeCopy, key: string): string {
  return copy.inline[key] ?? key;
}

function buildFallbackState(copy: HomeCopy): HomeStartupState {
  return {
    cards: {
      manifest: {
        label: homeText(copy, "可用"),
        status: "ready",
        lastUpdated: homeText(copy, "6月17日"),
        needsUpdate: false
      }
    }
  };
}

export function HomePageView(props: HomePageViewProps) {
  if (!props.state && props.children) {
    return (
      <div className="app-page home-app-page product-home-page">
        {props.children}
      </div>
    );
  }

  const interfaceLocale = props.interfaceLocale ?? "zh-CN";
  const copy = getLocaleCopy(interfaceLocale).home;
  const viewProps = {
    interfaceLocale,
    state: props.state ?? buildFallbackState(copy),
    isLoggingIn: props.isLoggingIn ?? false,
    isLoadingAccount: props.isLoadingAccount ?? false,
    isInitializingManifest: props.isInitializingManifest ?? false,
    isRefreshingDiagnostics: props.isRefreshingDiagnostics ?? false,
    diagnosticRows: props.diagnosticRows ?? [],
    diagnosticError: props.diagnosticError ?? "",
    accountError: props.accountError ?? "",
    hasAccountData: props.hasAccountData ?? false,
    dailySummary: props.dailySummary ?? null,
    dailyMessage: props.dailyMessage ?? "",
    dailyError: props.dailyError ?? "",
    isLoadingDaily: props.isLoadingDaily ?? false,
    onRefreshDiagnostics: props.onRefreshDiagnostics ?? noop,
    onCopyDailySummary: props.onCopyDailySummary ?? noop
  };
  const dataPoints = buildHomeDataPoints(viewProps, copy);
  const rewardGroups = buildHomeRewardGroups(viewProps.dailySummary, copy);
  const weeklyIntel = buildWeeklyIntelSections(viewProps.dailySummary, copy);
  const todayCards = buildTodayConfirmationCards(viewProps.dailySummary, copy);
  const vendorCards = buildVendorHighlights(viewProps.dailySummary, copy);
  const accountRows = buildAccountRows(viewProps, copy);
  const pendingRows = buildPendingRows(viewProps, copy);

  return (
    <div className="app-page home-app-page product-home-page">
      <section className="home-data-strip" aria-label={copy.dataStripAriaLabel}>
        {dataPoints.map((point) => (
          <div className="home-data-point" data-tone={point.tone} key={point.key}>
            <span>{point.label}</span>
            <strong>{point.value}</strong>
            <small>{point.detail}</small>
          </div>
        ))}
      </section>

      {viewProps.dailyError ? <p className="status-message status-error">{viewProps.dailyError}</p> : null}
      {viewProps.dailyMessage ? <p className="status-message status-ready">{viewProps.dailyMessage}</p> : null}

      <section className="app-panel app-panel-body">
        <div className="app-section-title">
          <div>
            <h2>{copy.sections.weeklyRewards.title}</h2>
            <span>{copy.sections.weeklyRewards.subtitle}</span>
          </div>
          <span className={toneClass("warning", "app-chip")}>{copy.sections.weeklyRewards.badge}</span>
        </div>
        <div className="home-weekly-dashboard">
          <section className="home-weekly-rewards">
            <div className="home-reward-summary">
              <div>
                <span>{copy.labels.priority}</span>
                <strong>{copy.rewardGroups.powerPriority}</strong>
              </div>
              <div className="home-reward-count">
                <strong>9</strong>
                <span>{copy.labels.focusCount}</span>
              </div>
            </div>
            {rewardGroups.map((group) => (
              <section className="home-reward-group" key={group.key}>
                <div className="home-reward-heading">
                  <strong>{group.title}</strong>
                  <span>{group.meta}</span>
                </div>
                <div className="home-reward-list">
                  {group.items.map((item) => (
                    <article className="home-reward-item" data-tone={item.tone} key={group.key + item.label}>
                      <span className="reward-icon" aria-hidden="true" />
                      <div>
                        <strong>{item.label}</strong>
                        <span>{item.detail}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </section>

          <aside className="home-weekly-intel" aria-label={copy.intel.publicRotation}>
            {weeklyIntel.map((section) => (
              <section className="home-intel-section" key={section.key}>
                <h3>{section.title}</h3>
                <div className="home-intel-list">
                  {section.rows.map((row) => (
                    <div className="home-intel-row" data-tone={row.tone} key={section.key + row.label}>
                      <div>
                        <strong>{row.label}</strong>
                        <span>{row.detail}</span>
                      </div>
                      <span className={toneClass(row.tone, "app-chip")}>{formatToneLabel(row.tone, copy)}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </aside>
        </div>
      </section>

      <div className="home-main-grid">
        <section className="app-panel app-panel-body">
          <div className="app-section-title">
            <div>
              <h2>{copy.sections.today.title}</h2>
              <span>{copy.sections.today.subtitle}</span>
            </div>
            <button type="button" className="secondary-button" disabled={!viewProps.dailySummary} onClick={viewProps.onCopyDailySummary}>
              {copy.actions.copyDaily}
            </button>
          </div>
          <div className="home-card-grid">
            {todayCards.map((card) => renderHomeSummaryCard(card))}
          </div>
        </section>

        <section className="app-panel app-panel-body">
          <div className="app-section-title">
            <div>
              <h2>{copy.sections.vendors.title}</h2>
              <span>{copy.sections.vendors.subtitle}</span>
            </div>
          </div>
          <div className="home-vendor-highlight">
            {vendorCards.map((card) => (
              <article className="home-vendor-row" data-tone={card.tone} key={card.key}>
                <div>
                  <strong>{card.title}</strong>
                  <span>{card.message}</span>
                </div>
                <span className={toneClass(card.tone, "app-chip")}>{card.badge}</span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="home-secondary-grid">
        <section className="app-panel app-panel-body">
          <div className="app-section-title">
            <div>
              <h2>{copy.sections.account.title}</h2>
              <span>{copy.sections.account.subtitle}</span>
            </div>
          </div>
          <div className="home-account-list">
            {accountRows.map((row) => (
              <div className="home-account-row" data-tone={row.tone} key={row.key}>
                <div>
                  <strong>{row.title}</strong>
                  <span>{row.message}</span>
                </div>
                <span className={toneClass(row.tone, "app-chip")}>{row.badge}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="app-panel app-panel-body">
          <div className="app-section-title">
            <div>
              <h2>{copy.sections.pending.title}</h2>
              <span>{copy.sections.pending.subtitle}</span>
            </div>
            <button type="button" className="secondary-button" disabled={viewProps.isRefreshingDiagnostics} onClick={viewProps.onRefreshDiagnostics}>
              {viewProps.isRefreshingDiagnostics ? copy.actions.diagnosing : copy.actions.runDiagnostics}
            </button>
          </div>
          <div className="home-account-list">
            {pendingRows.map((row) => (
              <div className="home-account-row" data-tone={row.tone} key={row.key}>
                <div>
                  <strong>{row.title}</strong>
                  <span>{row.message}</span>
                </div>
                <span className={toneClass(row.tone, "app-chip")}>{row.badge}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function buildHomeDataPoints(props: {
  state: HomeStartupState;
  dailySummary: HomeDailySummary | null;
  hasAccountData: boolean;
  accountError: string;
  isInitializingManifest: boolean;
  isLoadingDaily: boolean;
}, copy: HomeCopy): HomeDataPoint[] {
  const manifest = props.state.cards.manifest;

  return [
    {
      key: "daily-reset",
      label: copy.labels.dailyReset,
      value: props.dailySummary ? props.dailySummary.daily_reset.time_remaining_label : props.isLoadingDaily ? copy.actions.diagnosing : copy.fallback.dailyPending,
      detail: props.dailySummary?.daily_reset.label ?? copy.fallback.dailyWaiting,
      tone: props.dailySummary ? "ready" : "neutral"
    },
    {
      key: "weekly-reset",
      label: copy.labels.weeklyReset,
      value: props.dailySummary ? props.dailySummary.weekly_reset.time_remaining_label : copy.fallback.weeklyPending,
      detail: props.dailySummary?.weekly_reset.label ?? copy.fallback.weeklyResetDetail,
      tone: props.dailySummary ? "ready" : "neutral"
    },
    {
      key: "manifest",
      label: copy.labels.manifest,
      value: props.isInitializingManifest ? homeText(copy, "更新中") : manifest.lastUpdated ?? manifest.label,
      detail: manifest.status === "ready" && !manifest.needsUpdate ? copy.fallback.manifestReady : copy.fallback.manifestNeedsAttention,
      tone: manifest.status === "ready" && !manifest.needsUpdate ? "ready" : "warning"
    },
    {
      key: "account",
      label: copy.labels.accountData,
      value: props.accountError ? copy.fallback.accountFailed : props.hasAccountData ? copy.fallback.accountReady : copy.fallback.accountPending,
      detail: props.accountError || (props.hasAccountData ? copy.account.readyTitle : copy.account.pendingMessage),
      tone: props.accountError ? "error" : props.hasAccountData ? "ready" : "neutral"
    }
  ];
}

function buildHomeRewardGroups(dailySummary: HomeDailySummary | null, copy: HomeCopy): HomeRewardGroup[] {
  const weeklyReportReady = dailySummary?.sources.weekly_report.status === "ready";
  return [
    {
      key: "power",
      title: copy.rewardGroups.powerTitle,
      meta: copy.fallback.weeklyFixedMeta,
      items: [
        { label: homeText(copy, "智谋"), detail: homeText(copy, "完成每周挑战后降噪"), tone: "warning" },
        { label: homeText(copy, "日落任务"), detail: weeklyReportReady ? homeText(copy, "本周周报已有线索") : homeText(copy, "武器和难度待确认"), tone: weeklyReportReady ? "ready" : "warning" },
        { label: homeText(copy, "熔炉竞技场"), detail: homeText(copy, "检查每周挑战和声望奖励"), tone: "warning" },
        { label: homeText(copy, "突袭"), detail: homeText(copy, "优先看轮换突袭和巅峰奖励"), tone: weeklyReportReady ? "ready" : "warning" }
      ]
    },
    {
      key: "other",
      title: copy.rewardGroups.otherTitle,
      meta: copy.fallback.otherRewardMeta,
      items: [
        { label: homeText(copy, "永恒沙漠"), detail: homeText(copy, "轮换奖励待确认"), tone: "neutral" },
        { label: homeText(copy, "克洛塔的末日"), detail: homeText(copy, "突袭轮换关注"), tone: "neutral" },
        { label: homeText(copy, "玻璃拱顶"), detail: homeText(copy, "旧突袭轮换关注"), tone: "neutral" },
        { label: homeText(copy, "宿命边缘"), detail: homeText(copy, "地牢 / 赛季奖励关注"), tone: "neutral" },
        { label: homeText(copy, "传承：终焉之形"), detail: homeText(copy, "DLC 周常关注"), tone: "neutral" },
        { label: homeText(copy, "苍白之心寻路者"), detail: homeText(copy, "完成后从首页降噪"), tone: "neutral" }
      ]
    }
  ];
}

function buildWeeklyIntelSections(dailySummary: HomeDailySummary | null, copy: HomeCopy): HomeIntelSection[] {
  return [
    {
      key: "public-rotation",
      title: copy.intel.publicRotation,
      rows: [
        sourceIntelRow(copy.intel.raidDungeon, dailySummary?.sources.weekly_report, copy),
        sourceIntelRow(copy.intel.activityIntel, dailySummary?.sources.rotations, copy),
        {
          label: copy.intel.doubleRewards,
          detail: copy.intel.doubleRewardsDetail,
          tone: "warning"
        }
      ]
    },
    {
      key: "weekend-window",
      title: copy.intel.weekendWindow,
      rows: [
        sourceIntelRow(copy.intel.xur, dailySummary?.sources.vendors, copy),
        {
          label: copy.intel.trialsMap,
          detail: copy.intel.trialsMapDetail,
          tone: "warning"
        },
        {
          label: copy.intel.weekendChecklist,
          detail: copy.intel.weekendChecklistDetail,
          tone: "neutral"
        }
      ]
    }
  ];
}

function buildTodayConfirmationCards(dailySummary: HomeDailySummary | null, copy: HomeCopy): HomeSummaryCard[] {
  if (!dailySummary) {
    return [
      {
        key: "daily-loading",
        title: copy.fallback.todayLoadingTitle,
        message: copy.fallback.todayLoadingMessage,
        tone: "neutral",
        badge: copy.actions.diagnosing
      }
    ];
  }

  return [
    {
      key: "daily-reset",
      title: copy.labels.dailyReset,
      message: dailySummary.daily_reset.time_remaining_label,
      tone: "ready",
      badge: copy.labels.confirmed
    },
    sourceSummaryCard("lost-sector", homeText(copy, "遗失区域"), dailySummary.sources.lost_sector, copy),
    sourceSummaryCard("rotations", copy.intel.activityIntel, dailySummary.sources.rotations, copy),
    {
      key: "today-actions",
      title: copy.fallback.todayActionTitle,
      message: dailySummary.checklist[0] ?? copy.fallback.todayQuiet,
      tone: dailySummary.checklist.length ? "ready" : "neutral",
      badge: `${dailySummary.checklist.length} ${homeText(copy, "条")}`
    }
  ];
}

function buildVendorHighlights(dailySummary: HomeDailySummary | null, copy: HomeCopy): HomeSummaryCard[] {
  const vendorSource = dailySummary?.sources.vendors;
  const vendorItems = vendorSource?.items ?? [];

  return [
    {
      key: "xur",
      title: "Xur",
      message: vendorItems[0] ? describeDailyItem(vendorItems[0]) : copy.vendors.xurDetail,
      tone: vendorItems[0] ? "ready" : "warning",
      badge: vendorItems[0] ? copy.labels.confirmed : copy.vendors.weekendBadge
    },
    {
      key: "banshee",
      title: "Banshee-44",
      message: vendorItems[1] ? describeDailyItem(vendorItems[1]) : copy.vendors.bansheeDetail,
      tone: vendorItems[1] ? "ready" : "neutral",
      badge: vendorItems[1] ? copy.labels.confirmed : copy.vendors.waitingBadge
    },
    {
      key: "ada",
      title: "Ada-1",
      message: vendorItems[2] ? describeDailyItem(vendorItems[2]) : copy.vendors.adaDetail,
      tone: vendorItems[2] ? "ready" : "neutral",
      badge: vendorItems[2] ? copy.labels.confirmed : copy.vendors.waitingBadge
    }
  ];
}

function buildAccountRows(props: {
  accountError: string;
  hasAccountData: boolean;
  isLoadingAccount: boolean;
  isLoggingIn: boolean;
  diagnosticRows: HomeDiagnosticRow[];
}, copy: HomeCopy): HomeSummaryCard[] {
  const warnings = props.diagnosticRows.filter((row) => row.tone === "warning");
  return [
    {
      key: "account-status",
      title: props.accountError ? copy.account.failedTitle : props.hasAccountData ? copy.account.readyTitle : copy.account.pendingTitle,
      message: props.accountError || (props.isLoadingAccount || props.isLoggingIn ? copy.account.syncing : copy.account.pendingMessage),
      tone: props.accountError ? "error" : props.hasAccountData ? "ready" : "neutral",
      badge: props.accountError ? copy.account.failedBadge : props.hasAccountData ? copy.account.readyBadge : copy.account.pendingBadge
    },
    {
      key: "vault",
      title: copy.account.vaultTitle,
      message: props.hasAccountData ? copy.account.vaultReady : copy.account.vaultMissing,
      tone: props.hasAccountData ? "neutral" : "warning",
      badge: props.hasAccountData ? copy.account.vaultReadyBadge : copy.account.vaultMissingBadge
    },
    {
      key: "diagnostic",
      title: warnings.length ? copy.account.diagnosticWarningTitle : copy.account.diagnosticReadyTitle,
      message: warnings.length ? copy.account.diagnosticWarning(warnings.length) : copy.account.diagnosticReady,
      tone: warnings.length ? "warning" : "ready",
      badge: warnings.length ? copy.account.diagnosticWarningBadge : copy.account.readyBadge
    }
  ];
}

function buildPendingRows(props: {
  diagnosticError: string;
  dailySummary: HomeDailySummary | null;
  state: HomeStartupState;
}, copy: HomeCopy): HomeSummaryCard[] {
  const manifest = props.state.cards.manifest;
  const weeklyReady = props.dailySummary?.sources.weekly_report.status === "ready";
  const vendorReady = props.dailySummary?.sources.vendors.status === "ready";

  return [
    {
      key: "trials",
      title: `${copy.intel.trialsMap} / ${copy.sections.weeklyRewards.title}`,
      message: copy.fallback.noGuessBeforeWeekend,
      tone: "warning",
      badge: copy.labels.pending
    },
    {
      key: "nightfall",
      title: "Nightfall",
      message: weeklyReady ? copy.sections.weeklyRewards.subtitle : copy.fallback.nightfallWaiting,
      tone: weeklyReady ? "neutral" : "warning",
      badge: weeklyReady ? copy.labels.focus : copy.vendors.waitingBadge
    },
    {
      key: "vendors",
      title: copy.sections.vendors.title,
      message: vendorReady ? copy.sections.vendors.subtitle : copy.fallback.vendorsWaiting,
      tone: vendorReady ? "ready" : "neutral",
      badge: vendorReady ? copy.labels.confirmed : copy.vendors.waitingBadge
    },
    {
      key: "health",
      title: props.diagnosticError ? copy.fallback.healthFailed : copy.labels.manifest,
      message: props.diagnosticError || (manifest.status === "ready" ? copy.fallback.healthReady : manifest.label),
      tone: props.diagnosticError ? "error" : manifest.status === "ready" ? "ready" : "warning",
      badge: props.diagnosticError ? copy.labels.error : manifest.status === "ready" ? copy.account.readyBadge : copy.account.failedBadge
    }
  ];
}

function sourceIntelRow(label: string, source: HomeDailySource | undefined, copy: HomeCopy): HomeIntelSection["rows"][number] {
  if (!source) {
    return {
      label,
      detail: copy.fallback.waitingRefresh,
      tone: "neutral"
    };
  }

  const firstItem = source.items?.[0];
  return {
    label: firstItem?.title ?? label,
    detail: firstItem ? describeDailyItem(firstItem) : source.message,
    tone: source.status === "ready" ? "ready" : "warning"
  };
}

function sourceSummaryCard(key: string, fallbackTitle: string, source: HomeDailySource, copy: HomeCopy): HomeSummaryCard {
  const firstItem = source.items?.[0];
  return {
    key,
    title: firstItem?.title ?? fallbackTitle,
    message: firstItem ? describeDailyItem(firstItem) : source.message,
    tone: source.status === "ready" ? "ready" : "warning",
    badge: source.status === "ready" ? copy.labels.confirmed : copy.labels.pending
  };
}

function describeDailyItem(item: HomeDailyItem): string {
  return [item.subtitle, item.description, item.source].filter(Boolean).join("，") || item.title;
}

function formatToneLabel(tone: HomeTone, copy: HomeCopy): string {
  if (tone === "ready") {
    return copy.labels.confirmed;
  }
  if (tone === "warning") {
    return copy.labels.pending;
  }
  if (tone === "error") {
    return copy.labels.error;
  }
  return copy.labels.focus;
}

function toneClass(tone: HomeTone, baseClassName: string): string {
  return `${baseClassName} status-${tone}`;
}

function renderHomeSummaryCard(card: HomeSummaryCard) {
  return (
    <article className="app-metric home-summary-card" data-tone={card.tone} key={card.key}>
      <strong>{card.title}</strong>
      <span>{card.message}</span>
      <span className={toneClass(card.tone, "app-chip")}>{card.badge}</span>
    </article>
  );
}
