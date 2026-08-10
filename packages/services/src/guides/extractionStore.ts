import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  confirmGuideExtraction,
  createGuideExtraction,
  restoreGuideExtractionConfirmation,
  toGuideExtractionConfirmation,
  type GuideExtraction,
  type GuideExtractionConfirmation
} from "@d2-tools/core/guides/extraction";
import { getGuideCurrentSnapshot, type GuideDocument } from "@d2-tools/core/guides/library";
import { deleteGuideDocument, listGuideDocuments } from "./store.js";

const extractionFileName = "guide-extractions.json";
const maxConfirmations = 1000;

export function listGuideExtractions(dataDir: string, documents = listGuideDocuments(dataDir)): GuideExtraction[] {
  const confirmations = readConfirmations(dataDir);
  const documentsById = new Map(documents.map((document) => [document.id, document]));
  return confirmations.flatMap((confirmation) => {
    const document = documentsById.get(confirmation.guide_document_id);
    const snapshot = document?.snapshots.find((entry) => entry.id === confirmation.source_snapshot_id);
    if (!snapshot) return [];
    const extraction = restoreGuideExtractionConfirmation({ confirmation, snapshot });
    return extraction ? [extraction] : [];
  });
}

export function previewGuideExtraction(dataDir: string, guideDocumentId: string, now = new Date()): GuideExtraction {
  const document = requireGuideDocument(listGuideDocuments(dataDir), guideDocumentId);
  const snapshot = getGuideCurrentSnapshot(document);
  if (!snapshot) throw new Error("攻略正文快照不存在");
  return createGuideExtraction({ guideDocumentId, snapshot, now });
}

export function saveGuideExtractionConfirmation(input: {
  dataDir: string;
  guideDocumentId: string;
  extractionId: string;
  acceptedCandidateIds: string[];
  now?: Date;
}): GuideExtraction {
  const extraction = previewGuideExtraction(input.dataDir, input.guideDocumentId, input.now);
  if (extraction.id !== input.extractionId) throw new Error("攻略正文已变化，请重新提取后确认");
  const confirmed = confirmGuideExtraction(extraction, input.acceptedCandidateIds, input.now);
  const confirmation = toGuideExtractionConfirmation(confirmed);
  const confirmations = readConfirmations(input.dataDir);
  const next = [
    confirmation,
    ...confirmations.filter((entry) => entry.guide_document_id !== confirmation.guide_document_id
      || entry.source_snapshot_id !== confirmation.source_snapshot_id)
  ];
  if (next.length > maxConfirmations) throw new Error(`攻略提取确认最多保存 ${maxConfirmations} 条`);
  writeConfirmations(input.dataDir, next);
  return confirmed;
}

export function deleteGuideExtractions(dataDir: string, guideDocumentId: string): void {
  const confirmations = readConfirmations(dataDir);
  const next = confirmations.filter((entry) => entry.guide_document_id !== guideDocumentId);
  if (next.length !== confirmations.length) writeConfirmations(dataDir, next);
}

export function deleteGuideDocumentWithExtractions(dataDir: string, guideDocumentId: string): GuideDocument[] {
  const documents = listGuideDocuments(dataDir);
  if (!documents.some((document) => document.id === guideDocumentId)) return documents;
  const confirmations = readConfirmations(dataDir);
  const nextConfirmations = confirmations.filter((entry) => entry.guide_document_id !== guideDocumentId);
  const confirmationsChanged = nextConfirmations.length !== confirmations.length;
  if (confirmationsChanged) writeConfirmations(dataDir, nextConfirmations);
  try {
    return deleteGuideDocument(dataDir, guideDocumentId);
  } catch (error) {
    if (confirmationsChanged) writeConfirmations(dataDir, confirmations);
    throw error;
  }
}

function readConfirmations(dataDir: string): GuideExtractionConfirmation[] {
  const path = join(dataDir, extractionFileName);
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (!Array.isArray(raw)) throw new Error("guide extraction root must be an array");
    const confirmations = raw.flatMap(normalizeConfirmation);
    if (confirmations.length !== raw.length) throw new Error("guide extraction file contains an invalid record");
    return confirmations;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`guide extraction confirmations could not be read: ${detail}`);
  }
}

function normalizeConfirmation(value: unknown): GuideExtractionConfirmation[] {
  if (!isRecord(value)
    || !nonEmptyString(value.id)
    || !nonEmptyString(value.guide_document_id)
    || !nonEmptyString(value.source_snapshot_id)
    || !nonEmptyString(value.source_fingerprint)
    || !nonEmptyString(value.parser_version)
    || !Array.isArray(value.accepted_candidate_ids)
    || !nonEmptyString(value.confirmed_at)
    || !Number.isFinite(Date.parse(value.confirmed_at))) {
    return [];
  }
  const acceptedCandidateIds = value.accepted_candidate_ids.filter(nonEmptyString).map((entry) => entry.trim());
  if (acceptedCandidateIds.length !== value.accepted_candidate_ids.length) return [];
  return [{
    id: value.id.trim(),
    guide_document_id: value.guide_document_id.trim(),
    source_snapshot_id: value.source_snapshot_id.trim(),
    source_fingerprint: value.source_fingerprint.trim(),
    parser_version: value.parser_version.trim(),
    accepted_candidate_ids: [...new Set(acceptedCandidateIds)],
    confirmed_at: value.confirmed_at.trim()
  }];
}

function writeConfirmations(dataDir: string, confirmations: GuideExtractionConfirmation[]): void {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, extractionFileName), `${JSON.stringify(confirmations, null, 2)}\n`, "utf8");
}

function requireGuideDocument(documents: GuideDocument[], id: string): GuideDocument {
  const document = documents.find((entry) => entry.id === id);
  if (!document) throw new Error("攻略文档不存在");
  return document;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
