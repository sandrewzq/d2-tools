import { describe, expect, it } from "vitest";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import {
  createRecommendationCardSummary,
  type RecommendationSourceMatch,
  type RecommendationSourceSlotMatch,
  type VaultItemInstanceMatchInfo
} from "@d2-tools/core/community-perks";
import {
  buildVaultRecommendationFilterFactIndex,
  buildVaultRecommendationSourceOptions,
  buildVaultRecommendationSourceSummaries,
  getVaultCommunityInstanceKey
} from "../src/recommendationMatchView.js";
import { buildVaultCleanupProtectionIndex } from "../src/vault/vaultCleanupProtection.js";
import { vaultCopy } from "../src/i18n/copy/vault.js";

/**
 * T56 不变量 I1 的守卫测试。
 *
 * 架构目标：CSV 与 DIM 只是两种数据格式，差异必须止步于解析/适配层。
 * 因此对任意来源事实，把来源类型 dim ⇄ csv 互换，判定、筛选、卡片、详情、排序
 * 的输出必须逐字段相同——只允许来源名与署名文案不同。
 *
 * 本文件当前为绿。判据是「不变量」，不是「能跑通」——改动 ③④⑤ 层之后必须复跑。
 */

type SourcePrefix = "dim" | "csv";

const ITEM_HASH = 1_000;
const INSTANCE_ID = "instance-1";
// 来源名刻意保持两轮相同：它必须不是排序/判定的输入变量。
const SOURCE_LABEL = "同一来源";
const RULE_ID = "rule-1";

function slot(label: string, matched: boolean): RecommendationSourceSlotMatch {
  return {
    slot: label === "Perk 1" ? "perk1" : "perk2",
    label,
    state: matched ? "match" : "different",
    source_candidate_names: ["候选"],
    source_candidates: [],
    instance_owned: [],
    current_enabled: []
  };
}

/**
 * 一条来源事实。`prefix` 是唯一变量——这正是被测的事实：
 * 把 dim: 换成 csv: 之后，下游任何一层都不应该看得出区别。
 *
 * `source_group_id` 刻意**不带格式前缀**：它是来源身份键（用户 2026-09-16 拍板：**一个具名来源 = 一个键 = 一行**，
 * 两种导入格式一致，不按导入文件合并），格式只能待在 `source_id` 里（而 `source_id` 是被 `withoutSourceId` 剥掉的那个）。
 * 若把分组键也写成 `${prefix}:…`，投影里就会多出一处随格式变化的字段，判据① 会当场变红。
 */
function sourceMatch(
  prefix: SourcePrefix,
  state: RecommendationSourceMatch["state"],
  documentId = "doc-1",
  instanceSuffix = ""
): RecommendationSourceMatch {
  const matched = state === "full";
  return {
    rule_stable_id: RULE_ID,
    source_id: `${prefix}:${documentId}${instanceSuffix}`,
    source_group_id: `document:${documentId}`,
    source_label: SOURCE_LABEL,
    state,
    matched_requirement_count: matched ? 2 : 0,
    requirement_count: 2,
    checkable_requirement_count: 2,
    uncheckable_requirement_count: 0,
    purposes: ["pve"],
    slots: [slot("Perk 1", matched), slot("Perk 2", matched)]
  };
}

function instanceMatch(sources: RecommendationSourceMatch[]): VaultItemInstanceMatchInfo {
  return {
    hash: ITEM_HASH,
    instance_id: INSTANCE_ID,
    canonical_weapon_name: "测试武器",
    coverage: "covered",
    match_status: "partial_match",
    recommendation_state: "compare",
    matched: sources.filter((source) => source.state === "full").length,
    available: sources.length,
    partial: 0,
    modes: ["pve"],
    source_matches: sources
  };
}

function weaponItem(): AccountItemSummary {
  return {
    hash: ITEM_HASH,
    instance_id: INSTANCE_ID,
    name: "测试武器",
    group_key: "weapons",
    socket_plugs: []
  };
}

/** 去掉来源身份本身，只留下「事实投影」——I1 断言的就是这部分必须相同。 */
function withoutSourceId<T extends { sourceId: string }>(summary: T): Omit<T, "sourceId"> {
  const { sourceId: _sourceId, ...rest } = summary;
  return rest;
}

