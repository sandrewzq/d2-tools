import { useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { DirectoryCopy, InterfaceLocale } from "../i18n/types.js";
import { getRovingFocusIndex } from "../interaction/rovingFocus.js";
import {
  ProductWorkspaceCommandBar,
  ProductWorkspaceContentStack,
  ProductWorkspaceEmptyState
} from "../workspace/ProductWorkspace.js";
import {
  toolCategoryOrder,
  toolDirectoryEntries,
  type ToolCategory,
  type ToolEntry
} from "./toolDirectory.js";

export type DirectoryPageContentViewProps = {
  interfaceLocale?: InterfaceLocale;
  /** 打开外部链接。桌面端接 api.openExternal，Web 端接 adapter.openExternal。 */
  onOpenExternal?: (url: string) => void;
};

type CategoryFilter = ToolCategory | "all";

const categoryFilters: CategoryFilter[] = ["all", ...toolCategoryOrder];

export function DirectoryPageContentView({
  interfaceLocale = "zh-CN",
  onOpenExternal
}: DirectoryPageContentViewProps) {
  const copy = getLocaleCopy(interfaceLocale).directory;
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const categoryRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const normalizedQuery = query.trim().toLocaleLowerCase();

  const matched = useMemo(() => toolDirectoryEntries.filter((entry) => {
    if (category !== "all" && entry.category !== category) return false;
    if (!normalizedQuery) return true;
    return [entry.name, entry.purpose, entry.note ?? ""].some(
      (value) => value.toLocaleLowerCase().includes(normalizedQuery)
    );
  }), [category, normalizedQuery]);

  // 首层只放「推荐」和「可选」；「仅参考」「已归档」收进下面的折叠区。
  const featured = matched.filter((entry) => entry.level === "recommended" || entry.level === "optional");
  const archived = matched.filter((entry) => entry.level === "reference" || entry.level === "archived");

  const groups = toolCategoryOrder
    .map((key) => ({ key, entries: featured.filter((entry) => entry.category === key) }))
    .filter((group) => group.entries.length > 0);

  const hasFilter = category !== "all" || normalizedQuery.length > 0;

  function handleCategoryKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    const nextIndex = getRovingFocusIndex({
      key: event.key,
      currentIndex,
      itemCount: categoryFilters.length,
      orientation: "horizontal"
    });
    if (nextIndex === null) return;
    event.preventDefault();
    const next = categoryFilters[nextIndex];
    if (!next) return;
    setCategory(next);
    categoryRefs.current[nextIndex]?.focus();
  }

  function resetFilters() {
    setCategory("all");
    setQuery("");
  }

  return (
    <div className="directory-page" data-reference-id="directory.workspace" data-surface="page">
      <ProductWorkspaceCommandBar className="directory-command-bar" ariaLabel={copy.categoryLabel}>
        <div className="directory-filters">
          <div className="directory-category-strip" data-ui-kind="segmented-control" role="group" aria-label={copy.categoryLabel}>
            {categoryFilters.map((key, index) => (
              <button
                aria-pressed={category === key}
                data-control-variant="quiet"
                data-ui-kind="button"
                key={key}
                ref={(node) => { categoryRefs.current[index] = node; }}
                tabIndex={category === key ? 0 : -1}
                type="button"
                onClick={() => setCategory(key)}
                onKeyDown={(event) => handleCategoryKeyDown(event, index)}
              >
                {key === "all" ? copy.categoryAll : copy.categories[key]}
              </button>
            ))}
          </div>
          <label className="directory-search-field" data-ui-kind="field">
            <span className="directory-search-label">{copy.searchLabel}</span>
            <input
              aria-label={copy.searchLabel}
              placeholder={copy.searchPlaceholder}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <div className="directory-command-meta">
          <span data-info-priority="support" data-text-tone="meta">{copy.resultCount(matched.length)}</span>
          {hasFilter ? (
            <button
              className="directory-reset"
              data-control-variant="quiet"
              data-ui-kind="button"
              type="button"
              onClick={resetFilters}
            >
              {copy.reset}
            </button>
          ) : null}
        </div>
      </ProductWorkspaceCommandBar>

      <ProductWorkspaceContentStack className="directory-content">
        {groups.length ? groups.map((group) => (
          <section className="directory-group" data-surface="section" key={group.key}>
            <header className="directory-group-head">
              <h3 data-info-priority="context" data-text-tone="primary" data-ui-part="value">{copy.categories[group.key]}</h3>
              <span data-info-priority="support" data-text-tone="meta" data-ui-part="label">{group.entries.length}</span>
            </header>
            <div className="directory-card-grid">
              {group.entries.map((entry) => (
                <ToolCard copy={copy} entry={entry} key={entry.key} onOpenExternal={onOpenExternal} />
              ))}
            </div>
          </section>
        )) : null}

        {!featured.length ? (
          <ProductWorkspaceEmptyState>
            <strong data-info-priority="context" data-text-tone="primary" data-ui-part="value">{copy.emptyTitle}</strong>
            <p data-info-priority="reading" data-text-tone="body" data-ui-part="detail">{copy.emptyBody}</p>
            {hasFilter ? (
              <button data-control-variant="secondary" data-ui-kind="button" type="button" onClick={resetFilters}>
                {copy.reset}
              </button>
            ) : null}
          </ProductWorkspaceEmptyState>
        ) : null}

        {archived.length ? (
          <details className="directory-archived" data-surface="section">
            <summary data-info-priority="context" data-text-tone="primary">
              {copy.developerTitle}
              <span data-info-priority="support" data-text-tone="meta">{archived.length}</span>
            </summary>
            <p data-info-priority="reading" data-text-tone="body" data-ui-part="detail">{copy.developerHint}</p>
            <div className="directory-card-grid">
              {archived.map((entry) => (
                <ToolCard copy={copy} entry={entry} key={entry.key} onOpenExternal={onOpenExternal} />
              ))}
            </div>
          </details>
        ) : null}

        <p className="directory-boundary" data-info-priority="support" data-text-tone="meta" data-ui-part="detail">
          {copy.boundaryNotice}
        </p>
      </ProductWorkspaceContentStack>
    </div>
  );
}

