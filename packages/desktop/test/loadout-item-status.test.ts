import { describe, expect, it } from "vitest";
import type { AccountSummary } from "../src/renderer/api/client";
import {
  buildLoadoutItemStatus,
  summarizeLoadoutItemStatuses,
  type LoadoutStatusSourceItem
} from "../src/renderer/utils/loadoutItemStatus";

const accountSummary: AccountSummary = {
  account_name: "tester",
  destiny_membership_id: "destiny-1",
  membership_type: 3,
  characters: [
    {
      character_id: "char-target",
      class_name: "Titan",
      equipped_items: [],
      equipment_groups: [],
      inventory_items: [],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    },
    {
      character_id: "char-hunter",
      class_name: "Hunter",
      equipped_items: [],
      equipment_groups: [],
      inventory_items: [],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    }
  ],
  vault: {
    item_count: 0,
    items: [],
    sample_items: []
  },
  materials: {
    item_count: 0,
    items: []
  }
};

function buildSourceItem(source: LoadoutStatusSourceItem["source_kind"], sourceCharacterId?: string): LoadoutStatusSourceItem {
  return {
    source_kind: source,
    source_character_id: sourceCharacterId
  };
}

describe("loadout item status", () => {
  it("classifies target-ready and target-inventory items with player-facing labels", () => {
    expect(buildLoadoutItemStatus({
      isReady: true,
      sourceItem: buildSourceItem("equipped", "char-target"),
      targetCharacterId: "char-target",
      accountSummary
    })).toMatchObject({
      key: "equipped",
      badge_label: "已装备",
      summary_key: "equipped",
      location_label: "当前角色已装备"
    });

    expect(buildLoadoutItemStatus({
      isReady: false,
      sourceItem: buildSourceItem("inventory", "char-target"),
      targetCharacterId: "char-target",
      accountSummary
    })).toMatchObject({
      key: "current-inventory",
      badge_label: "背包待穿",
      summary_key: "current-inventory",
      location_label: "当前角色背包",
      guidance_label: "已在当前角色背包"
    });
  });

  it("classifies off-target sources into readable recovery states", () => {
    expect(buildLoadoutItemStatus({
      isReady: false,
      sourceItem: buildSourceItem("vault"),
      targetCharacterId: "char-target",
      accountSummary
    })).toMatchObject({
      key: "vault",
      badge_label: "仓库待取",
      summary_key: "vault",
      location_label: "仓库"
    });

    expect(buildLoadoutItemStatus({
      isReady: false,
      sourceItem: buildSourceItem("inventory", "char-hunter"),
      targetCharacterId: "char-target",
      accountSummary
    })).toMatchObject({
      key: "other-character-inventory",
      badge_label: "他角背包",
      summary_key: "other-character",
      location_label: "Hunter背包"
    });

    expect(buildLoadoutItemStatus({
      isReady: false,
      sourceItem: buildSourceItem("equipped", "char-hunter"),
      targetCharacterId: "char-target",
      accountSummary
    })).toMatchObject({
      key: "other-character-equipped",
      badge_label: "他角已穿",
      summary_key: "other-character",
      location_label: "Hunter已装备"
    });
  });

  it("classifies postmaster and missing states", () => {
    expect(buildLoadoutItemStatus({
      isReady: false,
      sourceItem: buildSourceItem("postmaster", "char-target"),
      targetCharacterId: "char-target",
      accountSummary
    })).toMatchObject({
      key: "postmaster",
      badge_label: "邮政官",
      summary_key: "postmaster",
      location_label: "当前角色邮政官"
    });

    expect(buildLoadoutItemStatus({
      isReady: false,
      sourceItem: null,
      targetCharacterId: "char-target",
      accountSummary
    })).toMatchObject({
      key: "not-found",
      badge_label: "未找到",
      summary_key: "not-found",
      location_label: "未找到"
    });
  });

  it("summarizes loadout status counts in a stable player-facing order", () => {
    const summary = summarizeLoadoutItemStatuses([
      buildLoadoutItemStatus({
        isReady: true,
        sourceItem: buildSourceItem("equipped", "char-target"),
        targetCharacterId: "char-target",
        accountSummary
      }),
      buildLoadoutItemStatus({
        isReady: false,
        sourceItem: buildSourceItem("inventory", "char-target"),
        targetCharacterId: "char-target",
        accountSummary
      }),
      buildLoadoutItemStatus({
        isReady: false,
        sourceItem: buildSourceItem("inventory", "char-hunter"),
        targetCharacterId: "char-target",
        accountSummary
      }),
      buildLoadoutItemStatus({
        isReady: false,
        sourceItem: buildSourceItem("postmaster", "char-target"),
        targetCharacterId: "char-target",
        accountSummary
      })
    ]);

    expect(summary).toEqual([
      { key: "equipped", label: "已装备", count: 1 },
      { key: "current-inventory", label: "背包待穿", count: 1 },
      { key: "other-character", label: "跨角色", count: 1 },
      { key: "postmaster", label: "邮政官", count: 1 }
    ]);
  });
});
