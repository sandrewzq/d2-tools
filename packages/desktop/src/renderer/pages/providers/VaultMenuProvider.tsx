import { VaultPage } from "../../features/vault/VaultPage";
import { useDesktopMenuProviderContext } from "./DesktopMenuProviderContext";

export function VaultMenuProvider() {
  const { vault } = useDesktopMenuProviderContext();
  return <VaultPage {...vault} />;
}
