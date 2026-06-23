import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultDataDirForPlatform, legacyDefaultDataDirForPlatform } from "../src/config/defaults.js";
import { loadConfig, saveConfig } from "../src/config/store.js";

describe("config store", () => {
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

    expect(legacyDefaultDataDirForPlatform({
      platform: "darwin",
      env: {},
      homeDir: "/Users/player"
    })).toBe(join("/Users/player", "Library", "Application Support", "d2-service"));
  });

  it("migrates the old d2-service data directory into d2-tools", () => {
    const originalAppData = process.env.APPDATA;
    const appData = mkdtempSync(join(tmpdir(), "d2-tools-appdata-"));
    const legacyDir = join(appData, "d2-service");
    const nextDir = join(appData, "d2-tools");
    process.env.APPDATA = appData;
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(
      join(legacyDir, "config.json"),
      `${JSON.stringify({
        bungie: {
          api_key: "legacy-api",
          client_id: "legacy-client",
          client_secret: "legacy-secret",
          redirect_uri: "https://127.0.0.1:28780/oauth/callback"
        }
      }, null, 2)}\n`,
      { encoding: "utf8", flag: "w" }
    );

    try {
      const config = loadConfig({ env: {} });

      expect(config.data.data_dir).toBe(nextDir);
      expect(config.bungie.api_key).toBe("legacy-api");
      expect(existsSync(join(nextDir, "config.json"))).toBe(true);
    } finally {
      if (originalAppData === undefined) {
        delete process.env.APPDATA;
      } else {
        process.env.APPDATA = originalAppData;
      }
    }
  });

  it("creates defaults in the selected data directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-config-"));
    const config = loadConfig({ dataDir: dir, env: {} });

    expect(config.data.data_dir).toBe(dir);
    expect(config.bungie.redirect_uri).toBe("https://127.0.0.1:28780/oauth/callback");
    expect(config.data.manifest_language).toBe("zh-chs");
    expect(config.features.write_actions_enabled).toBe(false);
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
          write_actions_enabled: true
        }
      },
      { dataDir: dir }
    );

    const raw = readFileSync(join(dir, "config.json"), "utf8");
    expect(raw).toContain("\"client_secret\": \"secret\"");

    const loaded = loadConfig({ dataDir: dir, env: {} });
    expect(loaded.bungie.client_secret).toBe("secret");
    expect(loaded.features.write_actions_enabled).toBe(true);
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
          write_actions_enabled: false
        }
      },
      { dataDir: dir }
    );

    const loaded = loadConfig({
      dataDir: dir,
      env: {
        BUNGIE_API_KEY: "from-env",
        D2_MANIFEST_LANGUAGE: "en"
      }
    });

    expect(loaded.bungie.api_key).toBe("from-env");
    expect(loaded.data.manifest_language).toBe("en");
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
  });

  it("migrates the old local HTTP redirect URI to HTTPS", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-config-"));
    writeFileSync(
      join(dir, "config.json"),
      `${JSON.stringify({
        bungie: {
          api_key: "api",
          client_id: "client",
          client_secret: "secret",
          redirect_uri: "http://127.0.0.1:28780/oauth/callback"
        }
      }, null, 2)}\n`,
      "utf8"
    );

    const loaded = loadConfig({ dataDir: dir, env: {} });

    expect(loaded.bungie.redirect_uri).toBe("https://127.0.0.1:28780/oauth/callback");
  });
});
