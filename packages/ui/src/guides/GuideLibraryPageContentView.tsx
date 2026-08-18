import type {
  GuideDocument,
  GuideDocumentDraft,
  GuideExtraction,
  GuideExtractionCandidate,
  GuideArmorConstraintDraftArtifact,
  GuideLoadoutCandidatesArtifact,
  GuideDerivedEntityRef,
  GuideDerivedRelation,
  GuideLibraryFilters,
  GuideLibraryWorkspaceModel,
  GuideSourceReadPreview
} from "@d2-tools/app/guides";
import { getGuideCurrentSnapshot, isSupportedGuideSourceUrl } from "@d2-tools/app/guides";
import { useEffect, useState } from "react";
import type { EquipmentTargetConversionResult } from "@d2-tools/core/targets/equipmentTargets";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale } from "../i18n/types.js";
import { formatCompactDateTime, formatFullDateTime } from "../time/formatTime.js";
import { ProductWorkspaceEmptyState } from "../workspace/ProductWorkspace.js";

export type GuideLibraryPageActions = {
  selectDocument: (id: string) => void;
  filtersChange: (patch: Partial<GuideLibraryFilters>) => void;
  startImportDocument: () => void;
  startNewDocument: () => void;
  startEditingDocument: (document: GuideDocument) => void;
  draftChange: (draft: GuideDocumentDraft) => void;
  saveDraft: () => void;
  cancelEditing: () => void;
  toggleFavorite: (document: GuideDocument) => void;
  toggleArchive: (document: GuideDocument) => void;
  deleteDocument: (document: GuideDocument) => void;
  openSource: (url: string) => void;
  reload: () => void;
  readSource: () => void;
  acceptSourcePreview: () => void;
  dismissSourcePreview: () => void;
  previewExtraction: (document: GuideDocument) => void;
  confirmExtraction: (acceptedCandidateIds: string[]) => void;
  convertConfirmedTargets?: (extraction: GuideExtraction) => void;
  openArmorConstraintDraft?: (artifact: GuideArmorConstraintDraftArtifact) => void;
  createLoadoutCandidates?: (extraction: GuideExtraction) => void;
  openLoadoutCandidates?: (artifact: GuideLoadoutCandidatesArtifact) => void;
  openDerivedEntity?: (entity: GuideDerivedEntityRef) => void;
  dismissExtractionPreview: () => void;
};

export type GuideLibraryPageContentViewProps = {
  interfaceLocale?: InterfaceLocale;
  model: GuideLibraryWorkspaceModel;
  filters: GuideLibraryFilters;
  draft: GuideDocumentDraft | null;
  editingDocumentId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string;
  errorKind: "load" | "write" | "";
  canReadSource: boolean;
  sourcePreview: GuideSourceReadPreview | null;
  isReadingSource: boolean;
  sourceError: string;
  extractionPreview: GuideExtraction | null;
  confirmedExtraction: GuideExtraction | null;
  armorConstraintDraft?: GuideArmorConstraintDraftArtifact | null;
  loadoutCandidates?: GuideLoadoutCandidatesArtifact | null;
  isCreatingLoadoutCandidates?: boolean;
  loadoutCandidatesError?: string;
  derivedRelations?: GuideDerivedRelation[];
  derivedRelationsError?: string;
  isExtracting: boolean;
  isConfirmingExtraction: boolean;
  extractionError: string;
  targetConversionResult?: EquipmentTargetConversionResult | null;
  isConvertingTargets?: boolean;
  targetConversionError?: string;
  actions: GuideLibraryPageActions;
};

