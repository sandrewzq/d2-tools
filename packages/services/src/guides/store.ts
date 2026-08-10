import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CreateGuideDocumentInput,
  GuideDocument,
  GuideDocumentDraft,
  GuideDocumentStatus,
  GuideSnapshot,
  GuideSource,
  UpdateGuideDocumentInput
} from "@d2-tools/core/guides/library";
import { isSupportedGuideSourceUrl } from "@d2-tools/core/guides/library";
import { createGuideSourceSections } from "@d2-tools/core/guides/source";

export type {
  CreateGuideDocumentInput,
  GuideDocument,
  GuideDocumentDraft,
  GuideDocumentStatus,
  GuideSnapshot,
  GuideSource,
  UpdateGuideDocumentInput
} from "@d2-tools/core/guides/library";

const guideLibraryFileName = "guide-library.json";
const maxDocuments = 200;
const maxSnapshotsPerDocument = 20;

export function listGuideDocuments(dataDir: string): GuideDocument[] {
  const path = guideLibraryPath(dataDir);
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (!Array.isArray(raw)) throw new Error("guide library root must be an array");
    const documents = raw.flatMap(normalizeGuideDocument);
    if (documents.length !== raw.length) throw new Error("guide library contains an invalid document");
    for (const document of documents) validateGuideSource(document.source);
    return documents;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`guide library could not be read: ${detail}`);
  }
}

export function createGuideDocument(
  dataDir: string,
  input: CreateGuideDocumentInput,
  now = new Date()
): GuideDocument {
  validateGuideSource(input.source);
  const createdAt = now.toISOString();
  const snapshot = createSnapshot(input.body, createdAt);
  const document = buildGuideDocument({
    id: randomUUID(),
    title: input.title,
    category: input.category,
    tags: input.tags,
    favorite: input.favorite,
    status: input.status,
    source: input.source,
    current_snapshot_id: snapshot.id,
    snapshots: [snapshot],
    created_at: createdAt
  });
  const documents = listGuideDocuments(dataDir);
  if (documents.length >= maxDocuments) {
    throw new Error(`guide library is limited to ${maxDocuments} documents`);
  }
  writeGuideDocuments(dataDir, [document, ...documents]);
  return document;
}

export function updateGuideDocument(
  dataDir: string,
  id: string,
  input: UpdateGuideDocumentInput,
  now = new Date()
): GuideDocument {
  validateGuideSource(input.source);
  const documents = listGuideDocuments(dataDir);
  const existing = documents.find((document) => document.id === id);
  if (!existing) throw new Error("guide document was not found");
  const updatedAt = now.toISOString();
  const currentSnapshot = existing.snapshots.find((snapshot) => snapshot.id === existing.current_snapshot_id)
    ?? existing.snapshots.at(-1);
  const nextFingerprint = fingerprintGuideBody(input.body);
  const snapshots = currentSnapshot?.content_fingerprint === nextFingerprint
    ? existing.snapshots
    : [...existing.snapshots, createSnapshot(input.body, updatedAt)].slice(-maxSnapshotsPerDocument);
  const currentSnapshotId = snapshots.at(-1)?.id;
  if (!currentSnapshotId) throw new Error("guide snapshot could not be created");
  const updated = buildGuideDocument({
    id: existing.id,
    title: input.title,
    category: input.category,
    tags: input.tags,
    favorite: input.favorite,
    status: input.status,
    source: input.source,
    current_snapshot_id: currentSnapshotId,
    snapshots,
    created_at: existing.created_at,
    updated_at: updatedAt
  });
  writeGuideDocuments(dataDir, documents.map((document) => document.id === id ? updated : document));
  return updated;
}

export function deleteGuideDocument(dataDir: string, id: string): GuideDocument[] {
  const documents = listGuideDocuments(dataDir);
  const next = documents.filter((document) => document.id !== id);
  if (next.length !== documents.length) writeGuideDocuments(dataDir, next);
  return next;
}

function createSnapshot(body: string, capturedAt: string): GuideSnapshot {
  const normalizedBody = normalizeBody(body);
  return {
    id: randomUUID(),
    body: normalizedBody,
    content_fingerprint: fingerprintGuideBody(body),
    captured_at: capturedAt,
    sections: createGuideSourceSections(normalizedBody)
  };
}

