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
  weeklyActivityKind?: HomeWeeklyActivityKind;
  iconUrl?: string;
  icon?: string;
  iconLabel?: string;
  destinationName?: string;
  championTypes?: string[];
  shieldTypes?: string[];
  threatType?: string;
  expertSoloRewards?: string[];
  masterSoloRewards?: string[];
  vendorHash?: number;
  items?: HomeDailyItem[];
};

export type HomeWeeklyActivityKind = "nightfall" | "rotating_raid" | "rotating_dungeon" | "weekly_bonus" | "special_event" | "public_clue";

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

export type HomeWeeklyPriorityKind =
  | "nightfall"
  | "rotating_raid"
  | "rotating_dungeon"
  | "weekly_bonus"
  | "special_event";

export type HomeWeeklySummary = {
  weekly_reset: {
    label: string;
    time_remaining_label: string;
  };
  priorities: Record<HomeWeeklyPriorityKind, {
    status: "ready" | "pending";
    title: string;
    detail: string;
    evidence?: string;
    source?: string;
  }>;
  public_clues: HomeDailyItem[];
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

type HomeWeeklyCard = {
  key: string;
  title: string;
  value: string;
  detail: string;
  tone: HomeTone;
  source: HomeRewardSourceKey;
  badge: string;
};

type HomeWeeklySupportSection = {
  key: string;
  title: string;
  detail: string;
  tone: HomeTone;
  badge: string;
  items?: Array<{ label: string; detail: string; iconUrl?: string }>;
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

type HomeWeeklyBriefing = {
  cards: HomeWeeklyCard[];
  supportSections: HomeWeeklySupportSection[];
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
  weeklySummary?: HomeWeeklySummary | null;
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
    weeklySummary: props.weeklySummary ?? null,
    dailyMessage: props.dailyMessage ?? "",
    dailyError: props.dailyError ?? "",
    isLoadingDaily: props.isLoadingDaily ?? false,
    onRefreshDiagnostics: props.onRefreshDiagnostics ?? noop
  };
  const weeklyBriefing = buildWeeklyBriefing(viewProps.dailySummary, viewProps.weeklySummary, copy);
  const xurSpotlight = buildXurSpotlight(viewProps.dailySummary?.sources.vendors, copy);
  const todayCards = buildTodayConfirmationCards(viewProps.dailySummary, copy);
  const dailyResetStatus = formatResetStatus(viewProps.dailySummary?.daily_reset, copy.labels.dailyReset, homeText(copy, "每日重置、遗失区域和重点商人预留"));
  const weeklyResetStatus = formatWeeklyResetStatus(viewProps.weeklySummary, viewProps.dailySummary, copy);

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
        </ProductWorkspacePanel>

        <ProductWorkspacePanel className="home-weekly-panel">
          <div className="app-section-title">
            <div>
              <h2>{homeText(copy, "本周更新")}</h2>
              <span>{weeklyResetStatus}</span>
            </div>
            <span className={toneClass("ready", "app-chip")}>{copy.sections.weeklyRewards.badge}</span>
          </div>

          <div className="home-weekly-summary">
            <div>
              <span>{copy.labels.priority}</span>
              <strong>{copy.rewardGroups.powerPriority}</strong>
            </div>
            <div className="home-reward-count">
              <strong>{weeklyBriefing.cards.length}</strong>
              <span>{copy.labels.focusCount}</span>
            </div>
          </div>

          <div className="home-weekly-dashboard">
            <div className="home-weekly-primary-grid">
              {weeklyBriefing.cards.map((card) => (
                <article className="home-weekly-card" data-source={card.source} data-tone={card.tone} key={card.key}>
                  <div>
                    <span>{card.title}</span>
                    <strong>{card.value}</strong>
                  </div>
                  <p>{card.detail}</p>
                  <span className={toneClass(card.tone, "app-chip")}>{card.badge}</span>
                </article>
              ))}
            </div>

            <div className="home-weekly-support" aria-label={homeText(copy, "本周辅助线索")}>
              {renderXurSpotlight(xurSpotlight, copy)}
              {weeklyBriefing.supportSections.map((section) => (
                <section className="home-weekly-support-section" data-tone={section.tone} key={section.key}>
                  <div className="home-weekly-support-heading">
                    <div>
                      <strong>{section.title}</strong>
                      <span>{section.detail}</span>
                    </div>
                    <span className={toneClass(section.tone, "app-chip")}>{section.badge}</span>
                  </div>
                  {section.items?.length ? (
                    <div className="home-weekly-support-list">
                      {section.items.map((item) => (
                        <div className="home-weekly-support-row" data-has-icon={item.iconUrl ? "true" : "false"} key={`${section.key}-${item.label}`}>
                          {item.iconUrl ? (
                            <img
                              alt=""
                              className="home-weekly-support-icon"
                              onError={(event) => {
                                event.currentTarget.src = createWeeklySupportIconUrl(item.label);
                              }}
                              src={item.iconUrl}
                            />
                          ) : null}
                          <strong>{item.label}</strong>
                          <span>{item.detail}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
          </div>
        </ProductWorkspacePanel>
      </div>
    </>
  );
}

function buildWeeklyBriefing(
  dailySummary: HomeDailySummary | null,
  weeklySummary: HomeWeeklySummary | null,
  copy: HomeCopy
): HomeWeeklyBriefing {
  if (weeklySummary) {
    const cards: HomeWeeklyCard[] = [
      buildWeeklySummaryCard({
        key: "nightfall",
        title: homeText(copy, "本周日落任务"),
        priority: weeklySummary.priorities.nightfall,
        fallbackValue: homeText(copy, "日落任务待确认"),
        fallbackDetail: copy.fallback.nightfallWaiting,
        source: "nightfall",
        copy
      }),
      buildWeeklySummaryCard({
        key: "raid",
        title: homeText(copy, "本周轮换突袭"),
        priority: weeklySummary.priorities.rotating_raid,
        fallbackValue: homeText(copy, "轮换突袭待确认"),
        fallbackDetail: homeText(copy, "确认后展示可刷奖励状态"),
        source: "raid",
        copy
      }),
      buildWeeklySummaryCard({
        key: "dungeon",
        title: homeText(copy, "本周轮换地牢"),
        priority: weeklySummary.priorities.rotating_dungeon,
        fallbackValue: homeText(copy, "轮换地牢待确认"),
        fallbackDetail: homeText(copy, "确认后展示可刷奖励状态"),
        source: "dungeon",
        copy
      }),
      buildWeeklySummaryCard({
        key: "bonus",
        title: homeText(copy, "本周加成"),
        priority: weeklySummary.priorities.weekly_bonus,
        fallbackValue: homeText(copy, "奖励加成待确认"),
        fallbackDetail: homeText(copy, "先锋、熔炉、智谋或日落加成确认后展示"),
        source: "crucible",
        copy
      }),
      buildWeeklySummaryCard({
        key: "event",
        title: homeText(copy, "特殊活动"),
        priority: weeklySummary.priorities.special_event,
        fallbackValue: homeText(copy, "暂无可确认特殊活动"),
        fallbackDetail: homeText(copy, "只显示已确认的限时活动"),
        source: "destination",
        copy
      })
    ];

    return {
      cards,
      supportSections: [
        buildWeeklyPublicCluesSection(weeklySummary.public_clues, copy, cards.map((card) => card.value))
      ]
    };
  }

  const weeklyItems = [
    ...(dailySummary?.sources.weekly_report.items ?? []),
    ...(dailySummary?.sources.rotations.items ?? [])
  ].filter((item) => !isExcludedWeeklyItem(item));

  const weeklyReportTone = sourceTone(dailySummary?.sources.weekly_report);
  const rotationsTone = sourceTone(dailySummary?.sources.rotations);

  const cards: HomeWeeklyCard[] = [
    buildWeeklyCard({
      key: "nightfall",
      title: homeText(copy, "本周日落任务"),
      item: findWeeklyItem(weeklyItems, "nightfall", [/日落|Nightfall/i], [/勇士|护盾|威胁|Champion|Shield|Threat/i]),
      fallbackValue: homeText(copy, "日落任务待确认"),
      fallbackDetail: copy.fallback.nightfallWaiting,
      tone: weeklyReportTone,
      source: "nightfall",
      copy
    }),
    buildWeeklyCard({
      key: "raid",
      title: homeText(copy, "本周轮换突袭"),
      item: findWeeklyItem(weeklyItems, "rotating_raid", [/轮换突袭|突袭|Raid/i], [/地牢|Dungeon|日落|Nightfall/i]),
      fallbackValue: homeText(copy, "轮换突袭待确认"),
      fallbackDetail: homeText(copy, "确认后展示可刷奖励状态"),
      tone: rotationsTone,
      source: "raid",
      copy
    }),
    buildWeeklyCard({
      key: "dungeon",
      title: homeText(copy, "本周轮换地牢"),
      item: findWeeklyItem(weeklyItems, "rotating_dungeon", [/轮换地牢|地牢|Dungeon/i]),
      fallbackValue: homeText(copy, "轮换地牢待确认"),
      fallbackDetail: homeText(copy, "确认后展示可刷奖励状态"),
      tone: rotationsTone,
      source: "dungeon",
      copy
    }),
    buildWeeklyCard({
      key: "bonus",
      title: homeText(copy, "本周加成"),
      item: findWeeklyItem(weeklyItems, "weekly_bonus", [/加成|双倍|声望|奖励加成|Bonus|reputation/i]),
      fallbackValue: homeText(copy, "奖励加成待确认"),
      fallbackDetail: homeText(copy, "先锋、熔炉、智谋或日落加成确认后展示"),
      tone: rotationsTone,
      source: "crucible",
      copy
    }),
    buildWeeklyCard({
      key: "event",
      title: homeText(copy, "特殊活动"),
      item: findWeeklyItem(weeklyItems, "special_event", [/特殊活动|限时活动|曙光|英灵日|守护者游戏|至日|Event|Festival|Solstice|Guardian Games/i]),
      fallbackValue: homeText(copy, "暂无可确认特殊活动"),
      fallbackDetail: homeText(copy, "只显示已确认的限时活动"),
      tone: "neutral",
      source: "destination",
      copy
    })
  ];

  return {
    cards,
    supportSections: [
      buildPublicCluesSection(dailySummary?.sources.rotations, copy, cards.map((card) => card.value))
    ]
  };
}

function buildWeeklyCard(options: {
  key: string;
  title: string;
  item: HomeDailyItem | undefined;
  fallbackValue: string;
  fallbackDetail: string;
  tone: HomeTone;
  source: HomeRewardSourceKey;
  copy: HomeCopy;
}): HomeWeeklyCard {
  return {
    key: options.key,
    title: options.title,
    value: getWeeklyCardValue(options.item, options.key) || options.fallbackValue,
    detail: describeWeeklyPriorityItem(options.item) || options.fallbackDetail,
    tone: options.item ? options.tone : "neutral",
    source: options.source,
    badge: options.item ? options.copy.labels.confirmed : options.copy.labels.pending
  };
}

function buildWeeklySummaryCard(options: {
  key: string;
  title: string;
  priority: HomeWeeklySummary["priorities"][HomeWeeklyPriorityKind];
  fallbackValue: string;
  fallbackDetail: string;
  source: HomeRewardSourceKey;
  copy: HomeCopy;
}): HomeWeeklyCard {
  const isReady = options.priority.status === "ready";
  return {
    key: options.key,
    title: options.title,
    value: isReady ? sanitizeWeeklyText(options.priority.title) : options.fallbackValue,
    detail: isReady ? sanitizeWeeklyText(options.priority.detail) : options.fallbackDetail,
    tone: isReady ? "ready" : "neutral",
    source: options.source,
    badge: isReady ? options.copy.labels.confirmed : options.copy.labels.pending
  };
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
              <img
                alt=""
                onError={(event) => {
                  event.currentTarget.src = createXurItemIconUrl(item);
                }}
                src={item.iconUrl ?? createXurItemIconUrl(item)}
              />
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

  const xurItem = findXurVendorItem(source.items ?? []);
  const parsedItems = buildXurItems(source, xurItem, copy);
  return {
    title: xurItem?.title ?? copy.intel.xur,
    subtitle: xurItem?.subtitle ?? copy.vendors.xurDetail,
    detail: xurItem?.source ?? source.message,
    tone: xurItem && source.status === "ready" ? "ready" : "neutral",
    badge: xurItem && source.status === "ready" ? copy.labels.confirmed : copy.vendors.waitingBadge,
    items: parsedItems.length ? parsedItems : buildFallbackXurItems(copy)
  };
}

function findXurVendorItem(items: HomeDailyItem[]): HomeDailyItem | undefined {
  return items.find((item) => item.vendorHash === 2190858386)
    ?? items.find((item) => /(?:^|\s)(?:Xûr|Xur)(?:\s|$)|仄|老九|周末异域商人/i.test([item.title, item.subtitle, item.description, item.source].filter(Boolean).join(" ")));
}

function buildXurItems(source: HomeDailySource, xurItem: HomeDailyItem | undefined, copy: HomeCopy): HomeXurSpotlight["items"] {
  if (!xurItem) return [];

  const nestedSaleItems = xurItem.items ?? [];
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

  const longDescription = [xurItem.description, xurItem.source]
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

function buildWeeklyPublicCluesSection(items: HomeDailyItem[], copy: HomeCopy, selectedWeeklyValues: string[]): HomeWeeklySupportSection {
  const clueItems = items
    .filter((item) => !selectedWeeklyValues.includes(sanitizeWeeklyText(item.title)))
    .map((item) => {
      const label = sanitizePublicClueText(item.title) || homeText(copy, "公共线索");
      const detail = sanitizePublicClueText(item.subtitle)
        || sanitizePublicClueText(item.description)
        || sanitizePublicClueText(item.source)
        || copy.fallback.waitingRefresh;
      return { label, detail };
    })
    .filter((item) => item.label !== item.detail)
    .slice(0, 3);

  return {
    key: "public-clues",
    title: homeText(copy, "公共线索"),
    detail: clueItems.length
      ? homeText(copy, "仅保留仍需核对的公开轮换线索")
      : homeText(copy, "暂无需要单独提示的公开线索"),
    tone: clueItems.length ? "ready" : "neutral",
    badge: clueItems.length ? copy.labels.focus : copy.labels.pending,
    items: clueItems
  };
}

function buildPublicCluesSection(source: HomeDailySource | undefined, copy: HomeCopy, selectedWeeklyValues: string[]): HomeWeeklySupportSection {
  const clueItems = (source?.items ?? [])
    .filter((item) => !isExcludedWeeklyItem(item))
    .filter((item) => !isRecognizedWeeklyPriority(item))
    .filter((item) => !selectedWeeklyValues.includes(sanitizeWeeklyText(item.title)))
    .map((item) => {
      const label = sanitizePublicClueText(item.title) || homeText(copy, "公共线索");
      const detail = sanitizePublicClueText(item.subtitle)
        || sanitizePublicClueText(item.description)
        || sanitizePublicClueText(item.source)
        || copy.fallback.waitingRefresh;
      return { label, detail };
    })
    .filter((item) => item.label !== item.detail)
    .slice(0, 3);

  return {
    key: "public-clues",
    title: homeText(copy, "公共线索"),
    detail: clueItems.length
      ? homeText(copy, "仅保留仍需核对的公开轮换线索")
      : homeText(copy, "暂无需要单独提示的公开线索"),
    tone: clueItems.length ? sourceTone(source) : "neutral",
    badge: clueItems.length ? copy.labels.focus : copy.labels.pending,
    items: clueItems
  };
}

function findWeeklyItem(
  items: HomeDailyItem[],
  kind: HomeWeeklyActivityKind,
  includes: RegExp[],
  excludes: RegExp[] = []
): HomeDailyItem | undefined {
  return items.find((item) => inferWeeklyActivityKind(item) === kind)
    ?? items.find((item) => {
    const value = weeklyItemText(item);
    return includes.some((pattern) => pattern.test(value)) && !excludes.some((pattern) => pattern.test(value));
  });
}

function weeklyItemText(item: HomeDailyItem): string {
  return [item.title, item.subtitle, item.description, item.source].filter(Boolean).join(" ");
}

function getWeeklyCardValue(item: HomeDailyItem | undefined, key: string): string {
  if (!item) return "";

  const kind = key === "raid"
    ? "rotating_raid"
    : key === "dungeon"
      ? "rotating_dungeon"
      : key === "nightfall"
        ? "nightfall"
        : key === "bonus"
          ? "weekly_bonus"
          : key === "event"
            ? "special_event"
            : null;

  if (kind === "rotating_raid") {
    return extractKnownActivityName(item, isKnownRaid) || sanitizeWeeklyText(item.title);
  }
  if (kind === "rotating_dungeon") {
    return extractKnownActivityName(item, isKnownDungeon) || sanitizeWeeklyText(item.title);
  }

  return sanitizeWeeklyText(item.title);
}

function extractKnownActivityName(item: HomeDailyItem, matcher: (value: string) => boolean): string {
  const candidates = [item.title, item.subtitle, item.description, item.source]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => splitWeeklyActivityCandidates(value));
  return candidates.find((candidate) => matcher(candidate)) ?? "";
}

function splitWeeklyActivityCandidates(value: string): string[] {
  return value
    .split(/[；;，,、/]|\s+\/\s+/)
    .map((part) => part.trim())
    .map((part) => part.replace(/^非完整掉落地图[:：]?\s*/i, ""))
    .map((part) => part.replace(/^Bungie\s*公共(?:里程碑|数据)[:：]?\s*/i, ""))
    .filter(Boolean);
}

function inferWeeklyActivityKind(item: HomeDailyItem): HomeWeeklyActivityKind | null {
  if (item.weeklyActivityKind) return item.weeklyActivityKind;

  const value = weeklyItemText(item);
  if (/试炼|Trials|铁旗|Iron Banner/i.test(value)) return null;
  if (/日落|Nightfall/i.test(value)) return "nightfall";
  if (/加成|双倍|声望|奖励加成|Bonus|reputation/i.test(value)) return "weekly_bonus";
  if (/特殊活动|限时活动|曙光|英灵日|守护者游戏|至日|Event|Festival|Solstice|Guardian Games/i.test(value)) return "special_event";
  if (isKnownDungeon(value) || /轮换地牢|地牢|Dungeon/i.test(value)) return "rotating_dungeon";
  if (isKnownRaid(value) || /轮换突袭|突袭|Raid/i.test(value)) return "rotating_raid";
  return null;
}

function isRecognizedWeeklyPriority(item: HomeDailyItem): boolean {
  return Boolean(inferWeeklyActivityKind(item));
}

function isKnownRaid(value: string): boolean {
  return /国王的陨落|克洛塔的末日|深岩墓室|玻璃拱顶|救赎花园|最后一愿|门徒誓约|梦魇根源|救赎边缘|King'?s Fall|Crota'?s End|Deep Stone Crypt|Vault of Glass|Garden of Salvation|Last Wish|Vow of the Disciple|Root of Nightmares|Salvation'?s Edge/i.test(value);
}

function isKnownDungeon(value: string): boolean {
  return /守望者尖塔|预言|二象性|贪婪之握|异端深渊|破碎王座|战争领主的废墟|鬼魅深渊|Spire of the Watcher|Prophecy|Duality|Grasp of Avarice|Pit of Heresy|Shattered Throne|Warlord'?s Ruin|Ghosts of the Deep/i.test(value);
}

function describeWeeklyPriorityItem(item: HomeDailyItem | undefined): string {
  if (!item) return "";
  return [item.subtitle, item.description, item.source]
    .map((part) => sanitizeWeeklyText(part))
    .filter(Boolean)
    .filter((part) => !/^本周(?:日落任务|轮换突袭|轮换地牢|加成)$/i.test(part))
    .join(" · ");
}

function sanitizeWeeklyText(value: string | undefined): string {
  if (!value) return "";
  return value
    .split(/[，,；;。]\s*/)
    .map((part) => part.trim())
    .filter((part) => part && !/^(?:勇士|护盾|威胁|Champion|Shield|Threat)[：:]/i.test(part))
    .filter((part) => !/Bungie\s*公共(?:里程碑|数据)|Manifest/i.test(part))
    .filter((part) => !/^非完整掉落地图/i.test(part))
    .join("，")
    .trim();
}

function sanitizePublicClueText(value: string | undefined): string {
  return sanitizeWeeklyText(value)
    .replace(/^公共线索[：:]\s*/, "")
    .replace(/^公开线索[：:]\s*/, "")
    .trim();
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
      <text x="48" y="86" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="#fff" opacity=".78">${escapeSvgText(item.iconLabel ?? getXurIconLabel(item.label))}</text>
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

function createWeeklySupportIconUrl(label: string): string {
  const initials = Array.from(label.trim()).filter((char) => char.trim()).slice(0, 2).join("") || "物";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#c6922e"/>
          <stop offset="1" stop-color="#4e6f91"/>
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="12" fill="url(#g)"/>
      <path d="M0 72 72 0h24v96H0V72Z" fill="#000" opacity=".16"/>
      <circle cx="48" cy="42" r="24" fill="#fff" opacity=".2"/>
      <text x="48" y="61" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#fff">${escapeSvgText(initials)}</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function isExcludedWeeklyItem(item: HomeDailyItem): boolean {
  return /试炼|Trials|铁旗|Iron Banner/i.test(weeklyItemText(item));
}

function sourceTone(source: HomeDailySource | undefined): HomeTone {
  if (!source) return "neutral";
  if (source.status === "pending") return "warning";
  return source.status;
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
    {
      key: "vendor-placeholder",
      title: homeText(copy, "重点商人"),
      message: homeText(copy, "规则整理中 · 完整库存先去商人页查看"),
      tone: "neutral",
      badge: homeText(copy, "预留")
    }
  ];
}

function formatWeeklyResetStatus(
  weeklySummary: HomeWeeklySummary | null,
  dailySummary: HomeDailySummary | null,
  copy: HomeCopy
): string {
  return formatResetStatus(weeklySummary?.weekly_reset ?? dailySummary?.weekly_reset, copy.labels.weeklyReset, homeText(copy, "日落、轮换突袭、轮换地牢、加成和特殊活动"));
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
    const readableItems = items.filter(hasLostSectorBriefingDetails);
    if (!readableItems.length) {
      return [{
        key: keyPrefix,
        title: homeText(copy, "今日世界遗失区域"),
        message: homeText(copy, "遗失区域详情暂不可读 · 请先更新或修复资料库"),
        tone: "warning",
        badge: copy.labels.pending
      }];
    }

    return [{
      key: keyPrefix,
      title: homeText(copy, "今日世界遗失区域"),
      message: `${readableItems.length} 个区域 · 每个目的地每日 1 个`,
      tone: source.status === "ready" ? "ready" : "warning",
      badge: source.status === "ready" ? copy.labels.confirmed : copy.labels.pending,
      items: readableItems
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

function hasLostSectorBriefingDetails(item: HomeDailyItem): boolean {
  return Boolean(
    item.destinationName
    && (
      item.championTypes?.length
      || item.shieldTypes?.length
      || item.threatType
      || item.expertSoloRewards?.length
      || item.masterSoloRewards?.length
    )
  );
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
            <div className="home-summary-list-item" key={`${item.destinationName ?? ""}-${item.title}`}>
              <div className="home-summary-list-item-main">
                {item.destinationName ? <span className="home-summary-destination">{item.destinationName}</span> : null}
                <strong>{item.title}</strong>
              </div>
              {renderLostSectorBriefing(item)}
            </div>
          ))}
          {card.overflowLabel ? <small>{card.overflowLabel}</small> : null}
        </div>
      ) : null}
      <span className={toneClass(card.tone, "app-chip")}>{card.badge}</span>
    </article>
  );
}

function renderLostSectorBriefing(item: HomeDailyItem) {
  const hasStructuredBriefing = Boolean(
    item.championTypes?.length
    || item.shieldTypes?.length
    || item.threatType
    || item.expertSoloRewards?.length
    || item.masterSoloRewards?.length
  );

  if (!hasStructuredBriefing) {
    return null;
  }

  return (
    <div className="home-lost-sector-briefing">
      {item.championTypes?.length ? <span>勇士：{item.championTypes.join("、")}</span> : null}
      {item.shieldTypes?.length ? <span>护盾：{item.shieldTypes.join("、")}</span> : null}
      {item.threatType ? <span>威胁：{item.threatType}</span> : null}
      {item.expertSoloRewards?.length ? (
        <div className="home-lost-sector-reward">
          <strong>专家：</strong>
          <span>单人奖励：{item.expertSoloRewards.join("、")}</span>
        </div>
      ) : null}
      {item.masterSoloRewards?.length ? (
        <div className="home-lost-sector-reward">
          <strong>大师：</strong>
          <span>单人奖励：{item.masterSoloRewards.join("、")}</span>
        </div>
      ) : null}
    </div>
  );
}
