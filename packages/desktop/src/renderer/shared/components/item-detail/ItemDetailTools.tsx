import { evaluateLocalTargets } from "@d2-tools/core/analysis/targets";
import { evaluateEquipmentTargets } from "@d2-tools/core/targets/equipmentTargets";
import type {
  AccountSummary,
  EquipmentTargetStore,
  ItemActionPlanInput,
  ItemActionResult,
  ItemAiAdviceResult,
  LocalTargetRules,
  VaultTags,
  VaultTagValue
} from "../../../api/types";
import type {
  SameNameItemSummary,
  SelectedItemDetail,
  SelectedItemSource
} from "../../hooks/useItemDetail";
import { selectedItemToAccountItem } from "@d2-tools/app/items";
import type { buildDuplicateGroupBatchTagPlan } from "../../domain/vault/vaultCleanup";
import type { ItemWriteActionOptions, ItemWriteActionOutcome } from "../../hooks/useItemDetailWorkspace";
import {
  formatVaultTagLabel,
  getItemSourceStatusTone
} from "./itemDetailFormatters";
import { ItemDetailActions } from "./ItemDetailActions";
import { ItemDetailAi } from "./ItemDetailAi";
import { ItemDetailPerks } from "./ItemDetailPerks";
import { ItemDetailSameName } from "./ItemDetailSameName";

export type ItemDetailToolsProps = {
  accountSummary: AccountSummary | null;
  localTargetRules: LocalTargetRules;
  equipmentTargetStore: EquipmentTargetStore;
  isGeneratingItemAi: boolean;
  isRunningItemAction: boolean;
  itemAiError: string;
  itemAiResult: ItemAiAdviceResult | null;
  itemNoteDraft: string;
  itemNoteMessage: string;
  itemShareMessage: string;
  sameNameItems: SameNameItemSummary[];
  selectedActionCharacterId: string;
  selectedItem: SelectedItemDetail;
  vaultTags: VaultTags;
  onApplySameNameBatchTags: (
    items: SameNameItemSummary[],
    mode: Parameters<typeof buildDuplicateGroupBatchTagPlan>[1]
  ) => void;
  onApplySameNameCurrentKeepTags: (
    items: SameNameItemSummary[],
    currentItemKey: string,
    mode: "keep-current-review-rest" | "keep-current-junk-rest"
  ) => void;
  onCopyItemActionPlanText: (input: ItemActionPlanInput) => void;
  onCopySameNameLocator: (items: SameNameItemSummary[]) => void;
  onCopySelectedItemChatGuide: () => void;
  onCopySelectedItemSummary: () => void;
  onCopyTargetInsight: () => void;
  onGenerateItemAiAdvice: () => void;
  onOpenBestSameNameItem: (items: SameNameItemSummary[]) => void;
  onOpenItemDetail: (item: SameNameItemSummary, source: SelectedItemSource) => void;
  onRunItemWriteAction: (
    label: string,
    action: () => Promise<ItemActionResult>,
    options?: ItemWriteActionOptions
  ) => Promise<ItemWriteActionOutcome>;
  onSaveSelectedItemNote: () => void;
  onSaveSelectedItemTag: (tag: VaultTagValue) => void;
  onSelectedActionCharacterIdChange: (id: string) => void;
  onSetItemNoteDraft: (value: string) => void;
};

