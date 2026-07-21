import { ipcMain } from "electron";
import type {
  AccountItemDetailRequestOptions,
  AccountSummary,
  AccountSummaryRequestOptions
} from "../../contracts/account.js";
import {
  classifyAccountIpcError,
  encodeDesktopIpcFailure
} from "../../contracts/errors.js";
import { loadConfig } from "@d2-tools/services/config/store";
import {
  loadCachedAccountSnapshot
} from "@d2-tools/services/account/snapshotStore";
import { loadOAuthToken } from "@d2-tools/services/oauth/tokenStore";
import { startBackgroundTask } from "../backgroundTasks.js";
import {
  getAccountItemDetailByInstanceId,
  getAccountSnapshot
} from "../runtime/accountSession.js";

export function registerAccountIpcHandlers(): void {
  ipcMain.handle("account:snapshot:cached", async () => {
    const config = loadConfig();
    const accountId = loadOAuthToken(config.data.data_dir)?.membership_id;
    return accountId
      ? loadCachedAccountSnapshot(config.data.data_dir, { accountId })
      : null;
  });

  ipcMain.handle("account:summary", (_event, options?: AccountSummaryRequestOptions) => encodeDesktopIpcFailure(async () => {
    const summaryRequest = Promise.resolve().then(() => loadAccountSummary(options));
    startBackgroundTask({
      type: "account-sync",
      title: "读取账号数据",
      message: "正在读取 Bungie 账号、角色和仓库。",
      run: async () => {
        await summaryRequest;
      }
    });

    return summaryRequest;
  }, classifyAccountIpcError));

  ipcMain.handle("account:item-detail", (_event, instanceId: string, options?: AccountItemDetailRequestOptions) => encodeDesktopIpcFailure(async () => {
    if (!instanceId || typeof instanceId !== "string") {
      throw new Error("装备实例 ID 无效");
    }

    return getAccountItemDetailByInstanceId(instanceId, options?.force ? "refresh" : "cached");
  }, classifyAccountIpcError));
}

async function loadAccountSummary(options?: AccountSummaryRequestOptions): Promise<AccountSummary> {
  return getAccountSnapshot(options?.force ? "refresh" : "cached");
}
