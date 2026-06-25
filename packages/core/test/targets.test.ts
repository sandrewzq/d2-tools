import { describe, expect, it } from "vitest";
import type { AccountItemSummary } from "../src/account/summary.js";
import {
  evaluateLocalArmorTargets,
  evaluateLocalTargets,
  evaluateLocalWeaponTargets,
  summarizeLocalTargetMatches,
  type LocalTargetRules
} from "../src/analysis/targets.js";

const helmet: AccountItemSummary = {
  hash: 100,
  instance_id: "helmet-1",
  name: "目标头盔",
  item_type: "Helmet",
  tier: "Legendary",
  bucket_name: "头盔",
  group_key: "armor",
  power: 2010,
  locked: false,
  socket_plugs: [],
  armor_stats: {
    health: 24,
    melee: 8,
    grenade: 12,
    super: 6,
    class: 22,
    weapon: 4,
    total: 76
  }
};

const targetRules: LocalTargetRules = {
  action_policy: "notify_only",
  armor: [
    {
      id: "survive-class",
      name: "生存职业装",
      conditions: [
        { stat: "health", min: 20 },
        { stat: "class", min: 20 }
      ]
    },
    {
      id: "grenade-build",
      name: "手雷装",
      conditions: [
        { stat: "grenade", min: 20 }
      ]
    }
  ],
  weapons: [
    {
      id: "riskrunner-clear",
      name: "清怪风险管理人",
      item_hash: 200,
      item_name: "Riskrunner",
      conditions: [
        { perk_hash: 11, perk_name: "伏特弹药" },
        { perk_hash: 22, perk_name: "爆破专家" }
      ]
    }
  ]
};

const weapon: AccountItemSummary = {
  hash: 200,
  instance_id: "weapon-1",
  name: "Riskrunner",
  item_type: "Submachine Gun",
  tier: "Exotic",
  bucket_name: "能量武器",
  group_key: "weapons",
  power: 2010,
  locked: false,
  socket_plugs: [
    { hash: 11, name: "伏特弹药" },
    { hash: 22, name: "爆破专家" }
  ]
};

describe("local target rules", () => {
  it("matches armor only when every selected stat reaches its minimum", () => {
    const result = evaluateLocalArmorTargets(helmet, targetRules);

    expect(result.matched).toBe(true);
    expect(result.labels).toEqual(["生存职业装"]);
    expect(result.reasons).toEqual(["生存职业装：生命值 >= 20 / 职业 >= 20"]);
  });

  it("does not match weapons or armor missing required stats", () => {
    expect(evaluateLocalArmorTargets({
      ...helmet,
      group_key: "weapons",
      armor_stats: undefined
    }, targetRules).matched).toBe(false);
    expect(evaluateLocalArmorTargets({
      ...helmet,
      armor_stats: {
        ...helmet.armor_stats!,
        health: 18
      }
    }, targetRules).labels).toEqual([]);
  });

  it("summarizes matched local targets for vault badges and detail panels", () => {
    expect(summarizeLocalTargetMatches([helmet, weapon], targetRules)).toEqual({
      matched_count: 2,
      matched_rule_names: ["生存职业装", "清怪风险管理人"]
    });
  });

  it("matches weapon targets by selected weapon hash and every selected perk", () => {
    const result = evaluateLocalWeaponTargets(weapon, targetRules);

    expect(result.matched).toBe(true);
    expect(result.labels).toEqual(["清怪风险管理人"]);
    expect(result.reasons).toEqual(["清怪风险管理人：Riskrunner / 伏特弹药 + 爆破专家"]);
    expect(evaluateLocalTargets(weapon, targetRules)).toEqual(result);
  });

  it("does not match weapon targets when item hash or required perk is missing", () => {
    expect(evaluateLocalWeaponTargets({
      ...weapon,
      hash: 201
    }, targetRules).matched).toBe(false);
    expect(evaluateLocalWeaponTargets({
      ...weapon,
      socket_plugs: [{ hash: 11, name: "伏特弹药" }]
    }, targetRules).matched).toBe(false);
  });
});
