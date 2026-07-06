import type { ReactNode } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale } from "../i18n/types.js";
import { ProductWorkspacePage, ProductWorkspacePanel } from "../workspace/ProductWorkspace.js";

export type LoadoutsPageViewProps = {
  interfaceLocale?: InterfaceLocale;
  message?: string;
  missingCount: number;
  readyCount: number;
  actionableCount: number;
  showInternalHeading?: boolean;
  children?: ReactNode;
};

export function LoadoutsPageView(props: LoadoutsPageViewProps) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").loadouts;
  const unit = copy.inline["件"] ?? "件";

  return (
    <ProductWorkspacePage className="loadouts-page loadout-product-layout">
      {(props.showInternalHeading ?? true) ? (
        <div className="section-heading">
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.subtitle}</p>
          </div>
        </div>
      ) : null}
      {props.message ? <p className={props.message.includes(copy.inline["失败"] ?? "失败") ? "status-message status-error" : "status-message status-ready"}>{props.message}</p> : null}
      <ProductWorkspacePanel className="loadout-risk-panel">
        <div className="section-heading compact-heading">
          <div>
            <h3>{copy.riskTitle}</h3>
            <p>{copy.riskSubtitle}</p>
          </div>
        </div>
        <div className="loadout-risk-grid">
          <span>{copy.missingItems} {props.missingCount} {unit}</span>
          <span>{copy.readyItems} {props.readyCount} {unit}</span>
          <span>{copy.actionableItems} {props.actionableCount} {unit}</span>
        </div>
      </ProductWorkspacePanel>
      {props.children}
    </ProductWorkspacePage>
  );
}
