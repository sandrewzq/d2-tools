import { useState } from "react";
import type { DailySummary, HomeBriefing, WeeklySummary } from "../../api/types";
import { api } from "../../api/client";
import { buildWeeklyFocusText } from "../../utils/dailyShare";

export function useDailySummary() {
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [dailyMessage, setDailyMessage] = useState("");
  const [dailyError, setDailyError] = useState("");
  const [isLoadingDaily, setIsLoadingDaily] = useState(false);

  async function loadDailySummary() {
    setIsLoadingDaily(true);
    setDailyError("");
    setDailyMessage("");
    let cachedOrFresh: HomeBriefing | null = null;
    try {
      cachedOrFresh = await api.getHomeBriefing();
      applyBriefing(cachedOrFresh);
    } catch (error) {
      setDailyError(error instanceof Error ? error.message : "今日面板读取失败");
    } finally {
      setIsLoadingDaily(false);
    }
    if (cachedOrFresh) {
      void refreshHomeBriefingInBackground(cachedOrFresh);
    }
  }

  function applyBriefing(briefing: HomeBriefing) {
    setDailySummary(briefing.daily);
    setWeeklySummary(briefing.weekly);
  }

  async function refreshHomeBriefingInBackground(current: HomeBriefing) {
    try {
      const refreshed = await api.refreshHomeBriefing();
      setDailyError("");
      if (!hasSameBriefingContent(current, refreshed)) {
        applyBriefing(refreshed);
        setDailyMessage("本周信息已在后台更新");
      }
    } catch (error) {
      setDailyError(error instanceof Error
        ? `后台检查更新失败，继续显示上次数据。${error.message}`
        : "后台检查更新失败，继续显示上次数据。");
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
    weeklySummary,
    isLoadingDaily,
    loadDailySummary
  };
}

function hasSameBriefingContent(left: HomeBriefing, right: HomeBriefing): boolean {
  return JSON.stringify({ daily: left.daily, weekly: left.weekly })
    === JSON.stringify({ daily: right.daily, weekly: right.weekly });
}
