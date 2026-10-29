import { Link } from 'react-router-dom';
import { Columns3 } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { ComparisonTable } from './ComparisonTable';
import { RemedyPicker } from './RemedyPicker';
import { COMPARE_MAX, useCompare } from './compareStore';
import { usePageTour } from '../tour/usePageTour';
import { TourButton } from '../tour/TourButton';

const isDesktop = () =>
  typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

/** Compare up to four remedies from any book, side by side. */
export default function ComparePage() {
  usePageTour('compare');
  const items = useCompare((s) => s.items);
  const clear = useCompare((s) => s.clear);

  return (
    <div className="page max-w-7xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {/* flex-1 keeps the ? beside the title; min-w-48 lets the actions wrap below it on phones */}
        <div className="flex min-w-48 flex-1 items-center gap-3">
          <Columns3 className="h-6 w-6 text-brand-600" />
          <div>
            <h1 className="text-2xl font-semibold text-ink/90">Compare</h1>
            <p className="text-sm text-ink/60">
              Up to {COMPARE_MAX} remedies from Boericke, Tyler and Allen, side by side.
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {items.length > 0 && (
            <button
              type="button"
              onClick={clear}
              data-tour="compare-clear"
              className="btn-ghost text-red-600 hover:bg-red-50"
            >
              Clear all
            </button>
          )}
          <TourButton tour="compare" />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-8">
          {/* Phone: once a comparison exists, start collapsed so results lead. */}
          <RemedyPicker defaultOpen={items.length < 2 || isDesktop()} />
        </aside>

        <section aria-label="Comparison" className="min-w-0">
          {items.length < 2 ? (
            <div className="card">
              <EmptyState
                icon={Columns3}
                title={items.length === 0 ? 'Nothing to compare yet' : 'Choose one more remedy'}
                description="Pick two to four remedies from the list, or tap Compare at the top of any remedy while you read any reference book."
                action={
                  <Link to="/books" data-tour="compare-browse" className="btn-primary">
                    Browse the books
                  </Link>
                }
              />
            </div>
          ) : (
            <ComparisonTable items={items} />
          )}
        </section>
      </div>
    </div>
  );
}
