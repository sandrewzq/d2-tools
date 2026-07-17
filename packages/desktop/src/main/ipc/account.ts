import { ipcMain } from "electron";
import type {
  AccountItemDetailQuery,
  AccountItemSummary,
  AccountSummary
} from "@d2-tools/core/account/summary";
import { loadConfig } from "@d2-tools/services/config/store";
import {
  loadCachedAccountSnapshot
} from "@d2-tools/services/account/snapshotStore";
import { loadOAuthToken } from "@d2-tools/services/oauth/tokenStore";
import { startBackgroundTask } from "../backgroundTasks.js";
import {
  getAccountItemDetail,
  getAccountSnapshot,
  invalidateAccountSession
} from "../runtime/accountSession.js";

let latestAccountSummary: AccountSummary | null = null;
let accountItemsByInstanceId = new Map<string, AccountItemDetailQuery>();

export function registerAccountIpcHandlers(): void {
  ipcMain.handle("account:snapshot:cached", async () => {
    const config = loadConfig();
    const accountId = loadOAuthToken(config.data.data_dir)?.membership_id;
    return accountId
      ? loadCachedAccountSnapshot(config.data.data_dir, { accountId })
      : null;
  });

  ipcMain.handle("account:summary", async () => {
    startBackgroundTask({
      type: "account-sync",
      title: "读取账号数据",
      message: "正在读取 Bungie 账号、角色和仓库。",
      run: async () => {
        await loadAccountSummary();
      }
    });

    return loadAccountSummary();
  });

  ipcMain.handle("account:item-detail", async (_event, instanceId: string) => {
    if (!instanceId || typeof instanceId !== "string") {
      throw new Error("装备实例 ID 无效");
    }

    if (!latestAccountSummary) {
      await loadAccountSummary();
    }
    const query = accountItemsByInstanceId.get(instanceId);
    if (!query) {
      throw new Error("当前账号快照中找不到该装备，请刷新账号后重试");
    }

    return getAccountItemDetail(query);
  });
}

export function invalidateAccountItemDetails(instanceIds?: readonly string[]): void {
  if (!instanceIds?.length) {
    void invalidateAccountSession({ scope: "all" });
    return;
  }

  for (const instanceId of instanceIds) {
    void invalidateAccountSession({ scope: "item", instance_id: instanceId });
  }
}

async function loadAccountSummary(): Promise<AccountSummary> {
  const summary = await getAccountSnapshot("refresh");
  cacheAccountSnapshot(summary);
  return summary;
}

function cacheAccountSnapshot(summary: AccountSummary): void {
  latestAccountSummary = summary;
  const nextItemsByInstanceId = new Map<string, AccountItemDetailQuery>();
  const addItem = (item: AccountItemSummary, characterId?: string): void => {
    if (!item.instance_id) return;
    nextItemsByInstanceId.set(item.instance_id, {
      destiny_membership_id: summary.destiny_membership_id,
      membership_type: summary.membership_type,
      instance_id: item.instance_id,
      item_hash: item.hash,
      ...(characterId ? { character_id: characterId } : {})
    });
  };

  for (const item of summary.vault.items) {
    addItem(item);
  }
  for (const character of summary.characters) {
    for (const item of character.equipped_items) addItem(item, character.character_id);
    for (const item of character.inventory_items) addItem(item, character.character_id);
    for (const item of character.postmaster_items) addItem(item, character.character_id);
  }
  accountItemsByInstanceId = nextItemsByInstanceId;
}
