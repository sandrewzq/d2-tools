import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject
} from "react";

export type SharedItemDetailView = {
  name: string;
  isBusy?: boolean;
};

export type VendorOfferContext = {
  vendorName: string;
  costLabel: string;
  affordabilityLabel: string;
  characterLabel: string;
  refreshLabel: string;
  rollLabels?: string[];
  stats?: Record<string, number>;
};

export type SharedItemDetailDialogProps = {
  detail: SharedItemDetailView;
  vendorContext?: VendorOfferContext;
  closeLabel: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  sections: ReactNode;
  variant?: "default" | "weapon" | "armor";
  subtitle?: ReactNode;
  objectContext?: ReactNode;
};

export function SharedItemDetailDialog(props: SharedItemDetailDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const initialFocus = useRef<HTMLElement | null>(
    typeof document === "undefined" ? null : document.activeElement as HTMLElement | null
  );

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        props.onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      (props.returnFocusRef?.current ?? initialFocus.current)?.focus();
    };
  }, [props.onClose, props.returnFocusRef]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={props.onClose}>
      <section
        ref={dialogRef}
        className={`item-modal shared-item-detail-dialog shared-item-detail-${props.variant ?? "default"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={props.detail.isBusy ? "true" : "false"}
        onClick={(event) => event.stopPropagation()}
      >
        {props.variant === "weapon" || props.variant === "armor" ? (
          <header className="shared-item-detail-header">
            <div className="shared-item-detail-heading">
              <span>装备详情</span>
              <h2 id={titleId}>{props.variant === "armor" ? "护甲档案" : "武器档案"}</h2>
              <div className="shared-item-detail-subtitle">
                <strong>{props.detail.name}</strong>
                {props.subtitle ? <span>{props.subtitle}</span> : null}
              </div>
            </div>
            {props.objectContext ? <div className="shared-item-detail-object-context">{props.objectContext}</div> : null}
            <button
              ref={closeButtonRef}
              className="modal-close shared-item-detail-close"
              type="button"
              aria-label={props.closeLabel}
              onClick={props.onClose}
            >
              关闭
            </button>
          </header>
        ) : (
          <>
            <h2 id={titleId} className="shared-item-detail-title">{props.detail.name}</h2>
            <button
              ref={closeButtonRef}
              className="modal-close"
              type="button"
              aria-label={props.closeLabel}
              onClick={props.onClose}
            >
              关闭
            </button>
          </>
        )}
        {props.vendorContext ? (
          <section className="shared-item-detail-vendor" role="region" aria-label="商人售卖信息">
            <strong>{props.vendorContext.vendorName}</strong>
            <span>{props.vendorContext.costLabel}</span>
            <span>{props.vendorContext.affordabilityLabel}</span>
            <span>{props.vendorContext.characterLabel}</span>
            <span>{props.vendorContext.refreshLabel}</span>
            {props.vendorContext.rollLabels?.length ? (
              <span>当前售卖 Perk：{props.vendorContext.rollLabels.join(" / ")}</span>
            ) : null}
          </section>
        ) : null}
        <div className="shared-item-detail-body">{props.sections}</div>
      </section>
    </div>
  );
}
