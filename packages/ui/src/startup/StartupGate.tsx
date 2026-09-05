import { ControlButton } from "../control/ControlButton.js";
import { ProductWorkspaceEmptyState } from "../workspace/ProductWorkspace.js";

export type StartupGateStep = "bungie-config" | "login";

export type StartupGateProps = {
  step: StartupGateStep;
  isManifestReady?: boolean;
  isManifestBusy?: boolean;
  manifestError?: string;
  isBusy?: boolean;
  error?: string;
  onConfigure: () => void;
  onLogin: () => void;
  onOpenSettings: () => void;
};

export function StartupGate(props: StartupGateProps) {
  const configReady = props.step !== "bungie-config";
  const manifestReady = Boolean(props.isManifestReady);
  const currentTitle = props.step === "bungie-config"
    ? "先完成 Bungie 配置"
    : "最后一步：登录 Bungie";
  const currentDetail = props.step === "bungie-config"
    ? "填写 Bungie Application 的 API Key、Client ID 和 Client Secret，保存后会在后台准备资料库。"
    : "登录不依赖资料库。登录后会先同步装备数据，资料库继续在后台准备，名称和图标会在准备完成后补齐。";

  return (
    <ProductWorkspaceEmptyState className="startup-gate startup-gate--page" ariaLive="polite" ariaBusy={props.isBusy}>
      <span className="startup-gate-eyebrow" data-ui-part="label" data-info-priority="support" data-text-tone="meta">首次启动</span>
      <h2>{currentTitle}</h2>
      <p className="startup-gate-detail">{currentDetail}</p>
      <div className="startup-gate-steps" aria-label="启动步骤">
        <StartupGateStep index="1" label="Bungie 配置" status={configReady ? "ready" : "current"} detail={configReady ? "已完成" : "需要填写"} />
        <StartupGateStep index="2" label="Bungie 登录" status={props.step === "login" ? "current" : "pending"} detail={props.step === "login" ? "现在可以登录" : "等待配置"} />
        <StartupGateStep index="3" label="资料库" status={manifestReady ? "ready" : props.isManifestBusy ? "current" : "pending"} detail={manifestReady ? "已准备" : props.isManifestBusy ? "后台准备中" : "后台准备"} />
      </div>
      {props.error ? <p className="startup-gate-error status-message status-error" role="alert">{props.error}</p> : null}
      {!manifestReady && props.manifestError ? <p className="startup-gate-manifest-note status-message status-warning" role="status">资料库会在后台重试：{props.manifestError}</p> : null}
      <div className="button-row startup-gate-actions">
        {props.step === "bungie-config" ? <ControlButton variant="primary" onClick={props.onConfigure}>去填写 Bungie 配置</ControlButton> : null}
        {props.step === "login" ? <ControlButton variant="primary" aria-busy={props.isBusy} disabled={props.isBusy} onClick={props.onLogin}>{props.isBusy ? "正在打开 Bungie 登录..." : "登录 Bungie"}</ControlButton> : null}
        <ControlButton variant="secondary" onClick={props.onOpenSettings}>打开设置</ControlButton>
      </div>
    </ProductWorkspaceEmptyState>
  );
}

function StartupGateStep(props: {
  index: string;
  label: string;
  detail: string;
  status: "ready" | "current" | "pending";
}) {
  return (
    <div className="startup-gate-step" data-status={props.status}>
      <span className="startup-gate-step-index" aria-hidden="true">{props.index}</span>
      <span className="startup-gate-step-copy">
        <strong>{props.label}</strong>
        <small>{props.detail}</small>
      </span>
    </div>
  );
}
