import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createMockPlatformServices } from "@d2-tools/platform/mock";

import { App, loadFoundationDashboardData } from "./App";

describe("desktop app", () => {
  it("renders the foundation dashboard", async () => {
    const platform = createMockPlatformServices({ dataDir: "D:/data/d2-tools" });
    const html = renderToStaticMarkup(<App platform={platform} />);

    expect(html).toContain("d2-tools");
    expect(html).toContain("架构底座");
  });

  it("loads settings through the data settings repository", async () => {
    const getSettings = vi.fn(async () => ({
      dataDir: "D:/stored/d2-tools",
      bungie: { apiKeyConfigured: true },
      ai: { providerConfigured: true, providerId: "openai", model: "gpt-5" }
    }));
    const getStatus = vi.fn(async () => ({
      state: "missing" as const,
      version: null,
      updatedAt: null,
      errorMessage: null
    }));
    const listConversations = vi.fn(async () => []);

    const result = await loadFoundationDashboardData({
      settings: {
        getSettings,
        saveSettings: vi.fn()
      },
      manifest: {
        getStatus,
        refresh: vi.fn()
      },
      ai: {
        listConversations,
        saveConversation: vi.fn()
      }
    });

    expect(getSettings).toHaveBeenCalledTimes(1);
    expect(getStatus).toHaveBeenCalledTimes(1);
    expect(listConversations).toHaveBeenCalledTimes(1);
    expect(result.settings.dataDir).toBe("D:/stored/d2-tools");
  });
});
