import { type ReactNode, useEffect, useId, useRef } from 'react';

/**
 * Alert-style confirmation (UIAlertController .alert) for destructive or
 * irreversible actions. Centred, compact, two buttons. Focus starts on Cancel
 * (the safe choice) and is trapped between the buttons; Escape cancels and
 * focus returns to whatever opened the dialog.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: ReactNode;
  message?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Tab') {
        // two focusable controls: keep focus inside the dialog
        e.preventDefault();
        const next = document.activeElement === cancelRef.current ? confirmRef.current : cancelRef.current;
        next?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 animate-fade-in" style={{ background: 'var(--dim)' }} onClick={onCancel} aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? messageId : undefined}
        className="material-thick relative w-full max-w-[320px] animate-dialog-in overflow-hidden rounded-2xl border border-ink/10 text-center shadow-elevated"
      >
        <div className="px-5 pb-4 pt-5">
          <h2 id={titleId} className="text-base font-semibold leading-snug text-ink/90">
            {title}
          </h2>
          {message && (
            <div id={messageId} className="mt-2 text-sm leading-relaxed text-ink/70">
              {message}
            </div>
          )}
        </div>
        {/* focus rings are inset and follow the bottom corners, so the
            dialog's overflow-hidden (needed for the rounded hover fills)
            can't clip them */}
        <div className="grid grid-cols-2 border-t border-ink/10">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="min-h-[44px] rounded-bl-2xl px-4 py-3 text-base font-medium text-brand-600 transition-colors hover:bg-ink/[0.05] focus-visible:outline-offset-[-3px] active:bg-ink/10"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`min-h-[44px] rounded-br-2xl border-l border-ink/10 px-4 py-3 text-base font-semibold transition-colors hover:bg-ink/[0.05] focus-visible:outline-offset-[-3px] active:bg-ink/10 ${
              destructive ? 'text-red-700' : 'text-brand-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
