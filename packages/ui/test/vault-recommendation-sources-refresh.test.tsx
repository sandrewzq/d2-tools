// @vitest-environment jsdom

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import { VaultRecommendationEvidencePanel } from "../src/vault/VaultRecommendationEvidencePanel.js";
import { suggestedImportSourceName } from "../src/vault/VaultWishlistManager.js";
import type {
  VaultRecommendationDocumentSummary,
  VaultRecommendationManagedSource,
  VaultRecommendationManagementSnapshot,
  VaultWishlistActions
} from "../src/vault/VaultWishlistManager.js";

// Bug #90：同一页里「导入面板」和「来源管理」各持一份快照。
// 导入写完之后，来源管理必须重读一次，否则页面上出现「上面已经导入、下面还说没有来源」。
describe("推荐来源页导入区与来源管理共用一次存储改动", () => {
  it("导入成功后，来源管理当场重读并列出新来源", async () => {
    const user = userEvent.setup();
    const store = createStore();
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    expect(await screen.findByText("当前来源 0 个")).toBeTruthy();
    expect(screen.getByText("还没有可管理的推荐来源")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "导入人工推荐表格" }));
    await user.click(screen.getByRole("button", { name: "选择表格文件" }));
    await user.click(screen.getByRole("button", { name: "新建来源" }));

    await waitFor(() => expect(screen.getByText("当前来源 1 个")).toBeTruthy());
    expect(screen.getByText("已启用 1 个")).toBeTruthy();
    expect(within(sourceManagement()).getByText("sayalarry")).toBeTruthy();
    expect(within(sourceManagement()).getByText("70 条规则")).toBeTruthy();
    expect(screen.queryByText("还没有可管理的推荐来源")).toBeNull();
    // 挂载时读一次、导入后重读一次；少了第二次，上面那条来源行不会出现。
    expect(store.managementReads.count).toBe(2);
  });

  it("覆盖同名来源后，来源管理当场显示新数据", async () => {
    const user = userEvent.setup();
    const store = createStore({ documents: ["sayalarry"], sources: ["sayalarry"] });
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    expect(within(await screen.findByRole("region", { name: "推荐来源管理" })).getByText("70 条规则")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "导入人工推荐表格" }));
    await user.click(screen.getByRole("button", { name: "选择表格文件" }));
    // 默认名由文件名生成，正好就是库里已有的那一份，直接走覆盖。
    await user.click(screen.getByRole("button", { name: "覆盖同名来源" }));

    // 覆盖写的是同一份来源：规则数与武器数当场换成新值，来源行还在。
    await waitFor(() => expect(within(sourceManagement()).getByText("12 条规则")).toBeTruthy());
    expect(within(sourceManagement()).getByText("88 把武器 · 当前账号影响 7 件")).toBeTruthy();
    expect(screen.getByText("当前来源 1 个")).toBeTruthy();
    expect(store.managementReads.count).toBe(2);
  });

  it("删除导入只剩来源管理一处，删除后清单当场少一行", async () => {
    const user = userEvent.setup();
    const store = createStore({ documents: ["sayalarry"], sources: ["sayalarry"] });
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    await user.click(await screen.findByRole("button", { name: "删除" }));
    expect(screen.getByText(/删除后来源数据、规则和本地覆盖状态都会永久清除/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "确认" }));

    await waitFor(() => expect(screen.getByText("当前来源 0 个")).toBeTruthy());
    expect(screen.getByText("还没有可管理的推荐来源")).toBeTruthy();
  });

  it("「移除全部来源」的确认说明指向保留下来的那个删除入口", async () => {
    const user = userEvent.setup();
    const store = createStore({ documents: ["sayalarry"], sources: ["sayalarry"] });
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} wishlist={createWishlist()} />);

    await user.click(await screen.findByRole("button", { name: "移除全部来源" }));

    expect(screen.getByText(/只想移除其中一份，请用下方「已导入来源」里对应的「删除」/)).toBeTruthy();
  });

  it("没有存储改动时，重新渲染不会多读一次来源", async () => {
    const store = createStore({ documents: ["sayalarry"], sources: ["sayalarry"] });
    const { rerender } = render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    expect(await screen.findByText("当前来源 1 个")).toBeTruthy();
    // 挂载只读一次；紧接着的两次重新渲染不允许再读。
    expect(store.managementReads.count).toBe(1);

    rerender(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);
    rerender(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    expect(store.managementReads.count).toBe(1);
  });

  it("选完文件后默认用文件名填好来源名，用户可以改成别的", async () => {
    const user = userEvent.setup();
    const store = createStore();
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    await user.click(screen.getByRole("button", { name: "导入人工推荐表格" }));
    await user.click(screen.getByRole("button", { name: "选择表格文件" }));

    // 默认名来自文件名去掉扩展名，用户不必先打字。
    const nameField = await screen.findByLabelText("推荐来源名");
    expect(nameField).toHaveValue("sayalarry");
    // 这个名字库里没有：提示说得出为什么只能新建，覆盖按钮不可点。
    expect(screen.getByText("「sayalarry」还没有来源，可以新建。")).toBeTruthy();
    expect(screen.getByRole("button", { name: "覆盖同名来源" })).toBeDisabled();

    // 名字始终由用户拍板：改掉之后提示与可点状态跟着换。
    await user.clear(nameField);
    await user.type(nameField, "我的推荐表");
    expect(screen.getByText("「我的推荐表」还没有来源，可以新建。")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "新建来源" }));

    await waitFor(() => expect(within(sourceManagement()).getByText("我的推荐表")).toBeTruthy());
  });

  it("默认来源名去掉的是扩展名，不是名字里的点", () => {
    expect(suggestedImportSourceName("sayalarry.csv")).toBe("sayalarry");
    expect(suggestedImportSourceName("推荐表 v1.2.xlsx")).toBe("推荐表 v1.2");
    expect(suggestedImportSourceName("没有扩展名")).toBe("没有扩展名");
    // 光一个扩展名时去掉就什么都不剩，退回原名而不是留空。
    expect(suggestedImportSourceName(".csv")).toBe(".csv");
  });

  it("页面里只有一份已导入来源清单，导入区只做导入与导出", async () => {
    const store = createStore({ documents: ["sayalarry"], sources: ["sayalarry"] });
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    expect(await screen.findByText("当前来源 1 个")).toBeTruthy();
    // 清单只归来源管理区：标题与来源名各出现一次，导入区不再复述一遍。
    expect(screen.getAllByText("已导入来源")).toHaveLength(1);
    expect(screen.getAllByText("sayalarry")).toHaveLength(1);
    // 导入与导出入口保留，逐份移除只剩管理区那一处。
    expect(screen.getByRole("button", { name: "导入人工推荐表格" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "导出当前推荐" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "移除" })).toBeNull();
  });

  it("下方来源管理自己的停用操作仍然当场生效", async () => {
    const user = userEvent.setup();
    const store = createStore({ documents: ["sayalarry"], sources: ["sayalarry"] });
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    await user.click(await screen.findByRole("button", { name: "停用" }));
    await user.click(screen.getByRole("button", { name: "确认" }));

    await waitFor(() => expect(screen.getByText("已启用 0 个")).toBeTruthy());
    expect(screen.getByText("当前来源 1 个")).toBeTruthy();
    expect(store.stored.sources[0]?.state).toBe("disabled");
  });
});

