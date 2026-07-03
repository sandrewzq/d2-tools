import { VendorsPageContentView } from "@d2-tools/ui";
import type { InterfaceLocale } from "@d2-tools/ui";
import type { VendorsPageWorkspace } from "@d2-tools/app";

export function VendorsPage(props: VendorsPageWorkspace & {
  interfaceLocale?: InterfaceLocale;
}) {
  return (
    <VendorsPageContentView
      interfaceLocale={props.interfaceLocale}
      vendors={props.vendors}
      updatedLabel={props.updatedLabel}
      sourceLabel={props.sourceLabel}
      nextResetLabel={props.nextResetLabel}
      recommendationCount={props.recommendationCount}
      verifiedItemCount={props.verifiedItemCount}
      showInternalHeading={false}
    />
  );
}