export function GuideLibraryPageContentView(props: GuideLibraryPageContentViewProps) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").guides;
  const selected = props.model.selected_document;
  return (
    <section className="guide-workspace" aria-label={copy.filters.all}>
      <aside className="guide-filter-rail" data-shell-role="side-rail">
        <nav aria-label={copy.filters.all}>
          <GuideFilterButton label={copy.filters.all} count={props.model.total_count} active={props.filters.status === "all" && !props.filters.favorites_only} onClick={() => props.actions.filtersChange({ status: "all", favorites_only: false, category: "" })} />
          <GuideFilterButton label={copy.filters.active} count={props.model.active_count} active={props.filters.status === "active" && !props.filters.favorites_only} onClick={() => props.actions.filtersChange({ status: "active", favorites_only: false, category: "" })} />
          <GuideFilterButton label={copy.filters.archived} count={props.model.archived_count} active={props.filters.status === "archived" && !props.filters.favorites_only} onClick={() => props.actions.filtersChange({ status: "archived", favorites_only: false, category: "" })} />
          <GuideFilterButton label={copy.filters.favorites} count={props.model.favorite_count} active={props.filters.favorites_only} onClick={() => props.actions.filtersChange({ status: "all", favorites_only: true, category: "" })} />
        </nav>
        <section className="guide-category-filter">
          <strong>{copy.filters.categories}</strong>
          {props.model.categories.map((category) => (
            <GuideFilterButton key={category.key} label={category.label} count={category.count} active={props.filters.category === category.key} onClick={() => props.actions.filtersChange({ category: props.filters.category === category.key ? "" : category.key })} />
          ))}
        </section>
      </aside>

      <section className="guide-directory" aria-label={copy.results(props.model.entries.length)} aria-busy={props.isLoading}>
        <div className="guide-directory-toolbar">
          <label>
            <input type="search" aria-label={copy.searchPlaceholder} value={props.filters.query} placeholder={copy.searchPlaceholder} onChange={(event) => props.actions.filtersChange({ query: event.target.value })} />
          </label>
          <div className="guide-directory-actions">
            <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={props.isSaving} onClick={props.actions.startImportDocument}>{copy.importGuide}</button>
            <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isSaving} onClick={props.actions.startNewDocument}>{copy.newGuide}</button>
          </div>
        </div>
        <div className="guide-directory-summary"><span>{copy.results(props.model.entries.length)}</span>{props.isLoading ? <span data-status="pending">{copy.loading}</span> : null}</div>
        <div className="guide-directory-body">
          {props.error ? <div className="guide-directory-error status-message status-error" role="alert"><span>{props.error}</span>{props.errorKind === "load" ? <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isLoading} onClick={props.actions.reload}>{copy.actions.retry}</button> : null}</div> : null}
          {props.isLoading && props.model.total_count === 0 ? (
            <ProductWorkspaceEmptyState className="guide-directory-empty"><h3>{copy.loading}</h3><p>{copy.loadingDetail}</p></ProductWorkspaceEmptyState>
          ) : props.model.entries.length ? (
            <ul className="guide-directory-list" data-surface="list">
            {props.model.entries.map((entry) => (
              <li key={entry.id}>
                <button type="button" className={selected?.id === entry.id && !props.draft ? "active" : ""} aria-current={selected?.id === entry.id && !props.draft ? "true" : undefined} disabled={props.isSaving} onClick={() => props.actions.selectDocument(entry.id)}>
                  <span className="guide-entry-heading"><strong>{entry.title}</strong>{entry.favorite ? <span data-ui-kind="status-chip">★</span> : null}</span>
                  <span className="guide-entry-meta">{entry.category} · {entry.source_label}</span>
                  <span className="guide-entry-excerpt">{entry.excerpt}</span>
                  <span className="guide-entry-footer"><small>{formatCompactDateTime(entry.updated_at)}</small><small>{copy.snapshots(entry.snapshot_count)}</small></span>
                </button>
              </li>
            ))}
            </ul>
          ) : props.error ? null : (
            <ProductWorkspaceEmptyState className="guide-directory-empty">
              <h3>{props.model.total_count ? copy.noResultsTitle : copy.emptyTitle}</h3>
              <p>{props.model.total_count ? copy.noResultsDetail : copy.emptyDetail}</p>
            </ProductWorkspaceEmptyState>
          )}
        </div>
      </section>

      <main className="guide-detail" data-scroll-region="pane">
        {props.draft ? (
          <GuideEditor {...props} draft={props.draft} />
        ) : selected ? (
          <GuideReader {...props} document={selected} />
        ) : (
          <ProductWorkspaceEmptyState className="guide-detail-empty"><h3>{props.isLoading ? copy.loading : copy.selectTitle}</h3><p>{props.isLoading ? copy.loadingDetail : copy.selectDetail}</p></ProductWorkspaceEmptyState>
        )}
      </main>
    </section>
  );
}

