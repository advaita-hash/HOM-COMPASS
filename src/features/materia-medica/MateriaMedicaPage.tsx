import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, FlaskConical, Loader2, Search } from 'lucide-react';
import { REMEDIES, getRemedyById } from '../../data/remedies';
import { RemedyDetail } from '../remedy/RemedyDetail';
import { BookCrossLinks } from '../books/BookCrossLinks';
import { useBook } from '../books/booksIndex';

type Source = 'Curated' | 'Boericke' | 'Tyler';

interface Entry {
  key: string;
  name: string;
  source: Source;
  sub?: string | null;
  to: string;
}

const SOURCE_BADGE: Record<Source, string> = {
  Curated: 'bg-brand-100 text-brand-700',
  Boericke: 'bg-teal-100 text-teal-700',
  Tyler: 'bg-indigo-100 text-indigo-700',
};

function RemedyBrowser() {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<'All' | Source>('All');
  const boericke = useBook('boericke');
  const tyler = useBook('tyler');
  const loading = boericke.isLoading || tyler.isLoading;

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
    for (const r of boericke.data?.remedies ?? [])
      out.push({
        key: `b-${r.slug}`,
        name: r.name,
        source: 'Boericke',
        sub: r.commonName,
        to: `/books/boericke/${r.slug}`,
      });
    for (const r of tyler.data?.remedies ?? [])
      out.push({
        key: `t-${r.slug}`,
        name: r.name,
        source: 'Tyler',
        sub: r.commonName,
        to: `/books/tyler/${r.slug}`,
      });
    return out;
  }, [boericke.data, tyler.data]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: entries.length, Curated: 0, Boericke: 0, Tyler: 0 };
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

  const tabs: ('All' | Source)[] = ['All', 'Curated', 'Boericke', 'Tyler'];

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <header className="mb-4 flex items-center gap-3">
        <FlaskConical className="h-6 w-6 text-brand-600" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Materia Medica</h1>
          <p className="text-sm text-slate-500">
            {loading ? 'Loading remedies…' : `${entries.length} remedies across 3 sources`}
          </p>
        </div>
      </header>

      {/* Source segregation */}
      <div className="mb-3 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setSource(t)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              source === t
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {t}
            <span className={`ml-1.5 text-xs ${source === t ? 'text-brand-100' : 'text-slate-400'}`}>
              {counts[t] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search remedies…"
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 p-6 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the reference books…
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {filtered.map((e) => (
          <Link key={e.key} to={e.to} className="card p-3 transition-shadow hover:shadow-md">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-serif text-base font-semibold text-slate-800">
                {e.name}
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${SOURCE_BADGE[e.source]}`}>
                {e.source}
              </span>
            </div>
            {e.sub && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{e.sub}</p>}
          </Link>
        ))}
      </div>
      {filtered.length === 0 && !loading && (
        <p className="py-8 text-center text-sm text-slate-400">No remedies match “{query}”.</p>
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
      <div className="mt-5">
        <BookCrossLinks remedyName={remedy.name} />
      </div>
    </div>
  );
}
