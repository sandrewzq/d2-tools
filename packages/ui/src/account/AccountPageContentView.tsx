import { useRef, useState, type KeyboardEvent } from "react";
import type {
  AccountItemView,
  AccountOpenItemPayload,
  AccountPageViewModel,
  AccountSlotComparisonViewRow
} from "@d2-tools/app/account";
import { getLocaleCopy } from "../i18n/copy.js";
import type { AccountCopy, InterfaceLocale } from "../i18n/types.js";
import { formatCompactDateTime } from "../time/formatTime.js";
import {
  ProductWorkspaceContentStack,
  ProductWorkspaceEmptyState,
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
const accountCategoryOrder: AccountSlotComparisonViewRow["category"][] = ["weapons", "armor", "equipment", "other"];
const accountCategoryLabels: Record<AccountSlotComparisonViewRow["category"], string> = {
  weapons: "武器",
  armor: "护甲",
  equipment: "装备类别",
  other: "其他"
};

export function AccountPageContentView(props: AccountPageContentViewProps) {
  const interfaceLocale = props.interfaceLocale ?? "zh-CN";
  const copy = getLocaleCopy(interfaceLocale).account;
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
    return <AccountUnavailableState actions={actions} copy={copy} viewModel={viewModel} />;
  }

  return <AccountPageWorkspace actions={actions} activityReview={activityReview} activitySummary={activitySummary} copy={copy} interfaceLocale={interfaceLocale} section={section} selectedCharacter={selectedCharacter} setSection={setSection} viewModel={viewModel} writeWarning={writeWarning} />;
}

function AccountUnavailableState(props: {
  actions: AccountPageActions;
  copy: AccountCopy;
  viewModel: AccountPageViewModel;
}) {
  const isLoading = props.viewModel.connection.isLoadingAccount;
  const isConfigured = props.viewModel.connection.isBungieConfigured;
  const isLoggedIn = props.viewModel.connection.isAccountLoggedIn;
  const title = isLoading
    ? accountText(props.copy, "正在读取账号")
    : isConfigured
      ? isLoggedIn
        ? accountText(props.copy, "账号快照尚未读取")
        : props.copy.loginMissingTitle
      : props.copy.configMissingTitle;

  return (
    <ProductWorkspaceEmptyState className="account-unavailable" uiKind="state-frame">
      <span className={`ui-badge ${isLoading ? "status-pending" : "status-warning"}`}>
        {isLoading ? props.copy.loadingAccount : props.copy.disconnectedBadge}
      </span>
      <h2>{title}</h2>
      <p>{isLoading ? accountText(props.copy, "正在读取当前 Profile 快照，完成后会保留角色和位置结构。") : props.copy.emptyBody}</p>
      {props.viewModel.feedback.accountError ? <p className="status-message status-error" role="alert">{props.viewModel.feedback.accountError}</p> : null}
      {props.viewModel.feedback.accountWarning ? <p className="status-message status-warning">{props.viewModel.feedback.accountWarning}</p> : null}
      <div className="button-row">
        {!isConfigured ? (
          <button type="button" data-ui-kind="button" data-control-variant="primary" onClick={props.actions.configureBungie}>{props.copy.configureBungie}</button>
        ) : !isLoggedIn ? (
          <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={isLoading} onClick={props.actions.loginBungie}>{props.copy.loginBungie}</button>
        ) : (
          <button type="button" data-ui-kind="button" data-control-variant="primary" aria-busy={isLoading} disabled={isLoading} onClick={props.actions.refreshAccount}>
            {isLoading ? props.copy.loadingAccount : props.copy.loadAccount}
          </button>
        )}
      </div>
    </ProductWorkspaceEmptyState>
  );
}

