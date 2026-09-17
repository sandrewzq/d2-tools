// @vitest-environment jsdom

import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { RecommendationCardSummary } from "@d2-tools/core/community-perks";
import { VaultPageContentView } from "../src/vault/VaultPageContentView.js";
import type {
  VaultRecommendationManagedSource,
  VaultWishlistActions
} from "../src/vault/VaultWishlistManager.js";

/**
 * Bug #99：来源筛选行的分段按钮与它右边那个「完整」下拉。
 *
 * 这一行此前一条界面测试都没有（只有架构守卫钉住它的样式表），所以两处毛病一起留了下来：
 * 点已经生效的那一段会清掉本行的「完整」；悬停与读屏在「部分命中」这一档把「命中」写了两遍。
 *
 * 夹具按「一次导入 = 一行」的形状搭：管理名册给文档键，事实层登记的是实例键，
 * 归队那一步必须真的走到（否则 Bug #92 的教训会在这里原地复发）。
 */

const AEGIS_KEY = "document:doc-aegis";
const YXC_KEY = "document:doc-yxc";
const AEGIS_FACT_KEY = `${AEGIS_KEY}:inst`;
const YXC_FACT_KEY = `${YXC_KEY}:inst`;
const AEGIS_LABEL = "Aegis清单";
const YXC_LABEL = "YXC清单";

function weapon(instanceId: string, hash: number, name: string): AccountItemSummary {
  return { hash, instance_id: instanceId, name, group_key: "weapons", socket_plugs: [] };
}

type SourceFixture = {
  factKey: string;
  label: string;
  perkMatched: number;
  perkRequired: number;
  matched: number;
  required: number;
};

function cardSummary(item: AccountItemSummary, sources: SourceFixture[]): RecommendationCardSummary {
  return {
    hash: item.hash,
    instance_id: item.instance_id ?? "",
    canonical_weapon_name: item.name,
    coverage: "covered",
    match_status: "partial_match",
    recommendation_state: "compare",
    matched: sources.length,
    partial: 0,
    available: sources.length,
    modes: ["pve"],
    sources: sources.map((source) => ({
      source_id: source.factKey,
      source_group_id: source.factKey,
      source_label: source.label,
      state: "full" as const,
      purposes: ["pve" as const],
      matched_requirement_count: source.matched,
      requirement_count: source.required,
      uncheckable_requirement_count: 0,
      matched_perk_count: source.perkMatched,
      perk_requirement_count: source.perkRequired,
      uncheckable_perk_count: 0
    }))
  };
}

function aegis(perkMatched: number, matched: number): SourceFixture {
  return { factKey: AEGIS_FACT_KEY, label: AEGIS_LABEL, perkMatched, perkRequired: 2, matched, required: 6 };
}

function yxc(perkMatched: number, matched: number): SourceFixture {
  return { factKey: YXC_FACT_KEY, label: YXC_LABEL, perkMatched, perkRequired: 2, matched, required: 2 };
}

// 四把武器，Aegis 全覆盖、YXC 只覆盖前两把：于是 A 行有「全部 4 / 2/2 2 / 1/2 1 / 0/2 1」，
// 完整档是 6/6、5/6、3/6、0/6 各一件；选 2/2 + 完整 6/6 之后只剩「送魂者」。
function fixtures() {
  const sentSoul = weapon("i1", 1001, "送魂者");
  const ace = weapon("i2", 1002, "黑桃A");
  const wolf = weapon("i3", 1003, "狼王");
  const gjallarhorn = weapon("i4", 1004, "加拉尔号角");
  const items = [sentSoul, ace, wolf, gjallarhorn];
  const cardSummaries = new Map<string, RecommendationCardSummary>([
    ["i1", cardSummary(sentSoul, [aegis(2, 6), yxc(2, 2)])],
    ["i2", cardSummary(ace, [aegis(2, 5), yxc(2, 2)])],
    ["i3", cardSummary(wolf, [aegis(1, 3)])],
    ["i4", cardSummary(gjallarhorn, [aegis(0, 0)])]
  ]);
  const managedSources: VaultRecommendationManagedSource[] = [
    {
      source_key: AEGIS_KEY,
      label: AEGIS_LABEL,
      format_label: "推荐表格",
      state: "active",
      configured: true,
      rule_count: 70,
      weapon_count: 4,
      revision: "rev-a",
      imported_at: "2026-09-17T00:00:00.000Z",
      vault_instance_count: 4,
      affected_instance_count: 4,
      fact_keys: [AEGIS_FACT_KEY, AEGIS_KEY]
    },
    {
      source_key: YXC_KEY,
      label: YXC_LABEL,
      format_label: "推荐表格",
      state: "active",
      configured: true,
      rule_count: 12,
      weapon_count: 2,
      revision: "rev-b",
      imported_at: "2026-09-17T00:00:00.000Z",
      vault_instance_count: 2,
      affected_instance_count: 2,
      fact_keys: [YXC_FACT_KEY, YXC_KEY]
    }
  ];
  const actions: VaultWishlistActions = {
    getRecommendationManagement: async () => ({
      revision: "management-rev",
      sources: managedSources,
      removed_rules: [],
      clear_rule_imports: { configured: true, source_count: 2, rule_count: 82 }
    })
  };
  return { items, cardSummaries, actions };
}

