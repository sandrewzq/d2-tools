import { describe, expect, it } from "vitest";
import type { AccountItemSummary, AccountSummary } from "@d2-tools/core/account/summary";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import {
  buildTargetInsightText,
  collectSelectedSameNameItems,
  createSelectedItemPreview,
  getItemKey,
  selectBestSameNameItem,
  selectedItemToAccountItem,
  sortSameNameItems
} from "../src/workspaces/itemDetail";

describe("item detail workspace", () => {
  it("creates a selected item preview and converts it back to an account item", () => {
    const sourceItem = item("instance-1", 100, "审判");
    const preview = createSelectedItemPreview(sourceItem, {
      source_character_id: "char-1",
      source_kind: "inventory"
    });

    expect(preview).toMatchObject({
      item_key: "instance-1",
      hash: 100,
      name: "审判",
      source_character_id: "char-1",
      source_kind: "inventory",
      is_detail_loading: false,
      detail_loading: {
        definition: false,
        instance: false
      }
    });
    expect(selectedItemToAccountItem(preview)).toMatchObject({
      instance_id: "instance-1",
      hash: 100,
      name: "审判",
      group_key: "weapons"
    });
  });

  it("collects and sorts same-name items across account sources", () => {
    const selected = createSelectedItemPreview(item("current", 100, "审判"), {
      source_character_id: "char-1",
      source_kind: "inventory"
    });
    const sameNameItems = collectSelectedSameNameItems(accountSummary(), selected);
    const sorted = sortSameNameItems(sameNameItems, selected.item_key);

    expect(sameNameItems.map((entry) => getItemKey(entry)).sort()).toEqual([
      "current",
      "equipped-copy",
      "vault-copy"
    ]);
    expect(sorted.map((entry) => getItemKey(entry))).toEqual([
      "current",
      "equipped-copy",
      "vault-copy"
    ]);
    expect(selectBestSameNameItem(sorted)?.instance_id).toBe("equipped-copy");
  });

  it("builds local-target insight text without Desktop hook state", () => {
    const selected = createSelectedItemPreview({
      ...item("current", 100, "审判"),
      socket_plugs: [{ hash: 500, name: "快速命中" }]
    }, {
      source_character_id: "char-1",
      source_kind: "inventory"
    });

    const text = buildTargetInsightText({
      selectedItem: selected,
      vaultTags: { items: { current: { tag: "keep" } } },
      localTargetRules: localTargetRules()
    });

    expect(text).toContain("审判 / 目标命中");
    expect(text).toContain("本地目标：手炮快速命中");
    expect(text).toContain("本地标记：保留");
  });
});

function accountSummary(): AccountSummary {
  return {
    account_name: "tester",
    destiny_membership_id: "destiny-1",
    membership_type: 3,
    characters: [
      {
        character_id: "char-1",
        class_name: "Titan",
        equipped_items: [item("equipped-copy", 100, "审判", true)],
        equipment_groups: [],
        inventory_items: [item("current", 100, "审判")],
        inventory_groups: [],
        postmaster_items: [],
        loadout_slots: []
      }
    ],
    vault: {
      item_count: 1,
      items: [item("vault-copy", 100, "审判")],
      sample_items: []
    },
    materials: {
      item_count: 0,
      items: []
    }
  };
}

function item(
  instanceId: string,
  hash: number,
  name: string,
  locked = false
): AccountItemSummary {
  return {
    hash,
    instance_id: instanceId,
    name,
    bucket_name: "动能武器",
    item_type: "手炮",
    tier: "传说",
    group_key: "weapons",
    locked,
    socket_plugs: []
  };
}
function localTargetRules(): LocalTargetRules {
  return {
    action_policy: "notify_only",
    armor: [],
    weapons: [
      {
        id: "weapon-target-1",
        name: "手炮快速命中",
        item_hash: 100,
        item_name: "审判",
        conditions: [{ perk_hash: 500, perk_name: "快速命中" }]
      }
    ]
  };
}
