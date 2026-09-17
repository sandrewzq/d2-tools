// @vitest-environment jsdom

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import { VaultRecommendationEvidencePanel } from "../src/vault/VaultRecommendationEvidencePanel.js";
import type {
  VaultDimWishlistImportPreview,
  VaultRecommendationManagedSource,
  VaultRecommendationManagementSnapshot,
  VaultWishlistActions,
  VaultWishlistLinkReadResult
} from "../src/vault/VaultWishlistManager.js";

/**
 * T63：DIM 文本这一组只有两条路——本地文件与用户给的链接。
 *
 * 这里钉的是链接这一条：从弹框读进来之后，预览、命名、新建 / 覆盖与本地文件完全一样；
 * 而「来源行上的同步」按内容判断——没变就只说一句「已是最新」，变了才让人确认覆盖。
 * 最要紧的一条是**读取与确认是两回事**：读到预览不等于写库，写库必须由用户点确认。
 *
 * T66：链接这条路的预览与起名从页面上搬回了弹框里——读完不关框，起名与确认都在框内完成，
 * 与表格导入弹框、来源行的「同步」同一套。
 *
 * T68：本地文件那条路也一样了——入口先开框，框里再「选择文件」；至此四条导入路的确认卡
 * 全在弹框里，页面上不再出现预览卡（`pagePreviewCard()` 现在恒为 null，钉的就是这件事）。
 */

const linkUrl = "https://example.invalid/DIMLGpigWeaponWishlist%20by%20moc.txt";
const finalUrl = "https://raw.githubusercontent.com/example/wishlist/main/DIMLGpigWeaponWishlist by moc.txt";

/** 页内导入区里那张预览卡。T68 之后四条路都不该有——它只该出现在弹框里。 */
function pagePreviewCard(): Element | null {
  return document.querySelector(".vault-import-action-list .vault-wishlist-preview");
}

