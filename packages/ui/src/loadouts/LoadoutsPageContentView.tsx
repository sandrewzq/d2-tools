import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import type {
  ArmorPlannerCandidateView,
  ArmorPlannerMode,
  ArmorPlannerWorkspaceJob,
  ArmorPlannerWorkspaceState
} from "@d2-tools/app/armor";
import type {
  ApplicationLoadoutCompareViewModel,
  ApplicationLoadoutDetailView,
  ApplicationLoadoutInGameReference,
  ApplicationLoadoutLibraryViewModel,
  ApplicationLoadoutNavigationState,
  ApplicationLoadoutScreen,
  InGameLoadoutItemRowView,
  LoadoutEntryView,
  LocalLoadoutPlanWorkbenchModel,
  LoadoutsPageModel
} from "@d2-tools/app/loadouts";
import type {
  AssistantLoadoutArtifact,
  AssistantEquipmentTargetCandidatesArtifact
} from "@d2-tools/app/capabilities";
import type { GuideLoadoutCandidatesArtifact } from "@d2-tools/app/guides";
import { getActiveApplicationLoadoutScreen, getLocalLoadoutPlanAccountItems } from "@d2-tools/app/loadouts";
import type { AccountItemSummary, AccountSummary } from "@d2-tools/core/account/summary";
import type { ArmorClass, ArmorSetConstraint, ArmorSlot } from "@d2-tools/core/armor";
import type { ArmorSetCatalogEntry } from "@d2-tools/core/items/equipableItemSet";
import {
  loadoutPlanArmorStatKeys,
  matchLocalLoadoutPlan,
  type CreateLocalLoadoutPlanInput,
  type LoadoutPlanArmorConstraints,
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
import type { InterfaceLocale } from "../i18n/types.js";
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
  acceptGuideLoadoutCandidates: (
    artifact: GuideLoadoutCandidatesArtifact,
    candidateIds: string[]
  ) => boolean;
  dismissAssistantPrefill: () => void;
  openGuideSource?: (sourceId: string) => Promise<boolean>;
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
  isRunningItemAction: boolean;
  actionFeedback: Record<string, LoadoutActionFeedbackState>;
  localPlanWorkspace: LocalLoadoutPlanWorkbenchModel;
  applicationLoadoutNavigation: ApplicationLoadoutNavigationState;
  applicationLoadoutLibrary: ApplicationLoadoutLibraryViewModel;
  applicationLoadoutCompare: ApplicationLoadoutCompareViewModel;
  localPlanDraft: CreateLocalLoadoutPlanInput | null;
  localPlanIsDirty: boolean;
  localPlanEditingId: string | null;
  localPlanIsSaving: boolean;
  localPlanError: string;
  dimPreview: DimLoadoutImportPreview | null;
  localPlanIsPreviewingDim: boolean;
  localPlanDimExport: DimLoadoutExportResult | null;
  localPlanDimExportFeedback: string;
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
  localPlanAssistantPrefill: ((AssistantLoadoutArtifact | GuideLoadoutCandidatesArtifact) & { request_id: number }) | null;
  armorPlannerState?: ArmorPlannerWorkspaceState;
  armorSetCatalog?: ArmorSetCatalogEntry[];
  armorSetCatalogStatus?: "loading" | "ready" | "error";
  armorTargetFeedback?: string;
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
  const [mode, setMode] = useState<LoadoutMode>("local");
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [createFlow, setCreateFlow] = useState<LoadoutCreateFlow>("none");
  const sourceMenuRef = useRef<HTMLDetailsElement>(null);
  useNavigationGuard(props.localPlanDraft && props.localPlanIsDirty ? {
    title: "离开配装并放弃未保存修改？",
    description: "当前应用配装包含尚未保存的修改。离开配装页会丢失这些草稿内容，已保存方案和游戏内槽位不会改变。",
    confirmLabel: "放弃并离开",
    cancelLabel: "继续编辑"
  } : null);
  const tabId = useId();
  const panelId = `${tabId}-panel`;
  const characters = props.accountSummary?.characters ?? [];
  const activeCharacterId = selectedCharacterId || characters[0]?.character_id || "";
  const activeCharacter = characters.find((character) => character.character_id === activeCharacterId) ?? null;
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

  const statusTone = props.message.includes("失败")
    ? "error"
    : props.isRunningItemAction
      ? "running"
      : !activeCharacter
        ? "warning"
        : "ready";
  const statusTitle = props.isRunningItemAction
    ? "处理中"
    : props.message ? "操作状态" : !activeCharacter ? "等待账号" : "就绪";
  const statusMessage = props.message
    || (!activeCharacter
      ? mode === "local"
        ? "账号角色尚未读取；仍可查看和比较应用配装，穿戴与账号装备选择暂不可用。"
        : "账号角色尚未读取，游戏内配装操作暂不可用。"
      : mode === "in-game"
        ? "选择游戏内配装槽位后再应用或保存当前装备。"
        : "应用配装保存在本应用中，只有显式穿戴或保存到游戏内槽位才会写入 Bungie。");

  return (
    <section className="loadout-page" aria-label="配装工作台">
      <div className="loadout-context-toolbar" data-surface="section">
        <div className="loadout-context-group">
          <span className="loadout-context-label">角色</span>
          <div className="loadout-character-tabs" data-ui-kind="context-switcher" role="group" aria-label="配装角色上下文">
            {characters.map((character, index) => {
              const active = activeCharacterId === character.character_id;
              return (
                <button
                  type="button"
                  aria-pressed={active}
                  tabIndex={active ? 0 : -1}
                  key={character.character_id}
                  onClick={() => selectCharacter(character.character_id)}
                  onKeyDown={(event) => handleCharacterKeyDown(event, index)}
                >
                  <span className="loadout-character-mark" aria-hidden="true">{character.class_name.slice(0, 1)}</span>
                  <strong>{character.class_name}</strong>
                  <small>{character.loadout_slots.length} 槽</small>
                </button>
              );
            })}
            {!characters.length ? <span className="loadout-character-empty">未读取角色</span> : null}
          </div>
        </div>

        <span className="loadout-context-divider" aria-hidden="true" />

        <div className="loadout-context-group">
          <span className="loadout-context-label">视图</span>
          <div className="loadout-mode-tabs" data-ui-kind="segmented-control" role="tablist" aria-label="配装类型">
            <button id={`${tabId}-in-game`} type="button" role="tab" aria-controls={panelId} aria-selected={mode === "in-game"} tabIndex={mode === "in-game" ? 0 : -1} onKeyDown={handleModeKeyDown} onClick={() => selectMode("in-game")}>游戏内配装 <span>Bungie</span></button>
            <button id={`${tabId}-local`} type="button" role="tab" aria-controls={panelId} aria-selected={mode === "local"} tabIndex={mode === "local" ? 0 : -1} onKeyDown={handleModeKeyDown} onClick={() => selectMode("local")}>应用配装 <span>d2-tools</span></button>
          </div>
        </div>

        {mode === "local" ? (
          <div className="loadout-context-actions">
            <details ref={sourceMenuRef} className="loadout-create-menu">
              <summary data-ui-kind="button" data-control-variant="primary" aria-haspopup="true">新建配装</summary>
              <div className="loadout-create-options" data-surface="menu" data-ui-kind="command-menu" aria-label="应用配装创建方式">
                <button type="button" disabled={!activeCharacter || props.isRunningItemAction} onClick={(event) => createFromCurrentCharacter(event.currentTarget.closest("details")!)}>
                  <strong>使用当前装备</strong>
                  <span>预填当前角色的真实装备实例</span>
                </button>
                <button type="button" onClick={(event) => openDimImport(event.currentTarget.closest("details")!)}>
                  <strong>更多：导入 DIM</strong>
                  <span>从公开分享链接预填应用配装，不依赖 DIM 运行</span>
                </button>
                <button type="button" disabled={!activeCharacter || props.isRunningItemAction} onClick={(event) => createBlankPlan(event.currentTarget.closest("details")!)}>
                  <strong>空白方案</strong>
                  <span>带入目标角色后逐槽位创建</span>
                </button>
              </div>
            </details>
          </div>
        ) : null}
      </div>

      <div className="loadout-content-frame" data-surface="workspace-frame" data-ui-kind="workspace-frame">
        <div className={`loadout-operation-status ${statusTone}`} data-surface="section" data-status={statusTone === "running" ? "pending" : statusTone === "ready" ? "success" : statusTone} aria-live="polite">
          <span aria-hidden="true" />
          <strong>{statusTitle}</strong>
          <p>{statusMessage}</p>
        </div>

        <div id={panelId} className="loadout-workspace-panel" role="tabpanel" aria-labelledby={`${tabId}-${mode}`}>
          {mode === "in-game" ? (
            <InGameWorkspace
              activeCharacter={activeCharacter}
              entries={inGameEntries}
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
        <div className="loadout-column-head"><div><strong>Bungie 游戏内配装</strong><small>{props.entries.length} 个已保存槽位</small></div></div>
        <div className="loadout-entry-list" data-surface="list">
          {props.entries.map((entry) => {
            const selected = props.model.selectedEntryId === entry.id;
            return (
              <button type="button" key={entry.id} aria-pressed={selected} data-status="success" className="loadout-directory-row" onClick={() => props.actions.selectEntry(entry.id)}>
                <span className="loadout-directory-index">{String((entry.slotIndex ?? 0) + 1).padStart(2, "0")}</span>
                <span><strong>{entry.title}</strong><small>{entry.slot?.item_count ?? 0} 件保存装备</small></span>
                <em>Bungie</em>
              </button>
            );
          })}
          {!props.entries.length ? <p className="loadout-rail-empty">当前角色没有已保存的游戏内配装槽位。</p> : null}
        </div>
      </ProductWorkspaceSideRail>

      <section className="loadout-detail">
        <InGameAccountFreshness
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
            isRunningItemAction={props.isRunningItemAction}
            actions={props.actions}
            onOpenSlotPicker={() => setIsSlotPickerVisible((visible) => !visible)}
          />
        ) : (
          <div className="loadout-empty-detail-head">
            <ProductWorkspaceEmptyState><h2>没有可查看的游戏内配装</h2><p>当前角色没有包含装备的 Bungie 配装槽位，仍可把当前装备保存到任意真实槽位。</p></ProductWorkspaceEmptyState>
            {props.activeCharacter && slots.length ? <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={props.isRunningItemAction} onClick={() => setIsSlotPickerVisible((visible) => !visible)}>用当前装备覆盖槽位</button> : null}
          </div>
        )}
        {isSlotPickerVisible && props.activeCharacter ? (
          <InGameSlotPicker
            character={props.activeCharacter}
            selectedSlot={selectedSlot}
            isRunningItemAction={props.isRunningItemAction}
            onSelectSlot={setSelectedSlotIndex}
            onSave={(slot) => props.actions.snapshotCurrentLoadout(props.activeCharacter!, slot)}
          />
        ) : null}
      </section>

      <aside className="loadout-summary">
        {detail ? <InGameSummary detail={detail} /> : <LoadoutSummaryEmpty />}
      </aside>
    </ProductWorkspaceSplit>
  );
}

function InGameLoadoutSlotDetail(props: {
  detail: Extract<LoadoutsPageModel["selectedDetail"], { kind: "in-game-slot" }>;
  slots: AccountSummary["characters"][number]["loadout_slots"];
  isRunningItemAction: boolean;
  actions: LoadoutsPageActions;
  onOpenSlotPicker: () => void;
}) {
  const { character, slot } = props.detail;
  const itemGroups = [
    {
      key: "weapon",
      label: "武器",
      rows: props.detail.itemRows.filter((row) => row.category === "weapon")
    },
    {
      key: "armor",
      label: "护甲",
      rows: props.detail.itemRows.filter((row) => row.category === "armor")
    },
    {
      key: "subclass",
      label: "子职业",
      rows: props.detail.itemRows.filter((row) => row.category === "subclass")
    },
    {
      key: "artifact",
      label: "神器",
      rows: props.detail.itemRows.filter((row) => row.category === "artifact")
    },
    {
      key: "other",
      label: "其他",
      rows: props.detail.itemRows.filter((row) => row.category === "other")
    }
  ].filter((group) => group.rows.length);
  return (
    <>
      <header className="loadout-detail-head">
        <div><span className="loadout-eyebrow">游戏内配装 · 槽位 {String(slot.index + 1).padStart(2, "0")}</span><h2>{slot.name || `配装栏 ${slot.index + 1}`}</h2><p>{character.class_name} · Bungie 保存的装备实例。未返回的 Perk、技能和模组不会在这里伪造显示。</p></div>
        <div className="loadout-action-stack">
          <div className="loadout-action-group" aria-label="官方槽位操作">
            <span>官方槽位</span>
            <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={props.isRunningItemAction} onClick={() => props.actions.equipSavedLoadout(character, slot)}>应用游戏内配装</button>
            <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isRunningItemAction} onClick={props.onOpenSlotPicker}>用当前装备覆盖槽位</button>
            <button type="button" data-ui-kind="button" data-control-variant="danger" disabled={props.isRunningItemAction || !slot.item_count} onClick={() => props.actions.clearSavedLoadout(character, slot)}>清空槽位</button>
          </div>
          <div className="loadout-action-group" aria-label="配装辅助操作">
            <span>配装辅助</span>
            <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.actions.startLocalPlanFromInGameLoadout(character, slot)}>复制到应用配装</button>
          </div>
        </div>
      </header>
      <div className="loadout-section-label"><span>保存的装备 · 当前账号状态</span><span>{slot.items.length} 件记录</span></div>
      {props.detail.itemRows.length ? (
        <div className="loadout-in-game-item-groups" data-surface="content-stack">
          {itemGroups.map((group) => (
            <section className="loadout-in-game-item-group" key={group.key} aria-label={group.label}>
              <header><strong>{group.label}</strong><span>{group.rows.length} 件</span></header>
              <div className="loadout-in-game-item-list" data-surface="list">
                {group.rows.map((row, index) => <InGameLoadoutItemRow key={`${character.character_id}-${slot.index}-${row.item.instance_id ?? row.item.item_hash ?? index}`} row={row} onOpenItemDetail={props.actions.openInGameItemDetail} />)}
              </div>
            </section>
          ))}
        </div>
      ) : <ProductWorkspaceEmptyState><h3>当前槽位为空</h3><p>可以把当前角色已装备的物品保存到此槽位。</p></ProductWorkspaceEmptyState>}
      <InGameIdentifierEditor character={character} slot={slot} slots={props.slots} isRunningItemAction={props.isRunningItemAction} onSubmit={props.actions.updateSavedLoadoutIdentifiers} />
      <footer className="loadout-detail-footer"><p>应用时直接调用 Bungie 槽位，d2-tools 不会预先转移或逐件装备。</p></footer>
    </>
  );
}

