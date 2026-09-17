// @vitest-environment jsdom

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { VaultRecommendationEvidencePanel } from "../src/vault/VaultRecommendationEvidencePanel.js";
import { suggestedImportSourceName } from "../src/vault/VaultWishlistManager.js";
import type {
  VaultRecommendationDocumentSummary,
  VaultRecommendationManagedRule,
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
    // 空态那句给的是**用户说法**，不是格式名（人工 CSV / DIM Wishlist 都不出现）。
    expect(screen.getByText("使用上方导入入口添加推荐表格或愿望单文本。")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "导入人工推荐表格" }));
    await user.click(screen.getByRole("button", { name: "选择表格文件" }));
    await user.click(screen.getByRole("button", { name: "新建来源" }));

    await waitFor(() => expect(screen.getByText("当前来源 1 个")).toBeTruthy());
    expect(screen.getByText("已启用 1 个")).toBeTruthy();
    expect(within(sourceManagement()).getByText("sayalarry")).toBeTruthy();
    expect(within(sourceManagement()).getByText("70 条规则")).toBeTruthy();
    expect(within(sourceManagement()).getByText("列出 127 把武器")).toBeTruthy();
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
    expect(within(sourceManagement()).getByText("列出 88 把武器")).toBeTruthy();
    // 三行小字说的是三件事：规则数是清单自己写了多少条，「列出」是它点名了哪些武器，
    // 「仓库 / 全账号」才是有几件（Bug #98）。
    // 两个范围同排写出来，左边清单那个数才在行上找得到同一句话。
    expect(within(sourceManagement()).getByText("仓库 5 件 / 全账号 7 件")).toBeTruthy();
    expect(screen.getByText("当前来源 1 个")).toBeTruthy();
    expect(store.managementReads.count).toBe(2);
  });

  it("删除导入只剩来源管理一处，删除后清单当场少一行", async () => {
    const user = userEvent.setup();
    const store = createStore({ documents: ["sayalarry"], sources: ["sayalarry"] });
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    const deleteButton = await screen.findByRole("button", { name: "删除" });
    await user.click(deleteButton);

    // 确认是盖在页面上的一层，不是插进清单里的一块——插进去会把清单顶下去（Bug #96）。
    const dialog = await screen.findByRole("dialog", { name: "删除sayalarry" });
    expect(sourceManagement().contains(dialog)).toBe(false);
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(within(dialog).getByText(/删除后来源数据、规则和本地覆盖状态都会永久清除/)).toBeTruthy();
    // 焦点先在「取消」上；行上那个按钮仍叫「删除」，框里的按钮不与它同名。
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "取消" }));
    expect(within(dialog).getByRole("button", { name: "确认删除" })).toBeTruthy();

    await user.click(within(dialog).getByRole("button", { name: "确认删除" }));

    await waitFor(() => expect(screen.getByText("当前来源 0 个")).toBeTruthy());
    expect(screen.getByText("还没有可管理的推荐来源")).toBeTruthy();
  });

  it("确认层取消得掉，取消后什么都没删、焦点回到刚才那个按钮", async () => {
    const user = userEvent.setup();
    const store = createStore({ documents: ["sayalarry"], sources: ["sayalarry"] });
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    const deleteButton = await screen.findByRole("button", { name: "删除" });
    await user.click(deleteButton);
    await screen.findByRole("dialog", { name: "删除sayalarry" });

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(store.stored.sources).toHaveLength(1);
    expect(screen.getByText("当前来源 1 个")).toBeTruthy();
    expect(document.activeElement).toBe(deleteButton);
  });

  it("导入区不再有整份清空入口，清掉一份导入走来源管理面的「删除」", async () => {
    const user = userEvent.setup();
    const store = createStore({ documents: ["sayalarry"], sources: ["sayalarry"] });
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    // Bug #100：那个按钮说得比做得多（写着「全部」，实际只清愿望单文本这一类导入），已整条删除；
    // 这里按住导入区那一行，别回头又长出一个整份清空入口。
    const importRow = (await screen.findByText("愿望单文本")).closest(".vault-import-action-row")!;
    expect(within(importRow as HTMLElement).getByRole("button", { name: "导入愿望单文本文件" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "移除全部来源" })).toBeNull();
    expect(screen.queryByRole("dialog", { name: "移除全部来源？" })).toBeNull();

    // 清掉一份导入仍有出口：来源管理面的那一行。
    await user.click(await screen.findByRole("button", { name: "删除" }));
    const dialog = await screen.findByRole("dialog", { name: "删除sayalarry" });
    await user.click(within(dialog).getByRole("button", { name: "确认删除" }));

    await waitFor(() => expect(screen.getByText("当前来源 0 个")).toBeTruthy());
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

  it("来源行的格式名来自数据：两种格式各显示自己的名字，名字与格式相反也不改显示", async () => {
    const user = userEvent.setup();
    // 第三份的名字与「愿望单文本」这个格式说法逐字相同，但它是一份推荐表格：
    // 行上显示的是数据里的来源格式，不是从名字猜的。
    const store = createStore({
      documents: ["表格来源", "愿望单来源", "愿望单文本"],
      sources: ["表格来源", "愿望单来源", "愿望单文本"],
      sourceFormats: { 愿望单来源: "愿望单文本", 愿望单文本: "推荐表格" }
    });
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    expect(await screen.findByText("当前来源 3 个")).toBeTruthy();
    expect(sourceRowMeta("表格来源")).toMatch(/^推荐表格 · /);
    expect(sourceRowMeta("愿望单来源")).toMatch(/^愿望单文本 · /);
    expect(sourceRowMeta("愿望单文本")).toMatch(/^推荐表格 · /);

    // 详情弹框标题那一行与列表行同一口径（不是只有列表显示格式）。
    await user.click(within(sourceRow("愿望单来源")).getByRole("button", { name: "查看详情" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/^愿望单文本 · /)).toBeTruthy();
  });

  it("来源行把两个范围并排写出来，并说清「列出」与「仓库 / 全账号」各是什么（Bug #98）", async () => {
    const user = userEvent.setup();
    const store = createStore({ documents: ["sayalarry"], sources: ["sayalarry"] });
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    const row = within(await screen.findByRole("region", { name: "推荐来源管理" })).getByText("sayalarry").closest("article")!;
    expect(row).toBeTruthy();
    // 第一行是这份来源**自己的规模**：写了多少条规则。
    expect(within(row).getByText("70 条规则")).toBeTruthy();
    // 第二行是它点名了多少把武器，与你有几件无关；「列出」就是为这个说法挑的词——
    // 从前写「422 把武器」，读的人会以为自己有 422 把。
    expect(within(row).getByText("列出 127 把武器")).toBeTruthy();
    // 两句必须真的分成两行：拼成一句塞回定宽的数字栏时，规则数上万会把「武器」挤到下一行
    // （实测 198px / 栏 210px）。这一条就是按住那个改法。
    expect(within(row).queryByText("70 条规则 · 列出 127 把武器")).toBeNull();
    // 第三行才是对你的影响，两个范围同排写出来：只写一个数，用户拿它去和仓库里的数字对，
    // 对不上（库里 292、这行 305）就会读成程序算错了。
    expect(within(row).getByText("仓库 19 件 / 全账号 23 件")).toBeTruthy();

    // 各是什么不必猜：悬停那几行数字就能看到说法。
    const numbers = within(row).getByText("70 条规则").parentElement;
    expect(numbers?.contains(within(row).getByText("列出 127 把武器"))).toBe(true);
    expect(numbers?.contains(within(row).getByText("仓库 19 件 / 全账号 23 件"))).toBe(true);
    const tip = numbers?.getAttribute("title") ?? "";
    for (const word of ["列出", "仓库", "全账号"]) {
      expect(tip, `悬停说明里没解释「${word}」`).toContain(word);
    }

    // 详情弹框标题与列表行同一套说法，不是只有列表这一处这么写；
    // 那儿是一行通排的文字、不设宽度，所以仍用拼好的长句。
    await user.click(within(row).getByRole("button", { name: "查看详情" }));
    const dialog = await screen.findByRole("dialog", { name: "sayalarry" });
    expect(within(dialog).getByText(/^推荐表格 · .*70 条规则 · 列出 127 把武器$/)).toBeTruthy();
  });

  it("下方来源管理自己的停用操作仍然当场生效", async () => {
    const user = userEvent.setup();
    const store = createStore({ documents: ["sayalarry"], sources: ["sayalarry"] });
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    await user.click(await screen.findByRole("button", { name: "停用" }));
    await user.click(within(await screen.findByRole("dialog", { name: "停用sayalarry" })).getByRole("button", { name: "确认停用" }));

    await waitFor(() => expect(screen.getByText("已启用 0 个")).toBeTruthy());
    expect(screen.getByText("当前来源 1 个")).toBeTruthy();
    expect(store.stored.sources[0]?.state).toBe("disabled");
  });

  it("来源详情里的移除规则确认盖在详情之上，Escape 与 Tab 都归上层", async () => {
    const user = userEvent.setup();
    const store = createStore({ documents: ["sayalarry"], sources: ["sayalarry"], rules: [createRule("应许")] });
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    await screen.findByText("当前来源 1 个");
    await user.click(within(sourceRow("sayalarry")).getByRole("button", { name: "查看详情" }));
    const detail = await screen.findByRole("dialog", { name: "sayalarry" });
    await user.click(within(detail).getByRole("button", { name: "移除规则" }));

    const confirm = await screen.findByRole("dialog", { name: "移除应许规则" });
    expect(within(confirm).getByText(/只移除当前来源的这一条规则/)).toBeTruthy();
    expect(within(detail).queryByRole("dialog")).toBeNull();

    // Tab 不该被下面的详情弹框抢走。
    await user.tab();
    expect(confirm.contains(document.activeElement)).toBe(true);

    // Escape 只关确认层：详情还在，规则也没被移除。
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "移除应许规则" })).toBeNull());
    expect(screen.getByRole("dialog", { name: "sayalarry" })).toBeTruthy();
    expect(store.stored.rules[0]?.state).toBe("active");
  });
});

