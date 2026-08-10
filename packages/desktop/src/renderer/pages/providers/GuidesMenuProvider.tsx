import { getLocaleCopy, GuideLibraryPageContentView } from "@d2-tools/ui";
import { useDesktopMenuSession } from "./DesktopMenuProviderContext";

export function GuidesMenuProvider() {
  const session = useDesktopMenuSession();
  const guides = session.guides;
  const copy = getLocaleCopy(session.diagnostics.languagePreferences.interfaceLocale).guides;
  return (
    <GuideLibraryPageContentView
      interfaceLocale={session.diagnostics.languagePreferences.interfaceLocale}
      model={guides.workspace}
      filters={guides.filters}
      draft={guides.draft}
      editingDocumentId={guides.editingDocumentId}
      isLoading={guides.isLoading}
      isSaving={guides.isSaving}
      error={guides.error}
      errorKind={guides.errorKind}
      canReadSource
      sourcePreview={guides.sourcePreview}
      isReadingSource={guides.isReadingSource}
      sourceError={guides.sourceError}
      extractionPreview={guides.extractionPreview}
      confirmedExtraction={guides.confirmedExtraction}
      armorConstraintDraft={guides.armorConstraintDraft}
      loadoutCandidates={guides.loadoutCandidates}
      isCreatingLoadoutCandidates={guides.isCreatingLoadoutCandidates}
      loadoutCandidatesError={guides.loadoutCandidatesError}
      derivedRelations={guides.derivedRelations}
      derivedRelationsError={guides.derivedRelationsError}
      isExtracting={guides.isExtracting}
      isConfirmingExtraction={guides.isConfirmingExtraction}
      extractionError={guides.extractionError}
      targetConversionResult={guides.targetConversionResult}
      isConvertingTargets={guides.isConvertingTargets}
      targetConversionError={guides.targetConversionError}
      actions={{
        selectDocument: guides.selectDocument,
        filtersChange: (patch) => guides.setFilters((current) => ({ ...current, ...patch })),
        startImportDocument: guides.startImportDocument,
        startNewDocument: guides.startNewDocument,
        startEditingDocument: guides.startEditingDocument,
        draftChange: guides.setDraft,
        saveDraft: () => void guides.saveDraft(),
        cancelEditing: guides.cancelEditing,
        toggleFavorite: guides.toggleFavorite,
        toggleArchive: guides.toggleArchive,
        deleteDocument: (document) => {
          if (window.confirm(copy.deleteConfirmation(document.title))) {
            void guides.deleteDocument(document);
          }
        },
        openSource: (url) => void window.d2.openExternal(url),
        reload: () => void guides.reload(),
        readSource: () => void guides.readSource(),
        acceptSourcePreview: guides.acceptSourcePreview,
        dismissSourcePreview: guides.dismissSourcePreview,
        previewExtraction: (document) => void guides.previewExtraction(document),
        confirmExtraction: (ids) => void guides.confirmExtraction(ids),
        convertConfirmedTargets: (extraction) => void guides.convertConfirmedTargets(extraction),
        openArmorConstraintDraft: (artifact) => {
          const character = session.account.accountSummary?.characters.find((entry) => (
            entry.character_id === session.account.selectedCharacterId
          )) ?? null;
          session.localLoadoutPlans.startFromGuideArmorConstraintDraft(artifact, character);
          session.setActivePage("loadouts");
        },
        createLoadoutCandidates: (extraction) => void guides.createLoadoutCandidates(
          extraction,
          session.account.selectedCharacterId
        ),
        openLoadoutCandidates: (artifact) => {
          session.localLoadoutPlans.prefillFromGuideLoadoutCandidates(artifact);
          session.setActivePage("loadouts");
        },
        openDerivedEntity: (entity) => {
          if (entity.kind === "local_loadout_plan") {
            session.localLoadoutPlans.selectPlan(entity.id);
            session.setActivePage("loadouts");
            return;
          }
          if (entity.kind === "equipment_target") session.locateVaultTarget(entity.id);
        },
        dismissExtractionPreview: guides.dismissExtractionPreview
      }}
    />
  );
}
