import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  parseDimWishlist,
  type DimWishlist,
  type DimWishlistMode
} from "@d2-tools/core/analysis/wishlistImport";
import { loadDimWishlist, saveDimWishlistFromSource } from "../analysis/wishlistStore.js";
import { loadExternalRecommendationSet } from "./externalRecommendationStore.js";
import {
  openRecommendationDatabase,
  recommendationMetadataValue,
  writeRecommendationMetadata
} from "./recommendationDatabase.js";

const repositoryUrl = "https://github.com/48klocs/dim-wish-list-sources";
const commitsApiUrl = "https://api.github.com/repos/48klocs/dim-wish-list-sources/commits?path=voltron.txt&per_page=1";
const contentsApiBaseUrl = "https://api.github.com/repos/48klocs/dim-wish-list-sources/contents/voltron.txt";
const maximumWishlistBytes = 128 * 1024 * 1024;
const commitResponseLimit = 1 * 1024 * 1024;
const commitRequestTimeoutMs = 30_000;
const wishlistRequestTimeoutMs = 180_000;
const metadataKeys = {
  etag: "dim_github_commit_etag",
  checkedAt: "dim_github_checked_at",
  latestRevision: "dim_github_latest_revision",
  latestCommitAt: "dim_github_latest_commit_at"
} as const;

export type DimWishlistOnlineStatus = {
  source_url: string;
  current_revision: string;
  current_fingerprint: string;
  activated_at: string;
  checked_at: string;
  latest_revision: string;
  latest_commit_at: string;
  rule_count: number;
  weapon_count: number;
};

export type DimWishlistOnlinePreview = DimWishlistOnlineStatus & {
  token?: string;
  update_available: boolean;
  file_name: string;
  title: string;
  preview_fingerprint: string;
  mode_counts: Record<DimWishlistMode, number>;
  authors: string[];
  tags: string[];
};

export type DimWishlistOnlineActivationResult = {
  wishlist: DimWishlist;
  status: DimWishlistOnlineStatus;
};

type PendingOnlineUpdate = {
  data_dir: string;
  path: string;
  fingerprint: string;
  revision: string;
};

type LatestCommit = {
  revision: string;
  committed_at: string;
};

const pendingOnlineUpdates = new Map<string, PendingOnlineUpdate>();

export function readDimWishlistOnlineStatus(dataDir: string): DimWishlistOnlineStatus {
  loadDimWishlist(dataDir);
  const current = loadExternalRecommendationSet(dataDir, "dim_wishlist");
  return buildOnlineStatus(dataDir, current);
}

function buildOnlineStatus(
  dataDir: string,
  current: ReturnType<typeof loadExternalRecommendationSet>
): DimWishlistOnlineStatus {
  const database = openRecommendationDatabase(dataDir);
  try {
    return {
      source_url: current?.source_url || repositoryUrl,
      current_revision: current?.revision ?? "",
      current_fingerprint: current?.source_fingerprint ?? "",
      activated_at: current?.imported_at ?? "",
      checked_at: recommendationMetadataValue(database, metadataKeys.checkedAt),
      latest_revision: recommendationMetadataValue(database, metadataKeys.latestRevision),
      latest_commit_at: recommendationMetadataValue(database, metadataKeys.latestCommitAt),
      rule_count: current?.rules.length ?? 0,
      weapon_count: new Set(current?.rules.map((rule) => rule.item_hash) ?? []).size
    };
  } finally {
    database.close();
  }
}

export async function previewDimWishlistOnlineUpdate(
  dataDir: string,
  now = new Date()
): Promise<DimWishlistOnlinePreview> {
  if (!Number.isFinite(now.getTime())) throw new Error("DIM 社区推荐检查时间无效。");
  loadDimWishlist(dataDir);
  const checkedAt = now.toISOString();
  const latest = await fetchLatestCommit(dataDir, checkedAt);
  const current = loadExternalRecommendationSet(dataDir, "dim_wishlist");

  if (current?.revision === latest.revision) {
    return buildPreview({
      status: buildOnlineStatus(dataDir, current),
      wishlist: externalSetAsWishlist(current),
      fingerprint: current.source_fingerprint,
      updateAvailable: false
    });
  }

  const text = await downloadWishlistAtRevision(latest.revision);
  const wishlist = parseDimWishlist(text);
  if (wishlist.rules.length === 0) {
    throw new Error("DIM 上游文件中没有识别到有效的 Wishlist 规则，当前数据未更改。");
  }
  const fingerprint = createHash("sha256").update(text).digest("hex");
  await clearPendingOnlineUpdates();
  const token = randomUUID();
  const directory = join(dataDir, "tmp", "recommendation-updates");
  const path = join(directory, `${token}.wishlist`);
  await mkdir(directory, { recursive: true });
  await writeFile(path, text, "utf8");
  pendingOnlineUpdates.set(token, {
    data_dir: resolve(dataDir),
    path,
    fingerprint,
    revision: latest.revision
  });

  return buildPreview({
    status: buildOnlineStatus(dataDir, current),
    wishlist,
    fingerprint,
    updateAvailable: true,
    token
  });
}

