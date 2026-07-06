import { AccountPage } from "../../features/account/AccountPage";
import { useDesktopMenuProviderContext } from "./DesktopMenuProviderContext";

export function AccountMenuProvider() {
  const { account } = useDesktopMenuProviderContext();
  return <AccountPage {...account} />;
}