describe("从链接同步愿望单", () => {
  it("弹框里读完链接，预览与起名就在框里确认，确认后才落库", async () => {
    const user = userEvent.setup();
    const store = createStore();
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    await user.click(await screen.findByRole("button", { name: "从链接同步" }));
    const dialog = screen.getByRole("dialog", { name: "从链接同步愿望单" });
    // 空链接时读取按钮不可点：先有链接才谈得上读取。
    expect(within(dialog).getByRole("button", { name: "读取链接" })).toBeDisabled();

    await user.type(within(dialog).getByLabelText("愿望单文本链接"), linkUrl);
    await user.click(within(dialog).getByRole("button", { name: "读取链接" }));

    // 读完**不收弹框**：预览、起名与新建 / 覆盖都在框里，页面上不再另放一张。
    expect(store.readLinks).toEqual([linkUrl]);
    expect(screen.getByRole("dialog", { name: "从链接同步愿望单" })).toBeTruthy();
    expect(within(dialog).getByText("DIMLGpigWeaponWishlist by moc.txt")).toBeTruthy();
    expect(within(dialog).getByText(`来自链接：${finalUrl}`)).toBeTruthy();
    // 提示里给的是校验后的可导入条数之外的整份口径：48 条规则、42 条真正会写进去。
    expect(within(dialog).getByText("已从链接读取 48 条愿望单规则；确认名字后选择新建或覆盖。")).toBeTruthy();
    expect(within(dialog).getByText("42 条可导入")).toBeTruthy();
    expect(pagePreviewCard()).toBeNull();

    // 默认名 = 链接末段文件名去扩展名，用户还可以改。
    const nameField = within(dialog).getByLabelText("推荐来源名");
    expect(nameField).toHaveValue("DIMLGpigWeaponWishlist by moc");
    expect(within(dialog).getByText("「DIMLGpigWeaponWishlist by moc」还没有来源，可以新建。")).toBeTruthy();

    // 读到预览还没写库：确认之前存储是空的。
    expect(store.imports).toEqual([]);

    await user.click(within(dialog).getByRole("button", { name: "新建来源" }));
    await waitFor(() => expect(store.imports).toHaveLength(1));
    expect(store.imports[0]).toEqual({
      token: "link-token",
      target: { name: "DIMLGpigWeaponWishlist by moc", mode: "create" }
    });
    // 确认完弹框才收掉。
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "从链接同步愿望单" })).toBeNull());
    expect(pagePreviewCard()).toBeNull();
    expect(await screen.findByText(/来源「DIMLGpigWeaponWishlist by moc」已新建 · 42 条规则。/)).toBeTruthy();
  });

  it("读完链接把弹框关掉：这次导入就此放下，页面上不冒出卡片，也不写库", async () => {
    const user = userEvent.setup();
    const store = createStore();
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    await user.click(await screen.findByRole("button", { name: "从链接同步" }));
    const dialog = screen.getByRole("dialog", { name: "从链接同步愿望单" });
    await user.type(within(dialog).getByLabelText("愿望单文本链接"), linkUrl);
    await user.click(within(dialog).getByRole("button", { name: "读取链接" }));
    expect(within(dialog).getByLabelText("推荐来源名")).toHaveValue("DIMLGpigWeaponWishlist by moc");

    await user.click(within(dialog).getByRole("button", { name: "关闭" }));

    expect(screen.queryByRole("dialog", { name: "从链接同步愿望单" })).toBeNull();
    // 关掉＝放弃：卡片不落到页面上（那正是改之前的样子），也不会有任何写入。
    expect(pagePreviewCard()).toBeNull();
    expect(screen.queryByLabelText("推荐来源名")).toBeNull();
    expect(store.imports).toEqual([]);

    // 再打开是干净的一次：上次读到的内容不带着一起回来。
    await user.click(screen.getByRole("button", { name: "从链接同步" }));
    const reopened = screen.getByRole("dialog", { name: "从链接同步愿望单" });
    expect(within(reopened).queryByLabelText("推荐来源名")).toBeNull();
    expect(within(reopened).getByLabelText("愿望单文本链接")).toHaveValue(linkUrl);
  });

  it("本地文件与链接两条路各开各的框：一条路的预览不会跟进另一条", async () => {
    const user = userEvent.setup();
    const store = createStore();
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    // 本地文件这条路：入口先开框，框里再选文件。
    await user.click(await screen.findByRole("button", { name: "导入愿望单文本文件" }));
    const fileDialog = screen.getByRole("dialog", { name: "导入愿望单文本" });
    await user.click(within(fileDialog).getByRole("button", { name: "选择文件" }));
    expect(await within(fileDialog).findByText("42 条可导入")).toBeTruthy();
    expect(pagePreviewCard()).toBeNull();

    await user.click(within(fileDialog).getByRole("button", { name: "关闭" }));
    await user.click(screen.getByRole("button", { name: "从链接同步" }));
    const dialog = screen.getByRole("dialog", { name: "从链接同步愿望单" });

    // 框里只有链接输入：上一条路的预览不会被带进来——否则框里那份到底是谁的，就说不清了。
    expect(within(dialog).queryByLabelText("推荐来源名")).toBeNull();
    expect(within(dialog).queryByText("42 条可导入")).toBeNull();
    expect(pagePreviewCard()).toBeNull();
  });

  it("链接内容没变：直接说「已是最新」，不问覆盖也不写库", async () => {
    const user = userEvent.setup();
    const store = createStore({ documents: ["moc 的愿望单"], sources: [{ label: "moc 的愿望单", sourceUrl: linkUrl }] });
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    await user.click(await screen.findByRole("button", { name: "从链接同步" }));
    const dialog = screen.getByRole("dialog", { name: "从链接同步愿望单" });
    await user.type(within(dialog).getByLabelText("愿望单文本链接"), linkUrl);
    store.readAsUnchanged = true;
    await user.click(within(dialog).getByRole("button", { name: "读取链接" }));

    expect(await screen.findByText("「moc 的愿望单」已是最新，没有需要写入的内容。")).toBeTruthy();
    // 没有预览卡，也没有「新建 / 覆盖」这种只有在内容真的变了时才该问的选择。
    expect(screen.queryByLabelText("推荐来源名")).toBeNull();
    expect(screen.queryByRole("button", { name: "覆盖同名来源" })).toBeNull();
    // 内容没变没有可确认的东西：这时把框收掉。
    expect(screen.queryByRole("dialog", { name: "从链接同步愿望单" })).toBeNull();
    expect(store.imports).toEqual([]);
  });

  it("读取失败时弹框不关，失败原因就在框里，现有来源不动", async () => {
    const user = userEvent.setup();
    const store = createStore();
    store.readError = new Error("愿望单链接指向的是一个网页而不是文本文件，当前推荐数据没有改动。");
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    await user.click(await screen.findByRole("button", { name: "从链接同步" }));
    const dialog = screen.getByRole("dialog", { name: "从链接同步愿望单" });
    await user.type(within(dialog).getByLabelText("愿望单文本链接"), linkUrl);
    await user.click(within(dialog).getByRole("button", { name: "读取链接" }));

    expect(await screen.findByText("愿望单链接指向的是一个网页而不是文本文件，当前推荐数据没有改动。")).toBeTruthy();
    // 这句话必须在框里：遮罩占满屏幕又压着页面，写在页面底部的提示用户根本看不到。
    expect(within(dialog).getByText("愿望单链接指向的是一个网页而不是文本文件，当前推荐数据没有改动。")).toBeTruthy();
    // 链接还在框里，用户可以直接改一个再试。
    expect(screen.getByRole("dialog", { name: "从链接同步愿望单" })).toBeTruthy();
    expect(within(dialog).getByLabelText("愿望单文本链接")).toHaveValue(linkUrl);
    expect(store.imports).toEqual([]);
  });

  it("只有带链接的来源行才有「同步」，本地文件来的那一行没有", async () => {
    const store = createStore({
      documents: ["moc 的愿望单", "本地文件"],
      sources: [
        { label: "moc 的愿望单", sourceUrl: linkUrl },
        { label: "本地文件" }
      ]
    });
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    const management = await screen.findByRole("region", { name: "推荐来源管理" });
    const linkedRow = within(management).getByText("moc 的愿望单").closest("article")!;
    const localRow = within(management).getByText("本地文件").closest("article")!;

    expect(within(linkedRow).getByRole("button", { name: "同步" })).toBeTruthy();
    expect(within(localRow).queryByRole("button", { name: "同步" })).toBeNull();
  });

  it("来源行同步：内容没变时说一句已是最新，不弹确认", async () => {
    const user = userEvent.setup();
    const store = createStore({ documents: ["moc 的愿望单"], sources: [{ label: "moc 的愿望单", sourceUrl: linkUrl }] });
    store.readAsUnchanged = true;
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    const row = (await screen.findByText("moc 的愿望单")).closest("article")!;
    await user.click(within(row).getByRole("button", { name: "同步" }));

    expect(await screen.findByText("moc 的愿望单已是最新，没有需要写入的内容。")).toBeTruthy();
    // 重新拉的是这一行记下的链接，不是让用户再填一次。
    expect(store.readLinks).toEqual([linkUrl]);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(store.imports).toEqual([]);
  });

  it("来源行同步：内容变了才弹预览，名字锁在这份来源上，确认后整份替换", async () => {
    const user = userEvent.setup();
    const store = createStore({
      documents: ["moc 的愿望单"],
      sources: [{ label: "moc 的愿望单", sourceUrl: linkUrl, ruleCount: 70 }]
    });
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    const management = await screen.findByRole("region", { name: "推荐来源管理" });
    expect(within(management).getByText("70 条规则")).toBeTruthy();
    expect(within(management).getByText("列出 28 把武器")).toBeTruthy();
    const row = within(management).getByText("moc 的愿望单").closest("article")!;
    await user.click(within(row).getByRole("button", { name: "同步" }));

    const dialog = await screen.findByRole("dialog", { name: "同步 moc 的愿望单" });
    expect(within(dialog).getByText("链接里的内容与当前这份来源不同。确认后整份替换（全删全增），来源名与链接不变。")).toBeTruthy();
    // 同步不改名字：名字就是这份来源名，于是「新建」撞名不可点、只剩「覆盖」。
    expect(within(dialog).getByLabelText("推荐来源名")).toHaveValue("moc 的愿望单");
    expect(within(dialog).getByRole("button", { name: "新建来源" })).toBeDisabled();
    const overwrite = within(dialog).getByRole("button", { name: "覆盖同名来源" });
    expect(overwrite).toBeEnabled();

    await user.click(overwrite);
    await waitFor(() => expect(store.imports).toHaveLength(1));
    expect(store.imports[0]).toEqual({
      token: "link-token",
      target: { name: "moc 的愿望单", mode: "overwrite" }
    });
    expect(await screen.findByText("moc 的愿望单已同步 · 42 条规则。")).toBeTruthy();
    // 写完要重读来源管理：行上的规则数当场换成新值，而不是停在同步前的 70。
    await waitFor(() => expect(within(management).getByText("42 条规则")).toBeTruthy());
    expect(within(management).getByText("列出 28 把武器")).toBeTruthy();
    expect(within(management).queryByText("70 条规则")).toBeNull();
  });

  // T64：作者把「每栏任选其一」摊开写成多行时，多出来的行不是笔误——
  // 它们的内容已被同一把枪的其他行覆盖，读取期照样归约成同一组候选。
  // 从前这些行被逐行报成「落在同一栏」，一份正常文件看着像坏了一大半。
  it("文件把「每栏任选其一」摊开写：只说展开写法的冗余，不出红框", async () => {
    const user = userEvent.setup();
    // 实测那份文件的数字：7291 行是摊开写的冗余，涉及 257 把武器，一行笔误都没有。
    const store = createStore({ preview: { merged_row_count: 7291, merged_weapon_count: 257 } });
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    await user.click(await screen.findByRole("button", { name: "从链接同步" }));
    const dialog = screen.getByRole("dialog", { name: "从链接同步愿望单" });
    await user.type(within(dialog).getByLabelText("愿望单文本链接"), linkUrl);
    await user.click(within(dialog).getByRole("button", { name: "读取链接" }));

    expect(await screen.findByText("7291 行是展开写法的冗余")).toBeTruthy();
    expect(screen.getByText(/257 把武器写的是一组「每栏任选其一」/)).toBeTruthy();
    // 行内提示也要分开说：冗余不叫「有问题」。
    const notice = screen.getByText(/已从链接读取 42 条可导入的愿望单规则；7291 行是展开写法的冗余/);
    expect(notice).toBeTruthy();
    // 而且用普通语气：冗余不是问题，别上警示色。
    expect(notice.getAttribute("data-status")).toBe("success");
    // 没有笔误就不该有红框——这正是这份文件从前看着「坏了一大半」的地方。
    expect(document.querySelector(".vault-knowledge-import-issues")).toBeNull();
  });

  it("展开冗余与真笔误同时出现：红框只报笔误那几行", async () => {
    const user = userEvent.setup();
    const store = createStore({
      preview: {
        merged_row_count: 7291,
        merged_weapon_count: 257,
        skipped_row_count: 2,
        affected_weapon_count: 1,
        issue_count: 1,
        issues: [{
          category: "unknown_perk",
          line_number: 26,
          weapon_name: "光鳃之调",
          perk_name: "针灸",
          message: "「针灸」在这把枪的候选里找不到，可能是 Hash 或名字写错。"
        }]
      }
    });
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    await user.click(await screen.findByRole("button", { name: "从链接同步" }));
    const dialog = screen.getByRole("dialog", { name: "从链接同步愿望单" });
    await user.type(within(dialog).getByLabelText("愿望单文本链接"), linkUrl);
    await user.click(within(dialog).getByRole("button", { name: "读取链接" }));

    // 红框里的数字只算笔误：展开冗余不混进「行将忽略」。
    expect(await screen.findByText("2 行有问题将忽略，涉及 1 把武器")).toBeTruthy();
    expect(screen.getByText(/第 26 行 · 光鳃之调 · 针灸/)).toBeTruthy();
    // 有笔误时行内提示改用中性语气（走的是「有问题」那一支），但仍不会把 7291 行算成问题。
    expect(screen.getByText(/2 行有问题将单独忽略；7291 行是展开写法的冗余/).getAttribute("data-status")).toBe("neutral");
    // 两块都要在：一块说问题，一块说摊开写的冗余，别互相吞掉。
    expect(document.querySelector(".vault-knowledge-import-issues")).not.toBeNull();
    expect(screen.getByText("7291 行是展开写法的冗余")).toBeTruthy();
  });

  it("导入文本文件：先开框、框里选文件，走的是同一张预览卡；展开冗余一样分开说、一样不上警示色", async () => {
    const user = userEvent.setup();
    // 只有摊开写的冗余、一行笔误都没有：这份文件按本地文件导入也该是「成功」语气。
    const store = createStore({ preview: { merged_row_count: 5, merged_weapon_count: 1 } });
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    await user.click(await screen.findByRole("button", { name: "导入愿望单文本文件" }));

    // 入口只负责开框：这一步还没读任何文件，框里也没有预览。
    const dialog = screen.getByRole("dialog", { name: "导入愿望单文本" });
    expect(within(dialog).queryByText("5 行是展开写法的冗余")).toBeNull();
    expect(within(dialog).queryByLabelText("推荐来源名")).toBeNull();

    await user.click(within(dialog).getByRole("button", { name: "选择文件" }));

    expect(await within(dialog).findByText("5 行是展开写法的冗余")).toBeTruthy();
    const notice = within(dialog).getByText(/已识别 42 条可导入的愿望单规则；5 行是展开写法的冗余/);
    expect(notice.getAttribute("data-status")).toBe("success");
    expect(document.querySelector(".vault-knowledge-import-issues")).toBeNull();
    // 本地文件这条路也把卡片收在框里（T68）：页面上不再冒出预览卡。
    expect(pagePreviewCard()).toBeNull();
  });

  it("选完文件把框关掉：这次导入放下，不写库；再打开是干净的一次", async () => {
    const user = userEvent.setup();
    const store = createStore();
    render(<VaultRecommendationEvidencePanel wishlistActions={store.actions} />);

    await user.click(await screen.findByRole("button", { name: "导入愿望单文本文件" }));
    const dialog = screen.getByRole("dialog", { name: "导入愿望单文本" });
    await user.click(within(dialog).getByRole("button", { name: "选择文件" }));
    expect(await within(dialog).findByLabelText("推荐来源名")).toHaveValue("DIMLGpigWeaponWishlist by moc");

    await user.click(within(dialog).getByRole("button", { name: "关闭" }));

    expect(screen.queryByRole("dialog", { name: "导入愿望单文本" })).toBeNull();
    // 关掉＝放弃：卡片不落到页面上，也没有任何写入。
    expect(pagePreviewCard()).toBeNull();
    expect(screen.queryByLabelText("推荐来源名")).toBeNull();
    expect(store.imports).toEqual([]);

    // 再打开是干净的一次：上次选到的文件不带着一起回来。
    await user.click(screen.getByRole("button", { name: "导入愿望单文本文件" }));
    const reopened = screen.getByRole("dialog", { name: "导入愿望单文本" });
    expect(within(reopened).queryByLabelText("推荐来源名")).toBeNull();
    expect(within(reopened).queryByText("42 条可导入")).toBeNull();
  });
});