function sourceManagement(): HTMLElement {
  return screen.getByRole("region", { name: "推荐来源管理" });
}

type StoredState = {
  documents: VaultRecommendationDocumentSummary[];
  sources: VaultRecommendationManagedSource[];
};

// 假存储：动作改它、读取读它，两个面板因此看到的是同一份数据。
// 「来源管理读到旧值」只可能来自它没重读，而不是数据没写进去。
// 表格内容固定为「一份来源」：新建与覆盖都写同一份来源，覆盖换掉规则数与武器数。
function createStore(initial: { documents?: string[]; sources?: string[] } = {}) {
  const stored: StoredState = {
    documents: (initial.documents ?? []).map(createDocument),
    sources: (initial.sources ?? []).map((label) => createSource(label))
  };
  const managementReads = { count: 0 };
  const actions: VaultWishlistActions = {
    clear: async () => undefined,
    listRecommendationDocuments: async () => [...stored.documents],
    exportKnowledgeCsv: async () => ({ canceled: false, message: "已导出", file_path: "/tmp/recommendations.csv" }),
    selectKnowledgeCsv: async () => ({
      token: "table-token",
      file_name: "sayalarry.csv",
      recommendation_count: 12,
      importable_recommendation_count: 12,
      weapon_count: 88,
      source_count: 1,
      source_labels: ["sayalarry"],
      blocking_issue_count: 0,
      skipped_row_count: 0,
      blocking_issues: []
    }),
    confirmKnowledgeImport: async (_token, target) => {
      const ruleCount = target.mode === "overwrite" ? overwrittenRuleCount : 70;
      stored.documents = [
        ...stored.documents.filter((document) => document.name !== target.name),
        createDocument(target.name, ruleCount)
      ];
      stored.sources = [
        ...stored.sources.filter((source) => source.label !== target.name),
        createSource(target.name, ruleCount)
      ];
      return {
        recommendation_count: ruleCount,
        weapon_count: target.mode === "overwrite" ? 88 : 127,
        source_count: 1,
        skipped_row_count: 0,
        imported_row_count: ruleCount
      };
    },
    getRecommendationManagement: async () => {
      managementReads.count += 1;
      return snapshotOf(stored);
    },
    listRecommendationRules: async () => [],
    setRecommendationSourceState: async (sourceKey, state) => {
      stored.sources = stored.sources.map((source) => (source.source_key === sourceKey ? { ...source, state } : source));
      return snapshotOf(stored);
    },
    setRecommendationRuleState: async () => snapshotOf(stored),
    clearImportedRecommendationRules: async () => snapshotOf(stored)
  };
  return { actions, stored, managementReads };
}

