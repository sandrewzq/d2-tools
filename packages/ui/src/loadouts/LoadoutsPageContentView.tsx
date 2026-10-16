import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import type {
  ArmorPlannerCandidateView,
  ArmorPlannerMode,
  ArmorPlannerWorkspaceJob,
  ArmorPlannerWorkspaceState
} from "@d2-tools/app/armor";
import type {
  ApplicationLoadoutCompareColumnSubtitle,
  ApplicationLoadoutCompareColumnTitle,
  ApplicationLoadoutCompareRowLabel,
  ApplicationLoadoutCompareValue,
  ApplicationLoadoutCountUnit,
  ApplicationLoadoutDirectoryEntryView,
  ApplicationLoadoutItemStatus,
  ApplicationLoadoutLibraryViewModel,
  ApplicationLoadoutNavigationState,
  ApplicationLoadoutPlugGroupKey,
  ApplicationLoadoutScreen,
  ApplicationLoadoutSelectionMessage,
  ApplicationLoadoutWearBlockReason,
  ApplicationLoadoutWearLabel,
  ApplicationLoadoutCompareViewModel,
  ApplicationLoadoutDetailView,
  ApplicationLoadoutInGameReference,
  CrossSourceLink,
  InGameItemLocationView,
  InGameLoadoutItemRowView,
  LoadoutCompareSlot,
  LoadoutEntryView,
  LoadoutSourceKind,
  LoadoutsPageModel
} from "@d2-tools/app/loadouts";
import type {
  AssistantLoadoutArtifact,
  AssistantEquipmentTargetCandidatesArtifact
} from "@d2-tools/app/capabilities";
import { getActiveApplicationLoadoutScreen, getLocalLoadoutPlanAccountItems } from "@d2-tools/app/loadouts";
import type { AccountItemSummary, AccountSummary, CharacterLoadoutSlotItemSummary } from "@d2-tools/core/account/summary";
import { armorSlots, type ArmorClass, type ArmorSetConstraint, type ArmorSlot } from "@d2-tools/core/armor";
import type { ArmorSetCatalogEntry } from "@d2-tools/core/items/equipableItemSet";
import {
  createDefaultArmorStatModSlotRules,
  loadoutPlanArmorStatKeys,
  matchLocalLoadoutPlan,
  normalizeLoadoutPlanArmorStatModSlotRules,
  summarizeEquippedSubclassStatBonuses,
  summarizeLoadoutPlanArmorStatModRules,
  type CreateLocalLoadoutPlanInput,
  type LoadoutPlanArmorConstraints,
  type LoadoutPlanArmorStatKey,
  type LoadoutPlanArmorStatModSlotRule,
  type LocalLoadoutPlanItemMatch
} from "@d2-tools/core/loadouts/plans";
import type { DimLoadoutExportResult, DimLoadoutImportPreview } from "@d2-tools/core/loadouts/dimImport";
import type {
  LocalLoadoutPlanExecutionPlan,
  LocalLoadoutPlanPublishPlan
} from "@d2-tools/core/loadouts/localPlanExecution";
import type { LoadoutTemplate } from "@d2-tools/core/loadouts/templates";
import type { LoadoutTemplateAnalysis } from "@d2-tools/core/loadouts/analysis";
import type { LoadoutActionFeedbackState } from "./loadoutActionFeedback.js";
import type { LoadoutsCopy, InterfaceLocale } from "../i18n/types.js";
import { getLocaleCopy } from "../i18n/copy.js";
import { loadoutTemplate, loadoutText } from "./loadoutCopy.js";
import { getRovingFocusIndex } from "../interaction/rovingFocus.js";
import { GameAssetImage } from "../media/GameAssetImage.js";
import { useGuardedNavigation, useNavigationGuard } from "../navigation/NavigationGuard.js";
import {
  ProductWorkspaceEmptyState,
  ProductWorkspaceSideRail,
  ProductWorkspaceSplit
} from "../workspace/ProductWorkspace.js";

export type LoadoutsPageActions = {
  selectEntry: (entryId: string) => void;
  selectTemplate: (id: string) => void;
  selectLocalPlan: (id: string) => void;
  editLocalPlan: (id: string) => void;
  pushApplicationLoadoutScreen: (screen: ApplicationLoadoutScreen) => void;
  replaceApplicationLoadoutScreen: (screen: ApplicationLoadoutScreen) => void;
  popApplicationLoadoutScreen: () => void;
  consumeApplicationLoadoutFocusRequest: () => void;
  toggleApplicationLoadoutCompare: (id: string) => void;
  applicationLoadoutInGameReferenceChange: (reference: ApplicationLoadoutInGameReference | null) => void;
  applicationLoadoutShowDiffOnlyChange: (value: boolean) => void;
  selectCompareTemplate: (id: string) => void;
  renameDraftChange: (value: string) => void;
  showDiffOnlyChange: (value: boolean) => void;
  renameTemplate: (template: LoadoutTemplate) => void;
  deleteTemplate: (id: string) => void;
  createLocalPlanFromCharacter: (character: AccountSummary["characters"][number]) => void;
  startNewLocalPlan: (character: AccountSummary["characters"][number] | null) => void;
  startLocalPlanFromCharacter: (character: AccountSummary["characters"][number] | null) => void;
  startLocalPlanFromInGameLoadout: (
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number]
  ) => void;
  localPlanDraftChange: (draft: CreateLocalLoadoutPlanInput) => void;
  saveLocalPlan: () => void;
  /** 「改一套」的第二个出口：新建一套，原来那套不动。 */
  saveLocalPlanAsNew: () => void;
  closeLocalPlanEditor: () => void;
  deleteLocalPlan: (id: string) => void;
  previewDimImport: (url: string) => void;
  acceptDimImport: (character: AccountSummary["characters"][number] | null) => void;
  dismissDimImport: () => void;
  copyDimLoadoutLink: () => void;
  executeLocalPlan: () => void;
  publishLocalPlanToSlot?: (loadoutIndex: number) => void;
  importGuideSource: (sourceInput: string, character: AccountSummary["characters"][number] | null) => Promise<boolean>;
  acceptAssistantEquipmentTargets: (
    artifact: AssistantEquipmentTargetCandidatesArtifact,
    candidateIds: string[],
    character: AccountSummary["characters"][number] | null
  ) => boolean;
  dismissAssistantPrefill: () => void;
  dismissArmorResultTrace?: () => void;
  createTransferPlan: (template: LoadoutTemplate) => void;
  copyMissingItems: (template: LoadoutTemplate, analysis: LoadoutTemplateAnalysis | null) => void;
  executeMissingTransfer: (template: LoadoutTemplate, analysis: LoadoutTemplateAnalysis | null) => void;
  executeSingleItemTransfer: (template: LoadoutTemplate, item: LoadoutTemplate["items"][number]) => void;
  equipSingleItem: (template: LoadoutTemplate, item: LoadoutTemplate["items"][number]) => void;
  equipSavedLoadout: (
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number]
  ) => void;
  snapshotCurrentLoadout: (
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number]
  ) => void;
  clearSavedLoadout: (
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number]
  ) => void;
  updateSavedLoadoutIdentifiers: (
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number],
    identifiers: { name_hash?: number; icon_hash?: number; color_hash?: number }
  ) => void;
  openInGameItemDetail: (item: AccountItemSummary) => void;
  openTemplateSourceItem: (item: LoadoutTemplate["items"][number], templateCharacterId?: string) => void;
  planArmor?: (job: ArmorPlannerWorkspaceJob) => void;
  resetArmorPlanner?: () => void;
  saveArmorAcquisitionTargets?: (
    candidate: Extract<ArmorPlannerCandidateView, { kind: "acquisition" }>,
    targetClass: ArmorClass
  ) => void;
};

export type LoadoutsPageContentViewProps = {
  accountSummary: AccountSummary | null;
  interfaceLocale?: InterfaceLocale;
  model: LoadoutsPageModel;
  actions: LoadoutsPageActions;
  compareTemplateId: string;
  renameDraft: string;
  showDiffOnly: boolean;
  message: string;
  /** 回执色调由产出方给，不从文案里猜字。 */
  messageTone: "info" | "error";
  isRunningItemAction: boolean;
  actionFeedback: Record<string, LoadoutActionFeedbackState>;
  applicationLoadoutNavigation: ApplicationLoadoutNavigationState;
  applicationLoadoutLibrary: ApplicationLoadoutLibraryViewModel;
  applicationLoadoutCompare: ApplicationLoadoutCompareViewModel;
  localPlanDraft: CreateLocalLoadoutPlanInput | null;
  localPlanIsDirty: boolean;
  localPlanEditingId: string | null;
  /** 正在编辑的那条已保存方案的名称；草稿可能已被改名，覆盖目标要用记录里的名字点名。 */
  localPlanSavedName?: string | null;
  localPlanIsSaving: boolean;
  localPlanError: string;
  dimPreview: DimLoadoutImportPreview | null;
  localPlanIsPreviewingDim: boolean;
  localPlanDimExport: DimLoadoutExportResult | null;
  localPlanDimExportFeedback: string;
  /** DIM 导出反馈的色调，由产出方给；不从文案里猜字。 */
  localPlanDimExportTone: "info" | "error";
  localPlanExecutionPlan: LocalLoadoutPlanExecutionPlan | null;
  localPlanExecutionReport: {
    plan: LocalLoadoutPlanExecutionPlan;
    completed_steps: string[];
    failed_step?: string;
    error?: string;
    confirmation_id?: string;
    execution_id?: string;
    verification_status?: "verified" | "partial" | "mismatch" | "unavailable";
    verification_logged?: boolean;
    preflight_verified: boolean;
    refresh_verified: boolean;
  } | null;
  localPlanIsExecuting: boolean;
  localPlanPublishReport?: {
    plan: LocalLoadoutPlanPublishPlan;
    confirmation_id: string;
    execution_id: string;
    preflight_verified: boolean;
    verification_status?: "verified" | "partial" | "mismatch" | "unavailable";
    verification_logged?: boolean;
    error?: string;
  } | null;
  localPlanIsPublishing?: boolean;
  localPlanIsImportingGuide: boolean;
  localPlanLegacyGuideText: string;
  localPlanAssistantPrefill: (AssistantLoadoutArtifact & { request_id: number }) | null;
  armorPlannerState?: ArmorPlannerWorkspaceState;
  armorSetCatalog?: ArmorSetCatalogEntry[];
  armorSetCatalogStatus?: "loading" | "ready" | "error";
  armorTargetFeedback?: string;
  /** 护甲待刷反馈的色调，同样由产出方给。 */
  armorTargetTone?: "info" | "error";
  isSavingArmorTargets?: boolean;
  armorResultTraceRequest?: { resultId: string; candidateId: string; requestId: number } | null;
  accountDataStatus?: "cached" | "stale" | "refreshing" | "ready" | "error";
  accountDataMessage?: string;
  accountDataSource?: "local" | "remote" | "merged";
  accountDataFetchedAt?: string;
  accountDataError?: string;
};

type LoadoutMode = "in-game" | "local";
const loadoutModes: LoadoutMode[] = ["in-game", "local"];
type LoadoutCreateFlow = "none" | "dim" | "guide";

export function LoadoutsPageContentView(props: LoadoutsPageContentViewProps) {
  // 子职业术语（技能 / 星象 / 碎片 / 空槽位）与页面外壳、顶层状态走 copy 查表，
  // 英文界面不再回落中文。页面其余文案仍是写死的中文，整页迁移另开切片。
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").loadouts;
  const [mode, setMode] = useState<LoadoutMode>("local");
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [createFlow, setCreateFlow] = useState<LoadoutCreateFlow>("none");
  const sourceMenuRef = useRef<HTMLDetailsElement>(null);
  useNavigationGuard(props.localPlanDraft && props.localPlanIsDirty ? {
    title: loadoutText(copy, "离开配装并放弃未保存修改？"),
    description: loadoutText(copy, "当前应用配装包含尚未保存的修改。离开配装页会丢失这些草稿内容，已保存方案和游戏内槽位不会改变。"),
    confirmLabel: loadoutText(copy, "放弃并离开"),
    cancelLabel: loadoutText(copy, "继续编辑")
  } : null);
  const tabId = useId();
  const panelId = `${tabId}-panel`;
  const characters = props.accountSummary?.characters ?? [];
  const activeCharacterId = selectedCharacterId || characters[0]?.character_id || "";
  const activeCharacter = characters.find((character) => character.character_id === activeCharacterId) ?? null;
  const activeApplicationScreen = getActiveApplicationLoadoutScreen(props.applicationLoadoutNavigation);
  const focusedApplicationFlow = mode === "local"
    && activeApplicationScreen.kind !== "library"
    && activeApplicationScreen.kind !== "compare";
  const inGameEntries = useMemo(
    () => props.model.entries.filter((entry) => entry.source === "in-game" && entry.characterId === activeCharacterId),
    [activeCharacterId, props.model.entries]
  );
  useEffect(() => {
    if (mode !== "in-game" || !inGameEntries.length) return;
    if (props.model.selectedDetail.kind === "in-game-slot" && props.model.selectedDetail.characterId === activeCharacterId) return;
    props.actions.selectEntry(inGameEntries[0].id);
  }, [activeCharacterId, inGameEntries, mode, props.actions, props.model.selectedDetail]);

  useEffect(() => {
    if (props.localPlanDraft) setMode("local");
  }, [props.localPlanDraft]);

  useEffect(() => {
    if (!props.localPlanAssistantPrefill) return;
    setMode("local");
    setCreateFlow("guide");
  }, [props.localPlanAssistantPrefill?.request_id]);

  useEffect(() => {
    if (!props.localPlanLegacyGuideText) return;
    setMode("local");
    setCreateFlow("guide");
  }, [props.localPlanLegacyGuideText]);

  useEffect(() => {
    if (!props.armorResultTraceRequest) return;
    setMode("local");
    setCreateFlow("none");
  }, [props.armorResultTraceRequest?.requestId]);

  useEffect(() => {
    function closeSourceMenu(event: PointerEvent) {
      if (sourceMenuRef.current?.contains(event.target as Node)) return;
      sourceMenuRef.current?.removeAttribute("open");
    }

    function closeSourceMenuWithKeyboard(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (event.key !== "Escape" || !sourceMenuRef.current?.open) return;
      sourceMenuRef.current.open = false;
      sourceMenuRef.current.querySelector<HTMLElement>("summary")?.focus();
    }

    document.addEventListener("pointerdown", closeSourceMenu);
    document.addEventListener("keydown", closeSourceMenuWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeSourceMenu);
      document.removeEventListener("keydown", closeSourceMenuWithKeyboard);
    };
  }, []);

  function selectMode(nextMode: LoadoutMode) {
    setMode(nextMode);
    if (nextMode !== "local") setCreateFlow("none");
    if (nextMode === "in-game" && inGameEntries[0]) {
      props.actions.selectEntry(inGameEntries[0].id);
    }
  }

  function handleModeKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = loadoutModes.indexOf(mode);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? loadoutModes.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + loadoutModes.length) % loadoutModes.length;
    const nextMode = loadoutModes[nextIndex];
    selectMode(nextMode);
    document.getElementById(`${tabId}-${nextMode}`)?.focus();
  }

  function selectCharacter(characterId: string) {
    setSelectedCharacterId(characterId);
    const entry = props.model.entries.find((item) => item.source === "in-game" && item.characterId === characterId);
    if (entry && mode === "in-game") props.actions.selectEntry(entry.id);
  }

  function handleCharacterKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    const nextIndex = getRovingFocusIndex({
      key: event.key,
      currentIndex,
      itemCount: characters.length,
      orientation: "horizontal"
    });
    if (nextIndex === null) return;
    event.preventDefault();
    const nextCharacter = characters[nextIndex];
    if (!nextCharacter) return;
    selectCharacter(nextCharacter.character_id);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>("button")[nextIndex]
      ?.focus();
  }

  function createFromCurrentCharacter(details: HTMLDetailsElement) {
    details.open = false;
    props.actions.startLocalPlanFromCharacter(activeCharacter);
  }

  function openDimImport(details: HTMLDetailsElement) {
    details.open = false;
    setCreateFlow("dim");
  }

  function createBlankPlan(details: HTMLDetailsElement) {
    details.open = false;
    setCreateFlow("none");
    props.actions.startNewLocalPlan(activeCharacter);
  }

  const statusTone = props.messageTone === "error"
    ? "error"
    : props.isRunningItemAction
      ? "running"
      : !activeCharacter
        ? "warning"
        : "ready";
  const statusTitle = props.isRunningItemAction
    ? loadoutText(copy, "处理中")
    : props.message ? loadoutText(copy, "操作状态") : !activeCharacter ? loadoutText(copy, "等待账号") : loadoutText(copy, "就绪");
  const statusMessage = props.message
    || (!activeCharacter
      ? mode === "local"
        ? loadoutText(copy, "账号角色尚未读取；仍可查看和比较应用配装，穿戴与账号装备选择暂不可用。")
        : loadoutText(copy, "账号角色尚未读取，游戏内配装操作暂不可用。")
      : mode === "in-game"
        ? loadoutText(copy, "选择游戏内配装槽位后再应用或保存当前装备。")
        : loadoutText(copy, "应用配装保存在本应用中，只有显式穿戴或保存到游戏内槽位才会写入 Bungie。"));

  return (
    <section className="loadout-page" data-flow={focusedApplicationFlow ? "focused" : "browse"} aria-label={loadoutText(copy, "配装工作台")}>
      {!focusedApplicationFlow ? <div className="loadout-context-toolbar" data-surface="section">
        <div className="loadout-context-group">
          <span className="loadout-context-label">{loadoutText(copy, "角色")}</span>
          <div className="loadout-character-tabs" data-ui-kind="context-switcher" role="group" aria-label={loadoutText(copy, "配装角色上下文")}>
            {characters.map((character, index) => {
              const active = activeCharacterId === character.character_id;
              // 职业名是应用内映射产出的文案，切界面语言时要跟着走。
              const classNameText = loadoutText(copy, character.class_name);
              return (
                <button
                  type="button"
                  aria-pressed={active}
                  tabIndex={active ? 0 : -1}
                  key={character.character_id}
                  onClick={() => selectCharacter(character.character_id)}
                  onKeyDown={(event) => handleCharacterKeyDown(event, index)}
                >
                  <span className="loadout-character-mark" aria-hidden="true">{classNameText.slice(0, 1)}</span>
                  <strong>{classNameText}</strong>
                  <small>{loadoutTemplate(copy, "{count} 槽", { count: character.loadout_slots.length })}</small>
                </button>
              );
            })}
            {!characters.length ? <span className="loadout-character-empty">{loadoutText(copy, "未读取角色")}</span> : null}
          </div>
        </div>

        <span className="loadout-context-divider" aria-hidden="true" />

        <div className="loadout-context-group">
          <span className="loadout-context-label">{loadoutText(copy, "视图")}</span>
          <div className="loadout-mode-tabs" data-ui-kind="segmented-control" role="tablist" aria-label={loadoutText(copy, "配装类型")}>
            <button id={`${tabId}-in-game`} type="button" role="tab" aria-controls={panelId} aria-selected={mode === "in-game"} tabIndex={mode === "in-game" ? 0 : -1} onKeyDown={handleModeKeyDown} onClick={() => selectMode("in-game")}>{loadoutText(copy, "游戏内配装")} <span>Bungie</span></button>
            <button id={`${tabId}-local`} type="button" role="tab" aria-controls={panelId} aria-selected={mode === "local"} tabIndex={mode === "local" ? 0 : -1} onKeyDown={handleModeKeyDown} onClick={() => selectMode("local")}>{loadoutText(copy, "应用配装")} <span>d2-tools</span></button>
          </div>
        </div>

        {mode === "local" ? (
          <div className="loadout-context-actions">
            <details ref={sourceMenuRef} className="loadout-create-menu">
              <summary data-ui-kind="button" data-control-variant="primary" aria-haspopup="true">{loadoutText(copy, "新建配装")}</summary>
              <div className="loadout-create-options" data-surface="menu" data-ui-kind="command-menu" aria-label={loadoutText(copy, "应用配装创建方式")}>
                <button type="button" disabled={!activeCharacter || props.isRunningItemAction} onClick={(event) => createFromCurrentCharacter(event.currentTarget.closest("details")!)}>
                  <strong>{loadoutText(copy, "使用当前装备")}</strong>
                  <span>{loadoutText(copy, "使用当前角色已装备内容")}</span>
                </button>
                <button type="button" onClick={(event) => openDimImport(event.currentTarget.closest("details")!)}>
                  <strong>{loadoutText(copy, "更多：导入 DIM")}</strong>
                  <span>{loadoutText(copy, "从自包含的完整链接预填配装，全程本地解析")}</span>
                </button>
                <button type="button" disabled={!activeCharacter || props.isRunningItemAction} onClick={(event) => createBlankPlan(event.currentTarget.closest("details")!)}>
                  <strong>{loadoutText(copy, "空白方案")}</strong>
                  <span>{loadoutText(copy, "带入目标角色后逐槽位创建")}</span>
                </button>
              </div>
            </details>
          </div>
        ) : null}
      </div> : null}

      <div className={`loadout-content-frame${focusedApplicationFlow ? " loadout-content-frame-focused" : ""}`} data-surface="workspace-frame" data-ui-kind="workspace-frame">
        {!focusedApplicationFlow || props.isRunningItemAction || props.messageTone === "error" ? <div className={`loadout-operation-status ${statusTone}`} data-surface="section" data-status={statusTone === "running" ? "pending" : statusTone === "ready" ? "success" : statusTone} aria-live="polite">
          <span aria-hidden="true" />
          <strong>{statusTitle}</strong>
          <p>{statusMessage}</p>
        </div> : null}

        <div id={panelId} className="loadout-workspace-panel" role="tabpanel" aria-labelledby={`${tabId}-${mode}`}>
          {mode === "in-game" ? (
            <InGameWorkspace
              activeCharacter={activeCharacter}
              entries={inGameEntries}
              copy={copy}
              isRunningItemAction={props.isRunningItemAction}
              model={props.model}
              actions={props.actions}
              accountDataStatus={props.accountDataStatus}
              accountDataMessage={props.accountDataMessage}
              accountDataSource={props.accountDataSource}
              accountDataFetchedAt={props.accountDataFetchedAt}
              accountDataError={props.accountDataError}
            />
          ) : (
            <LocalWorkspace
              {...props}
              activeCharacter={activeCharacter}
              createFlow={createFlow}
              onCloseDimImport={() => { setCreateFlow("none"); props.actions.dismissDimImport(); }}
              onCloseGuideImport={() => setCreateFlow("none")}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function InGameWorkspace(props: {
  activeCharacter: AccountSummary["characters"][number] | null;
  entries: LoadoutEntryView[];
  copy: LoadoutsCopy;
  isRunningItemAction: boolean;
  model: LoadoutsPageModel;
  actions: LoadoutsPageActions;
  accountDataStatus?: LoadoutsPageContentViewProps["accountDataStatus"];
  accountDataMessage?: string;
  accountDataSource?: LoadoutsPageContentViewProps["accountDataSource"];
  accountDataFetchedAt?: string;
  accountDataError?: string;
}) {
  const [isSlotPickerVisible, setIsSlotPickerVisible] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const detail = props.model.selectedDetail.kind === "in-game-slot"
    && props.model.selectedDetail.characterId === props.activeCharacter?.character_id
    ? props.model.selectedDetail
    : null;
  const slots = props.activeCharacter?.loadout_slots ?? [];
  const selectedSlot = slots.find((slot) => slot.index === selectedSlotIndex) ?? detail?.slot ?? slots[0] ?? null;

  useEffect(() => {
    setIsSlotPickerVisible(false);
    setSelectedSlotIndex(null);
  }, [props.activeCharacter?.character_id]);

  return (
    <ProductWorkspaceSplit className="loadout-workspace loadout-native-workspace">
      <ProductWorkspaceSideRail element="aside" className="loadout-directory">
        <div className="loadout-column-head"><div><strong>{loadoutText(props.copy, "Bungie 游戏内配装")}</strong><small>{loadoutTemplate(props.copy, "{count} 个已保存槽位", { count: props.entries.length })}</small></div></div>
        <div className="loadout-entry-list" data-surface="list">
          {props.entries.map((entry) => {
            const selected = props.model.selectedEntryId === entry.id;
            return (
              <button type="button" key={entry.id} aria-pressed={selected} data-status="success" className="loadout-directory-row" onClick={() => props.actions.selectEntry(entry.id)}>
                <span className="loadout-directory-index">{String((entry.slotIndex ?? 0) + 1).padStart(2, "0")}</span>
                <span><strong>{entry.title || loadoutTemplate(props.copy, "配装栏 {index}", { index: (entry.slotIndex ?? 0) + 1 })}</strong><small>{loadoutTemplate(props.copy, "{count} 件保存装备", { count: entry.slot?.item_count ?? 0 })}{entry.sourceLink ? loadoutTemplate(props.copy, " · 对得上 {name}", { name: entry.sourceLink.plan_name }) : ""}</small></span>
                <em>Bungie</em>
              </button>
            );
          })}
          {!props.entries.length ? <p className="loadout-rail-empty">{loadoutText(props.copy, "当前角色没有已保存的游戏内配装槽位。")}</p> : null}
        </div>
      </ProductWorkspaceSideRail>

      <section className="loadout-detail">
        <InGameAccountFreshness
          copy={props.copy}
          status={props.accountDataStatus}
          message={props.accountDataMessage}
          source={props.accountDataSource}
          fetchedAt={props.accountDataFetchedAt}
          error={props.accountDataError}
        />
        {detail && props.activeCharacter ? (
          <InGameLoadoutSlotDetail
            detail={detail}
            slots={slots}
            copy={props.copy}
            isRunningItemAction={props.isRunningItemAction}
            actions={props.actions}
            onOpenSlotPicker={() => setIsSlotPickerVisible((visible) => !visible)}
          />
        ) : (
          <div className="loadout-empty-detail-head">
            <ProductWorkspaceEmptyState><h2>{loadoutText(props.copy, "没有可查看的游戏内配装")}</h2><p>{loadoutText(props.copy, "当前角色没有包含装备的 Bungie 配装槽位，仍可把当前装备保存到任意真实槽位。")}</p></ProductWorkspaceEmptyState>
            {props.activeCharacter && slots.length ? <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={props.isRunningItemAction} onClick={() => setIsSlotPickerVisible((visible) => !visible)}>{loadoutText(props.copy, "用当前装备覆盖槽位")}</button> : null}
          </div>
        )}
        {isSlotPickerVisible && props.activeCharacter ? (
          <InGameSlotPicker
            copy={props.copy}
            character={props.activeCharacter}
            selectedSlot={selectedSlot}
            isRunningItemAction={props.isRunningItemAction}
            onSelectSlot={setSelectedSlotIndex}
            onSave={(slot) => props.actions.snapshotCurrentLoadout(props.activeCharacter!, slot)}
          />
        ) : null}
      </section>

      <aside className="loadout-summary">
        {detail ? <InGameSummary detail={detail} sourceLink={props.entries.find((entry) => entry.id === props.model.selectedEntryId)?.sourceLink ?? null} copy={props.copy} /> : <LoadoutSummaryEmpty copy={props.copy} />}
      </aside>
    </ProductWorkspaceSplit>
  );
}

function InGameLoadoutSlotDetail(props: {
  detail: Extract<LoadoutsPageModel["selectedDetail"], { kind: "in-game-slot" }>;
  slots: AccountSummary["characters"][number]["loadout_slots"];
  copy: LoadoutsCopy;
  isRunningItemAction: boolean;
  actions: LoadoutsPageActions;
  onOpenSlotPicker: () => void;
}) {
  const { character, slot } = props.detail;
  const itemGroups = [
    {
      key: "weapon",
      label: loadoutText(props.copy, "武器"),
      rows: props.detail.itemRows.filter((row) => row.category === "weapon")
    },
    {
      key: "armor",
      label: loadoutText(props.copy, "护甲"),
      rows: props.detail.itemRows.filter((row) => row.category === "armor")
    },
    {
      key: "subclass",
      label: loadoutText(props.copy, "子职业"),
      rows: props.detail.itemRows.filter((row) => row.category === "subclass")
    },
    {
      key: "artifact",
      label: loadoutText(props.copy, "神器"),
      rows: props.detail.itemRows.filter((row) => row.category === "artifact")
    },
    {
      key: "other",
      label: loadoutText(props.copy, "其他"),
      rows: props.detail.itemRows.filter((row) => row.category === "other")
    }
    // 子职业那一组空着也留着：槽位里没有子职业记录是玩家要知道的事实，
    // 整组消失和「本来就没有」在画面上分不清。武器/护甲/神器同理，但它们空着时整条记录也是空的。
  ].filter((group) => group.rows.length || group.key === "subclass");
  return (
    <>
      <header className="loadout-detail-head">
        <div><span className="loadout-eyebrow">{loadoutTemplate(props.copy, "游戏内配装 · 槽位 {index}", { index: String(slot.index + 1).padStart(2, "0") })}</span><h2>{slot.name || loadoutTemplate(props.copy, "配装栏 {index}", { index: slot.index + 1 })}</h2><p>{character.class_name} · {loadoutText(props.copy, "Bungie 保存的装备记录。未返回的 Perk、技能和模组不会在这里伪造显示。")}</p></div>
        <div className="loadout-action-stack">
          <div className="loadout-action-group" aria-label={loadoutText(props.copy, "官方槽位操作")}>
            <span>{loadoutText(props.copy, "官方槽位")}</span>
            <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={props.isRunningItemAction} onClick={() => props.actions.equipSavedLoadout(character, slot)}>{loadoutText(props.copy, "应用游戏内配装")}</button>
            <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isRunningItemAction} onClick={props.onOpenSlotPicker}>{loadoutText(props.copy, "用当前装备覆盖槽位")}</button>
            <button type="button" data-ui-kind="button" data-control-variant="danger" disabled={props.isRunningItemAction || !slot.item_count} onClick={() => props.actions.clearSavedLoadout(character, slot)}>{loadoutText(props.copy, "清空槽位")}</button>
          </div>
          <div className="loadout-action-group" aria-label={loadoutText(props.copy, "配装辅助操作")}>
            <span>{loadoutText(props.copy, "配装辅助")}</span>
            <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.actions.startLocalPlanFromInGameLoadout(character, slot)}>{loadoutText(props.copy, "复制到应用配装")}</button>
          </div>
        </div>
      </header>
      <div className="loadout-section-label"><span>{loadoutText(props.copy, "保存的装备 · 当前账号状态")}</span><span>{loadoutTemplate(props.copy, "{count} 件记录", { count: slot.items.length })}</span></div>
      {props.detail.itemRows.length ? (
        <div className="loadout-in-game-item-groups" data-surface="content-stack">
          {itemGroups.map((group) => (
            <section className="loadout-in-game-item-group" key={group.key} aria-label={group.label}>
              <header><strong>{group.label}</strong><span>{loadoutTemplate(props.copy, "{count} 件", { count: group.rows.length })}</span></header>
              <div className="loadout-in-game-item-list" data-surface="list">
                {group.rows.map((row, index) => <InGameLoadoutItemRow key={`${character.character_id}-${slot.index}-${row.item.instance_id ?? row.item.item_hash ?? index}`} row={row} copy={props.copy} onOpenItemDetail={props.actions.openInGameItemDetail} />)}
                {group.rows.length ? null : <p className="loadout-in-game-item-empty">{loadoutText(props.copy, "这个槽位没有保存子职业记录。整组消失与「本来就没有」在画面上分不清，所以这里显式留一行。")}</p>}
              </div>
            </section>
          ))}
        </div>
      ) : <ProductWorkspaceEmptyState><h3>{loadoutText(props.copy, "当前槽位为空")}</h3><p>{loadoutText(props.copy, "可以把当前角色已装备的物品保存到此槽位。")}</p></ProductWorkspaceEmptyState>}
      <InGameIdentifierEditor copy={props.copy} character={character} slot={slot} slots={props.slots} isRunningItemAction={props.isRunningItemAction} onSubmit={props.actions.updateSavedLoadoutIdentifiers} />
      <footer className="loadout-detail-footer"><p>{loadoutText(props.copy, "应用时直接调用 Bungie 槽位，d2-tools 不会预先转移或逐件装备。")}</p></footer>
    </>
  );
}

function InGameAccountFreshness(props: {
  copy: LoadoutsCopy;
  status?: LoadoutsPageContentViewProps["accountDataStatus"];
  message?: string;
  source?: LoadoutsPageContentViewProps["accountDataSource"];
  fetchedAt?: string;
  error?: string;
}) {
  const label = props.error
    ? loadoutTemplate(props.copy, "装备数据同步失败：{error}", { error: props.error })
    : props.message
      || (props.status === "refreshing"
        ? loadoutText(props.copy, "正在同步装备数据")
        : props.status === "stale"
          ? loadoutText(props.copy, "装备数据可能已过期")
          : props.status === "cached"
            ? loadoutText(props.copy, "使用上次装备数据")
            : props.status === "ready"
              ? loadoutText(props.copy, "装备数据已同步")
              : loadoutText(props.copy, "装备数据状态待确认"));
  const sourceLabel = props.source === "local"
    ? loadoutText(props.copy, "本地缓存")
    : props.source === "remote"
      ? loadoutText(props.copy, "游戏数据")
      : props.source === "merged"
        ? loadoutText(props.copy, "本地缓存与游戏数据")
        : "";
  const detail = [sourceLabel, props.fetchedAt ? loadoutTemplate(props.copy, "更新于 {time}", { time: props.fetchedAt }) : ""].filter(Boolean).join(" · ");
  return (
    <div className="loadout-application-freshness loadout-in-game-freshness" data-status={props.error || props.status === "error" ? "warning" : props.status === "ready" ? "success" : "neutral"}>
      <span aria-hidden="true" />
      <strong>{label}</strong>
      <small>{detail || loadoutText(props.copy, "装备名称、位置和模组配置来自当前账号数据补充；Bungie 槽位本身仍可直接应用。")}</small>
    </div>
  );
}

function InGameLoadoutItemRow(props: { row: InGameLoadoutItemRowView; copy: LoadoutsCopy; onOpenItemDetail: (item: AccountItemSummary) => void }) {
  const { item, locatedItem, located } = props.row;
  const locationLabel = formatInGameItemLocation(props.copy, props.row.location);
  const plugEntries = (item.plugs ?? []).filter((plug) => Boolean(plug.name));
  const plugNames = plugEntries.map((plug) => plug.name);
  const subclassConfiguration = item.subclass_configuration;
  // 子职业的插槽内容已经按技能 / 星象 / 碎片分好组，折叠摘要再平铺前三个反而看不出结构：
  // 一串没有归类的名字读不出这套构筑有几个星相、几个碎片。
  const plugSummaryLabel = subclassConfiguration
    ? loadoutTemplate(props.copy, "{abilities} 技能 · {aspects} 星相 · {fragments} 碎片", {
        abilities: subclassConfiguration.abilities.length,
        aspects: subclassConfiguration.aspects.length,
        fragments: subclassConfiguration.fragments.length
      })
    : null;
  const stateLabel = located
    ? props.row.equipped_on_target_character ? loadoutText(props.copy, "当前已装备") : loadoutText(props.copy, "已定位")
    : loadoutText(props.copy, "未定位");
  const stateDetail = props.row.equipped_on_target_character
    ? loadoutText(props.copy, "目标角色")
    : located ? loadoutText(props.copy, "等待 Bungie 应用") : loadoutText(props.copy, "不阻止直接应用");
  const traceLabel = item.instance_id
    ? loadoutTemplate(props.copy, "装备标识 …{suffix}", { suffix: item.instance_id.slice(-4) })
    : typeof item.item_hash === "number"
      ? loadoutTemplate(props.copy, "装备定义 {hash} · 具体装备未返回", { hash: item.item_hash })
      : loadoutText(props.copy, "未返回装备定义或标识");
  const plugSummary = plugNames.length
    ? plugNames.join("、")
    : props.row.plug_count ? loadoutTemplate(props.copy, "{count} 项未解析配置", { count: props.row.plug_count }) : loadoutText(props.copy, "未返回模组配置");
  return (
    <details className="loadout-in-game-item-card" data-surface="object-card" data-ui-kind="object-card" data-status={located ? "success" : "warning"}>
      <summary className="loadout-in-game-item-row">
        <ItemVisual icon={locatedItem?.icon ?? item.icon} label={item.name} bucketName={item.bucket_name} />
          <span className="loadout-in-game-item-copy">
            <strong>{item.name}</strong>
          <span className="loadout-in-game-item-meta">{item.bucket_name || loadoutTemplate(props.copy, "{category}槽位未解析", { category: inGameItemCategoryLabel(props.copy, props.row.category) })}</span>
          <span className="loadout-in-game-item-trace">{traceLabel}</span>
        </span>
        <span className="loadout-in-game-item-facts">
          <span className="loadout-in-game-location">{locationLabel}</span>
          {/* 折叠行只放名字：带上「配置位置 N ·」前缀后名字被 chip 的宽度截成半截，
              位置信息在展开后的「已确认配置」里本来就全列着。 */}
          <span className="loadout-in-game-plugs">
            {plugSummaryLabel
              ? <span>{plugSummaryLabel}</span>
              : <>
                  {plugEntries.slice(0, 3).map((plug, index) => <span key={`${plug.name}-${plug.socket_index ?? index}`}>{plug.name}</span>)}
                  {plugNames.length > 3 ? <span>+{plugNames.length - 3}</span> : null}
                  {!plugNames.length ? <span>{props.row.plug_count ? loadoutTemplate(props.copy, "{count} 项配置", { count: props.row.plug_count }) : loadoutText(props.copy, "模组配置未返回")}</span> : null}
                </>}
          </span>
        </span>
        <span className="loadout-in-game-item-state">
          <em data-status={located ? "success" : "warning"}>{stateLabel}</em>
          <small>{stateDetail}</small>
        </span>
        <span className="loadout-in-game-item-chevron" aria-hidden="true">⌄</span>
      </summary>
      <dl className="loadout-in-game-item-extra">
        <div><dt>{loadoutText(props.copy, "当前位置")}</dt><dd>{locationLabel}</dd></div>
        <div><dt>{loadoutText(props.copy, "配置类型")}</dt><dd>{plugNames.length ? loadoutText(props.copy, "已读取模组配置") : props.row.plug_count ? loadoutText(props.copy, "配置名称尚未解析") : loadoutText(props.copy, "未返回配置")}</dd></div>
        {/* 子职业的插槽内容由下面的「子职业构筑」分组展开，这里不再把同一份数据平铺列一遍。 */}
        {subclassConfiguration ? null : <div><dt>{loadoutText(props.copy, "已确认配置")}</dt><dd>{plugEntries.length ? plugEntries.map((plug) => formatSocketPlugLabel(props.copy, plug.name, plug.socket_index)).join("、") : plugSummary}</dd></div>}
        {subclassConfiguration ? <div className="loadout-in-game-subclass-detail"><dt>{loadoutText(props.copy, "子职业构筑")}</dt><dd>
          <InGameSubclassDetail configuration={subclassConfiguration} copy={props.copy} />
        </dd></div> : null}
        <div><dt>{loadoutText(props.copy, "核对结果")}</dt><dd>{located ? props.row.equipped_on_target_character ? loadoutText(props.copy, "目标角色已处于槽位保存状态") : loadoutText(props.copy, "具体装备已找到，应用时由 Bungie 处理") : loadoutText(props.copy, "保留原始记录，不根据名称猜测具体装备")}</dd></div>
        {locatedItem ? <div className="loadout-in-game-item-actions"><dt>{loadoutText(props.copy, "装备操作")}</dt><dd><button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onOpenItemDetail(locatedItem)}>{loadoutText(props.copy, "查看装备详情与操作")}</button><small>{loadoutText(props.copy, "转移、穿戴和模组修改会作用于真实装备；如需更新此槽位，完成后再覆盖保存。")}</small></dd></div> : null}
      </dl>
    </details>
  );
}

