import { evaluateLocalTargets } from "@d2-tools/core/analysis/targets";
import { evaluateEquipmentTargets } from "@d2-tools/core/targets/equipmentTargets";
import type { ItemDetailCopy } from "@d2-tools/ui";
import { itemDetailTemplate, itemDetailText } from "@d2-tools/ui";
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
  copy: ItemDetailCopy;
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
  const copy = props.copy;

  return (
    <section className="item-detail-tool-area item-tool-panel" aria-label={itemDetailText(copy, "装备详情工具区")}>
      <div className="item-detail-tool-grid">
        <section className="item-detail-tool-section item-detail-tool-overview">
          <h3>{itemDetailText(copy, "概览")}</h3>
          <ItemDetailOverview copy={copy} selectedItem={selectedItem} />
          <ItemDetailTargetMatch
            copy={copy}
            localTargetRules={props.localTargetRules}
            equipmentTargetStore={props.equipmentTargetStore}
            selectedItem={selectedItem}
            vaultTags={props.vaultTags}
            onCopyTargetInsight={props.onCopyTargetInsight}
            onSaveSelectedItemTag={props.onSaveSelectedItemTag}
          />
          <ItemDetailPerks copy={copy} selectedItem={selectedItem} />
        </section>
        <section className="item-detail-tool-section item-detail-tool-compare">
          <ItemDetailSameName
            copy={copy}
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
          <h3>{itemDetailText(copy, "操作")}</h3>
          <ItemLocalTagPanel
            copy={copy}
            selectedItem={selectedItem}
            vaultTags={props.vaultTags}
            onSaveSelectedItemTag={props.onSaveSelectedItemTag}
          />
          <ItemNotePanel
            copy={copy}
            itemNoteDraft={props.itemNoteDraft}
            itemNoteMessage={props.itemNoteMessage}
            onSaveSelectedItemNote={props.onSaveSelectedItemNote}
            onSetItemNoteDraft={props.onSetItemNoteDraft}
          />
          <ItemDetailActions
            accountSummary={props.accountSummary}
            copy={copy}
            isRunningItemAction={props.isRunningItemAction}
            selectedActionCharacterId={props.selectedActionCharacterId}
            selectedItem={selectedItem}
            onCopyItemActionPlanText={props.onCopyItemActionPlanText}
            onRunItemWriteAction={props.onRunItemWriteAction}
            onSelectedActionCharacterIdChange={props.onSelectedActionCharacterIdChange}
          />
          <ItemDetailAi
            copy={copy}
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

function ItemDetailOverview(props: { copy: ItemDetailCopy; selectedItem: SelectedItemDetail }) {
  const selectedItem = props.selectedItem;
  const copy = props.copy;
  const sourceTone = getItemSourceStatusTone(selectedItem);

  return (
    <>
      {selectedItem.is_detail_loading ? (
        <section className="source-status-card source-status-pending item-detail-loading" aria-live="polite">
          <span className="source-status-badge source-status-pending">{itemDetailText(copy, "详情加载")}</span>
          <strong>{itemDetailText(copy, "正在打开详情...")}</strong>
          <span>{itemDetailText(copy, "先显示基础信息，来源、perk 和详细说明会继续加载。")}</span>
        </section>
      ) : null}
      {selectedItem.description ? <p className="item-detail-description">{selectedItem.description}</p> : null}
      <section className={`source-status-card source-status-${sourceTone} daily-source ${selectedItem.is_detail_loading ? "item-detail-loading" : "source-ready"}`}>
        <span className={`source-status-badge source-status-${sourceTone}`}>
          {selectedItem.is_detail_loading ? itemDetailText(copy, "来源读取中") : itemDetailText(copy, "来源")}
        </span>
        <strong>{selectedItem.source.label}</strong>
        <span>{selectedItem.source.description}</span>
      </section>
    </>
  );
}

function ItemDetailTargetMatch(props: {
  copy: ItemDetailCopy;
  localTargetRules: LocalTargetRules;
  equipmentTargetStore: EquipmentTargetStore;
  selectedItem: SelectedItemDetail;
  vaultTags: VaultTags;
  onCopyTargetInsight: () => void;
  onSaveSelectedItemTag: (tag: VaultTagValue) => void;
}) {
  const copy = props.copy;
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
  const matchSources = formatTargetMatchSources(copy, {
    localTargetMatched: localTarget.matched,
    equipmentTargetMatched: equipmentTarget.matched
  });

  return (
    <section className="target-match-panel matched">
      <div className="target-match-header">
        <span className="source-status-badge source-status-ready">{itemDetailText(copy, "目标命中")}</span>
        <strong>{equipmentTarget.matched ? itemDetailText(copy, "装备目标命中") : itemDetailText(copy, "本地目标命中")}</strong>
      </div>
      <div className="target-match-meta">
        <span>{itemDetailTemplate(copy, "命中来源：{value}", { value: matchSources.join(" / ") })}</span>
        <span>{itemDetailTemplate(copy, "本地标记：{value}", { value: formatVaultTagLabel(copy, tag) })}</span>
        {localTarget.matched ? <span>{localTarget.labels.join(" / ")}</span> : null}
        {equipmentTarget.matched ? <span>{equipmentTarget.labels.join(" / ")}</span> : null}
      </div>
      <ul>
        {localTarget.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        {equipmentTarget.reasons.map((reason) => <li key={reason}>{reason}</li>)}
      </ul>
      <div className="button-row">
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onCopyTargetInsight}>
          {itemDetailText(copy, "复制命中结论")}
        </button>
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onSaveSelectedItemTag("farm")}>{itemDetailText(copy, "标记待刷")}</button>
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onSaveSelectedItemTag("loadout")}>{itemDetailText(copy, "标记配装用")}</button>
      </div>
      <small>{equipmentTarget.matched ? equipmentTarget.disclaimer : localTarget.disclaimer}</small>
      <small>{itemDetailText(copy, "命中后不会自动收藏、加标签或改动装备；你需要手动选择标记或写操作。")}</small>
    </section>
  );
}

