import { describe, expect, it } from "vitest";
import {
  buildLoadoutTemplateLookup, matchesLoadoutTemplateItem
} from "../src/renderer/shared/domain/loadouts/loadoutLookup";
import type { LoadoutTemplate } from "../src/renderer/api/types";

const template: LoadoutTemplate = {
  id: "template-1",
  name: "术士虚空",
  character_id: "character-1",
  class_name: "术士",
  created_at: "2026-06-22T00:00:00.000Z",
  updated_at: "2026-06-22T00:00:00.000Z",
  items: [
    {
      hash: 100,
      instance_id: "instance-100",
      name: "主手武器",
      bucket_name: "动能武器",
      item_type: "自动步枪",
      tier: "传说",
      icon: ""
    },
    {
      hash: 200,
      name: "头盔",
      bucket_name: "头盔",
      item_type: "护甲",
      tier: "传说",
      icon: ""
    }
  ]
};

describe("loadout template lookup", () => {
  it("matches saved loadout items by instance, bucket hash, then hash fallback", () => {
    const lookup = buildLoadoutTemplateLookup(template);

    expect(matchesLoadoutTemplateItem({
      hash: 999,
      instance_id: "instance-100",
      bucket_name: "任意槽位"
    }, lookup)).toBe(true);
    expect(matchesLoadoutTemplateItem({
      hash: 200,
      bucket_name: "头盔"
    }, lookup)).toBe(true);
    expect(matchesLoadoutTemplateItem({
      hash: 100,
      bucket_name: "不同槽位"
    }, lookup)).toBe(true);
    expect(matchesLoadoutTemplateItem({
      hash: 404,
      bucket_name: "头盔"
    }, lookup)).toBe(false);
  });
});