export function ItemDetailTools(props: ItemDetailToolsProps) {
  const selectedItem = props.selectedItem;

  return (
    <section className="item-detail-tool-area item-tool-panel" aria-label="装备详情工具区">
      <div className="item-detail-tool-grid">
        <section className="item-detail-tool-section item-detail-tool-overview">
          <h3>概览</h3>
          <ItemDetailOverview selectedItem={selectedItem} />
          <ItemDetailTargetMatch
            localTargetRules={props.localTargetRules}
            equipmentTargetStore={props.equipmentTargetStore}
            selectedItem={selectedItem}
            vaultTags={props.vaultTags}
            onCopyTargetInsight={props.onCopyTargetInsight}
            onSaveSelectedItemTag={props.onSaveSelectedItemTag}
          />
          <ItemDetailPerks selectedItem={selectedItem} />
        </section>
        <section className="item-detail-tool-section item-detail-tool-compare">
          <ItemDetailSameName
            sameNameItems={props.sameNameItems}
            selectedItem={selectedItem}
            vaultTags={props.vaultTags}
            onApplySameNameBatchTags={props.onApplySameNameBatchTags}
            onApplySameNameCurrentKeepTags={props.onApplySameNameCurrentKeepTags}
            onOpenBestSameNameItem={props.onOpenBestSameNameItem}
            onOpenItemDetail={props.onOpenItemDetail}
          />
        </section>
        <section className="item-detail-tool-section item-detail-tool-actions">
          <h3>操作</h3>
          <ItemLocalTagPanel
            selectedItem={selectedItem}
            vaultTags={props.vaultTags}
            onSaveSelectedItemTag={props.onSaveSelectedItemTag}
          />
          <ItemNotePanel
            itemNoteDraft={props.itemNoteDraft}
            itemNoteMessage={props.itemNoteMessage}
            onSaveSelectedItemNote={props.onSaveSelectedItemNote}
            onSetItemNoteDraft={props.onSetItemNoteDraft}
          />
          <ItemDetailActions
            accountSummary={props.accountSummary}
            isRunningItemAction={props.isRunningItemAction}
            selectedActionCharacterId={props.selectedActionCharacterId}
            selectedItem={selectedItem}
            onCopyItemActionPlanText={props.onCopyItemActionPlanText}
            onRunItemWriteAction={props.onRunItemWriteAction}
            onSelectedActionCharacterIdChange={props.onSelectedActionCharacterIdChange}
          />
          <ItemDetailAi
            isGeneratingItemAi={props.isGeneratingItemAi}
            itemAiError={props.itemAiError}
            itemAiResult={props.itemAiResult}
            itemShareMessage={props.itemShareMessage}
            onCopySelectedItemChatGuide={props.onCopySelectedItemChatGuide}
            onCopySelectedItemSummary={props.onCopySelectedItemSummary}
            onGenerateItemAiAdvice={props.onGenerateItemAiAdvice}
          />
        </section>
      </div>
    </section>
  );
}

function ItemDetailOverview(props: { selectedItem: SelectedItemDetail }) {
  const selectedItem = props.selectedItem;
  const sourceTone = getItemSourceStatusTone(selectedItem);

  return (
    <>
      {selectedItem.is_detail_loading ? (
        <section className="source-status-card source-status-pending item-detail-loading" aria-live="polite">
          <span className="source-status-badge source-status-pending">详情加载</span>
          <strong>正在打开详情...</strong>
          <span>先显示基础信息，来源、perk 和详细说明会继续加载。</span>
        </section>
      ) : null}
      {selectedItem.description ? <p className="item-detail-description">{selectedItem.description}</p> : null}
      <section className={`source-status-card source-status-${sourceTone} daily-source ${selectedItem.is_detail_loading ? "item-detail-loading" : "source-ready"}`}>
        <span className={`source-status-badge source-status-${sourceTone}`}>
          {selectedItem.is_detail_loading ? "来源读取中" : "来源"}
        </span>
        <strong>{selectedItem.source.label}</strong>
        <span>{selectedItem.source.description}</span>
      </section>
    </>
  );
}

