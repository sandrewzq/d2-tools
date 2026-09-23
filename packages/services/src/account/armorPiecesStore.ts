import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ArmorPieceSnapshot } from "@d2-tools/core/armor";

/**
 * 护甲规划器的本地棋子缓存。
 *
 * 账号快照刻意省掉了插槽和能量（`AccountItemSnapshot` 把 `sockets` / `armor_energy` 剔掉了），
 * 所以归一化后的 `ArmorPieceSnapshot` 只能从一次联网的完整 profile 里得到 —— 这就是「一定要
 * 联网计算」的由来。这份缓存把那次结果原样留下：同一份账号数据下的下一次「计算」直接读本地。
 *
 * 参考实现：d2-armor-solver 把派生后的护甲数组存 localStorage、算配装全程不联网；DIM 把整份
 * profile 写进 IndexedDB。两者都不在点「优化」时请求 Bungie。
 */
export type CachedArmorPieces = {
  version: 1;
  /** 缓存归属，与 `loadCachedAccountSnapshot` 用同一个账号作用域（OAuth token 的 membership_id）。 */
  account_id: string;
  /** 账号摘要里的 destiny membership id，用于复现 `sources.account` 指纹。 */
  destiny_membership_id: string;
  saved_at: string;
  /** 构建这些棋子时使用的资料库版本，不匹配就作废。 */
  manifest_version?: string;
  ruleset_id: string;
  ruleset_version: number;
  pieces: ArmorPieceSnapshot[];
};

export type ArmorPiecesIdentity = {
  accountId: string;
  manifestVersion?: string;
  rulesetId: string;
  rulesetVersion: number;
};

/**
 * 缓存的有效时长。
 *
 * 求解结果里的装备必须是玩家还可能拥有的。缓存太久会拿早就拆掉的装备继续算 —— 玩家点了
 * 「穿戴」才发现那件已经没了。十分钟足够覆盖一轮反复调参的计算，也不会让账号数据旧到看不出来。
 * 想要更长的新鲜度就得把插槽直接写进账号快照，那是另一件事。
 */
export const armorPiecesMaxAgeMs = 10 * 60_000;

const fileName = "armor-planner-pieces-cache.json";
const saveQueues = new Map<string, Promise<void>>();
let temporarySequence = 0;

export async function loadCachedArmorPieces(
  dataDir: string,
  identity: ArmorPiecesIdentity,
  now = Date.now()
): Promise<CachedArmorPieces | null> {
  try {
    const parsed = JSON.parse(await readFile(piecesPath(dataDir), "utf8")) as Partial<CachedArmorPieces>;
    if (parsed.version !== 1
      || !Array.isArray(parsed.pieces)
      || !parsed.saved_at
      || typeof parsed.destiny_membership_id !== "string"
      || parsed.account_id !== identity.accountId
      || parsed.ruleset_id !== identity.rulesetId
      || parsed.ruleset_version !== identity.rulesetVersion
      || normalizeRevision(parsed.manifest_version) !== normalizeRevision(identity.manifestVersion)
      || !isFresh(parsed.saved_at, now)) {
      return null;
    }
    const manifestVersion = normalizeRevision(parsed.manifest_version);
    return {
      version: 1,
      account_id: parsed.account_id,
      destiny_membership_id: parsed.destiny_membership_id,
      saved_at: parsed.saved_at,
      ...(manifestVersion ? { manifest_version: manifestVersion } : {}),
      ruleset_id: parsed.ruleset_id,
      ruleset_version: parsed.ruleset_version,
      pieces: parsed.pieces
    };
  } catch {
    return null;
  }
}

export async function saveCachedArmorPieces(
  dataDir: string,
  identity: ArmorPiecesIdentity,
  input: { destinyMembershipId: string; pieces: readonly ArmorPieceSnapshot[] },
  now = new Date()
): Promise<CachedArmorPieces> {
  const target = piecesPath(dataDir);
  const previous = saveQueues.get(target) ?? Promise.resolve();
  const operation = previous.catch(() => undefined).then(async () => {
    await mkdir(dataDir, { recursive: true });
    const manifestVersion = normalizeRevision(identity.manifestVersion);
    const cached: CachedArmorPieces = {
      version: 1,
      account_id: identity.accountId,
      destiny_membership_id: input.destinyMembershipId,
      saved_at: now.toISOString(),
      ...(manifestVersion ? { manifest_version: manifestVersion } : {}),
      ruleset_id: identity.rulesetId,
      ruleset_version: identity.rulesetVersion,
      pieces: [...input.pieces]
    };
    const temporary = `${target}.tmp-${process.pid}-${Date.now()}-${temporarySequence++}`;
    try {
      await writeFile(temporary, `${JSON.stringify(cached)}\n`, "utf8");
      await rename(temporary, target);
      return cached;
    } finally {
      await rm(temporary, { force: true }).catch(() => undefined);
    }
  });
  const tail = operation.then(() => undefined, () => undefined);
  saveQueues.set(target, tail);
  try {
    return await operation;
  } finally {
    if (saveQueues.get(target) === tail) saveQueues.delete(target);
  }
}

/**
 * 账号快照重新落盘时清掉棋子缓存。
 *
 * 棋子是从一次完整 profile 归一化来的，账号一旦重新同步，它们就可能和仓库、首页显示的那份
 * 账号数据对不上 —— 求解结果里会出现玩家已经不持有的装备。清掉之后下一次「计算」重新取一份，
 * 超时才由 `armorPiecesMaxAgeMs` 兜底。
 */
export async function clearCachedArmorPieces(dataDir: string): Promise<void> {
  await rm(piecesPath(dataDir), { force: true }).catch(() => undefined);
}

function isFresh(savedAt: string, now: number): boolean {
  const savedAtMs = Date.parse(savedAt);
  return Number.isFinite(savedAtMs) && now - savedAtMs <= armorPiecesMaxAgeMs;
}

function normalizeRevision(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function piecesPath(dataDir: string): string {
  return join(dataDir, fileName);
}
