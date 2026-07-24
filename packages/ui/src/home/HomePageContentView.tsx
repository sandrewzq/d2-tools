import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale, HomeCopy } from "../i18n/types.js";
import { isXurActiveAt, xurVendorHash } from "@d2-tools/core/daily/xurSchedule";
import type { ShellPageKey } from "../shell/types.js";
import type { VendorInventoryItemView, VendorOfferContextView } from "../vendors/VendorsPageContentView.js";
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
  const dailySummary = props.dailySummary ?? null;
  const weeklySummary = props.weeklySummary ?? null;
  const weeklyResetStatus = formatWeeklyResetStatus(weeklySummary, dailySummary, copy);
  const confirmedPriorities = buildConfirmedWeeklyPriorities(weeklySummary);
  const xur = buildConfirmedXur(dailySummary?.sources.vendors, copy, props.selectedCharacterId);
  return (
    <HomePageContent
      weeklyResetStatus={weeklyResetStatus}
      confirmedPriorities={confirmedPriorities}
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
  weeklyResetStatus: string;
  confirmedPriorities: Partial<Record<HomeWeeklyPriorityKind, HomeWeeklyPriority>>;
  xur: HomeConfirmedXur | null;
  dailyMessage: string;
  dailyError: string;
  isLoadingDaily: boolean;
  onNavigate?: (page: ShellPageKey) => void;
  onOpenXurOffer?: (item: VendorInventoryItemView, context: VendorOfferContextView) => void;
}) {
  const nightfall = props.confirmedPriorities.nightfall;
  const nightfallReward = nightfall?.entries?.flatMap((entry) => entry.rewards ?? [])[0];
  const raids = homePriorityEntries(props.confirmedPriorities.rotating_raid);
  const dungeons = homePriorityEntries(props.confirmedPriorities.rotating_dungeon);
  const xurItems = props.xur?.items.slice(0, 8) ?? [];
  const hasConfirmedData = Boolean(nightfall || raids.length || dungeons.length || props.xur);
  return (
    <section className="home-page">
      {props.dailyError ? <p className="status-message status-error">{props.dailyError}</p> : null}
      {props.dailyMessage ? <p className="status-message status-ready">{props.dailyMessage}</p> : null}
      {props.isLoadingDaily ? <p className="status-message status-pending">正在刷新公开情报…</p> : null}
      <section className="home-band home-summary-band">
        <div className="home-summary" aria-label="本周公开情报摘要">
          <div>
            <span>每周重置</span>
            <strong>{props.weeklyResetStatus}</strong>
          </div>
          <div>
            <span>数据状态</span>
            <strong>{hasConfirmedData ? "本周公开信息已读取" : "当前没有可确认的公开信息"}</strong>
          </div>
          <div>
            <span>来源</span>
            <strong>Bungie Milestones / Vendors</strong>
          </div>
        </div>
      </section>
      <section className="home-band home-nightfall">
        <div className="home-band-heading">
          <div>
            <span>先锋行动 · 宗师先锋警戒</span>
            <h2>本周日落打击</h2>
          </div>
          <span className="app-chip status-ready">已确认</span>
        </div>
        {nightfall ? (
          <article className="home-brief-item">
            <span className="home-mark">宗</span>
            <div>
              <strong>{nightfall.title}</strong>
              <p>
                {nightfall.detail}
                {nightfallReward ? `；可见奖励：${nightfallReward.name}${nightfallReward.item_type ? ` · ${nightfallReward.item_type}` : ""}` : ""}
              </p>
            </div>
            <span>本周有效</span>
          </article>
        ) : <HomeEmpty label="本周宗师先锋警戒暂不可读" />}
      </section>
      <section className="home-band home-briefing-grid">
        <section>
          <div className="home-band-heading">
            <div>
              <span>每周轮换</span>
              <h2>突袭与地牢</h2>
            </div>
            <small>Bungie Milestones</small>
          </div>
          <div className="home-brief-grid">
            <HomeRotation title="轮换突袭" mark="袭" entries={raids} />
            <HomeRotation title="轮换地牢" mark="地" entries={dungeons} />
          </div>
        </section>
        <aside className="home-live">
          <div className="home-band-heading">
            <div>
              <span>实时情报</span>
              <h2>限时活动与本周加成</h2>
            </div>
            <small>公开接口</small>
          </div>
          <HomeSignal label="限时活动" priority={props.confirmedPriorities.special_event} />
          <HomeSignal label="本周加成" priority={props.confirmedPriorities.weekly_bonus} />
        </aside>
      </section>
      <section className="home-band home-xur">
        <div className="home-band-heading">
          <div>
            <span>周末商人</span>
            <h2>仄本周八件轮换</h2>
          </div>
          <button type="button" className="secondary-button" onClick={() => props.onNavigate?.("vendors")}>打开仄的完整库存</button>
        </div>
        {props.xur ? (
          <>
            <div className="home-xur-overview">
              <div><span>本周八件轮换</span><strong>{xurItems.length} 件已确认 · {props.xur.refreshLabel ?? "当前有效"}</strong></div>
              <div><span>当前位置</span><strong>{props.xur.location ?? props.xur.title}</strong></div>
            </div>
            <div className="home-xur-stock-grid">
              {xurItems.map((item, index) => (
                <HomeXurOffer
                  item={item}
                  key={`${item.title}-${item.vendorHash ?? "xur"}-${index}`}
                  vendorName={props.xur.title}
                  refreshLabel={props.xur.refreshLabel}
                  onOpenXurOffer={props.onOpenXurOffer}
                />
              ))}
            </div>
          </>
        ) : <HomeEmpty label="当前没有可确认的仄库存" />}
        <small className="home-source">来源：Vendor API 与当前 Manifest。读取失败时不显示过期轮换。</small>
      </section>
    </section>
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

function homePriorityEntries(priority: HomeWeeklyPriority | undefined): Array<{ title: string; detail: string }> {
  if (!priority) return [];
  const entries = priority.entries?.filter((entry) => entry.title.trim()) ?? [];
  return entries.length
    ? entries.map((entry) => ({ title: entry.title, detail: entry.detail || priority.detail }))
    : [{ title: priority.title, detail: priority.detail }];
}
function HomeRotation(props: {
  title: string;
  mark: string;
  entries: Array<{ title: string; detail: string }>;
}) {
  if (!props.entries.length) {
    return <HomeEmpty label={`${props.title}暂不可读`} />;
  }
  return (
    <>
      {props.entries.map((entry) => (
        <article className="home-brief-item" key={`${props.title}-${entry.title}`}>
          <span className="home-mark">{props.mark}</span>
          <div><strong>{entry.title}</strong><p>{entry.detail}</p></div>
          <span>{props.entries.length} 项</span>
        </article>
      ))}
    </>
  );
}
function HomeSignal(props: {
  label: string;
  priority: HomeWeeklyPriority | undefined;
}) {
  return (
    <article className="home-signal">
      <strong>{props.label}</strong>
      <div>
        <p>{props.priority?.title ?? "当前未读取"}</p>
        <small>{props.priority?.detail ?? "公开接口没有返回可确认内容"}</small>
      </div>
      <span className={`app-chip status-${props.priority ? "ready" : "neutral"}`}>{props.priority ? "已确认" : "未读取"}</span>
    </article>
  );
}
function HomeEmpty(props: { label: string }) {
  return <div className="home-empty">{props.label}</div>;
}
function buildConfirmedWeeklyPriorities(weeklySummary: HomeWeeklySummary | null): Partial<Record<HomeWeeklyPriorityKind, HomeWeeklyPriority>> {
  if (!weeklySummary) return {};
  return Object.fromEntries(
    Object.entries(weeklySummary.priorities).filter(([, priority]) => priority.status === "ready")
  ) as Partial<Record<HomeWeeklyPriorityKind, HomeWeeklyPriority>>;
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
function formatWeeklyResetStatus(
  weeklySummary: HomeWeeklySummary | null,
  dailySummary: HomeDailySummary | null,
  copy: HomeCopy
): string {
  return formatResetStatus(weeklySummary?.weekly_reset ?? dailySummary?.weekly_reset, copy.labels.weeklyReset, homeText(copy, "先锋行动、轮换突袭、轮换地牢、仄商人"));
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