function formatSocketPlugLabel(copy: LoadoutsCopy, name: string, socketIndex?: number): string {
  return typeof socketIndex === "number" ? loadoutTemplate(copy, "配置位置 {index} · {name}", { index: socketIndex + 1, name }) : name;
}

/**
 * 游戏内配装的子职业构筑。
 *
 * 四组都画出来，空组不删：这一组没读到是事实，删掉之后分不清「本来就没有」和「没渲染」。
 * 空槽位没有 plug 可分组，只能按 `empty_socket_indexes` 单列一行——Manifest 的插槽布局
 * 不在账号摘要里，硬把空位塞进某一组是编的。
 */
function InGameSubclassDetail(props: {
  configuration: NonNullable<CharacterLoadoutSlotItemSummary["subclass_configuration"]>;
  copy: LoadoutsCopy;
}) {
  const groups = [
    { key: "abilities", label: loadoutText(props.copy, "超能与技能"), plugs: props.configuration.abilities },
    { key: "aspects", label: loadoutText(props.copy, "星象"), plugs: props.configuration.aspects },
    { key: "fragments", label: loadoutText(props.copy, "碎片"), plugs: props.configuration.fragments },
    { key: "other", label: loadoutText(props.copy, "其他配置"), plugs: props.configuration.other }
  ];
  const emptyIndexes = props.configuration.empty_socket_indexes;
  return (
    <>
      {groups.map((group) => (
        <section key={group.key} data-empty={group.plugs.length ? undefined : true}>
          <strong>{group.label}{group.plugs.length ? ` ${group.plugs.length}` : ""}</strong>
          {group.plugs.length ? (
            <span className="loadout-plug-chip-list">
              {group.plugs.map((plug) => (
                <span className="loadout-plug-chip" key={`${group.key}-${plug.hash}-${plug.socket_index ?? 0}`}>
                  <GameAssetImage className="loadout-plug-icon" src={plug.icon} alt="" />
                  {formatSocketPlugLabel(props.copy, plug.name, plug.socket_index)}
                </span>
              ))}
            </span>
          ) : <span className="loadout-plug-empty">{loadoutText(props.copy, "未读取到")}</span>}
        </section>
      ))}
      {emptyIndexes.length ? (
        <section data-empty="true">
          <strong>{loadoutTemplate(props.copy, "空槽位 {count}", { count: emptyIndexes.length })}</strong>
          <span className="loadout-plug-empty">
            {emptyIndexes.map((index) => loadoutTemplate(props.copy, "位置 {index}", { index: index + 1 })).join("、")}
            {loadoutTemplate(props.copy, " · 整个子职业共 {sockets} 格", { sockets: props.configuration.socket_count })}
          </span>
        </section>
      ) : null}
    </>
  );
}

/** 装备位置：身份由 app 给（`source_kind` 加角色 id），措辞在这里查表。 */
function loadoutSourceKindLabel(copy: LoadoutsCopy, kind: LoadoutSourceKind): string {
  return kind === "equipped"
    ? loadoutText(copy, "已装备")
    : kind === "inventory"
      ? loadoutText(copy, "背包")
      : kind === "postmaster"
        ? loadoutText(copy, "邮政官")
        : loadoutText(copy, "仓库");
}

function formatInGameItemLocation(copy: LoadoutsCopy, location: InGameItemLocationView): string {
  if (location.kind === "no_instance_id") return loadoutText(copy, "未提供实例 ID");
  if (location.kind === "unlocated") return loadoutText(copy, "当前账号未定位");
  return [loadoutSourceKindLabel(copy, location.source_kind), location.character_name].filter(Boolean).join(" · ");
}

function inGameItemCategoryLabel(copy: LoadoutsCopy, category: InGameLoadoutItemRowView["category"]): string {
  return category === "weapon"
    ? loadoutText(copy, "武器")
    : category === "armor"
      ? loadoutText(copy, "护甲")
      : category === "subclass"
        ? loadoutText(copy, "子职业")
        : category === "artifact"
          ? loadoutText(copy, "神器")
          : loadoutText(copy, "装备");
}

function InGameIdentifierEditor(props: {
  copy: LoadoutsCopy;
  character: AccountSummary["characters"][number];
  slot: AccountSummary["characters"][number]["loadout_slots"][number];
  slots: AccountSummary["characters"][number]["loadout_slots"];
  isRunningItemAction: boolean;
  onSubmit: LoadoutsPageActions["updateSavedLoadoutIdentifiers"];
}) {
  const [nameHash, setNameHash] = useState(props.slot.name_hash);
  const [iconHash, setIconHash] = useState(props.slot.icon_hash);
  const [colorHash, setColorHash] = useState(props.slot.color_hash);
  useEffect(() => {
    setNameHash(props.slot.name_hash);
    setIconHash(props.slot.icon_hash);
    setColorHash(props.slot.color_hash);
  }, [props.slot.color_hash, props.slot.icon_hash, props.slot.name_hash]);
  const nameOptions = uniqueHashOptions(props.slots, "name_hash", (slot) => slot.name || loadoutTemplate(props.copy, "配装槽 {index}", { index: slot.index + 1 }));
  const iconOptions = uniqueHashOptions(props.slots, "icon_hash", (slot) => loadoutTemplate(props.copy, "图标 {index}", { index: slot.index + 1 }));
  const colorOptions = uniqueHashOptions(props.slots, "color_hash", (slot) => loadoutTemplate(props.copy, "颜色 {index}", { index: slot.index + 1 }));
  if (!nameOptions.length && !iconOptions.length && !colorOptions.length) return null;
  return (
    <details className="loadout-slot-picker">
      <summary>{loadoutText(props.copy, "修改官方标识")}</summary>
      <p>{loadoutText(props.copy, "仅可选择当前资料库已解析的 Bungie 标识 Hash，不支持自由文本命名。")}</p>
      <div className="loadout-compare-controls">
        {nameOptions.length ? <label><span>{loadoutText(props.copy, "名称")}</span><select value={nameHash ?? ""} onChange={(event) => setNameHash(numberOrUndefined(event.target.value))}>{nameOptions.map((option) => <option key={option.hash} value={option.hash}>{option.label}</option>)}</select></label> : null}
        {iconOptions.length ? <label><span>{loadoutText(props.copy, "图标")}</span><select value={iconHash ?? ""} onChange={(event) => setIconHash(numberOrUndefined(event.target.value))}>{iconOptions.map((option) => <option key={option.hash} value={option.hash}>{option.label}</option>)}</select></label> : null}
        {colorOptions.length ? <label><span>{loadoutText(props.copy, "颜色")}</span><select value={colorHash ?? ""} onChange={(event) => setColorHash(numberOrUndefined(event.target.value))}>{colorOptions.map((option) => <option key={option.hash} value={option.hash}>{option.label}</option>)}</select></label> : null}
        <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isRunningItemAction} onClick={() => props.onSubmit(props.character, props.slot, { name_hash: nameHash, icon_hash: iconHash, color_hash: colorHash })}>{loadoutText(props.copy, "更新标识")}</button>
      </div>
    </details>
  );
}

function InGameSlotPicker(props: {
  copy: LoadoutsCopy;
  character: AccountSummary["characters"][number];
  selectedSlot: AccountSummary["characters"][number]["loadout_slots"][number] | null;
  isRunningItemAction: boolean;
  onSelectSlot: (index: number) => void;
  onSave: (slot: AccountSummary["characters"][number]["loadout_slots"][number]) => void;
}) {
  return (
    <section className="loadout-slot-picker" aria-label={loadoutText(props.copy, "用当前装备覆盖目标槽位")}>
      <header><div><strong>{loadoutText(props.copy, "用当前装备覆盖槽位")}</strong><small>{loadoutText(props.copy, "选择 Bungie 真实槽位；已有内容的槽位会在写入前再次确认覆盖。")}</small></div></header>
      <div className="loadout-slot-picker-list" data-surface="list">
        {props.character.loadout_slots.map((slot) => {
          const selected = props.selectedSlot?.index === slot.index;
          const occupied = slot.item_count > 0 || slot.items.length > 0;
          return (
            <button type="button" key={slot.index} aria-pressed={selected} data-status={occupied ? "warning" : "neutral"} onClick={() => props.onSelectSlot(slot.index)}>
              <span>{String(slot.index + 1).padStart(2, "0")}</span>
              <span><strong>{occupied ? slot.name || loadoutTemplate(props.copy, "配装栏 {index}", { index: slot.index + 1 }) : loadoutTemplate(props.copy, "空槽位 {index}", { index: slot.index + 1 })}</strong><small>{occupied ? loadoutTemplate(props.copy, "{count} 件装备 · 覆盖需要确认", { count: slot.item_count }) : loadoutText(props.copy, "保存当前角色已装备状态")}</small></span>
            </button>
          );
        })}
      </div>
      <footer><button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!props.selectedSlot || props.isRunningItemAction} onClick={() => props.selectedSlot && props.onSave(props.selectedSlot)}>{props.selectedSlot && (props.selectedSlot.item_count > 0 || props.selectedSlot.items.length > 0) ? loadoutText(props.copy, "确认覆盖") : loadoutText(props.copy, "保存到槽位")}</button></footer>
    </section>
  );
}

function InGameSummary(props: {
  detail: Extract<LoadoutsPageModel["selectedDetail"], { kind: "in-game-slot" }>;
  sourceLink: { plan_id: string; plan_name: string } | null;
  copy: LoadoutsCopy;
}) {
  const locatedCount = props.detail.itemRows.filter((row) => row.located).length;
  const missingCount = props.detail.itemRows.length - locatedCount;
  const equippedCount = props.detail.itemRows.filter((row) => row.equipped_on_target_character).length;
  const locatedElsewhereCount = Math.max(locatedCount - equippedCount, 0);
  return (
    <>
      <div className="loadout-column-head"><div><strong>{loadoutText(props.copy, "装备数据核对")}</strong><small>{loadoutText(props.copy, "当前同步结果")}</small></div></div>
      {props.sourceLink ? <p className="loadout-callout" data-ui-kind="callout" data-status="success">{loadoutTemplate(props.copy, "这个槽位对得上应用配装「{name}」，两侧内容一致。", { name: props.sourceLink.plan_name })}</p> : null}
      <dl className="loadout-ledger">
        <div><dt>{loadoutText(props.copy, "保存装备")}</dt><dd><b>{props.detail.itemRows.length}</b><small>{loadoutText(props.copy, "槽位实际返回的装备记录")}</small></dd></div>
        <div data-status="success"><dt>{loadoutText(props.copy, "已找到")}</dt><dd><b>{locatedCount}</b><small>{loadoutText(props.copy, "当前账号中可以找到具体装备")}</small></dd></div>
        <div data-status={missingCount ? "warning" : "success"}><dt>{loadoutText(props.copy, "未定位")}</dt><dd><b>{missingCount}</b><small>{loadoutText(props.copy, "不阻止 Bungie 直接应用")}</small></dd></div>
      </dl>
      <section className="loadout-summary-checks" aria-label={loadoutText(props.copy, "应用前核对")}>
        <h3>{loadoutText(props.copy, "应用前核对")}</h3>
        <ul>
          <li data-status="success"><span aria-hidden="true">✓</span><span>{loadoutTemplate(props.copy, "{count} 件装备已在目标角色身上。", { count: equippedCount })}</span></li>
          <li data-status="success"><span aria-hidden="true">✓</span><span>{loadoutTemplate(props.copy, "{count} 件装备已在背包、其他角色或仓库中定位。", { count: locatedElsewhereCount })}</span></li>
          {missingCount ? <li data-status="warning"><span aria-hidden="true">!</span><span>{loadoutTemplate(props.copy, "{count} 条记录未解析名称或具体装备位置。", { count: missingCount })}</span></li> : null}
        </ul>
      </section>
      <p className="loadout-guidance">{loadoutText(props.copy, "游戏内配装由 Bungie 直接应用。未定位记录用于账号核对，不代表官方槽位不可用，也不会被应用配装自动替换。")}</p>
    </>
  );
}

function LocalWorkspace(props: LoadoutsPageContentViewProps & {
  activeCharacter: AccountSummary["characters"][number] | null;
  createFlow: LoadoutCreateFlow;
  onCloseDimImport: () => void;
  onCloseGuideImport: () => void;
}) {
  const [compactLibraryPane, setCompactLibraryPane] = useState<"directory" | "detail">("directory");
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").loadouts;
  const requestNavigation = useGuardedNavigation();
  const screen = getActiveApplicationLoadoutScreen(props.applicationLoadoutNavigation);
  const compareIds = props.applicationLoadoutCompare.selected_plan_ids;
  const selectedDetail = props.applicationLoadoutLibrary.selected_detail;
  const selectedPlan = selectedDetail?.plan ?? null;
  const inGameReferences = (props.accountSummary?.characters ?? []).flatMap((character) => (
    character.loadout_slots.map((slot) => ({ character, slot }))
  ));

  useEffect(() => {
    if (!props.localPlanDraft || screen.kind !== "library") return;
    props.actions.pushApplicationLoadoutScreen({
      kind: "editor",
      draft_id: props.localPlanEditingId || "new",
      ...(props.localPlanEditingId ? { plan_id: props.localPlanEditingId } : {})
    });
  }, [props.actions, props.localPlanDraft, props.localPlanEditingId, screen.kind]);

  useEffect(() => {
    const focusRequestId = props.applicationLoadoutNavigation.focus_request_id;
    if (!focusRequestId) return;
    const focusTarget = document.getElementById(focusRequestId);
    if (!focusTarget) return;
    focusTarget.focus();
    props.actions.consumeApplicationLoadoutFocusRequest();
  }, [props.actions, props.applicationLoadoutNavigation.focus_request_id, props.localPlanDraft]);

  function openScreen(nextScreen: ApplicationLoadoutScreen) {
    props.actions.pushApplicationLoadoutScreen(nextScreen);
  }

  function toggleCompare(planId: string) {
    props.actions.toggleApplicationLoadoutCompare(planId);
  }

  function handleDirectoryKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    const nextIndex = getRovingFocusIndex({
      key: event.key,
      currentIndex,
      itemCount: props.applicationLoadoutLibrary.entries.length,
      orientation: "vertical"
    });
    if (nextIndex === null) return;
    event.preventDefault();
    const nextEntry = props.applicationLoadoutLibrary.entries[nextIndex];
    if (!nextEntry) return;
    props.actions.selectLocalPlan(nextEntry.id);
    document.getElementById(`loadout-application-plan-${nextEntry.id}`)?.focus();
  }

  const accountDataLabel = !props.accountSummary
    ? loadoutText(copy, "装备数据尚未同步")
    : props.accountDataError
    ? loadoutTemplate(copy, "装备数据同步失败：{error}", { error: props.accountDataError })
    : props.accountDataStatus === "refreshing"
    ? loadoutText(copy, "正在同步装备数据")
    : props.accountDataStatus === "stale"
      ? loadoutText(copy, "缓存可能已过期")
      : props.accountDataStatus === "cached"
        ? loadoutText(copy, "使用本地缓存")
        : props.accountDataStatus === "error"
          ? loadoutText(copy, "装备数据同步失败")
          : props.accountDataStatus === "ready"
            ? loadoutText(copy, "装备数据已同步")
            : loadoutText(copy, "装备数据状态待确认");
  const accountDataDetail = [
    props.accountDataSource === "local" ? loadoutText(copy, "本地缓存") : props.accountDataSource === "remote" ? loadoutText(copy, "游戏数据") : props.accountDataSource === "merged" ? loadoutText(copy, "本地缓存与游戏数据") : "",
    props.accountDataFetchedAt ? loadoutTemplate(copy, "更新于 {time}", { time: props.accountDataFetchedAt }) : ""
  ].filter(Boolean).join(" · ");

  if (screen.kind === "compare") {
    return (
      <ApplicationLoadoutCompare
        copy={copy}
        model={props.applicationLoadoutCompare}
        onBack={props.actions.popApplicationLoadoutScreen}
        onRemove={toggleCompare}
        onRemoveInGameReference={() => props.actions.applicationLoadoutInGameReferenceChange(null)}
        onShowDiffOnlyChange={props.actions.applicationLoadoutShowDiffOnlyChange}
        onSelect={(id) => { props.actions.selectLocalPlan(id); props.actions.popApplicationLoadoutScreen(); }}
      />
    );
  }

  if ((screen.kind === "editor" || screen.kind === "armor-planner" || screen.kind === "wear-review" || screen.kind === "item-picker" || screen.kind === "publish") && props.localPlanDraft) {
    const editorScreen = screen.kind === "armor-planner"
      ? "armor"
      : screen.kind === "wear-review"
        ? "wear"
        : screen.kind === "publish"
            ? "publish"
            : "editor";
    return (
      <div className="loadout-subpage" data-screen={editorScreen}>
        <LocalPlanEditor
          {...props}
          activeCharacter={props.activeCharacter}
          editorScreen={editorScreen}
          {...(screen.kind === "item-picker" ? { pickerSlot: screen.slot } : {})}
          onOpenWear={() => openScreen({ kind: "wear-review", plan_id: props.localPlanEditingId || "draft", return_focus_id: "loadout-open-wear-review" })}
          onOpenItemPicker={(slot) => openScreen({ kind: "item-picker", slot, return_focus_id: `loadout-slot-${standardSlotDomId(slot)}` })}
          onOpenPublish={() => openScreen({ kind: "publish", plan_id: props.localPlanEditingId || "draft", return_focus_id: "loadout-open-publish" })}
          onBack={() => {
            if (screen.kind === "armor-planner" || screen.kind === "wear-review" || screen.kind === "item-picker" || screen.kind === "publish") {
              props.actions.popApplicationLoadoutScreen();
              return;
            }
            requestNavigation(() => {
              props.actions.closeLocalPlanEditor();
              props.actions.popApplicationLoadoutScreen();
            });
          }}
        />
      </div>
    );
  }

  if (screen.kind !== "library") {
    return <section className="loadout-subpage"><header className="loadout-subpage-head"><button className="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.actions.popApplicationLoadoutScreen}>{loadoutText(copy, "返回方案库")}</button><div><h2>{loadoutText(copy, "当前页面需要一个应用配装草稿")}</h2><p>{loadoutText(copy, "草稿可能已关闭或删除。返回方案库后重新选择方案。")}</p></div></header></section>;
  }

  return (
    <ProductWorkspaceSplit className={`loadout-workspace loadout-local-workspace loadout-compact-${compactLibraryPane}`}>
      <ProductWorkspaceSideRail element="aside" className="loadout-directory">
        <div className="loadout-column-head"><div><strong>{loadoutText(copy, "应用配装")}</strong><small>{loadoutTemplate(copy, "{count} 个完整构筑方案", { count: props.applicationLoadoutLibrary.entries.length })}</small></div></div>
        <div className="loadout-entry-list" data-surface="list">
          {props.applicationLoadoutLibrary.entries.map((entry, index) => {
            const selected = entry.selected;
            return (
              <div className="loadout-application-directory-item" key={entry.id}>
                <button
                  id={`loadout-application-plan-${entry.id}`}
                  type="button"
                  aria-pressed={selected}
                  tabIndex={selected ? 0 : -1}
                  data-status={entry.status_tone}
                  className="loadout-directory-row"
                  onClick={() => { props.actions.selectLocalPlan(entry.id); setCompactLibraryPane("detail"); }}
                  onKeyDown={(event) => handleDirectoryKeyDown(event, index)}
                >
                  <span className="loadout-directory-index">{entry.status_tone === "warning" ? "!" : "A"}</span>
                  <span><strong>{entry.title}</strong><small>{loadoutText(copy, entry.class_name)} · {loadoutTemplate(copy, "{count} 个装备目标", { count: entry.item_count })}</small><small>{applicationLoadoutSourceLabel(copy, entry.source_label)}</small>{entry.in_game_link ? <small data-status={entry.in_game_link.tone}>{crossSourceLinkLabel(copy, entry.in_game_link)}</small> : null}</span>
                  <em data-status={entry.status_tone}>{applicationLoadoutWearLabel(copy, entry.status_label)}</em>
                </button>
                <label className="loadout-compare-toggle">
                  <input type="checkbox" checked={compareIds.includes(entry.id)} disabled={!compareIds.includes(entry.id) && compareIds.length >= 3} onChange={() => toggleCompare(entry.id)} />
                  <span>{loadoutText(copy, "对比")}</span>
                </label>
              </div>
            );
          })}
          {props.applicationLoadoutLibrary.empty ? <p className="loadout-rail-empty">{loadoutText(copy, "还没有应用配装。可以从当前装备或空白方案开始创建。")}</p> : null}
        </div>
        {compareIds.length ? <div className="loadout-compare-dock"><span>{applicationLoadoutSelectionMessageText(copy, props.applicationLoadoutCompare.selection_message)}</span>{inGameReferences.length ? <label><span>{loadoutText(copy, "游戏内只读参照")}</span><select value={props.applicationLoadoutCompare.in_game_reference_id ?? ""} onChange={(event) => { const reference = inGameReferences.find((candidate) => applicationLoadoutInGameReferenceId(candidate) === event.target.value) ?? null; props.actions.applicationLoadoutInGameReferenceChange(reference); }}><option value="">{loadoutText(copy, "不加入")}</option>{inGameReferences.map((reference) => <option key={applicationLoadoutInGameReferenceId(reference)} value={applicationLoadoutInGameReferenceId(reference)}>{reference.character.class_name} · {reference.slot.name || loadoutTemplate(copy, "槽位 {index}", { index: reference.slot.index + 1 })}</option>)}</select></label> : null}<button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!props.applicationLoadoutCompare.can_compare} onClick={() => openScreen({ kind: "compare", plan_ids: compareIds, show_diff_only: props.applicationLoadoutCompare.showDiffOnly, ...(props.applicationLoadoutCompare.in_game_reference_id ? { in_game_reference_id: props.applicationLoadoutCompare.in_game_reference_id } : {}), ...(selectedPlan ? { return_focus_id: `loadout-application-plan-${selectedPlan.id}` } : {}) })}>{loadoutText(copy, "比较方案")}</button></div> : null}
      </ProductWorkspaceSideRail>

      <section className="loadout-detail">
        <button type="button" className="loadout-compact-library-back" data-ui-kind="button" data-control-variant="secondary" onClick={() => setCompactLibraryPane("directory")}>{loadoutText(copy, "返回方案列表")}</button>
        {props.armorResultTraceRequest ? <ArmorResultTraceNotice {...props} copy={copy} /> : null}
        {props.createFlow === "dim" ? <DimImportPanel {...props} copy={copy} /> : null}
        {props.createFlow === "guide" ? <GuideImportPanel {...props} copy={copy} /> : null}
        {props.localPlanError ? <div className="loadout-capability-notice" data-ui-kind="callout" data-status="warning"><div><strong>{loadoutText(copy, "应用配装操作未完成")}</strong><p>{props.localPlanError}</p></div></div> : null}
        {selectedDetail ? (
          <ApplicationLoadoutDetail
            plan={selectedDetail.plan}
            detail={selectedDetail}
            copy={copy}
            accountDataLabel={[props.accountDataMessage || accountDataLabel, accountDataDetail].filter(Boolean).join(" · ")}
            accountDataStatus={props.accountDataStatus}
            compareSelected={compareIds.includes(selectedDetail.plan.id)}
            compareDisabled={!compareIds.includes(selectedDetail.plan.id) && compareIds.length >= 3}
            isExecuting={props.localPlanIsExecuting}
            onToggleCompare={() => toggleCompare(selectedDetail.plan.id)}
            onEdit={() => { props.actions.editLocalPlan(selectedDetail.plan.id); openScreen({ kind: "editor", draft_id: selectedDetail.plan.id, plan_id: selectedDetail.plan.id, return_focus_id: `loadout-application-plan-${selectedDetail.plan.id}` }); }}
            onWear={() => { props.actions.editLocalPlan(selectedDetail.plan.id); openScreen({ kind: "wear-review", plan_id: selectedDetail.plan.id, return_focus_id: `loadout-wear-plan-${selectedDetail.plan.id}` }); }}
            onDelete={() => props.actions.deleteLocalPlan(selectedDetail.plan.id)}
          />
        ) : <ProductWorkspaceEmptyState><h2>{loadoutText(copy, "选择一个应用配装")}</h2><p>{loadoutText(copy, "先查看方案内容和账号匹配情况，再决定比较、编辑或穿戴。")}</p></ProductWorkspaceEmptyState>}
      </section>

      <aside className="loadout-summary">
        {selectedDetail ? (
          <ApplicationLoadoutQuickActions
            copy={copy}
            planId={selectedDetail.plan.id}
            planName={selectedDetail.plan.name}
            summary={selectedDetail.match_summary}
            executionPlan={props.localPlanExecutionPlan}
            wearEnabled={selectedDetail.wear_enabled && props.accountDataStatus !== "error"}
            isExecuting={props.localPlanIsExecuting}
            onEdit={() => { props.actions.editLocalPlan(selectedDetail.plan.id); openScreen({ kind: "editor", draft_id: selectedDetail.plan.id, plan_id: selectedDetail.plan.id, return_focus_id: `loadout-application-plan-${selectedDetail.plan.id}` }); }}
            onWear={() => { props.actions.editLocalPlan(selectedDetail.plan.id); openScreen({ kind: "wear-review", plan_id: selectedDetail.plan.id, return_focus_id: `loadout-quick-wear-${selectedDetail.plan.id}` }); }}
          />
        ) : <LoadoutSummaryEmpty copy={copy} />}
      </aside>
    </ProductWorkspaceSplit>
  );
}