function InGameAccountFreshness(props: {
  status?: LoadoutsPageContentViewProps["accountDataStatus"];
  message?: string;
  source?: LoadoutsPageContentViewProps["accountDataSource"];
  fetchedAt?: string;
  error?: string;
}) {
  const label = props.error
    ? `账号同步失败：${props.error}`
    : props.message
      || (props.status === "refreshing"
        ? "账号快照后台同步中"
        : props.status === "stale"
          ? "账号快照可能已过期"
          : props.status === "cached"
            ? "使用本地账号快照"
            : props.status === "ready"
              ? "账号快照已就绪"
              : "账号快照状态待确认");
  const sourceLabel = props.source === "local"
    ? "本地缓存"
    : props.source === "remote"
      ? "远端刷新"
      : props.source === "merged"
        ? "本地与远端合并"
        : "";
  const detail = [sourceLabel, props.fetchedAt ? `更新于 ${props.fetchedAt}` : ""].filter(Boolean).join(" · ");
  return (
    <div className="loadout-application-freshness loadout-in-game-freshness" data-status={props.error || props.status === "error" ? "warning" : props.status === "ready" ? "success" : "neutral"}>
      <span aria-hidden="true" />
      <strong>{label}</strong>
      <small>{detail || "装备名称、位置和 Plug 是基于当前账号快照的补充信息；Bungie 槽位本身仍可直接应用。"}</small>
    </div>
  );
}

function InGameLoadoutItemRow(props: { row: InGameLoadoutItemRowView; onOpenItemDetail: (item: AccountItemSummary) => void }) {
  const { item, locatedItem, located, locationLabel } = props.row;
  const plugEntries = item.plugs?.map((plug) => ({
    name: plug.name,
    socketIndex: plug.socket_index
  })).filter((plug) => Boolean(plug.name)) ?? [];
  const plugNames = plugEntries.map((plug) => plug.name);
  const stateLabel = located
    ? props.row.equipped_on_target_character ? "当前已装备" : "已定位"
    : "未定位";
  const stateDetail = props.row.equipped_on_target_character
    ? "目标角色"
    : located ? "等待 Bungie 应用" : "不阻止直接应用";
  const traceLabel = item.instance_id
    ? `实例尾号 ${item.instance_id.slice(-4)}`
    : typeof item.item_hash === "number"
      ? `物品 Hash ${item.item_hash} · 实例未返回`
      : "未返回定义或实例标识";
  const plugSummary = plugNames.length
    ? plugNames.join("、")
    : props.row.plug_count ? `${props.row.plug_count} 个 Plug Hash` : "未返回 Plug";
  return (
    <details className="loadout-in-game-item-card" data-surface="object-card" data-ui-kind="object-card" data-status={located ? "success" : "warning"}>
      <summary className="loadout-in-game-item-row">
        <ItemVisual icon={locatedItem?.icon ?? item.icon} label={item.name} bucketName={item.bucket_name} />
          <span className="loadout-in-game-item-copy">
            <strong>{item.name}</strong>
          <span className="loadout-in-game-item-meta">{item.bucket_name || `${inGameItemCategoryLabel(props.row.category)}槽位未解析`}</span>
          <span className="loadout-in-game-item-trace">{traceLabel}</span>
        </span>
        <span className="loadout-in-game-item-facts">
          <span className="loadout-in-game-location">{locationLabel}</span>
          <span className="loadout-in-game-plugs">
            {plugEntries.slice(0, 3).map((plug, index) => <span key={`${plug.name}-${plug.socketIndex ?? index}`}>{formatSocketPlugLabel(plug.name, plug.socketIndex)}</span>)}
            {plugNames.length > 3 ? <span>+{plugNames.length - 3}</span> : null}
            {!plugNames.length ? <span>{props.row.plug_count ? `${props.row.plug_count} 个 Plug` : "Plug 数据未返回"}</span> : null}
          </span>
        </span>
        <span className="loadout-in-game-item-state">
          <em data-status={located ? "success" : "warning"}>{stateLabel}</em>
          <small>{stateDetail}</small>
        </span>
        <span className="loadout-in-game-item-chevron" aria-hidden="true">⌄</span>
      </summary>
      <dl className="loadout-in-game-item-extra">
        <div><dt>当前位置</dt><dd>{locationLabel}</dd></div>
        <div><dt>配置类型</dt><dd>{plugNames.length ? "已返回可解析配置" : props.row.plug_count ? "仅返回 Plug Hash" : "未返回配置"}</dd></div>
        <div><dt>已确认配置</dt><dd>{plugEntries.length ? plugEntries.map((plug) => formatSocketPlugLabel(plug.name, plug.socketIndex)).join("、") : plugSummary}</dd></div>
        <div><dt>核对结果</dt><dd>{located ? props.row.equipped_on_target_character ? "目标角色已处于槽位保存状态" : "实例已定位，应用时由 Bungie 处理" : "保留原始记录，不根据名称猜测实例"}</dd></div>
        {locatedItem ? <div className="loadout-in-game-item-actions"><dt>装备操作</dt><dd><button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onOpenItemDetail(locatedItem)}>查看装备详情与操作</button><small>转移、穿戴和模组修改会作用于真实装备；如需更新此槽位，完成后再覆盖保存。</small></dd></div> : null}
      </dl>
    </details>
  );
}

function formatSocketPlugLabel(name: string, socketIndex?: number): string {
  return typeof socketIndex === "number" ? `插槽 ${socketIndex + 1} · ${name}` : name;
}

function inGameItemCategoryLabel(category: InGameLoadoutItemRowView["category"]): string {
  return category === "weapon"
    ? "武器"
    : category === "armor"
      ? "护甲"
      : category === "subclass"
        ? "子职业"
        : category === "artifact"
          ? "神器"
          : "装备";
}

function InGameIdentifierEditor(props: {
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
  const nameOptions = uniqueHashOptions(props.slots, "name_hash", (slot) => slot.name || `配装槽 ${slot.index + 1}`);
  const iconOptions = uniqueHashOptions(props.slots, "icon_hash", (slot) => `图标 ${slot.index + 1}`);
  const colorOptions = uniqueHashOptions(props.slots, "color_hash", (slot) => `颜色 ${slot.index + 1}`);
  if (!nameOptions.length && !iconOptions.length && !colorOptions.length) return null;
  return (
    <details className="loadout-slot-picker">
      <summary>修改官方标识</summary>
      <p>仅可选择当前资料库已解析的 Bungie 标识 Hash，不支持自由文本命名。</p>
      <div className="loadout-compare-controls">
        {nameOptions.length ? <label><span>名称</span><select value={nameHash ?? ""} onChange={(event) => setNameHash(numberOrUndefined(event.target.value))}>{nameOptions.map((option) => <option key={option.hash} value={option.hash}>{option.label}</option>)}</select></label> : null}
        {iconOptions.length ? <label><span>图标</span><select value={iconHash ?? ""} onChange={(event) => setIconHash(numberOrUndefined(event.target.value))}>{iconOptions.map((option) => <option key={option.hash} value={option.hash}>{option.label}</option>)}</select></label> : null}
        {colorOptions.length ? <label><span>颜色</span><select value={colorHash ?? ""} onChange={(event) => setColorHash(numberOrUndefined(event.target.value))}>{colorOptions.map((option) => <option key={option.hash} value={option.hash}>{option.label}</option>)}</select></label> : null}
        <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isRunningItemAction} onClick={() => props.onSubmit(props.character, props.slot, { name_hash: nameHash, icon_hash: iconHash, color_hash: colorHash })}>更新标识</button>
      </div>
    </details>
  );
}

function InGameSlotPicker(props: {
  character: AccountSummary["characters"][number];
  selectedSlot: AccountSummary["characters"][number]["loadout_slots"][number] | null;
  isRunningItemAction: boolean;
  onSelectSlot: (index: number) => void;
  onSave: (slot: AccountSummary["characters"][number]["loadout_slots"][number]) => void;
}) {
  return (
    <section className="loadout-slot-picker" aria-label="用当前装备覆盖目标槽位">
      <header><div><strong>用当前装备覆盖槽位</strong><small>选择 Bungie 真实槽位；已有内容的槽位会在写入前再次确认覆盖。</small></div></header>
      <div className="loadout-slot-picker-list" data-surface="list">
        {props.character.loadout_slots.map((slot) => {
          const selected = props.selectedSlot?.index === slot.index;
          const occupied = slot.item_count > 0 || slot.items.length > 0;
          return (
            <button type="button" key={slot.index} aria-pressed={selected} data-status={occupied ? "warning" : "neutral"} onClick={() => props.onSelectSlot(slot.index)}>
              <span>{String(slot.index + 1).padStart(2, "0")}</span>
              <span><strong>{occupied ? slot.name || `配装栏 ${slot.index + 1}` : `空槽位 ${slot.index + 1}`}</strong><small>{occupied ? `${slot.item_count} 件装备 · 覆盖需要确认` : "保存当前角色已装备状态"}</small></span>
            </button>
          );
        })}
      </div>
      <footer><button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!props.selectedSlot || props.isRunningItemAction} onClick={() => props.selectedSlot && props.onSave(props.selectedSlot)}>{props.selectedSlot && (props.selectedSlot.item_count > 0 || props.selectedSlot.items.length > 0) ? "确认覆盖" : "保存到槽位"}</button></footer>
    </section>
  );
}

function InGameSummary(props: { detail: Extract<LoadoutsPageModel["selectedDetail"], { kind: "in-game-slot" }> }) {
  const locatedCount = props.detail.itemRows.filter((row) => row.located).length;
  const missingCount = props.detail.itemRows.length - locatedCount;
  const equippedCount = props.detail.itemRows.filter((row) => row.equipped_on_target_character).length;
  const locatedElsewhereCount = Math.max(locatedCount - equippedCount, 0);
  return (
    <>
      <div className="loadout-column-head"><div><strong>账号核对</strong><small>当前账号快照</small></div></div>
      <dl className="loadout-ledger">
        <div><dt>保存装备</dt><dd><b>{props.detail.itemRows.length}</b><small>槽位实际返回的装备记录</small></dd></div>
        <div data-status="success"><dt>已定位</dt><dd><b>{locatedCount}</b><small>当前账号快照可找到实例</small></dd></div>
        <div data-status={missingCount ? "warning" : "success"}><dt>未定位</dt><dd><b>{missingCount}</b><small>不阻止 Bungie 直接应用</small></dd></div>
      </dl>
      <section className="loadout-summary-checks" aria-label="应用前核对">
        <h3>应用前核对</h3>
        <ul>
          <li data-status="success"><span aria-hidden="true">✓</span><span>{equippedCount} 件装备已在目标角色身上。</span></li>
          <li data-status="success"><span aria-hidden="true">✓</span><span>{locatedElsewhereCount} 件装备已在背包、其他角色或仓库中定位。</span></li>
          {missingCount ? <li data-status="warning"><span aria-hidden="true">!</span><span>{missingCount} 条记录未解析名称或实例位置。</span></li> : null}
        </ul>
      </section>
      <p className="loadout-guidance">游戏内配装由 Bungie 直接应用。未定位记录用于账号核对，不代表官方槽位不可用，也不会被应用配装自动替换。</p>
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
    ? "账号数据尚未读取"
    : props.accountDataError
    ? `账号同步失败：${props.accountDataError}`
    : props.accountDataStatus === "refreshing"
    ? "后台同步中"
    : props.accountDataStatus === "stale"
      ? "缓存可能已过期"
      : props.accountDataStatus === "cached"
        ? "使用本地缓存"
        : props.accountDataStatus === "error"
          ? "账号刷新失败"
          : props.accountDataStatus === "ready"
            ? "账号数据已就绪"
            : "账号状态待确认";
  const accountDataDetail = [
    props.accountDataSource === "local" ? "本地缓存" : props.accountDataSource === "remote" ? "远端刷新" : props.accountDataSource === "merged" ? "本地与远端合并" : "",
    props.accountDataFetchedAt ? `更新于 ${props.accountDataFetchedAt}` : ""
  ].filter(Boolean).join(" · ");

  if (screen.kind === "compare") {
    return (
      <ApplicationLoadoutCompare
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
        : screen.kind === "item-picker"
          ? "picker"
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
          onOpenArmor={() => openScreen({ kind: "armor-planner", return_focus_id: "loadout-open-armor-planner" })}
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
    return <section className="loadout-subpage"><header className="loadout-subpage-head"><button className="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.actions.popApplicationLoadoutScreen}>返回方案库</button><div><h2>当前页面需要一个应用配装草稿</h2><p>草稿可能已关闭或删除。返回方案库后重新选择方案。</p></div></header></section>;
  }

  return (
    <ProductWorkspaceSplit className={`loadout-workspace loadout-local-workspace loadout-compact-${compactLibraryPane}`}>
      <ProductWorkspaceSideRail element="aside" className="loadout-directory">
        <div className="loadout-column-head"><div><strong>应用配装</strong><small>{props.applicationLoadoutLibrary.entries.length} 个完整构筑方案</small></div></div>
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
                  <span><strong>{entry.title}</strong><small>{entry.class_name} · {entry.item_count} 个装备目标</small><small>{entry.source_label}</small></span>
                  <em data-status={entry.status_tone}>{entry.status_label}</em>
                </button>
                <label className="loadout-compare-toggle">
                  <input type="checkbox" checked={compareIds.includes(entry.id)} disabled={!compareIds.includes(entry.id) && compareIds.length >= 3} onChange={() => toggleCompare(entry.id)} />
                  <span>对比</span>
                </label>
              </div>
            );
          })}
          {props.applicationLoadoutLibrary.empty ? <p className="loadout-rail-empty">还没有应用配装。可以从当前装备或空白方案开始创建。</p> : null}
        </div>
        {compareIds.length ? <div className="loadout-compare-dock"><span>{props.applicationLoadoutCompare.selection_message}</span>{inGameReferences.length ? <label><span>游戏内只读参照</span><select value={props.applicationLoadoutCompare.in_game_reference_id ?? ""} onChange={(event) => { const reference = inGameReferences.find((candidate) => applicationLoadoutInGameReferenceId(candidate) === event.target.value) ?? null; props.actions.applicationLoadoutInGameReferenceChange(reference); }}><option value="">不加入</option>{inGameReferences.map((reference) => <option key={applicationLoadoutInGameReferenceId(reference)} value={applicationLoadoutInGameReferenceId(reference)}>{reference.character.class_name} · {reference.slot.name || `槽位 ${reference.slot.index + 1}`}</option>)}</select></label> : null}<button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!props.applicationLoadoutCompare.can_compare} onClick={() => openScreen({ kind: "compare", plan_ids: compareIds, show_diff_only: props.applicationLoadoutCompare.showDiffOnly, ...(props.applicationLoadoutCompare.in_game_reference_id ? { in_game_reference_id: props.applicationLoadoutCompare.in_game_reference_id } : {}), ...(selectedPlan ? { return_focus_id: `loadout-application-plan-${selectedPlan.id}` } : {}) })}>比较方案</button></div> : null}
      </ProductWorkspaceSideRail>

      <section className="loadout-detail">
        <button type="button" className="loadout-compact-library-back" data-ui-kind="button" data-control-variant="secondary" onClick={() => setCompactLibraryPane("directory")}>返回方案列表</button>
        {props.armorResultTraceRequest ? <ArmorResultTraceNotice {...props} /> : null}
        {props.createFlow === "dim" ? <DimImportPanel {...props} /> : null}
        {props.createFlow === "guide" ? <GuideImportPanel {...props} /> : null}
        {props.localPlanError ? <div className="loadout-capability-notice" data-ui-kind="callout" data-status="warning"><div><strong>应用配装操作未完成</strong><p>{props.localPlanError}</p></div></div> : null}
        {selectedDetail ? (
          <ApplicationLoadoutDetail
            plan={selectedDetail.plan}
            detail={selectedDetail}
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
        ) : <ProductWorkspaceEmptyState><h2>选择一个应用配装</h2><p>先查看方案内容和账号匹配情况，再决定比较、编辑或穿戴。</p></ProductWorkspaceEmptyState>}
      </section>

      <aside className="loadout-summary">
        {selectedDetail ? (
          <ApplicationLoadoutQuickActions
            planId={selectedDetail.plan.id}
            planName={selectedDetail.plan.name}
            summary={selectedDetail.match_summary}
            executionPlan={props.localPlanExecutionPlan}
            wearEnabled={selectedDetail.wear_enabled && props.accountDataStatus !== "error"}
            isExecuting={props.localPlanIsExecuting}
            onEdit={() => { props.actions.editLocalPlan(selectedDetail.plan.id); openScreen({ kind: "editor", draft_id: selectedDetail.plan.id, plan_id: selectedDetail.plan.id, return_focus_id: `loadout-application-plan-${selectedDetail.plan.id}` }); }}
            onWear={() => { props.actions.editLocalPlan(selectedDetail.plan.id); openScreen({ kind: "wear-review", plan_id: selectedDetail.plan.id, return_focus_id: `loadout-quick-wear-${selectedDetail.plan.id}` }); }}
          />
        ) : <LoadoutSummaryEmpty />}
      </aside>
    </ProductWorkspaceSplit>
  );
}

