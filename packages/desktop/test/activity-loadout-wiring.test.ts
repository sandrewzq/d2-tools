import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readRendererApiContracts } from "./source-readers";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));
const uiRoot = fileURLToPath(new URL("../../ui", import.meta.url));

describe("activity and loadout planning wiring", () => {
  it("wires activity summary and loadout transfer plans through the desktop API", () => {
    const productShell = readFileSync(join(desktopRoot, "src", "renderer", "pages", "useDesktopProductShell.tsx"), "utf8");
    const apiClient = readRendererApiContracts(desktopRoot);
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");
    const activitiesIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "activities.ts"), "utf8");
    const loadoutIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "loadouts.ts"), "utf8");
    const accountPage = [
      readFileSync(join(uiRoot, "src", "account", "AccountPageContentView.tsx"), "utf8"),
      readFileSync(join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"), "utf8")
    ].join("\n");
    const accountHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "account", "useAccountWorkspace.ts"), "utf8");
    const loadoutsPage = [
      readFileSync(join(uiRoot, "src", "loadouts", "LoadoutsPageContentView.tsx"), "utf8"),
      readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "LoadoutsPage.tsx"), "utf8")
    ].join("\n");

    expect(apiClient).toContain("getActivitySummary");
    expect(apiClient).toContain("createLoadoutTemplateTransferPlan");
    expect(preload).toContain('ipcRenderer.invoke("activities:summary"');
    expect(preload).toContain('ipcRenderer.invoke("loadouts:transfer-plan"');
    expect(ipc).toContain("registerActivitiesIpcHandlers()");
    expect(activitiesIpc).toContain('ipcMain.handle("activities:summary"');
    expect(activitiesIpc).toContain("ACTIVITY_HISTORY_SUMMARY_MODES");
    expect(activitiesIpc).toContain("mode,");
    expect(ipc).toContain("registerLoadoutIpcHandlers()");
    expect(loadoutIpc).toContain('ipcMain.handle("loadouts:transfer-plan"');
    expect(productShell).toContain("activitySummary");
    expect(productShell).toContain("activityMessage");
    expect(productShell).toContain("activityError");
    expect(productShell).toContain("onRefreshActivity: () => void loadActivitySummary()");
    expect(accountPage).toContain("活动复盘");
    expect(accountPage).toContain("activitySummary.recent");
    expect(accountPage).toContain("activitySummary.review");
    expect(accountPage).toContain("完成率");
    expect(accountPage).toContain("连续完成");
    expect(accountPage).toContain("关键统计");
    expect(accountPage).toContain("activitySummary.raids.entries");
    expect(accountPage).toContain("activitySummary.recent_items");
    expect(accountHook).toContain("最近活动");
    expect(loadoutsPage).toContain("生成转移计划");
  });
});
