import { useEffect, useState } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale, HomeCopy } from "../i18n/types.js";
import { isXurActiveAt, nextXurBoundaryAt, xurVendorHash } from "@d2-tools/core/daily/xurSchedule";
import type { ShellPageKey } from "../shell/types.js";
import type { VendorInventoryItemView, VendorOfferContextView } from "../vendors/VendorsPageContentView.js";
import { formatFullDateTime, formatScheduleDateTime } from "../time/formatTime.js";
import { createXurItemIconUrl, normalizeBungieIconUrl } from "./homeIconArt.js";
export type HomeTone = "neutral" | "ready" | "warning" | "error";
export type HomeDailyItem = {
  title: string;
  itemHash?: number;
  subtitle?: string;
  description?: string;
  source?: string;
  weeklyActivityKind?: HomeWeeklyActivityKind;
  related_hashes?: number[];
  rewards?: HomeWeeklyActivityReward[];
  iconUrl?: string;
  icon?: string;
  iconLabel?: string;
  classType?: number;
  destinationName?: string;
  championTypes?: string[];
  shieldTypes?: string[];
  threatType?: string;
  expertSoloRewards?: string[];
  masterSoloRewards?: string[];
  vendorHash?: number;
  characterId?: string;
  vendorEnabled?: boolean;
  vendorRefreshDate?: string;
  vendorLocation?: string;
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
    next_reset_iso?: string;
    time_remaining_label: string;
  };
  weekly_reset: {
    label: string;
    next_reset_iso?: string;
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
    next_reset_iso?: string;
    time_remaining_label: string;
  };
  priorities: Record<HomeWeeklyPriorityKind, {
    status: "ready" | "pending";
    title: string;
    detail: string;
    evidence?: string;
    source?: string;
    entries?: HomeWeeklyActivityEntry[];
  }>;
  public_clues: HomeDailyItem[];
};
export type HomeWeeklyActivityReward = {
  hash: number;
  name: string;
  icon?: string;
  item_type?: string;
};
export type HomeWeeklyActivityEntry = {
  title: string;
  detail?: string;
  evidence?: string;
  source?: string;
  related_hashes?: number[];
  rewards?: HomeWeeklyActivityReward[];
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
type HomeWeeklyPriority = HomeWeeklySummary["priorities"][HomeWeeklyPriorityKind];
type HomeConfirmedXur = {
  title: string;
  location?: string;
  refreshLabel?: string;
  inventoryCount: number;
  missingItemCount: number;
  isPartial: boolean;
  items: HomeDailyItem[];
};
const hiddenHomeXurItemTitles = new Set([
  "更多奇异优惠",
  "奇异装备优惠",
  "仄",
  "奇异记忆水晶",
  "More Exotic Offers",
  "Exotic Gear Offers",
  "Xur",
  "Xûr",
  "Exotic Engram"
]);
export type HomePageViewProps = {
  interfaceLocale?: InterfaceLocale;
  selectedCharacterId?: string;
  selectedCharacterLabel?: string;
  briefingFetchedAt?: string;
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
  onOpenWeeklyActivityReward?: (reward: HomeWeeklyActivityReward) => void;
  onOpenXurOffer?: (item: VendorInventoryItemView, context: VendorOfferContextView) => void;
};
function homeText(copy: HomeCopy, key: string): string {
  return copy.inline[key] ?? key;
}
export function HomePageContentView(props: HomePageViewProps) {
  const interfaceLocale = props.interfaceLocale ?? "zh-CN";
  const copy = getLocaleCopy(interfaceLocale).home;
  const clock = useHomeClock();
  const dailySummary = props.dailySummary ?? null;
  const weeklySummary = props.weeklySummary ?? null;
  const dailyError = props.dailyError ?? "";
  const isLoadingDaily = props.isLoadingDaily ?? false;
  const xur = dailyError || isLoadingDaily
    ? null
    : buildConfirmedXur(dailySummary?.sources.vendors, copy, clock, props.selectedCharacterId);
  return (
    <HomePageContent
      copy={copy}
      interfaceLocale={interfaceLocale}
      dailySummary={dailySummary}
      weeklySummary={weeklySummary}
      clock={clock}
      xur={xur}
      selectedCharacterLabel={props.selectedCharacterLabel}
      briefingFetchedAt={props.briefingFetchedAt}
      dailyMessage={props.dailyMessage ?? ""}
      dailyError={dailyError}
      isLoadingDaily={isLoadingDaily}
      onNavigate={props.onNavigate}
      onRefreshDaily={props.onRefreshDaily}
      onOpenWeeklyActivityReward={props.onOpenWeeklyActivityReward}
      onOpenXurOffer={props.onOpenXurOffer}
    />
  );
}
function HomePageContent(props: {
  copy: HomeCopy;
  interfaceLocale: InterfaceLocale;
  dailySummary: HomeDailySummary | null;
  weeklySummary: HomeWeeklySummary | null;
  clock: Date;
  xur: HomeConfirmedXur | null;
  selectedCharacterLabel?: string;
  briefingFetchedAt?: string;
  dailyMessage: string;
  dailyError: string;
  isLoadingDaily: boolean;
  onNavigate?: (page: ShellPageKey) => void;
  onRefreshDaily?: () => void;
  onOpenWeeklyActivityReward?: (reward: HomeWeeklyActivityReward) => void;
  onOpenXurOffer?: (item: VendorInventoryItemView, context: VendorOfferContextView) => void;
}) {
  const priorities = props.weeklySummary?.priorities;
  const activities = [
    { kind: "nightfall", label: homeText(props.copy, "日落打击"), priority: priorities?.nightfall },
    { kind: "raid", label: homeText(props.copy, "轮换突袭"), priority: priorities?.rotating_raid },
    { kind: "dungeon", label: homeText(props.copy, "轮换地牢"), priority: priorities?.rotating_dungeon }
  ] as const;
  const xur = props.xur;
  const xurItems = xur?.items ?? [];
  const refreshEntries = buildRefreshEntries(props.dailySummary, props.weeklySummary, props.clock, props.interfaceLocale, props.copy);
  return (
    <section className="home-page" data-page-view="home" data-surface="page">
      {props.dailyError || props.dailyMessage || props.isLoadingDaily ? (
        <section className="home-feedback-band" data-surface="section" aria-live="polite">
          {props.dailyError ? <HomeFeedback status="error" message={props.dailyError} onRetry={props.onRefreshDaily} /> : null}
          {props.dailyMessage ? <HomeFeedback status="success" message={props.dailyMessage} /> : null}
          {props.isLoadingDaily ? <HomeFeedback status="pending" message="正在刷新公开情报…" /> : null}
        </section>
      ) : null}
      <section className="home-content-band" data-surface="section">
        <div className="home-refresh-strip" data-surface="frame" data-ui-kind="status-matrix" aria-label="首页数据刷新节奏">
          {refreshEntries.map((entry) => <HomeRefreshCell key={entry.key} entry={entry} />)}
        </div>
      </section>
      <section className="home-content-band home-core-band" data-surface="section" aria-label="本周核心活动">
        <div className="weekly-activity-grid" data-surface="content-stack">
          {activities.map((activity) => (
            <HomeActivityCard
              key={activity.kind}
              {...activity}
              featured={activity.kind === "nightfall"}
              onOpenReward={props.onOpenWeeklyActivityReward}
            />
          ))}
        </div>
      </section>
      <section className="home-content-band home-signals-band" data-surface="section" aria-label="限时活动与本周加成">
        <div className="weekly-signal-grid" data-surface="content-stack">
          <HomeSignal label={homeText(props.copy, "限时活动")} priority={priorities?.special_event} />
          <HomeSignal label={homeText(props.copy, "本周加成")} priority={priorities?.weekly_bonus} />
        </div>
      </section>
      <section className="home-content-band home-vendor-band" data-surface="section" data-contract-id="home.vendor-stock" data-source="Vendor API + current library">
        <div className="home-band-heading">
          <div>
            <span data-ui-part="label" data-info-priority="support" data-text-tone="meta">周末商人</span>
            <h2 data-ui-part="value" data-info-priority="display" data-text-tone="primary">仄本周八件轮换</h2>
          </div>
          <button
            type="button"
            data-ui-kind="button" data-control-variant="secondary"
            disabled={!props.onNavigate}
            onClick={() => props.onNavigate?.("vendors")}
          >
            打开仄的完整库存
          </button>
        </div>
        <div className="home-vendor-content" data-surface="content-stack" data-status={homeVendorStatus(props)} aria-live="polite" aria-busy={props.isLoadingDaily}>
          {xur ? (
          <>
            <div className="home-vendor-overview" data-surface="frame" data-ui-kind="status-matrix">
              <div className="home-vendor-summary">
                <span data-ui-part="label" data-info-priority="support" data-text-tone="meta">本周八件轮换</span>
                <strong data-ui-part="value" data-info-priority="decision" data-text-tone="primary">
                  {formatHomeVendorSummary(xur, xurItems.length)}
                </strong>
              </div>
              <div className="home-vendor-summary">
                <span data-ui-part="label" data-info-priority="support" data-text-tone="meta">当前位置</span>
                <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{xur.location ?? xur.title}</strong>
              </div>
            </div>
            <div className="home-vendor-stock-grid">
              {xurItems.map((item, index) => (
                <HomeXurOffer
                  item={item}
                  key={`${item.title}-${item.vendorHash ?? "xur"}-${index}`}
                  vendorName={xur.title}
                  refreshLabel={xur.refreshLabel}
                  onOpenXurOffer={props.onOpenXurOffer}
                />
              ))}
              {xur.missingItemCount ? <HomeMissingXurOffer count={xur.missingItemCount} /> : null}
            </div>
          </>
          ) : (
            <HomeXurState
              source={props.dailySummary?.sources.vendors}
              isLoading={props.isLoadingDaily}
              error={props.dailyError}
              onRetry={props.onRefreshDaily}
            />
          )}
        </div>
        <small className="home-vendor-source" data-ui-part="source" data-info-priority="trace" data-text-tone="meta">
          {formatHomeVendorSource({
            xur,
            fetchedAt: props.briefingFetchedAt,
            selectedCharacterLabel: props.selectedCharacterLabel,
            isLoading: props.isLoadingDaily,
            error: props.dailyError
          })}
        </small>
      </section>
    </section>
  );
}

type HomeRefreshEntry = { key: "daily" | "weekly" | "xur"; label: string; moment: string; countdown: string; impact: string };

function HomeFeedback(props: { status: "success" | "pending" | "error"; message: string; onRetry?: () => void }) {
  return (
    <div
      className="home-feedback"
      data-ui-kind="callout"
      data-status={props.status}
      role={props.status === "error" ? "alert" : "status"}
    >
      <span data-ui-part="state" data-info-priority="decision" data-text-tone="status" data-status={props.status}>{props.message}</span>
      {props.status === "error" && props.onRetry ? (
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onRetry}>重新读取公开情报</button>
      ) : null}
    </div>
  );
}

