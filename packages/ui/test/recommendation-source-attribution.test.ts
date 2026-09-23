import { describe, expect, it } from "vitest";
import type { VaultRecommendationSourceSummary } from "../src/recommendationMatchView.js";
import { attributeVaultRecommendationSummaryIndex } from "../src/recommendationMatchView.js";

/**
 * Bug #92 的守卫测试：仓库筛选里的来源，一行代表**一次导入**。
 *
 * 管理面按文档键记一行（一次导入），事实层按实例键记一条（一个具名来源）。
 * 两者键不相等，所以消费层必须先按名册给的对应关系把事实归队，
 * 否则白名单会把全部事实滤掉——仓库勾选来源后整页 0 件。
 */

const DOCUMENT_KEY = "document:aaa";
const INSTANCE_KEY = "document:aaa:bbb";

// 事实层给出的东西：键是实例键。
function fact(sourceId: string, matchedPerkCount: number): VaultRecommendationSourceSummary {
  return {
    sourceId,
    sourceLabel: "示例推荐表",
    shortLabel: "示例推荐表",
    state: "core",
    matched: matchedPerkCount,
    available: 2,
    matchedPerkCount,
    perkRequirementCount: 2,
    uncheckablePerkCount: 0,
    matchedRequirementCount: matchedPerkCount,
    requirementCount: 2,
    uncheckableRequirementCount: 0,
    unit: "perk",
    purposes: ["pve"],
    resultText: `Perk ${matchedPerkCount}/2 · 完整 ${matchedPerkCount}/2`,
    text: "",
    detail: ""
  };
}

describe("仓库来源筛选：事实按管理名册归队", () => {
  it("实例键的事实归到它所属的那一行，键换成管理面的键", () => {
    const index = attributeVaultRecommendationSummaryIndex(
      new Map([["instance-1", [fact(INSTANCE_KEY, 2)]]]),
      new Map([[INSTANCE_KEY, DOCUMENT_KEY]])
    );

    // 归队后下游一律用管理面的键看来源：行数与来源管理区一致，名字也取那一行的名字。
    expect([...index.keys()]).toEqual(["instance-1"]);
    expect(index.get("instance-1")?.map((summary) => summary.sourceId)).toEqual([DOCUMENT_KEY]);
    expect(index.get("instance-1")?.[0]?.matchedPerkCount).toBe(2);
  });

  it("一次导入下有多个具名来源时，它们都归到同一行", () => {
    const index = attributeVaultRecommendationSummaryIndex(
      new Map([
        ["instance-1", [fact(INSTANCE_KEY, 2)]],
        ["instance-2", [fact(`${INSTANCE_KEY}:c`, 1)]]
      ]),
      new Map([
        [INSTANCE_KEY, DOCUMENT_KEY],
        [`${INSTANCE_KEY}:c`, DOCUMENT_KEY]
      ])
    );

    // 两件武器各归到那一行；下游按实例分别保留事实，计数时自然累加到同一行。
    expect(index.get("instance-1")?.[0]?.sourceId).toBe(DOCUMENT_KEY);
    expect(index.get("instance-2")?.[0]?.sourceId).toBe(DOCUMENT_KEY);
  });

  it("名册里没有的事实一律丢掉，且空名册等于一条都不放行", () => {
    const raw = new Map([["instance-1", [fact(INSTANCE_KEY, 2)]]]);

    // 已删除来源留下的旧扫描结果不能再出现。
    expect(attributeVaultRecommendationSummaryIndex(raw, new Map()).size).toBe(0);
    // 名册里有别的来源、但没有这一条：同样不放行。
    expect(attributeVaultRecommendationSummaryIndex(
      raw,
      new Map([["document:zzz:yyy", "document:zzz"]])
    ).size).toBe(0);
  });

  it("键本来就相等时不改写对象：下游的缓存比较不会被无谓地打破", () => {
    const summary = fact(DOCUMENT_KEY, 2);
    const index = attributeVaultRecommendationSummaryIndex(
      new Map([["instance-1", [summary]]]),
      new Map([[DOCUMENT_KEY, DOCUMENT_KEY]])
    );

    expect(index.get("instance-1")?.[0]).toBe(summary);
  });
});
