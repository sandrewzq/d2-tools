import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import type {
  AccountItemView,
  AccountOpenItemPayload,
  AccountPageViewModel,
  AccountTodoPanelKey,
  AccountTodoPanelView,
  AccountTodoFactsView,
  CharacterPowerView,
  CharacterPowerValueView,
  AccountReadonlyGroupView,
  AccountReadonlyItemView,
  AccountSlotComparisonViewRow
} from "@d2-tools/app/account";
import type { LibraryWeeklyFarmingItemView, LibraryWeeklyFarmingView } from "@d2-tools/app/library";
import { getLocaleCopy } from "../i18n/copy.js";
import type { AccountCopy, InterfaceLocale } from "../i18n/types.js";
import { GameAssetImage } from "../media/GameAssetImage.js";
import { getRovingFocusIndex } from "../interaction/rovingFocus.js";
import { ConfirmationDialog } from "../overlay/ConfirmationDialog.js";
import { ContextSwitcher } from "../control/ContextSwitcher.js";
import { RefreshControlButton } from "../control/RefreshControlButton.js";
import { formatClockTime, formatCompactDateTime } from "../time/formatTime.js";
import type { VaultRecommendationSummaryIndex } from "../recommendationMatchView.js";
import {
  ProductWorkspaceContentStack,
  ProductWorkspaceEmptyState,
  ProductWorkspaceSideRail,
  ProductWorkspaceSplit
} from "../workspace/ProductWorkspace.js";
import { WeeklyFarmingPanel } from "../weekly/WeeklyFarmingPanel.js";

type AccountItemSource = "equipped" | "inventory" | "postmaster";

export type AccountPageActions = {
  configureBungie: () => void;
  loginBungie: () => void;
  refreshAccount: () => void;
  refreshActivity: () => void;
  /** 重新拉任务、赏金与活动挑战。待办清单读不到数据时用它重试，不用整页刷新。 */
  refreshTasks: () => void;
  /** 进入「待办」时读任务资源与本周刷取；这两份不在首屏上，整页加载时不读（T91 第 8 节）。 */
  requestTodoResources: () => void;
  selectCharacter: (characterId: string) => void;
  equipHighestPower?: (characterId: string) => void;
  openItem: (payload: AccountOpenItemPayload) => void;
  refreshWeeklyRotation: () => void;
  refreshWeeklyFarming: () => void;
  openWeeklyFarmingItem: (item: LibraryWeeklyFarmingItemView) => void;
};

export type AccountPageContentViewProps = {
  interfaceLocale?: InterfaceLocale;
  viewModel: AccountPageViewModel;
  actions: AccountPageActions;
  recommendationSummaryByInstance?: VaultRecommendationSummaryIndex;
  weeklyFarming?: LibraryWeeklyFarmingView;
  /** 首页「查看本周刷取」的深链接请求：切到含该活动的时限桶，并展开对应的行动行。requestId 保证同一条目重复点击也生效。 */
  weeklyFarmingLocateRequest?: AccountTodoLocateRequest;
};

type AccountMode = "role_state" | "todo" | "account_data";
/** 二级待办的五个入口，和 `AccountPageViewModel["todo"]["panels"]` 的 key 一一对应。 */
type AccountTodoSection = `todo_${AccountTodoPanelKey}`;
type AccountSection = "gear" | "configuration" | "postmaster" | AccountTodoSection | "items" | "activity";

const accountTodoSections: AccountTodoSection[] = ["todo_all", "todo_daily", "todo_weekly", "todo_timeless", "todo_power"];

const accountTodoPanelLabels: Record<AccountTodoPanelKey, string> = {
  all: "全部",
  daily: "日常",
  weekly: "周常",
  timeless: "不限时",
  power: "提光"
};

/** 首页「查看本周刷取」的深链接请求：切到含该活动的时限桶，并展开对应的行动行。 */
export type AccountTodoLocateRequest = { activityKey: string; requestId: number };

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

function accountModeForSection(section: AccountSection): AccountMode {
  if (isAccountTodoSection(section)) return "todo";
  if (section === "items" || section === "activity") return "account_data";
  return "role_state";
}

function isAccountTodoSection(section: AccountSection): section is AccountTodoSection {
  return section.startsWith("todo_");
}

function accountTodoPanelKey(section: AccountTodoSection): AccountTodoPanelKey {
  return section.slice("todo_".length) as AccountTodoPanelKey;
}

function accountSectionHash(section: AccountSection): string {
  return isAccountTodoSection(section)
    ? `#account-todo-${accountTodoPanelKey(section)}`
    : `#account-${section}`;
}

function initialAccountSection(): AccountSection {
  if (typeof window === "undefined") return "gear";
  switch (window.location.hash) {
    case "#account-role-state": return "gear";
    case "#account-account-data": return "items";
    // 旧的三个平级分区已经并进待办清单，老链接落到对应入口，不做 404 式的空白页。
    case "#account-weekly-action":
    case "#account-tasks":
    case "#account-weekly-farming": return "todo_all";
    case "#account-power-route": return "todo_power";
    case "#account-todo-all": return "todo_all";
    case "#account-todo-daily": return "todo_daily";
    case "#account-todo-weekly": return "todo_weekly";
    case "#account-todo-timeless": return "todo_timeless";
    case "#account-todo-power": return "todo_power";
    case "#account-items": return "items";
    case "#account-activity": return "activity";
    case "#account-configuration": return "configuration";
    case "#account-postmaster": return "postmaster";
    default: return "gear";
  }
}

