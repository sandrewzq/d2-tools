import { ipcMain } from "electron";
import type { AccountSummary } from "@d2-tools/core/account/summary";
import { startBackgroundTask } from "../backgroundTasks.js";
import { runHeavyTaskInWorker } from "../workers/heavyTaskRunner.js";

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
  return runHeavyTaskInWorker<AccountSummary>({ task: "account-summary" });
}