function ApplicationLoadoutDetail(props: {
  plan: ApplicationLoadoutDetailView["plan"];
  detail: ApplicationLoadoutDetailView;
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
        <div><span className="loadout-eyebrow">应用配装 · {props.plan.class_name}</span><h2>{props.plan.name}</h2><p>{props.plan.source.label || "由应用保存的完整构筑方案"} · 更新于 {props.plan.updated_at || props.plan.created_at}</p></div>
        <div className="loadout-action-stack">
          <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.compareDisabled} aria-pressed={props.compareSelected} onClick={props.onToggleCompare}>{props.compareSelected ? "移出对比" : "加入对比"}</button>
          <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onEdit}>编辑</button>
          <button id={`loadout-wear-plan-${props.plan.id}`} type="button" data-ui-kind="button" data-control-variant="primary" disabled={props.isExecuting || !props.detail.wear_enabled || props.accountDataStatus === "error"} onClick={props.onWear}>穿戴此方案</button>
        </div>
      </header>
      <div className="loadout-application-freshness" data-status={props.accountDataStatus === "error" ? "warning" : props.accountDataStatus === "ready" ? "success" : "neutral"}><span aria-hidden="true" /><strong>{props.accountDataLabel}</strong><small>穿戴前会强制刷新并重新核对实例、位置、Plug 与能量。</small></div>
      <section className="loadout-build-overview" aria-label="构筑总览">
        <article><span>子职业</span><strong>{subclass?.subclass_hash ? `定义 ${subclass.subclass_hash}` : "未配置"}</strong><small>{subclass ? `${subclass.aspect_hashes.length} 星相 · ${subclass.fragment_hashes.length} 碎片` : "可在编辑器中设置"}</small></article>
        <article><span>装备目标</span><strong>{props.detail.configured_item_count} 项</strong><small>{selectedCount} 项已绑定真实实例</small></article>
        <article data-status={unresolvedCount ? "warning" : "success"}><span>账号核对</span><strong>{props.detail.wear_label}</strong><small>{unresolvedCount ? props.detail.wear_block_reasons[0] : "基于当前账号数据"}</small></article>
      </section>
      <div className="loadout-section-label"><span>装备与模组</span><span>{props.detail.item_rows.length} 个目标 · {props.detail.configured_plug_count} 个 Plug</span></div>
      <div className="loadout-readonly-slot-grid">
        {props.detail.item_rows.map((row, index) => <ApplicationLoadoutSlot key={row.key} row={row} index={index} />)}
      </div>
      {!props.detail.item_rows.length ? <ProductWorkspaceEmptyState><h3>此方案尚未配置装备</h3><p>进入编辑器后可按武器和护甲槽位添加真实实例。</p></ProductWorkspaceEmptyState> : null}
      {props.plan.notes ? <section className="loadout-plan-notes"><strong>方案备注</strong><p>{props.plan.notes}</p></section> : null}
      <footer className="loadout-detail-footer loadout-danger-footer"><p>应用配装与游戏内配装相互独立；只有穿戴验证成功后才能保存到游戏内槽位。</p><button type="button" data-ui-kind="button" data-control-variant="danger" onClick={props.onDelete}>删除应用配装</button></footer>
    </div>
  );
}

function ApplicationLoadoutSlot(props: { row: ApplicationLoadoutDetailView["item_rows"][number]; index: number }) {
  const representative = props.row.match?.candidates.find((candidate) => candidate.item.instance_id === props.row.selected_instance_id)
    ?? props.row.match?.candidates[0]
    ?? null;
  return (
    <article className="loadout-readonly-slot" data-surface="object-card" data-ui-kind="object-card" data-status={props.row.status_tone}>
      <ItemVisual icon={representative?.item.icon} label={representative?.item.name || props.row.slot} bucketName={props.row.slot} />
      <div><span>{props.row.slot || `装备 ${props.index + 1}`}</span><strong>{representative?.item.name || (props.row.item_hash ? `定义 ${props.row.item_hash}` : "未配置")}</strong><small>{props.row.plug_hashes.length ? `${props.row.plug_hashes.length} 个目标模组 / Plug` : "未指定模组"}</small></div>
      <em data-status={props.row.status_tone}>{props.row.status_label}</em>
    </article>
  );
}

function ApplicationLoadoutQuickActions(props: {
  planId: string;
  planName: string;
  summary: LocalLoadoutPlanWorkbenchModel["summary"];
  executionPlan: LocalLoadoutPlanExecutionPlan | null;
  wearEnabled: boolean;
  isExecuting: boolean;
  onEdit: () => void;
  onWear: () => void;
}) {
  const issueCount = (props.summary?.missing_count ?? 0) + (props.summary?.plug_unavailable_count ?? 0) + (props.summary?.needs_selection_count ?? 0);
  return (
    <div className="loadout-quick-actions">
      <div className="loadout-column-head"><div><strong>穿戴准备</strong><small>{props.planName}</small></div></div>
      <dl className="loadout-ledger">
        <div data-status="success"><dt>已绑定</dt><dd><b>{props.summary?.selected_count ?? 0}</b><small>真实装备实例</small></dd></div>
        <div data-status={issueCount ? "warning" : "success"}><dt>待处理</dt><dd><b>{issueCount}</b><small>需选择或补齐</small></dd></div>
        <div><dt>执行步骤</dt><dd><b>{props.executionPlan?.executable_steps.length ?? 0}</b><small>穿戴前重新生成</small></dd></div>
      </dl>
      <section className="loadout-summary-checks"><h3>安全边界</h3><ul><li data-status="success"><span>✓</span><span>穿戴前刷新账号并核对计划。</span></li><li data-status="success"><span>✓</span><span>步骤失败后停止后续写入。</span></li><li data-status="success"><span>✓</span><span>穿戴验证后才允许保存到游戏内槽位。</span></li></ul></section>
      <div className="loadout-sticky-primary-actions"><button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onEdit}>编辑方案</button><button id={`loadout-quick-wear-${props.planId}`} type="button" data-ui-kind="button" data-control-variant="primary" disabled={!props.wearEnabled || props.isExecuting} onClick={props.onWear}>穿戴此方案</button></div>
    </div>
  );
}

function ApplicationLoadoutCompare(props: {
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
    <section className="loadout-compare-page" aria-label="应用配装对比">
      <header className="loadout-subpage-head"><button ref={backRef} className="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onBack}>返回方案库</button><div><span className="loadout-eyebrow">应用配装</span><h2>方案对比</h2><p>{props.model.selection_message} · 共 {props.model.difference_count} 处差异。</p></div><label className="loadout-diff-toggle"><input type="checkbox" checked={props.model.showDiffOnly} onChange={(event) => props.onShowDiffOnlyChange(event.target.checked)} /><span>仅显示差异</span></label></header>
      <div className="loadout-compare-table" style={{ "--loadout-compare-count": Math.max(props.model.columns.length, 2) } as CSSProperties}>
        <div className="loadout-compare-table-head"><span>比较项</span>{props.model.columns.map((column) => <div key={column.id}><strong>{column.title}</strong><small>{column.subtitle}</small>{column.kind === "application" ? <footer><button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onRemove(column.plan.id)}>移出</button><button type="button" data-ui-kind="button" data-control-variant="primary" onClick={() => props.onSelect(column.plan.id)}>查看</button></footer> : <><em>游戏内只读参照 · 部分字段未知</em><footer><button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onRemoveInGameReference}>移出参照</button></footer></>}</div>)}</div>
        {props.model.visible_rows.map((row) => <div className="loadout-compare-table-row" data-changed={row.changed || undefined} key={row.key}><strong>{row.label}</strong>{row.cells.map((cell) => <span key={cell.column_id} data-state={cell.state}>{cell.value}</span>)}</div>)}
      </div>
      {!props.model.visible_rows.length ? <ProductWorkspaceEmptyState><h3>当前没有可显示的差异</h3><p>关闭“仅显示差异”可查看全部子职业、装备、属性模组和备注字段。</p></ProductWorkspaceEmptyState> : null}
    </section>
  );
}

