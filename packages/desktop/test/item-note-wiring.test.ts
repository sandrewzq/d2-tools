import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readItemDetailSources, readRendererApiContracts } from "./source-readers";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("item note wiring", () => {
  it("routes item note and local tag writes through the shared local-data service adapter", () => {
    const itemDetailHook = readFileSync(join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetailWorkspace.ts"), "utf8");
    const itemDetailModal = readItemDetailSources(desktopRoot);
    const servicesClient = readFileSync(join(desktopRoot, "src", "renderer", "api", "services.ts"), "utf8");
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const vaultIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "vault.ts"), "utf8");

    expect(itemDetailHook).toContain("itemNoteDraft");
    expect(itemDetailHook).toContain("saveSelectedItemNote");
    expect(itemDetailHook).toContain('import { services } from "../../api/services"');
    expect(itemDetailHook).toContain("services.localData.saveVaultNote");
    expect(itemDetailHook).toContain("services.localData.saveVaultTag");
    expect(itemDetailHook).not.toContain("api.saveVaultNote(");
    expect(itemDetailHook).not.toContain("api.saveVaultTag(");
    expect(itemDetailModal).toContain("本地备注");
    expect(servicesClient).toContain("createAppServices(api)");
    expect(preload).toContain('ipcRenderer.invoke("vault:note:save"');
    expect(vaultIpc).toContain("saveVaultNote");
    expect(vaultIpc).toContain('ipcMain.handle("vault:note:save"');
  });

  it("renders local item tag controls directly in the detail modal", () => {
    const itemDetailHook = readFileSync(join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetailWorkspace.ts"), "utf8");
    const itemDetailModal = readItemDetailSources(desktopRoot);
    const styles = readFileSync(join(desktopRoot, "..", "ui", "src", "styles.css"), "utf8");

    expect(itemDetailHook).toContain("saveSelectedItemTag");
    expect(itemDetailModal).toContain("<ItemLocalTagPanel");
    expect(itemDetailModal).toContain("item-local-tag-panel");
    expect(itemDetailModal).toContain("本地标记");
    expect(itemDetailModal).toContain("onSaveSelectedItemTag(\"keep\")");
    expect(itemDetailModal).toContain("onSaveSelectedItemTag(\"review\")");
    expect(itemDetailModal).toContain("onSaveSelectedItemTag(\"farm\")");
    expect(itemDetailModal).toContain("onSaveSelectedItemTag(\"loadout\")");
    expect(itemDetailModal).toContain("onSaveSelectedItemTag(\"junk\")");
    expect(itemDetailModal).toContain("onSaveSelectedItemTag(\"none\")");
    expect(itemDetailModal).toContain("formatVaultTagLabel");
    expect(styles).toContain(".vault-tag-current.tag-farm");
    expect(styles).toContain(".vault-tag-current.tag-loadout");
  });
});
