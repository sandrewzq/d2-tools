import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject
} from "react";
import { createPortal } from "react-dom";
import { ControlButton } from "../control/ControlButton.js";

export type ConfirmationDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmTone?: "primary" | "danger";
  isBusy?: boolean;
  children?: ReactNode;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmationDialog(props: ConfirmationDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const onCancelRef = useRef(props.onCancel);
  const isBusyRef = useRef(Boolean(props.isBusy));
  const initialFocusRef = useRef<HTMLElement | null>(
    typeof document === "undefined" ? null : document.activeElement as HTMLElement | null
  );
  const portalHost = typeof document === "undefined"
    ? null
    : initialFocusRef.current?.closest<HTMLElement>(".app-shell")
      ?? document.querySelector<HTMLElement>(".app-shell")
      ?? document.body;
  onCancelRef.current = props.onCancel;
  isBusyRef.current = Boolean(props.isBusy);

  useEffect(() => {
    const dialogBackdrop = dialogRef.current?.parentElement;
    const backgroundElements = portalHost
      ? [...portalHost.children].flatMap((element) => (
          element instanceof HTMLElement && element !== dialogBackdrop
            ? [{ element, wasInert: element.inert }]
            : []
        ))
      : [];
    backgroundElements.forEach(({ element }) => {
      element.inert = true;
    });
    dialogRef.current?.querySelector<HTMLButtonElement>("[data-confirm-cancel]")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isBusyRef.current) onCancelRef.current();
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
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      backgroundElements.forEach(({ element, wasInert }) => {
        element.inert = wasInert;
      });
      const returnTarget = props.returnFocusRef?.current ?? initialFocusRef.current;
      if (returnTarget?.isConnected) returnTarget.focus();
    };
  }, [portalHost, props.returnFocusRef]);

  const dialog = (
    <div className="modal-backdrop confirmation-dialog-backdrop" role="presentation" onClick={() => !props.isBusy && props.onCancel()}>
      <section
        ref={dialogRef}
        className="confirmation-dialog"
        data-surface="dialog"
        data-confirm-tone={props.confirmTone ?? "primary"}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={props.isBusy ? "true" : "false"}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="confirmation-dialog-header">
          <span className="confirmation-dialog-mark" aria-hidden="true">!</span>
          <div>
            <h2 id={titleId}>{props.title}</h2>
            <p id={descriptionId}>{props.description}</p>
          </div>
        </header>
        {props.children ? <div className="confirmation-dialog-detail">{props.children}</div> : null}
        <footer className="confirmation-dialog-actions">
          <ControlButton data-confirm-cancel="" variant="secondary" disabled={props.isBusy} onClick={props.onCancel}>
            {props.cancelLabel}
          </ControlButton>
          <ControlButton variant={props.confirmTone === "danger" ? "danger" : "primary"} disabled={props.isBusy} onClick={() => void props.onConfirm()}>
            {props.confirmLabel}
          </ControlButton>
        </footer>
      </section>
    </div>
  );

  return portalHost ? createPortal(dialog, portalHost) : dialog;
}