function useHomeClock() {
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  return clock;
}

function buildRefreshEntries(
  daily: HomeDailySummary | null,
  weekly: HomeWeeklySummary | null,
  clock: Date,
  locale: InterfaceLocale,
  copy: HomeCopy
): HomeRefreshEntry[] {
  const xurTarget = nextXurBoundaryAt(clock);
  const xurActive = isXurActiveAt(clock);
  return [
    { key: "daily", label: homeText(copy, "每日更新"), moment: `下次：${resetMoment(daily?.daily_reset, homeText(copy, "时间待确认"), locale)}`, countdown: `倒计时：${resetCountdown(daily?.daily_reset, clock, copy)}`, impact: homeText(copy, "今日轮换、遗失区域") },
    { key: "weekly", label: homeText(copy, "每周更新"), moment: `下次：${resetMoment(weekly?.weekly_reset ?? daily?.weekly_reset, homeText(copy, "时间待确认"), locale)}`, countdown: `倒计时：${resetCountdown(weekly?.weekly_reset ?? daily?.weekly_reset, clock, copy)}`, impact: homeText(copy, "日落、轮换、周常加成") },
    { key: "xur", label: homeText(copy, xurActive ? "仄离开" : "仄到访"), moment: `${xurActive ? "离开" : "到访"}：${formatScheduleDateTime(xurTarget, locale, homeText(copy, "时间待确认"))}`, countdown: `倒计时：${compactDuration(clock, xurTarget, copy)}`, impact: homeText(copy, "仄八件异域轮换") }
  ];
}

