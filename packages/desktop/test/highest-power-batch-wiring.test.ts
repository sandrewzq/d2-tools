import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("highest power batch wiring", () => {
  it("wires batch transfer and batch equip actions from renderer through preload to ipc", () => {
    const loadoutWriteHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "loadouts", "useLoadoutWriteActions.ts"),
      "utf8"
    );
    const apiClient = readFileSync(
      join(desktopRoot, "src", "renderer", "api", "client.ts"),
      "utf8"
    );
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const actionsIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "actions.ts"), "utf8");

    expect(loadoutWriteHook).toContain("api.batchTransferItems(");
    expect(loadoutWriteHook).toContain("api.batchEquipItems(");
    expect(loadoutWriteHook).toContain("正在从仓库取出");
    expect(loadoutWriteHook).toContain("正在装备最高光等");
    expect(apiClient).toContain("batchTransferItems(");
    expect(apiClient).toContain("batchEquipItems(");
    expect(preload).toContain('ipcRenderer.invoke("actions:items:batch-transfer"');
    expect(preload).toContain('ipcRenderer.invoke("actions:items:batch-equip"');
    expect(actionsIpc).toContain('ipcMain.handle("actions:items:batch-transfer"');
    expect(actionsIpc).toContain('ipcMain.handle("actions:items:batch-equip"');
  });
});