function summarize(prefix: SourcePrefix, state: RecommendationSourceMatch["state"]) {
  return buildVaultRecommendationSourceSummaries(
    weaponItem(),
    instanceMatch([sourceMatch(prefix, state)])
  );
}

describe("T56 I1：来源事实的判定、筛选、卡片、排序不得按来源类型分叉", () => {
  it("来源类型互换后，摘要与排序的顺序一致", () => {
    // 两条来源：一条命中、一条未命中。唯一变量是 sourceId 前缀。
    const dimFirst = buildVaultRecommendationSourceSummaries(
      weaponItem(),
      instanceMatch([
        sourceMatch("dim", "full"),
        sourceMatch("csv", "not_matched", "doc-2")
      ])
    );
    const csvFirst = buildVaultRecommendationSourceSummaries(
      weaponItem(),
      instanceMatch([
        sourceMatch("csv", "full", "doc-2"),
        sourceMatch("dim", "not_matched")
      ])
    );

    // 两轮输入在 dim ⇄ csv 下同构，输出的事实顺序必须相同。
    expect(dimFirst.map((summary) => summary.state))
      .toEqual(csvFirst.map((summary) => summary.state));
  });

  it("同构来源的摘要逐字段相同（除 sourceId）", () => {
    expect(summarize("dim", "full").map(withoutSourceId))
      .toEqual(summarize("csv", "full").map(withoutSourceId));
  });

  it("同构来源的筛选事实逐字段相同", () => {
    const factIndex = (prefix: SourcePrefix) => {
      const item = weaponItem();
      const key = getVaultCommunityInstanceKey(item);
      return buildVaultRecommendationFilterFactIndex(new Map([
        [key, summarize(prefix, "full")]
      ]));
    };

    // **连键一起比**：筛选事实是按 `summary.sourceId`（也就是事实层的 `source_group_id`）
    // 建索引的，只比 values 会把这条路径上唯一随来源变化的字段漏掉。
    expect([...factIndex("dim").values()].map((facts) => [...facts.entries()]))
      .toEqual([...factIndex("csv").values()].map((facts) => [...facts.entries()]));
  });

  it("同构来源的来源选项逐字段相同，且同一分组键的多条记录收敛成一行", () => {
    const options = (prefix: SourcePrefix) => buildVaultRecommendationSourceOptions([
      buildVaultRecommendationSourceSummaries(
        weaponItem(),
        // 分组键相同的两条记录。这是**消费层的分组机制**（键相同就并成一行）；
        // 生产端现在是「一个具名来源一个键」，跨格式的粒度由 services 侧的对拍用例钉住。
        instanceMatch([
          sourceMatch(prefix, "full", "doc-1", ":block-a"),
          sourceMatch(prefix, "not_matched", "doc-1", ":block-b")
        ])
      )
    ]);

    // 先证明夹具真的走到了「一个分组含多个实例」：两个实例在筛选下拉里是一行，不是两行。
    expect(options("dim")).toHaveLength(1);
    expect(options("dim")[0]?.count).toBe(1);
    // 再比整份选项（含 sourceId）：分组键若带上格式前缀，这里立刻分叉。
    expect(options("dim")).toEqual(options("csv"));
  });

  it("同构来源的卡片摘要逐字段相同（除 source_id）", () => {
    const card = (prefix: SourcePrefix) => {
      const summary = createRecommendationCardSummary(instanceMatch([sourceMatch(prefix, "full")]));
      return summary.sources.map(({ source_id: _sourceId, ...rest }) => rest);
    };

    expect(card("dim")).toEqual(card("csv"));
  });

  it("同构来源的清理保护判定逐字段相同", () => {
    const reasons = (prefix: SourcePrefix) => {
      const item = weaponItem();
      const key = getVaultCommunityInstanceKey(item);
      return buildVaultCleanupProtectionIndex({
        copy: vaultCopy["zh-CN"],
        items: [item],
        tags: { items: {} },
        recommendationCardSummary: new Map([
          [key, createRecommendationCardSummary(instanceMatch([sourceMatch(prefix, "full")]))]
        ]),
        recommendationReady: true
      }).get(key);
    };

    expect(reasons("dim")).toEqual(reasons("csv"));
  });
});
