import { ipcMain } from "electron";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type {
  ActionDebugTraceInput,
  ActionLogType,
  ActionTraceContext
} from "@d2-tools/core/actions/log";
import {
  createBatchTransferPlan,
  createItemActionPlan
} from "@d2-tools/core/actions/plan";
import {
  equipItem as bungieEquipItem,
  equipItems as bungieEquipItems,
  clearLoadout as bungieClearLoadout,
  insertSocketPlug as bungieInsertSocketPlug,
  equipLoadout as bungieEquipLoadout,
  pullFromPostmaster as bungiePullFromPostmaster,
  setItemLockState as bungieSetItemLockState,
  snapshotLoadout as bungieSnapshotLoadout,
  updateLoadoutIdentifiers as bungieUpdateLoadoutIdentifiers,
  transferItem as bungieTransferItem
} from "@d2-tools/services/bungie/actions";
import type { D2Config } from "@d2-tools/core/config/schema";
import type { DestinyProfileResponse } from "@d2-tools/core/account/summary";
import {
  appendActionDebugTrace,
  appendActionLog,
  loadActionLog
} from "@d2-tools/services/actions/logStore";
import { loadConfig } from "@d2-tools/services/config/store";
import type {
  AccountItemActionPatch,
  AccountWriteVerificationInput,
  ActionVerificationRecordInput,
  ApplySocketPlugsActionInput,
  BatchEquipItemsInput,
  BatchItemActionResult,
  BatchTransferItemsInput,
  BatchTransferPlanInput,
  InsertSocketPlugActionInput,
  ItemActionPlanInput,
  ItemActionResult,
  ItemEquipActionInput,
  ItemLockActionInput,
  ItemTransferActionInput,
  LoadoutEquipActionInput,
  LoadoutClearActionInput,
  LoadoutIdentifiersActionInput,
  LoadoutSnapshotActionInput,
  PostmasterPullActionInput
} from "../../contracts/actions.js";
import {
  classifyWriteActionIpcError,
  encodeDesktopIpcFailure
} from "../../contracts/errors.js";
import { loadFreshOAuthToken, type FreshOAuthToken } from "./authSession.js";
import { startBackgroundTask } from "../backgroundTasks.js";
import { fetchSharedBungieJson } from "../runtime/bungieSession.js";
import {
  getAccountItemDetailByInstanceId,
  invalidateAccountItemDetails,
  invalidateAccountSession,
  patchAccountSession,
  resolveAccountItemLocation,
  type AccountItemLocation
} from "../runtime/accountSession.js";