function sourceManagement(): HTMLElement {
  return screen.getByRole("region", { name: "推荐来源管理" });
}

/** 某一份来源在管理区里的那一行。 */
function sourceRow(label: string): HTMLElement {
  const row = within(sourceManagement()).getByText(label).closest("article");
  if (!row) throw new Error(`管理区里没有找到来源行：${label}`);
  return row;
}

/** 那一行的小字（「来源格式 · 状态」），取行里第一条小字。 */
function sourceRowMeta(label: string): string {
  return sourceRow(label).querySelector("small")?.textContent ?? "";
}

type StoredState = {
  documents: VaultRecommendationDocumentSummary[];
  sources: VaultRecommendationManagedSource[];
  rules: VaultRecommendationManagedRule[];
};

// 假存储：动作改它、读取读它，两个面板因此看到的是同一份数据。
// 「来源管理读到旧值」只可能来自它没重读，而不是数据没写进去。
// 表格内容固定为「一份来源」：新建与覆盖都写同一份来源，覆盖换掉规则数与武器数。
function createStore(initial: { documents?: string[]; sources?: string[]; sourceFormats?: Record<string, string>; rules?: VaultRecommendationManagedRule[] } = {}) {
  const stored: StoredState = {
    documents: (initial.documents ?? []).map(createDocument),
    sources: (initial.sources ?? []).map((label) => createSource(label, 70, initial.sourceFormats?.[label] ?? "推荐表格")),
    rules: [...(initial.rules ?? [])]
  };
  const managementReads = { count: 0 };
  const actions: VaultWishlistActions = {
    selectDimFile: async () => null,
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
    listRecommendationRules: async () => [...stored.rules],
    setRecommendationSourceState: async (sourceKey, state) => {
      stored.sources = stored.sources.map((source) => (source.source_key === sourceKey ? { ...source, state } : source));
      return snapshotOf(stored);
    },
    setRecommendationRuleState: async (rule) => {
      stored.rules = stored.rules.map((entry) => (entry.rule_stable_id === rule.rule_stable_id ? { ...entry, state: rule.state } : entry));
      return snapshotOf(stored);
    },
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

function createRule(weaponName: string): VaultRecommendationManagedRule {
  return {
    source_key: "sayalarry:9f1c",
    source_label: "sayalarry",
    rule_stable_id: `rule:${weaponName}`,
    weapon_hashes: [2325078119],
    weapon_name: weaponName,
    purposes: ["pve"],
    requirements: [{ slot: "perk2", names: ["元素磨砺"] }],
    note: "",
    state: "active",
    review_required: false,
    source_revision: "revision-1",
    reason: "",
    affected_instance_count: 3
  };
}

function createSource(label: string, ruleCount = 70, formatLabel = "推荐表格"): VaultRecommendationManagedSource {
  return {
    source_key: `${label}:9f1c`,
    label,
    format_label: formatLabel,
    state: "active",
    configured: true,
    rule_count: ruleCount,
    weapon_count: ruleCount === 70 ? 127 : 88,
    revision: "revision-1",
    imported_at: "2026-09-16T15:20:50.854Z",
    affected_instance_count: ruleCount === 70 ? 23 : 7,
    // 两个范围刻意取不同的值：写反了（仓库写全账号、全账号写仓库）就该当红。
    vault_instance_count: ruleCount === 70 ? 19 : 5,
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
