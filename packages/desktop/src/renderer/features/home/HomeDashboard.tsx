import type { DailySummary, StartupState } from "../../api/client";
import {
  type DiagnosticRow
} from "../../components/DiagnosticsPanel";
import type { ShellPageKey } from "../../components/ShellLayout";
import { DailySummaryPanel } from "../../shared/components/DailySummaryPanel";

export function HomeDashboard(props: {
  state: StartupState;
  isLoggingIn: boolean;
  isLoadingAccount: boolean;
  isInitializingManifest: boolean;
  isRefreshingDiagnostics: boolean;
  diagnosticRows: DiagnosticRow[];
  diagnosticError: string;
  accountError: string;
  hasAccountData: boolean;
  dailySummary: DailySummary | null;
  dailyMessage: string;
  dailyError: string;
  isLoadingDaily: boolean;
  onConfigure: () => void;
  onLogin: () => void;
  onLoadAccount: () => void;
  onInitializeManifest: () => void;
  onConfigureAi: () => void;
  onRefreshDiagnostics: () => void;
  onNavigate: (page: ShellPageKey) => void;
  onRefreshDaily: () => void;
  onCopyDailySummary: () => void;
  onCopyWeeklyFocus: () => void;
}) {
  const accountRisk = getAccountRisk(props);
  const manifestRisk = getManifestRisk(props);
  const aiRisk = getAiRisk(props.state);
  const diagnosticsRisk = getDiagnosticsRisk(props);
  const controlRows = buildHomeControlRows(props);
  const diagnosticWarnings = props.diagnosticRows.filter((row) => row.tone === "warning");

  return (
    <div className="app-page home-app-page product-home-page">
      <section className="app-page-head">
        <div>
          <h1>首页</h1>
          <p>先看全局健康度，再进入今天需要处理的内容。</p>
        </div>
        <div className="button-row">
          <button type="button" disabled={props.isLoadingAccount} onClick={props.onLoadAccount}>
            {props.isLoadingAccount ? "读取中..." : "读取账号"}
          </button>
          <button type="button" disabled={props.isInitializingManifest} onClick={props.onInitializeManifest}>
            {props.isInitializingManifest ? "更新中..." : "更新资料库"}
          </button>
          <button type="button" className="secondary-button" disabled={props.isRefreshingDiagnostics} onClick={props.onRefreshDiagnostics}>
            {props.isRefreshingDiagnostics ? "检查中..." : "检查状态"}
          </button>
        </div>
      </section>

      <div className="app-overview-grid">
        <section className="app-panel app-hero-panel">
          <div>
            <h2>当前桌面状态</h2>
            <p>
              首页只保留影响当前判断的入口：账号、资料库、后台任务和下一步建议。页面不再出现弱对比标签，也不再用浅字撑信息层级。
            </p>
          </div>
          <div className="app-health-grid" aria-label="首页关键状态">
            {renderHomeMetric(accountRisk)}
            {renderHomeMetric(manifestRisk)}
            {renderHomeMetric(diagnosticsRisk)}
          </div>
        </section>

        <aside className="app-panel app-panel-body app-side-stack" aria-label="状态与设置">
          <div className="app-section-title">
            <div>
              <h2>状态与设置</h2>
              <span>只放高频入口</span>
            </div>
          </div>
          <div className="app-status-list" aria-label="核心状态">
            {controlRows.map((row) => renderControlStatusRow(row))}
          </div>
          <div className={`app-status-row status-${aiRisk.tone}`}>
            <div>
              <strong>AI {aiRisk.value}</strong>
              <span>{aiRisk.message}</span>
            </div>
            <button type="button" className="secondary-button" onClick={props.onConfigureAi}>
              设置
            </button>
          </div>
          <div className="app-log-row app-diagnostic-summary">
            <div>
              <strong>诊断摘要</strong>
              <span>
                {props.isRefreshingDiagnostics
                  ? "检查中"
                  : props.diagnosticRows.length
                    ? diagnosticWarnings.length
                      ? `${diagnosticWarnings.length} 项需要处理`
                      : "未发现阻断项"
                    : "尚未检查"}
              </span>
            </div>
            <button type="button" disabled={props.isRefreshingDiagnostics} onClick={props.onRefreshDiagnostics}>
              {props.isRefreshingDiagnostics ? "检查中..." : "检查状态"}
            </button>
            {diagnosticWarnings.length ? (
              <ul>
                {diagnosticWarnings.slice(0, 3).map((row) => (
                  <li key={row.label}>
                    <b>{row.label}</b>
                    <span>{row.value}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {props.diagnosticError ? <p className="status-message status-error">{props.diagnosticError}</p> : null}
        </aside>
      </div>

      <section className="app-panel app-panel-body">
        <div className="app-info-strip" aria-label="下一步建议">
          <div>
            <h3>下一步建议</h3>
            <p>先同步账号，确认角色、仓库和材料数量；再检查今天轮换、商人库存和可确认来源。</p>
          </div>
          <div className="button-row">
            {!props.hasAccountData ? (
              <button type="button" disabled={props.isLoadingAccount} onClick={props.onLoadAccount}>
                {props.isLoadingAccount ? "读取中..." : "读取账号"}
              </button>
            ) : null}
            {props.state.cards.manifest.status !== "ready" || props.state.cards.manifest.needsUpdate ? (
              <button type="button" disabled={props.isInitializingManifest} onClick={props.onInitializeManifest}>
                {props.isInitializingManifest ? "更新中..." : "更新资料库"}
              </button>
            ) : null}
            <button type="button" className="secondary-button" onClick={() => props.onNavigate("account")}>
              查看账号
            </button>
            <button type="button" className="secondary-button" onClick={() => props.onNavigate("library")}>
              查出处
            </button>
          </div>
        </div>
      </section>

      <DailySummaryPanel
        dailySummary={props.dailySummary}
        dailyMessage={props.dailyMessage}
        dailyError={props.dailyError}
        isLoading={props.isLoadingDaily}
        onRefresh={props.onRefreshDaily}
        onCopyDailySummary={props.onCopyDailySummary}
        onCopyWeeklyFocus={props.onCopyWeeklyFocus}
      />
    </div>
  );
}

type HomeControlRow = {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "ready" | "warning" | "error";
  actionLabel?: string;
  isBusy?: boolean;
  onAction?: () => void;
};

function buildHomeControlRows(props: {
  state: StartupState;
  isLoggingIn: boolean;
  isLoadingAccount: boolean;
  isInitializingManifest: boolean;
  accountError: string;
  hasAccountData: boolean;
  onConfigure: () => void;
  onLogin: () => void;
  onLoadAccount: () => void;
  onInitializeManifest: () => void;
  onConfigureAi: () => void;
}): HomeControlRow[] {
  const bungie = props.state.cards.bungieConfig;
  const account = props.state.cards.account;
  const manifest = props.state.cards.manifest;
  const ai = props.state.cards.ai;

  return [
    {
      key: "bungie",
      label: "Bungie",
      value: bungie.status === "ready" ? "已配置" : "待配置",
      detail: bungie.label,
      tone: bungie.status === "ready" ? "ready" : "warning",
      actionLabel: bungie.status === "ready" ? "设置" : "配置",
      onAction: props.onConfigure
    },
    {
      key: "account",
      label: "账号",
      value: props.accountError ? "读取失败" : props.isLoadingAccount ? "读取中" : props.hasAccountData ? "已读取" : account.status === "ready" ? "可读取" : "未登录",
      detail: props.accountError || account.label,
      tone: props.accountError ? "error" : props.hasAccountData ? "ready" : account.status === "ready" ? "neutral" : "warning",
      actionLabel: account.status === "ready"
        ? props.isLoadingAccount
          ? "读取中"
          : props.hasAccountData
            ? "刷新"
            : "读取"
        : props.isLoggingIn
          ? "登录中"
          : "登录",
      isBusy: props.isLoadingAccount || props.isLoggingIn,
      onAction: account.status === "ready" ? props.onLoadAccount : props.onLogin
    },
    {
      key: "manifest",
      label: "资料库",
      value: props.isInitializingManifest ? "更新中" : manifest.needsUpdate ? "建议更新" : manifest.status === "ready" ? "可用" : "待初始化",
      detail: manifest.label,
      tone: manifest.status === "ready" && !manifest.needsUpdate ? "ready" : "warning",
      actionLabel: props.isInitializingManifest ? "更新中" : "更新",
      isBusy: props.isInitializingManifest,
      onAction: props.onInitializeManifest
    },
    {
      key: "ai",
      label: "AI",
      value: ai.status === "ready" ? "已配置" : "未配置",
      detail: ai.label,
      tone: ai.status === "ready" ? "ready" : "neutral",
      actionLabel: ai.status === "ready" ? "设置" : "配置",
      onAction: props.onConfigureAi
    }
  ];
}

function renderControlStatusRow(row: HomeControlRow) {
  return (
    <div className={`app-status-row status-${row.tone}`} key={row.key}>
      <div>
        <strong>{row.label} {row.value}</strong>
        <span>{row.detail}</span>
      </div>
      {row.onAction && row.actionLabel ? (
        <button type="button" className="secondary-button" disabled={row.isBusy} onClick={row.onAction}>
          {row.actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function renderHomeMetric(card: {
  title: string;
  value: string;
  message: string;
  tone: "neutral" | "ready" | "warning" | "error";
}) {
  return (
    <div className={`app-metric status-${card.tone}`}>
      <span>{card.title}</span>
      <strong>{card.value}</strong>
      <span>{card.message}</span>
    </div>
  );
}

function getAccountRisk(props: {
  isLoadingAccount: boolean;
  accountError: string;
  hasAccountData: boolean;
  state: StartupState;
}) {
  if (props.accountError) {
    return {
      title: "账号读取",
      value: "失败",
      message: props.accountError,
      tone: "error" as const
    };
  }
  if (props.isLoadingAccount) {
    return {
      title: "账号读取",
      value: "后台读取中",
      message: "读取应在后台继续运行，切换菜单不会中断。",
      tone: "warning" as const
    };
  }
  if (props.hasAccountData) {
    return {
      title: "账号读取",
      value: "已可用",
      message: "角色装备、背包、仓库和材料已进入本地工作区。",
      tone: "ready" as const
    };
  }
  return {
    title: "账号读取",
    value: props.state.cards.account.status === "ready" ? "可读取" : "未登录",
    message: "不登录也能使用本地设置和资料库；账号相关能力需要 Bungie 登录。",
    tone: "neutral" as const
  };
}

function getManifestRisk(props: { isInitializingManifest: boolean; state: StartupState }) {
  const manifest = props.state.cards.manifest;
  if (props.isInitializingManifest) {
    return {
      title: "资料库版本",
      value: "后台更新中",
      message: "Manifest 更新在后台运行，切换菜单不会中断。",
      tone: "warning" as const
    };
  }
  if (manifest.status !== "ready") {
    return {
      title: "资料库版本",
      value: "待初始化",
      message: manifest.label,
      tone: "warning" as const
    };
  }
  if (manifest.needsUpdate) {
    return {
      title: "资料库版本",
      value: "建议更新",
      message: manifest.label,
      tone: "warning" as const
    };
  }
  return {
    title: "资料库版本",
    value: manifest.lastUpdated ?? "可用",
    message: "资料库可用于搜索、来源和详情判断。",
    tone: "ready" as const
  };
}

function getAiRisk(state: StartupState) {
  const ai = state.cards.ai;
  return {
    title: "AI 助手",
    value: ai.status === "ready" ? "已配置" : "未配置",
    message: ai.status === "ready" ? "可以结合当前页面上下文分析装备和仓库。" : "未配置时不影响本地资料库和账号功能。",
    tone: ai.status === "ready" ? "ready" as const : "neutral" as const
  };
}

function getDiagnosticsRisk(props: {
  isRefreshingDiagnostics: boolean;
  diagnosticRows: DiagnosticRow[];
  diagnosticError: string;
}) {
  if (props.diagnosticError) {
    return {
      title: "本地诊断",
      value: "失败",
      message: props.diagnosticError,
      tone: "error" as const
    };
  }
  if (props.isRefreshingDiagnostics) {
    return {
      title: "本地诊断",
      value: "刷新中",
      message: "正在检查配置、资料库、更新和本地数据目录。",
      tone: "warning" as const
    };
  }
  return {
    title: "本地诊断",
    value: props.diagnosticRows.length ? `${props.diagnosticRows.length} 项` : "待检查",
    message: "详细诊断仍保留在右侧，问题项会直接显示。",
    tone: "neutral" as const
  };
}
