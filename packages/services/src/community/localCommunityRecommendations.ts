import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createLocalCommunitySource as createCoreLocalCommunitySource,
  normalizeLocalCommunityRecommendationTable,
  type CommunityPerkSource,
  type LocalCommunityRecommendationTable
} from "@d2-tools/core/community-perks";

const fileName = "local-community-recommendations.json";

export function saveLocalCommunityRecommendations(
  dataDir: string,
  table: LocalCommunityRecommendationTable
): LocalCommunityRecommendationTable {
  const next = normalizeLocalCommunityRecommendationTable(table);
  if (next.rules.length === 0) {
    throw new Error("本地社区推荐表至少需要一条有效规则。");
  }

  mkdirSync(dataDir, { recursive: true });
  writeFileSync(tablePath(dataDir), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export function loadLocalCommunityRecommendations(dataDir: string): LocalCommunityRecommendationTable | null {
  const file = tablePath(dataDir);
  if (!existsSync(file)) return null;

  const table = normalizeLocalCommunityRecommendationTable(JSON.parse(readFileSync(file, "utf8")) as unknown);
  return table.rules.length ? table : null;
}

export function clearLocalCommunityRecommendations(dataDir: string): void {
  rmSync(tablePath(dataDir), { force: true });
}

export function createLocalCommunitySource(dataDir: string): CommunityPerkSource {
  return createCoreLocalCommunitySource(() => loadLocalCommunityRecommendations(dataDir));
}

function tablePath(dataDir: string): string {
  return join(dataDir, fileName);
}
