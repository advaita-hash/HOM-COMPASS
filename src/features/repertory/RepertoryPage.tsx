import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, Loader2, Plus, Search } from 'lucide-react';
import { useRepertory } from './repertoryData';
import { useWorksheet } from './worksheetStore';
import type { Grade, Rubric } from './types';

const GRADE_CLASS: Record<Grade, string> = {
  1: 'text-grade-1',
  2: 'text-grade-2 font-medium',
  3: 'text-grade-3 font-semibold',
  4: 'text-grade-4 font-bold',
};

function RemedyChips({ rubric }: { rubric: Rubric }) {
  return (
    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-sm">
      {rubric.remedies.map((r) => (
        <span key={r.name} className={GRADE_CLASS[r.grade as Grade]} title={`grade ${r.grade}`}>
          {r.name}
        </span>
      ))}
    </div>
  );
}

function RubricRow({ rubric }: { rubric: Rubric }) {
  const has = useWorksheet((s) => s.has(rubric.id));
  const toggle = useWorksheet((s) => s.toggle);
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
      <button
        onClick={() => toggle(rubric.id)}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
          has
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-500'
        }`}
        aria-label={has ? 'Remove from worksheet' : 'Add to worksheet'}
        title={has ? 'On worksheet' : 'Add to worksheet'}
      >
        {has ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-sm">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {rubric.chapter}
          </span>{' '}
          <span className="font-medium text-slate-800">{rubric.rubric}</span>
          <span className="ml-2 text-xs text-slate-400">
            {rubric.remedies.length} remedies
          </span>
        </div>
        <RemedyChips rubric={rubric} />
      </div>
    </div>
  );
}

export default function RepertoryPage() {
  const { data: rep, isLoading, isError } = useRepertory();
  const [query, setQuery] = useState('');
  const [chapter, setChapter] = useState<string>('All');
  const count = useWorksheet((s) => s.items.length);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    let rs = rep?.rubrics ?? [];
    if (chapter !== 'All') rs = rs.filter((r) => r.chapter === chapter);
    if (q)
      rs = rs.filter(
        (r) =>
          r.rubric.toLowerCase().includes(q) ||
          r.chapter.toLowerCase().includes(q) ||
          r.remedies.some((rm) => rm.name.toLowerCase().includes(q)),
      );
    return rs;
  }, [rep, chapter, q]);

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-brand-600" />
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Repertory</h1>
            <p className="text-sm text-slate-500">
              {rep ? `${rep.rubricCount} rubrics · ${rep.title}` : 'Loading…'}
            </p>
          </div>
        </div>
        <Link to="/analysis" className="btn-primary">
          Worksheet
          {count > 0 && (
            <span className="ml-1 rounded-full bg-white/25 px-1.5 text-xs">{count}</span>
          )}
        </Link>
      </header>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rubrics or remedies…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select
          value={chapter}
          onChange={(e) => setChapter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600"
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

      {rep && (
        <div className="card overflow-hidden">
          {filtered.map((r) => (
            <RubricRow key={r.id} rubric={r} />
          ))}
          {filtered.length === 0 && (
            <p className="p-8 text-center text-sm text-slate-400">No rubrics match.</p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
        <span>Grade:</span>
        <span className="text-grade-3 font-semibold">3 bold</span>
        <span className="text-grade-2 font-medium">2 italic</span>
        <span className="text-grade-1">1 plain</span>
      </div>
    </div>
  );
}
