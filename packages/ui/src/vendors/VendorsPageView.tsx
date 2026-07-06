import type { ReactNode } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale } from "../i18n/types.js";
import { ProductWorkspaceCommandBar, ProductWorkspacePage } from "../workspace/ProductWorkspace.js";

export type VendorsPageViewProps = {
  interfaceLocale?: InterfaceLocale;
  updatedLabel: string;
  sourceLabel: string;
  nextResetLabel: string;
  verifiedItemCount: number;
  recommendationCount: number;
  showInternalHeading?: boolean;
  children?: ReactNode;
};

export function VendorsPageView(props: VendorsPageViewProps) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").vendors;

  return (
    <ProductWorkspacePage className="vendors-page vendors-product-layout">
      {(props.showInternalHeading ?? true) ? (
        <div className="section-heading">
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.subtitle}</p>
          </div>
        </div>
      ) : null}

      <ProductWorkspaceCommandBar className="vendor-summary-strip" ariaLabel={copy.title}>
        <div>
          <span>{copy.updatedLabel}</span>
          <strong>{props.updatedLabel}</strong>
        </div>
        <div>
          <span>{copy.sourceLabel}</span>
          <strong>{props.sourceLabel}</strong>
        </div>
        <div>
          <span>{copy.resetLabel}</span>
          <strong>{props.nextResetLabel}</strong>
        </div>
        <div>
          <span>{copy.recommendationsLabel}</span>
          <strong>{props.recommendationCount}</strong>
        </div>
        <div>
          <span>{copy.verifiedInventory}</span>
          <strong>{props.verifiedItemCount}</strong>
        </div>
      </ProductWorkspaceCommandBar>

      {props.children}
    </ProductWorkspacePage>
  );
}
