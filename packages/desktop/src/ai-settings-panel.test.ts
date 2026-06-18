import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeAiSettings } from "./renderer/components/aiSettings";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("AI settings panel helpers", () => {
  it("trims AI settings and keeps empty provider as disabled", () => {
    expect(normalizeAiSettings({
      provider: " openai ",
      api_key: " key ",
      model: " gpt-4.1 ",
      base_url: " https://api.example.com/v1 "
    })).toEqual({
      provider: "openai",
      api_key: "key",
      model: "gpt-4.1",
      base_url: "https://api.example.com/v1"
    });
    expect(normalizeAiSettings({ provider: " none ", api_key: " key ", model: " model ", base_url: " url " }))
      .toEqual({ provider: "", api_key: "", model: "", base_url: "" });
  });

  it("wires the AI connection test button through preload and main IPC", () => {
    const panel = readFileSync(
      join(desktopRoot, "src", "renderer", "components", "AiSettingsPanel.tsx"),
      "utf8"
    );
    const apiClient = readFileSync(
      join(desktopRoot, "src", "renderer", "api", "client.ts"),
      "utf8"
    );
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.cts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");

    expect(panel).toContain("保存并测试连接");
    expect(panel).toContain("api.testAiConnection()");
    expect(apiClient).toContain("testAiConnection(): Promise<AiConnectionTestResult>");
    expect(preload).toContain('ipcRenderer.invoke("ai:test")');
    expect(ipc).toContain('ipcMain.handle("ai:test"');
  });
});