function GuideFilterButton(props: { label: string; count: number; active: boolean; onClick: () => void }) {
  return <button type="button" className={props.active ? "active" : ""} aria-pressed={props.active} onClick={props.onClick}><span>{props.label}</span><strong>{props.count}</strong></button>;
}

function GuideEditor(props: GuideLibraryPageContentViewProps & { draft: GuideDocumentDraft }) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").guides;
  const draft = props.draft;
  const isImporting = !props.editingDocumentId && draft.source.kind === "url";
  const canSave = Boolean(draft.title.trim() && draft.body.trim() && (draft.source.kind !== "url" || isSupportedGuideSourceUrl(draft.source.url)));
  const update = (patch: Partial<GuideDocumentDraft>) => props.actions.draftChange({ ...draft, ...patch });
  return (
    <form className="guide-editor" onSubmit={(event) => { event.preventDefault(); props.actions.saveDraft(); }}>
      <header className="guide-detail-header" aria-busy={props.isSaving}><div><span>{props.editingDocumentId ? copy.actions.edit : isImporting ? copy.importGuide : copy.newGuide}</span><h3>{draft.title || (isImporting ? copy.importGuide : copy.newGuide)}</h3><p>{copy.draftNotice}</p></div><div className="button-row"><button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isSaving} onClick={props.actions.cancelEditing}>{copy.actions.cancel}</button><button type="submit" data-ui-kind="button" data-control-variant="primary" disabled={props.isSaving || !canSave}>{props.isSaving ? copy.saving : copy.actions.save}</button></div></header>
      <section className="guide-editor-fields" aria-label={copy.actions.edit}>
        <label><span>{copy.fields.title}</span><input value={draft.title} onChange={(event) => update({ title: event.target.value })} /></label>
        <label><span>{copy.fields.category}</span><input value={draft.category} placeholder={copy.categoryPlaceholder} onChange={(event) => update({ category: event.target.value })} /></label>
        <label><span>{copy.fields.tags}</span><input value={draft.tags.join(", ")} placeholder={copy.tagPlaceholder} onChange={(event) => update({ tags: parseTags(event.target.value) })} /></label>
        <label><span>{copy.fields.sourceKind}</span><select value={draft.source.kind} onChange={(event) => update({ source: { kind: event.target.value as GuideDocumentDraft["source"]["kind"], label: draft.source.label, url: event.target.value === "url" ? draft.source.url : undefined } })}><option value="text">{copy.sourceKinds.text}</option><option value="note">{copy.sourceKinds.note}</option><option value="url">{copy.sourceKinds.url}</option></select></label>
        <label><span>{copy.fields.sourceLabel}</span><input value={draft.source.label ?? ""} placeholder={copy.sourceLabelPlaceholder} onChange={(event) => update({ source: { ...draft.source, label: event.target.value || undefined } })} /></label>
        {draft.source.kind === "url" ? <label className="guide-editor-wide"><span>{copy.fields.sourceUrl}</span><input type="url" required autoFocus={isImporting} value={draft.source.url ?? ""} placeholder={copy.sourceUrlPlaceholder} onChange={(event) => update({ source: { kind: "url", label: draft.source.label, url: event.target.value || undefined } })} /></label> : null}
        {draft.source.kind === "url" ? (
          <section className="guide-editor-wide guide-source-reader" aria-label={copy.sourceReader.title}>
            <div className="guide-source-reader-actions">
              <span>{props.canReadSource ? copy.sourceReader.detail : copy.sourceReader.unavailable}</span>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!props.canReadSource || props.isReadingSource || !isSupportedGuideSourceUrl(draft.source.url)} onClick={props.actions.readSource}>{props.isReadingSource ? copy.sourceReader.reading : copy.sourceReader.read}</button>
            </div>
            {props.sourceError ? <p className="status-message status-error" role="alert">{props.sourceError}</p> : null}
            {props.sourcePreview ? <GuideSourcePreview interfaceLocale={props.interfaceLocale} preview={props.sourcePreview} onAccept={props.actions.acceptSourcePreview} onDismiss={props.actions.dismissSourcePreview} /> : null}
          </section>
        ) : null}
        <label className="guide-editor-wide"><span>{copy.fields.body}</span><textarea rows={20} value={draft.body} placeholder={copy.bodyPlaceholder} onChange={(event) => update({ body: event.target.value })} /></label>
      </section>
    </form>
  );
}