function resetMoment(reset: { label: string; next_reset_iso?: string } | undefined, fallback: string, locale: InterfaceLocale) {
  if (reset?.next_reset_iso) {
    const target = new Date(reset.next_reset_iso);
    if (Number.isFinite(target.getTime())) return formatScheduleDateTime(target, locale, fallback);
  }
  return (reset?.label ?? fallback).replace(/^(?:每日|每周)重置[：:]\s*/i, "");
}

function resetCountdown(reset: { next_reset_iso?: string; time_remaining_label: string } | undefined, clock: Date, copy: HomeCopy) {
  if (reset?.next_reset_iso) {
    const target = new Date(reset.next_reset_iso);
    if (Number.isFinite(target.getTime())) return compactDuration(clock, target, copy);
  }
  return compactResetCountdown(reset?.time_remaining_label ?? "", "") || homeText(copy, "倒计时待确认");
}

function compactDuration(now: Date, target: Date, copy: HomeCopy) {
  const minutes = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 60_000));
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  const rest = minutes % 60;
  if (days) return `${days} ${homeText(copy, "天")} ${hours} ${homeText(copy, "小时")}`;
  return `${hours} ${homeText(copy, "小时")} ${rest} ${homeText(copy, "分钟")}`;
}

function HomeRefreshCell(props: { entry: HomeRefreshEntry }) {
  return (
    <div className="home-refresh-cell" data-refresh={props.entry.key}>
      <div className="home-refresh-heading">
        <RefreshGlyph kind={props.entry.key} />
        <span data-ui-part="label" data-info-priority="support" data-text-tone="body">{props.entry.label}</span>
      </div>
      <strong data-ui-part="value" data-info-priority="decision" data-text-tone="primary" data-value-kind="fact">{props.entry.moment}</strong>
      <small data-ui-part="state" data-info-priority="decision" data-text-tone="primary" data-value-kind="fact">{props.entry.countdown}</small>
      <small className="home-refresh-impact" data-ui-part="detail" data-info-priority="support" data-text-tone="body">影响：{props.entry.impact}</small>
    </div>
  );
}