export function registerActionIpcHandlers(): void {
  ipcMain.handle("actions:verification:start", (_event, input: AccountWriteVerificationInput) => {
    return startAccountWriteVerification(sanitizeAccountWriteVerificationInput(input));
  });

  ipcMain.handle("actions:item:set-lock", async (_event, input: ItemLockActionInput) => {
    return runWriteAction({
      action: "set-lock",
      trace: input.trace,
      itemName: input.item_name,
      itemInstanceId: input.item_id,
      characterId: input.character_id,
      successMessage: input.state ? "装备已锁定" : "装备已解锁",
      accountPatch: {
        kind: "lock",
        item_instance_id: input.item_id,
        locked: input.state
      },
      run: async ({ config, token }) => {
        await bungieSetItemLockState({
          config,
          token,
          membershipType: input.membership_type,
          characterId: input.character_id,
          itemId: input.item_id,
          state: input.state
        });
      }
    });
  });

  ipcMain.handle("actions:item:equip", async (_event, input: ItemEquipActionInput) => {
    return runWriteAction({
      action: "equip",
      trace: input.trace,
      itemName: input.item_name,
      itemInstanceId: input.item_id,
      characterId: input.character_id,
      successMessage: "装备成功",
      accountPatch: {
        kind: "equip",
        item_instance_id: input.item_id,
        character_id: input.character_id
      },
      run: async ({ config, token }) => {
        await bungieEquipItem({
          config,
          token,
          membershipType: input.membership_type,
          characterId: input.character_id,
          itemId: input.item_id
        });
      }
    });
  });

  ipcMain.handle("actions:item:insert-socket-plug", async (_event, input: InsertSocketPlugActionInput) => {
    return runWriteAction({
      action: "insert-socket-plug",
      trace: input.trace,
      itemName: input.item_name,
      itemInstanceId: input.item_id,
      characterId: input.character_id,
      successMessage: `已应用 Perk：${input.plug_name ?? input.plug_hash}`,
      run: async ({ config, token }) => {
        const location = await prepareSocketWrite(input.item_id);
        await applySocketPlugWithRecovery({ config, token, input, location, refreshAfterSuccess: true });
      }
    });
  });

  ipcMain.handle("actions:item:apply-socket-plugs", async (_event, input: ApplySocketPlugsActionInput) => {
    return runWriteAction({
      action: "insert-socket-plug",
      trace: input.trace,
      itemName: input.item_name,
      itemInstanceId: input.item_id,
      characterId: input.character_id,
      successMessage: `已应用 ${input.changes.length} 个 Perk 更改`,
      run: async ({ config, token }) => {
        if (!input.changes.length) {
          throw new Error("没有需要应用的 Perk 更改。");
        }
        const location = await prepareSocketWrite(input.item_id);
        for (const change of input.changes) {
          await applySocketPlugWithRecovery({
            config,
            token,
            location,
            refreshAfterSuccess: false,
            input: {
              membership_type: input.membership_type,
              character_id: input.character_id,
              item_id: input.item_id,
              item_name: input.item_name,
              trace: input.trace,
              socket_index: change.socket_index,
              plug_hash: change.plug_hash,
              plug_name: change.plug_name
            }
          });
        }
        await refreshAccountItemDetail(input.item_id);
      }
    });
  });

  ipcMain.handle("actions:item:transfer", async (_event, input: ItemTransferActionInput) => {
    return runWriteAction({
      action: "transfer",
      trace: input.trace,
      itemName: input.item_name,
      itemInstanceId: input.item_id,
      characterId: input.character_id,
      successMessage: input.transfer_to_vault ? "已移入仓库" : "已取出到角色",
      accountPatch: {
        kind: "transfer",
        item_instance_id: input.item_id,
        character_id: input.character_id,
        target: input.transfer_to_vault ? "vault" : "character-inventory"
      },
      run: async ({ config, token }) => {
        await bungieTransferItem({
          config,
          token,
          membershipType: input.membership_type,
          characterId: input.character_id,
          itemId: input.item_id,
          itemReferenceHash: input.item_reference_hash,
          transferToVault: input.transfer_to_vault
        });
      }
    });
  });

  ipcMain.handle("actions:items:batch-equip", async (_event, input: BatchEquipItemsInput) => {
    let equipRequest: Promise<Map<string, number>> | null = null;
    return runBatchWriteActions({
      action: "equip",
      items: input.items,
      successMessage: "批量装备完成",
      runItem: async ({ config, token }, item) => {
        equipRequest ??= equipItemsWithMissingResultRetry({ config, token, request: input });
        const equipStatus = (await equipRequest).get(item.item_id);
        if (equipStatus === 1) return;
        if (equipStatus === undefined) {
          throw new Error("Bungie 未返回这件装备的执行结果。装备可能尚未同步到角色背包，请刷新账号后重试。");
        }
        throw new Error(describeEquipFailure(equipStatus));
      },
      getItemName: (item) => item.item_name,
      getItemInstanceId: (item) => item.item_id,
      getCharacterId: (item) => item.character_id,
      getTrace: (item) => item.trace,
      getAccountPatch: (item) => ({
        kind: "equip",
        item_instance_id: item.item_id,
        character_id: input.character_id
      })
    });
  });

  ipcMain.handle("actions:items:batch-transfer", async (_event, input: BatchTransferItemsInput) => {
    return runBatchWriteActions({
      action: "transfer",
      items: input.items,
      successMessage: "批量转移完成",
      runItem: async ({ config, token }, item) => {
        await bungieTransferItem({
          config,
          token,
          membershipType: input.membership_type,
          characterId: input.character_id,
          itemId: item.item_id,
          itemReferenceHash: item.item_reference_hash,
          transferToVault: item.transfer_to_vault
        });
      },
      getItemName: (item) => item.item_name,
      getItemInstanceId: (item) => item.item_id,
      getCharacterId: (item) => item.character_id,
      getTrace: (item) => item.trace,
      getAccountPatch: (item) => ({
        kind: "transfer",
        item_instance_id: item.item_id,
        character_id: input.character_id,
        target: item.transfer_to_vault ? "vault" : "character-inventory"
      })
    });
  });

  ipcMain.handle("actions:item:pull-postmaster", async (_event, input: PostmasterPullActionInput) => {
    return runWriteAction({
      action: "postmaster-pull",
      trace: input.trace,
      itemName: input.item_name,
      itemInstanceId: input.item_id,
      characterId: input.character_id,
      successMessage: "已从邮政官取回到角色背包",
      accountPatch: {
        kind: "postmaster-pull",
        item_instance_id: input.item_id,
        character_id: input.character_id
      },
      run: async ({ config, token }) => {
        await bungiePullFromPostmaster({
          config,
          token,
          membershipType: input.membership_type,
          characterId: input.character_id,
          itemId: input.item_id,
          itemReferenceHash: input.item_reference_hash,
          stackSize: input.stack_size
        });
      }
    });
  });

  ipcMain.handle("actions:loadout:equip", async (_event, input: LoadoutEquipActionInput) => {
    return runWriteAction({
      action: "loadout-equip",
      trace: input.trace,
      itemName: input.loadout_name,
      characterId: input.character_id,
      successMessage: `已应用游戏内配装栏：${input.loadout_name ?? `槽位 ${input.loadout_index + 1}`}`,
      invalidateAllItemDetails: true,
      run: async ({ config, token }) => {
        await bungieEquipLoadout({
          config,
          token,
          membershipType: input.membership_type,
          characterId: input.character_id,
          loadoutIndex: input.loadout_index
        });
      }
    });
  });

  ipcMain.handle("actions:loadout:snapshot", async (_event, input: LoadoutSnapshotActionInput) => {
    return runWriteAction({
      action: "loadout-snapshot",
      trace: input.trace,
      itemName: input.loadout_name,
      characterId: input.character_id,
      successMessage: `已用当前装备覆盖游戏内配装栏：${input.loadout_name ?? `槽位 ${input.loadout_index + 1}`}`,
      run: async ({ config, token }) => {
        await bungieSnapshotLoadout({
          config,
          token,
          membershipType: input.membership_type,
          characterId: input.character_id,
          loadoutIndex: input.loadout_index,
          nameHash: input.loadout_name_hash,
          iconHash: input.loadout_icon_hash,
          colorHash: input.loadout_color_hash
        });
      }
    });
  });

  ipcMain.handle("actions:loadout:clear", async (_event, input: LoadoutClearActionInput) => {
    return runWriteAction({
      action: "loadout-clear",
      trace: input.trace,
      itemName: input.loadout_name,
      characterId: input.character_id,
      successMessage: `已清空游戏内配装栏：${input.loadout_name ?? `槽位 ${input.loadout_index + 1}`}`,
      invalidateAllItemDetails: true,
      run: async ({ config, token }) => {
        await bungieClearLoadout({
          config,
          token,
          membershipType: input.membership_type,
          characterId: input.character_id,
          loadoutIndex: input.loadout_index
        });
      }
    });
  });

  ipcMain.handle("actions:loadout:update-identifiers", async (_event, input: LoadoutIdentifiersActionInput) => {
    return runWriteAction({
      action: "loadout-update-identifiers",
      trace: input.trace,
      itemName: input.loadout_name,
      characterId: input.character_id,
      successMessage: `已更新游戏内配装标识：${input.loadout_name ?? `槽位 ${input.loadout_index + 1}`}`,
      run: async ({ config, token }) => {
        await bungieUpdateLoadoutIdentifiers({
          config,
          token,
          membershipType: input.membership_type,
          characterId: input.character_id,
          loadoutIndex: input.loadout_index,
          nameHash: input.loadout_name_hash,
          iconHash: input.loadout_icon_hash,
          colorHash: input.loadout_color_hash
        });
      }
    });
  });

  ipcMain.handle("actions:log:get", () => {
    const config = loadConfig();
    return loadActionLog(config.data.data_dir, 50);
  });

  ipcMain.handle("actions:debug:record", (_event, input: ActionDebugTraceInput) => {
    const config = loadConfig();
    const entry = writeActionDebugTrace(config.data.data_dir, sanitizeActionDebugTrace(input));
    return entry;
  });

  ipcMain.handle("actions:verification:record", (_event, input: ActionVerificationRecordInput) => {
    const planId = requiredTraceId(input.plan_id, "plan_id");
    const confirmationId = requiredTraceId(input.confirmation_id, "confirmation_id");
    const executionId = requiredTraceId(input.execution_id, "execution_id");
    const status = normalizeVerificationStatus(input.status);
    const config = loadConfig();
    const entries = appendActionLog(config.data.data_dir, {
      action: "execution-verification",
      plan_id: planId,
      confirmation_id: confirmationId,
      execution_id: executionId,
      character_id: input.character_id,
      verification_status: status,
      ok: status === "verified",
      message: input.message.trim() || "本地配装执行验证已记录"
    });
    const entry = entries[0];
    if (!entry) throw new Error("执行验证记录写入失败");
    return entry;
  });

  ipcMain.handle("actions:plan:item", (_event, input: ItemActionPlanInput) => {
    return createItemActionPlan(input);
  });

  ipcMain.handle("actions:plan:batch-transfer", (_event, input: BatchTransferPlanInput) => {
    return createBatchTransferPlan(input);
  });
}

