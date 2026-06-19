import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("activity and loadout planning wiring", () => {
  it("wires activity summary and loadout transfer plans through the desktop API", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const apiClient = readFileSync(join(desktopRoot, "src", "renderer", "api", "client.ts"), "utf8");
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.cts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");

    expect(apiClient).toContain("getActivitySummary");
    expect(apiClient).toContain("createLoadoutTemplateTransferPlan");
    expect(preload).toContain('ipcRenderer.invoke("activities:summary"');
    expect(preload).toContain('ipcRenderer.invoke("loadouts:transfer-plan"');
    expect(ipc).toContain('ipcMain.handle("activities:summary"');
    expect(ipc).toContain('ipcMain.handle("loadouts:transfer-plan"');
    expect(homePage).toContain("最近活动");
    expect(homePage).toContain("生成转移计划");
  });
});
