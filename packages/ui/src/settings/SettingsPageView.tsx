import type { ReactNode } from "react";
import { ProductWorkspacePage } from "../workspace/ProductWorkspace.js";

/** @deprecated 平台壳应直接使用 SettingsPageContentView。保留此包装仅兼容既有导出。 */
export function SettingsPageView(props: { children?: ReactNode }) {
  return <ProductWorkspacePage className="settings-page-view">{props.children}</ProductWorkspacePage>;
}