// 覆盖后的规则数故意与新建不同，用例据此判断「当场刷新」而不是「恰好还显示旧值」。
const overwrittenRuleCount = 12;

function createDocument(name: string, ruleCount = 70): VaultRecommendationDocumentSummary {
  return {
    documentId: `document:${name}`,
    name,
    origin: "file",
    importedAt: "2026-09-16T15:20:50.854Z",
    sourceCount: 1,
    ruleCount
  };
}

// 只要有一份愿望单，导入区才会渲染「移除全部来源」（整份清空的入口）。
function createWishlist(): DimWishlist {
  return { title: "本机愿望单", rules: [] };
}

function createSource(label: string, ruleCount = 70): VaultRecommendationManagedSource {
  return {
    source_key: `${label}:9f1c`,
    label,
    state: "active",
    configured: true,
    rule_count: ruleCount,
    weapon_count: ruleCount === 70 ? 127 : 88,
    revision: "revision-1",
    imported_at: "2026-09-16T15:20:50.854Z",
    affected_instance_count: ruleCount === 70 ? 23 : 7,
    // 管理面一行一次导入，事实层一条一个具名来源——两者是同一个来源的两级键。
    fact_keys: [`${label}:9f1c`, `${label}:9f1c:instance`]
  };
}

function snapshotOf(stored: StoredState): VaultRecommendationManagementSnapshot {
  return {
    revision: "revision-1",
    sources: [...stored.sources],
    removed_rules: [],
    clear_rule_imports: { configured: false, source_count: 0, rule_count: 0 }
  };
}
