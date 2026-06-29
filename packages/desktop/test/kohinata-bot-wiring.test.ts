import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readRendererApiContracts } from "./source-readers";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("kohinata bot wiring", () => {
  it("wires guide parsing, matching and draft creation through renderer, preload and IPC", () => {
    const apiContracts = readRendererApiContracts(desktopRoot);
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");
    const assistantIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "assistant.ts"), "utf8");

    expect(apiContracts).toContain("parseBuildGuide");
    expect(apiContracts).toContain("matchBuildGuide");
    expect(apiContracts).toContain("createGuideLoadoutDraft");
    expect(preload).toContain('ipcRenderer.invoke("assistant:guide:parse"');
    expect(preload).toContain('ipcRenderer.invoke("assistant:guide:match"');
    expect(preload).toContain('ipcRenderer.invoke("assistant:guide:draft"');
    expect(ipc).toContain("registerAssistantIpcHandlers()");
    expect(assistantIpc).toContain('ipcMain.handle("assistant:guide:parse"');
    expect(assistantIpc).toContain('ipcMain.handle("assistant:guide:match"');
    expect(assistantIpc).toContain('ipcMain.handle("assistant:guide:draft"');
  });
});