export async function activateDimWishlistOnlineUpdate(
  dataDir: string,
  token: string,
  now = new Date()
): Promise<DimWishlistOnlineActivationResult> {
  const pending = pendingOnlineUpdates.get(token);
  if (!pending || pending.data_dir !== resolve(dataDir)) {
    throw new Error("DIM 在线更新预览已失效，请重新检查更新。");
  }
  pendingOnlineUpdates.delete(token);
  if (!Number.isFinite(now.getTime())) throw new Error("DIM 社区推荐激活时间无效。");

  try {
    if ((await stat(pending.path)).size > maximumWishlistBytes) {
      throw new Error("DIM 在线更新临时文件超过 128 MB，当前数据未更改。");
    }
    const text = await readFile(pending.path, "utf8");
    if (createHash("sha256").update(text).digest("hex") !== pending.fingerprint) {
      throw new Error("DIM 在线更新文件在预览后发生了变化，请重新检查更新。");
    }
    const wishlist = parseDimWishlist(text);
    if (wishlist.rules.length === 0) {
      throw new Error("DIM 在线更新文件中没有有效规则，当前数据未更改。");
    }
    const saved = saveDimWishlistFromSource(dataDir, wishlist, {
      source_url: repositoryUrl,
      revision: pending.revision,
      imported_at: now.toISOString(),
      source_fingerprint: pending.fingerprint
    });
    return {
      wishlist: saved,
      status: readDimWishlistOnlineStatus(dataDir)
    };
  } finally {
    await rm(pending.path, { force: true }).catch(() => undefined);
  }
}

async function fetchLatestCommit(dataDir: string, checkedAt: string): Promise<LatestCommit> {
  const database = openRecommendationDatabase(dataDir);
  let etag = "";
  let cachedRevision = "";
  let cachedCommitAt = "";
  try {
    etag = recommendationMetadataValue(database, metadataKeys.etag);
    cachedRevision = recommendationMetadataValue(database, metadataKeys.latestRevision);
    cachedCommitAt = recommendationMetadataValue(database, metadataKeys.latestCommitAt);
  } finally {
    database.close();
  }

  const request = async (useEtag: boolean): Promise<Response> => {
    try {
      return await fetch(commitsApiUrl, {
        headers: githubHeaders(useEtag ? etag : ""),
        signal: AbortSignal.timeout(commitRequestTimeoutMs)
      });
    } catch (error) {
      throw new Error(`无法检查 DIM 社区推荐更新：${errorMessage(error)}。当前推荐数据仍可继续使用。`);
    }
  };

  let response = await request(Boolean(etag));
  if (response.status === 304 && !cachedRevision) response = await request(false);
  if (response.status === 304) {
    writeCheckMetadata(dataDir, {
      checkedAt,
      latestRevision: cachedRevision,
      latestCommitAt: cachedCommitAt
    });
    return { revision: cachedRevision, committed_at: cachedCommitAt };
  }
  if (!response.ok) throw githubResponseError(response, "检查 DIM 社区推荐更新");

  const body = await readLimitedResponseText(response, commitResponseLimit, "DIM GitHub 版本响应");
  let payload: unknown;
  try {
    payload = JSON.parse(body) as unknown;
  } catch {
    throw new Error("DIM GitHub 版本响应不是有效 JSON，当前推荐数据未更改。");
  }
  const entry = Array.isArray(payload) ? payload[0] : undefined;
  const revision = readNestedString(entry, ["sha"]);
  const committedAt = readNestedString(entry, ["commit", "committer", "date"])
    || readNestedString(entry, ["commit", "author", "date"]);
  if (!/^[a-f0-9]{40}$/i.test(revision)) {
    throw new Error("DIM GitHub 没有返回有效的 commit SHA，当前推荐数据未更改。");
  }
  writeCheckMetadata(dataDir, {
    etag: response.headers.get("etag") ?? "",
    checkedAt,
    latestRevision: revision,
    latestCommitAt: committedAt
  });
  return { revision, committed_at: committedAt };
}

async function downloadWishlistAtRevision(revision: string): Promise<string> {
  const url = new URL(contentsApiBaseUrl);
  url.searchParams.set("ref", revision);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        ...githubHeaders(),
        Accept: "application/vnd.github.raw+json"
      },
      signal: AbortSignal.timeout(wishlistRequestTimeoutMs)
    });
  } catch (error) {
    throw new Error(`DIM 社区推荐下载失败：${errorMessage(error)}。当前推荐数据仍可继续使用，也可以改用本地文件导入。`);
  }
  if (!response.ok) throw githubResponseError(response, "下载 DIM 社区推荐");
  try {
    return await readLimitedResponseText(response, maximumWishlistBytes, "DIM 社区推荐文件");
  } catch (error) {
    const message = errorMessage(error);
    if (message.includes("当前推荐数据未更改")) throw error;
    throw new Error(`DIM 社区推荐下载失败：${message}。当前推荐数据仍可继续使用，也可以改用本地文件导入。`);
  }
}

