import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import type {
  AccountItemView,
  AccountOpenItemPayload,
  AccountPageViewModel,
  CharacterPowerView,
  CharacterPowerValueView,
  AccountReadonlyGroupView,
  AccountReadonlyItemView,
  AccountSlotComparisonViewRow
} from "@d2-tools/app/account";
import { getLocaleCopy } from "../i18n/copy.js";
import type { AccountCopy, InterfaceLocale } from "../i18n/types.js";
import { GameAssetImage } from "../media/GameAssetImage.js";
import { formatClockTime, formatCompactDateTime } from "../time/formatTime.js";
import {
  ProductWorkspaceContentStack,
  ProductWorkspaceEmptyState,
  ProductWorkspaceSideRail,
  ProductWorkspaceSplit
} from "../workspace/ProductWorkspace.js";

type AccountItemSource = "equipped" | "inventory";

export type AccountPageActions = {
  configureBungie: () => void;
  loginBungie: () => void;
  refreshAccount: () => void;
  refreshActivity: () => void;
  selectCharacter: (characterId: string) => void;
  equipHighestPower?: (characterId: string) => void;
  openItem: (payload: AccountOpenItemPayload) => void;
};

export type AccountPageContentViewProps = {
  interfaceLocale?: InterfaceLocale;
  viewModel: AccountPageViewModel;
  actions: AccountPageActions;
};

type AccountSection = "gear" | "configuration" | "tasks" | "items" | "postmaster" | "activity";
const accountCategoryOrder: AccountSlotComparisonViewRow["category"][] = ["weapons", "armor"];
const accountCategoryLabels: Record<AccountSlotComparisonViewRow["category"], string> = {
  weapons: "武器",
  armor: "护甲",
  equipment: "装备类别",
  other: "其他"
};

function visibleAccountSlotRows(rows: AccountSlotComparisonViewRow[]): AccountSlotComparisonViewRow[] {
  return rows.filter((row) => {
    if (row.category !== "other") return true;
    if (/记忆水晶|engram/i.test(row.label)) return true;
    return [...row.equippedItems, ...row.inventoryItems].some((item) => /记忆水晶|engram/i.test(item.name));
  });
}