function ApplicationLoadoutDetail(props: {
  plan: ApplicationLoadoutDetailView["plan"];
  detail: ApplicationLoadoutDetailView;
  copy: LoadoutsCopy;
  accountDataLabel: string;
  accountDataStatus?: LoadoutsPageContentViewProps["accountDataStatus"];
  compareSelected: boolean;
  compareDisabled: boolean;
  isExecuting: boolean;
  onToggleCompare: () => void;
  onEdit: () => void;
  onWear: () => void;
  onDelete: () => void;
}) {
  const subclass = props.plan.subclass_target;
  const selectedCount = props.detail.match_summary?.selected_count ?? 0;
  const unresolvedCount = props.detail.wear_block_reasons.length;
  return (
    <div className="loadout-application-detail">
      <header className="loadout-detail-head">
        <div><span className="loadout-eyebrow">{loadoutTemplate(props.copy, "应用配装 · {class}", { class: props.plan.class_name })}</span><h2>{props.plan.name}</h2><p>{props.plan.source.label || loadoutText(props.copy, "由应用保存的完整构筑方案")} · {loadoutTemplate(props.copy, "更新于 {time}", { time: props.plan.updated_at || props.plan.created_at })}</p></div>
        <div className="loadout-action-stack">
          <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.compareDisabled} aria-pressed={props.compareSelected} onClick={props.onToggleCompare}>{props.compareSelected ? loadoutText(props.copy, "移出对比") : loadoutText(props.copy, "加入对比")}</button>
          <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onEdit}>{loadoutText(props.copy, "编辑")}</button>
          <button id={`loadout-wear-plan-${props.plan.id}`} type="button" data-ui-kind="button" data-control-variant="primary" disabled={props.isExecuting || !props.detail.wear_enabled || props.accountDataStatus === "error"} onClick={props.onWear}>{loadoutText(props.copy, "穿戴此方案")}</button>
        </div>
      </header>
      <div className="loadout-application-freshness" data-status={props.accountDataStatus === "error" ? "warning" : props.accountDataStatus === "ready" ? "success" : "neutral"}><span aria-hidden="true" /><strong>{props.accountDataLabel}</strong><small>{loadoutText(props.copy, "穿戴前会刷新并重新核对具体装备、位置、模组与能量。")}</small></div>
      <section className="loadout-build-overview" aria-label={loadoutText(props.copy, "构筑总览")}>
        <article><span>{loadoutText(props.copy, "子职业")}</span><strong>{subclass?.subclass_hash ? loadoutTemplate(props.copy, "定义 {value}", { value: subclass.subclass_hash }) : loadoutText(props.copy, "未配置")}</strong><small>{subclass ? loadoutTemplate(props.copy, "{aspects} 星相 · {fragments} 碎片", { aspects: subclass.aspect_hashes.length, fragments: subclass.fragment_hashes.length }) : loadoutText(props.copy, "可在编辑器中设置")}</small></article>
        <article><span>{loadoutText(props.copy, "装备目标")}</span><strong>{loadoutTemplate(props.copy, "{count} 项", { count: props.detail.configured_item_count })}</strong><small>{loadoutTemplate(props.copy, "{count} 项已选择具体装备", { count: selectedCount })}</small></article>
        <article data-status={unresolvedCount ? "warning" : "success"}><span>{loadoutText(props.copy, "账号核对")}</span><strong>{applicationLoadoutWearLabel(props.copy, props.detail.wear_label)}</strong><small>{unresolvedCount ? applicationLoadoutWearBlockReasonText(props.copy, props.detail.wear_block_reasons[0]) : loadoutText(props.copy, "基于当前账号数据")}</small></article>
      </section>
      <div className="loadout-section-label"><span>{loadoutText(props.copy, "装备与模组")}</span><span>{loadoutTemplate(props.copy, "{rows} 个目标 · {plugs} 项模组配置", { rows: props.detail.item_rows.length, plugs: props.detail.configured_plug_count })}</span></div>
      <div className="loadout-readonly-slot-grid">
        {props.detail.item_rows.map((row, index) => <ApplicationLoadoutSlot key={row.key} row={row} index={index} copy={props.copy} />)}
      </div>
      {!props.detail.item_rows.length ? <ProductWorkspaceEmptyState><h3>{loadoutText(props.copy, "此方案尚未配置装备")}</h3><p>{loadoutText(props.copy, "进入编辑器后可按武器和护甲位置选择具体装备。")}</p></ProductWorkspaceEmptyState> : null}
      {props.plan.notes ? <section className="loadout-plan-notes"><strong>{loadoutText(props.copy, "方案备注")}</strong><p>{props.plan.notes}</p></section> : null}
      <footer className="loadout-detail-footer loadout-danger-footer"><p>{loadoutText(props.copy, "应用配装与游戏内配装相互独立；只有穿戴验证成功后才能保存到游戏内槽位。")}</p><button type="button" data-ui-kind="button" data-control-variant="danger" onClick={props.onDelete}>{loadoutText(props.copy, "删除应用配装")}</button></footer>
    </div>
  );
}

function ApplicationLoadoutSlot(props: { row: ApplicationLoadoutDetailView["item_rows"][number]; index: number; copy: LoadoutsCopy }) {
  const representative = props.row.match?.candidates.find((candidate) => candidate.item.instance_id === props.row.selected_instance_id)
    ?? props.row.match?.candidates[0]
    ?? null;
  return (
    <article className="loadout-readonly-slot" data-surface="object-card" data-ui-kind="object-card" data-status={props.row.status_tone}>
      <ItemVisual icon={representative?.item.icon} label={representative?.item.name || props.row.slot} bucketName={props.row.slot} />
      <div><span>{props.row.slot || loadoutTemplate(props.copy, "装备 {index}", { index: props.index + 1 })}</span><strong>{representative?.item.name || (props.row.item_hash ? loadoutTemplate(props.copy, "定义 {value}", { value: props.row.item_hash }) : loadoutText(props.copy, "未配置"))}</strong><small>{props.row.plug_hashes.length ? loadoutTemplate(props.copy, "{count} 项目标模组", { count: props.row.plug_hashes.length }) : loadoutText(props.copy, "未指定模组")}</small></div>
      <em data-status={props.row.status_tone}>{applicationLoadoutItemStatusLabel(props.copy, props.row.status_label)}</em>
    </article>
  );
}

function ApplicationLoadoutQuickActions(props: {
  copy: LoadoutsCopy;
  planId: string;
  planName: string;
  summary: ApplicationLoadoutDetailView["match_summary"];
  executionPlan: LocalLoadoutPlanExecutionPlan | null;
  wearEnabled: boolean;
  isExecuting: boolean;
  onEdit: () => void;
  onWear: () => void;
}) {
  const issueCount = (props.summary?.missing_count ?? 0) + (props.summary?.plug_unavailable_count ?? 0) + (props.summary?.needs_selection_count ?? 0);
  return (
    <div className="loadout-quick-actions">
      <div className="loadout-column-head"><div><strong>{loadoutText(props.copy, "穿戴准备")}</strong><small>{props.planName}</small></div></div>
      <dl className="loadout-ledger">
        <div data-status="success"><dt>{loadoutText(props.copy, "已绑定")}</dt><dd><b>{props.summary?.selected_count ?? 0}</b><small>{loadoutText(props.copy, "账号中的具体装备")}</small></dd></div>
        <div data-status={issueCount ? "warning" : "success"}><dt>{loadoutText(props.copy, "待处理")}</dt><dd><b>{issueCount}</b><small>{loadoutText(props.copy, "需选择或补齐")}</small></dd></div>
        <div><dt>{loadoutText(props.copy, "执行步骤")}</dt><dd><b>{props.executionPlan?.executable_steps.length ?? 0}</b><small>{loadoutText(props.copy, "穿戴前重新生成")}</small></dd></div>
      </dl>
      <section className="loadout-summary-checks"><h3>{loadoutText(props.copy, "安全边界")}</h3><ul><li data-status="success"><span>✓</span><span>{loadoutText(props.copy, "穿戴前刷新账号并核对计划。")}</span></li><li data-status="success"><span>✓</span><span>{loadoutText(props.copy, "步骤失败后停止后续写入。")}</span></li><li data-status="success"><span>✓</span><span>{loadoutText(props.copy, "穿戴验证后才允许保存到游戏内槽位。")}</span></li></ul></section>
      <div className="loadout-sticky-primary-actions"><button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onEdit}>{loadoutText(props.copy, "编辑方案")}</button><button id={`loadout-quick-wear-${props.planId}`} type="button" data-ui-kind="button" data-control-variant="primary" disabled={!props.wearEnabled || props.isExecuting} onClick={props.onWear}>{loadoutText(props.copy, "穿戴此方案")}</button></div>
    </div>
  );
}

function ApplicationLoadoutCompare(props: {
  copy: LoadoutsCopy;
  model: ApplicationLoadoutCompareViewModel;
  onBack: () => void;
  onRemove: (id: string) => void;
  onRemoveInGameReference: () => void;
  onShowDiffOnlyChange: (value: boolean) => void;
  onSelect: (id: string) => void;
}) {
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { backRef.current?.focus(); }, []);
  return (
    <section className="loadout-compare-page" aria-label={loadoutText(props.copy, "应用配装对比")}>
      <header className="loadout-subpage-head"><button ref={backRef} className="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onBack}>{loadoutText(props.copy, "返回方案库")}</button><div><span className="loadout-eyebrow">{loadoutText(props.copy, "应用配装")}</span><h2>{loadoutText(props.copy, "方案对比")}</h2><p>{loadoutTemplate(props.copy, "{message} · 共 {count} 处差异。", { message: applicationLoadoutSelectionMessageText(props.copy, props.model.selection_message), count: props.model.difference_count })}</p></div><label className="loadout-diff-toggle"><input type="checkbox" checked={props.model.showDiffOnly} onChange={(event) => props.onShowDiffOnlyChange(event.target.checked)} /><span>{loadoutText(props.copy, "仅显示差异")}</span></label></header>
      <div className="loadout-compare-table" style={{ "--loadout-compare-count": Math.max(props.model.columns.length, 2) } as CSSProperties}>
        <div className="loadout-compare-table-head"><span>{loadoutText(props.copy, "比较项")}</span>{props.model.columns.map((column) => <div key={column.id}><strong>{compareColumnTitleText(props.copy, column.title)}</strong><small>{compareColumnSubtitleText(props.copy, column.subtitle)}</small>{column.kind === "application" ? <footer><button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onRemove(column.plan.id)}>{loadoutText(props.copy, "移出")}</button><button type="button" data-ui-kind="button" data-control-variant="primary" onClick={() => props.onSelect(column.plan.id)}>{loadoutText(props.copy, "查看")}</button></footer> : <><em>{loadoutText(props.copy, "游戏内只读参照 · 部分字段未知")}</em><footer><button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onRemoveInGameReference}>{loadoutText(props.copy, "移出参照")}</button></footer></>}</div>)}</div>
        {props.model.visible_rows.map((row) => <div className="loadout-compare-table-row" data-changed={row.changed || undefined} key={row.key}><strong>{compareRowLabelText(props.copy, row.label)}</strong>{row.cells.map((cell) => {
          const detail = cell.detail ? compareValueText(props.copy, cell.detail) : "";
          return <span key={cell.column_id} data-state={cell.state}>{compareValueText(props.copy, cell.value)}{detail ? <small className="loadout-compare-cell-detail">{detail}</small> : null}</span>;
        })}</div>)}
      </div>
      {!props.model.visible_rows.length ? <ProductWorkspaceEmptyState><h3>{loadoutText(props.copy, "当前没有可显示的差异")}</h3><p>{loadoutText(props.copy, "关闭“仅显示差异”可查看全部子职业、装备、属性模组和备注字段。")}</p></ProductWorkspaceEmptyState> : null}
    </section>
  );
}

