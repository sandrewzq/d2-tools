import { useState } from "react";
import type {
  AccountItemView,
  AccountOpenItemPayload,
  AccountPageViewModel,
  AccountSlotComparisonViewRow
} from "@d2-tools/app/account";
import { getLocaleCopy } from "../i18n/copy.js";
import type { AccountCopy, InterfaceLocale } from "../i18n/types.js";
import {
  ProductWorkspaceContentStack,
  ProductWorkspaceSideRail,
  ProductWorkspaceSplit
} from "../workspace/ProductWorkspace.js";

type AccountItemSource = "equipped" | "inventory";
const ACCOUNT_SLOT_PREVIEW_LIMIT = 8;

export type AccountPageActions = {
  configureBungie: () => void;
  openWriteSettings: () => void;
  loginBungie: () => void;
  refreshAccount: () => void;
  refreshActivity: () => void;
  selectCharacter: (characterId: string) => void;
  saveCurrentLoadout: (characterId: string) => void;
  equipHighestPower: (characterId: string) => void;
  openItem: (payload: AccountOpenItemPayload) => void;
};

export type AccountPageContentViewProps = {
  interfaceLocale?: InterfaceLocale;
  viewModel: AccountPageViewModel;
  actions: AccountPageActions;
};

export function AccountPageContentView(props: AccountPageContentViewProps) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").account;
  const { actions, viewModel } = props;
  const selectedCharacter = viewModel.selectedCharacter;
  const profile = viewModel.profile;
  const activitySummary = viewModel.activity.summary;
  const activityReview = activitySummary ? activitySummary.review : null;
  const writeWarning = viewModel.feedback.writeActionsEnabled
    ? ""
    : accountText(copy, "写操作已关闭。要使用装备、转移等功能，请在“设置 → 账号 → 装备写操作”中开启“允许”。");

  return (
    <>
      {viewModel.feedback.accountError ? <p className="status-message status-error">{viewModel.feedback.accountError}</p> : null}
      {viewModel.feedback.accountWarning ? <p className="status-message status-warning">{viewModel.feedback.accountWarning}</p> : null}
      {viewModel.feedback.itemDetailError ? <p className="status-message status-error">{viewModel.feedback.itemDetailError}</p> : null}
      {!viewModel.connection.hasAccount ? (
        <div className="account-empty-state">
          <p className="status-message status-warning">{copy.disconnectedBadge}</p>
          <h3>{viewModel.connection.isBungieConfigured ? copy.loginMissingTitle : copy.configMissingTitle}</h3>
          <p>{copy.emptyBody}</p>
          <div className="button-row">
            {!viewModel.connection.isBungieConfigured ? (
              <button type="button" onClick={actions.configureBungie}>
                {copy.configureBungie}
              </button>
            ) : null}
            <button
              type="button"
              className={viewModel.connection.isBungieConfigured ? "" : "secondary-button"}
              disabled={!viewModel.connection.isBungieConfigured || viewModel.connection.isLoadingAccount}
              onClick={actions.loginBungie}
            >
              {copy.loginBungie}
            </button>
          </div>
          {viewModel.connection.isBungieConfigured && !viewModel.connection.isAccountLoggedIn && viewModel.connection.accountStatusLabel ? (
            <p className="status-message status-neutral">{viewModel.connection.accountStatusLabel}</p>
          ) : null}
        </div>
      ) : null}
      {profile && selectedCharacter ? (
        <ProductWorkspaceSplit className="account-page-shell">
          <ProductWorkspaceSideRail element="nav" className="account-page-nav" ariaLabel={accountText(copy, "账号目录")}>
            {viewModel.navigation.map((item) => (
              <a href={item.href} key={item.key}>{copy.nav[item.labelKey]}</a>
            ))}
          </ProductWorkspaceSideRail>
          <ProductWorkspaceContentStack className="account-summary account-page-main">
            <div id="account-profile" className="account-profile-strip">
              <div>
                <h3>{profile.accountName}</h3>
                <p>{profile.profileLine}</p>
                <p>{profile.inventoryLine}</p>
              </div>
              <div className="account-profile-controls">
                <div className="account-page-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={viewModel.connection.isLoadingAccount}
                    onClick={actions.refreshAccount}
                  >
                    {accountText(copy, "刷新账号")}
                  </button>
                  <button type="button" className="secondary-button" onClick={actions.loginBungie}>
                    {accountText(copy, "重新授权")}
                  </button>
                </div>
                <div className="character-tabs" role="tablist" aria-label={accountText(copy, "角色切换")}>
                  {viewModel.characterTabs.map((tab) => (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={tab.isSelected}
                      className={tab.isSelected ? "character-tab active" : "character-tab"}
                      key={tab.key}
                      onClick={() => actions.selectCharacter(tab.key)}
                    >
                      {tab.emblemUrl ? <img alt="" loading="lazy" src={tab.emblemUrl} /> : null}
                      <span>{tab.className}</span>
                      <strong>{tab.lightLabel}</strong>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          <div className="account-a2-layout">
          <div id="account-loadout" className="account-primary-workbench">
            <article className="character-card character-card-focused account-character-summary">
              <div className="character-title">
                {selectedCharacter.emblemUrl ? <img alt="" loading="lazy" src={selectedCharacter.emblemUrl} /> : null}
                <div>
                  <h3>{selectedCharacter.className}</h3>
                  <p>{selectedCharacter.summary}</p>
                </div>
                <div className="character-actions">
                  <button type="button" className="inline-action" onClick={() => actions.saveCurrentLoadout(selectedCharacter.characterId)}>
                    {copy.actions.saveCurrentLoadout}
                  </button>
                  <button
                    type="button"
                    className="inline-action"
                    disabled={viewModel.loadout.isRunningItemAction}
                    aria-describedby="highest-power-feedback"
                    onClick={() => actions.equipHighestPower(selectedCharacter.characterId)}
                  >
                    {viewModel.loadout.isRunningItemAction ? copy.actions.running : copy.actions.equipHighestPower}
                  </button>
                </div>
                {(writeWarning || viewModel.feedback.loadoutMessage || viewModel.feedback.itemActionMessage) ? (
                  <div
                    id="highest-power-feedback"
                    className="character-action-feedback"
                    role="status"
                    aria-live="polite"
                  >
                    {writeWarning ? (
                      <div className="status-message status-warning account-write-warning">
                        <span>{writeWarning}</span>
                        <button type="button" className="secondary-button" onClick={actions.openWriteSettings}>
                          {accountText(copy, "前往设置开启")}
                        </button>
                      </div>
                    ) : null}
                    {viewModel.feedback.loadoutMessage ? <p className="status-message status-ready">{viewModel.feedback.loadoutMessage}</p> : null}
                    {viewModel.feedback.itemActionMessage ? <p className={viewModel.feedback.itemActionMessage.includes("失败") ? "status-message status-error" : "status-message status-ready"}>{viewModel.feedback.itemActionMessage}</p> : null}
                  </div>
                ) : null}
              </div>
            </article>

            <section className="character-card account-slot-comparison">
              <div className="equipment-section-heading">
                <h4>{accountText(copy, "当前角色装备与背包")}</h4>
                <span>
                  {accountText(copy, "装备")} {viewModel.loadout.equippedCount} {accountText(copy, "件")} / {accountText(copy, "背包")} {viewModel.loadout.inventoryCount} {accountText(copy, "件")}
                  {viewModel.loadout.activeTemplateName ? ` / ${accountText(copy, "方案命中")} ${viewModel.loadout.selectedCharacterLoadoutMatchCount}` : ""}
                </span>
              </div>
              <AccountSlotComparison
                rows={viewModel.loadout.slotComparisonRows}
                onOpenItem={actions.openItem}
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
                <strong>{viewModel.materials.rows.length} {accountText(copy, "项")}</strong>
              </div>
              <div>
                <span>{accountText(copy, "邮政官")}</span>
                <strong>{viewModel.postmaster.items.length} {accountText(copy, "件")}</strong>
              </div>
            </section>
            <section id="account-activity" className="vault-preview account-activity-review">
              <div className="section-heading compact-heading">
                <div>
                  <h3>{accountText(copy, "活动复盘")}</h3>
                  <p>{accountText(copy, "按最近记录快速回看 PVE / PVP 完成情况和突袭、地牢尝试。")}</p>
                </div>
                <button type="button" className="secondary-button" onClick={actions.refreshActivity}>
                  {accountText(copy, "刷新活动")}
                </button>
              </div>
              {viewModel.activity.error ? <p className="status-message status-error">{viewModel.activity.error}</p> : null}
              {viewModel.activity.message ? <p className="status-message status-ready">{viewModel.activity.message}</p> : null}
              {activitySummary ? (
                <div className="activity-review-grid">
                  <div className="source-status-card source-status-neutral activity-review-summary-card">
                    <span className="source-status-badge source-status-neutral">{accountText(copy, "最近活动")}</span>
                    <strong>{activitySummary.recent.total} {accountText(copy, "场")}</strong>
                    <span className="activity-review-stat-line">
                      <span>PVE {activitySummary.recent.pve.completed}/{activitySummary.recent.pve.total}</span>
                      <span>PVP {activitySummary.recent.pvp.completed}/{activitySummary.recent.pvp.total}</span>
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
                        {activitySummary.raids.entries.slice(0, 4).map((entry) => (
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
                  <div className="activity-review-list activity-review-list-wide">
                    <strong>{accountText(copy, "最近 10 场")}</strong>
                    {activitySummary.recent_items.length ? (
                      <ul>
                        {activitySummary.recent_items.slice(0, 10).map((item, index) => {
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
              {viewModel.materials.rows.length ? (
                <div className="material-grid">
                  {viewModel.materials.rows.map((row) => (
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
              {viewModel.postmaster.items.length ? (
                <div className="equipment-grid">
                  {viewModel.postmaster.items.map((entry) => renderAccountItemButton(entry, "inventory", {
                    onOpenItem: actions.openItem,
                    copy
                  }))}
                </div>
              ) : (
                <p className="status-message status-neutral">{accountText(copy, "当前角色邮政官为空。")}</p>
              )}
            </section>
          </div>
          </div>
          </ProductWorkspaceContentStack>
        </ProductWorkspaceSplit>
      ) : null}
    </>
  );
}

function accountText(copy: AccountCopy, key: string): string {
  return copy.inline[key] ?? key;
}

type ActivityRecentItemMode = NonNullable<AccountPageViewModel["activity"]["summary"]>["recent_items"][number]["mode"];

function formatActivityMode(mode: ActivityRecentItemMode, copy: AccountCopy): string {
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
  rows: AccountSlotComparisonViewRow[];
  onOpenItem: (payload: AccountOpenItemPayload) => void;
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
      {props.rows.map((row) => (
        <article className="account-slot-comparison-row" key={row.key}>
          <div className="account-slot-heading">
            <strong>{row.label}</strong>
            <span>{accountText(props.copy, "装备")} {row.equippedItems.length} / {accountText(props.copy, "背包")} {row.inventoryItems.length}</span>
          </div>
          <div className="account-slot-comparison-columns">
            <section className="account-slot-comparison-column account-equipped-panel">
              <h5>{accountText(props.copy, "当前角色装备")}</h5>
              {renderAccountItemGrid(row.equippedItems, "equipped", {
                isExpanded: true,
                onOpenItem: props.onOpenItem,
                copy: props.copy
              })}
            </section>
            <section className="account-slot-comparison-column account-inventory-panel account-slot-backpack-preview">
              <h5>{accountText(props.copy, "当前角色背包 / 背包候选")}</h5>
              {renderAccountItemGrid(row.inventoryItems, "inventory", {
                isExpanded: isExpanded(row.key, "inventory"),
                onExpand: () => expandSlot(row.key, "inventory"),
                onOpenItem: props.onOpenItem,
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
  items: AccountItemView[],
  source: AccountItemSource,
  props: {
    isExpanded: boolean;
    onExpand?: () => void;
    onOpenItem: (payload: AccountOpenItemPayload) => void;
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
      {visibleItems.map((item) => renderAccountItemButton(item, source, {
        onOpenItem: props.onOpenItem,
        copy: props.copy
      }))}
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

function renderAccountItemButton(
  item: AccountItemView,
  source: AccountItemSource,
  props: {
    onOpenItem: (payload: AccountOpenItemPayload) => void;
    copy: AccountCopy;
  }
) {
  return (
    <button
      type="button"
      className={[
        "equipment-item",
        source === "equipped" ? "equipped" : "inventory",
        item.isPending ? "pending" : "",
        item.isLoadoutMatch ? "loadout-highlight" : ""
      ].filter(Boolean).join(" ")}
      key={item.key}
      aria-busy={item.isPending}
      onClick={() => props.onOpenItem(item.openPayload)}
    >
      {item.icon ? (
        <img
          alt=""
          decoding="async"
          fetchPriority={source === "equipped" ? "high" : "auto"}
          loading={source === "equipped" ? "eager" : "lazy"}
          src={item.icon}
        />
      ) : <div className="item-icon-placeholder" />}
      <div>
        <strong>{item.name}</strong>
        {item.isLoadoutMatch ? <small className="loadout-template-badge">{accountText(props.copy, "方案命中")}</small> : null}
        <span>{item.meta}</span>
      </div>
    </button>
  );
}