export function AccountPageContentView(props: AccountPageContentViewProps) {
  const interfaceLocale = props.interfaceLocale ?? "zh-CN";
  const copy = getLocaleCopy(interfaceLocale).account;
  const { actions, viewModel } = props;
  const selectedCharacter = viewModel.selectedCharacter;
  const profile = viewModel.profile;
  const activitySummary = viewModel.activity.summary;
  const activityReview = activitySummary ? activitySummary.review : null;
  const [section, setSection] = useState<AccountSection>("gear");

  if (!profile || !selectedCharacter) {
    return <AccountUnavailableState actions={actions} copy={copy} viewModel={viewModel} />;
  }

  return <AccountPageWorkspace actions={actions} activityReview={activityReview} activitySummary={activitySummary} copy={copy} interfaceLocale={interfaceLocale} section={section} selectedCharacter={selectedCharacter} setSection={setSection} viewModel={viewModel} />;
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
    <ProductWorkspaceEmptyState className="account-unavailable product-workspace-empty--page" uiKind="state-frame">
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
}) {
  const profile = props.viewModel.profile!;
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const characterRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const powerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const powerPanelRef = useRef<HTMLElement | null>(null);
  const [isPowerPanelOpen, setIsPowerPanelOpen] = useState(false);
  const [powerMode, setPowerMode] = useState<"equippable" | "slots">("equippable");
  const displayedSlotRows = visibleAccountSlotRows(props.viewModel.loadout.slotComparisonRows);
  const displayedInventoryCount = displayedSlotRows.reduce((count, row) => count + row.inventoryItems.length, 0);
  const navigation: Array<{ key: AccountSection; label: string; count?: number }> = [
    { key: "gear", label: accountText(props.copy, "角色装备与背包") },
    { key: "configuration", label: accountText(props.copy, "角色配置") },
    { key: "tasks", label: accountText(props.copy, "任务与进度"), count: props.viewModel.tasks.itemCount },
    { key: "items", label: accountText(props.copy, "物品与货币"), count: props.viewModel.items.itemCount },
    { key: "postmaster", label: accountText(props.copy, "邮政官"), count: props.viewModel.postmaster.items.length },
    { key: "activity", label: accountText(props.copy, "活动记录") }
  ];

  useEffect(() => {
    if (!isPowerPanelOpen) return;

    function handlePointerDown(event: PointerEvent): void {
      if (!(event.target instanceof Node)) return;
      if (powerTriggerRef.current?.contains(event.target) || powerPanelRef.current?.contains(event.target)) return;
      setIsPowerPanelOpen(false);
    }

    function handleKeyDown(event: globalThis.KeyboardEvent): void {
      if (event.key !== "Escape") return;
      setIsPowerPanelOpen(false);
      powerTriggerRef.current?.focus();
    }

    function handleFocusIn(event: FocusEvent): void {
      if (!(event.target instanceof Node)) return;
      if (powerTriggerRef.current?.contains(event.target) || powerPanelRef.current?.contains(event.target)) return;
      setIsPowerPanelOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    const selectedModeTab = powerPanelRef.current?.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]');
    selectedModeTab?.focus();
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [isPowerPanelOpen]);

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

  function handleCharacterKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    let nextIndex = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % props.viewModel.characterTabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + props.viewModel.characterTabs.length) % props.viewModel.characterTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = props.viewModel.characterTabs.length - 1;
    else return;

    event.preventDefault();
    const nextCharacter = props.viewModel.characterTabs[nextIndex];
    props.actions.selectCharacter(nextCharacter.key);
    setIsPowerPanelOpen(false);
    characterRefs.current[nextIndex]?.focus();
  }

  const connectionState = props.viewModel.connection.dataState;
  const connectionLabel = connectionState === "refreshing"
    ? accountText(props.copy, "刷新中")
    : connectionState === "cached"
      ? accountText(props.copy, "缓存数据")
      : accountText(props.copy, "已同步");
  const connectionStatus = connectionState === "refreshing" ? "pending" : connectionState === "cached" ? "warning" : "success";
  const operationFeedback = props.viewModel.feedback.operation;

  return (
    <>
      {props.viewModel.feedback.accountError ? <p className="status-message status-error">{props.viewModel.feedback.accountError}</p> : null}
      {props.viewModel.feedback.accountWarning ? <p className="status-message status-warning">{props.viewModel.feedback.accountWarning}</p> : null}
      {props.viewModel.feedback.itemDetailError ? <p className="status-message status-error">{props.viewModel.feedback.itemDetailError}</p> : null}
      <ProductWorkspaceSplit className="account-workspace">
      <ProductWorkspaceSideRail element="aside" className="account-directory" ariaLabel={accountText(props.copy, "账号目录")} scrollRegion="pane" surface="list">
        <div className="account-column-head">
          <h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">账号目录</h3>
          <span data-ui-part="detail" data-info-priority="trace" data-text-tone="meta">{profile.accountName}</span>
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
              <h2 data-ui-part="value" data-info-priority="display" data-text-tone="primary">{profile.accountName}</h2>
              <p data-ui-part="detail" data-info-priority="reading" data-text-tone="body">
                {props.viewModel.characterTabs.length} 个角色 · {profile.inventoryLine}
                {profile.snapshotAt ? ` · ${accountText(props.copy, "更新于")} ${formatClockTime(profile.snapshotAt)}` : ""}
              </p>
            </div>
            <span
              className={`ui-badge status-${connectionStatus === "success" ? "ready" : connectionStatus}`}
              data-ui-kind="status-chip"
              data-ui-part="state"
              data-info-priority="support"
              data-text-tone="status"
              data-status={connectionStatus}
            >
              {connectionLabel}
            </span>
          </div>
          <div className="account-character-switcher" data-ui-kind="context-switcher" role="group" aria-label={accountText(props.copy, "当前角色")}>
            {props.viewModel.characterTabs.map((tab, index) => (
              <button
                type="button"
                aria-pressed={tab.isSelected}
                tabIndex={tab.isSelected ? 0 : -1}
                key={tab.key}
                ref={(element) => { characterRefs.current[index] = element; }}
                title={`${accountText(props.copy, "切换到")}${tab.className}`}
                onClick={() => {
                  props.actions.selectCharacter(tab.key);
                  setIsPowerPanelOpen(false);
                }}
                onKeyDown={(event) => handleCharacterKeyDown(event, index)}
              >
                <GameAssetImage
                  className="account-character-emblem"
                  src={tab.emblemUrl}
                  alt=""
                  loading="eager"
                  fallback={<b aria-hidden="true">{tab.className.slice(0, 1)}</b>}
                />
                <span>
                  <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{tab.className}</strong>
                  <small data-ui-part="detail" data-info-priority="support" data-text-tone="body">
                    {accountText(props.copy, "当前")} {tab.power.currentLabel} · {accountText(props.copy, "最高")} {tab.power.slotMaximum.label}
                  </small>
                </span>
              </button>
            ))}
          </div>
          <div className="account-actions">
            <button
              type="button"
              ref={powerTriggerRef}
              className="account-power-trigger"
              data-ui-kind="button"
              data-control-variant="quiet"
              aria-expanded={isPowerPanelOpen}
              aria-controls="account-power-panel"
              onClick={() => setIsPowerPanelOpen((current) => !current)}
            >
              <span>{accountText(props.copy, "最高可装备")}</span>
              <PowerFractionValue value={props.selectedCharacter.power.maxEquippable} />
            </button>
            {props.actions.equipHighestPower ? <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.viewModel.loadout.isRunningItemAction} onClick={() => props.actions.equipHighestPower?.(props.selectedCharacter.characterId)}>
              {props.viewModel.loadout.isRunningItemAction ? props.copy.actions.running : props.copy.actions.equipHighestPower}
            </button> : null}
          </div>
          {isPowerPanelOpen ? (
            <AccountPowerPanel
              copy={props.copy}
              id="account-power-panel"
              mode={powerMode}
              onModeChange={setPowerMode}
              panelRef={powerPanelRef}
              power={props.selectedCharacter.power}
            />
          ) : null}
          {operationFeedback ? (
            <p className={`status-message status-${operationFeedback.tone === "success" ? "ready" : operationFeedback.tone}`} role={operationFeedback.tone === "error" ? "alert" : "status"}>{operationFeedback.message}</p>
          ) : props.viewModel.feedback.itemActionMessage ? (
            <p className="status-message status-pending" role="status">{props.viewModel.feedback.itemActionMessage}</p>
          ) : props.viewModel.feedback.loadoutMessage ? (
            <p className="status-message" role="status">{props.viewModel.feedback.loadoutMessage}</p>
          ) : null}
        </section>

        <section
          className={`account-section account-slot-comparison ${props.section === "gear" ? "active" : ""}`}
          id="account-panel-gear"
          role="tabpanel"
          aria-labelledby="account-tab-gear"
          aria-busy={props.viewModel.connection.isLoadingAccount}
          hidden={props.section !== "gear"}
        >
            <div className="account-column-head">
              <h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">{props.selectedCharacter.className}当前装备与背包</h3>
              <span data-ui-part="detail" data-info-priority="support" data-text-tone="body">
                装备 {props.viewModel.loadout.equippedCount} 件 · 背包候选 {displayedInventoryCount} 件
                {props.viewModel.loadout.activeTemplateName ? ` · ${accountText(props.copy, "关联配装")} ${props.viewModel.loadout.activeTemplateName} · ${accountText(props.copy, "命中")} ${props.viewModel.loadout.selectedCharacterLoadoutMatchCount}` : ""}
              </span>
            </div>
            <AccountSlotComparison
              rows={displayedSlotRows}
              onOpenItem={props.actions.openItem}
              copy={props.copy}
            />
        </section>

        <section
          className={`account-section ${props.section === "configuration" ? "active" : ""}`}
          id="account-panel-configuration"
          role="tabpanel"
          aria-labelledby="account-tab-configuration"
          hidden={props.section !== "configuration"}
        >
          <AccountConfigurationPanel viewModel={props.viewModel} />
        </section>

        <section
          className={`account-section ${props.section === "tasks" ? "active" : ""}`}
          id="account-panel-tasks"
          role="tabpanel"
          aria-labelledby="account-tab-tasks"
          hidden={props.section !== "tasks"}
        >
          <div className="account-column-head">
            <h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">{props.selectedCharacter.className}任务与进度</h3>
            <span data-ui-part="detail" data-info-priority="support" data-text-tone="body">{props.viewModel.tasks.itemCount} 项 · 与战斗装备分开</span>
          </div>
          <AccountStatusMatrix entries={[
            { label: "任务与步骤", value: props.viewModel.tasks.questCount },
            { label: "命令与赏金", value: props.viewModel.tasks.orderCount },
            { label: "神器与赛季", value: props.viewModel.tasks.seasonalCount }
          ]} />
          <AccountDataGroups groups={props.viewModel.tasks.groups} />
        </section>

        <section
          className={`account-section ${props.section === "items" ? "active" : ""}`}
          id="account-panel-items"
          role="tabpanel"
          aria-labelledby="account-tab-items"
          hidden={props.section !== "items"}
        >
          <div className="account-column-head">
            <h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">{props.selectedCharacter.className}物品与货币</h3>
            <span data-ui-part="detail" data-info-priority="support" data-text-tone="body">角色携带与账号级数量分开</span>
          </div>
          <AccountStatusMatrix entries={[
            { label: "角色携带", value: props.viewModel.items.carriedCount },
            { label: "材料与货币", value: props.viewModel.items.materialCount },
            { label: "外观与可选配置", value: props.viewModel.items.collectionCount },
            { label: "未分类数据", value: props.viewModel.items.unknownCount, status: props.viewModel.items.unknownCount ? "warning" : "success" }
          ]} />
          <AccountDataGroups groups={props.viewModel.items.groups} />
          <AccountMaterialsGroup interfaceLocale={props.interfaceLocale} viewModel={props.viewModel} copy={props.copy} />
        </section>

        <section
          className={`account-section ${props.section === "postmaster" ? "active" : ""}`}
          id="account-panel-postmaster"
          role="tabpanel"
          aria-labelledby="account-tab-postmaster"
          hidden={props.section !== "postmaster"}
        >
            <div className="account-column-head"><h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">邮政官只读物品</h3><span data-ui-part="detail" data-info-priority="support" data-text-tone="body">{props.viewModel.postmaster.items.length} 件 · 只读</span></div>
            <div className="account-section-notice status-message status-warning">邮政官区域只展示当前可读取物品；取回操作会明确选择目标角色，不在列表中自动执行。</div>
            {props.viewModel.postmaster.items.length ? (
              <div className="account-item-list">
                {props.viewModel.postmaster.items.map((item) => renderAccountItemCard(item, "inventory", { onOpenItem: props.actions.openItem, copy: props.copy }))}
              </div>
            ) : <AccountInlineState title={accountText(props.copy, "邮政官为空")} detail={accountText(props.copy, "当前角色的账号快照没有邮政官物品。")} />}
        </section>

        <section
          className={`account-section ${props.section === "activity" ? "active" : ""}`}
          id="account-panel-activity"
          role="tabpanel"
          aria-labelledby="account-tab-activity"
          hidden={props.section !== "activity"}
        >
            <div className="account-toolbar"><div><strong>活动记录</strong><span>来源：Activity History</span></div><button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.actions.refreshActivity}>刷新活动记录</button></div>
            {props.viewModel.activity.error ? <p className="status-message status-error">{props.viewModel.activity.error}</p> : null}
            {props.viewModel.activity.message ? <p className="status-message status-ready">{props.viewModel.activity.message}</p> : null}
            {props.activitySummary ? (
              <>
                <div className="account-activity-grid">
                  <article><span>PVE 完成情况</span><strong>{props.activitySummary.recent.pve.completed} 场</strong><p>最近记录中的 PVE 完成情况</p></article>
                  <article><span>PVP 完成情况</span><strong>{props.activitySummary.recent.pvp.completed} 场</strong><p>最近记录中的 PVP 完成情况</p></article>
                  <article><span>突袭 / 地牢</span><strong>{props.activitySummary.raids.entries.filter((entry) => entry.activity_type === "raid").length} / {props.activitySummary.raids.entries.filter((entry) => entry.activity_type === "dungeon").length}</strong><p>当前可读取的完成记录</p></article>
                </div>
                <div className="account-column-head"><h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">最近 10 场</h3><span data-ui-part="detail" data-info-priority="support" data-text-tone="body">Activity History</span></div>
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
      </ProductWorkspaceContentStack>
      </ProductWorkspaceSplit>
    </>
  );
}

