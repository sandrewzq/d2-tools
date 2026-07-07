import { VendorsPageContentView } from "@d2-tools/ui";
import type { InterfaceLocale } from "@d2-tools/ui";
import type { VendorsPageActions } from "@d2-tools/ui";
import type { VendorsPageWorkspace } from "@d2-tools/app";

export function VendorsPage(props: {
  model: VendorsPageWorkspace;
  actions: VendorsPageActions;
  interfaceLocale?: InterfaceLocale;
}) {
  return (
    <VendorsPageContentView
      interfaceLocale={props.interfaceLocale}
      model={props.model}
      actions={props.actions}
    />
  );
}
