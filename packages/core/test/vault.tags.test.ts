import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadVaultTags, saveVaultNote, saveVaultTag, saveVaultTagsBatch } from "../src/vault/tags.js";

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

  it("persists local notes without losing tags", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-service-vault-tags-"));

    saveVaultTag(dir, {
      item_key: "instance-1",
      tag: "review"
    });

    const noted = saveVaultNote(dir, {
      item_key: "instance-1",
      note: "PVP 手感好，等队友确认 perk"
    });

    expect(noted.items["instance-1"]).toEqual({
      tag: "review",
      note: "PVP 手感好，等队友确认 perk"
    });

    const retagged = saveVaultTag(dir, {
      item_key: "instance-1",
      tag: "keep"
    });
    expect(retagged.items["instance-1"]).toEqual({
      tag: "keep",
      note: "PVP 手感好，等队友确认 perk"
    });
  });

  it("removes note-only entries when the note is cleared", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-service-vault-tags-"));

    saveVaultNote(dir, {
      item_key: "instance-1",
      note: "temporary"
    });

    const cleared = saveVaultNote(dir, {
      item_key: "instance-1",
      note: " "
    });

    expect(cleared.items["instance-1"]).toBeUndefined();
  });

  it("saves multiple tag changes without dropping existing notes", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-service-vault-tags-"));

    saveVaultNote(dir, {
      item_key: "instance-1",
      note: "good roll"
    });

    const tags = saveVaultTagsBatch(dir, [
      { item_key: "instance-1", tag: "keep" },
      { item_key: "instance-2", tag: "junk" }
    ]);

    expect(tags.items["instance-1"]).toEqual({
      tag: "keep",
      note: "good roll"
    });
    expect(tags.items["instance-2"]).toEqual({
      tag: "junk"
    });
  });
});