function requiredTraceId(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} 不能为空`);
  return normalized;
}

function normalizeVerificationStatus(
  value: ActionVerificationRecordInput["status"]
): ActionVerificationRecordInput["status"] {
  if (value === "verified" || value === "partial" || value === "mismatch" || value === "unavailable") {
    return value;
  }
  throw new Error("verification status 无效");
}

function assertSocketWriteLocation(location: AccountItemLocation | null): asserts location is AccountItemLocation {
  if (!location) {
    throw new Error("当前账号中找不到这件装备，请刷新账号后重试。");
  }
  if (location.kind === "postmaster") {
    throw new Error("邮政官中的装备不能直接切换 Perk，请先取回角色背包。");
  }
}

async function prepareSocketWrite(instanceId: string): Promise<AccountItemLocation> {
  let location = await resolveAccountItemLocation(instanceId);
  if (!location) location = await resolveAccountItemLocation(instanceId, "refresh");
  assertSocketWriteLocation(location);
  await getAccountItemDetailByInstanceId(instanceId, "refresh");
  return location;
}

async function applySocketPlugWithRecovery(input: {
  config: D2Config;
  token: FreshOAuthToken;
  input: InsertSocketPlugActionInput;
  location: AccountItemLocation;
  refreshAfterSuccess: boolean;
}): Promise<void> {
  try {
    await insertSocketPlugAtLocation(input);
    if (input.refreshAfterSuccess) await refreshAccountItemDetail(input.input.item_id);
    return;
  } catch (error) {
    if (isItemRefreshRequiredWriteError(error)) {
      await retrySocketPlugAfterRefresh(input);
      return;
    }
    if (isItemNotFoundWriteError(error)) {
      const refreshedLocation = await resolveAccountItemLocation(input.input.item_id, "refresh");
      if (!refreshedLocation) {
        throw new Error("账号中已找不到这件装备。它可能已被移动、拆解或数据仍未刷新，请重新打开装备详情后再试。");
      }
      assertSocketWriteLocation(refreshedLocation);
      await refreshAccountItemDetail(input.input.item_id);
      await insertSocketPlugAtLocation({ ...input, location: refreshedLocation });
      if (input.refreshAfterSuccess) await refreshAccountItemDetail(input.input.item_id);
      return;
    }
    throw error;
  }
}

async function insertSocketPlugAtLocation(input: {
  config: D2Config;
  token: FreshOAuthToken;
  input: InsertSocketPlugActionInput;
  location: AccountItemLocation;
}): Promise<void> {
  await bungieInsertSocketPlug({
    config: input.config,
    token: input.token,
    membershipType: input.input.membership_type,
    characterId: input.location.characterId ?? input.input.character_id,
    itemId: input.input.item_id,
    socketIndex: input.input.socket_index,
    plugHash: input.input.plug_hash
  });
}

function isItemNotFoundWriteError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /ErrorCode\s*1623|item requested was not found/i.test(message);
}

function isItemRefreshRequiredWriteError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /ErrorCode\s*1679|refresh the item and try again/i.test(message);
}

async function refreshAccountItemDetail(instanceId: string) {
  await invalidateAccountSession({ scope: "item", instance_id: instanceId });
  await new Promise((resolve) => setTimeout(resolve, 500));
  return getAccountItemDetailByInstanceId(instanceId, "refresh");
}

async function retrySocketPlugAfterRefresh(input: {
  config: D2Config;
  token: FreshOAuthToken;
  input: InsertSocketPlugActionInput;
  refreshAfterSuccess: boolean;
}): Promise<void> {
  // Bungie can keep an item mutation pending briefly after returning ErrorCode 1679.
  // Each retry obtains a new item response and location; no stale request is reused.
  for (const waitMs of [750, 2_000]) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    const refreshedDetail = await refreshAccountItemDetail(input.input.item_id);
    if (hasAppliedSocketPlug(refreshedDetail, input.input)) return;
    if (!hasReusableSocketPlug(refreshedDetail, input.input)) {
      throw new Error("装备已刷新，原候选 Perk 在最新配置中不可用。请重新选择后再试。");
    }
    const refreshedLocation = await resolveAccountItemLocation(input.input.item_id, "refresh");
    assertSocketWriteLocation(refreshedLocation);
    try {
      await insertSocketPlugAtLocation({ ...input, location: refreshedLocation });
      if (input.refreshAfterSuccess) await refreshAccountItemDetail(input.input.item_id);
      return;
    } catch (error) {
      if (!isItemRefreshRequiredWriteError(error)) throw error;
    }
  }

  throw new Error("Bungie 尚未同步这件装备，已强制刷新并重试 3 次。请等待几秒后重新打开详情再试。");
}

function hasAppliedSocketPlug(
  detail: Awaited<ReturnType<typeof getAccountItemDetailByInstanceId>>,
  input: InsertSocketPlugActionInput
): boolean {
  return detail.sockets
    .find((socket) => socket.socket_index === input.socket_index)
    ?.selected_plug?.hash === input.plug_hash;
}

function hasReusableSocketPlug(
  detail: Awaited<ReturnType<typeof getAccountItemDetailByInstanceId>>,
  input: InsertSocketPlugActionInput
): boolean {
  return detail.sockets
    .find((socket) => socket.socket_index === input.socket_index)
    ?.reusable_plugs.some((plug) => plug.hash === input.plug_hash) ?? false;
}

type WriteActionRunInput = {
  action: ActionLogType;
  trace?: ActionTraceContext;
  itemName?: string;
  itemInstanceId?: string;
  characterId?: string;
  successMessage: string;
  accountPatch?: AccountItemActionPatch;
  invalidateAllItemDetails?: boolean;
  run: (context: {
    config: D2Config;
    token: FreshOAuthToken;
  }) => Promise<void>;
};

async function runWriteAction(input: WriteActionRunInput): Promise<ItemActionResult> {
  return encodeDesktopIpcFailure(
    () => performWriteAction(input),
    classifyWriteActionIpcError
  );
}

async function performWriteAction(input: WriteActionRunInput): Promise<ItemActionResult> {
  const config = loadConfig();
  const operationId = input.trace?.operation_id ?? randomUUID();
  const trace = { ...input.trace, operation_id: operationId };
  writeActionDebugTrace(config.data.data_dir, {
    operation_id: operationId,
    action: input.action,
    phase: "submit-start",
    item_name: input.itemName,
    item_instance_id: input.itemInstanceId,
    character_id: input.characterId,
    elapsed_ms: 0,
    message: "开始执行 Desktop 写操作"
  });
  const startedAt = performance.now();
  let authDurationMs = 0;
  let bungieDurationMs = 0;
  let postprocessDurationMs = 0;

  try {
    const authStartedAt = performance.now();
    const token = await loadFreshOAuthToken(config);
    authDurationMs = performance.now() - authStartedAt;
    const bungieStartedAt = performance.now();
    await input.run({ config, token });
    bungieDurationMs = performance.now() - bungieStartedAt;
    const postprocessStartedAt = performance.now();
    if (input.invalidateAllItemDetails) {
      await invalidateAccountItemDetails();
    } else if (input.itemInstanceId) {
      await invalidateAccountItemDetails([input.itemInstanceId]);
    }
    let appliedAccountPatch: AccountItemActionPatch | undefined;
    if (input.accountPatch) {
      const applied = await patchAccountSession(input.accountPatch)
        .then(() => true, () => false);
      if (applied) appliedAccountPatch = input.accountPatch;
    }
    postprocessDurationMs = performance.now() - postprocessStartedAt;
    const durationMs = performance.now() - startedAt;
    writeActionDebugTrace(config.data.data_dir, {
      operation_id: operationId,
      action: input.action,
      phase: "submit-complete",
      item_name: input.itemName,
      item_instance_id: input.itemInstanceId,
      character_id: input.characterId,
      duration_ms: durationMs,
      auth_duration_ms: authDurationMs,
      bungie_duration_ms: bungieDurationMs,
      postprocess_duration_ms: postprocessDurationMs,
      elapsed_ms: durationMs,
      ok: true,
      message: input.successMessage
    });
    appendActionLog(config.data.data_dir, {
      ...trace,
      action: input.action,
      item_name: input.itemName,
      item_instance_id: input.itemInstanceId,
      character_id: input.characterId,
      duration_ms: durationMs,
      auth_duration_ms: authDurationMs,
      bungie_duration_ms: bungieDurationMs,
      postprocess_duration_ms: postprocessDurationMs,
      ok: true,
      message: input.successMessage
    });
    return {
      ok: true,
      message: input.successMessage,
      ...(appliedAccountPatch ? { account_patch: appliedAccountPatch } : {}),
      diagnostics: {
        operation_id: operationId,
        duration_ms: durationMs,
        auth_duration_ms: authDurationMs,
        bungie_duration_ms: bungieDurationMs,
        postprocess_duration_ms: postprocessDurationMs
      }
    };
  } catch (error) {
    const durationMs = performance.now() - startedAt;
    const message = classifyWriteActionIpcError(error).message;
    writeActionDebugTrace(config.data.data_dir, {
      operation_id: operationId,
      action: input.action,
      phase: "submit-failed",
      item_name: input.itemName,
      item_instance_id: input.itemInstanceId,
      character_id: input.characterId,
      duration_ms: durationMs,
      auth_duration_ms: authDurationMs,
      bungie_duration_ms: bungieDurationMs,
      postprocess_duration_ms: postprocessDurationMs,
      elapsed_ms: durationMs,
      ok: false,
      message
    });
    appendActionLog(config.data.data_dir, {
      ...trace,
      action: input.action,
      item_name: input.itemName,
      item_instance_id: input.itemInstanceId,
      character_id: input.characterId,
      duration_ms: durationMs,
      auth_duration_ms: authDurationMs,
      bungie_duration_ms: bungieDurationMs,
      postprocess_duration_ms: postprocessDurationMs,
      ok: false,
      message
    });
    throw error;
  }
}

function sanitizeActionDebugTrace(input: ActionDebugTraceInput): ActionDebugTraceInput {
  return {
    operation_id: requiredTraceId(input.operation_id, "operation_id").slice(0, 120),
    action: input.action,
    phase: input.phase,
    ...(input.item_name ? { item_name: input.item_name.slice(0, 200) } : {}),
    ...(input.item_instance_id ? { item_instance_id: input.item_instance_id.slice(0, 80) } : {}),
    ...(input.character_id ? { character_id: input.character_id.slice(0, 80) } : {}),
    ...(isFiniteNumber(input.attempt) ? { attempt: Math.max(0, Math.trunc(input.attempt)) } : {}),
    ...(isFiniteNumber(input.total_attempts) ? { total_attempts: Math.max(0, Math.trunc(input.total_attempts)) } : {}),
    ...(isFiniteNumber(input.expected_count) ? { expected_count: Math.max(0, Math.trunc(input.expected_count)) } : {}),
    ...(isFiniteNumber(input.matched_count) ? { matched_count: Math.max(0, Math.trunc(input.matched_count)) } : {}),
    ...(input.expected_state ? { expected_state: input.expected_state } : {}),
    ...(isFiniteNumber(input.delay_ms) ? { delay_ms: Math.max(0, input.delay_ms) } : {}),
    ...(isFiniteNumber(input.duration_ms) ? { duration_ms: Math.max(0, input.duration_ms) } : {}),
    ...(isFiniteNumber(input.auth_duration_ms) ? { auth_duration_ms: Math.max(0, input.auth_duration_ms) } : {}),
    ...(isFiniteNumber(input.bungie_duration_ms) ? { bungie_duration_ms: Math.max(0, input.bungie_duration_ms) } : {}),
    ...(isFiniteNumber(input.postprocess_duration_ms) ? { postprocess_duration_ms: Math.max(0, input.postprocess_duration_ms) } : {}),
    ...(isFiniteNumber(input.elapsed_ms) ? { elapsed_ms: Math.max(0, input.elapsed_ms) } : {}),
    ...(input.account_available === undefined ? {} : { account_available: input.account_available }),
    ...(input.reflected === undefined ? {} : { reflected: input.reflected }),
    ...(input.ok === undefined ? {} : { ok: input.ok }),
    ...(input.message ? { message: input.message.slice(0, 500) } : {})
  };
}

function writeActionDebugTrace(dataDir: string, input: ActionDebugTraceInput) {
  const entry = appendActionDebugTrace(dataDir, input);
  console.info("[write-action-debug]", JSON.stringify(entry));
  return entry;
}

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

type BatchWriteActionRunInput<T> = {
  action: ActionLogType;
  items: T[];
  successMessage: string;
  runItem: (context: {
    config: D2Config;
    token: FreshOAuthToken;
  }, item: T) => Promise<void>;
  getItemName: (item: T) => string | undefined;
  getItemInstanceId: (item: T) => string | undefined;
  getCharacterId: (item: T) => string | undefined;
  getTrace?: (item: T) => ActionTraceContext | undefined;
  getAccountPatch?: (item: T) => AccountItemActionPatch | undefined;
};

async function runBatchWriteActions<T>(input: BatchWriteActionRunInput<T>): Promise<BatchItemActionResult> {
  return encodeDesktopIpcFailure(
    () => performBatchWriteActions(input),
    classifyWriteActionIpcError
  );
}

async function performBatchWriteActions<T>(
  input: BatchWriteActionRunInput<T>
): Promise<BatchItemActionResult> {
  const config = loadConfig();
  const operationId = input.items
    .map((item) => input.getTrace?.(item)?.operation_id)
    .find((value): value is string => Boolean(value))
    ?? randomUUID();
  writeActionDebugTrace(config.data.data_dir, {
    operation_id: operationId,
    action: input.action,
    phase: "submit-start",
    item_name: input.items.length === 1 ? input.getItemName(input.items[0]!) : undefined,
    item_instance_id: input.items.length === 1 ? input.getItemInstanceId(input.items[0]!) : undefined,
    character_id: input.items[0] ? input.getCharacterId(input.items[0]) : undefined,
    expected_count: input.items.length,
    elapsed_ms: 0,
    message: `开始执行批量写操作，共 ${input.items.length} 项`
  });
  const startedAt = performance.now();
  const authStartedAt = performance.now();
  let token: FreshOAuthToken;
  try {
    token = await loadFreshOAuthToken(config);
  } catch (error) {
    const durationMs = performance.now() - startedAt;
    writeActionDebugTrace(config.data.data_dir, {
      operation_id: operationId,
      action: input.action,
      phase: "submit-failed",
      item_name: input.items.length === 1 ? input.getItemName(input.items[0]!) : undefined,
      item_instance_id: input.items.length === 1 ? input.getItemInstanceId(input.items[0]!) : undefined,
      character_id: input.items[0] ? input.getCharacterId(input.items[0]) : undefined,
      expected_count: input.items.length,
      duration_ms: durationMs,
      auth_duration_ms: durationMs,
      elapsed_ms: durationMs,
      ok: false,
      message: classifyWriteActionIpcError(error).message
    });
    throw error;
  }
  const authDurationMs = performance.now() - authStartedAt;
  let successCount = 0;
  let failedCount = 0;
  const accountPatches: AccountItemActionPatch[] = [];
  const succeededItemIds: string[] = [];
  const failedItemIds: string[] = [];
  const failureMessages = new Set<string>();

  for (const item of input.items) {
    try {
      await input.runItem({ config, token }, item);
      successCount += 1;
      const itemInstanceId = input.getItemInstanceId(item);
      if (itemInstanceId) succeededItemIds.push(itemInstanceId);
      if (itemInstanceId) await invalidateAccountItemDetails([itemInstanceId]);
      const accountPatch = input.getAccountPatch?.(item);
      if (accountPatch) {
        const applied = await patchAccountSession(accountPatch)
          .then(() => true, () => false);
        if (applied) accountPatches.push(accountPatch);
      }
      appendActionLog(config.data.data_dir, {
        ...input.getTrace?.(item),
        action: input.action,
        item_name: input.getItemName(item),
        item_instance_id: input.getItemInstanceId(item),
        character_id: input.getCharacterId(item),
        ok: true,
        message: input.successMessage
      });
    } catch (error) {
      failedCount += 1;
      const itemInstanceId = input.getItemInstanceId(item);
      if (itemInstanceId) failedItemIds.push(itemInstanceId);
      const message = classifyWriteActionIpcError(error).message;
      failureMessages.add(message);
      appendActionLog(config.data.data_dir, {
        ...input.getTrace?.(item),
        action: input.action,
        item_name: input.getItemName(item),
        item_instance_id: input.getItemInstanceId(item),
        character_id: input.getCharacterId(item),
        ok: false,
        message
      });
    }
  }

  const durationMs = performance.now() - startedAt;
  writeActionDebugTrace(config.data.data_dir, {
    operation_id: operationId,
    action: input.action,
    phase: "submit-complete",
    item_name: input.items.length === 1 ? input.getItemName(input.items[0]!) : undefined,
    item_instance_id: input.items.length === 1 ? input.getItemInstanceId(input.items[0]!) : undefined,
    character_id: input.items[0] ? input.getCharacterId(input.items[0]) : undefined,
    expected_count: input.items.length,
    matched_count: successCount,
    duration_ms: durationMs,
    auth_duration_ms: authDurationMs,
    elapsed_ms: durationMs,
    ok: failedCount === 0,
    message: failedCount
      ? `批量写操作返回：成功 ${successCount}，失败 ${failedCount}`
      : `批量写操作完成：成功 ${successCount}`
  });

  return {
    ok: true,
    total: input.items.length,
    success_count: successCount,
    failed_count: failedCount,
    account_patches: accountPatches,
    succeeded_item_ids: succeededItemIds,
    failed_item_ids: failedItemIds,
    failure_messages: [...failureMessages],
    message: failedCount
      ? `批量操作完成：成功 ${successCount}，失败 ${failedCount}。`
      : `${input.successMessage}：共 ${successCount} 项。`
  };
}

async function equipItemsWithMissingResultRetry(input: {
  config: D2Config;
  token: FreshOAuthToken;
  request: BatchEquipItemsInput;
}): Promise<Map<string, number>> {
  const pendingItemIds = new Set(input.request.items.map((item) => item.item_id));
  const statuses = new Map<string, number>();
  const equipSequenceStartedAt = performance.now();
  const operationId = input.request.items
    .map((item) => item.trace?.operation_id)
    .find((value): value is string => Boolean(value))
    ?? randomUUID();

  const retryWaits = [0, 750, 2_000] as const;
  for (const [attemptIndex, waitMs] of retryWaits.entries()) {
    if (!pendingItemIds.size) break;
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));

    const pendingCount = pendingItemIds.size;
    const requestStartedAt = performance.now();
    let result: Awaited<ReturnType<typeof bungieEquipItems>>;
    try {
      result = await bungieEquipItems({
        config: input.config,
        token: input.token,
        membershipType: input.request.membership_type,
        characterId: input.request.character_id,
        itemIds: [...pendingItemIds]
      });
    } catch (error) {
      const durationMs = performance.now() - requestStartedAt;
      writeActionDebugTrace(input.config.data.data_dir, {
        operation_id: operationId,
        action: "equip",
        phase: "bungie-request",
        character_id: input.request.character_id,
        item_instance_id: pendingCount === 1 ? [...pendingItemIds][0] : undefined,
        attempt: attemptIndex + 1,
        total_attempts: retryWaits.length,
        expected_count: pendingCount,
        matched_count: 0,
        delay_ms: waitMs,
        duration_ms: durationMs,
        elapsed_ms: performance.now() - equipSequenceStartedAt,
        ok: false,
        message: classifyWriteActionIpcError(error).message
      });
      throw error;
    }
    const durationMs = performance.now() - requestStartedAt;
    const statusSummary = (result.equipResults ?? [])
      .map((itemResult) => String(itemResult.equipStatus))
      .join(",");
    writeActionDebugTrace(input.config.data.data_dir, {
      operation_id: operationId,
      action: "equip",
      phase: "bungie-request",
      character_id: input.request.character_id,
      item_instance_id: pendingCount === 1 ? [...pendingItemIds][0] : undefined,
      attempt: attemptIndex + 1,
      total_attempts: retryWaits.length,
      expected_count: pendingCount,
      matched_count: result.equipResults?.length ?? 0,
      delay_ms: waitMs,
      duration_ms: durationMs,
      elapsed_ms: performance.now() - equipSequenceStartedAt,
      ok: true,
      message: `Bungie EquipItems 返回 ${result.equipResults?.length ?? 0}/${pendingCount} 项结果，状态码 ${statusSummary || "无"}`
    });

    for (const itemResult of result.equipResults ?? []) {
      const itemInstanceId = String(itemResult.itemInstanceId);
      if (!pendingItemIds.has(itemInstanceId)) continue;
      statuses.set(itemInstanceId, itemResult.equipStatus);
      const shouldRetryItemNotFound = itemResult.equipStatus === 1623
        && attemptIndex < retryWaits.length - 1;
      if (!shouldRetryItemNotFound) pendingItemIds.delete(itemInstanceId);
    }
  }

  return statuses;
}

function describeEquipFailure(status: number): string {
  if (status === 1671) {
    return "当前角色所在位置不允许通过 Bungie API 更换装备。请返回轨道、进入社交空间或退出游戏后重试。";
  }
  if (status === 1623) {
    return "目标装备不在该角色可装备的背包中。账号数据可能已过期，或仓库转移尚未同步，请刷新账号后重试。";
  }
  return `装备失败（Bungie 状态码 ${status}）。`;
}

const latestWriteVerificationByCharacter = new Map<string, string>();
const accountWriteVerificationWaits = [2_000, 5_000, 10_000, 20_000, 30_000] as const;

function startAccountWriteVerification(input: AccountWriteVerificationInput) {
  const verificationKey = [
    input.membership_type,
    input.destiny_membership_id,
    input.character_id
  ].join(":");
  latestWriteVerificationByCharacter.set(verificationKey, input.operation_id);

  return startBackgroundTask({
    type: "account-write-sync",
    dedupeKey: input.operation_id,
    title: "确认游戏内装备状态",
    message: `装备请求已成功，正在确认 ${input.expected_equipped_item_ids.length} 件装备。`,
    run: async (context) => {
      const config = loadConfig();
      const startedAt = performance.now();
      let attempt = 0;

      while (true) {
        if (latestWriteVerificationByCharacter.get(verificationKey) !== input.operation_id) {
          context.update({
            progress_percent: 100,
            message: "该确认任务已被角色上的新装备操作替代。"
          });
          return;
        }

        const waitMs = accountWriteVerificationWaits[
          Math.min(attempt, accountWriteVerificationWaits.length - 1)
        ]!;
        await waitForAccountWriteVerification(waitMs);
        attempt += 1;

        const requestStartedAt = performance.now();
        try {
          const token = await loadFreshOAuthToken(config);
          const profile = await fetchSharedBungieJson<DestinyProfileResponse>(
            config.bungie.api_key,
            `/Destiny2/${input.membership_type}/Profile/${input.destiny_membership_id}/?components=205`,
            token.access_token,
            { forceRefresh: true, waitForRefresh: true }
          );
          const equippedItemIds = new Set(
            (profile.characterEquipment?.data?.[input.character_id]?.items ?? [])
              .map((item) => item.itemInstanceId)
              .filter((itemId): itemId is string => Boolean(itemId))
          );
          const matchedCount = input.expected_equipped_item_ids
            .filter((itemId) => equippedItemIds.has(itemId))
            .length;
          const reflected = matchedCount === input.expected_equipped_item_ids.length;
          const elapsedMs = performance.now() - startedAt;

          if (latestWriteVerificationByCharacter.get(verificationKey) !== input.operation_id) {
            context.update({
              progress_percent: 100,
              message: "该确认任务已被角色上的新装备操作替代。"
            });
            return;
          }

          writeActionDebugTrace(config.data.data_dir, {
            operation_id: input.operation_id,
            action: "equip",
            phase: "verification-read",
            character_id: input.character_id,
            attempt,
            expected_count: input.expected_equipped_item_ids.length,
            matched_count: matchedCount,
            expected_state: "equipped",
            delay_ms: waitMs,
            duration_ms: performance.now() - requestStartedAt,
            elapsed_ms: elapsedMs,
            account_available: true,
            reflected,
            ok: true,
            message: reflected
              ? "轻量 CharacterEquipment 已包含全部目标装备"
              : "轻量 CharacterEquipment 仍未包含全部目标装备"
          });

          if (reflected) {
            latestWriteVerificationByCharacter.delete(verificationKey);
            context.update({
              attempt,
              progress_percent: 100,
              message: input.failed_count > 0
                ? `已确认装备 ${matchedCount}/${input.accepted_count} 件，另有 ${input.failed_count} 件提交失败。`
                : `已确认 ${matchedCount} 件装备已在游戏内生效。`
            });
            return;
          }

          context.update({
            status: elapsedMs >= 30_000 ? "retrying" : "running",
            attempt,
            progress_percent: undefined,
            message: elapsedMs >= 30_000
              ? "装备请求已成功，Bungie 账号数据同步较慢；应用会继续后台确认。"
              : `装备请求已成功，正在等待账号数据同步（已确认 ${matchedCount}/${input.expected_equipped_item_ids.length}）。`
          });
        } catch (error) {
          const classified = classifyWriteActionIpcError(error);
          writeActionDebugTrace(config.data.data_dir, {
            operation_id: input.operation_id,
            action: "equip",
            phase: "verification-read",
            character_id: input.character_id,
            attempt,
            expected_count: input.expected_equipped_item_ids.length,
            matched_count: 0,
            expected_state: "equipped",
            delay_ms: waitMs,
            duration_ms: performance.now() - requestStartedAt,
            elapsed_ms: performance.now() - startedAt,
            account_available: false,
            reflected: false,
            ok: false,
            message: classified.message
          });
          if (!classified.retryable) {
            throw new Error(`装备请求已成功，但账号确认已暂停：${classified.message}`);
          }
          context.update({
            status: "retrying",
            attempt,
            message: `装备请求已成功，账号确认暂时不可用；应用会自动重试。${classified.message}`
          });
        }
      }
    }
  });
}

function sanitizeAccountWriteVerificationInput(
  input: AccountWriteVerificationInput
): AccountWriteVerificationInput {
  const operationId = requiredTraceId(input.operation_id, "operation_id");
  const destinyMembershipId = requiredTraceId(input.destiny_membership_id, "destiny_membership_id");
  const characterId = requiredTraceId(input.character_id, "character_id");
  const membershipType = Number(input.membership_type);
  if (!Number.isInteger(membershipType) || membershipType <= 0) {
    throw new Error("membership_type 无效");
  }
  const expectedItemIds = [...new Set(
    input.expected_equipped_item_ids
      .filter((itemId): itemId is string => typeof itemId === "string")
      .map((itemId) => itemId.trim())
      .filter(Boolean)
  )];
  if (!expectedItemIds.length) {
    throw new Error("没有需要确认的装备实例");
  }
  return {
    operation_id: operationId,
    membership_type: membershipType,
    destiny_membership_id: destinyMembershipId,
    character_id: characterId,
    ...(input.character_name?.trim() ? { character_name: input.character_name.trim().slice(0, 120) } : {}),
    expected_equipped_item_ids: expectedItemIds,
    accepted_count: normalizeNonNegativeCount(input.accepted_count),
    failed_count: normalizeNonNegativeCount(input.failed_count)
  };
}

function normalizeNonNegativeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function waitForAccountWriteVerification(waitMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, waitMs));
}
