import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { VaultItemInstanceMatchInfo } from "@d2-tools/core/community-perks";
import type { VaultRecommendationScanState } from "./accountDerived.js";

export type VaultRecommendationAuditInput = {
  items: AccountItemSummary[];
  instanceMatches: Map<string, VaultItemInstanceMatchInfo>;
  scan: VaultRecommendationScanState;
  generatedAt?: Date;
};

export function buildVaultRecommendationAuditReport(input: VaultRecommendationAuditInput): string {
  const weapons = input.items.filter((item) => item.group_key === "weapons");
  const rows = weapons.map((item, index) => ({
    item,
    label: `${item.name} [${item.hash}] · 实例 ${index + 1}`,
    match: input.instanceMatches.get(item.instance_id ?? `hash:${item.hash}`)
  }));
  const zeroRows = rows.flatMap(({ label, match }) => (match?.source_matches ?? []).flatMap((source) => (
    source.requirement_count > 0
      && source.matched_requirement_count === 0
      && sourceUncheckableRequirementCount(source) === 0
      ? [`- ${label} · ${source.source_label} · 未符合（0/${source.requirement_count} 项）`]
      : []
  )));
  const uncheckableRows = rows.flatMap(({ label, match }) => {
    const sourceRows = (match?.source_matches ?? []).flatMap((source) => (
      sourceUncheckableRequirementCount(source) > 0
        ? [`- ${label} · ${source.source_label} · 数据不完整，未完成推荐项核对`]
        : []
    ));
    const dim = match?.dim_wishlist;
    return dim?.uncheckable_combo_count
      ? [...sourceRows, `- ${label} · DIM · 数据不完整，${dim.uncheckable_combo_count} 套推荐未完成核对`]
      : sourceRows;
  });
  const exoticRows = rows.filter(({ item }) => isExotic(item)).map(({ label, match }) => (
    `- ${label} · ${match ? formatCoverage(match) : "没有实例扫描结果"}`
  ));
  const versionGroups = new Map<string, Set<number>>();
  for (const item of weapons) {
    const key = normalizeName(item.name);
    const hashes = versionGroups.get(key) ?? new Set<number>();
    hashes.add(item.hash);
    versionGroups.set(key, hashes);
  }
  const crossVersionRows = [...versionGroups.entries()].flatMap(([name, hashes]) => hashes.size > 1
    ? [`- ${weapons.find((item) => normalizeName(item.name) === name)?.name ?? name} · ${[...hashes].join(" / ")}`]
    : []);
  const dimDiagnosticCounts = new Map<string, number>();
  for (const { match } of rows) {
    for (const rule of match?.dim_wishlist?.rules ?? []) {
      const status = rule.diagnostic_status ?? "missing";
      dimDiagnosticCounts.set(status, (dimDiagnosticCounts.get(status) ?? 0) + 1);
    }
  }
  const issueRows = input.scan.issues?.map((issue) => (
    `- ${issue.code} · ${issue.severity === "blocking" ? "阻断" : "警告"} · ${issue.message}`
  )) ?? [];
  return [
    "d2-tools T20 武器推荐只读验收报告",
    `生成时间：${(input.generatedAt ?? new Date()).toISOString()}`,
    "说明：本报告只读取当前账号快照和本地推荐扫描结果，不写标签、不转移、不解锁、不分解。",
    "",
    "扫描摘要：",
    `- 状态：${input.scan.phase}`,
    `- 武器：${input.scan.scanned_weapon_count}/${input.scan.total_weapon_count} 件已扫描，${input.scan.covered_weapon_count} 件有来源覆盖`,
    `- 当前账号武器数：${weapons.length}`,
    `- 资料库版本：${input.scan.manifest_version || "未记录"}`,
    `- 推荐库版本：${input.scan.recommendation_revision || "未记录"}`,
    `- 推荐库 Schema：${input.scan.recommendation_schema_version ?? "未记录"}`,
    `- 开始时间：${input.scan.started_at || "未记录"}`,
    `- 完成时间：${input.scan.completed_at || "未记录"}`,
    "",
    "结构化依赖状态：",
    ...(issueRows.length ? issueRows : ["- 无"]),
    "",
    `未符合的来源要求（${zeroRows.length} 条）：`,
    ...(zeroRows.length ? zeroRows : ["- 无"]),
    "",
    `Roll 数据不完整（${uncheckableRows.length} 条）：`,
    ...(uncheckableRows.length ? uncheckableRows : ["- 无"]),
    "",
    `异域武器（${exoticRows.length} 件）：`,
    ...(exoticRows.length ? exoticRows : ["- 无"]),
    "",
    `跨版本同名（${crossVersionRows.length} 组）：`,
    ...(crossVersionRows.length ? crossVersionRows : ["- 无"]),
    "",
    "DIM 规则插槽诊断：",
    ...formatDimDiagnosticCounts(dimDiagnosticCounts)
  ].join("\n");
}

function sourceUncheckableRequirementCount(
  source: NonNullable<VaultItemInstanceMatchInfo["source_matches"]>[number]
): number {
  return source.uncheckable_requirement_count
    ?? source.slots.filter((slot) => slot.state === "uncheckable").length;
}

function formatCoverage(match: VaultItemInstanceMatchInfo): string {
  const dim = match.dim_wishlist
    ? `；DIM 符合 ${match.dim_wishlist.matched_combo_count}/${match.dim_wishlist.combo_count} 套推荐`
    : "";
  return `${match.coverage === "covered" ? "有来源覆盖" : "无来源覆盖"}；${match.source_matches?.length ?? 0} 个知识库来源${dim}`;
}

function formatDimDiagnosticCounts(counts: Map<string, number>): string[] {
  if (!counts.size) return ["- 当前扫描没有 DIM 规则诊断"];
  const labels: Record<string, string> = {
    exact: "唯一映射到官方栏位",
    same_slot_multiple_required: "同栏多个必需项",
    cross_slot_ambiguous: "跨栏歧义",
    unknown_slot: "无法定位栏位",
    special_socket: "特殊或异域插槽",
    missing: "缺少诊断"
  };
  return [...counts.entries()].map(([status, count]) => `- ${labels[status] ?? status}：${count} 条实例规则`);
}

function isExotic(item: AccountItemSummary): boolean {
  const tier = item.tier?.toLocaleLowerCase() ?? "";
  return tier.includes("exotic") || tier.includes("异域");
}

function normalizeName(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{Z}\s]+/gu, "");
}