function buildGuideDocument(value: GuideDocument): GuideDocument {
  const document = normalizeGuideDocument(value)[0];
  if (!document) throw new Error("invalid guide document");
  if (!document.title) throw new Error("guide title is required");
  if (!document.snapshots.length || !document.snapshots.at(-1)?.body) {
    throw new Error("guide body is required");
  }
  return document;
}

function normalizeGuideDocument(value: unknown): GuideDocument[] {
  if (!isRecord(value)
    || !nonEmptyString(value.id)
    || !nonEmptyString(value.title)
    || !nonEmptyString(value.created_at)
    || !Array.isArray(value.snapshots)) {
    return [];
  }
  const normalizedSnapshots = value.snapshots.flatMap(normalizeSnapshot);
  if (normalizedSnapshots.length !== value.snapshots.length) return [];
  const snapshots = normalizedSnapshots.slice(-maxSnapshotsPerDocument);
  if (!snapshots.length) return [];
  const requestedSnapshotId = optionalString(value.current_snapshot_id);
  const currentSnapshotId = snapshots.some((snapshot) => snapshot.id === requestedSnapshotId)
    ? requestedSnapshotId as string
    : snapshots.at(-1)!.id;
  return [{
    id: value.id.trim(),
    title: value.title.trim(),
    category: optionalString(value.category) ?? "未分类",
    tags: uniqueStrings(value.tags).slice(0, 20),
    favorite: value.favorite === true,
    status: normalizeStatus(value.status),
    source: normalizeSource(value.source),
    current_snapshot_id: currentSnapshotId,
    snapshots,
    created_at: value.created_at,
    updated_at: optionalString(value.updated_at)
  }];
}

function normalizeSnapshot(value: unknown): GuideSnapshot[] {
  if (!isRecord(value) || !nonEmptyString(value.id) || !nonEmptyString(value.body) || !nonEmptyString(value.captured_at)) {
    return [];
  }
  return [{
    id: value.id.trim(),
    body: normalizeBody(value.body),
    content_fingerprint: optionalString(value.content_fingerprint) ?? fingerprintGuideBody(value.body),
    captured_at: value.captured_at,
    sections: createGuideSourceSections(normalizeBody(value.body))
  }];
}

function normalizeSource(value: unknown): GuideSource {
  if (!isRecord(value)) return { kind: "text" };
  const kind = value.kind === "note" || value.kind === "url" ? value.kind : "text";
  return {
    kind,
    label: optionalString(value.label),
    url: kind === "url" ? optionalString(value.url) : undefined,
    resolved_url: kind === "url" ? optionalString(value.resolved_url) : undefined,
    read_at: kind === "url" ? optionalString(value.read_at) : undefined,
    content_type: kind === "url" ? optionalString(value.content_type) : undefined,
    read_warnings: kind === "url" ? uniqueStrings(value.read_warnings).slice(0, 20) : undefined
  };
}

function normalizeStatus(value: unknown): GuideDocumentStatus {
  return value === "archived" ? "archived" : "active";
}

function validateGuideSource(value: GuideSource): void {
  const source = normalizeSource(value);
  if (source.kind !== "url") return;
  if (!source.url) throw new Error("guide source URL is required");
  if (!isSupportedGuideSourceUrl(source.url)) throw new Error("guide source URL must use http or https");
}

function fingerprintGuideBody(body: string): string {
  return createHash("sha256").update(normalizeBody(body), "utf8").digest("hex");
}

function writeGuideDocuments(dataDir: string, documents: GuideDocument[]): void {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(guideLibraryPath(dataDir), `${JSON.stringify(documents, null, 2)}\n`, "utf8");
}

function guideLibraryPath(dataDir: string): string {
  return join(dataDir, guideLibraryFileName);
}

function normalizeBody(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const values = value.flatMap((entry) => {
    const normalized = optionalString(entry);
    return normalized ? [normalized] : [];
  });
  return [...new Set(values)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function optionalString(value: unknown): string | undefined {
  return nonEmptyString(value) ? value.trim() : undefined;
}