function RefreshGlyph(props: { kind: HomeRefreshEntry["key"] }) {
  if (props.kind === "daily") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></svg>;
  if (props.kind === "weekly") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 7v5c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V7Z" /><path d="M9 12h6M12 9v6" /></svg>;
}

function HomeActivityCard(props: {
  kind: "nightfall" | "raid" | "dungeon";
  label: string;
  priority: HomeWeeklyPriority | undefined;
  featured: boolean;
  onOpenReward?: (reward: HomeWeeklyActivityReward) => void;
}) {
  const entries = homePriorityEntries(props.priority);
  const status = entries.length ? "success" : "pending";
  return (
    <article className={`weekly-activity-card is-${props.kind}`} data-surface="frame" data-ui-kind="summary-frame" data-status={status}>
      <header>
        <span data-ui-part="label" data-info-priority="context" data-text-tone="primary">{props.label}</span>
        <strong data-ui-part="state" data-info-priority="support" data-text-tone="status" data-status={status}>
          {entries.length ? `${entries.length} 项已确认` : "待确认"}
        </strong>
      </header>
      {entries.length ? (
        <div className="weekly-activity-list">
          {entries.map((entry) => (
            <HomeActivityEntry
              key={`${props.kind}-${entry.title}`}
              entry={entry}
              featured={props.featured}
              onOpenReward={props.onOpenReward}
            />
          ))}
        </div>
      ) : <HomeEmpty label="公开接口暂未确认本周内容。" />}
    </article>
  );
}

