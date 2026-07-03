import type { ReactNode } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale } from "../i18n/types.js";

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

  return (
    <section className="tool-panel library-reference-page library-product-layout">
      <div className={(props.showInternalHeading ?? true) ? "library-reference-hero" : "library-reference-hero library-reference-hero-compact"}>
        <div>
          {(props.showInternalHeading ?? true) ? (
            <>
              <h2>{copy.title}</h2>
              <p>{copy.subtitle}</p>
            </>
          ) : null}
        </div>
      </div>
      {props.manifestAlert}
      <div className="library-workbench-layout">
        {props.children}
      </div>
    </section>
  );
}
