import { AccountPageView } from "@d2-tools/ui";
import type {
  AccountItemSummary,
  AccountSummary,
  ActivityHistorySummary,
  LoadoutTemplate,
  StartupState
} from "../../api/client";
import { useState } from "react";
import {
  createAccountPageWorkspace,
  formatAccountItemMeta,
  getAccountPageItemKey,
  type AccountSlotComparisonRow
} from "@d2-tools/app";
import {
  matchesLoadoutTemplateItem,
  type LoadoutTemplateLookup
} from "../../shared/domain/loadouts/loadoutLookup";

type AccountItemSource = "equipped" | "inventory";
const ACCOUNT_SLOT_PREVIEW_LIMIT = 8;

export function AccountPage(props: {
  accountSummary: AccountSummary | null;
  startupState: StartupState;
  selectedCharacterId: string;
  isLoadingAccount: boolean;
  accountError: string;
  itemDetailError: string;
  itemDetailLoadingKey: string;
  writeActionsEnabled: boolean;
  activitySummary: ActivityHistorySummary | null;
  activityMessage: string;
  activityError: string;
  loadoutMessage: string;
  itemActionMessage: string;
  isRunningItemAction: boolean;
  activeLoadoutLookup: LoadoutTemplateLookup | null;
  activeLoadoutTemplate: LoadoutTemplate | null;
  onConfigureBungie: () => void;
  onLoginBungie: () => void;
  onLoadAccount: () => void;
  onRefreshActivity: () => void;
  onSelectCharacter: (characterId: string) => void;
  onSaveCharacterLoadout: (character: AccountSummary["characters"][number]) => void;
  onEquipHighestPowerItems: (character: AccountSummary["characters"][number]) => void;
  onOpenItem: (
    item: AccountItemSummary,
    options: {
      source_character_id: string;
      source_kind?: AccountItemSource;
      is_postmaster_item?: boolean;
    }
  ) => void;
}) {
  const { accountSummary } = props;
  const activitySummary = props.activitySummary;
  const activityReview = activitySummary ? activitySummary.review : null;
  const accountWorkspace = createAccountPageWorkspace({
    account: accountSummary,
    selectedCharacterId: props.selectedCharacterId,
    openingItemKey: props.itemDetailLoadingKey,
    isLoadoutMatch: (item) => matchesLoadoutTemplateItem(item, props.activeLoadoutLookup)
  });
  const selectedCharacter = accountWorkspace.selectedCharacter;
  const isBungieConfigured = props.startupState.cards.bungieConfig.status === "ready";
  const isAccountLoggedIn = props.startupState.cards.account.status === "ready";
  const canLoadAccount = isBungieConfigured && isAccountLoggedIn;

  return (
    <AccountPageView>
      <div className="section-heading">
        <div>
          <h2>账号摘要</h2>
          <p>读取当前 Bungie 账号、角色装备、背包、材料和邮政官。</p>
        </div>
        <button type="button" disabled={props.isLoadingAccount || !canLoadAccount} onClick={props.onLoadAccount}>
          {props.isLoadingAccount ? "读取中..." : "读取账号数据"}
        </button>
      </div>
      {props.accountError ? <p className="status-message status-error">{props.accountError}</p> : null}
      {props.itemDetailError ? <p className="status-message status-error">{props.itemDetailError}</p> : null}
      {!accountSummary ? (
        <div className="account-empty-state">
          <p className="status-message status-warning">未连接 Bungie</p>
          <h3>{isBungieConfigured ? "账号还没有登录" : "还没有配置 Bungie 应用"}</h3>
          <p>
            不配置也可以继续使用本地设置、资料库搜索、愿望单、标签和目标规则。
            账号、角色、仓库、装备和活动记录需要先完成 Bungie 配置与登录。
          </p>
          <div className="button-row">
            {!isBungieConfigured ? (
              <button type="button" onClick={props.onConfigureBungie}>
                去设置 Bungie
              </button>
            ) : null}
            <button
              type="button"
              className={isBungieConfigured ? "" : "secondary-button"}
              disabled={!isBungieConfigured || props.isLoadingAccount}
              onClick={props.onLoginBungie}
            >
              登录 Bungie
            </button>
          </div>
          {isBungieConfigured && !isAccountLoggedIn ? (
            <p className="status-message status-neutral">{props.startupState.cards.account.label}</p>
          ) : null}
        </div>
      ) : null}
      {accountSummary && selectedCharacter ? (
        <div className="account-page-shell">
          <nav className="account-page-nav" aria-label="账号目录">
            <a href="#account-profile">账号概览</a>
            <a href="#account-loadout">角色装备</a>
            <a href="#account-activity">活动复盘</a>
            <a href="#account-materials">材料消耗</a>
            <a href="#account-postmaster">邮政官</a>
          </nav>
          <div className="account-summary account-page-main">
            <div id="account-profile" className="account-profile-strip">
              <div>
                <h3>{accountSummary.account_name}</h3>
                <p>{accountWorkspace.accountProfileLine}</p>
                <p>{accountWorkspace.accountInventoryLine}</p>
              </div>
              <div className="character-tabs" role="tablist" aria-label="角色切换">
                {accountWorkspace.characterTabs.map((tab) => (
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
                    保存当前装备为模板
                  </button>
                  <button
                    type="button"
                    className="inline-action"
                    disabled={props.isRunningItemAction}
                    aria-describedby="highest-power-feedback"
                    onClick={() => props.onEquipHighestPowerItems(selectedCharacter)}
                  >
                    {props.isRunningItemAction ? "执行中..." : "装备最高光等"}
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
                      <p className="status-message status-warning">d2-tools 本地写操作开关未开启，请先到设置页开启。</p>
                    ) : null}
                    {props.loadoutMessage ? <p className="status-message status-ready">{props.loadoutMessage}</p> : null}
                    {props.itemActionMessage ? <p className={props.itemActionMessage.includes("失败") ? "status-message status-error" : "status-message status-ready"}>{props.itemActionMessage}</p> : null}
                  </div>
                ) : null}
              </div>
            </article>

            <section className="character-card account-slot-comparison">
              <div className="equipment-section-heading">
                <h4>当前角色装备与背包</h4>
                <span>
                  装备 {selectedCharacter.equipped_items.length} 件 / 背包 {selectedCharacter.inventory_items.length} 件
                  {props.activeLoadoutTemplate ? ` / 方案命中 ${accountWorkspace.selectedCharacterLoadoutMatchCount}` : ""}
                </span>
              </div>
              <AccountSlotComparison
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
              />
            </section>
          </div>

          <div className="account-secondary-workbench account-side-summary">
            <section className="account-side-summary-grid" aria-label="账号侧栏摘要">
              <div>
                <span>最近活动</span>
                <strong>{activitySummary ? `${activitySummary.recent.total} 场` : "待读取"}</strong>
              </div>
              <div>
                <span>材料</span>
                <strong>{accountWorkspace.materialRows.length} 项</strong>
              </div>
              <div>
                <span>邮政官</span>
                <strong>{accountWorkspace.postmasterPreviewItems.length} 件</strong>
              </div>
            </section>
            <section id="account-activity" className="vault-preview account-activity-review">
              <div className="section-heading compact-heading">
                <div>
                  <h3>活动复盘</h3>
                  <p>按最近记录快速回看 PVE / PVP 完成情况和突袭、地牢尝试。</p>
                </div>
                <button type="button" className="secondary-button" onClick={props.onRefreshActivity}>
                  刷新活动
                </button>
              </div>
              {props.activityError ? <p className="status-message status-error">{props.activityError}</p> : null}
              {props.activityMessage ? <p className="status-message status-ready">{props.activityMessage}</p> : null}
              {activitySummary ? (
                <div className="activity-review-grid">
                  <div className="source-status-card source-status-neutral">
                    <span className="source-status-badge source-status-neutral">最近活动</span>
                    <strong>{activitySummary.recent.total} 场</strong>
                    <span>
                      PVE {activitySummary.recent.pve.completed}/{activitySummary.recent.pve.total}
                      {" / "}
                      PVP {activitySummary.recent.pvp.completed}/{activitySummary.recent.pvp.total}
                    </span>
                    {activityReview ? (
                      <small>完成率 {activityReview.completion_rate}% / 连续完成 {activityReview.completions_in_a_row} 场</small>
                    ) : null}
                    {activitySummary.recent.latest_period ? <small>最近一场：{formatActivityPeriod(activitySummary.recent.latest_period)}</small> : null}
                  </div>
                  <div className="activity-review-list">
                    <strong>突袭 / 地牢</strong>
                    {activitySummary.raids.entries.length ? (
                      <ul>
                        {activitySummary.raids.entries.slice(0, 4).map((entry) => (
                          <li key={`${entry.activity_type}-${entry.activity_name}`}>
                            <span>{entry.activity_type === "raid" ? "突袭" : "地牢"} · {entry.activity_name}</span>
                            <small>
                              完成 {entry.completions}/{entry.attempts}
                              {entry.last_completed_at ? ` · ${formatActivityPeriod(entry.last_completed_at)}` : ""}
                            </small>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted-copy">最近没有读取到突袭或地牢记录。</p>
                    )}
                  </div>
                  <div className="activity-review-list">
                    <strong>最近 10 场</strong>
                    {activitySummary.recent_items.length ? (
                      <ul>
                        {activitySummary.recent_items.slice(0, 10).map((item, index) => {
                          const reviewEntry = activityReview?.recent_10[index];
                          return (
                          <li key={`${item.period}-${item.activity_name}`}>
                            <span>{formatActivityMode(item.mode)} · {item.activity_name}</span>
                            <small>
                              {(reviewEntry?.status_label ?? (item.completed ? "已完成" : "未完成"))}
                              {" · "}
                              {formatActivityPeriod(item.period)}
                              {reviewEntry?.duration_label ? ` · ${reviewEntry.duration_label}` : ""}
                            </small>
                            {reviewEntry?.key_stats.length ? (
                              <small>关键统计：{reviewEntry.key_stats.slice(0, 3).join(" / ")}</small>
                            ) : null}
                          </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="muted-copy">暂无最近活动记录。</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="status-message status-neutral">读取账号后会显示最近活动复盘。</p>
              )}
            </section>

            <section id="account-materials" className="vault-preview">
              <div className="section-heading compact-heading">
                <div>
                  <h3>材料与消耗品</h3>
                  <p>副本、日常和商人交互常用资源，按账号维度读取。</p>
                </div>
              </div>
              {accountWorkspace.materialRows.length ? (
                <div className="material-grid">
                  {accountWorkspace.materialRows.map((row) => (
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
                <p className="status-message status-neutral">没有读取到账号材料或货币。</p>
              )}
            </section>

            <section id="account-postmaster" className="vault-preview">
              <div className="section-heading compact-heading">
                <div>
                  <h3>邮政官</h3>
                  <p>只读显示角色邮政官里的待领取物品，先帮助你发现堆积。</p>
                </div>
              </div>
              {accountWorkspace.postmasterPreviewItems.length ? (
                <div className="equipment-grid">
                  {accountWorkspace.postmasterPreviewItems.map((entry) => {
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
                          {entry.isLoadoutMatch ? <small className="loadout-template-badge">方案命中</small> : null}
                          <span>{entry.meta}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="status-message status-neutral">当前角色邮政官为空。</p>
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

function formatActivityMode(mode: ActivityHistorySummary["recent_items"][number]["mode"]): string {
  if (mode === "pve") return "PVE";
  if (mode === "pvp") return "PVP";
  return "其他";
}

function formatActivityPeriod(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function AccountSlotComparison(props: {
  rows: AccountSlotComparisonRow[];
  highlightedTemplate?: LoadoutTemplateLookup | null;
  openingItemKey: string;
  onOpenEquippedItem: (item: AccountItemSummary) => void;
  onOpenInventoryItem: (item: AccountItemSummary) => void;
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
            <span>装备 {row.equippedItems.length} / 背包 {row.inventoryItems.length}</span>
          </div>
          <div className="account-slot-comparison-columns">
            <section className="account-slot-comparison-column account-equipped-panel">
              <h5>当前角色装备</h5>
              {renderAccountItemGrid(row.equippedItems, "equipped", {
                highlightedTemplate: props.highlightedTemplate,
                openingItemKey: props.openingItemKey,
                isExpanded: true,
                onOpenItem: props.onOpenEquippedItem
              })}
            </section>
            <section className="account-slot-comparison-column account-inventory-panel account-slot-backpack-preview">
              <h5>当前角色背包 / 背包候选</h5>
              {renderAccountItemGrid(row.inventoryItems, "inventory", {
                highlightedTemplate: props.highlightedTemplate,
                openingItemKey: props.openingItemKey,
                isExpanded: isExpanded(row.key, "inventory"),
                onExpand: () => expandSlot(row.key, "inventory"),
                onOpenItem: props.onOpenInventoryItem
              })}
            </section>
          </div>
        </article>
      ))}
    </div>
  );
}

function renderAccountItemGrid(
  items: AccountItemSummary[],
  source: AccountItemSource,
  props: {
    highlightedTemplate?: LoadoutTemplateLookup | null;
    openingItemKey: string;
    isExpanded: boolean;
    onExpand?: () => void;
    onOpenItem: (item: AccountItemSummary) => void;
  }
) {
  if (!items.length) {
    return <p className="muted-copy">暂无</p>;
  }

  const shouldLimitItems = source === "inventory" && !props.isExpanded && items.length > ACCOUNT_SLOT_PREVIEW_LIMIT;
  const visibleItems = shouldLimitItems ? items.slice(0, ACCOUNT_SLOT_PREVIEW_LIMIT) : items;
  const hiddenItemCount = items.length - visibleItems.length;

  return (
    <div className="equipment-grid">
      {visibleItems.map((item, index) => {
        const isPending = getAccountPageItemKey(item) === props.openingItemKey;
        const isLoadoutMatch = matchesLoadoutTemplateItem(item, props.highlightedTemplate);
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
              {isLoadoutMatch ? <small className="loadout-template-badge">方案命中</small> : null}
              <span>{formatAccountItemMeta(item)}</span>
            </div>
          </button>
        );
      })}
      {hiddenItemCount > 0 ? (
        <button type="button" className="equipment-item inventory account-show-more-item" onClick={props.onExpand}>
          <div>
            <strong>显示全部 {items.length} 件</strong>
            <span>还有 {hiddenItemCount} 件未渲染，点击后展开此槽位。</span>
          </div>
        </button>
      ) : null}
    </div>
  );
}
