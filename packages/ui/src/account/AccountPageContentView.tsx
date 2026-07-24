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
const ACCOUNT_SLOT_PREVIEW_LIMIT = 2;

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

type AccountSection = "gear" | "activity" | "materials" | "postmaster";

export function AccountPageContentView(props: AccountPageContentViewProps) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").account;
  const { actions, viewModel } = props;
  const selectedCharacter = viewModel.selectedCharacter;
  const profile = viewModel.profile;
  const activitySummary = viewModel.activity.summary;
  const activityReview = activitySummary ? activitySummary.review : null;
  const [section, setSection] = useState<AccountSection>("gear");
  const writeWarning = viewModel.feedback.writeActionsEnabled
    ? ""
    : accountText(copy, "写操作已关闭。要使用装备、转移等功能，请在“设置 → 账号 → 装备写操作”中开启“允许”。");

  if (!profile || !selectedCharacter) {
    return (
      <section className="account-workspace account-unavailable">
        {viewModel.feedback.accountError ? <p className="status-message status-error">{viewModel.feedback.accountError}</p> : null}
        {viewModel.feedback.accountWarning ? <p className="status-message status-warning">{viewModel.feedback.accountWarning}</p> : null}
        <p className="status-message status-warning">{copy.disconnectedBadge}</p>
        <h2>{viewModel.connection.isBungieConfigured ? copy.loginMissingTitle : copy.configMissingTitle}</h2>
        <p>{copy.emptyBody}</p>
        <div className="button-row">
          {!viewModel.connection.isBungieConfigured ? <button type="button" onClick={actions.configureBungie}>{copy.configureBungie}</button> : null}
          <button type="button" className="secondary-button" disabled={!viewModel.connection.isBungieConfigured || viewModel.connection.isLoadingAccount} onClick={actions.loginBungie}>{copy.loginBungie}</button>
        </div>
      </section>
    );
  }

  return <AccountPageWorkspace actions={actions} activityReview={activityReview} activitySummary={activitySummary} copy={copy} section={section} selectedCharacter={selectedCharacter} setSection={setSection} viewModel={viewModel} writeWarning={writeWarning} />;
}
function AccountPageWorkspace(props: {
  actions: AccountPageActions;
  activityReview: NonNullable<AccountPageViewModel["activity"]["summary"]>["review"] | null;
  activitySummary: AccountPageViewModel["activity"]["summary"];
  copy: AccountCopy;
  section: AccountSection;
  selectedCharacter: NonNullable<AccountPageViewModel["selectedCharacter"]>;
  setSection: (section: AccountSection) => void;
  viewModel: AccountPageViewModel;
  writeWarning: string;
}) {
  const profile = props.viewModel.profile!;
  const navigation: Array<{ key: AccountSection; label: string; count?: number }> = [
    { key: "gear", label: accountText(props.copy, "角色装备与背包") },
    { key: "activity", label: accountText(props.copy, "活动复盘") },
    { key: "materials", label: accountText(props.copy, "材料与消耗品"), count: props.viewModel.materials.rows.length },
    { key: "postmaster", label: accountText(props.copy, "邮政官"), count: props.viewModel.postmaster.items.length }
  ];

  return (
    <>
      {props.viewModel.feedback.accountError ? <p className="status-message status-error">{props.viewModel.feedback.accountError}</p> : null}
      {props.viewModel.feedback.accountWarning ? <p className="status-message status-warning">{props.viewModel.feedback.accountWarning}</p> : null}
      {props.viewModel.feedback.itemDetailError ? <p className="status-message status-error">{props.viewModel.feedback.itemDetailError}</p> : null}
      <ProductWorkspaceSplit className="account-workspace">
      <ProductWorkspaceSideRail element="nav" className="account-directory" ariaLabel={accountText(props.copy, "账号目录")}>
        <div className="account-column-head">
          <h3>账号目录</h3>
          <span>{profile.accountName}</span>
        </div>
        {navigation.map((item) => (
          <button
            type="button"
            className={props.section === item.key ? "active" : ""}
            key={item.key}
            onClick={() => props.setSection(item.key)}
          >
            <span>{item.label}</span>
            {item.count !== undefined ? <small>{item.count}</small> : null}
          </button>
        ))}
      </ProductWorkspaceSideRail>
      <ProductWorkspaceContentStack className="account-content">
        <section className="account-summary">
          <div className="account-band-heading">
            <div>
              <span>{profile.profileLine}</span>
              <h2>{profile.accountName}</h2>
              <p>{profile.inventoryLine}</p>
            </div>
            <span className="app-chip status-ready">账号已读取</span>
          </div>
          <div className="account-character-tabs" role="tablist" aria-label={accountText(props.copy, "角色切换")}>
            {props.viewModel.characterTabs.map((tab) => (
              <button
                type="button"
                role="tab"
                aria-selected={tab.isSelected}
                className={tab.isSelected ? "active" : ""}
                key={tab.key}
                onClick={() => props.actions.selectCharacter(tab.key)}
              >
                {tab.className} · {tab.lightLabel}
              </button>
            ))}
          </div>
          <div className="account-actions">
            <button type="button" className="primary-button" onClick={() => props.actions.saveCurrentLoadout(props.selectedCharacter.characterId)}>
              {props.copy.actions.saveCurrentLoadout}
            </button>
            <button type="button" className="secondary-button" disabled={props.viewModel.loadout.isRunningItemAction} onClick={() => props.actions.equipHighestPower(props.selectedCharacter.characterId)}>
              {props.viewModel.loadout.isRunningItemAction ? props.copy.actions.running : props.copy.actions.equipHighestPower}
            </button>
            <button type="button" className="secondary-button" onClick={props.actions.openWriteSettings}>写操作设置</button>
          </div>
          {props.writeWarning ? <p className="status-message status-warning">{props.writeWarning}</p> : null}
          {props.viewModel.feedback.loadoutMessage ? <p className="status-message status-ready">{props.viewModel.feedback.loadoutMessage}</p> : null}
          {props.viewModel.feedback.itemActionMessage ? <p className={props.viewModel.feedback.itemActionMessage.includes("失败") ? "status-message status-error" : "status-message status-ready"}>{props.viewModel.feedback.itemActionMessage}</p> : null}
        </section>

        {props.section === "gear" ? (
          <section className="account-section account-slot-comparison">
            <div className="account-column-head"><h3>{props.selectedCharacter.className}当前装备与背包</h3><span>按类型和位置对照</span></div>
            <AccountSlotComparison
              rows={props.viewModel.loadout.slotComparisonRows}
              onOpenItem={props.actions.openItem}
              copy={props.copy}
            />
          </section>
        ) : null}

        {props.section === "activity" ? (
          <section className="account-section">
            <div className="account-toolbar"><strong>活动复盘</strong><button type="button" className="secondary-button" onClick={props.actions.refreshActivity}>刷新活动记录</button></div>
            {props.viewModel.activity.error ? <p className="status-message status-error">{props.viewModel.activity.error}</p> : null}
            {props.viewModel.activity.message ? <p className="status-message status-ready">{props.viewModel.activity.message}</p> : null}
            {props.activitySummary ? (
              <>
                <div className="account-activity-grid">
                  <article><span>PVE 完成情况</span><strong>{props.activitySummary.recent.pve.completed} 场</strong><p>最近记录中的 PVE 完成情况</p></article>
                  <article><span>PVP 完成情况</span><strong>{props.activitySummary.recent.pvp.completed} 场</strong><p>最近记录中的 PVP 完成情况</p></article>
                  <article><span>突袭 / 地牢</span><strong>{props.activitySummary.raids.entries.filter((entry) => entry.activity_type === "raid").length} / {props.activitySummary.raids.entries.filter((entry) => entry.activity_type === "dungeon").length}</strong><p>当前可读取的完成记录</p></article>
                </div>
                <div className="account-column-head"><h3>最近 10 场</h3><span>Activity History</span></div>
                <div className="account-table-list">
                  {props.activitySummary.recent_items.slice(0, 10).map((item, index) => (
                    <div key={`${item.period}-${item.activity_name}`}>
                      <strong>{formatActivityMode(item.mode, props.copy)} · {item.activity_name}</strong>
                      <span>{props.activityReview?.recent_10[index]?.status_label ?? (item.completed ? "完成" : "未完成")}</span>
                      <small>{formatActivityPeriod(item.period)}</small>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="status-message status-neutral">读取账号后会显示最近活动复盘。</p>}
          </section>
        ) : null}

        {props.section === "materials" ? (
          <section className="account-section">
            <div className="account-column-head"><h3>材料与消耗品</h3><span>{props.viewModel.materials.rows.length} 种</span></div>
            <div className="account-table-list">
              {props.viewModel.materials.rows.map((row) => <div key={row.key}><strong>{row.material.name}</strong><span>{row.material.quantity}</span><small>{row.meta}</small></div>)}
            </div>
          </section>
        ) : null}

        {props.section === "postmaster" ? (
          <section className="account-section">
            <div className="account-column-head"><h3>邮政官只读物品</h3><span>{props.viewModel.postmaster.items.length} 件 · 只读</span></div>
            <p className="status-message status-warning">邮政官区域只展示当前可读取物品；取回操作会明确选择目标角色，不在列表中自动执行。</p>
            <div className="account-item-list">
              {props.viewModel.postmaster.items.map((item) => renderAccountItemButton(item, "inventory", { onOpenItem: props.actions.openItem, copy: props.copy }))}
            </div>
          </section>
        ) : null}
      </ProductWorkspaceContentStack>
      </ProductWorkspaceSplit>
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