function LocalPlanEditor(props: LoadoutsPageContentViewProps & {
  activeCharacter: AccountSummary["characters"][number] | null;
  editorScreen: "editor" | "armor" | "wear" | "publish";
  pickerSlot?: string;
  onOpenWear: () => void;
  onOpenItemPicker: (slot: string) => void;
  onOpenPublish: () => void;
  onBack: () => void;
}) {
  const draft = props.localPlanDraft;
  const editorCopy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").loadouts;
  const accountItems = useMemo(() => getLocalLoadoutPlanAccountItems(props.accountSummary), [props.accountSummary]);
  const planMatch = useMemo(() => draft && props.accountSummary
    ? matchLocalLoadoutPlan(draft, props.accountSummary)
    : null, [draft, props.accountSummary]);
  const matches = planMatch?.item_matches ?? [];
  const [comparedArmorCandidateIds, setComparedArmorCandidateIds] = useState<string[]>([]);
  const [mobileEditorPane, setMobileEditorPane] = useState<"content" | "summary">("content");
  const [mobileArmorPane, setMobileArmorPane] = useState<"constraints" | "content" | "summary">("constraints");
  const [armorPlannerOpen, setArmorPlannerOpen] = useState(props.editorScreen === "armor");
  const [armorPlanBaseline, setArmorPlanBaseline] = useState<LoadoutPlanArmorConstraints | null>(null);
  const [armorPlanEquipmentChanged, setArmorPlanEquipmentChanged] = useState(false);
  const pendingArmorPlanBaseline = useRef<LoadoutPlanArmorConstraints | null>(null);
  // 只有重算成功才把基线换成这次请求的设置；失败或进行中都保留上一次成功的基线，
  // 脏标记因此不会因为一次失败的请求被误清除。求解器被外部复位时（换目标角色、重开编辑器），
  // 屏幕上不会再有候选，基线一起清掉。
  useEffect(() => {
    const state = props.armorPlannerState;
    if (!state || state.status === "idle") {
      pendingArmorPlanBaseline.current = null;
      setArmorPlanBaseline(null);
      setArmorPlanEquipmentChanged(false);
      return;
    }
    if (state.status !== "ready" && state.status !== "stale") return;
    const pending = pendingArmorPlanBaseline.current;
    if (!pending) return;
    pendingArmorPlanBaseline.current = null;
    setArmorPlanBaseline(pending);
    setArmorPlanEquipmentChanged(false);
  }, [props.armorPlannerState?.revision, props.armorPlannerState?.status]);
  useEffect(() => {
    document.querySelector<HTMLElement>(`.loadout-subpage[data-screen="${props.editorScreen}"] .loadout-subpage-back`)?.focus();
  }, [props.editorScreen]);
  useEffect(() => {
    if (props.editorScreen === "armor") setArmorPlannerOpen(true);
  }, [props.editorScreen]);
  // 「技能与碎片属性变化」的默认值：目标角色当前装备的子职业里，星象和碎片加了哪些属性。
  // 原来这一栏要玩家自己数、自己敲；读数本来就随账号加载一起到手，不用再问一次。
  // 只认草稿的目标角色：没定目标角色时宁可不填，也不拿列表里碰巧选中的另一个角色顶上。
  const detectedFragmentBonuses = useMemo(() => {
    const character = props.accountSummary?.characters.find(
      (item) => item.character_id === draft?.target_character_id
    );
    return character ? summarizeEquippedSubclassStatBonuses(character.equipped_items) : {};
  }, [props.accountSummary, draft?.target_character_id]);
  if (!draft) return null;
  const activeDraft = draft;

  // 一次草稿改动对护甲规划的影响分四档：
  // keep      与护甲无关（方案名、武器槽位），候选和 armor_plan 原样保留；
  // settings  护甲设置变了，候选留在屏幕上但按旧设置算出，armor_plan 必须从草稿里剥掉；
  // targets   护甲装备目标变了，同样作废候选，另外记下是哪一类变了；
  // reset     目标角色或职业变了，整套护甲都不再适用，连候选一起清掉。
  // armor_plan 一旦作废就必须离开草稿，否则穿戴路径会把按旧设置算出来的护甲当成有效计划。
  function updateDraft(next: CreateLocalLoadoutPlanInput, armorEffect: DraftArmorEffect = "settings") {
    if (armorEffect === "reset") {
      props.actions.resetArmorPlanner?.();
      pendingArmorPlanBaseline.current = null;
      setArmorPlanBaseline(null);
      setArmorPlanEquipmentChanged(false);
    }
    if (armorEffect === "targets") setArmorPlanEquipmentChanged(true);
    props.actions.localPlanDraftChange(armorEffect === "keep" ? next : withoutArmorPlan(next));
  }

  const legacyArmorModPlan = Boolean(
    activeDraft.armor_constraints
    && !activeDraft.armor_constraints.armor_stat_mod_slot_rules
    && (activeDraft.armor_constraints.five_point_mod_budget > 0 || activeDraft.armor_constraints.ten_point_mod_budget > 0)
  );
  const armorConstraints = normalizeArmorConstraintsForEditor(activeDraft.armor_constraints, detectedFragmentBonuses);

  function updateArmorConstraints(next: LoadoutPlanArmorConstraints) {
    updateDraft({ ...activeDraft, armor_constraints: next });
  }

  function updateTarget(index: number, nextTarget: CreateLocalLoadoutPlanInput["item_targets"][number]) {
    updateDraft({
      ...activeDraft,
      item_targets: activeDraft.item_targets.map((target, targetIndex) => targetIndex === index ? nextTarget : target)
    }, standardArmorSlot(nextTarget.slot) ? "targets" : "keep");
  }

  function removeTarget(index: number) {
    const target = activeDraft.item_targets[index];
    updateDraft({
      ...activeDraft,
      item_targets: activeDraft.item_targets.filter((_, targetIndex) => targetIndex !== index)
    }, target && standardArmorSlot(target.slot) ? "targets" : "keep");
  }

  function calculateArmorCandidates() {
    const armorClass = resolveArmorClass(activeDraft.class_name);
    const plannerMode = armorConstraints.planner_mode ?? "owned";
    if (armorClass === "unknown" || !props.actions.planArmor) return;
    if (plannerMode !== "theoretical" && !props.accountSummary) return;
    setComparedArmorCandidateIds([]);
    // 记下这次请求用的是哪份设置和哪套护甲目标。只有这次请求成功返回，它才成为新的基线。
    pendingArmorPlanBaseline.current = armorConstraints;
    const slotEnergyPlan = buildArmorSlotEnergyPlan(activeDraft, accountItems);
    const sharedRequest = {
      class: armorClass,
      target: buildArmorPlannerTarget(armorConstraints),
      fragment_adjustments: armorConstraints.fragment_stat_bonuses,
      armor_stat_mod_slot_rules: normalizeLoadoutPlanArmorStatModSlotRules(armorConstraints),
      armor_mod_budget: {
        plus5: summarizeLoadoutPlanArmorStatModRules(armorConstraints).plus5,
        plus10: summarizeLoadoutPlanArmorStatModRules(armorConstraints).plus10,
        usage: "at-most" as const
      },
      energy_capacity_by_slot: slotEnergyPlan.capacity,
      reserved_energy_by_slot: slotEnergyPlan.reserved,
      set_constraint: armorConstraints.set_constraint ?? { mode: "none" },
      priority_stats: armorConstraints.priority_stats,
      limit: 5
    };
    if (plannerMode === "theoretical") {
      props.actions.planArmor({ mode: "theoretical", request: sharedRequest });
      return;
    }
    if (plannerMode === "acquisition") {
      props.actions.planArmor({
        mode: "acquisition",
        request: {
          ...sharedRequest,
          owned_allowed_locations: armorConstraints.allowed_locations,
          nearest_owned_limit: 2
        }
      });
      return;
    }
    const lockedInstanceIds = uniqueStrings([
      ...armorConstraints.locked_instance_ids,
      ...(armorConstraints.exotic_instance_id ? [armorConstraints.exotic_instance_id] : [])
    ]);
    const ownedRequest = {
      ...sharedRequest,
      planned_non_stat_plug_hashes_by_slot: slotEnergyPlan.plugHashes,
      allowed_locations: armorConstraints.allowed_locations,
      locked_instance_ids: lockedInstanceIds,
      excluded_instance_ids: armorConstraints.excluded_instance_ids,
      target_character_id: activeDraft.target_character_id,
      mode: "strict" as const
    };
    if (plannerMode === "upgrade") {
      props.actions.planArmor({
        mode: "upgrade",
        request: {
          ...ownedRequest,
          current_instance_ids: resolveUpgradeBaselineInstanceIds(
            activeDraft,
            props.accountSummary,
            accountItems
          )
        }
      });
      return;
    }
    props.actions.planArmor({ mode: "owned", request: ownedRequest });
  }

  function selectArmorCandidate(
    candidate: Extract<ArmorPlannerCandidateView, { kind: "owned" | "upgrade" }>
  ) {
    if (!armorPlannerState || armorPlannerState.status !== "ready" || !armorViewModel) return;
    const armorInstanceIds = new Set(accountItems
      .filter((item) => item.group_key === "armor" && item.instance_id)
      .map((item) => item.instance_id));
    const nonArmorTargets = activeDraft.item_targets.filter((target) => !target.selected_instance_id || !armorInstanceIds.has(target.selected_instance_id));
    updateDraft({
      ...activeDraft,
      item_targets: [...nonArmorTargets, ...candidate.pieces.map((piece) => ({
        slot: armorSlotLabel(editorCopy, piece.slot),
        item_hash: piece.itemHash,
        selected_instance_id: piece.instanceId,
        plug_hashes: uniqueNumbers([
          ...piece.plannedNonStatPlugHashes,
          ...(piece.tuning ? [piece.tuning.plugHash] : []),
          ...(piece.armorStatModSocketPlugHash === undefined ? [] : [piece.armorStatModSocketPlugHash])
        ])
      }))],
      armor_plan: {
        result_id: armorPlannerState.result.resultId,
        cache_key: armorPlannerState.result.cacheKey,
        checked_at: armorPlannerState.result.checkedAt,
        expires_at: armorPlannerState.result.expiresAt,
        candidate_id: candidate.summary.candidateId,
        mode: candidate.kind,
        ruleset_id: armorViewModel.ruleset.id,
        ruleset_version: armorViewModel.ruleset.version,
        manifest_version: armorViewModel.ruleset.manifestVersion,
        source_revisions: {
          ...armorPlannerState.result.sources,
          ruleset: armorPlannerState.result.sources.ruleset
        },
        selected_instance_ids: candidate.pieces.map((piece) => piece.instanceId),
        planned_armor_plugs: candidate.pieces.map((piece) => ({
          slot: piece.slot,
          instance_id: piece.instanceId,
          tuning_plug_hash: piece.tuning?.plugHash,
          armor_stat_mod_plug_hash: piece.armorStatModSocketPlugHash,
          armor_stat_mod_value: piece.armorStatMod?.value,
          armor_stat_mod_stat: piece.armorStatMod?.stat,
          armor_stat_mod_socket_index: piece.armorStatModSocketIndex,
          armor_stat_mod_energy_cost: piece.energy.armorStatMod,
          energy_capacity: piece.energy.capacity,
          reserved_energy: piece.energy.reserved,
          final_energy: piece.energy.final
        }))
      }
    }, "keep");
    closeArmorPlanner();
  }

  const armorClass = resolveArmorClass(activeDraft.class_name);
  const armorItems = accountItems.filter((item) => item.group_key === "armor" && item.instance_id);
  const plannerMode = armorConstraints.planner_mode ?? "owned";
  const armorSlotEnergyPlan = buildArmorSlotEnergyPlan(activeDraft, accountItems);
  const armorPlannerState = props.armorPlannerState;
  const armorViewModel = armorPlannerState?.viewModel?.mode === plannerMode
    ? armorPlannerState.viewModel
    : null;
  const armorCandidates = armorViewModel?.candidates ?? [];
  const comparedArmorCandidates = comparedArmorCandidateIds
    .map((candidateId) => armorCandidates.find((candidate) => candidate.summary.candidateId === candidateId))
    .filter((candidate): candidate is ArmorPlannerCandidateView => Boolean(candidate));
  const acceptedArmorCandidate = activeDraft.armor_plan
    ? armorCandidates.find((candidate) => candidate.summary.candidateId === activeDraft.armor_plan?.candidate_id) ?? null
    : null;
  const selectedArmorCandidate = comparedArmorCandidates.at(-1)
    ?? acceptedArmorCandidate
    ?? armorCandidates[0]
    ?? null;
  const armorModPreflight = buildArmorModPreflight(editorCopy, armorItems, armorConstraints, armorSlotEnergyPlan.plugHashes);
  const armorStatusMessage = getArmorPlannerStatusMessage(editorCopy, {
    state: armorPlannerState,
    hasAccount: Boolean(props.accountSummary),
    hasClient: Boolean(props.actions.planArmor),
    armorClass,
    mode: plannerMode
  });
  // 屏幕上这批候选是按旧设置算的，重算之前不能把其中任何一套写回草稿。
  // 基线在重算失败或计算中保持不变，脏标记因此不会因为一次失败的请求消失。
  const armorPlanChanges = armorPlanBaseline
    ? armorPlanChangeKinds(armorPlanBaseline, armorConstraints, armorPlanEquipmentChanged)
    : [];
  const armorPlanSettingsChanged = armorPlanChanges.length > 0;
  const armorPlanAcceptBlocked = armorPlanSettingsChanged || armorPlannerState?.status !== "ready";
  const armorSearchTruncated = Boolean((armorPlannerState?.status === "ready" || armorPlannerState?.status === "stale") && armorViewModel?.search?.truncated);
  const armorStatusDetailCount = armorViewModel ? armorViewModel.issues.length + armorViewModel.warnings.length : 0;

  function toggleArmorCandidateComparison(candidateId: string) {
    setComparedArmorCandidateIds((current) => current.includes(candidateId)
      ? current.filter((id) => id !== candidateId)
      : current.length < 3
        ? [...current, candidateId]
        : current);
  }

  function selectItemForStandardSlot(slot: string, instanceId: string) {
    const item = accountItems.find((candidate) => candidate.instance_id === instanceId);
    if (!item) return;
    const nextTarget: CreateLocalLoadoutPlanInput["item_targets"][number] = {
      slot,
      item_hash: item.hash,
      selected_instance_id: item.instance_id,
      plug_hashes: item.socket_plugs.map((plug) => plug.hash)
    };
    const existingIndex = activeDraft.item_targets.findIndex((target) => standardSlotKey(target.slot) === slot);
    updateDraft({
      ...activeDraft,
      item_targets: existingIndex >= 0
        ? activeDraft.item_targets.map((target, index) => index === existingIndex ? nextTarget : target)
        : [...activeDraft.item_targets, nextTarget]
    }, standardArmorSlot(slot) ? "targets" : "keep");
    props.onBack();
  }

  function openArmorPlanner() {
    setArmorPlannerOpen(true);
    setMobileEditorPane("content");
    setMobileArmorPane("constraints");
    requestAnimationFrame(() => document.getElementById("loadout-inline-armor-title")?.focus());
  }

  function closeArmorPlanner() {
    if (props.editorScreen === "armor") {
      props.onBack();
      return;
    }
    setArmorPlannerOpen(false);
    requestAnimationFrame(() => document.getElementById("loadout-open-armor-planner")?.focus());
  }

  const armorPlannerPanel = armorPlannerOpen ? (
      <section className="loadout-inline-armor-planner" aria-label={loadoutText(editorCopy, "按属性目标自动配甲")}>
        <header className="loadout-inline-armor-head">
          <div><span className="loadout-eyebrow">{loadoutTemplate(editorCopy, "护甲与模组 · {mode}", { mode: armorPlannerModeLabel(editorCopy, plannerMode) })}</span><h3 id="loadout-inline-armor-title" tabIndex={-1}>{loadoutText(editorCopy, "按属性目标自动配甲")}</h3><p>{loadoutText(editorCopy, "先设置五个部位的属性模组，再从推荐方案中选择一套写回当前构筑。")}</p></div>
          <div><button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={closeArmorPlanner}>{loadoutText(editorCopy, "收起")}</button></div>
        </header>
        <DecisionPaneSwitcher copy={editorCopy} value={mobileArmorPane} contentLabel={loadoutText(editorCopy, "推荐")} onChange={setMobileArmorPane} />
        <section className="loadout-armor-decision-workspace" aria-label={loadoutText(editorCopy, "按属性目标自动配甲")}>
          <aside className="loadout-armor-constraints-pane" data-mobile-active={mobileArmorPane === "constraints" || undefined} aria-label={loadoutText(editorCopy, "护甲配装设置")}>
            <div className="loadout-decision-pane-head"><strong>{loadoutText(editorCopy, "配装设置")}</strong><small>{loadoutText(editorCopy, "修改后需要重新计算推荐方案")}</small></div>
            <div id="loadout-armor-planner-panel" role="tabpanel" aria-labelledby={`loadout-armor-mode-${plannerMode}`}>
            {legacyArmorModPlan ? <p className="loadout-callout" data-ui-kind="callout" data-status="warning">{loadoutText(editorCopy, "这是旧版全局数量方案，无法确认原来的 +5 / +10 应安装在哪些部位。五个部位已转为“自动”，请逐项确认后重新计算并保存。")}</p> : null}
            <div className="loadout-armor-constraint-grid">
              {loadoutPlanArmorStatKeys.map((stat) => <label key={stat}><span>{loadoutTemplate(editorCopy, "{stat}最低值", { stat: armorStatLabel(editorCopy, stat) })}</span><input type="number" min="0" step="5" value={armorConstraints.stat_minimums[stat] ?? 0} onChange={(event) => updateArmorConstraints({ ...armorConstraints, stat_minimums: { ...armorConstraints.stat_minimums, [stat]: Math.max(Number(event.target.value) || 0, 0) } })} /></label>)}
            </div>
            <ArmorStatModSlotRulesEditor copy={editorCopy} constraints={armorConstraints} preflight={armorModPreflight} onChange={updateArmorConstraints} />
            <details className="loadout-armor-advanced-settings" open={plannerMode !== "owned"}>
              <summary><span>{loadoutText(editorCopy, "更多配装条件")}</span><small>{loadoutTemplate(editorCopy, "{mode} · 优先顺序、碎片、套装与装备范围", { mode: armorPlannerModeLabel(editorCopy, plannerMode) })}</small></summary>
              <section className="loadout-armor-advanced-section" aria-label={loadoutText(editorCopy, "规划方式")}>
                <div className="loadout-armor-constraint-head"><div><strong>{loadoutText(editorCopy, "规划方式")}</strong><small>{loadoutText(editorCopy, "普通配装直接使用当前库存；其他方式用于理论、待刷和升级分析。")}</small></div></div>
                <ArmorPlannerModeControl copy={editorCopy} mode={plannerMode} onChange={(mode) => updateArmorConstraints({ ...armorConstraints, planner_mode: mode })} />
              </section>
              <ArmorPriorityEditor copy={editorCopy} constraints={armorConstraints} onChange={updateArmorConstraints} />
              <ArmorFragmentAdjustmentsEditor
                copy={editorCopy}
                constraints={armorConstraints}
                explicit={activeDraft.armor_constraints?.fragment_stat_bonuses ?? {}}
                detected={detectedFragmentBonuses}
                onChange={updateArmorConstraints}
              />
              <ArmorSetConstraintEditor copy={editorCopy} constraint={armorConstraints.set_constraint ?? { mode: "none" }} catalog={props.armorSetCatalog ?? []} catalogStatus={props.armorSetCatalogStatus ?? "loading"} onChange={(setConstraint) => updateArmorConstraints({ ...armorConstraints, set_constraint: setConstraint })} />
              {plannerMode !== "theoretical" ? <ArmorInventoryConstraintEditor copy={editorCopy} mode={plannerMode} constraints={armorConstraints} armorItems={armorItems} onChange={updateArmorConstraints} /> : null}
            </details>
            </div>
            <div className="loadout-armor-calculate-bar" data-status={armorPlanSettingsChanged || armorModPreflight.status === "warning" ? "warning" : "neutral"}>
              <span>{armorPlanSettingsChanged ? loadoutTemplate(editorCopy, "设置已变化，需要重新计算：{kinds}。重算前不能使用推荐方案。", { kinds: armorPlanChanges.map((kind) => armorPlanChangeLabel(editorCopy, kind)).join("、") }) : armorModPreflight.status === "warning" ? loadoutText(editorCopy, "部分设置无法满足，仍可计算并查看具体原因。") : armorModPreflight.status === "unknown" ? loadoutText(editorCopy, "计算时会再次核对模组兼容性和剩余能量。") : loadoutText(editorCopy, "设置完成，可以查看推荐方案。")}</span>
              <button type="button" data-ui-kind="button" data-control-variant="primary" onClick={calculateArmorCandidates} disabled={(plannerMode !== "theoretical" && !props.accountSummary) || !props.actions.planArmor || armorClass === "unknown" || armorPlannerState?.status === "loading"}>{armorPlannerState?.status === "loading" ? loadoutText(editorCopy, "计算中") : armorPlannerActionLabel(editorCopy, plannerMode)}</button>
            </div>
          </aside>
          <ArmorPlannerDecisionSummary copy={editorCopy} candidate={selectedArmorCandidate} constraints={armorConstraints} stale={armorPlannerState?.status !== "ready"} settingsChanged={armorPlanSettingsChanged} mobileActive={mobileArmorPane === "summary"} />
          <main className="loadout-armor-results-pane" data-mobile-active={mobileArmorPane === "content" || undefined}>
            <div className="loadout-decision-pane-head"><div><strong>{loadoutText(editorCopy, "推荐方案")}</strong><small>{armorCandidates.length ? loadoutTemplate(editorCopy, "{count} 个结果 · 已选 {selected}/3 比较", { count: armorCandidates.length, selected: comparedArmorCandidates.length }) : loadoutText(editorCopy, "先完成设置并运行计算")}</small></div>{comparedArmorCandidates.length ? <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => setComparedArmorCandidateIds([])}>{loadoutText(editorCopy, "清除比较")}</button> : null}</div>
            {armorStatusMessage ? <p className="loadout-callout" data-ui-kind="callout" data-status={armorPlannerState?.status === "error" ? "error" : armorPlannerState?.status === "ready" && armorViewModel?.outcome === "reachable" && !armorStatusDetailCount && !armorSearchTruncated ? "success" : "warning"}>{armorStatusMessage}</p> : null}
            {armorCandidates.length && (armorPlannerState?.status === "loading" || armorPlannerState?.status === "error") ? <p className="loadout-callout" data-ui-kind="callout" data-status="warning">{loadoutText(editorCopy, "以下是上次计算的结果，仅供查看；本次计算成功前不能使用。")}</p> : null}
            {armorPlanSettingsChanged ? <p className="loadout-callout" data-ui-kind="callout" data-status="warning">{loadoutTemplate(editorCopy, "设置已变化，需要重新计算：{kinds}。屏幕上的推荐方案按改动前的设置算出，重新计算前不能使用。", { kinds: armorPlanChanges.map((kind) => armorPlanChangeLabel(editorCopy, kind)).join("、") })}</p> : null}
            {armorSearchTruncated ? <p className="loadout-callout" data-ui-kind="callout" data-status="warning">{loadoutTemplate(editorCopy, "搜索被截断：已检查 {examined} 个组合后到达上限，只保留 {retained} 个，屏幕上这批结果不是完整搜索的结果。把部位的模式从「自动」改成 +5 或 +10，并把「增加属性」选成具体属性，能把搜索范围缩小十几倍。", { examined: armorViewModel?.search?.statesExamined ?? 0, retained: armorViewModel?.search?.statesRetained ?? 0 })}</p> : null}
            {props.armorTargetFeedback ? <p className="loadout-callout" data-ui-kind="callout" data-status={props.armorTargetTone === "error" ? "error" : "success"}>{props.armorTargetFeedback}</p> : null}
            {comparedArmorCandidates.length >= 2 ? <ArmorCandidateComparison copy={editorCopy} candidates={comparedArmorCandidates} /> : null}
            {armorCandidates.length ? <ArmorCandidateList copy={editorCopy} candidates={armorCandidates} stale={armorPlanAcceptBlocked} comparedCandidateIds={comparedArmorCandidateIds} onToggleCompare={toggleArmorCandidateComparison} onSelect={selectArmorCandidate} onSaveAcquisitionTargets={props.actions.saveArmorAcquisitionTargets ? (candidate) => props.actions.saveArmorAcquisitionTargets?.(candidate, armorClass) : undefined} isSavingAcquisitionTargets={Boolean(props.isSavingArmorTargets)} /> : <ProductWorkspaceEmptyState><h3>{loadoutText(editorCopy, "还没有推荐方案")}</h3><p>{loadoutText(editorCopy, "完成左侧设置后运行计算。没有精确结果时会说明距离目标和受限原因。")}</p></ProductWorkspaceEmptyState>}
          </main>
        </section>
      </section>
    ) : null;

  if (props.editorScreen === "wear") {
    return (
      <>
        <header className="loadout-subpage-head">
          <button className="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onBack}>{loadoutText(editorCopy, "返回配装编辑器")}</button>
          <div><span className="loadout-eyebrow">{draft.name || loadoutText(editorCopy, "未命名应用配装")}</span><h2>{loadoutText(editorCopy, "穿戴核对")}</h2><p>{loadoutText(editorCopy, "执行前会刷新权威账号数据并重新生成不可变计划；任一步骤失败后停止。")}</p></div>
        </header>
        <LocalPlanExecutionPanel {...props} copy={editorCopy} showPublish={false} />
        {props.localPlanExecutionReport?.refresh_verified ? <div className="loadout-editor-sticky-actions"><span>{loadoutText(editorCopy, "穿戴后账号刷新核对通过，可以选择写入一个 Bungie 官方槽位。")}</span><div><button id="loadout-open-publish" type="button" data-ui-kind="button" data-control-variant="primary" onClick={props.onOpenPublish}>{loadoutText(editorCopy, "保存到游戏内槽位")}</button></div></div> : null}
      </>
    );
  }

  if (props.editorScreen === "publish") {
    return (
      <>
        <header className="loadout-subpage-head"><button className="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onBack}>{loadoutText(editorCopy, "返回穿戴核对")}</button><div><span className="loadout-eyebrow">{draft.name || loadoutText(editorCopy, "未命名应用配装")}</span><h2>{loadoutText(editorCopy, "保存到游戏内槽位")}</h2><p>{loadoutText(editorCopy, "应用配装已成功穿戴并刷新核对；选择官方槽位后才会执行 Bungie 写入。")}</p></div></header>
        <LocalPlanExecutionPanel {...props} copy={editorCopy} showPublish />
        {props.localPlanEditingId ? (
          <section className="loadout-plan-notes" aria-label={loadoutText(editorCopy, "存回哪里")}>
            <strong>{loadoutText(editorCopy, "这一套存回哪里")}</strong>
            <p>{loadoutText(editorCopy, "存回原方案会把它覆盖掉；另存为会新建一套，原来那套原样不动。")}</p>
            <div className="loadout-action-stack">
              <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={props.localPlanIsSaving || !draft.name.trim() || !draft.class_name.trim()} onClick={props.actions.saveLocalPlan}>{props.localPlanIsSaving ? loadoutText(editorCopy, "保存中") : loadoutTemplate(editorCopy, "存回「{name}」", { name: props.localPlanSavedName ?? draft.name })}</button>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.localPlanIsSaving || !draft.name.trim() || !draft.class_name.trim()} onClick={props.actions.saveLocalPlanAsNew}>{loadoutText(editorCopy, "另存为新配装")}</button>
            </div>
          </section>
        ) : null}
      </>
    );
  }

  const otherTargets = draft.item_targets.map((target, index) => ({ target, index })).filter(({ target }) => !standardSlotKey(target.slot));
  const configuredStandardSlotCount = draft.item_targets.filter((target) => standardSlotKey(target.slot)).length;
  const showBuildStart = configuredStandardSlotCount === 0 && !draft.subclass_target;

  return (
    <>
      <header className="loadout-subpage-head loadout-editor-head">
        <button className="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onBack}>{loadoutText(editorCopy, "返回方案库")}</button>
        <div className="loadout-editor-title-block"><span className="loadout-eyebrow">{loadoutTemplate(editorCopy, "{source} · {state}", { source: draft.source.label || loadoutText(editorCopy, "应用内创建"), state: props.localPlanEditingId ? loadoutText(editorCopy, "编辑已保存方案") : loadoutText(editorCopy, "未保存草稿") })}</span><div className="loadout-editor-title-fields"><label><span>{loadoutText(editorCopy, "方案名称")}</span><input value={draft.name} onChange={(event) => updateDraft({ ...draft, name: event.target.value }, "keep")} aria-label={loadoutText(editorCopy, "配装名称")} placeholder={loadoutText(editorCopy, "未命名方案")} /></label><label><span>{loadoutText(editorCopy, "目标角色")}</span>{props.accountSummary?.characters.length ? <select value={draft.target_character_id ?? ""} onChange={(event) => { const character = props.accountSummary?.characters.find((item) => item.character_id === event.target.value); updateDraft({ ...draft, target_character_id: character?.character_id, class_name: character?.class_name ?? draft.class_name }, "reset"); }} aria-label={loadoutText(editorCopy, "目标角色")}><option value="">{loadoutTemplate(editorCopy, "仅限定 {class}", { class: draft.class_name || loadoutText(editorCopy, "职业") })}</option>{draft.target_character_id && !props.accountSummary.characters.some((character) => character.character_id === draft.target_character_id) ? <option value={draft.target_character_id}>{loadoutText(editorCopy, "原目标角色未定位")}</option> : null}{props.accountSummary.characters.map((character) => <option key={character.character_id} value={character.character_id}>{loadoutTemplate(editorCopy, "{class} · {count} 个游戏内槽位", { class: character.class_name, count: character.loadout_slots.length })}</option>)}</select> : <input value={draft.class_name} onChange={(event) => updateDraft({ ...draft, class_name: event.target.value }, "reset")} aria-label={loadoutText(editorCopy, "目标职业")} placeholder={loadoutText(editorCopy, "选择职业")} />}</label></div></div>
        <div className="loadout-action-stack">
          <span className="loadout-editor-save-state" data-status={props.localPlanIsSaving ? "pending" : !props.localPlanEditingId || props.localPlanIsDirty ? "warning" : "ready"}>{props.localPlanIsSaving ? loadoutText(editorCopy, "保存中") : !props.localPlanEditingId ? loadoutText(editorCopy, "尚未保存") : props.localPlanIsDirty ? loadoutText(editorCopy, "有未保存修改") : loadoutText(editorCopy, "已保存")}</span>
          <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.localPlanIsSaving || !draft.name.trim() || !draft.class_name.trim()} onClick={props.actions.saveLocalPlan}>{props.localPlanIsSaving ? loadoutText(editorCopy, "保存中") : loadoutText(editorCopy, "保存")}</button>
          <button id="loadout-open-wear-review" type="button" data-ui-kind="button" data-control-variant="primary" disabled={!props.localPlanEditingId} onClick={props.onOpenWear}>{props.localPlanEditingId ? loadoutText(editorCopy, "穿戴") : loadoutText(editorCopy, "保存后穿戴")}</button>
        </div>
      </header>
      {draft.guidance?.warnings.length ? <section className="loadout-guide-review" data-ui-kind="callout" data-status="warning" aria-label={loadoutText(editorCopy, "攻略解析待确认")}><strong>{loadoutText(editorCopy, "攻略解析待确认")}</strong><ul>{draft.guidance.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></section> : null}
      <EditorPaneSwitcher copy={editorCopy} value={mobileEditorPane} onChange={setMobileEditorPane} />
      <section className="loadout-editor-decision-workspace" aria-label={loadoutText(editorCopy, "应用配装决策工作区")}>
        <main className="loadout-build-canvas" data-mobile-active={mobileEditorPane === "content" || undefined}>
          <div className="loadout-decision-pane-head"><div><strong>{loadoutText(editorCopy, "当前构筑")}</strong><small>{loadoutText(editorCopy, "子职业、三件武器和五件护甲使用同一个未保存草稿")}</small></div><span>{loadoutTemplate(editorCopy, "{count}/8 槽已配置", { count: configuredStandardSlotCount })}</span></div>
          {showBuildStart ? <section className="loadout-build-start" aria-label={loadoutText(editorCopy, "开始创建配装")}><div><span className="loadout-eyebrow">{loadoutText(editorCopy, "选择构筑起点")}</span><h3>{loadoutText(editorCopy, "先确定从哪里开始")}</h3><p>{loadoutText(editorCopy, "可以带入当前角色装备、先运行护甲规划，或直接选择第一个装备槽位。")}</p></div><div className="loadout-build-start-actions"><button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!props.activeCharacter} onClick={() => props.actions.startLocalPlanFromCharacter(props.activeCharacter)}>{loadoutText(editorCopy, "从当前装备开始")}</button><button id="loadout-open-armor-planner" type="button" data-ui-kind="button" data-control-variant="secondary" onClick={openArmorPlanner}>{loadoutText(editorCopy, "按属性目标自动配甲")}</button><button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onOpenItemPicker("动能武器")}>{loadoutText(editorCopy, "手动选择装备")}</button></div></section> : null}
          <section className="loadout-slot-editor-section loadout-subclass-section" aria-label={loadoutText(editorCopy, "子职业")}>
            <header className="loadout-local-section-head"><div><strong>{loadoutText(editorCopy, "子职业构筑")}</strong><small>{loadoutText(editorCopy, "优先展示已确认的技能、星相和碎片语义")}</small></div><div className="loadout-section-head-actions"><span>{loadoutText(editorCopy, "当前仅记录")}</span></div></header>
            <article className="loadout-subclass-slot loadout-subclass-slot-static" data-surface="object-card" data-ui-kind="object-card" data-status={draft.subclass_target?.subclass_hash ? "success" : "neutral"}><span className="loadout-slot-index">S</span><div><strong>{draft.subclass_target?.subclass_hash ? loadoutText(editorCopy, "已记录子职业构筑") : loadoutText(editorCopy, "尚未配置子职业")}</strong><small>{draft.subclass_target ? `${loadoutTemplate(editorCopy, "{abilities} 技能 · {aspects} 星相 · {fragments} 碎片", { abilities: draft.subclass_target.ability_hashes.length, aspects: draft.subclass_target.aspect_hashes.length, fragments: draft.subclass_target.fragment_hashes.length })}${draft.subclass_target.subclass_hash ? loadoutTemplate(editorCopy, " · 定义 {hash}", { hash: draft.subclass_target.subclass_hash }) : ""}` : loadoutText(editorCopy, "从当前装备或已确认来源创建时会保留可读取配置；当前版本只展示已确认配置")}</small></div></article>
          </section>
          <StandardSlotEditorGroup copy={editorCopy} title={loadoutText(editorCopy, "武器")} description={loadoutText(editorCopy, "动能、能量和威能紧凑排列，空槽不占据构筑主视野")} group="weapon" draft={draft} matches={matches} onOpenSlot={props.onOpenItemPicker} onUpdate={updateTarget} onRemove={removeTarget} />
          <StandardSlotEditorGroup copy={editorCopy} title={loadoutText(editorCopy, "护甲与模组")} description={loadoutText(editorCopy, "五件护甲分别保存调整、属性模组、其他模组与能量占用")} group="armor" draft={draft} matches={matches} onOpenSlot={props.onOpenItemPicker} onUpdate={updateTarget} onRemove={removeTarget} action={<button id={showBuildStart ? undefined : "loadout-open-armor-planner"} type="button" data-ui-kind="button" data-control-variant="primary" aria-expanded={armorPlannerOpen} onClick={armorPlannerOpen ? closeArmorPlanner : openArmorPlanner}>{armorPlannerOpen ? loadoutText(editorCopy, "收起护甲规划") : loadoutText(editorCopy, "按属性目标自动配甲")}</button>} />
          {armorPlannerPanel}
          {otherTargets.length ? <EditorTargetGroup copy={editorCopy} title={loadoutText(editorCopy, "其他装备目标")} description={loadoutText(editorCopy, "无法归入标准武器或护甲槽位的真实目标")} targets={otherTargets} matches={matches} draft={draft} onUpdate={updateTarget} onRemove={removeTarget} /> : null}
        </main>
        <EditorDecisionSummary copy={editorCopy} draft={draft} planMatch={planMatch} candidate={acceptedArmorCandidate} accountSummary={props.accountSummary} accountItems={accountItems} mobileActive={mobileEditorPane === "summary"} />
      </section>
      {props.pickerSlot ? <ItemPickerDrawer
        key={props.pickerSlot}
        copy={editorCopy}
        interfaceLocale={props.interfaceLocale}
        slot={props.pickerSlot}
        accountSummary={props.accountSummary}
        selectedInstanceId={draft.item_targets.find((target) => standardSlotKey(target.slot) === props.pickerSlot)?.selected_instance_id}
        onClose={props.onBack}
        onSelect={selectItemForStandardSlot}
      /> : null}
    </>
  );
}

type ItemPickerLocationKind = "equipped" | "inventory" | "vault";

type ItemPickerCandidate = {
  item: AccountItemSummary;
  locationKind: ItemPickerLocationKind;
  locationLabel: string;
};

