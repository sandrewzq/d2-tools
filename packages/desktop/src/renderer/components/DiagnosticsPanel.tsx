import type { StartupState } from "../api/client";

export type DiagnosticTone = "ok" | "warning" | "neutral";

export type DiagnosticRow = {
  label: string;
  value: string;
  tone: DiagnosticTone;
};

function toneForStatus(status: "ready" | "missing" | "skipped"): DiagnosticTone {
  if (status === "ready") return "ok";
  if (status === "missing") return "warning";
  return "neutral";
}

export function buildDiagnosticRows(options: {
  state: StartupState;
  dataDir?: string;
  manifestVersion?: string;
}): DiagnosticRow[] {
  return [
    {
      label: "Bungie 配置",
      value: options.state.cards.bungieConfig.label,
      tone: toneForStatus(options.state.cards.bungieConfig.status)
    },
    {
      label: "账号登录",
      value: options.state.cards.account.label,
      tone: toneForStatus(options.state.cards.account.status)
    },
    {
      label: "资料库状态",
      value: options.state.cards.manifest.label,
      tone: toneForStatus(options.state.cards.manifest.status)
    },
    {
      label: "资料库版本",
      value: options.manifestVersion ?? "未读取到版本",
      tone: options.manifestVersion ? "ok" : "neutral"
    },
    {
      label: "AI 状态",
      value: options.state.cards.ai.label,
      tone: toneForStatus(options.state.cards.ai.status)
    },
    {
      label: "本地数据目录",
      value: options.dataDir ?? "未读取到配置目录",
      tone: options.dataDir ? "neutral" : "warning"
    }
  ];
}

export function DiagnosticsPanel(props: {
  rows: DiagnosticRow[];
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  return (
    <section className="diagnostics-panel">
      <div className="section-heading">
        <div>
          <h2>状态诊断</h2>
          <p>检查配置、登录、资料库和本地数据目录。</p>
        </div>
        <button type="button" disabled={props.isRefreshing} onClick={props.onRefresh}>
          {props.isRefreshing ? "检查中..." : "检查当前状态"}
        </button>
      </div>
      <div className="diagnostic-grid">
        {props.rows.map((row) => (
          <div className={`diagnostic-row diagnostic-${row.tone}`} key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
