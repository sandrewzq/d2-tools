import { useState } from "react";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { VaultTags, VaultTagValue } from "@d2-tools/core/vault/tags";
import { formatVaultItemMeta } from "./VaultListItem.js";
import type { VaultCopy } from "../i18n/types.js";
import { vaultTemplate, vaultText } from "./vaultCopy.js";
import { type VaultVisibleSelectionMode, getVaultItemKey } from "@d2-tools/app/vault";
import type { VaultCleanupActions } from "./useVaultBatchActions.js";
import { ConfirmationDialog } from "../overlay/ConfirmationDialog.js";

type PendingVaultWrite = "selected-junk" | "selected-transfer" | "cleanup-transfer" | null;

export function VaultOrganizePanel(props: {
  copy: VaultCopy;
  isOrganizing: boolean;
  filteredItemCount: number;
  selectedItemCount: number;
  selectedVaultItemCount: number;
  selectedLockableItemCount: number;
  selectedProtectedCount: number;
  selectionSummary: string;
  activeBatchAction: string;
  isBatchSaving: boolean;
  cleanupActions?: VaultCleanupActions;
  cleanupCharacters: VaultCleanupActions["characters"];
  cleanupTargetCharacterId: string;
  markedCleanupItemCount: number;
  protectedCleanupItemCount: number;
  cleanupActionItems: AccountItemSummary[];
  tags: VaultTags;
  onVisibleSelectionChange: (mode: VaultVisibleSelectionMode) => void;
  onClearSelection: () => void;
  onCleanupTargetCharacterChange: (value: string) => void;
  onApplyBatchTag: (tag: VaultTagValue) => void | Promise<void>;
  onRunSelectedBulkLock: () => void | Promise<void>;
  onRunSelectedBulkMove: () => void | Promise<void>;
  onRunCleanupAction: (action: "unlock" | "transfer") => void | Promise<void>;
}) {
  const [pendingWrite, setPendingWrite] = useState<PendingVaultWrite>(null);
  const copy = props.copy;
  const canWrite = Boolean(props.cleanupActions && props.cleanupTargetCharacterId && props.cleanupActionItems.length);
  const targetCharacterLabel = props.cleanupCharacters.find((character) => character.character_id === props.cleanupTargetCharacterId)?.class_name ?? vaultText(copy, "目标角色");
  const cleanupTransferCount = props.cleanupActionItems.filter((item) => Boolean(item.instance_id)).length;

  function confirmPendingWrite() {
    const action = pendingWrite;
    setPendingWrite(null);
    if (action === "selected-junk") return props.onApplyBatchTag("junk");
    if (action === "selected-transfer") return props.onRunSelectedBulkMove();
    if (action === "cleanup-transfer") return props.onRunCleanupAction("transfer");
  }

  const pendingWriteCopy = pendingWrite === "selected-junk"
    ? {
        title: vaultText(copy, "确认批量标记为清理？"),
        description: vaultTemplate(copy, "所选 {selected} 件中，{protected} 件受安全规则保护。", {
          selected: props.selectedItemCount,
          protected: props.selectedProtectedCount
        }),
        detail: props.selectedProtectedCount
          ? vaultText(copy, "受保护装备会保持原状态；其余装备只写入本地“清理”标签，不会自动解锁、转移或分解。")
          : vaultText(copy, "只写入本地“清理”标签，不会自动解锁、转移或分解。"),
        confirmLabel: vaultText(copy, "确认标记"),
        tone: "primary" as const
      }
    : pendingWrite === "selected-transfer"
    ? {
        title: vaultText(copy, "确认批量移动所选装备？"),
        description: vaultTemplate(copy, "将尝试把所选中位于仓库的 {count} 件装备转移到 {character} 背包。", {
          count: props.selectedVaultItemCount,
          character: targetCharacterLabel
        }),
        detail: vaultText(copy, "角色已装备、角色背包和邮政官物品不会进入仓库批量转移；失败项目会保留在结果反馈中。"),
        confirmLabel: vaultText(copy, "确认移动"),
        tone: "primary" as const
      }
      : pendingWrite === "cleanup-transfer"
        ? {
            title: vaultText(copy, "确认转移清理装备？"),
            description: vaultTemplate(copy, "将尝试把 {count} 件装备转移到 {character} 背包。", {
              count: cleanupTransferCount,
              character: targetCharacterLabel
            }),
            detail: vaultTemplate(copy, "{excluded}应用不会自动拆解；转移后仍需在游戏内逐件核对并处理。", {
              excluded: props.protectedCleanupItemCount
                ? vaultTemplate(copy, "{count} 件受保护装备已排除。", { count: props.protectedCleanupItemCount })
                : ""
            }),
            confirmLabel: vaultText(copy, "确认转移"),
            tone: "primary" as const
          }
        : null;

  return (
    <>
      {props.isOrganizing ? (
        <div className="vault-batch-panel">
          <div className="vault-batch-selection-tools">
            <strong>{props.isBatchSaving && props.activeBatchAction ? `${props.activeBatchAction}...` : vaultTemplate(copy, "已选 {count} 件", { count: props.selectedItemCount })}</strong>
            <span className="vault-batch-selection-summary">{props.selectionSummary}</span>
            <button type="button" disabled={!props.filteredItemCount || props.isBatchSaving} onClick={() => props.onVisibleSelectionChange("replace")}>{vaultTemplate(copy, "选择当前结果 {count}", { count: props.filteredItemCount })}</button>
            <button type="button" data-ui-kind="button" data-control-variant="quiet" disabled={!props.selectedItemCount || props.isBatchSaving} onClick={props.onClearSelection}>{vaultText(copy, "清空选择")}</button>
          </div>
          <div className="vault-batch-action-tools" aria-label={vaultText(copy, "批量操作")}>
            <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || props.isBatchSaving} onClick={() => void props.onApplyBatchTag("keep")}>{copy.labels.tags.keep}</button>
            <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || props.isBatchSaving} onClick={() => void props.onApplyBatchTag("review")}>{copy.labels.tags.review}</button>
            <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedItemCount || props.isBatchSaving} onClick={() => setPendingWrite("selected-junk")}>{copy.labels.tags.junk}</button>
            {props.cleanupActions ? <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedLockableItemCount || props.isBatchSaving} onClick={() => void props.onRunSelectedBulkLock()}>{props.selectedLockableItemCount ? vaultTemplate(copy, "加锁 {count}", { count: props.selectedLockableItemCount }) : vaultText(copy, "加锁")}</button> : null}
            {props.cleanupActions && props.cleanupCharacters.length ? (
              <label className="compact-field vault-organize-field">
                <span>{vaultText(copy, "接收角色")}</span>
                <select aria-label={vaultText(copy, "接收角色")} value={props.cleanupTargetCharacterId} onChange={(event) => props.onCleanupTargetCharacterChange(event.target.value)}>
                  {props.cleanupCharacters.map((character) => <option key={character.character_id} value={character.character_id}>{character.class_name} / {vaultTemplate(copy, "光等 {power}", { power: character.light ?? "-" })}</option>)}
                </select>
              </label>
            ) : null}
            {props.cleanupActions ? <button type="button" aria-busy={props.isBatchSaving} disabled={!props.selectedVaultItemCount || !props.cleanupTargetCharacterId || props.isBatchSaving} onClick={() => setPendingWrite("selected-transfer")}>{props.selectedVaultItemCount ? vaultTemplate(copy, "移动仓库所选 {count}", { count: props.selectedVaultItemCount }) : vaultText(copy, "移动仓库所选")}</button> : null}
          </div>
        </div>
      ) : null}

      {props.markedCleanupItemCount ? (
        <div className="vault-cleanup-boundary">
          <p>{vaultTemplate(copy, "本地状态只保存在应用内。已标记 {marked} 件清理装备{excluded}；转移不会自动拆解，仍需在游戏内逐件确认。", {
            marked: props.markedCleanupItemCount,
            excluded: props.protectedCleanupItemCount
              ? vaultTemplate(copy, "，其中 {count} 件受保护、不进入转移列表", { count: props.protectedCleanupItemCount })
              : ""
          })}</p>
          {cleanupTransferCount && props.cleanupCharacters.length ? (
            <span className="vault-cleanup-transfer-tools">
              <label className="compact-field vault-organize-field">
                <span>{vaultText(copy, "接收角色")}</span>
                <select aria-label={vaultText(copy, "清理装备接收角色")} value={props.cleanupTargetCharacterId} onChange={(event) => props.onCleanupTargetCharacterChange(event.target.value)}>
                  {props.cleanupCharacters.map((character) => <option key={character.character_id} value={character.character_id}>{character.class_name} / {vaultTemplate(copy, "光等 {power}", { power: character.light ?? "-" })}</option>)}
                </select>
              </label>
              <button type="button" data-ui-kind="button" data-control-variant="primary" aria-busy={props.isBatchSaving} disabled={!canWrite || props.isBatchSaving} onClick={() => setPendingWrite("cleanup-transfer")}>{vaultTemplate(copy, "转移清理装备 {count}", { count: cleanupTransferCount })}</button>
            </span>
          ) : null}
        </div>
      ) : null}

      {props.cleanupActionItems.length ? (
        <details className="vault-cleanup-locator">
          <summary>{vaultTemplate(copy, "游戏内定位 · 本次处理 {count} 件", { count: props.cleanupActionItems.length })}</summary>
          <p>{vaultText(copy, "按位置、光等、锁定状态和 Perk 核对；同名装备很多时，这些信息比只看名字更可靠。")}</p>
          <ul>
            {props.cleanupActionItems.slice(0, 8).map((item) => {
              const key = getVaultItemKey(item);
              const note = props.tags.items[key]?.note;
              const plugText = item.socket_plugs?.map((plug) => plug.name).filter(Boolean).slice(0, 3).join(" / ");
              return <li key={key}><b>{item.name}</b><small>{formatVaultItemMeta(copy, item) || vaultText(copy, "未知位置")}{plugText ? ` / ${plugText}` : ""}</small>{note ? <small>{vaultTemplate(copy, "备注：{note}", { note })}</small> : null}</li>;
            })}
          </ul>
          {props.cleanupActionItems.length > 8 ? <span>{vaultTemplate(copy, "还有 {count} 件未在此处展开，请按筛选结果逐件核对。", { count: props.cleanupActionItems.length - 8 })}</span> : null}
        </details>
      ) : null}
      {pendingWriteCopy ? (
        <ConfirmationDialog
          title={pendingWriteCopy.title}
          description={pendingWriteCopy.description}
          confirmLabel={pendingWriteCopy.confirmLabel}
          cancelLabel={vaultText(copy, "返回检查")}
          confirmTone={pendingWriteCopy.tone}
          onCancel={() => setPendingWrite(null)}
          onConfirm={confirmPendingWrite}
        >
          {pendingWriteCopy.detail}
        </ConfirmationDialog>
      ) : null}
    </>
  );
}
