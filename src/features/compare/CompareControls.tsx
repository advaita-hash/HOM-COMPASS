import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Columns3, Plus } from 'lucide-react';
import { canonicalName } from '../../lib/remedyName';
import { COMPARE_MAX, useCompare } from './compareStore';

/**
 * Toggle at the top of every book remedy. Off: secondary "Compare". On: filled
 * "In Compare" with a check (aria-pressed), so the state reads at a glance.
 * When the set is full it explains why instead of silently doing nothing.
 */
export function CompareButton({ book, slug, name }: { book: string; slug: string; name: string }) {
  const inSet = useCompare((s) => s.items.some((i) => i.book === book && i.slug === slug));
  const toggle = useCompare((s) => s.toggle);
  const [refused, setRefused] = useState(false);

  useEffect(() => {
    if (!refused) return;
    const t = setTimeout(() => setRefused(false), 2600);
    return () => clearTimeout(t);
  }, [refused]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-pressed={inSet}
        onClick={() => setRefused(!toggle({ book, slug, name }))}
        className={inSet ? 'btn-primary' : 'btn-secondary'}
      >
        {inSet ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Plus className="h-4 w-4" strokeWidth={2.5} />}
        {inSet ? 'In Compare' : 'Compare'}
      </button>
      <span role="status" className={refused ? 'text-xs text-ink/60' : 'sr-only'}>
        {refused ? `Compare holds ${COMPARE_MAX}. Remove one first.` : ''}
      </span>
    </div>
  );
}

/**
 * Floating compare tray (capsule) — appears once something is selected and
 * leads to the comparison. Sits above the home indicator via the safe-area
 * inset, centred in the content column (offset past the desktop sidebar).
 */
export function CompareTray() {
  const items = useCompare((s) => s.items);
  if (items.length === 0) return null;
  const ready = items.length >= 2;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4 lg:left-60"
      style={{ bottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <div className="material-thick pointer-events-auto flex animate-dialog-in items-center gap-3 rounded-full border border-ink/10 py-2 pl-3 pr-2 shadow-float">
        {/* stacked monograms */}
        <div className="flex -space-x-2" aria-hidden>
          {items.map((i) => (
            <span
              key={`${i.book}:${i.slug}`}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-brand-100 font-serif text-sm font-semibold text-brand-700"
            >
              {canonicalName(i.name)[0]}
            </span>
          ))}
        </div>
        <span className="text-sm text-ink/80">
          <span className="font-semibold tabular-nums">{items.length}</span> of {COMPARE_MAX}
        </span>
        <Link
          to="/compare"
          className={ready ? 'btn-primary rounded-full' : 'btn-secondary rounded-full'}
          aria-label={ready ? `Compare ${items.length} remedies` : 'Choose one more remedy to compare'}
        >
          <Columns3 className="h-4 w-4" />
          {ready ? 'Compare' : 'Add 1 more'}
        </Link>
      </div>
    </div>
  );
}
