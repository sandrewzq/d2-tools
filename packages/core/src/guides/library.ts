import type { GuideSourceSection } from "./source.js";

export type GuideSourceKind = "text" | "note" | "url";
export type GuideDocumentStatus = "active" | "archived";

export type GuideSource = {
  kind: GuideSourceKind;
  label?: string;
  url?: string;
  resolved_url?: string;
  read_at?: string;
  content_type?: string;
  read_warnings?: string[];
};

export type GuideSnapshot = {
  id: string;
  body: string;
  content_fingerprint: string;
  captured_at: string;
  sections: GuideSourceSection[];
};

export type GuideDocument = {
  id: string;
  title: string;
  category: string;
  tags: string[];
  favorite: boolean;
  status: GuideDocumentStatus;
  source: GuideSource;
  current_snapshot_id: string;
  snapshots: GuideSnapshot[];
  created_at: string;
  updated_at?: string;
};

export type GuideDocumentDraft = {
  title: string;
  category: string;
  tags: string[];
  favorite: boolean;
  status: GuideDocumentStatus;
  source: GuideSource;
  body: string;
};

export type CreateGuideDocumentInput = GuideDocumentDraft;
export type UpdateGuideDocumentInput = GuideDocumentDraft;

export type GuideLibraryFilters = {
  query: string;
  status: GuideDocumentStatus | "all";
  category: string;
  favorites_only: boolean;
};

export function getGuideCurrentSnapshot(document: GuideDocument): GuideSnapshot | null {
  return document.snapshots.find((snapshot) => snapshot.id === document.current_snapshot_id)
    ?? document.snapshots.at(-1)
    ?? null;
}

export function isSupportedGuideSourceUrl(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function searchGuideDocuments(
  documents: readonly GuideDocument[],
  filters: GuideLibraryFilters
): GuideDocument[] {
  const query = normalizeSearchText(filters.query);
  return documents
    .filter((document) => filters.status === "all" || document.status === filters.status)
    .filter((document) => !filters.category || document.category === filters.category)
    .filter((document) => !filters.favorites_only || document.favorite)
    .filter((document) => {
      if (!query) return true;
      const snapshot = getGuideCurrentSnapshot(document);
      return normalizeSearchText([
        document.title,
        document.category,
        document.tags.join(" "),
        document.source.label ?? "",
        document.source.url ?? "",
        document.source.resolved_url ?? "",
        snapshot?.body ?? ""
      ].join(" ")).includes(query);
    })
    .sort(compareGuideDocuments);
}

function compareGuideDocuments(left: GuideDocument, right: GuideDocument): number {
  if (left.favorite !== right.favorite) return left.favorite ? -1 : 1;
  const leftTime = Date.parse(left.updated_at ?? left.created_at);
  const rightTime = Date.parse(right.updated_at ?? right.created_at);
  if (leftTime !== rightTime) return rightTime - leftTime;
  return left.title.localeCompare(right.title, "zh-CN");
}

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase("zh-CN").replace(/\s+/g, " ");
}
