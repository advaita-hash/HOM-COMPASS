import { type ReactNode, useEffect, useId } from 'react';
import { X } from 'lucide-react';

/**
 * Modal sheet. Phones: slides up from the bottom edge with a grabber handle.
 * Tablet/desktop (sm+): a centred dialog that springs in. The header is a
 * vibrant material pinned to the top so content scrolls beneath the blur.
 * Escape and the dimmed backdrop dismiss it; page scroll is locked while open.
 */
export function Sheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
    >
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: 'var(--dim)' }}
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex max-h-[92vh] w-full animate-sheet-in flex-col overflow-auto rounded-t-2xl bg-elevated shadow-float sm:max-h-[85vh] sm:max-w-2xl sm:animate-dialog-in sm:rounded-2xl">
        <header className="material sticky top-0 z-10 border-b border-ink/10">
          {/* grabber — sheet presentation only */}
          <div className="flex justify-center pt-2 sm:hidden" aria-hidden>
            <span className="h-[5px] w-9 rounded-full bg-ink/30" />
          </div>
          <div className="flex items-start gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              {/* focusable by script only (where a screen reader starts reading
                  when the sheet opens); no ring on a heading that isn't a Tab stop */}
              <h2 id={titleId} tabIndex={-1} className="font-serif text-xl font-semibold text-ink/90 focus:outline-none">
                {title}
              </h2>
              {subtitle && <p className="text-xs text-ink/70">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="tap flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink/90"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </header>
        <div
          className="px-5 pt-4"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
