import type { InterfaceLocale } from "../i18n/types.js";

export type SystemUpdateTone = "neutral" | "pending" | "success" | "warning" | "error";
export type SystemUpdateProgressVariant = "dock" | "inline" | "detail";

export type SystemUpdateProgressProps = {
  title: string;
  statusLabel?: string;
  message?: string;
  detail?: string;
  tone?: SystemUpdateTone;
  variant?: SystemUpdateProgressVariant;
  progressPercent?: number;
  indeterminate?: boolean;
  progressCurrentBytes?: number;
  progressTotalBytes?: number;
  progressBytesPerSecond?: number;
  interfaceLocale?: InterfaceLocale;
  icon?: string;
  additionalTaskCount?: number;
};

export function SystemUpdateProgress(props: SystemUpdateProgressProps) {
  const variant = props.variant ?? "inline";
  const tone = props.tone ?? "pending";
  const progress = clampProgress(props.progressPercent);
  const isIndeterminate = Boolean(props.indeterminate && progress === undefined);
  const metrics = formatProgressMetrics(props);
  const compactMessage = variant === "dock"
    ? [props.message, metrics].filter(Boolean).join(" · ")
    : props.message;
  const progressLabel = progress === undefined
    ? props.interfaceLocale === "en-US" ? "Update in progress" : "更新处理中"
    : props.interfaceLocale === "en-US" ? `Update progress: ${progress}%` : `更新进度：${progress}%`;
  const additionalTaskLabel = props.additionalTaskCount
    ? props.interfaceLocale === "en-US"
      ? `${props.additionalTaskCount} more`
      : `另有 ${props.additionalTaskCount} 项`
    : "";

  return (
    <div
      className={`system-update-progress system-update-progress--${variant}`}
      data-ui-kind="update-progress"
      data-status={tone}
      data-progress={isIndeterminate ? "indeterminate" : progress === undefined ? "none" : "determinate"}
    >
      {props.icon ? <span className="system-update-progress-icon" aria-hidden="true">{props.icon}</span> : null}
      <div className="system-update-progress-copy">
        <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{props.title}</strong>
        {compactMessage ? <span data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{compactMessage}</span> : null}
        {props.detail ? <small data-ui-part="detail" data-info-priority="support" data-text-tone="meta">{props.detail}</small> : null}
        {metrics && variant !== "dock" ? <small className="system-update-progress-metrics" data-ui-part="detail" data-info-priority="support" data-text-tone="meta">{metrics}</small> : null}
      </div>
      {props.statusLabel || additionalTaskLabel ? (
        <span className="system-update-progress-status" data-ui-part="state" data-info-priority="support" data-text-tone="status" data-status={tone}>
          {[props.statusLabel, additionalTaskLabel].filter(Boolean).join(" · ")}
        </span>
      ) : null}
      {progress !== undefined || isIndeterminate ? (
        <span
          className="system-update-progress-track"
          role="progressbar"
          aria-label={progressLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-valuetext={progress === undefined ? progressLabel : undefined}
        >
          <span style={progress === undefined ? undefined : { width: `${progress}%` }} />
        </span>
      ) : null}
    </div>
  );
}

export function systemUpdateToneForStatus(status: string | undefined): SystemUpdateTone {
  if (status === "failed" || status === "blocked" || status === "error") return "error";
  if (status === "retrying") return "warning";
  if (status === "success" || status === "succeeded" || status === "completed") return "success";
  if (status === "queued" || status === "running" || status === "checking" || status === "downloading") return "pending";
  return "neutral";
}

function clampProgress(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatProgressMetrics(props: SystemUpdateProgressProps): string {
  const locale = props.interfaceLocale ?? "zh-CN";
  const current = props.progressCurrentBytes;
  const total = props.progressTotalBytes;
  const speed = props.progressBytesPerSecond;
  const transferred = current === undefined
    ? ""
    : total && total > 0
      ? `${formatBytes(current, locale)} / ${formatBytes(total, locale)}`
      : locale === "en-US"
        ? `${formatBytes(current, locale)} downloaded`
        : `已下载 ${formatBytes(current, locale)}`;
  const speedLabel = speed && speed > 0 ? `${formatBytes(speed, locale)}/s` : "";
  return [transferred, speedLabel].filter(Boolean).join(" · ");
}

function formatBytes(bytes: number, locale: InterfaceLocale): string {
  const value = Math.max(0, bytes);
  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let normalized = value;
  while (normalized >= 1024 && unitIndex < units.length - 1) {
    normalized /= 1024;
    unitIndex += 1;
  }
  const fractionDigits = normalized >= 100 || unitIndex === 0 ? 0 : 1;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: fractionDigits }).format(normalized)} ${units[unitIndex] ?? "B"}`;
}