function AccountPageWorkspace(props: {
  actions: AccountPageActions;
  activityReview: NonNullable<AccountPageViewModel["activity"]["summary"]>["review"] | null;
  activitySummary: AccountPageViewModel["activity"]["summary"];
  copy: AccountCopy;
  interfaceLocale: InterfaceLocale;
  section: AccountSection;
  selectedCharacter: NonNullable<AccountPageViewModel["selectedCharacter"]>;
  setSection: (section: AccountSection) => void;
  viewModel: AccountPageViewModel;
  writeWarning: string;
}) {
  const profile = props.viewModel.profile!;
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const navigation: Array<{ key: AccountSection; label: string; count?: number }> = [
    { key: "gear", label: accountText(props.copy, "角色装备与背包") },
    { key: "activity", label: accountText(props.copy, "活动复盘") },
    { key: "materials", label: accountText(props.copy, "材料与消耗品"), count: props.viewModel.materials.rows.length },
    { key: "postmaster", label: accountText(props.copy, "邮政官"), count: props.viewModel.postmaster.items.length }
  ];

  function handleDirectoryKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    let nextIndex = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = (index + 1) % navigation.length;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = (index - 1 + navigation.length) % navigation.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = navigation.length - 1;
    else return;

    event.preventDefault();
    props.setSection(navigation[nextIndex].key);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <>
      {props.viewModel.feedback.accountError ? <p className="status-message status-error">{props.viewModel.feedback.accountError}</p> : null}
      {props.viewModel.feedback.accountWarning ? <p className="status-message status-warning">{props.viewModel.feedback.accountWarning}</p> : null}
      {props.viewModel.feedback.itemDetailError ? <p className="status-message status-error">{props.viewModel.feedback.itemDetailError}</p> : null}
      <ProductWorkspaceSplit className="account-workspace">
      <ProductWorkspaceSideRail element="aside" className="account-directory" ariaLabel={accountText(props.copy, "账号目录")} scrollRegion="pane" surface="list">
        <div className="account-column-head">
          <h3>账号目录</h3>
          <span>{profile.accountName}</span>
        </div>
        <div className="account-directory-tabs" role="tablist" aria-label={accountText(props.copy, "账号数据视图")}>
          {navigation.map((item, index) => (
            <button
              type="button"
              role="tab"
              id={`account-tab-${item.key}`}
              aria-controls={`account-panel-${item.key}`}
              aria-selected={props.section === item.key}
              tabIndex={props.section === item.key ? 0 : -1}
              className={props.section === item.key ? "active" : ""}
              key={item.key}
              ref={(element) => { tabRefs.current[index] = element; }}
              onClick={() => props.setSection(item.key)}
              onKeyDown={(event) => handleDirectoryKeyDown(event, index)}
            >
              <span>{item.label}</span>
              {item.count !== undefined ? <small>{item.count}</small> : null}
            </button>
          ))}
        </div>
      </ProductWorkspaceSideRail>
      <ProductWorkspaceContentStack className="account-content">
        <section className="account-summary" data-surface="section" aria-busy={props.viewModel.connection.isLoadingAccount}>
          <div className="account-band-heading">
            <div>
              <span>{profile.profileLine}</span>
              <h2>{profile.accountName}</h2>
              <p>{props.viewModel.characterTabs.length} 个角色 · {profile.inventoryLine}</p>
            </div>
            <span className={`ui-badge ${props.viewModel.connection.isLoadingAccount ? "status-pending" : "status-ready"}`}>
              {props.viewModel.connection.isLoadingAccount ? accountText(props.copy, "账号刷新中") : accountText(props.copy, "账号已读取")}
            </span>
          </div>
          <div className="account-character-switcher" role="group" aria-label={accountText(props.copy, "当前角色")}>
            {props.viewModel.characterTabs.map((tab) => (
              <button
                type="button"
                aria-pressed={tab.isSelected}
                className={tab.isSelected ? "active" : ""}
                key={tab.key}
                title={`${accountText(props.copy, "切换到")}${tab.className}`}
                onClick={() => props.actions.selectCharacter(tab.key)}
              >
                <b aria-hidden="true">{tab.className.slice(0, 1)}</b>
                <span><strong>{tab.className}</strong><small>{tab.lightLabel}</small></span>
              </button>
            ))}
          </div>
          <div className="account-actions">
            <button type="button" data-ui-kind="button" data-control-variant="primary" onClick={() => props.actions.saveCurrentLoadout(props.selectedCharacter.characterId)}>
              {props.copy.actions.saveCurrentLoadout}
            </button>
            <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!props.viewModel.feedback.writeActionsEnabled || props.viewModel.loadout.isRunningItemAction} onClick={() => props.actions.equipHighestPower(props.selectedCharacter.characterId)}>
              {props.viewModel.loadout.isRunningItemAction ? props.copy.actions.running : props.copy.actions.equipHighestPower}
            </button>
            <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.actions.openWriteSettings}>写操作设置</button>
          </div>
          {props.writeWarning ? <p className="status-message status-warning">{props.writeWarning}</p> : null}
          {props.viewModel.feedback.loadoutMessage ? <p className="status-message status-ready">{props.viewModel.feedback.loadoutMessage}</p> : null}
          {props.viewModel.feedback.itemActionMessage ? <p className={props.viewModel.feedback.itemActionMessage.includes("失败") ? "status-message status-error" : "status-message status-ready"}>{props.viewModel.feedback.itemActionMessage}</p> : null}
        </section>

        <section
          className={`account-section account-slot-comparison ${props.section === "gear" ? "active" : ""}`}
          id="account-panel-gear"
          role="tabpanel"
          aria-labelledby="account-tab-gear"
          aria-busy={props.viewModel.connection.isLoadingAccount}
          hidden={props.section !== "gear"}
        >
            <div className="account-column-head"><h3>{props.selectedCharacter.className}当前装备与背包</h3><span>装备 {props.viewModel.loadout.equippedCount} 件 · 背包候选 {props.viewModel.loadout.inventoryCount} 件 · 按位置对照</span></div>
            <AccountSlotComparison
              isRefreshing={props.viewModel.connection.isLoadingAccount}
              rows={props.viewModel.loadout.slotComparisonRows}
              onOpenItem={props.actions.openItem}
              copy={props.copy}
            />
        </section>

        <section
          className={`account-section ${props.section === "activity" ? "active" : ""}`}
          id="account-panel-activity"
          role="tabpanel"
          aria-labelledby="account-tab-activity"
          hidden={props.section !== "activity"}
        >
            <div className="account-toolbar"><div><strong>活动复盘</strong><span>来源：Activity History</span></div><button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.actions.refreshActivity}>刷新活动记录</button></div>
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
                {props.activitySummary.recent_items.length ? (
                  <div className="account-table-list">
                    {props.activitySummary.recent_items.slice(0, 10).map((item, index) => (
                      <div key={`${item.period}-${item.activity_name}`}>
                        <strong>{formatActivityMode(item.mode, props.copy)} · {item.activity_name}</strong>
                        <span>{props.activityReview?.recent_10[index]?.status_label ?? (item.completed ? "完成" : "未完成")}</span>
                        <small>{formatCompactDateTime(item.period, new Date(), item.period)}</small>
                      </div>
                    ))}
                  </div>
                ) : <AccountInlineState title={accountText(props.copy, "暂无最近活动记录")} detail={accountText(props.copy, "Activity History 当前没有返回可展示的近期场次。")} />}
              </>
            ) : <AccountInlineState title={accountText(props.copy, "当前快照未包含活动记录")} detail={accountText(props.copy, "读取 Activity History 后会在这里显示真实的近期复盘。")} />}
        </section>

        <section
          className={`account-section ${props.section === "materials" ? "active" : ""}`}
          id="account-panel-materials"
          role="tabpanel"
          aria-labelledby="account-tab-materials"
          hidden={props.section !== "materials"}
        >
            <div className="account-column-head"><h3>材料与消耗品</h3><span>{props.viewModel.materials.rows.length} 种</span></div>
            {props.viewModel.materials.rows.length ? (
              <div className="account-table-list account-material-list">
                {props.viewModel.materials.rows.map((row) => (
                  <div key={row.key}>
                    {row.material.icon ? <img src={row.material.icon} alt="" loading="lazy" /> : <span className="item-icon-placeholder" aria-hidden="true" />}
                    <strong>{row.material.name}</strong>
                    <span>{row.material.quantity.toLocaleString(props.interfaceLocale)}</span>
                    <small>{row.meta}</small>
                  </div>
                ))}
              </div>
            ) : <AccountInlineState title={accountText(props.copy, "没有材料数据")} detail={accountText(props.copy, "当前账号快照未返回材料与消耗品。")} />}
        </section>

        <section
          className={`account-section ${props.section === "postmaster" ? "active" : ""}`}
          id="account-panel-postmaster"
          role="tabpanel"
          aria-labelledby="account-tab-postmaster"
          hidden={props.section !== "postmaster"}
        >
            <div className="account-column-head"><h3>邮政官只读物品</h3><span>{props.viewModel.postmaster.items.length} 件 · 只读</span></div>
            <div className="account-section-notice status-message status-warning">邮政官区域只展示当前可读取物品；取回操作会明确选择目标角色，不在列表中自动执行。</div>
            {props.viewModel.postmaster.items.length ? (
              <div className="account-item-list">
                {props.viewModel.postmaster.items.map((item) => renderAccountItemButton(item, "inventory", { onOpenItem: props.actions.openItem, copy: props.copy }))}
              </div>
            ) : <AccountInlineState title={accountText(props.copy, "邮政官为空")} detail={accountText(props.copy, "当前角色的账号快照没有邮政官物品。")} />}
        </section>
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

