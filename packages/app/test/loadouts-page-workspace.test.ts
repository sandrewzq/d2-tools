import { describe, expect, it } from "vitest";
import type { AccountItemSummary, AccountSummary } from "@d2-tools/core/account/summary";
import type { LoadoutTemplate } from "@d2-tools/core/loadouts/templates";
import {
  createLoadoutsPageWorkspace,
  getLoadoutItemBlockedDetails,
  getLoadoutItemStatus,
  selectLoadoutsPageModel
} from "../src/workspaces/loadoutsPage";

describe("loadouts page workspace", () => {
  it("derives selected analysis, transfer status, and visible compare rows outside Desktop", () => {
    const templates = [targetTemplate(), compareTemplate()];
    const workspace = createLoadoutsPageWorkspace({
      accountSummary: accountSummary(),
      templates,
      selectedTemplateId: "target",
      compareTemplateId: "compare",
      showDiffOnly: true
    });

    expect(workspace.selectedTemplate?.id).toBe("target");
    expect(workspace.compareTemplate?.id).toBe("compare");
    expect(workspace.selectedAnalysis?.equipped.map((item) => item.instance_id)).toEqual([
      "target-equipped",
      "vault-energy"
    ]);
    expect(workspace.transferPlan?.steps.map((step) => step.phase)).toEqual(["to-character", "equip-target"]);
    expect(workspace.readyCount).toBe(1);
    expect(workspace.missingCount).toBe(1);
    expect(workspace.actionableCount).toBe(1);
    expect(workspace.statusSummary).toEqual([
      { key: "equipped", label: "已装备", count: 1 },
      { key: "vault", label: "仓库", count: 1 }
    ]);
    expect(workspace.visibleCompareRows).toHaveLength(1);
    expect(workspace.visibleCompareRows[0]).toMatchObject({
      slot: "Energy Weapons",
      changed: true
    });
  });

  it("combines local templates and in-game slots into one loadout entry list", () => {
    const summary = accountSummary();
    summary.characters[0].loadout_slots = [
      {
        index: 0,
        name: "Raid slot",
        item_count: 10,
        items: [
          { instance_id: "target-equipped", name: "Kinetic Ready", bucket_name: "Kinetic Weapons" }
        ]
      }
    ];

    const workspace = createLoadoutsPageWorkspace({
      accountSummary: summary,
      templates: [targetTemplate()],
      selectedTemplateId: "target",
      compareTemplateId: "",
      showDiffOnly: false
    });

    expect(workspace.loadoutEntries.map((entry) => entry.id)).toEqual([
      "local-template-target",
      "in-game-char-target-0"
    ]);
    expect(workspace.loadoutEntries[0]).toMatchObject({
      source: "local-template",
      title: "Grandmaster",
      subtitle: "Titan / 2 件装备",
      statusLabel: "待补齐 1 件"
    });
    expect(workspace.loadoutEntries[1]).toMatchObject({
      source: "in-game",
      title: "Raid slot",
      subtitle: "Titan / 槽位 1 / 10 件装备",
      statusLabel: "可应用"
    });
    expect(workspace.loadoutEntries[1].preview).toBe("Kinetic Ready");
  });

  it("models the selected local template detail for shared loadouts UI", () => {
    const workspace = createLoadoutsPageWorkspace({
      accountSummary: accountSummary(),
      templates: [targetTemplate(), compareTemplate()],
      selectedTemplateId: "target",
      selectedEntryId: "local-template-target",
      compareTemplateId: "compare",
      showDiffOnly: true
    });

    expect(workspace.model.selectedEntryId).toBe("local-template-target");
    expect(workspace.model.riskSummary).toEqual({
      missingCount: 1,
      readyCount: 1,
      actionableCount: 1
    });
    expect(workspace.model.compare.visibleRows).toHaveLength(1);
    expect(workspace.model.selectedDetail.kind).toBe("local-template");
    if (workspace.model.selectedDetail.kind !== "local-template") {
      throw new Error("expected local template detail");
    }
    expect(workspace.model.selectedDetail.template.id).toBe("target");
    expect(workspace.model.selectedDetail.analysis?.equipped.map((item) => item.instance_id)).toEqual([
      "target-equipped",
      "vault-energy"
    ]);
    expect(workspace.model.selectedDetail.transferPlan?.steps.map((step) => step.phase)).toEqual([
      "to-character",
      "equip-target"
    ]);
    expect(workspace.model.selectedDetail.itemRows.map((row) => row.status.key)).toEqual(["equipped", "vault"]);
  });

  it("exposes a page model selector without requiring callers to use the full workspace", () => {
    const model = selectLoadoutsPageModel({
      accountSummary: accountSummary(),
      templates: [targetTemplate(), compareTemplate()],
      selectedTemplateId: "target",
      selectedEntryId: "local-template-target",
      compareTemplateId: "compare",
      showDiffOnly: true
    });

    expect(model.entries.map((entry) => entry.id)).toEqual([
      "local-template-target",
      "local-template-compare"
    ]);
    expect(model.selectedEntryId).toBe("local-template-target");
    expect(model.riskSummary).toEqual({
      missingCount: 1,
      readyCount: 1,
      actionableCount: 1
    });
    expect(model.compare.options).toEqual([{ id: "compare", name: "Raid" }]);
    expect(model.compare.visibleRows).toHaveLength(1);
    expect(model.selectedDetail.kind).toBe("local-template");
  });

  it("models the selected in-game loadout detail for shared loadouts UI", () => {
    const summary = accountSummary();
    summary.characters[0].loadout_slots = [
      {
        index: 0,
        name: "Raid slot",
        item_count: 10,
        items: [
          { instance_id: "target-equipped", name: "Kinetic Ready", bucket_name: "Kinetic Weapons" }
        ]
      }
    ];

    const workspace = createLoadoutsPageWorkspace({
      accountSummary: summary,
      templates: [targetTemplate()],
      selectedTemplateId: "target",
      selectedEntryId: "in-game-char-target-0",
      compareTemplateId: "",
      showDiffOnly: false
    });

    expect(workspace.model.selectedEntryId).toBe("in-game-char-target-0");
    expect(workspace.model.entries.map((entry) => entry.id)).toEqual([
      "local-template-target",
      "in-game-char-target-0"
    ]);
    expect(workspace.model.selectedDetail.kind).toBe("in-game-slot");
    if (workspace.model.selectedDetail.kind !== "in-game-slot") {
      throw new Error("expected in-game slot detail");
    }
    expect(workspace.model.selectedDetail.characterId).toBe("char-target");
    expect(workspace.model.selectedDetail.characterName).toBe("Titan");
    expect(workspace.model.selectedDetail.slot.name).toBe("Raid slot");
    expect(workspace.model.selectedDetail.items).toEqual([
      { instance_id: "target-equipped", name: "Kinetic Ready", bucket_name: "Kinetic Weapons" }
    ]);
  });

  it("exposes row helpers for UI without requiring Desktop feature imports", () => {
    const template = targetTemplate();
    const summary = accountSummary();
    const workspace = createLoadoutsPageWorkspace({
      accountSummary: summary,
      templates: [template],
      selectedTemplateId: "target",
      compareTemplateId: "",
      showDiffOnly: false
    });

    const vaultItem = template.items[1];
    expect(getLoadoutItemStatus({
      item: vaultItem,
      template,
      selectedAnalysis: workspace.selectedAnalysis,
      transferPlan: workspace.transferPlan,
      accountSummary: summary
    })).toMatchObject({
      key: "vault",
      badge_label: "仓库待取"
    });

    expect(getLoadoutItemBlockedDetails(vaultItem, workspace.transferPlan)).toBeNull();
  });
});

