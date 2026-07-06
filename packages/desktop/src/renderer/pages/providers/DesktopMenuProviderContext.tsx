import { createContext, useContext, type ComponentProps } from "react";
import { AccountPage } from "../../features/account/AccountPage";
import { HomeDashboard } from "../../features/home/HomeDashboard";
import { LibraryPage } from "../../features/library/LibraryPage";
import { LoadoutsPage } from "../../features/loadouts/LoadoutsPage";
import { SettingsPage } from "../../features/settings/SettingsPage";
import { VaultPage } from "../../features/vault/VaultPage";
import { VendorsPage } from "../../features/vendors/VendorsPage";

export type DesktopMenuProviderContextValue = {
  account: ComponentProps<typeof AccountPage>;
  home: ComponentProps<typeof HomeDashboard>;
  library: ComponentProps<typeof LibraryPage>;
  loadouts: ComponentProps<typeof LoadoutsPage>;
  settings: ComponentProps<typeof SettingsPage>;
  vault: ComponentProps<typeof VaultPage>;
  vendors: ComponentProps<typeof VendorsPage>;
};

const DesktopMenuProviderContext = createContext<DesktopMenuProviderContextValue | null>(null);

export const DesktopMenuProvider = DesktopMenuProviderContext.Provider;

export function useDesktopMenuProviderContext() {
  const value = useContext(DesktopMenuProviderContext);
  if (!value) {
    throw new Error("Desktop menu providers must be rendered inside DesktopMenuProvider.");
  }

  return value;
}
