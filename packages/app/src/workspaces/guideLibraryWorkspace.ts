import {
  getGuideCurrentSnapshot,
  searchGuideDocuments,
  type GuideDocument,
  type GuideDocumentDraft,
  type GuideLibraryFilters
} from "@d2-tools/core/guides/library";

export type GuideLibraryDirectoryEntry = {
  id: string;
  title: string;
  category: string;
  tags: string[];
  favorite: boolean;
  status: GuideDocument["status"];
  source_label: string;
  excerpt: string;
  snapshot_count: number;
  updated_at: string;
};

export type GuideLibraryCategoryEntry = {
  key: string;
  label: string;
  count: number;
};

export type GuideLibraryWorkspaceModel = {
  entries: GuideLibraryDirectoryEntry[];
  selected_document: GuideDocument | null;
  categories: GuideLibraryCategoryEntry[];
  total_count: number;
  active_count: number;
  archived_count: number;
  favorite_count: number;
};

export function createEmptyGuideDocumentDraft(): GuideDocumentDraft {
  return {
    title: "",
    category: "未分类",
    tags: [],
    favorite: false,
    status: "active",
    source: { kind: "text" },
    body: ""
  };
}

export function toGuideDocumentDraft(document: GuideDocument): GuideDocumentDraft {
  return {
    title: document.title,
    category: document.category,
    tags: [...document.tags],
    favorite: document.favorite,
    status: document.status,
    source: { ...document.source },
    body: getGuideCurrentSnapshot(document)?.body ?? ""
  };
}

export function selectGuideLibraryWorkspace(input: {
  documents: GuideDocument[];
  filters: GuideLibraryFilters;
  selectedDocumentId: string;
}): GuideLibraryWorkspaceModel {
  const visibleDocuments = searchGuideDocuments(input.documents, input.filters);
  const selectedDocument = visibleDocuments.find((document) => document.id === input.selectedDocumentId)
    ?? visibleDocuments[0]
    ?? null;
  const categoryCounts = new Map<string, number>();
  for (const document of input.documents.filter((document) => input.filters.status === "all" || document.status === input.filters.status)) {
    categoryCounts.set(document.category, (categoryCounts.get(document.category) ?? 0) + 1);
  }
  return {
    entries: visibleDocuments.map(toDirectoryEntry),
    selected_document: selectedDocument,
    categories: [...categoryCounts.entries()]
      .map(([key, count]) => ({ key, label: key, count }))
      .sort((left, right) => left.label.localeCompare(right.label, "zh-CN")),
    total_count: input.documents.length,
    active_count: input.documents.filter((document) => document.status === "active").length,
    archived_count: input.documents.filter((document) => document.status === "archived").length,
    favorite_count: input.documents.filter((document) => document.favorite).length
  };
}

function toDirectoryEntry(document: GuideDocument): GuideLibraryDirectoryEntry {
  const snapshot = getGuideCurrentSnapshot(document);
  return {
    id: document.id,
    title: document.title,
    category: document.category,
    tags: document.tags,
    favorite: document.favorite,
    status: document.status,
    source_label: formatGuideSource(document),
    excerpt: createExcerpt(snapshot?.body ?? ""),
    snapshot_count: document.snapshots.length,
    updated_at: document.updated_at ?? document.created_at
  };
}

function formatGuideSource(document: GuideDocument): string {
  if (document.source.kind === "url") return document.source.label ?? "链接正文";
  if (document.source.kind === "note") return document.source.label ?? "个人笔记";
  return document.source.label ?? "粘贴文本";
}

function createExcerpt(body: string): string {
  const compact = body.replace(/\s+/g, " ").trim();
  return compact.length <= 100 ? compact : `${compact.slice(0, 99)}…`;
}
