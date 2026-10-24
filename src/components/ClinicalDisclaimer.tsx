import { Info } from 'lucide-react';

/** The one wording used everywhere the app suggests remedies or rubrics. */
export const DISCLAIMER =
  'Suggestions are study aids, not a diagnosis or prescription. Always apply your own clinical judgement.';

/** Short, always-visible clinical disclaimer line. */
export function ClinicalDisclaimer({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-start gap-2 text-xs leading-relaxed text-ink/70 ${className}`}>
      <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{DISCLAIMER}</span>
    </p>
  );
}
