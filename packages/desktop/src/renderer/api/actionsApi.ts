import type { AccountItemSummary } from "./sharedTypes";

export type ActionsApi = {
  setItemLockState(input: ItemLockActionInput): Promise<ItemActionResult>;
  equipItem(input: ItemEquipActionInput): Promise<ItemActionResult>;
  insertSocketPlug(input: InsertSocketPlugActionInput): Promise<ItemActionResult>;
  transferItem(input: ItemTransferActionInput): Promise<ItemActionResult>;
  batchEquipItems(input: BatchEquipItemsInput): Promise<BatchItemActionResult>;
  batchTransferItems(input: BatchTransferItemsInput): Promise<BatchItemActionResult>;
  pullFromPostmaster(input: PostmasterPullActionInput): Promise<ItemActionResult>;
  equipLoadout(input: LoadoutEquipActionInput): Promise<ItemActionResult>;
  snapshotLoadout(input: LoadoutSnapshotActionInput): Promise<ItemActionResult>;
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

export type ItemActionResult = {
  ok: true;
  message: string;
  account_patch?: AccountItemActionPatch;
};

export type AccountItemActionPatch =
  | {
      kind: "lock";
      item_instance_id: string;
      locked: boolean;
    }
  | {
      kind: "equip";
      item_instance_id: string;
      character_id: string;
    }
  | {
      kind: "transfer";
      item_instance_id: string;
      character_id: string;
      target: "vault" | "character-inventory";
    }
  | {
      kind: "postmaster-pull";
      item_instance_id: string;
      character_id: string;
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
};

export type ActionLogEntry = {
  id: string;
  created_at: string;
  action: "set-lock" | "equip" | "insert-socket-plug" | "transfer" | "postmaster-pull" | "loadout-equip" | "loadout-snapshot";
  item_name?: string;
  item_instance_id?: string;
  character_id?: string;
  ok: boolean;
  message?: string;
};

export type ItemActionPlanInput = {
  action: "set-lock" | "equip" | "transfer";
  item_name: string;
  item_instance_id?: string;
  item_reference_hash?: number;
  character_id?: string;
  state?: boolean;
  transfer_to_vault?: boolean;
};

export type ItemActionPlan = {
  action: ItemActionPlanInput["action"];
  title: string;
  description: string;
  requires_confirmation: true;
  executable: false;
  input: ItemActionPlanInput;
};

export type BatchTransferPlanInput = {
  character_id: string;
  transfer_to_vault: boolean;
  items: AccountItemSummary[];
};

export type BatchTransferPlan = {
  summary: string;
  steps: ItemActionPlan[];
};
