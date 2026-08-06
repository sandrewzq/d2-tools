import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { ActionLogEntry } from "@d2-tools/core/actions/log";
import type {
  BatchTransferPlan,
  ItemActionPlan,
  ItemActionPlanInput
} from "@d2-tools/core/actions/plan";
import type { AccountItemPatch } from "@d2-tools/services/account/session";

export type ActionsApi = {
  setItemLockState(input: ItemLockActionInput): Promise<ItemActionResult>;
  equipItem(input: ItemEquipActionInput): Promise<ItemActionResult>;
  insertSocketPlug(input: InsertSocketPlugActionInput): Promise<ItemActionResult>;
  applySocketPlugs(input: ApplySocketPlugsActionInput): Promise<ItemActionResult>;
  transferItem(input: ItemTransferActionInput): Promise<ItemActionResult>;
  batchEquipItems(input: BatchEquipItemsInput): Promise<BatchItemActionResult>;
  batchTransferItems(input: BatchTransferItemsInput): Promise<BatchItemActionResult>;
  pullFromPostmaster(input: PostmasterPullActionInput): Promise<ItemActionResult>;
  equipLoadout(input: LoadoutEquipActionInput): Promise<ItemActionResult>;
  snapshotLoadout(input: LoadoutSnapshotActionInput): Promise<ItemActionResult>;
  clearLoadout(input: LoadoutClearActionInput): Promise<ItemActionResult>;
  updateLoadoutIdentifiers(input: LoadoutIdentifiersActionInput): Promise<ItemActionResult>;
  getActionLog(): Promise<ActionLogEntry[]>;
  createItemActionPlan(input: ItemActionPlanInput): Promise<ItemActionPlan>;
  createBatchTransferPlan(input: BatchTransferPlanInput): Promise<BatchTransferPlan>;
};

export type ItemLockActionInput = {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_name?: string;
  state: boolean;
};

export type ItemEquipActionInput = {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_name?: string;
};

export type InsertSocketPlugActionInput = {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_name?: string;
  socket_index: number;
  plug_hash: number;
  plug_name?: string;
};

export type ApplySocketPlugsActionInput = {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_name?: string;
  changes: Array<{
    socket_index: number;
    plug_hash: number;
    plug_name?: string;
  }>;
};

export type ItemTransferActionInput = {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_reference_hash: number;
  item_name?: string;
  transfer_to_vault: boolean;
};

export type PostmasterPullActionInput = {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_reference_hash: number;
  item_name?: string;
  stack_size?: number;
};

export type LoadoutEquipActionInput = {
  membership_type: number;
  character_id: string;
  loadout_index: number;
  loadout_name?: string;
};

export type LoadoutSnapshotActionInput = {
  membership_type: number;
  character_id: string;
  loadout_index: number;
  loadout_name?: string;
  loadout_name_hash?: number;
  loadout_icon_hash?: number;
  loadout_color_hash?: number;
};

export type LoadoutClearActionInput = LoadoutEquipActionInput;

export type LoadoutIdentifiersActionInput = {
  membership_type: number;
  character_id: string;
  loadout_index: number;
  loadout_name?: string;
  loadout_name_hash?: number;
  loadout_icon_hash?: number;
  loadout_color_hash?: number;
};

export type AccountItemActionPatch = AccountItemPatch;

export type ItemActionResult = {
  ok: true;
  message: string;
  account_patch?: AccountItemActionPatch;
};

export type BatchEquipItemsInput = {
  membership_type: number;
  character_id: string;
  items: ItemEquipActionInput[];
};

export type BatchTransferItemsInput = {
  membership_type: number;
  character_id: string;
  items: ItemTransferActionInput[];
};

export type BatchItemActionResult = {
  ok: true;
  total: number;
  success_count: number;
  failed_count: number;
  message: string;
  account_patches: AccountItemActionPatch[];
  succeeded_item_ids?: string[];
  failed_item_ids?: string[];
  failure_messages?: string[];
};

export type BatchTransferPlanInput = {
  character_id: string;
  transfer_to_vault: boolean;
  items: AccountItemSummary[];
};

export type {
  ActionLogEntry,
  BatchTransferPlan,
  ItemActionPlan,
  ItemActionPlanInput
};
