import type {
  AccountItemActionPatch,
  AccountItemDetail,
  AccountSummary,
  ItemActionPlanInput,
  ItemActionResult
} from "../../../api/types";
import { api } from "../../../api/client";
import { resolveItemTransferCharacterId } from "../../../utils/itemActions";
import type { SelectedItemDetail } from "../../hooks/useItemDetail";
import { resolveAccountItemViewLocation } from "../../domain/account/itemActionState";

export type ItemDetailActionsProps = {
  accountSummary: AccountSummary | null;
  isRunningItemAction: boolean;
  selectedActionCharacterId: string;
  selectedItem: SelectedItemDetail;
  onCopyItemActionPlanText: (input: ItemActionPlanInput) => void;
  onRunItemWriteAction: (
    label: string,
    action: () => Promise<ItemActionResult>,
    options?: {
      keepDetailOpen?: boolean;
      feedbackScope?: "global" | "detail";
      onProgress?: (phase: "submitting" | "refreshing", message: string) => void;
      verifyRefreshedItem?: (detail: AccountItemDetail) => boolean;
      refreshMismatchMessage?: string;
      expectedAccountPatch?: AccountItemActionPatch;
    }
  ) => Promise<{ ok: boolean; refreshed: boolean; message: string; cancelled?: boolean }>;
  onSelectedActionCharacterIdChange: (id: string) => void;
};

export function ItemDetailActions(props: ItemDetailActionsProps) {
  const selectedItem = props.selectedItem;
  const liveLocation = resolveAccountItemViewLocation(props.accountSummary, selectedItem.instance_id);
  const sourceKind = liveLocation?.kind ?? selectedItem.source_kind;
  const sourceCharacterId = liveLocation && "characterId" in liveLocation
    ? liveLocation.characterId
    : selectedItem.source_character_id;
  const isVaultItem = sourceKind === "vault" || (!liveLocation && Boolean(selectedItem.is_vault_item));
  const isPostmasterItem = sourceKind === "postmaster" || (!liveLocation && Boolean(selectedItem.is_postmaster_item));
  const isAlreadyEquippedToTarget = sourceKind === "equipped"
    && sourceCharacterId === props.selectedActionCharacterId;

  if (!selectedItem.instance_id) {
    return null;
  }

  return (
    <section className="item-action-panel">
      <div>
        <h3>装备操作</h3>
        <p>Bungie 返回成功后页面立即更新，账号资料在后台自动对账。</p>
      </div>
      {props.accountSummary?.characters.length ? (
        <label className="compact-field">
          目标角色
          <select
            value={props.selectedActionCharacterId}
            onChange={(event) => props.onSelectedActionCharacterIdChange(event.target.value)}
          >
            {props.accountSummary.characters.map((character) => (
              <option key={character.character_id} value={character.character_id}>
                {character.class_name} / 光等 {character.light ?? "-"}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="button-row">
        <button
          type="button"
          data-ui-kind="button" data-control-variant="secondary"
          disabled={props.isRunningItemAction || selectedItem.locked === undefined}
          hidden={isPostmasterItem}
          onClick={() => void props.onRunItemWriteAction(
            selectedItem.locked ? "解锁" : "锁定",
            () => api.setItemLockState({
              membership_type: props.accountSummary?.membership_type ?? 0,
              character_id: props.selectedActionCharacterId,
              item_id: selectedItem.instance_id ?? "",
              item_name: selectedItem.name,
              state: !selectedItem.locked
            }),
            {
              expectedAccountPatch: {
                kind: "lock",
                item_instance_id: selectedItem.instance_id ?? "",
                locked: !selectedItem.locked
              }
            }
          )}
        >
          {selectedItem.locked === undefined ? "锁定状态未知" : selectedItem.locked ? "解锁" : "锁定"}
        </button>
        {!isVaultItem && !isPostmasterItem ? (
          <button
            type="button"
            data-ui-kind="button" data-control-variant="secondary"
            disabled={props.isRunningItemAction || isAlreadyEquippedToTarget}
            onClick={() => void props.onRunItemWriteAction(
              "装备到角色",
              () => api.equipItem({
                membership_type: props.accountSummary?.membership_type ?? 0,
                character_id: props.selectedActionCharacterId,
                item_id: selectedItem.instance_id ?? "",
                item_name: selectedItem.name
              }),
              {
                expectedAccountPatch: {
                  kind: "equip",
                  item_instance_id: selectedItem.instance_id ?? "",
                  character_id: props.selectedActionCharacterId
                }
              }
            )}
          >
            {isAlreadyEquippedToTarget ? "已装备到角色" : "装备到角色"}
          </button>
        ) : null}
        {!isPostmasterItem ? (
          <>
            <button
              type="button"
              data-ui-kind="button" data-control-variant="secondary"
              disabled={props.isRunningItemAction}
              onClick={() => props.onCopyItemActionPlanText({
                action: "transfer",
                item_name: selectedItem.name,
                item_instance_id: selectedItem.instance_id,
                item_reference_hash: selectedItem.hash,
                character_id: isVaultItem
                  ? props.selectedActionCharacterId
                  : sourceCharacterId ?? props.selectedActionCharacterId,
                transfer_to_vault: !isVaultItem
              })}
            >
              复制转移计划
            </button>
            <button
              type="button"
              data-ui-kind="button" data-control-variant="secondary"
              disabled={props.isRunningItemAction}
              onClick={() => void props.onRunItemWriteAction(
                isVaultItem ? "取出到角色" : "移入仓库",
                () => api.transferItem({
                  membership_type: props.accountSummary?.membership_type ?? 0,
                  character_id: resolveItemTransferCharacterId({
                    selectedCharacterId: props.selectedActionCharacterId,
                    sourceCharacterId,
                    sourceKind,
                    transferToVault: !isVaultItem
                  }),
                  item_id: selectedItem.instance_id ?? "",
                  item_reference_hash: selectedItem.hash,
                  item_name: selectedItem.name,
                  transfer_to_vault: !isVaultItem
                }),
                {
                  expectedAccountPatch: {
                    kind: "transfer",
                    item_instance_id: selectedItem.instance_id ?? "",
                    character_id: resolveItemTransferCharacterId({
                      selectedCharacterId: props.selectedActionCharacterId,
                      sourceCharacterId,
                      sourceKind,
                      transferToVault: !isVaultItem
                    }),
                    target: isVaultItem ? "character-inventory" : "vault"
                  }
                }
              )}
            >
              {isVaultItem ? "取出到角色" : "移入仓库"}
            </button>
          </>
        ) : null}
        {isPostmasterItem ? (
          <button
            type="button"
            data-ui-kind="button" data-control-variant="secondary"
            disabled={props.isRunningItemAction}
            onClick={() => void props.onRunItemWriteAction(
              "从邮政官取回",
              () => api.pullFromPostmaster({
                membership_type: props.accountSummary?.membership_type ?? 0,
                character_id: sourceCharacterId ?? props.selectedActionCharacterId,
                item_id: selectedItem.instance_id ?? "",
                item_reference_hash: selectedItem.hash,
                source_bucket_hash: selectedItem.bucket_hash,
                item_name: selectedItem.name
              }),
              {
                expectedAccountPatch: {
                  kind: "postmaster-pull",
                  item_instance_id: selectedItem.instance_id ?? "",
                  character_id: sourceCharacterId ?? props.selectedActionCharacterId,
                  source_bucket_hash: selectedItem.bucket_hash
                }
              }
            )}
          >
            取回到角色背包
          </button>
        ) : null}
      </div>
    </section>
  );
}