function LocalPlanEditor(props: LoadoutsPageContentViewProps & {
  activeCharacter: AccountSummary["characters"][number] | null;
  editorScreen: "editor" | "armor" | "wear" | "picker" | "publish";
  pickerSlot?: string;
  onOpenArmor: () => void;
  onOpenWear: () => void;
  onOpenItemPicker: (slot: string) => void;
  onOpenPublish: () => void;
  onBack: () => void;
}) {
  const draft = props.localPlanDraft;
  const accountItems = useMemo(() => getLocalLoadoutPlanAccountItems(props.accountSummary), [props.accountSummary]);
  const matches = useMemo(() => draft && props.accountSummary
    ? matchLocalLoadoutPlan(draft, props.accountSummary).item_matches
    : [], [draft, props.accountSummary]);
  useEffect(() => {
    document.querySelector<HTMLElement>(`.loadout-subpage[data-screen="${props.editorScreen}"] .loadout-subpage-back`)?.focus();
  }, [props.editorScreen]);
  if (!draft) return null;
  const activeDraft = draft;

  function updateDraft(next: CreateLocalLoadoutPlanInput, resetArmor = true) {
    if (resetArmor) props.actions.resetArmorPlanner?.();
    props.actions.localPlanDraftChange(next);
  }

  const armorConstraints = activeDraft.armor_constraints ?? emptyArmorConstraints();

  function updateArmorConstraints(next: LoadoutPlanArmorConstraints) {
    const { armor_plan: _armorPlan, ...draftWithoutArmorPlan } = activeDraft;
    updateDraft({ ...draftWithoutArmorPlan, armor_constraints: next });
  }

  function updateDraftClearingArmorPlan(next: CreateLocalLoadoutPlanInput) {
    const { armor_plan: _armorPlan, ...draftWithoutArmorPlan } = next;
    updateDraft(draftWithoutArmorPlan);
  }

  function updateTarget(index: number, nextTarget: CreateLocalLoadoutPlanInput["item_targets"][number]) {
    updateDraftClearingArmorPlan({
      ...activeDraft,
      item_targets: activeDraft.item_targets.map((target, targetIndex) => targetIndex === index ? nextTarget : target)
    });
  }

  function calculateArmorCandidates() {
    const armorClass = resolveArmorClass(activeDraft.class_name);
    const plannerMode = armorConstraints.planner_mode ?? "owned";
    if (armorClass === "unknown" || !props.actions.planArmor) return;
    if (plannerMode !== "theoretical" && !props.accountSummary) return;
    const slotEnergyPlan = buildArmorSlotEnergyPlan(activeDraft, accountItems);
    const sharedRequest = {
      class: armorClass,
      target: buildArmorPlannerTarget(armorConstraints),
      fragment_adjustments: armorConstraints.fragment_stat_bonuses,
      armor_mod_budget: {
        plus5: armorConstraints.five_point_mod_budget,
        plus10: armorConstraints.ten_point_mod_budget,
        usage: "exact" as const
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
        slot: armorSlotLabel(piece.slot),
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
          instance_id: piece.instanceId,
          tuning_plug_hash: piece.tuning?.plugHash,
          armor_stat_mod_plug_hash: piece.armorStatModSocketPlugHash,
          armor_stat_mod_value: piece.armorStatMod?.value,
          energy_capacity: piece.energy.capacity,
          reserved_energy: piece.energy.reserved,
          final_energy: piece.energy.final
        }))
      }
    }, false);
  }

  const armorClass = resolveArmorClass(activeDraft.class_name);
  const armorItems = accountItems.filter((item) => item.group_key === "armor" && item.instance_id);
  const plannerMode = armorConstraints.planner_mode ?? "owned";
  const armorSlotEnergyPlan = buildArmorSlotEnergyPlan(activeDraft, accountItems);
  const armorPlannerState = props.armorPlannerState;
  const armorViewModel = armorPlannerState?.status === "ready" || armorPlannerState?.status === "stale"
    ? armorPlannerState.viewModel
    : null;
  const armorCandidates = armorViewModel?.candidates ?? [];
  const armorModTotal = armorConstraints.five_point_mod_budget + armorConstraints.ten_point_mod_budget;
  const armorModPreflight = buildArmorModPreflight(armorItems, armorConstraints, armorSlotEnergyPlan.plugHashes);
  const armorStatusMessage = getArmorPlannerStatusMessage({
    state: armorPlannerState,
    hasAccount: Boolean(props.accountSummary),
    hasClient: Boolean(props.actions.planArmor),
    armorClass,
    mode: plannerMode
  });

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
    updateDraftClearingArmorPlan({
      ...activeDraft,
      item_targets: existingIndex >= 0
        ? activeDraft.item_targets.map((target, index) => index === existingIndex ? nextTarget : target)
        : [...activeDraft.item_targets, nextTarget]
    });
    props.onBack();
  }

  if (props.editorScreen === "picker" && props.pickerSlot) {
    const slot = props.pickerSlot;
    const candidates = accountItems.filter((item) => standardSlotKey(item.bucket_name ?? "") === slot);
    return (
      <>
        <header className="loadout-subpage-head"><button className="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onBack}>返回配装编辑器</button><div><span className="loadout-eyebrow">选择真实实例</span><h2>{slot}</h2><p>只显示当前账号中与此槽位类型一致的装备；选择后返回原槽位并恢复焦点。</p></div></header>
        <section className="loadout-item-picker-page" aria-label={`${slot}装备选择`}>
          {candidates.map((item) => <button type="button" key={item.instance_id} className="loadout-item-picker-row" data-surface="object-card" data-ui-kind="object-card" onClick={() => item.instance_id && selectItemForStandardSlot(slot, item.instance_id)}><ItemVisual icon={item.icon} label={item.name} bucketName={item.bucket_name} /><span><strong>{item.name}</strong><small>{item.bucket_name || item.item_type || item.group_key}</small><small>{item.socket_plugs.length} 个当前 Plug · 实例尾号 {item.instance_id?.slice(-4)}</small></span><em>选择</em></button>)}
          {!candidates.length ? <ProductWorkspaceEmptyState><h3>当前账号没有可选装备</h3><p>账号刷新后仍为空时，可先返回并保存不完整方案。</p></ProductWorkspaceEmptyState> : null}
        </section>
      </>
    );
  }

  if (props.editorScreen === "armor") {
    return (
      <>
        <header className="loadout-subpage-head">
          <button className="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onBack}>返回配装编辑器</button>
          <div><span className="loadout-eyebrow">{draft.name || "未命名应用配装"}</span><h2>按属性目标自动配甲</h2><p>属性模组数量是精确约束；计算器只负责分配到可用的具体护甲部位。</p></div>
        </header>
        <section className="loadout-armor-workbench loadout-armor-planner-page" aria-label="按属性目标自动配甲">
          <header><div><strong>目标与候选范围</strong><small>分别核对理论上限、当前库存、待刷身份或现有配装升级路径。</small></div><button type="button" data-ui-kind="button" data-control-variant="primary" onClick={calculateArmorCandidates} disabled={(plannerMode !== "theoretical" && !props.accountSummary) || !props.actions.planArmor || armorClass === "unknown" || armorPlannerState?.status === "loading" || armorModTotal > 5}>{armorPlannerState?.status === "loading" ? "计算中" : armorPlannerActionLabel(plannerMode)}</button></header>
          <ArmorPlannerModeControl mode={plannerMode} onChange={(mode) => updateArmorConstraints({ ...armorConstraints, planner_mode: mode })} />
          <div id="loadout-armor-planner-panel" role="tabpanel" aria-labelledby={`loadout-armor-mode-${plannerMode}`}>
            <div className="loadout-armor-constraint-grid">
              {loadoutPlanArmorStatKeys.map((stat) => <label key={stat}><span>{armorStatLabel(stat)}最低值</span><input type="number" min="0" step="5" value={armorConstraints.stat_minimums[stat] ?? 0} onChange={(event) => updateArmorConstraints({ ...armorConstraints, stat_minimums: { ...armorConstraints.stat_minimums, [stat]: Math.max(Number(event.target.value) || 0, 0) } })} /></label>)}
            </div>
            <ArmorStatModPlanEditor plus5={armorConstraints.five_point_mod_budget} plus10={armorConstraints.ten_point_mod_budget} preflight={armorModPreflight} onChange={(plus5, plus10) => updateArmorConstraints({ ...armorConstraints, five_point_mod_budget: plus5, ten_point_mod_budget: plus10 })} />
            <div className="loadout-armor-priority" role="group" aria-label="护甲属性优先级">{loadoutPlanArmorStatKeys.map((stat) => { const selected = armorConstraints.priority_stats.includes(stat); return <label key={stat}><input type="checkbox" checked={selected} onChange={(event) => updateArmorConstraints({ ...armorConstraints, priority_stats: event.target.checked ? [...armorConstraints.priority_stats, stat] : armorConstraints.priority_stats.filter((item) => item !== stat) })} /><span>{armorStatLabel(stat)}优先</span></label>; })}</div>
            <ArmorSetConstraintEditor constraint={armorConstraints.set_constraint ?? { mode: "none" }} catalog={props.armorSetCatalog ?? []} catalogStatus={props.armorSetCatalogStatus ?? "loading"} onChange={(setConstraint) => updateArmorConstraints({ ...armorConstraints, set_constraint: setConstraint })} />
            {plannerMode !== "theoretical" ? <ArmorInventoryConstraintEditor mode={plannerMode} constraints={armorConstraints} armorItems={armorItems} onChange={updateArmorConstraints} /> : null}
            {armorStatusMessage ? <p className="loadout-callout" data-ui-kind="callout" data-status={armorPlannerState?.status === "error" ? "error" : armorPlannerState?.status === "ready" && armorViewModel?.outcome === "reachable" ? "success" : "warning"}>{armorStatusMessage}</p> : null}
            {props.armorTargetFeedback ? <p className="loadout-callout" data-ui-kind="callout" data-status={props.armorTargetFeedback.includes("失败") ? "error" : "success"}>{props.armorTargetFeedback}</p> : null}
            {armorCandidates.length ? <ArmorCandidateList candidates={armorCandidates} stale={armorPlannerState?.status === "stale"} onSelect={selectArmorCandidate} onSaveAcquisitionTargets={props.actions.saveArmorAcquisitionTargets ? (candidate) => props.actions.saveArmorAcquisitionTargets?.(candidate, armorClass) : undefined} isSavingAcquisitionTargets={Boolean(props.isSavingArmorTargets)} /> : null}
          </div>
        </section>
      </>
    );
  }

  if (props.editorScreen === "wear") {
    return (
      <>
        <header className="loadout-subpage-head">
          <button className="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onBack}>返回配装编辑器</button>
          <div><span className="loadout-eyebrow">{draft.name || "未命名应用配装"}</span><h2>穿戴核对</h2><p>执行前会刷新权威账号数据并重新生成不可变计划；任一步骤失败后停止。</p></div>
        </header>
        <LocalPlanExecutionPanel {...props} showPublish={false} />
        {props.localPlanExecutionReport?.refresh_verified ? <div className="loadout-editor-sticky-actions"><span>穿戴后账号刷新核对通过，可以选择写入一个 Bungie 官方槽位。</span><div><button id="loadout-open-publish" type="button" data-ui-kind="button" data-control-variant="primary" onClick={props.onOpenPublish}>保存到游戏内槽位</button></div></div> : null}
      </>
    );
  }

  if (props.editorScreen === "publish") {
    return (
      <>
        <header className="loadout-subpage-head"><button className="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onBack}>返回穿戴核对</button><div><span className="loadout-eyebrow">{draft.name || "未命名应用配装"}</span><h2>保存到游戏内槽位</h2><p>应用配装已成功穿戴并刷新核对；选择官方槽位后才会执行 Bungie 写入。</p></div></header>
        <LocalPlanExecutionPanel {...props} showPublish />
      </>
    );
  }

  const otherTargets = draft.item_targets.map((target, index) => ({ target, index })).filter(({ target }) => !standardSlotKey(target.slot));

  return (
    <>
      <header className="loadout-subpage-head loadout-editor-head">
        <button className="loadout-subpage-back" type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onBack}>返回方案库</button>
        <div><span className="loadout-eyebrow">应用配装编辑器 · {draft.class_name || "未限定职业"}</span><h2>{draft.name || "未命名方案"}</h2><p>{props.localPlanEditingId ? "正在编辑已保存的应用配装" : "新应用配装尚未保存"}</p></div>
        <div className="loadout-action-stack">
          <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={props.localPlanIsSaving || !draft.name.trim() || !draft.class_name.trim()} onClick={props.actions.saveLocalPlan}>{props.localPlanIsSaving ? "保存中" : "保存应用配装"}</button>
        </div>
      </header>
      <div className="loadout-local-state-strip" data-status={props.localPlanIsSaving ? "pending" : props.localPlanIsDirty ? "warning" : "neutral"}>
        <strong>{props.localPlanIsSaving ? "正在保存应用配装" : props.localPlanIsDirty ? props.localPlanEditingId ? "修改尚未保存" : "当前应用配装尚未保存" : "所有修改已保存"}</strong>
        <span>保存只更新应用内方案，不会自动穿戴，也不会写入游戏内配装槽位。</span>
      </div>
      {draft.guidance?.warnings.length ? <section className="loadout-guide-review" data-ui-kind="callout" data-status="warning" aria-label="攻略解析待确认"><strong>攻略解析待确认</strong><ul>{draft.guidance.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></section> : null}
      <section className="loadout-local-editor-section" aria-label="基础信息">
        <header className="loadout-local-section-head"><div><strong>方案信息</strong><small>名称、目标职业和应用内保存边界</small></div></header>
        <div className="loadout-local-toolbar">
          <label><span>方案名称</span><input value={draft.name} onChange={(event) => updateDraft({ ...draft, name: event.target.value })} aria-label="配装名称" /></label>
          <label><span>目标职业</span><input value={draft.class_name} onChange={(event) => updateDraftClearingArmorPlan({ ...draft, class_name: event.target.value })} aria-label="目标职业" /></label>
        </div>
      </section>
      <section className="loadout-slot-editor-section" aria-label="子职业">
        <header className="loadout-local-section-head"><div><strong>子职业</strong><small>子职业、技能、星相和碎片保持为同一构筑槽位</small></div></header>
        <article className="loadout-subclass-slot" data-surface="object-card" data-ui-kind="object-card" data-status={draft.subclass_target?.subclass_hash ? "success" : "neutral"}><span className="loadout-slot-index">S</span><div><strong>{draft.subclass_target?.subclass_hash ? `子职业定义 ${draft.subclass_target.subclass_hash}` : "尚未配置子职业"}</strong><small>{draft.subclass_target ? `${draft.subclass_target.ability_hashes.length} 技能 · ${draft.subclass_target.aspect_hashes.length} 星相 · ${draft.subclass_target.fragment_hashes.length} 碎片` : "从当前装备创建时会保留可读取的配置"}</small></div></article>
      </section>
      <StandardSlotEditorGroup title="武器" description="动能、能量和威能三个固定槽位" group="weapon" draft={draft} matches={matches} onOpenSlot={props.onOpenItemPicker} onUpdate={updateTarget} onRemove={(index) => updateDraftClearingArmorPlan({ ...draft, item_targets: draft.item_targets.filter((_, targetIndex) => targetIndex !== index) })} />
      <StandardSlotEditorGroup title="护甲与模组" description="头、手、胸、腿和职业物品；每件保留自己的模组配置" group="armor" draft={draft} matches={matches} onOpenSlot={props.onOpenItemPicker} onUpdate={updateTarget} onRemove={(index) => updateDraftClearingArmorPlan({ ...draft, item_targets: draft.item_targets.filter((_, targetIndex) => targetIndex !== index) })} action={<button id="loadout-open-armor-planner" type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onOpenArmor}>按属性目标自动配甲</button>} />
      {otherTargets.length ? <EditorTargetGroup title="其他装备目标" description="无法归入标准武器或护甲槽位的真实目标" targets={otherTargets} matches={matches} draft={draft} onUpdate={updateTarget} onRemove={(index) => updateDraftClearingArmorPlan({ ...draft, item_targets: draft.item_targets.filter((_, targetIndex) => targetIndex !== index) })} /> : null}
      <div className="loadout-editor-sticky-actions"><span>{draft.item_targets.length} 个装备目标 · {armorConstraints.five_point_mod_budget} 个 +5 / {armorConstraints.ten_point_mod_budget} 个 +10 属性模组</span><div><button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.localPlanIsSaving || !draft.name.trim() || !draft.class_name.trim()} onClick={props.actions.saveLocalPlan}>{props.localPlanIsSaving ? "保存中" : "保存应用配装"}</button><button id="loadout-open-wear-review" type="button" data-ui-kind="button" data-control-variant="primary" disabled={!props.localPlanEditingId} onClick={props.onOpenWear}>{props.localPlanEditingId ? "进入穿戴核对" : "保存后穿戴"}</button></div></div>
    </>
  );
}

