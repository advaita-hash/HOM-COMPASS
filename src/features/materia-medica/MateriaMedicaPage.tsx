import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, FlaskConical, Loader2, NotebookPen, Search } from 'lucide-react';
import { SearchX } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { REMEDIES, getRemedyById } from '../../data/remedies';
import { RemedyDetail } from '../remedy/RemedyDetail';
import { BookCrossLinks } from '../books/BookCrossLinks';
import { useQueries } from '@tanstack/react-query';
import { BOOKS, bookQueryOptions } from '../books/booksIndex';
import { commonNameFor } from '../books/commonName';
import { canonicalName } from '../../lib/remedyName';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { RemedyNotepad } from '../notepad/RemedyNotepad';
import { remedyKeyForCurated } from '../notepad/remedyKey';

type Source = 'Curated' | (typeof BOOKS)[number]['label'];

interface Entry {
  key: string;
  name: string;
  source: Source;
  sub?: string | null;
  to: string;
}

const SOURCE_BADGE: Record<string, string> = {
  Curated: 'bg-brand-100 text-brand-700',
  Boericke: 'bg-teal-100 text-teal-700',
  Tyler: 'bg-indigo-100 text-indigo-700',
  Allen: 'bg-amber-100 text-amber-700',
};

function RemedyBrowser() {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<'All' | Source>('All');
  const books = useQueries({ queries: BOOKS.map((b) => bookQueryOptions(b.id)) });
  const loading = books.some((b) => b.isLoading);

  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    for (const r of REMEDIES)
      out.push({
        key: `c-${r.id}`,
        name: r.name,
        source: 'Curated',
        sub: r.essence,
        to: `/materia-medica/${r.id}`,
      });
    const boericke = books[BOOKS.findIndex((b) => b.id === 'boericke')]?.data;
    BOOKS.forEach((meta, i) => {
      for (const r of books[i].data?.remedies ?? [])
        out.push({
          key: `${meta.id}-${r.slug}`,
          name: r.name,
          source: meta.label,
          sub: commonNameFor(meta.id, r, boericke),
          to: `/books/${meta.id}/${r.slug}`,
        });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books.map((b) => b.dataUpdatedAt).join()]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: entries.length, Curated: 0 };
    for (const b of BOOKS) c[b.label] = 0;
    for (const e of entries) c[e.source] += 1;
    return c;
  }, [entries]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    let list = entries;
    if (source !== 'All') list = list.filter((e) => e.source === source);
    if (q)
      list = list.filter(
        (e) => e.name.toLowerCase().includes(q) || (e.sub ?? '').toLowerCase().includes(q),
      );
    return list.slice(0, 400);
  }, [entries, source, q]);

  const tabs: ('All' | Source)[] = ['All', 'Curated', ...BOOKS.map((b) => b.label)];

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <header className="mb-4 flex items-center gap-3">
        <FlaskConical className="h-6 w-6 text-brand-600" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Materia Medica</h1>
          <p className="text-sm text-slate-500">
            {loading ? 'Loading remedies…' : `${entries.length} remedies across ${BOOKS.length + 1} sources`}
          </p>
        </div>
      </header>

      {/* Source segregation — scrolls sideways on phones rather than truncating */}
      <div className="-mx-6 mb-4 overflow-x-auto px-6 md:mx-0 md:px-0">
        <SegmentedControl
          className="!max-w-none"
          ariaLabel="Source"
          value={source}
          onChange={setSource}
          options={tabs.map((t) => ({
            value: t,
            label: t,
            badge: <span className="text-2xs tabular-nums text-ink/60">{counts[t] ?? 0}</span>,
          }))}
        />
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search remedies…"
          className="w-full rounded-lg border border-slate-200 bg-surface py-3 pl-10 pr-3 text-sm focus:outline-none"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 p-6 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the reference books…
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {filtered.map((e) => (
          <Link key={e.key} to={e.to} className="card p-3 pressable">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-serif text-base font-semibold text-slate-800">
                {canonicalName(e.name)}
              </span>
              <span className={`shrink-0 rounded-full px-2 py-1 text-2xs font-medium ${SOURCE_BADGE[e.source] ?? SOURCE_BADGE.Curated}`}>
                {e.source}
              </span>
            </div>
            {e.sub && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{e.sub}</p>}
          </Link>
        ))}
      </div>
      {filtered.length === 0 && !loading && (
        <EmptyState
          icon={SearchX}
          title="No remedies match"
          description={<>Nothing in {source === 'All' ? 'any source' : source} matches “{query.trim()}”.</>}
          action={
            <button
              className="btn-secondary"
              onClick={() => {
                setQuery('');
                setSource('All');
              }}
            >
              Clear search
            </button>
          }
        />
      )}
      {filtered.length === 400 && (
        <p className="mt-2 text-center text-xs text-slate-400">
          Showing first 400 — refine your search to narrow.
        </p>
      )}
    </div>
  );
}

export default function MateriaMedicaPage() {
  const { remedyId } = useParams();
  if (!remedyId) return <RemedyBrowser />;

  const remedy = getRemedyById(remedyId);
  if (!remedy) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <Link to="/materia-medica" className="btn-ghost mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to Materia Medica
        </Link>
        <p className="text-sm text-slate-500">Remedy “{remedyId}” not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <Link to="/materia-medica" className="btn-ghost mb-4">
        <ChevronLeft className="h-4 w-4" /> Back to Materia Medica
      </Link>
      <RemedyDetail remedy={remedy} />
      <section className="card mt-5 p-5" aria-labelledby="notepad-heading">
        <h2 id="notepad-heading" className="mb-3 flex items-center gap-2 text-lg font-semibold text-ink/90">
          <NotebookPen className="h-5 w-5 text-brand-600" aria-hidden /> Notepad
        </h2>
        <RemedyNotepad remedyKey={remedyKeyForCurated(remedy)} remedyName={remedy.name} />
      </section>
      <div className="mt-5">
        <BookCrossLinks remedyName={remedy.name} />
      </div>
    </div>
  );
}
