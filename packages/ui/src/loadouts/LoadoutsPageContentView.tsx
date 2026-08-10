import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type {
  ArmorPlannerCandidateView,
  ArmorPlannerMode,
  ArmorPlannerWorkspaceJob,
  ArmorPlannerWorkspaceState
} from "@d2-tools/app/armor";
import type {
  InGameLoadoutItemRowView,
  LoadoutEntryView,
  LocalLoadoutPlanWorkbenchModel,
  LoadoutsPageModel
} from "@d2-tools/app/loadouts";
import type {
  AssistantArtifact,
  AssistantEquipmentTargetCandidatesArtifact
} from "@d2-tools/app/capabilities";
import type { GuideLoadoutCandidatesArtifact } from "@d2-tools/app/guides";
import { getLocalLoadoutPlanAccountItems } from "@d2-tools/app/loadouts";
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
import { GameAssetImage } from "../media/GameAssetImage.js";
import {
  ProductWorkspaceEmptyState,
  ProductWorkspaceSideRail,
  ProductWorkspaceSplit
} from "../workspace/ProductWorkspace.js";

export type LoadoutsPageActions = {
  selectEntry: (entryId: string) => void;
  selectTemplate: (id: string) => void;
  selectLocalPlan: (id: string) => void;
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
  importGuideText: (rawText: string, character: AccountSummary["characters"][number] | null) => Promise<boolean>;
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
  localPlanDraft: CreateLocalLoadoutPlanInput | null;
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
  localPlanAssistantPrefill: ((AssistantArtifact | GuideLoadoutCandidatesArtifact) & { request_id: number }) | null;
  armorPlannerState?: ArmorPlannerWorkspaceState;
  armorSetCatalog?: ArmorSetCatalogEntry[];
  armorSetCatalogStatus?: "loading" | "ready" | "error";
  armorTargetFeedback?: string;
  isSavingArmorTargets?: boolean;
  armorResultTraceRequest?: { resultId: string; candidateId: string; requestId: number } | null;
};

type LoadoutMode = "in-game" | "local";
const loadoutModes: LoadoutMode[] = ["in-game", "local"];

