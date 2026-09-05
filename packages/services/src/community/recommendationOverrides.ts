import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { openRecommendationDatabase } from "./recommendationDatabase.js";

export type RecommendationSourceState = "active" | "disabled" | "removed";
export type RecommendationRuleState = "active" | "removed";

export type RecommendationSourceOverride = {
  source_key: string;
  state: RecommendationSourceState;
  updated_at: string;
};

export type RecommendationRuleOverride = {
  source_key: string;
  rule_stable_id: string;
  state: RecommendationRuleState;
  reason: string;
  source_revision: string;
  review_required: boolean;
  updated_at: string;
};

export function recommendationSourceState(
  database: DatabaseSync,
  sourceKey: string
): RecommendationSourceState {
  const row = database.prepare(`
    SELECT state
    FROM recommendation_source_overrides
    WHERE source_key = ?
  `).get(sourceKey) as { state?: RecommendationSourceState } | undefined;
  return row?.state ?? "active";
}

export function activeRecommendationSource(database: DatabaseSync, sourceKey: string): boolean {
  return recommendationSourceState(database, sourceKey) === "active";
}

export function removedRecommendationRuleIds(
  database: DatabaseSync,
  sourceKey: string
): Set<string> {
  const rows = database.prepare(`
    SELECT rule_stable_id
    FROM recommendation_rule_overrides
    WHERE source_key = ? AND state = 'removed' AND review_required = 0
  `).all(sourceKey) as Array<{ rule_stable_id: string }>;
  return new Set(rows.map((row) => row.rule_stable_id));
}

export function listRecommendationSourceOverrides(dataDir: string): RecommendationSourceOverride[] {
  const database = openRecommendationDatabase(dataDir);
  try {
    return database.prepare(`
      SELECT source_key, state, updated_at
      FROM recommendation_source_overrides
      ORDER BY source_key
    `).all() as RecommendationSourceOverride[];
  } finally {
    database.close();
  }
}

export function listRecommendationRuleOverrides(
  dataDir: string,
  sourceKey?: string
): RecommendationRuleOverride[] {
  const database = openRecommendationDatabase(dataDir);
  try {
    const rows = (sourceKey
      ? database.prepare(`
          SELECT source_key, rule_stable_id, state, reason, source_revision,
                 review_required, updated_at
          FROM recommendation_rule_overrides
          WHERE source_key = ?
          ORDER BY updated_at DESC, rule_stable_id
        `).all(sourceKey)
      : database.prepare(`
          SELECT source_key, rule_stable_id, state, reason, source_revision,
                 review_required, updated_at
          FROM recommendation_rule_overrides
          ORDER BY source_key, updated_at DESC, rule_stable_id
        `).all()) as Array<Omit<RecommendationRuleOverride, "review_required"> & { review_required: number }>;
    return rows.map((row) => ({ ...row, review_required: row.review_required === 1 }));
  } finally {
    database.close();
  }
}

export function setRecommendationSourceState(
  dataDir: string,
  sourceKey: string,
  state: RecommendationSourceState,
  now = new Date()
): RecommendationSourceOverride {
  const updatedAt = validTimestamp(now);
  const database = openRecommendationDatabase(dataDir);
  try {
    database.prepare(`
      INSERT INTO recommendation_source_overrides (source_key, state, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(source_key) DO UPDATE SET
        state = excluded.state,
        updated_at = excluded.updated_at
    `).run(sourceKey, state, updatedAt);
    return { source_key: sourceKey, state, updated_at: updatedAt };
  } finally {
    database.close();
  }
}

export function setRecommendationRuleState(
  dataDir: string,
  input: {
    source_key: string;
    rule_stable_id: string;
    state: RecommendationRuleState;
    reason?: string;
    source_revision?: string;
  },
  now = new Date()
): RecommendationRuleOverride {
  const updatedAt = validTimestamp(now);
  const sourceKey = requiredText(input.source_key, "推荐来源");
  const ruleStableId = requiredText(input.rule_stable_id, "推荐规则");
  const database = openRecommendationDatabase(dataDir);
  try {
    database.prepare(`
      INSERT INTO recommendation_rule_overrides (
        source_key, rule_stable_id, state, reason, source_revision, review_required, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?)
      ON CONFLICT(source_key, rule_stable_id) DO UPDATE SET
        state = excluded.state,
        reason = excluded.reason,
        source_revision = excluded.source_revision,
        review_required = 0,
        updated_at = excluded.updated_at
    `).run(
      sourceKey,
      ruleStableId,
      input.state,
      input.reason?.trim() ?? "",
      input.source_revision?.trim() ?? "",
      updatedAt
    );
    return {
      source_key: sourceKey,
      rule_stable_id: ruleStableId,
      state: input.state,
      reason: input.reason?.trim() ?? "",
      source_revision: input.source_revision?.trim() ?? "",
      review_required: false,
      updated_at: updatedAt
    };
  } finally {
    database.close();
  }
}

export function reconcileRecommendationRuleOverrides(
  database: DatabaseSync,
  sourceKey: string,
  activeRuleIds: ReadonlySet<string>,
  sourceRevision: string,
  now: string
): void {
  const rows = database.prepare(`
    SELECT rule_stable_id
    FROM recommendation_rule_overrides
    WHERE source_key = ?
  `).all(sourceKey) as Array<{ rule_stable_id: string }>;
  const update = database.prepare(`
    UPDATE recommendation_rule_overrides
    SET review_required = ?, source_revision = ?, updated_at = ?
    WHERE source_key = ? AND rule_stable_id = ?
  `);
  for (const row of rows) {
    update.run(activeRuleIds.has(row.rule_stable_id) ? 0 : 1, sourceRevision, now, sourceKey, row.rule_stable_id);
  }
}

export function recommendationOverrideRevision(dataDir: string): string {
  const database = openRecommendationDatabase(dataDir);
  try {
    const sourceRows = database.prepare(`
      SELECT source_key, state, updated_at
      FROM recommendation_source_overrides
      ORDER BY source_key
    `).all();
    const ruleRows = database.prepare(`
      SELECT source_key, rule_stable_id, state, reason, source_revision, review_required, updated_at
      FROM recommendation_rule_overrides
      ORDER BY source_key, rule_stable_id
    `).all();
    return createHash("sha256").update(JSON.stringify({ sourceRows, ruleRows })).digest("hex");
  } finally {
    database.close();
  }
}

function requiredText(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label}不能为空。`);
  return normalized;
}

function validTimestamp(now: Date): string {
  if (!Number.isFinite(now.getTime())) throw new Error("推荐覆盖设置时间无效。");
  return now.toISOString();
}
