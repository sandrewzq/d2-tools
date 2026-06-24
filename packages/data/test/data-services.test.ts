import { describe, expect, it } from "vitest";
import { createMockPlatformServices } from "@d2-tools/platform/mock";
import { createDataServices } from "../src/index";

describe("data services", () => {
  it("loads default settings from platform data dir", async () => {
    const platform = createMockPlatformServices({ dataDir: "D:/data/d2-tools" });
    const data = await createDataServices(platform);

    await expect(data.settings.getSettings()).resolves.toMatchObject({
      dataDir: "D:/data/d2-tools",
      bungie: { apiKeyConfigured: false },
      ai: { providerConfigured: false }
    });
  });

  it("persists settings through the file service", async () => {
    const platform = createMockPlatformServices({ dataDir: "D:/data/d2-tools" });
    const data = await createDataServices(platform);

    await data.settings.saveSettings({
      ai: { providerConfigured: true, providerId: "openai", model: "gpt-5" }
    });

    await expect(data.settings.getSettings()).resolves.toMatchObject({
      ai: { providerConfigured: true, providerId: "openai", model: "gpt-5" }
    });
  });

  it("does not persist ai keys in settings json", async () => {
    const platform = createMockPlatformServices();
    const data = await createDataServices(platform);

    await platform.secureStore.set("ai.openai.key", "secret-key");
    await data.settings.saveSettings({
      ai: { providerConfigured: true, providerId: "openai", model: "gpt-5" }
    });

    const stored = await platform.files.readText("settings/app.json");
    expect(stored).not.toContain("secret-key");
  });

  it("filters unexpected sensitive fields from settings patches", async () => {
    const platform = createMockPlatformServices();
    const data = await createDataServices(platform);

    await data.settings.saveSettings({
      ai: {
        providerConfigured: true,
        providerId: "openai",
        model: "gpt-5",
        apiKey: "secret-key",
        refreshToken: "refresh-secret"
      }
    } as Parameters<typeof data.settings.saveSettings>[0]);

    const stored = await platform.files.readText("settings/app.json");
    expect(stored).not.toContain("secret-key");
    expect(stored).not.toContain("refresh-secret");
  });

  it("filters unexpected sensitive fields from stored settings json", async () => {
    const platform = createMockPlatformServices();
    await platform.files.writeText(
      "settings/app.json",
      JSON.stringify({
        dataDir: "D:/data/d2-tools",
        token: "root-token",
        bungie: {
          apiKeyConfigured: true,
          apiKey: "bungie-api-key",
          refreshToken: "bungie-refresh-token"
        },
        ai: {
          providerConfigured: true,
          providerId: "openai",
          model: "gpt-5",
          apiKey: "ai-api-key",
          token: "ai-token"
        }
      })
    );
    const data = await createDataServices(platform);

    const settings = await data.settings.getSettings();

    expect(settings).toEqual({
      dataDir: "D:/data/d2-tools",
      bungie: { apiKeyConfigured: true },
      ai: {
        providerConfigured: true,
        providerId: "openai",
        model: "gpt-5"
      }
    });
    expect(JSON.stringify(settings)).not.toContain("api-key");
    expect(JSON.stringify(settings)).not.toContain("refresh-token");
    expect(JSON.stringify(settings)).not.toContain("token");
  });

  it("refreshes manifest status in memory", async () => {
    const platform = createMockPlatformServices();
    const data = await createDataServices(platform);

    await expect(data.manifest.getStatus()).resolves.toMatchObject({
      state: "missing",
      version: null
    });

    await expect(data.manifest.refresh()).resolves.toMatchObject({
      state: "ready",
      version: "mock-manifest"
    });
  });

  it("stores ai conversations in updated order", async () => {
    const platform = createMockPlatformServices();
    const data = await createDataServices(platform);

    await data.ai.saveConversation({
      id: "older",
      title: "Older conversation",
      messages: [],
      updatedAt: "2026-06-24T08:00:00.000Z"
    });
    await data.ai.saveConversation({
      id: "newer",
      title: "Newer conversation",
      messages: [],
      updatedAt: "2026-06-24T09:00:00.000Z"
    });

    await expect(data.ai.listConversations()).resolves.toMatchObject([
      { id: "newer" },
      { id: "older" }
    ]);
  });
});