export function LoadoutsPageContentView(props: LoadoutsPageContentViewProps) {
  const [mode, setMode] = useState<LoadoutMode>("in-game");
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [isDimImportOpen, setIsDimImportOpen] = useState(false);
  const [isGuideImportOpen, setIsGuideImportOpen] = useState(false);
  const sourceMenuRef = useRef<HTMLDetailsElement>(null);
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
    setIsDimImportOpen(false);
    setIsGuideImportOpen(true);
  }, [props.localPlanAssistantPrefill?.request_id]);

  useEffect(() => {
    if (!props.armorResultTraceRequest) return;
    setMode("local");
    setIsDimImportOpen(false);
    setIsGuideImportOpen(false);
  }, [props.armorResultTraceRequest?.requestId]);

  useEffect(() => {
    function closeSourceMenu(event: PointerEvent) {
      if (sourceMenuRef.current?.contains(event.target as Node)) return;
      sourceMenuRef.current?.removeAttribute("open");
    }

    function closeSourceMenuWithKeyboard(event: KeyboardEvent) {
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
    if (nextMode !== "local") {
      setIsDimImportOpen(false);
      setIsGuideImportOpen(false);
    }
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

  function createFromCurrentCharacter(details: HTMLDetailsElement) {
    details.open = false;
    props.actions.startLocalPlanFromCharacter(activeCharacter);
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
      ? "账号角色尚未读取，配装查看与创建操作暂不可用。"
      : mode === "in-game"
        ? "选择游戏内配装槽位后再应用或保存当前装备。"
        : "本地方案只保存在本机，保存不会写入 Bungie 槽位。");

  return (
    <section className="loadout-page" aria-label="配装工作台">
      <div className="loadout-context-toolbar" data-surface="section">
        <div className="loadout-context-group">
          <span className="loadout-context-label">角色</span>
          <div className="loadout-character-tabs" data-ui-kind="context-switcher" role="group" aria-label="配装角色上下文">
            {characters.map((character) => {
              const active = activeCharacterId === character.character_id;
              return (
                <button
                  type="button"
                  aria-pressed={active}
                  key={character.character_id}
                  onClick={() => selectCharacter(character.character_id)}
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
            <button id={`${tabId}-local`} type="button" role="tab" aria-controls={panelId} aria-selected={mode === "local"} tabIndex={mode === "local" ? 0 : -1} onKeyDown={handleModeKeyDown} onClick={() => selectMode("local")}>本地配装方案 <span>本机</span></button>
          </div>
        </div>

        {mode === "local" ? (
          <div className="loadout-context-actions">
            <details ref={sourceMenuRef} className="loadout-create-menu">
              <summary data-ui-kind="button" data-control-variant="secondary" aria-haspopup="true">从现有内容创建</summary>
              <div className="loadout-create-options" data-surface="menu" data-ui-kind="command-menu" aria-label="本地方案创建来源">
                <button type="button" disabled={!activeCharacter || props.isRunningItemAction} onClick={(event) => createFromCurrentCharacter(event.currentTarget.closest("details")!)}>
                  <strong>使用当前装备</strong>
                  <span>预填真实实例后进入本地方案工作台</span>
                </button>
                <button type="button" onClick={(event) => { event.currentTarget.closest("details")!.open = false; setIsGuideImportOpen(true); }}>
                  <strong>从攻略生成</strong>
                  <span>解析条件后预填同一本地方案工作台</span>
                </button>
              </div>
            </details>
            <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => { setIsGuideImportOpen(false); setIsDimImportOpen(true); }}>导入 DIM</button>
            <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!activeCharacter || props.isRunningItemAction} onClick={() => props.actions.startNewLocalPlan(activeCharacter)}>新建方案</button>
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
            />
          ) : (
            <LocalWorkspace
              {...props}
              activeCharacter={activeCharacter}
              isDimImportOpen={isDimImportOpen}
              onCloseDimImport={() => { setIsDimImportOpen(false); props.actions.dismissDimImport(); }}
              isGuideImportOpen={isGuideImportOpen}
              onCloseGuideImport={() => setIsGuideImportOpen(false)}
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
            {props.activeCharacter && slots.length ? <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={props.isRunningItemAction} onClick={() => setIsSlotPickerVisible((visible) => !visible)}>保存当前配装</button> : null}
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
      key: "weapons",
      label: "武器",
      rows: props.detail.itemRows.filter((row, index) => isInGameWeaponRow(row, index))
    },
    {
      key: "armor",
      label: "护甲与职业物品",
      rows: props.detail.itemRows.filter((row, index) => !isInGameWeaponRow(row, index))
    }
  ].filter((group) => group.rows.length);
  return (
    <>
      <header className="loadout-detail-head">
        <div><span className="loadout-eyebrow">游戏内配装 · 槽位 {String(slot.index + 1).padStart(2, "0")}</span><h2>{slot.name || `配装栏 ${slot.index + 1}`}</h2><p>{character.class_name} · Bungie 保存的装备实例。未返回的 Perk、技能和模组不会在这里伪造显示。</p></div>
        <div className="loadout-action-stack">
          <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={props.isRunningItemAction} onClick={() => props.actions.equipSavedLoadout(character, slot)}>应用游戏内配装</button>
          <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.actions.startLocalPlanFromInGameLoadout(character, slot)}>复制到本地方案</button>
          <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isRunningItemAction} onClick={props.onOpenSlotPicker}>保存当前配装</button>
          <button type="button" data-ui-kind="button" data-control-variant="danger" disabled={props.isRunningItemAction || !slot.item_count} onClick={() => props.actions.clearSavedLoadout(character, slot)}>清空槽位</button>
        </div>
      </header>
      <div className="loadout-section-label"><span>保存的装备 · 当前账号状态</span><span>{slot.items.length} 件记录</span></div>
      {props.detail.itemRows.length ? (
        <div className="loadout-in-game-item-groups" data-surface="content-stack">
          {itemGroups.map((group) => (
            <section className="loadout-in-game-item-group" key={group.key} aria-label={group.label}>
              <header><strong>{group.label}</strong><span>{group.rows.length} 件</span></header>
              <div className="loadout-in-game-item-list" data-surface="list">
                {group.rows.map((row, index) => <InGameLoadoutItemRow key={`${character.character_id}-${slot.index}-${row.item.instance_id ?? row.item.item_hash ?? index}`} row={row} />)}
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

function InGameLoadoutItemRow(props: { row: InGameLoadoutItemRowView }) {
  const { item, locatedItem, located, locationLabel } = props.row;
  const plugNames = item.plugs?.map((plug) => plug.name).filter(Boolean) ?? [];
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
          <span className="loadout-in-game-item-meta">{item.bucket_name || "未知槽位"}</span>
          <span className="loadout-in-game-item-trace">{traceLabel}</span>
        </span>
        <span className="loadout-in-game-item-facts">
          <span className="loadout-in-game-location">{locationLabel}</span>
          <span className="loadout-in-game-plugs">
            {plugNames.slice(0, 3).map((plug, index) => <span key={`${plug}-${index}`}>{plug}</span>)}
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
        <div><dt>已确认配置</dt><dd>{plugSummary}</dd></div>
        <div><dt>核对结果</dt><dd>{located ? props.row.equipped_on_target_character ? "目标角色已处于槽位保存状态" : "实例已定位，应用时由 Bungie 处理" : "保留原始记录，不根据名称猜测实例"}</dd></div>
      </dl>
    </details>
  );
}

function isInGameWeaponRow(row: InGameLoadoutItemRowView, index: number): boolean {
  const bucketName = row.item.bucket_name?.toLocaleLowerCase() ?? "";
  return bucketName.includes("武器") || bucketName.includes("weapon") || (!bucketName && index < 3);
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
    <section className="loadout-slot-picker" aria-label="保存当前配装的目标槽位">
      <header><div><strong>保存当前配装</strong><small>选择 Bungie 真实槽位；已有内容的槽位会在写入前再次确认覆盖。</small></div></header>
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
      <p className="loadout-guidance">游戏内配装由 Bungie 直接应用。未定位记录用于账号核对，不代表官方槽位不可用，也不会被本地方案自动替换。</p>
    </>
  );
}

function LocalWorkspace(props: LoadoutsPageContentViewProps & {
  activeCharacter: AccountSummary["characters"][number] | null;
  isDimImportOpen: boolean;
  onCloseDimImport: () => void;
  isGuideImportOpen: boolean;
  onCloseGuideImport: () => void;
}) {
  return (
    <ProductWorkspaceSplit className="loadout-workspace loadout-local-workspace">
      <ProductWorkspaceSideRail element="aside" className="loadout-directory">
        <div className="loadout-column-head"><div><strong>本地配装方案</strong><small>{props.localPlanWorkspace.entries.length} 个方案 · 本机数据</small></div></div>
        <div className="loadout-entry-list" data-surface="list">
          {props.localPlanWorkspace.entries.map((entry) => {
            const selected = props.localPlanEditingId === entry.id;
            return (
              <button type="button" key={entry.id} aria-pressed={selected} data-status={entry.status_tone} className="loadout-directory-row" onClick={() => props.actions.selectLocalPlan(entry.id)}>
                <span className="loadout-directory-index">{entry.status_tone === "warning" ? "!" : "L"}</span>
                <span><strong>{entry.title}</strong><small>{entry.subtitle}</small><small>{entry.source_label}</small></span>
                <em data-status={entry.status_tone}>{entry.status_label}</em>
              </button>
            );
          })}
          {!props.localPlanWorkspace.entries.length ? <p className="loadout-rail-empty">还没有保存本地方案。新建或从当前装备创建后，显式保存的方案会显示在这里。</p> : null}
        </div>
      </ProductWorkspaceSideRail>

      <section className="loadout-detail">
        {props.armorResultTraceRequest ? <ArmorResultTraceNotice {...props} /> : null}
        {props.isDimImportOpen ? <DimImportPanel {...props} /> : null}
        {props.isGuideImportOpen ? <GuideImportPanel {...props} /> : null}
        {props.localPlanError ? <div className="loadout-capability-notice" data-ui-kind="callout" data-status="warning"><div><strong>本地方案操作未完成</strong><p>{props.localPlanError}</p></div></div> : null}
        {props.localPlanDraft ? <LocalPlanEditor {...props} /> : <ProductWorkspaceEmptyState><h2>选择或新建本地方案</h2><p>本地方案先在工作台中编辑，只有显式保存后才写入本机数据。</p></ProductWorkspaceEmptyState>}
      </section>

      <aside className="loadout-summary">
        {props.localPlanDraft ? <LocalPlanSummary {...props} /> : <LoadoutSummaryEmpty />}
      </aside>
    </ProductWorkspaceSplit>
  );
}

function LocalPlanEditor(props: LoadoutsPageContentViewProps & {
  activeCharacter: AccountSummary["characters"][number] | null;
}) {
  const draft = props.localPlanDraft;
  const accountItems = useMemo(() => getLocalLoadoutPlanAccountItems(props.accountSummary), [props.accountSummary]);
  const matches = useMemo(() => draft && props.accountSummary
    ? matchLocalLoadoutPlan(draft, props.accountSummary).item_matches
    : [], [draft, props.accountSummary]);
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

  function addItemTarget(instanceId: string) {
    const item = accountItems.find((candidate) => candidate.instance_id === instanceId);
    if (!item) return;
    updateDraftClearingArmorPlan({
      ...activeDraft,
      item_targets: [...activeDraft.item_targets, {
        slot: item.bucket_name ?? item.group_key,
        item_hash: item.hash,
        selected_instance_id: item.instance_id,
        plug_hashes: item.socket_plugs.map((plug) => plug.hash)
      }]
    });
  }

  function calculateArmorCandidates() {
    const armorClass = resolveArmorClass(activeDraft.class_name);
    const plannerMode = armorConstraints.planner_mode ?? "owned";
    if (armorClass === "unknown" || !props.actions.planArmor) return;
    if (plannerMode !== "theoretical" && !props.accountSummary) return;
    const sharedRequest = {
      class: armorClass,
      target: buildArmorPlannerTarget(armorConstraints),
      fragment_adjustments: armorConstraints.fragment_stat_bonuses,
      armor_mod_budget: {
        plus5: armorConstraints.five_point_mod_budget,
        plus10: armorConstraints.ten_point_mod_budget,
        usage: "at-most" as const
      },
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
      allowed_locations: armorConstraints.allowed_locations,
      locked_instance_ids: lockedInstanceIds,
      excluded_instance_ids: armorConstraints.excluded_instance_ids,
      target_character_id: activeDraft.target_character_id,
      mode: "conservative" as const
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
    const existingTargets = new Map(activeDraft.item_targets
      .filter((target) => target.selected_instance_id)
      .map((target) => [target.selected_instance_id!, target]));
    const nonArmorTargets = activeDraft.item_targets.filter((target) => !target.selected_instance_id || !armorInstanceIds.has(target.selected_instance_id));
    updateDraft({
      ...activeDraft,
      item_targets: [...nonArmorTargets, ...candidate.pieces.map((piece) => ({
        slot: armorSlotLabel(piece.slot),
        item_hash: piece.itemHash,
        selected_instance_id: piece.instanceId,
        plug_hashes: existingTargets.get(piece.instanceId)?.plug_hashes ?? []
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
        selected_instance_ids: candidate.pieces.map((piece) => piece.instanceId)
      }
    }, false);
  }

  const armorClass = resolveArmorClass(activeDraft.class_name);
  const armorItems = accountItems.filter((item) => item.group_key === "armor" && item.instance_id);
  const plannerMode = armorConstraints.planner_mode ?? "owned";
  const armorPlannerState = props.armorPlannerState;
  const armorViewModel = armorPlannerState?.status === "ready" || armorPlannerState?.status === "stale"
    ? armorPlannerState.viewModel
    : null;
  const armorCandidates = armorViewModel?.candidates ?? [];
  const armorStatusMessage = getArmorPlannerStatusMessage({
    state: armorPlannerState,
    hasAccount: Boolean(props.accountSummary),
    hasClient: Boolean(props.actions.planArmor),
    armorClass,
    mode: plannerMode
  });

  return (
    <>
      <header className="loadout-detail-head">
        <div><span className="loadout-eyebrow">本地方案工作台 · {draft.class_name || "未限定职业"}</span><h2>{draft.name || "未命名方案"}</h2><p>{props.localPlanEditingId ? "编辑已保存方案" : "尚未保存为本地方案"} · 保存不会写入 Bungie 槽位</p></div>
        <div className="loadout-action-stack">
          <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.actions.closeLocalPlanEditor}>退出工作台</button>
          <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={props.localPlanIsSaving || !draft.name.trim() || !draft.class_name.trim()} onClick={props.actions.saveLocalPlan}>{props.localPlanIsSaving ? "保存中" : "保存本地方案"}</button>
        </div>
      </header>
      <div className="loadout-local-state-strip" data-status={props.localPlanIsSaving ? "pending" : props.localPlanEditingId ? "neutral" : "warning"}>
        <strong>{props.localPlanIsSaving ? "正在保存本地方案" : props.localPlanEditingId ? "正在编辑已保存方案" : "当前方案尚未保存"}</strong>
        <span>{props.localPlanEditingId ? "再次保存后，当前修改才会写入本机方案。" : "保存后才会写入本机数据；不会直接改动 Bungie 槽位。"}</span>
      </div>
      {draft.guidance?.warnings.length ? <section className="loadout-guide-review" data-ui-kind="callout" data-status="warning" aria-label="攻略解析待确认"><strong>攻略解析待确认</strong><ul>{draft.guidance.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></section> : null}
      <section className="loadout-local-editor-section" aria-label="基础信息">
        <header className="loadout-local-section-head"><div><strong>基础信息</strong><small>方案身份、目标职业和本地保存边界</small></div></header>
        <div className="loadout-local-toolbar">
          <label><span>方案名称</span><input value={draft.name} onChange={(event) => updateDraft({ ...draft, name: event.target.value })} aria-label="配装名称" /></label>
          <label><span>目标职业</span><input value={draft.class_name} onChange={(event) => updateDraftClearingArmorPlan({ ...draft, class_name: event.target.value })} aria-label="目标职业" /></label>
        </div>
      </section>
      <section className="loadout-local-editor-section" aria-label="装备目标">
        <header className="loadout-local-section-head"><div><strong>装备目标</strong><small>绑定当前账号中的真实实例；同名多实例不会自动代选</small></div><span>{draft.item_targets.length} 项</span></header>
        <ul className="loadout-item-list" data-surface="list">
          {draft.item_targets.map((target, index) => <LocalPlanItemRow key={`${target.slot}-${target.selected_instance_id ?? target.item_hash ?? index}-${index}`} index={index} target={target} match={matches[index] ?? null} onChange={updateTarget} onRemove={() => updateDraftClearingArmorPlan({ ...draft, item_targets: draft.item_targets.filter((_, targetIndex) => targetIndex !== index) })} />)}
        </ul>
        {!draft.item_targets.length ? <ProductWorkspaceEmptyState><h3>尚未添加装备目标</h3><p>可以先保存不完整方案，或从当前角色装备预填真实实例。</p></ProductWorkspaceEmptyState> : null}
        <div className="loadout-compare-controls">
          <label><span>添加账号内装备</span><select value="" onChange={(event) => addItemTarget(event.target.value)} disabled={!accountItems.some((item) => item.instance_id)}><option value="">选择实例</option>{accountItems.filter((item) => item.instance_id).map((item) => <option key={item.instance_id} value={item.instance_id}>{item.name} · {item.bucket_name || item.group_key}</option>)}</select></label>
          {props.localPlanEditingId ? <button type="button" data-ui-kind="button" data-control-variant="danger" disabled={props.localPlanIsSaving} onClick={() => props.actions.deleteLocalPlan(props.localPlanEditingId!)}>删除方案</button> : null}
        </div>
      </section>
      <section className="loadout-armor-workbench loadout-local-editor-section" aria-label="护甲优化">
        <header><div><strong>护甲规划</strong><small>同一组属性目标可分别核对理论上限、当前库存、待刷身份和现有配装升级路径。</small></div><button type="button" data-ui-kind="button" data-control-variant="primary" onClick={calculateArmorCandidates} disabled={(plannerMode !== "theoretical" && !props.accountSummary) || !props.actions.planArmor || armorClass === "unknown" || armorPlannerState?.status === "loading"}>{armorPlannerState?.status === "loading" ? "计算中" : armorPlannerActionLabel(plannerMode)}</button></header>
        <ArmorPlannerModeControl mode={plannerMode} onChange={(mode) => updateArmorConstraints({ ...armorConstraints, planner_mode: mode })} />
        <div className="loadout-armor-constraint-grid">
          {loadoutPlanArmorStatKeys.map((stat) => <label key={stat}><span>{armorStatLabel(stat)}最低值</span><input type="number" min="0" step="5" value={armorConstraints.stat_minimums[stat] ?? 0} onChange={(event) => updateArmorConstraints({ ...armorConstraints, stat_minimums: { ...armorConstraints.stat_minimums, [stat]: Math.max(Number(event.target.value) || 0, 0) } })} /></label>)}
          <label><span>+5 模组预算</span><input type="number" min="0" value={armorConstraints.five_point_mod_budget} onChange={(event) => updateArmorConstraints({ ...armorConstraints, five_point_mod_budget: Math.max(Number(event.target.value) || 0, 0) })} /></label>
          <label><span>+10 模组预算</span><input type="number" min="0" value={armorConstraints.ten_point_mod_budget} onChange={(event) => updateArmorConstraints({ ...armorConstraints, ten_point_mod_budget: Math.max(Number(event.target.value) || 0, 0) })} /></label>
        </div>
        <div className="loadout-armor-priority" role="group" aria-label="护甲属性优先级">{loadoutPlanArmorStatKeys.map((stat) => { const selected = armorConstraints.priority_stats.includes(stat); return <label key={stat}><input type="checkbox" checked={selected} onChange={(event) => updateArmorConstraints({ ...armorConstraints, priority_stats: event.target.checked ? [...armorConstraints.priority_stats, stat] : armorConstraints.priority_stats.filter((item) => item !== stat) })} /><span>{armorStatLabel(stat)}优先</span></label>; })}</div>
        <ArmorSetConstraintEditor
          constraint={armorConstraints.set_constraint ?? { mode: "none" }}
          catalog={props.armorSetCatalog ?? []}
          catalogStatus={props.armorSetCatalogStatus ?? "loading"}
          onChange={(setConstraint) => updateArmorConstraints({ ...armorConstraints, set_constraint: setConstraint })}
        />
        {plannerMode !== "theoretical" ? <ArmorInventoryConstraintEditor
          mode={plannerMode}
          constraints={armorConstraints}
          armorItems={armorItems}
          onChange={updateArmorConstraints}
        /> : null}
        {armorStatusMessage ? <p className="loadout-callout" data-ui-kind="callout" data-status={armorPlannerState?.status === "error" ? "error" : armorPlannerState?.status === "ready" && armorViewModel?.outcome === "reachable" ? "success" : "warning"}>{armorStatusMessage}</p> : null}
        {props.armorTargetFeedback ? <p className="loadout-callout" data-ui-kind="callout" data-status={props.armorTargetFeedback.includes("失败") ? "error" : "success"}>{props.armorTargetFeedback}</p> : null}
        {armorCandidates.length ? <ArmorCandidateList
          candidates={armorCandidates}
          stale={armorPlannerState?.status === "stale"}
          onSelect={selectArmorCandidate}
          onSaveAcquisitionTargets={props.actions.saveArmorAcquisitionTargets
            ? (candidate) => props.actions.saveArmorAcquisitionTargets?.(candidate, armorClass)
            : undefined}
          isSavingAcquisitionTargets={Boolean(props.isSavingArmorTargets)}
        /> : null}
      </section>
      <LocalPlanExecutionPanel {...props} />
    </>
  );
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
  return (
    <div className="loadout-armor-mode-control" data-ui-kind="segmented-control" role="tablist" aria-label="护甲规划模式">
      {options.map((option) => <button type="button" key={option.mode} role="tab" aria-selected={props.mode === option.mode} onClick={() => props.onChange(option.mode)}><strong>{option.label}</strong><small>{option.description}</small></button>)}
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
            <footer><span>模组 +5 × {candidate.summary.armorModUsage.plus5}，+10 × {candidate.summary.armorModUsage.plus10} · 浪费 {candidate.summary.statWaste}</span><span>{armorSetCoverageLabel(candidate.summary.armorSetCoverage)}</span>{selectable ? <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.stale} onClick={() => props.onSelect(candidate)}>{props.stale ? "需要重新计算" : "使用此实例组合"}</button> : candidate.kind === "acquisition" && candidate.missingPieceCount > 0 && props.onSaveAcquisitionTargets ? <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.stale || props.isSavingAcquisitionTargets} onClick={() => props.onSaveAcquisitionTargets?.(candidate)}>{props.stale ? "需要重新计算" : props.isSavingAcquisitionTargets ? "正在保存目标" : `保存 ${candidate.missingPieceCount} 个待刷缺口`}</button> : null}</footer>
          </article>
        );
      })}
    </div>
  );
}

function LocalPlanItemRow(props: {
  index: number;
  target: CreateLocalLoadoutPlanInput["item_targets"][number];
  match: LocalLoadoutPlanItemMatch | null;
  onChange: (index: number, target: CreateLocalLoadoutPlanInput["item_targets"][number]) => void;
  onRemove: () => void;
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
    <li className="loadout-item" data-status={tone}>
      <ItemVisual icon={representative?.item.icon} label={itemName} bucketName={representative?.item.bucket_name ?? props.target.slot} />
      <div className="loadout-item-copy"><strong>{itemName}</strong><small>{itemMeta}</small></div>
      <div className="loadout-item-match"><strong>{instanceLabel}</strong><small>{plugLabel}</small></div>
      <div className="loadout-item-actions"><span className="loadout-status-badge" data-status={tone}>{status}</span><select value={props.target.selected_instance_id ?? ""} onChange={(event) => props.onChange(props.index, { ...props.target, selected_instance_id: event.target.value || undefined })} aria-label={`选择${props.target.slot}实例`}><option value="">不绑定具体实例</option>{props.target.selected_instance_id && !candidates.some((candidate) => candidate.item.instance_id === props.target.selected_instance_id) ? <option value={props.target.selected_instance_id}>当前实例未定位</option> : null}{candidates.map((candidate) => <option key={candidate.item.instance_id} value={candidate.item.instance_id}>{candidate.item.name} · {candidate.location.label}</option>)}</select><button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onRemove}>移除</button></div>
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
        <p>输入公开分享链接后先查看解析结果；确认后才会预填本地方案工作台。</p>
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
  const [text, setText] = useState(assistantRawText || props.localPlanLegacyGuideText);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>(
    equipmentArtifact?.candidates.map((candidate) => candidate.candidate_id)
      ?? guideLoadoutArtifact?.candidates.filter((candidate) => candidate.selected_by_default).map((candidate) => candidate.candidate_id)
      ?? []
  );
  useEffect(() => {
    setText(assistantRawText || props.localPlanLegacyGuideText);
  }, [assistantPrefill?.request_id, props.localPlanLegacyGuideText]);
  useEffect(() => {
    setSelectedCandidateIds(
      equipmentArtifact?.candidates.map((candidate) => candidate.candidate_id)
        ?? guideLoadoutArtifact?.candidates.filter((candidate) => candidate.selected_by_default).map((candidate) => candidate.candidate_id)
        ?? []
    );
  }, [assistantPrefill?.request_id]);
  const restoredLegacyText = Boolean(props.localPlanLegacyGuideText && text === props.localPlanLegacyGuideText);
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
    <section className="loadout-capability-notice" data-status="neutral" aria-label="攻略配装导入">
      <div>
        <strong>{assistantPrefill?.kind === "armor_solution_comparison" ? "复核 AI 护甲方案" : "从攻略生成草稿"}</strong>
        <p>{assistantPrefill?.kind === "armor_solution_comparison"
          ? "候选来自确定性 Armor 结果；这里只带入职业和六维目标，仍需重新核对模组预算、套装、位置范围和真实实例。"
          : "解析出的装备要求会与当前账号核对；未提及或无法确认的槽位保持为空，不会自动补全。"}</p>
        {assistantRawText && text === assistantRawText ? <p data-status="neutral">已接收 AI 工作台成果；解析后仍需核对装备、属性和真实实例。</p> : null}
        {restoredLegacyText ? <p data-status="warning">已恢复旧任务入口保存的攻略文本；成功生成草稿后会自动清除旧副本。</p> : null}
        <label className="loadout-dim-url-field"><span>攻略文本</span><textarea value={text} onChange={(event) => setText(event.target.value)} rows={5} placeholder="粘贴攻略正文、视频文案或配装说明" /></label>
      </div>
      <div className="loadout-action-stack">
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => { if (assistantPrefill) props.actions.dismissAssistantPrefill(); props.onCloseGuideImport(); }}>取消</button>
        <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!text.trim() || !props.activeCharacter || props.localPlanIsImportingGuide} onClick={async () => { if (await props.actions.importGuideText(text, props.activeCharacter)) props.onCloseGuideImport(); }}>{props.localPlanIsImportingGuide ? "解析中" : assistantPrefill?.kind === "armor_solution_comparison" ? "核对并预填" : "解析并预填"}</button>
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
}) {
  const [publishSlotIndex, setPublishSlotIndex] = useState<number | null>(null);
  const plan = props.localPlanExecutionPlan;
  const report = props.localPlanExecutionReport;
  if (!plan) {
    return <section className="loadout-armor-workbench" aria-label="方案应用"><header><div><strong>方案应用</strong><small>请选择目标角色和真实实例后生成执行计划。</small></div></header><DimExportPanel result={props.localPlanDimExport} feedback={props.localPlanDimExportFeedback} onCopy={props.actions.copyDimLoadoutLink} /></section>;
  }
  return (
    <section className="loadout-armor-workbench" aria-label="方案应用">
      <header><div><strong>方案应用</strong><small>计划 {formatExecutionPlanReference(plan.plan_id)}；确认后先刷新账号复核，计划未变化才会逐步执行。</small></div><button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!props.localPlanEditingId || !plan.executable_steps.length || props.localPlanIsExecuting} onClick={props.actions.executeLocalPlan}>{props.localPlanIsExecuting ? "应用中" : props.localPlanEditingId ? "确认并应用" : "先保存方案"}</button></header>
      <DimExportPanel
        result={props.localPlanDimExport}
        feedback={props.localPlanDimExportFeedback}
        onCopy={props.actions.copyDimLoadoutLink}
      />
      {plan.executable_steps.length ? <ol className="loadout-plan-step-list">{plan.executable_steps.map((step, index) => <li key={step.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step.label}</strong></li>)}</ol> : <p className="loadout-callout" data-ui-kind="callout" data-status="warning">没有可执行步骤。</p>}
      {plan.gaps.length ? <p className="loadout-callout" data-ui-kind="callout" data-status="warning">未执行缺口：{plan.gaps.join("；")}</p> : null}
      {report ? <p className="loadout-callout" data-ui-kind="callout" data-status={report.refresh_verified && report.verification_logged !== false ? "success" : "warning"}>{formatExecutionReportMessage(report)}{report.execution_id ? <small title={report.execution_id}>执行 {formatTraceReference(report.execution_id)}{report.verification_status ? ` · 验证 ${formatVerificationStatus(report.verification_status)}` : ""}</small> : null}</p> : null}
      {report?.refresh_verified ? <LocalPlanPublishPanel accountSummary={props.accountSummary} targetCharacterId={plan.target_character_id} selectedSlotIndex={publishSlotIndex} onSelectSlot={setPublishSlotIndex} report={props.localPlanPublishReport} isPublishing={props.localPlanIsPublishing ?? false} onPublish={props.actions.publishLocalPlanToSlot} /> : null}
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
      <small>方案已应用并经账号刷新核对。发布前会再次核对当前装备和目标槽位，变化时保持零写入。</small>
      <div className="loadout-slot-picker-list" data-surface="list">
        {character.loadout_slots.map((slot) => <button type="button" key={slot.index} aria-pressed={slot.index === props.selectedSlotIndex} onClick={() => props.onSelectSlot(slot.index)}><span>{String(slot.index + 1).padStart(2, "0")}</span><span><strong>{slot.name}</strong><small>{slot.item_count ? "覆盖已有槽位" : "空槽"}</small></span></button>)}
      </div>
      {props.report ? <p className="loadout-callout" data-ui-kind="callout" data-status={props.report.verification_status === "verified" && props.report.verification_logged !== false ? "success" : "warning"}>{formatPublishReportMessage(props.report)}<small title={props.report.execution_id}>发布 {formatTraceReference(props.report.execution_id)} · 计划 {formatTraceReference(props.report.plan.plan_id)}</small></p> : null}
      <footer><button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!selectedSlot || props.isPublishing || !props.onPublish} onClick={() => selectedSlot && props.onPublish?.(selectedSlot.index)}>{props.isPublishing ? "发布中" : selectedSlot?.item_count ? "确认覆盖并保存" : "保存到槽位"}</button></footer>
    </div>
  );
}

function formatPublishReportMessage(
  report: NonNullable<LoadoutsPageContentViewProps["localPlanPublishReport"]>
): string {
  if (!report.preflight_verified) return report.error ?? "发布前账号或槽位复核未通过，未执行写入。";
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
        <strong>{props.localPlanEditingId ? "已保存方案编辑中" : "尚未保存到本机"}</strong>
        <p>{props.localPlanEditingId ? "再次保存后，当前修改才会更新本机方案。" : "保存本地方案后才能稳定生成并执行后续计划。"}</p>
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
      <p className="loadout-guidance">本地保存不会写入 Bungie。应用前会按真实实例生成计划；DIM 和攻略只会预填草稿，仍需显式保存。</p>
    </>
  );
}

