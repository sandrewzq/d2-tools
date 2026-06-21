import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("item AI analysis wiring", () => {
  it("wires the item detail modal through preload to the main AI handler", () => {
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

    expect(homePage).toContain("generateItemAiAdvice");
    expect(homePage).toContain("isGeneratingItemAi");
    expect(homePage).toContain("item-ai-panel");
    expect(apiClient).toContain("generateItemAiAdvice(input: ItemAiAdviceInput)");
    expect(apiClient).toContain("ItemAiAdviceResult");
    expect(preload).toContain('ipcRenderer.invoke("analysis:item:ai"');
    expect(ipc).toContain("generateItemAiAdvice");
    expect(ipc).toContain('ipcMain.handle("analysis:item:ai"');
  });
});
