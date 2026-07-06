import { useState } from "react";
import {
  defaultProductPreferences,
  getBungieLocaleForInterface,
  getNextInterfaceLocale
} from "../i18n/preferences.js";
import type { ProductPreferences } from "../i18n/types.js";
import { AppShell } from "../shell/AppShell.js";
import type { ShellAssistantMode, ShellPageKey } from "../shell/types.js";
import { ProductWorkspaceHeader, ProductWorkspacePage } from "../workspace/ProductWorkspace.js";
import type { ProductShellHostProps } from "./types.js";

export function ProductShellHost(props: ProductShellHostProps) {
  const [uncontrolledActivePage, setUncontrolledActivePage] = useState<ShellPageKey>(props.initialPage ?? "home");
  const [uncontrolledAssistantMode, setUncontrolledAssistantMode] = useState<ShellAssistantMode>(props.initialAssistantMode ?? null);
  const [uncontrolledPreferences, setUncontrolledPreferences] = useState<ProductPreferences>({
    ...defaultProductPreferences,
    ...props.initialPreferences
  });
  const activePage = props.activePage ?? uncontrolledActivePage;
  const assistantMode = props.assistantMode ?? uncontrolledAssistantMode;
  const preferences = props.preferences ?? uncontrolledPreferences;
  const pageHeader = typeof props.pageHeader === "function"
    ? props.pageHeader(activePage, preferences)
    : props.pageHeader;

  function changePage(page: ShellPageKey) {
    if (props.activePage === undefined) {
      setUncontrolledActivePage(page);
    }
    props.onPageChange?.(page);
  }

  function changeAssistantMode(mode: ShellAssistantMode) {
    if (props.assistantMode === undefined) {
      setUncontrolledAssistantMode(mode);
    }
    props.onAssistantModeChange?.(mode);
  }

  function updatePreferences(updater: (current: ProductPreferences) => ProductPreferences) {
    const current = props.preferences ?? uncontrolledPreferences;
    const next = updater(current);

    if (props.preferences === undefined) {
      setUncontrolledPreferences(next);
    }

    props.onPreferencesChange?.(next);
    if (!props.onPreferencesChange) {
      void props.platformActions.persistPreferences?.(next);
    }
  }

  function toggleColorMode() {
    updatePreferences((current) => ({
      ...current,
      colorMode: current.colorMode === "light" ? "dark" : "light"
    }));
  }

  function toggleInterfaceLocale() {
    updatePreferences((current) => {
      const interfaceLocale = getNextInterfaceLocale(current.interfaceLocale);
      return {
        ...current,
        interfaceLocale,
        bungieLocale: current.followInterfaceLocaleForBungie
          ? getBungieLocaleForInterface(interfaceLocale)
          : current.bungieLocale
      };
    });
  }

  return (
    <AppShell
      activePage={activePage}
      assistantMode={assistantMode}
      colorMode={preferences.colorMode}
      interfaceLocale={preferences.interfaceLocale}
      shellStatus={props.shellStatus}
      backgroundTasks={props.backgroundTasks}
      onOpenBackgroundTasks={props.onOpenBackgroundTasks}
      assistantPanel={props.assistantPanel}
      platformActions={props.platformActions}
      onNavigate={changePage}
      onAssistantModeChange={changeAssistantMode}
      onColorModeToggle={toggleColorMode}
      onInterfaceLocaleToggle={toggleInterfaceLocale}
    >
      <ProductWorkspacePage element="section" className="product-shell-page">
        {pageHeader ? (
          <ProductWorkspaceHeader actions={pageHeader.actions}>
            <h2>{pageHeader.title}</h2>
            <p>{pageHeader.subtitle}</p>
          </ProductWorkspaceHeader>
        ) : null}
        {props.renderPage(activePage, preferences)}
      </ProductWorkspacePage>
    </AppShell>
  );
}
