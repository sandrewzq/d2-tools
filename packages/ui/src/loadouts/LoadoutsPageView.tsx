import type { ReactNode } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale } from "../i18n/types.js";

export type LoadoutsPageViewProps = {
  interfaceLocale?: InterfaceLocale;
  message?: string;
  missingCount: number;
  readyCount: number;
  actionableCount: number;
  children?: ReactNode;
};

export function LoadoutsPageView(props: LoadoutsPageViewProps) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").loadouts;

  return (
    <section className="tool-panel loadouts-page loadout-product-layout">
      <div className="section-heading">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
      </div>
      {props.message ? <p className={props.message.includes("失败") ? "status-message status-error" : "status-message status-ready"}>{props.message}</p> : null}
      <section className="product-card loadout-risk-panel">
        <div className="section-heading compact-heading">
          <div>
            <h3>{copy.riskTitle}</h3>
            <p>{copy.riskSubtitle}</p>
          </div>
        </div>
        <div className="loadout-risk-grid">
          <span>{copy.missingItems} {props.missingCount} 件</span>
          <span>{copy.readyItems} {props.readyCount} 件</span>
          <span>{copy.actionableItems} {props.actionableCount} 件</span>
        </div>
      </section>
      {props.children}
    </section>
  );
}
