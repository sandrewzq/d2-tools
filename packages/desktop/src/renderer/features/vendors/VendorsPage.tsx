import { VendorsPageContentView } from "@d2-tools/ui";
import type { InterfaceLocale } from "@d2-tools/ui";
import type { VendorsPageActions } from "@d2-tools/ui";
import type { VendorsPageWorkspace } from "@d2-tools/app/vendors";

export function VendorsPage(props: {
  model: VendorsPageWorkspace;
  actions: VendorsPageActions;
  interfaceLocale?: InterfaceLocale;
  availability?: {
    isBungieConfigured: boolean;
    isAccountLoggedIn: boolean;
    onConfigureBungie: () => void;
    onLoginBungie: () => void;
  };
}) {
  return (
    <VendorsPageContentView
      interfaceLocale={props.interfaceLocale}
      model={props.model}
      actions={props.actions}
      availability={props.availability}
    />
  );
}
