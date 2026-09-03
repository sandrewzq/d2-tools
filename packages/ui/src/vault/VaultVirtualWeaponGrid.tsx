import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode
} from "react";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";

type VirtualWindow = {
  columns: number;
  startIndex: number;
  endIndex: number;
  topSpacer: number;
  bottomSpacer: number;
  rowStride: number;
};

const initialWindow: VirtualWindow = {
  columns: 1,
  startIndex: 0,
  endIndex: 30,
  topSpacer: 0,
  bottomSpacer: 0,
  rowStride: 192
};

export function VaultVirtualWeaponGrid(props: {
  items: AccountItemSummary[];
  className: string;
  renderItem: (item: AccountItemSummary, index: number) => ReactNode;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const pendingFocusIndexRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const [windowState, setWindowState] = useState<VirtualWindow>(() => ({
    ...initialWindow,
    endIndex: Math.min(initialWindow.endIndex, props.items.length)
  }));

  const updateWindow = useCallback(() => {
    const grid = gridRef.current;
    const scrollRoot = grid?.closest<HTMLElement>(".shell-content");
    if (!grid || !scrollRoot) return;
    const computedStyle = getComputedStyle(grid);
    const columns = Math.max(1, computedStyle.gridTemplateColumns.trim().split(/\s+/u).filter(Boolean).length);
    const rowGap = Number.parseFloat(computedStyle.rowGap) || 0;
    const firstCell = grid.querySelector<HTMLElement>("[data-vault-virtual-index]");
    const measuredHeight = firstCell?.getBoundingClientRect().height ?? 0;
    const rowStride = measuredHeight > 0 ? measuredHeight + rowGap : windowState.rowStride;
    const rootRect = scrollRoot.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const gridTop = gridRect.top - rootRect.top + scrollRoot.scrollTop;
    const visibleTop = Math.max(0, scrollRoot.scrollTop - gridTop);
    const visibleBottom = Math.max(visibleTop, scrollRoot.scrollTop + scrollRoot.clientHeight - gridTop);
    const totalRows = Math.ceil(props.items.length / columns);
    const overscanRows = 3;
    const startRow = Math.max(0, Math.floor(visibleTop / rowStride) - overscanRows);
    const endRow = Math.min(totalRows, Math.ceil(visibleBottom / rowStride) + overscanRows);
    const startIndex = Math.min(props.items.length, startRow * columns);
    const endIndex = Math.min(props.items.length, Math.max(startIndex, endRow * columns));
    const next: VirtualWindow = {
      columns,
      startIndex,
      endIndex,
      topSpacer: startRow * rowStride,
      bottomSpacer: Math.max(0, (totalRows - endRow) * rowStride),
      rowStride
    };
    setWindowState((current) => sameVirtualWindow(current, next) ? current : next);
  }, [props.items.length, windowState.rowStride]);

  const scheduleWindowUpdate = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      updateWindow();
    });
  }, [updateWindow]);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    const scrollRoot = grid?.closest<HTMLElement>(".shell-content");
    if (!grid || !scrollRoot) return;
    const resizeObserver = new ResizeObserver(scheduleWindowUpdate);
    resizeObserver.observe(grid);
    resizeObserver.observe(scrollRoot);
    scrollRoot.addEventListener("scroll", scheduleWindowUpdate, { passive: true });
    scheduleWindowUpdate();
    return () => {
      resizeObserver.disconnect();
      scrollRoot.removeEventListener("scroll", scheduleWindowUpdate);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [scheduleWindowUpdate]);

  useEffect(() => {
    scheduleWindowUpdate();
  }, [props.items, scheduleWindowUpdate]);

  useLayoutEffect(() => {
    const index = pendingFocusIndexRef.current;
    if (index === null || index < windowState.startIndex || index >= windowState.endIndex) return;
    const target = gridRef.current?.querySelector<HTMLElement>(`[data-vault-virtual-index="${index}"] .vault-card-main`);
    if (!target) return;
    pendingFocusIndexRef.current = null;
    target.focus({ preventScroll: true });
  }, [windowState.endIndex, windowState.startIndex]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target as HTMLElement;
    if (!target.classList.contains("vault-card-main")) return;
    const cell = target.closest<HTMLElement>("[data-vault-virtual-index]");
    const currentIndex = Number(cell?.dataset.vaultVirtualIndex);
    if (!Number.isInteger(currentIndex)) return;
    let nextIndex = currentIndex;
    if (event.key === "ArrowLeft") nextIndex = Math.max(0, currentIndex - 1);
    else if (event.key === "ArrowRight") nextIndex = Math.min(props.items.length - 1, currentIndex + 1);
    else if (event.key === "ArrowUp") nextIndex = Math.max(0, currentIndex - windowState.columns);
    else if (event.key === "ArrowDown") nextIndex = Math.min(props.items.length - 1, currentIndex + windowState.columns);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = props.items.length - 1;
    else return;
    if (nextIndex === currentIndex) return;
    event.preventDefault();
    focusItem(nextIndex);
  }

  function focusItem(index: number) {
    const renderedTarget = gridRef.current?.querySelector<HTMLElement>(`[data-vault-virtual-index="${index}"] .vault-card-main`);
    if (renderedTarget) {
      renderedTarget.focus();
      return;
    }
    const grid = gridRef.current;
    const scrollRoot = grid?.closest<HTMLElement>(".shell-content");
    if (!grid || !scrollRoot) return;
    const rootRect = scrollRoot.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const gridTop = gridRect.top - rootRect.top + scrollRoot.scrollTop;
    const row = Math.floor(index / windowState.columns);
    pendingFocusIndexRef.current = index;
    scrollRoot.scrollTo({ top: Math.max(0, gridTop + row * windowState.rowStride - 12) });
    scheduleWindowUpdate();
  }

  const visibleItems = props.items.slice(windowState.startIndex, windowState.endIndex);

  return (
    <div ref={gridRef} className={`vault-card-grid ${props.className}`} onKeyDown={handleKeyDown}>
      {windowState.topSpacer > 0 ? (
        <div className="vault-virtual-spacer" style={{ height: windowState.topSpacer }} aria-hidden="true" />
      ) : null}
      {visibleItems.map((item, offset) => {
        const index = windowState.startIndex + offset;
        return (
          <div
            className="vault-virtual-cell"
            data-vault-virtual-index={index}
            key={item.instance_id ?? `${item.hash}:${index}`}
          >
            {props.renderItem(item, index)}
          </div>
        );
      })}
      {windowState.bottomSpacer > 0 ? (
        <div className="vault-virtual-spacer" style={{ height: windowState.bottomSpacer }} aria-hidden="true" />
      ) : null}
    </div>
  );
}

function sameVirtualWindow(left: VirtualWindow, right: VirtualWindow): boolean {
  return left.columns === right.columns
    && left.startIndex === right.startIndex
    && left.endIndex === right.endIndex
    && Math.abs(left.topSpacer - right.topSpacer) < 1
    && Math.abs(left.bottomSpacer - right.bottomSpacer) < 1
    && Math.abs(left.rowStride - right.rowStride) < 1;
}
