import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, saveConfig } from "../src/config/store.js";

describe("config store", () => {
  it("creates defaults in the selected data directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-service-config-"));
    const config = loadConfig({ dataDir: dir, env: {} });

    expect(config.data.data_dir).toBe(dir);
    expect(config.bungie.redirect_uri).toBe("http://127.0.0.1:28780/oauth/callback");
    expect(config.data.manifest_language).toBe("zh-chs");
  });

  it("persists GUI-provided Bungie credentials without logging them", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-service-config-"));

    saveConfig(
      {
        bungie: {
          api_key: "api",
          client_id: "client",
          client_secret: "secret",
          redirect_uri: "http://127.0.0.1:28780/oauth/callback"
        },
        data: {
          data_dir: dir,
          manifest_language: "zh-chs"
        },
        ai: {
          provider: "",
          api_key: "",
          model: ""
        }
      },
      { dataDir: dir }
    );

    const raw = readFileSync(join(dir, "config.json"), "utf8");
    expect(raw).toContain("\"client_secret\": \"secret\"");

    const loaded = loadConfig({ dataDir: dir, env: {} });
    expect(loaded.bungie.client_secret).toBe("secret");
  });

  it("lets env override config values", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-service-config-"));
    saveConfig(
      {
        bungie: {
          api_key: "from-config",
          client_id: "client",
          client_secret: "secret",
          redirect_uri: "http://127.0.0.1:28780/oauth/callback"
        },
        data: {
          data_dir: dir,
          manifest_language: "zh-chs"
        },
        ai: {
          provider: "",
          api_key: "",
          model: ""
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
});
