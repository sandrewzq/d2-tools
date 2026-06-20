import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createLoadoutTemplate,
  deleteLoadoutTemplate,
  listLoadoutTemplates,
  renameLoadoutTemplate
} from "../src/loadouts/templates.js";

describe("loadout templates", () => {
  it("creates a local template from equipped items", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-loadouts-"));

    const template = createLoadoutTemplate(dir, {
      name: "术士日落",
      character_id: "char-1",
      class_name: "术士",
      equipped_items: [
        {
          hash: 1,
          instance_id: "item-1",
          name: "Riskrunner",
          group_key: "weapons",
          bucket_name: "能量武器",
          weapon_frame: { key: "lightweight-frame", name: "Lightweight Frame" },
          socket_plugs: [
            { hash: 11, name: "Threat Detector" },
            { hash: 22, name: "Voltshot" }
          ]
        }
      ]
    }, new Date("2026-06-19T00:00:00.000Z"));

    expect(template.items).toEqual([{
      hash: 1,
      instance_id: "item-1",
      name: "Riskrunner",
      bucket_name: "能量武器",
      weapon_frame_name: "Lightweight Frame",
      perk_names: ["Threat Detector", "Voltshot"]
    }]);
    expect(listLoadoutTemplates(dir)[0].name).toBe("术士日落");
  });

  it("renames a local template and updates the timestamp", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-loadouts-"));
    const template = createLoadoutTemplate(dir, {
      name: "旧方案",
      character_id: "char-1",
      class_name: "术士",
      equipped_items: []
    }, new Date("2026-06-19T00:00:00.000Z"));

    const renamed = renameLoadoutTemplate(dir, template.id, "新方案", new Date("2026-06-20T00:00:00.000Z"));

    expect(renamed.name).toBe("新方案");
    expect(renamed.updated_at).toBe("2026-06-20T00:00:00.000Z");
    expect(listLoadoutTemplates(dir)[0]?.name).toBe("新方案");
  });

  it("deletes local templates", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-loadouts-"));
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
