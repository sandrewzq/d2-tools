import type { ReactNode } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale } from "../i18n/types.js";

export type LibraryPageViewMode = "equipment" | "perks";

export type LibraryPageViewProps = {
  interfaceLocale?: InterfaceLocale;
  manifestVersionLabel: string;
  manifestNeedsUpdate?: boolean;
  viewMode: LibraryPageViewMode;
  onViewModeChange: (mode: LibraryPageViewMode) => void;
  manifestAlert?: ReactNode;
  children?: ReactNode;
};

export function LibraryPageView(props: LibraryPageViewProps) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").library;

  return (
    <section className="tool-panel library-reference-page library-product-layout">
      <div className="library-reference-hero">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <div className="library-reference-status">
          <span>{copy.versionLabel}</span>
          <strong>{props.manifestVersionLabel}</strong>
          <small>{props.manifestNeedsUpdate ? copy.staleLabel : copy.freshLabel}</small>
        </div>
      </div>
      {props.manifestAlert}
      <div className="library-acquisition-tabs segmented-control">
        <button
          type="button"
          value="equipment"
          className={props.viewMode === "equipment" ? "active" : ""}
          onClick={() => props.onViewModeChange("equipment")}
        >
          {copy.tabs.equipment}
        </button>
        <button
          type="button"
          value="perks"
          className={props.viewMode === "perks" ? "active" : ""}
          onClick={() => props.onViewModeChange("perks")}
        >
          {copy.tabs.perks}
        </button>
      </div>
      {props.children}
    </section>
  );
}
