import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

describe("architecture maintenance guardrails", () => {
  it("uses one shared page label source and passes resolved assistant context to surfaces", () => {
    const appHomeEntry = readFileSync(join(repoRoot, "packages", "app", "src", "home.ts"), "utf8");
    const homePageWorkspace = readFileSync(join(repoRoot, "packages", "app", "src", "workspaces", "homePage.ts"), "utf8");
    const assistantContext = readFileSync(join(desktopRoot, "src", "renderer", "shared", "domain", "assistant", "assistantContext.ts"), "utf8");
    const globalAssistant = readFileSync(join(desktopRoot, "src", "renderer", "components", "GlobalAssistantSidebar.tsx"), "utf8");

    expect(appHomeEntry).toContain("homePageLabels");
    expect(homePageWorkspace).toContain("homePageLabels");
    expect(assistantContext).toContain("homePageLabels");
    expect(globalAssistant).toContain("AssistantPageContext");
    expect(globalAssistant).toContain("pageContext={props.pageContext}");
    expect(globalAssistant).not.toContain("homePageLabels");
    expect(globalAssistant).not.toContain("const pageLabels");
    expect(assistantContext).not.toContain("const pageLabels");
  });

  it("caps item detail cache with an LRU eviction limit", () => {
    const hook = readFileSync(join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetail.ts"), "utf8");

    expect(hook).toContain("ITEM_DETAIL_CACHE_LIMIT");
    expect(hook).toContain("ACCOUNT_ITEM_DETAIL_CACHE_LIMIT");
    expect(hook).toContain("touchItemDetailCache");
    expect(hook).toContain("touchAccountItemDetailCache");
    expect(hook).toContain("evictOldestCacheEntry(itemDetailCacheRef.current, ITEM_DETAIL_CACHE_LIMIT)");
    expect(hook).toContain("evictOldestCacheEntry(accountItemDetailCacheRef.current, ACCOUNT_ITEM_DETAIL_CACHE_LIMIT)");
  });

  it("attributes recommendation facts to the managed source registry before the vault filters on it", () => {
    // 管理面一行 = 一次导入（文档键），事实层一条 = 一个具名来源（实例键）。
    // 仓库的来源筛选拿管理面的键去看事实，必须先按名册给出的 `fact_keys` 把事实归队；
    // 少了这一步，两个键不相等就会把全部事实滤掉，勾选来源后整页 0 件（Bug #92）。
    const vaultView = readFileSync(join(repoRoot, "packages", "ui", "src", "vault", "VaultPageContentView.tsx"), "utf8");

    expect(vaultView).toContain("attributeVaultRecommendationSummaryIndex(");
    // 只出现 `fact_keys` 这个名字不算数（变更比较那处也有），必须是拿它建对应表的那一步。
    // 比对前压掉空白：换行与缩进可以变，这一步不能少。
    expect(vaultView.replace(/\s+/g, " ")).toContain(
      "for (const factKey of source.fact_keys) byFactKey.set(factKey, source.source_key);"
    );
    // 直接按管理面的键过滤事实是那条老路：键不同，永远是空集。
    expect(vaultView).not.toContain("filterVaultRecommendationSummaryIndex");
  });

  it("keeps the import name field and its actions on their own row of the preview card", () => {
    // 命名与确认是预览卡里独占整行的一块，不是卡里的第三栏：
    // 挤进内容栏会把文件名与计数压变形（导入弹框里的旧样子），所以它必须横跨整行。
    const vaultView = readFileSync(join(repoRoot, "packages", "ui", "src", "vault", "VaultWishlistManager.tsx"), "utf8");
    const workspaceCss = readFileSync(join(repoRoot, "packages", "ui", "src", "styles", "menus", "vault", "02-workspace.css"), "utf8");
    const identityRule = workspaceCss.match(/\.vault-import-identity\s*\{[^}]*\}/)?.[0] ?? "";

    expect(vaultView).toContain('className="vault-import-identity"');
    if (!identityRule) throw new Error("缺少 .vault-import-identity 的样式规则");
    expect(identityRule).toContain("grid-column: 1 / -1");
    expect(identityRule).toContain("grid-template-columns: minmax(0, 1fr) auto");
    // 它不带格式名：这套命名与确认对所有导入格式是同一块。
    expect(vaultView).not.toContain("vault-dim-import-choice");
  });

  it("keeps the perk-hit segment group hugging its own chips", () => {
    // 分段控件曾按整栏宽撑开：命中项少的来源行框内大半是空的，各行空得还不一样多，
    // 看着像画歪了的框。它只要包住自己那几个命中项即可；控件本身仍在原位，
    // 两个下拉各占一个定宽栏目，这样逐行才对得齐。
    const workspaceCss = readFileSync(join(repoRoot, "packages", "ui", "src", "styles", "menus", "vault", "02-workspace.css"), "utf8");
    const frameRule = workspaceCss.match(/\.vault-recommendation-primary-filter > span\s*\{[^}]*\}/)?.[0] ?? "";
    const groupRule = workspaceCss.match(/\.vault-recommendation-primary-filter\s*\{[^}]*\}/)?.[0] ?? "";
    const conditionsRule = workspaceCss.match(/\.vault-recommendation-source-conditions\s*\{[^}]*grid-template-columns[^}]*\}/)?.[0] ?? "";

    if (!frameRule || !groupRule || !conditionsRule) throw new Error("缺少分段控件或来源条件行的样式规则");
    expect(frameRule).toContain("width: fit-content");
    // 按行锚定：max-width 那一行不算数。
    expect(frameRule).not.toMatch(/^\s*width: 100%/m);
    // 把控件挤成靠右的一团试过更难看的，别再往那个方向调。
    expect(groupRule).not.toContain("justify-self");
    // 两个下拉的栏目定宽，分段框随行变宽变窄都不影响它们逐行对齐。
    expect(conditionsRule.replace(/\s+/g, " ")).toContain(
      "grid-template-columns: minmax(0, 1fr) minmax(112px, 122px) minmax(118px, 128px);"
    );
  });

  it("keeps one wording for the perk-hit chips and one rule for the row's sibling conditions", () => {
    // Bug #99：分段按钮是开关，点已经亮着的那一段不该动本行另一个条件（「完整」）。
    // 这条规则写在更新来源选择的那一个函数里：两个调用方（分段按钮、其他状态下拉）共用，
    // 谁也不用各记一遍「换档才清完整」。
    const vaultView = readFileSync(join(repoRoot, "packages", "ui", "src", "vault", "VaultPageContentView.tsx"), "utf8");
    const flat = vaultView.replace(/\s+/g, " ");
    const updateBody = vaultView.match(/function updateRecommendationSourceSelection\([\s\S]*?\n  \}/)?.[0] ?? "";
    const descriptionBody = vaultView.match(/function formatVaultRecommendationMetricOptionDescription\([\s\S]*?\n\}/)?.[0] ?? "";
    const chipMarkup = vaultView.slice(
      vaultView.indexOf("vault-recommendation-primary-filter-label"),
      vaultView.indexOf("</button>", vaultView.indexOf("vault-recommendation-primary-filter-label"))
    );

    if (!updateBody || !descriptionBody || !chipMarkup) throw new Error("缺少更新函数、说明函数或分段按钮的标记");
    // 补丁里的 perk 命中档与当前相同时整条不动。
    expect(updateBody.replace(/\s+/g, " ")).toContain(
      "if (patch.primaryFilter !== undefined && patch.primaryFilter === selection.primaryFilter) return selection;"
    );
    // 悬停与读屏共用同一句话，且这句话说的是要求几项、命中几项——不是把档位名念一遍。
    expect(flat).toContain(
      "aria-label={`${option.sourceLabel}${formatVaultRecommendationMetricOptionDescription(copy, filterOption.key, filterOption.count)}`}"
    );
    expect(flat).toContain("title={formatVaultRecommendationMetricOptionDescription(copy, filterOption.key, filterOption.count)}");
    expect(descriptionBody.replace(/\s+/g, " ")).toContain("要求 {required} 项，命中 {matched} 项，{count} 件");
    // 旧的档位说法（「命中 x/y」）与组标签「perk 命中」拼在一起会念成「perk 命中 命中 1/2」；
    // 那个函数删掉后就别再回来。
    expect(vaultView).not.toContain("formatVaultRecommendationMetricOptionLabel");
    // 可见文字仍是裸的命中档 + 独立数量徽标：分段组左边已经挂着可见标签「perk 命中」。
    // 档位名是数据（`2/2`），只有「全部」是固定文案，走 copy 查表，所以字面量外面套着查表调用。
    expect(chipMarkup.replace(/\s+/g, " ")).toContain(`<span>{filterOption.key === "all" ? vaultText(copy, "全部") : filterOption.key}</span>`);
    expect(chipMarkup).not.toContain("命中 ");
  });

  it("keeps desktop app services delegated to the shared desktop bridge adapter", () => {
    const appServices = readFileSync(join(repoRoot, "packages", "services", "src", "appServices.ts"), "utf8");
    const desktopBridge = readFileSync(join(repoRoot, "packages", "services", "src", "desktopBridge.ts"), "utf8");
    const rendererServices = readFileSync(join(desktopRoot, "src", "renderer", "api", "services.ts"), "utf8");

    expect(appServices).toContain("createDesktopBridgeServices");
    expect(appServices).toContain("return createDesktopBridgeServices(api)");
    expect(appServices).not.toContain("createD2SkillService");
    expect(desktopBridge).toContain("export function createDesktopBridgeServices");
    expect(rendererServices).toContain("createAppServices(api)");
  });

  it("keeps DIM text down to two entries: one local file, one link the user supplies", () => {
    // T63：粘贴文本与「从写死的上游地址拉一份」都被判定为设计错误。
    // 前者是把解析入口散进界面，后者是替用户选来源；DIM 文本这一组只剩两条路。
    const wishlistPanel = readFileSync(join(repoRoot, "packages", "ui", "src", "vault", "VaultWishlistManager.tsx"), "utf8");
    const settingsSources = readFileSync(join(repoRoot, "packages", "ui", "src", "settings", "settingsSources.ts"), "utf8");

    expect(wishlistPanel).toContain("data-dim-link");
    expect(wishlistPanel).toContain("data-dim-import");
    for (const removed of ["data-dim-paste", "pastePreview", "dimOnlinePreview", "dimOnlineCheckUiTimeoutMs", "在线导入"]) {
      expect(wishlistPanel, `粘贴文本 / 固定地址在线导入的残留：${removed}`).not.toContain(removed);
    }
    // 「数据来源」页也不能再列一个固定的愿望单文件地址：来源由用户给。
    expect(settingsSources).not.toContain("raw.githubusercontent.com");
  });

  it("keeps the link download out of format knowledge and off the renderer", () => {
    // 下载只负责「把一段文本取回来」：它不认识愿望单语法，也不认识校验；
    // 取回的文本与本地文件走同一条流水线。下载跑在主进程，界面只输入链接。
    const linkSource = readFileSync(join(repoRoot, "packages", "services", "src", "community", "dimWishlistLinkSource.ts"), "utf8");
    const wishlistIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "wishlist.ts"), "utf8");

    expect(linkSource).not.toContain("parseDimWishlist");
    expect(linkSource).not.toContain("filterDimWishlistForImport");
    expect(linkSource).not.toContain("item_hash");

    // 两条入口调的是同一个解析器与同一个校验器——少一处，同一份内容走两条路就会得出两种结果。
    for (const handler of ["wishlist:import:select", "wishlist:url:read", "wishlist:import:confirm"]) {
      const body = wishlistHandlerBody(wishlistIpc, handler);
      expect(body, `${handler} 没有走共用解析器`).toContain("parseDimWishlistWithIssues(");
      expect(body, `${handler} 没有走共用校验`).toContain("filterWishlist(");
    }
    // 链接是记在待确认条目上的，确认时才知道该按链接来源落库（来源行以后能再同步）。
    expect(wishlistHandlerBody(wishlistIpc, "wishlist:url:read")).toContain("source_url: download.source_url");
    const confirm = wishlistHandlerBody(wishlistIpc, "wishlist:import:confirm");
    expect(confirm).toContain("saveDimWishlistFromSource(");
    expect(confirm).toContain('origin: "file"');

    for (const panel of ["VaultWishlistManager.tsx", "VaultRecommendationSourceManager.tsx"]) {
      const source = readFileSync(join(repoRoot, "packages", "ui", "src", "vault", panel), "utf8");
      expect(source, `${panel} 自己发起了网络请求`).not.toContain("fetch(");
    }
  });

  it("keeps the wishlist import preview carrying the expansion counts apart from the problem rows", () => {
    // T64：预览里「行有问题将忽略」只算真笔误，摊开写的冗余是另一个计数。
    // 主进程拼装这一段没有行为用例覆盖（要起 Electron），所以这里按住映射本身：
    // 少带一个计数、或把冗余并进问题计数，界面上的说法就会失真。
    const wishlistIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "wishlist.ts"), "utf8");
    // 按行锚定，不用「出现过这个子串」——`skipped_row_count: filtered.skipped_row_count + filtered.merged_row_count`
    // 也含那个子串，宽松写法会把「把冗余并进问题计数」放过去。
    expect(wishlistIpc).toMatch(/^\s*merged_row_count: filtered\.merged_row_count,$/m);
    expect(wishlistIpc).toMatch(/^\s*merged_weapon_count: filtered\.merged_weapon_count,$/m);
    expect(wishlistIpc).toMatch(/^\s*skipped_row_count: filtered\.skipped_row_count,$/m);
    // 界面那一侧：冗余一段与问题框是两段，红框里的数字只取问题行数。
    const wishlistPanel = readFileSync(join(repoRoot, "packages", "ui", "src", "vault", "VaultWishlistManager.tsx"), "utf8");
    expect(wishlistPanel).toMatch(/^\s*\{preview\.merged_row_count > 0 \? \($/m);
    expect(wishlistPanel).toMatch(/^\s*<strong>\{vaultTemplate\(copy, "\{count\} 行是展开写法的冗余", \{ count: preview\.merged_row_count \}\)\}<\/strong>$/m);
    expect(wishlistPanel).toMatch(/^\s*\{vaultTemplate\(copy, "\{count\} 行有问题将忽略", \{ count: preview\.skipped_row_count \}\)\}$/m);
  });

  it("keeps the link dialog laid out by its own rule instead of the removed paste channel", () => {
    // 「从链接同步」弹框的排布一直挂在「粘贴文本」那个通道的类名上：通道删了、弹框换了类名，
    // 样式没跟过来，输入框、读取按钮、说明退回默认行内流——按钮和说明挤在同一行，看着像压在输入框上。
    // 这里按住「弹框自己的类名有布局规则」，改名或删规则时立刻失败。
    const wishlistPanel = readFileSync(join(repoRoot, "packages", "ui", "src", "vault", "VaultWishlistManager.tsx"), "utf8");
    const workspaceCss = readFileSync(join(repoRoot, "packages", "ui", "src", "styles", "menus", "vault", "02-workspace.css"), "utf8");
    const bodyRule = workspaceCss.match(/\.vault-wishlist-link-body\s*\{[^}]*\}/)?.[0] ?? "";

    expect(wishlistPanel).toContain('className="vault-wishlist-link-body"');
    if (!bodyRule) throw new Error("缺少 .vault-wishlist-link-body 的样式规则");
    expect(bodyRule).toContain("display: grid");
    expect(bodyRule).toContain("grid-template-columns: minmax(0, 1fr) auto");
    // 已删除的通道不许在样式里留下选择器：留着不只是死代码，还会像这次一样把问题盖住。
    expect(workspaceCss).not.toContain("vault-wishlist-paste");
    // 宽度覆盖要写成复合选择器：基础宽度规则在本文件后面，单类名会被它按源序盖掉（写了 720px 也不生效）。
    expect(workspaceCss).toMatch(/\.vault-wishlist-manager\.vault-knowledge-import-dialog\s*\{/);
    expect(workspaceCss).toMatch(/\.vault-wishlist-manager\.vault-wishlist-link-dialog\s*\{/);
    // T68：愿望单本地文件这条路也有自己的弹框了，同样要吃这条宽度覆盖。
    expect(workspaceCss).toMatch(/\.vault-wishlist-manager\.vault-wishlist-file-dialog\s*\{/);
  });

  it("keeps a long link from running over the preview card's counts", () => {
    // T66：预览卡第一栏写的是「来自链接：<地址>」，而 GitHub 的原始地址长到没有任何可断处。
    // 实测（真实样式表 + 无头浏览器）：那张卡在链接弹框里只有 694px，第一栏 395px，
    // 地址却把这一栏撑到 620px、压到右边的计数上。允许在任意字符处断行，链接才留在本栏里。
    const workspaceCss = readFileSync(join(repoRoot, "packages", "ui", "src", "styles", "menus", "vault", "02-workspace.css"), "utf8");
    const rule = workspaceCss.match(/\.vault-wishlist-preview\s*>\s*span\s*>\s*small\s*\{[^}]*\}/)?.[0] ?? "";
    if (!rule) throw new Error("缺少 .vault-wishlist-preview > span > small 的样式规则");
    expect(rule).toContain("overflow-wrap: anywhere");
  });

  it("pins the imported-source row's columns to the list instead of that row's own buttons", () => {
    // T67：数字栏原本跟着「这一行有几个按钮」跑——上面那行多一个「同步」，数字就整体偏左 52px，
    // 从 1720 一路量到 720，每个宽度上都差这 52px。处置是把按钮栏的宽度交给「列表里最宽的那一行」：
    // 列表排两栏、行用 subgrid 接上列表的栏，于是按钮个数与数字栏落在哪儿彻底无关。
    // 列间距只能挂在列表上——subgrid 的行会忽略自己的 column-gap（行自己的 gap 仍在，用于纵向）。
    const workspaceCss = readFileSync(join(repoRoot, "packages", "ui", "src", "styles", "menus", "vault", "02-workspace.css"), "utf8");
    const listRule = workspaceCss.match(/\.vault-managed-source-list\s*\{[^}]*column-gap[^}]*\}/)?.[0] ?? "";
    const rowRule = workspaceCss.match(/\.vault-managed-source-list\s*>\s*\.vault-managed-source\s*\{[^}]*\}/)?.[0] ?? "";
    const selectRule = workspaceCss.match(/\.vault-managed-source-select\s*\{[^}]*\}/)?.[0] ?? "";
    const countsRule = workspaceCss.match(/\.vault-managed-source-select\s*>\s*span:last-child\s*\{[^}]*\}/)?.[0] ?? "";

    if (!listRule || !rowRule || !selectRule || !countsRule) {
      throw new Error("缺少来源清单 / 来源行 / 选择区 / 数字栏的样式规则");
    }
    const flat = (rule: string) => rule.replace(/\s+/g, " ");
    // 列表的第二栏按内容定宽（由最宽的一行决定），行把这两栏原样接过去。
    expect(flat(listRule)).toContain("grid-template-columns: minmax(0, 1fr) max-content;");
    expect(listRule).toContain("column-gap: 10px");
    expect(flat(rowRule)).toContain("grid-template-columns: subgrid;");
    expect(rowRule).toContain("grid-column: 1 / -1");
    // 数字栏定宽：写成「下限 210、内容再长就撑开」时两行会重新错开——正是这次要修的毛病。
    expect(flat(selectRule)).toContain("grid-template-columns: minmax(0, 1fr) 210px;");
    expect(countsRule).toContain("text-align: right");
    expect(countsRule).toContain("font-variant-numeric: tabular-nums");
    // 规则行不接列表的栏：它是另一份清单，仍是各自 minmax(0, 1fr) auto。
    expect(workspaceCss).not.toMatch(/\.vault-managed-rule-list\s*>\s*\.vault-managed-rule\s*\{/);

    // 窄屏收回单栏时列表与行要一起收：行的栏宽来自列表，只收一个，另一个会继续按两栏排。
    const containerQueries = workspaceCss.slice(workspaceCss.indexOf("@container product-workspace (max-width: 700px)"));
    const narrow = containerQueries.slice(0, containerQueries.indexOf("\n}"));
    const narrowRule = (selector: string) =>
      narrow.match(new RegExp(`\\.${selector}\\s*\\{[^}]*\\}`))?.[0] ?? "";
    const narrowList = narrowRule("vault-managed-source-list");
    const narrowRow = narrow.match(/\.vault-managed-source-list\s*>\s*\.vault-managed-source\s*\{[^}]*\}/)?.[0] ?? "";
    if (!narrowList || !narrowRow) throw new Error("窄屏那段缺少来源清单 / 来源行的单栏覆盖");
    expect(flat(narrowList)).toContain("grid-template-columns: minmax(0, 1fr);");
    expect(flat(narrowRow)).toContain("grid-template-columns: minmax(0, 1fr);");
    expect(narrow).toMatch(/\.vault-managed-source-select\s*>\s*span:last-child\s*\{[^}]*text-align: left/);
  });

  it("has no hardcoded upstream wishlist address and no leftover online-import channel", () => {
    // 「来源不该由程序替用户选好」：全仓不许再出现写死的上游地址或它配套的元数据通道。
    const files = sourceFilesUnder(["packages"]);
    const offenders = files.flatMap((file) => {
      const source = readFileSync(join(repoRoot, file), "utf8");
      return ["raw.githubusercontent.com", "api.github.com", "wishlist:online", "dimWishlistUpdates"]
        .filter((needle) => source.includes(needle))
        .map((needle) => `${file}：${needle}`);
    });
    expect(offenders).toEqual([]);
    // 扫描本身有效：它确实走到了实现文件，而不是一个空列表；
    // 测试文件不在范围内——用例里出现假链接是正常的，写死的上游地址只可能出现在运行时代码里。
    expect(files).toContain(join("packages", "desktop", "src", "main", "ipc", "wishlist.ts"));
    expect(files.some((file) => file.includes(`${join("packages", "services", "test")}`))).toBe(false);
  });

  it("keeps the recommendation surfaces' confirmations a layer above the page, not a block inside it", () => {
    // Bug #96：确认条从前是在内容流末尾条件渲染的一块，点「删除」会把整份清单顶下去，
    // 被删的那一行还留在上面，眼睛要在两处来回找。四处确认动作现在都走共用弹框
    // （遮罩 + 背景 inert + Tab 锁 + Escape + 关闭后焦点回到触发点）。
    // 行内确认的类名不许在标记或样式里留下——留着就是第二条路，正是 Bug #95 的教训。
    const workspaceCss = readFileSync(join(repoRoot, "packages", "ui", "src", "styles", "menus", "vault", "02-workspace.css"), "utf8");
    expect(workspaceCss).not.toContain("vault-wishlist-confirm");
    expect(workspaceCss).not.toContain("vault-management-confirm");

    for (const panel of ["VaultRecommendationSourceManager.tsx", "VaultWishlistManager.tsx"]) {
      const source = readFileSync(join(repoRoot, "packages", "ui", "src", "vault", panel), "utf8");
      expect(source, `${panel} 又出现了行内确认块`).not.toContain("vault-wishlist-confirm");
      expect(source, `${panel} 没走共用的确认弹框`).toContain("<ConfirmationDialog");
      // 框里的按钮取「确认 + 行上那个动作」。与触发它的行内按钮同名时，同一个名字在页面上
      // 出现两次：遮罩挡得住点击，挡不住查询与读屏，说「点删除」就不知道点的是哪一个。
      const labels = source.match(/confirmLabel: vaultText\(copy, "[^"]*"\)/g) ?? [];
      expect(labels.length, `${panel} 里没有找到确认按钮文案`).toBeGreaterThan(0);
      expect(labels.filter((label) => !label.startsWith('confirmLabel: vaultText(copy, "确认'))).toEqual([]);
    }
  });

  it("builds perk entries in one component and keeps every perk class name styled", () => {
    // T69：同一张 Perk 小卡片曾有两套实现——本件 Roll 一套、推荐对照区一套——宽度、内边距、
    // 圆角、字号各写各的，同一页里同一个东西长得不一样。现在两处都走 WeaponPerkEntry。
    // 这条用例挡三件事：标记回流成「详情页里手搓」、类名改名只改一半（样式里改了、标记里没改），
    // 以及旧类名残留。改名只改一半最阴：页面上少一段布局却不报错，只能靠眼睛发现——所以扫描按
    // 整条 `weapon-detail-*` 前缀来，不只看 perk 开头的那几个。
    const detail = readFileSync(join(repoRoot, "packages", "ui", "src", "item-detail", "weapon", "WeaponDetailContent.tsx"), "utf8");
    const entry = readFileSync(join(repoRoot, "packages", "ui", "src", "item-detail", "weapon", "WeaponPerkEntry.tsx"), "utf8");
    const perkCss = readFileSync(join(repoRoot, "packages", "ui", "src", "styles", "components", "09-weapon-detail.css"), "utf8");
    const styles = walkCss(join(repoRoot, "packages", "ui", "src", "styles"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    // 两处（本件 Roll 与推荐来源对照）都必须复用同一个组件，而不是只改一处。
    expect(detail.match(/<WeaponPerkEntry\b/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    // 条目外观的类名只许出现在那个组件里：图标、名称、短状态、命中勾都不许在详情页里手写。
    expect(detail).not.toContain("weapon-detail-perk-entry");

    // 扫描本身有效：这两个文件是这套类名的出产地，取不到就说明正则失效了，后面的空集合会白过。
    const tokensOf = (source: string) => [...new Set(source.match(/weapon-detail-[a-z0-9-]*/g) ?? [])];
    expect(tokensOf(entry).length + tokensOf(detail).length, "没扫到任何 weapon-detail 类名").toBeGreaterThan(20);
    // 标记里出现的每个类名都要真的有一条样式，否则就是改名只改了一半。
    for (const [file, source] of [["WeaponDetailContent.tsx", detail], ["WeaponPerkEntry.tsx", entry]]) {
      const missing = tokensOf(source).filter((token) => !styles.includes(`.${token}`));
      expect(missing, `${file} 里这些类名在样式里不存在：${missing.join("、")}`).toEqual([]);
    }
    expect(perkCss).not.toContain("weapon-detail-recommendation-perk");
    expect(perkCss).not.toMatch(/\.weapon-detail-perk(?![\w-])/);

    // 宽度属于列表，不属于条目（T72 方案 A）：列表用一条等宽列模板决定「一行放几张、每张多宽」，
    // 条目只交还 `min-width: 0` 让栅格自己收窄，不自己声明宽度。
    // 钉模板而不是钉老写法（`min-width` + `max-width` + `flex` 三件套）：老写法里每个条目自带一个
    // 宽度上限，同一栏的卡片宽度由各自内容决定，推荐区两半因此各算各的列宽、列线对不上；
    // 模板才是「宽度只有一个来源」这件事的可检查形态——把模板删了、改回条目自己撑宽，这行就红。
    const listRule = perkCss.match(/\.weapon-detail-perk-entries\s*\{[^}]*\}/)?.[0] ?? "";
    expect(listRule, "列表没有等宽列模板（grid-template-columns: repeat(auto-fill, minmax(...))），一行放几张会退回由内容决定").toMatch(/grid-template-columns:\s*repeat\(\s*auto-fill\s*,\s*minmax\(/);
    const entryWidthRule = perkCss.match(/\.weapon-detail-perk-entries\s*>\s*\.weapon-detail-perk-entry\s*\{[^}]*\}/)?.[0] ?? "";
    expect(entryWidthRule, "列表没有约束条目宽度，窄栏里的长名字会把列撑破").toContain("min-width: 0");
    // 词边界：`min-width` / `max-width` 里也含 `width`，按子串判会把它们误当成「条目自己声明宽度」。
    for (const property of ["width", "max-width", "flex"]) {
      expect(entryWidthRule, `条目又自己声明了宽度（${property}:），两半的列宽会各算各的`).not.toMatch(new RegExp(`(?:^|[;\\s])${property}\\s*:`));
    }

    // 浮层里那一行动作按钮（T73「选择 / 取消选择」）必须真的点得到：浮层整体是 pointer-events: none
    // ——说明浮层不该抢鼠标，悬停要能穿过去——所以点击能力只能显式还给按钮自己。
    // 实测过一次：少了这一行，按钮在浏览器里 elementFromPoint 命中的是它背后的卡片，永远点不着。
    const popoverRule = perkCss.match(/\.weapon-detail-perk-entry-popover\s*\{[^}]*\}/)?.[0] ?? "";
    expect(popoverRule, "说明浮层不再让鼠标穿透，会盖住卡片变成点不动的死区").toContain("pointer-events: none");
    const actionRule = perkCss.match(/\.weapon-detail-perk-entry-action\s*>\s*button\s*\{[^}]*\}/)?.[0] ?? "";
    expect(actionRule, "浮层里的动作按钮没把点击要回来，等于一个点不动的按钮").toContain("pointer-events: auto");
    // 动作行由组件渲染（详情页里连 `weapon-detail-perk-entry` 这一串都不许出现，见上面的扫描）。
    expect(entry, "WeaponPerkEntry 没渲染浮层动作行").toContain("weapon-detail-perk-entry-action");

    // T70：同一种卡片在页面里曾长出第三、第四套盒子——固有能力空态（64 高、padding 10）与配置加载骨架
    // （66 高、padding 8、38 方形图标）各是一份老几何，T69 统一条目时没带上它们，于是占位比卡片高出一截。
    // 现在空态与骨架都渲染同一个盒子类，几何只有一条规则；下面两件事一起挡：旧的占位类名回流、
    // 以及盒子几何被搬回 `> button` 那种只有真条目吃得到的写法。
    expect(detail).toMatch(/<WeaponPerkPlaceholder\b/);
    for (const legacy of ["weapon-detail-config-placeholder-column", "weapon-detail-intrinsic-empty"]) {
      expect(detail, `详情页又自己造了一份占位几何：${legacy}`).not.toContain(legacy);
      expect(perkCss, `样式里还留着旧的占位几何：${legacy}`).not.toContain(legacy);
    }
    // 类名要带词边界：`-box-never` 这种改名如果按子串匹配会被当成同一类名而漏掉。
    // 选择器也不许跨行匹配：注释里提到过这个类名时，`[^{]*` 会一路吃到下一条规则的规则体，
    // 于是「几何规则被改名」也能匹配上一条注释（第一版就是这么漏掉改坏 M10 的）。
    const boxRules = [...perkCss.matchAll(/^[^\n{]*\.weapon-detail-perk-entry-box(?![\w-])[^\n{]*\{[^}]*\}/gm)].map((match) => match[0]);
    expect(
      boxRules.some((rule) => rule.includes("grid-template-columns") && rule.includes("min-height") && rule.includes("padding")),
      "条目盒子几何（栅格、最小高度、内边距）必须定义在 .weapon-detail-perk-entry-box 上，占位与骨架才吃得到"
    ).toBe(true);
    // 空态仍然在自己的列壳里、带列名：改动前那个裸 div 没有表头，整格比邻列高出表头那一格。
    // 列名现在走 copy 查表，所以字面量外面可能套一层查表调用；两种形态都算过，别的一律不算。
    // 占位组件自己的 props 不参与判断（`copy` 之外还会长别的），只认它紧接着 `<div>` 且是空态。
    expect(detail, "固有能力空态丢了列名，整格会比邻列高一格").toMatch(
      /<h4>\{?(?:[A-Za-z][\w.]*\([^)]*,\s*)?"固有能力"\)?\}?<\/h4>\s*<div>\s*<WeaponPerkPlaceholder\b[^>]*variant="empty"/
    );
    // 骨架的图标位与真图标同形（36 圆），不是老骨架的 38 方形。
    const barRule = perkCss.match(/\.weapon-detail-perk-entry-bar-art\s*\{[^}]*\}/)?.[0] ?? "";
    for (const property of ["36px", "border-radius: 50%"]) {
      expect(barRule, "骨架图标位要与真图标同形（36 圆）").toContain(property);
    }

    // T70：「当前已选」在本件 Roll 里是唯一的状态，必须有一个不只靠颜色的结构信号（左缘实色条），
    // 且四处 Roll 列都要把它打开。推荐对照区不传 emphasis（规格给那一区的表达是蓝点 + 文字）。
    expect(perkCss, "本件 Roll 的当前已选缺少结构信号（左缘实色条）").toMatch(
      /\[data-emphasis="selected"\]\[data-active="true"\][^{]*\{[^}]*inset/
    );
    expect(detail.match(/emphasis="selected"/g)?.length ?? 0, "有 Roll 列没打开选中表达").toBeGreaterThanOrEqual(4);

    // T70 回归：「固有能力」这一格曾拿**正片读取**的入口（loadConfiguration → 宿主上的
    // loadSelectedItemFullDetail）去补定义。那条路会置整份详情的加载态，于是宿主把整份详情换成
    // 全屏骨架（首屏白屏），骨架一挂载又触发下一次读取——读取失败时表现为「一直在闪」。
    // 现在这条按需读取只走 loadDefinition（后台、不置详情加载态），且触发条件必须仍然只看它。
    const pendingExpression = detail.match(/const definitionPending = ([\s\S]*?);/)?.[1] ?? "";
    expect(pendingExpression, "按需读定义的触发条件没找到，后面两句会白过").not.toBe("");
    expect(pendingExpression, "按需读定义又接回了整份详情的读取入口").toContain("props.actions?.loadDefinition");
    expect(pendingExpression, "按需读定义又接回了整份详情的读取入口").not.toContain("loadConfiguration");
    // 后台读取本身也不许动加载态字段：动了就等于从数据层再做一次上面那件事。
    const hook = readFileSync(
      join(repoRoot, "packages", "desktop", "src", "renderer", "shared", "hooks", "useItemDetail.ts"),
      "utf8"
    );
    const backgroundRead = hook.match(/async function loadSelectedItemDefinition\(\)[\s\S]*?\n  \}\n/)?.[0] ?? "";
    expect(backgroundRead, "后台补读定义的实现没找到，后面三句会白过").not.toBe("");
    expect(backgroundRead, "后台补读定义没有走定义读取").toContain("api.getItemDetail");
    expect(backgroundRead, "后台补读定义顺手读了完整实例 Roll").not.toContain("loadAccountItemDetailCached");
    for (const loadingField of ["detail_loading", "is_detail_loading", "setItemDetailLoadingKey"]) {
      expect(backgroundRead, `后台补读定义改了详情加载态：${loadingField}`).not.toContain(loadingField);
    }
    // 接线也必须接对：详情页那个 loadDefinition 要指向后台补读，而不是又指回整份详情的读取。
    // 这一条挡的正是本轮回归——实现写对了、接线接回旧入口，症状一模一样。
    const modal = readFileSync(
      join(repoRoot, "packages", "desktop", "src", "renderer", "shared", "components", "ItemDetailModal.tsx"),
      "utf8"
    );
    const definitionAction = modal.match(/loadDefinition: ([^,]+),/)?.[1] ?? "";
    expect(definitionAction, "详情弹框没接后台补读定义，后面两句会白过").not.toBe("");
    expect(definitionAction, "详情页的按需读定义接回了整份详情的读取入口").not.toContain("onLoadSelectedItemFullDetail");
    expect(definitionAction, "详情页的按需读定义没接到后台补读上").toContain("onLoadSelectedItemDefinition");
  });

  it("keeps the item detail readiness gate latched so a background read cannot blank the screen", () => {
    // 上一句守卫挡的是「补定义不许置加载态」。挡住一个入口，挡不住同一类错：**置位的人没错，
    // 是视图层把这个标志当成了内容闸门。** 宿主把「此刻忙不忙」和「画不画正文」合取在一起，
    // 于是任何一次重新读取——写后读回（换 Perk 后连读 6 次确认，累计十几秒）、手动「重新读取配置」
    // ——都会把整屏正文换回全屏骨架，顺带丢掉 pendingPerks、滚动位置和所在章节。
    // 现在就绪只看一条单调闩锁，忙碌只走 isBusy。两头都要钉：合取加回来会白屏，闩锁改成无条件前进
    // 会反过来——第一次打开就画一份还没有内容的详情。
    const host = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePageItemDetailHost.tsx"), "utf8");

    const isReadyExpression = host.match(/isReady:\s*([^\n]+)/)?.[1] ?? "";
    expect(isReadyExpression, "宿主里没找到 isReady 的取值，后面两句会白过").not.toBe("");
    expect(
      isReadyExpression,
      "就绪闸门又和实时忙碌标志合取了：任意一次重新读取都会把已画出的正文换回骨架"
    ).not.toContain("selectedItemReady");
    expect(isReadyExpression, "就绪闸门不再是那条单调闩锁").toContain("readyRevision === command.revision");

    // 合上闩锁的时机仍然是「属这件装备的首帧内容可用」。按 `setReadyRevision(0)`（复位）和
    // 这一个分开找：两处都含 `setReadyRevision` 这串，只能按赋值形态区分。
    const latchEffect = [...host.matchAll(/useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\);/g)]
      .map((match) => match[0])
      .find((block) => /setReadyRevision\(\s*revision\s*\)/.test(block)) ?? "";
    expect(latchEffect, "没找到合上就绪闩锁的 effect，后面两句会白过").not.toBe("");
    expect(latchEffect, "就绪闩锁不再等首帧内容，第一次打开会直接画一份空详情").toContain("selectedItemReady");
    expect(latchEffect, "就绪闩锁不再等首帧内容，第一次打开会直接画一份空详情").toContain("setReadyRevision(revision)");
  });

  it("keeps the three weapon-detail regions in the order the user asked for", () => {
    // T71：用户口径「推荐 roll 放最上面，当前 roll 放中间，完整放下面」。改前完整掉落池挂在
    // 「当前配置」章节里面（自带一条 border-top），所以页面上是「本件 Roll + 完整」一块、
    // 「推荐判断」另一块；现在三块是三个兄弟章节，各自吃同一条 .weapon-detail-section 盒模型。
    // 顺序是关键：它不是样式，改错了页面不报错、只是要滚动才能找到东西，所以按位置钉住。
    const detail = readFileSync(join(repoRoot, "packages", "ui", "src", "item-detail", "weapon", "WeaponDetailContent.tsx"), "utf8");
    const indexOf = (needle: string) => {
      const at = detail.indexOf(needle);
      expect(at, `详情页里找不到 ${needle}，后面几句会白过`).toBeGreaterThan(-1);
      return at;
    };

    const recommendations = indexOf("sectionRefs.current.recommendations");
    const configuration = indexOf("sectionRefs.current.configuration");
    const pool = indexOf("<FullPoolSection");
    expect(recommendations, "推荐 Roll 又排到了 本件 Roll 后面").toBeLessThan(configuration);
    expect(configuration, "完整掉落池又排到了 本件 Roll 前面").toBeLessThan(pool);

    // 章节导航与章节同一顺序，否则点第二个页签会往回跳。
    // 类型标注里带分号（`{ key: …; label: … }`），所以按 `];` 收尾，不能按分号截断。
    const labels = detail.match(/const sectionLabels[\s\S]*?\];/)?.[0] ?? "";
    expect(labels, "章节导航没找到，下一句会白过").not.toBe("");
    expect(labels, "章节导航顺序没跟着章节顺序走").toMatch(
      /recommendations[\s\S]*configuration[\s\S]*overview[\s\S]*upgrades/
    );

    // 首屏定位与懒挂载集合都跟着第一节走：推荐 Roll 现在是第一节，挂载即读推荐证据。
    expect(detail, "首屏第一节没改回推荐 Roll").toContain('const firstSection: WeaponDetailSection = "recommendations";');
    for (const usage of [
      "useState<WeaponDetailSection>(firstSection)",
      "new Set([firstSection])",
      "observedSectionRef = useRef<WeaponDetailSection>(firstSection)"
    ]) {
      expect(detail, `首屏定位/挂载集合没跟着第一节走：${usage}`).toContain(usage);
    }

    // 完整掉落池必须真的离开配置章节：配置章节的函数体里不许再有它的类名，也不许再收它的开关。
    const configBody = detail.match(/function ConfigurationSection\([\s\S]*?\n\}\n/)?.[0] ?? "";
    expect(configBody, "配置章节的实现没找到，后面两句会白过").not.toBe("");
    expect(configBody, "完整掉落池又挂回了配置章节里").not.toContain("weapon-detail-full-pool");
    expect(configBody, "配置章节还在收完整掉落池的开关").not.toContain("props.poolOpen");
    // 它得有自己的章节盒子与区域标记，否则三区又并回两块。
    expect(detail, "完整掉落池没有自己的章节盒子（三区就没分开）").toMatch(
      /<section className="weapon-detail-section" data-region="full-pool">/
    );
    // 单独成区之后，那条只为「贴着配置网格」而写的内部分隔线要撤掉，否则一条分隔线画两次。
    const perkCss = readFileSync(join(repoRoot, "packages", "ui", "src", "styles", "components", "09-weapon-detail.css"), "utf8");
    expect(perkCss, "完整掉落池还自带一条内部分隔线").not.toMatch(/\.weapon-detail-full-pool\s*\{[^}]*border-top/);
  });

  it("keeps the recommendation region split by object identity instead of by which fields carry a value", () => {
    // T81：资料库定义和商人 Offer 根本没有「本件」，但旧的单条渲染路径靠 `requirement_state` /
    // `instance_owned` 有没有值来猜自己拿到了哪一层，于是给没有本件的东西画了「来源要求 ｜ 本件拥有」
    // 对照表：第二列结构性为空，还写出「本件没有这个推荐项」。现在按对象身份分流，规则层只剩
    // 「来源自己给了什么」。这条守卫钉的就是「不许再退回按字段猜」。
    const detail = readFileSync(join(repoRoot, "packages", "ui", "src", "item-detail", "weapon", "WeaponDetailContent.tsx"), "utf8");
    const bodyOf = (name: string) => {
      const body = detail.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}\\n`))?.[0] ?? "";
      expect(body, `详情页里找不到 ${name}，后面几句会白过`).not.toBe("");
      return body;
    };

    // 分流依据只能是对象身份：账号实例一条路，资料库定义 / 商人 Offer 另一条。
    expect(detail, "推荐区没按对象身份分流").toContain(
      'const isAccountInstance = model.context.kind === "account_instance";'
    );
    expect(detail, "按字段有没有值猜层次的旧判断又回来了").not.toMatch(/\bisDefinition\b/);

    const ruleLayer = bodyOf("DefinitionRecommendationSources");
    const sourceCard = bodyOf("DefinitionRecommendationSourceCard");

    // 规则层不许出现第二列的任何形式：没有本件拥有项、没有命中 / 当前启用标记、没有两列对照。
    for (const forbidden of [
      "instance_owned",
      "RecommendationSlotComparison",
      "recommendationPerkMatches",
      "requirement_state",
      "hit=",
      "active="
    ]) {
      expect(sourceCard, `规则层来源卡又长出了本件对照：${forbidden}`).not.toContain(forbidden);
    }
    // 它画的仍然是来源自己给的栏位与候选，且复用同一种 Perk 条目，不另起一套。
    expect(sourceCard, "规则层没画来源栏位").toContain("weapon-detail-definition-columns");
    expect(sourceCard, "规则层换了另一套 Perk 条目").toContain("<WeaponPerkEntry");

    // 免责声明说一次就够：区域顶部一句，卡内不重复，否则同一句话会读 N 遍。
    const disclaimerAt = ruleLayer.indexOf("recommendation_disclaimer");
    const firstCardAt = ruleLayer.indexOf("<DefinitionRecommendationSourceCard");
    expect(disclaimerAt, "推荐区顶部没有免责声明").toBeGreaterThan(-1);
    expect(firstCardAt, "推荐区没画来源卡，后面一句会白过").toBeGreaterThan(-1);
    expect(disclaimerAt, "免责声明没排在来源卡前面").toBeLessThan(firstCardAt);
    expect(detail.match(/weapon-detail-recommendation-disclaimer/g)?.length ?? 0, "免责声明被逐卡重复渲染").toBe(1);

    // 「来源要求 ｜ 本件拥有」两列对照只属于事实层：事实层链路是
    // RecommendationSourceEvidenceCard → RecommendationSourceSlotRow → RecommendationSlotComparison，
    // 规则层从壳到卡都不许提到这条链上的任何一个。
    const evidence = bodyOf("RecommendationSourceEvidenceCard");
    const slotRow = bodyOf("RecommendationSourceSlotRow");
    expect(detail.match(/<RecommendationSlotComparison/g)?.length ?? 0, "推荐对照组件被用在了事实层以外").toBe(1);
    expect(detail.match(/<RecommendationSourceSlotRow/g)?.length ?? 0, "逐栏对照挂到了事实层卡片以外").toBe(1);
    expect(evidence, "事实层不再画逐栏对照").toContain("<RecommendationSourceSlotRow");
    expect(slotRow, "事实层不再消费本件拥有项").toContain("instance_owned");
    expect(slotRow, "事实层不再画两列对照").toContain("<RecommendationSlotComparison");
    for (const forbidden of ["RecommendationSlotComparison", "RecommendationSourceSlotRow"]) {
      expect(ruleLayer, `规则层引用了事实层的两列对照：${forbidden}`).not.toContain(forbidden);
    }
  });

  it("keeps the perk entry's two marks on their own channels instead of letting the row verdict repaint the card", () => {
    // T84：「本件装着来源没要的」这件事原来还挂着一道「这一栏 state === "different"」，
    // 于是同一个事实在「符合」栏里静默、在「不符」栏里又变红又打叉——用户看到的就是
    // 「当前启用」有两种样子。现在判据只读卡片自己的事实（`!hit && active`），
    // 环只表示「当前启用」、不跟着染红；颜色只是加强，形状（叉）才是那条不许丢的通道。
    const detail = readFileSync(join(repoRoot, "packages", "ui", "src", "item-detail", "weapon", "WeaponDetailContent.tsx"), "utf8");
    const mismatch = detail.match(/mismatch=\{[^}]*\}/g) ?? [];
    expect(mismatch, "事实层不再判定「本件装着来源没要的」").toHaveLength(1);
    expect(mismatch[0], "判据不再只看卡片自己的事实").toContain("candidate.hit !== true && candidate.active === true");
    expect(mismatch[0], "「本件装着来源没要的」又被该栏的符合 / 不符结论门控了").not.toContain("state");

    // 两列表头各有一句图例，两处必须说同一句话：一处改了另一处没改，读到的规则就取决于屏幕多宽。
    expect(detail.match(/环＝当前启用，叉＝来源没要/g)?.length ?? 0, "两列表头图例只剩一处，或者两处说了两套话").toBe(2);
    expect(detail, "图例又把环说成了对错信号").not.toContain("红环");

    // 「当前启用」那枚环只有一支颜色：任何一条着色规则都不许在 data-mismatch 上把它染成错误色。
    const perkCss = readFileSync(join(repoRoot, "packages", "ui", "src", "styles", "components", "09-weapon-detail.css"), "utf8");
    const mismatchRules = [...perkCss.matchAll(/[^{}]*\[data-mismatch="true"\][^{}]*\{[^}]*\}/g)].map((match) => match[0]);
    expect(mismatchRules, "找不到任何一条 mismatch 规则，后面几句会白过").not.toHaveLength(0);
    for (const rule of mismatchRules) {
      expect(rule, "环跟着 mismatch 染了红，「当前启用」又变回两种样子").not.toContain("weapon-detail-perk-entry-active");
      expect(rule, "mismatch 不再只是把状态词变红").toContain("--status-error");
    }
  });

  it("keeps the perk popover above the source card's sticky column head and under the section tabs", () => {
    // T85：说明浮层是从卡片**往上**开的，第一行卡片的浮层必然跨过来源卡顶部那条吸附栏头。
    // 条目原来和栏头同层（条目 9 < 栏头 10），不透明的栏头就把浮层从中间切掉——实窗看到的是
    // 浮层被切成上下两截、中间横穿一条图例。现在三层分家：页签 > 悬停卡片与浮层 > 栏头 > 静态内容。
    const css = readFileSync(join(repoRoot, "packages", "ui", "src", "styles", "components", "09-weapon-detail.css"), "utf8");
    const zIndexOf = (selector: string) => {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const value = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{[^}]*?z-index:\\s*([^;]+);`))?.[1]?.trim() ?? "";
      expect(value, `找不到 ${selector} 的 z-index，后面几句会白过`).not.toBe("");
      return value;
    };
    expect(zIndexOf(".weapon-detail-nav"), "章节页签不再是最高一层").toBe("calc(var(--layer-sticky) + 1)");
    expect(zIndexOf('.weapon-detail-perk-entry[data-open="true"]'), "悬停 / 打开的条目不再抬到栏头之上，浮层会被栏头切掉").toBe("calc(var(--layer-sticky) - 1)");
    expect(zIndexOf(".weapon-detail-source-slot-columns"), "吸附栏头又回到了悬停条目那一层").toBe("calc(var(--layer-sticky) - 2)");
  });

  it("keeps the source row's two scopes written by one shared sentence", () => {
    // Bug #98：来源行原来并排摆着「1679 条规则 / 422 把武器 · 当前账号影响 305 件」，
    // 加上左侧清单那个仓库口径的数字，四个数字四种口径、页面上一个字都没解释。
    // 现在每行三句：规则数、这份来源点名的武器数（「列出 N 把武器」）、
    // 对你的影响两个范围并排（「仓库 N 件 / 全账号 M 件」）——两个数同源算出，
    // 用户拿左边清单的数能在行上找到同一句话。
    // 三句而不是两句是排版量出来的：「1679 条规则 · 列出 422 把武器」实测 198px、
    // 数字栏定宽 210px，只剩 12px，规则数一上万就把「武器」挤到下一行。
    // 这块标记在两个面板里各有一份（管理页一份、数据面板一份），所以按住「两处都调同一个函数」：
    // 各拼各的句子迟早会漂开，而漂开的时候没人会同时打开两个面板对照（Bug #91 的两份清单）。
    // 几句的定义各自只有一份——不是「VaultWishlistManager 里有一份」。
    // 第二个副本无论在哪个文件里，都说明有人开始各写各的了。
    const definitions = sourceFilesUnder([join("packages", "ui", "src")])
      .map((file) => readFileSync(join(repoRoot, file), "utf8"))
      .join("\n")
      .match(/^export function managedSource(?:Rule|Weapon|Scale|Impact)Label\(\s*copy: VaultCopy,/gm) ?? [];
    expect(definitions, "共用的来源行文案函数必须各只有一份定义").toHaveLength(4);

    for (const panel of ["VaultRecommendationSourceManager.tsx", "VaultWishlistManager.tsx"]) {
      const source = readFileSync(join(repoRoot, "packages", "ui", "src", "vault", panel), "utf8");
      // 按行锚定「说明与那几行数字是同一处」：只断言「文件里出现过 title=…」会被详情弹框标题
      // 那一处蒙混过去——行上不挂了它照样绿（这一条第一版就是这么写的，改坏没杀掉）。
      expect(source, `${panel} 的计数行没挂悬停说明`).toMatch(
        /title=\{managedSourceCountsTitle\(copy\)\}><b>\{managedSourceRuleLabel\(copy, source\)\}<\/b><small>\{managedSourceWeaponLabel\(copy, source\)\}<\/small><small>\{managedSourceImpactLabel\(copy, source\)\}<\/small>/
      );
      // 行上必须用拆开的短句，不能图省事把弹框标题那句拼回来的长句塞进定宽的数字栏——
      // 那正是「上万条规则就把「武器」挤到下一行」那一版（也是这一条守卫上一版没按住的）。
      expect(source, `${panel} 的数字栏又用了一句长的`).not.toContain("<b>{managedSourceScaleLabel(copy, source)}</b>");
      // 旧写法（一个数、且不提范围）不许再拼出来——它正是「292 和 305 对不上」那一版。
      expect(source, `${panel} 又自己拼了来源行文案`).not.toContain("把武器 · 当前账号影响");
    }

    // 详情弹框标题也是同一套说法，不是只有列表行这么写；那儿不设宽度，可以用拼好的长句。
    const sourceManager = readFileSync(join(repoRoot, "packages", "ui", "src", "vault", "VaultRecommendationSourceManager.tsx"), "utf8");
    expect(sourceManager).toMatch(
      /title=\{managedSourceCountsTitle\(copy\)\}>\{managedSourceMetaLabel\(copy, props\.source\)\} · \{managedSourceScaleLabel\(copy, props\.source\)\}/
    );

    // 新加的这个数也要进「要不要换掉旧数组」那份手写清单：漏了它，行还渲染、数字却是上一次的——
    // 又是「屏幕上的数说不出它是哪来的」。比较函数自己只认显式列出的字段，所以这里按住那一行。
    const pageView = readFileSync(join(repoRoot, "packages", "ui", "src", "vault", "VaultPageContentView.tsx"), "utf8");
    expect(pageView).toMatch(/^\s*&& candidate\.vault_instance_count === source\.vault_instance_count$/m);
  });

  it("keeps the source row's two scopes counted from one traversal", () => {
    // 行上那两个数分别来自哪张表：说反了（仓库数取全账号、全账号数取仓库）行上就是两句假话，
    // 而且两个数仍然「看着都对」。这一层要起 Electron 才跑得到，所以按住这两行本身。
    const communityIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "community.ts"), "utf8");
    expect(communityIpc).toMatch(/^\s*affectedInstanceCount \+= counts\.account\.get\(itemHash\) \?\? 0;$/m);
    expect(communityIpc).toMatch(/^\s*vaultInstanceCount \+= counts\.vault\.get\(itemHash\) \?\? 0;$/m);
    // 两张表由 core 的同一次遍历给出（全账号 = 仓库 + 角色侧）；这里再数一遍就会各数各的。
    expect(communityIpc).toContain("countAccountItemHashes(account)");
    expect(communityIpc).not.toContain("flatMap((character)");
  });

  it("keeps the deleted bulk-clear channel deleted", () => {
    // Bug #100：导入区那个「移除全部来源」按钮说得比做得多——写着「全部」，走的却是
    // 「只清愿望单文本那一类导入」的通道，有推荐表格在场时就是「说 3 份删 1 份」。
    // 按钮、动作、IPC 通道、服务函数已整条删除；任何一环回来都等于又开一条没人走的路，
    // 或者那个按钮又长回来了（它回来时上面那三处又会复活，所以三处一起按住）。
    const files = sourceFilesUnder(["packages"]);
    const offenders = files.flatMap((file) => {
      const source = readFileSync(join(repoRoot, file), "utf8");
      return ["clearDimWishlist", "wishlist:clear"].filter((needle) => source.includes(needle))
        .map((needle) => `${file}：${needle}`);
    });
    expect(offenders).toEqual([]);
    // 扫描本身有效：它确实走到了实现文件，而不是一个空列表。
    expect(files).toContain(join("packages", "desktop", "src", "main", "ipc", "wishlist.ts"));

    const wishlistManager = readFileSync(join(repoRoot, "packages", "ui", "src", "vault", "VaultWishlistManager.tsx"), "utf8");
    for (const residue of ["移除全部来源", "isConfirmingClear", "dim-clear"]) {
      expect(wishlistManager, `导入区整份清空入口的残留：${residue}`).not.toContain(residue);
    }
  });

  it("keeps the account page out of the wishlist prop chain", () => {
    // Bug #101：账号页曾对外声明收一份「愿望单」，上层每次渲染都把它算出来传进去，而它一次都没读过。
    // 这条属性回头就等于又开一条没人走的路：下一个读代码的人会以为账号页在这一层拿到了这份数据，
    // 要加相关内容时也会误以为数据已经在手。
    const accountPage = readFileSync(join(repoRoot, "packages", "desktop", "src", "renderer", "features", "account", "AccountPage.tsx"), "utf8");
    // 扫描本身有效：这确实是账号页那份文件，不是读到空串。
    expect(accountPage).toContain("recommendationCardSummary");
    expect(accountPage).not.toMatch(/wishlist/i);

    const provider = readFileSync(join(repoRoot, "packages", "desktop", "src", "renderer", "pages", "providers", "AccountMenuProvider.tsx"), "utf8");
    expect(provider).toContain("<AccountPage");
    expect(provider).not.toMatch(/wishlist/i);
  });

  it("keeps the wishlist row's column judgment single-valued", () => {
    // Bug #102：perk 可能同时出现在这把枪两个特长栏的掉落池里。从前它带着一组候选栏位
    // （`slot_candidates`）往下走，判成「跨栏无法唯一归栏」（`cross_slot_ambiguous`）后
    // 导入期把**整行**丢掉——作者写明的候选从「任选其一」里静默消失，整把枪只有一行规则时
    // 更是整把消失。现在归栏按作者书写的栏位顺序消歧，只有一个结果，这一档不存在了。
    //
    // 这三个名字回来就是那条路又开了：只要还有「归不了栏」这个状态，下游迟早会再写一次
    // 「拿不准就丢」。所以按住名字本身，而不是按住某个调用点——丢行的地方可以搬走。
    const files = sourceFilesUnder(["packages"]);
    const offenders = files.flatMap((file) => {
      const source = readFileSync(join(repoRoot, file), "utf8");
      return ["cross_slot_ambiguous", "ambiguous_slot", "slot_candidates"]
        .filter((needle) => source.includes(needle))
        .map((needle) => `${file}：${needle}`);
    });
    expect(offenders).toEqual([]);
    // 扫描本身有效：它确实走到了那份归栏判定，而不是一个空列表。诊断里仍然保留着
    // `unknown_slot`（「这个 perk 在这把枪的候选里找不到」，与「归不了栏」是两件事），
    // 所以这不是「文件里一个状态名都没有」那种空断言。
    const diagnostics = join("packages", "services", "src", "community", "dimWishlistDiagnostics.ts");
    expect(files).toContain(diagnostics);
    expect(readFileSync(join(repoRoot, diagnostics), "utf8")).toContain("unknown_slot");
  });

  it("keeps every Bungie Platform request affinitized so a write can be read back from the same backend", () => {
    // 背景（T76）：换 Perk 的写接口只冲掉它命中的那台后端的缓存。不回带 Bungie 下发的
    // 粘滞 cookie，随后的读回就可能落到另一台还留着旧副本的后端，界面于是报「写入成功，
    // 但游戏服务返回的仍是旧配置」——写其实已经落地了。
    const client = readFileSync(join(repoRoot, "packages", "services", "src", "bungie", "client.ts"), "utf8");
    const cookies = readFileSync(join(repoRoot, "packages", "services", "src", "bungie", "cookies.ts"), "utf8");
    const mainEntry = readFileSync(join(desktopRoot, "src", "main", "main.ts"), "utf8");
    const publicUrlReader = readFileSync(join(repoRoot, "packages", "services", "src", "net", "publicUrlReader.ts"), "utf8");

    // 捕获与回带必须在**同一个**漏斗里：写入走 actions、读回走 account session，
    // 两处各自构造请求，只接一个入口（或只做一半）与完全不做是一样的。
    expect(client).toContain("getActiveBungieCookieJar()");
    expect(client).toContain('"Cookie": cookieHeader');
    expect(client).toContain("affinity?.capture(response)");
    // `headers.get("set-cookie")` 会把多个 cookie 用 ", " 拼起来，而 Expires 属性里含逗号，
    // 用它必然把一条 cookie 切成两条。
    expect(client).not.toContain('headers.get("set-cookie")');
    expect(cookies).toContain("headers.getSetCookie()");

    // 装配必须发生在组合根：jar 建了但没人 configure，所有请求都看不到它，等于没做。
    expect(mainEntry).toContain("configureBungieCookieJar(");

    // 直连第三方地址的读取路径绝不能拿到 Bungie 的粘滞标识。
    expect(publicUrlReader).not.toContain("cookieJar");
    expect(publicUrlReader).not.toContain("getActiveBungieCookieJar");

    // 亲和性不是用户数据：不进便携备份，也不该被「清理缓存」清掉（清了就丢掉跨重启的粘滞，
    // 而陈旧的值无害——Cloudflare 会忽略或重发）。
    expect(readFileSync(join(desktopRoot, "src", "main", "ipc", "configBackup.ts"), "utf8"))
      .not.toContain("bungie-affinity");
    expect(readFileSync(join(repoRoot, "packages", "services", "src", "cache", "maintenance.ts"), "utf8"))
      .not.toContain("bungie-affinity");
  });

  it("keeps perk writes confirmed by the write call itself, never by a blocking read-back", () => {
    // 背景（T77 / T78）：Bungie 写入的传播延迟实测在受理后 26 秒仍读到旧值、2 分 45 秒读到新值，
    // 上界没测出来。拿十几秒去判「服务器没跟上」就是把正常传播定性成失败——「写入成功，
    // 详情同步失败」这条假报的来源。写接口返回受理时它已经是权威状态（DIM 同样直接采用写接口
    // 的返回，不做读回确认）。
    const modal = readFileSync(
      join(desktopRoot, "src", "renderer", "shared", "components", "ItemDetailModal.tsx"),
      "utf8"
    );
    const workspace = readFileSync(
      join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetailWorkspace.ts"),
      "utf8"
    );
    const detailContent = readFileSync(
      join(repoRoot, "packages", "ui", "src", "item-detail", "weapon", "WeaponDetailContent.tsx"),
      "utf8"
    );
    const detailHook = readFileSync(
      join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetail.ts"),
      "utf8"
    );
    const acceptedStore = readFileSync(
      join(desktopRoot, "src", "renderer", "shared", "stores", "acceptedSocketPlugs.ts"),
      "utf8"
    );

    // 换 Perk 必须走「受理即落地」，否则写成功了界面也不动。
    expect(modal).toContain("acceptedSocketChanges:");
    // 读回只允许以 probe 跑：照旧走网络、照旧留痕，但拿到的旧值不许合并回界面、不许置加载态。
    expect(workspace).toContain('refreshSelectedItemDetail({ mode: "probe" })');
    // 「服务器还没吐回来」不得再被定性成用户可见的失败态。
    expect(detailContent).not.toContain("refresh-error");

    // 受理状态必须活得比弹框久，否则「关掉再打开是旧 Perk」会卷土重来（T78）。
    expect(acceptedStore).toContain("const recordsByInstanceId = new Map");
    // 叠加只发生在读取出口，且探针走的是不叠加的那条（否则探针读回自己叠的值，永远「对上」）。
    expect(detailHook).toContain("withAcceptedSocketPlugs(instanceId, detail)");
    expect(detailHook).toContain("serverTruth: silent");
    // 弹框关闭不得连带清掉受理状态。
    expect(detailHook).not.toMatch(/function closeSelectedItemDetail[\s\S]{0,200}acceptedSocketPlugs/);

    // 面板只说「已提交」。服务器认没认由账号同步说了算，界面没有资格代它宣布「已确认」。
    expect(detailContent).not.toContain("已与服务器确认");
    expect(detailContent).not.toContain('step: "已完成"');
    expect(modal).not.toContain("已与服务器确认");
    expect(workspace).not.toContain("onSettled");
  });

  it("keeps the write response as evidence and the write call as the verdict, with one write in flight", () => {
    // 背景（T80）：主进程 ipc/actions.ts 里另有一条换 Perk 的写路径，它自带一个写后读回裁判，
    // 预算 750ms + 2000ms = 2.75 秒，而实测传播是 3 分 32 秒 —— 只要走到那条重发路就必然把
    // 一次正常写入报成「武器配置未更新 / 需要处理」。触发它的是**重复提交**：用户在一件装备
    // 已有变更在飞时又点了一次「应用」，第二次必然吃 ErrorCode 1679。
    const mainActions = readFileSync(
      join(desktopRoot, "src", "main", "ipc", "actions.ts"),
      "utf8"
    );
    const servicesActions = readFileSync(
      join(repoRoot, "packages", "services", "src", "bungie", "actions.ts"),
      "utf8"
    );
    const modal = readFileSync(
      join(desktopRoot, "src", "renderer", "shared", "components", "ItemDetailModal.tsx"),
      "utf8"
    );
    const detailContent = readFileSync(
      join(repoRoot, "packages", "ui", "src", "item-detail", "weapon", "WeaponDetailContent.tsx"),
      "utf8"
    );

    // 写响应体只当旁证：解析出来、逐槽传上去，解析失败一律回落 null 而不是抛。
    expect(servicesActions).toContain("readSocketPlugWriteOutcome");
    expect(servicesActions).toContain("/Destiny2/Actions/Items/InsertSocketPlugFree/");
    // 主进程不许再挂读回裁判：一旦重新出现「刷新详情 + 比对选中的 plug hash」这条路，
    // 2.75 秒的预算会立刻把正常传播误报成失败。（注释里留着它的名字是有意为之——那是
    // 这次修复的来历，所以比对前先把注释剥掉，只查活代码。）
    const mainActionsCode = stripSourceComments(mainActions);
    expect(mainActionsCode).not.toContain("hasAppliedSocketPlug");
    expect(mainActionsCode).not.toContain("hasReusableSocketPlug");
    expect(mainActionsCode).not.toContain("selected_plug");
    // 没被收下的槽位要逐条说出是哪一个，不是只报一个数量——渲染层据此决定哪几条不落地。
    expect(mainActions).toContain("deferred_socket_indexes");

    // 一条都不落地 ≠ 失败：面板必须有独立的中性档，否则只能借 error 档上报（就是这次报错的来源）。
    expect(detailContent).toContain('"deferred"');
    expect(modal).toContain("outcome.deferred");

    // 重入闸：一次只能有一个写操作在飞。少了它，连点两次「应用」第二次必然 1679。
    expect(modal).toMatch(/applyPendingPerks: async \(\) => \{[\s\S]{0,400}props\.isRunningItemAction\) return;/);
  });

});

