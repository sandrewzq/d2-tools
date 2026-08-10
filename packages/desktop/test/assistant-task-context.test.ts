import { describe, expect, it } from "vitest";
import { buildAssistantPageContext } from "../src/renderer/shared/domain/assistant/assistantContext";

describe("assistant page context", () => {
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
});
