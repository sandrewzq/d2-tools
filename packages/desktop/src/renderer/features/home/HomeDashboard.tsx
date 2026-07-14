import { HomePageContentView, type ShellPageKey } from "@d2-tools/ui";
import { selectHomePageModel, type HomePageModelInput } from "@d2-tools/app/home";

export function HomeDashboard(props: HomePageModelInput & {
  interfaceLocale?: "zh-CN" | "en-US";
  onConfigure: () => void;
  onLogin: () => void;
  onLoadAccount: () => void;
  onInitializeManifest: () => void;
  onConfigureAi: () => void;
  onRefreshDiagnostics: () => void;
  onNavigate: (page: ShellPageKey) => void;
  onRefreshDaily: () => void;
}) {
  const model = selectHomePageModel(props);

  return (
    <HomePageContentView
      {...model}
      onConfigure={props.onConfigure}
      onLogin={props.onLogin}
      onLoadAccount={props.onLoadAccount}
      onInitializeManifest={props.onInitializeManifest}
      onConfigureAi={props.onConfigureAi}
      onRefreshDiagnostics={props.onRefreshDiagnostics}
      onNavigate={props.onNavigate}
      onRefreshDaily={props.onRefreshDaily}
    />
  );
}
