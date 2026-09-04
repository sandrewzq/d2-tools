import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type {
  ActionDebugTraceEntry,
  ActionDebugTraceInput,
  ActionLogEntry,
  ActionTraceContext,
  ActionVerificationStatus
} from "@d2-tools/core/actions/log";
import type {
  BatchTransferPlan,
  ItemActionPlan,
  ItemActionPlanInput
} from "@d2-tools/core/actions/plan";
import type { AccountItemPatch } from "@d2-tools/services/account/session";
import type { BackgroundTaskSnapshot } from "../shared/backgroundTasks.js";

export type ActionsApi = {
  setItemLockState(input: ItemLockActionInput): Promise<ItemActionResult>;
  equipItem(input: ItemEquipActionInput): Promise<ItemActionResult>;
  insertSocketPlug(input: InsertSocketPlugActionInput): Promise<ItemActionResult>;
  applySocketPlugs(input: ApplySocketPlugsActionInput): Promise<ItemActionResult>;
  transferItem(input: ItemTransferActionInput): Promise<ItemActionResult>;
  batchEquipItems(input: BatchEquipItemsInput): Promise<BatchItemActionResult>;
  batchTransferItems(input: BatchTransferItemsInput): Promise<BatchItemActionResult>;
  startAccountWriteVerification(input: AccountWriteVerificationInput): Promise<BackgroundTaskSnapshot>;
  pullFromPostmaster(input: PostmasterPullActionInput): Promise<ItemActionResult>;
  equipLoadout(input: LoadoutEquipActionInput): Promise<ItemActionResult>;
  snapshotLoadout(input: LoadoutSnapshotActionInput): Promise<ItemActionResult>;
  clearLoadout(input: LoadoutClearActionInput): Promise<ItemActionResult>;
  updateLoadoutIdentifiers(input: LoadoutIdentifiersActionInput): Promise<ItemActionResult>;
  getActionLog(): Promise<ActionLogEntry[]>;
  recordActionDebugTrace(input: ActionDebugTraceInput): Promise<ActionDebugTraceEntry>;
  recordActionVerification(input: ActionVerificationRecordInput): Promise<ActionLogEntry>;
  createItemActionPlan(input: ItemActionPlanInput): Promise<ItemActionPlan>;
  createBatchTransferPlan(input: BatchTransferPlanInput): Promise<BatchTransferPlan>;
};

type ActionTraceCarrier = {
  trace?: ActionTraceContext;
};

export type ItemLockActionInput = ActionTraceCarrier & {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_name?: string;
  state: boolean;
};

export type ItemEquipActionInput = ActionTraceCarrier & {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_name?: string;
  /** Require a fresh Profile to show the item on this character before equipping. */
  wait_for_character_inventory?: boolean;
};

export type InsertSocketPlugActionInput = ActionTraceCarrier & {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_name?: string;
  socket_index: number;
  plug_hash: number;
  plug_name?: string;
};

export type ApplySocketPlugsActionInput = ActionTraceCarrier & {
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

export type ItemTransferActionInput = ActionTraceCarrier & {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_reference_hash: number;
  item_name?: string;
  transfer_to_vault: boolean;
};

export type PostmasterPullActionInput = ActionTraceCarrier & {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_reference_hash: number;
  source_bucket_hash?: number;
  item_name?: string;
  stack_size?: number;
};

export type LoadoutEquipActionInput = ActionTraceCarrier & {
  membership_type: number;
  character_id: string;
  loadout_index: number;
  loadout_name?: string;
};

export type LoadoutSnapshotActionInput = ActionTraceCarrier & {
  membership_type: number;
  character_id: string;
  loadout_index: number;
  loadout_name?: string;
  loadout_name_hash?: number;
  loadout_icon_hash?: number;
  loadout_color_hash?: number;
};

export type LoadoutClearActionInput = LoadoutEquipActionInput;

export type LoadoutIdentifiersActionInput = ActionTraceCarrier & {
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
  diagnostics?: {
    operation_id: string;
    duration_ms: number;
    auth_duration_ms: number;
    bungie_duration_ms: number;
    postprocess_duration_ms: number;
  };
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

export type AccountWriteVerificationInput = {
  operation_id: string;
  membership_type: number;
  destiny_membership_id: string;
  character_id: string;
  character_name?: string;
  item_name?: string;
  baseline_profile_minted_at?: string;
  expected_patches: AccountItemActionPatch[];
  accepted_count: number;
  failed_count: number;
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

export type ActionVerificationRecordInput = {
  plan_id: string;
  confirmation_id: string;
  execution_id: string;
  character_id?: string;
  status: ActionVerificationStatus;
  message: string;
};

export type {
  ActionDebugTraceEntry,
  ActionDebugTraceInput,
  ActionLogEntry,
  ActionTraceContext,
  ActionVerificationStatus,
  BatchTransferPlan,
  ItemActionPlan,
  ItemActionPlanInput
};
