import { ProductShellHost } from "@d2-tools/ui";
import type { StartupState } from "../api/types";
import { HomePageItemDetailModal } from "./HomePageItemDetailModal";
import { HomePageRoutes } from "./HomePageRoutes";
import { DesktopMenuProvider } from "./providers/DesktopMenuProviderContext";
import { useDesktopProductShell } from "./useDesktopProductShell";

export function HomePage(props: {
  state: StartupState;
  onConfigure: () => void;
  onConfigChanged: () => void;
  onLoginComplete: () => void;
  onManifestInitialized: () => void;
}) {
  const shell = useDesktopProductShell(props);

  return (
    <DesktopMenuProvider value={shell.menuContext}>
      <ProductShellHost
        activePage={shell.activePage}
        assistantMode={shell.assistantMode}
        preferences={shell.productPreferences}
        onPageChange={shell.handlePageChange}
        onAssistantModeChange={shell.handleAssistantModeChange}
        onPreferencesChange={shell.handleProductPreferencesChange}
        shellStatus={shell.shellStatus}
        backgroundTasks={shell.backgroundTasks}
        onOpenBackgroundTasks={() => shell.handlePageChange("settings")}
        platformActions={shell.platformActions}
        pageHeader={shell.pageHeader}
        assistantPanel={shell.assistantPanel}
        renderPage={() => (
          <>
            <HomePageRoutes activePage={shell.activePage} />
            <HomePageItemDetailModal {...shell.itemDetailModalProps} />
          </>
        )}
      />
    </DesktopMenuProvider>
  );
}
