import { useEffect, useId, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type {
  InGameLoadoutItemRowView,
  LoadoutEntryView,
  LoadoutTemplateItemRowView,
  LoadoutsPageModel
} from "@d2-tools/app/loadouts";
import type { AccountSummary } from "@d2-tools/core/account/summary";
import type { LoadoutTemplate } from "@d2-tools/core/loadouts/templates";
import type { LoadoutTemplateAnalysis } from "@d2-tools/core/loadouts/analysis";
import { getLoadoutActionButtonLabel, type LoadoutActionFeedbackState } from "./loadoutActionFeedback.js";
import type { InterfaceLocale } from "../i18n/types.js";
import {
  ProductWorkspaceEmptyState,
  ProductWorkspaceSideRail,
  ProductWorkspaceSplit
} from "../workspace/ProductWorkspace.js";

export type LoadoutsPageActions = {
  selectEntry: (entryId: string) => void;
  selectTemplate: (id: string) => void;
  selectCompareTemplate: (id: string) => void;
  renameDraftChange: (value: string) => void;
  showDiffOnlyChange: (value: boolean) => void;
  renameTemplate: (template: LoadoutTemplate) => void;
  deleteTemplate: (id: string) => void;
  createLocalPlanFromCharacter: (character: AccountSummary["characters"][number]) => void;
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
};

type LoadoutMode = "in-game" | "local";

const loadoutModes: LoadoutMode[] = ["in-game", "local"];

export function LoadoutsPageContentView(props: LoadoutsPageContentViewProps) {
  const [mode, setMode] = useState<LoadoutMode>("in-game");
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [isDimImportNoticeVisible, setIsDimImportNoticeVisible] = useState(false);
  const tabId = useId();
  const panelId = `${tabId}-panel`;
  const characters = props.accountSummary?.characters ?? [];
  const activeCharacterId = selectedCharacterId || characters[0]?.character_id || "";
  const activeCharacter = characters.find((character) => character.character_id === activeCharacterId) ?? null;
  const inGameEntries = useMemo(
    () => props.model.entries.filter((entry) => entry.source === "in-game" && entry.characterId === activeCharacterId),
    [activeCharacterId, props.model.entries]
  );
  const localEntries = useMemo(
    () => props.model.entries.filter((entry) => entry.source === "local-template"),
    [props.model.entries]
  );

  useEffect(() => {
    if (mode !== "in-game" || !inGameEntries.length) return;
    if (props.model.selectedDetail.kind === "in-game-slot" && props.model.selectedDetail.characterId === activeCharacterId) return;
    props.actions.selectEntry(inGameEntries[0].id);
  }, [activeCharacterId, inGameEntries, mode, props.actions, props.model.selectedDetail]);

  useEffect(() => {
    if (mode !== "local" || !localEntries.length || props.model.selectedDetail.kind === "local-template") return;
    selectLocalEntry(props, localEntries[0]);
  }, [localEntries, mode, props.actions, props.model.selectedDetail]);

  function selectMode(nextMode: LoadoutMode) {
    setMode(nextMode);
    if (nextMode === "in-game" && inGameEntries[0]) {
      props.actions.selectEntry(inGameEntries[0].id);
    }
    if (nextMode === "local" && localEntries[0]) {
      selectLocalEntry(props, localEntries[0]);
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

  const statusTone = props.message.includes("失败") ? "error" : props.isRunningItemAction ? "running" : "ready";
  const statusTitle = props.isRunningItemAction ? "处理中" : props.message ? "操作状态" : "就绪";
  const statusMessage = props.message || (mode === "in-game"
    ? "选择游戏内配装槽位后再应用或保存当前装备。"
    : "本地方案只保存在本机，保存不会写入 Bungie 槽位。");

  return (
    <section className="loadout-page" aria-label="配装工作台">
      <div className="loadout-character-tabs" data-ui-kind="context-switcher" aria-label="配装角色上下文">
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
        {characters.length ? (
          <span className="loadout-character-context">
            当前查看：{activeCharacter?.class_name ?? "角色"}的{mode === "in-game" ? "游戏内配装" : "本地配装方案"}
          </span>
        ) : null}
      </div>

      <div className="loadout-mode-bar">
        <div className="loadout-mode-tabs" data-ui-kind="segmented-control" role="tablist" aria-label="配装类型">
          <button id={`${tabId}-in-game`} type="button" role="tab" aria-controls={panelId} aria-selected={mode === "in-game"} tabIndex={mode === "in-game" ? 0 : -1} className={mode === "in-game" ? "active" : ""} onKeyDown={handleModeKeyDown} onClick={() => selectMode("in-game")}>游戏内配装 <span>Bungie</span></button>
          <button id={`${tabId}-local`} type="button" role="tab" aria-controls={panelId} aria-selected={mode === "local"} tabIndex={mode === "local" ? 0 : -1} className={mode === "local" ? "active" : ""} onKeyDown={handleModeKeyDown} onClick={() => selectMode("local")}>本地配装方案 <span>本机</span></button>
        </div>
        {mode === "local" ? (
          <div className="loadout-mode-actions">
            <button type="button" className="secondary-button" onClick={() => setIsDimImportNoticeVisible(true)}>导入 DIM 配装</button>
            <button type="button" className="primary-button" disabled={!activeCharacter} onClick={() => activeCharacter && props.actions.createLocalPlanFromCharacter(activeCharacter)}>新建本地方案</button>
          </div>
        ) : null}
      </div>

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
            entries={localEntries}
            isDimImportNoticeVisible={isDimImportNoticeVisible}
            onDismissDimImportNotice={() => setIsDimImportNoticeVisible(false)}
          />
        )}
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
            isRunningItemAction={props.isRunningItemAction}
            actions={props.actions}
            onOpenSlotPicker={() => setIsSlotPickerVisible((visible) => !visible)}
          />
        ) : (
          <div className="loadout-empty-detail-head">
            <ProductWorkspaceEmptyState><h2>没有可查看的游戏内配装</h2><p>当前角色没有包含装备的 Bungie 配装槽位，仍可把当前装备保存到任意真实槽位。</p></ProductWorkspaceEmptyState>
            {props.activeCharacter && slots.length ? <button type="button" className="primary-button" disabled={props.isRunningItemAction} onClick={() => setIsSlotPickerVisible((visible) => !visible)}>保存当前配装</button> : null}
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
          <button type="button" className="primary-button" disabled={props.isRunningItemAction} onClick={() => props.actions.equipSavedLoadout(character, slot)}>应用游戏内配装</button>
          <button type="button" className="secondary-button" disabled={props.isRunningItemAction} onClick={props.onOpenSlotPicker}>保存当前配装</button>
        </div>
      </header>
      <div className="loadout-section-label"><span>保存的装备 · 当前账号状态</span><span>{slot.items.length} 件记录</span></div>
      {props.detail.itemRows.length ? (
        <ul className="loadout-in-game-item-list" data-surface="list">
          {props.detail.itemRows.map((row, index) => <InGameLoadoutItemRow key={`${character.character_id}-${slot.index}-${row.item.instance_id ?? index}`} row={row} />)}
        </ul>
      ) : <ProductWorkspaceEmptyState><h3>当前槽位为空</h3><p>可以把当前角色已装备的物品保存到此槽位。</p></ProductWorkspaceEmptyState>}
      <footer className="loadout-detail-footer"><p>应用时直接调用 Bungie 槽位，d2-tools 不会预先转移或逐件装备。</p></footer>
    </>
  );
}

function InGameLoadoutItemRow(props: { row: InGameLoadoutItemRowView }) {
  const { item, locatedItem, located, locationLabel } = props.row;
  return (
    <li data-status={located ? "success" : "warning"}>
      <ItemVisual icon={locatedItem?.icon} label={item.name} bucketName={item.bucket_name} />
      <span><strong>{item.name}</strong><small>{[item.bucket_name || "未知槽位", locationLabel].join(" · ")}</small></span>
      <em data-status={located ? "success" : "warning"}>{located ? "已定位" : "未定位"}</em>
    </li>
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
      <footer><button type="button" className="primary-button" disabled={!props.selectedSlot || props.isRunningItemAction} onClick={() => props.selectedSlot && props.onSave(props.selectedSlot)}>{props.selectedSlot && (props.selectedSlot.item_count > 0 || props.selectedSlot.items.length > 0) ? "确认覆盖" : "保存到槽位"}</button></footer>
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
  entries: LoadoutEntryView[];
  isDimImportNoticeVisible: boolean;
  onDismissDimImportNotice: () => void;
}) {
  const detail = props.model.selectedDetail.kind === "local-template" ? props.model.selectedDetail : null;
  return (
    <ProductWorkspaceSplit className="loadout-workspace loadout-local-workspace">
      <ProductWorkspaceSideRail element="aside" className="loadout-directory">
        <div className="loadout-column-head"><div><strong>本地配装方案</strong><small>{props.entries.length} 个方案 · 本机数据</small></div></div>
        <div className="loadout-entry-list" data-surface="list">
          {props.entries.map((entry) => {
            const selected = props.model.selectedEntryId === entry.id;
            return (
              <button type="button" key={entry.id} aria-pressed={selected} data-status={entry.statusTone} className={`loadout-directory-row ${selected ? "selected" : ""}`} onClick={() => selectLocalEntry(props, entry)}>
                <span className="loadout-directory-index">{entry.statusTone === "warning" ? "!" : "L"}</span>
                <span><strong>{entry.title}</strong><small>{entry.subtitle}</small><small>{formatTimestamp(entry.preview, props.interfaceLocale)}</small></span>
                <em data-status={entry.statusTone}>{entry.statusLabel}</em>
              </button>
            );
          })}
          {!props.entries.length ? <p className="loadout-rail-empty">还没有保存本地方案。可使用当前角色的真实已装备物品创建方案。</p> : null}
        </div>
      </ProductWorkspaceSideRail>

      <section className="loadout-detail">
        {props.isDimImportNoticeVisible ? (
          <div className="loadout-dim-import-notice" data-status="warning"><div><strong>DIM 配装导入尚未接通</strong><p>解析、预览和确认流程完成前不会创建空方案。</p></div><button type="button" className="secondary-button" onClick={props.onDismissDimImportNotice}>关闭</button></div>
        ) : null}
        {detail ? <LocalTemplateDetail {...props} detail={detail} /> : <ProductWorkspaceEmptyState><h2>还没有保存本地方案</h2><p>本地方案用于核对装备、转移缺失件和保留账号外条目。</p></ProductWorkspaceEmptyState>}
      </section>

      <aside className="loadout-summary">
        {detail ? <LocalTemplateSummary detail={detail} /> : <LoadoutSummaryEmpty />}
      </aside>
    </ProductWorkspaceSplit>
  );
}

function selectLocalEntry(props: LoadoutsPageContentViewProps, entry: LoadoutEntryView) {
  props.actions.selectEntry(entry.id);
  if (!entry.templateId) return;
  props.actions.selectTemplate(entry.templateId);
  props.actions.renameDraftChange(entry.title);
}

function LocalTemplateDetail(props: LoadoutsPageContentViewProps & { detail: Extract<LoadoutsPageModel["selectedDetail"], { kind: "local-template" }> }) {
  const { detail, actions } = props;
  const executableCount = detail.statusSummary.find((item) => item.key === "equipped")?.count ?? 0;
  return (
    <>
      <header className="loadout-detail-head">
        <div><span className="loadout-eyebrow">本地配装方案 · {detail.template.class_name || "未限定职业"}</span><h2>{detail.template.name}</h2><p>{detail.template.items.length} 件可执行装备 · 保存方案不会写入 Bungie 槽位</p></div>
        <span className="loadout-detail-status" data-status={detail.transferPlan?.blocked.length ? "warning" : "success"}>{detail.transferPlan?.blocked.length ? `${detail.transferPlan.blocked.length} 件待处理` : `${executableCount} 件已就位`}</span>
      </header>
      <div className="loadout-local-toolbar">
        <label><span>方案名称</span><input value={props.renameDraft} onChange={(event) => actions.renameDraftChange(event.target.value)} aria-label="配装名称" /></label>
        <button type="button" className="secondary-button" onClick={() => actions.renameTemplate(detail.template)}>重命名</button>
        <button type="button" className="secondary-button" onClick={() => actions.createTransferPlan(detail.template)}>生成应用计划</button>
        <button type="button" className="secondary-button" onClick={() => actions.copyMissingItems(detail.template, detail.analysis)}>复制缺失清单</button>
        <button type="button" className="primary-button" disabled={props.isRunningItemAction} onClick={() => actions.executeMissingTransfer(detail.template, detail.analysis)}>按计划应用</button>
      </div>
      {detail.transferPlan?.blocked.length ? <p className="loadout-callout" data-status="warning">有 {detail.transferPlan.blocked.length} 件当前无法自动补齐，具体原因显示在物品行中。</p> : null}
      <div className="loadout-section-label"><span>可执行装备 · 当前账号状态</span><span>{detail.itemRows.length} 件</span></div>
      <ul className="loadout-item-list" data-surface="list">
        {detail.itemRows.map((row, index) => <LoadoutItemRow key={`${detail.template.id}-${row.item.instance_id ?? row.item.hash}-${index}`} row={row} template={detail.template} actions={actions} actionFeedback={props.actionFeedback} isRunningItemAction={props.isRunningItemAction} />)}
      </ul>
      <div className="loadout-compare-controls">
        <label><span>对比方案</span><select value={props.compareTemplateId} onChange={(event) => actions.selectCompareTemplate(event.target.value)}><option value="">不对比</option>{props.model.compare.options.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
        <label className="checkbox-row"><input type="checkbox" checked={props.showDiffOnly} onChange={(event) => actions.showDiffOnlyChange(event.target.checked)} /><span>仅看差异</span></label>
        <button type="button" className="danger-button" onClick={() => actions.deleteTemplate(detail.template.id)}>删除方案</button>
      </div>
    </>
  );
}

function LocalTemplateSummary(props: { detail: Extract<LoadoutsPageModel["selectedDetail"], { kind: "local-template" }> }) {
  const statuses = new Map(props.detail.statusSummary.map((item) => [item.key, item]));
  const ready = statuses.get("equipped")?.count ?? 0;
  const actionable = (statuses.get("vault")?.count ?? 0) + (statuses.get("other-character")?.count ?? 0) + (statuses.get("current-inventory")?.count ?? 0) + (statuses.get("postmaster")?.count ?? 0);
  const blocked = statuses.get("not-found")?.count ?? 0;
  return (
    <>
      <div className="loadout-column-head"><div><strong>应用前核对</strong><small>基于当前账号快照</small></div></div>
      <dl className="loadout-ledger">
        <div><dt>当前已装备</dt><dd><b>{ready}</b><small>目标角色已经就位</small></dd></div>
        <div><dt>可逐件处理</dt><dd><b>{actionable}</b><small>背包、仓库或其他角色中的真实实例</small></dd></div>
        <div><dt>缺失 / 阻塞</dt><dd><b>{blocked}</b><small>账号内未找到或当前无法自动处理</small></dd></div>
      </dl>
      <p className="loadout-guidance">本地方案只将武器与护甲送入应用计划；完整批量应用由后续本地方案模型接入。</p>
    </>
  );
}

function LoadoutSummaryEmpty() {
  return <div className="loadout-summary-empty"><strong>等待选择</strong><span>选择一个配装后显示可核对的数据和可执行操作。</span></div>;
}

function LoadoutItemRow(props: {
  actionFeedback: Record<string, LoadoutActionFeedbackState>;
  isRunningItemAction: boolean;
  row: LoadoutTemplateItemRowView;
  template: LoadoutTemplate;
  actions: LoadoutsPageActions;
}) {
  const { item, status, blockedDetails, sourceItem } = props.row;
  const transferFeedbackState = props.actionFeedback[props.row.transferFeedbackKey] ?? "idle";
  const equipFeedbackState = props.actionFeedback[props.row.equipFeedbackKey] ?? "idle";
  return (
    <li className="loadout-item" data-status={status.badge_tone}>
      <ItemVisual icon={sourceItem?.icon} label={item.name} bucketName={item.bucket_name} />
      <div className="loadout-item-copy"><strong>{item.name}</strong><small>{[status.location_label, item.bucket_name, item.weapon_frame_name, item.perk_names?.slice(0, 2).join(" / ")].filter(Boolean).join(" · ") || "暂无额外信息"}</small>{blockedDetails ? <small className="loadout-blocked-reason">无法自动补齐：{blockedDetails.label} · {blockedDetails.hint}</small> : status.guidance_label ? <small className="loadout-blocked-reason">{status.guidance_label}{status.guidance_hint ? ` · ${status.guidance_hint}` : ""}</small> : null}</div>
      <div className="loadout-item-actions"><span className="loadout-status-badge" data-status={status.badge_tone}>{status.badge_label}</span>{status.key !== "equipped" ? <div className="button-row compact">
        {!blockedDetails && status.key !== "current-inventory" && sourceItem?.instance_id ? <button type="button" className="secondary-button" aria-busy={transferFeedbackState === "pending"} disabled={props.isRunningItemAction} onClick={() => props.actions.executeSingleItemTransfer(props.template, item)}>{getLoadoutActionButtonLabel("transfer", transferFeedbackState)}</button> : null}
        {!blockedDetails && status.key === "current-inventory" ? <button type="button" className="secondary-button" aria-busy={equipFeedbackState === "pending"} disabled={props.isRunningItemAction} onClick={() => props.actions.equipSingleItem(props.template, item)}>{getLoadoutActionButtonLabel("equip", equipFeedbackState)}</button> : null}
        <button type="button" className="secondary-button" onClick={() => props.actions.openTemplateSourceItem(item, props.template.character_id)}>查看来源</button>
      </div> : null}</div>
    </li>
  );
}

function ItemVisual(props: { icon?: string; label: string; bucketName?: string }) {
  return props.icon
    ? <img className="loadout-item-visual" src={props.icon} alt="" loading="lazy" />
    : <span className="loadout-item-visual loadout-item-placeholder" aria-hidden="true">{props.bucketName?.includes("武器") ? "W" : "A"}</span>;
}

function formatTimestamp(value: string, locale?: InterfaceLocale): string {
  if (!value.startsWith("更新于 ")) return value;
  const date = new Date(value.slice("更新于 ".length));
  return Number.isNaN(date.valueOf()) ? value : `更新于 ${date.toLocaleString(locale ?? "zh-CN")}`;
}