function AccountSlotComparison(props: {
  isRefreshing: boolean;
  rows: AccountSlotComparisonViewRow[];
  onOpenItem: (payload: AccountOpenItemPayload) => void;
  copy: AccountCopy;
}) {
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());
  const categories = accountCategoryOrder
    .map((category) => ({
      key: category,
      label: accountText(props.copy, accountCategoryLabels[category]),
      rows: props.rows.filter((row) => row.category === category)
    }))
    .filter((category) => category.rows.length > 0);

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

  if (!categories.length) {
    return <AccountInlineState title={accountText(props.copy, "当前角色没有装备位置数据")} detail={accountText(props.copy, "当前 Profile 快照未返回可按位置展示的装备或背包物品。")} />;
  }

  return (
    <div className="account-slot-comparison-list">
      {categories.map((category) => (
        <section className="account-slot-category" data-surface="section" key={category.key}>
          <header className="account-slot-category-head">
            <strong>{category.label}</strong>
            <span>{category.rows.length} 个位置 · {category.rows.reduce((count, row) => count + row.equippedItems.length + row.inventoryItems.length, 0)} 件</span>
          </header>
          {category.rows.map((row) => (
            <article className="account-slot-row" data-surface="row" key={row.key}>
              <div className="account-slot-heading">
                <strong>{row.label}</strong>
                <span>{accountText(props.copy, "装备")} {row.equippedItems.length} / {accountText(props.copy, "背包")} {row.inventoryItems.length}</span>
              </div>
              <div className="account-slot-columns">
                <section className="account-slot-column account-equipped-panel">
                  <h5>{accountText(props.copy, "当前角色装备")}</h5>
                  {props.isRefreshing ? <AccountSlotSkeleton /> : renderAccountItemGrid(row.equippedItems, "equipped", {
                    isExpanded: true,
                    onOpenItem: props.onOpenItem,
                    copy: props.copy
                  })}
                </section>
                <section className="account-slot-column account-inventory-panel">
                  <h5>{accountText(props.copy, "当前角色背包候选")}</h5>
                  {props.isRefreshing ? <AccountSlotSkeleton /> : renderAccountItemGrid(row.inventoryItems, "inventory", {
                    isExpanded: isExpanded(row.key, "inventory"),
                    onExpand: () => expandSlot(row.key, "inventory"),
                    onOpenItem: props.onOpenItem,
                    copy: props.copy
                  })}
                </section>
              </div>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}

function AccountSlotSkeleton() {
  return (
    <div className="account-slot-skeleton" aria-hidden="true">
      <span />
      <div><i /><i /><i /></div>
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
    const emptyLabel = source === "equipped"
      ? accountText(props.copy, "当前角色装备暂无")
      : accountText(props.copy, "当前角色背包候选暂无");
    return <div className="account-slot-empty" data-surface="frame" data-ui-kind="state-frame" data-status="neutral"><span>{emptyLabel}</span></div>;
  }

  const shouldLimitItems = source === "inventory" && !props.isExpanded && items.length > ACCOUNT_SLOT_PREVIEW_LIMIT;
  const visibleItems = shouldLimitItems ? items.slice(0, ACCOUNT_SLOT_PREVIEW_LIMIT) : items;
  const hiddenItemCount = items.length - visibleItems.length;

  return (
    <div className="account-slot-item-grid">
      {visibleItems.map((item) => renderAccountItemButton(item, source, {
        onOpenItem: props.onOpenItem,
        copy: props.copy
      }))}
      {hiddenItemCount > 0 ? (
        <button type="button" className="account-slot-show-more" data-ui-kind="button" data-control-variant="secondary" onClick={props.onExpand}>
          <strong>{accountText(props.copy, "显示全部")} {items.length} {accountText(props.copy, "件")}</strong>
          <span>{accountText(props.copy, "还有")} {hiddenItemCount} {accountText(props.copy, "件未展开的背包候选")}</span>
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
        "account-slot-item",
        source === "equipped" ? "equipped" : "inventory",
        item.isPending ? "pending" : "",
        item.isLoadoutMatch ? "loadout-highlight" : ""
      ].filter(Boolean).join(" ")}
      key={item.key}
      aria-busy={item.isPending}
      aria-label={`${accountText(props.copy, "查看")}${item.name}${accountText(props.copy, "详情")}`}
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
      ) : <span className="item-icon-placeholder" aria-hidden="true" />}
      <span className="account-slot-item-copy">
        <strong>{item.name}</strong>
        <span>{source === "equipped" ? accountText(props.copy, "当前角色装备") : accountText(props.copy, "当前角色背包候选")}</span>
        <small>{item.meta || accountText(props.copy, "实例摘要待补齐")}</small>
        {item.isLoadoutMatch ? <em data-status="success">{accountText(props.copy, "配装引用")}</em> : null}
        {item.isPending ? <em data-status="pending">{accountText(props.copy, "正在打开详情")}</em> : null}
      </span>
    </button>
  );
}

function AccountInlineState(props: { title: string; detail: string }) {
  return (
    <div className="account-inline-state" data-surface="frame" data-ui-kind="state-frame" data-status="neutral">
      <strong>{props.title}</strong>
      <span>{props.detail}</span>
    </div>
  );
}