async function mountBrowse() {
  const { items, cardSummaries, actions } = fixtures();
  render(
    <VaultPageContentView
      items={items}
      tags={{ items: {} }}
      armorSetCatalog={[]}
      armorSetCatalogStatus="ready"
      recommendationCardSummary={cardSummaries}
      recommendationSourceState={{
        recommendationScan: {
          phase: "complete",
          total_weapon_count: items.length,
          scanned_weapon_count: items.length,
          covered_weapon_count: items.length,
          retained_result_count: items.length
        }
      }}
      wishlistActions={actions}
      onOpenItem={() => undefined}
      onSaveTag={() => undefined}
      onSaveTagBatch={() => undefined}
    />
  );
  const toggle = await screen.findByRole("button", { name: /Aegis清单，覆盖 4 件/ });
  const user = userEvent.setup();
  await user.click(toggle);
  const group = await screen.findByRole("group", { name: `${AEGIS_LABEL}perk 命中筛选` });
  const chip = (key: string) => {
    const label = within(group).getByText(key);
    const button = label.closest("button");
    if (!button) throw new Error(`没有找到 ${key} 这一段`);
    return button;
  };
  const completeSelect = () => screen.getByLabelText(`${AEGIS_LABEL}完整命中筛选`) as HTMLSelectElement;
  return { user, chip, completeSelect, group };
}

describe("Bug #99：来源行的分段按钮与完整下拉", () => {
  // jsdom 没有 Element.scrollTo，而这个页面挂载后会用 requestAnimationFrame 复原滚动位置：
  // 不补这一句，每条用例都会在帧回调里抛一个未捕获异常，把闸门染红。
  const originalScrollTo = Element.prototype.scrollTo;
  beforeAll(() => {
    Element.prototype.scrollTo = () => undefined;
  });
  afterAll(() => {
    Element.prototype.scrollTo = originalScrollTo;
  });

  it("点已经生效的那一段，本行的「完整」与结果都不动", async () => {
    const { user, chip, completeSelect } = await mountBrowse();

    await user.click(chip("2/2"));
    expect(completeSelect().value).toBe("all");

    await user.selectOptions(completeSelect(), "6/6");
    expect(screen.getByText("1 件")).toBeTruthy();

    // 点自己已经亮着的那一格：开关点第二次不该改动同行另一个条件。
    await user.click(chip("2/2"));
    expect(completeSelect().value).toBe("6/6");
    expect(screen.getByText("1 件")).toBeTruthy();
    expect(screen.queryByText("2 件")).toBeNull();
  });

  it("换一档 perk 命中，才把「完整」退回不限", async () => {
    const { user, chip, completeSelect } = await mountBrowse();

    await user.click(chip("2/2"));
    await user.selectOptions(completeSelect(), "6/6");
    expect(screen.getByText("1 件")).toBeTruthy();

    await user.click(chip("1/2"));
    expect(completeSelect().value).toBe("all");
    // 1/2 这一档只有「狼王」一件，它的完整档是 3/6。
    expect(within(completeSelect()).getByText("完整 3/6 · 1")).toBeTruthy();
  });

  it("悬停与读屏的那句话说明要求几项、命中几项，不重「命中」", async () => {
    const { chip } = await mountBrowse();

    const partial = chip("1/2");
    // 可见文字仍是裸键 + 数量徽标：分段组左边已经挂着「perk 命中」，组内不再重复。
    expect(partial.textContent).toBe("1/21");
    // 悬停与读屏说的是这一档的两个数：要求 2 项、命中 1 项（分子分母各有出处）。
    expect(partial.getAttribute("title")).toBe("要求 2 项，命中 1 项，1 件");
    expect(partial.getAttribute("aria-label")).toBe(`${AEGIS_LABEL}要求 2 项，命中 1 项，1 件`);
    expect(partial.getAttribute("title")).not.toContain("命中 命中");
    expect(partial.getAttribute("aria-label")).not.toContain("命中 命中");
  });
});