function ItemPickerDrawer(props: {
  copy: LoadoutsCopy;
  interfaceLocale?: InterfaceLocale;
  slot: string;
  accountSummary: AccountSummary | null;
  selectedInstanceId?: string;
  onClose: () => void;
  onSelect: (slot: string, instanceId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<"all" | ItemPickerLocationKind>("all");
  const drawerRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogTitleId = useId();
  const candidates = useMemo(() => collectItemPickerCandidates(props.accountSummary, props.slot, props.copy)
    .sort((left, right) => {
      const leftSelected = left.item.instance_id === props.selectedInstanceId ? 1 : 0;
      const rightSelected = right.item.instance_id === props.selectedInstanceId ? 1 : 0;
      if (leftSelected !== rightSelected) return rightSelected - leftSelected;
      const locationRank: Record<ItemPickerLocationKind, number> = { equipped: 0, inventory: 1, vault: 2 };
      if (locationRank[left.locationKind] !== locationRank[right.locationKind]) return locationRank[left.locationKind] - locationRank[right.locationKind];
      if ((left.item.power ?? 0) !== (right.item.power ?? 0)) return (right.item.power ?? 0) - (left.item.power ?? 0);
      if ((left.item.armor_stats?.total ?? 0) !== (right.item.armor_stats?.total ?? 0)) return (right.item.armor_stats?.total ?? 0) - (left.item.armor_stats?.total ?? 0);
      return left.item.name.localeCompare(right.item.name, props.interfaceLocale ?? "zh-CN");
    }), [props.accountSummary, props.copy, props.interfaceLocale, props.selectedInstanceId, props.slot]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const locationCandidates = locationFilter === "all"
    ? candidates
    : candidates.filter((candidate) => candidate.locationKind === locationFilter);
  const visibleCandidates = normalizedQuery
    ? locationCandidates.filter((candidate) => `${candidate.item.name} ${candidate.item.bucket_name ?? ""} ${candidate.item.item_type ?? ""} ${candidate.item.tier ?? ""} ${candidate.item.power ?? ""} ${candidate.locationLabel} ${candidate.item.socket_plugs.map((plug) => plug.name).join(" ")}`.toLocaleLowerCase().includes(normalizedQuery))
    : locationCandidates;
  const filters = [
    { value: "all" as const, label: loadoutText(props.copy, "全部"), count: candidates.length },
    { value: "equipped" as const, label: loadoutText(props.copy, "已装备"), count: candidates.filter((candidate) => candidate.locationKind === "equipped").length },
    { value: "inventory" as const, label: loadoutText(props.copy, "角色库存"), count: candidates.filter((candidate) => candidate.locationKind === "inventory").length },
    { value: "vault" as const, label: loadoutText(props.copy, "仓库"), count: candidates.filter((candidate) => candidate.locationKind === "vault").length }
  ];

  useEffect(() => {
    searchRef.current?.focus();
    function handleDialogKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        props.onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleDialogKeyDown);
    return () => document.removeEventListener("keydown", handleDialogKeyDown);
  }, [props.onClose]);

  return (
    <div className="loadout-item-picker-backdrop" role="presentation" onClick={props.onClose}>
      <aside ref={drawerRef} className="loadout-item-picker-drawer" role="dialog" aria-modal="true" aria-labelledby={dialogTitleId} onClick={(event) => event.stopPropagation()}>
        <header><div><span className="loadout-eyebrow">{loadoutText(props.copy, "选择具体装备")}</span><h3 id={dialogTitleId}>{loadoutText(props.copy, props.slot)}</h3><p>{loadoutText(props.copy, "当前装备优先显示；按存放位置筛选后，点击整行即可替换。")}</p></div><button id="loadout-item-picker-close" type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onClose}>{loadoutText(props.copy, "关闭")}</button></header>
        <label className="loadout-item-picker-search"><span>{loadoutText(props.copy, "搜索当前槽位")}</span><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={loadoutText(props.copy, "搜索名称、类型、光等或位置")} /></label>
        <div className="loadout-item-picker-filters" role="group" aria-label={loadoutText(props.copy, "按装备位置筛选")}>{filters.map((filter) => <button type="button" key={filter.value} aria-pressed={locationFilter === filter.value} onClick={() => setLocationFilter(filter.value)}><span>{filter.label}</span><small>{filter.count}</small></button>)}</div>
        <div className="loadout-item-picker-result-meta"><span>{loadoutTemplate(props.copy, "{shown} / {total} 件可选装备", { shown: visibleCandidates.length, total: candidates.length })}</span><small>{loadoutText(props.copy, "整行点击即可选择")}</small></div>
        <div className="loadout-item-picker-drawer-list">
          {visibleCandidates.map((candidate) => {
            const item = candidate.item;
            const selected = item.instance_id === props.selectedInstanceId;
            const detail = [item.power ? loadoutTemplate(props.copy, "光等 {power}", { power: item.power }) : "", item.armor_stats ? loadoutTemplate(props.copy, "总属性 {total}", { total: item.armor_stats.total }) : "", item.tier, item.locked ? loadoutText(props.copy, "已锁定") : ""].filter(Boolean).join(" · ");
            return <button type="button" key={item.instance_id} className="loadout-item-picker-row" data-surface="object-card" data-ui-kind="object-card" data-selected={selected || undefined} aria-pressed={selected} onClick={() => item.instance_id && props.onSelect(props.slot, item.instance_id)}><ItemVisual icon={item.icon} label={item.name} bucketName={item.bucket_name} /><span className="loadout-item-picker-copy"><strong>{item.name}</strong><small>{candidate.locationLabel}{detail ? ` · ${detail}` : ""}</small><small>{itemPickerRollSummary(props.copy, item)} · {loadoutTemplate(props.copy, "装备标识 …{suffix}", { suffix: item.instance_id?.slice(-4) ?? "" })}</small></span><em>{selected ? loadoutText(props.copy, "当前") : item.instance?.is_equipped ? loadoutText(props.copy, "已装备") : loadoutText(props.copy, "选择")}</em></button>;
          })}
          {!visibleCandidates.length ? <ProductWorkspaceEmptyState><h3>{candidates.length ? loadoutText(props.copy, "当前筛选没有可选装备") : loadoutText(props.copy, "当前账号没有可选装备")}</h3><p>{candidates.length ? loadoutText(props.copy, "切换位置或清除搜索词，查看当前槽位的其他装备。") : loadoutText(props.copy, "账号刷新后仍为空时，可以关闭面板并暂时保存不完整方案。")}</p></ProductWorkspaceEmptyState> : null}
        </div>
      </aside>
    </div>
  );
}

function collectItemPickerCandidates(accountSummary: AccountSummary | null, slot: string, copy: LoadoutsCopy): ItemPickerCandidate[] {
  if (!accountSummary) return [];
  const candidates: ItemPickerCandidate[] = [];
  const seenInstanceIds = new Set<string>();
  function add(items: AccountItemSummary[], locationKind: ItemPickerLocationKind, locationLabel: string) {
    for (const item of items) {
      if (!item.instance_id || seenInstanceIds.has(item.instance_id) || standardSlotKey(item.bucket_name ?? "") !== slot) continue;
      seenInstanceIds.add(item.instance_id);
      candidates.push({ item, locationKind, locationLabel });
    }
  }
  for (const character of accountSummary.characters) {
    add(character.equipped_items, "equipped", loadoutTemplate(copy, "已装备 · {class}", { class: character.class_name }));
    add(character.inventory_items, "inventory", loadoutTemplate(copy, "角色背包 · {class}", { class: character.class_name }));
    add(character.postmaster_items, "inventory", loadoutTemplate(copy, "邮政官 · {class}", { class: character.class_name }));
  }
  add(accountSummary.vault.items, "vault", loadoutText(copy, "仓库"));
  return candidates;
}

function itemPickerRollSummary(copy: LoadoutsCopy, item: AccountItemSummary): string {
  if (item.group_key === "weapons") {
    const plugNames = [...new Set(item.socket_plugs.map((plug) => plug.name.trim()).filter(Boolean))].slice(0, 4);
    if (plugNames.length) return plugNames.join(" · ");
  }
  if (item.armor_stats) {
    const strongestStats = loadoutPlanArmorStatKeys
      .map((stat) => ({ stat, value: item.armor_stats?.[stat] ?? 0 }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 2)
      .filter((entry) => entry.value > 0)
      .map((entry) => `${copy.labels.armorStats[entry.stat]} ${entry.value}`);
    if (strongestStats.length) return strongestStats.join(" · ");
  }
  return item.socket_plugs.length ? loadoutTemplate(copy, "{count} 项当前配置", { count: item.socket_plugs.length }) : loadoutText(copy, "未读取当前配置");
}

function DecisionPaneSwitcher(props: {
  copy: LoadoutsCopy;
  value: "constraints" | "content" | "summary";
  contentLabel: string;
  onChange: (value: "constraints" | "content" | "summary") => void;
}) {
  const options = [
    { value: "constraints" as const, label: loadoutText(props.copy, "设置") },
    { value: "content" as const, label: props.contentLabel },
    { value: "summary" as const, label: loadoutText(props.copy, "摘要") }
  ];
  return <nav className="loadout-mobile-decision-nav" aria-label={loadoutText(props.copy, "配装工作区区域")}>{options.map((option) => <button type="button" key={option.value} aria-pressed={props.value === option.value} onClick={() => props.onChange(option.value)}>{option.label}</button>)}</nav>;
}

function EditorPaneSwitcher(props: {
  copy: LoadoutsCopy;
  value: "content" | "summary";
  onChange: (value: "content" | "summary") => void;
}) {
  return <nav className="loadout-mobile-decision-nav loadout-mobile-editor-nav" aria-label={loadoutText(props.copy, "配装编辑区域")}><button type="button" aria-pressed={props.value === "content"} onClick={() => props.onChange("content")}>{loadoutText(props.copy, "构筑")}</button><button type="button" aria-pressed={props.value === "summary"} onClick={() => props.onChange("summary")}>{loadoutText(props.copy, "摘要")}</button></nav>;
}

function EditorDecisionSummary(props: {
  copy: LoadoutsCopy;
  draft: CreateLocalLoadoutPlanInput;
  planMatch: ReturnType<typeof matchLocalLoadoutPlan> | null;
  candidate: ArmorPlannerCandidateView | null;
  accountSummary: AccountSummary | null;
  accountItems: AccountItemSummary[];
  mobileActive: boolean;
}) {
  const copy = props.copy;
  const waitingCount = (props.planMatch?.available_count ?? 0) + (props.planMatch?.needs_selection_count ?? 0);
  const issueCount = (props.planMatch?.missing_count ?? 0) + (props.planMatch?.plug_unavailable_count ?? 0);
  const targetCharacter = props.accountSummary?.characters.find((character) => character.character_id === props.draft.target_character_id) ?? null;
  const canPrepareWear = Boolean(targetCharacter && props.planMatch?.selected_count && waitingCount === 0 && issueCount === 0);
  const persistedArmorPlan = props.candidate ? null : buildPersistedArmorPlanView(copy, props.draft, props.accountItems);
  const statGapSummary = (target: number | undefined, value: number, shortfall: number) => target === undefined
    ? loadoutText(copy, "未设目标")
    : shortfall
      ? loadoutTemplate(copy, "差 {gap}", { gap: shortfall })
      : loadoutTemplate(copy, "目标 {target}", { target });
  return (
    <aside className="loadout-build-summary" data-mobile-active={props.mobileActive || undefined} aria-label={loadoutText(copy, "构筑实时摘要")}>
      <div className="loadout-decision-pane-head"><div><strong>{loadoutText(copy, "实时摘要")}</strong><small>{loadoutText(copy, "基于当前草稿和账号装备数据")}</small></div><span data-status={canPrepareWear ? "ready" : "warning"}>{canPrepareWear ? loadoutText(copy, "可准备穿戴") : loadoutText(copy, "仍需处理")}</span></div>
      {props.candidate ? <>
        <dl className="loadout-summary-stat-grid">{props.candidate.summary.stats.map((stat) => <div key={stat.key} data-status={stat.meetsTarget ? "ready" : "warning"}><dt>{armorStatLabel(copy, stat.key)}</dt><dd><strong>{stat.value}</strong><small>{statGapSummary(stat.minimum, stat.value, stat.shortfall)}</small></dd></div>)}</dl>
        <div className="loadout-summary-metrics"><div><span>{loadoutText(copy, "距离目标")}</span><strong>{props.candidate.summary.totalGap}</strong></div><div><span>{loadoutText(copy, "超出目标")}</span><strong>{props.candidate.summary.statWaste}</strong></div><div><span>{loadoutText(copy, "套装效果")}</span><strong>{armorSetCoverageLabel(copy, props.candidate.summary.armorSetCoverage)}</strong></div><div><span>{loadoutText(copy, "属性模组")}</span><strong>+5 × {props.candidate.summary.armorModUsage.plus5} · +10 × {props.candidate.summary.armorModUsage.plus10}</strong></div></div>
      </> : persistedArmorPlan ? <>
        <div className="loadout-selected-candidate-title" data-status={persistedArmorPlan.complete ? "ready" : "warning"}><span>{loadoutText(copy, "已保存逐件护甲计划")}</span><strong>{persistedArmorPlan.complete ? loadoutText(copy, "五个部位已恢复") : loadoutTemplate(copy, "已恢复 {count}/5 个部位", { count: persistedArmorPlan.pieces.length })}</strong><small>{loadoutText(copy, "摘要来自草稿中的具体装备、模组与能量安排，不依赖临时计算结果。")}</small></div>
        <dl className="loadout-summary-stat-grid">{loadoutPlanArmorStatKeys.map((stat) => { const target = props.draft.armor_constraints?.stat_minimums[stat]; const value = persistedArmorPlan.stats[stat]; const shortfall = target === undefined ? 0 : Math.max(0, target - value); return <div key={stat} data-status={shortfall ? "warning" : "ready"}><dt>{armorStatLabel(copy, stat)}</dt><dd><strong>{value}</strong><small>{statGapSummary(target, value, shortfall)}</small></dd></div>; })}</dl>
        <div className="loadout-summary-metrics"><div><span>{loadoutText(copy, "距离目标")}</span><strong>{persistedArmorPlan.totalGap}</strong></div><div><span>{loadoutText(copy, "超出目标")}</span><strong>{persistedArmorPlan.statWaste}</strong></div><div><span>{loadoutText(copy, "逐件计划")}</span><strong>{persistedArmorPlan.pieces.length}/5</strong></div><div><span>{loadoutText(copy, "属性模组")}</span><strong>+5 × {persistedArmorPlan.plus5} · +10 × {persistedArmorPlan.plus10}</strong></div></div>
        <div className="loadout-persisted-armor-pieces">{persistedArmorPlan.pieces.map((piece) => <div key={`${piece.slot}-${piece.instanceId}`}><span>{armorSlotLabel(copy, piece.slot)}</span><strong>{piece.name}</strong><small>{piece.detail}</small></div>)}</div>
      </> : <div className="loadout-summary-empty"><strong>{loadoutText(copy, "尚未选择护甲方案")}</strong><span>{loadoutText(copy, "在“护甲与模组”中运行自动配甲并使用一个库存或升级方案后，这里会显示最终六维和逐件安排。")}</span></div>}
      <section className="loadout-summary-checks"><h3>{loadoutText(copy, "当前问题")}</h3><ul><li data-status={targetCharacter ? "success" : "warning"}><span>{targetCharacter ? "✓" : "!"}</span><span>{targetCharacter ? loadoutTemplate(copy, "目标角色：{class}", { class: targetCharacter.class_name }) : loadoutText(copy, "目标角色尚未核对")}</span></li><li data-status={waitingCount ? "warning" : "success"}><span>{waitingCount ? "!" : "✓"}</span><span>{loadoutTemplate(copy, "{count} 个装备目标等待选择具体装备", { count: waitingCount })}</span></li><li data-status={issueCount ? "warning" : "success"}><span>{issueCount ? "!" : "✓"}</span><span>{loadoutTemplate(copy, "{count} 个缺失或模组无法安装问题", { count: issueCount })}</span></li></ul></section>
    </aside>
  );
}

function EditorTargetGroup(props: {
  copy: LoadoutsCopy;
  title: string;
  description: string;
  targets: Array<{ target: CreateLocalLoadoutPlanInput["item_targets"][number]; index: number }>;
  matches: LocalLoadoutPlanItemMatch[];
  draft: CreateLocalLoadoutPlanInput;
  action?: ReactNode;
  onUpdate: (index: number, target: CreateLocalLoadoutPlanInput["item_targets"][number]) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <section className="loadout-slot-editor-section" aria-label={props.title}>
      <header className="loadout-local-section-head"><div><strong>{props.title}</strong><small>{props.description}</small></div><div className="loadout-section-head-actions"><span>{loadoutTemplate(props.copy, "{count} 项", { count: props.targets.length })}</span>{props.action}</div></header>
      <ul className="loadout-item-list loadout-slot-editor-grid" data-surface="list">
        {props.targets.map(({ target, index }) => <LocalPlanItemRow key={`${target.slot}-${target.selected_instance_id ?? target.item_hash ?? index}-${index}`} copy={props.copy} index={index} target={target} match={props.matches[index] ?? null} onChange={props.onUpdate} onRemove={() => props.onRemove(index)} />)}
      </ul>
      {!props.targets.length ? <div className="loadout-slot-group-empty"><strong>{loadoutTemplate(props.copy, "尚未配置{title}", { title: props.title })}</strong><span>{loadoutText(props.copy, "从账号装备中选择具体装备后，会按位置加入这里。")}</span></div> : null}
    </section>
  );
}

const standardLoadoutSlots = [
  { key: "动能武器", group: "weapon" },
  { key: "能量武器", group: "weapon" },
  { key: "威能武器", group: "weapon" },
  { key: "头盔", group: "armor" },
  { key: "臂铠", group: "armor" },
  { key: "胸甲", group: "armor" },
  { key: "腿甲", group: "armor" },
  { key: "职业物品", group: "armor" }
] as const;

function StandardSlotEditorGroup(props: {
  copy: LoadoutsCopy;
  title: string;
  description: string;
  group: "weapon" | "armor";
  draft: CreateLocalLoadoutPlanInput;
  matches: LocalLoadoutPlanItemMatch[];
  action?: ReactNode;
  onOpenSlot: (slot: string) => void;
  onUpdate: (index: number, target: CreateLocalLoadoutPlanInput["item_targets"][number]) => void;
  onRemove: (index: number) => void;
}) {
  const slots = standardLoadoutSlots.filter((slot) => slot.group === props.group);
  const armorRules = normalizeLoadoutPlanArmorStatModSlotRules(props.draft.armor_constraints);
  return (
    <section className={`loadout-slot-editor-section loadout-slot-editor-${props.group}`} aria-label={props.title}>
      <header className="loadout-local-section-head"><div><strong>{props.title}</strong><small>{props.description}</small></div><div className="loadout-section-head-actions"><span>{loadoutTemplate(props.copy, "{count} 个固定槽位", { count: slots.length })}</span>{props.action}</div></header>
      <ul className="loadout-item-list loadout-slot-editor-grid" data-group={props.group} data-surface="list">
        {slots.map((slot) => {
          const index = props.draft.item_targets.findIndex((target) => standardSlotKey(target.slot) === slot.key);
          const target = index >= 0 ? props.draft.item_targets[index] : null;
          const armorSlot = standardArmorSlot(slot.key);
          const armorRule = armorSlot ? armorRules.find((rule) => rule.slot === armorSlot) : undefined;
          const armorAssignment = target?.selected_instance_id
            ? props.draft.armor_plan?.planned_armor_plugs.find((assignment) => assignment.instance_id === target.selected_instance_id)
            : undefined;
          if (target) return <LocalPlanItemRow id={`loadout-slot-${standardSlotDomId(slot.key)}`} key={slot.key} copy={props.copy} index={index} target={target} match={props.matches[index] ?? null} armorRule={armorRule} armorAssignment={armorAssignment} onChange={props.onUpdate} onRemove={() => props.onRemove(index)} onOpenPicker={() => props.onOpenSlot(slot.key)} />;
          return <li className="loadout-empty-standard-slot" key={slot.key}><button id={`loadout-slot-${standardSlotDomId(slot.key)}`} type="button" onClick={() => props.onOpenSlot(slot.key)}><span className="loadout-slot-index">+</span><span><strong>{loadoutText(props.copy, slot.key)}</strong><small>{armorRule ? loadoutTemplate(props.copy, "{rule} · 选择真实护甲", { rule: formatArmorStatModSlotRule(props.copy, armorRule) }) : loadoutText(props.copy, "选择账号内真实装备")}</small></span></button></li>;
        })}
      </ul>
    </section>
  );
}

function standardSlotDomId(slot: string): string {
  return encodeURIComponent(slot).replaceAll("%", "-").toLocaleLowerCase();
}

function applicationLoadoutInGameReferenceId(reference: ApplicationLoadoutInGameReference): string {
  return `in-game:${reference.character.character_id}:${reference.slot.index}`;
}

function standardSlotKey(slot: string): typeof standardLoadoutSlots[number]["key"] | undefined {
  const normalized = slot.trim().toLocaleLowerCase();
  if (/动能|kinetic/.test(normalized)) return "动能武器";
  if (/能量武器|^能量$|energy weapon|^energy$/.test(normalized)) return "能量武器";
  if (/威能|重型|power weapon|heavy/.test(normalized)) return "威能武器";
  if (/头盔|头部|helmet/.test(normalized)) return "头盔";
  if (/臂铠|手套|手部|gauntlet|arms/.test(normalized)) return "臂铠";
  if (/胸甲|胸部|chest/.test(normalized)) return "胸甲";
  if (/腿甲|腿部|leg/.test(normalized)) return "腿甲";
  if (/职业物品|class item|hunter cloak|titan mark|warlock bond|cloak|mark|bond/.test(normalized)) return "职业物品";
  return undefined;
}

function standardArmorSlot(slot: string): ArmorSlot | undefined {
  const key = standardSlotKey(slot);
  if (key === "头盔") return "helmet";
  if (key === "臂铠") return "arms";
  if (key === "胸甲") return "chest";
  if (key === "腿甲") return "legs";
  if (key === "职业物品") return "class";
  return undefined;
}

type DraftArmorEffect = "keep" | "settings" | "targets" | "reset";

type ArmorPlanChangeKind = "stat_minimums" | "mod_rules" | "fragment_bonuses" | "planning_settings" | "equipment_targets";

// 三类会作废候选的输入必须分开点名，因为重算范围不同：模组改了装备组合往往不变，
// 六维目标或碎片改了可能整套都要换。另外两类是同样作废候选的其余输入。
const armorPlanChangeKeys: Record<ArmorPlanChangeKind, string> = {
  stat_minimums: "护甲要求（六维最低值）",
  mod_rules: "模组调整",
  fragment_bonuses: "技能与碎片读数",
  planning_settings: "规划方式、优先顺序、套装与装备范围",
  equipment_targets: "护甲装备目标"
};

function armorPlanChangeLabel(copy: LoadoutsCopy, kind: ArmorPlanChangeKind): string {
  return loadoutText(copy, armorPlanChangeKeys[kind]);
}

function withoutArmorPlan(next: CreateLocalLoadoutPlanInput): CreateLocalLoadoutPlanInput {
  const { armor_plan: _ignored, ...rest } = next;
  return rest;
}

function armorPlanChangeKinds(
  baseline: LoadoutPlanArmorConstraints,
  current: LoadoutPlanArmorConstraints,
  equipmentChanged: boolean
): ArmorPlanChangeKind[] {
  const kinds: ArmorPlanChangeKind[] = [];
  if (armorStatProfileKey(baseline.stat_minimums) !== armorStatProfileKey(current.stat_minimums)) kinds.push("stat_minimums");
  if (armorStatProfileKey(baseline.fragment_stat_bonuses) !== armorStatProfileKey(current.fragment_stat_bonuses)) kinds.push("fragment_bonuses");
  if (canonicalJson(baseline.armor_stat_mod_slot_rules ?? []) !== canonicalJson(current.armor_stat_mod_slot_rules ?? [])
    || baseline.five_point_mod_budget !== current.five_point_mod_budget
    || baseline.ten_point_mod_budget !== current.ten_point_mod_budget) kinds.push("mod_rules");
  if (canonicalJson(armorPlanningSettings(baseline)) !== canonicalJson(armorPlanningSettings(current))) kinds.push("planning_settings");
  if (equipmentChanged) kinds.push("equipment_targets");
  return kinds;
}

function armorPlanningSettings(constraints: LoadoutPlanArmorConstraints) {
  return {
    planner_mode: constraints.planner_mode ?? "owned",
    priority_stats: constraints.priority_stats,
    set_constraint: constraints.set_constraint ?? { mode: "none" },
    allowed_locations: [...constraints.allowed_locations].sort(),
    exotic_item_hash: constraints.exotic_item_hash ?? 0,
    exotic_instance_id: constraints.exotic_instance_id ?? "",
    locked_instance_ids: [...constraints.locked_instance_ids].sort(),
    excluded_instance_ids: [...constraints.excluded_instance_ids].sort()
  };
}

function armorStatProfileKey(values: Partial<Record<LoadoutPlanArmorStatKey, number>>): string {
  return loadoutPlanArmorStatKeys.map((key) => values[key] ?? 0).join(",");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function ArmorPlannerModeControl(props: {
  copy: LoadoutsCopy;
  mode: ArmorPlannerMode;
  onChange: (mode: ArmorPlannerMode) => void;
}) {
  const copy = props.copy;
  const options: Array<{ mode: ArmorPlannerMode; label: string; description: string }> = [
    { mode: "owned", label: loadoutText(copy, "当前库存"), description: loadoutText(copy, "从账号护甲中寻找可直接使用的方案") },
    { mode: "theoretical", label: loadoutText(copy, "理论上限"), description: loadoutText(copy, "只按 Armor 3.0 规则判断目标是否成立") },
    { mode: "acquisition", label: loadoutText(copy, "待刷目标"), description: loadoutText(copy, "区分已有、待升级和仍需获取的护甲") },
    { mode: "upgrade", label: loadoutText(copy, "升级路径"), description: loadoutText(copy, "从当前五件基线计算最少替换方案") }
  ];

  function handleModeKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    const nextIndex = getRovingFocusIndex({
      key: event.key,
      currentIndex,
      itemCount: options.length,
      orientation: "horizontal"
    });
    if (nextIndex === null) return;
    event.preventDefault();
    const nextOption = options[nextIndex];
    if (!nextOption) return;
    props.onChange(nextOption.mode);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]
      ?.focus();
  }

  return (
    <div className="loadout-armor-mode-control" data-ui-kind="segmented-control" role="tablist" aria-label={loadoutText(copy, "护甲规划模式")}>
      {options.map((option, index) => <button type="button" id={`loadout-armor-mode-${option.mode}`} key={option.mode} role="tab" aria-controls="loadout-armor-planner-panel" aria-selected={props.mode === option.mode} tabIndex={props.mode === option.mode ? 0 : -1} onClick={() => props.onChange(option.mode)} onKeyDown={(event) => handleModeKeyDown(event, index)}><strong>{option.label}</strong><small>{option.description}</small></button>)}
    </div>
  );
}

type ArmorModPreflightView = {
  status: "ready" | "warning" | "unknown";
  summary: string;
  details: string[];
  slots: Record<ArmorSlot, {
    status: "ready" | "warning" | "unknown";
    summary: string;
  }>;
};

function ArmorStatModSlotRulesEditor(props: {
  copy: LoadoutsCopy;
  constraints: LoadoutPlanArmorConstraints;
  preflight: ArmorModPreflightView;
  onChange: (constraints: LoadoutPlanArmorConstraints) => void;
}) {
  const copy = props.copy;
  const rules = normalizeLoadoutPlanArmorStatModSlotRules(props.constraints);
  const summary = summarizeLoadoutPlanArmorStatModRules(props.constraints);
  const modeOptions: Array<{ value: LoadoutPlanArmorStatModSlotRule["mode"]; label: string }> = [
    { value: "auto", label: loadoutText(copy, "自动") },
    { value: "none", label: loadoutText(copy, "不装") },
    { value: "plus5", label: "+5" },
    { value: "plus10", label: "+10" }
  ];

  function updateRule(slot: ArmorSlot, update: Partial<LoadoutPlanArmorStatModSlotRule>) {
    const nextRules = rules.map((rule) => {
      if (rule.slot !== slot) return rule;
      const nextMode = update.mode ?? rule.mode;
      const nextStat = nextMode === "plus5" || nextMode === "plus10"
        ? "stat" in update ? update.stat : rule.stat
        : undefined;
      return { slot, mode: nextMode, ...(nextStat ? { stat: nextStat } : {}) };
    });
    const nextSummary = summarizeLoadoutPlanArmorStatModRules({
      armor_stat_mod_slot_rules: nextRules,
      five_point_mod_budget: 0,
      ten_point_mod_budget: 0
    });
    props.onChange({
      ...props.constraints,
      armor_stat_mod_slot_rules: nextRules,
      five_point_mod_budget: nextSummary.plus5,
      ten_point_mod_budget: nextSummary.plus10
    });
  }

  return (
    <section className="loadout-armor-mod-plan" aria-label={loadoutText(copy, "逐部位属性模组")}>
      <div className="loadout-armor-constraint-head">
        <div><strong>{loadoutText(copy, "逐部位属性模组")}</strong><small>{loadoutText(copy, "每个部位独立决定自动、不安装、+5 或 +10；固定数值后仍可指定属性。")}</small></div>
        <span aria-live="polite">{loadoutTemplate(copy, "+5 × {plus5} · +10 × {plus10} · 自动 {auto}", { plus5: summary.plus5, plus10: summary.plus10, auto: summary.automatic })}</span>
      </div>
      <div className="loadout-armor-mod-slot-rules">
        {rules.map((rule) => {
          const fixedValue = rule.mode === "plus5" || rule.mode === "plus10";
          const preflight = props.preflight.slots[rule.slot];
          return <div className="loadout-armor-mod-slot-rule" key={rule.slot} data-status={preflight.status}>
            <div className="loadout-armor-mod-slot-head"><strong>{armorSlotLabel(copy, rule.slot)}</strong>{preflight.status === "warning" ? <small>{preflight.summary}</small> : null}</div>
            <div className="loadout-armor-mod-mode" role="radiogroup" aria-label={loadoutTemplate(copy, "{slot}属性模组", { slot: armorSlotLabel(copy, rule.slot) })}>
              {modeOptions.map((option) => <label key={option.value} data-selected={rule.mode === option.value || undefined}><input type="radio" name={`armor-stat-mod-${rule.slot}`} value={option.value} checked={rule.mode === option.value} onChange={() => updateRule(rule.slot, { mode: option.value })} /><span>{option.label}</span></label>)}
            </div>
            {fixedValue ? <label className="loadout-armor-mod-stat"><span>{loadoutText(copy, "增加属性")}</span><select value={rule.stat ?? ""} onChange={(event) => updateRule(rule.slot, { stat: (event.target.value || undefined) as LoadoutPlanArmorStatModSlotRule["stat"] })}><option value="">{loadoutText(copy, "自动选择属性")}</option>{loadoutPlanArmorStatKeys.map((stat) => <option key={stat} value={stat}>{armorStatLabel(copy, stat)}</option>)}</select></label> : null}
          </div>;
        })}
      </div>
      <details className="loadout-armor-tuning-note"><summary>{loadoutText(copy, "计算说明")}</summary><p>{loadoutText(copy, "T5 护甲调整由系统逐件自动选择，不消耗能量，也不计入属性模组数量。")}</p></details>
      <div className="loadout-armor-mod-preflight" data-status={props.preflight.status === "ready" ? "success" : props.preflight.status === "warning" ? "warning" : "neutral"}>
        <strong>{props.preflight.summary}</strong>
        {props.preflight.details.length ? <ul>{props.preflight.details.map((detail) => <li key={detail}>{detail}</li>)}</ul> : null}
      </div>
    </section>
  );
}

function ArmorPriorityEditor(props: {
  copy: LoadoutsCopy;
  constraints: LoadoutPlanArmorConstraints;
  onChange: (constraints: LoadoutPlanArmorConstraints) => void;
}) {
  const copy = props.copy;
  const priorityStats = props.constraints.priority_stats;
  const availableStats = loadoutPlanArmorStatKeys.filter((stat) => !priorityStats.includes(stat));

  function moveStat(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= priorityStats.length) return;
    const next = [...priorityStats];
    const current = next[index];
    const target = next[nextIndex];
    if (!current || !target) return;
    next[index] = target;
    next[nextIndex] = current;
    props.onChange({ ...props.constraints, priority_stats: next });
  }

  return (
    <section className="loadout-armor-priority-editor" aria-label={loadoutText(copy, "属性优先顺序")}>
      <div className="loadout-armor-constraint-head"><div><strong>{loadoutText(copy, "属性优先顺序")}</strong><small>{loadoutText(copy, "顺序会影响计算和推荐方案排序。")}</small></div><span>{priorityStats.length ? loadoutTemplate(copy, "{count} 项", { count: priorityStats.length }) : loadoutText(copy, "未设置")}</span></div>
      {priorityStats.length ? <ol>{priorityStats.map((stat, index) => <li key={stat}><span>{index + 1}</span><strong>{armorStatLabel(copy, stat)}</strong><div><button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={index === 0} onClick={() => moveStat(index, -1)} aria-label={loadoutTemplate(copy, "上移{stat}", { stat: armorStatLabel(copy, stat) })}>{loadoutText(copy, "上移")}</button><button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={index === priorityStats.length - 1} onClick={() => moveStat(index, 1)} aria-label={loadoutTemplate(copy, "下移{stat}", { stat: armorStatLabel(copy, stat) })}>{loadoutText(copy, "下移")}</button><button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onChange({ ...props.constraints, priority_stats: priorityStats.filter((item) => item !== stat) })}>{loadoutText(copy, "移除")}</button></div></li>)}</ol> : <p>{loadoutText(copy, "未设置时只按照最低值、距离目标和超出目标的属性排序。")}</p>}
      {availableStats.length ? <label className="loadout-armor-priority-add"><span>{loadoutText(copy, "添加优先属性")}</span><select value="" onChange={(event) => { const stat = event.target.value as LoadoutPlanArmorStatKey; if (stat) props.onChange({ ...props.constraints, priority_stats: [...priorityStats, stat] }); }}><option value="">{loadoutText(copy, "选择属性")}</option>{availableStats.map((stat) => <option key={stat} value={stat}>{armorStatLabel(copy, stat)}</option>)}</select></label> : null}
    </section>
  );
}

function ArmorFragmentAdjustmentsEditor(props: {
  copy: LoadoutsCopy;
  constraints: LoadoutPlanArmorConstraints;
  /** 草稿里玩家自己填过的键。用来把「自动求和」和「手动覆盖」分开标，0 也算手动填过。 */
  explicit: Partial<Record<LoadoutPlanArmorStatKey, number>>;
  detected: Partial<Record<LoadoutPlanArmorStatKey, number>>;
  onChange: (constraints: LoadoutPlanArmorConstraints) => void;
}) {
  const copy = props.copy;
  const hasDetected = loadoutPlanArmorStatKeys.some((stat) => props.detected[stat]);
  return (
    <section className="loadout-armor-fragment-adjustments" aria-label={loadoutText(copy, "技能与碎片属性变化")}>
      <div className="loadout-armor-constraint-head"><div><strong>{loadoutText(copy, "技能与碎片属性变化")}</strong><small>{hasDetected ? loadoutText(copy, "已按目标角色当前装备的子职业自动求和，可以逐项覆盖，支持负数。") : loadoutText(copy, "填写构筑中已经确定的额外属性变化，可使用负数。")}</small></div></div>
      <div>{loadoutPlanArmorStatKeys.map((stat) => {
        const overridden = props.explicit[stat] !== undefined;
        return (
          <label key={stat} data-source={overridden ? "manual" : props.detected[stat] ? "detected" : "none"}>
            <span>{armorStatLabel(copy, stat)}{!overridden && props.detected[stat] ? loadoutText(copy, "（自动）") : ""}</span>
            <input type="number" step="5" value={props.constraints.fragment_stat_bonuses[stat] ?? 0} onChange={(event) => props.onChange({ ...props.constraints, fragment_stat_bonuses: { ...props.constraints.fragment_stat_bonuses, [stat]: Number(event.target.value) || 0 } })} />
          </label>
        );
      })}</div>
    </section>
  );
}

function ArmorSetConstraintEditor(props: {
  copy: LoadoutsCopy;
  constraint: ArmorSetConstraint;
  catalog: ArmorSetCatalogEntry[];
  catalogStatus: "loading" | "ready" | "error";
  onChange: (constraint: ArmorSetConstraint) => void;
}) {
  const twoPieceSets = props.catalog.filter((item) => item.member_definitions_complete
    && item.bonuses?.some((bonus) => bonus.required_piece_count === 2));
  const fourPieceSets = props.catalog.filter((item) => item.member_definitions_complete
    && item.bonuses?.some((bonus) => bonus.required_piece_count === 4));
  const eligibleSetCount = new Set([...twoPieceSets, ...fourPieceSets].map((item) => item.hash)).size;
  const firstHash = twoPieceSets[0]?.hash ?? fourPieceSets[0]?.hash ?? 0;
  const secondHash = twoPieceSets.find((item) => item.hash !== firstHash)?.hash ?? 0;
  const singleConstraint = props.constraint.mode === "single" ? props.constraint : null;
  const splitConstraint = props.constraint.mode === "split-2-2" ? props.constraint : null;
  const mode = singleConstraint
    ? `single-${singleConstraint.piece_count}`
    : props.constraint.mode;

  function changeMode(value: string) {
    if (value === "single-2" || value === "single-4") {
      const catalog = value === "single-4" ? fourPieceSets : twoPieceSets;
      props.onChange({
        mode: "single",
        set_hash: singleConstraint && catalog.some((item) => item.hash === singleConstraint.set_hash)
          ? singleConstraint.set_hash
          : catalog[0]?.hash ?? 0,
        piece_count: value === "single-4" ? 4 : 2
      });
      return;
    }
    if (value === "split-2-2") {
      props.onChange({
        mode: "split-2-2",
        first_set_hash: splitConstraint?.first_set_hash ?? firstHash,
        second_set_hash: splitConstraint?.second_set_hash ?? secondHash
      });
      return;
    }
    props.onChange({ mode: "none" });
  }

  const unavailable = props.catalogStatus !== "ready" || eligibleSetCount === 0;
  const singleCatalog = props.constraint.mode === "single" && props.constraint.piece_count === 4
    ? fourPieceSets
    : twoPieceSets;
  const copy = props.copy;
  return (
    <div className="loadout-armor-constraint-section">
      <div className="loadout-armor-constraint-head"><div><strong>{loadoutText(copy, "套装要求")}</strong><small>{loadoutText(copy, "套装目录来自当前游戏数据，只列出拥有明确 2 件或 4 件奖励的套装。")}</small></div><span>{props.catalogStatus === "ready" ? loadoutTemplate(copy, "{count} 个可选套装", { count: eligibleSetCount }) : props.catalogStatus === "error" ? loadoutText(copy, "套装读取失败") : loadoutText(copy, "套装读取中")}</span></div>
      <div className="loadout-armor-set-fields">
        <label><span>{loadoutText(copy, "组合方式")}</span><select value={mode} disabled={unavailable} onChange={(event) => changeMode(event.target.value)}><option value="none">{loadoutText(copy, "不限制套装")}</option><option value="single-2" disabled={!twoPieceSets.length}>{loadoutText(copy, "指定 2 件套")}</option><option value="single-4" disabled={!fourPieceSets.length}>{loadoutText(copy, "指定 4 件套")}</option><option value="split-2-2" disabled={twoPieceSets.length < 2}>{loadoutText(copy, "两个 2 件套")}</option></select></label>
        {singleConstraint ? <label><span>{loadoutText(copy, "目标套装")}</span><select value={singleConstraint.set_hash} onChange={(event) => props.onChange({ ...singleConstraint, set_hash: Number(event.target.value) })}>{singleCatalog.map((item) => <option key={item.hash} value={item.hash}>{item.name}</option>)}</select></label> : null}
        {splitConstraint ? <><label><span>{loadoutText(copy, "第一套装")}</span><select value={splitConstraint.first_set_hash} onChange={(event) => props.onChange({ ...splitConstraint, first_set_hash: Number(event.target.value) })}>{twoPieceSets.map((item) => <option key={item.hash} value={item.hash}>{item.name}</option>)}</select></label><label><span>{loadoutText(copy, "第二套装")}</span><select value={splitConstraint.second_set_hash} onChange={(event) => props.onChange({ ...splitConstraint, second_set_hash: Number(event.target.value) })}>{twoPieceSets.map((item) => <option key={item.hash} value={item.hash} disabled={item.hash === splitConstraint.first_set_hash}>{item.name}</option>)}</select></label></> : null}
      </div>
    </div>
  );
}

