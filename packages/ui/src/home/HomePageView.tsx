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

const fallbackState: HomeStartupState = {
  cards: {
    manifest: {
      label: "可用",
      status: "ready",
      lastUpdated: "6月17日",
      needsUpdate: false
    }
  }
};

const noop = () => undefined;

export function HomePageView(props: HomePageViewProps) {
  if (!props.state && props.children) {
    return (
      <div className="app-page home-app-page product-home-page">
        {props.children}
      </div>
    );
  }

  const viewProps = {
    interfaceLocale: props.interfaceLocale ?? "zh-CN",
    state: props.state ?? fallbackState,
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
  const copy = getLocaleCopy(viewProps.interfaceLocale).home;

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
                      <span className={toneClass(row.tone, "app-chip")}>{formatToneLabel(row.tone)}</span>
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
}): HomeDataPoint[] {
  const manifest = props.state.cards.manifest;

  return [
    {
      key: "daily-reset",
      label: "每日重置",
      value: props.dailySummary ? props.dailySummary.daily_reset.time_remaining_label : props.isLoadingDaily ? "读取中" : "待刷新",
      detail: props.dailySummary?.daily_reset.label ?? "等待今日信息刷新",
      tone: props.dailySummary ? "ready" : "neutral"
    },
    {
      key: "weekly-reset",
      label: "每周重置",
      value: props.dailySummary ? props.dailySummary.weekly_reset.time_remaining_label : "待确认",
      detail: props.dailySummary?.weekly_reset.label ?? "每周三 01:00 重置",
      tone: props.dailySummary ? "ready" : "neutral"
    },
    {
      key: "manifest",
      label: "资料库",
      value: props.isInitializingManifest ? "更新中" : manifest.lastUpdated ?? manifest.label,
      detail: manifest.status === "ready" && !manifest.needsUpdate ? "名称、图标和来源可解析" : "异常时可去顶部状态或设置处理",
      tone: manifest.status === "ready" && !manifest.needsUpdate ? "ready" : "warning"
    },
    {
      key: "account",
      label: "账号数据",
      value: props.accountError ? "读取失败" : props.hasAccountData ? "已读取" : "待同步",
      detail: props.accountError || (props.hasAccountData ? "用于账号提醒和后续奖励进度" : "不阻塞公共轮换查看"),
      tone: props.accountError ? "error" : props.hasAccountData ? "ready" : "neutral"
    }
  ];
}

function buildHomeRewardGroups(dailySummary: HomeDailySummary | null): HomeRewardGroup[] {
  const weeklyReportReady = dailySummary?.sources.weekly_report.status === "ready";
  return [
    {
      key: "power",
      title: "+3 光等奖励",
      meta: "账号进度待接入前，先给出本周固定关注位",
      items: [
        { label: "智谋", detail: "完成每周挑战后降噪", tone: "warning" },
        { label: "日落任务", detail: weeklyReportReady ? "本周周报已有线索" : "武器和难度待确认", tone: weeklyReportReady ? "ready" : "warning" },
        { label: "熔炉竞技场", detail: "检查每周挑战和声望奖励", tone: "warning" },
        { label: "突袭", detail: "优先看轮换突袭和巅峰奖励", tone: weeklyReportReady ? "ready" : "warning" }
      ]
    },
    {
      key: "other",
      title: "其他奖励",
      meta: "公共轮换、DLC 周常和寻路者合并查看",
      items: [
        { label: "永恒沙漠", detail: "轮换奖励待确认", tone: "neutral" },
        { label: "克洛塔的末日", detail: "突袭轮换关注", tone: "neutral" },
        { label: "玻璃拱顶", detail: "旧突袭轮换关注", tone: "neutral" },
        { label: "宿命边缘", detail: "地牢 / 赛季奖励关注", tone: "neutral" },
        { label: "传承：终焉之形", detail: "DLC 周常关注", tone: "neutral" },
        { label: "苍白之心寻路者", detail: "完成后从首页降噪", tone: "neutral" }
      ]
    }
  ];
}

function buildWeeklyIntelSections(dailySummary: HomeDailySummary | null): HomeIntelSection[] {
  return [
    {
      key: "public-rotation",
      title: "本周公共轮换",
      rows: [
        sourceIntelRow("突袭与地牢", dailySummary?.sources.weekly_report),
        sourceIntelRow("活动线索", dailySummary?.sources.rotations),
        {
          label: "双倍奖励",
          detail: "Bungie 公共接口未稳定确认前不猜测",
          tone: "warning"
        }
      ]
    },
    {
      key: "weekend-window",
      title: "周末窗口",
      rows: [
        sourceIntelRow("仄 / Xur", dailySummary?.sources.vendors),
        {
          label: "试炼地图",
          detail: "周末开启后再展示地图与奖励",
          tone: "warning"
        },
        {
          label: "周末清单",
          detail: "等商人和试炼数据齐后再复制给 AI 或日报",
          tone: "neutral"
        }
      ]
    }
  ];
}

function buildTodayConfirmationCards(dailySummary: HomeDailySummary | null): HomeSummaryCard[] {
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
      title: "每日重置已更新",
      message: dailySummary.daily_reset.time_remaining_label,
      tone: "ready",
      badge: "已确认"
    },
    sourceSummaryCard("lost-sector", "遗失区域", dailySummary.sources.lost_sector),
    sourceSummaryCard("rotations", "活动线索", dailySummary.sources.rotations),
    {
      key: "today-actions",
      title: "今日动作",
      message: dailySummary.checklist[0] ?? "没有可确认行动时保持安静。",
      tone: dailySummary.checklist.length ? "ready" : "neutral",
      badge: `${dailySummary.checklist.length} 条`
    }
  ];
}

