import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  clearLocalTargetRules,
  loadLocalTargetRules,
  saveLocalTargetRules
} from "../../services/src/analysis/targetRulesStore.js";

describe("local target rules store", () => {
  it("persists sanitized armor target rules in the local data directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-targets-"));

    expect(loadLocalTargetRules(dir)).toEqual({ action_policy: "notify_only", armor: [], weapons: [] });

    const saved = saveLocalTargetRules(dir, {
      action_policy: "auto_lock" as never,
      armor: [
        {
          id: "  ",
          name: "  高生命职业  ",
          conditions: [
            { stat: "health", min: 20 },
            { stat: "class", min: 25 },
            { stat: "class", min: Number.NaN }
          ]
        },
        {
          id: "empty",
          name: "",
          conditions: []
        }
      ],
      weapons: [
        {
          id: "",
          name: "  清怪手炮  ",
          item_hash: "300" as unknown as number,
          item_name: "  Fatebringer  ",
          conditions: [
            { perk_hash: "11" as unknown as number, perk_name: "  爆破专家  " },
            { perk_hash: Number.NaN, perk_name: "无效" }
          ]
        },
        {
          id: "empty-weapon",
          name: "无条件武器",
          item_hash: 301,
          item_name: "Empty",
          conditions: []
        }
      ]
    });

    expect(saved.armor).toHaveLength(1);
    expect(saved.weapons).toHaveLength(1);
    expect(saved.action_policy).toBe("notify_only");
    expect(saved.armor[0].name).toBe("高生命职业");
    expect(saved.armor[0].conditions).toEqual([
      { stat: "health", min: 20 },
      { stat: "class", min: 25 }
    ]);
    expect(saved.weapons[0]).toMatchObject({
      name: "清怪手炮",
      item_hash: 300,
      item_name: "Fatebringer",
      conditions: [{ perk_hash: 11, perk_name: "爆破专家" }]
    });
    expect(loadLocalTargetRules(dir)).toEqual(saved);
  });

  it("clears persisted local target rules", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-targets-"));

    saveLocalTargetRules(dir, {
      action_policy: "notify_only",
      armor: [
        {
          id: "health",
          name: "生命目标",
          conditions: [{ stat: "health", min: 20 }]
        }
      ],
      weapons: []
    });
    clearLocalTargetRules(dir);

    expect(loadLocalTargetRules(dir)).toEqual({ action_policy: "notify_only", armor: [], weapons: [] });
  });
});
