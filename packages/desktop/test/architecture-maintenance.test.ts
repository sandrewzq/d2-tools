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
      "aria-label={`${option.sourceLabel}${formatVaultRecommendationMetricOptionDescription(filterOption.key, filterOption.count)}`}"
    );
    expect(flat).toContain("title={formatVaultRecommendationMetricOptionDescription(filterOption.key, filterOption.count)}");
    expect(descriptionBody.replace(/\s+/g, " ")).toContain("要求 ${required} 项，命中 ${matched} 项，${count} 件");
    // 旧的档位说法（「命中 x/y」）与组标签「perk 命中」拼在一起会念成「perk 命中 命中 1/2」；
    // 那个函数删掉后就别再回来。
    expect(vaultView).not.toContain("formatVaultRecommendationMetricOptionLabel");
    // 可见文字仍是裸的命中档 + 独立数量徽标：分段组左边已经挂着可见标签「perk 命中」。
    expect(chipMarkup.replace(/\s+/g, " ")).toContain(`<span>{filterOption.key === "all" ? "全部" : filterOption.key}</span>`);
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
    expect(wishlistPanel).toMatch(/^\s*<strong>\{preview\.merged_row_count\} 行是展开写法的冗余<\/strong>$/m);
    expect(wishlistPanel).toMatch(/^\s*\{preview\.skipped_row_count\} 行有问题将忽略$/m);
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
      const labels = source.match(/confirmLabel: "[^"]*"/g) ?? [];
      expect(labels.length, `${panel} 里没有找到确认按钮文案`).toBeGreaterThan(0);
      expect(labels.filter((label) => !label.startsWith('confirmLabel: "确认'))).toEqual([]);
    }
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
      .match(/^export function managedSource(?:Rule|Weapon|Scale|Impact)Label\(/gm) ?? [];
    expect(definitions, "共用的来源行文案函数必须各只有一份定义").toHaveLength(4);

    for (const panel of ["VaultRecommendationSourceManager.tsx", "VaultWishlistManager.tsx"]) {
      const source = readFileSync(join(repoRoot, "packages", "ui", "src", "vault", panel), "utf8");
      // 按行锚定「说明与那几行数字是同一处」：只断言「文件里出现过 title=…」会被详情弹框标题
      // 那一处蒙混过去——行上不挂了它照样绿（这一条第一版就是这么写的，改坏没杀掉）。
      expect(source, `${panel} 的计数行没挂悬停说明`).toMatch(
        /title=\{managedSourceCountsTitle\}><b>\{managedSourceRuleLabel\(source\)\}<\/b><small>\{managedSourceWeaponLabel\(source\)\}<\/small><small>\{managedSourceImpactLabel\(source\)\}<\/small>/
      );
      // 行上必须用拆开的短句，不能图省事把弹框标题那句拼回来的长句塞进定宽的数字栏——
      // 那正是「上万条规则就把「武器」挤到下一行」那一版（也是这一条守卫上一版没按住的）。
      expect(source, `${panel} 的数字栏又用了一句长的`).not.toContain("<b>{managedSourceScaleLabel(source)}</b>");
      // 旧写法（一个数、且不提范围）不许再拼出来——它正是「292 和 305 对不上」那一版。
      expect(source, `${panel} 又自己拼了来源行文案`).not.toContain("把武器 · 当前账号影响");
    }

    // 详情弹框标题也是同一套说法，不是只有列表行这么写；那儿不设宽度，可以用拼好的长句。
    const sourceManager = readFileSync(join(repoRoot, "packages", "ui", "src", "vault", "VaultRecommendationSourceManager.tsx"), "utf8");
    expect(sourceManager).toMatch(
      /title=\{managedSourceCountsTitle\}>\{managedSourceMetaLabel\(props\.source\)\} · \{managedSourceScaleLabel\(props\.source\)\}/
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

});

// 处理程序的正文：从它的注册处到下一个注册处。用例据此断言「这一段里调了什么」，
// 而不是整份文件里出现过某个名字——后者会被另一个处理程序里的同名调用蒙混过去。
function wishlistHandlerBody(source: string, handler: string): string {
  const start = source.indexOf(`ipcMain.handle("${handler}"`);
  if (start < 0) throw new Error(`找不到处理程序：${handler}`);
  const next = source.indexOf("ipcMain.handle(", start + 1);
  return source.slice(start, next < 0 ? source.length : next);
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
