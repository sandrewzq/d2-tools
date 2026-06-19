import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("item write actions wiring", () => {
  it("wires guarded item write actions through modal, preload, and main process", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );
    const apiClient = readFileSync(
      join(desktopRoot, "src", "renderer", "api", "client.ts"),
      "utf8"
    );
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.cts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");

    expect(homePage).toContain("writeActionsEnabled");
    expect(homePage).toContain("runItemWriteAction");
    expect(homePage).toContain("latestConfig = await api.getConfig()");
    expect(homePage).toContain("latestConfig.features.write_actions_enabled");
    expect(homePage).toContain("window.confirm");
    expect(homePage).toContain("setItemLockState");
    expect(homePage).toContain("transferItem");
    expect(homePage).toContain("equipItem");
    expect(homePage).toContain("loadActionLog");
    expect(apiClient).toContain("setItemLockState(input: ItemLockActionInput)");
    expect(apiClient).toContain("transferItem(input: ItemTransferActionInput)");
    expect(apiClient).toContain("equipItem(input: ItemEquipActionInput)");
    expect(apiClient).toContain("getActionLog(): Promise<ActionLogEntry[]>");
    expect(preload).toContain('ipcRenderer.invoke("actions:item:set-lock"');
    expect(preload).toContain('ipcRenderer.invoke("actions:item:transfer"');
    expect(preload).toContain('ipcRenderer.invoke("actions:item:equip"');
    expect(preload).toContain('ipcRenderer.invoke("actions:log:get"');
    expect(ipc).toContain('ipcMain.handle("actions:item:set-lock"');
    expect(ipc).toContain('ipcMain.handle("actions:item:transfer"');
    expect(ipc).toContain('ipcMain.handle("actions:item:equip"');
    expect(ipc).toContain("write_actions_enabled");
    expect(ipc).toContain("appendActionLog");
  });
});
