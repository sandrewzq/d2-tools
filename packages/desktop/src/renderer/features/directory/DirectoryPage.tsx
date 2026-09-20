import { DirectoryPageContentView, type InterfaceLocale } from "@d2-tools/ui";

export function DirectoryPage(props: {
  interfaceLocale?: InterfaceLocale;
  onOpenExternal: (url: string) => void;
}) {
  return (
    <DirectoryPageContentView
      interfaceLocale={props.interfaceLocale}
      onOpenExternal={props.onOpenExternal}
    />
  );
}
