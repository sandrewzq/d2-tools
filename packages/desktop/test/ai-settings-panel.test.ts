import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getAiLightggSupportSettings,
  isAiSettingsConfigured,
  normalizeAiSettings
} from "../src/renderer/utils/aiSettings";
import { readRendererApiContracts } from "./source-readers";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("AI settings panel helpers", () => {
  it("trims AI settings and keeps empty protocol as disabled", () => {
    expect(normalizeAiSettings({
      protocol: " openai_responses ",
      provider: "",
      api_key: " key ",
      model: " gpt-4.1 ",
      base_url: " https://api.example.com/v1 ",
      enable_lightgg: true,
      force_lightgg: false
    })).toEqual({
      protocol: "openai_responses",
      provider: "",
      api_key: "key",
      model: "gpt-4.1",
      base_url: "https://api.example.com/v1",
      enable_lightgg: true,
      force_lightgg: false
    });
    expect(normalizeAiSettings({
      protocol: " none ",
      provider: "",
      api_key: " key ",
      model: " model ",
      base_url: " url ",
      enable_lightgg: true,
      force_lightgg: true
    })).toEqual({ protocol: "", provider: "", api_key: "", model: "", base_url: "", enable_lightgg: false, force_lightgg: false });
  });

  it("normalizes legacy AI providers to the new protocol modes", () => {
    expect(normalizeAiSettings({
      protocol: "",
      provider: " openai ",
      api_key: " key ",
      model: " gpt-4.1 ",
      base_url: "",
      enable_lightgg: false,
      force_lightgg: false
    }).protocol).toBe("openai_chat_completions");

    expect(normalizeAiSettings({
      protocol: "",
      provider: " deepseek ",
      api_key: " key ",
      model: " deepseek-chat ",
      base_url: "",
      enable_lightgg: false,
      force_lightgg: false
    })).toEqual({
      protocol: "openai_chat_completions",
      provider: "",
      api_key: "key",
      model: "deepseek-chat",
      base_url: "https://api.deepseek.com",
      enable_lightgg: false,
      force_lightgg: false
    });

    expect(normalizeAiSettings({
      protocol: "",
      provider: " custom ",
      api_key: " key ",
      model: " model ",
      base_url: " https://example.test/v1 ",
      enable_lightgg: false,
      force_lightgg: false
    }).protocol).toBe("openai_chat_completions");
  });

  it("detects whether AI is actually configured for the assistant page", () => {
    expect(isAiSettingsConfigured({
      protocol: " none ",
      provider: "",
      api_key: " key ",
      model: " model ",
      base_url: " https://example.test/v1 ",
      enable_lightgg: false,
      force_lightgg: false
    })).toBe(false);

    expect(isAiSettingsConfigured({
      protocol: " openai_responses ",
      provider: "",
      api_key: " key ",
      model: " gpt-4.1-mini ",
      base_url: "",
      enable_lightgg: false,
      force_lightgg: false
    })).toBe(true);

    expect(isAiSettingsConfigured({
      protocol: " anthropic_messages ",
      provider: "",
      api_key: "",
      model: " claude-sonnet-4-5 ",
      base_url: "",
      enable_lightgg: false,
      force_lightgg: false
    })).toBe(false);
  });

  it("detects light.gg automatic support and force-enable eligibility by protocol", () => {
    expect(getAiLightggSupportSettings({
      protocol: "openai_responses",
      provider: "",
      api_key: "",
      model: "",
      base_url: "",
      enable_lightgg: false,
      force_lightgg: false
    })).toMatchObject({ supported: true, canForce: false });

    expect(getAiLightggSupportSettings({
      protocol: "openai_chat_completions",
      provider: "",
      api_key: "",
      model: "",
      base_url: "",
      enable_lightgg: false,
      force_lightgg: false
    })).toMatchObject({ supported: false, canForce: true });

    expect(getAiLightggSupportSettings({
      protocol: "anthropic_messages",
      provider: "",
      api_key: "",
      model: "",
      base_url: "",
      enable_lightgg: false,
      force_lightgg: false
    })).toMatchObject({ supported: false, canForce: true });
  });

  it("wires the AI connection test button through preload and main IPC", () => {
    const panel = readFileSync(
      join(desktopRoot, "src", "renderer", "components", "AiSettingsPanel.tsx"),
      "utf8"
    );
    const apiClient = readRendererApiContracts(desktopRoot);
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const analysisIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "analysis.ts"), "utf8");

    expect(panel).toContain("保存并测试连接");
    expect(panel).toContain("OpenAI Responses");
    expect(panel).toContain("OpenAI Chat Completions");
    expect(panel).toContain("Anthropic Messages");
    expect(panel).not.toContain("OpenAI 兼容接口");
    expect(panel).toContain("启用 light.gg 实时分析");
    expect(panel).toContain("强制开启");
    expect(panel).toContain("api.listAiModels");
    expect(panel).toContain("api.testAiConnection()");
    expect(apiClient).toContain("listAiModels(config: D2Config): Promise<AiModelListResult>");
    expect(apiClient).toContain("testAiConnection(): Promise<AiConnectionTestResult>");
    expect(preload).toContain('ipcRenderer.invoke("ai:models"');
    expect(preload).toContain('ipcRenderer.invoke("ai:test")');
    expect(analysisIpc).toContain('ipcMain.handle("ai:models"');
    expect(analysisIpc).toContain('ipcMain.handle("ai:test"');
  });

  it("mounts AI settings in the settings page and sends unconfigured users there", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );
    const settingsPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "settings", "SettingsPage.tsx"),
      "utf8"
    );
    const aiPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "ai", "AiPage.tsx"),
      "utf8"
    );

    expect(homePage).toContain('onConfigureAi={() => setActivePage("settings")}');
    expect(homePage).toContain("<SettingsPage");
    expect(homePage).not.toContain("<AiSettingsPanel");
    expect(homePage).not.toContain("查看或修改 Bungie 配置、写操作开关和本地日志。");
    expect(settingsPage).toContain("export function SettingsPage");
    expect(settingsPage).toContain("<AiSettingsPanel");
    expect(settingsPage).toContain("查看或修改 Bungie 配置、写操作开关和本地日志。");
    expect(homePage).toContain("activePage === \"ai\"");
    expect(aiPage).toContain("!props.isConfigured");
    expect(aiPage).toContain("props.onConfigureAi");
  });
});
