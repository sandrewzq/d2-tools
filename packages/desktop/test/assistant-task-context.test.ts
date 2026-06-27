import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildAssistantPageContext } from "../src/renderer/shared/domain/assistant/assistantContext";
import { buildAssistantTaskContext } from "../src/renderer/shared/domain/assistant/assistantTaskContext";

describe("assistant task context", () => {
  it("builds a task and guide tree from pasted text, account items and page facts", () => {
    const context = buildAssistantTaskContext({
      text: [
        "虚空猎人配装攻略",
        "1. 装备 金枪头 并堆纪律到 100",
        "- 使用 Funnelweb 清怪",
        "循环：隐身后用手雷触发易伤"
      ].join("\n"),
      accountItems: [
        { hash: 1, name: "金枪头", group_key: "armor", item_type: "头盔" },
        { hash: 2, name: "Funnelweb", group_key: "weapons", item_type: "微型冲锋枪" }
      ],
      pageContextFacts: ["当前角色：猎人，光等 2010。"]
    });

    expect(context.title).toBe("虚空猎人配装攻略");
    expect(context.steps.map((step) => step.text)).toEqual([
      "装备 金枪头 并堆纪律到 100",
      "使用 Funnelweb 清怪",
      "循环：隐身后用手雷触发易伤"
    ]);
    expect(context.linkedItems.map((item) => item.name)).toEqual(["金枪头", "Funnelweb"]);
    expect(context.aiQuestions).toContain("根据当前账号数据，哪些攻略要求已经满足？");
    expect(context.loadoutDraftItems).toContain("已关联装备：金枪头 / 头盔");
    expect(context.loadoutDraftItems).toContain("已关联装备：Funnelweb / 微型冲锋枪");
    expect(context.loadoutDraftItems).toContain("待确认要求：堆纪律到 100");
    expect(context.treeGroups.map((group) => group.title)).toEqual(["任务文本", "攻略步骤", "关联装备", "可保存方案草稿", "AI 问答"]);
    expect(context.treeGroups.at(3)?.items.join(" / ")).toContain("可保存方案草稿");
    expect(context.treeGroups.at(-1)?.items.join(" / ")).toContain("当前角色：猎人");
  });

  it("adds vault filters, loadout gaps and library searches to assistant page context", () => {
    const context = buildAssistantPageContext({
      activePage: "vault",
      account: null,
      vaultFacts: ["仓库筛选：武器 / DIM 愿望单 / 已锁定"],
      loadoutFacts: ["配装缺失：2 件，1 件可自动转移"],
      libraryFacts: ["资料库搜索：装备 / Riskrunner"]
    });

    expect(context.facts).toContain("仓库筛选：武器 / DIM 愿望单 / 已锁定");
    expect(context.facts).toContain("配装缺失：2 件，1 件可自动转移");
    expect(context.facts).toContain("资料库搜索：装备 / Riskrunner");
  });

  it("renders editable task assistant controls in the global sidebar", () => {
    const sidebar = readFileSync("packages/desktop/src/renderer/components/GlobalAssistantSidebar.tsx", "utf8");

    expect(sidebar).toContain("taskContextDraft");
    expect(sidebar).toContain("粘贴任务文本或攻略");
    expect(sidebar).toContain("攻略步骤");
    expect(sidebar).toContain("关联装备");
    expect(sidebar).toContain("可保存方案草稿");
    expect(sidebar).toContain("AI 问答");
  });
});