function HomeActivityEntry(props: {
  entry: HomeWeeklyActivityEntry;
  featured: boolean;
  onOpenReward?: (reward: HomeWeeklyActivityReward) => void;
}) {
  const rewards = props.entry.rewards?.filter((reward) => reward.name.trim()) ?? [];
  return (
    <div className={props.featured ? "weekly-activity-entry is-featured" : "weekly-activity-entry"}>
      <div className="weekly-activity-copy">
        <h3 data-ui-part="value" data-info-priority="decision" data-text-tone="primary">{props.entry.title}</h3>
        {props.entry.detail ? <p data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{props.entry.detail}</p> : null}
      </div>
      <div className="weekly-activity-reward-panel">
        <span data-ui-part="label" data-info-priority="support" data-text-tone="meta">本周奖励</span>
        <div className="weekly-activity-reward-list">
          {rewards.length ? rewards.map((reward) => (
            <HomeActivityReward key={reward.hash} reward={reward} onOpen={props.onOpenReward} />
          )) : (
            <div className="weekly-activity-reward is-pending">
              <div>
                <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">奖励待确认</strong>
                <small data-ui-part="detail" data-info-priority="reading" data-text-tone="body">公开接口尚未返回可读奖励。</small>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HomeActivityReward(props: {
  reward: HomeWeeklyActivityReward;
  onOpen?: (reward: HomeWeeklyActivityReward) => void;
}) {
  const content = <>
      {props.reward.icon ? (
        <span className="weekly-activity-reward-icon"><img src={normalizeBungieIconUrl(props.reward.icon) ?? props.reward.icon} alt="" /></span>
      ) : <span className="weekly-activity-reward-icon is-missing" aria-label={`${props.reward.name} 无图标`}>?</span>}
      <div>
        <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{props.reward.name}</strong>
        {props.reward.item_type ? <small data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{props.reward.item_type}</small> : null}
      </div>
    </>;

  const isActionable = Boolean(props.onOpen) && Number.isFinite(props.reward.hash) && props.reward.hash > 0;
  if (!isActionable) return <div className="weekly-activity-reward">{content}</div>;

  return (
    <button
      type="button"
      className="weekly-activity-reward is-actionable"
      data-ui-kind="button"
      data-control-variant="quiet"
      aria-label={`查看${props.reward.name}详情`}
      onClick={() => props.onOpen?.(props.reward)}
    >
      {content}
    </button>
  );
}

function HomeXurOffer(props: {
  item: HomeDailyItem;
  vendorName: string;
  refreshLabel?: string;
  onOpenXurOffer?: (item: VendorInventoryItemView, context: VendorOfferContextView) => void;
}) {
  const iconTone = getHomeXurTone(props.item);
  const iconUrl = normalizeBungieIconUrl(props.item.iconUrl ?? props.item.icon)
    ?? createXurItemIconUrl({ iconTone, iconLabel: props.item.iconLabel, label: props.item.title });
  const classNote = getHomeXurClassNote(props.item);
  const typeLabel = [
    classNote,
    props.item.subtitle && props.item.subtitle !== classNote ? props.item.subtitle : ""
  ].filter(Boolean).join(" · ");

  const content = <>
      <span className="home-vendor-stock-icon"><img alt="" loading="lazy" src={iconUrl} /></span>
      <span className="home-vendor-stock-copy">
        <span data-ui-part="label" data-info-priority="support" data-text-tone="meta">{typeLabel || "类型与职业备注未返回"}</span>
        <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{props.item.title}</strong>
        <small data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{props.item.description || props.item.source || "当前轮换商品"}</small>
      </span>
      <span className="home-vendor-stock-state" data-ui-part="state" data-info-priority="support" data-text-tone="status" data-status="success">本周轮换</span>
  </>;
  if (props.item.itemHash === undefined || !props.onOpenXurOffer) {
    return <article className="home-vendor-stock-item" data-ui-kind="object-card">{content}</article>;
  }

  const offer = createHomeXurOffer(props.item, iconTone, iconUrl, props.vendorName);
  const context = createHomeXurOfferContext(props.item, props.vendorName, props.refreshLabel);
  return (
    <button
      type="button"
      className="home-vendor-stock-item"
      data-ui-kind="object-card"
      data-control-variant="quiet"
      aria-label={`查看${props.item.title}详情`}
      onClick={() => props.onOpenXurOffer?.(offer, context)}
    >
      {content}
    </button>
  );
}

function createHomeXurOffer(
  item: HomeDailyItem,
  tone: VendorInventoryItemView["tone"],
  iconUrl: string,
  vendorName: string
): VendorInventoryItemView {
  return {
    id: `home-xur-${item.vendorHash ?? "unknown"}-${item.itemHash}`,
    itemHash: item.itemHash,
    vendorHash: item.vendorHash,
    characterIds: item.characterId ? [item.characterId] : undefined,
    name: item.title,
    itemType: item.subtitle?.trim() || "当前轮换商品",
    summary: item.source?.trim() || "Bungie 当前商人库存",
    cost: item.description?.trim(),
    iconLabel: item.iconLabel?.trim() || item.title.slice(0, 1) || "?",
    iconUrl,
    tone,
    status: "unknown",
    sourcePath: `${vendorName} / 本周八件轮换`
  };
}

function createHomeXurOfferContext(
  item: HomeDailyItem,
  vendorName: string,
  refreshLabel?: string
): VendorOfferContextView {
  return {
    vendorName,
    inventoryPath: `${vendorName} / 本周八件轮换`,
    costLabel: item.description?.trim() || "当前公开库存未返回费用",
    affordabilityLabel: item.characterId
      ? "需要当前角色货币余额校验"
      : "公共库存未返回当前角色货币余额",
    characterLabel: item.characterId ? "当前角色商人库存" : "公共商人库存",
    refreshLabel: refreshLabel || "当前刷新时间未返回"
  };
}

function getHomeXurTone(item: HomeDailyItem): "exotic" | "weapon" | "armor" | "material" {
  const value = [item.title, item.subtitle, item.description, item.source].filter(Boolean).join(" ");
  if (/护甲|头盔|臂铠|胸甲|腿甲|职业|泰坦|猎人|术士|Armor|Helmet|Gauntlets|Chest|Leg/i.test(value)) return "armor";
  if (/材料|货币|模组|赏金|Material|Currency|Mod|Bounty/i.test(value)) return "material";
  if (/异域|Exotic/i.test(value)) return "exotic";
  return "weapon";
}

function getHomeXurClassNote(item: HomeDailyItem): string {
  if (item.classType === 0) return "泰坦";
  if (item.classType === 1) return "猎人";
  if (item.classType === 2) return "术士";
  if (item.classType === 3) return "全职业";
  const value = [item.subtitle, item.description, item.source].filter(Boolean).join(" · ");
  const match = value.match(/猎人|泰坦|术士|Hunter|Titan|Warlock/i);
  return match?.[0] ?? "职业备注未返回";
}

function homePriorityEntries(priority: HomeWeeklyPriority | undefined): HomeWeeklyActivityEntry[] {
  if (!priority || priority.status !== "ready") return [];
  const entries = priority.entries?.filter((entry) => entry.title.trim()) ?? [];
  return entries.length
    ? entries
    : [{ title: priority.title, detail: priority.detail, source: priority.source }];
}
function HomeSignal(props: {
  label: string;
  priority: HomeWeeklyPriority | undefined;
}) {
  const ready = props.priority?.status === "ready";
  const status = ready ? "success" : "pending";
  return (
    <article className="weekly-signal-card" data-surface="frame" data-ui-kind="summary-frame" data-status={status}>
      <header>
        <span data-ui-part="label" data-info-priority="context" data-text-tone="primary">{props.label}</span>
        <span className="app-chip" data-ui-kind="status-chip" data-ui-part="state" data-info-priority="support" data-text-tone="status" data-status={status}>{ready ? "已确认" : "待确认"}</span>
      </header>
      <strong data-ui-part="value" data-info-priority="decision" data-text-tone="primary">{props.priority?.title ?? "公开接口尚未确认"}</strong>
      <p data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{props.priority?.detail ?? "当前不展示历史活动或推测内容。"}</p>
      {props.priority?.source ? <small data-ui-part="source" data-info-priority="trace" data-text-tone="meta">来源：{props.priority.source}</small> : null}
    </article>
  );
}
function HomeEmpty(props: { label: string }) {
  return <div className="weekly-activity-empty" data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{props.label}</div>;
}

function HomeXurState(props: {
  source: HomeDailySource | undefined;
  isLoading: boolean;
  error: string;
  onRetry?: () => void;
}) {
  if (props.error || props.source?.status === "error") {
    return (
      <HomeVendorModuleState
        status="error"
        title="本周八件轮换读取失败"
        detail="没有显示上一次缓存的 Offer。重新读取成功后才恢复轮换列表。"
        onRetry={props.onRetry}
      />
    );
  }

  if (props.isLoading || !props.source) {
    return (
      <>
        <HomeVendorModuleState
          status="pending"
          title="正在读取本周八件轮换"
          detail="保留模块尺寸，等待 Vendor API 和当前资料库返回；不会回退显示旧库存。"
        />
        <div className="home-vendor-stock-grid" aria-hidden="true">
          <i className="home-vendor-skeleton" /><i className="home-vendor-skeleton" /><i className="home-vendor-skeleton" />
        </div>
      </>
    );
  }

  return (
    <HomeVendorModuleState
      status="warning"
      title="当前没有可确认的仄本周八件轮换"
      detail="商人未开放或主商人轮换不可见。旧 Offer 已清除，请等待下一次有效读取。"
    />
  );
}

function HomeVendorModuleState(props: {
  status: "pending" | "warning" | "error";
  title: string;
  detail: string;
  onRetry?: () => void;
}) {
  return (
    <div className="home-vendor-module-state" data-surface="frame" data-ui-kind="state-frame" data-status={props.status}>
      <strong data-ui-part="value" data-info-priority="decision" data-text-tone="status" data-status={props.status}>{props.title}</strong>
      <span data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{props.detail}</span>
      {props.onRetry ? <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onRetry}>重新读取商人库存</button> : null}
    </div>
  );
}

function HomeMissingXurOffer(props: { count: number }) {
  return (
    <article className="home-vendor-stock-item" data-ui-kind="object-card" data-status="warning">
      <span className="home-vendor-stock-icon is-missing" aria-hidden="true">?</span>
      <span className="home-vendor-stock-copy">
        <span data-ui-part="label" data-info-priority="support" data-text-tone="meta">资料库定义待补齐</span>
        <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{props.count} 件轮换商品暂无可读名称</strong>
        <small data-ui-part="detail" data-info-priority="reading" data-text-tone="body">Vendor API 已确认存在，不使用猜测名称、类型或图标。</small>
      </span>
      <span className="home-vendor-stock-state" data-ui-part="state" data-info-priority="support" data-text-tone="status" data-status="warning">部分可用</span>
    </article>
  );
}

function formatHomeVendorSummary(xur: HomeConfirmedXur, visibleCount: number): string {
  if (xur.isPartial || xur.missingItemCount) {
    return `${visibleCount} 件已确认 · ${xur.missingItemCount} 件定义待补齐`;
  }
  return `${xur.inventoryCount} 件轮换商品 · ${xur.refreshLabel ?? "当前有效"}`;
}

function formatHomeVendorSource(input: {
  xur: HomeConfirmedXur | null;
  fetchedAt?: string;
  selectedCharacterLabel?: string;
  isLoading: boolean;
  error: string;
}): string {
  if (input.isLoading) return "来源：Vendor API + 当前资料库 · 正在确认主商人轮换";
  if (input.error) return "来源：Vendor API · 本次读取失败，未使用过期库存";
  if (!input.xur) return "来源：Vendor API · 当前未返回有效轮换";
  const details = [
    input.fetchedAt ? `真实读取 ${formatFullDateTime(input.fetchedAt)}` : "读取时间未返回",
    input.selectedCharacterLabel || "公共商人库存",
    input.xur.isPartial || input.xur.missingItemCount
      ? "部分轮换定义缺失"
      : `${input.xur.inventoryCount} 件本周轮换完整`
  ];
  return `来源：Vendor API + 当前资料库 · ${details.join(" · ")}`;
}

function homeVendorStatus(props: { xur: HomeConfirmedXur | null; isLoadingDaily: boolean; dailyError: string }): "success" | "pending" | "warning" | "error" {
  if (props.isLoadingDaily) return "pending";
  if (props.dailyError) return "error";
  if (!props.xur) return "warning";
  return props.xur.isPartial || props.xur.missingItemCount ? "warning" : "success";
}

function buildConfirmedXur(
  source: HomeDailySource | undefined,
  copy: HomeCopy,
  now: Date,
  selectedCharacterId?: string
): HomeConfirmedXur | null {
  if (!source || !["ready", "warning"].includes(source.status) || !isXurActiveAt(now)) return null;
  const xurVendors = source.items?.filter((item) => item.vendorHash === xurVendorHash || /仄|Xur|Xûr/i.test(item.title)) ?? [];
  const vendor = xurVendors.find((item) => item.characterId === selectedCharacterId)
    ?? xurVendors.find((item) => Boolean(item.characterId))
    ?? xurVendors[0];
  const candidates = (vendor?.items ?? []).filter((item) => {
    const title = item.title.trim();
    return !title || !hiddenHomeXurItemTitles.has(title);
  });
  const items = candidates.filter((item) => item.title.trim());
  const missingItemCount = candidates.length - items.length;
  if (!vendor || vendor.vendorEnabled === false || (!items.length && !missingItemCount)) return null;
  return {
    title: vendor.title,
    location: vendor.vendorLocation,
    refreshLabel: formatXurDepartureLabel(now, copy),
    inventoryCount: candidates.length,
    missingItemCount,
    isPartial: source.status === "warning",
    items
  };
}
function formatXurDepartureLabel(now: Date, copy: HomeCopy): string {
  return `${homeText(copy, "离开还有")} ${compactDuration(now, nextXurBoundaryAt(now), copy)}`;
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