function EditorTargetGroup(props: {
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
      <header className="loadout-local-section-head"><div><strong>{props.title}</strong><small>{props.description}</small></div><div className="loadout-section-head-actions"><span>{props.targets.length} 项</span>{props.action}</div></header>
      <ul className="loadout-item-list loadout-slot-editor-grid" data-surface="list">
        {props.targets.map(({ target, index }) => <LocalPlanItemRow key={`${target.slot}-${target.selected_instance_id ?? target.item_hash ?? index}-${index}`} index={index} target={target} match={props.matches[index] ?? null} onChange={props.onUpdate} onRemove={() => props.onRemove(index)} />)}
      </ul>
      {!props.targets.length ? <div className="loadout-slot-group-empty"><strong>尚未配置{props.title}</strong><span>从下方账号装备选择真实实例后，会按槽位加入这里。</span></div> : null}
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
  return (
    <section className="loadout-slot-editor-section" aria-label={props.title}>
      <header className="loadout-local-section-head"><div><strong>{props.title}</strong><small>{props.description}</small></div><div className="loadout-section-head-actions"><span>{slots.length} 个固定槽位</span>{props.action}</div></header>
      <ul className="loadout-item-list loadout-slot-editor-grid" data-surface="list">
        {slots.map((slot) => {
          const index = props.draft.item_targets.findIndex((target) => standardSlotKey(target.slot) === slot.key);
          const target = index >= 0 ? props.draft.item_targets[index] : null;
          if (target) return <LocalPlanItemRow id={`loadout-slot-${standardSlotDomId(slot.key)}`} key={slot.key} index={index} target={target} match={props.matches[index] ?? null} onChange={props.onUpdate} onRemove={() => props.onRemove(index)} onOpenPicker={() => props.onOpenSlot(slot.key)} />;
          return <li className="loadout-empty-standard-slot" key={slot.key}><button id={`loadout-slot-${standardSlotDomId(slot.key)}`} type="button" onClick={() => props.onOpenSlot(slot.key)}><span className="loadout-slot-index">+</span><span><strong>{slot.key}</strong><small>选择账号内真实装备</small></span></button></li>;
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

function ArmorPlannerModeControl(props: {
  mode: ArmorPlannerMode;
  onChange: (mode: ArmorPlannerMode) => void;
}) {
  const options: Array<{ mode: ArmorPlannerMode; label: string; description: string }> = [
    { mode: "owned", label: "库存成装", description: "从当前账号实例中找可直接使用的组合" },
    { mode: "theoretical", label: "理论上限", description: "只按 Armor 3.0 规则判断目标是否成立" },
    { mode: "acquisition", label: "待刷目标", description: "把理论组合拆成已有、待升级和待获取身份" },
    { mode: "upgrade", label: "升级路径", description: "从当前五件基线计算最少替换方案" }
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
    <div className="loadout-armor-mode-control" data-ui-kind="segmented-control" role="tablist" aria-label="护甲规划模式">
      {options.map((option, index) => <button type="button" id={`loadout-armor-mode-${option.mode}`} key={option.mode} role="tab" aria-controls="loadout-armor-planner-panel" aria-selected={props.mode === option.mode} tabIndex={props.mode === option.mode ? 0 : -1} onClick={() => props.onChange(option.mode)} onKeyDown={(event) => handleModeKeyDown(event, index)}><strong>{option.label}</strong><small>{option.description}</small></button>)}
    </div>
  );
}

type ArmorModPreflightView = {
  status: "ready" | "warning" | "unknown";
  summary: string;
  details: string[];
};

function ArmorStatModPlanEditor(props: {
  plus5: number;
  plus10: number;
  preflight: ArmorModPreflightView;
  onChange: (plus5: number, plus10: number) => void;
}) {
  const plus5 = clampArmorModCount(props.plus5, 5);
  const plus10 = clampArmorModCount(props.plus10, 5 - plus5);
  const total = plus5 + plus10;
  const totalBonus = plus5 * 5 + plus10 * 10;

  function setCount(kind: "plus5" | "plus10", value: number) {
    if (kind === "plus5") {
      props.onChange(clampArmorModCount(value, 5 - plus10), plus10);
      return;
    }
    props.onChange(plus5, clampArmorModCount(value, 5 - plus5));
  }

  return (
    <section className="loadout-armor-mod-plan" aria-label="属性模组精确数量">
      <div className="loadout-armor-constraint-head">
        <div><strong>属性模组数量</strong><small>数量是必须完整安装的精确约束；计算器决定具体部位和增加的属性。</small></div>
        <span aria-live="polite">已规划 {total}/5 · 总加成 +{totalBonus}</span>
      </div>
      <div className="loadout-armor-mod-steppers">
        <ArmorModCountStepper label="+5 属性模组" value={plus5} maximum={5 - plus10} onChange={(value) => setCount("plus5", value)} />
        <ArmorModCountStepper label="+10 属性模组" value={plus10} maximum={5 - plus5} onChange={(value) => setCount("plus10", value)} />
      </div>
      <p className="loadout-armor-tuning-note">T5 护甲调整由计算器逐件自动选择，不消耗能量，也不计入属性模组数量。</p>
      <div className="loadout-armor-mod-preflight" data-status={props.preflight.status === "ready" ? "success" : props.preflight.status === "warning" ? "warning" : "neutral"}>
        <strong>{props.preflight.summary}</strong>
        {props.preflight.details.length ? <ul>{props.preflight.details.map((detail) => <li key={detail}>{detail}</li>)}</ul> : null}
      </div>
    </section>
  );
}

function ArmorModCountStepper(props: {
  label: string;
  value: number;
  maximum: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="loadout-armor-mod-stepper">
      <span>{props.label}</span>
      <div role="group" aria-label={`${props.label}数量`}>
        <button type="button" data-ui-kind="button" data-control-variant="secondary" aria-label={`减少${props.label}`} disabled={props.value <= 0} onClick={() => props.onChange(props.value - 1)}>−</button>
        <input type="number" min="0" max={props.maximum} value={props.value} aria-label={`${props.label}数量`} onChange={(event) => props.onChange(Number(event.target.value) || 0)} />
        <button type="button" data-ui-kind="button" data-control-variant="secondary" aria-label={`增加${props.label}`} disabled={props.value >= props.maximum} onClick={() => props.onChange(props.value + 1)}>+</button>
      </div>
    </div>
  );
}

function ArmorSetConstraintEditor(props: {
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
  return (
    <div className="loadout-armor-constraint-section">
      <div className="loadout-armor-constraint-head"><div><strong>套装约束</strong><small>套装目录来自当前已激活 Manifest，只列出成员完整且有明确 2 件或 4 件奖励的集合。</small></div><span>{props.catalogStatus === "ready" ? `${eligibleSetCount} 个可规划套装` : props.catalogStatus === "error" ? "目录读取失败" : "目录读取中"}</span></div>
      <div className="loadout-armor-set-fields">
        <label><span>组合方式</span><select value={mode} disabled={unavailable} onChange={(event) => changeMode(event.target.value)}><option value="none">不限制套装</option><option value="single-2" disabled={!twoPieceSets.length}>指定 2 件套</option><option value="single-4" disabled={!fourPieceSets.length}>指定 4 件套</option><option value="split-2-2" disabled={twoPieceSets.length < 2}>两个 2 件套</option></select></label>
        {singleConstraint ? <label><span>目标套装</span><select value={singleConstraint.set_hash} onChange={(event) => props.onChange({ ...singleConstraint, set_hash: Number(event.target.value) })}>{singleCatalog.map((item) => <option key={item.hash} value={item.hash}>{item.name}</option>)}</select></label> : null}
        {splitConstraint ? <><label><span>第一套装</span><select value={splitConstraint.first_set_hash} onChange={(event) => props.onChange({ ...splitConstraint, first_set_hash: Number(event.target.value) })}>{twoPieceSets.map((item) => <option key={item.hash} value={item.hash}>{item.name}</option>)}</select></label><label><span>第二套装</span><select value={splitConstraint.second_set_hash} onChange={(event) => props.onChange({ ...splitConstraint, second_set_hash: Number(event.target.value) })}>{twoPieceSets.map((item) => <option key={item.hash} value={item.hash} disabled={item.hash === splitConstraint.first_set_hash}>{item.name}</option>)}</select></label></> : null}
      </div>
    </div>
  );
}

function ArmorInventoryConstraintEditor(props: {
  mode: ArmorPlannerMode;
  constraints: LoadoutPlanArmorConstraints;
  armorItems: AccountItemSummary[];
  onChange: (constraints: LoadoutPlanArmorConstraints) => void;
}) {
  const locations: Array<{ key: LoadoutPlanArmorConstraints["allowed_locations"][number]; label: string }> = [
    { key: "equipped", label: "已装备" },
    { key: "inventory", label: "角色背包" },
    { key: "vault", label: "仓库" },
    { key: "postmaster", label: "邮政官" }
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
      <div className="loadout-armor-constraint-head"><div><strong>{props.mode === "acquisition" ? "已有装备核对范围" : props.mode === "upgrade" ? "升级基线与候选范围" : "库存约束"}</strong><small>{props.mode === "acquisition" ? "位置范围只影响已有同身份与近似装备的核对。" : props.mode === "upgrade" ? "优先使用方案已绑定的五件护甲，否则使用目标角色当前装备作为基线。" : "固定、排除和位置范围都作用于当前账号真实实例。"}</small></div></div>
      <div className="loadout-armor-location-list" role="group" aria-label="允许的护甲位置">{locations.map((location) => { const checked = props.constraints.allowed_locations.includes(location.key); return <label key={location.key}><input type="checkbox" checked={checked} disabled={checked && props.constraints.allowed_locations.length === 1} onChange={(event) => props.onChange({ ...props.constraints, allowed_locations: event.target.checked ? uniqueValues([...props.constraints.allowed_locations, location.key]) : props.constraints.allowed_locations.filter((item) => item !== location.key) })} /><span>{location.label}</span></label>; })}</div>
      {props.mode !== "acquisition" ? <div className="loadout-armor-inventory-fields">
        <label><span>固定异域护甲</span><select value={props.constraints.exotic_instance_id ?? ""} onChange={(event) => { const item = props.armorItems.find((candidate) => candidate.instance_id === event.target.value); props.onChange({ ...props.constraints, exotic_instance_id: item?.instance_id, exotic_item_hash: item?.hash, locked_instance_ids: item?.instance_id ? lockedIds.filter((id) => id !== item.instance_id) : lockedIds, excluded_instance_ids: item?.instance_id ? excludedIds.filter((id) => id !== item.instance_id) : excludedIds }); }}><option value="">不固定异域</option>{exoticItems.map((item) => <option key={item.instance_id} value={item.instance_id}>{armorItemOptionLabel(item)}</option>)}</select></label>
        <label><span>锁定实例</span><select value="" onChange={(event) => addLocked(event.target.value)}><option value="">添加固定实例</option>{props.armorItems.filter((item) => item.instance_id !== props.constraints.exotic_instance_id && !lockedIds.includes(item.instance_id!) && !excludedIds.includes(item.instance_id!)).map((item) => <option key={item.instance_id} value={item.instance_id}>{armorItemOptionLabel(item)}</option>)}</select></label>
        <label><span>排除实例</span><select value="" onChange={(event) => addExcluded(event.target.value)}><option value="">添加排除实例</option>{props.armorItems.filter((item) => item.instance_id !== props.constraints.exotic_instance_id && !lockedIds.includes(item.instance_id!) && !excludedIds.includes(item.instance_id!)).map((item) => <option key={item.instance_id} value={item.instance_id}>{armorItemOptionLabel(item)}</option>)}</select></label>
      </div> : null}
      {props.mode !== "acquisition" && (lockedIds.length || excludedIds.length) ? <div className="loadout-armor-instance-rules">
        {lockedIds.map((instanceId) => <span key={`locked-${instanceId}`} data-status="success">固定：{armorInstanceLabel(instanceId, props.armorItems)}<button type="button" aria-label={`取消固定 ${armorInstanceLabel(instanceId, props.armorItems)}`} onClick={() => props.onChange({ ...props.constraints, locked_instance_ids: lockedIds.filter((id) => id !== instanceId) })}>×</button></span>)}
        {excludedIds.map((instanceId) => <span key={`excluded-${instanceId}`} data-status="warning">排除：{armorInstanceLabel(instanceId, props.armorItems)}<button type="button" aria-label={`取消排除 ${armorInstanceLabel(instanceId, props.armorItems)}`} onClick={() => props.onChange({ ...props.constraints, excluded_instance_ids: excludedIds.filter((id) => id !== instanceId) })}>×</button></span>)}
      </div> : null}
    </div>
  );
}

function ArmorCandidateList(props: {
  candidates: ArmorPlannerCandidateView[];
  stale: boolean;
  onSelect: (candidate: Extract<ArmorPlannerCandidateView, { kind: "owned" | "upgrade" }>) => void;
  onSaveAcquisitionTargets?: (candidate: Extract<ArmorPlannerCandidateView, { kind: "acquisition" }>) => void;
  isSavingAcquisitionTargets: boolean;
}) {
  return (
    <div className="loadout-armor-candidate-list">
      {props.candidates.map((candidate, index) => {
        const selectable = candidate.kind === "owned" || candidate.kind === "upgrade";
        return (
          <article key={candidate.summary.candidateId} className="loadout-armor-candidate" data-status={candidate.summary.hardConstraintsMet ? "success" : "warning"}>
            <header><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{armorCandidateTitle(candidate)}</strong><small>{armorCandidateSummary(candidate)}</small></div><em>{candidate.summary.hardConstraintsMet ? "满足硬约束" : `总缺口 ${candidate.summary.totalGap}`}</em></header>
            <dl className="loadout-armor-stat-comparison">{candidate.summary.stats.map((stat) => <div key={stat.key} data-status={stat.meetsTarget ? "success" : "warning"}><dt>{armorStatLabel(stat.key)}</dt><dd><strong>{stat.value}</strong><small>{stat.minimum === undefined ? "未设下限" : stat.shortfall ? `差 ${stat.shortfall}` : `目标 ≥ ${stat.minimum}`}</small></dd></div>)}</dl>
            <div className="loadout-armor-piece-list">{armorCandidatePieceRows(candidate).map((piece) => <div key={piece.key}><span>{piece.slot}</span><strong>{piece.name}</strong><small>{piece.detail}</small></div>)}</div>
            <footer><span>+5 属性模组 × {candidate.summary.armorModUsage.plus5}，+10 属性模组 × {candidate.summary.armorModUsage.plus10} · 浪费 {candidate.summary.statWaste}</span><span>{armorSetCoverageLabel(candidate.summary.armorSetCoverage)}</span>{selectable ? <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.stale} onClick={() => props.onSelect(candidate)}>{props.stale ? "需要重新计算" : "使用此实例组合"}</button> : candidate.kind === "acquisition" && candidate.missingPieceCount > 0 && props.onSaveAcquisitionTargets ? <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.stale || props.isSavingAcquisitionTargets} onClick={() => props.onSaveAcquisitionTargets?.(candidate)}>{props.stale ? "需要重新计算" : props.isSavingAcquisitionTargets ? "正在保存目标" : `保存 ${candidate.missingPieceCount} 个待刷缺口`}</button> : null}</footer>
          </article>
        );
      })}
    </div>
  );
}

function LocalPlanItemRow(props: {
  id?: string;
  index: number;
  target: CreateLocalLoadoutPlanInput["item_targets"][number];
  match: LocalLoadoutPlanItemMatch | null;
  onChange: (index: number, target: CreateLocalLoadoutPlanInput["item_targets"][number]) => void;
  onRemove: () => void;
  onOpenPicker?: () => void;
}) {
  const candidates = props.match?.candidates.filter((candidate) => candidate.item.instance_id) ?? [];
  const status = props.match?.status === "selected"
    ? "已选实例"
    : props.match?.status === "available"
      ? "可选择实例"
      : props.match?.status === "needs-selection"
        ? "需要选择实例"
        : props.match?.status === "plug-unavailable"
          ? "目标 Plug 不可用"
          : props.match?.status === "missing"
            ? "账号内未找到"
            : "尚未配置";
  const tone = props.match?.status === "selected" ? "success" : props.match ? "warning" : "neutral";
  const selectedCandidate = candidates.find((candidate) => candidate.item.instance_id === props.target.selected_instance_id) ?? null;
  const representative = selectedCandidate ?? candidates[0] ?? null;
  const itemName = representative?.item.name ?? props.target.slot;
  const itemMeta = representative
    ? [representative.item.bucket_name || props.target.slot, representative.item.item_type].filter(Boolean).join(" · ")
    : props.target.item_hash ? `目标定义 ${props.target.item_hash}` : "尚未选择目标定义";
  const instanceLabel = representative?.item.instance_id
    ? `${representative.location.label} · 实例尾号 ${representative.item.instance_id.slice(-4)}`
    : candidates.length ? `${candidates.length} 个候选实例` : "当前账号没有可用实例";
  const plugLabel = props.target.plug_hashes.length ? `${props.target.plug_hashes.length} 个目标 Plug` : "未指定目标 Plug";
  return (
    <li id={props.id} className="loadout-item" data-status={tone}>
      <ItemVisual icon={representative?.item.icon} label={itemName} bucketName={representative?.item.bucket_name ?? props.target.slot} />
      <div className="loadout-item-copy"><strong>{itemName}</strong><small>{itemMeta}</small></div>
      <div className="loadout-item-match"><strong>{instanceLabel}</strong><small>{plugLabel}</small></div>
      <div className="loadout-item-actions"><span className="loadout-status-badge" data-status={tone}>{status}</span>{props.onOpenPicker ? <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onOpenPicker}>更换此槽位装备</button> : <select value={props.target.selected_instance_id ?? ""} onChange={(event) => props.onChange(props.index, { ...props.target, selected_instance_id: event.target.value || undefined })} aria-label={`选择${props.target.slot}实例`}><option value="">不绑定具体实例</option>{props.target.selected_instance_id && !candidates.some((candidate) => candidate.item.instance_id === props.target.selected_instance_id) ? <option value={props.target.selected_instance_id}>当前实例未定位</option> : null}{candidates.map((candidate) => <option key={candidate.item.instance_id} value={candidate.item.instance_id}>{candidate.item.name} · {candidate.location.label}</option>)}</select>}<button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onRemove}>清空槽位</button></div>
    </li>
  );
}

function DimImportPanel(props: LoadoutsPageContentViewProps & {
  activeCharacter: AccountSummary["characters"][number] | null;
  onCloseDimImport: () => void;
}) {
  const [url, setUrl] = useState("");
  const preview = props.dimPreview;
  return (
    <section className="loadout-capability-notice" data-status="neutral" aria-label="DIM 配装导入">
      <div>
        <strong>导入 DIM 配装</strong>
        <p>输入公开分享链接后先查看解析结果；确认后只会预填应用配装编辑器。</p>
        <label className="loadout-dim-url-field"><span>DIM 分享链接</span><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://dim.gg/..." /></label>
        {preview ? (
          <div className="loadout-dim-preview" data-surface="list">
            <strong>{preview.name}</strong>
            <small>{preview.class_name} · {preview.item_count} 个装备目标</small>
            <small>{preview.warnings.length ? preview.warnings.join(" ") : "已读取可确认的装备与配置。"}</small>
          </div>
        ) : null}
      </div>
      <div className="loadout-action-stack">
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onCloseDimImport}>取消</button>
        {preview ? <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!props.activeCharacter} onClick={() => { props.actions.acceptDimImport(props.activeCharacter); props.onCloseDimImport(); }}>使用此预览</button> : <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!url.trim() || props.localPlanIsPreviewingDim} onClick={() => props.actions.previewDimImport(url)}>{props.localPlanIsPreviewingDim ? "读取中" : "读取并预览"}</button>}
      </div>
    </section>
  );
}