function ArmorInventoryConstraintEditor(props: {
  copy: LoadoutsCopy;
  mode: ArmorPlannerMode;
  constraints: LoadoutPlanArmorConstraints;
  armorItems: AccountItemSummary[];
  onChange: (constraints: LoadoutPlanArmorConstraints) => void;
}) {
  const copy = props.copy;
  const locations: Array<{ key: LoadoutPlanArmorConstraints["allowed_locations"][number]; label: string }> = [
    { key: "equipped", label: loadoutText(copy, "已装备") },
    { key: "inventory", label: loadoutText(copy, "角色背包") },
    { key: "vault", label: loadoutText(copy, "仓库") },
    { key: "postmaster", label: loadoutText(copy, "邮政官") }
  ];
  const exoticItems = props.armorItems.filter(isExoticArmorItem);
  const lockedIds = props.constraints.locked_instance_ids;
  const excludedIds = props.constraints.excluded_instance_ids;

  function addLocked(instanceId: string) {
    if (!instanceId) return;
    props.onChange({
      ...props.constraints,
      locked_instance_ids: uniqueStrings([...lockedIds, instanceId]),
      excluded_instance_ids: excludedIds.filter((id) => id !== instanceId)
    });
  }

  function addExcluded(instanceId: string) {
    if (!instanceId) return;
    props.onChange({
      ...props.constraints,
      excluded_instance_ids: uniqueStrings([...excludedIds, instanceId]),
      locked_instance_ids: lockedIds.filter((id) => id !== instanceId),
      ...(props.constraints.exotic_instance_id === instanceId
        ? { exotic_instance_id: undefined, exotic_item_hash: undefined }
        : {})
    });
  }

  return (
    <div className="loadout-armor-constraint-section">
      <div className="loadout-armor-constraint-head"><div><strong>{props.mode === "acquisition" ? loadoutText(copy, "已有装备范围") : props.mode === "upgrade" ? loadoutText(copy, "升级基线与装备范围") : loadoutText(copy, "当前库存范围")}</strong><small>{props.mode === "acquisition" ? loadoutText(copy, "位置范围只影响已有同款和近似装备的核对。") : props.mode === "upgrade" ? loadoutText(copy, "优先使用方案已选择的五件护甲，否则使用目标角色当前装备作为基线。") : loadoutText(copy, "固定、排除和位置范围都作用于当前账号中的具体装备。")}</small></div></div>
      <div className="loadout-armor-location-list" role="group" aria-label={loadoutText(copy, "允许的护甲位置")}>{locations.map((location) => { const checked = props.constraints.allowed_locations.includes(location.key); return <label key={location.key}><input type="checkbox" checked={checked} disabled={checked && props.constraints.allowed_locations.length === 1} onChange={(event) => props.onChange({ ...props.constraints, allowed_locations: event.target.checked ? uniqueValues([...props.constraints.allowed_locations, location.key]) : props.constraints.allowed_locations.filter((item) => item !== location.key) })} /><span>{location.label}</span></label>; })}</div>
      {props.mode !== "acquisition" ? <div className="loadout-armor-inventory-fields">
        <label><span>{loadoutText(copy, "固定异域护甲")}</span><select value={props.constraints.exotic_instance_id ?? ""} onChange={(event) => { const item = props.armorItems.find((candidate) => candidate.instance_id === event.target.value); props.onChange({ ...props.constraints, exotic_instance_id: item?.instance_id, exotic_item_hash: item?.hash, locked_instance_ids: item?.instance_id ? lockedIds.filter((id) => id !== item.instance_id) : lockedIds, excluded_instance_ids: item?.instance_id ? excludedIds.filter((id) => id !== item.instance_id) : excludedIds }); }}><option value="">{loadoutText(copy, "不固定异域")}</option>{exoticItems.map((item) => <option key={item.instance_id} value={item.instance_id}>{armorItemOptionLabel(copy, item)}</option>)}</select></label>
        <label><span>{loadoutText(copy, "固定装备")}</span><select value="" onChange={(event) => addLocked(event.target.value)}><option value="">{loadoutText(copy, "添加固定装备")}</option>{props.armorItems.filter((item) => item.instance_id !== props.constraints.exotic_instance_id && !lockedIds.includes(item.instance_id!) && !excludedIds.includes(item.instance_id!)).map((item) => <option key={item.instance_id} value={item.instance_id}>{armorItemOptionLabel(copy, item)}</option>)}</select></label>
        <label><span>{loadoutText(copy, "排除装备")}</span><select value="" onChange={(event) => addExcluded(event.target.value)}><option value="">{loadoutText(copy, "添加排除装备")}</option>{props.armorItems.filter((item) => item.instance_id !== props.constraints.exotic_instance_id && !lockedIds.includes(item.instance_id!) && !excludedIds.includes(item.instance_id!)).map((item) => <option key={item.instance_id} value={item.instance_id}>{armorItemOptionLabel(copy, item)}</option>)}</select></label>
      </div> : null}
      {props.mode !== "acquisition" && (lockedIds.length || excludedIds.length) ? <div className="loadout-armor-instance-rules">
        {lockedIds.map((instanceId) => <span key={`locked-${instanceId}`} data-status="success">{loadoutTemplate(copy, "固定：{item}", { item: armorInstanceLabel(copy, instanceId, props.armorItems) })}<button type="button" aria-label={loadoutTemplate(copy, "取消固定 {item}", { item: armorInstanceLabel(copy, instanceId, props.armorItems) })} onClick={() => props.onChange({ ...props.constraints, locked_instance_ids: lockedIds.filter((id) => id !== instanceId) })}>×</button></span>)}
        {excludedIds.map((instanceId) => <span key={`excluded-${instanceId}`} data-status="warning">{loadoutTemplate(copy, "排除：{item}", { item: armorInstanceLabel(copy, instanceId, props.armorItems) })}<button type="button" aria-label={loadoutTemplate(copy, "取消排除 {item}", { item: armorInstanceLabel(copy, instanceId, props.armorItems) })} onClick={() => props.onChange({ ...props.constraints, excluded_instance_ids: excludedIds.filter((id) => id !== instanceId) })}>×</button></span>)}
      </div> : null}
    </div>
  );
}

function ArmorCandidateList(props: {
  copy: LoadoutsCopy;
  candidates: ArmorPlannerCandidateView[];
  stale: boolean;
  comparedCandidateIds: string[];
  onToggleCompare: (candidateId: string) => void;
  onSelect: (candidate: Extract<ArmorPlannerCandidateView, { kind: "owned" | "upgrade" }>) => void;
  onSaveAcquisitionTargets?: (candidate: Extract<ArmorPlannerCandidateView, { kind: "acquisition" }>) => void;
  isSavingAcquisitionTargets: boolean;
}) {
  const copy = props.copy;
  return (
    <div className="loadout-armor-candidate-list">
      {props.candidates.map((candidate, index) => {
        const selectable = candidate.kind === "owned" || candidate.kind === "upgrade";
        const compared = props.comparedCandidateIds.includes(candidate.summary.candidateId);
        const comparisonFull = props.comparedCandidateIds.length >= 3 && !compared;
        return (
          <article key={candidate.summary.candidateId} className="loadout-armor-candidate" data-status={candidate.summary.hardConstraintsMet ? "success" : "warning"}>
            <header><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{armorCandidateTitle(copy, candidate)}</strong><small>{armorCandidateSummary(copy, candidate)}</small></div><div className="loadout-candidate-header-actions"><em>{candidate.summary.hardConstraintsMet ? loadoutText(copy, "全部要求已满足") : loadoutTemplate(copy, "距离目标 {gap}", { gap: candidate.summary.totalGap })}</em><label><input type="checkbox" checked={compared} disabled={comparisonFull} onChange={() => props.onToggleCompare(candidate.summary.candidateId)} /><span>{compared ? loadoutText(copy, "已加入比较") : comparisonFull ? loadoutText(copy, "最多比较 3 项") : loadoutText(copy, "加入比较")}</span></label></div></header>
            <div className="loadout-candidate-metrics"><div><span>{loadoutText(copy, "距离目标")}</span><strong>{candidate.summary.totalGap}</strong></div><div><span>{loadoutText(copy, "最大单项差值")}</span><strong>{candidate.summary.maximumGap}</strong></div><div><span>{loadoutText(copy, "超出目标")}</span><strong>{candidate.summary.statWaste}</strong></div><div><span>{loadoutText(copy, "套装效果")}</span><strong>{armorSetCoverageLabel(copy, candidate.summary.armorSetCoverage)}</strong></div></div>
            <dl className="loadout-armor-stat-comparison">{candidate.summary.stats.map((stat) => <div key={stat.key} data-status={stat.meetsTarget ? "success" : "warning"}><dt>{armorStatLabel(copy, stat.key)}</dt><dd><strong>{stat.value}</strong><small>{stat.minimum === undefined ? loadoutText(copy, "未设下限") : stat.shortfall ? loadoutTemplate(copy, "差 {gap}", { gap: stat.shortfall }) : loadoutTemplate(copy, "目标 ≥ {target}", { target: stat.minimum })}</small></dd></div>)}</dl>
            <details className="loadout-candidate-pieces"><summary>{loadoutText(copy, "查看五件护甲、调整、模组与能量")}</summary><div className="loadout-armor-piece-list">{armorCandidatePieceRows(copy, candidate).map((piece) => <div key={piece.key}><span>{piece.slot}</span><strong>{piece.name}</strong><small>{piece.detail}</small></div>)}</div></details>
            <footer><span>{loadoutTemplate(copy, "+5 属性模组 × {plus5}，+10 属性模组 × {plus10} · 超出目标 {waste}", { plus5: candidate.summary.armorModUsage.plus5, plus10: candidate.summary.armorModUsage.plus10, waste: candidate.summary.statWaste })}</span><span>{armorSetCoverageLabel(copy, candidate.summary.armorSetCoverage)}</span>{selectable ? <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.stale} onClick={() => props.onSelect(candidate)}>{props.stale ? loadoutText(copy, "需要重新计算") : loadoutText(copy, "使用这套方案")}</button> : candidate.kind === "acquisition" && candidate.missingPieceCount > 0 && props.onSaveAcquisitionTargets ? <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.stale || props.isSavingAcquisitionTargets} onClick={() => props.onSaveAcquisitionTargets?.(candidate)}>{props.stale ? loadoutText(copy, "需要重新计算") : props.isSavingAcquisitionTargets ? loadoutText(copy, "正在保存目标") : loadoutTemplate(copy, "保存 {count} 个待刷缺口", { count: candidate.missingPieceCount })}</button> : null}</footer>
          </article>
        );
      })}
    </div>
  );
}

function ArmorCandidateComparison(props: { copy: LoadoutsCopy; candidates: ArmorPlannerCandidateView[] }) {
  const copy = props.copy;
  return (
    <section className="loadout-candidate-comparison" aria-label={loadoutText(copy, "护甲方案比较")}>
      <header><strong>{loadoutText(copy, "方案比较")}</strong><small>{loadoutText(copy, "比较只影响当前视图，不会修改配装草稿。")}</small></header>
      <div className="loadout-candidate-comparison-table" style={{ "--loadout-armor-compare-count": props.candidates.length } as CSSProperties}>
        <div className="loadout-candidate-comparison-row loadout-candidate-comparison-head"><strong>{loadoutText(copy, "比较项")}</strong>{props.candidates.map((candidate) => <span key={candidate.summary.candidateId}>{armorCandidateTitle(copy, candidate)}</span>)}</div>
        {loadoutPlanArmorStatKeys.map((stat) => <div className="loadout-candidate-comparison-row" key={stat}><strong>{armorStatLabel(copy, stat)}</strong>{props.candidates.map((candidate) => { const value = candidate.summary.stats.find((item) => item.key === stat); return <span key={candidate.summary.candidateId} data-status={value?.meetsTarget ? "ready" : "warning"}>{value?.value ?? 0}{value?.shortfall ? <small>{loadoutTemplate(copy, "差 {gap}", { gap: value.shortfall })}</small> : <small>{loadoutText(copy, "满足目标")}</small>}</span>; })}</div>)}
        <div className="loadout-candidate-comparison-row"><strong>{loadoutText(copy, "距离 / 超出")}</strong>{props.candidates.map((candidate) => <span key={candidate.summary.candidateId}>{loadoutTemplate(copy, "距离目标 {gap}", { gap: candidate.summary.totalGap })}<small>{loadoutTemplate(copy, "超出目标 {waste}", { waste: candidate.summary.statWaste })}</small></span>)}</div>
        <div className="loadout-candidate-comparison-row"><strong>{loadoutText(copy, "套装")}</strong>{props.candidates.map((candidate) => <span key={candidate.summary.candidateId}>{armorSetCoverageLabel(copy, candidate.summary.armorSetCoverage)}</span>)}</div>
        <div className="loadout-candidate-comparison-row"><strong>{loadoutText(copy, "获取与替换")}</strong>{props.candidates.map((candidate) => <span key={candidate.summary.candidateId}>{armorCandidateSummary(copy, candidate)}</span>)}</div>
      </div>
    </section>
  );
}

function ArmorPlannerDecisionSummary(props: {
  copy: LoadoutsCopy;
  candidate: ArmorPlannerCandidateView | null;
  constraints: LoadoutPlanArmorConstraints;
  stale: boolean;
  settingsChanged: boolean;
  mobileActive: boolean;
}) {
  const copy = props.copy;
  const modSummary = summarizeLoadoutPlanArmorStatModRules(props.constraints);
  return (
    <aside className="loadout-armor-summary-pane" data-mobile-active={props.mobileActive || undefined} aria-label={loadoutText(copy, "推荐方案摘要")}>
      <div className="loadout-decision-pane-head"><div><strong>{loadoutText(copy, "方案摘要")}</strong><small>{props.settingsChanged ? loadoutText(copy, "设置已变化，需要重新计算") : props.stale ? loadoutText(copy, "结果已过期，需要重新计算") : loadoutText(copy, "随当前比较选择更新")}</small></div></div>
      {props.candidate ? <>
        <div className="loadout-selected-candidate-title" data-status={props.candidate.summary.hardConstraintsMet ? "ready" : "warning"}><span>{armorCandidateTitle(copy, props.candidate)}</span><strong>{props.candidate.summary.hardConstraintsMet ? loadoutText(copy, "全部要求已满足") : loadoutTemplate(copy, "距离目标 {gap}", { gap: props.candidate.summary.totalGap })}</strong><small>{armorCandidateSummary(copy, props.candidate)}</small></div>
        <dl className="loadout-summary-stat-grid">{props.candidate.summary.stats.map((stat) => <div key={stat.key} data-status={stat.meetsTarget ? "ready" : "warning"}><dt>{armorStatLabel(copy, stat.key)}</dt><dd><strong>{stat.value}</strong><small>{stat.minimum === undefined ? loadoutText(copy, "未设目标") : stat.shortfall ? loadoutTemplate(copy, "差 {gap}", { gap: stat.shortfall }) : loadoutTemplate(copy, "目标 {target}", { target: stat.minimum })}</small></dd></div>)}</dl>
        <div className="loadout-summary-metrics"><div><span>{loadoutText(copy, "距离目标")}</span><strong>{props.candidate.summary.totalGap}</strong></div><div><span>{loadoutText(copy, "超出目标")}</span><strong>{props.candidate.summary.statWaste}</strong></div><div><span>{loadoutText(copy, "属性模组")}</span><strong>+5 × {props.candidate.summary.armorModUsage.plus5} · +10 × {props.candidate.summary.armorModUsage.plus10}</strong></div><div><span>{loadoutText(copy, "套装效果")}</span><strong>{armorSetCoverageLabel(copy, props.candidate.summary.armorSetCoverage)}</strong></div></div>
      </> : <div className="loadout-summary-empty"><strong>{loadoutText(copy, "等待计算结果")}</strong><span>{loadoutText(copy, "运行计算后，这里会持续显示当前方案的六维、差值、套装和获取成本。")}</span></div>}
      <section className="loadout-summary-checks"><h3>{loadoutText(copy, "逐部位规则")}</h3><ul>{normalizeLoadoutPlanArmorStatModSlotRules(props.constraints).map((rule) => <li key={rule.slot} data-status="success"><span>•</span><span>{loadoutTemplate(copy, "{slot}：{rule}", { slot: armorSlotLabel(copy, rule.slot), rule: formatArmorStatModSlotRule(copy, rule) })}</span></li>)}<li data-status="success"><span>✓</span><span>{loadoutTemplate(copy, "固定 +5 × {plus5} · +10 × {plus10} · 自动 {auto}", { plus5: modSummary.plus5, plus10: modSummary.plus10, auto: modSummary.automatic })}</span></li></ul></section>
    </aside>
  );
}

function LocalPlanItemRow(props: {
  copy: LoadoutsCopy;
  id?: string;
  index: number;
  target: CreateLocalLoadoutPlanInput["item_targets"][number];
  match: LocalLoadoutPlanItemMatch | null;
  armorRule?: LoadoutPlanArmorStatModSlotRule;
  armorAssignment?: NonNullable<CreateLocalLoadoutPlanInput["armor_plan"]>["planned_armor_plugs"][number];
  onChange: (index: number, target: CreateLocalLoadoutPlanInput["item_targets"][number]) => void;
  onRemove: () => void;
  onOpenPicker?: () => void;
}) {
  const copy = props.copy;
  const candidates = props.match?.candidates.filter((candidate) => candidate.item.instance_id) ?? [];
  const status = props.match?.status === "selected"
    ? loadoutText(copy, "已选装备")
    : props.match?.status === "available"
      ? loadoutText(copy, "可选择装备")
      : props.match?.status === "needs-selection"
        ? loadoutText(copy, "需要选择装备")
        : props.match?.status === "plug-unavailable"
          ? loadoutText(copy, "目标模组无法安装")
          : props.match?.status === "missing"
            ? loadoutText(copy, "账号内未找到")
            : loadoutText(copy, "尚未配置");
  const tone = props.match?.status === "selected" ? "success" : props.match ? "warning" : "neutral";
  const selectedCandidate = candidates.find((candidate) => candidate.item.instance_id === props.target.selected_instance_id) ?? null;
  const representative = selectedCandidate ?? candidates[0] ?? null;
  const itemName = representative?.item.name ?? props.target.slot;
  const itemMeta = representative
    ? [representative.item.bucket_name || props.target.slot, representative.item.item_type].filter(Boolean).join(" · ")
    : props.target.item_hash
      ? loadoutTemplate(copy, "目标定义 {hash}", { hash: props.target.item_hash })
      : loadoutText(copy, "尚未选择目标定义");
  const instanceLabel = representative?.item.instance_id
    ? loadoutTemplate(copy, "{location} · 装备标识 …{suffix}", {
        location: representative.location.label,
        suffix: representative.item.instance_id.slice(-4)
      })
    : candidates.length
      ? loadoutTemplate(copy, "{count} 件可选装备", { count: candidates.length })
      : loadoutText(copy, "当前账号没有可用装备");
  const armorPlanLabel = props.armorRule
    ? [
        formatArmorStatModSlotRule(copy, props.armorRule),
        props.armorAssignment
          ? loadoutTemplate(copy, "计划能量 {final}/{capacity}", {
              final: props.armorAssignment.final_energy,
              capacity: props.armorAssignment.energy_capacity
            })
          : loadoutText(copy, "尚未选择护甲方案")
      ].join(" · ")
    : "";
  const plugLabel = armorPlanLabel || (props.target.plug_hashes.length
    ? loadoutTemplate(copy, "{count} 项目标模组", { count: props.target.plug_hashes.length })
    : loadoutText(copy, "未指定目标模组"));
  if (props.onOpenPicker) {
    return (
      <li id={props.id} className="loadout-item" data-status={tone} data-clickable="true">
        <button type="button" className="loadout-item-primary" aria-label={loadoutTemplate(copy, "更换{slot}装备", { slot: props.target.slot })} onClick={props.onOpenPicker}>
          <ItemVisual icon={representative?.item.icon} label={itemName} bucketName={representative?.item.bucket_name ?? props.target.slot} />
          <div className="loadout-item-copy"><strong>{itemName}</strong><small>{itemMeta}</small></div>
          <div className="loadout-item-match"><strong>{instanceLabel}</strong><small>{plugLabel}</small></div>
        </button>
        <div className="loadout-item-actions"><span className="loadout-status-badge" data-status={tone}>{status}</span><button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onRemove}>{loadoutText(copy, "清空")}</button></div>
      </li>
    );
  }
  return (
    <li id={props.id} className="loadout-item" data-status={tone}>
      <ItemVisual icon={representative?.item.icon} label={itemName} bucketName={representative?.item.bucket_name ?? props.target.slot} />
      <div className="loadout-item-copy"><strong>{itemName}</strong><small>{itemMeta}</small></div>
      <div className="loadout-item-match"><strong>{instanceLabel}</strong><small>{plugLabel}</small></div>
        <div className="loadout-item-actions"><span className="loadout-status-badge" data-status={tone}>{status}</span><select value={props.target.selected_instance_id ?? ""} onChange={(event) => props.onChange(props.index, { ...props.target, selected_instance_id: event.target.value || undefined })} aria-label={loadoutTemplate(copy, "选择{slot}装备", { slot: props.target.slot })}><option value="">{loadoutText(copy, "不绑定具体装备")}</option>{props.target.selected_instance_id && !candidates.some((candidate) => candidate.item.instance_id === props.target.selected_instance_id) ? <option value={props.target.selected_instance_id}>{loadoutText(copy, "当前装备未定位")}</option> : null}{candidates.map((candidate) => <option key={candidate.item.instance_id} value={candidate.item.instance_id}>{candidate.item.name} · {candidate.location.label}</option>)}</select><button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onRemove}>{loadoutText(copy, "清空槽位")}</button></div>
    </li>
  );
}

function DimImportPanel(props: LoadoutsPageContentViewProps & {
  activeCharacter: AccountSummary["characters"][number] | null;
  copy: LoadoutsCopy;
  onCloseDimImport: () => void;
}) {
  const [url, setUrl] = useState("");
  const copy = props.copy;
  const preview = props.dimPreview;
  return (
    <section className="loadout-capability-notice" data-status="neutral" aria-label={loadoutText(copy, "DIM 配装导入")}>
      <div>
        <strong>{loadoutText(copy, "导入 DIM 配装")}</strong>
        <p>{loadoutText(copy, "粘贴包含配装数据的完整链接后在本地解析；不支持 dim.gg 短链接，也不会请求 DIM 接口。确认后只会预填应用配装编辑器。")}</p>
        <label className="loadout-dim-url-field"><span>{loadoutText(copy, "DIM 完整配装链接")}</span><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://app.destinyitemmanager.com/loadouts?loadout=..." /></label>
        {preview ? (
          <div className="loadout-dim-preview" data-surface="list">
            <strong>{preview.name}</strong>
            <small>{loadoutTemplate(copy, "{class} · {count} 个装备目标", { class: preview.class_name, count: preview.item_count })}</small>
            <small>{preview.warnings.length ? preview.warnings.join(" ") : loadoutText(copy, "已读取可确认的装备与配置。")}</small>
          </div>
        ) : null}
      </div>
      <div className="loadout-action-stack">
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onCloseDimImport}>{loadoutText(copy, "取消")}</button>
        {preview ? <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!props.activeCharacter} onClick={() => { props.actions.acceptDimImport(props.activeCharacter); props.onCloseDimImport(); }}>{loadoutText(copy, "使用此预览")}</button> : <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!url.trim() || props.localPlanIsPreviewingDim} onClick={() => props.actions.previewDimImport(url)}>{props.localPlanIsPreviewingDim ? loadoutText(copy, "读取中") : loadoutText(copy, "读取并预览")}</button>}
      </div>
    </section>
  );
}

function GuideImportPanel(props: LoadoutsPageContentViewProps & {
  activeCharacter: AccountSummary["characters"][number] | null;
  copy: LoadoutsCopy;
  onCloseGuideImport: () => void;
}) {
  const assistantPrefill = props.localPlanAssistantPrefill;
  const equipmentArtifact = assistantPrefill?.kind === "equipment_target_candidates"
    ? assistantPrefill
    : null;
  const assistantRawText = assistantPrefill && "raw_text" in assistantPrefill
    ? assistantPrefill.raw_text
    : "";
  const [sourceInput, setSourceInput] = useState(assistantRawText || props.localPlanLegacyGuideText);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>(
    equipmentArtifact?.candidates.map((candidate) => candidate.candidate_id)
      ?? []
  );
  useEffect(() => {
    setSourceInput(assistantRawText || props.localPlanLegacyGuideText);
  }, [assistantPrefill?.request_id, props.localPlanLegacyGuideText]);
  useEffect(() => {
    setSelectedCandidateIds(
      equipmentArtifact?.candidates.map((candidate) => candidate.candidate_id)
        ?? []
    );
  }, [assistantPrefill?.request_id]);
  const copy = props.copy;
  const restoredLegacyText = Boolean(props.localPlanLegacyGuideText && sourceInput === props.localPlanLegacyGuideText);
  if (equipmentArtifact) {
    const ownedCount = equipmentArtifact.candidates.filter((candidate) => candidate.status === "owned-instance").length;
    const definitionCount = equipmentArtifact.candidates.length - ownedCount;
    return (
      <section className="loadout-capability-notice loadout-assistant-target-review" data-status="neutral" aria-label={loadoutText(copy, "装备目标审阅")}>
        <div className="loadout-assistant-target-content">
          <strong>{loadoutText(copy, "审阅 AI 装备目标")}</strong>
          <p>{loadoutText(copy, "选择要带入草稿的装备。账号中已有的装备会直接选中；仅有装备定义的目标仍需先获取，再选择具体装备。")}</p>
          <p data-status="neutral">{loadoutTemplate(copy, "目标角色：{class} · 账号已有 {owned} 件 · 待获取 {defined} 件 · 已选 {selected} 项", {
            class: props.activeCharacter?.class_name ?? loadoutText(copy, "未选择"),
            owned: ownedCount,
            defined: definitionCount,
            selected: selectedCandidateIds.length
          })}</p>
          <ul className="loadout-assistant-target-list" data-surface="list">
            {equipmentArtifact.candidates.map((candidate) => {
              const checked = selectedCandidateIds.includes(candidate.candidate_id);
              return (
                <li key={candidate.candidate_id} data-status={candidate.status === "owned-instance" ? "success" : "warning"}>
                  <label>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => setSelectedCandidateIds((current) => event.target.checked
                        ? [...current, candidate.candidate_id]
                        : current.filter((id) => id !== candidate.candidate_id))}
                    />
                    <span>
                      <strong>{candidate.name}</strong>
                      <small>{[
                        candidate.bucket_name || candidate.item_type || formatEquipmentGroup(copy, candidate.group_key),
                        candidate.status === "owned-instance" ? formatCandidateLocation(copy, candidate) : loadoutText(copy, "当前只有资料记录，待获取具体装备")
                      ].filter(Boolean).join(" · ")}</small>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="loadout-action-stack">
          <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => { props.actions.dismissAssistantPrefill(); props.onCloseGuideImport(); }}>{loadoutText(copy, "取消")}</button>
          <button
            type="button"
            data-ui-kind="button"
            data-control-variant="primary"
            disabled={!selectedCandidateIds.length || !props.activeCharacter}
            onClick={() => {
              if (props.actions.acceptAssistantEquipmentTargets(equipmentArtifact, selectedCandidateIds, props.activeCharacter)) {
                props.onCloseGuideImport();
              }
            }}
          >
            {loadoutText(copy, "生成未保存草稿")}
          </button>
        </div>
      </section>
    );
  }
  return (
    <section className="loadout-capability-notice loadout-guide-intake" data-status="neutral" aria-label={loadoutText(copy, "从攻略生成方案")}>
      <div>
        <strong>{assistantPrefill?.kind === "armor_solution_comparison" ? loadoutText(copy, "复核 AI 护甲方案") : loadoutText(copy, "从攻略生成方案")}</strong>
        <p>{assistantPrefill?.kind === "armor_solution_comparison"
          ? loadoutText(copy, "结果来自确定性护甲计算；这里只带入职业和六维目标，仍需重新核对属性模组、套装、位置范围和具体装备。")
          : loadoutTemplate(copy, "粘贴攻略链接或正文。系统会读取内容、识别装备要求并与当前{class}账号装备核对。", {
              class: props.activeCharacter?.class_name ?? loadoutText(copy, "角色")
            })}</p>
        {assistantRawText && sourceInput === assistantRawText ? <p data-status="neutral">{loadoutText(copy, "已接收 AI 工作台成果；分析后仍需核对装备、属性和具体装备。")}</p> : null}
        {restoredLegacyText ? <p data-status="warning">{loadoutText(copy, "已恢复旧任务入口保存的攻略文本；成功生成草稿后会自动清除旧副本。")}</p> : null}
        <label className="loadout-dim-url-field"><span>{loadoutText(copy, "攻略链接或正文")}</span><textarea value={sourceInput} onChange={(event) => setSourceInput(event.target.value)} rows={6} placeholder={loadoutText(copy, "https://www.xiaoheihe.cn/app/bbs/link/...\n\n也可以直接粘贴攻略正文、视频文案或配装说明")} /></label>
      </div>
      <div className="loadout-action-stack">
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => { if (assistantPrefill) props.actions.dismissAssistantPrefill(); props.onCloseGuideImport(); }}>{loadoutText(copy, "取消")}</button>
        <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!sourceInput.trim() || !props.activeCharacter || props.localPlanIsImportingGuide} onClick={async () => { if (await props.actions.importGuideSource(sourceInput, props.activeCharacter)) props.onCloseGuideImport(); }}>{props.localPlanIsImportingGuide ? loadoutText(copy, "分析中") : assistantPrefill?.kind === "armor_solution_comparison" ? loadoutText(copy, "核对并生成草稿") : loadoutText(copy, "分析并生成草稿")}</button>
      </div>
    </section>
  );
}

function formatEquipmentGroup(copy: LoadoutsCopy, group: "weapons" | "armor" | "equipment" | "other"): string {
  if (group === "weapons") return loadoutText(copy, "武器");
  if (group === "armor") return loadoutText(copy, "护甲");
  return group === "equipment" ? loadoutText(copy, "装备") : loadoutText(copy, "其他");
}

function formatCandidateLocation(
  copy: LoadoutsCopy,
  candidate: AssistantEquipmentTargetCandidatesArtifact["candidates"][number]
): string {
  if (!candidate.location) return loadoutText(copy, "账号装备");
  if (candidate.location.kind === "equipped") {
    return candidate.location.character_name
      ? loadoutTemplate(copy, "已装备于 {character}", { character: candidate.location.character_name })
      : loadoutText(copy, "已装备");
  }
  if (candidate.location.kind === "inventory") {
    return candidate.location.character_name
      ? loadoutTemplate(copy, "角色背包 · {character}", { character: candidate.location.character_name })
      : loadoutText(copy, "角色背包");
  }
  if (candidate.location.kind === "vault") return loadoutText(copy, "仓库");
  return loadoutText(copy, "邮政官");
}

