import type {
  AccountSummary,
  ItemActionPlanInput,
  ItemActionResult
} from "../../../api/types";
import { api } from "../../../api/client";
import { resolveItemTransferCharacterId } from "../../../utils/itemActions";
import type { SelectedItemDetail } from "../../hooks/useItemDetail";

export type ItemDetailActionsProps = {
  accountSummary: AccountSummary | null;
  isRunningItemAction: boolean;
  selectedActionCharacterId: string;
  selectedItem: SelectedItemDetail;
  onCopyItemActionPlanText: (input: ItemActionPlanInput) => void;
  onRunItemWriteAction: (label: string, action: () => Promise<ItemActionResult>) => void;
  onSelectedActionCharacterIdChange: (id: string) => void;
};

export function ItemDetailActions(props: ItemDetailActionsProps) {
  const selectedItem = props.selectedItem;

  if (!selectedItem.instance_id) {
    return null;
  }

  return (
    <section className="item-action-panel">
      <div>
        <h3>装备操作</h3>
        <p>默认关闭。开启后每次操作都会再次确认，并写入本地日志。</p>
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
          className="secondary-button"
          disabled={props.isRunningItemAction}
          hidden={selectedItem.is_postmaster_item}
          onClick={() => props.onRunItemWriteAction(
            selectedItem.locked ? "解锁" : "锁定",
            () => api.setItemLockState({
              membership_type: props.accountSummary?.membership_type ?? 0,
              character_id: props.selectedActionCharacterId,
              item_id: selectedItem.instance_id ?? "",
              item_name: selectedItem.name,
              state: !selectedItem.locked
            })
          )}
        >
          {selectedItem.locked ? "解锁" : "锁定"}
        </button>
        {!selectedItem.is_vault_item && !selectedItem.is_postmaster_item ? (
          <button
            type="button"
            className="secondary-button"
            disabled={props.isRunningItemAction}
            onClick={() => props.onRunItemWriteAction(
              "装备到角色",
              () => api.equipItem({
                membership_type: props.accountSummary?.membership_type ?? 0,
                character_id: props.selectedActionCharacterId,
                item_id: selectedItem.instance_id ?? "",
                item_name: selectedItem.name
              })
            )}
          >
            装备到角色
          </button>
        ) : null}
        {!selectedItem.is_postmaster_item ? (
          <>
            <button
              type="button"
              className="secondary-button"
              disabled={props.isRunningItemAction}
              onClick={() => props.onCopyItemActionPlanText({
                action: "transfer",
                item_name: selectedItem.name,
                item_instance_id: selectedItem.instance_id,
                item_reference_hash: selectedItem.hash,
                character_id: selectedItem.is_vault_item
                  ? props.selectedActionCharacterId
                  : selectedItem.source_character_id ?? props.selectedActionCharacterId,
                transfer_to_vault: !selectedItem.is_vault_item
              })}
            >
              复制转移计划
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={props.isRunningItemAction}
              onClick={() => props.onRunItemWriteAction(
                selectedItem.is_vault_item ? "取出到角色" : "移入仓库",
                () => api.transferItem({
                  membership_type: props.accountSummary?.membership_type ?? 0,
                  character_id: resolveItemTransferCharacterId({
                    selectedCharacterId: props.selectedActionCharacterId,
                    sourceCharacterId: selectedItem.source_character_id,
                    sourceKind: selectedItem.source_kind,
                    transferToVault: !selectedItem.is_vault_item
                  }),
                  item_id: selectedItem.instance_id ?? "",
                  item_reference_hash: selectedItem.hash,
                  item_name: selectedItem.name,
                  transfer_to_vault: !selectedItem.is_vault_item
                })
              )}
            >
              {selectedItem.is_vault_item ? "取出到角色" : "移入仓库"}
            </button>
          </>
        ) : null}
        {selectedItem.is_postmaster_item ? (
          <button
            type="button"
            className="secondary-button"
            disabled={props.isRunningItemAction}
            onClick={() => props.onRunItemWriteAction(
              "从邮政官取回",
              () => api.pullFromPostmaster({
                membership_type: props.accountSummary?.membership_type ?? 0,
                character_id: selectedItem.source_character_id ?? props.selectedActionCharacterId,
                item_id: selectedItem.instance_id ?? "",
                item_reference_hash: selectedItem.hash,
                item_name: selectedItem.name
              })
            )}
          >
            取回到角色背包
          </button>
        ) : null}
      </div>
    </section>
  );
}
