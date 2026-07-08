import { useState } from "react";
import type { DailySummary } from "../../api/types";
import { api } from "../../api/client";
import { buildWeeklyFocusText } from "../../utils/dailyShare";

export function useDailySummary() {
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [dailyMessage, setDailyMessage] = useState("");
  const [dailyError, setDailyError] = useState("");
  const [isLoadingDaily, setIsLoadingDaily] = useState(false);

  async function loadDailySummary() {
    setIsLoadingDaily(true);
    setDailyError("");
    try {
      setDailySummary(await api.getDailySummary());
    } catch (error) {
      setDailyError(error instanceof Error ? error.message : "今日面板读取失败");
    } finally {
      setIsLoadingDaily(false);
    }
  }

  async function copyWeeklyFocus() {
    if (!dailySummary) return;
    try {
      await navigator.clipboard.writeText(buildWeeklyFocusText(dailySummary));
      setDailyMessage("已复制本周重点");
    } catch {
      setDailyMessage("复制失败，请检查系统剪贴板权限");
    }
  }

  return {
    copyWeeklyFocus,
    dailyError,
    dailyMessage,
    dailySummary,
    isLoadingDaily,
    loadDailySummary
  };
}