function ArmorResultTraceNotice(props: LoadoutsPageContentViewProps) {
  const trace = props.armorResultTraceRequest;
  if (!trace) return null;
  return (
    <section className="loadout-capability-notice loadout-result-trace" data-ui-kind="callout" data-status="neutral" aria-label="Armor Planner 结果引用">
      <div>
        <strong>Armor Planner 结果引用</strong>
        <p title={trace.resultId}>结果 {formatArmorResultReference(trace.resultId)} · 候选 {trace.candidateId}</p>
        <small>完整求解结果不会持久化。请在相关本地方案中按当前账号和规则重新计算；这个引用用于核对目标来源，不会恢复过期结果。</small>
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
      detail: `${piece.archetype.name} · ${armorStatLabel(piece.archetype.tertiaryStat)}第三属性 · ${piece.tuning.mode === "plus3" ? "+3 调整" : `${armorStatLabel(piece.tuning.fromStat)} → ${armorStatLabel(piece.tuning.toStat)}`}${piece.set ? ` · ${piece.set.name}` : ""}`
    }));
  }
  if (candidate.kind === "acquisition") {
    return candidate.pieces.map((piece) => ({
      key: `${piece.slot}-${piece.theoretical.configurationId}`,
      slot: armorSlotLabel(piece.slot),
      name: piece.identity.itemName ?? piece.identity.archetypeName,
      detail: piece.acquisitionRequired
        ? `需要获取 · ${armorStatLabel(piece.identity.tertiaryStat)}第三属性${piece.identity.set ? ` · ${piece.identity.set.name}` : ""}`
        : `${piece.exactOwnedMatches.length} 件同身份已持有 · ${piece.nearestOwnedMatches.length} 件近似候选`
    }));
  }
  return candidate.pieces.map((piece) => ({
    key: piece.instanceId,
    slot: armorSlotLabel(piece.slot),
    name: piece.name,
    detail: `${armorLocationLabel(piece.location)} · 实例尾号 ${piece.instanceId.slice(-4)}${piece.set ? ` · ${piece.set.name}` : ""}${candidate.kind === "upgrade" && candidate.retainedInstanceIds.includes(piece.instanceId) ? " · 保留" : ""}`
  }));
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

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
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