// 处理程序的正文：从它的注册处到下一个注册处。用例据此断言「这一段里调了什么」，
// 而不是整份文件里出现过某个名字——后者会被另一个处理程序里的同名调用蒙混过去。
function wishlistHandlerBody(source: string, handler: string): string {
  const start = source.indexOf(`ipcMain.handle("${handler}"`);
  if (start < 0) throw new Error(`找不到处理程序：${handler}`);
  const next = source.indexOf("ipcMain.handle(", start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}

/** 剥掉注释，只留活代码。用于「某个符号不许再出现在实现里，但注释里可以留作来历」这类断言。 */
function stripSourceComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/** 运行时代码（各包的 src 目录）：不含 dist、node_modules 与测试目录。 */
function sourceFilesUnder(roots: readonly string[]): string[] {
  return roots.flatMap((root) => walkSource(join(repoRoot, root)));
}

function walkSource(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "dist" || entry.name === "node_modules" || entry.name === "test") return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walkSource(path);
    return /\.tsx?$/.test(entry.name) ? [relative(repoRoot, path)] : [];
  });
}

/** 样式文件：`packages/ui/src/styles` 下的全部 .css。 */
function walkCss(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walkCss(path);
    return /\.css$/.test(entry.name) ? [path] : [];
  });
}
