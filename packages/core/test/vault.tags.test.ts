import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadVaultTags, saveVaultTag } from "../src/vault/tags.js";

describe("vault tags", () => {
  it("loads empty tags when no local tag file exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-service-vault-tags-"));

    expect(loadVaultTags(dir)).toEqual({ items: {} });
  });

  it("persists and removes local tags by item instance id", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-service-vault-tags-"));

    const saved = saveVaultTag(dir, {
      item_key: "instance-1",
      tag: "keep"
    });
    expect(saved.items["instance-1"]).toEqual({
      tag: "keep"
    });
    expect(loadVaultTags(dir).items["instance-1"]?.tag).toBe("keep");

    const removed = saveVaultTag(dir, {
      item_key: "instance-1",
      tag: "none"
    });
    expect(removed.items["instance-1"]).toBeUndefined();
    expect(loadVaultTags(dir).items).toEqual({});
  });
});