function LocalPlanExecutionPanel(props: LoadoutsPageContentViewProps & {
  activeCharacter: AccountSummary["characters"][number] | null;
  copy: LoadoutsCopy;
  showPublish?: boolean;
}) {
  const [publishSlotIndex, setPublishSlotIndex] = useState<number | null>(null);
  const copy = props.copy;
  const plan = props.localPlanExecutionPlan;
  const report = props.localPlanExecutionReport;
  if (!plan) {
    return <section className="loadout-armor-workbench" aria-label={loadoutText(copy, "穿戴核对")}><header><div><strong>{loadoutText(copy, "穿戴核对")}</strong><small>{loadoutText(copy, "请选择目标角色和具体装备后生成安全执行计划。")}</small></div></header><DimExportPanel copy={copy} result={props.localPlanDimExport} feedback={props.localPlanDimExportFeedback} tone={props.localPlanDimExportTone} onCopy={props.actions.copyDimLoadoutLink} /></section>;
  }
  return (
    <section className="loadout-armor-workbench" aria-label={loadoutText(copy, "穿戴核对")}>
      <header><div><strong>{loadoutText(copy, "穿戴步骤")}</strong><small>{loadoutTemplate(copy, "计划 {plan}；确认后先刷新账号复核，计划未变化才会逐步执行。", { plan: formatExecutionPlanReference(plan.plan_id) })}</small></div><button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!props.localPlanEditingId || !plan.executable_steps.length || props.localPlanIsExecuting} onClick={props.actions.executeLocalPlan}>{props.localPlanIsExecuting ? loadoutText(copy, "正在穿戴") : props.localPlanEditingId ? loadoutText(copy, "穿戴此方案") : loadoutText(copy, "先保存应用配装")}</button></header>
      <DimExportPanel
        copy={copy}
        result={props.localPlanDimExport}
        feedback={props.localPlanDimExportFeedback}
        tone={props.localPlanDimExportTone}
        onCopy={props.actions.copyDimLoadoutLink}
      />
      {plan.executable_steps.length ? <ol className="loadout-plan-step-list">{plan.executable_steps.map((step, index) => <li key={step.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step.label}</strong></li>)}</ol> : <p className="loadout-callout" data-ui-kind="callout" data-status="warning">{loadoutText(copy, "没有可执行步骤。")}</p>}
      {plan.gaps.length ? <p className="loadout-callout" data-ui-kind="callout" data-status="warning">{loadoutTemplate(copy, "未执行缺口：{gaps}", { gaps: plan.gaps.join("；") })}</p> : null}
      {report ? <p className="loadout-callout" data-ui-kind="callout" data-status={report.refresh_verified && report.verification_logged !== false ? "success" : "warning"}>{formatExecutionReportMessage(copy, report)}{report.execution_id ? <small title={report.execution_id}>{loadoutTemplate(copy, "执行 {ref}", { ref: formatTraceReference(report.execution_id) })}{report.verification_status ? loadoutTemplate(copy, " · 验证 {status}", { status: formatVerificationStatus(copy, report.verification_status) }) : ""}</small> : null}</p> : null}
      {report?.refresh_verified && props.showPublish !== false ? <LocalPlanPublishPanel copy={copy} accountSummary={props.accountSummary} targetCharacterId={plan.target_character_id} selectedSlotIndex={publishSlotIndex} onSelectSlot={setPublishSlotIndex} report={props.localPlanPublishReport} isPublishing={props.localPlanIsPublishing ?? false} onPublish={props.actions.publishLocalPlanToSlot} /> : null}
    </section>
  );
}

function DimExportPanel(props: {
  copy: LoadoutsCopy;
  result: DimLoadoutExportResult | null;
  feedback: string;
  tone: "info" | "error";
  onCopy: () => void;
}) {
  if (!props.result) return null;
  const copy = props.copy;
  const result = props.result;
  const description = result.status === "ready"
    ? loadoutTemplate(copy, "{count} 个装备目标已核对为当前账号中的具体装备。", { count: result.item_count })
    : result.blockers.map((blocker) => blocker.message).join("；");
  return (
    <div className="loadout-dim-export" data-status={result.status === "ready" ? "success" : "warning"}>
      <div>
        <strong>{result.status === "ready" ? loadoutText(copy, "DIM 链接可生成") : loadoutText(copy, "DIM 导出已阻断")}</strong>
        <small>{description}</small>
        {result.status === "ready" && result.warnings.length ? <small data-status="warning">{result.warnings.join(" ")}</small> : null}
        {props.feedback ? <small data-status={props.tone === "error" ? "warning" : "success"}>{props.feedback}</small> : null}
      </div>
      <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={result.status !== "ready"} onClick={props.onCopy}>{loadoutText(copy, "复制 DIM 链接")}</button>
    </div>
  );
}

function formatExecutionPlanReference(planId: string): string {
  return planId.startsWith("local-loadout-plan:")
    ? planId.slice("local-loadout-plan:".length)
    : planId;
}

function formatExecutionReportMessage(
  copy: LoadoutsCopy,
  report: NonNullable<LoadoutsPageContentViewProps["localPlanExecutionReport"]>
): string {
  const logSuffix = report.verification_logged === false ? loadoutText(copy, " 验证记录未写入操作日志。") : "";
  if (!report.preflight_verified) {
    return report.error ?? loadoutText(copy, "执行前账号复核未通过，未执行任何写操作。");
  }
  if (report.refresh_verified) {
    return loadoutTemplate(copy, "已完成 {count} 步，刷新核对通过。{log}", { count: report.completed_steps.length, log: logSuffix });
  }
  if (report.failed_step) {
    return loadoutTemplate(copy, "已完成 {count} 步；失败：{step}。{log}", {
      count: report.completed_steps.length,
      step: report.failed_step,
      log: logSuffix
    });
  }
  return loadoutTemplate(copy, "已完成 {count} 步，刷新核对未通过。{log}", { count: report.completed_steps.length, log: logSuffix });
}

function formatTraceReference(value: string): string {
  const suffix = value.split(":").at(-1) ?? value;
  return suffix.slice(0, 12);
}

function formatVerificationStatus(copy: LoadoutsCopy, status: "verified" | "partial" | "mismatch" | "unavailable"): string {
  if (status === "verified") return loadoutText(copy, "通过");
  if (status === "partial") return loadoutText(copy, "部分完成");
  if (status === "unavailable") return loadoutText(copy, "不可用");
  return loadoutText(copy, "不一致");
}

function LocalPlanPublishPanel(props: {
  copy: LoadoutsCopy;
  accountSummary: AccountSummary | null;
  targetCharacterId: string;
  selectedSlotIndex: number | null;
  onSelectSlot: (index: number) => void;
  report?: LoadoutsPageContentViewProps["localPlanPublishReport"];
  isPublishing: boolean;
  onPublish?: LoadoutsPageActions["publishLocalPlanToSlot"];
}) {
  const copy = props.copy;
  const character = props.accountSummary?.characters.find((item) => item.character_id === props.targetCharacterId) ?? null;
  const selectedSlot = character?.loadout_slots.find((slot) => slot.index === props.selectedSlotIndex) ?? null;
  if (!character?.loadout_slots.length) return null;
  return (
    <div className="loadout-slot-picker">
      <header><div><strong>{loadoutText(copy, "保存到游戏内槽位")}</strong><small>{loadoutText(copy, "方案已穿戴并经账号刷新核对。保存前会再次核对当前装备和目标槽位，变化时保持零写入。")}</small></div></header>
      <div className="loadout-slot-picker-list" data-surface="list">
        {character.loadout_slots.map((slot) => <button type="button" key={slot.index} aria-pressed={slot.index === props.selectedSlotIndex} onClick={() => props.onSelectSlot(slot.index)}><span>{String(slot.index + 1).padStart(2, "0")}</span><span><strong>{slot.name}</strong><small>{slot.item_count ? loadoutText(copy, "覆盖已有槽位") : loadoutText(copy, "空槽")}</small></span></button>)}
      </div>
      {props.report ? <p className="loadout-callout" data-ui-kind="callout" data-status={props.report.verification_status === "verified" && props.report.verification_logged !== false ? "success" : "warning"}>{formatPublishReportMessage(copy, props.report)}<small title={props.report.execution_id}>{loadoutTemplate(copy, "保存 {execution} · 计划 {plan}", { execution: formatTraceReference(props.report.execution_id), plan: formatTraceReference(props.report.plan.plan_id) })}</small></p> : null}
      <footer><button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!selectedSlot || props.isPublishing || !props.onPublish} onClick={() => selectedSlot && props.onPublish?.(selectedSlot.index)}>{props.isPublishing ? loadoutText(copy, "保存中") : selectedSlot?.item_count ? loadoutText(copy, "确认覆盖并保存") : loadoutText(copy, "保存到槽位")}</button></footer>
    </div>
  );
}

function formatPublishReportMessage(
  copy: LoadoutsCopy,
  report: NonNullable<LoadoutsPageContentViewProps["localPlanPublishReport"]>
): string {
  if (!report.preflight_verified) return report.error ?? loadoutText(copy, "保存前账号或槽位复核未通过，未执行写入。");
  if (report.verification_status === "verified") {
    return report.verification_logged === false
      ? loadoutText(copy, "槽位保存后刷新核对通过，但验证记录未写入操作日志。")
      : loadoutText(copy, "槽位已保存，刷新后的 Bungie 槽位内容核对通过。");
  }
  if (report.verification_status === "unavailable") return report.error ?? loadoutText(copy, "槽位已写入，但刷新结果不足以完成精确核对。");
  return report.error ?? loadoutText(copy, "槽位写入或刷新核对未通过。");
}

function LocalPlanSummary(props: LoadoutsPageContentViewProps & { copy: LoadoutsCopy }) {
  const copy = props.copy;
  const summary = props.localPlanDraft && props.accountSummary
    ? matchLocalLoadoutPlan(props.localPlanDraft, props.accountSummary)
    : null;
  const waitingCount = (summary?.available_count ?? 0) + (summary?.needs_selection_count ?? 0);
  const issueCount = (summary?.missing_count ?? 0) + (summary?.plug_unavailable_count ?? 0);
  const targetCharacter = props.accountSummary?.characters.find((character) => character.character_id === props.localPlanDraft?.target_character_id) ?? null;
  const armorPlanReference = props.localPlanDraft?.armor_plan;
  const armorPlanExpired = isExpiredTimestamp(armorPlanReference?.expires_at);
  return (
    <>
      <div className="loadout-column-head"><div><strong>{loadoutText(copy, "方案摘要")}</strong><small>{loadoutText(copy, "基于当前账号装备数据")}</small></div></div>
      <section className="loadout-local-summary-status" data-status={props.localPlanEditingId ? "neutral" : "warning"}>
        <span>{loadoutText(copy, "当前状态")}</span>
        <strong>{props.localPlanEditingId ? loadoutText(copy, "已保存应用配装编辑中") : loadoutText(copy, "尚未保存到应用")}</strong>
        <p>{props.localPlanEditingId ? loadoutText(copy, "再次保存后，当前修改才会更新应用配装。") : loadoutText(copy, "保存应用配装后才能稳定生成并执行后续计划。")}</p>
      </section>
      <dl className="loadout-ledger">
        <div><dt>{loadoutText(copy, "已选装备")}</dt><dd><b>{summary?.selected_count ?? 0}</b><small>{loadoutText(copy, "已选择账号中的具体装备")}</small></dd></div>
        <div data-status={waitingCount ? "warning" : "success"}><dt>{loadoutText(copy, "等待选择")}</dt><dd><b>{waitingCount}</b><small>{loadoutText(copy, "存在可选装备，但尚未确定")}</small></dd></div>
        <div data-status={issueCount ? "warning" : "success"}><dt>{loadoutText(copy, "缺失 / 待确认")}</dt><dd><b>{issueCount}</b><small>{loadoutText(copy, "账号未找到或目标模组无法安装")}</small></dd></div>
      </dl>
      <section className="loadout-summary-checks" aria-label={loadoutText(copy, "执行边界")}>
        <h3>{loadoutText(copy, "执行边界")}</h3>
        <ul>
          <li data-status={targetCharacter ? "success" : "warning"}><span aria-hidden="true">{targetCharacter ? "✓" : "!"}</span><span>{targetCharacter ? loadoutTemplate(copy, "目标角色为{class}，账号装备数据可用。", { class: targetCharacter.class_name }) : loadoutText(copy, "目标角色尚未在当前账号中确认。")}</span></li>
          <li data-status={(summary?.selected_count ?? 0) ? "success" : "warning"}><span aria-hidden="true">{(summary?.selected_count ?? 0) ? "✓" : "!"}</span><span>{loadoutTemplate(copy, "{count} 件具体装备已选择。", { count: summary?.selected_count ?? 0 })}</span></li>
          {armorPlanReference ? <li data-status={armorPlanExpired ? "warning" : "success"}><span aria-hidden="true">{armorPlanExpired ? "!" : "✓"}</span><span title={armorPlanReference.result_id}>{loadoutTemplate(copy, "护甲方案引用 {result}，规则版本 {version}{tail}", {
            result: formatArmorResultReference(armorPlanReference.result_id),
            version: armorPlanReference.ruleset_version,
            tail: armorPlanExpired ? loadoutText(copy, "；计算结果已过期，请重新计算后再调整方案。") : loadoutText(copy, "。")
          })}</span></li> : null}
          {waitingCount || issueCount ? <li data-status="warning"><span aria-hidden="true">!</span><span>{loadoutTemplate(copy, "{count} 个目标仍需选择或确认。", { count: waitingCount + issueCount })}</span></li> : <li data-status="success"><span aria-hidden="true">✓</span><span>{loadoutText(copy, "当前装备目标已完成账号核对。")}</span></li>}
        </ul>
      </section>
      <p className="loadout-guidance">{loadoutText(copy, "应用内保存不会写入 Bungie。穿戴前会按具体装备生成计划；DIM、攻略链接和 AI 整理结果只会预填草稿，仍需显式保存。")}</p>
    </>
  );
}

function ArmorResultTraceNotice(props: LoadoutsPageContentViewProps & { copy: LoadoutsCopy }) {
  const copy = props.copy;
  const trace = props.armorResultTraceRequest;
  if (!trace) return null;
  return (
    <section className="loadout-capability-notice loadout-result-trace" data-ui-kind="callout" data-status="neutral" aria-label={loadoutText(copy, "自动配甲结果引用")}>
      <div>
        <strong>{loadoutText(copy, "自动配甲结果引用")}</strong>
        <p title={trace.resultId}>{loadoutTemplate(copy, "结果 {result} · 方案编号 {candidate}", { result: formatArmorResultReference(trace.resultId), candidate: trace.candidateId })}</p>
        <small>{loadoutText(copy, "完整求解结果不会持久化。请在相关应用配装中按当前账号和规则重新计算；这个引用用于核对目标来源，不会恢复过期结果。")}</small>
      </div>
      {props.actions.dismissArmorResultTrace ? <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.actions.dismissArmorResultTrace}>{loadoutText(copy, "关闭")}</button> : null}
    </section>
  );
}

function formatArmorResultReference(resultId: string): string {
  const parts = resultId.split(":");
  const digest = parts.at(-1) ?? resultId;
  const mode = parts.length > 2 ? parts.at(-2) : undefined;
  return `${mode ? `${mode}:` : ""}${digest.slice(0, 12)}`;
}

