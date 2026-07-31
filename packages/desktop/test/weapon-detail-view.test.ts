import { describe, expect, it } from "vitest";
import type { AccountItemPlugSummary, AccountItemReusablePlugSummary } from "@d2-tools/core/account/summary";
import type { ItemPlugSummary } from "@d2-tools/core/items/perks";
import type { SelectedItemDetail } from "../src/renderer/shared/hooks/useItemDetail";
import { buildWeaponDetailView } from "../src/renderer/shared/components/item-detail/buildWeaponDetailView";

describe("weapon detail view", () => {
  it("keeps the base perk pool and classifies frames-category traits correctly", () => {
    const barrels = plugs(11, 1_000, "枪管", "barrels", "枪管");
    const enhancedBarrels = barrels.map((plug, index) => ({
      ...plug,
      hash: 2_000 + index,
      item_type: "强化枪管"
    }));
    const firstTraits = plugs(7, 3_000, "第一列特性", "frames", "特性");
    const enhancedFirstTraits = firstTraits.map((plug, index) => ({
      ...plug,
      hash: 4_000 + index,
      item_type: "强化特征"
    }));
    const secondTraits = plugs(7, 5_000, "第二列特性", "frames", "特性");
    const enhancedSecondTraits = secondTraits.map((plug, index) => ({
      ...plug,
      hash: 6_000 + index,
      item_type: "强化特征"
    }));
    const selectedFirstTrait = firstTraits[1]!;
    const selectedSecondTrait = secondTraits[3]!;

    const model = buildWeaponDetailView({
      selectedItem: weapon({
        barrels: [...barrels, ...enhancedBarrels],
        firstTraits: [...firstTraits, ...enhancedFirstTraits],
        secondTraits: [...secondTraits, ...enhancedSecondTraits],
        selectedFirstTrait,
        selectedSecondTrait
      })
    });

    expect(model).not.toBeNull();
    const barrelColumn = model?.configuration.pool_columns.find((column) => column.socket_index === 1);
    const traitColumns = model?.configuration.pool_columns.filter((column) => column.role === "trait") ?? [];
    expect(barrelColumn).toMatchObject({ role: "barrel" });
    expect(barrelColumn?.candidates.map((candidate) => candidate.hash))
      .toEqual(barrels.map((candidate) => candidate.hash));
    expect(traitColumns.map((column) => ({
      socket_index: column.socket_index,
      label: column.label,
      candidate_hashes: column.candidates.map((candidate) => candidate.hash)
    }))).toEqual([
      {
        socket_index: 3,
        label: "Perk 1",
        candidate_hashes: firstTraits.map((candidate) => candidate.hash)
      },
      {
        socket_index: 4,
        label: "Perk 2",
        candidate_hashes: secondTraits.map((candidate) => candidate.hash)
      }
    ]);
    expect(model?.configuration.selection_columns.find((column) => column.socket_index === 3))
      .toMatchObject({ role: "trait", candidates: [{ hash: selectedFirstTrait.hash, selected: true }] });
    expect(model?.configuration.selection_columns.find((column) => column.socket_index === 4))
      .toMatchObject({ role: "trait", candidates: [{ hash: selectedSecondTrait.hash, selected: true }] });
  });
});

function weapon(input: {
  barrels: ItemPlugSummary[];
  firstTraits: ItemPlugSummary[];
  secondTraits: ItemPlugSummary[];
  selectedFirstTrait: ItemPlugSummary;
  selectedSecondTrait: ItemPlugSummary;
}): SelectedItemDetail {
  const intrinsic = plug(100, "速射框架", "intrinsics", "固有");
  const selectedBarrel = input.barrels[0]!;
  return {
    hash: 970034755,
    name: "赐予者的祝福",
    description: "",
    item_key: "instance-1",
    instance_id: "instance-1",
    group_key: "weapons",
    source: { status: "missing", label: "历史获取途径", description: "" },
    perks: [
      { socket_index: 0, plugs: [intrinsic] },
      { socket_index: 1, plugs: input.barrels },
      { socket_index: 3, plugs: input.firstTraits },
      { socket_index: 4, plugs: input.secondTraits }
    ],
    sockets: [
      socket(1, selectedBarrel),
      socket(3, input.selectedFirstTrait),
      socket(4, input.selectedSecondTrait)
    ],
    socket_plugs: [intrinsic, selectedBarrel, input.selectedFirstTrait, input.selectedSecondTrait]
  };
}

function socket(socketIndex: number, selected: ItemPlugSummary) {
  return {
    socket_index: socketIndex,
    is_visible: true,
    is_enabled: true,
    enable_fail_indexes: [],
    selected_plug: selected as AccountItemPlugSummary,
    reusable_plugs: [reusablePlug(selected)]
  };
}

function reusablePlug(value: ItemPlugSummary): AccountItemReusablePlugSummary {
  return {
    ...value,
    selected: true,
    can_insert: true,
    enabled: true,
    insert_fail_indexes: [],
    enable_fail_indexes: [],
    sources: ["instance"]
  };
}

function plugs(
  count: number,
  firstHash: number,
  namePrefix: string,
  category: string,
  itemType: string
): ItemPlugSummary[] {
  return Array.from({ length: count }, (_, index) => (
    plug(firstHash + index, `${namePrefix} ${index + 1}`, category, itemType)
  ));
}

function plug(
  hash: number,
  name: string,
  category: string,
  itemType: string
): ItemPlugSummary {
  return {
    hash,
    name,
    description: "",
    category_identifier: category,
    item_type: itemType
  };
}
