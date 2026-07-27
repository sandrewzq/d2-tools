import { useEffect, useState } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale, HomeCopy } from "../i18n/types.js";
import { isXurActiveAt, nextXurBoundaryAt, xurVendorHash } from "@d2-tools/core/daily/xurSchedule";
import type { ShellPageKey } from "../shell/types.js";
import type { VendorInventoryItemView, VendorOfferContextView } from "../vendors/VendorsPageContentView.js";
import { formatScheduleDateTime } from "../time/formatTime.js";
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
  const xur = buildConfirmedXur(dailySummary?.sources.vendors, copy, props.selectedCharacterId);
  return (
    <HomePageContent
      copy={copy}
      interfaceLocale={interfaceLocale}
      dailySummary={dailySummary}
      weeklySummary={weeklySummary}
      clock={clock}
      xur={xur}
      dailyMessage={props.dailyMessage ?? ""}
      dailyError={props.dailyError ?? ""}
      isLoadingDaily={props.isLoadingDaily ?? false}
      onNavigate={props.onNavigate}
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
  dailyMessage: string;
  dailyError: string;
  isLoadingDaily: boolean;
  onNavigate?: (page: ShellPageKey) => void;
  onOpenXurOffer?: (item: VendorInventoryItemView, context: VendorOfferContextView) => void;
}) {
  const priorities = props.weeklySummary?.priorities;
  const activities = [
    { kind: "nightfall", label: homeText(props.copy, "日落打击"), priority: priorities?.nightfall },
    { kind: "raid", label: homeText(props.copy, "轮换突袭"), priority: priorities?.rotating_raid },
    { kind: "dungeon", label: homeText(props.copy, "轮换地牢"), priority: priorities?.rotating_dungeon }
  ] as const;
  const xur = props.xur;
  const xurItems = xur?.items.slice(0, 8) ?? [];
  const refreshEntries = buildRefreshEntries(props.dailySummary, props.weeklySummary, props.clock, props.interfaceLocale, props.copy);
  return (
    <section className="home-page">
      {props.dailyError ? <p className="status-message status-error">{props.dailyError}</p> : null}
      {props.dailyMessage ? <p className="status-message status-ready">{props.dailyMessage}</p> : null}
      {props.isLoadingDaily ? <p className="status-message status-pending">正在刷新公开情报…</p> : null}
      <div className="home-refresh-strip" aria-label="首页数据刷新节奏">
        {refreshEntries.map((entry) => <HomeRefreshCell key={entry.key} entry={entry} />)}
      </div>
      <section className="home-core-grid" aria-label="本周核心活动">
        {activities.map((activity) => <HomeActivityCard key={activity.kind} {...activity} featured={activity.kind === "nightfall"} />)}
      </section>
      <section className="home-signal-grid" aria-label="限时活动与本周加成">
        <HomeSignal label={homeText(props.copy, "限时活动")} priority={priorities?.special_event} />
        <HomeSignal label={homeText(props.copy, "本周加成")} priority={priorities?.weekly_bonus} />
      </section>
      <section className="home-band home-xur">
        <div className="home-band-heading">
          <div>
            <span>周末商人</span>
            <h2>仄本周八件轮换</h2>
          </div>
          <button type="button" className="secondary-button" onClick={() => props.onNavigate?.("vendors")}>打开仄的完整库存</button>
        </div>
        {xur ? (
          <>
            <div className="home-xur-overview">
              <div><span>本周八件轮换</span><strong>{xurItems.length} 件已确认 · {xur.refreshLabel ?? "当前有效"}</strong></div>
              <div><span>当前位置</span><strong>{xur.location ?? xur.title}</strong></div>
            </div>
            <div className="home-xur-stock-grid">
              {xurItems.map((item, index) => (
                <HomeXurOffer
                  item={item}
                  key={`${item.title}-${item.vendorHash ?? "xur"}-${index}`}
                  vendorName={xur.title}
                  refreshLabel={xur.refreshLabel}
                  onOpenXurOffer={props.onOpenXurOffer}
                />
              ))}
            </div>
          </>
        ) : <HomeXurState source={props.dailySummary?.sources.vendors} />}
        <small className="home-source">来源：Vendor API 与当前 Manifest。读取失败时不显示过期轮换。</small>
      </section>
    </section>
  );
}

type HomeRefreshEntry = { key: "daily" | "weekly" | "xur"; label: string; moment: string; countdown: string; impact: string };

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
  return <div className="home-refresh-cell" data-refresh={props.entry.key}><div className="home-refresh-heading"><RefreshGlyph kind={props.entry.key} /><span>{props.entry.label}</span></div><strong>{props.entry.moment}</strong><small>{props.entry.countdown}</small><small className="home-refresh-impact">影响：{props.entry.impact}</small></div>;
}

function RefreshGlyph(props: { kind: HomeRefreshEntry["key"] }) {
  if (props.kind === "daily") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></svg>;
  if (props.kind === "weekly") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 7v5c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V7Z" /><path d="M9 12h6M12 9v6" /></svg>;
}