function ItemDetailTargetMatch(props: {
  localTargetRules: LocalTargetRules;
  equipmentTargetStore: EquipmentTargetStore;
  selectedItem: SelectedItemDetail;
  vaultTags: VaultTags;
  onCopyTargetInsight: () => void;
  onSaveSelectedItemTag: (tag: VaultTagValue) => void;
}) {
  const accountItem = selectedItemToAccountItem(props.selectedItem);
  if (!accountItem) {
    return null;
  }

  const localTarget = evaluateLocalTargets(accountItem, props.localTargetRules);
  const equipmentTarget = evaluateEquipmentTargets(accountItem, props.equipmentTargetStore);

  if (!localTarget.matched && !equipmentTarget.matched) {
    return null;
  }

  const tag = props.vaultTags.items[props.selectedItem.item_key]?.tag ?? "none";
  const matchSources = formatTargetMatchSources({
    localTargetMatched: localTarget.matched,
    equipmentTargetMatched: equipmentTarget.matched
  });

  return (
    <section className="target-match-panel matched">
      <div className="target-match-header">
        <span className="source-status-badge source-status-ready">目标命中</span>
        <strong>{equipmentTarget.matched ? "装备目标命中" : "本地目标命中"}</strong>
      </div>
      <div className="target-match-meta">
        <span>命中来源：{matchSources.join(" / ")}</span>
        <span>本地标记：{formatVaultTagLabel(tag)}</span>
        {localTarget.matched ? <span>{localTarget.labels.join(" / ")}</span> : null}
        {equipmentTarget.matched ? <span>{equipmentTarget.labels.join(" / ")}</span> : null}
      </div>
      <ul>
        {localTarget.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        {equipmentTarget.reasons.map((reason) => <li key={reason}>{reason}</li>)}
      </ul>
      <div className="button-row">
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onCopyTargetInsight}>
          复制命中结论
        </button>
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onSaveSelectedItemTag("farm")}>标记待刷</button>
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onSaveSelectedItemTag("loadout")}>标记配装用</button>
      </div>
      <small>{equipmentTarget.matched ? equipmentTarget.disclaimer : localTarget.disclaimer}</small>
      <small>命中后不会自动收藏、加标签或改动装备；你需要手动选择标记或写操作。</small>
    </section>
  );
}

function formatTargetMatchSources(input: {
  localTargetMatched: boolean;
  equipmentTargetMatched: boolean;
}): string[] {
  const sources = [];
  if (input.localTargetMatched) {
    sources.push("本地目标规则");
  }
  if (input.equipmentTargetMatched) {
    sources.push("装备目标库");
  }
  return sources.length ? sources : ["未命中"];
}

function ItemLocalTagPanel(props: {
  selectedItem: SelectedItemDetail;
  vaultTags: VaultTags;
  onSaveSelectedItemTag: (tag: VaultTagValue) => void;
}) {
  const currentTag = props.vaultTags.items[props.selectedItem.item_key]?.tag ?? "none";

  return (
    <section className="item-local-tag-panel">
      <div className="item-local-tag-header">
        <span>本地标记</span>
        <strong className={`vault-tag-current tag-${currentTag}`}>
          {formatVaultTagLabel(currentTag)}
        </strong>
      </div>
      <div className="button-row">
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onSaveSelectedItemTag("keep")}>保留</button>
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onSaveSelectedItemTag("review")}>待定</button>
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onSaveSelectedItemTag("farm")}>待刷</button>
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onSaveSelectedItemTag("loadout")}>配装用</button>
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onSaveSelectedItemTag("junk")}>清理</button>
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onSaveSelectedItemTag("none")}>清除</button>
      </div>
    </section>
  );
}

function ItemNotePanel(props: {
  itemNoteDraft: string;
  itemNoteMessage: string;
  onSaveSelectedItemNote: () => void;
  onSetItemNoteDraft: (value: string) => void;
}) {
  return (
    <section className="item-note-panel">
      <label htmlFor="item-note-draft">本地备注</label>
      <textarea
        id="item-note-draft"
        value={props.itemNoteDraft}
        onChange={(event) => props.onSetItemNoteDraft(event.target.value)}
        placeholder="例如：留给电猎清杂 / 等队友复查 PVP 手感 / 同名已有更好 roll"
        rows={3}
      />
      <div className="button-row">
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onSaveSelectedItemNote}>
          保存备注
        </button>
        {props.itemNoteMessage ? <span className="muted-copy">{props.itemNoteMessage}</span> : null}
      </div>
    </section>
  );
}
