import type { ReactNode } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale } from "../i18n/types.js";
import { ProductWorkspacePage, ProductWorkspacePanel } from "../workspace/ProductWorkspace.js";

export type VaultPageViewProps = {
  interfaceLocale?: InterfaceLocale;
  accountReady: boolean;
  isLoadingAccount?: boolean;
  accountError?: string;
  onLoadAccount?: () => void;
  children?: ReactNode;
};

export function VaultPageView(props: VaultPageViewProps) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").vault;

  if (!props.accountReady) {
    return (
      <ProductWorkspacePage className="vault-page-view vault-product-layout">
        <ProductWorkspacePanel className="vault-empty-panel">
          <div className="section-heading">
            <div>
              <h2>{copy.emptyTitle}</h2>
              <p>{copy.emptySubtitle}</p>
            </div>
            {props.onLoadAccount ? (
              <button type="button" disabled={props.isLoadingAccount} onClick={props.onLoadAccount}>
                {props.isLoadingAccount ? copy.loading : copy.loadAccount}
              </button>
            ) : null}
          </div>
          {props.accountError ? <p className="status-message status-error">{props.accountError}</p> : null}
        </ProductWorkspacePanel>
      </ProductWorkspacePage>
    );
  }

  return (
    <ProductWorkspacePage element="div" className="vault-page-view vault-product-layout">
      {props.children}
    </ProductWorkspacePage>
  );
}