function GuideImportPanel(props: LoadoutsPageContentViewProps & {
  activeCharacter: AccountSummary["characters"][number] | null;
  onCloseGuideImport: () => void;
}) {
  const assistantPrefill = props.localPlanAssistantPrefill;
  const equipmentArtifact = assistantPrefill?.kind === "equipment_target_candidates"
    ? assistantPrefill
    : null;
  const guideLoadoutArtifact = assistantPrefill?.kind === "loadout_candidates"
    ? assistantPrefill
    : null;
  const assistantRawText = assistantPrefill && "raw_text" in assistantPrefill
    ? assistantPrefill.raw_text
    : "";
  const [sourceInput, setSourceInput] = useState(assistantRawText || props.localPlanLegacyGuideText);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>(
    equipmentArtifact?.candidates.map((candidate) => candidate.candidate_id)
      ?? guideLoadoutArtifact?.candidates.filter((candidate) => candidate.selected_by_default).map((candidate) => candidate.candidate_id)
      ?? []
  );
  useEffect(() => {
    setSourceInput(assistantRawText || props.localPlanLegacyGuideText);
  }, [assistantPrefill?.request_id, props.localPlanLegacyGuideText]);
  useEffect(() => {
    setSelectedCandidateIds(
      equipmentArtifact?.candidates.map((candidate) => candidate.candidate_id)
        ?? guideLoadoutArtifact?.candidates.filter((candidate) => candidate.selected_by_default).map((candidate) => candidate.candidate_id)
        ?? []
    );
  }, [assistantPrefill?.request_id]);
  const restoredLegacyText = Boolean(props.localPlanLegacyGuideText && sourceInput === props.localPlanLegacyGuideText);
  if (guideLoadoutArtifact) {
    const matchedCount = guideLoadoutArtifact.candidates.filter((candidate) => candidate.relation === "matched").length;
    const alternativeCount = guideLoadoutArtifact.candidates.length - matchedCount;
    const canCreateDraft = Boolean(selectedCandidateIds.length || guideLoadoutArtifact.armor_constraint_draft);
    return (
      <section className="loadout-capability-notice loadout-assistant-target-review" data-status="neutral" aria-label="攻略配装候选审阅">
        <div className="loadout-assistant-target-content">
          <strong>审阅攻略配装候选</strong>
          <p>候选绑定生成时的账号和角色。确定命中默认选中；替代项只有在你明确勾选后才会进入未保存草稿。</p>
          <p data-status="neutral">目标角色：{guideLoadoutArtifact.account_scope.character_class} · 确定命中 {matchedCount} 项 · 替代候选 {alternativeCount} 项 · 缺口 {guideLoadoutArtifact.missing_requirements.length} 项</p>
          {guideLoadoutArtifact.candidates.length ? (
            <ul className="loadout-assistant-target-list" data-surface="list">
              {guideLoadoutArtifact.candidates.map((candidate) => {
                const checked = selectedCandidateIds.includes(candidate.candidate_id);
                return (
                  <li key={candidate.candidate_id} data-status={candidate.relation === "matched" ? "success" : "warning"}>
                    <label>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => setSelectedCandidateIds((current) => event.target.checked
                          ? [...current, candidate.candidate_id]
                          : current.filter((id) => id !== candidate.candidate_id))}
                      />
                      <span>
                        <strong>{candidate.item.name}</strong>
                        <small>{[
                          candidate.item.bucket_name || candidate.item.item_type || formatEquipmentGroup(candidate.item.group_key ?? "equipment"),
                          candidate.relation === "matched" ? "确定命中" : "替代候选",
                          candidate.item.reason
                        ].filter(Boolean).join(" · ")}</small>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : <p data-status="warning">当前没有账号装备候选；可以继续审阅已确认的 Armor 约束和攻略缺口。</p>}
          {guideLoadoutArtifact.missing_requirements.length ? <ul>{guideLoadoutArtifact.missing_requirements.map((item) => <li key={item}>{item}</li>)}</ul> : null}
        </div>
        <div className="loadout-action-stack">
          <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => { props.actions.dismissAssistantPrefill(); props.onCloseGuideImport(); }}>取消</button>
          <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!canCreateDraft} onClick={() => {
            if (props.actions.acceptGuideLoadoutCandidates(guideLoadoutArtifact, selectedCandidateIds)) {
              props.onCloseGuideImport();
            }
          }}>生成未保存草稿</button>
        </div>
      </section>
    );
  }
  if (equipmentArtifact) {
    const ownedCount = equipmentArtifact.candidates.filter((candidate) => candidate.status === "owned-instance").length;
    const definitionCount = equipmentArtifact.candidates.length - ownedCount;
    return (
      <section className="loadout-capability-notice loadout-assistant-target-review" data-status="neutral" aria-label="装备目标候选审阅">
        <div className="loadout-assistant-target-content">
          <strong>审阅 AI 装备目标</strong>
          <p>选择要带入草稿的候选。账号实例会直接绑定；仅定义目标只保留装备 Hash，仍需在账号中获得并选择真实实例。</p>
          <p data-status="neutral">目标角色：{props.activeCharacter?.class_name ?? "未选择"} · {ownedCount} 个账号实例 · {definitionCount} 个仅定义目标 · 已选 {selectedCandidateIds.length} 项</p>
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
                        candidate.bucket_name || candidate.item_type || formatEquipmentGroup(candidate.group_key),
                        candidate.status === "owned-instance" ? formatCandidateLocation(candidate) : "仅装备定义，待获取实例"
                      ].filter(Boolean).join(" · ")}</small>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="loadout-action-stack">
          <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => { props.actions.dismissAssistantPrefill(); props.onCloseGuideImport(); }}>取消</button>
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
            生成未保存草稿
          </button>
        </div>
      </section>
    );
  }
  return (
    <section className="loadout-capability-notice loadout-guide-intake" data-status="neutral" aria-label="从攻略生成方案">
      <div>
        <strong>{assistantPrefill?.kind === "armor_solution_comparison" ? "复核 AI 护甲方案" : "从攻略生成方案"}</strong>
        <p>{assistantPrefill?.kind === "armor_solution_comparison"
          ? "候选来自确定性 Armor 结果；这里只带入职业和六维目标，仍需重新核对模组预算、套装、位置范围和真实实例。"
          : `粘贴攻略链接或正文。系统会读取内容、识别装备要求并与当前${props.activeCharacter?.class_name ?? "角色"}账号装备核对。`}</p>
        {assistantRawText && sourceInput === assistantRawText ? <p data-status="neutral">已接收 AI 工作台成果；分析后仍需核对装备、属性和真实实例。</p> : null}
        {restoredLegacyText ? <p data-status="warning">已恢复旧任务入口保存的攻略文本；成功生成草稿后会自动清除旧副本。</p> : null}
        <label className="loadout-dim-url-field"><span>攻略链接或正文</span><textarea value={sourceInput} onChange={(event) => setSourceInput(event.target.value)} rows={6} placeholder="https://www.xiaoheihe.cn/app/bbs/link/...&#10;&#10;也可以直接粘贴攻略正文、视频文案或配装说明" /></label>
      </div>
      <div className="loadout-action-stack">
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => { if (assistantPrefill) props.actions.dismissAssistantPrefill(); props.onCloseGuideImport(); }}>取消</button>
        <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!sourceInput.trim() || !props.activeCharacter || props.localPlanIsImportingGuide} onClick={async () => { if (await props.actions.importGuideSource(sourceInput, props.activeCharacter)) props.onCloseGuideImport(); }}>{props.localPlanIsImportingGuide ? "分析中" : assistantPrefill?.kind === "armor_solution_comparison" ? "核对并生成草稿" : "分析并生成草稿"}</button>
      </div>
    </section>
  );
}

function formatEquipmentGroup(group: "weapons" | "armor" | "equipment" | "other"): string {
  if (group === "weapons") return "武器";
  if (group === "armor") return "护甲";
  return group === "equipment" ? "装备" : "其他";
}

function formatCandidateLocation(
  candidate: AssistantEquipmentTargetCandidatesArtifact["candidates"][number]
): string {
  if (!candidate.location) return "账号实例";
  if (candidate.location.kind === "equipped") return `已装备${candidate.location.character_name ? `于 ${candidate.location.character_name}` : ""}`;
  if (candidate.location.kind === "inventory") return `角色背包${candidate.location.character_name ? ` · ${candidate.location.character_name}` : ""}`;
  if (candidate.location.kind === "vault") return "仓库";
  return "邮政官";
}