function AccountConfigurationPanel(props: { viewModel: AccountPageViewModel }) {
  const { primaryItems, extraItems } = props.viewModel.configuration;
  return (
    <section className="account-character-config" data-surface="section">
      <header className="account-section-heading">
        <div>
          <span data-ui-part="label" data-info-priority="support" data-text-tone="meta">角色配置</span>
          <h4 data-ui-part="value" data-info-priority="decision" data-text-tone="primary">当前选择</h4>
        </div>
        <span data-ui-part="detail" data-info-priority="support" data-text-tone="body">这些项目不是装备详情入口</span>
      </header>
      {primaryItems.length ? (
        <div className="account-config-grid">
          {primaryItems.map((item) => <AccountConfigItem item={item} key={item.key} />)}
        </div>
      ) : <AccountInlineState title="没有角色配置数据" detail="当前 Profile 未返回职业分支、机灵或外观配置。" />}
      {extraItems.length ? (
        <details className="account-config-more">
          <summary>
            <span>
              <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">更多配置</strong>
              <small data-ui-part="detail" data-info-priority="support" data-text-tone="body">公会战旗、终结技与动作</small>
            </span>
            <b>{extraItems.length} 项</b>
          </summary>
          <div className="account-config-grid">
            {extraItems.map((item) => <AccountConfigItem item={item} key={item.key} />)}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function AccountConfigItem(props: { item: AccountReadonlyItemView }) {
  return (
    <div className="account-config-item" data-ui-kind="object-card" data-interactive="false">
      <AccountReadonlyIcon item={props.item} />
      <span>
        <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{props.item.name}</strong>
        <span data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{props.item.typeLabel}</span>
        <small data-ui-part="source" data-info-priority="trace" data-text-tone="meta">{props.item.sourceLabel} · 只读</small>
      </span>
    </div>
  );
}

function AccountStatusMatrix(props: {
  entries: Array<{ label: string; value: number; status?: "success" | "warning" }>;
}) {
  return (
    <div className="account-status-matrix" data-surface="frame" data-ui-kind="status-matrix">
      {props.entries.map((entry) => (
        <div data-status={entry.status} key={entry.label}>
          <span data-ui-part="label" data-info-priority="support" data-text-tone="meta">{entry.label}</span>
          <strong data-ui-part="value" data-info-priority="decision" data-text-tone="primary">{entry.value}</strong>
        </div>
      ))}
    </div>
  );
}

function AccountDataGroups(props: { groups: AccountReadonlyGroupView[] }) {
  return (
    <div className="account-data-groups">
      {props.groups.map((group) => <AccountDataGroup group={group} key={group.key} />)}
    </div>
  );
}

function AccountDataGroup(props: { group: AccountReadonlyGroupView }) {
  return (
    <details className="account-data-group" data-status={props.group.status}>
      <summary>
        <span>
          <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{props.group.label}</strong>
          <small data-ui-part="detail" data-info-priority="support" data-text-tone="body">{props.group.description}</small>
        </span>
        <b>{props.group.items.length} 项</b>
      </summary>
      <div className="account-readonly-list">
        {props.group.items.length
          ? props.group.items.map((item) => <AccountReadonlyRow item={item} key={item.key} />)
          : <AccountInlineState title="当前没有数据" detail="不会生成示例条目。" />}
      </div>
    </details>
  );
}

function AccountReadonlyRow(props: { item: AccountReadonlyItemView }) {
  return (
    <div className="account-readonly-row" data-surface="row" data-interactive="false">
      <AccountReadonlyIcon item={props.item} />
      <span>
        <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{props.item.name}</strong>
        <small data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{props.item.typeLabel} · {props.item.sourceLabel}</small>
      </span>
      <em data-ui-part="state" data-info-priority="support" data-text-tone="meta">只读</em>
    </div>
  );
}

function AccountReadonlyIcon(props: { item: AccountReadonlyItemView }) {
  return <GameAssetImage src={props.item.icon} alt="" fallback={<span className="item-icon-placeholder" aria-hidden="true" />} />;
}

function AccountMaterialsGroup(props: {
  interfaceLocale: InterfaceLocale;
  viewModel: AccountPageViewModel;
  copy: AccountCopy;
}) {
  const rows = props.viewModel.materials.rows;
  return (
    <details className="account-data-group account-material-group">
      <summary>
        <span>
          <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">账号材料与货币</strong>
          <small data-ui-part="detail" data-info-priority="support" data-text-tone="body">账号级数量，不属于角色装备</small>
        </span>
        <b>{rows.length} 种</b>
      </summary>
      {rows.length ? (
        <div className="account-table-list account-material-list">
          {rows.map((row) => (
            <div key={row.key}>
              <GameAssetImage src={row.material.icon} alt="" fallback={<span className="item-icon-placeholder" aria-hidden="true" />} />
              <strong>{row.material.name}</strong>
              <span>{row.material.quantity.toLocaleString(props.interfaceLocale)}</span>
              <small>{row.meta}</small>
            </div>
          ))}
        </div>
      ) : <AccountInlineState title={accountText(props.copy, "没有材料数据")} detail={accountText(props.copy, "当前账号快照未返回材料与消耗品。")} />}
    </details>
  );
}

function AccountPowerPanel(props: {
  copy: AccountCopy;
  id: string;
  mode: "equippable" | "slots";
  onModeChange: (mode: "equippable" | "slots") => void;
  panelRef: RefObject<HTMLElement | null>;
  power: CharacterPowerView;
}) {
  const modeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const value = props.mode === "equippable" ? props.power.maxEquippable : props.power.slotMaximum;
  function handleModeKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? (index - 1 + 2) % 2
          : (index + 1) % 2;
    const nextMode = nextIndex === 0 ? "equippable" : "slots";
    props.onModeChange(nextMode);
    modeRefs.current[nextIndex]?.focus();
  }
  return (
    <section ref={props.panelRef} className="account-power-panel" id={props.id} data-surface="summary-frame" aria-label={accountText(props.copy, "光等详情")}>
      <div className="account-power-panel-head">
        <strong>{props.mode === "equippable" ? accountText(props.copy, "可同时装备最高光等") : accountText(props.copy, "八槽最高光等")}</strong>
        <PowerFractionValue value={value} />
      </div>
      <div className="account-power-mode" role="tablist" aria-label={accountText(props.copy, "光等计算方式")}>
        <button ref={(element) => { modeRefs.current[0] = element; }} type="button" role="tab" id={`${props.id}-tab-equippable`} aria-controls={`${props.id}-content`} aria-selected={props.mode === "equippable"} tabIndex={props.mode === "equippable" ? 0 : -1} onClick={() => props.onModeChange("equippable")} onKeyDown={(event) => handleModeKeyDown(event, 0)}>{accountText(props.copy, "可装备最高")}</button>
        <button ref={(element) => { modeRefs.current[1] = element; }} type="button" role="tab" id={`${props.id}-tab-slots`} aria-controls={`${props.id}-content`} aria-selected={props.mode === "slots"} tabIndex={props.mode === "slots" ? 0 : -1} onClick={() => props.onModeChange("slots")} onKeyDown={(event) => handleModeKeyDown(event, 1)}>{accountText(props.copy, "八槽最高")}</button>
      </div>
      <div className="account-power-rows" id={`${props.id}-content`} role="tabpanel" aria-labelledby={`${props.id}-tab-${props.mode}`}>
        <div className="account-power-row account-power-column-head" aria-hidden="true">
          <span>{accountText(props.copy, "位置")}</span>
          <span>{accountText(props.copy, "装备与来源")}</span>
          <span>{accountText(props.copy, "光等")}</span>
          <span>{accountText(props.copy, "相对")}</span>
        </div>
        {value.rows.map((row, index) => (
          <div className={`account-power-row ${index === 3 ? "armor-start" : ""}`} key={row.key}>
            <span className="account-power-slot">{accountText(props.copy, row.label)}</span>
            <span className="account-power-item">
              <GameAssetImage src={row.itemIcon} alt="" loading="eager" fallback={<span aria-hidden="true">◇</span>} />
              <span>
                <strong title={row.itemName}>{row.itemName ?? accountText(props.copy, "未找到可用装备")}</strong>
                <small>{formatPowerSource(row, props.copy)}{row.isExotic ? ` · ${accountText(props.copy, "异域")}` : ""}</small>
              </span>
            </span>
            <strong className="account-power-item-value">{row.power ?? "—"}</strong>
            <span className={`account-power-delta ${(row.delta ?? 0) > 0 ? "positive" : (row.delta ?? 0) < 0 ? "negative" : "neutral"}`}>
              {typeof row.delta === "number" ? `${row.delta > 0 ? "+" : ""}${row.delta}` : "—"}
            </span>
          </div>
        ))}
      </div>
      <div className="account-power-footer">
        <span>{accountText(props.copy, "Bungie 当前光等")} <strong>{props.power.currentLabel}</strong></span>
        <span>{accountText(props.copy, "当前可一键装备")} <PowerFractionValue value={props.power.executablePower} /></span>
      </div>
      <p className={props.mode === "slots" || props.power.executableMatchesAccountMaximum ? "account-power-note" : "account-power-note warning"}>
        {props.mode === "slots"
          ? accountText(props.copy, "八槽最高按所选职业每个槽位的最高值计算，不要求这些装备能同时穿上，用于查看光等提升进度。")
          : !props.power.maxEquippable.complete || !props.power.executablePower.complete
            ? accountText(props.copy, "缺少至少一个光等槽位，当前无法得出完整的八槽结果。")
            : props.power.executableMatchesAccountMaximum
              ? accountText(props.copy, "当前一键装备可达到账号最高光等。")
              : props.power.hasExternalSources
                ? accountText(props.copy, "账号最高组合包含其他角色持有的装备；当前一键装备只使用本角色与仓库。")
                : accountText(props.copy, "当前一键装备范围与账号最高光等不同，请先刷新账号后复核。")}
      </p>
    </section>
  );
}

function PowerFractionValue(props: { value: CharacterPowerValueView }) {
  if (!props.value.complete || typeof props.value.whole !== "number") {
    return <span className="account-power-fraction incomplete">{props.value.label}</span>;
  }
  return (
    <span className="account-power-fraction" aria-label={props.value.label}>
      <span>{props.value.whole}</span>
      {props.value.remainder ? (
        <span className="account-power-fraction-part" aria-hidden="true">
          <sup>{props.value.remainder}</sup><span>⁄</span><sub>{props.value.denominator}</sub>
        </span>
      ) : null}
    </span>
  );
}

function formatPowerSource(
  row: CharacterPowerValueView["rows"][number],
  copy: AccountCopy
): string {
  if (!row.sourceKind) return accountText(copy, "数据不完整");
  if (row.sourceKind === "equipped") return accountText(copy, "当前已装备");
  if (row.sourceKind === "inventory") return accountText(copy, "当前角色背包");
  if (row.sourceKind === "vault") return accountText(copy, "仓库");
  const location = row.sourceKind === "other-character-equipped"
    ? accountText(copy, "已装备")
    : accountText(copy, "背包");
  return `${row.sourceCharacterName ?? accountText(copy, "其他角色")} · ${location}`;
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
  rows: AccountSlotComparisonViewRow[];
  onOpenItem: (payload: AccountOpenItemPayload) => void;
  copy: AccountCopy;
}) {
  const categories = accountCategoryOrder
    .map((category) => ({
      key: category,
      label: accountText(props.copy, accountCategoryLabels[category]),
      rows: props.rows.filter((row) => row.category === category)
    }))
    .filter((category) => category.rows.length > 0);

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
          <div className="account-slot-column-head" aria-hidden="true">
            <span>{accountText(props.copy, "位置")}</span>
            <span>{accountText(props.copy, "当前角色装备")}</span>
            <span>{accountText(props.copy, "当前角色背包候选")}</span>
          </div>
          {category.rows.map((row) => (
            <article className="account-slot-row" data-surface="row" key={row.key}>
              <div className="account-slot-heading">
                <strong>{row.label}</strong>
                <span>{accountText(props.copy, "装备")} {row.equippedItems.length} / {accountText(props.copy, "背包")} {row.inventoryItems.length}</span>
              </div>
              <div className="account-slot-columns">
                <section className="account-slot-column account-equipped-panel" aria-label={accountText(props.copy, "当前角色装备")}>
                  <h5>{accountText(props.copy, "当前角色装备")}</h5>
                  {renderAccountItemGrid(row.equippedItems, "equipped", {
                    onOpenItem: props.onOpenItem,
                    copy: props.copy
                  })}
                </section>
                <section className="account-slot-column account-inventory-panel" aria-label={accountText(props.copy, "当前角色背包候选")}>
                  <h5>{accountText(props.copy, "当前角色背包候选")}</h5>
                  {renderAccountItemGrid(row.inventoryItems, "inventory", {
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

function renderAccountItemGrid(
  items: AccountItemView[],
  source: AccountItemSource,
  props: {
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

  return (
    <div className="account-slot-item-grid">
      {items.map((item) => renderAccountItemCard(item, source, {
        onOpenItem: props.onOpenItem,
        copy: props.copy
      }))}
    </div>
  );
}

function renderAccountItemCard(
  item: AccountItemView,
  source: AccountItemSource,
  props: {
    onOpenItem: (payload: AccountOpenItemPayload) => void;
    copy: AccountCopy;
  }
) {
  const className = [
    "account-slot-item",
    source === "equipped" ? "equipped" : "inventory",
    item.canOpenDetail ? "is-interactive" : "is-readonly",
    item.isPending ? "pending" : "",
    item.isLoadoutMatch ? "loadout-highlight" : ""
  ].filter(Boolean).join(" ");
  const status = item.isPending
    ? {
        kind: "pending",
        label: accountText(props.copy, "打开中"),
        description: accountText(props.copy, "正在打开详情")
      }
    : item.isLoadoutMatch
      ? {
          kind: "success",
          label: accountText(props.copy, "配装"),
          description: accountText(props.copy, "配装引用")
        }
      : null;
  const primaryFacts = item.primaryFacts.join(" · ") || accountText(props.copy, "实例摘要待补齐");
  const stateFacts = item.stateFacts.join(" · ");
  const content = (
    <>
      <GameAssetImage
        alt=""
        fetchPriority={source === "equipped" ? "high" : "auto"}
        loading={source === "equipped" ? "eager" : "lazy"}
        src={item.icon}
        fallback={<span className="item-icon-placeholder" aria-hidden="true" />}
      />
      <span className="account-slot-item-copy">
        <strong>{item.name}</strong>
        <span className="account-slot-item-primary-facts" title={primaryFacts}>{primaryFacts}</span>
        <span className="account-slot-item-fact-row">
          {stateFacts ? <small title={stateFacts}>{stateFacts}</small> : null}
          {status ? (
            <em data-status={status.kind} title={status.description} aria-label={status.description}>
              {status.label}
            </em>
          ) : null}
        </span>
      </span>
    </>
  );

  if (!item.canOpenDetail) {
    return (
      <div className={className} data-ui-kind="object-card" data-interactive="false" key={item.key}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={className}
      data-ui-kind="object-card"
      data-control-variant="quiet"
      key={item.key}
      aria-busy={item.isPending}
      aria-label={`${accountText(props.copy, "查看")}${item.name}${accountText(props.copy, "详情")}`}
      onClick={() => props.onOpenItem(item.openPayload)}
    >
      {content}
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
