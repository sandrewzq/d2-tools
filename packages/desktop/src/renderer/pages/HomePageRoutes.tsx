import type { ShellPageKey } from "@d2-tools/ui";
import { Suspense, type ComponentProps } from "react";
import { AccountPage } from "../features/account/AccountPage";
import { HomeDashboard } from "../features/home/HomeDashboard";
import { LibraryPage } from "../features/library/LibraryPage";
import { LoadoutsPage } from "../features/loadouts/LoadoutsPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { VaultPage } from "../features/vault/VaultPage";
import { VendorsPage } from "../features/vendors/VendorsPage";

export function HomePageRoutes(props: {
  activePage: ShellPageKey;
  home: ComponentProps<typeof HomeDashboard>;
  account: ComponentProps<typeof AccountPage>;
  loadouts: ComponentProps<typeof LoadoutsPage>;
  library: ComponentProps<typeof LibraryPage>;
  vendors: ComponentProps<typeof VendorsPage>;
  vault: ComponentProps<typeof VaultPage>;
  settings: ComponentProps<typeof SettingsPage>;
}) {
  return (
    <Suspense fallback={<div className="page-loading">加载中...</div>}>
      {props.activePage === "home" ? <HomeDashboard {...props.home} /> : null}
      {props.activePage === "account" ? <AccountPage {...props.account} /> : null}
      {props.activePage === "loadouts" ? <LoadoutsPage {...props.loadouts} /> : null}
      {props.activePage === "library" ? <LibraryPage {...props.library} /> : null}
      {props.activePage === "vendors" ? <VendorsPage {...props.vendors} /> : null}
      {props.activePage === "vault" ? <VaultPage {...props.vault} /> : null}
      {props.activePage === "settings" ? <SettingsPage {...props.settings} /> : null}
    </Suspense>
  );
}
