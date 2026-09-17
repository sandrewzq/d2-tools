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
