import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type {
  InGameLoadoutItemRowView,
  LoadoutEntryView,
  LocalLoadoutPlanWorkbenchModel,
  LoadoutsPageModel
} from "@d2-tools/app/loadouts";
import { getLocalLoadoutPlanAccountItems } from "@d2-tools/app/loadouts";
import type { AccountSummary } from "@d2-tools/core/account/summary";
import {
  loadoutPlanArmorStatKeys,
  matchLocalLoadoutPlan,
  type CreateLocalLoadoutPlanInput,
  type LoadoutPlanArmorConstraints,
  type LocalLoadoutPlanItemMatch
} from "@d2-tools/core/loadouts/plans";
import { solveLoadoutArmorCandidates, type LoadoutArmorCandidate } from "@d2-tools/core/loadouts/armorSolver";
import type { DimLoadoutImportPreview } from "@d2-tools/core/loadouts/dimImport";
import type { LocalLoadoutPlanExecutionPlan } from "@d2-tools/core/loadouts/localPlanExecution";
import type { LoadoutTemplate } from "@d2-tools/core/loadouts/templates";
import type { LoadoutTemplateAnalysis } from "@d2-tools/core/loadouts/analysis";
import type { LoadoutActionFeedbackState } from "./loadoutActionFeedback.js";
import type { InterfaceLocale } from "../i18n/types.js";
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
  executeLocalPlan: () => void;
  importGuideText: (rawText: string, character: AccountSummary["characters"][number] | null) => void;
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
  localPlanExecutionPlan: LocalLoadoutPlanExecutionPlan | null;
  localPlanExecutionReport: {
    plan: LocalLoadoutPlanExecutionPlan;
    completed_steps: string[];
    failed_step?: string;
    error?: string;
    refresh_verified: boolean;
  } | null;
  localPlanIsExecuting: boolean;
  localPlanIsImportingGuide: boolean;
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
          <div className="loadout-character-tabs" data-ui-kind="segmented-control" aria-label="配装角色上下文">
            {characters.map((character) => {
              const active = activeCharacterId === character.character_id;
              return (
                <button
                  type="button"
                  aria-pressed={active}
                  className={active ? "active" : ""}
                  key={character.character_id}
                  onClick={() => selectCharacter(character.character_id)}
                >
                  <span className="loadout-character-mark" aria-hidden="true">{character.class_name.slice(0, 1)}</span>
                  <span><strong>{character.class_name}</strong><small>{active ? "当前查看" : "切换查看"}</small></span>
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
            <button id={`${tabId}-in-game`} type="button" role="tab" aria-controls={panelId} aria-selected={mode === "in-game"} tabIndex={mode === "in-game" ? 0 : -1} className={mode === "in-game" ? "active" : ""} onKeyDown={handleModeKeyDown} onClick={() => selectMode("in-game")}>游戏内配装 <span>Bungie</span></button>
            <button id={`${tabId}-local`} type="button" role="tab" aria-controls={panelId} aria-selected={mode === "local"} tabIndex={mode === "local" ? 0 : -1} className={mode === "local" ? "active" : ""} onKeyDown={handleModeKeyDown} onClick={() => selectMode("local")}>本地配装方案 <span>本机</span></button>
          </div>
        </div>

        {characters.length ? (
          <span className="loadout-character-context">
            当前查看：{activeCharacter?.class_name ?? "角色"}的{mode === "in-game" ? "游戏内配装" : "本地配装方案"}
          </span>
        ) : null}

        {mode === "local" ? (
          <div className="loadout-context-actions">
            <details ref={sourceMenuRef} className="loadout-create-menu">
              <summary data-ui-kind="button" data-control-variant="secondary" aria-haspopup="true">从现有内容创建</summary>
              <div className="loadout-create-options" data-surface="menu" aria-label="本地方案创建来源">
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

      <div className="loadout-content-frame">
        <div className={`loadout-operation-status ${statusTone}`} data-surface="section" aria-live="polite">
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
              <button type="button" key={entry.id} aria-pressed={selected} data-status="success" className={`loadout-directory-row ${selected ? "selected" : ""}`} onClick={() => props.actions.selectEntry(entry.id)}>
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
        <ul className="loadout-in-game-item-list" data-surface="list">
          {props.detail.itemRows.map((row, index) => <InGameLoadoutItemRow key={`${character.character_id}-${slot.index}-${row.item.instance_id ?? index}`} row={row} />)}
        </ul>
      ) : <ProductWorkspaceEmptyState><h3>当前槽位为空</h3><p>可以把当前角色已装备的物品保存到此槽位。</p></ProductWorkspaceEmptyState>}
      <InGameIdentifierEditor character={character} slot={slot} slots={props.slots} isRunningItemAction={props.isRunningItemAction} onSubmit={props.actions.updateSavedLoadoutIdentifiers} />
      <footer className="loadout-detail-footer"><p>应用时直接调用 Bungie 槽位，d2-tools 不会预先转移或逐件装备。</p></footer>
    </>
  );
}

function InGameLoadoutItemRow(props: { row: InGameLoadoutItemRowView }) {
  const { item, locatedItem, located, locationLabel } = props.row;
  return (
    <li data-status={located ? "success" : "warning"}>
      <ItemVisual icon={locatedItem?.icon ?? item.icon} label={item.name} bucketName={item.bucket_name} />
      <span><strong>{item.name}</strong><small>{[item.bucket_name || "未知槽位", locationLabel, item.plugs?.length ? item.plugs.map((plug) => plug.name).join("、") : props.row.plug_count ? `${props.row.plug_count} 个 Plug` : "未返回 Plug"].join(" · ")}</small></span>
      <em data-status={located ? "success" : "warning"}>{located ? props.row.equipped_on_target_character ? "当前已装备" : "已定位待装备" : "未定位"}</em>
    </li>
  );
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
            <button type="button" key={slot.index} aria-pressed={selected} data-status={occupied ? "warning" : "neutral"} className={selected ? "selected" : ""} onClick={() => props.onSelectSlot(slot.index)}>
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
  return (
    <>
      <div className="loadout-column-head"><div><strong>账号核对</strong><small>不影响 Bungie 应用</small></div></div>
      <dl className="loadout-ledger">
        <div><dt>保存装备</dt><dd><b>{props.detail.itemRows.length}</b><small>槽位实际返回的装备记录</small></dd></div>
        <div><dt>已定位</dt><dd><b>{locatedCount}</b><small>当前账号快照可找到实例</small></dd></div>
        <div><dt>缺失 / 待处理</dt><dd><b>{missingCount}</b><small>缺失项不阻止 Bungie 直接应用</small></dd></div>
      </dl>
      <p className="loadout-guidance">游戏内配装和本地方案不自动同步。</p>
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
              <button type="button" key={entry.id} aria-pressed={selected} data-status={entry.status_tone} className={`loadout-directory-row ${selected ? "selected" : ""}`} onClick={() => props.actions.selectLocalPlan(entry.id)}>
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
        {props.isDimImportOpen ? <DimImportPanel {...props} /> : null}
        {props.isGuideImportOpen ? <GuideImportPanel {...props} /> : null}
        {props.localPlanError ? <div className="loadout-capability-notice" data-status="warning"><div><strong>本地方案操作未完成</strong><p>{props.localPlanError}</p></div></div> : null}
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
  const [armorCandidates, setArmorCandidates] = useState<LoadoutArmorCandidate[]>([]);
  const [armorUnavailableReasons, setArmorUnavailableReasons] = useState<string[]>([]);
  const matches = useMemo(() => draft && props.accountSummary
    ? matchLocalLoadoutPlan(draft, props.accountSummary).item_matches
    : [], [draft, props.accountSummary]);
  if (!draft) return null;
  const activeDraft = draft;

  function updateDraft(next: CreateLocalLoadoutPlanInput) {
    setArmorCandidates([]);
    setArmorUnavailableReasons([]);
    props.actions.localPlanDraftChange(next);
  }

  const armorConstraints = activeDraft.armor_constraints ?? emptyArmorConstraints();

  function updateArmorConstraints(next: LoadoutPlanArmorConstraints) {
    updateDraft({ ...activeDraft, armor_constraints: next });
  }

  function updateTarget(index: number, nextTarget: CreateLocalLoadoutPlanInput["item_targets"][number]) {
    updateDraft({
      ...activeDraft,
      item_targets: activeDraft.item_targets.map((target, targetIndex) => targetIndex === index ? nextTarget : target)
    });
  }

  function addItemTarget(instanceId: string) {
    const item = accountItems.find((candidate) => candidate.instance_id === instanceId);
    if (!item) return;
    updateDraft({
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
    if (!props.accountSummary) {
      setArmorCandidates([]);
      setArmorUnavailableReasons(["请先读取账号数据，才能计算真实护甲候选。"]);
      return;
    }
    const result = solveLoadoutArmorCandidates({
      account: props.accountSummary,
      target_character_id: activeDraft.target_character_id,
      constraints: armorConstraints
    });
    setArmorCandidates(result.candidates);
    setArmorUnavailableReasons(result.unavailable_reasons);
  }

  function selectArmorCandidate(candidate: LoadoutArmorCandidate) {
    const armorInstanceIds = new Set(accountItems
      .filter((item) => item.group_key === "armor" && item.instance_id)
      .map((item) => item.instance_id));
    const existingTargets = new Map(activeDraft.item_targets
      .filter((target) => target.selected_instance_id)
      .map((target) => [target.selected_instance_id!, target]));
    const nonArmorTargets = activeDraft.item_targets.filter((target) => !target.selected_instance_id || !armorInstanceIds.has(target.selected_instance_id));
    updateDraft({
      ...activeDraft,
      item_targets: [...nonArmorTargets, ...candidate.items.map((item) => ({
        slot: item.bucket_name,
        item_hash: item.item_hash,
        selected_instance_id: item.instance_id,
        plug_hashes: existingTargets.get(item.instance_id)?.plug_hashes ?? []
      }))]
    });
  }

  return (
    <>
      <header className="loadout-detail-head">
        <div><span className="loadout-eyebrow">本地方案工作台 · {draft.class_name || "未限定职业"}</span><h2>{draft.name || "未命名方案"}</h2><p>{props.localPlanEditingId ? "编辑已保存方案" : "尚未保存为本地方案"} · 保存不会写入 Bungie 槽位</p></div>
        <span className="loadout-detail-status" data-status={props.localPlanEditingId ? "success" : "warning"}>{props.localPlanEditingId ? "编辑中" : "未保存"}</span>
      </header>
      <div className="loadout-local-toolbar">
        <label><span>方案名称</span><input value={draft.name} onChange={(event) => updateDraft({ ...draft, name: event.target.value })} aria-label="配装名称" /></label>
        <label><span>目标职业</span><input value={draft.class_name} onChange={(event) => updateDraft({ ...draft, class_name: event.target.value })} aria-label="目标职业" /></label>
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.actions.closeLocalPlanEditor}>退出工作台</button>
        <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={props.localPlanIsSaving || !draft.name.trim() || !draft.class_name.trim()} onClick={props.actions.saveLocalPlan}>{props.localPlanIsSaving ? "保存中" : "保存本地方案"}</button>
      </div>
      <div className="loadout-section-label"><span>装备目标 · 当前账号状态</span><span>{draft.item_targets.length} 项</span></div>
      <ul className="loadout-item-list" data-surface="list">
        {draft.item_targets.map((target, index) => <LocalPlanItemRow key={`${target.slot}-${target.selected_instance_id ?? target.item_hash ?? index}-${index}`} index={index} target={target} match={matches[index] ?? null} onChange={updateTarget} onRemove={() => updateDraft({ ...draft, item_targets: draft.item_targets.filter((_, targetIndex) => targetIndex !== index) })} />)}
      </ul>
      {!draft.item_targets.length ? <ProductWorkspaceEmptyState><h3>尚未添加装备目标</h3><p>可以先保存不完整方案，或从当前角色装备预填真实实例。</p></ProductWorkspaceEmptyState> : null}
      <div className="loadout-compare-controls">
        <label><span>添加账号内装备</span><select value="" onChange={(event) => addItemTarget(event.target.value)} disabled={!accountItems.some((item) => item.instance_id)}><option value="">选择实例</option>{accountItems.filter((item) => item.instance_id).map((item) => <option key={item.instance_id} value={item.instance_id}>{item.name} · {item.bucket_name || item.group_key}</option>)}</select></label>
        {props.localPlanEditingId ? <button type="button" data-ui-kind="button" data-control-variant="danger" disabled={props.localPlanIsSaving} onClick={() => props.actions.deleteLocalPlan(props.localPlanEditingId!)}>删除方案</button> : null}
      </div>
      <LocalPlanExecutionPanel {...props} />
      <section className="loadout-armor-workbench" aria-label="护甲优化">
        <header><div><strong>护甲优化</strong><small>只使用当前账号的真实护甲实例；候选在选择前不会写入本地方案。</small></div><button type="button" data-ui-kind="button" data-control-variant="primary" onClick={calculateArmorCandidates} disabled={!props.accountSummary}>计算护甲候选</button></header>
        <div className="loadout-armor-constraint-grid">
          {loadoutPlanArmorStatKeys.map((stat) => <label key={stat}><span>{armorStatLabel(stat)}最低值</span><input type="number" min="0" step="5" value={armorConstraints.stat_minimums[stat] ?? 0} onChange={(event) => updateArmorConstraints({ ...armorConstraints, stat_minimums: { ...armorConstraints.stat_minimums, [stat]: Math.max(Number(event.target.value) || 0, 0) } })} /></label>)}
          <label><span>+5 模组预算</span><input type="number" min="0" value={armorConstraints.five_point_mod_budget} onChange={(event) => updateArmorConstraints({ ...armorConstraints, five_point_mod_budget: Math.max(Number(event.target.value) || 0, 0) })} /></label>
          <label><span>+10 模组预算</span><input type="number" min="0" value={armorConstraints.ten_point_mod_budget} onChange={(event) => updateArmorConstraints({ ...armorConstraints, ten_point_mod_budget: Math.max(Number(event.target.value) || 0, 0) })} /></label>
        </div>
        <div className="loadout-armor-priority" role="group" aria-label="护甲属性优先级">{loadoutPlanArmorStatKeys.map((stat) => { const selected = armorConstraints.priority_stats.includes(stat); return <label key={stat}><input type="checkbox" checked={selected} onChange={(event) => updateArmorConstraints({ ...armorConstraints, priority_stats: event.target.checked ? [...armorConstraints.priority_stats, stat] : armorConstraints.priority_stats.filter((item) => item !== stat) })} /><span>{armorStatLabel(stat)}优先</span></label>; })}</div>
        {armorUnavailableReasons.length ? <p className="loadout-callout" data-status="warning">{armorUnavailableReasons.join(" ")}</p> : null}
        {armorCandidates.length ? <div className="loadout-armor-candidate-list">{armorCandidates.map((candidate, index) => <button type="button" key={candidate.items.map((item) => item.instance_id).join("-")} className="loadout-armor-candidate" onClick={() => selectArmorCandidate(candidate)}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>属性 {loadoutPlanArmorStatKeys.map((stat) => candidate.final_stats[stat]).join(" / ")}</strong><small>{candidate.items.map((item) => item.name).join(" · ")}</small><small>{candidate.stat_mods.length ? `模组 ${candidate.stat_mods.map((mod) => `${armorStatLabel(mod.stat)} +${mod.value} × ${mod.count}`).join("，")}` : "不需要属性模组"} · 浪费 {candidate.stat_waste} · 转移 {candidate.transfer_count} 件</small></div><em>{candidate.unmet_reasons.length ? candidate.unmet_reasons.join(" ") : "选择此候选"}</em></button>)}</div> : null}
      </section>
    </>
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
  return (
    <li className="loadout-item" data-status={tone}>
      <span className="loadout-item-visual loadout-item-placeholder" aria-hidden="true">{props.target.slot.includes("武器") ? "W" : "A"}</span>
      <div className="loadout-item-copy"><strong>{props.target.slot}</strong><small>{props.target.item_hash ? `目标定义 ${props.target.item_hash}` : "尚未选择目标定义"} · {props.target.plug_hashes.length ? `${props.target.plug_hashes.length} 个目标 Plug` : "未指定目标 Plug"}</small></div>
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
  const [text, setText] = useState("");
  return (
    <section className="loadout-capability-notice" data-status="neutral" aria-label="攻略配装导入">
      <div>
        <strong>从攻略生成草稿</strong>
        <p>解析出的装备要求会与当前账号核对；未提及或无法确认的槽位保持为空，不会自动补全。</p>
        <label className="loadout-dim-url-field"><span>攻略文本</span><textarea value={text} onChange={(event) => setText(event.target.value)} rows={5} placeholder="粘贴攻略正文、视频文案或配装说明" /></label>
      </div>
      <div className="loadout-action-stack">
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onCloseGuideImport}>取消</button>
        <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!text.trim() || !props.activeCharacter || props.localPlanIsImportingGuide} onClick={() => { props.actions.importGuideText(text, props.activeCharacter); props.onCloseGuideImport(); }}>{props.localPlanIsImportingGuide ? "解析中" : "解析并预填"}</button>
      </div>
    </section>
  );
}

function LocalPlanExecutionPanel(props: LoadoutsPageContentViewProps & {
  activeCharacter: AccountSummary["characters"][number] | null;
}) {
  const [publishSlotIndex, setPublishSlotIndex] = useState<number | null>(null);
  const plan = props.localPlanExecutionPlan;
  const report = props.localPlanExecutionReport;
  if (!plan) {
    return <section className="loadout-armor-workbench" aria-label="方案应用"><header><div><strong>方案应用</strong><small>请选择目标角色和真实实例后生成执行计划。</small></div></header></section>;
  }
  return (
    <section className="loadout-armor-workbench" aria-label="方案应用">
      <header><div><strong>方案应用</strong><small>按实例 ID 依次转移、装备和切换可验证 Plug；失败会停止后续步骤并刷新账号。</small></div><button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!props.localPlanEditingId || !plan.executable_steps.length || props.localPlanIsExecuting} onClick={props.actions.executeLocalPlan}>{props.localPlanIsExecuting ? "应用中" : props.localPlanEditingId ? "确认并应用" : "先保存方案"}</button></header>
      {plan.executable_steps.length ? <ol className="loadout-plan-step-list">{plan.executable_steps.map((step, index) => <li key={step.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step.label}</strong></li>)}</ol> : <p className="loadout-callout" data-status="warning">没有可执行步骤。</p>}
      {plan.gaps.length ? <p className="loadout-callout" data-status="warning">未执行缺口：{plan.gaps.join("；")}</p> : null}
      {report ? <p className="loadout-callout" data-status={report.refresh_verified ? "success" : "warning"}>{report.refresh_verified ? `已完成 ${report.completed_steps.length} 步，刷新核对通过。` : report.failed_step ? `已完成 ${report.completed_steps.length} 步；失败：${report.failed_step}。` : `已完成 ${report.completed_steps.length} 步，刷新核对未通过。`}</p> : null}
      {report?.refresh_verified ? <LocalPlanPublishPanel accountSummary={props.accountSummary} targetCharacterId={plan.target_character_id} selectedSlotIndex={publishSlotIndex} onSelectSlot={setPublishSlotIndex} isRunningItemAction={props.isRunningItemAction} onSnapshot={props.actions.snapshotCurrentLoadout} /> : null}
    </section>
  );
}

function LocalPlanPublishPanel(props: {
  accountSummary: AccountSummary | null;
  targetCharacterId: string;
  selectedSlotIndex: number | null;
  onSelectSlot: (index: number) => void;
  isRunningItemAction: boolean;
  onSnapshot: LoadoutsPageActions["snapshotCurrentLoadout"];
}) {
  const character = props.accountSummary?.characters.find((item) => item.character_id === props.targetCharacterId) ?? null;
  const selectedSlot = character?.loadout_slots.find((slot) => slot.index === props.selectedSlotIndex) ?? null;
  if (!character?.loadout_slots.length) return null;
  return (
    <div className="loadout-slot-picker">
      <strong>保存到游戏内槽位</strong>
      <small>方案已应用并经账号刷新核对。选择 Bungie 槽位后才会保存当前角色状态。</small>
      <div className="loadout-slot-picker-list" data-surface="list">
        {character.loadout_slots.map((slot) => <button type="button" key={slot.index} aria-pressed={slot.index === props.selectedSlotIndex} className={slot.index === props.selectedSlotIndex ? "selected" : ""} onClick={() => props.onSelectSlot(slot.index)}><span>{String(slot.index + 1).padStart(2, "0")}</span><span><strong>{slot.name}</strong><small>{slot.item_count ? "覆盖已有槽位" : "空槽"}</small></span></button>)}
      </div>
      <footer><button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!selectedSlot || props.isRunningItemAction} onClick={() => selectedSlot && props.onSnapshot(character, selectedSlot)}>{selectedSlot?.item_count ? "确认覆盖并保存" : "保存到槽位"}</button></footer>
    </div>
  );
}

function LocalPlanSummary(props: LoadoutsPageContentViewProps) {
  const summary = props.localPlanDraft && props.accountSummary
    ? matchLocalLoadoutPlan(props.localPlanDraft, props.accountSummary)
    : null;
  return (
    <>
      <div className="loadout-column-head"><div><strong>方案摘要</strong><small>基于当前账号快照</small></div></div>
      <dl className="loadout-ledger">
        <div><dt>已选实例</dt><dd><b>{summary?.selected_count ?? 0}</b><small>已绑定真实账号实例</small></dd></div>
        <div><dt>等待选择</dt><dd><b>{(summary?.available_count ?? 0) + (summary?.needs_selection_count ?? 0)}</b><small>存在候选，但尚未绑定实例</small></dd></div>
        <div><dt>缺失 / 待确认</dt><dd><b>{(summary?.missing_count ?? 0) + (summary?.plug_unavailable_count ?? 0)}</b><small>账号未找到或目标 Plug 不可用</small></dd></div>
      </dl>
      <p className="loadout-guidance">本地保存不会写入 Bungie。应用前会按真实实例生成计划；DIM 和攻略只会预填草稿，仍需显式保存。</p>
    </>
  );
}

function LoadoutSummaryEmpty() {
  return <div className="loadout-summary-empty"><strong>等待选择</strong><span>选择一个配装后显示可核对的数据和可执行操作。</span></div>;
}

function ItemVisual(props: { icon?: string; label: string; bucketName?: string }) {
  return props.icon
    ? <img className="loadout-item-visual" src={props.icon} alt="" loading="lazy" />
    : <span className="loadout-item-visual loadout-item-placeholder" aria-hidden="true">{props.bucketName?.includes("武器") ? "W" : "A"}</span>;
}

function emptyArmorConstraints(): LoadoutPlanArmorConstraints {
  return {
    stat_minimums: {},
    priority_stats: [],
    fragment_stat_bonuses: {},
    five_point_mod_budget: 0,
    ten_point_mod_budget: 0,
    locked_instance_ids: [],
    excluded_instance_ids: [],
    allowed_locations: ["equipped", "inventory", "vault", "postmaster"]
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
