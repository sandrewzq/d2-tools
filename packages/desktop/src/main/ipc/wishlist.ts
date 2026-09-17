import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { dialog, ipcMain } from "electron";
import {
  parseDimWishlistWithIssues,
  type DimWishlist,
  type DimWishlistImportPreview,
  type DimWishlistLinkReadResult,
  type DimWishlistMode
} from "@d2-tools/core/analysis/wishlistImport";
import type { SourceOptions } from "@d2-tools/core/community-perks";
import {
  loadDimWishlist,
  saveDimWishlist,
  saveDimWishlistFromSource
} from "@d2-tools/services/analysis/wishlistStore";
import {
  findRecommendationDocumentBySourceUrl,
  listRecommendationDocuments,
  type RecommendationImportMode
} from "@d2-tools/services/community/recommendationDocumentStore";
import { downloadDimWishlistLink } from "@d2-tools/services/community/dimWishlistLinkSource";
import {
  collectWeaponRecommendationPlugHashes,
  collectWeaponRecommendationPlugSetHashes
} from "@d2-tools/services/community/weaponRecommendationKnowledge";
import {
  filterDimWishlistForImport,
  type DimWishlistImportFilterResult
} from "@d2-tools/services/community/dimWishlistValidation";
import { loadConfig } from "@d2-tools/services/config/store";
import { getDefinitions } from "../runtime/gameDataRuntime.js";
import { advanceRecommendationMatchCacheRevision } from "./community.js";
import { removeDimWishlistEquipmentTargets } from "./targets.js";

const maximumWishlistBytes = 128 * 1024 * 1024;

/**
 * 待确认的导入。**两条来路共用这一张表**：本地文件记文件路径，链接记下载下来的临时文件，
 * 确认时都按同一套流程重读、重解析、重校验——不因为文本从哪来而分岔。
 */
type PendingWishlistImport = {
  data_dir: string;
  path: string;
  fingerprint: string;
  origin: "file" | "url";
  source_url?: string;
  revision?: string;
};

const pendingWishlistImports = new Map<string, PendingWishlistImport>();

