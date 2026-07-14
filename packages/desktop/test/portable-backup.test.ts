import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultConfig } from "@d2-tools/core/config/defaults";
import {
  createPortableBackup,
  mergePortableConfig,
  parseBackupDocument,
  restorePortableBackup,
  restorePortableFiles
} from "../src/main/ipc/configBackup";

describe("portable data backup", () => {
  it("exports user data without credentials, tokens, cache, or local paths", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "d2-tools-backup-"));
    const config = defaultConfig(dataDir);
    config.bungie.api_key = "bungie-key";
    config.bungie.client_secret = "bungie-secret";
    config.ai.api_key = "ai-key";
    writeFileSync(join(dataDir, "dim-wishlist.json"), JSON.stringify({ entries: [1] }), "utf8");
    writeFileSync(join(dataDir, "oauth-token.json"), JSON.stringify({ access_token: "token" }), "utf8");
    writeFileSync(join(dataDir, "action-log.json"), JSON.stringify([{ ok: true }]), "utf8");

    const backup = createPortableBackup({ dataDir, config, appVersion: "1.2.3" });
    const serialized = JSON.stringify(backup);

    expect(backup.config.bungie.api_key).toBe("");
    expect(backup.config.bungie.client_secret).toBe("");
    expect(backup.config.ai.api_key).toBe("");
    expect(backup.config.data.data_dir).toBe("");
    expect(backup.files["dim-wishlist.json"]).toEqual({ entries: [1] });
    expect(serialized).not.toContain("bungie-key");
    expect(serialized).not.toContain("bungie-secret");
    expect(serialized).not.toContain("ai-key");
    expect(serialized).not.toContain("access_token");
    expect(serialized).not.toContain("action-log.json");
  });

  it("restores only allowlisted data and preserves local credentials and data directory", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "d2-tools-restore-"));
    const current = defaultConfig(dataDir);
    current.bungie.api_key = "local-bungie-key";
    current.bungie.client_secret = "local-secret";
    current.ai.api_key = "local-ai-key";
    writeFileSync(join(dataDir, "vault-tags.json"), JSON.stringify({ stale: true }), "utf8");

    const imported = defaultConfig("C:\\other-machine");
    imported.features.color_mode = "dark";
    const backup = createPortableBackup({
      dataDir,
      config: imported,
      appVersion: "1.2.3"
    });
    backup.files = { "dim-wishlist.json": { entries: [2] } };

    restorePortableFiles(dataDir, backup.files);
    const merged = mergePortableConfig(current, backup.config);

    expect(JSON.parse(readFileSync(join(dataDir, "dim-wishlist.json"), "utf8"))).toEqual({ entries: [2] });
    expect(existsSync(join(dataDir, "vault-tags.json"))).toBe(false);
    expect(merged.data.data_dir).toBe(dataDir);
    expect(merged.bungie.api_key).toBe("local-bungie-key");
    expect(merged.bungie.client_secret).toBe("local-secret");
    expect(merged.ai.api_key).toBe("local-ai-key");
    expect(merged.features.color_mode).toBe("dark");
  });

  it("rejects unsupported files before restore", () => {
    const config = defaultConfig("");
    const text = JSON.stringify({
      format: "d2-tools-portable-backup",
      version: 1,
      created_at: new Date().toISOString(),
      app_version: "1.2.3",
      config,
      files: { "oauth-token.json": { access_token: "token" } }
    });

    expect(() => parseBackupDocument(text)).toThrow("不允许恢复的文件");
  });

  it("rolls user data and config back when restore fails", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "d2-tools-rollback-"));
    const current = defaultConfig(dataDir);
    writeFileSync(join(dataDir, "vault-tags.json"), JSON.stringify({ original: true }), "utf8");
    const rollback = createPortableBackup({ dataDir, config: current, appVersion: "1.2.3" });
    const backup = createPortableBackup({ dataDir, config: current, appVersion: "1.2.3" });
    backup.files = { "vault-tags.json": { restored: true } };
    let saveCount = 0;
    let savedConfig = current;

    expect(() => restorePortableBackup({
      dataDir,
      currentConfig: current,
      backup,
      rollback,
      rollbackPath: join(dataDir, "backups", "rollback.json"),
      saveConfig: (config) => {
        saveCount += 1;
        if (saveCount === 1) {
          throw new Error("disk full");
        }
        savedConfig = config;
      }
    })).toThrow("已自动回滚");

    expect(JSON.parse(readFileSync(join(dataDir, "vault-tags.json"), "utf8"))).toEqual({ original: true });
    expect(savedConfig).toEqual(current);
  });
});
