import { selectLibraryPageModel, type LibraryPageCache, type LibraryPageState } from "@d2-tools/app/library";
import { LibraryPageContentView, type LibraryPageActions } from "@d2-tools/ui";

export type LibraryPageProps = {
  cache: LibraryPageCache;
  state: LibraryPageState;
  actions: LibraryPageActions;
};

export function LibraryPage(props: LibraryPageProps) {
  return (
    <LibraryPageContentView
      model={selectLibraryPageModel(props.cache, props.state)}
      actions={props.actions}
    />
  );
}
