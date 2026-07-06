import { VendorsPage } from "../../features/vendors/VendorsPage";
import { useDesktopMenuProviderContext } from "./DesktopMenuProviderContext";

export function VendorsMenuProvider() {
  const { vendors } = useDesktopMenuProviderContext();
  return <VendorsPage {...vendors} />;
}
