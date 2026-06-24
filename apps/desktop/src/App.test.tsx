import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createMockPlatformServices } from "@d2-tools/platform/mock";

import {
  App,
  LATEST_RELEASE_URL,
  createUpdateErrorStatus,
  createUpdateInstallErrorStatus,
  createUpdateInstallRequestedStatus,
  createUpdateStatusFromCheckResult,
  loadFoundationDashboardData
} from "./App";

describe("desktop app", () => {
  it("renders the foundation dashboard", async () => {
    const platform = createMockPlatformServices({ dataDir: "D:/data/d2-tools" });
    const html = renderToStaticMarkup(<App platform={platform} />);

    expect(html).toContain("d2-tools");
    expect(html).toContain("架构底座");
    expect(html).toContain("自动更新");
    expect(html).toContain("打开发布页");
  });

  it("uses the GitHub latest release page for manual update fallback", () => {
    expect(LATEST_RELEASE_URL).toBe(
      "https://github.com/sandrew/d2-tools/releases/latest"
    );
  });

  it("maps update check results to dashboard state", () => {
    expect(
      createUpdateStatusFromCheckResult({
        available: true,
        version: "0.0.7",
        notes: "发布更新"
      })
    ).toEqual({
      phase: "available",
      version: "0.0.7",
      notes: "发布更新",
      errorMessage: null
    });

    expect(
      createUpdateStatusFromCheckResult({
        available: false,
        version: null,
        notes: null
      })
    ).toEqual({
      phase: "current",
      version: null,
      notes: null,
      errorMessage: null
    });
  });

  it("maps update failures to readable dashboard state", () => {
    expect(createUpdateErrorStatus(new Error("签名验证失败"))).toEqual({
      phase: "error",
      version: null,
      notes: null,
      errorMessage: "签名验证失败"
    });

    expect(createUpdateErrorStatus("网络连接失败")).toEqual({
      phase: "error",
      version: null,
      notes: null,
      errorMessage: "网络连接失败"
    });
  });

  it("preserves update metadata when install fails", () => {
    expect(
      createUpdateInstallErrorStatus(
        {
          phase: "installing",
          version: "0.0.7",
          notes: "发布更新",
          errorMessage: null
        },
        "下载失败"
      )
    ).toEqual({
      phase: "error",
      version: "0.0.7",
      notes: "发布更新",
      errorMessage: "下载失败"
    });
  });

  it("preserves update metadata when install returns before restart", () => {
    expect(
      createUpdateInstallRequestedStatus({
        phase: "installing",
        version: "0.0.7",
        notes: "发布更新",
        errorMessage: null
      })
    ).toEqual({
      phase: "restartRequested",
      version: "0.0.7",
      notes: "发布更新",
      errorMessage: null
    });
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
