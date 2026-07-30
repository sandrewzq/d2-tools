import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultDataDirForPlatform } from "@d2-tools/core/config/defaults";
import { loadConfig, saveConfig } from "../src/config/store";

describe("config store service adapter", () => {
  it("uses d2-tools as the default data directory", () => {
    const originalAppData = process.env.APPDATA;
    const appData = mkdtempSync(join(tmpdir(), "d2-tools-appdata-"));
    process.env.APPDATA = appData;

    try {
      const config = loadConfig({ env: {} });

      expect(config.data.data_dir).toBe(join(appData, "d2-tools"));
    } finally {
      if (originalAppData === undefined) {
        delete process.env.APPDATA;
      } else {
        process.env.APPDATA = originalAppData;
      }
    }
  });

  it("resolves default data directories by platform without hard-coding APPDATA", () => {
    expect(defaultDataDirForPlatform({
      platform: "win32",
      env: { APPDATA: "C:\\Users\\player\\AppData\\Roaming" },
      homeDir: "C:\\Users\\player"
    })).toBe(join("C:\\Users\\player\\AppData\\Roaming", "d2-tools"));

    expect(defaultDataDirForPlatform({
      platform: "darwin",
      env: {},
      homeDir: "/Users/player"
    })).toBe(join("/Users/player", "Library", "Application Support", "d2-tools"));

    expect(defaultDataDirForPlatform({
      platform: "linux",
      env: { XDG_DATA_HOME: "/home/player/.local-data" },
      homeDir: "/home/player"
    })).toBe(join("/home/player/.local-data", "d2-tools"));

  });

  it("creates defaults in the selected data directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-config-"));
    const config = loadConfig({ dataDir: dir, env: {} });

    expect(config.data.data_dir).toBe(dir);
    expect(config.bungie.redirect_uri).toBe("https://127.0.0.1:28780/oauth/callback");
    expect(config.data.manifest_language).toBe("zh-chs");
    expect(config.features.write_actions_enabled).toBe(false);
    expect(config.features.color_mode).toBe("light");
    expect(config.features.interface_locale).toBe("zh-CN");
    expect(config.features.manifest_language_follows_interface).toBe(true);
  });

  it("persists GUI-provided Bungie credentials without logging them", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-config-"));

    saveConfig(
      {
        bungie: {
          api_key: "api",
          client_id: "client",
          client_secret: "secret",
          redirect_uri: "https://127.0.0.1:28780/oauth/callback"
        },
        data: {
          data_dir: dir,
          manifest_language: "zh-chs"
        },
        ai: {
          provider: "",
          api_key: "",
          model: "",
          base_url: ""
        },
        features: {
          write_actions_enabled: true,
          color_mode: "dark",
          interface_locale: "en-US",
          manifest_language_follows_interface: false
        }
      },
      { dataDir: dir }
    );

    const raw = readFileSync(join(dir, "config.json"), "utf8");
    expect(raw).toContain("\"client_secret\": \"secret\"");

    const loaded = loadConfig({ dataDir: dir, env: {} });
    expect(loaded.bungie.client_secret).toBe("secret");
    expect(loaded.features.write_actions_enabled).toBe(true);
    expect(loaded.features.color_mode).toBe("dark");
    expect(loaded.features.interface_locale).toBe("en-US");
    expect(loaded.features.manifest_language_follows_interface).toBe(false);
  });

  it("lets env override config values", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-config-"));
    saveConfig(
      {
        bungie: {
          api_key: "from-config",
          client_id: "client",
          client_secret: "secret",
          redirect_uri: "https://127.0.0.1:28780/oauth/callback"
        },
        data: {
          data_dir: dir,
          manifest_language: "zh-chs"
        },
        ai: {
          provider: "",
          api_key: "",
          model: "",
          base_url: ""
        },
        features: {
          write_actions_enabled: false,
          color_mode: "light",
          interface_locale: "zh-CN",
          manifest_language_follows_interface: true
        }
      },
      { dataDir: dir }
    );

    const loaded = loadConfig({
      dataDir: dir,
      env: {
        BUNGIE_API_KEY: "from-env",
        D2_MANIFEST_LANGUAGE: "en",
        D2_COLOR_MODE: "dark"
      }
    });

    expect(loaded.bungie.api_key).toBe("from-env");
    expect(loaded.data.manifest_language).toBe("en");
    expect(loaded.features.color_mode).toBe("dark");
  });

  it("keeps defaults for missing fields in a partial config file", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-config-"));
    writeFileSync(
      join(dir, "config.json"),
      `${JSON.stringify({ bungie: { api_key: "x" } }, null, 2)}\n`,
      "utf8"
    );

    const loaded = loadConfig({ dataDir: dir, env: {} });

    expect(loaded.bungie.api_key).toBe("x");
    expect(loaded.bungie.redirect_uri).toBe("https://127.0.0.1:28780/oauth/callback");
    expect(loaded.data.manifest_language).toBe("zh-chs");
    expect(loaded.ai.provider).toBe("");
    expect(loaded.ai.api_key).toBe("");
    expect(loaded.ai.model).toBe("");
    expect(loaded.ai.base_url).toBe("");
    expect(loaded.features.write_actions_enabled).toBe(false);
    expect(loaded.features.color_mode).toBe("light");
    expect(loaded.features.interface_locale).toBe("zh-CN");
    expect(loaded.features.manifest_language_follows_interface).toBe(true);
  });

});
