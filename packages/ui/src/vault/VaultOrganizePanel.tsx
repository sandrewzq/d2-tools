import { useState } from "react";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { VaultTags, VaultTagValue } from "@d2-tools/core/vault/tags";
import { formatVaultItemMeta } from "./VaultListItem.js";
import { type VaultBatchSelectionMode, type VaultVisibleSelectionMode, getVaultItemKey } from "@d2-tools/app/vault";
import type { VaultGroupFilter, VaultGroupSummary } from "@d2-tools/app/vault";
import type { VaultCleanupActions } from "./useVaultBatchActions.js";
import { ConfirmationDialog } from "../overlay/ConfirmationDialog.js";

type PendingVaultWrite = "selected-transfer" | "cleanup-unlock" | "cleanup-transfer" | null;

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
  onRunSelectedBulkMove: () => void | Promise<void>;
  onRunCleanupAction: (action: "unlock" | "transfer") => void | Promise<void>;
}) {
  const [pendingWrite, setPendingWrite] = useState<PendingVaultWrite>(null);
  const canWrite = Boolean(props.cleanupActions && props.cleanupTargetCharacterId && props.cleanupActionItems.length);
  const targetCharacterLabel = props.cleanupCharacters.find((character) => character.character_id === props.cleanupTargetCharacterId)?.class_name ?? "目标角色";
  const cleanupTransferCount = props.cleanupActionItems.filter((item) => Boolean(item.instance_id)).length;
  const cleanupUnlockCount = props.cleanupActionItems.filter((item) => Boolean(item.instance_id) && item.locked === true).length;

  function confirmPendingWrite() {
    const action = pendingWrite;
    setPendingWrite(null);
    if (action === "selected-transfer") return props.onRunSelectedBulkMove();
    if (action === "cleanup-unlock") return props.onRunCleanupAction("unlock");
    if (action === "cleanup-transfer") return props.onRunCleanupAction("transfer");
  }

  const pendingWriteCopy = pendingWrite === "selected-transfer"
    ? {
        title: "确认批量移动所选装备？",
        description: `将尝试把所选 ${props.selectedItemCount} 件装备转移到 ${targetCharacterLabel} 背包。`,
        detail: "只处理具有真实实例 ID 且当前允许转移的装备；失败项目会保留在结果反馈中。",
        confirmLabel: "确认移动",
        tone: "primary" as const
      }
    : pendingWrite === "cleanup-unlock"
      ? {
          title: "确认批量解锁装备？",
          description: `将尝试解除 ${cleanupUnlockCount} 件装备的游戏内锁定保护。`,
          detail: "解锁不会拆解装备，但会移除游戏内锁定保护；请确认这些装备确实准备进入后续清理流程。",
          confirmLabel: "确认解锁",
          tone: "danger" as const
        }
      : pendingWrite === "cleanup-transfer"
        ? {
            title: "确认转移可清理装备？",
            description: `将尝试把 ${cleanupTransferCount} 件装备转移到 ${targetCharacterLabel} 背包。`,
            detail: "应用不会自动拆解；转移后仍需在游戏内逐件核对并处理。",
            confirmLabel: "确认转移",
            tone: "primary" as const
          }
        : null;

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
            <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onClearSelection}>清空选择</button>
          </>
        ) : null}
        {props.cleanupCharacters.length ? (
          <label className="compact-field vault-organize-field">
            <select aria-label="接收角色" value={props.cleanupTargetCharacterId} onChange={(event) => props.onCleanupTargetCharacterChange(event.target.value)}>
              {props.cleanupCharacters.map((character) => <option key={character.character_id} value={character.character_id}>{character.class_name} / 光等 {character.light ?? "-"}</option>)}
            </select>
          </label>
        ) : null}
        <button type="button" aria-busy={props.isBatchSaving} disabled={!canWrite || !cleanupUnlockCount || props.isBatchSaving} onClick={() => setPendingWrite("cleanup-unlock")}>批量解锁</button>
        <button type="button" data-ui-kind="button" data-control-variant="primary" aria-busy={props.isBatchSaving} disabled={!canWrite || !cleanupTransferCount || props.isBatchSaving} onClick={() => setPendingWrite("cleanup-transfer")}>转移到角色背包</button>
      </div>

      {props.isOrganizing ? (
        <div className="vault-batch-panel">
          <span>{props.isBatchSaving && props.activeBatchAction ? `${props.activeBatchAction}...` : props.selectionSummary}</span>
          <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || props.isBatchSaving} onClick={() => void props.onApplyBatchTag("review")}>批量待复查</button>
          <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || props.isBatchSaving} onClick={() => void props.onApplyBatchTag("junk")}>批量可清理</button>
          <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || props.isBatchSaving} onClick={() => void props.onApplyBatchTag("farm")}>批量待刷</button>
          <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || props.isBatchSaving} onClick={() => void props.onApplyBatchTag("loadout")}>批量配装用</button>
          <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || props.isBatchSaving} onClick={() => void props.onApplyBatchTag("none")}>清除标记</button>
          {props.cleanupActions ? <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || !props.cleanupTargetCharacterId || props.isBatchSaving} onClick={() => setPendingWrite("selected-transfer")}>批量移动</button> : null}
        </div>
      ) : null}

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
          {props.cleanupActionItems.length > 8 ? <span>还有 {props.cleanupActionItems.length - 8} 件未在此处展开，请按筛选结果逐件核对。</span> : null}
        </details>
      ) : null}
      {pendingWriteCopy ? (
        <ConfirmationDialog
          title={pendingWriteCopy.title}
          description={pendingWriteCopy.description}
          confirmLabel={pendingWriteCopy.confirmLabel}
          cancelLabel="返回检查"
          confirmTone={pendingWriteCopy.tone}
          onCancel={() => setPendingWrite(null)}
          onConfirm={confirmPendingWrite}
        >
          {pendingWriteCopy.detail}
        </ConfirmationDialog>
      ) : null}
    </div>
  );
}