export function registerWishlistIpcHandlers(): void {
  ipcMain.handle("wishlist:import:select", async (): Promise<DimWishlistImportPreview | null> => {
    const config = loadConfig();
    const result = await dialog.showOpenDialog({
      title: "选择愿望单文本文件",
      defaultPath: config.data.data_dir,
      properties: ["openFile"],
      filters: [{ name: "愿望单文本", extensions: ["txt", "wishlist"] }]
    });
    const path = result.filePaths[0];
    if (result.canceled || !path) return null;

    const text = await readWishlistFile(path);
    const parsed = parseDimWishlistWithIssues(text);
    if (parsed.wishlist.rules.length === 0) {
      throw new Error("文件里没有识别到有效的愿望单规则。");
    }
    const filtered = await filterWishlist(parsed.wishlist, parsed.issues);
    if (filtered.wishlist.rules.length === 0) {
      throw new Error("文件里的规则都通不过校验，没有可导入的内容。");
    }
    const fingerprint = fingerprintText(text);
    await clearPendingWishlistImports();
    const token = randomUUID();
    pendingWishlistImports.set(token, {
      data_dir: resolve(config.data.data_dir),
      path,
      fingerprint,
      origin: "file"
    });
    return buildWishlistPreview(token, basename(path), parsed.wishlist, filtered, fingerprint);
  });

  /**
   * 从用户给的链接读一份愿望单。走的是与本地文件**完全相同**的解析 / 校验 / 预览，
   * 只是文本换成下载来的；确认时按链接来源落库，以后可以再同步。
   */
  ipcMain.handle("wishlist:url:read", async (_event, url: string): Promise<DimWishlistLinkReadResult> => {
    const config = loadConfig();
    const download = await downloadDimWishlistLink(url);
    const existing = findRecommendationDocumentBySourceUrl(config.data.data_dir, download.source_url);
    if (existing && existing.fingerprint === download.fingerprint) {
      return {
        unchanged: true,
        source_url: download.source_url,
        source_name: existing.title,
        preview: null
      };
    }

    const parsed = parseDimWishlistWithIssues(download.text);
    if (parsed.wishlist.rules.length === 0) {
      throw new Error("链接指向的文本里没有识别到有效的愿望单规则，当前推荐数据没有改动。");
    }
    const filtered = await filterWishlist(parsed.wishlist, parsed.issues);
    if (filtered.wishlist.rules.length === 0) {
      throw new Error("链接指向的文本里的规则都通不过校验，当前推荐数据没有改动。");
    }
    await clearPendingWishlistImports();
    const token = randomUUID();
    const directory = join(config.data.data_dir, "tmp", "wishlist-links");
    const path = join(directory, `${token}.txt`);
    await mkdir(directory, { recursive: true });
    await writeFile(path, download.text, "utf8");
    pendingWishlistImports.set(token, {
      data_dir: resolve(config.data.data_dir),
      path,
      fingerprint: download.fingerprint,
      origin: "url",
      source_url: download.source_url,
      revision: download.revision
    });
    return {
      unchanged: false,
      source_url: download.source_url,
      source_name: existing?.title ?? "",
      preview: {
        ...buildWishlistPreview(token, download.file_name, parsed.wishlist, filtered, download.fingerprint),
        source_url: download.source_url,
        final_url: download.final_url
      }
    };
  });

  ipcMain.handle("wishlist:import:confirm", async (_event, token: string, input: WishlistImportInput) => {
    const pending = pendingWishlistImports.get(token);
    if (!pending || pending.data_dir !== resolve(loadConfig().data.data_dir)) {
      throw new Error("愿望单预览已失效，请重新读取。");
    }
    pendingWishlistImports.delete(token);
    if (pending.origin === "url") await clearPendingWishlistImports();

    try {
      const text = await readWishlistFile(pending.path);
      if (fingerprintText(text) !== pending.fingerprint) {
        throw new Error("愿望单内容在预览后发生了变化，请重新读取。");
      }
      const parsed = parseDimWishlistWithIssues(text);
      if (parsed.wishlist.rules.length === 0) {
        throw new Error("文件里没有识别到有效的愿望单规则。");
      }
      // 落库的一定是**校验后**的规则，且与预览用的是同一个函数：预览说跳过几行，写进去的就是跳过的结果。
      // 这里重算一遍而不是复用预览结果——内容已按指纹核对过，但定义池可能刚更新过，以写入时刻为准。
      const filtered = await filterWishlist(parsed.wishlist, parsed.issues);
      if (filtered.wishlist.rules.length === 0) {
        throw new Error("文件里的规则都通不过校验，没有可导入的内容。");
      }
      const config = loadConfig();
      const before = dimWishlistItemHashes(config.data.data_dir);
      const saved = pending.origin === "url" && pending.source_url
        ? saveDimWishlistFromSource(config.data.data_dir, filtered.wishlist, {
          name: input.name,
          mode: input.mode,
          source_url: pending.source_url,
          revision: pending.revision ?? "",
          source_fingerprint: pending.fingerprint
        })
        : saveDimWishlist(config.data.data_dir, filtered.wishlist, {
          name: input.name,
          mode: input.mode,
          origin: "file"
        });
      invalidateDimWishlistMatches(config.data.data_dir, before, dimWishlistItemHashes(config.data.data_dir));
      await removeDimWishlistEquipmentTargets(config.data.data_dir).catch(() => undefined);
      return saved;
    } finally {
      // 链接下载来的临时文件用完即删，不留在用户目录里。
      if (pending.origin === "url") await rm(pending.path, { force: true }).catch(() => undefined);
    }
  });

  ipcMain.handle("wishlist:get", () => {
    const config = loadConfig();
    return loadDimWishlist(config.data.data_dir);
  });

  // 「已导入来源」是跨格式的单一名字空间：名字清单决定冲突判断与覆盖对象，
  // 所以列全部文档，不按格式过滤（T56：格式差异止步于各自的适配器）。
  // 只读：清单的展示与逐份删除都在来源管理面（`community:management:*`）完成。
  ipcMain.handle("recommendation:documents:list", () => {
    const config = loadConfig();
    return listRecommendationDocuments(config.data.data_dir);
  });
}

// 导入身份 = 用户命名的来源名；新建与覆盖是两个显式动作，不存在默认路径。
type WishlistImportInput = { name: string; mode: RecommendationImportMode };

// 愿望单增删改后，对应武器的匹配缓存必须失效，否则已删除的来源仍会出现在仓库与详情里。
function dimWishlistItemHashes(dataDir: string): number[] {
  try {
    return (loadDimWishlist(dataDir)?.rules ?? []).map((rule) => rule.item_hash);
  } catch {
    return [];
  }
}

function invalidateDimWishlistMatches(dataDir: string, before: readonly number[], after: readonly number[]): void {
  advanceRecommendationMatchCacheRevision(dataDir, [...new Set([...before, ...after])]);
}