function ToolCard({
  entry,
  copy,
  onOpenExternal
}: {
  entry: ToolEntry;
  copy: DirectoryCopy;
  onOpenExternal?: (url: string) => void;
}) {
  function handleExternalClick(event: MouseEvent<HTMLAnchorElement>, url: string) {
    if (!onOpenExternal) return;
    event.preventDefault();
    onOpenExternal(url);
  }

  return (
    <article className="directory-card" data-surface="object-card">
      <header className="directory-card-head">
        <h4 data-info-priority="context" data-text-tone="primary" data-ui-part="value">{entry.name}</h4>
        {entry.level === "recommended" ? (
          <span className="directory-card-badge" data-ui-kind="status-chip" data-ui-part="state">{copy.recommendedBadge}</span>
        ) : null}
      </header>
      <p className="directory-card-purpose" data-info-priority="reading" data-text-tone="body" data-ui-part="detail">{entry.purpose}</p>
      <div className="directory-card-tags">
        <span data-info-priority="support" data-text-tone="meta">{copy.accessLabels[entry.access]}</span>
      </div>
      {entry.note ? (
        <p className="directory-card-note" data-info-priority="support" data-text-tone="meta" data-ui-part="detail">{entry.note}</p>
      ) : null}
      <div className="directory-card-actions">
        {entry.onlineUrl ? (
          <a
            data-control-variant="primary"
            href={entry.onlineUrl}
            rel="noreferrer"
            target="_blank"
            onClick={(event) => handleExternalClick(event, entry.onlineUrl!)}
          >{copy.open}</a>
        ) : null}
        {entry.githubUrl ? (
          <a
            data-control-variant={entry.onlineUrl ? "secondary" : "primary"}
            href={entry.githubUrl}
            rel="noreferrer"
            target="_blank"
            onClick={(event) => handleExternalClick(event, entry.githubUrl!)}
          >{copy.openGithub}</a>
        ) : null}
        {entry.mobileUrls?.android ? (
          <a
            data-control-variant="secondary"
            href={entry.mobileUrls.android}
            rel="noreferrer"
            target="_blank"
            onClick={(event) => handleExternalClick(event, entry.mobileUrls!.android!)}
          >{copy.android}</a>
        ) : null}
        {entry.mobileUrls?.ios ? (
          <a
            data-control-variant="secondary"
            href={entry.mobileUrls.ios}
            rel="noreferrer"
            target="_blank"
            onClick={(event) => handleExternalClick(event, entry.mobileUrls!.ios!)}
          >{copy.ios}</a>
        ) : null}
      </div>
    </article>
  );
}
