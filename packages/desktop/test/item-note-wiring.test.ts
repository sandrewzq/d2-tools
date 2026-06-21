import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("item note wiring", () => {
  it("wires local item notes through the detail modal, preload, and main process", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );
    const apiClient = readFileSync(
      join(desktopRoot, "src", "renderer", "api", "client.ts"),
      "utf8"
    );
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");

    expect(homePage).toContain("itemNoteDraft");
    expect(homePage).toContain("saveSelectedItemNote");
    expect(homePage).toContain("本地备注");
    expect(apiClient).toContain("saveVaultNote(input: SaveVaultNoteInput)");
    expect(preload).toContain('ipcRenderer.invoke("vault:note:save"');
    expect(ipc).toContain("saveVaultNote");
    expect(ipc).toContain('ipcMain.handle("vault:note:save"');
  });
});
