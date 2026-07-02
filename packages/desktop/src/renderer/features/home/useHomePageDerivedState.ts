import { createHomePageDerivedState, type HomePageKey } from "@d2-tools/app";
import type { ShellPageKey } from "@d2-tools/ui";
import type { AccountSummary, D2Config, LoadoutTemplate, StartupState } from "../../api/types";
import { buildDiagnosticRows } from "../../components/DiagnosticsPanel";
import { buildLoadoutTemplateLookup } from "../../shared/domain/loadouts/loadoutLookup";
import { isAiSettingsConfigured } from "../../utils/aiSettings";

export function useHomePageDerivedState(input: {
  activePage: ShellPageKey;
  state: StartupState;
  accountSummary: AccountSummary | null;
  selectedCharacterId: string;
  activeLoadoutTemplate: LoadoutTemplate | null;
  vaultFacts: string[];
  library: {
    libraryHistory: { recent: Array<{ name: string }> };
    libraryViewMode: "equipment" | "perks";
    equipmentFilters: { query: string };
    perkFilters: { query: string };
    items: unknown[];
    perks: unknown[];
    equipmentSearchTouched: boolean;
    perkSearchTouched: boolean;
  };
  diagnostics: {
    aiSettings: D2Config["ai"];
    diagnosticDataDir: string;
    diagnosticManifestVersion?: string;
  };
}) {
  const isAiConfigured = isAiSettingsConfigured(input.diagnostics.aiSettings);
  const activeLoadoutLookup = input.activeLoadoutTemplate
    ? buildLoadoutTemplateLookup(input.activeLoadoutTemplate)
    : null;
  const diagnosticRows = buildDiagnosticRows({
    state: input.state,
    dataDir: input.diagnostics.diagnosticDataDir,
    manifestVersion: input.diagnostics.diagnosticManifestVersion
  });
  const homeDerivedState = createHomePageDerivedState({
    activePage: input.activePage as HomePageKey,
    account: input.accountSummary,
    selectedCharacterId: input.selectedCharacterId,
    activeLoadoutName: input.activeLoadoutTemplate?.name,
    activeLoadoutTemplate: input.activeLoadoutTemplate,
    libraryRecentNames: input.library.libraryHistory.recent.map((item) => item.name),
    vaultFacts: input.vaultFacts,
    libraryViewMode: input.library.libraryViewMode,
    equipmentQuery: input.library.equipmentFilters.query,
    perkQuery: input.library.perkFilters.query,
    equipmentResultCount: input.library.items.length,
    perkResultCount: input.library.perks.length,
    equipmentSearchTouched: input.library.equipmentSearchTouched,
    perkSearchTouched: input.library.perkSearchTouched,
    isAiConfigured,
    diagnosticRows
  });

  return {
    activeLoadoutLookup,
    currentPageMeta: homeDerivedState.pageMeta,
    assistantPageContext: homeDerivedState.assistantPageContext,
    diagnosticRows,
    isAiConfigured
  };
}