function LocalPlanExecutionPanel(props: LoadoutsPageContentViewProps & {
  activeCharacter: AccountSummary["characters"][number] | null;
  showPublish?: boolean;
}) {
  const [publishSlotIndex, setPublishSlotIndex] = useState<number | null>(null);
  const plan = props.localPlanExecutionPlan;
  const report = props.localPlanExecutionReport;
  if (!plan) {
    return <section className="loadout-armor-workbench" aria-label="穿戴核对"><header><div><strong>穿戴核对</strong><small>请选择目标角色和真实实例后生成安全执行计划。</small></div></header><DimExportPanel result={props.localPlanDimExport} feedback={props.localPlanDimExportFeedback} onCopy={props.actions.copyDimLoadoutLink} /></section>;
  }
  return (
    <section className="loadout-armor-workbench" aria-label="穿戴核对">
      <header><div><strong>穿戴步骤</strong><small>计划 {formatExecutionPlanReference(plan.plan_id)}；确认后先刷新账号复核，计划未变化才会逐步执行。</small></div><button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!props.localPlanEditingId || !plan.executable_steps.length || props.localPlanIsExecuting} onClick={props.actions.executeLocalPlan}>{props.localPlanIsExecuting ? "正在穿戴" : props.localPlanEditingId ? "穿戴此方案" : "先保存应用配装"}</button></header>
      <DimExportPanel
        result={props.localPlanDimExport}
        feedback={props.localPlanDimExportFeedback}
        onCopy={props.actions.copyDimLoadoutLink}
      />
      {plan.executable_steps.length ? <ol className="loadout-plan-step-list">{plan.executable_steps.map((step, index) => <li key={step.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step.label}</strong></li>)}</ol> : <p className="loadout-callout" data-ui-kind="callout" data-status="warning">没有可执行步骤。</p>}
      {plan.gaps.length ? <p className="loadout-callout" data-ui-kind="callout" data-status="warning">未执行缺口：{plan.gaps.join("；")}</p> : null}
      {report ? <p className="loadout-callout" data-ui-kind="callout" data-status={report.refresh_verified && report.verification_logged !== false ? "success" : "warning"}>{formatExecutionReportMessage(report)}{report.execution_id ? <small title={report.execution_id}>执行 {formatTraceReference(report.execution_id)}{report.verification_status ? ` · 验证 ${formatVerificationStatus(report.verification_status)}` : ""}</small> : null}</p> : null}
      {report?.refresh_verified && props.showPublish !== false ? <LocalPlanPublishPanel accountSummary={props.accountSummary} targetCharacterId={plan.target_character_id} selectedSlotIndex={publishSlotIndex} onSelectSlot={setPublishSlotIndex} report={props.localPlanPublishReport} isPublishing={props.localPlanIsPublishing ?? false} onPublish={props.actions.publishLocalPlanToSlot} /> : null}
    </section>
  );
}

function DimExportPanel(props: {
  result: DimLoadoutExportResult | null;
  feedback: string;
  onCopy: () => void;
}) {
  if (!props.result) return null;
  const result = props.result;
  const description = result.status === "ready"
    ? `${result.item_count} 个装备目标已核对为当前账号真实实例。`
    : result.blockers.map((blocker) => blocker.message).join("；");
  return (
    <div className="loadout-dim-export" data-status={result.status === "ready" ? "success" : "warning"}>
      <div>
        <strong>{result.status === "ready" ? "DIM 链接可生成" : "DIM 导出已阻断"}</strong>
        <small>{description}</small>
        {result.status === "ready" && result.warnings.length ? <small data-status="warning">{result.warnings.join(" ")}</small> : null}
        {props.feedback ? <small data-status={props.feedback.includes("失败") ? "warning" : "success"}>{props.feedback}</small> : null}
      </div>
      <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={result.status !== "ready"} onClick={props.onCopy}>复制 DIM 链接</button>
    </div>
  );
}

function formatExecutionPlanReference(planId: string): string {
  return planId.startsWith("local-loadout-plan:")
    ? planId.slice("local-loadout-plan:".length)
    : planId;
}

function formatExecutionReportMessage(
  report: NonNullable<LoadoutsPageContentViewProps["localPlanExecutionReport"]>
): string {
  const logSuffix = report.verification_logged === false ? " 验证记录未写入操作日志。" : "";
  if (!report.preflight_verified) {
    return report.error ?? "执行前账号复核未通过，未执行任何写操作。";
  }
  if (report.refresh_verified) return `已完成 ${report.completed_steps.length} 步，刷新核对通过。${logSuffix}`;
  if (report.failed_step) return `已完成 ${report.completed_steps.length} 步；失败：${report.failed_step}。${logSuffix}`;
  return `已完成 ${report.completed_steps.length} 步，刷新核对未通过。${logSuffix}`;
}

function formatTraceReference(value: string): string {
  const suffix = value.split(":").at(-1) ?? value;
  return suffix.slice(0, 12);
}

function formatVerificationStatus(status: "verified" | "partial" | "mismatch" | "unavailable"): string {
  if (status === "verified") return "通过";
  if (status === "partial") return "部分完成";
  if (status === "unavailable") return "不可用";
  return "不一致";
}

function LocalPlanPublishPanel(props: {
  accountSummary: AccountSummary | null;
  targetCharacterId: string;
  selectedSlotIndex: number | null;
  onSelectSlot: (index: number) => void;
  report?: LoadoutsPageContentViewProps["localPlanPublishReport"];
  isPublishing: boolean;
  onPublish?: LoadoutsPageActions["publishLocalPlanToSlot"];
}) {
  const character = props.accountSummary?.characters.find((item) => item.character_id === props.targetCharacterId) ?? null;
  const selectedSlot = character?.loadout_slots.find((slot) => slot.index === props.selectedSlotIndex) ?? null;
  if (!character?.loadout_slots.length) return null;
  return (
    <div className="loadout-slot-picker">
      <strong>保存到游戏内槽位</strong>
      <small>方案已穿戴并经账号刷新核对。保存前会再次核对当前装备和目标槽位，变化时保持零写入。</small>
      <div className="loadout-slot-picker-list" data-surface="list">
        {character.loadout_slots.map((slot) => <button type="button" key={slot.index} aria-pressed={slot.index === props.selectedSlotIndex} onClick={() => props.onSelectSlot(slot.index)}><span>{String(slot.index + 1).padStart(2, "0")}</span><span><strong>{slot.name}</strong><small>{slot.item_count ? "覆盖已有槽位" : "空槽"}</small></span></button>)}
      </div>
      {props.report ? <p className="loadout-callout" data-ui-kind="callout" data-status={props.report.verification_status === "verified" && props.report.verification_logged !== false ? "success" : "warning"}>{formatPublishReportMessage(props.report)}<small title={props.report.execution_id}>保存 {formatTraceReference(props.report.execution_id)} · 计划 {formatTraceReference(props.report.plan.plan_id)}</small></p> : null}
      <footer><button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!selectedSlot || props.isPublishing || !props.onPublish} onClick={() => selectedSlot && props.onPublish?.(selectedSlot.index)}>{props.isPublishing ? "保存中" : selectedSlot?.item_count ? "确认覆盖并保存" : "保存到槽位"}</button></footer>
    </div>
  );
}

function formatPublishReportMessage(
  report: NonNullable<LoadoutsPageContentViewProps["localPlanPublishReport"]>
): string {
  if (!report.preflight_verified) return report.error ?? "保存前账号或槽位复核未通过，未执行写入。";
  if (report.verification_status === "verified") {
    return report.verification_logged === false
      ? "槽位保存后刷新核对通过，但验证记录未写入操作日志。"
      : "槽位已保存，刷新后的 Bungie 槽位实例核对通过。";
  }
  if (report.verification_status === "unavailable") return report.error ?? "槽位已写入，但刷新结果不足以完成精确核对。";
  return report.error ?? "槽位写入或刷新核对未通过。";
}

function LocalPlanSummary(props: LoadoutsPageContentViewProps) {
  const [sourceTraceMessage, setSourceTraceMessage] = useState("");
  const summary = props.localPlanDraft && props.accountSummary
    ? matchLocalLoadoutPlan(props.localPlanDraft, props.accountSummary)
    : null;
  const waitingCount = (summary?.available_count ?? 0) + (summary?.needs_selection_count ?? 0);
  const issueCount = (summary?.missing_count ?? 0) + (summary?.plug_unavailable_count ?? 0);
  const targetCharacter = props.accountSummary?.characters.find((character) => character.character_id === props.localPlanDraft?.target_character_id) ?? null;
  const armorPlanReference = props.localPlanDraft?.armor_plan;
  const armorPlanExpired = isExpiredTimestamp(armorPlanReference?.expires_at);
  const guideSourceId = props.localPlanDraft?.source.kind === "guide"
    ? props.localPlanDraft.source.source_id
    : undefined;
  return (
    <>
      <div className="loadout-column-head"><div><strong>方案摘要</strong><small>基于当前账号快照</small></div></div>
      <section className="loadout-local-summary-status" data-status={props.localPlanEditingId ? "neutral" : "warning"}>
        <span>当前状态</span>
        <strong>{props.localPlanEditingId ? "已保存应用配装编辑中" : "尚未保存到应用"}</strong>
        <p>{props.localPlanEditingId ? "再次保存后，当前修改才会更新应用配装。" : "保存应用配装后才能稳定生成并执行后续计划。"}</p>
      </section>
      <dl className="loadout-ledger">
        <div><dt>已选实例</dt><dd><b>{summary?.selected_count ?? 0}</b><small>已绑定真实账号实例</small></dd></div>
        <div data-status={waitingCount ? "warning" : "success"}><dt>等待选择</dt><dd><b>{waitingCount}</b><small>存在候选，但尚未绑定实例</small></dd></div>
        <div data-status={issueCount ? "warning" : "success"}><dt>缺失 / 待确认</dt><dd><b>{issueCount}</b><small>账号未找到或目标 Plug 不可用</small></dd></div>
      </dl>
      <section className="loadout-summary-checks" aria-label="执行边界">
        <h3>执行边界</h3>
        <ul>
          <li data-status={targetCharacter ? "success" : "warning"}><span aria-hidden="true">{targetCharacter ? "✓" : "!"}</span><span>{targetCharacter ? `目标角色为${targetCharacter.class_name}，账号快照可用。` : "目标角色尚未在当前账号快照中确认。"}</span></li>
          <li data-status={(summary?.selected_count ?? 0) ? "success" : "warning"}><span aria-hidden="true">{(summary?.selected_count ?? 0) ? "✓" : "!"}</span><span>{summary?.selected_count ?? 0} 个装备实例已绑定。</span></li>
          {armorPlanReference ? <li data-status={armorPlanExpired ? "warning" : "success"}><span aria-hidden="true">{armorPlanExpired ? "!" : "✓"}</span><span title={armorPlanReference.result_id}>护甲候选引用 {formatArmorResultReference(armorPlanReference.result_id)}，规则版本 {armorPlanReference.ruleset_version}{armorPlanExpired ? "；结果缓存已过期，重新计算后再调整候选。" : "。"}</span></li> : null}
          {waitingCount || issueCount ? <li data-status="warning"><span aria-hidden="true">!</span><span>{waitingCount + issueCount} 个目标仍需选择或确认。</span></li> : <li data-status="success"><span aria-hidden="true">✓</span><span>当前装备目标已完成账号核对。</span></li>}
        </ul>
      </section>
      {guideSourceId && props.actions.openGuideSource ? (
        <section className="loadout-source-trace" aria-label="方案来源追溯">
          <div><strong>方案来源</strong><small title={guideSourceId}>{props.localPlanDraft?.source.label ?? "攻略派生成果"}</small></div>
          <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => {
            setSourceTraceMessage("");
            void props.actions.openGuideSource?.(guideSourceId).then((opened) => {
              if (!opened) setSourceTraceMessage("没有找到仍可用的攻略派生关系。该方案本身仍可继续使用。");
            });
          }}>返回原攻略</button>
          {sourceTraceMessage ? <p data-status="warning">{sourceTraceMessage}</p> : null}
        </section>
      ) : null}
      <p className="loadout-guidance">应用内保存不会写入 Bungie。穿戴前会按真实实例生成计划；DIM 和攻略只会预填草稿，仍需显式保存。</p>
    </>
  );
}

