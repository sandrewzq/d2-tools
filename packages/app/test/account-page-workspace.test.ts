import { describe, expect, it } from "vitest";
import type { AccountItemSummary, AccountMaterialSummary, AccountSummary } from "@d2-tools/core/account/summary";
import {
  createAccountPageWorkspace,
  formatAccountItemMeta,
  formatAccountItemFacts,
  getAccountPageItemKey,
  getCharacterCombinedItems,
  groupAccountItemsBySlot,
  selectAccountPageModel
} from "../src/workspaces/accountPage";

function item(input: Partial<AccountItemSummary> & Pick<AccountItemSummary, "hash" | "name" | "group_key" | "item_type" | "tier">): AccountItemSummary {
  return {
    bucket_name: "未识别物品",
    ...input
  };
}

describe("account page workspace", () => {
  const equipped = item({
    hash: 100,
    instance_id: "equipped-1",
    name: "已装备手炮",
    group_key: "weapons",
    item_type: "Hand Cannon",
    tier: "Legendary",
    bucket_name: "能量武器",
    power: 2010,
    locked: true
  });
  const inventory = item({
    hash: 101,
    instance_id: "inventory-1",
    name: "背包胸甲",
    group_key: "armor",
    item_type: "Chest Armor",
    tier: "Legendary",
    bucket_name: "胸甲",
    armor_stats: {
      total: 68,
      health: 20,
      melee: 6,
      grenade: 14,
      super: 8,
      class: 16,
      weapon: 4
    }
  });
  const postmaster = item({
    hash: 102,
    instance_id: "postmaster-1",
    name: "邮政官手炮",
    group_key: "weapons",
    item_type: "Hand Cannon",
    tier: "Legendary",
    bucket_name: "动能武器",
    power: 2005
  });
  const material: AccountMaterialSummary = {
    hash: 301,
    name: "强化核心",
    tier: "Legendary",
    item_type: "材料",
    quantity: 25
  };
  const account: AccountSummary = {
    account_name: "tester",
    destiny_membership_id: "membership-1",
    membership_type: 1,
    characters: [
      {
        character_id: "char-1",
        class_name: "猎人",
        light: 2015,
        equipped_items: [equipped],
        equipment_groups: [],
        inventory_items: [inventory],
        inventory_groups: [],
        postmaster_items: [postmaster],
        loadout_slots: [{
          index: 0,
          name: "虚空配装",
          item_count: 8,
          items: [
            { instance_id: "equipped-1", name: "已装备手炮", bucket_name: "能量武器" },
            { instance_id: "inventory-1", name: "背包胸甲", bucket_name: "胸甲" }
          ]
        }]
      },
      {
        character_id: "char-2",
        class_name: "泰坦",
        equipped_items: [],
        equipment_groups: [],
        inventory_items: [],
        inventory_groups: [],
        postmaster_items: [],
        loadout_slots: []
      }
    ],
    vault: { item_count: 2, items: [], sample_items: [] },
    materials: { item_count: 1, items: [material] }
  };

  it("selects the requested character and builds account page facts", () => {
    const workspace = createAccountPageWorkspace({
      account,
      selectedCharacterId: "char-1",
      openingItemKey: "postmaster-1",
      isLoadoutMatch: (entry) => entry.instance_id === "equipped-1" || entry.instance_id === "postmaster-1"
    });

    expect(workspace.selectedCharacter?.character_id).toBe("char-1");
    expect(workspace.characterTabs).toMatchObject([
      {
        key: "char-1",
        className: "猎人",
        lightLabel: "光等 2015",
        isSelected: true
      },
      {
        key: "char-2",
        className: "泰坦",
        lightLabel: "光等 -",
        isSelected: false
      }
    ]);
    expect(workspace.accountProfileLine).toBe("Membership 1 / membership-1");
    expect(workspace.accountInventoryLine).toBe("仓库 2 件");
    expect(workspace.selectedCharacterSummary).toBe("光等 2015 / 已装备 1 件 / 背包 1 件");
    expect(workspace.selectedCharacterItems.map((entry) => entry.name)).toEqual(["已装备手炮", "背包胸甲"]);
    expect(workspace.equippedSlotCategories.map((category) => category.label)).toEqual(["武器"]);
    expect(workspace.equippedSlotCategories[0]?.groups.map((group) => group.label)).toEqual(["能量武器"]);
    expect(workspace.inventorySlotCategories.map((category) => category.label)).toEqual(["护甲"]);
    expect(workspace.inventorySlotCategories[0]?.groups.map((group) => group.label)).toEqual(["胸甲"]);
    expect(workspace.slotComparisonRows).toMatchObject([
      {
        key: "weapons:能量武器",
        label: "能量武器",
        equippedItems: [equipped],
        inventoryItems: []
      },
      {
        key: "armor:胸甲",
        label: "胸甲",
        equippedItems: [],
        inventoryItems: [inventory]
      }
    ]);
    expect(workspace.selectedCharacterLoadoutMatchCount).toBe(1);
    expect(workspace.materialRows).toEqual([{
      key: "material:301",
      material,
      meta: "Legendary / 材料"
    }]);
    expect(workspace.postmasterPreviewItems).toMatchObject([{
      key: "postmaster-1",
      item: postmaster,
      meta: "动能武器 / Legendary / 光等 2005",
      isPending: true,
      isLoadoutMatch: true
    }]);
    expect(workspace.loadoutSlotRows).toMatchObject([{
      key: "char-1-loadout-0",
      title: "虚空配装",
      subtitle: "槽位 1 / 8 件装备",
      preview: "已装备手炮 / 背包胸甲"
    }]);
  });

  it("builds a stable account page view model for shared UI adapters", () => {
    const viewModel = selectAccountPageModel({
      cache: {
        accountSummary: account,
        activitySummary: null
      },
      pageState: {
        selectedCharacterId: "char-1",
        openingItemKey: "inventory-1",
        isBungieConfigured: true,
        isAccountLoggedIn: true,
        isLoadingAccount: false,
        accountError: "",
        itemDetailError: "",
        activityMessage: "",
        activityError: "",
        loadoutMessage: "",
        itemActionMessage: "",
        isRunningItemAction: false,
        activeLoadoutTemplateName: "虚空测试",
        isLoadoutMatch: (entry) => entry.instance_id === "equipped-1"
      }
    });

    expect(viewModel.connection).toMatchObject({
      hasAccount: true,
      isBungieConfigured: true,
      isAccountLoggedIn: true,
      canLoadAccount: true,
      isLoadingAccount: false
    });
    expect(viewModel.profile).toMatchObject({
      accountName: "tester",
      profileLine: "Membership 1 / membership-1",
      inventoryLine: "仓库 2 件"
    });
    expect(viewModel.navigation.map((item) => item.href)).toEqual([
      "#account-gear",
      "#account-configuration",
      "#account-tasks",
      "#account-items",
      "#account-postmaster",
      "#account-activity"
    ]);
    expect(viewModel.selectedCharacter?.characterId).toBe("char-1");
    expect(viewModel.loadout.slotComparisonRows[0]?.equippedItems[0]?.openPayload).toMatchObject({
      source_character_id: "char-1",
      source_kind: "equipped",
      item: equipped
    });
    expect(viewModel.loadout.slotComparisonRows[1]?.inventoryItems[0]).toMatchObject({
      key: "inventory-1",
      isPending: true,
      primaryFacts: ["Legendary"],
      stateFacts: ["总值 68"]
    });
    expect(viewModel.activity.summary).toBeNull();
    expect(viewModel.activity.message).toBe("");
    expect(viewModel.materials.rows[0]?.meta).toBe("Legendary / 材料");
    expect(viewModel.postmaster.items[0]?.openPayload).toMatchObject({
      source_character_id: "char-1",
      is_postmaster_item: true,
      item: postmaster
    });
  });

  it("falls back to the first character when selected id is missing", () => {
    const workspace = createAccountPageWorkspace({
      account,
      selectedCharacterId: "missing"
    });

    expect(workspace.selectedCharacter?.character_id).toBe("char-1");
  });

  it("formats account item metadata in app layer", () => {
    expect(getAccountPageItemKey(equipped)).toBe("equipped-1");
    expect(getAccountPageItemKey({ ...equipped, instance_id: undefined })).toBe("hash:100");
    expect(getCharacterCombinedItems(account.characters[0]!).map((entry) => entry.name))
      .toEqual(["已装备手炮", "背包胸甲"]);
    expect(formatAccountItemMeta(equipped)).toBe("能量武器 / Legendary / 光等 2010 / 已锁定");
    expect(formatAccountItemMeta(inventory)).toBe("胸甲 / Legendary / 总值 68 / 生命值 20 / 职业 16 / 手雷 14");
    expect(formatAccountItemFacts(equipped)).toEqual({
      primary: ["Hand Cannon", "Legendary", "光等 2010"],
      state: ["锁定"]
    });
    expect(formatAccountItemFacts(inventory)).toEqual({
      primary: ["Legendary"],
      state: ["总值 68"]
    });
  });

  it("groups account items by slot and category in app layer", () => {
    const grouped = groupAccountItemsBySlot([
      item({
        hash: 201,
        name: "能量斥候",
        group_key: "weapons",
        item_type: "Scout Rifle",
        tier: "Legendary",
        bucket_name: "能量武器"
      }),
      item({
        hash: 202,
        name: "动能手炮",
        group_key: "weapons",
        item_type: "Hand Cannon",
        tier: "Legendary",
        bucket_name: "动能武器"
      }),
      item({
        hash: 203,
        name: "记忆水晶",
        group_key: "other",
        item_type: "Engram",
        tier: "Legendary",
        bucket_name: ""
      })
    ]);

    expect(grouped.map((category) => category.label)).toEqual(["武器", "其他"]);
    expect(grouped[0]?.groups.map((group) => group.label)).toEqual(["动能武器", "能量武器"]);
    expect(grouped[0]?.count).toBe(2);
    expect(grouped[1]?.groups[0]?.label).toBe("记忆水晶");
  });
});