function buildPreview(input: {
  status: DimWishlistOnlineStatus;
  wishlist: DimWishlist;
  fingerprint: string;
  updateAvailable: boolean;
  token?: string;
}): DimWishlistOnlinePreview {
  const modeCounts: Record<DimWishlistMode, number> = { pve: 0, pvp: 0, general: 0 };
  for (const rule of input.wishlist.rules) modeCounts[rule.mode] += 1;
  return {
    ...input.status,
    ...(input.token ? { token: input.token } : {}),
    update_available: input.updateAvailable,
    file_name: "voltron.txt",
    title: input.wishlist.title,
    preview_fingerprint: input.fingerprint,
    rule_count: input.wishlist.rules.length,
    weapon_count: new Set(input.wishlist.rules.map((rule) => rule.item_hash)).size,
    mode_counts: modeCounts,
    authors: [...new Set([
      input.wishlist.author,
      ...(input.wishlist.source_blocks ?? []).map((block) => block.author),
      ...input.wishlist.rules.map((rule) => rule.author)
    ].filter((value): value is string => Boolean(value)))],
    tags: [...new Set([
      ...(input.wishlist.source_blocks ?? []).flatMap((block) => block.tags ?? []),
      ...input.wishlist.rules.flatMap((rule) => rule.tags ?? [])
    ])]
  };
}

function externalSetAsWishlist(set: NonNullable<ReturnType<typeof loadExternalRecommendationSet>>): DimWishlist {
  return {
    title: set.title || "DIM Wishlist",
    ...(set.description ? { description: set.description } : {}),
    ...(set.author ? { author: set.author } : {}),
    ...(set.blocks.length ? {
      source_blocks: set.blocks.map((block) => ({
        id: block.block_key,
        ...(block.title ? { title: block.title } : {}),
        ...(block.description ? { description: block.description } : {}),
        ...(block.note ? { note: block.note } : {}),
        ...(block.tags.length ? { tags: block.tags } : {}),
        ...(block.author ? { author: block.author } : {})
      }))
    } : {}),
    rules: set.rules.map((rule) => ({
      item_hash: rule.item_hash,
      perk_hashes: rule.perk_hashes,
      mode: rule.mode,
      note: rule.note,
      ...(rule.tags.length ? { tags: rule.tags } : {}),
      ...(rule.author ? { author: rule.author } : {}),
      ...(rule.source_note ? { source_note: rule.source_note } : {}),
      ...(rule.source_title ? { source_title: rule.source_title } : {}),
      ...(rule.source_description ? { source_description: rule.source_description } : {}),
      ...(rule.block_key ? { source_block_id: rule.block_key } : {})
    }))
  };
}

function writeCheckMetadata(dataDir: string, input: {
  etag?: string;
  checkedAt: string;
  latestRevision: string;
  latestCommitAt: string;
}): void {
  const database = openRecommendationDatabase(dataDir);
  database.exec("BEGIN IMMEDIATE;");
  try {
    if (input.etag !== undefined) writeRecommendationMetadata(database, metadataKeys.etag, input.etag);
    writeRecommendationMetadata(database, metadataKeys.checkedAt, input.checkedAt);
    writeRecommendationMetadata(database, metadataKeys.latestRevision, input.latestRevision);
    writeRecommendationMetadata(database, metadataKeys.latestCommitAt, input.latestCommitAt);
    database.exec("COMMIT;");
  } catch (error) {
    try {
      database.exec("ROLLBACK;");
    } catch {
      // 保留原始元数据写入错误。
    }
    throw error;
  } finally {
    database.close();
  }
}

async function clearPendingOnlineUpdates(): Promise<void> {
  const pending = [...pendingOnlineUpdates.values()];
  pendingOnlineUpdates.clear();
  await Promise.all(pending.map((entry) => rm(entry.path, { force: true }).catch(() => undefined)));
}

async function readLimitedResponseText(response: Response, limit: number, label: string): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    await response.body?.cancel();
    throw new Error(`${label}超过 ${formatMegabytes(limit)} MB，当前推荐数据未更改。`);
  }
  if (!response.body) throw new Error(`${label}没有返回正文，当前推荐数据未更改。`);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new Error(`${label}超过 ${formatMegabytes(limit)} MB，当前推荐数据未更改。`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

function githubHeaders(etag = ""): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "d2-tools-dim-wishlist-updater",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(etag ? { "If-None-Match": etag } : {})
  };
}

function githubResponseError(response: Response, action: string): Error {
  if (response.status === 403 || response.status === 429) {
    return new Error(`${action}失败：GitHub 请求受限（HTTP ${response.status}）。当前推荐数据仍可继续使用，请稍后重试或改用本地文件导入。`);
  }
  return new Error(`${action}失败（HTTP ${response.status}）。当前推荐数据仍可继续使用，也可以改用本地文件导入。`);
}

function readNestedString(value: unknown, path: string[]): string {
  let current = value;
  for (const key of path) {
    if (!current || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current.trim() : "";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatMegabytes(bytes: number): number {
  return Math.round(bytes / 1024 / 1024);
}
