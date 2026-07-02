import { useState } from "react";
import { AccountPageView } from "./AccountPageView.js";
import { getLocaleCopy } from "../i18n/copy.js";
import type { AccountCopy, InterfaceLocale } from "../i18n/types.js";

type AnyAccountItemSummary = any;
type AnyAccountSummary = any;
type AnyActivityHistorySummary = any;
type AnyLoadoutTemplate = any;
type AnyAccountPageWorkspace = any;
type AnyAccountSlotComparisonRow = any;

type AccountItemSource = "equipped" | "inventory";
const ACCOUNT_SLOT_PREVIEW_LIMIT = 8;

export type AccountPageContentViewProps = {
  interfaceLocale?: InterfaceLocale;
  accountSummary: AnyAccountSummary | null;
  startupState: any;
  accountWorkspace: AnyAccountPageWorkspace;
  selectedCharacter: any;
  selectedCharacterId: string;
  isBungieConfigured: boolean;
  isAccountLoggedIn: boolean;
  canLoadAccount: boolean;
  isLoadingAccount: boolean;
  accountError: string;
  itemDetailError: string;
  itemDetailLoadingKey: string;
  writeActionsEnabled: boolean;
  activitySummary: AnyActivityHistorySummary | null;
  activityMessage: string;
  activityError: string;
  loadoutMessage: string;
  itemActionMessage: string;
  isRunningItemAction: boolean;
  activeLoadoutLookup: unknown | null;
  activeLoadoutTemplate: AnyLoadoutTemplate | null;
  onConfigureBungie: () => void;
  onLoginBungie: () => void;
  onLoadAccount: () => void;
  onRefreshActivity: () => void;
  onSelectCharacter: (characterId: string) => void;
  onSaveCharacterLoadout: (character: any) => void;
  onEquipHighestPowerItems: (character: any) => void;
  onOpenItem: (item: AnyAccountItemSummary, options: { source_character_id: string; source_kind?: AccountItemSource; is_postmaster_item?: boolean }) => void;
  isLoadoutMatch: (item: AnyAccountItemSummary, highlightedTemplate?: any | null) => boolean;
  getAccountPageItemKey: (item: AnyAccountItemSummary) => string;
  formatAccountItemMeta: (item: AnyAccountItemSummary) => string;
};