function GuideReader(props: GuideLibraryPageContentViewProps & { document: GuideDocument }) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").guides;
  const document = props.document;
  const snapshot = getGuideCurrentSnapshot(document);
  return (
    <article className="guide-reader">
      <header className="guide-detail-header">
        <div><span>{document.status === "archived" ? copy.archived : copy.localOnly}</span><h3>{document.title}</h3><p>{document.category}{document.tags.length ? ` · ${document.tags.join(" · ")}` : ""}</p></div>
        <div className="button-row" aria-busy={props.isSaving}><button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isSaving} onClick={() => props.actions.toggleFavorite(document)}>{document.favorite ? copy.actions.unfavorite : copy.actions.favorite}</button><button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isSaving} onClick={() => props.actions.startEditingDocument(document)}>{copy.actions.edit}</button><button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isSaving} onClick={() => props.actions.toggleArchive(document)}>{document.status === "archived" ? copy.actions.restore : copy.actions.archive}</button><button type="button" data-ui-kind="button" data-control-variant="danger" disabled={props.isSaving} onClick={() => props.actions.deleteDocument(document)}>{copy.actions.delete}</button></div>
      </header>
      <dl className="guide-fact-strip"><div><dt>{copy.source}</dt><dd>{document.source.label ?? copy.sourceKinds[document.source.kind]}</dd></div><div><dt>{copy.updated}</dt><dd>{formatFullDateTime(document.updated_at ?? document.created_at)}</dd></div><div><dt>{copy.snapshotHistory}</dt><dd>{copy.snapshots(document.snapshots.length)}</dd></div></dl>
      {document.source.kind === "url" && document.source.url ? <div className="guide-source-row"><div><span>{document.source.resolved_url ?? document.source.url}</span>{document.source.read_at ? <small>{copy.sourceReader.readAt(formatFullDateTime(document.source.read_at))}{document.source.content_type ? ` · ${document.source.content_type}` : ""}</small> : null}</div><button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.actions.openSource(document.source.resolved_url ?? document.source.url!)}>{copy.actions.openSource}</button></div> : null}
      {document.source.read_warnings?.length ? <details className="guide-source-warnings"><summary>{copy.sourceReader.warnings}</summary><ul>{document.source.read_warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></details> : null}
      <GuideExtractionSection {...props} document={document} />
      <GuideDerivedRelationsSection {...props} document={document} />
      <section className="guide-body-section"><header><strong>{copy.currentBody}</strong><small>{snapshot ? formatFullDateTime(snapshot.captured_at) : "-"}</small></header><div className="guide-body-text">{snapshot?.body ?? ""}</div></section>
      {document.snapshots.length > 1 ? <details className="guide-snapshot-history"><summary>{copy.snapshotHistory}</summary><ol>{[...document.snapshots].reverse().map((entry) => <li key={entry.id}><strong>{formatFullDateTime(entry.captured_at)}</strong><small>{entry.content_fingerprint.slice(0, 12)}</small></li>)}</ol></details> : null}
    </article>
  );
}

