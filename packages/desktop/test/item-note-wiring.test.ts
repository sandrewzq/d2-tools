import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readItemDetailSources, readRendererApiContracts } from "./source-readers";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("item note wiring", () => {
  it("wires local item notes through the detail modal, preload, and main process", () => {
    const itemDetailHook = readFileSync(join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetailWorkspace.ts"), "utf8");
    const itemDetailModal = readItemDetailSources(desktopRoot);
    const apiClient = readRendererApiContracts(desktopRoot);
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const vaultIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "vault.ts"), "utf8");

    expect(itemDetailHook).toContain("itemNoteDraft");
    expect(itemDetailHook).toContain("saveSelectedItemNote");
    expect(itemDetailModal).toContain("本地备注");
    expect(apiClient).toContain("saveVaultNote(input: SaveVaultNoteInput)");
    expect(preload).toContain('ipcRenderer.invoke("vault:note:save"');
    expect(vaultIpc).toContain("saveVaultNote");
    expect(vaultIpc).toContain('ipcMain.handle("vault:note:save"');
  });
});
