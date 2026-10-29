import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, Loader2, Plus, Search } from 'lucide-react';
import { SearchX, TextSearch } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { REPERTORIES, useRepertory, useRepertorySelection } from './repertoryData';
import { RepertorySelect } from './RepertorySelect';
import { RemedySupportModal } from './RemedySupportModal';
import { useBindWorksheet, useWorksheet } from './worksheetStore';
import { canonicalName } from '../../lib/remedyName';
import { usePageTour } from '../tour/usePageTour';
import { TourButton } from '../tour/TourButton';
import type { Grade, Rubric } from './types';

const GRADE_CLASS: Record<Grade, string> = {
  1: 'text-grade-1',
  2: 'text-grade-2 font-medium',
  3: 'text-grade-3 font-semibold',
  4: 'text-grade-4 font-bold',
};

function RemedyChips({
  rubric,
  onRemedy,
}: {
  rubric: Rubric;
  onRemedy: (name: string) => void;
}) {
  return (
    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-sm">
      {rubric.remedies.map((r, i) => (
        <button
          // position + name: unique even if a source lists a remedy twice
          key={`${i}:${r.name}`}
          onClick={() => onRemedy(r.name)}
          data-tour={i === 0 ? 'repertory-remedy' : undefined}
          className={`${GRADE_CLASS[r.grade as Grade]} hover:underline`}
          title={`grade ${r.grade} — Materia Medica support`}
        >
          {canonicalName(r.name)}
        </button>
      ))}
    </div>
  );
}

function RubricRow({ rubric, onRemedy }: { rubric: Rubric; onRemedy: (name: string) => void }) {
  const has = useWorksheet((s) => s.has(rubric.id));
  const toggle = useWorksheet((s) => s.toggle);
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
      <button
        onClick={() => toggle(rubric.id)}
        data-tour="repertory-add"
        className={`tap mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-[background-color,border-color,color,transform] duration-300 ease-spring active:scale-[0.96] ${
          has
            ? 'border-accent bg-accent text-on-accent'
            : 'border-ink/30 text-ink/45 hover:border-accent hover:text-brand-600'
        }`}
        aria-label={has ? 'Remove from worksheet' : 'Add to worksheet'}
        title={has ? 'On worksheet' : 'Add to worksheet'}
      >
        {has ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-sm">
          <span className="text-2xs font-medium uppercase tracking-wide text-slate-400">
            {rubric.chapter}
          </span>{' '}
          <span className="font-medium text-slate-800">{rubric.rubric}</span>
          <span className="ml-2 text-xs text-slate-400">
            {rubric.remedies.length} remedies
          </span>
        </div>
        <RemedyChips rubric={rubric} onRemedy={onRemedy} />
      </div>
    </div>
  );
}

export default function RepertoryPage() {
  usePageTour('repertory');
  const { data: rep, isLoading, isError } = useRepertory();
  const repId = useRepertorySelection((s) => s.id);
  const repMeta = REPERTORIES.find((r) => r.id === repId);
  useBindWorksheet(repId); // rubrics only ever from the chosen repertory
  const [query, setQuery] = useState('');
  const [chapter, setChapter] = useState<string>('All');
  const [support, setSupport] = useState<{ name: string; rubric: Rubric } | null>(null);
  const count = useWorksheet((s) => s.items.length);

  const LIMIT = 200;
  const q = query.trim().toLowerCase();
  const { shown, total } = useMemo(() => {
    let rs = rep?.rubrics ?? [];
    if (chapter !== 'All') rs = rs.filter((r) => r.chapter === chapter);
    // rubric-text search only (fast over tens of thousands of rubrics)
    if (q) rs = rs.filter((r) => r.rubric.toLowerCase().includes(q));
    return { shown: rs.slice(0, LIMIT), total: rs.length };
  }, [rep, chapter, q]);
  const filtered = shown;
  // With tens of thousands of rubrics, require a search or chapter first.
  const needsFilter = !q && chapter === 'All' && (rep?.rubrics.length ?? 0) > LIMIT;

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-brand-600" />
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Repertory</h1>
            <p className="text-sm text-slate-500">
              {rep ? `${rep.rubricCount} rubrics · ${rep.title}` : 'Loading…'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RepertorySelect />
          <Link to="/analysis" data-tour="repertory-worksheet" className="btn-primary">
            Worksheet
            {count > 0 && (
              <span className="ml-1 rounded-full bg-white/25 px-2 text-xs">{count}</span>
            )}
          </Link>
          <TourButton tour="repertory" />
        </div>
      </header>

      {repMeta && (
        <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          {repMeta.blurb}
        </p>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            data-tour="repertory-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rubrics or remedies…"
            className="w-full rounded-lg border border-slate-200 bg-surface py-3 pl-10 pr-3 text-sm focus:outline-none"
          />
        </div>
        <select
          data-tour="repertory-chapter"
          value={chapter}
          onChange={(e) => setChapter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-surface px-3 py-3 text-sm text-slate-600"
        >
          <option>All</option>
          {rep?.chapters.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 p-8 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading repertory…
        </div>
      )}
      {isError && <p className="p-8 text-sm text-red-600">Failed to load repertory.</p>}

      {rep && needsFilter && (
        <div className="card">
          <EmptyState
            icon={TextSearch}
            title={`Search ${rep.rubricCount.toLocaleString()} rubrics`}
            description="Type a symptom above or pick a chapter to browse the repertory in Chapter → Rubric → Sub-rubric order."
            action={
              <button
                data-tour="repertory-browse"
                className="btn-primary"
                onClick={() => setChapter(rep.chapters[0])}
              >
                Browse {rep.chapters[0]}
              </button>
            }
          />
        </div>
      )}

      {rep && !needsFilter && (
        <>
          {total > filtered.length && (
            <p className="mb-2 text-xs text-slate-400">
              Showing {filtered.length} of {total.toLocaleString()} matches — refine your
              search to narrow.
            </p>
          )}
          <div className="card overflow-hidden">
            {filtered.map((r) => (
              <RubricRow
                key={r.id}
                rubric={r}
                onRemedy={(name) => setSupport({ name, rubric: r })}
              />
            ))}
            {filtered.length === 0 && (
              <EmptyState
                icon={SearchX}
                title="No rubrics match"
                description={
                  <>
                    Nothing in {chapter === 'All' ? 'the repertory' : chapter} contains “{query.trim()}”.
                  </>
                }
                action={
                  <button className="btn-secondary" onClick={() => setQuery('')}>
                    Clear search
                  </button>
                }
              />
            )}
          </div>
        </>
      )}

      {/* w-fit: the tour's spotlight hugs the key instead of the full row */}
      <div
        data-tour="repertory-grades"
        className="mt-3 flex w-fit flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400"
      >
        <span>Grade:</span>
        <span className="text-grade-3 font-semibold">3 bold</span>
        <span className="text-grade-2 font-medium">2 italic</span>
        <span className="text-grade-1">1 plain</span>
      </div>

      {support && (
        <RemedySupportModal
          remedyName={support.name}
          rubrics={[support.rubric]}
          onClose={() => setSupport(null)}
        />
      )}
    </div>
  );
}
