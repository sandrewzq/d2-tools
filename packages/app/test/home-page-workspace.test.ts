import { describe, expect, it } from "vitest";
import {
  createHomePageDerivedState,
  resolvePageMeta,
  buildLoadoutContextFacts,
  buildLibraryContextFacts,
  selectHomePageModel
} from "../src/workspaces/homePage";

describe("home page derived workspace", () => {
  it("builds page meta and assistant context facts in app layer", () => {
    const derived = createHomePageDerivedState({
      activePage: "vault",
      account: {
        account_name: "tester",
        destiny_membership_id: "123",
        membership_type: 1,
        characters: [
          {
            character_id: "char-1",
            class_name: "猎人",
            light: 2010,
            equipped_items: [],
            equipment_groups: [],
            inventory_items: [],
            inventory_groups: [],
            postmaster_items: [],
            loadout_slots: []
          }
        ],
        vault: { item_count: 12, items: [], sample_items: [] },
        materials: { item_count: 5, items: [] }
      },
      selectedCharacterId: "char-1",
      activeLoadoutName: "夜陨配装",
      activeLoadoutTemplate: {
        id: "template-1",
        name: "夜陨配装",
        character_id: "char-1",
        class_name: "猎人",
        created_at: "2026-06-26T00:00:00.000Z",
        updated_at: "2026-06-26T00:00:00.000Z",
        items: [{ hash: 123, name: "Test Gun" }]
      },
      vaultFacts: ["仓库命中：3 件"],
      libraryRecentNames: ["永恒之夜"],
      libraryViewMode: "equipment",
      equipmentQuery: "hand cannon",
      perkQuery: "",
      equipmentResultCount: 4,
      perkResultCount: 0,
      equipmentSearchTouched: true,
      perkSearchTouched: false,
      diagnosticRows: [{ label: "资料库版本", value: "v1", tone: "ok" }],
      isAiConfigured: true,
    });

    expect(derived.pageMeta.title).toBe("仓库");
    expect(derived.assistantPageContext.page_key).toBe("vault");
    expect(derived.assistantPageContext.facts).toContain("账号已读取：1 个角色，仓库 12 件装备，材料 5 种。");
    expect(derived.assistantPageContext.facts).toContain("当前角色：猎人，光等 2010。");
    expect(derived.assistantPageContext.facts).toContain("当前配装方案：夜陨配装");
    expect(derived.assistantPageContext.facts).toContain("仓库命中：3 件");
    expect(derived.assistantPageContext.facts.some((fact) => fact.includes("配装缺失：1 件"))).toBe(true);
    expect(derived.assistantPageContext.facts.some((fact) => fact.includes("资料库搜索：装备 / hand cannon，命中 4 条。"))).toBe(true);
    expect(derived.isAiConfigured).toBe(true);
    expect(derived.diagnosticRows).toHaveLength(1);
  });

  it("builds loadout and library fact helpers in app layer", () => {
    const loadoutFacts = buildLoadoutContextFacts({
      template: {
        id: "template-1",
        name: "测试配装",
        created_at: "2026-06-26T00:00:00.000Z",
        updated_at: "2026-06-26T00:00:00.000Z",
        items: [{ hash: 123, name: "Test Gun" }]
      },
      account: {
        account_name: "tester",
        destiny_membership_id: "123",
        membership_type: 1,
        characters: [],
        vault: { item_count: 1, items: [{ hash: 123, name: "Test Gun", item_type: "Gun", tier: "Legendary", group_key: "weapons", bucket_name: "能量武器" }], sample_items: [] },
        materials: { item_count: 0, items: [] }
      }
    });
    const libraryFacts = buildLibraryContextFacts({
      viewMode: "equipment",
      equipmentQuery: "hand cannon",
      perkQuery: "",
      equipmentResultCount: 4,
      perkResultCount: 0,
      equipmentSearchTouched: true,
      perkSearchTouched: false
    });

    expect(loadoutFacts[0]).toContain("已找到 1 / 1 件");
    expect(libraryFacts[0]).toContain("资料库搜索：装备 / hand cannon，命中 4 条。");
    expect(resolvePageMeta("settings").title).toBe("设置");
  });

  it("exposes a home page model selector with stable defaults", () => {
    const model = selectHomePageModel({
      state: {
        nextStep: "home",
        colorMode: "light",
        languagePreferences: {
          interfaceLocale: "zh-CN",
          bungieLocale: "zh-chs",
          followInterfaceLocaleForBungie: true
        },
        cards: {
          bungieConfig: { status: "ready", label: "Bungie 配置已完成" },
          account: { status: "missing", label: "需要登录 Bungie" },
          manifest: { status: "ready", label: "资料库已初始化" },
          ai: { status: "skipped", label: "AI 未配置" }
        }
      },
      accountError: "账号未读取",
      dailyMessage: "日报已刷新"
    });

    expect(model.state.cards.account.label).toBe("需要登录 Bungie");
    expect(model.accountError).toBe("账号未读取");
    expect(model.dailyMessage).toBe("日报已刷新");
    expect(model.diagnosticRows).toEqual([]);
    expect(model.dailySummary).toBeNull();
    expect(model.hasAccountData).toBe(false);
    expect(model.isLoggingIn).toBe(false);
    expect(model.isLoadingDaily).toBe(false);
  });
});
