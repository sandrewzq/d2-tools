import { ipcMain } from "electron";
import {
  appendActionLog,
  loadActionLog,
  type ActionLogType
} from "@d2-tools/core/actions/log";
import {
  createBatchTransferPlan,
  createItemActionPlan
} from "@d2-tools/core/actions/plan";
import {
  equipItem as bungieEquipItem,
  insertSocketPlug as bungieInsertSocketPlug,
  equipLoadout as bungieEquipLoadout,
  pullFromPostmaster as bungiePullFromPostmaster,
  setItemLockState as bungieSetItemLockState,
  snapshotLoadout as bungieSnapshotLoadout,
  transferItem as bungieTransferItem
} from "@d2-tools/core/bungie/actions";
import type { D2Config } from "@d2-tools/core/config/schema";
import { loadConfig } from "@d2-tools/services/config/store";
import type {
  AccountItemActionPatch,
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
  LoadoutSnapshotActionInput,
  PostmasterPullActionInput
} from "../../contracts/actions.js";
import {
  classifyWriteActionIpcError,
  encodeDesktopIpcFailure
} from "../../contracts/errors.js";
import { loadFreshOAuthToken, type FreshOAuthToken } from "./authSession.js";
import {
  invalidateAccountItemDetails,
  patchAccountSession
} from "../runtime/accountSession.js";

export function registerActionIpcHandlers(): void {
  ipcMain.handle("actions:item:set-lock", async (_event, input: ItemLockActionInput) => {
    return runWriteAction({
      action: "set-lock",
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
      itemName: input.item_name,
      itemInstanceId: input.item_id,
      characterId: input.character_id,
      successMessage: `已应用 Perk：${input.plug_name ?? input.plug_hash}`,
      run: async ({ config, token }) => {
        await bungieInsertSocketPlug({
          config,
          token,
          membershipType: input.membership_type,
          characterId: input.character_id,
          itemId: input.item_id,
          socketIndex: input.socket_index,
          plugHash: input.plug_hash
        });
      }
    });
  });

  ipcMain.handle("actions:item:transfer", async (_event, input: ItemTransferActionInput) => {
    return runWriteAction({
      action: "transfer",
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
    return runBatchWriteActions({
      action: "equip",
      items: input.items,
      successMessage: "批量装备完成",
      runItem: async ({ config, token }, item) => {
        await bungieEquipItem({
          config,
          token,
          membershipType: input.membership_type,
          characterId: input.character_id,
          itemId: item.item_id
        });
      },
      getItemName: (item) => item.item_name,
      getItemInstanceId: (item) => item.item_id,
      getCharacterId: (item) => item.character_id,
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

  ipcMain.handle("actions:log:get", () => {
    const config = loadConfig();
    return loadActionLog(config.data.data_dir, 50);
  });

  ipcMain.handle("actions:plan:item", (_event, input: ItemActionPlanInput) => {
    return createItemActionPlan(input);
  });

  ipcMain.handle("actions:plan:batch-transfer", (_event, input: BatchTransferPlanInput) => {
    return createBatchTransferPlan(input);
  });
}

type WriteActionRunInput = {
  action: ActionLogType;
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
  if (!config.features.write_actions_enabled) {
    throw new Error("写操作未开启。请先到设置页开启装备写操作。");
  }

  const token = await loadFreshOAuthToken(config);

  try {
    await input.run({ config, token });
    if (input.invalidateAllItemDetails) {
      invalidateAccountItemDetails();
    } else if (input.itemInstanceId) {
      invalidateAccountItemDetails([input.itemInstanceId]);
    }
    let appliedAccountPatch: AccountItemActionPatch | undefined;
    if (input.accountPatch) {
      const applied = await patchAccountSession(input.accountPatch)
        .then(() => true, () => false);
      if (applied) appliedAccountPatch = input.accountPatch;
    }
    appendActionLog(config.data.data_dir, {
      action: input.action,
      item_name: input.itemName,
      item_instance_id: input.itemInstanceId,
      character_id: input.characterId,
      ok: true,
      message: input.successMessage
    });
    return {
      ok: true,
      message: input.successMessage,
      ...(appliedAccountPatch ? { account_patch: appliedAccountPatch } : {})
    };
  } catch (error) {
    const message = classifyWriteActionIpcError(error).message;
    appendActionLog(config.data.data_dir, {
      action: input.action,
      item_name: input.itemName,
      item_instance_id: input.itemInstanceId,
      character_id: input.characterId,
      ok: false,
      message
    });
    throw error;
  }
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
  if (!config.features.write_actions_enabled) {
    throw new Error("写操作未开启。请先到设置页开启装备写操作。");
  }

  const token = await loadFreshOAuthToken(config);
  let successCount = 0;
  let failedCount = 0;
  const accountPatches: AccountItemActionPatch[] = [];

  for (const item of input.items) {
    try {
      await input.runItem({ config, token }, item);
      successCount += 1;
      const itemInstanceId = input.getItemInstanceId(item);
      if (itemInstanceId) invalidateAccountItemDetails([itemInstanceId]);
      const accountPatch = input.getAccountPatch?.(item);
      if (accountPatch) {
        const applied = await patchAccountSession(accountPatch)
          .then(() => true, () => false);
        if (applied) accountPatches.push(accountPatch);
      }
      appendActionLog(config.data.data_dir, {
        action: input.action,
        item_name: input.getItemName(item),
        item_instance_id: input.getItemInstanceId(item),
        character_id: input.getCharacterId(item),
        ok: true,
        message: input.successMessage
      });
    } catch (error) {
      failedCount += 1;
      const message = classifyWriteActionIpcError(error).message;
      appendActionLog(config.data.data_dir, {
        action: input.action,
        item_name: input.getItemName(item),
        item_instance_id: input.getItemInstanceId(item),
        character_id: input.getCharacterId(item),
        ok: false,
        message
      });
    }
  }

  return {
    ok: true,
    total: input.items.length,
    success_count: successCount,
    failed_count: failedCount,
    account_patches: accountPatches,
    message: failedCount
      ? `批量操作完成：成功 ${successCount}，失败 ${failedCount}。`
      : `${input.successMessage}：共 ${successCount} 项。`
  };
}
