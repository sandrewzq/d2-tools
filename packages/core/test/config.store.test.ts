import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, saveConfig } from "../src/config/store.js";

describe("config store", () => {
  it("creates defaults in the selected data directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-service-config-"));
    const config = loadConfig({ dataDir: dir, env: {} });

    expect(config.data.data_dir).toBe(dir);
    expect(config.bungie.redirect_uri).toBe("https://127.0.0.1:28780/oauth/callback");
    expect(config.data.manifest_language).toBe("zh-chs");
    expect(config.features.write_actions_enabled).toBe(false);
  });

  it("persists GUI-provided Bungie credentials without logging them", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-service-config-"));

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
    const dir = mkdtempSync(join(tmpdir(), "d2-service-config-"));
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
    const dir = mkdtempSync(join(tmpdir(), "d2-service-config-"));
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
    const dir = mkdtempSync(join(tmpdir(), "d2-service-config-"));
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