type SeedSource = { label: string; sourceUrl?: string; ruleCount?: number };

function createStore(initial: {
  documents?: string[];
  sources?: SeedSource[];
  preview?: Partial<VaultDimWishlistImportPreview>;
} = {}) {
  const stored = {
    documents: [...(initial.documents ?? [])],
    sources: (initial.sources ?? []).map((source) => createSource(source.label, source.sourceUrl, source.ruleCount))
  };
  const readLinks: string[] = [];
  const imports: Array<{ token: string; target: { name: string; mode: "create" | "overwrite" } }> = [];
  const store = {
    readLinks,
    imports,
    readAsUnchanged: false,
    readError: null as Error | null
  };
  const actions: VaultWishlistActions = {
    selectDimFile: async () => linkPreview(linkUrl, initial.preview ?? {}),
    listRecommendationDocuments: async () => stored.documents.map((name) => ({
      documentId: `document:${name}`,
      name,
      origin: "url" as const,
      importedAt: "2026-09-17T09:00:00.000Z",
      sourceCount: 1,
      ruleCount: 42
    })),
    readWishlistLink: async (url): Promise<VaultWishlistLinkReadResult> => {
      readLinks.push(url);
      if (store.readError) throw store.readError;
      if (store.readAsUnchanged) {
        return { unchanged: true, source_url: url, source_name: stored.sources[0]?.label ?? "", preview: null };
      }
      return { unchanged: false, source_url: url, source_name: stored.sources[0]?.label ?? "", preview: linkPreview(url, initial.preview ?? {}) };
    },
    confirmDimImport: async (token, target) => {
      imports.push({ token, target });
      stored.documents = [...stored.documents.filter((name) => name !== target.name), target.name];
      stored.sources = [
        ...stored.sources.filter((source) => source.label !== target.name),
        createSource(target.name, linkUrl)
      ];
      return dimWishlist(42);
    },
    getRecommendationManagement: async () => snapshotOf(stored.sources),
    listRecommendationRules: async () => [],
    setRecommendationSourceState: async () => snapshotOf(stored.sources),
    setRecommendationRuleState: async () => snapshotOf(stored.sources),
    clearImportedRecommendationRules: async () => snapshotOf(stored.sources)
  };
  return Object.assign(store, { actions, stored });
}

