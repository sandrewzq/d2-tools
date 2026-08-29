import { ProductShellHost } from "@d2-tools/ui";
import type { StartupState } from "../api/types";
import { HomePageItemDetailModal } from "./HomePageItemDetailModal";
import { HomePageRoutes } from "./HomePageRoutes";
import { DesktopMenuSessionProvider } from "./providers/DesktopMenuProviderContext";
import { useDesktopProductShell } from "./useDesktopProductShell";

export function HomePage(props: {
  state: StartupState;
  onConfigChanged: () => void;
  onLoginComplete: () => void;
  onManifestInitialized: () => void;
}) {
  // #region debug-point B:home-render-enter
  void fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "desktop-first-load-stall", runId: "pre-fix-2", hypothesisId: "B", location: "HomePage.tsx:HomePage", msg: "[DEBUG] HomePage render entered", data: {}, ts: Date.now() }) }).catch(() => {});
  // #endregion
  const shell = useDesktopProductShell(props);
  // #region debug-point B:shell-hook-returned
  void fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "desktop-first-load-stall", runId: "pre-fix-2", hypothesisId: "B", location: "HomePage.tsx:HomePage", msg: "[DEBUG] desktop shell hook returned", data: { activePage: shell.activePage }, ts: Date.now() }) }).catch(() => {});
  // #endregion

  return (
    <DesktopMenuSessionProvider value={shell.menuSession}>
      <ProductShellHost
        activePage={shell.activePage}
        assistantMode={shell.assistantMode}
        preferences={shell.productPreferences}
        onPageChange={shell.handlePageChange}
        onAssistantModeChange={shell.handleAssistantModeChange}
        onPreferencesChange={shell.handleProductPreferencesChange}
        shellStatus={shell.shellStatus}
        backgroundTasks={shell.backgroundTasks}
        onOpenBackgroundTask={() => shell.openBackgroundTasks()}
        sidebarHeader={shell.sidebarHeader}
        sidebarFooter={shell.sidebarFooter}
        platformActions={shell.platformActions}
        pageHeader={shell.pageHeader}
        assistantPanel={shell.assistantPanel}
        renderPage={() => (
          <>
            {shell.startupGate ?? <HomePageRoutes activePage={shell.activePage} />}
            <HomePageItemDetailModal {...shell.itemDetailModalProps} />
          </>
        )}
      />
    </DesktopMenuSessionProvider>
  );
}
