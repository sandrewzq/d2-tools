import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createGuideArmorConstraintDraftArtifact,
  createEmptyGuideDocumentDraft,
  isSupportedGuideSourceUrl,
  selectGuideLibraryWorkspace,
  toGuideDocumentDraft,
  type GuideDocument,
  type GuideDocumentDraft,
  type GuideExtraction,
  type GuideDerivedRelation,
  type GuideLibraryFilters,
  type GuideLoadoutCandidatesArtifact,
  type GuideSourceReadPreview
} from "@d2-tools/app/guides";
import { api } from "../../api/client";
import type { EquipmentTargetConversionResult, EquipmentTargetStore } from "../../api/targetApi";

const defaultFilters: GuideLibraryFilters = {
  query: "",
  status: "active",
  category: "",
  favorites_only: false
};

export function useGuideLibrary(input: {
  active?: boolean;
  onEquipmentTargetStoreChanged?: (store: EquipmentTargetStore) => void;
} = {}) {
  const [documents, setDocuments] = useState<GuideDocument[]>([]);
  const [extractions, setExtractions] = useState<GuideExtraction[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [filters, setFilters] = useState<GuideLibraryFilters>(defaultFilters);
  const [draft, setDraft] = useState<GuideDocumentDraft | null>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<"load" | "write" | "">("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [sourcePreview, setSourcePreview] = useState<GuideSourceReadPreview | null>(null);
  const [isReadingSource, setIsReadingSource] = useState(false);
  const [sourceError, setSourceError] = useState("");
  const [extractionPreview, setExtractionPreview] = useState<GuideExtraction | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isConfirmingExtraction, setIsConfirmingExtraction] = useState(false);
  const [extractionError, setExtractionError] = useState("");
  const [targetConversionResult, setTargetConversionResult] = useState<EquipmentTargetConversionResult | null>(null);
  const [isConvertingTargets, setIsConvertingTargets] = useState(false);
  const [targetConversionError, setTargetConversionError] = useState("");
  const [loadoutCandidates, setLoadoutCandidates] = useState<GuideLoadoutCandidatesArtifact | null>(null);
  const [isCreatingLoadoutCandidates, setIsCreatingLoadoutCandidates] = useState(false);
  const [loadoutCandidatesError, setLoadoutCandidatesError] = useState("");
  const [derivedRelations, setDerivedRelations] = useState<GuideDerivedRelation[]>([]);
  const [derivedRelationsError, setDerivedRelationsError] = useState("");
  const sourceRequestIdRef = useRef(0);
  const extractionRequestIdRef = useRef(0);
  const loadoutCandidateRequestIdRef = useRef(0);
  const extractionScopeRef = useRef("");
  const wasActiveRef = useRef(false);

  const workspace = useMemo(() => selectGuideLibraryWorkspace({
    documents,
    filters,
    selectedDocumentId
  }), [documents, filters, selectedDocumentId]);
  const confirmedExtraction = useMemo(() => {
    const selected = workspace.selected_document;
    if (!selected) return null;
    return extractions.find((entry) => entry.guide_document_id === selected.id && entry.source_snapshot_id === selected.current_snapshot_id) ?? null;
  }, [extractions, workspace.selected_document]);
  const armorConstraintDraft = useMemo(() => {
    const document = workspace.selected_document;
    if (!document || !confirmedExtraction) return null;
    return createGuideArmorConstraintDraftArtifact({ document, extraction: confirmedExtraction });
  }, [confirmedExtraction, workspace.selected_document]);

  const clearSourceState = useCallback(() => {
    sourceRequestIdRef.current += 1;
    setSourcePreview(null);
    setSourceError("");
    setIsReadingSource(false);
  }, []);

  const clearExtractionState = useCallback(() => {
    extractionRequestIdRef.current += 1;
    loadoutCandidateRequestIdRef.current += 1;
    setExtractionPreview(null);
    setExtractionError("");
    setIsExtracting(false);
    setIsConfirmingExtraction(false);
    setTargetConversionResult(null);
    setTargetConversionError("");
    setIsConvertingTargets(false);
    setLoadoutCandidates(null);
    setLoadoutCandidatesError("");
    setIsCreatingLoadoutCandidates(false);
  }, []);

  const reloadDerivedRelations = useCallback(async () => {
    try {
      setDerivedRelations(await api.listGuideDerivedRelations());
      setDerivedRelationsError("");
    } catch (loadRelationError) {
      setDerivedRelationsError(`攻略派生关系读取失败：${loadRelationError instanceof Error ? loadRelationError.message : String(loadRelationError)}`);
    }
  }, []);

  const findGuideDocumentIdForDerivedEntity = useCallback(async (entityId: string) => {
    let relations = derivedRelations;
    try {
      relations = await api.listGuideDerivedRelations();
      setDerivedRelations(relations);
      setDerivedRelationsError("");
    } catch (loadRelationError) {
      setDerivedRelationsError(`攻略派生关系读取失败：${loadRelationError instanceof Error ? loadRelationError.message : String(loadRelationError)}`);
      return null;
    }
    return relations.find((relation) => (
      relation.source.kind === "guide" && relation.target.id === entityId
    ))?.source.id ?? null;
  }, [derivedRelations]);

  const reload = useCallback(async () => {
    clearSourceState();
    clearExtractionState();
    setExtractions([]);
    setIsLoading(true);
    setHasLoaded(true);
    setError("");
    setErrorKind("");
    try {
      const next = await api.listGuideDocuments();
      setDocuments(next);
      setSelectedDocumentId((current) => next.some((document) => document.id === current) ? current : next[0]?.id ?? "");
      setError("");
      setErrorKind("");
      try {
        setExtractions(await api.listGuideExtractions());
        setExtractionError("");
      } catch (loadExtractionError) {
        setExtractions([]);
        setExtractionError(`攻略提取确认读取失败：${loadExtractionError instanceof Error ? loadExtractionError.message : String(loadExtractionError)}`);
      }
      await reloadDerivedRelations();
    } catch (loadError) {
      setError(`攻略库读取失败：${loadError instanceof Error ? loadError.message : String(loadError)}`);
      setErrorKind("load");
    } finally {
      setIsLoading(false);
    }
  }, [clearExtractionState, clearSourceState, reloadDerivedRelations]);

  useEffect(() => {
    if (!input.active || hasLoaded || isLoading) return;
    void reload();
  }, [hasLoaded, input.active, isLoading, reload]);

  useEffect(() => {
    const wasActive = wasActiveRef.current;
    wasActiveRef.current = Boolean(input.active);
    if (input.active && hasLoaded && !wasActive) void reloadDerivedRelations();
  }, [hasLoaded, input.active, reloadDerivedRelations]);

  useEffect(() => {
    const selected = workspace.selected_document;
    const scope = selected ? `${selected.id}:${selected.current_snapshot_id}` : "";
    const previousScope = extractionScopeRef.current;
    extractionScopeRef.current = scope;
    if (previousScope && previousScope !== scope) clearExtractionState();
  }, [clearExtractionState, workspace.selected_document]);

  const selectDocument = useCallback((id: string) => {
    setSelectedDocumentId(id);
    setDraft(null);
    setEditingDocumentId(null);
    setError("");
    setErrorKind("");
    clearSourceState();
    clearExtractionState();
  }, [clearExtractionState, clearSourceState]);

  const startNewDocument = useCallback(() => {
    setDraft(createEmptyGuideDocumentDraft());
    setEditingDocumentId(null);
    setError("");
    setErrorKind("");
    clearSourceState();
    clearExtractionState();
  }, [clearExtractionState, clearSourceState]);

  const startImportDocument = useCallback(() => {
    setDraft({
      ...createEmptyGuideDocumentDraft(),
      source: { kind: "url" }
    });
    setEditingDocumentId(null);
    setError("");
    setErrorKind("");
    clearSourceState();
    clearExtractionState();
  }, [clearExtractionState, clearSourceState]);

  const startEditingDocument = useCallback((document: GuideDocument) => {
    setSelectedDocumentId(document.id);
    setDraft(toGuideDocumentDraft(document));
    setEditingDocumentId(document.id);
    setError("");
    setErrorKind("");
    clearSourceState();
    clearExtractionState();
  }, [clearExtractionState, clearSourceState]);

  const cancelEditing = useCallback(() => {
    setDraft(null);
    setEditingDocumentId(null);
    setError("");
    setErrorKind("");
    clearSourceState();
    clearExtractionState();
  }, [clearExtractionState, clearSourceState]);

  const updateDraft = useCallback((next: GuideDocumentDraft) => {
    if (next.source.kind !== "url" || next.source.url !== draft?.source.url) clearSourceState();
    setDraft(next);
  }, [clearSourceState, draft?.source.url]);

  const readSource = useCallback(async () => {
    const url = draft?.source.kind === "url" ? draft.source.url : undefined;
    if (!isSupportedGuideSourceUrl(url) || isReadingSource) return;
    const requestId = ++sourceRequestIdRef.current;
    setIsReadingSource(true);
    setSourceError("");
    try {
      const preview = await api.readGuideSource(url!);
      if (sourceRequestIdRef.current === requestId) setSourcePreview(preview);
    } catch (readError) {
      if (sourceRequestIdRef.current === requestId) {
        setSourcePreview(null);
        setSourceError(readError instanceof Error ? readError.message : String(readError));
      }
    } finally {
      if (sourceRequestIdRef.current === requestId) setIsReadingSource(false);
    }
  }, [draft, isReadingSource]);

  const acceptSourcePreview = useCallback(() => {
    if (!draft || !sourcePreview) return;
    setDraft({
      ...draft,
      title: draft.title.trim() ? draft.title : sourcePreview.title ?? draft.title,
      source: {
        ...draft.source,
        label: draft.source.label ?? sourcePreview.title,
        resolved_url: sourcePreview.final_url,
        read_at: sourcePreview.fetched_at,
        content_type: sourcePreview.content_type,
        read_warnings: [...sourcePreview.warnings]
      },
      body: sourcePreview.body
    });
    setSourcePreview(null);
    setSourceError("");
  }, [draft, sourcePreview]);

  const previewExtraction = useCallback(async (document: GuideDocument) => {
    if (isExtracting || isConfirmingExtraction) return;
    const requestId = ++extractionRequestIdRef.current;
    if (confirmedExtraction?.guide_document_id === document.id
      && confirmedExtraction.source_snapshot_id === document.current_snapshot_id) {
      setExtractionPreview(confirmedExtraction);
      setExtractionError("");
      return;
    }
    setIsExtracting(true);
    setExtractionError("");
    try {
      const preview = await api.previewGuideExtraction(document.id);
      if (extractionRequestIdRef.current === requestId) setExtractionPreview(preview);
    } catch (previewError) {
      if (extractionRequestIdRef.current === requestId) {
        setExtractionPreview(null);
        setExtractionError(`攻略要求提取失败：${previewError instanceof Error ? previewError.message : String(previewError)}`);
      }
    } finally {
      if (extractionRequestIdRef.current === requestId) setIsExtracting(false);
    }
  }, [confirmedExtraction, isConfirmingExtraction, isExtracting]);

  const confirmExtraction = useCallback(async (acceptedCandidateIds: string[]) => {
    if (!extractionPreview || isConfirmingExtraction) return;
    const requestId = ++extractionRequestIdRef.current;
    const preview = extractionPreview;
    setIsConfirmingExtraction(true);
    setExtractionError("");
    try {
      const confirmed = await api.confirmGuideExtraction({
        guideDocumentId: preview.guide_document_id,
        extractionId: preview.id,
        acceptedCandidateIds
      });
      if (extractionRequestIdRef.current === requestId) {
        loadoutCandidateRequestIdRef.current += 1;
        setExtractions((current) => [confirmed, ...current.filter((entry) => entry.id !== confirmed.id)]);
        setExtractionPreview(confirmed);
        setTargetConversionResult(null);
        setTargetConversionError("");
        setLoadoutCandidates(null);
        setLoadoutCandidatesError("");
        setIsCreatingLoadoutCandidates(false);
        await reloadDerivedRelations();
      }
    } catch (confirmError) {
      if (extractionRequestIdRef.current === requestId) {
        setExtractionError(`攻略要求确认失败：${confirmError instanceof Error ? confirmError.message : String(confirmError)}`);
      }
    } finally {
      if (extractionRequestIdRef.current === requestId) setIsConfirmingExtraction(false);
    }
  }, [extractionPreview, isConfirmingExtraction, reloadDerivedRelations]);

  const convertConfirmedTargets = useCallback(async (extraction: GuideExtraction) => {
    if (extraction.status !== "confirmed" || isConvertingTargets) return;
    setIsConvertingTargets(true);
    setTargetConversionError("");
    try {
      const result = await api.convertConfirmedGuideEquipmentTargets({
        guide_document_id: extraction.guide_document_id,
        extraction_id: extraction.id
      });
      setTargetConversionResult(result);
      input.onEquipmentTargetStoreChanged?.(result.store);
      await reloadDerivedRelations();
    } catch (conversionError) {
      setTargetConversionResult(null);
      setTargetConversionError(`攻略目标转换失败：${conversionError instanceof Error ? conversionError.message : String(conversionError)}`);
    } finally {
      setIsConvertingTargets(false);
    }
  }, [input.onEquipmentTargetStoreChanged, isConvertingTargets, reloadDerivedRelations]);

  const createLoadoutCandidates = useCallback(async (
    extraction: GuideExtraction,
    characterId: string
  ) => {
    if (extraction.status !== "confirmed" || isCreatingLoadoutCandidates) return;
    if (!characterId) {
      setLoadoutCandidatesError("请先选择一个账号角色，再生成配装候选。");
      return;
    }
    setIsCreatingLoadoutCandidates(true);
    setLoadoutCandidatesError("");
    const requestId = ++loadoutCandidateRequestIdRef.current;
    try {
      const artifact = await api.createGuideLoadoutCandidates({
        guideDocumentId: extraction.guide_document_id,
        extractionId: extraction.id,
        characterId
      });
      if (loadoutCandidateRequestIdRef.current === requestId) {
        setLoadoutCandidates(artifact);
        await reloadDerivedRelations();
      }
    } catch (candidateError) {
      if (loadoutCandidateRequestIdRef.current === requestId) {
        setLoadoutCandidates(null);
        setLoadoutCandidatesError(`配装候选生成失败：${candidateError instanceof Error ? candidateError.message : String(candidateError)}`);
      }
    } finally {
      if (loadoutCandidateRequestIdRef.current === requestId) setIsCreatingLoadoutCandidates(false);
    }
  }, [isCreatingLoadoutCandidates, reloadDerivedRelations]);

  const saveDraft = useCallback(async () => {
    if (!draft || isSaving || !isGuideDraftReady(draft)) return;
    setIsSaving(true);
    setError("");
    setErrorKind("");
    try {
      const normalizedDraft = {
        ...draft,
        title: draft.title.trim(),
        category: draft.category.trim() || "未分类",
        tags: [...new Set(draft.tags.map((tag) => tag.trim()).filter(Boolean))],
        source: {
          ...draft.source,
          label: draft.source.label?.trim() || undefined,
          url: draft.source.kind === "url" ? draft.source.url?.trim() || undefined : undefined
        },
        body: draft.body.trim()
      };
      const saved = editingDocumentId
        ? await api.updateGuideDocument(editingDocumentId, normalizedDraft)
        : await api.createGuideDocument(normalizedDraft);
      setDocuments((current) => editingDocumentId
        ? current.map((document) => document.id === saved.id ? saved : document)
        : [saved, ...current]);
      setSelectedDocumentId(saved.id);
      setDraft(null);
      setEditingDocumentId(null);
      clearSourceState();
      clearExtractionState();
    } catch (saveError) {
      setError(`攻略保存失败：${saveError instanceof Error ? saveError.message : String(saveError)}`);
      setErrorKind("write");
    } finally {
      setIsSaving(false);
    }
  }, [clearExtractionState, clearSourceState, draft, editingDocumentId, isSaving]);

  const updateDocument = useCallback(async (document: GuideDocument, patch: Partial<GuideDocumentDraft>) => {
    if (isSaving) return;
    setIsSaving(true);
    setError("");
    setErrorKind("");
    try {
      const updated = await api.updateGuideDocument(document.id, {
        ...toGuideDocumentDraft(document),
        ...patch
      });
      setDocuments((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
    } catch (updateError) {
      setError(`攻略更新失败：${updateError instanceof Error ? updateError.message : String(updateError)}`);
      setErrorKind("write");
    } finally {
      setIsSaving(false);
    }
  }, [isSaving]);

  const deleteDocument = useCallback(async (document: GuideDocument) => {
    if (isSaving) return;
    setIsSaving(true);
    setError("");
    setErrorKind("");
    try {
      const next = await api.deleteGuideDocument(document.id);
      setDocuments(next);
      setExtractions((current) => current.filter((entry) => entry.guide_document_id !== document.id));
      setDerivedRelations((current) => current.filter((relation) => (
        !(relation.source.kind === "guide" && relation.source.id === document.id)
        && !(relation.target.kind === "guide" && relation.target.id === document.id)
      )));
      setSelectedDocumentId((current) => current === document.id ? next[0]?.id ?? "" : current);
      setDraft(null);
      setEditingDocumentId(null);
      clearSourceState();
      clearExtractionState();
    } catch (deleteError) {
      setError(`攻略删除失败：${deleteError instanceof Error ? deleteError.message : String(deleteError)}`);
      setErrorKind("write");
    } finally {
      setIsSaving(false);
    }
  }, [clearExtractionState, clearSourceState, isSaving]);

  return {
    workspace,
    filters,
    setFilters,
    draft,
    setDraft: updateDraft,
    editingDocumentId,
    isLoading,
    isSaving,
    error,
    errorKind,
    sourcePreview,
    isReadingSource,
    sourceError,
    extractionPreview,
    confirmedExtraction,
    armorConstraintDraft,
    isExtracting,
    isConfirmingExtraction,
    extractionError,
    targetConversionResult,
    isConvertingTargets,
    targetConversionError,
    loadoutCandidates,
    isCreatingLoadoutCandidates,
    loadoutCandidatesError,
    derivedRelations,
    derivedRelationsError,
    findGuideDocumentIdForDerivedEntity,
    reload,
    selectDocument,
    startImportDocument,
    startNewDocument,
    startEditingDocument,
    cancelEditing,
    saveDraft,
    readSource,
    acceptSourcePreview,
    dismissSourcePreview: clearSourceState,
    previewExtraction,
    confirmExtraction,
    convertConfirmedTargets,
    createLoadoutCandidates,
    dismissExtractionPreview: clearExtractionState,
    toggleFavorite: (document: GuideDocument) => void updateDocument(document, { favorite: !document.favorite }),
    toggleArchive: (document: GuideDocument) => void updateDocument(document, { status: document.status === "archived" ? "active" : "archived" }),
    deleteDocument
  };
}

function isGuideDraftReady(draft: GuideDocumentDraft): boolean {
  return Boolean(
    draft.title.trim()
    && draft.body.trim()
    && (draft.source.kind !== "url" || isSupportedGuideSourceUrl(draft.source.url))
  );
}
