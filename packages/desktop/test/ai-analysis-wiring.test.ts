import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readRendererApiContracts } from "./source-readers";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

describe("desktop AI analysis wiring", () => {
  it("keeps direct chat prompts and context without the deep-advice button flow", () => {
    const panel = readFileSync(
      join(desktopRoot, "src", "renderer", "components", "AiAnalysisPanel.tsx"),
      "utf8"
    );
    const apiClient = readRendererApiContracts(desktopRoot);
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const analysisIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "analysis.ts"), "utf8");
    const uiAssistant = readFileSync(
      join(repoRoot, "packages", "ui", "src", "assistant", "AiAssistantPanelView.tsx"),
      "utf8"
    );

    expect(panel).toContain("sendAssistantMessage(services");
    expect(panel).toContain("AiAssistantPanelView");
    expect(uiAssistant).toContain("可以直接问");
    expect(panel).not.toContain("AI 深度建议");
    expect(panel).not.toContain("api.generateVaultAiAdvice");
    expect(panel).not.toContain("请基于当前仓库做一次深度分析。");
    expect(panel).not.toContain("分析结果");
    expect(apiClient).toContain("generateVaultAiAdvice(input: VaultAnalysisInput): Promise<VaultAiAdviceResult>");
    expect(preload).toContain('ipcRenderer.invoke("analysis:vault:ai"');
    expect(analysisIpc).toContain('ipcMain.handle("analysis:vault:ai"');
  });
});