function HomeActivityCard(props: { kind: "nightfall" | "raid" | "dungeon"; label: string; priority: HomeWeeklyPriority | undefined; featured: boolean }) {
  const entries = homePriorityEntries(props.priority);
  return <article className={`home-activity-card is-${props.kind}`}><header><span>{props.label}</span><strong className={entries.length ? "is-ready" : ""}>{entries.length ? `${entries.length} 项已确认` : "待确认"}</strong></header>{entries.length ? <div className="home-activity-list">{entries.map((entry) => <HomeActivityEntry key={`${props.kind}-${entry.title}`} entry={entry} featured={props.featured} />)}</div> : <HomeEmpty label="公开接口暂未确认本周内容。" />}</article>;
}

function HomeActivityEntry(props: { entry: HomeWeeklyActivityEntry; featured: boolean }) {
  const rewards = props.entry.rewards?.filter((reward) => reward.name.trim()) ?? [];
  return <div className={props.featured ? "home-activity-entry is-featured" : "home-activity-entry"}><div className="home-activity-copy"><h3>{props.entry.title}</h3>{props.entry.detail ? <p>{props.entry.detail}</p> : null}</div><div className="home-activity-rewards">{rewards.length ? rewards.map((reward) => <HomeActivityReward key={reward.hash} reward={reward} />) : <span className="home-reward-pending">奖励待确认</span>}</div></div>;
}

function HomeActivityReward(props: { reward: HomeWeeklyActivityReward }) {
  return <div className="home-activity-reward">{props.reward.icon ? <img src={normalizeBungieIconUrl(props.reward.icon) ?? props.reward.icon} alt="" /> : null}<span><strong>{props.reward.name}</strong>{props.reward.item_type ? <small>{props.reward.item_type}</small> : null}</span></div>;
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
  const details = [
    classNote,
    props.item.subtitle && props.item.subtitle !== classNote ? props.item.subtitle : "",
    props.item.description
  ].filter(Boolean).join(" · ");

  const content = <>
      <img className="home-xur-stock-icon" alt="" loading="lazy" src={iconUrl} />
      <div>
        <span>{details || "类型与职业备注未返回"}</span>
        <strong>{props.item.title}</strong>
        <small>{props.item.source || "当前轮换商品"}</small>
      </div>
      <span>本周轮换</span>
  </>;
  if (props.item.itemHash === undefined || !props.onOpenXurOffer) {
    return <article className="home-xur-stock-item">{content}</article>;
  }

  const offer = createHomeXurOffer(props.item, iconTone, iconUrl, props.vendorName);
  const context = createHomeXurOfferContext(props.item, props.vendorName, props.refreshLabel);
  return (
    <button
      type="button"
      className="home-xur-stock-item is-actionable"
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
  return (
    <article className="home-signal-card">
      <header><span>{props.label}</span><span className={`app-chip status-${ready ? "ready" : "neutral"}`}>{ready ? "已确认" : "待确认"}</span></header>
      <strong>{props.priority?.title ?? "公开接口尚未确认"}</strong>
      <p>{props.priority?.detail ?? "当前不展示历史活动或推测内容。"}</p>
      {props.priority?.source ? <small>来源：{props.priority.source}</small> : null}
    </article>
  );
}
function HomeEmpty(props: { label: string }) {
  return <div className="home-empty">{props.label}</div>;
}

function HomeXurState(props: { source: HomeDailySource | undefined }) {
  if (!props.source || props.source.status === "pending") {
    return <div className="home-xur-module-state"><strong>正在读取本周八件轮换</strong><span>等待当前商人库存和资料库定义返回；不会显示旧轮换。</span></div>;
  }

  if (props.source.status === "error") {
    return <div className="home-xur-module-state"><strong>本周八件轮换读取失败</strong><span>本次读取未成功，因此不显示上一次缓存的商品。</span></div>;
  }

  return <div className="home-xur-module-state"><strong>当前没有可确认的仄本周八件轮换</strong><span>商人未开放或主商人轮换不可见。旧 Offer 已清除，请等待下一次有效读取。</span></div>;
}

function buildConfirmedXur(
  source: HomeDailySource | undefined,
  copy: HomeCopy,
  selectedCharacterId?: string
): HomeConfirmedXur | null {
  if (!source || source.status !== "ready" || !isXurActiveAt()) return null;
  const xurVendors = source.items?.filter((item) => item.vendorHash === xurVendorHash || /仄|Xur|Xûr/i.test(item.title)) ?? [];
  const vendor = xurVendors.find((item) => item.characterId === selectedCharacterId)
    ?? xurVendors.find((item) => Boolean(item.characterId))
    ?? xurVendors[0];
  const items = (vendor?.items ?? []).filter((item) => {
    const title = item.title.trim();
    return title && !hiddenHomeXurItemTitles.has(title);
  });
  if (!vendor || vendor.vendorEnabled === false || !items.length) return null;
  return {
    title: vendor.title,
    location: vendor.vendorLocation,
    refreshLabel: formatVendorRefreshLabel(vendor.vendorRefreshDate, copy),
    inventoryCount: items.length,
    items
  };
}
function formatVendorRefreshLabel(value: string | undefined, copy: HomeCopy): string | undefined {
  if (!value) return undefined;
  const remainingMs = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return undefined;
  const totalHours = Math.ceil(remainingMs / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const prefix = homeText(copy, "离开还有");
  return days > 0
    ? `${prefix} ${days} ${homeText(copy, "天")} ${hours} ${homeText(copy, "小时")}`
    : `${prefix} ${hours} ${homeText(copy, "小时")}`;
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
