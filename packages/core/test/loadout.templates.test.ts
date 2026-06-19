import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLoadoutTemplate, deleteLoadoutTemplate, listLoadoutTemplates } from "../src/loadouts/templates.js";

describe("loadout templates", () => {
  it("creates a local template from equipped items", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-service-loadouts-"));

    const template = createLoadoutTemplate(dir, {
      name: "术士日落",
      character_id: "char-1",
      class_name: "术士",
      equipped_items: [
        { hash: 1, instance_id: "item-1", name: "Riskrunner", group_key: "weapons", socket_plugs: [] }
      ]
    }, new Date("2026-06-19T00:00:00.000Z"));

    expect(template.items).toEqual([{ hash: 1, instance_id: "item-1", name: "Riskrunner", bucket_name: undefined }]);
    expect(listLoadoutTemplates(dir)[0].name).toBe("术士日落");
  });

  it("deletes local templates", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-service-loadouts-"));
    const template = createLoadoutTemplate(dir, {
      name: "术士日落",
      character_id: "char-1",
      class_name: "术士",
      equipped_items: []
    });

    deleteLoadoutTemplate(dir, template.id);

    expect(listLoadoutTemplates(dir)).toEqual([]);
  });
});
