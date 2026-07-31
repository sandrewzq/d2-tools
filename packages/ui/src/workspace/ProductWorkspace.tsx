import { createElement, type AriaRole, type ReactNode } from "react";

type WorkspaceElement = "div" | "section" | "main" | "aside" | "nav" | "header";
type WorkspaceSurface = "page" | "section" | "frame" | "workspace-frame" | "object-card" | "list" | "row" | "split" | "content-stack" | "empty" | "menu" | "dialog" | "drawer";
type ShellRole = "page-header" | "command-bar" | "side-rail";

type WorkspaceProps = {
  children?: ReactNode;
  className?: string;
  ariaLabel?: string;
  referenceId?: string;
  contractRoot?: "product-workspace" | "detail-dossier";
  id?: string;
  element?: WorkspaceElement;
  scrollRegion?: "page" | "pane" | "overlay";
  surface?: WorkspaceSurface;
  shellRole?: ShellRole;
  uiKind?: string;
  role?: AriaRole;
  ariaLive?: "off" | "polite" | "assertive";
  ariaBusy?: boolean;
};

function classNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function renderWorkspaceElement(
  element: WorkspaceElement,
  className: string,
  props: WorkspaceProps
) {
  return createElement(
    element,
    {
      className,
      "aria-label": props.ariaLabel,
      "data-reference-id": props.referenceId,
      "data-contract-root": props.contractRoot,
      "data-scroll-region": props.scrollRegion,
      "data-shell-role": props.shellRole,
      "data-surface": props.surface,
      "data-ui-kind": props.uiKind,
      role: props.role,
      "aria-live": props.ariaLive,
      "aria-busy": props.ariaBusy,
      id: props.id
    },
    props.children
  );
}

export function ProductWorkspacePage(props: WorkspaceProps) {
  return renderWorkspaceElement(
    props.element ?? "section",
    classNames("product-workspace-page", props.className),
    { ...props, contractRoot: props.contractRoot ?? "product-workspace", surface: props.surface ?? "page" }
  );
}

export function ProductWorkspaceHeader(props: WorkspaceProps & { actions?: ReactNode }) {
  return renderWorkspaceElement(
    props.element ?? "header",
    classNames("product-workspace-header", props.className),
    {
      ...props,
      shellRole: props.shellRole ?? "page-header",
      uiKind: props.uiKind ?? "page-header",
      children: (
        <>
          <div className="product-workspace-title">{props.children}</div>
          {props.actions ? (
            <div className="button-row product-page-header-actions">
              {props.actions}
            </div>
          ) : null}
        </>
      )
    }
  );
}

export function ProductWorkspacePanel(props: WorkspaceProps) {
  return renderWorkspaceElement(
    props.element ?? "section",
    classNames("product-workspace-panel", props.className),
    { ...props, surface: props.surface ?? "frame" }
  );
}

export function ProductWorkspaceCommandBar(props: WorkspaceProps) {
  return renderWorkspaceElement(
    props.element ?? "div",
    classNames("product-command-bar", props.className),
    { ...props, surface: props.surface ?? "section", shellRole: props.shellRole ?? "command-bar" }
  );
}

export function ProductWorkspaceSplit(props: WorkspaceProps) {
  return renderWorkspaceElement(
    props.element ?? "div",
    classNames("product-split-workspace", props.className),
    { ...props, surface: props.surface ?? "split" }
  );
}

export function ProductWorkspaceSideRail(props: WorkspaceProps) {
  return renderWorkspaceElement(
    props.element ?? "aside",
    classNames("product-side-rail", props.className),
    { ...props, shellRole: props.shellRole ?? "side-rail" }
  );
}

export function ProductWorkspaceContentStack(props: WorkspaceProps) {
  return renderWorkspaceElement(
    props.element ?? "div",
    classNames("product-content-stack", props.className),
    { ...props, surface: props.surface ?? "content-stack" }
  );
}

export function ProductWorkspaceEmptyState(props: WorkspaceProps) {
  return renderWorkspaceElement(
    props.element ?? "div",
    classNames("product-workspace-empty", props.className),
    { ...props, surface: props.surface ?? "empty", uiKind: props.uiKind ?? "state-frame" }
  );
}