export function AccountPageContentView(props: AccountPageContentViewProps) {
  const interfaceLocale = props.interfaceLocale ?? "zh-CN";
  const copy = getLocaleCopy(interfaceLocale).account;
  const { actions, viewModel } = props;
  const selectedCharacter = viewModel.selectedCharacter;
  const profile = viewModel.profile;
  const activitySummary = viewModel.activity.summary;
  const activityReview = activitySummary ? activitySummary.review : null;
  const [section, setSection] = useState<AccountSection>(initialAccountSection);
  const weeklyFarmingLocateRequestId = props.weeklyFarmingLocateRequest?.requestId;
  const todoLocateRequest = props.weeklyFarmingLocateRequest;

  useEffect(() => {
    if (weeklyFarmingLocateRequestId === undefined) return;
    // 挑战行一律落在「周常」段（时限由活动身份决定），所以直接切到周常入口；
    // 展开和滚动由行动行自己在挂载/匹配后处理，不依赖这里已经渲染完。
    setSection("todo_weekly");
  }, [weeklyFarmingLocateRequestId]);

  if (!profile || !selectedCharacter) {
    return <AccountUnavailableState actions={actions} copy={copy} viewModel={viewModel} />;
  }

  return <AccountPageWorkspace actions={actions} activityReview={activityReview} activitySummary={activitySummary} copy={copy} interfaceLocale={interfaceLocale} recommendationSummaryByInstance={props.recommendationSummaryByInstance} section={section} selectedCharacter={selectedCharacter} setSection={setSection} todoLocateRequest={todoLocateRequest} viewModel={viewModel} weeklyFarming={props.weeklyFarming} />;
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
      <p>{isLoading ? accountText(props.copy, "正在读取当前角色资料，完成后会保留角色和装备位置。") : props.copy.emptyBody}</p>
      {props.viewModel.feedback.accountError ? <p className="status-message status-error" role="alert">{props.viewModel.feedback.accountError}</p> : null}
      {props.viewModel.feedback.accountWarning ? <p className="status-message status-warning">{props.viewModel.feedback.accountWarning}</p> : null}
      <div className="button-row">
        {!isConfigured ? (
          <button type="button" data-ui-kind="button" data-control-variant="primary" onClick={props.actions.configureBungie}>{props.copy.configureBungie}</button>
        ) : !isLoggedIn ? (
          <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={isLoading} onClick={props.actions.loginBungie}>{props.copy.loginBungie}</button>
        ) : (
          <RefreshControlButton variant="primary" refreshing={isLoading} onClick={props.actions.refreshAccount}>
            {isLoading ? props.copy.loadingAccount : props.copy.loadAccount}
          </RefreshControlButton>
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
  recommendationSummaryByInstance?: VaultRecommendationSummaryIndex;
  section: AccountSection;
  selectedCharacter: NonNullable<AccountPageViewModel["selectedCharacter"]>;
  setSection: (section: AccountSection) => void;
  todoLocateRequest?: AccountTodoLocateRequest;
  viewModel: AccountPageViewModel;
  weeklyFarming?: LibraryWeeklyFarmingView;
}) {
  const profile = props.viewModel.profile!;
  const [mode, setMode] = useState<AccountMode>(() => accountModeForSection(props.section));
  const modeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const directoryTabsRef = useRef<HTMLDivElement | null>(null);
  const powerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const equipHighestPowerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const powerPanelRef = useRef<HTMLElement | null>(null);
  const [isPowerPanelOpen, setIsPowerPanelOpen] = useState(false);
  const [isHighestPowerConfirmationOpen, setIsHighestPowerConfirmationOpen] = useState(false);
  const powerOverlayHost = typeof document === "undefined"
    ? null
    : document.querySelector<HTMLElement>(".app-shell") ?? document.body;
  const [directoryScrollState, setDirectoryScrollState] = useState({ overflow: false, canScrollRight: false });
  const displayedSlotRows = visibleAccountSlotRows(props.viewModel.loadout.slotComparisonRows);
  const displayedInventoryCount = displayedSlotRows.reduce((count, row) => count + row.inventoryItems.length, 0);
  const highestPowerChanges = props.selectedCharacter.power.executablePower.rows.filter((row) => (
    row.itemName && row.sourceKind && row.sourceKind !== "equipped"
  ));
  const directoryOrientation = useAccountDirectoryOrientation();
  const modeNavigation: Array<{ key: AccountMode; label: string; detail: string }> = [
    { key: "role_state", label: accountText(props.copy, "角色状态"), detail: accountText(props.copy, "当前角色") },
    { key: "todo", label: accountText(props.copy, "待办"), detail: accountText(props.copy, "还没做完的事") },
    { key: "account_data", label: accountText(props.copy, "账号资料"), detail: accountText(props.copy, "整个账号") }
  ];
  const todoPanels = new Map(props.viewModel.todo.panels.map((panel) => [panel.key, panel]));
  const navigation: Array<{ key: AccountSection; label: string; count?: number; scopeLabel: string; axis?: "kind" }> = mode === "role_state"
    ? [
        { key: "gear", label: accountText(props.copy, "战斗装备"), scopeLabel: accountText(props.copy, "当前角色") },
        { key: "configuration", label: accountText(props.copy, "角色物品与配置"), scopeLabel: accountText(props.copy, "当前角色") },
        { key: "postmaster", label: accountText(props.copy, "邮政官"), count: props.viewModel.postmaster.totalCount || undefined, scopeLabel: accountText(props.copy, "当前角色") }
      ]
    : mode === "todo"
      ? accountTodoSections.map((section) => {
          const panelKey = accountTodoPanelKey(section);
          return {
            key: section,
            label: accountText(props.copy, accountTodoPanelLabels[panelKey]),
            count: todoPanels.get(panelKey)?.count ?? 0,
            scopeLabel: accountText(props.copy, "全部角色"),
            // 前四个是按「多急」切的时限桶，提光按奖励口径切，隔一条线分开，不读成第五个时限桶。
            ...(panelKey === "power" ? { axis: "kind" as const } : {})
          };
        })
      : [
          { key: "items", label: accountText(props.copy, "材料与货币"), scopeLabel: accountText(props.copy, "整个账号") },
          { key: "activity", label: accountText(props.copy, "账号战绩"), scopeLabel: accountText(props.copy, "整个账号") }
        ];

  useEffect(() => {
    const tabs = directoryTabsRef.current;
    if (!tabs) return;
    const updateScrollState = () => {
      const nextState = {
        overflow: tabs.scrollWidth > tabs.clientWidth + 1,
        canScrollRight: tabs.scrollLeft + tabs.clientWidth < tabs.scrollWidth - 1
      };
      setDirectoryScrollState((current) => current.overflow === nextState.overflow && current.canScrollRight === nextState.canScrollRight ? current : nextState);
    };
    updateScrollState();
    tabs.addEventListener("scroll", updateScrollState, { passive: true });
    if (typeof ResizeObserver === "undefined") return () => tabs.removeEventListener("scroll", updateScrollState);
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(tabs);
    return () => {
      tabs.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [directoryOrientation, navigation.length, mode]);

  useEffect(() => {
    const selectedIndex = navigation.findIndex((item) => item.key === props.section);
    if (selectedIndex < 0) return;
    tabRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [props.section]);

  // 进「待办」才让平台壳去读任务资源与本周刷取，两份都不在首屏上（T91 第 8 节）。
  // mode 的初值就来自落点分区，所以从深链接直接进来时挂载即触发；读完之后重复触发是空操作，
  // 只有「待办」自己的同步状态落定（isSyncing 翻转）才会再要一次——进待办时简报可能还没回来，
  // 那一次没有活动可读。
  const requestTodoResources = props.actions.requestTodoResources;
  const isTodoSyncing = props.viewModel.todo.isSyncing;
  const requestTodoResourcesRef = useRef(requestTodoResources);
  useEffect(() => {
    requestTodoResourcesRef.current = requestTodoResources;
  }, [requestTodoResources]);
  useEffect(() => {
    if (mode !== "todo") return;
    requestTodoResourcesRef.current();
  }, [mode, isTodoSyncing]);

  function selectMode(nextMode: AccountMode): void {
    setIsPowerPanelOpen(false);
    const firstSection: AccountSection = nextMode === "role_state" ? "gear" : nextMode === "todo" ? "todo_all" : "items";
    setMode(nextMode);
    props.setSection(firstSection);
    if (typeof window !== "undefined") window.history.replaceState(null, "", `#account-${nextMode.replace("_", "-")}`);
  }

  function selectSection(nextSection: AccountSection): void {
    setIsPowerPanelOpen(false);
    setMode(accountModeForSection(nextSection));
    if (typeof window !== "undefined") window.history.replaceState(null, "", accountSectionHash(nextSection));
    props.setSection(nextSection);
  }

  function handleModeKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const nextIndex = getRovingFocusIndex({
      key: event.key,
      currentIndex: index,
      itemCount: modeNavigation.length,
      orientation: directoryOrientation
    });
    if (nextIndex === null) {
      const entersDirectory = directoryOrientation === "horizontal"
        ? event.key === "ArrowDown"
        : event.key === "ArrowRight";
      if (!entersDirectory) return;
      event.preventDefault();
      window.requestAnimationFrame(() => tabRefs.current[0]?.focus());
      return;
    }
    event.preventDefault();
    selectMode(modeNavigation[nextIndex].key);
    modeRefs.current[nextIndex]?.focus();
  }

  function handleDirectoryKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const nextIndex = getRovingFocusIndex({
      key: event.key,
      currentIndex: index,
      itemCount: navigation.length,
      orientation: directoryOrientation
    });
    if (nextIndex === null) {
      const entersPanel = directoryOrientation === "horizontal"
        ? event.key === "ArrowDown"
        : event.key === "ArrowRight";
      if (!entersPanel) return;
      event.preventDefault();
      focusAccountPanel(navigation[index].key);
      return;
    }
    event.preventDefault();
    selectSection(navigation[nextIndex].key);
    tabRefs.current[nextIndex]?.focus();
  }

  useEffect(() => {
    if (!isPowerPanelOpen) return;

    const focusTimer = window.requestAnimationFrame(() => {
      powerPanelRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
    });

    function handlePointerDown(event: PointerEvent): void {
      if (!(event.target instanceof Node)) return;
      if (powerTriggerRef.current?.contains(event.target) || powerPanelRef.current?.contains(event.target)) return;
      setIsPowerPanelOpen(false);
      window.requestAnimationFrame(() => powerTriggerRef.current?.focus());
    }

    function handleKeyDown(event: globalThis.KeyboardEvent): void {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        setIsPowerPanelOpen(false);
        window.requestAnimationFrame(() => powerTriggerRef.current?.focus());
        return;
      }
      if (event.key !== "Tab" || !powerPanelRef.current) return;
      const focusable = [...powerPanelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function handleFocusIn(event: FocusEvent): void {
      if (!(event.target instanceof Node)) return;
      if (powerTriggerRef.current?.contains(event.target) || powerPanelRef.current?.contains(event.target)) return;
      setIsPowerPanelOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [isPowerPanelOpen]);


  const connectionState = props.viewModel.connection.dataState;
  const connectionLabel = connectionState === "refreshing"
    ? accountText(props.copy, "正在同步账号数据")
    : connectionState === "cached"
      ? accountText(props.copy, "缓存数据")
      : accountText(props.copy, "已读取");
  const connectionStatus = connectionState === "refreshing" ? "pending" : connectionState === "cached" ? "warning" : "success";
  const operationFeedback = props.viewModel.feedback.operation;
  const isHighestPowerVerificationActive = operationFeedback?.phase === "submitting"
    || operationFeedback?.phase === "syncing"
    || operationFeedback?.phase === "delayed"
    || operationFeedback?.phase === "partial";
  // 操作反馈挂在页头下方：三个数据视图（角色状态 / 待办 / 账号资料）都会渲染页头，
  // 而容量卡片只在角色状态下出现，反馈跟着卡片走会在其余视图里消失。放进页头后也不必再
  // 预留固定高度的空槽，没有操作时这块位置不占任何空间。
  const operationStatus = operationFeedback ? (
    <p className={`status-message status-${operationFeedback.tone === "success" ? "ready" : operationFeedback.tone}`} role={operationFeedback.tone === "error" ? "alert" : "status"}>{operationFeedback.message}</p>
  ) : props.viewModel.feedback.itemActionMessage ? (
    <p className="status-message status-pending" role="status">{props.viewModel.feedback.itemActionMessage}</p>
  ) : props.viewModel.feedback.loadoutMessage ? (
    <p className="status-message" role="status">{props.viewModel.feedback.loadoutMessage}</p>
  ) : null;

  return (
    <>
      {props.viewModel.feedback.accountError ? <p className="status-message status-error">{props.viewModel.feedback.accountError}</p> : null}
      {props.viewModel.feedback.accountWarning ? <p className="status-message status-warning">{props.viewModel.feedback.accountWarning}</p> : null}
      {props.viewModel.feedback.itemDetailError ? <p className="status-message status-error">{props.viewModel.feedback.itemDetailError}</p> : null}
      <ProductWorkspaceSplit className="account-workspace" id="account-workspace">
      <ProductWorkspaceSideRail element="aside" className="account-directory" ariaLabel={accountText(props.copy, "账号目录")} scrollRegion="pane" surface="list">
        <div className="account-column-head">
          <h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">账号目录</h3>
          <span data-ui-part="detail" data-info-priority="trace" data-text-tone="meta">{profile.accountName}</span>
        </div>
        <div className="account-mode-tabs" role="tablist" aria-orientation={directoryOrientation} aria-label={accountText(props.copy, "账号工作模式")}>
          {modeNavigation.map((item, index) => (
            <button
              type="button"
              key={item.key}
              role="tab"
              id={`account-mode-${item.key}`}
              aria-selected={mode === item.key}
              aria-controls="account-mode-panel"
              aria-label={`${item.label}：${item.detail}`}
              tabIndex={mode === item.key ? 0 : -1}
              className={mode === item.key ? "active" : ""}
              ref={(element) => { modeRefs.current[index] = element; }}
              onClick={() => selectMode(item.key)}
              onKeyDown={(event) => handleModeKeyDown(event, index)}
            >
              <span>{item.label}</span>
              <small>{item.detail}</small>
            </button>
          ))}
        </div>
        <div
          ref={directoryTabsRef}
          className="account-directory-tabs"
          role="tablist"
          aria-orientation={directoryOrientation}
          aria-label={accountText(props.copy, "账号数据视图")}
          data-scroll-overflow={directoryScrollState.overflow ? "true" : "false"}
          data-scroll-right={directoryScrollState.canScrollRight ? "true" : "false"}
        >
          {navigation.map((item, index) => (
            <Fragment key={item.key}>
              <button
                type="button"
                role="tab"
                id={`account-tab-${item.key}`}
                aria-controls={`account-panel-${item.key}`}
                aria-label={`${item.scopeLabel}：${item.label}`}
                aria-selected={props.section === item.key}
                tabIndex={props.section === item.key ? 0 : -1}
                className={props.section === item.key ? "active" : ""}
                data-axis={item.axis}
                ref={(element) => { tabRefs.current[index] = element; }}
                onClick={() => selectSection(item.key)}
                onKeyDown={(event) => handleDirectoryKeyDown(event, index)}
              >
                <span>{item.label}</span>
                {item.count !== undefined ? <small aria-label={`${item.count} ${accountText(props.copy, "件")}`}>{item.count}</small> : null}
              </button>
            </Fragment>
          ))}
        </div>
      </ProductWorkspaceSideRail>
      <ProductWorkspaceContentStack className="account-content" id="account-mode-panel" aria-labelledby={`account-mode-${mode}`}>
        <section className="account-summary" data-surface="section" aria-busy={props.viewModel.connection.isLoadingAccount}>
          <div className="account-band-heading">
            <div>
              {/* 账号名是三个模式共用的轻量上下文，不跟页面标题抢同一档字号：
                  挂 display 会命中共享层的 24px，比菜单自己的 `.account-band-heading h2`（18px）更具体，
                  菜单规则永远不生效。去掉这个属性，让菜单自己的字号接管。 */}
              <h2 data-ui-part="value" data-text-tone="primary">{profile.accountName}</h2>
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
          {operationStatus}
          {mode === "role_state" ? <>
          <ContextSwitcher
            variant="full"
            label={accountText(props.copy, "当前角色")}
            items={props.viewModel.characterTabs.map((tab) => {
              const characterCapacity = props.viewModel.capacity.characters.find((character) => character.characterId === tab.key);
              return {
                key: tab.key,
                className: tab.className,
                emblemUrl: tab.emblemUrl,
                isSelected: tab.isSelected,
                title: `${accountText(props.copy, "切换到")}${tab.className}`,
                detail: `${accountText(props.copy, "当前")} ${tab.power.currentLabel} · ${accountText(props.copy, "可装备最高光等")} ${tab.power.maxEquippable.label}`,
                capacity: characterCapacity ? {
                  label: formatCharacterCapacitySummary(characterCapacity, props.copy),
                  risk: characterCapacity.overallRisk
                } : undefined
              };
            })}
            onSelect={props.actions.selectCharacter}
            onAfterSelect={() => setIsPowerPanelOpen(false)}
          />
          <AccountCapacityOverview copy={props.copy} viewModel={props.viewModel}>
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
                <span>{accountText(props.copy, "光等详情")}</span>
                <PowerFractionValue value={props.selectedCharacter.power.dropBaseline} />
              </button>
              {props.actions.equipHighestPower ? <button
                type="button"
                ref={equipHighestPowerTriggerRef}
                data-ui-kind="button"
                data-control-variant="secondary"
                disabled={props.viewModel.loadout.isRunningItemAction || isHighestPowerVerificationActive}
                onClick={() => {
                  setIsPowerPanelOpen(false);
                  if (highestPowerChanges.length) {
                    setIsHighestPowerConfirmationOpen(true);
                  } else {
                    props.actions.equipHighestPower?.(props.selectedCharacter.characterId);
                  }
                }}
              >
                {props.viewModel.loadout.isRunningItemAction
                  ? props.copy.actions.running
                  : isHighestPowerVerificationActive
                    ? accountText(props.copy, "同步中")
                    : props.copy.actions.equipHighestPower}
              </button> : null}
            </div>
          </AccountCapacityOverview>
          </> : mode === "todo" ? (
            <div className="account-mode-summary" data-ui-kind="summary-frame">
              <div>
                <strong>{accountText(props.copy, "待办")}</strong>
                <span>{accountText(props.copy, "还没做完的事")}</span>
              </div>
              <span>{accountText(props.copy, "全部角色")} · {accountText(props.copy, "任务、赏金与活动挑战在同一张清单里")}</span>
            </div>
          ) : (
            <div className="account-mode-summary" data-ui-kind="summary-frame">
              <div>
                <strong>{accountText(props.copy, "账号资料")}</strong>
                <span>{accountText(props.copy, "材料、货币与近期活动")}</span>
              </div>
              <span>{accountText(props.copy, "整个账号")}</span>
            </div>
          )}
          {isPowerPanelOpen ? (
            powerOverlayHost ? createPortal(
              <div className="modal-backdrop account-power-dialog-backdrop" role="presentation" onClick={() => {
                setIsPowerPanelOpen(false);
                window.requestAnimationFrame(() => powerTriggerRef.current?.focus());
              }}>
                <AccountPowerPanel
                  copy={props.copy}
                  id="account-power-panel"
                  panelRef={powerPanelRef}
                  power={props.selectedCharacter.power}
                  isSyncing={props.viewModel.connection.isLoadingAccount}
                  dataState={props.viewModel.connection.dataState}
                  snapshotAt={profile.snapshotAt}
                  onClose={() => {
                    setIsPowerPanelOpen(false);
                    window.requestAnimationFrame(() => powerTriggerRef.current?.focus());
                  }}
                />
              </div>,
              powerOverlayHost
            ) : null
          ) : null}
        </section>

        <section
          className={`account-section account-slot-comparison ${props.section === "gear" ? "active" : ""}`}
          id="account-panel-gear"
          role="tabpanel"
          aria-labelledby="account-tab-gear"
          aria-busy={props.viewModel.connection.isLoadingAccount}
          tabIndex={-1}
          hidden={props.section !== "gear"}
        >
            <div className="account-column-head">
              <h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">{props.selectedCharacter.className}{accountText(props.copy, "战斗装备")}</h3>
              <span data-ui-part="detail" data-info-priority="support" data-text-tone="body">
                装备 {props.viewModel.loadout.equippedCount} 件 · 背包候选 {displayedInventoryCount} 件
                {props.viewModel.loadout.activeTemplateName ? ` · ${accountText(props.copy, "关联配装")} ${props.viewModel.loadout.activeTemplateName} · ${accountText(props.copy, "命中")} ${props.viewModel.loadout.selectedCharacterLoadoutMatchCount}` : ""}
              </span>
            </div>
            <AccountSlotComparison
              rows={displayedSlotRows}
              onOpenItem={props.actions.openItem}
              copy={props.copy}
              recommendationSummaryByInstance={props.recommendationSummaryByInstance}
            />
        </section>

        <section
          className={`account-section ${props.section === "configuration" ? "active" : ""}`}
          id="account-panel-configuration"
          role="tabpanel"
          aria-labelledby="account-tab-configuration"
          tabIndex={-1}
          hidden={props.section !== "configuration"}
        >
          <AccountCharacterItemsPanel actions={props.actions} copy={props.copy} viewModel={props.viewModel} />
        </section>

        {accountTodoSections.map((section) => (
          <AccountTodoPanelSection
            actions={props.actions}
            copy={props.copy}
            isActive={props.section === section}
            key={section}
            locateRequest={props.todoLocateRequest}
            panel={todoPanels.get(accountTodoPanelKey(section))}
            viewModel={props.viewModel}
            weeklyFarming={props.weeklyFarming}
          />
        ))}

        <section
          className={`account-section ${props.section === "postmaster" ? "active" : ""}`}
          id="account-panel-postmaster"
          role="tabpanel"
          aria-labelledby="account-tab-postmaster"
          tabIndex={-1}
          hidden={props.section !== "postmaster"}
        >
            <div className="account-column-head"><h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">{props.selectedCharacter.className}{accountText(props.copy, "邮政官")}</h3><span data-ui-part="detail" data-info-priority="support" data-text-tone="body">{props.viewModel.postmaster.totalCount} 件 · {accountText(props.copy, "完整清单")}</span></div>
            <div className="account-section-notice status-message">{accountText(props.copy, "邮政官按当前角色独立保存；这里显示完整清单，取回操作不会自动执行。")}</div>
            {props.viewModel.postmaster.items.length ? (
              <div className="account-item-list">
                {props.viewModel.postmaster.items.map((item) => renderAccountItemCard(item, "postmaster", { onOpenItem: props.actions.openItem, copy: props.copy, recommendationSummaryByInstance: props.recommendationSummaryByInstance }))}
              </div>
            ) : <AccountInlineState title={accountText(props.copy, "邮政官为空")} detail={accountText(props.copy, "当前角色的账号快照没有邮政官物品。")} />}
        </section>

        <section
          className={`account-section ${props.section === "items" ? "active" : ""}`}
          id="account-panel-items"
          role="tabpanel"
          aria-labelledby="account-tab-items"
          tabIndex={-1}
          hidden={props.section !== "items"}
        >
          <div className="account-column-head">
            <h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">{accountText(props.copy, "账号材料与货币")}</h3>
            <span data-ui-part="detail" data-info-priority="support" data-text-tone="body">{accountText(props.copy, "整个账号共享，不随角色切换")}</span>
          </div>
          <AccountMaterialsGroup defaultOpen interfaceLocale={props.interfaceLocale} viewModel={props.viewModel} copy={props.copy} />
        </section>

        <section
          className={`account-section ${props.section === "activity" ? "active" : ""}`}
          id="account-panel-activity"
          role="tabpanel"
          aria-labelledby="account-tab-activity"
          tabIndex={-1}
          hidden={props.section !== "activity"}
        >
            <div className="account-toolbar"><div><strong>{accountText(props.copy, "账号战绩")}</strong><span>{accountText(props.copy, "全部角色的近期活动")}</span></div><RefreshControlButton variant="secondary" onClick={props.actions.refreshActivity}>{accountText(props.copy, "刷新账号战绩")}</RefreshControlButton></div>
            {props.viewModel.activity.error ? <p className="status-message status-error">{props.viewModel.activity.error}</p> : null}
            {props.viewModel.activity.message ? <p className="status-message status-ready">{props.viewModel.activity.message}</p> : null}
            {props.activitySummary ? (
              <>
                <div className="account-activity-grid">
                  <article><span>PVE 完成情况</span><strong>{props.activitySummary.recent.pve.completed} 场</strong><p>最近记录中的 PVE 完成情况</p></article>
                  <article><span>PVP 完成情况</span><strong>{props.activitySummary.recent.pvp.completed} 场</strong><p>最近记录中的 PVP 完成情况</p></article>
                  <article><span>突袭 / 地牢</span><strong>{props.activitySummary.raids.entries.filter((entry) => entry.activity_type === "raid").length} / {props.activitySummary.raids.entries.filter((entry) => entry.activity_type === "dungeon").length}</strong><p>当前可读取的完成记录</p></article>
                </div>
                <div className="account-column-head"><h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">{accountText(props.copy, "最近 10 场")}</h3><span data-ui-part="detail" data-info-priority="support" data-text-tone="body">{accountText(props.copy, "全部角色")}</span></div>
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
                ) : <AccountInlineState title={accountText(props.copy, "暂无最近活动记录")} detail={accountText(props.copy, "当前没有返回可展示的近期场次。")} />}
              </>
            ) : <AccountInlineState title={accountText(props.copy, "当前快照未包含活动记录")} detail={accountText(props.copy, "读取账号资料后会在这里显示真实的近期复盘。")} />}
        </section>
      </ProductWorkspaceContentStack>
      </ProductWorkspaceSplit>
      {isHighestPowerConfirmationOpen ? (
        <ConfirmationDialog
          title={`${accountText(props.copy, "装备操作")} ${highestPowerChanges.length} ${accountText(props.copy, "件最高光等装备？")}`}
          description={`${props.selectedCharacter.className} ${accountText(props.copy, "当前")} ${props.selectedCharacter.power.currentLabel}，${accountText(props.copy, "预计达到")} ${props.selectedCharacter.power.executablePower.label}。${accountText(props.copy, "Bungie 返回后按逐项结果更新页面，失败项保持原状态。")}`}
          confirmLabel={`${accountText(props.copy, "装备操作")} ${highestPowerChanges.length} ${accountText(props.copy, "件")}`}
          cancelLabel={accountText(props.copy, "取消")}
          returnFocusRef={equipHighestPowerTriggerRef}
          onCancel={() => setIsHighestPowerConfirmationOpen(false)}
          onConfirm={() => {
            setIsHighestPowerConfirmationOpen(false);
            props.actions.equipHighestPower?.(props.selectedCharacter.characterId);
          }}
        >
          <div className="account-highest-power-confirmation-list">
            {highestPowerChanges.map((row) => (
              <div className="account-highest-power-confirmation-row" key={row.key}>
                <span>{accountText(props.copy, row.label)}</span>
                <strong>{row.itemName}</strong>
                <small>{accountText(props.copy, "光等")} {row.power ?? "—"} · {formatPowerSource(row, props.copy)}</small>
              </div>
            ))}
          </div>
        </ConfirmationDialog>
      ) : null}
    </>
  );
}

function AccountCapacityOverview(props: {
  copy: AccountCopy;
  viewModel: AccountPageViewModel;
  /** 角色动作（光等详情 / 一键装备最高光等）。放进标题行右端后，它不必在卡片外单独占一行、右侧再空一大片。 */
  children?: ReactNode;
}) {
  const selected = props.viewModel.capacity.selectedCharacter;
  if (!selected) return null;

  const operationPhase = props.viewModel.feedback.operation?.phase;
  const isWaitingForConfirmation = operationPhase === "syncing"
    || operationPhase === "delayed"
    || operationPhase === "partial";
  const stateText = isWaitingForConfirmation
    ? "等待游戏状态确认，容量已按当前预计位置更新"
    : props.viewModel.connection.dataState === "refreshing"
      ? "正在同步，暂时保留上一次容量结果"
      : props.viewModel.connection.dataState === "cached"
        ? "当前显示缓存快照"
        // 正常态下「基于最近一次已确认账号快照」恒定成立、没有增量信息，不再常驻占一行。
        : null;
  const riskLabel = capacityRiskLabel(props.viewModel.capacity.overallRisk);
  const unknownBucketCount = selected.inventoryBuckets.filter((bucket) => bucket.risk === "unknown").length;
  const carriedSummary = selected.fullBucketCount > 0
    ? `${selected.fullBucketCount} ${accountText(props.copy, "个槽位已满")}`
    : selected.warningBucketCount > 0
      ? `${selected.warningBucketCount} ${accountText(props.copy, "个槽位接近上限")}`
      : unknownBucketCount > 0
        ? `${unknownBucketCount} ${accountText(props.copy, "个上限待确认")}`
        : accountText(props.copy, "8 个槽位正常");

  return (
    <div className="account-capacity-overview" data-ui-kind="summary-frame" data-risk={props.viewModel.capacity.overallRisk}>
      <div className="account-capacity-heading">
        <div>
          <h3>{accountText(props.copy, "容量与风险")}</h3>
          {stateText ? <p>{accountText(props.copy, stateText)}</p> : null}
        </div>
        <span className="account-capacity-risk-label" data-risk={props.viewModel.capacity.overallRisk}>
          {accountText(props.copy, riskLabel)}
        </span>
        {props.children}
      </div>
      <div className="account-capacity-primary-grid">
        <AccountCapacityMetric copy={props.copy} metric={selected.postmaster} />
        <AccountCapacityMetric copy={props.copy} metric={props.viewModel.capacity.vault} />
        <div className="account-capacity-primary-card" data-risk={selected.inventoryRisk}>
          <span>{accountText(props.copy, "当前角色携带")}</span>
          <strong>{carriedSummary}</strong>
          <small>{accountText(props.copy, "三武器与五护甲，容量包含当前已装备物品")}</small>
        </div>
      </div>
    </div>
  );
}

function AccountCapacityMetric(props: {
  copy: AccountCopy;
  metric: AccountPageViewModel["capacity"]["vault"];
}) {
  const value = props.metric.capacity
    ? `${props.metric.itemCount} / ${props.metric.capacity}`
    : `${props.metric.itemCount} ${accountText(props.copy, "件")}`;

  return (
    <div className="account-capacity-primary-card" data-risk={props.metric.risk}>
      <span>{accountText(props.copy, props.metric.label)}</span>
      <strong>{value}</strong>
      <small>{formatCapacityMetricStatus(props.metric, props.copy)}</small>
      {props.metric.capacity !== undefined && props.metric.usagePercent !== undefined ? (
        <div
          className="account-capacity-progress"
          role="progressbar"
          aria-label={`${accountText(props.copy, props.metric.label)} ${value}`}
          aria-valuemin={0}
          aria-valuemax={props.metric.capacity}
          aria-valuenow={Math.min(props.metric.itemCount, props.metric.capacity)}
        >
          <span style={{ width: `${props.metric.usagePercent}%` }} />
        </div>
      ) : null}
    </div>
  );
}

function capacityRiskLabel(risk: AccountPageViewModel["capacity"]["overallRisk"]): string {
  if (risk === "danger") return "存在已满位置，需要处理";
  if (risk === "warning") return "部分位置接近上限";
  if (risk === "unknown") return "部分容量待确认";
  return "容量正常";
}

function formatCharacterCapacitySummary(
  character: AccountPageViewModel["capacity"]["characters"][number],
  copy: AccountCopy
): string {
  if (character.postmaster.risk === "danger") return accountText(copy, "邮政官已满，有覆盖风险");
  if (character.fullBucketCount > 0) return `${character.fullBucketCount} ${accountText(copy, "个携带槽位已满")}`;
  if (character.postmaster.risk === "warning") return formatCapacityMetricStatus(character.postmaster, copy);
  if (character.warningBucketCount > 0) return `${character.warningBucketCount} ${accountText(copy, "个携带槽位接近上限")}`;
  if (character.overallRisk === "unknown") return accountText(copy, "部分容量上限待确认");
  return accountText(copy, "容量正常");
}

function formatCapacityMetricStatus(
  metric: AccountPageViewModel["capacity"]["vault"],
  copy: AccountCopy
): string {
  if (metric.risk === "unknown") return accountText(copy, "容量上限待确认");
  if (metric.risk === "danger") {
    return metric.key.startsWith("postmaster-")
      ? accountText(copy, "已满，掉落存在覆盖风险")
      : accountText(copy, "已满");
  }
  if (metric.risk === "warning") {
    return `${accountText(copy, "接近上限，剩余")} ${metric.remaining ?? 0} ${accountText(copy, "格")}`;
  }
  return `${accountText(copy, "剩余")} ${metric.remaining ?? 0} ${accountText(copy, "格")}`;
}

function AccountCharacterItemsPanel(props: { actions: AccountPageActions; copy: AccountCopy; viewModel: AccountPageViewModel }) {
  const { primaryItems, extraItems } = props.viewModel.configuration;
  return (
    <section className="account-character-config" data-surface="section">
      <header className="account-section-heading">
        <div>
          <span data-ui-part="label" data-info-priority="support" data-text-tone="meta">{accountText(props.copy, "角色物品与配置")}</span>
          <h4 data-ui-part="value" data-info-priority="decision" data-text-tone="primary">{accountText(props.copy, "当前使用")}</h4>
        </div>
        <span data-ui-part="detail" data-info-priority="support" data-text-tone="body">{accountText(props.copy, "非战斗物品和外观配置只读展示")}</span>
      </header>
      {primaryItems.length ? (
        <div className="account-config-grid">
          {primaryItems.map((item) => <AccountConfigItem item={item} key={item.key} />)}
        </div>
      ) : <AccountInlineState title="没有角色配置数据" detail="当前角色资料未返回职业分支、机灵或外观配置。" />}
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
      <div className="account-column-head account-character-items-head">
        <h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">{accountText(props.copy, "携带物品与其他配置")}</h3>
        <span data-ui-part="detail" data-info-priority="support" data-text-tone="body">
          {props.viewModel.items.carriedCount + props.viewModel.items.collectionCount + props.viewModel.items.unknownCount} 项 · {accountText(props.copy, "当前角色")}
        </span>
      </div>
      <AccountDataGroups actions={props.actions} copy={props.copy} groups={props.viewModel.items.groups} />
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

function AccountTodoPanelSection(props: {
  actions: AccountPageActions;
  copy: AccountCopy;
  isActive: boolean;
  locateRequest?: AccountTodoLocateRequest;
  panel?: AccountTodoPanelView;
  viewModel: AccountPageViewModel;
  weeklyFarming?: LibraryWeeklyFarmingView;
}) {
  const panel = props.panel;
  const todo = props.viewModel.todo;
  const sectionRef = useRef<HTMLElement | null>(null);
  const section = panel ? `todo_${panel.key}` : "todo_all";
  const isPowerPanel = panel?.key === "power";

  // 滚动放在这一层：行动行可能挂在还没显示的段里，等这一段真的显示出来再滚才有落点。
  useEffect(() => {
    if (!props.isActive || props.locateRequest?.requestId === undefined) return;
    const target = sectionRef.current?.querySelector<HTMLElement>(
      `[data-activity-key="${props.locateRequest.activityKey}"]`
    );
    target?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [props.isActive, props.locateRequest?.activityKey, props.locateRequest?.requestId]);

  const emptyTitle = todo.isSyncing
    ? "正在读取待办数据"
    : todo.errorMessage
      ? "待办数据暂时不可用"
      : isPowerPanel
        ? "这一档没有提光项"
        : "这一档没有待办";
  const emptyDetail = todo.isSyncing
    ? "装备数据保持可用，任务与挑战会在独立同步完成后出现。"
    : todo.errorMessage
      ? "本次读取失败，不能把空列表解释为账号没有待办。"
      : isPowerPanel
        ? "读到的挑战里，奖励名字和奖励物品的装备阶级都没带等级占位词。这不是筛子写窄了，是游戏没给这几项等级信息。"
        : "读到的任务、赏金和活动挑战里，没有落在这一档的项。";

  return (
    <section
      className={`account-section ${props.isActive ? "active" : ""}`}
      id={`account-panel-${section}`}
      ref={sectionRef}
      role="tabpanel"
      aria-labelledby={`account-tab-${section}`}
      tabIndex={-1}
      hidden={!props.isActive}
    >
      <div className="account-column-head">
        <h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">
          {accountText(props.copy, panel ? accountTodoPanelLabels[panel.key] : "待办")}
        </h3>
        <span data-ui-part="detail" data-info-priority="support" data-text-tone="body">
          {panel?.count ?? 0} 项 · {accountText(props.copy, "覆盖全部角色")} · {accountText(props.copy, todo.statusLabel)}
          {todo.observedAt ? ` · ${accountText(props.copy, "数据时间")} ${formatCompactDateTime(todo.observedAt)}` : ""}
        </span>
      </div>
      {isPowerPanel ? (
        <p className="status-message" role="status">
          这里只收官方原文里带等级占位词的挑战奖励：奖励物品的名字，或奖励物品的装备阶级
          （如「装备阶级5」）。判据是游戏返回的原文，不是本项目的推荐，也不看光等数字。
        </p>
      ) : null}
      <AccountStatusMatrix entries={[
        { label: "可执行", value: panel?.actionableCount ?? 0 },
        { label: "已完成待处理", value: panel?.pendingActionCount ?? 0 },
        { label: "已结束", value: panel?.closedCount ?? 0 },
        { label: "状态待确认", value: panel?.unknownCount ?? 0 }
      ]} />
      {todo.isSyncing ? <p className="status-message status-pending" role="status">待办数据同步中，列表保留上次确认结果。</p> : null}
      {todo.errorMessage ? (
        <p className="status-message status-error" role="alert">
          任务同步失败，继续显示上次确认结果。{todo.errorMessage}
          <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.actions.refreshTasks}>
            {accountText(props.copy, "重试")}
          </button>
        </p>
      ) : null}
      {todo.dataState === "partial" ? <p className="status-message status-warning">部分资源未返回，没读到的项不会被猜测补齐。</p> : null}
      {panel && panel.count > 0 ? (
        <AccountDataGroups
          actions={props.actions}
          copy={props.copy}
          groups={panel.groups}
          locateRequest={props.locateRequest}
          weeklyFarming={props.weeklyFarming}
        />
      ) : (
        <AccountInlineState title={emptyTitle} detail={emptyDetail} />
      )}
      {/*
        账号级事实只挂在「全部」末尾。它答的是「账号现在是什么样」，不是「还有什么没做完」，
        所以不进任何二级入口、不参与分段，清单为空时也照常显示（T91 第 7 节）。
      */}
      {!panel ? <AccountTodoFactGroup copy={props.copy} facts={props.viewModel.todo.accountFacts} /> : null}
    </section>
  );
}

/**
 * 账号级事实三行：光等、邮政官、容量。只读行，没有展开区，也没有可点的动作——
 * 行的用途是常驻参考，不是待办项（T91 第 7 节）。
 */
function AccountTodoFactGroup(props: {
  copy: AccountCopy;
  facts: AccountTodoFactsView;
}) {
  const [isOpen, setIsOpen] = useState(true);
  if (!props.facts.items.length) return null;
  const snapshotLabel = props.facts.observedAt
    ? `${accountText(props.copy, "账号快照")} ${formatCompactDateTime(props.facts.observedAt)}`
    : accountText(props.copy, "账号快照");
  return (
    <details
      className="account-data-group"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary>
        <span>
          <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{props.facts.label}</strong>
          <small data-ui-part="detail" data-info-priority="support" data-text-tone="body">{props.facts.description}</small>
        </span>
        <b>{props.facts.items.length} 项</b>
      </summary>
      <div className="account-readonly-list">
        {props.facts.items.map((fact) => (
          <div
            className="account-readonly-row"
            data-interactive="false"
            data-status={fact.statusTone}
            data-surface="row"
            key={fact.key}
          >
            <span className="item-icon-placeholder" aria-hidden="true" />
            <span>
              <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{fact.label}</strong>
              <small data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{fact.detail}</small>
              <span className="account-action-primary">
                <span>{fact.factLabel}</span>
                <strong>{fact.factValue}</strong>
              </span>
            </span>
            <span className="account-action-trail">
              <em data-status={fact.statusTone}>{fact.statusLabel}</em>
              <small>{snapshotLabel}</small>
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}

function AccountDataGroups(props: {
  actions: AccountPageActions;
  copy: AccountCopy;
  groups: AccountReadonlyGroupView[];
  locateRequest?: AccountTodoLocateRequest;
  weeklyFarming?: LibraryWeeklyFarmingView;
}) {
  return (
    <div className="account-data-groups">
      {props.groups.map((group) => (
        <AccountDataGroup
          actions={props.actions}
          copy={props.copy}
          group={group}
          key={group.key}
          locateRequest={props.locateRequest}
          weeklyFarming={props.weeklyFarming}
        />
      ))}
    </div>
  );
}

function AccountDataGroup(props: {
  actions: AccountPageActions;
  copy: AccountCopy;
  group: AccountReadonlyGroupView;
  locateRequest?: AccountTodoLocateRequest;
  weeklyFarming?: LibraryWeeklyFarmingView;
}) {
  const [isOpen, setIsOpen] = useState(Boolean(props.group.defaultOpen));
  useEffect(() => {
    if (props.group.defaultOpen) setIsOpen(true);
  }, [props.group.defaultOpen]);
  return (
    <details
      className="account-data-group"
      data-status={props.group.status}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary>
        <span>
          <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{props.group.label}</strong>
          <small data-ui-part="detail" data-info-priority="support" data-text-tone="body">{props.group.description}</small>
        </span>
        <b>{props.group.items.length} 项</b>
      </summary>
      <div className="account-readonly-list">
        {props.group.items.length
          ? props.group.items.map((item) => (
            item.facts?.length
              ? (
                <AccountActionRow
                  actions={props.actions}
                  copy={props.copy}
                  item={item}
                  key={item.key}
                  locateRequest={props.locateRequest}
                  weeklyFarming={props.weeklyFarming}
                />
              )
              : <AccountReadonlyRow copy={props.copy} item={item} key={item.key} />
          ))
          : <AccountInlineState title="当前没有数据" detail="当前没有可显示的条目。" />}
      </div>
    </details>
  );
}

/**
 * 行动行：正面是这一项是什么、现在什么状态，展开后是这条判断的事实来源。
 * 挑战行的展开区再嵌一块本周刷取，掉落武器、推荐和图样缺口都挂在同一行的这一面里，
 * 不再各占一个二级入口。
 */
function AccountActionRow(props: {
  actions: AccountPageActions;
  copy: AccountCopy;
  item: AccountReadonlyItemView;
  locateRequest?: AccountTodoLocateRequest;
  weeklyFarming?: LibraryWeeklyFarmingView;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const stateTone = props.item.statusTone ?? (props.item.isComplete ? "success" : "neutral");
  const stateLabel = props.item.timeLabel ?? props.item.statusLabel ?? accountText(props.copy, "只读");
  useEffect(() => {
    if (!props.locateRequest || props.item.activityKey !== props.locateRequest.activityKey) return;
    // 依赖里带上 activityKey：深度链接可能早于挑战数据到达，那一刻这一行还不存在。
    setIsOpen(true);
  }, [props.locateRequest?.requestId, props.item.activityKey]);
  return (
    <details
      className="account-action-details"
      data-activity-key={props.item.activityKey}
      data-power={props.item.isPower ? "true" : undefined}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="account-readonly-row" data-surface="row" data-interactive="true" data-status={stateTone}>
        <AccountReadonlyIcon item={props.item} />
        <span>
          <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{props.item.name}</strong>
          <small data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{props.item.typeLabel} · {props.item.sourceLabel}</small>
          {props.item.primaryFactLabel && props.item.primaryFactValue ? (
            <span className="account-action-primary">
              <span>{props.item.primaryFactLabel}</span>
              <strong>{props.item.primaryFactValue}</strong>
            </span>
          ) : null}
        </span>
        <span className="account-action-trail">
          <em data-status={stateTone}>{stateLabel}</em>
          <b className="account-action-disclosure">{accountText(props.copy, "详细数据")}</b>
        </span>
      </summary>
      <div className="account-action-body">
        <dl className="account-fact-table">
          {props.item.facts?.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
              <dd className="fact-source">{fact.source}</dd>
            </div>
          ))}
        </dl>
        {props.item.isPower && props.weeklyFarming && props.item.activityKey ? (
          <div className="account-action-weekly">
            <WeeklyFarmingPanel
              activityKey={props.item.activityKey}
              actions={{
                onRefreshWeeklyRotation: props.actions.refreshWeeklyRotation,
                onRefreshWeeklyFarming: props.actions.refreshWeeklyFarming,
                onOpenWeeklyFarmingItem: props.actions.openWeeklyFarmingItem
              }}
              weekly={props.weeklyFarming}
            />
          </div>
        ) : null}
      </div>
    </details>
  );
}

function AccountReadonlyRow(props: { copy: AccountCopy; item: AccountReadonlyItemView }) {
  const stateLabel = props.item.statusLabel ?? (props.item.isComplete
    ? accountText(props.copy, "已完成")
    : typeof props.item.progressPercent === "number"
      ? accountText(props.copy, "进行中")
      : accountText(props.copy, "只读"));
  const stateTone = props.item.statusTone ?? (props.item.isComplete ? "success" : typeof props.item.progressPercent === "number" ? "pending" : undefined);
  return (
    <div className="account-readonly-row" data-surface="row" data-interactive="false" data-status={stateTone}>
      <AccountReadonlyIcon item={props.item} />
      <span>
        <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{props.item.name}</strong>
        <small data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{props.item.typeLabel} · {props.item.sourceLabel}</small>
        {typeof props.item.progressPercent === "number" ? (
          <span className={`account-readonly-progress ${props.item.isComplete ? "complete" : ""}`.trim()}>
            <progress max={100} value={props.item.progressPercent} aria-label={props.item.progressLabel} />
            <small>{props.item.progressLabel}</small>
          </span>
        ) : null}
      </span>
      <em data-ui-part="state" data-info-priority="support" data-text-tone="meta" data-status={stateTone}>{stateLabel}</em>
    </div>
  );
}

function AccountReadonlyIcon(props: { item: AccountReadonlyItemView }) {
  return <GameAssetImage src={props.item.icon} alt="" fallback={<span className="item-icon-placeholder" aria-hidden="true" />} />;
}

function AccountMaterialsGroup(props: {
  defaultOpen?: boolean;
  interfaceLocale: InterfaceLocale;
  viewModel: AccountPageViewModel;
  copy: AccountCopy;
}) {
  const rows = props.viewModel.materials.rows;
  const [isOpen, setIsOpen] = useState(Boolean(props.defaultOpen));
  return (
    <details className="account-data-group account-material-group" open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary>
        <span>
          <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">材料清单</strong>
          <small data-ui-part="detail" data-info-priority="support" data-text-tone="body">账号级数量，不属于角色装备</small>
        </span>
        <b>{rows.length} 种</b>
      </summary>
      {rows.length ? (
        <div className="account-material-list">
          {rows.map((row) => (
            <div className="account-material-row" key={row.key}>
              <GameAssetImage className="account-material-icon" src={row.material.icon} alt="" fallback={<span className="item-icon-placeholder" aria-hidden="true" />} />
              <div className="account-material-main">
                <strong>{row.material.name}</strong>
                <small>{row.meta}</small>
              </div>
              <span className="account-material-quantity">{row.material.quantity.toLocaleString(props.interfaceLocale)}</span>
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
  panelRef: RefObject<HTMLElement | null>;
  power: CharacterPowerView;
  isSyncing: boolean;
  dataState: AccountPageViewModel["connection"]["dataState"];
  snapshotAt?: string | number | Date | null;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"baseline" | "executable">("baseline");
  const value = mode === "baseline" ? props.power.dropBaseline : props.power.executablePower;
  const baselineGaps = props.power.dropBaseline.rows
    .map((row, index) => {
      const executableRow = props.power.maxEquippable.rows[index];
      if (typeof row.power !== "number") return null;
      const executablePower = executableRow?.power;
      if (typeof executablePower !== "number" || row.power <= executablePower) return null;
      return { row, gap: row.power - executablePower };
    })
    .filter((entry): entry is { row: CharacterPowerValueView["rows"][number]; gap: number } => Boolean(entry))
    .sort((left, right) => right.gap - left.gap || (right.row.power ?? 0) - (left.row.power ?? 0))
    .slice(0, 3);
  const isComplete = props.power.dropBaseline.complete && props.power.maxEquippable.complete;
  const statusLabel = props.isSyncing
    ? accountText(props.copy, "同步中")
    : props.dataState === "cached"
      ? accountText(props.copy, "显示缓存数据")
      : isComplete
        ? accountText(props.copy, "数据已确认")
        : accountText(props.copy, "数据不完整");
  return (
    <section ref={props.panelRef} className="account-power-panel" id={props.id} data-surface="dialog" data-ui-kind="dialog" role="dialog" aria-modal="true" aria-label={accountText(props.copy, "光等详情")} onClick={(event) => event.stopPropagation()}>
      <div className="account-power-panel-head">
        <span>
          <strong>{accountText(props.copy, "光等详情")}</strong>
          <small>{props.snapshotAt ? `${accountText(props.copy, "更新时间")} ${formatCompactDateTime(props.snapshotAt)}` : accountText(props.copy, "基于当前账号快照")}</small>
        </span>
        <span className={`ui-badge status-${props.isSyncing || !isComplete ? "warning" : "ready"}`} data-status={props.isSyncing || !isComplete ? "warning" : "success"}>
          {statusLabel}
        </span>
        <button type="button" className="account-power-close" data-ui-kind="button" data-control-variant="quiet" aria-label={accountText(props.copy, "关闭光等详情")} title={accountText(props.copy, "关闭光等详情")} onClick={props.onClose}>×</button>
      </div>
      <div className="account-power-summary account-power-summary-triple" aria-label={accountText(props.copy, "光等方案摘要")}>
        <span>
          <small>{accountText(props.copy, "当前装备光等")}</small>
          <strong>{props.power.currentLabel}</strong>
        </span>
        <span>
          <small>{accountText(props.copy, "可装备最高光等")}</small>
          <PowerFractionValue value={props.power.maxEquippable} />
        </span>
        <span>
          <small>{accountText(props.copy, "奖励掉落基准")}</small>
          <PowerFractionValue value={props.power.dropBaseline} />
        </span>
      </div>
      <p className="account-power-explanation">
        {!props.power.dropBaseline.complete
          ? accountText(props.copy, "奖励掉落基准正在等待完整账号装备数据。")
          : props.power.dropBaseline.label === props.power.maxEquippable.label
            ? accountText(props.copy, "奖励掉落基准与当前角色可装备最高一致。")
            : accountText(props.copy, "奖励掉落基准按整个账号每个位置的最高装备计算，不代表当前角色可以直接穿上这些装备。")}
      </p>
      {baselineGaps.length ? (
        <section className="account-power-baseline-gaps" aria-label={accountText(props.copy, "奖励基准差异来源")}>
          <strong>{accountText(props.copy, "影响奖励基准的装备")}</strong>
          <div>
            {baselineGaps.map(({ row, gap }) => (
              <div className="account-power-baseline-gap" key={row.key}>
                <span>{accountText(props.copy, row.label)}</span>
                <strong>{row.power}（+{gap}）</strong>
                <small>{formatPowerSource(row, props.copy)} · {formatPowerAvailability(row, props.copy)}</small>
              </div>
            ))}
          </div>
        </section>
      ) : isComplete ? (
        <p className="account-power-explanation account-power-explanation-positive">{accountText(props.copy, "当前角色可装备最高已达到账号奖励掉落基准。")}</p>
      ) : (
        <p className="account-power-explanation">{accountText(props.copy, "光等差异正在等待完整账号数据。")}</p>
      )}
      <div className="account-power-modes" role="group" aria-label={accountText(props.copy, "光等查看方式")}>
        <button type="button" data-ui-kind="button" data-control-variant={mode === "baseline" ? "primary" : "secondary"} aria-pressed={mode === "baseline"} onClick={() => setMode("baseline")}>
          {accountText(props.copy, "奖励基准构成")}
        </button>
        <button type="button" data-ui-kind="button" data-control-variant={mode === "executable" ? "primary" : "secondary"} aria-pressed={mode === "executable"} onClick={() => setMode("executable")}>
          {accountText(props.copy, "可执行最高方案")}
        </button>
      </div>
      <div className="account-power-rows">
        <div className="account-power-row account-power-column-head" aria-hidden="true">
          <span>{accountText(props.copy, "位置")}</span>
          <span>{accountText(props.copy, "装备与来源")}</span>
          <span>{accountText(props.copy, "光等")}</span>
          <span>{accountText(props.copy, "均值差")}</span>
        </div>
        {value.rows.map((row) => (
          <div className="account-power-row" key={row.key}>
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
        <span>{mode === "baseline" ? accountText(props.copy, "奖励掉落基准") : accountText(props.copy, "可执行最高方案")} <PowerFractionValue value={value} /></span>
        <span>{accountText(props.copy, "数据来源")} {props.snapshotAt ? formatCompactDateTime(props.snapshotAt) : accountText(props.copy, "当前账号快照")}</span>
      </div>
      <p className={props.power.executableMatchesAccountMaximum ? "account-power-note" : "account-power-note warning"}>
        {mode === "baseline"
          ? accountText(props.copy, "奖励掉落基准是奖励计算参考，不保证下一件奖励补最低槽位。")
          : !props.power.maxEquippable.complete || !props.power.executablePower.complete
          ? accountText(props.copy, "缺少至少一个光等槽位，当前无法生成完整的最高光等装备方案。")
          : props.power.executableMatchesAccountMaximum
            ? accountText(props.copy, "当前角色与仓库中的方案已达到账号最高光等。")
            : props.power.hasExternalSources
              ? accountText(props.copy, "账号内还有更高光等装备在其他角色身上；本次不会自动跨角色转移。")
              : accountText(props.copy, "当前角色方案与账号最高光等不一致，请刷新账号后再复核。")}
      </p>
    </section>
  );
}

function formatPowerAvailability(
  row: CharacterPowerValueView["rows"][number],
  copy: AccountCopy
): string {
  if (row.availability === "current") return accountText(copy, "当前角色可用");
  if (row.availability === "transferable") return accountText(copy, "转移后可用");
  if (row.availability === "different-class") return accountText(copy, "当前角色不可装备");
  return accountText(copy, "状态待确认");
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

function focusAccountPanel(section: AccountSection): void {
  const panel = document.getElementById(`account-panel-${section}`);
  const firstControl = panel?.querySelector<HTMLElement>(
    'button:not([disabled]), summary, a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
  );
  (firstControl ?? panel)?.focus();
}

function useAccountDirectoryOrientation(): "horizontal" | "vertical" {
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">("vertical");

  useEffect(() => {
    const workspace = document.getElementById("account-workspace");
    if (!workspace) return;
    const applyOrientation = (width: number) => setOrientation(width <= 700 ? "horizontal" : "vertical");
    applyOrientation(workspace.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) applyOrientation(entry.contentRect.width);
    });
    observer.observe(workspace);
    return () => observer.disconnect();
  }, []);

  return orientation;
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
  recommendationSummaryByInstance?: VaultRecommendationSummaryIndex;
}) {
  const categories = accountCategoryOrder
    .map((category) => ({
      key: category,
      label: accountText(props.copy, accountCategoryLabels[category]),
      rows: props.rows.filter((row) => row.category === category)
    }))
    .filter((category) => category.rows.length > 0);

  if (!categories.length) {
    return <AccountInlineState title={accountText(props.copy, "当前角色没有装备位置数据")} detail={accountText(props.copy, "当前角色资料未返回可按位置展示的装备或背包物品。")} />;
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
                    copy: props.copy,
                    recommendationSummaryByInstance: props.recommendationSummaryByInstance
                  })}
                </section>
                <section className="account-slot-column account-inventory-panel" aria-label={accountText(props.copy, "当前角色背包候选")}>
                  <h5>{accountText(props.copy, "当前角色背包候选")}</h5>
                  {renderAccountItemGrid(row.inventoryItems, "inventory", {
                    onOpenItem: props.onOpenItem,
                    copy: props.copy,
                    recommendationSummaryByInstance: props.recommendationSummaryByInstance
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
    recommendationSummaryByInstance?: VaultRecommendationSummaryIndex;
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
        copy: props.copy,
        recommendationSummaryByInstance: props.recommendationSummaryByInstance
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
    recommendationSummaryByInstance?: VaultRecommendationSummaryIndex;
  }
) {
  const className = [
    "account-slot-item",
    source,
    item.canOpenDetail ? "is-interactive" : "is-readonly",
    item.isPending ? "pending" : "",
    item.isSyncing ? "syncing" : "",
    item.isLoadoutMatch ? "loadout-highlight" : ""
  ].filter(Boolean).join(" ");
  const status = item.isPending
    ? {
        kind: "pending",
        label: accountText(props.copy, "打开中"),
        description: accountText(props.copy, "正在打开详情")
      }
    : item.isSyncing
      ? {
          kind: "pending",
          label: accountText(props.copy, "同步中"),
          description: accountText(props.copy, "写入已完成，正在同步游戏状态")
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
  const recommendation = accountRecommendationSummary(item, props.recommendationSummaryByInstance);
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
          {recommendation
            ? <small className="account-slot-item-recommendation" data-status={recommendation.tone} title={recommendation.title}>{recommendation.text}</small>
            : stateFacts ? <small title={stateFacts}>{stateFacts}</small> : null}
          {recommendation && item.openPayload.item.locked ? (
            <em data-status="success" title={accountText(props.copy, "已锁定")} aria-label={accountText(props.copy, "已锁定")}>锁定</em>
          ) : null}
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
      aria-busy={item.isPending || item.isSyncing}
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

function accountRecommendationSummary(
  item: AccountItemView,
  recommendationSummaryByInstance?: VaultRecommendationSummaryIndex
): { text: string; title: string; tone: "ready" | "warning" | "error" | "pending" | "neutral" } | undefined {
  if (item.openPayload.item.group_key !== "weapons") return undefined;
  const instanceKey = item.openPayload.item.instance_id ?? `hash:${item.openPayload.item.hash}`;
  const summaries = recommendationSummaryByInstance?.get(instanceKey) ?? [];
  const strongest = summaries[0];
  if (!strongest) return undefined;
  const remainingSourceCount = Math.max(0, summaries.length - 1);
  return {
    text: `${strongest.shortLabel} ${strongest.resultText}${remainingSourceCount ? ` · 另 ${remainingSourceCount} 个来源` : ""}`,
    title: summaries.map((summary) => summary.detail).join("\n"),
    tone: strongest.state === "full" || strongest.state === "core"
      ? "ready"
      : strongest.state === "close" || strongest.state === "weapon_only"
        ? "warning"
        : strongest.state === "key_missing" || strongest.state === "not_matched"
          ? "error"
          : strongest.state === "uncheckable"
            ? "pending"
            : "neutral"
  };
}
