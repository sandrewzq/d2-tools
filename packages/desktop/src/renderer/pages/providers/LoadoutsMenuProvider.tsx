import { LoadoutsPage } from "../../features/loadouts/LoadoutsPage";
import { useDesktopMenuProviderContext } from "./DesktopMenuProviderContext";

export function LoadoutsMenuProvider() {
  const { loadouts } = useDesktopMenuProviderContext();
  return <LoadoutsPage {...loadouts} />;
}
