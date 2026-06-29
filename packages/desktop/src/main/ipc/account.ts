import { ipcMain } from "electron";
import { fetchAccountSummary } from "@d2-tools/core/account/summary";
import type { AccountSummary } from "@d2-tools/core/account/summary";
import { loadConfig } from "@d2-tools/core/config/store";
import { loadDefinitionComponent } from "@d2-tools/core/manifest/definitions";
import { startBackgroundTask } from "../backgroundTasks.js";
import { loadFreshOAuthToken } from "./authSession.js";

let accountSummaryPromise: Promise<AccountSummary> | null = null;

export function registerAccountIpcHandlers(): void {
  ipcMain.handle("account:summary", async () => {
    startBackgroundTask({
      type: "account-sync",
      title: "读取账号数据",
      message: "正在读取 Bungie 账号、角色和仓库。",
      run: async () => {
        await loadAccountSummaryWithDeduplication();
      }
    });

    return loadAccountSummaryWithDeduplication();
  });
}

function loadAccountSummaryWithDeduplication(): Promise<AccountSummary> {
  if (!accountSummaryPromise) {
    accountSummaryPromise = fetchDesktopAccountSummary().finally(() => {
      accountSummaryPromise = null;
    });
  }

  return accountSummaryPromise;
}

async function fetchDesktopAccountSummary(): Promise<AccountSummary> {
  const config = loadConfig();
  const token = await loadFreshOAuthToken(config);

  const itemDefinitions = loadDefinitionComponent(
    config.data.data_dir,
    "DestinyInventoryItemDefinition"
  );
  const bucketDefinitions = loadDefinitionComponent(
    config.data.data_dir,
    "DestinyInventoryBucketDefinition"
  );
  const plugSetDefinitions = loadDefinitionComponent(
    config.data.data_dir,
    "DestinyPlugSetDefinition"
  );
  const loadoutNameDefinitions = loadDefinitionComponent(
    config.data.data_dir,
    "DestinyLoadoutNameDefinition"
  );
  if (!itemDefinitions) {
    throw new Error("请先初始化资料库");
  }

  return fetchAccountSummary({
    config,
    token,
    itemDefinitions,
    bucketDefinitions: bucketDefinitions ?? undefined,
    plugSetDefinitions: plugSetDefinitions ?? undefined,
    loadoutNameDefinitions: loadoutNameDefinitions ?? undefined
  });
}