export function AccountPageContentView(props: AccountPageContentViewProps) {
  const { accountSummary, accountWorkspace, selectedCharacter } = props;
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").account;
  const activitySummary = props.activitySummary;
  const activityReview = activitySummary ? activitySummary.review : null;
  const isBungieConfigured = props.isBungieConfigured;
  const isAccountLoggedIn = props.isAccountLoggedIn;
  const canLoadAccount = props.canLoadAccount;

  return (
    <AccountPageView interfaceLocale={props.interfaceLocale}>
      <div className="section-heading">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <button type="button" disabled={props.isLoadingAccount || !canLoadAccount} onClick={props.onLoadAccount}>
          {props.isLoadingAccount ? copy.loadingAccount : copy.loadAccount}
        </button>
      </div>
      {props.accountError ? <p className="status-message status-error">{props.accountError}</p> : null}
      {props.itemDetailError ? <p className="status-message status-error">{props.itemDetailError}</p> : null}
      {!accountSummary ? (
        <div className="account-empty-state">
          <p className="status-message status-warning">{copy.disconnectedBadge}</p>
          <h3>{isBungieConfigured ? copy.loginMissingTitle : copy.configMissingTitle}</h3>
          <p>{copy.emptyBody}</p>
          <div className="button-row">
            {!isBungieConfigured ? (
              <button type="button" onClick={props.onConfigureBungie}>
                {copy.configureBungie}
              </button>
            ) : null}
            <button
              type="button"
              className={isBungieConfigured ? "" : "secondary-button"}
              disabled={!isBungieConfigured || props.isLoadingAccount}
              onClick={props.onLoginBungie}
            >
              {copy.loginBungie}
            </button>
          </div>
          {isBungieConfigured && !isAccountLoggedIn ? (
            <p className="status-message status-neutral">{props.startupState.cards.account.label}</p>
          ) : null}
        </div>
      ) : null}
      {accountSummary && selectedCharacter ? (
        <div className="account-page-shell">
          <nav className="account-page-nav" aria-label={accountText(copy, "账号目录")}>
            <a href="#account-profile">{copy.nav.overview}</a>
            <a href="#account-loadout">{copy.nav.loadout}</a>
            <a href="#account-activity">{copy.nav.activity}</a>
            <a href="#account-materials">{copy.nav.materials}</a>
            <a href="#account-postmaster">{copy.nav.postmaster}</a>
          </nav>
          <div className="account-summary account-page-main">
            <div id="account-profile" className="account-profile-strip">
              <div>
                <h3>{accountSummary.account_name}</h3>
                <p>{accountWorkspace.accountProfileLine}</p>
                <p>{accountWorkspace.accountInventoryLine}</p>
              </div>
              <div className="character-tabs" role="tablist" aria-label={accountText(copy, "角色切换")}>
                {accountWorkspace.characterTabs.map((tab: any) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab.isSelected}
                    className={tab.isSelected ? "character-tab active" : "character-tab"}
                    key={tab.key}
                    onClick={() => props.onSelectCharacter(tab.character.character_id)}
                  >
                    {tab.emblemUrl ? <img alt="" loading="lazy" src={tab.emblemUrl} /> : null}
                    <span>{tab.className}</span>
                    <strong>{tab.lightLabel}</strong>
                  </button>
                ))}
              </div>
            </div>

          <div className="account-a2-layout">
          <div id="account-loadout" className="account-primary-workbench">
            <article className="character-card character-card-focused account-character-summary">
              <div className="character-title">
                {selectedCharacter.emblem_url ? <img alt="" loading="lazy" src={selectedCharacter.emblem_url} /> : null}
                <div>
                  <h3>{selectedCharacter.class_name}</h3>
                  <p>{accountWorkspace.selectedCharacterSummary}</p>
                </div>
                <div className="character-actions">
                  <button type="button" className="inline-action" onClick={() => props.onSaveCharacterLoadout(selectedCharacter)}>
                    {copy.actions.saveCurrentLoadout}
                  </button>
                  <button
                    type="button"
                    className="inline-action"
                    disabled={props.isRunningItemAction}
                    aria-describedby="highest-power-feedback"
                    onClick={() => props.onEquipHighestPowerItems(selectedCharacter)}
                  >
                    {props.isRunningItemAction ? copy.actions.running : copy.actions.equipHighestPower}
                  </button>
                </div>
                {(!props.writeActionsEnabled || props.loadoutMessage || props.itemActionMessage) ? (
                  <div
                    id="highest-power-feedback"
                    className="character-action-feedback"
                    role="status"
                    aria-live="polite"
                  >
                    {!props.writeActionsEnabled ? (
                      <p className="status-message status-warning">{accountText(copy, "d2-tools 本地写操作开关未开启，请先到设置页开启。")}</p>
                    ) : null}
                    {props.loadoutMessage ? <p className="status-message status-ready">{props.loadoutMessage}</p> : null}
                    {props.itemActionMessage ? <p className={props.itemActionMessage.includes("失败") ? "status-message status-error" : "status-message status-ready"}>{props.itemActionMessage}</p> : null}
                  </div>
                ) : null}
              </div>
            </article>

            <section className="character-card account-slot-comparison">
              <div className="equipment-section-heading">
                <h4>{accountText(copy, "当前角色装备与背包")}</h4>
                <span>
                  {accountText(copy, "装备")} {selectedCharacter.equipped_items.length} {accountText(copy, "件")} / {accountText(copy, "背包")} {selectedCharacter.inventory_items.length} {accountText(copy, "件")}
                  {props.activeLoadoutTemplate ? ` / ${accountText(copy, "方案命中")} ${accountWorkspace.selectedCharacterLoadoutMatchCount}` : ""}
                </span>
              </div>
              <AccountSlotComparison
                isLoadoutMatch={props.isLoadoutMatch}
                getAccountPageItemKey={props.getAccountPageItemKey}
                formatAccountItemMeta={props.formatAccountItemMeta}
                rows={accountWorkspace.slotComparisonRows}
                highlightedTemplate={props.activeLoadoutLookup}
                openingItemKey={props.itemDetailLoadingKey}
                onOpenEquippedItem={(item) => props.onOpenItem(item, {
                    source_character_id: selectedCharacter.character_id,
                    source_kind: "equipped"
                  })}
                onOpenInventoryItem={(item) => props.onOpenItem(item, {
                    source_character_id: selectedCharacter.character_id,
                    source_kind: "inventory"
                  })}
                copy={copy}
              />
            </section>
          </div>

          <div className="account-secondary-workbench account-side-summary">
            <section className="account-side-summary-grid" aria-label={accountText(copy, "账号侧栏摘要")}>
              <div>
                <span>{accountText(copy, "最近活动")}</span>
                <strong>{activitySummary ? `${activitySummary.recent.total} ${accountText(copy, "场")}` : accountText(copy, "待读取")}</strong>
              </div>
              <div>
                <span>{accountText(copy, "材料")}</span>
                <strong>{accountWorkspace.materialRows.length} {accountText(copy, "项")}</strong>
              </div>
              <div>
                <span>{accountText(copy, "邮政官")}</span>
                <strong>{accountWorkspace.postmasterPreviewItems.length} {accountText(copy, "件")}</strong>
              </div>
            </section>
            <section id="account-activity" className="vault-preview account-activity-review">
              <div className="section-heading compact-heading">
                <div>
                  <h3>{accountText(copy, "活动复盘")}</h3>
                  <p>{accountText(copy, "按最近记录快速回看 PVE / PVP 完成情况和突袭、地牢尝试。")}</p>
                </div>
                <button type="button" className="secondary-button" onClick={props.onRefreshActivity}>
                  {accountText(copy, "刷新活动")}
                </button>
              </div>
              {props.activityError ? <p className="status-message status-error">{props.activityError}</p> : null}
              {props.activityMessage ? <p className="status-message status-ready">{props.activityMessage}</p> : null}
              {activitySummary ? (
                <div className="activity-review-grid">
                  <div className="source-status-card source-status-neutral">
                    <span className="source-status-badge source-status-neutral">{accountText(copy, "最近活动")}</span>
                    <strong>{activitySummary.recent.total} {accountText(copy, "场")}</strong>
                    <span>
                      PVE {activitySummary.recent.pve.completed}/{activitySummary.recent.pve.total}
                      {" / "}
                      PVP {activitySummary.recent.pvp.completed}/{activitySummary.recent.pvp.total}
                    </span>
                    {activityReview ? (
                      <small>{accountText(copy, "完成率")} {activityReview.completion_rate}% / {accountText(copy, "连续完成")} {activityReview.completions_in_a_row} {accountText(copy, "场")}</small>
                    ) : null}
                    {activitySummary.recent.latest_period ? <small>{accountText(copy, "最近一场：")}{formatActivityPeriod(activitySummary.recent.latest_period, props.interfaceLocale)}</small> : null}
                  </div>
                  <div className="activity-review-list">
                    <strong>{accountText(copy, "突袭 / 地牢")}</strong>
                    {activitySummary.raids.entries.length ? (
                      <ul>
                        {activitySummary.raids.entries.slice(0, 4).map((entry: any) => (
                          <li key={`${entry.activity_type}-${entry.activity_name}`}>
                            <span>{entry.activity_type === "raid" ? accountText(copy, "突袭") : accountText(copy, "地牢")} · {entry.activity_name}</span>
                            <small>
                              {accountText(copy, "完成")} {entry.completions}/{entry.attempts}
                              {entry.last_completed_at ? ` · ${formatActivityPeriod(entry.last_completed_at, props.interfaceLocale)}` : ""}
                            </small>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted-copy">{accountText(copy, "最近没有读取到突袭或地牢记录。")}</p>
                    )}
                  </div>
                  <div className="activity-review-list">
                    <strong>{accountText(copy, "最近 10 场")}</strong>
                    {activitySummary.recent_items.length ? (
                      <ul>
                        {activitySummary.recent_items.slice(0, 10).map((item: any, index: number) => {
                          const reviewEntry = activityReview?.recent_10[index];
                          return (
                          <li key={`${item.period}-${item.activity_name}`}>
                            <span>{formatActivityMode(item.mode, copy)} · {item.activity_name}</span>
                            <small>
                              {(reviewEntry?.status_label ?? (item.completed ? accountText(copy, "已完成") : accountText(copy, "未完成")))}
                              {" · "}
                              {formatActivityPeriod(item.period, props.interfaceLocale)}
                              {reviewEntry?.duration_label ? ` · ${reviewEntry.duration_label}` : ""}
                            </small>
                            {reviewEntry?.key_stats.length ? (
                              <small>{accountText(copy, "关键统计：")}{reviewEntry.key_stats.slice(0, 3).join(" / ")}</small>
                            ) : null}
                          </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="muted-copy">{accountText(copy, "暂无最近活动记录。")}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="status-message status-neutral">{accountText(copy, "读取账号后会显示最近活动复盘。")}</p>
              )}
            </section>

            <section id="account-materials" className="vault-preview">
              <div className="section-heading compact-heading">
                <div>
                  <h3>{accountText(copy, "材料与消耗品")}</h3>
                  <p>{accountText(copy, "副本、日常和商人交互常用资源，按账号维度读取。")}</p>
                </div>
              </div>
              {accountWorkspace.materialRows.length ? (
                <div className="material-grid">
                  {accountWorkspace.materialRows.map((row: any) => (
                    <div className="material-item" key={row.key}>
                      {row.material.icon ? <img alt="" src={row.material.icon} /> : <div className="item-icon-placeholder" />}
                      <div>
                        <strong>{row.material.name}</strong>
                        <span>{row.meta}</span>
                      </div>
                      <b>{row.material.quantity}</b>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="status-message status-neutral">{accountText(copy, "没有读取到账号材料或货币。")}</p>
              )}
            </section>

            <section id="account-postmaster" className="vault-preview">
              <div className="section-heading compact-heading">
                <div>
                  <h3>{accountText(copy, "邮政官")}</h3>
                  <p>{accountText(copy, "只读显示角色邮政官里的待领取物品，先帮助你发现堆积。")}</p>
                </div>
              </div>
              {accountWorkspace.postmasterPreviewItems.length ? (
                <div className="equipment-grid">
                  {accountWorkspace.postmasterPreviewItems.map((entry: any) => {
                    return (
                      <button
                        type="button"
                        className={[
                          "equipment-item",
                          "inventory",
                          entry.isPending ? "pending" : "",
                          entry.isLoadoutMatch ? "loadout-highlight" : ""
                        ].filter(Boolean).join(" ")}
                        key={entry.key}
                        aria-busy={entry.isPending}
                        onClick={() => props.onOpenItem(entry.item, {
                          source_character_id: selectedCharacter.character_id,
                          is_postmaster_item: true
                        })}
                      >
                        {entry.item.icon ? <img alt="" loading="lazy" src={entry.item.icon} /> : <div className="item-icon-placeholder" />}
                        <div>
                          <strong>{entry.item.name}</strong>
                          {entry.isLoadoutMatch ? <small className="loadout-template-badge">{accountText(copy, "方案命中")}</small> : null}
                          <span>{entry.meta}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="status-message status-neutral">{accountText(copy, "当前角色邮政官为空。")}</p>
              )}
            </section>
          </div>
          </div>
          </div>
        </div>
      ) : null}
    </AccountPageView>
  );
}

function accountText(copy: AccountCopy, key: string): string {
  return copy.inline[key] ?? key;
}

function formatActivityMode(mode: AnyActivityHistorySummary["recent_items"][number]["mode"], copy: AccountCopy): string {
  if (mode === "pve") return "PVE";
  if (mode === "pvp") return "PVP";
  return accountText(copy, "其他");
}

function formatActivityPeriod(value: string, locale: InterfaceLocale = "zh-CN"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function AccountSlotComparison(props: {
  isLoadoutMatch: (item: AnyAccountItemSummary, highlightedTemplate?: any | null) => boolean;
  getAccountPageItemKey: (item: AnyAccountItemSummary) => string;
  formatAccountItemMeta: (item: AnyAccountItemSummary) => string;
  rows: AnyAccountSlotComparisonRow[];
  highlightedTemplate?: unknown | null;
  openingItemKey: string;
  onOpenEquippedItem: (item: AnyAccountItemSummary) => void;
  onOpenInventoryItem: (item: AnyAccountItemSummary) => void;
  copy: AccountCopy;
}) {
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());

  function expandedKey(rowKey: string, source: AccountItemSource): string {
    return `${rowKey}:${source}`;
  }

  function isExpanded(rowKey: string, source: AccountItemSource): boolean {
    return expandedSlots.has(expandedKey(rowKey, source));
  }

  function expandSlot(rowKey: string, source: AccountItemSource): void {
    setExpandedSlots((current) => {
      const next = new Set(current);
      next.add(expandedKey(rowKey, source));
      return next;
    });
  }

  return (
    <div className="account-slot-comparison-list">
      {props.rows.map((row: any) => (
        <article className="account-slot-comparison-row" key={row.key}>
          <div className="account-slot-heading">
            <strong>{row.label}</strong>
            <span>{accountText(props.copy, "装备")} {row.equippedItems.length} / {accountText(props.copy, "背包")} {row.inventoryItems.length}</span>
          </div>
          <div className="account-slot-comparison-columns">
            <section className="account-slot-comparison-column account-equipped-panel">
              <h5>{accountText(props.copy, "当前角色装备")}</h5>
              {renderAccountItemGrid(row.equippedItems, "equipped", {
                isLoadoutMatch: props.isLoadoutMatch,
                getAccountPageItemKey: props.getAccountPageItemKey,
                formatAccountItemMeta: props.formatAccountItemMeta,
                highlightedTemplate: props.highlightedTemplate,
                openingItemKey: props.openingItemKey,
                isExpanded: true,
                onOpenItem: props.onOpenEquippedItem,
                copy: props.copy
              })}
            </section>
            <section className="account-slot-comparison-column account-inventory-panel account-slot-backpack-preview">
              <h5>{accountText(props.copy, "当前角色背包 / 背包候选")}</h5>
              {renderAccountItemGrid(row.inventoryItems, "inventory", {
                isLoadoutMatch: props.isLoadoutMatch,
                getAccountPageItemKey: props.getAccountPageItemKey,
                formatAccountItemMeta: props.formatAccountItemMeta,
                highlightedTemplate: props.highlightedTemplate,
                openingItemKey: props.openingItemKey,
                isExpanded: isExpanded(row.key, "inventory"),
                onExpand: () => expandSlot(row.key, "inventory"),
                onOpenItem: props.onOpenInventoryItem,
                copy: props.copy
              })}
            </section>
          </div>
        </article>
      ))}
    </div>
  );
}

function renderAccountItemGrid(
  items: AnyAccountItemSummary[],
  source: AccountItemSource,
  props: {
    highlightedTemplate?: unknown | null;
    openingItemKey: string;
    isLoadoutMatch: (item: AnyAccountItemSummary, highlightedTemplate?: any | null) => boolean;
    getAccountPageItemKey: (item: AnyAccountItemSummary) => string;
    formatAccountItemMeta: (item: AnyAccountItemSummary) => string;
    isExpanded: boolean;
    onExpand?: () => void;
    onOpenItem: (item: AnyAccountItemSummary) => void;
    copy: AccountCopy;
  }
) {
  if (!items.length) {
    return <p className="muted-copy">{accountText(props.copy, "暂无")}</p>;
  }

  const shouldLimitItems = source === "inventory" && !props.isExpanded && items.length > ACCOUNT_SLOT_PREVIEW_LIMIT;
  const visibleItems = shouldLimitItems ? items.slice(0, ACCOUNT_SLOT_PREVIEW_LIMIT) : items;
  const hiddenItemCount = items.length - visibleItems.length;

  return (
    <div className="equipment-grid">
      {visibleItems.map((item: any, index: number) => {
        const isPending = props.getAccountPageItemKey(item) === props.openingItemKey;
        const isLoadoutMatch = props.isLoadoutMatch(item, props.highlightedTemplate);
        return (
          <button
            type="button"
            className={[
              "equipment-item",
              source === "equipped" ? "equipped" : "inventory",
              isPending ? "pending" : "",
              isLoadoutMatch ? "loadout-highlight" : ""
            ].filter(Boolean).join(" ")}
            key={`${source}-${item.hash}-${item.instance_id ?? item.name}-${index}`}
            aria-busy={isPending}
            onClick={() => props.onOpenItem(item)}
          >
            {item.icon ? <img alt="" loading="lazy" src={item.icon} /> : <div className="item-icon-placeholder" />}
            <div>
              <strong>{item.name}</strong>
              {isLoadoutMatch ? <small className="loadout-template-badge">{accountText(props.copy, "方案命中")}</small> : null}
              <span>{props.formatAccountItemMeta(item)}</span>
            </div>
          </button>
        );
      })}
      {hiddenItemCount > 0 ? (
        <button type="button" className="equipment-item inventory account-show-more-item" onClick={props.onExpand}>
          <div>
            <strong>{accountText(props.copy, "显示全部")} {items.length} {accountText(props.copy, "件")}</strong>
            <span>{accountText(props.copy, "还有")} {hiddenItemCount} {accountText(props.copy, "件未渲染，点击后展开此槽位。")}</span>
          </div>
        </button>
      ) : null}
    </div>
  );
}
