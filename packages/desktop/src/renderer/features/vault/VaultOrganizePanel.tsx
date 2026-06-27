import type {
  AccountItemSummary,
  VaultTags,
  VaultTagValue
} from "../../api/client";
import { formatVaultItemMeta } from "./VaultListItem";
import {
  type VaultBatchSelectionMode,
  type VaultVisibleSelectionMode,
  getVaultItemKey
} from "./vaultSelection";
import type {
  VaultGroupFilter,
  VaultGroupSummary,
  VaultViewMode
} from "./vaultFilters";
import type { VaultCleanupActions } from "./useVaultBatchActions";

export function VaultOrganizePanel(props: {
  groups: VaultGroupSummary[];
  group: VaultGroupFilter;
  viewMode: VaultViewMode;
  duplicateGroupCount: number;
  isOrganizing: boolean;
  isCleanupMode: boolean;
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
  onViewModeChange: (value: VaultViewMode) => void;
  onToggleOrganizing: () => void;
  onToggleCleanupMode: () => void;
  onVisibleSelectionChange: (mode: VaultVisibleSelectionMode) => void;
  onBatchSelectionChange: (mode: VaultBatchSelectionMode) => void;
  onClearSelection: () => void;
  onCleanupTargetCharacterChange: (value: string) => void;
  onApplyBatchTag: (tag: VaultTagValue) => void | Promise<void>;
  onCopyCleanupList: () => void | Promise<void>;
  onRunSelectedBulkMove: () => void | Promise<void>;
  onRunCleanupAction: (action: "unlock" | "transfer") => void | Promise<void>;
}) {
  return (
    <>
      <div className="vault-content-tabs" role="tablist" aria-label="仓库内容标签">
        {props.groups.map((item) => (
          <button
            className={item.key === props.group ? "vault-content-tab active" : "vault-content-tab"}
            key={item.key}
            role="tab"
            aria-selected={item.key === props.group}
            type="button"
            onClick={() => props.onGroupChange(item.key)}
          >
            <strong>{item.label}</strong>
            <span>{item.count}</span>
          </button>
        ))}
      </div>
      <div className="vault-organize-bar">
        <button
          type="button"
          className={props.viewMode === "duplicates" ? "secondary-button active" : "secondary-button"}
          aria-busy={false}
          onClick={() => props.onViewModeChange(props.viewMode === "duplicates" ? "list" : "duplicates")}
        >
          同名对比 {props.duplicateGroupCount}
        </button>
        <button
          type="button"
          className={props.isOrganizing ? "secondary-button" : ""}
          aria-busy={false}
          onClick={props.onToggleOrganizing}
        >
          {props.isOrganizing ? "退出整理" : "整理模式"}
        </button>
        <button
          type="button"
          className={props.isCleanupMode ? "secondary-button active" : "secondary-button"}
          aria-busy={false}
          onClick={props.onToggleCleanupMode}
        >
          {props.isCleanupMode ? "退出清理" : "清理模式"}
        </button>
        {props.isOrganizing ? (
          <>
            <button type="button" onClick={() => props.onVisibleSelectionChange("replace")}>全选当前结果 {props.filteredItemCount}</button>
            <button type="button" onClick={() => props.onVisibleSelectionChange("append")}>追加当前结果 {props.filteredItemCount}</button>
            <button type="button" className="secondary-button" onClick={() => props.onVisibleSelectionChange("remove")}>移除当前结果</button>
            <button type="button" onClick={() => props.onBatchSelectionChange("junk")}>选择可清理</button>
            <button type="button" onClick={() => props.onBatchSelectionChange("review")}>选择复查</button>
            <button type="button" onClick={() => props.onBatchSelectionChange("farm")}>选择待刷</button>
            <button type="button" onClick={() => props.onBatchSelectionChange("loadout")}>选择配装用</button>
            <button type="button" onClick={() => props.onBatchSelectionChange("target")}>选择目标命中</button>
            <button type="button" onClick={() => props.onBatchSelectionChange("untagged")}>选择未标记</button>
            <button type="button" onClick={() => props.onBatchSelectionChange("noted")}>选择有备注</button>
            <button type="button" className="secondary-button" onClick={props.onClearSelection}>清空</button>
          </>
        ) : null}
      </div>
      {props.isOrganizing ? (
        <div className="vault-batch-panel">
          <span>{props.isBatchSaving && props.activeBatchAction ? `${props.activeBatchAction}...` : props.selectionSummary}</span>
          <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || props.isBatchSaving} onClick={() => void props.onApplyBatchTag("review")}>
            {props.isBatchSaving && props.activeBatchAction === "批量关注" ? "处理中..." : "批量关注"}
          </button>
          <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || props.isBatchSaving} onClick={() => void props.onApplyBatchTag("junk")}>
            {props.isBatchSaving && props.activeBatchAction === "批量可清理" ? "处理中..." : "批量可清理"}
          </button>
          <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || props.isBatchSaving} onClick={() => void props.onApplyBatchTag("farm")}>
            {props.isBatchSaving && props.activeBatchAction === "批量待刷" ? "处理中..." : "批量待刷"}
          </button>
          <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || props.isBatchSaving} onClick={() => void props.onApplyBatchTag("loadout")}>
            {props.isBatchSaving && props.activeBatchAction === "批量配装用" ? "处理中..." : "批量配装用"}
          </button>
          <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || props.isBatchSaving} onClick={() => void props.onApplyBatchTag("none")}>
            {props.isBatchSaving && props.activeBatchAction === "批量清除" ? "处理中..." : "批量清除"}
          </button>
          <button type="button" aria-busy={props.isBatchSaving} disabled={props.isBatchSaving} onClick={() => void props.onCopyCleanupList()}>
            {props.isBatchSaving ? "处理中..." : "复制清理清单"}
          </button>
          {props.cleanupActions ? (
            <>
              <label className="compact-field">
                目标角色
                <select value={props.cleanupTargetCharacterId} onChange={(event) => props.onCleanupTargetCharacterChange(event.target.value)}>
                  {props.cleanupActions.currentCharacterId ? (
                    <option value={props.cleanupActions.currentCharacterId}>
                      当前角色{props.cleanupActions.currentCharacterLabel ? ` / ${props.cleanupActions.currentCharacterLabel}` : ""}
                    </option>
                  ) : null}
                  {props.cleanupCharacters
                    .filter((character) => character.character_id !== props.cleanupActions?.currentCharacterId)
                    .map((character) => (
                      <option key={character.character_id} value={character.character_id}>
                        {character.class_name} / 光等 {character.light ?? "-"}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                aria-busy={props.isBatchSaving}
                disabled={!props.selectedItemCount || !props.cleanupTargetCharacterId || props.isBatchSaving || !props.cleanupActions.writeActionsEnabled}
                onClick={() => void props.onRunSelectedBulkMove()}
              >
                {props.isBatchSaving && props.activeBatchAction === "批量移动" ? "处理中..." : "批量移动"}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {props.isCleanupMode ? (
        <div className="vault-cleanup-panel">
          <div>
            <strong>清理准备</strong>
            <p>
              已标记 {props.markedCleanupItemCount} 件可清理。不会分解装备，只会把装备解锁并转移到角色背包，最后仍需进游戏手动分解。
            </p>
          </div>
          {props.cleanupCharacters.length ? (
            <label className="compact-field">
              接收角色
              <select value={props.cleanupTargetCharacterId} onChange={(event) => props.onCleanupTargetCharacterChange(event.target.value)}>
                {props.cleanupCharacters.map((character) => (
                  <option key={character.character_id} value={character.character_id}>
                    {character.class_name} / 光等 {character.light ?? "-"}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="status-message status-neutral">请先读取账号角色数据。</p>
          )}
          <div className="vault-cleanup-actions">
            <span>本次处理 {props.cleanupActionItems.length} 件</span>
            <button type="button" className="secondary-button" aria-busy={props.isBatchSaving} disabled={props.isBatchSaving} onClick={() => void props.onCopyCleanupList()}>
              {props.isBatchSaving ? "处理中..." : "复制清理清单"}
            </button>
            <button
              type="button"
              aria-busy={props.isBatchSaving}
              disabled={!props.cleanupActionItems.length || !props.cleanupActions?.writeActionsEnabled || !props.cleanupTargetCharacterId || props.isBatchSaving}
              onClick={() => void props.onRunCleanupAction("unlock")}
            >
              {props.isBatchSaving ? "处理中..." : "批量解锁"}
            </button>
            <button
              type="button"
              aria-busy={props.isBatchSaving}
              disabled={!props.cleanupActionItems.length || !props.cleanupActions?.writeActionsEnabled || !props.cleanupTargetCharacterId || props.isBatchSaving}
              onClick={() => void props.onRunCleanupAction("transfer")}
            >
              {props.isBatchSaving ? "处理中..." : "转移到角色背包"}
            </button>
          </div>
          {!props.cleanupActions?.writeActionsEnabled ? (
            <p className="status-message status-warning">写操作未开启。需要到设置页开启后，才能批量解锁或转移装备。</p>
          ) : null}
          <p className="muted-copy">提示：游戏里看不到 d2-tools 的本地标记；转移到角色背包后，可以按这份清单在游戏里逐件分解。</p>
          {props.cleanupActionItems.length ? (
            <div className="vault-cleanup-locator">
              <strong>游戏内定位</strong>
              <p>先转移到目标角色背包，再按位置、光等、锁定状态和 Perk 核对。同名装备很多时，这些信息比只看名字更可靠。</p>
              <ul>
                {props.cleanupActionItems.slice(0, 8).map((item) => {
                  const key = getVaultItemKey(item);
                  const note = props.tags.items[key]?.note;
                  const plugText = item.socket_plugs?.map((plug) => plug.name).filter(Boolean).slice(0, 3).join(" / ");
                  return (
                    <li key={key}>
                      <b>{item.name}</b>
                      <small>{formatVaultItemMeta(item) || "未知位置"}{plugText ? ` / ${plugText}` : ""}</small>
                      {note ? <small>备注：{note}</small> : null}
                    </li>
                  );
                })}
              </ul>
              {props.cleanupActionItems.length > 8 ? <span>还有 {props.cleanupActionItems.length - 8} 件，复制清单可查看完整定位信息。</span> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