function formatTargetMatchSources(copy: ItemDetailCopy, input: {
  localTargetMatched: boolean;
  equipmentTargetMatched: boolean;
}): string[] {
  const sources = [];
  if (input.localTargetMatched) {
    sources.push(itemDetailText(copy, "本地目标规则"));
  }
  if (input.equipmentTargetMatched) {
    sources.push(itemDetailText(copy, "装备目标库"));
  }
  return sources.length ? sources : [itemDetailText(copy, "未命中")];
}

function ItemLocalTagPanel(props: {
  copy: ItemDetailCopy;
  selectedItem: SelectedItemDetail;
  vaultTags: VaultTags;
  onSaveSelectedItemTag: (tag: VaultTagValue) => void;
}) {
  const copy = props.copy;
  const currentTag = props.vaultTags.items[props.selectedItem.item_key]?.tag ?? "none";

  return (
    <section className="item-local-tag-panel">
      <div className="item-local-tag-header">
        <span>{itemDetailText(copy, "本地标记")}</span>
        <strong className={`vault-tag-current tag-${currentTag}`}>
          {formatVaultTagLabel(copy, currentTag)}
        </strong>
      </div>
      <div className="button-row">
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onSaveSelectedItemTag("keep")}>{formatVaultTagLabel(copy, "keep")}</button>
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onSaveSelectedItemTag("review")}>{formatVaultTagLabel(copy, "review")}</button>
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onSaveSelectedItemTag("farm")}>{formatVaultTagLabel(copy, "farm")}</button>
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onSaveSelectedItemTag("loadout")}>{formatVaultTagLabel(copy, "loadout")}</button>
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onSaveSelectedItemTag("junk")}>{formatVaultTagLabel(copy, "junk")}</button>
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onSaveSelectedItemTag("none")}>{itemDetailText(copy, "清除")}</button>
      </div>
    </section>
  );
}

function ItemNotePanel(props: {
  copy: ItemDetailCopy;
  itemNoteDraft: string;
  itemNoteMessage: string;
  onSaveSelectedItemNote: () => void;
  onSetItemNoteDraft: (value: string) => void;
}) {
  const copy = props.copy;

  return (
    <section className="item-note-panel">
      <label htmlFor="item-note-draft">{itemDetailText(copy, "本地备注")}</label>
      <textarea
        id="item-note-draft"
        value={props.itemNoteDraft}
        onChange={(event) => props.onSetItemNoteDraft(event.target.value)}
        placeholder={itemDetailText(copy, "例如：留给电猎清杂 / 等队友复查 PVP 手感 / 同名已有更好 roll")}
        rows={3}
      />
      <div className="button-row">
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onSaveSelectedItemNote}>
          {itemDetailText(copy, "保存备注")}
        </button>
        {props.itemNoteMessage ? <span className="muted-copy">{props.itemNoteMessage}</span> : null}
      </div>
    </section>
  );
}