async function readWishlistFile(path: string): Promise<string> {
  if ((await stat(path)).size > maximumWishlistBytes) {
    throw new Error("愿望单文本超过 128 MB，未读取。");
  }
  return readFile(path, "utf8");
}

function fingerprintText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

async function clearPendingWishlistImports(): Promise<void> {
  const previous = [...pendingWishlistImports.values()];
  pendingWishlistImports.clear();
  await Promise.all(previous
    .filter((entry) => entry.origin === "url")
    .map((entry) => rm(entry.path, { force: true }).catch(() => undefined)));
}

function buildWishlistPreview(
  token: string,
  fileName: string,
  wishlist: DimWishlist,
  filtered: DimWishlistImportFilterResult,
  fingerprint: string
): DimWishlistImportPreview {
  const modeCounts: Record<DimWishlistMode, number> = { pve: 0, pvp: 0, general: 0 };
  for (const rule of wishlist.rules) modeCounts[rule.mode] += 1;
  return {
    token,
    file_name: fileName,
    title: wishlist.title,
    // 文件口径的统计（用户看到的「这份文件写了多少」）与导入口径的统计（「实际会写进去多少」）都给，
    // 两者不同时用户能一眼看出差值全在被忽略的行上。
    rule_count: wishlist.rules.length,
    weapon_count: new Set(wishlist.rules.map((rule) => rule.item_hash)).size,
    mode_counts: modeCounts,
    authors: [...new Set([
      wishlist.author,
      ...(wishlist.source_blocks ?? []).map((block) => block.author),
      ...wishlist.rules.map((rule) => rule.author)
    ].filter((value): value is string => Boolean(value)))],
    tags: [...new Set([
      ...(wishlist.source_blocks ?? []).flatMap((block) => block.tags ?? []),
      ...wishlist.rules.flatMap((rule) => rule.tags ?? [])
    ])],
    fingerprint,
    importable_rule_count: filtered.wishlist.rules.length,
    importable_weapon_count: new Set(filtered.wishlist.rules.map((rule) => rule.item_hash)).size,
    skipped_row_count: filtered.skipped_row_count,
    affected_weapon_count: filtered.affected_weapon_count,
    skipped_weapon_count: filtered.skipped_weapon_count,
    merged_row_count: filtered.merged_row_count,
    merged_weapon_count: filtered.merged_weapon_count,
    issues: filtered.issues,
    issue_count: filtered.issue_count
  };
}

/**
 * 导入期校验：按行跳过写错的规则，其余照常。
 *
 * 校验要读官方定义池（判断 perk 落哪一栏），而**拿不到定义池时不能把导入卡住**——
 * 用户没有资料库时也要能导入。所以装载失败一律退回空定义池：
 * 目录为空时校验器只放行不判定，结果与「只做语法校验」一致。
 */
async function filterWishlist(
  wishlist: DimWishlist,
  parseIssues: Parameters<typeof filterDimWishlistForImport>[0]["parse_issues"]
): Promise<DimWishlistImportFilterResult> {
  return filterDimWishlistForImport({
    wishlist,
    parse_issues: parseIssues,
    options: await loadValidationOptions(wishlist)
  });
}

async function loadValidationOptions(wishlist: DimWishlist): Promise<SourceOptions> {
  try {
    const weaponHashes = [...new Set(wishlist.rules.map((rule) => rule.item_hash))];
    const perkHashes = [...new Set(wishlist.rules.flatMap((rule) => rule.perk_hashes))];
    // 与人工 CSV 导入同一条装载路径：武器定义 + 它插槽里能到达的全部插件。
    // 少给一层（比如只给规则里写到的 perk），候选目录就展不出来，每行都会被误判成「perk 查不到」。
    const weaponDefinitions = await getDefinitions(
      "DestinyInventoryItemDefinition",
      [...weaponHashes, ...perkHashes],
      { projection: "community-match" }
    );
    const plugSetDefinitions = await getDefinitions(
      "DestinyPlugSetDefinition",
      collectWeaponRecommendationPlugSetHashes(weaponDefinitions),
      { projection: "community-match" }
    );
    const plugDefinitions = await getDefinitions(
      "DestinyInventoryItemDefinition",
      collectWeaponRecommendationPlugHashes(weaponDefinitions, plugSetDefinitions),
      { projection: "community-match" }
    );
    return {
      itemDefinitions: { ...weaponDefinitions, ...plugDefinitions },
      plugSetDefinitions
    };
  } catch {
    return {};
  }
}
