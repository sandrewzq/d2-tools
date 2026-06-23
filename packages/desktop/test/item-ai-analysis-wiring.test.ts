import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readItemDetailSources, readRendererApiContracts } from "./source-readers";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("item AI analysis wiring", () => {
  it("wires the item detail modal through preload to the main AI handler", () => {
    const itemDetailHook = readFileSync(join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetailWorkspace.ts"), "utf8");
    const itemDetailModal = readItemDetailSources(desktopRoot);
    const apiClient = readRendererApiContracts(desktopRoot);
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const analysisIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "analysis.ts"), "utf8");

    expect(itemDetailHook).toContain("generateItemAiAdvice");
    expect(itemDetailHook).toContain("isGeneratingItemAi");
    expect(itemDetailModal).toContain("item-ai-panel");
    expect(apiClient).toContain("generateItemAiAdvice(input: ItemAiAdviceInput)");
    expect(apiClient).toContain("ItemAiAdviceResult");
    expect(preload).toContain('ipcRenderer.invoke("analysis:item:ai"');
    expect(analysisIpc).toContain("generateItemAiAdvice");
    expect(analysisIpc).toContain('ipcMain.handle("analysis:item:ai"');
  });
});
