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
    const itemDetailModal = readFileSync(join(desktopRoot, "src", "renderer", "shared", "components", "ItemDetailModal.tsx"), "utf8");
    const itemDetailHook = readFileSync(join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetailWorkspace.ts"), "utf8");
    const loadoutWriteHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "useLoadoutWriteActions.ts"), "utf8");
    const vaultWriteHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "useVaultWriteActions.ts"), "utf8");
    const apiClient = readFileSync(
      join(desktopRoot, "src", "renderer", "api", "client.ts"),
      "utf8"
    );
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const actionsIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "actions.ts"), "utf8");

    expect(homePage).toContain("writeActionsEnabled");
    expect(itemDetailHook).toContain("runItemWriteAction");
    expect(itemDetailHook).toContain("latestConfig = await api.getConfig()");
    expect(itemDetailHook).toContain("latestConfig.features.write_actions_enabled");
    expect(itemDetailHook).toContain("window.confirm");
    expect(itemDetailModal).toContain("setItemLockState");
    expect(itemDetailModal).toContain("transferItem");
    expect(itemDetailModal).toContain("equipItem");
    expect(itemDetailModal).toContain("pullFromPostmaster");
    expect(loadoutWriteHook).toContain("equipLoadout");
    expect(loadoutWriteHook).toContain("snapshotLoadout");
    expect(vaultWriteHook).toContain("api.setItemLockState");
    expect(itemDetailHook).toContain("loadActionLog");
    expect(apiClient).toContain("setItemLockState(input: ItemLockActionInput)");
    expect(apiClient).toContain("transferItem(input: ItemTransferActionInput)");
    expect(apiClient).toContain("equipItem(input: ItemEquipActionInput)");
    expect(apiClient).toContain("pullFromPostmaster(input: PostmasterPullActionInput)");
    expect(apiClient).toContain("equipLoadout(input: LoadoutEquipActionInput)");
    expect(apiClient).toContain("snapshotLoadout(input: LoadoutSnapshotActionInput)");
    expect(apiClient).toContain("getActionLog(): Promise<ActionLogEntry[]>");
    expect(preload).toContain('ipcRenderer.invoke("actions:item:set-lock"');
    expect(preload).toContain('ipcRenderer.invoke("actions:item:transfer"');
    expect(preload).toContain('ipcRenderer.invoke("actions:item:equip"');
    expect(preload).toContain('ipcRenderer.invoke("actions:item:pull-postmaster"');
    expect(preload).toContain('ipcRenderer.invoke("actions:loadout:equip"');
    expect(preload).toContain('ipcRenderer.invoke("actions:loadout:snapshot"');
    expect(preload).toContain('ipcRenderer.invoke("actions:log:get"');
    expect(actionsIpc).toContain('ipcMain.handle("actions:item:set-lock"');
    expect(actionsIpc).toContain('ipcMain.handle("actions:item:transfer"');
    expect(actionsIpc).toContain('ipcMain.handle("actions:item:equip"');
    expect(actionsIpc).toContain('ipcMain.handle("actions:item:pull-postmaster"');
    expect(actionsIpc).toContain('ipcMain.handle("actions:loadout:equip"');
    expect(actionsIpc).toContain('ipcMain.handle("actions:loadout:snapshot"');
    expect(actionsIpc).toContain("write_actions_enabled");
    expect(actionsIpc).toContain("appendActionLog");
  });
});
