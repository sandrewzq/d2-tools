import type { ItemDetailCopy } from "@d2-tools/ui";
import { itemDetailTemplate, itemDetailText } from "@d2-tools/ui";
import type {
  AccountSummary,
  ItemActionPlanInput,
  ItemActionResult
} from "../../../api/types";
import { api } from "../../../api/client";
import { resolveItemTransferCharacterId } from "../../../utils/itemActions";
import type { SelectedItemDetail } from "../../hooks/useItemDetail";
import type { ItemWriteActionOptions, ItemWriteActionOutcome } from "../../hooks/useItemDetailWorkspace";
import { resolveAccountItemViewLocation } from "../../domain/account/itemActionState";

export type ItemDetailActionsProps = {
  accountSummary: AccountSummary | null;
  copy: ItemDetailCopy;
  isRunningItemAction: boolean;
  selectedActionCharacterId: string;
  selectedItem: SelectedItemDetail;
  onCopyItemActionPlanText: (input: ItemActionPlanInput) => void;
  onRunItemWriteAction: (
    label: string,
    action: () => Promise<ItemActionResult>,
    options?: ItemWriteActionOptions
  ) => Promise<ItemWriteActionOutcome>;
  onSelectedActionCharacterIdChange: (id: string) => void;
};

export function ItemDetailActions(props: ItemDetailActionsProps) {
  const selectedItem = props.selectedItem;
  const copy = props.copy;
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
        <h3>{itemDetailText(copy, "装备操作")}</h3>
        <p>{itemDetailText(copy, "Bungie 返回成功后页面立即更新，账号资料在后台自动对账。")}</p>
      </div>
      {props.accountSummary?.characters.length ? (
        <label className="compact-field">
          {itemDetailText(copy, "目标角色")}
          <select
            value={props.selectedActionCharacterId}
            onChange={(event) => props.onSelectedActionCharacterIdChange(event.target.value)}
          >
            {props.accountSummary.characters.map((character) => (
              <option key={character.character_id} value={character.character_id}>
                {itemDetailTemplate(copy, "{className} / 光等 {light}", {
                  className: character.class_name,
                  light: character.light ?? "-"
                })}
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
            selectedItem.locked ? itemDetailText(copy, "解锁") : itemDetailText(copy, "锁定"),
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
          {selectedItem.locked === undefined
            ? itemDetailText(copy, "锁定状态未知")
            : selectedItem.locked
              ? itemDetailText(copy, "解锁")
              : itemDetailText(copy, "锁定")}
        </button>
        {!isVaultItem && !isPostmasterItem ? (
          <button
            type="button"
            data-ui-kind="button" data-control-variant="secondary"
            disabled={props.isRunningItemAction || isAlreadyEquippedToTarget}
            onClick={() => void props.onRunItemWriteAction(
              itemDetailText(copy, "装备到角色"),
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
            {isAlreadyEquippedToTarget ? itemDetailText(copy, "已装备到角色") : itemDetailText(copy, "装备到角色")}
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
              {itemDetailText(copy, "复制转移计划")}
            </button>
            <button
              type="button"
              data-ui-kind="button" data-control-variant="secondary"
              disabled={props.isRunningItemAction}
              onClick={() => void props.onRunItemWriteAction(
                isVaultItem ? itemDetailText(copy, "取出到角色") : itemDetailText(copy, "移入仓库"),
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
              {isVaultItem ? itemDetailText(copy, "取出到角色") : itemDetailText(copy, "移入仓库")}
            </button>
          </>
        ) : null}
        {isPostmasterItem ? (
          <button
            type="button"
            data-ui-kind="button" data-control-variant="secondary"
            disabled={props.isRunningItemAction}
            onClick={() => void props.onRunItemWriteAction(
              itemDetailText(copy, "从邮政官取回"),
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
            {itemDetailText(copy, "取回到角色背包")}
          </button>
        ) : null}
      </div>
    </section>
  );
}
