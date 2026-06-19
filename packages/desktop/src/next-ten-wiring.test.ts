import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("next ten feature wiring", () => {
  it("wires library, alias, loadout, action plan, and diagnostics APIs", () => {
    const apiClient = readFileSync(
      join(desktopRoot, "src", "renderer", "api", "client.ts"),
      "utf8"
    );
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.cts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");

    expect(apiClient).toContain("searchPerks(query: string)");
    expect(apiClient).toContain("getItemAliases()");
    expect(apiClient).toContain("getLibraryHistory()");
    expect(apiClient).toContain("createLoadoutTemplate");
    expect(apiClient).toContain("createItemActionPlan");
    expect(apiClient).toContain("exportDiagnostics()");

    expect(preload).toContain('ipcRenderer.invoke("items:perks:search"');
    expect(preload).toContain('ipcRenderer.invoke("aliases:get"');
    expect(preload).toContain('ipcRenderer.invoke("library:history:get"');
    expect(preload).toContain('ipcRenderer.invoke("loadouts:create"');
    expect(preload).toContain('ipcRenderer.invoke("actions:plan:item"');
    expect(preload).toContain('ipcRenderer.invoke("diagnostics:export"');

    expect(ipc).toContain('ipcMain.handle("items:perks:search"');
    expect(ipc).toContain('ipcMain.handle("aliases:get"');
    expect(ipc).toContain('ipcMain.handle("library:history:get"');
    expect(ipc).toContain('ipcMain.handle("loadouts:create"');
    expect(ipc).toContain('ipcMain.handle("actions:plan:item"');
    expect(ipc).toContain('ipcMain.handle("diagnostics:export"');
  });
});