function buildVendorHighlights(dailySummary: HomeDailySummary | null): HomeSummaryCard[] {
  const vendorSource = dailySummary?.sources.vendors;
  const vendorItems = vendorSource?.items ?? [];

  return [
    {
      key: "xur",
      title: "Xur",
      message: vendorItems[0] ? describeDailyItem(vendorItems[0]) : "周末出现后展示异域装备摘要。",
      tone: vendorItems[0] ? "ready" : "warning",
      badge: vendorItems[0] ? "可查看" : "待周末"
    },
    {
      key: "banshee",
      title: "Banshee-44",
      message: vendorItems[1] ? describeDailyItem(vendorItems[1]) : "武器清单接入前只提示关注。",
      tone: vendorItems[1] ? "ready" : "neutral",
      badge: vendorItems[1] ? "已确认" : "待接入"
    },
    {
      key: "ada",
      title: "Ada-1",
      message: vendorItems[2] ? describeDailyItem(vendorItems[2]) : "护甲模组和幻化相关后续接入。",
      tone: vendorItems[2] ? "ready" : "neutral",
      badge: vendorItems[2] ? "已确认" : "待接入"
    }
  ];
}

function buildAccountRows(props: {
  accountError: string;
  hasAccountData: boolean;
  isLoadingAccount: boolean;
  isLoggingIn: boolean;
  diagnosticRows: HomeDiagnosticRow[];
}): HomeSummaryCard[] {
  const warnings = props.diagnosticRows.filter((row) => row.tone === "warning");
  return [
    {
      key: "account-status",
      title: props.accountError ? "账号数据异常" : props.hasAccountData ? "账号已就绪" : "账号待同步",
      message: props.accountError || (props.isLoadingAccount || props.isLoggingIn ? "正在同步账号状态。" : "后续账号切换和里程碑进度会从这里收口。"),
      tone: props.accountError ? "error" : props.hasAccountData ? "ready" : "neutral",
      badge: props.accountError ? "需处理" : props.hasAccountData ? "正常" : "待同步"
    },
    {
      key: "vault",
      title: "仓库容量",
      message: props.hasAccountData ? "仓库数量和溢出提醒后续接真实统计。" : "账号未同步时不展示容量判断。",
      tone: props.hasAccountData ? "neutral" : "warning",
      badge: props.hasAccountData ? "待统计" : "缺账号"
    },
    {
      key: "diagnostic",
      title: warnings.length ? "健康检查有提醒" : "健康检查正常",
      message: warnings.length ? `${warnings.length} 项需要处理。` : "无账号、资料库或后台阻断项。",
      tone: warnings.length ? "warning" : "ready",
      badge: warnings.length ? "有提醒" : "正常"
    }
  ];
}

function buildPendingRows(props: {
  diagnosticError: string;
  dailySummary: HomeDailySummary | null;
  state: HomeStartupState;
}): HomeSummaryCard[] {
  const manifest = props.state.cards.manifest;
  const weeklyReady = props.dailySummary?.sources.weekly_report.status === "ready";
  const vendorReady = props.dailySummary?.sources.vendors.status === "ready";

  return [
    {
      key: "trials",
      title: "试炼地图 / 奖励",
      message: "周末开启前不展示猜测数据。",
      tone: "warning",
      badge: "待确认"
    },
    {
      key: "nightfall",
      title: "夜幕武器",
      message: weeklyReady ? "周报已有线索，仍需武器字段确认。" : "等待可靠来源接入。",
      tone: weeklyReady ? "neutral" : "warning",
      badge: weeklyReady ? "有线索" : "待接入"
    },
    {
      key: "vendors",
      title: "商人完整清单",
      message: vendorReady ? "已能显示重点摘要，完整清单留在后续专页。" : "等待公共商人数据。",
      tone: vendorReady ? "ready" : "neutral",
      badge: vendorReady ? "摘要可用" : "待接入"
    },
    {
      key: "health",
      title: props.diagnosticError ? "诊断读取失败" : "资料库健康",
      message: props.diagnosticError || (manifest.status === "ready" ? "资料库可用于名称和图标解析。" : manifest.label),
      tone: props.diagnosticError ? "error" : manifest.status === "ready" ? "ready" : "warning",
      badge: props.diagnosticError ? "失败" : manifest.status === "ready" ? "正常" : "待处理"
    }
  ];
}

function sourceIntelRow(label: string, source?: HomeDailySource): HomeIntelSection["rows"][number] {
  if (!source) {
    return {
      label,
      detail: "等待今日信息刷新。",
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

function sourceSummaryCard(key: string, fallbackTitle: string, source: HomeDailySource): HomeSummaryCard {
  const firstItem = source.items?.[0];
  return {
    key,
    title: firstItem?.title ?? fallbackTitle,
    message: firstItem ? describeDailyItem(firstItem) : source.message,
    tone: source.status === "ready" ? "ready" : "warning",
    badge: source.status === "ready" ? "已确认" : "待确认"
  };
}

function describeDailyItem(item: HomeDailyItem): string {
  return [item.subtitle, item.description, item.source].filter(Boolean).join("，") || item.title;
}

function formatToneLabel(tone: HomeTone): string {
  if (tone === "ready") {
    return "已确认";
  }
  if (tone === "warning") {
    return "待确认";
  }
  if (tone === "error") {
    return "异常";
  }
  return "关注";
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
