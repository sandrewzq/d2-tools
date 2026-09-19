import { describe, expect, it } from "vitest";
import type { AccountItemPlugSummary, AccountItemReusablePlugSummary, AccountItemSummary } from "@d2-tools/core/account/summary";
import type { ItemPlugSummary } from "@d2-tools/core/items/perks";
import type { SelectedItemDetail } from "../src/renderer/shared/hooks/useItemDetail";
import { buildWeaponDetailView } from "../src/renderer/shared/components/item-detail/buildWeaponDetailView";
import {
  createSelectedItemPreview,
  mergeSelectedItemDetail,
  type ItemDefinitionDetailLike
} from "../../app/src/workspaces/itemDetail";

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

  it("keeps special weapon sockets in their real order and restores selected fallback plugs", () => {
    const intrinsic = plug(100, "远程武器", "intrinsics", "固有");
    const blade = plug(101, "平衡柄芯", "v950.new.sword0.blades", "柄芯");
    const guard = plug(102, "平衡握把", "v950.new.sword0.guards", "握把");
    const firstTrait = plug(103, "鸬鹚反转", "frames", "特性");
    const core = plug(104, "冲击核心", "v950.new.sword0.perk_upgrades", "能量核心");
    const secondTrait = plug(105, "鸬鹚连击", "frames", "特性");
    const selectedItem: SelectedItemDetail = {
      hash: 3049715579,
      name: "英勇利刃",
      description: "",
      item_key: "special-instance",
      instance_id: "special-instance",
      group_key: "weapons",
      source: { status: "missing", label: "历史获取途径", description: "" },
      perks: [
        { socket_index: 12, plugs: [secondTrait] },
        { socket_index: 0, plugs: [intrinsic] },
        { socket_index: 11, plugs: [core] },
        { socket_index: 2, plugs: [guard] },
        { socket_index: 3, plugs: [firstTrait] },
        { socket_index: 1, plugs: [blade] }
      ],
      sockets: [socket(1, blade), socket(2, guard), socket(3, firstTrait), socket(12, secondTrait)],
      socket_plugs: [intrinsic, blade, guard, firstTrait, core, secondTrait]
    };

    const model = buildWeaponDetailView({ selectedItem });

    expect(model?.configuration.pool_columns.map((column) => ({
      socket_index: column.socket_index,
      label: column.label
    }))).toEqual([
      { socket_index: 1, label: "柄芯" },
      { socket_index: 2, label: "握把" },
      { socket_index: 3, label: "Perk 1" },
      { socket_index: 11, label: "核心升级" },
      { socket_index: 12, label: "Perk 2" }
    ]);
    expect(model?.configuration.selection_columns.map((column) => column.socket_index))
      .toEqual([1, 2, 3, 11, 12]);
    expect(model?.configuration.selection_columns.find((column) => column.socket_index === 11))
      .toMatchObject({ label: "核心升级", candidates: [{ hash: core.hash, selected: true }] });
  });

  // 打开详情时 sockets 来自 buildPreviewSocketsFromWeaponRoll：快照只有「拥有哪些插件、当前装的是哪个」，
  // 插槽可不可用 / 能不能插它并不知道，那几项被统一占位成 false。把占位当事实读，会让整件武器在读完
  // 完整 Roll（点「查看完整掉落池」）之前一律不可切换——本件 Roll 的格子与推荐区浮层里的「选择」都点不动。
  it("keeps switching available from the snapshot alone, before the full roll is read", () => {
    const selectedItem = previewedWeapon();
    expect(selectedItem.detail_loaded).toMatchObject({ definition: true, instance: false });

    const model = buildWeaponDetailView({ selectedItem });
    const magazine = model?.configuration.selection_columns.find((column) => column.socket_index === 2);
    // 推荐区按来源栏位找列，靠的就是这个字段（来源事实与配置列的唯一交集）。
    expect(magazine?.requirement_slot).toBe("magazine");
    // 拥有、且不是当前装的那一项＝可以换过去；当前装的那一项没有动作可给。
    expect(magazine?.candidates.map((candidate) => [candidate.name, candidate.can_apply])).toEqual([
      ["精确弹药", false],
      ["轻质弹匣", true]
    ]);
  });

  it("falls back to the game's socket state once the full roll is loaded", () => {
    const enabledItem = verifiedWeapon(true);
    const enabled = buildWeaponDetailView({ selectedItem: enabledItem })
      ?.configuration.selection_columns.find((column) => column.socket_index === 2);
    expect(enabled?.candidates.map((candidate) => [candidate.name, candidate.can_apply])).toEqual([
      ["精确弹药", false],
      ["轻质弹匣", true]
    ]);

    // 游戏说这一栏不可用／插不进去时，硬条件说了算：快照认为能换也不给换。
    const disabledItem = verifiedWeapon(false);
    const disabled = buildWeaponDetailView({ selectedItem: disabledItem })
      ?.configuration.selection_columns.find((column) => column.socket_index === 2);
    expect(disabled?.candidates.find((candidate) => candidate.name === "轻质弹匣")?.can_apply).toBe(false);
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

/** 账号快照里的一条 Roll 插件：分类字段决定它落在哪个来源栏位。 */
function rollPlug(
  hash: number,
  name: string,
  category: string,
  itemType: string
) {
  return { hash, name, description: "", category_identifier: category, item_type: itemType };
}

/**
 * 打开详情、定义补读完、完整 Roll 还没读的状态：`sockets` 由快照搭出来
 * （`buildPreviewSocketsFromWeaponRoll`），插槽可用性那几项是占位值，不是游戏返回的事实。
 */
function previewedWeapon(): SelectedItemDetail {
  const currentMagazine = rollPlug(200, "精确弹药", "v400.weapon.magazine", "弹匣");
  const ownedMagazine = rollPlug(201, "轻质弹匣", "v400.weapon.magazine", "弹匣");
  const currentBarrel = rollPlug(100, "箭头制退器", "v400.weapon.barrel", "枪管");
  const trait = rollPlug(300, "快速命中", "frames", "特性");
  const summary = {
    hash: 970034755,
    name: "赐予者的祝福",
    icon: "",
    group_key: "weapons",
    item_key: "instance-1",
    instance_id: "instance-1",
    socket_plugs: [currentMagazine, ownedMagazine, currentBarrel, trait],
    weapon_roll: {
      fingerprint: "fingerprint-1",
      complete: true,
      incomplete_reasons: [],
      sockets: [
        {
          socket_index: 1,
          role: "barrel",
          slot: "barrel",
          label: "枪管",
          current_plug: currentBarrel,
          owned_plugs: [currentBarrel],
          complete: true,
          incomplete_reasons: []
        },
        {
          socket_index: 2,
          role: "magazine",
          slot: "magazine",
          label: "第二列",
          current_plug: currentMagazine,
          owned_plugs: [currentMagazine, ownedMagazine],
          complete: true,
          incomplete_reasons: []
        },
        {
          socket_index: 3,
          role: "trait",
          slot: "perk1",
          label: "Perk 1",
          current_plug: trait,
          owned_plugs: [trait],
          complete: true,
          incomplete_reasons: []
        }
      ]
    }
  } as unknown as AccountItemSummary;
  const definition = {
    description: "武器说明",
    perks: [
      { socket_index: 1, plugs: [currentBarrel] },
      { socket_index: 2, plugs: [currentMagazine, ownedMagazine] },
      { socket_index: 3, plugs: [trait] }
    ]
  } as unknown as ItemDefinitionDetailLike;
  return mergeSelectedItemDetail(createSelectedItemPreview(summary, {}), definition);
}

/** 完整 Roll 读完之后的状态：`sockets` 换成游戏返回的真值，`detail_loaded.instance` 转真。 */
function verifiedWeapon(socketEnabled: boolean): SelectedItemDetail {
  const base = previewedWeapon();
  const currentMagazine = rollPlug(200, "精确弹药", "v400.weapon.magazine", "弹匣");
  const ownedMagazine = rollPlug(201, "轻质弹匣", "v400.weapon.magazine", "弹匣");
  return {
    ...base,
    detail_loaded: { definition: true, instance: true },
    sockets: [{
      socket_index: 2,
      is_visible: true,
      is_enabled: socketEnabled,
      enable_fail_indexes: [],
      selected_plug: currentMagazine as AccountItemPlugSummary,
      reusable_plugs: [
        reusablePlug(currentMagazine),
        reusablePlug(ownedMagazine)
      ]
    }]
  };
}