/** 预览卡上的两个数字故意不同：可导入 42 / 文件里 48，用例据此确认展示的是校验后的口径。 */
function linkPreview(
  url: string,
  overrides: Partial<VaultDimWishlistImportPreview> = {}
): VaultDimWishlistImportPreview {
  return {
    token: "link-token",
    file_name: "DIMLGpigWeaponWishlist by moc.txt",
    title: "",
    rule_count: 48,
    weapon_count: 30,
    mode_counts: { pve: 40, pvp: 6, general: 2 },
    authors: ["moc"],
    tags: [],
    importable_rule_count: 42,
    importable_weapon_count: 28,
    skipped_row_count: 0,
    affected_weapon_count: 0,
    skipped_weapon_count: 0,
    merged_row_count: 0,
    merged_weapon_count: 0,
    issues: [],
    issue_count: 0,
    source_url: url,
    final_url: finalUrl,
    ...overrides
  };
}

function dimWishlist(ruleCount: number): DimWishlist {
  return {
    title: "moc 的愿望单",
    rules: Array.from({ length: ruleCount }, (_value, index) => ({
      item_hash: 1000 + index,
      perk_hashes: [11, 22],
      mode: "pve" as const,
      note: ""
    }))
  };
}

function createSource(label: string, sourceUrl?: string, ruleCount = 42, formatLabel = "愿望单文本"): VaultRecommendationManagedSource {
  return {
    source_key: `${label}:9f1c`,
    label,
    format_label: formatLabel,
    state: "active",
    configured: true,
    rule_count: ruleCount,
    weapon_count: 28,
    revision: "revision-1",
    imported_at: "2026-09-17T09:00:00.000Z",
    ...(sourceUrl ? { source_url: sourceUrl } : {}),
    affected_instance_count: 7,
    vault_instance_count: 5,
    fact_keys: [`${label}:9f1c`, `${label}:9f1c:instance`]
  };
}

function snapshotOf(sources: VaultRecommendationManagedSource[]): VaultRecommendationManagementSnapshot {
  return {
    revision: "revision-1",
    sources: [...sources],
    removed_rules: [],
    clear_rule_imports: { configured: false, source_count: 0, rule_count: 0 }
  };
}
