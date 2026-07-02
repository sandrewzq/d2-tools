import type { DailySourceStatus, DailySummary } from "../api/types";

export type WeeklyDigestSection = {
  key: "priority" | "optional" | "watch";
  title: string;
  items: string[];
};

export function buildDailyShareText(summary: DailySummary): string {
  const sourceLines = Object.values(summary.sources).flatMap((source) => {
    if (source.items?.length) {
      return [
        `${source.label}：${source.message}`,
        ...source.items.slice(0, 3).map((item) => `- ${[
          item.title,
          item.subtitle
        ].filter(Boolean).join(" / ")}`)
      ];
    }

    return [`${source.label}：${source.message}`];
  });

  return [
    "d2-tools 日报",
    `日期：${summary.date_label}`,
    "",
    "重置时间",
    `- ${summary.daily_reset.label}`,
    summary.daily_reset.time_remaining_label,
    `- ${summary.weekly_reset.label}`,
    summary.weekly_reset.time_remaining_label,
    "",
    "今日情报",
    ...sourceLines,
    "",
    "建议先做",
    ...summary.checklist.slice(0, 4).map((item, index) => `${index + 1}. ${item}`),
    "",
    "说明",
    ...summary.recommendations.map((item, index) => `${index + 1}. ${item}`)
  ].join("\n");
}

export function buildWeeklyDigestSections(summary: DailySummary): WeeklyDigestSection[] {
  const weeklyItems = (summary.sources.weekly_report.items ?? []).map((item) => [
    item.title,
    item.subtitle
  ].filter(Boolean).join(" / "));

  const priority = dedupe([
    ...summary.checklist.slice(0, 2),
    ...summary.recommendations.slice(0, 2)
  ]).slice(0, 3);

  const optional = dedupe(
    summary.recommendations.filter((item) => !priority.includes(item))
  ).slice(0, 3);

  const watch = dedupe([
    ...weeklyItems.slice(0, 3),
    ...(summary.sources.lost_sector.status === "pending"
      ? ["遗失区域仍未接入，当前不展示猜测内容。"]
      : [])
  ]).slice(0, 3);

  const sections: WeeklyDigestSection[] = [
    { key: "priority", title: "本周优先", items: priority },
    { key: "optional", title: "可以顺手做", items: optional },
    { key: "watch", title: "留意变化", items: watch }
  ];

  return sections.filter((section) => section.items.length);
}

export function buildWeeklyFocusText(summary: DailySummary): string {
  const sections = buildWeeklyDigestSections(summary);

  return [
    "d2-tools 本周重点",
    `日期：${summary.date_label}`,
    `每周重置：${summary.weekly_reset.time_remaining_label}`,
    "",
    ...sections.flatMap((section) => [
      section.title,
      ...section.items.map((item, index) => `${index + 1}. ${item}`),
      ""
    ])
  ].join("\n").trimEnd();
}

export function formatDailySourceStatus(status: DailySourceStatus): string {
  return status === "ready" ? "已接入" : "待接入";
}

function dedupe(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}