function GuideDerivedRelationsSection(props: GuideLibraryPageContentViewProps & { document: GuideDocument }) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").guides.derivedRelations;
  const relations = selectGuideRelationChain(props.derivedRelations ?? [], props.document.id);
  return (
    <section className="guide-derived-relations" aria-label={copy.title}>
      <header><div><strong>{copy.title}</strong><small>{copy.detail}</small></div><span data-ui-kind="count-chip">{relations.length}</span></header>
      {props.derivedRelationsError ? <p className="status-message status-error" role="alert">{props.derivedRelationsError}</p> : null}
      {relations.length ? (
        <ul data-surface="list">
          {relations.map((relation) => {
            const entity = relation.target;
            const canOpen = Boolean(props.actions.openDerivedEntity
              && (entity.kind === "equipment_target" || entity.kind === "local_loadout_plan"));
            return (
              <li key={relation.id}>
                <div><strong>{copy.kinds[relation.kind]}</strong><span>{entity.label ?? entity.id}</span><small>{copy.createdAt(formatFullDateTime(relation.created_at))}</small></div>
                {canOpen ? <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.actions.openDerivedEntity?.(entity)}>{copy.open}</button> : null}
              </li>
            );
          })}
        </ul>
      ) : props.derivedRelationsError ? null : <p>{copy.empty}</p>}
    </section>
  );
}

function selectGuideRelationChain(
  relations: GuideDerivedRelation[],
  guideDocumentId: string
): GuideDerivedRelation[] {
  const direct = relations.filter((relation) => (
    relation.source.kind === "guide" && relation.source.id === guideDocumentId
  ));
  const loadoutCandidateIds = new Set(direct.flatMap((relation) => (
    relation.target.kind === "loadout_candidates" ? [relation.target.id] : []
  )));
  const armorConstraintDraftIds = new Set(direct.flatMap((relation) => (
    relation.target.kind === "armor_constraint_draft" ? [relation.target.id] : []
  )));
  const downstream = relations.filter((relation) => (
    (relation.kind === "loadout_candidates_to_local_loadout_plan"
      && loadoutCandidateIds.has(relation.source.id))
    || (relation.kind === "armor_constraint_draft_to_local_loadout_plan"
      && armorConstraintDraftIds.has(relation.source.id))
  ));
  return [...direct, ...downstream].sort((left, right) => right.created_at.localeCompare(left.created_at));
}

function GuideSourcePreview(props: { interfaceLocale?: InterfaceLocale; preview: GuideSourceReadPreview; onAccept: () => void; onDismiss: () => void }) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").guides;
  return (
    <section className="guide-source-preview" data-surface="frame" data-ui-kind="state-frame">
      <header><div><strong>{props.preview.title ?? copy.sourceReader.title}</strong><small>{copy.sourceReader.detail}</small></div><div className="button-row"><button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onDismiss}>{copy.sourceReader.dismiss}</button><button type="button" data-ui-kind="button" data-control-variant="primary" onClick={props.onAccept}>{copy.sourceReader.useBody}</button></div></header>
      <dl><div><dt>{copy.sourceReader.finalUrl}</dt><dd>{props.preview.final_url}</dd></div><div><dt>{copy.sourceReader.sections(props.preview.sections.length)}</dt><dd>{copy.sourceReader.bytes(props.preview.byte_length)}</dd></div></dl>
      {props.preview.warnings.length ? <ul>{props.preview.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul> : null}
      <pre>{props.preview.body.slice(0, 4000)}</pre>
      {props.preview.body.length > 4000 ? <small className="guide-source-preview-truncated">{copy.sourceReader.previewTruncated}</small> : null}
    </section>
  );
}

