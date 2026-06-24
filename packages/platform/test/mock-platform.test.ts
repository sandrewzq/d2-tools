import { describe, expect, it } from "vitest";

import { createMockPlatformServices } from "../src/index";

describe("mock platform services", () => {
  it("stores secure values outside normal data repositories", async () => {
    const platform = createMockPlatformServices();

    await platform.secureStore.set("bungie.refreshToken", "refresh-token");

    await expect(platform.secureStore.get("bungie.refreshToken")).resolves.toBe(
      "refresh-token"
    );
  });

  it("reads and writes app files", async () => {
    const platform = createMockPlatformServices();

    await platform.files.writeText("settings/app.json", "{\"ok\":true}");

    await expect(platform.files.readText("settings/app.json")).resolves.toBe(
      "{\"ok\":true}"
    );
  });

  it("returns app info and data dir", async () => {
    const platform = createMockPlatformServices({
      dataDir: "D:/data/d2-tools"
    });

    await expect(platform.app.getInfo()).resolves.toEqual({
      name: "d2-tools",
      version: "0.0.0",
      platform: "mock"
    });
    await expect(platform.paths.getDataDir()).resolves.toBe("D:/data/d2-tools");
  });
});
