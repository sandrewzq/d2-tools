import type { DailySummary } from "../api/client";

export function buildDailyShareText(summary: DailySummary): string {
  const sourceLines = Object.values(summary.sources).flatMap((source) => {
    if (source.items?.length) {
      return [
        `${source.label}：${source.message}`,
        ...source.items.slice(0, 3).map((item) => `- ${[
          item.title,
          item.subtitle
        ].filter(Boolean).join("｜")}`)
      ];
    }

    return [`${source.label}：${source.message}`];
  });

  return [
    "d2-service 日报",
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
