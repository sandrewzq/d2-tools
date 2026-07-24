import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { VaultTags, VaultTagValue } from "@d2-tools/core/vault/tags";
import { formatVaultItemMeta } from "./VaultListItem.js";
import { type VaultBatchSelectionMode, type VaultVisibleSelectionMode, getVaultItemKey } from "@d2-tools/app/vault";
import type { VaultGroupFilter, VaultGroupSummary } from "@d2-tools/app/vault";
import type { VaultCleanupActions } from "./useVaultBatchActions.js";

export function VaultOrganizePanel(props: {
  groups: VaultGroupSummary[];
  group: VaultGroupFilter;
  isOrganizing: boolean;
  filteredItemCount: number;
  selectedItemCount: number;
  selectionSummary: string;
  activeBatchAction: string;
  isBatchSaving: boolean;
  cleanupActions?: VaultCleanupActions;
  cleanupCharacters: VaultCleanupActions["characters"];
  cleanupTargetCharacterId: string;
  markedCleanupItemCount: number;
  cleanupActionItems: AccountItemSummary[];
  tags: VaultTags;
  onGroupChange: (value: VaultGroupFilter) => void;
  onToggleOrganizing: () => void;
  onVisibleSelectionChange: (mode: VaultVisibleSelectionMode) => void;
  onBatchSelectionChange: (mode: VaultBatchSelectionMode) => void;
  onClearSelection: () => void;
  onCleanupTargetCharacterChange: (value: string) => void;
  onApplyBatchTag: (tag: VaultTagValue) => void | Promise<void>;
  onCopyCleanupList: () => void | Promise<void>;
  onRunSelectedBulkMove: () => void | Promise<void>;
  onRunCleanupAction: (action: "unlock" | "transfer") => void | Promise<void>;
}) {
  const canWrite = Boolean(props.cleanupActions?.writeActionsEnabled && props.cleanupTargetCharacterId && props.cleanupActionItems.length);

  return (
    <div className="vault-organize-panel">
      <div className="vault-organize-bar">
        <div className="mode-tabs" role="tablist" aria-label="仓库整理模式">
          <button type="button" className={!props.isOrganizing ? "active" : ""} onClick={() => props.isOrganizing && props.onToggleOrganizing()}>整理模式</button>
          <button type="button" className={props.isOrganizing ? "active" : ""} onClick={() => !props.isOrganizing && props.onToggleOrganizing()}>选择候选</button>
        </div>
        <label className="compact-field vault-organize-field">
          <select aria-label="筛选范围" value={props.group} onChange={(event) => props.onGroupChange(event.target.value as VaultGroupFilter)}>
            {props.groups.map((item) => <option key={item.key} value={item.key}>{item.label} {item.count}</option>)}
          </select>
        </label>
        {props.isOrganizing ? (
          <>
            <button type="button" onClick={() => props.onVisibleSelectionChange("replace")}>选择当前 {props.filteredItemCount} 件</button>
            <label className="compact-field vault-organize-field">
              <select aria-label="快速选择候选" value="" onChange={(event) => event.target.value && props.onBatchSelectionChange(event.target.value as VaultBatchSelectionMode)}>
                <option value="">选择候选...</option>
                <option value="junk">可清理</option>
                <option value="review">复查</option>
                <option value="farm">待刷</option>
                <option value="loadout">配装用</option>
                <option value="target">本地目标命中</option>
                <option value="untagged">未标记</option>
                <option value="noted">有备注</option>
              </select>
            </label>
            <button type="button" className="secondary-button" onClick={props.onClearSelection}>清空选择</button>
          </>
        ) : null}
        {props.cleanupCharacters.length ? (
          <label className="compact-field vault-organize-field">
            <select aria-label="接收角色" value={props.cleanupTargetCharacterId} onChange={(event) => props.onCleanupTargetCharacterChange(event.target.value)}>
              {props.cleanupCharacters.map((character) => <option key={character.character_id} value={character.character_id}>{character.class_name} / 光等 {character.light ?? "-"}</option>)}
            </select>
          </label>
        ) : null}
        <button type="button" className="secondary-button" aria-busy={props.isBatchSaving} disabled={props.isBatchSaving} onClick={() => void props.onCopyCleanupList()}>
          {props.isBatchSaving ? "处理中..." : "复制清理清单"}
        </button>
        <button type="button" aria-busy={props.isBatchSaving} disabled={!canWrite || props.isBatchSaving} onClick={() => void props.onRunCleanupAction("unlock")}>批量解锁</button>
        <button type="button" className="primary-button" aria-busy={props.isBatchSaving} disabled={!canWrite || props.isBatchSaving} onClick={() => void props.onRunCleanupAction("transfer")}>转移到角色背包</button>
      </div>

      {props.isOrganizing ? (
        <div className="vault-batch-panel">
          <span>{props.isBatchSaving && props.activeBatchAction ? `${props.activeBatchAction}...` : props.selectionSummary}</span>
          <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || props.isBatchSaving} onClick={() => void props.onApplyBatchTag("review")}>批量关注</button>
          <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || props.isBatchSaving} onClick={() => void props.onApplyBatchTag("junk")}>批量可清理</button>
          <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || props.isBatchSaving} onClick={() => void props.onApplyBatchTag("farm")}>批量待刷</button>
          <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || props.isBatchSaving} onClick={() => void props.onApplyBatchTag("loadout")}>批量配装用</button>
          <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || props.isBatchSaving} onClick={() => void props.onApplyBatchTag("none")}>清除标记</button>
          {props.cleanupActions ? <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || !props.cleanupTargetCharacterId || props.isBatchSaving || !props.cleanupActions.writeActionsEnabled} onClick={() => void props.onRunSelectedBulkMove()}>批量移动</button> : null}
        </div>
      ) : null}

      {!props.cleanupActions?.writeActionsEnabled ? <p className="vault-cleanup-warning">写操作未开启。需要到设置页开启后，才能批量解锁或转移装备。</p> : null}
      <p className="vault-cleanup-boundary">已标记 {props.markedCleanupItemCount} 件可清理。不会自动拆解；转移到角色背包后，仍需在游戏内逐件确认。</p>

      {props.cleanupActionItems.length ? (
        <details className="vault-cleanup-locator">
          <summary>游戏内定位 · 本次处理 {props.cleanupActionItems.length} 件</summary>
          <p>按位置、光等、锁定状态和 Perk 核对；同名装备很多时，这些信息比只看名字更可靠。</p>
          <ul>
            {props.cleanupActionItems.slice(0, 8).map((item) => {
              const key = getVaultItemKey(item);
              const note = props.tags.items[key]?.note;
              const plugText = item.socket_plugs?.map((plug) => plug.name).filter(Boolean).slice(0, 3).join(" / ");
              return <li key={key}><b>{item.name}</b><small>{formatVaultItemMeta(item) || "未知位置"}{plugText ? ` / ${plugText}` : ""}</small>{note ? <small>备注：{note}</small> : null}</li>;
            })}
          </ul>
          {props.cleanupActionItems.length > 8 ? <span>还有 {props.cleanupActionItems.length - 8} 件，复制清单可查看完整定位信息。</span> : null}
        </details>
      ) : null}
    </div>
  );
}