function ArmorResultTraceNotice(props: LoadoutsPageContentViewProps) {
  const trace = props.armorResultTraceRequest;
  if (!trace) return null;
  return (
    <section className="loadout-capability-notice loadout-result-trace" data-ui-kind="callout" data-status="neutral" aria-label="自动配甲结果引用">
      <div>
        <strong>自动配甲结果引用</strong>
        <p title={trace.resultId}>结果 {formatArmorResultReference(trace.resultId)} · 候选 {trace.candidateId}</p>
        <small>完整求解结果不会持久化。请在相关应用配装中按当前账号和规则重新计算；这个引用用于核对目标来源，不会恢复过期结果。</small>
      </div>
      {props.actions.dismissArmorResultTrace ? <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.actions.dismissArmorResultTrace}>关闭</button> : null}
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

function LoadoutSummaryEmpty() {
  return <div className="loadout-summary-empty"><strong>等待选择</strong><span>选择一个配装后显示可核对的数据和可执行操作。</span></div>;
}

function ItemVisual(props: { icon?: string; label: string; bucketName?: string }) {
  return (
    <GameAssetImage
      className="loadout-item-visual"
      src={props.icon}
      alt=""
      loading="eager"
      fallback={<span className="loadout-item-visual loadout-item-placeholder" aria-hidden="true">{props.bucketName?.includes("武器") ? "W" : "A"}</span>}
    />
  );
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

function armorPlannerActionLabel(mode: ArmorPlannerMode): string {
  if (mode === "theoretical") return "计算理论上限";
  if (mode === "acquisition") return "生成待刷目标";
  if (mode === "upgrade") return "计算升级路径";
  return "计算库存候选";
}

function armorCandidateTitle(candidate: ArmorPlannerCandidateView): string {
  if (candidate.kind === "theoretical") return "理论属性组合";
  if (candidate.kind === "acquisition") return candidate.fulfillmentStatus === "owned"
    ? "理论身份已全部持有"
    : candidate.fulfillmentStatus === "upgrade-only"
      ? "只需升级现有护甲"
      : candidate.fulfillmentStatus === "verification-required"
        ? "需要核对现有护甲身份"
        : "包含待获取护甲身份";
  if (candidate.kind === "upgrade") return `替换 ${candidate.replacementCount} 件的升级方案`;
  return "当前库存实例组合";
}

function armorCandidateSummary(candidate: ArmorPlannerCandidateView): string {
  if (candidate.kind === "owned") {
    return `已装备 ${candidate.equippedCount} 件 · 需转移 ${candidate.transferCount} 件 · 相对目标角色替换 ${candidate.replacementCount} 件`;
  }
  if (candidate.kind === "theoretical") {
    return `${candidate.pieces.length} 个 Armor 3.0 理论身份，不代表账号已持有对应实例`;
  }
  if (candidate.kind === "acquisition") {
    return `待获取 ${candidate.missingPieceCount} 件 · 待升级 ${candidate.upgradePieceCount} 件 · 待核对 ${candidate.verificationPieceCount} 件`;
  }
  return `保留 ${candidate.retainedInstanceIds.length} 件 · ${candidate.steps.length} 个调整步骤`;
}

function armorCandidatePieceRows(candidate: ArmorPlannerCandidateView): Array<{
  key: string;
  slot: string;
  name: string;
  detail: string;
}> {
  if (candidate.kind === "theoretical") {
    return candidate.pieces.map((piece) => ({
      key: piece.configurationId,
      slot: armorSlotLabel(piece.slot),
      name: piece.name,
      detail: [
        piece.archetype.name,
        `${armorStatLabel(piece.archetype.tertiaryStat)}第三属性`,
        formatTheoreticalTuning(piece),
        formatArmorStatMod(piece.armorStatMod, piece.energy.armorStatMod),
        `能量 ${piece.energy.final}/${piece.energy.capacity}`,
        piece.set?.name
      ].filter(Boolean).join(" · ")
    }));
  }
  if (candidate.kind === "acquisition") {
    return candidate.pieces.map((piece) => ({
      key: `${piece.slot}-${piece.theoretical.configurationId}`,
      slot: armorSlotLabel(piece.slot),
      name: piece.identity.itemName ?? piece.identity.archetypeName,
      detail: piece.acquisitionRequired
        ? `需要获取 · ${armorStatLabel(piece.identity.tertiaryStat)}第三属性 · ${formatArmorStatMod(piece.theoretical.armorStatMod, piece.theoretical.energy.armorStatMod)} · 能量 ${piece.theoretical.energy.final}/${piece.theoretical.energy.capacity}${piece.identity.set ? ` · ${piece.identity.set.name}` : ""}`
        : `${piece.exactOwnedMatches.length} 件同身份已持有 · ${piece.nearestOwnedMatches.length} 件近似候选 · ${formatArmorStatMod(piece.theoretical.armorStatMod, piece.theoretical.energy.armorStatMod)}`
    }));
  }
  return candidate.pieces.map((piece) => ({
    key: piece.instanceId,
    slot: armorSlotLabel(piece.slot),
    name: piece.name,
    detail: [
      armorLocationLabel(piece.location),
      `实例尾号 ${piece.instanceId.slice(-4)}`,
      formatOwnedTuning(piece),
      formatArmorStatMod(piece.armorStatMod, piece.energy.armorStatMod),
      `其他模组 ${piece.energy.reserved} · 最终能量 ${piece.energy.final}/${piece.energy.capacity}`,
      piece.set?.name,
      candidate.kind === "upgrade" && candidate.retainedInstanceIds.includes(piece.instanceId) ? "保留" : ""
    ].filter(Boolean).join(" · ")
  }));
}

function formatTheoreticalTuning(
  piece: Extract<ArmorPlannerCandidateView, { kind: "theoretical" }>["pieces"][number]
): string {
  return piece.tuning.mode === "plus3"
    ? "+3 护甲调整，0 能量"
    : `${armorStatLabel(piece.tuning.fromStat)} −5 → ${armorStatLabel(piece.tuning.toStat)} +5 护甲调整，0 能量`;
}

function formatOwnedTuning(
  piece: Extract<ArmorPlannerCandidateView, { kind: "owned" }>["pieces"][number]
): string {
  if (!piece.tuning) return "保持当前护甲调整";
  return piece.tuning.mode === "plus3"
    ? "+3 护甲调整，0 能量"
    : `${piece.tuning.fromStat ? armorStatLabel(piece.tuning.fromStat) : "属性"} −5 → ${piece.tuning.toStat ? armorStatLabel(piece.tuning.toStat) : "属性"} +5 护甲调整，0 能量`;
}

function formatArmorStatMod(
  mod: { stat: (typeof loadoutPlanArmorStatKeys)[number]; value: 5 | 10 } | undefined,
  energyCost: number
): string {
  return mod
    ? `+${mod.value} ${armorStatLabel(mod.stat)}属性模组，${energyCost} 能量`
    : "不安装属性模组";
}

function armorSetCoverageLabel(coverage: ArmorPlannerCandidateView["summary"]["armorSetCoverage"]): string {
  if (coverage.mode === "none") return "未设置套装约束";
  if (!coverage.requirements.length) return "套装约束未完成核对";
  return coverage.requirements.map((requirement) => (
    `${requirement.name} ${requirement.actualPieceCount}/${requirement.minimumPieceCount}`
  )).join(" · ");
}

function armorLocationLabel(location: "equipped" | "inventory" | "vault" | "postmaster"): string {
  return {
    equipped: "已装备",
    inventory: "角色背包",
    vault: "仓库",
    postmaster: "邮政官"
  }[location];
}

function isExoticArmorItem(item: AccountItemSummary): boolean {
  return /异域|exotic/i.test(`${item.tier ?? ""} ${item.item_type ?? ""}`);
}

function armorItemOptionLabel(item: AccountItemSummary): string {
  return `${item.name} · ${item.bucket_name ?? "护甲"} · ${item.instance_id?.slice(-4) ?? "----"}`;
}

function armorInstanceLabel(instanceId: string, items: AccountItemSummary[]): string {
  const item = items.find((candidate) => candidate.instance_id === instanceId);
  return item ? armorItemOptionLabel(item) : `实例 ${instanceId.slice(-4)}`;
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
  armorItems: AccountItemSummary[],
  constraints: LoadoutPlanArmorConstraints,
  plannedNonStatPlugHashesBySlot: Partial<Record<ArmorSlot, readonly number[]>>
): ArmorModPreflightView {
  const requestedPlus5 = clampArmorModCount(constraints.five_point_mod_budget, 5);
  const requestedPlus10 = clampArmorModCount(constraints.ten_point_mod_budget, 5);
  const lockedIds = new Set([
    ...constraints.locked_instance_ids,
    ...(constraints.exotic_instance_id ? [constraints.exotic_instance_id] : [])
  ]);
  const excludedIds = new Set(constraints.excluded_instance_ids);
  const optionsBySlot = new Map<ArmorSlot, Set<0 | 5 | 10>>();
  const unknownSlots: ArmorSlot[] = [];

  for (const slot of ["helmet", "arms", "chest", "legs", "class"] as const) {
    const slotItems = armorItems.filter((item) => armorItemSlot(item) === slot && !excludedIds.has(item.instance_id ?? ""));
    const locked = slotItems.filter((item) => lockedIds.has(item.instance_id ?? ""));
    const candidates = locked.length ? locked : slotItems;
    const values = new Set<0 | 5 | 10>([0]);
    let hasCompleteCandidate = false;
    for (const item of candidates) {
      const capability = armorItemStatModCapability(item, plannedNonStatPlugHashesBySlot[slot]);
      if (!capability.complete) continue;
      hasCompleteCandidate = true;
      for (const value of capability.values) values.add(value);
    }
    optionsBySlot.set(slot, values);
    if (!hasCompleteCandidate) unknownSlots.push(slot);
  }

  const canAssign = canAssignExactArmorMods(optionsBySlot, requestedPlus5, requestedPlus10);
  const plus10Slots = [...optionsBySlot.entries()].filter(([, values]) => values.has(10)).map(([slot]) => armorSlotLabel(slot));
  const plus5Slots = [...optionsBySlot.entries()].filter(([, values]) => values.has(5)).map(([slot]) => armorSlotLabel(slot));
  const details = [
    requestedPlus10 > 0 ? `需要 ${requestedPlus10} 个可安装 +10 属性模组的部位；当前可确认：${plus10Slots.join("、") || "无"}` : "",
    requestedPlus5 > 0 ? `需要 ${requestedPlus5} 个可安装 +5 属性模组的部位；当前可确认：${plus5Slots.join("、") || "无"}` : "",
    unknownSlots.length ? `${unknownSlots.map(armorSlotLabel).join("、")}缺少完整能量、属性模组/清空 Plug 或功能 Plug 数据。` : ""
  ].filter(Boolean);

  if (unknownSlots.length) {
    return {
      status: "unknown",
      summary: "当前数据不足以确认精确属性模组数量能否安装。",
      details
    };
  }
  if (canAssign) {
    return {
      status: "ready",
      summary: requestedPlus5 + requestedPlus10
        ? "当前库存存在满足精确数量的逐部位安装排列。"
        : "当前方案不要求安装属性模组。",
      details
    };
  }
  return {
    status: "warning",
    summary: "当前库存的部位能量无法承载指定的精确属性模组数量。",
    details
  };
}

function canAssignExactArmorMods(
  optionsBySlot: ReadonlyMap<ArmorSlot, ReadonlySet<0 | 5 | 10>>,
  requestedPlus5: number,
  requestedPlus10: number
): boolean {
  const slots = ["helmet", "arms", "chest", "legs", "class"] as const;
  let states = new Set(["0:0"]);
  for (const slot of slots) {
    const next = new Set<string>();
    for (const state of states) {
      const [usedPlus5, usedPlus10] = state.split(":").map(Number) as [number, number];
      for (const value of optionsBySlot.get(slot) ?? new Set<0 | 5 | 10>([0])) {
        const plus5 = usedPlus5 + (value === 5 ? 1 : 0);
        const plus10 = usedPlus10 + (value === 10 ? 1 : 0);
        if (plus5 <= requestedPlus5 && plus10 <= requestedPlus10) next.add(`${plus5}:${plus10}`);
      }
    }
    states = next;
  }
  return states.has(`${requestedPlus5}:${requestedPlus10}`);
}

function armorItemStatModCapability(
  item: AccountItemSummary,
  plannedNonStatPlugHashes: readonly number[] | undefined
): {
  complete: boolean;
  values: Set<0 | 5 | 10>;
} {
  const values = new Set<0 | 5 | 10>([0]);
  if (!item.armor_energy || !item.sockets?.length) return { complete: false, values };
  const plannedNonStatPlugPlan = plannedNonStatPlugHashes === undefined
    ? undefined
    : buildArmorNonStatPlugPlan(item, plannedNonStatPlugHashes);
  if (plannedNonStatPlugPlan && !plannedNonStatPlugPlan.complete) return { complete: false, values };
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
      if (cost <= remaining) values.add(value);
    }
  }
  return { complete: hasStatModSocket && hasStatModClearOption, values };
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

function armorItemSlot(item: AccountItemSummary): ArmorSlot | undefined {
  if (item.bucket_hash === 3448274439 || /头盔|頭盔|helmet/i.test(item.bucket_name ?? "")) return "helmet";
  if (item.bucket_hash === 3551918588 || /臂铠|臂鎧|gauntlets|arms/i.test(item.bucket_name ?? "")) return "arms";
  if (item.bucket_hash === 14239492 || /胸甲|chest/i.test(item.bucket_name ?? "")) return "chest";
  if (item.bucket_hash === 20886954 || /腿甲|leg armor|legs/i.test(item.bucket_name ?? "")) return "legs";
  if (item.bucket_hash === 1585787867 || /职业物品|職業物品|class armor|class item/i.test(item.bucket_name ?? "")) return "class";
  return undefined;
}

function clampArmorModCount(value: number, maximum: number): number {
  return Math.min(Math.max(0, Math.trunc(maximum)), Math.max(0, Math.trunc(value || 0)));
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
    locked_instance_ids: [],
    excluded_instance_ids: [],
    allowed_locations: ["equipped", "inventory", "vault", "postmaster"],
    set_constraint: { mode: "none" }
  };
}

function armorStatLabel(stat: typeof loadoutPlanArmorStatKeys[number]): string {
  return {
    health: "生命值",
    melee: "近战",
    grenade: "手雷",
    super: "超能",
    class: "职业",
    weapon: "武器"
  }[stat];
}

function resolveArmorClass(value: string): ArmorClass {
  const normalized = value.trim().toLocaleLowerCase();
  if (normalized.includes("泰坦") || normalized.includes("titan")) return "titan";
  if (normalized.includes("猎人") || normalized.includes("獵人") || normalized.includes("hunter")) return "hunter";
  if (normalized.includes("术士") || normalized.includes("術士") || normalized.includes("warlock")) return "warlock";
  return "unknown";
}

function armorSlotLabel(slot: ArmorSlot): string {
  return {
    helmet: "头盔",
    arms: "臂铠",
    chest: "胸甲",
    legs: "腿甲",
    class: "职业物品"
  }[slot];
}

function getArmorPlannerStatusMessage(input: {
  state: ArmorPlannerWorkspaceState | undefined;
  hasAccount: boolean;
  hasClient: boolean;
  armorClass: ArmorClass;
  mode: ArmorPlannerMode;
}): string {
  if (!input.hasClient) return "当前平台未接入真实账号护甲规划。";
  if (!input.hasAccount && input.mode !== "theoretical") return "请先读取账号数据，才能核对真实护甲实例。";
  if (input.armorClass === "unknown") return "请先填写可识别的泰坦、猎人或术士职业。";
  if (!input.state || input.state.status === "idle") return "";
  if (input.state.status === "loading") return input.mode === "theoretical"
    ? "正在使用当前 Manifest 规则集计算理论可达组合。"
    : "正在核对当前 Manifest、账号护甲和目标约束。";
  if (input.state.status === "error") return input.state.error.message;
  const view = input.state.viewModel;
  if (input.state.status === "stale") return "账号、规则或新请求已使当前结果过期，请重新计算。";
  const detail = [...view.issues.map((issue) => issue.message), ...view.warnings].join(" ");
  if (view.outcome === "invalid") return detail || "当前护甲目标或约束无效。";
  if (view.outcome === "indeterminate") {
    return detail || "搜索达到状态上限，当前候选不能证明是全局最优。";
  }
  if (view.outcome === "unreachable") return detail || "当前账号护甲无法满足全部目标。";
  return `已找到 ${view.reachableCandidateCount} 个达标候选。${detail ? ` ${detail}` : ""}`;
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
