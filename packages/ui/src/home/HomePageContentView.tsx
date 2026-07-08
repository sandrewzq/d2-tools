import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale, HomeCopy } from "../i18n/types.js";
import type { ShellPageKey } from "../shell/types.js";
import { ProductWorkspacePanel } from "../workspace/ProductWorkspace.js";

export type HomeTone = "neutral" | "ready" | "warning" | "error";

export type HomeDailyItem = {
  title: string;
  subtitle?: string;
  description?: string;
  source?: string;
  iconUrl?: string;
  icon?: string;
  iconLabel?: string;
  items?: HomeDailyItem[];
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

type HomeRewardSourceKey =
  | "gambit"
  | "nightfall"
  | "crucible"
  | "raid"
  | "dares"
  | "dungeon"
  | "dlc"
  | "destination";

type HomeRewardGroup = {
  key: string;
  title: string;
  meta: string;
  items: Array<{
    label: string;
    detail: string;
    tone: HomeTone;
    source: HomeRewardSourceKey;
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

type HomeXurSpotlight = {
  title: string;
  subtitle: string;
  detail: string;
  tone: HomeTone;
  badge: string;
  items: Array<{
    label: string;
    detail: string;
    tone: HomeTone;
    iconUrl?: string;
    iconLabel?: string;
    iconTone: "exotic" | "weapon" | "armor" | "material";
  }>;
};

type HomeSummaryCard = {
  key: string;
  title: string;
  message: string;
  tone: HomeTone;
  badge: string;
  items?: HomeDailyItem[];
  overflowLabel?: string;
};

export type HomePageViewProps = {
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

export function HomePageContentView(props: HomePageViewProps) {
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
    onRefreshDiagnostics: props.onRefreshDiagnostics ?? noop
  };
  const rewardGroups = buildHomeRewardGroups(viewProps.dailySummary, copy);
  const weeklyIntel = buildWeeklyIntelSections(viewProps.dailySummary, copy);
  const xurSpotlight = buildXurSpotlight(viewProps.dailySummary?.sources.vendors, copy);
  const todayCards = buildTodayConfirmationCards(viewProps.dailySummary, copy);
  const accountRows = buildAccountRows(viewProps, copy);
  const dailyResetStatus = formatResetStatus(viewProps.dailySummary?.daily_reset, copy.labels.dailyReset, homeText(copy, "每日重置、遗失区域、活动线索和账号待办"));
  const weeklyResetStatus = formatWeeklyResetStatus(viewProps.dailySummary, copy);

  return (
    <>
      {viewProps.dailyError ? <p className="status-message status-error">{viewProps.dailyError}</p> : null}
      {viewProps.dailyMessage ? <p className="status-message status-ready">{viewProps.dailyMessage}</p> : null}

      <div className="home-briefing-grid">
        <ProductWorkspacePanel className="home-daily-panel">
          <div className="app-section-title">
            <div>
              <h2>{homeText(copy, "本日更新")}</h2>
              <span>{dailyResetStatus}</span>
            </div>
          </div>

          <div className="home-daily-lead">
            {todayCards.map((card) => renderHomeSummaryCard(card))}
          </div>

          <section className="home-briefing-section">
            <div className="home-reward-heading">
              <strong>{copy.sections.account.title}</strong>
              <span>{homeText(copy, "只显示会影响今天游玩决策的账号提醒")}</span>
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
        </ProductWorkspacePanel>

        <ProductWorkspacePanel className="home-weekly-panel">
          <div className="app-section-title">
            <div>
              <h2>{homeText(copy, "本周更新")}</h2>
              <span>{weeklyResetStatus}</span>
            </div>
            <span className={toneClass("warning", "app-chip")}>{copy.sections.weeklyRewards.badge}</span>
          </div>

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

          <div className="home-weekly-dashboard">
            <div className="home-weekly-rewards">
              {rewardGroups.map((group) => (
                <section className="home-reward-group" key={group.key}>
                  <div className="home-reward-heading">
                    <strong>{group.title}</strong>
                    <span>{group.meta}</span>
                  </div>
                  <div className="home-reward-list">
                    {group.items.map((item) => (
                      <article className="home-reward-item" data-source={item.source} data-tone={item.tone} key={group.key + item.label}>
                        <div>
                          <strong>{item.label}</strong>
                          <span>{item.detail}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
              {renderXurSpotlight(xurSpotlight, copy)}
            </div>

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
        </ProductWorkspacePanel>
      </div>
    </>
  );
}

function renderXurSpotlight(xurSpotlight: HomeXurSpotlight, copy: HomeCopy) {
  return (
    <section className="home-xur-spotlight" data-tone={xurSpotlight.tone}>
      <div className="home-xur-heading">
        <div>
          <span>{homeText(copy, "周商人")}</span>
          <strong>{xurSpotlight.title}</strong>
          <small>{xurSpotlight.subtitle}</small>
        </div>
        <span className={toneClass(xurSpotlight.tone, "app-chip")}>{xurSpotlight.badge}</span>
      </div>
      <p>{xurSpotlight.detail}</p>
      <div className="home-xur-item-grid">
        {xurSpotlight.items.map((item, index) => (
          <article className="home-xur-item" data-tone={item.tone} key={`${item.label}-${index}`}>
            <span className="home-xur-item-icon" data-icon-tone={item.iconTone} aria-hidden="true">
              <img alt="" src={item.iconUrl ?? createXurItemIconUrl(item)} />
            </span>
            <div>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function buildHomeRewardGroups(dailySummary: HomeDailySummary | null, copy: HomeCopy): HomeRewardGroup[] {
  const weeklyReportReady = dailySummary?.sources.weekly_report.status === "ready";
  return [
    {
      key: "power",
      title: copy.rewardGroups.powerTitle,
      meta: copy.fallback.weeklyFixedMeta,
      items: [
        { label: homeText(copy, "智谋"), detail: homeText(copy, "完成每周挑战后降噪"), tone: "warning", source: "gambit" },
        { label: homeText(copy, "日落任务"), detail: weeklyReportReady ? homeText(copy, "本周周报已有线索") : homeText(copy, "武器和难度待确认"), tone: weeklyReportReady ? "ready" : "warning", source: "nightfall" },
        { label: homeText(copy, "熔炉竞技场"), detail: homeText(copy, "检查每周挑战和声望奖励"), tone: "warning", source: "crucible" },
        { label: homeText(copy, "突袭"), detail: homeText(copy, "优先看轮换突袭和巅峰奖励"), tone: weeklyReportReady ? "ready" : "warning", source: "raid" }
      ]
    },
    {
      key: "other",
      title: copy.rewardGroups.otherTitle,
      meta: copy.fallback.otherRewardMeta,
      items: [
        { label: homeText(copy, "永恒沙漠"), detail: homeText(copy, "轮换奖励待确认"), tone: "neutral", source: "dares" },
        { label: homeText(copy, "克洛塔的末日"), detail: homeText(copy, "突袭轮换关注"), tone: "neutral", source: "raid" },
        { label: homeText(copy, "玻璃拱顶"), detail: homeText(copy, "旧突袭轮换关注"), tone: "neutral", source: "raid" },
        { label: homeText(copy, "宿命边缘"), detail: homeText(copy, "地牢 / 赛季奖励关注"), tone: "neutral", source: "dungeon" },
        { label: homeText(copy, "传承：终焉之形"), detail: homeText(copy, "DLC 周常关注"), tone: "neutral", source: "dlc" },
        { label: homeText(copy, "苍白之心寻路者"), detail: homeText(copy, "完成后从首页降噪"), tone: "neutral", source: "destination" }
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

function buildXurSpotlight(source: HomeDailySource | undefined, copy: HomeCopy): HomeXurSpotlight {
  if (!source) {
    return {
      title: copy.intel.xur,
      subtitle: copy.vendors.xurDetail,
      detail: copy.fallback.vendorsWaiting,
      tone: "neutral",
      badge: copy.vendors.waitingBadge,
      items: buildFallbackXurItems(copy)
    };
  }

  const firstItem = source.items?.[0];
  const parsedItems = buildXurItems(source, copy);
  return {
    title: firstItem?.title ?? copy.intel.xur,
    subtitle: firstItem?.subtitle ?? copy.vendors.xurDetail,
    detail: firstItem?.source ?? source.message,
    tone: source.status === "ready" ? "ready" : "warning",
    badge: source.status === "ready" ? copy.labels.confirmed : copy.labels.pending,
    items: parsedItems.length ? parsedItems : buildFallbackXurItems(copy)
  };
}

function buildXurItems(source: HomeDailySource, copy: HomeCopy): HomeXurSpotlight["items"] {
  const sourceItems = source.items ?? [];
  const nestedSaleItems = sourceItems.find((item) => item.items?.length)?.items ?? [];
  if (nestedSaleItems.length) {
    return nestedSaleItems.slice(0, 8).map((item) => ({
      label: item.title,
      detail: [item.subtitle, item.description].filter(Boolean).join(" / ") || homeText(copy, "售卖物待确认"),
      tone: source.status === "ready" ? "ready" : "warning",
      iconUrl: normalizeBungieIconUrl(item.iconUrl ?? item.icon),
      iconLabel: item.iconLabel,
      iconTone: inferXurIconTone([item.title, item.subtitle, item.description].filter(Boolean).join(" "))
    }));
  }

  if (sourceItems.length > 1) {
    return sourceItems.slice(0, 8).map((item) => ({
      label: item.title,
      detail: [item.subtitle, item.description, item.source].filter(Boolean).join(" / ") || homeText(copy, "售卖物待确认"),
      tone: source.status === "ready" ? "ready" : "warning",
      iconUrl: normalizeBungieIconUrl(item.iconUrl ?? item.icon),
      iconLabel: item.iconLabel,
      iconTone: inferXurIconTone([item.title, item.subtitle, item.description].filter(Boolean).join(" "))
    }));
  }

  const longDescription = [sourceItems[0]?.description, sourceItems[0]?.source]
    .filter(Boolean)
    .join(" / ");
  return splitXurItemText(longDescription)
    .slice(0, 8)
    .map((label) => ({
      label,
      detail: homeText(copy, "异域或传说装备"),
      tone: source.status === "ready" ? "ready" : "warning",
      iconLabel: getXurIconLabel(label),
      iconTone: inferXurIconTone(label)
    }));
}

function splitXurItemText(value: string): string[] {
  return value
    .split(/\s*\/\s*/)
    .map((part) => part.replace(/，?\s*Bungie\s*$/i, "").trim())
    .filter((part) => part && part.length <= 40);
}

function buildFallbackXurItems(copy: HomeCopy): HomeXurSpotlight["items"] {
  return [
    { label: homeText(copy, "异域武器"), detail: homeText(copy, "周末开启后确认"), tone: "neutral", iconLabel: "EX", iconTone: "exotic" },
    { label: homeText(copy, "泰坦护甲"), detail: homeText(copy, "周末开启后确认"), tone: "neutral", iconLabel: "TN", iconTone: "armor" },
    { label: homeText(copy, "猎人护甲"), detail: homeText(copy, "周末开启后确认"), tone: "neutral", iconLabel: "HN", iconTone: "armor" },
    { label: homeText(copy, "术士护甲"), detail: homeText(copy, "周末开启后确认"), tone: "neutral", iconLabel: "WL", iconTone: "armor" }
  ];
}

function normalizeBungieIconUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  if (value.startsWith("/")) return `https://www.bungie.net${value}`;
  return value;
}

function inferXurIconTone(value: string): HomeXurSpotlight["items"][number]["iconTone"] {
  if (/材料|货币|模组|赏金|Material|Currency|Mod|Bounty/i.test(value)) return "material";
  if (/护甲|头盔|臂铠|胸甲|腿甲|职业|泰坦|猎人|术士|Armor|Helmet|Gauntlets|Chest|Leg|Titan|Hunter|Warlock/i.test(value)) return "armor";
  if (/异域|Exotic/i.test(value)) return "exotic";
  return "weapon";
}

function createXurItemIconUrl(item: HomeXurSpotlight["items"][number]): string {
  const color = getXurIconColor(item.iconTone);
  const accent = getXurIconAccent(item.iconTone);
  const mark = item.iconTone === "weapon"
    ? '<path d="M20 57h40l10-10h8v8h-5l-9 9H20v-7Z" fill="#fff" opacity=".82"/><path d="M26 42h28l8 8H26v-8Z" fill="#fff" opacity=".42"/>'
    : item.iconTone === "armor"
      ? '<path d="M48 16l26 11v20c0 17-10 27-26 34-16-7-26-17-26-34V27l26-11Z" fill="#fff" opacity=".72"/><path d="M36 36h24v26H36V36Z" fill="#000" opacity=".18"/>'
      : item.iconTone === "material"
        ? '<path d="M48 16l28 32-28 32-28-32 28-32Z" fill="#fff" opacity=".74"/><path d="M48 30l14 18-14 18-14-18 14-18Z" fill="#000" opacity=".16"/>'
        : '<circle cx="48" cy="48" r="29" fill="#fff" opacity=".72"/><path d="M48 24l7 17 18 2-14 12 4 17-15-9-15 9 4-17-14-12 18-2 7-17Z" fill="#000" opacity=".18"/>';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="${color}"/>
          <stop offset="1" stop-color="${accent}"/>
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="12" fill="url(#g)"/>
      <path d="M0 72 72 0h24v96H0V72Z" fill="#000" opacity=".14"/>
      ${mark}
      <text x="48" y="86" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="#fff" opacity=".78">${escapeXurSvgText(item.iconLabel ?? getXurIconLabel(item.label))}</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getXurIconColor(tone: HomeXurSpotlight["items"][number]["iconTone"]): string {
  if (tone === "exotic") return "#d7a33a";
  if (tone === "armor") return "#b7a1e8";
  if (tone === "material") return "#6fc39a";
  return "#8bb8e8";
}

function getXurIconAccent(tone: HomeXurSpotlight["items"][number]["iconTone"]): string {
  if (tone === "exotic") return "#7b4f15";
  if (tone === "armor") return "#5d408d";
  if (tone === "material") return "#226246";
  return "#235c9d";
}

function getXurIconLabel(value: string): string {
  const letters = Array.from(value.trim()).filter((char) => char.trim());
  return letters.slice(0, Math.min(letters.length, 2)).join("") || "X";
}

function escapeXurSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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
    ...sourceSummaryCards("lost-sector", homeText(copy, "遗失区域"), dailySummary.sources.lost_sector, copy),
    sourceSummaryCard("rotations", copy.intel.activityIntel, dailySummary.sources.rotations, copy)
  ];
}

function formatWeeklyResetStatus(dailySummary: HomeDailySummary | null, copy: HomeCopy): string {
  return formatResetStatus(dailySummary?.weekly_reset, copy.labels.weeklyReset, homeText(copy, "强力、巅峰、轮换活动和周末窗口"));
}

function formatResetStatus(
  reset: { label: string; time_remaining_label: string } | undefined,
  label: string,
  fallback: string
): string {
  if (!reset) {
    return fallback;
  }

  const remaining = compactResetCountdown(reset.time_remaining_label, label);
  if (remaining) {
    return `${label} · ${remaining}`;
  }
  return reset.label || label;
}

function compactResetCountdown(value: string, label: string): string {
  return value
    .trim()
    .replace(new RegExp(`^距离${escapeRegExp(label)}还有\\s*`, "i"), "")
    .replace(/^距离(?:每日|每周)重置还有\s*/i, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
      key: "diagnostic",
      title: warnings.length ? copy.account.diagnosticWarningTitle : copy.account.diagnosticReadyTitle,
      message: warnings.length ? copy.account.diagnosticWarning(warnings.length) : copy.account.diagnosticReady,
      tone: warnings.length ? "warning" : "ready",
      badge: warnings.length ? copy.account.diagnosticWarningBadge : copy.account.readyBadge
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

function sourceSummaryCards(keyPrefix: string, fallbackTitle: string, source: HomeDailySource, copy: HomeCopy): HomeSummaryCard[] {
  const items = source.items ?? [];
  if (!items.length) {
    return [sourceSummaryCard(keyPrefix, fallbackTitle, source, copy)];
  }

  if (keyPrefix === "lost-sector" && items.length > 1) {
    const visibleItems = items.slice(0, 3);
    const hiddenCount = Math.max(0, items.length - visibleItems.length);
    return [{
      key: keyPrefix,
      title: homeText(copy, "今日世界遗失区域"),
      message: `${items.length} 个区域 · 每个目的地每日 1 个`,
      tone: source.status === "ready" ? "ready" : "warning",
      badge: source.status === "ready" ? copy.labels.confirmed : copy.labels.pending,
      items: visibleItems,
      overflowLabel: hiddenCount > 0 ? `另有 ${hiddenCount} 个区域` : undefined
    }];
  }

  return items.map((item, index) => ({
    key: `${keyPrefix}-${index}`,
    title: item.title || fallbackTitle,
    message: describeDailyItem(item),
    tone: source.status === "ready" ? "ready" : "warning",
    badge: source.status === "ready" ? copy.labels.confirmed : copy.labels.pending
  }));
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
      {card.items?.length ? (
        <div className="home-summary-list">
          {card.items.map((item) => (
            <span key={item.title}>{item.title}</span>
          ))}
          {card.overflowLabel ? <small>{card.overflowLabel}</small> : null}
        </div>
      ) : null}
      <span className={toneClass(card.tone, "app-chip")}>{card.badge}</span>
    </article>
  );
}