function targetTemplate(): LoadoutTemplate {
  return {
    id: "target",
    name: "Grandmaster",
    character_id: "char-target",
    class_name: "Titan",
    created_at: "2026-07-02T00:00:00.000Z",
    items: [
      { hash: 100, instance_id: "target-equipped", name: "Kinetic Ready", bucket_name: "Kinetic Weapons" },
      { hash: 200, instance_id: "vault-energy", name: "Energy Missing", bucket_name: "Energy Weapons", perk_names: ["快速命中"] }
    ]
  };
}

function compareTemplate(): LoadoutTemplate {
  return {
    id: "compare",
    name: "Raid",
    character_id: "char-target",
    class_name: "Titan",
    created_at: "2026-07-02T00:00:00.000Z",
    items: [
      { hash: 100, instance_id: "target-equipped", name: "Kinetic Ready", bucket_name: "Kinetic Weapons" },
      { hash: 201, instance_id: "other-energy", name: "Different Energy", bucket_name: "Energy Weapons", perk_names: ["丰盈满溢"] }
    ]
  };
}

function accountSummary(): AccountSummary {
  return {
    account_name: "tester",
    destiny_membership_id: "destiny-1",
    membership_type: 3,
    characters: [
      {
        character_id: "char-target",
        class_name: "Titan",
        light: 2020,
        equipped_items: [item("target-equipped", 100, "Kinetic Ready", "Kinetic Weapons")],
        equipment_groups: [],
        inventory_items: [],
        inventory_groups: [],
        postmaster_items: [],
        loadout_slots: []
      }
    ],
    vault: {
      item_count: 1,
      items: [item("vault-energy", 200, "Energy Missing", "Energy Weapons")],
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
  bucketName: string
): AccountItemSummary {
  return {
    hash,
    instance_id: instanceId,
    name,
    bucket_name: bucketName,
    group_key: "weapons",
    socket_plugs: []
  };
}
