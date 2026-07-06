import { createElement, type ReactNode } from "react";

type WorkspaceElement = "div" | "section" | "main" | "aside" | "nav" | "header";

type WorkspaceProps = {
  children?: ReactNode;
  className?: string;
  ariaLabel?: string;
  id?: string;
  element?: WorkspaceElement;
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
      id: props.id
    },
    props.children
  );
}

export function ProductWorkspacePage(props: WorkspaceProps) {
  return renderWorkspaceElement(
    props.element ?? "section",
    classNames("product-workspace-page", props.className),
    props
  );
}

export function ProductWorkspaceHeader(props: WorkspaceProps & { actions?: ReactNode }) {
  return renderWorkspaceElement(
    props.element ?? "header",
    classNames("product-workspace-header", props.className),
    {
      ...props,
      children: (
        <>
          <div>{props.children}</div>
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
    props
  );
}

export function ProductWorkspaceCommandBar(props: WorkspaceProps) {
  return renderWorkspaceElement(
    props.element ?? "div",
    classNames("product-command-bar", props.className),
    props
  );
}

export function ProductWorkspaceSplit(props: WorkspaceProps) {
  return renderWorkspaceElement(
    props.element ?? "div",
    classNames("product-split-workspace", props.className),
    props
  );
}

export function ProductWorkspaceSideRail(props: WorkspaceProps) {
  return renderWorkspaceElement(
    props.element ?? "aside",
    classNames("product-side-rail", props.className),
    props
  );
}

export function ProductWorkspaceContentStack(props: WorkspaceProps) {
  return renderWorkspaceElement(
    props.element ?? "div",
    classNames("product-content-stack", props.className),
    props
  );
}

export function ProductWorkspaceEmptyState(props: WorkspaceProps) {
  return renderWorkspaceElement(
    props.element ?? "div",
    classNames("product-workspace-empty", props.className),
    props
  );
}
