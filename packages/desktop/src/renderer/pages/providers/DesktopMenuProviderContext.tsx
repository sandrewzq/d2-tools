import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { ShellPageKey } from "@d2-tools/ui";
import type { StartupState } from "../../api/types";
import type { useAccountWorkspace } from "../../features/account/useAccountWorkspace";
import type { useDailySummary } from "../../features/daily/useDailySummary";
import type { useHomePageDerivedState } from "../../features/home/useHomePageDerivedState";
import type { useLibraryWorkspace } from "../../features/library/useLibraryWorkspace";
import type { useLoadoutTemplates } from "../../features/loadouts/useLoadoutTemplates";
import type { useDiagnosticsSettings } from "../../features/settings/useDiagnosticsSettings";
import type { useVendorDefinitionDetail } from "../../features/vendors/useVendorDefinitionDetail";
import type { useVendorsWorkspace } from "../../features/vendors/useVendorsWorkspace";
import type { useDesktopProductWriteActions } from "../useDesktopProductWriteActions";

export type DesktopMenuSession = {
  state: StartupState;
  onConfigure: () => void;
  setActivePage: Dispatch<SetStateAction<ShellPageKey>>;
  setVaultFacts: Dispatch<SetStateAction<string[]>>;
  vaultLocateRequest: { hash: number; name: string; requestId: number } | null;
  locateVaultItem: (item: { hash: number; name: string }) => void;
  lastAccountLoadedAt: Date | null;
  refreshAccountManually: () => void;
  account: ReturnType<typeof useAccountWorkspace>;
  daily: ReturnType<typeof useDailySummary>;
  diagnostics: ReturnType<typeof useDiagnosticsSettings>;
  home: ReturnType<typeof useHomePageDerivedState>;
  library: ReturnType<typeof useLibraryWorkspace>;
  loadouts: ReturnType<typeof useLoadoutTemplates>;
  vendors: ReturnType<typeof useVendorsWorkspace>;
  vendorDefinitionDetail: ReturnType<typeof useVendorDefinitionDetail>;
  writeActions: ReturnType<typeof useDesktopProductWriteActions>;
};

const DesktopMenuSessionContext = createContext<DesktopMenuSession | null>(null);

export const DesktopMenuSessionProvider = DesktopMenuSessionContext.Provider;

export function useDesktopMenuSession(): DesktopMenuSession {
  const value = useContext(DesktopMenuSessionContext);
  if (!value) {
    throw new Error("Desktop menu providers must be rendered inside DesktopMenuSessionProvider.");
  }

  return value;
}