function isExpiredTimestamp(value: string | undefined): boolean {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

function LoadoutSummaryEmpty(props: { copy: LoadoutsCopy }) {
  return <div className="loadout-summary-empty"><strong>{loadoutText(props.copy, "等待选择")}</strong><span>{loadoutText(props.copy, "选择一个配装后显示可核对的数据和可执行操作。")}</span></div>;
}

/**
 * 图标缺失时占位字母是 W 还是 A。`bucket_name` 是接口给的显示名，跟着接口语言变，
 * 所以中英两套词都要认；只认中文的话英文账号下所有武器都会显示成 A。
 */
function isWeaponBucketName(bucketName: string | undefined): boolean {
  return /武器|weapon|动能|kinetic|能量|energy|威能|power|重型|heavy/iu.test(bucketName ?? "");
}

function ItemVisual(props: { icon?: string; label: string; bucketName?: string }) {
  return (
    <GameAssetImage
      className="loadout-item-visual"
      src={props.icon}
      alt=""
      loading="eager"
      fallback={<span className="loadout-item-visual loadout-item-placeholder" aria-hidden="true">{isWeaponBucketName(props.bucketName) ? "W" : "A"}</span>}
    />
  );
}

type PersistedArmorPlanView = {
  complete: boolean;
  stats: Record<LoadoutPlanArmorStatKey, number>;
  totalGap: number;
  statWaste: number;
  plus5: number;
  plus10: number;
  pieces: Array<{
    slot: ArmorSlot;
    instanceId: string;
    name: string;
    detail: string;
  }>;
};

function buildPersistedArmorPlanView(
  copy: LoadoutsCopy,
  draft: CreateLocalLoadoutPlanInput,
  accountItems: AccountItemSummary[]
): PersistedArmorPlanView | null {
  const assignments = draft.armor_plan?.planned_armor_plugs ?? [];
  if (!assignments.length) return null;
  const stats = Object.fromEntries(loadoutPlanArmorStatKeys.map((stat) => [stat, 0])) as Record<LoadoutPlanArmorStatKey, number>;
  const pieces: PersistedArmorPlanView["pieces"] = [];
  let plus5 = 0;
  let plus10 = 0;

  for (const assignment of assignments) {
    const item = accountItems.find((candidate) => candidate.instance_id === assignment.instance_id);
    const slot = assignment.slot ?? (item ? armorItemSlot(item) : undefined);
    if (!slot) continue;
    const pieceStats = Object.fromEntries(loadoutPlanArmorStatKeys.map((stat) => [
      stat,
      item?.armor_stats?.[stat] ?? 0
    ])) as Record<LoadoutPlanArmorStatKey, number>;
    if (item) {
      for (const plug of item.sockets?.flatMap((socket) => socket.selected_plug ? [socket.selected_plug] : []) ?? []) {
        if (isArmorStatOrTuningPlug(plug)) applyArmorStatModifierDelta(pieceStats, plug, -1);
      }
      const plannedHashes = uniqueNumbers([
        ...(assignment.tuning_plug_hash === undefined ? [] : [assignment.tuning_plug_hash]),
        ...(assignment.armor_stat_mod_plug_hash === undefined ? [] : [assignment.armor_stat_mod_plug_hash])
      ]);
      const availablePlugs = [
        ...item.socket_plugs,
        ...(item.sockets?.flatMap((socket) => [
          ...(socket.selected_plug ? [socket.selected_plug] : []),
          ...socket.reusable_plugs
        ]) ?? [])
      ];
      for (const plugHash of plannedHashes) {
        const plug = availablePlugs.find((candidate) => candidate.hash === plugHash);
        if (plug) applyArmorStatModifierDelta(pieceStats, plug, 1);
      }
    }
    for (const stat of loadoutPlanArmorStatKeys) stats[stat] += pieceStats[stat];
    if (assignment.armor_stat_mod_value === 5) plus5 += 1;
    if (assignment.armor_stat_mod_value === 10) plus10 += 1;
    pieces.push({
      slot,
      instanceId: assignment.instance_id,
      name: item?.name ?? loadoutTemplate(copy, "护甲装备 …{suffix}", { suffix: assignment.instance_id.slice(-4) }),
      detail: [
        assignment.tuning_plug_hash === undefined
          ? loadoutText(copy, "保持护甲调整")
          : loadoutText(copy, "已保存 T5 护甲调整"),
        assignment.armor_stat_mod_value
          ? loadoutTemplate(copy, "+{value} {stat}模组", {
              value: assignment.armor_stat_mod_value,
              stat: assignment.armor_stat_mod_stat
                ? armorStatLabel(copy, assignment.armor_stat_mod_stat)
                : loadoutText(copy, "属性")
            })
          : loadoutText(copy, "不安装属性模组"),
        assignment.armor_stat_mod_socket_index === undefined
          ? loadoutText(copy, "模组位置待确认")
          : loadoutTemplate(copy, "模组位置 {index}", { index: assignment.armor_stat_mod_socket_index + 1 }),
        loadoutTemplate(copy, "能量 {final}/{capacity}", {
          final: assignment.final_energy,
          capacity: assignment.energy_capacity
        })
      ].join(" · ")
    });
  }
  for (const stat of loadoutPlanArmorStatKeys) {
    stats[stat] += draft.armor_constraints?.fragment_stat_bonuses[stat] ?? 0;
  }
  const totalGap = loadoutPlanArmorStatKeys.reduce((total, stat) => (
    total + Math.max(0, (draft.armor_constraints?.stat_minimums[stat] ?? 0) - stats[stat])
  ), 0);
  const statWaste = loadoutPlanArmorStatKeys.reduce((total, stat) => total + Math.max(0, stats[stat] % 10), 0);
  return {
    complete: pieces.length === armorSlots.length && pieces.every((piece) => Boolean(accountItems.find((item) => item.instance_id === piece.instanceId))),
    stats,
    totalGap,
    statWaste,
    plus5,
    plus10,
    pieces: pieces.sort((left, right) => armorSlots.indexOf(left.slot) - armorSlots.indexOf(right.slot))
  };
}

function applyArmorStatModifierDelta(
  stats: Record<LoadoutPlanArmorStatKey, number>,
  plug: AccountItemSummary["socket_plugs"][number],
  multiplier: -1 | 1
) {
  for (const stat of loadoutPlanArmorStatKeys) {
    stats[stat] += (plug.armor_stat_modifiers?.[stat] ?? 0) * multiplier;
  }
}

function buildArmorPlannerTarget(
  constraints: LoadoutPlanArmorConstraints
): Partial<Record<(typeof loadoutPlanArmorStatKeys)[number], { minimum: number }>> {
  return Object.fromEntries(loadoutPlanArmorStatKeys.flatMap((stat) => {
    const minimum = constraints.stat_minimums[stat] ?? 0;
    return minimum > 0 ? [[stat, { minimum }]] : [];
  })) as Partial<Record<(typeof loadoutPlanArmorStatKeys)[number], { minimum: number }>>;
}

function resolveUpgradeBaselineInstanceIds(
  draft: CreateLocalLoadoutPlanInput,
  account: AccountSummary | null,
  accountItems: AccountItemSummary[]
): string[] {
  const accountArmorIds = new Set(accountItems
    .filter((item) => item.group_key === "armor" && item.instance_id)
    .map((item) => item.instance_id!));
  const referenced = draft.armor_plan?.selected_instance_ids.filter((id) => accountArmorIds.has(id)) ?? [];
  if (uniqueStrings(referenced).length >= 5) return uniqueStrings(referenced);
  const selected = draft.item_targets.flatMap((target) => (
    target.selected_instance_id && accountArmorIds.has(target.selected_instance_id)
      ? [target.selected_instance_id]
      : []
  ));
  if (uniqueStrings(selected).length >= 5) return uniqueStrings(selected);
  const character = account?.characters.find((item) => item.character_id === draft.target_character_id);
  return uniqueStrings(character?.equipped_items.flatMap((item) => (
    item.group_key === "armor" && item.instance_id ? [item.instance_id] : []
  )) ?? []);
}

function armorPlannerActionLabel(copy: LoadoutsCopy, mode: ArmorPlannerMode): string {
  if (mode === "theoretical") return loadoutText(copy, "计算理论上限");
  if (mode === "acquisition") return loadoutText(copy, "生成待刷目标");
  if (mode === "upgrade") return loadoutText(copy, "计算升级路径");
  return loadoutText(copy, "查看推荐方案");
}

function armorPlannerModeLabel(copy: LoadoutsCopy, mode: ArmorPlannerMode): string {
  if (mode === "theoretical") return loadoutText(copy, "理论上限");
  if (mode === "acquisition") return loadoutText(copy, "待刷目标");
  if (mode === "upgrade") return loadoutText(copy, "升级路径");
  return loadoutText(copy, "当前库存");
}

function armorCandidateTitle(copy: LoadoutsCopy, candidate: ArmorPlannerCandidateView): string {
  if (candidate.kind === "theoretical") return loadoutText(copy, "理论属性组合");
  if (candidate.kind === "acquisition") return candidate.fulfillmentStatus === "owned"
    ? loadoutText(copy, "理论身份已全部持有")
    : candidate.fulfillmentStatus === "upgrade-only"
      ? loadoutText(copy, "只需升级现有护甲")
      : candidate.fulfillmentStatus === "verification-required"
        ? loadoutText(copy, "需要核对现有护甲身份")
        : loadoutText(copy, "包含待获取护甲身份");
  if (candidate.kind === "upgrade") return loadoutTemplate(copy, "替换 {count} 件的升级方案", { count: candidate.replacementCount });
  return loadoutText(copy, "当前库存方案");
}

function armorCandidateSummary(copy: LoadoutsCopy, candidate: ArmorPlannerCandidateView): string {
  if (candidate.kind === "owned") {
    return loadoutTemplate(copy, "已装备 {equipped} 件 · 需转移 {transfer} 件 · 相对目标角色替换 {replacement} 件", {
      equipped: candidate.equippedCount,
      transfer: candidate.transferCount,
      replacement: candidate.replacementCount
    });
  }
  if (candidate.kind === "theoretical") {
    return loadoutTemplate(copy, "{count} 个 Armor 3.0 理论护甲位置，不代表账号已经持有对应装备", { count: candidate.pieces.length });
  }
  if (candidate.kind === "acquisition") {
    return loadoutTemplate(copy, "待获取 {missing} 件 · 待升级 {upgrade} 件 · 待核对 {verify} 件", {
      missing: candidate.missingPieceCount,
      upgrade: candidate.upgradePieceCount,
      verify: candidate.verificationPieceCount
    });
  }
  return loadoutTemplate(copy, "保留 {retained} 件 · {steps} 个调整步骤", {
    retained: candidate.retainedInstanceIds.length,
    steps: candidate.steps.length
  });
}

function armorCandidatePieceRows(copy: LoadoutsCopy, candidate: ArmorPlannerCandidateView): Array<{
  key: string;
  slot: string;
  name: string;
  detail: string;
}> {
  if (candidate.kind === "theoretical") {
    return candidate.pieces.map((piece) => ({
      key: piece.configurationId,
      slot: armorSlotLabel(copy, piece.slot),
      name: piece.name,
      detail: [
        piece.archetype.name,
        loadoutTemplate(copy, "{stat}第三属性", { stat: armorStatLabel(copy, piece.archetype.tertiaryStat) }),
        formatTheoreticalTuning(copy, piece),
        formatArmorStatMod(copy, piece.armorStatMod, piece.energy.armorStatMod),
        loadoutTemplate(copy, "能量 {final}/{capacity}", { final: piece.energy.final, capacity: piece.energy.capacity }),
        piece.set?.name
      ].filter(Boolean).join(" · ")
    }));
  }
  if (candidate.kind === "acquisition") {
    return candidate.pieces.map((piece) => ({
      key: `${piece.slot}-${piece.theoretical.configurationId}`,
      slot: armorSlotLabel(copy, piece.slot),
      name: piece.identity.itemName ?? piece.identity.archetypeName,
      detail: piece.acquisitionRequired
        ? loadoutTemplate(copy, "需要获取 · {stat}第三属性 · {mod} · 能量 {final}/{capacity}{set}", {
            stat: armorStatLabel(copy, piece.identity.tertiaryStat),
            mod: formatArmorStatMod(copy, piece.theoretical.armorStatMod, piece.theoretical.energy.armorStatMod),
            final: piece.theoretical.energy.final,
            capacity: piece.theoretical.energy.capacity,
            set: piece.identity.set ? ` · ${piece.identity.set.name}` : ""
          })
        : loadoutTemplate(copy, "{exact} 件同身份已持有 · {nearest} 件近似可选装备 · {mod}", {
            exact: piece.exactOwnedMatches.length,
            nearest: piece.nearestOwnedMatches.length,
            mod: formatArmorStatMod(copy, piece.theoretical.armorStatMod, piece.theoretical.energy.armorStatMod)
          })
    }));
  }
  return candidate.pieces.map((piece) => ({
    key: piece.instanceId,
    slot: armorSlotLabel(copy, piece.slot),
    name: piece.name,
    detail: [
      armorLocationLabel(copy, piece.location),
      loadoutTemplate(copy, "装备标识 …{suffix}", { suffix: piece.instanceId.slice(-4) }),
      formatOwnedTuning(copy, piece),
      formatArmorStatMod(copy, piece.armorStatMod, piece.energy.armorStatMod, piece.armorStatModSocketIndex),
      loadoutTemplate(copy, "其他模组 {reserved} · 最终能量 {final}/{capacity}", {
        reserved: piece.energy.reserved,
        final: piece.energy.final,
        capacity: piece.energy.capacity
      }),
      piece.set?.name,
      candidate.kind === "upgrade" && candidate.retainedInstanceIds.includes(piece.instanceId) ? loadoutText(copy, "保留") : ""
    ].filter(Boolean).join(" · ")
  }));
}

function formatTheoreticalTuning(
  copy: LoadoutsCopy,
  piece: Extract<ArmorPlannerCandidateView, { kind: "theoretical" }>["pieces"][number]
): string {
  return piece.tuning.mode === "plus3"
    ? loadoutText(copy, "+3 护甲调整，0 能量")
    : loadoutTemplate(copy, "{from} −5 → {to} +5 护甲调整，0 能量", {
        from: armorStatLabel(copy, piece.tuning.fromStat),
        to: armorStatLabel(copy, piece.tuning.toStat)
      });
}

function formatOwnedTuning(
  copy: LoadoutsCopy,
  piece: Extract<ArmorPlannerCandidateView, { kind: "owned" }>["pieces"][number]
): string {
  if (!piece.tuning) return loadoutText(copy, "保持当前护甲调整");
  return piece.tuning.mode === "plus3"
    ? loadoutText(copy, "+3 护甲调整，0 能量")
    : loadoutTemplate(copy, "{from} −5 → {to} +5 护甲调整，0 能量", {
        from: piece.tuning.fromStat ? armorStatLabel(copy, piece.tuning.fromStat) : loadoutText(copy, "属性"),
        to: piece.tuning.toStat ? armorStatLabel(copy, piece.tuning.toStat) : loadoutText(copy, "属性")
      });
}

function formatArmorStatMod(
  copy: LoadoutsCopy,
  mod: { stat: (typeof loadoutPlanArmorStatKeys)[number]; value: 5 | 10 } | undefined,
  energyCost: number,
  socketIndex?: number
): string {
  return mod
    ? loadoutTemplate(copy, "+{value} {stat}属性模组，{energy} 能量{socket}", {
        value: mod.value,
        stat: armorStatLabel(copy, mod.stat),
        energy: energyCost,
        socket: socketIndex === undefined ? "" : loadoutTemplate(copy, "，模组位置 {index}", { index: socketIndex + 1 })
      })
    : loadoutTemplate(copy, "不安装属性模组{socket}", {
        socket: socketIndex === undefined ? "" : loadoutTemplate(copy, "，清空模组位置 {index}", { index: socketIndex + 1 })
      });
}

function armorSetCoverageLabel(copy: LoadoutsCopy, coverage: ArmorPlannerCandidateView["summary"]["armorSetCoverage"]): string {
  if (coverage.mode === "none") return loadoutText(copy, "未设置套装要求");
  if (!coverage.requirements.length) return loadoutText(copy, "套装要求尚未完成核对");
  return coverage.requirements.map((requirement) => (
    loadoutTemplate(copy, "{name} {actual}/{minimum}", {
      name: requirement.name,
      actual: requirement.actualPieceCount,
      minimum: requirement.minimumPieceCount
    })
  )).join(" · ");
}

function armorLocationLabel(copy: LoadoutsCopy, location: "equipped" | "inventory" | "vault" | "postmaster"): string {
  return {
    equipped: loadoutText(copy, "已装备"),
    inventory: loadoutText(copy, "角色背包"),
    vault: loadoutText(copy, "仓库"),
    postmaster: loadoutText(copy, "邮政官")
  }[location];
}

function isExoticArmorItem(item: AccountItemSummary): boolean {
  return /异域|exotic/i.test(`${item.tier ?? ""} ${item.item_type ?? ""}`);
}

function armorItemOptionLabel(copy: LoadoutsCopy, item: AccountItemSummary): string {
  return loadoutTemplate(copy, "{name} · {slot} · {suffix}", {
    name: item.name,
    slot: item.bucket_name ?? loadoutText(copy, "护甲"),
    suffix: item.instance_id?.slice(-4) ?? "----"
  });
}

function armorInstanceLabel(copy: LoadoutsCopy, instanceId: string, items: AccountItemSummary[]): string {
  const item = items.find((candidate) => candidate.instance_id === instanceId);
  return item ? armorItemOptionLabel(copy, item) : loadoutTemplate(copy, "装备 …{suffix}", { suffix: instanceId.slice(-4) });
}

function buildArmorSlotEnergyPlan(
  draft: CreateLocalLoadoutPlanInput,
  accountItems: AccountItemSummary[]
): {
  capacity: Partial<Record<ArmorSlot, number>>;
  reserved: Partial<Record<ArmorSlot, number>>;
  plugHashes: Partial<Record<ArmorSlot, number[]>>;
} {
  const capacity: Partial<Record<ArmorSlot, number>> = {};
  const reserved: Partial<Record<ArmorSlot, number>> = {};
  const plugHashes: Partial<Record<ArmorSlot, number[]>> = {};
  for (const target of draft.item_targets) {
    if (!target.selected_instance_id) continue;
    const item = accountItems.find((candidate) => candidate.instance_id === target.selected_instance_id);
    const slot = item ? armorItemSlot(item) : undefined;
    if (!item || !slot || !item.armor_energy) continue;
    const nonStatPlugPlan = buildArmorNonStatPlugPlan(item, target.plug_hashes);
    capacity[slot] = Math.max(0, item.armor_energy.capacity);
    reserved[slot] = nonStatPlugPlan.complete
      ? nonStatPlugPlan.energy
      : armorItemReservedEnergy(item);
    plugHashes[slot] = nonStatPlugPlan.plugHashes;
  }
  return { capacity, reserved, plugHashes };
}

function buildArmorNonStatPlugPlan(
  item: AccountItemSummary,
  targetPlugHashes: readonly number[]
): { plugHashes: number[]; energy: number; complete: boolean } {
  const sockets = (item.sockets ?? []).filter((socket) => socket.is_visible);
  const requested: Array<{
    requestIndex: number;
    plugHash: number;
    options: Array<{ socketIndex: number; energyCost: number }>;
  }> = [];
  let complete = true;

  for (const rawPlugHash of targetPlugHashes) {
    const plugHash = rawPlugHash >>> 0;
    const allMatches = sockets.flatMap((socket) => [
      ...(socket.selected_plug?.hash === plugHash ? [socket.selected_plug] : []),
      ...socket.reusable_plugs.filter((plug) => plug.hash === plugHash && plug.enabled !== false)
    ].map((plug) => ({ socket, plug })));
    const options = allMatches
      .filter(({ socket, plug }) => !isArmorStatOrTuningPlug(plug) && !isArmorStatOrTuningSocket(socket))
      .map(({ socket, plug }) => ({
        socketIndex: socket.socket_index,
        energyCost: Math.max(0, plug.energy_cost ?? 0)
      }))
      .filter((option) => option.energyCost > 0);
    if (!options.length && allMatches.length) continue;
    requested.push({ requestIndex: requested.length, plugHash, options });
    if (!options.length) complete = false;
  }

  if (!complete) {
    return { plugHashes: requested.map((entry) => entry.plugHash), energy: 0, complete: false };
  }

  const assignment = new Array<{ socketIndex: number; energyCost: number } | undefined>(requested.length);
  const usedSockets = new Set<number>();
  const ordered = [...requested].sort((left, right) => (
    left.options.length - right.options.length
    || left.requestIndex - right.requestIndex
  ));

  function assign(index: number): boolean {
    if (index >= ordered.length) return true;
    const entry = ordered[index]!;
    for (const option of entry.options) {
      if (usedSockets.has(option.socketIndex)) continue;
      usedSockets.add(option.socketIndex);
      assignment[entry.requestIndex] = option;
      if (assign(index + 1)) return true;
      assignment[entry.requestIndex] = undefined;
      usedSockets.delete(option.socketIndex);
    }
    return false;
  }

  const assigned = assign(0);
  const retainedEnergy = assigned
    ? sockets.reduce((total, socket) => {
        if (usedSockets.has(socket.socket_index) || isArmorStatOrTuningSocket(socket)) return total;
        const plug = socket.selected_plug;
        return total + Math.max(0, plug?.energy_cost ?? 0);
      }, 0)
    : 0;
  return {
    plugHashes: requested.map((entry) => entry.plugHash),
    energy: assigned
      ? assignment.reduce((total, option) => total + (option?.energyCost ?? 0), retainedEnergy)
      : 0,
    complete: assigned
  };
}

function isArmorStatOrTuningSocket(
  socket: NonNullable<AccountItemSummary["sockets"]>[number]
): boolean {
  return [
    ...(socket.selected_plug ? [socket.selected_plug] : []),
    ...socket.reusable_plugs
  ].some(isArmorStatOrTuningPlug);
}

function isArmorStatOrTuningPlug(
  plug: AccountItemSummary["socket_plugs"][number]
): boolean {
  if (armorStatModPlugValue(plug)) return true;
  const values = Object.values(plug.armor_stat_modifiers ?? {}).filter((value) => value !== 0);
  return (values.length === 1 && values[0] === 3)
    || (values.length === 2 && values.includes(5) && values.includes(-5));
}

function buildArmorModPreflight(
  copy: LoadoutsCopy,
  armorItems: AccountItemSummary[],
  constraints: LoadoutPlanArmorConstraints,
  plannedNonStatPlugHashesBySlot: Partial<Record<ArmorSlot, readonly number[]>>
): ArmorModPreflightView {
  const rules = normalizeLoadoutPlanArmorStatModSlotRules(constraints);
  const ruleBySlot = new Map(rules.map((rule) => [rule.slot, rule]));
  const lockedIds = new Set([
    ...constraints.locked_instance_ids,
    ...(constraints.exotic_instance_id ? [constraints.exotic_instance_id] : [])
  ]);
  const excludedIds = new Set(constraints.excluded_instance_ids);
  const slots = {} as ArmorModPreflightView["slots"];

  for (const slot of armorSlots) {
    const slotItems = armorItems.filter((item) => armorItemSlot(item) === slot && !excludedIds.has(item.instance_id ?? ""));
    const locked = slotItems.filter((item) => lockedIds.has(item.instance_id ?? ""));
    const candidates = locked.length ? locked : slotItems;
    const values = new Set<0 | 5 | 10>([0]);
    const statsByValue = { 5: new Set<LoadoutPlanArmorStatKey>(), 10: new Set<LoadoutPlanArmorStatKey>() };
    let hasCompleteCandidate = false;
    for (const item of candidates) {
      const capability = armorItemStatModCapability(item, plannedNonStatPlugHashesBySlot[slot]);
      if (!capability.complete) continue;
      hasCompleteCandidate = true;
      for (const value of capability.values) values.add(value);
      for (const stat of capability.statsByValue[5]) statsByValue[5].add(stat);
      for (const stat of capability.statsByValue[10]) statsByValue[10].add(stat);
    }
    const rule = ruleBySlot.get(slot) ?? { slot, mode: "auto" as const };
    const requiredValue = rule.mode === "plus5" ? 5 : rule.mode === "plus10" ? 10 : rule.mode === "none" ? 0 : undefined;
    slots[slot] = !hasCompleteCandidate
      ? { status: "unknown", summary: loadoutText(copy, "计算时检查完整护甲信息") }
      : requiredValue !== undefined && !values.has(requiredValue)
        ? {
            status: "warning",
            summary: loadoutTemplate(copy, "{mode} 当前不可安装", {
              mode: rule.mode === "none" ? loadoutText(copy, "清空") : `+${requiredValue}`
            })
          }
        : requiredValue !== undefined && requiredValue !== 0 && rule.stat && !statsByValue[requiredValue].has(rule.stat)
          ? {
              status: "warning",
              summary: loadoutTemplate(copy, "缺少可安装的 +{value} {stat}模组", {
                value: requiredValue,
                stat: armorStatLabel(copy, rule.stat)
              })
            }
        : {
            status: "ready",
            summary: rule.mode === "auto"
              ? loadoutTemplate(copy, "可用：{values}", {
                  values: [0, 5, 10]
                    .filter((value) => values.has(value as 0 | 5 | 10))
                    .map((value) => value ? `+${value}` : loadoutText(copy, "不安装"))
                    .join(" / ")
                })
              : loadoutTemplate(copy, "{mode}{stat} 可用", {
                  mode: rule.mode === "none" ? loadoutText(copy, "不安装") : rule.mode === "plus5" ? "+5" : "+10",
                  stat: rule.stat ? ` ${armorStatLabel(copy, rule.stat)}` : ""
                })
          };
  }

  const warningSlots = armorSlots.filter((slot) => slots[slot].status === "warning");
  const unknownSlots = armorSlots.filter((slot) => slots[slot].status === "unknown");
  const details = warningSlots.map((slot) => loadoutTemplate(copy, "{slot}：{summary}", {
    slot: armorSlotLabel(copy, slot),
    summary: slots[slot].summary
  }));
  if (warningSlots.length && unknownSlots.length) {
    details.push(loadoutTemplate(copy, "另有 {count} 个部位会在计算时再次检查完整护甲信息。", { count: unknownSlots.length }));
  }
  const summary = summarizeLoadoutPlanArmorStatModRules(constraints);
  return {
    status: warningSlots.length ? "warning" : unknownSlots.length ? "unknown" : "ready",
    summary: warningSlots.length
      ? loadoutTemplate(copy, "{count} 个部位无法满足当前属性模组设置。", { count: warningSlots.length })
      : unknownSlots.length
        ? loadoutText(copy, "部分护甲信息尚未读取，计算时会再次检查模组兼容性和剩余能量。")
        : loadoutTemplate(copy, "属性模组设置可用于计算：+5 × {plus5}，+10 × {plus10}，自动 {auto}。", {
            plus5: summary.plus5,
            plus10: summary.plus10,
            auto: summary.automatic
          }),
    details,
    slots
  };
}

function armorItemStatModCapability(
  item: AccountItemSummary,
  plannedNonStatPlugHashes: readonly number[] | undefined
): {
  complete: boolean;
  values: Set<0 | 5 | 10>;
  statsByValue: Record<5 | 10, Set<LoadoutPlanArmorStatKey>>;
} {
  const values = new Set<0 | 5 | 10>([0]);
  const statsByValue = { 5: new Set<LoadoutPlanArmorStatKey>(), 10: new Set<LoadoutPlanArmorStatKey>() };
  if (!item.armor_energy || !item.sockets?.length) return { complete: false, values, statsByValue };
  const plannedNonStatPlugPlan = plannedNonStatPlugHashes === undefined
    ? undefined
    : buildArmorNonStatPlugPlan(item, plannedNonStatPlugHashes);
  if (plannedNonStatPlugPlan && !plannedNonStatPlugPlan.complete) return { complete: false, values, statsByValue };
  const reservedEnergy = plannedNonStatPlugPlan?.energy ?? armorItemReservedEnergy(item);
  const remaining = Math.max(0, item.armor_energy.capacity - reservedEnergy);
  let hasStatModSocket = false;
  let hasStatModClearOption = false;
  for (const socket of item.sockets) {
    const plugs = [
      ...(socket.selected_plug ? [socket.selected_plug] : []),
      ...socket.reusable_plugs.filter((plug) => plug.enabled !== false)
    ];
    const socketHasStatMod = plugs.some((plug) => Boolean(armorStatModPlugValue(plug)));
    if (socketHasStatMod && plugs.some((plug) => (
      !isArmorStatOrTuningPlug(plug) && Math.max(0, plug.energy_cost ?? 0) === 0
    ))) {
      hasStatModClearOption = true;
    }
    for (const plug of plugs) {
      const value = armorStatModPlugValue(plug);
      if (!value) continue;
      hasStatModSocket = true;
      const cost = Math.max(0, plug.energy_cost ?? (value === 5 ? 1 : 3));
      if (cost <= remaining) {
        values.add(value);
        const stat = armorStatModPlugStat(plug);
        if (stat) statsByValue[value].add(stat);
      }
    }
  }
  return { complete: hasStatModSocket && hasStatModClearOption, values, statsByValue };
}

function armorItemReservedEnergy(item: AccountItemSummary): number {
  if (!item.armor_energy) return 0;
  const selectedStatMod = item.sockets?.flatMap((socket) => socket.selected_plug ? [socket.selected_plug] : [])
    .find((plug) => armorStatModPlugValue(plug));
  const selectedValue = selectedStatMod ? armorStatModPlugValue(selectedStatMod) : undefined;
  const selectedStatModCost = selectedStatMod
    ? selectedStatMod.energy_cost ?? (selectedValue === 5 ? 1 : selectedValue === 10 ? 3 : 0)
    : 0;
  return Math.max(0, item.armor_energy.used - selectedStatModCost);
}

function armorStatModPlugValue(plug: AccountItemSummary["socket_plugs"][number]): 5 | 10 | undefined {
  const entries = Object.values(plug.armor_stat_modifiers ?? {}).filter((value) => value !== 0);
  return entries.length === 1 && (entries[0] === 5 || entries[0] === 10)
    ? entries[0]
    : undefined;
}

function armorStatModPlugStat(
  plug: AccountItemSummary["socket_plugs"][number]
): LoadoutPlanArmorStatKey | undefined {
  const entry = Object.entries(plug.armor_stat_modifiers ?? {})
    .find(([, value]) => value === 5 || value === 10);
  return entry?.[0] as LoadoutPlanArmorStatKey | undefined;
}

function armorItemSlot(item: AccountItemSummary): ArmorSlot | undefined {
  if (item.bucket_hash === 3448274439 || /头盔|頭盔|helmet/i.test(item.bucket_name ?? "")) return "helmet";
  if (item.bucket_hash === 3551918588 || /臂铠|臂鎧|gauntlets|arms/i.test(item.bucket_name ?? "")) return "arms";
  if (item.bucket_hash === 14239492 || /胸甲|chest/i.test(item.bucket_name ?? "")) return "chest";
  if (item.bucket_hash === 20886954 || /腿甲|leg armor|legs/i.test(item.bucket_name ?? "")) return "legs";
  if (item.bucket_hash === 1585787867 || /职业物品|職業物品|class armor|class item/i.test(item.bucket_name ?? "")) return "class";
  return undefined;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function uniqueNumbers(values: readonly number[]): number[] {
  return [...new Set(values.filter((value) => Number.isFinite(value)).map((value) => value >>> 0))];
}

function uniqueValues<Value>(values: readonly Value[]): Value[] {
  return [...new Set(values)];
}

function emptyArmorConstraints(): LoadoutPlanArmorConstraints {
  return {
    planner_mode: "owned",
    stat_minimums: {},
    priority_stats: [],
    fragment_stat_bonuses: {},
    five_point_mod_budget: 0,
    ten_point_mod_budget: 0,
    armor_stat_mod_slot_rules: createDefaultArmorStatModSlotRules(),
    locked_instance_ids: [],
    excluded_instance_ids: [],
    allowed_locations: ["equipped", "inventory", "vault", "postmaster"],
    set_constraint: { mode: "none" }
  };
}

/**
 * 编辑器里用的护甲约束。
 *
 * `detectedFragmentBonuses` 是从目标角色当前装备的子职业求和出来的星象/碎片加成，只补
 * `fragment_stat_bonuses` 里还没写的键：玩家自己填过的值（包括显式填 0）优先，
 * 这样「自动求和」是默认值而不是每次渲染都覆盖玩家输入的强制值。
 */
function normalizeArmorConstraintsForEditor(
  constraints: LoadoutPlanArmorConstraints | undefined,
  detectedFragmentBonuses: Partial<Record<LoadoutPlanArmorStatKey, number>> = {}
): LoadoutPlanArmorConstraints {
  if (!constraints) {
    return { ...emptyArmorConstraints(), fragment_stat_bonuses: { ...detectedFragmentBonuses } };
  }
  const armorStatModSlotRules = constraints.armor_stat_mod_slot_rules
    ? normalizeLoadoutPlanArmorStatModSlotRules(constraints)
    : createDefaultArmorStatModSlotRules();
  const summary = summarizeLoadoutPlanArmorStatModRules({
    armor_stat_mod_slot_rules: armorStatModSlotRules,
    five_point_mod_budget: 0,
    ten_point_mod_budget: 0
  });
  return {
    ...constraints,
    armor_stat_mod_slot_rules: armorStatModSlotRules,
    five_point_mod_budget: summary.plus5,
    ten_point_mod_budget: summary.plus10,
    fragment_stat_bonuses: { ...detectedFragmentBonuses, ...constraints.fragment_stat_bonuses }
  };
}

function armorStatLabel(copy: LoadoutsCopy, stat: typeof loadoutPlanArmorStatKeys[number]): string {
  return copy.labels.armorStats[stat];
}

/** 方案来源。七种来源不只名字不同，后面要不要重新核对也不一样，所以不合并。 */
function applicationLoadoutSourceLabel(copy: LoadoutsCopy, source: ApplicationLoadoutDirectoryEntryView["source_label"]): string {
  switch (source) {
    case "current-equipment": return loadoutText(copy, "当前装备");
    case "bungie-loadout": return loadoutText(copy, "游戏内配装复制");
    case "dim-link": return loadoutText(copy, "DIM 创建方式");
    case "guide": return loadoutText(copy, "攻略成果");
    case "armor-plan": return loadoutText(copy, "自动配甲");
    case "assistant-targets": return loadoutText(copy, "AI 装备目标");
    default: return loadoutText(copy, "手动创建");
  }
}

function applicationLoadoutWearLabel(copy: LoadoutsCopy, label: ApplicationLoadoutWearLabel): string {
  if (label.wear === "ready") return loadoutText(copy, "可进入穿戴核对");
  if (label.wear === "waiting-account") return loadoutText(copy, "等待账号核对");
  if (label.wear === "empty") return loadoutText(copy, "尚未配置装备");
  return loadoutTemplate(copy, "{count} 项需要处理", { count: label.block_count });
}

function applicationLoadoutItemStatusLabel(copy: LoadoutsCopy, status: ApplicationLoadoutItemStatus): string {
  if (status === "selected") return loadoutText(copy, "已绑定实例");
  if (status === "available") return loadoutText(copy, "需要确认实例");
  if (status === "needs-selection") return loadoutText(copy, "需要选择实例");
  if (status === "missing") return loadoutText(copy, "账号内未找到");
  if (status === "plug-unavailable") return loadoutText(copy, "目标 Plug 不可用");
  return loadoutText(copy, "尚未配置");
}

function applicationLoadoutWearBlockReasonText(copy: LoadoutsCopy, reason: ApplicationLoadoutWearBlockReason): string {
  switch (reason.kind) {
    case "no-targets": return loadoutText(copy, "至少配置一个装备目标后才能穿戴。");
    case "account-required": return loadoutText(copy, "需要读取账号数据并在执行前刷新核对。");
    case "no-target-character": return loadoutText(copy, "尚未选择目标角色。");
    case "target-character-missing": return loadoutText(copy, "目标角色不在当前账号快照中。");
    case "items-unverified": return loadoutText(copy, "尚未核对方案中的装备实例。");
    case "unconfigured": return loadoutTemplate(copy, "{count} 个装备槽尚未配置。", { count: reason.count });
    case "available": return loadoutTemplate(copy, "{count} 个装备目标需要绑定唯一实例。", { count: reason.count });
    case "needs-selection": return loadoutTemplate(copy, "{count} 个装备目标存在多个候选实例。", { count: reason.count });
    case "missing": return loadoutTemplate(copy, "{count} 个装备目标在账号内未找到。", { count: reason.count });
    case "plug-unavailable": return loadoutTemplate(copy, "{count} 个装备目标的 Plug 当前不可用。", { count: reason.count });
  }
}

function applicationLoadoutSelectionMessageText(copy: LoadoutsCopy, message: ApplicationLoadoutSelectionMessage): string {
  if (message.kind === "too-many") return loadoutTemplate(copy, "最多选择 {maximum} 个应用配装", { maximum: message.maximum });
  if (message.kind === "needs-more") return loadoutTemplate(copy, "还需选择 {count} 个应用配装", { count: message.missing });
  return message.has_in_game_reference
    ? loadoutTemplate(copy, "正在比较 {count} 个应用配装，并加入 1 个游戏内只读参照", { count: message.count })
    : loadoutTemplate(copy, "正在比较 {count} 个应用配装", { count: message.count });
}

function crossSourceLinkLabel(copy: LoadoutsCopy, link: CrossSourceLink): string {
  switch (link.kind) {
    case "in-game-slot": return loadoutTemplate(copy, "游戏内槽位 {index} · 内容一致", { index: link.slot_index + 1 });
    case "equipped-now": return loadoutText(copy, "角色当前装备就是这一套");
    case "equippable-for": return loadoutTemplate(copy, "{class}身上有可穿戴对应槽位", { class: link.class_name });
    default: return loadoutText(copy, "未对应游戏内槽位");
  }
}

/** 对比表里的槽位名。规范槽位查表；认不出的原样显示，空名才补「未命名槽位」。 */
function compareSlotLabel(copy: LoadoutsCopy, slot: LoadoutCompareSlot): string {
  if (slot.kind === "custom") return slot.label || loadoutText(copy, "未命名槽位");
  switch (slot.slot) {
    case "subclass": return loadoutText(copy, "子职业");
    case "kinetic": return loadoutText(copy, "动能武器");
    case "energy": return loadoutText(copy, "能量武器");
    case "power": return loadoutText(copy, "威能武器");
    case "helmet": return loadoutText(copy, "头盔");
    case "gauntlets": return loadoutText(copy, "臂铠");
    case "chest": return loadoutText(copy, "胸甲");
    case "legs": return loadoutText(copy, "腿甲");
    case "class-item": return loadoutText(copy, "职业物品");
  }
}

function compareColumnTitleText(copy: LoadoutsCopy, title: ApplicationLoadoutCompareColumnTitle): string {
  if (title.kind === "plan") return title.name;
  return title.name || loadoutTemplate(copy, "游戏内槽位 {index}", { index: title.index + 1 });
}

function compareColumnSubtitleText(copy: LoadoutsCopy, subtitle: ApplicationLoadoutCompareColumnSubtitle): string {
  return subtitle.kind === "plan"
    ? loadoutTemplate(copy, "{class} · {count} 个装备目标", { class: subtitle.class_name, count: subtitle.target_count })
    : loadoutTemplate(copy, "{class} · 游戏内只读参照", { class: subtitle.class_name });
}

function compareRowLabelText(copy: LoadoutsCopy, label: ApplicationLoadoutCompareRowLabel): string {
  switch (label.kind) {
    case "class": return loadoutText(copy, "职业");
    case "subclass": return loadoutText(copy, "子职业");
    case "subclass-config": return loadoutText(copy, "子职业配置");
    case "slot": return compareSlotLabel(copy, label.slot);
    case "slot-plugs": return loadoutTemplate(copy, "{slot} Plug", { slot: compareSlotLabel(copy, label.slot) });
    case "armor-minimum": return loadoutTemplate(copy, "{stat}最低值", { stat: armorStatLabel(copy, label.stat) });
    case "armor-mod-count": return label.mod === "plus5" ? loadoutText(copy, "+5 属性模组") : loadoutText(copy, "+10 属性模组");
    case "armor-stat-mod": return loadoutTemplate(copy, "{slot}属性模组", { slot: armorSlotLabel(copy, label.slot) });
    case "armor-mode": return loadoutText(copy, "自动配甲模式");
    case "armor-priority": return loadoutText(copy, "属性优先级");
    case "armor-exotic": return loadoutText(copy, "异域护甲约束");
    case "armor-set": return loadoutText(copy, "护甲套装约束");
    case "notes": return loadoutText(copy, "备注");
  }
}

/**
 * 「N 个 X」逐单位一条模板，不拼 `{count} {单位}`：中文量词贴在数字后面，
 * 英文要的是复数形式，拼出来的固定词头两边都不对。
 */
const compareCountTemplates: Record<ApplicationLoadoutCountUnit, string> = {
  "plug": "{count} 个 Plug",
  "returned-plug": "{count} 个已返回 Plug",
  "ability": "{count} 个技能",
  "aspect": "{count} 个星相",
  "fragment": "{count} 个碎片",
  "subclass-mod": "{count} 个子职业模组"
};

const comparePlugGroupLabels: Record<ApplicationLoadoutPlugGroupKey, string> = {
  "ability": "技能",
  "aspect": "星相",
  "fragment": "碎片",
  "subclass-mod": "子职业模组",
  "unclassified": "未分类"
};

/**
 * 对比表的单元格文字。空值分四档是因为来源不同：方案侧没配和游戏内没返回
 * 是两回事，看不出差别就分不清是漏配还是没读到。
 */
function compareValueText(copy: LoadoutsCopy, value: ApplicationLoadoutCompareValue): string {
  switch (value.kind) {
    case "text": return value.text;
    case "count": return loadoutTemplate(copy, compareCountTemplates[value.unit], { count: value.count });
    case "empty": {
      if (value.empty === "unset") return loadoutText(copy, "未设置");
      if (value.empty === "unavailable") return loadoutText(copy, "未返回");
      if (value.empty === "none") return loadoutText(copy, "无");
      return loadoutText(copy, "未配置");
    }
    case "item-ref": return loadoutTemplate(copy, "物品 {hash}", { hash: value.hash });
    case "instance-ref": return loadoutTemplate(copy, "实例 …{suffix}", { suffix: value.suffix });
    case "subclass-ref": return loadoutTemplate(copy, "子职业 {hash}", { hash: value.hash });
    case "armor-mode": return armorPlannerModeLabel(copy, value.mode);
    case "stat-mod": {
      const mode = value.mode === "auto"
        ? loadoutText(copy, "自动")
        : value.mode === "none"
          ? loadoutText(copy, "不安装")
          : value.mode === "plus5" ? "+5" : "+10";
      const stat = value.stat ? armorStatLabel(copy, value.stat) : loadoutText(copy, "属性自动");
      return loadoutTemplate(copy, "{mode} · {stat}", { mode, stat });
    }
    case "armor-set-single": return loadoutTemplate(copy, "套装 {hash} · {count} 件", { hash: value.set_hash, count: value.piece_count });
    case "armor-set-split": return loadoutTemplate(copy, "套装 {first} + {second} · 2+2", { first: value.first_hash, second: value.second_hash });
    case "stat-chain": return value.stats.map((stat) => armorStatLabel(copy, stat)).join(" → ");
    case "series": return value.parts.map((part) => compareValueText(copy, part)).join(" · ");
    case "plug-groups": {
      const groups = value.groups
        .filter((group) => group.hashes.length)
        .map((group) => loadoutTemplate(copy, "{group} {hashes}", {
          group: loadoutText(copy, comparePlugGroupLabels[group.group]),
          hashes: sortedNumberList(group.hashes)
        }))
        .join(" · ");
      return value.empty_socket_count
        ? loadoutTemplate(copy, "{groups} · 空槽位 {count} 格", { groups, count: value.empty_socket_count })
        : groups;
    }
    case "plug-hashes": return loadoutTemplate(copy, "已返回 Plug {hashes}", { hashes: sortedNumberList(value.hashes) });
  }
}

/** 与 app 侧 `sortedNumbers` 同一口径：升序、逗号分隔、不加空格。 */
function sortedNumberList(values: number[]): string {
  return [...values].sort((left, right) => left - right).join(",");
}

function resolveArmorClass(value: string): ArmorClass {
  const normalized = value.trim().toLocaleLowerCase();
  if (normalized.includes("泰坦") || normalized.includes("titan")) return "titan";
  if (normalized.includes("猎人") || normalized.includes("獵人") || normalized.includes("hunter")) return "hunter";
  if (normalized.includes("术士") || normalized.includes("術士") || normalized.includes("warlock")) return "warlock";
  return "unknown";
}

function armorSlotLabel(copy: LoadoutsCopy, slot: ArmorSlot): string {
  return copy.labels.armorSlots[slot];
}

function formatArmorStatModSlotRule(copy: LoadoutsCopy, rule: LoadoutPlanArmorStatModSlotRule): string {
  if (rule.mode === "auto") return loadoutText(copy, "自动选择数值与属性");
  if (rule.mode === "none") return loadoutText(copy, "不安装");
  return loadoutTemplate(copy, "{value}{stat}", {
    value: rule.mode === "plus5" ? "+5" : "+10",
    stat: rule.stat ? ` ${armorStatLabel(copy, rule.stat)}` : loadoutText(copy, "，属性自动")
  });
}

function getArmorPlannerStatusMessage(copy: LoadoutsCopy, input: {
  state: ArmorPlannerWorkspaceState | undefined;
  hasAccount: boolean;
  hasClient: boolean;
  armorClass: ArmorClass;
  mode: ArmorPlannerMode;
}): string {
  if (!input.hasClient) return loadoutText(copy, "当前平台未接入真实账号护甲规划。");
  if (!input.hasAccount && input.mode !== "theoretical") return loadoutText(copy, "请先同步装备数据，才能核对账号中的具体护甲。");
  if (input.armorClass === "unknown") return loadoutText(copy, "请先填写可识别的泰坦、猎人或术士职业。");
  if (!input.state || input.state.status === "idle") return "";
  if (input.state.status === "loading") return input.mode === "theoretical"
    ? loadoutText(copy, "正在使用当前游戏规则计算理论可达方案。")
    : loadoutText(copy, "正在核对当前游戏数据、账号护甲和配装要求。");
  if (input.state.status === "error") {
    return input.state.error.message || loadoutText(copy, "护甲规划失败，请稍后重试。");
  }
  const view = input.state.viewModel;
  if (input.state.status === "stale") return loadoutText(copy, "账号、规则或新请求已使当前结果过期，请重新计算。");
  const detail = [...view.issues.map((issue) => issue.message), ...view.warnings].join(" ");
  if (view.outcome === "invalid") return detail || loadoutText(copy, "当前护甲目标或配装要求无效。");
  if (view.outcome === "indeterminate") {
    return detail || loadoutText(copy, "计算范围已达到上限，当前方案不能确认是最佳结果。");
  }
  if (view.outcome === "unreachable") return detail || loadoutText(copy, "当前账号护甲无法满足全部目标。");
  return loadoutTemplate(copy, "已找到 {count} 个达标方案。{detail}", {
    count: view.reachableCandidateCount,
    detail: detail ? ` ${detail}` : ""
  });
}

function uniqueHashOptions(
  slots: AccountSummary["characters"][number]["loadout_slots"],
  key: "name_hash" | "icon_hash" | "color_hash",
  label: (slot: AccountSummary["characters"][number]["loadout_slots"][number]) => string
): Array<{ hash: number; label: string }> {
  const seen = new Set<number>();
  return slots.flatMap((slot) => {
    const hash = slot[key];
    if (typeof hash !== "number" || seen.has(hash)) return [];
    seen.add(hash);
    return [{ hash, label: label(slot) }];
  });
}

function numberOrUndefined(value: string): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