function GuideExtractionSection(props: GuideLibraryPageContentViewProps & { document: GuideDocument }) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").guides;
  const extraction = props.extractionPreview;
  const confirmed = props.confirmedExtraction;
  const armorConstraintDraft = props.armorConstraintDraft;
  const openArmorConstraintDraft = props.actions.openArmorConstraintDraft;
  const loadoutCandidates = props.loadoutCandidates;
  const openLoadoutCandidates = props.actions.openLoadoutCandidates;
  return (
    <section className="guide-extraction-section" aria-label={copy.extraction.title}>
      <header><div><strong>{copy.extraction.title}</strong><small>{copy.extraction.detail}</small></div><button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isExtracting || props.isConfirmingExtraction} onClick={() => props.actions.previewExtraction(props.document)}>{props.isExtracting ? copy.extraction.extracting : confirmed ? copy.extraction.review : copy.extraction.extract}</button></header>
      {props.extractionError ? <p className="status-message status-error" role="alert">{props.extractionError}</p> : null}
      {!extraction && confirmed ? <div className="guide-extraction-confirmed" data-status="ready"><strong>{copy.extraction.confirmed}</strong><span>{copy.extraction.accepted(confirmed.accepted_candidate_ids.length, confirmed.candidates.length)}</span>{confirmed.confirmed_at ? <small>{copy.extraction.confirmedAt(formatFullDateTime(confirmed.confirmed_at))}</small> : null}</div> : null}
      {extraction ? <GuideExtractionReview interfaceLocale={props.interfaceLocale} extraction={extraction} isConfirming={props.isConfirmingExtraction} onConfirm={props.actions.confirmExtraction} onDismiss={props.actions.dismissExtractionPreview} /> : null}
      {confirmed && props.actions.createLoadoutCandidates ? (
        <div className="guide-target-conversion guide-loadout-candidates" data-surface="frame" data-ui-kind="state-frame">
          <div>
            <strong>{copy.extraction.loadoutCandidates.title}</strong>
            <small>{copy.extraction.loadoutCandidates.detail}</small>
          </div>
          <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={props.isCreatingLoadoutCandidates} onClick={() => props.actions.createLoadoutCandidates?.(confirmed)}>{props.isCreatingLoadoutCandidates ? copy.extraction.loadoutCandidates.creating : copy.extraction.loadoutCandidates.create}</button>
          {props.loadoutCandidatesError ? <p className="status-message status-error" role="alert">{props.loadoutCandidatesError}</p> : null}
          {loadoutCandidates ? (
            <div className="guide-target-conversion-result" data-status={loadoutCandidates.missing_requirements.length ? "warning" : "success"}>
              <small>{copy.extraction.loadoutCandidates.character(loadoutCandidates.account_scope.character_class)}</small>
              <span>{copy.extraction.loadoutCandidates.result(
                loadoutCandidates.candidates.filter((candidate) => candidate.relation === "matched").length,
                loadoutCandidates.candidates.filter((candidate) => candidate.relation === "alternative").length,
                loadoutCandidates.missing_requirements.length
              )}</span>
              {loadoutCandidates.missing_requirements.length ? <ul>{loadoutCandidates.missing_requirements.map((item) => <li key={item}>{item}</li>)}</ul> : null}
              {openLoadoutCandidates ? <button type="button" data-ui-kind="button" data-control-variant="primary" onClick={() => openLoadoutCandidates(loadoutCandidates)}>{copy.extraction.loadoutCandidates.open}</button> : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {confirmed && props.actions.convertConfirmedTargets ? (
        <div className="guide-target-conversion" data-surface="frame" data-ui-kind="state-frame">
          <div>
            <strong>{copy.extraction.targetConversion.title}</strong>
            <small>{copy.extraction.targetConversion.detail}</small>
          </div>
          <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isConvertingTargets} onClick={() => props.actions.convertConfirmedTargets?.(confirmed)}>{props.isConvertingTargets ? copy.extraction.targetConversion.converting : copy.extraction.targetConversion.convert}</button>
          {props.targetConversionError ? <p className="status-message status-error" role="alert">{props.targetConversionError}</p> : null}
          {props.targetConversionResult ? <div className="guide-target-conversion-result" data-status={props.targetConversionResult.issues.length ? "warning" : "success"}><span>{copy.extraction.targetConversion.result(props.targetConversionResult.created_target_ids.length, props.targetConversionResult.unchanged_target_ids.length)}</span>{props.targetConversionResult.issues.length ? <ul>{props.targetConversionResult.issues.map((issue) => <li key={`${issue.source_id}:${issue.reason}`}><strong>{issue.label}</strong><span>{issue.reason}</span></li>)}</ul> : null}</div> : null}
        </div>
      ) : null}
      {confirmed && armorConstraintDraft && openArmorConstraintDraft ? (
        <div className="guide-target-conversion guide-armor-constraint-draft" data-surface="frame" data-ui-kind="state-frame">
          <div>
            <strong>{copy.extraction.armorConstraintDraft.title}</strong>
            <small>{copy.extraction.armorConstraintDraft.detail}</small>
          </div>
          <button type="button" data-ui-kind="button" data-control-variant="primary" onClick={() => openArmorConstraintDraft(armorConstraintDraft)}>{copy.extraction.armorConstraintDraft.open}</button>
          <div className="guide-target-conversion-result" data-status={armorConstraintDraft.status === "ready" ? "success" : "warning"}>
            <span>{formatArmorConstraintSummary(armorConstraintDraft, copy.extraction.armorConstraintDraft)}</span>
            {armorConstraintDraft.confirmations.length || armorConstraintDraft.warnings.length ? <ul>{[...armorConstraintDraft.confirmations.map(copy.extraction.armorConstraintDraft.confirmation), ...armorConstraintDraft.warnings].map((item, index) => <li key={`${item}:${index}`}>{item}</li>)}</ul> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function formatArmorConstraintSummary(
  artifact: GuideArmorConstraintDraftArtifact,
  copy: ReturnType<typeof getLocaleCopy>["guides"]["extraction"]["armorConstraintDraft"]
): string {
  const labels = copy.statLabels;
  const targets = Object.entries(artifact.constraints.stat_minimums)
    .filter((entry): entry is [keyof typeof labels, number] => typeof entry[1] === "number")
    .map(([key, value]) => `${labels[key]} ${value}`);
  return targets.length ? copy.summary(targets) : copy.exoticOnly;
}

function GuideExtractionReview(props: { interfaceLocale?: InterfaceLocale; extraction: GuideExtraction; isConfirming: boolean; onConfirm: (ids: string[]) => void; onDismiss: () => void }) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").guides;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  useEffect(() => {
    setSelectedIds(props.extraction.status === "confirmed" ? props.extraction.accepted_candidate_ids : props.extraction.candidates.map((candidate) => candidate.id));
  }, [props.extraction]);
  const selected = new Set(selectedIds);
  return (
    <div className="guide-extraction-review" data-surface="frame" data-ui-kind="state-frame">
      {props.extraction.candidates.length ? <ul>{props.extraction.candidates.map((candidate) => <li key={candidate.id}><label><input type="checkbox" checked={selected.has(candidate.id)} disabled={props.isConfirming} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, candidate.id] : current.filter((id) => id !== candidate.id))} /><span><strong>{candidate.label}</strong><small>{formatCandidateDetail(candidate, copy.extraction)} · {copy.extraction.confidence[candidate.confidence]}</small>{candidate.source_reference ? <q>{copy.extraction.reference(candidate.source_reference.start_line, candidate.source_reference.quote)}</q> : null}</span></label></li>)}</ul> : <p>{copy.extraction.noCandidates}</p>}
      {props.extraction.confirmations.length || props.extraction.warnings.length ? <details><summary>{copy.extraction.warnings}</summary><ul>{[...props.extraction.confirmations, ...props.extraction.warnings].map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></details> : null}
      <footer><span>{copy.extraction.accepted(selectedIds.length, props.extraction.candidates.length)}</span><div className="button-row"><button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isConfirming} onClick={props.onDismiss}>{copy.extraction.dismiss}</button><button type="button" data-ui-kind="button" data-control-variant="primary" disabled={props.isConfirming || !props.extraction.candidates.length} onClick={() => props.onConfirm(selectedIds)}>{props.isConfirming ? copy.extraction.confirming : copy.extraction.confirm}</button></div></footer>
    </div>
  );
}

function formatCandidateDetail(candidate: GuideExtractionCandidate, copy: ReturnType<typeof getLocaleCopy>["guides"]["extraction"]): string {
  const detail = copy.candidateDetails[candidate.detail.kind];
  return candidate.detail.perk_names?.length ? `${detail} · ${copy.perks(candidate.detail.perk_names)}` : detail;
}

function parseTags(value: string): string[] {
  return [...new Set(value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))].slice(0, 20);
}
