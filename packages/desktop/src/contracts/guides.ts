import type {
  CreateGuideDocumentInput,
  GuideDocument,
  UpdateGuideDocumentInput
} from "@d2-tools/core/guides/library";
import type { GuideSourceReadPreview } from "@d2-tools/core/guides/source";
import type { GuideExtraction } from "@d2-tools/core/guides/extraction";
import type { GuideLoadoutCandidatesArtifact } from "@d2-tools/core/guides/derivedArtifacts";
import type { GuideDerivedRelation } from "@d2-tools/core/guides/relations";

export type {
  CreateGuideDocumentInput,
  GuideDocument,
  GuideDocumentDraft,
  GuideDocumentStatus,
  GuideLibraryFilters,
  GuideSnapshot,
  GuideSource,
  GuideSourceKind,
  UpdateGuideDocumentInput
} from "@d2-tools/core/guides/library";
export type { GuideSourceReadPreview, GuideSourceSection } from "@d2-tools/core/guides/source";
export type {
  GuideExtraction,
  GuideExtractionCandidate,
  GuideExtractionCandidateDetail,
  GuideExtractionCandidateDetailKind,
  GuideExtractionCandidateKind,
  GuideTextReference
} from "@d2-tools/core/guides/extraction";
export type {
  GuideArmorConstraintDraftArtifact,
  GuideLoadoutCandidatesArtifact,
  GuideLoadoutItemCandidate
} from "@d2-tools/core/guides/derivedArtifacts";
export type {
  GuideDerivedEntityKind,
  GuideDerivedEntityRef,
  GuideDerivedRelation,
  GuideDerivedRelationKind,
  GuideDerivedRelationStore
} from "@d2-tools/core/guides/relations";

export type GuideLibraryApi = {
  listGuideDocuments(): Promise<GuideDocument[]>;
  createGuideDocument(input: CreateGuideDocumentInput): Promise<GuideDocument>;
  updateGuideDocument(id: string, input: UpdateGuideDocumentInput): Promise<GuideDocument>;
  deleteGuideDocument(id: string): Promise<GuideDocument[]>;
  readGuideSource(url: string): Promise<GuideSourceReadPreview>;
  listGuideExtractions(): Promise<GuideExtraction[]>;
  listGuideDerivedRelations(): Promise<GuideDerivedRelation[]>;
  previewGuideExtraction(id: string): Promise<GuideExtraction>;
  confirmGuideExtraction(input: {
    guideDocumentId: string;
    extractionId: string;
    acceptedCandidateIds: string[];
  }): Promise<GuideExtraction>;
  createGuideLoadoutCandidates(input: {
    guideDocumentId: string;
    extractionId: string;
    characterId: string;
  }): Promise<GuideLoadoutCandidatesArtifact>;
};
