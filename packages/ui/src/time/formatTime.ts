import type { InterfaceLocale } from "../i18n/types.js";

export type TimeValue = string | number | Date | null | undefined;

const defaultFallback = "时间未记录";
const chineseWeekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;
const englishWeekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function formatFullDateTime(value: TimeValue, fallback = defaultFallback): string {
  const date = parseTimeValue(value);
  if (!date) return fallback;
  return `${formatDate(date)} ${formatClock(date, true)}`;
}

export function formatStandardDateTime(value: TimeValue, fallback = defaultFallback): string {
  const date = parseTimeValue(value);
  if (!date) return fallback;
  return `${formatDate(date)} ${formatClock(date)}`;
}

export function formatScheduleDateTime(
  value: TimeValue,
  locale: InterfaceLocale = "zh-CN",
  fallback = defaultFallback
): string {
  const date = parseTimeValue(value);
  if (!date) return fallback;
  const weekdays = locale === "en-US" ? englishWeekdays : chineseWeekdays;
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${weekdays[date.getDay()]} ${formatClock(date)}`;
}

export function formatCompactDateTime(
  value: TimeValue,
  now: Date = new Date(),
  fallback = defaultFallback
): string {
  const date = parseTimeValue(value);
  if (!date) return fallback;
  if (isSameLocalDate(date, now)) return formatClock(date);
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${formatClock(date)}`;
}

export function formatClockTime(value: TimeValue, fallback = defaultFallback): string {
  const date = parseTimeValue(value);
  return date ? formatClock(date) : fallback;
}

function parseTimeValue(value: TimeValue): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

function formatClock(date: Date, includeSeconds = false): string {
  const base = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return includeSeconds ? `${base}:${pad(date.getSeconds())}` : base;
}

function isSameLocalDate(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
