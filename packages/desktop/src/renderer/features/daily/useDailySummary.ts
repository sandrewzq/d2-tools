import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DailySummary, WeeklySummary } from "../../api/types";
import { api } from "../../api/client";
import { buildWeeklyFocusText } from "../../utils/dailyShare";

export function useDailySummary() {
  const [storedDailySummary, setStoredDailySummary] = useState<DailySummary | null>(null);
  const [storedWeeklySummary, setStoredWeeklySummary] = useState<WeeklySummary | null>(null);
  const [dailyMessage, setDailyMessage] = useState("");
  const [dailyError, setDailyError] = useState("");
  const [isLoadingDaily, setIsLoadingDaily] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const loadRequestRef = useRef<Promise<void> | null>(null);

  const loadDailySummary = useCallback((force = false): Promise<void> => {
    if (loadRequestRef.current) return loadRequestRef.current;
    setIsLoadingDaily(true);
    setDailyError("");
    const operation = api.getHomeBriefing({ force })
      .then((briefing) => {
        setStoredDailySummary(briefing.daily);
        setStoredWeeklySummary(briefing.weekly);
        setClock(new Date());
      })
      .catch((error) => {
        setDailyError(error instanceof Error ? error.message : "首页情报读取失败");
      });
    let request: Promise<void>;
    request = operation.finally(() => {
        setIsLoadingDaily(false);
        if (loadRequestRef.current === request) loadRequestRef.current = null;
      });
    loadRequestRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!storedDailySummary || !storedWeeklySummary) return;
    const refreshAt = nextHomeRefreshAt(storedDailySummary, storedWeeklySummary, new Date());
    const delay = Math.max(1_000, refreshAt.getTime() - Date.now() + 5_000);
    const id = window.setTimeout(() => void loadDailySummary(), delay);
    return () => window.clearTimeout(id);
  }, [loadDailySummary, storedDailySummary, storedWeeklySummary]);

  useEffect(() => {
    if (!dailyError) return;
    const id = window.setTimeout(() => void loadDailySummary(), 15 * 60_000);
    return () => window.clearTimeout(id);
  }, [dailyError, loadDailySummary]);

  const dailySummary = useMemo(
    () => storedDailySummary ? updateDailyResetLabels(storedDailySummary, clock) : null,
    [clock, storedDailySummary]
  );
  const weeklySummary = useMemo(
    () => storedWeeklySummary ? updateWeeklyResetLabel(storedWeeklySummary, clock) : null,
    [clock, storedWeeklySummary]
  );

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

function nextHomeRefreshAt(daily: DailySummary, weekly: WeeklySummary, now: Date): Date {
  const candidates = [
    daily.daily_reset.next_reset_iso,
    weekly.weekly_reset.next_reset_iso,
    ...((daily.sources.vendors.items ?? [])
      .filter((item) => item.vendorHash === 2190858386)
      .map((item) => item.vendorRefreshDate)
      .filter((value): value is string => Boolean(value)))
  ]
    .map((value) => new Date(value))
    .filter((value) => Number.isFinite(value.getTime()) && value > now);
  candidates.push(nextXurBoundary(now));
  return candidates.sort((left, right) => left.getTime() - right.getTime())[0] ?? new Date(now.getTime() + 60 * 60_000);
}

function nextXurBoundary(now: Date): Date {
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + offset,
      17,
      0,
      0,
      0
    ));
    if ((candidate.getUTCDay() === 2 || candidate.getUTCDay() === 5) && candidate > now) return candidate;
  }
  return new Date(now.getTime() + 7 * 24 * 60 * 60_000);
}

function updateDailyResetLabels(summary: DailySummary, now: Date): DailySummary {
  return {
    ...summary,
    daily_reset: {
      ...summary.daily_reset,
      time_remaining_label: formatRemaining("每日重置", now, new Date(summary.daily_reset.next_reset_iso))
    },
    weekly_reset: {
      ...summary.weekly_reset,
      time_remaining_label: formatRemaining("每周重置", now, new Date(summary.weekly_reset.next_reset_iso))
    }
  };
}

function updateWeeklyResetLabel(summary: WeeklySummary, now: Date): WeeklySummary {
  return {
    ...summary,
    weekly_reset: {
      ...summary.weekly_reset,
      time_remaining_label: formatRemaining("每周重置", now, new Date(summary.weekly_reset.next_reset_iso))
    }
  };
}

function formatRemaining(label: string, now: Date, target: Date): string {
  const remainingMinutes = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 60_000));
  const days = Math.floor(remainingMinutes / 1440);
  const hours = Math.floor((remainingMinutes % 1440) / 60);
  const minutes = remainingMinutes % 60;
  if (days > 0) return `距离${label}还有 ${days} 天 ${hours} 小时`;
  return `距离${label}还有 ${hours} 小时 ${minutes} 分钟`;
}
