import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isAiSettingsConfigured, normalizeAiSettings } from "../src/renderer/utils/aiSettings";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("AI settings panel helpers", () => {
  it("trims AI settings and keeps empty provider as disabled", () => {
    expect(normalizeAiSettings({
      provider: " openai_responses ",
      api_key: " key ",
      model: " gpt-4.1 ",
      base_url: " https://api.example.com/v1 ",
      enable_lightgg: true
    })).toEqual({
      provider: "openai_responses",
      api_key: "key",
      model: "gpt-4.1",
      base_url: "https://api.example.com/v1",
      enable_lightgg: true
    });
    expect(normalizeAiSettings({ provider: " none ", api_key: " key ", model: " model ", base_url: " url ", enable_lightgg: true }))
      .toEqual({ provider: "", api_key: "", model: "", base_url: "", enable_lightgg: false });
  });

  it("normalizes legacy AI providers to the new provider modes", () => {
    expect(normalizeAiSettings({
      provider: " openai ",
      api_key: " key ",
      model: " gpt-4.1 ",
      base_url: "",
      enable_lightgg: false
    }).provider).toBe("openai_chat");

    expect(normalizeAiSettings({
      provider: " deepseek ",
      api_key: " key ",
      model: " deepseek-chat ",
      base_url: "",
      enable_lightgg: false
    })).toEqual({
      provider: "openai_compatible",
      api_key: "key",
      model: "deepseek-chat",
      base_url: "https://api.deepseek.com",
      enable_lightgg: false
    });

    expect(normalizeAiSettings({
      provider: " custom ",
      api_key: " key ",
      model: " model ",
      base_url: " https://example.test/v1 ",
      enable_lightgg: false
    }).provider).toBe("openai_compatible");
  });

  it("detects whether AI is actually configured for the assistant page", () => {
    expect(isAiSettingsConfigured({
      provider: " none ",
      api_key: " key ",
      model: " model ",
      base_url: " https://example.test/v1 ",
      enable_lightgg: false
    })).toBe(false);

    expect(isAiSettingsConfigured({
      provider: " openai_responses ",
      api_key: " key ",
      model: " gpt-4.1-mini ",
      base_url: "",
      enable_lightgg: false
    })).toBe(true);

    expect(isAiSettingsConfigured({
      provider: " anthropic ",
      api_key: "",
      model: " claude-sonnet-4-5 ",
      base_url: "",
      enable_lightgg: false
    })).toBe(false);
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
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");

    expect(panel).toContain("保存并测试连接");
    expect(panel).toContain("OpenAI Responses API（推荐）");
    expect(panel).toContain("OpenAI Chat Completions");
    expect(panel).toContain("OpenAI 兼容接口");
    expect(panel).toContain("Anthropic Claude");
    expect(panel).toContain("api.testAiConnection()");
    expect(apiClient).toContain("testAiConnection(): Promise<AiConnectionTestResult>");
    expect(preload).toContain('ipcRenderer.invoke("ai:test")');
    expect(ipc).toContain('ipcMain.handle("ai:test"');
  });

  it("mounts AI settings in the settings page and sends unconfigured users there", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    expect(homePage).toContain('onConfigureAi={() => setActivePage("settings")}');
    expect(homePage).toContain("activePage === \"settings\"");
    expect(homePage).toContain("activePage === \"ai\"");
    expect(homePage).toContain("!isAiConfigured");
    expect(homePage).toContain('setActivePage("settings")');
  });
});
