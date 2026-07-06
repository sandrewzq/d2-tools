import type { ReactNode } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale } from "../i18n/types.js";
import {
  ProductWorkspacePage,
  ProductWorkspaceSplit
} from "../workspace/ProductWorkspace.js";

export type LibraryPageViewMode = "equipment" | "perks";

export type LibraryPageViewProps = {
  interfaceLocale?: InterfaceLocale;
  manifestVersionLabel: string;
  manifestNeedsUpdate?: boolean;
  viewMode: LibraryPageViewMode;
  showInternalHeading?: boolean;
  onViewModeChange: (mode: LibraryPageViewMode) => void;
  manifestAlert?: ReactNode;
  children?: ReactNode;
};

export function LibraryPageView(props: LibraryPageViewProps) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").library;
  const showInternalHeading = props.showInternalHeading ?? true;

  return (
    <ProductWorkspacePage className="library-reference-page library-product-layout">
      {showInternalHeading ? (
        <div className="library-reference-hero">
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.subtitle}</p>
          </div>
        </div>
      ) : null}
      {props.manifestAlert}
      <ProductWorkspaceSplit className="library-workbench-layout">
        {props.children}
      </ProductWorkspaceSplit>
    </ProductWorkspacePage>
  );
}
