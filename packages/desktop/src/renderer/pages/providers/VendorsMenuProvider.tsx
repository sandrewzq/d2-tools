import { VendorsPage } from "../../features/vendors/VendorsPage";
import { useDesktopMenuSession } from "./DesktopMenuProviderContext";

export function VendorsMenuProvider() {
  const session = useDesktopMenuSession();

  return (
    <VendorsPage
      model={session.vendors.model}
      actions={{
        selectVendor: session.vendors.selectVendor,
        refreshVendors: () => void session.vendors.refresh(),
        onOpenItem: (item, context) => {
          session.writeActions.itemDetail.closeSelectedItemDetail();
          void session.vendorDefinitionDetail.open(item, context);
        }
      }}
      interfaceLocale={session.diagnostics.languagePreferences.interfaceLocale}
    />
  );
}
