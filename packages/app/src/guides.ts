export type {
  GuideDocument,
  GuideDocumentDraft,
  GuideDocumentStatus,
  GuideLibraryFilters,
  GuideSnapshot,
  GuideSource,
  GuideSourceKind
} from "@d2-tools/core/guides/library";
export type { GuideSourceReadPreview, GuideSourceSection } from "@d2-tools/core/guides/source";
export type {
  GuideExtraction,
  GuideExtractionCandidate,
  GuideExtractionCandidateDetail,
  GuideExtractionCandidateDetailKind,
  GuideExtractionCandidateKind,
  GuideExtractionConfirmation,
  GuideTextReference
} from "@d2-tools/core/guides/extraction";
export {
  getGuideCurrentSnapshot,
  isSupportedGuideSourceUrl,
  searchGuideDocuments
} from "@d2-tools/core/guides/library";
export {
  confirmGuideExtraction,
  createGuideExtraction,
  restoreGuideExtractionConfirmation,
  selectConfirmedGuideRequirement
} from "@d2-tools/core/guides/extraction";
export type {
  GuideArmorConstraintDraftArtifact,
  GuideLoadoutCandidatesArtifact,
  GuideLoadoutItemCandidate
} from "@d2-tools/core/guides/derivedArtifacts";
export {
  createGuideArmorConstraintDraftArtifact,
  createGuideLoadoutCandidatesArtifact
} from "@d2-tools/core/guides/derivedArtifacts";
export type {
  GuideDerivedEntityKind,
  GuideDerivedEntityRef,
  GuideDerivedRelation,
  GuideDerivedRelationKind,
  GuideDerivedRelationStore
} from "@d2-tools/core/guides/relations";
export { selectGuideDerivedRelations } from "@d2-tools/core/guides/relations";
export type {
  GuideLibraryCategoryEntry,
  GuideLibraryDirectoryEntry,
  GuideLibraryWorkspaceModel
} from "./workspaces/guideLibraryWorkspace.js";
export {
  createEmptyGuideDocumentDraft,
  selectGuideLibraryWorkspace,
  toGuideDocumentDraft
} from "./workspaces/guideLibraryWorkspace.js";
