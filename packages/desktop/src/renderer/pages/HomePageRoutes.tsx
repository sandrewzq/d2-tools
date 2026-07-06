import type { ShellPageKey } from "@d2-tools/ui";
import { Suspense } from "react";
import { AccountMenuProvider } from "./providers/AccountMenuProvider";
import { HomeMenuProvider } from "./providers/HomeMenuProvider";
import { LibraryMenuProvider } from "./providers/LibraryMenuProvider";
import { LoadoutsMenuProvider } from "./providers/LoadoutsMenuProvider";
import { SettingsMenuProvider } from "./providers/SettingsMenuProvider";
import { VaultMenuProvider } from "./providers/VaultMenuProvider";
import { VendorsMenuProvider } from "./providers/VendorsMenuProvider";

export function HomePageRoutes(props: {
  activePage: ShellPageKey;
}) {
  return (
    <Suspense fallback={<div className="page-loading">加载中...</div>}>
      {props.activePage === "home" ? <HomeMenuProvider /> : null}
      {props.activePage === "account" ? <AccountMenuProvider /> : null}
      {props.activePage === "loadouts" ? <LoadoutsMenuProvider /> : null}
      {props.activePage === "library" ? <LibraryMenuProvider /> : null}
      {props.activePage === "vendors" ? <VendorsMenuProvider /> : null}
      {props.activePage === "vault" ? <VaultMenuProvider /> : null}
      {props.activePage === "settings" ? <SettingsMenuProvider /> : null}
    </Suspense>
  );
}
