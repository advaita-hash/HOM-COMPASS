import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookText, FlaskConical, Loader2, Search } from 'lucide-react';
import { REMEDIES } from '../../data/remedies';
import { useBook } from '../books/booksIndex';
import { useRepertory } from '../repertory/repertoryData';

function snippet(text: string, q: string, len = 140): string {
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return text.slice(0, len) + '…';
  const start = Math.max(0, i - len / 2);
  return (start > 0 ? '…' : '') + text.slice(start, start + len).trim() + '…';
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0 || !q) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-brand-100 text-brand-800">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export default function GlobalSearchPage() {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const active = q.length >= 2;

  const boericke = useBook(active ? 'boericke' : undefined);
  const tyler = useBook(active ? 'tyler' : undefined);
  const { data: rep } = useRepertory();
  const loading = active && (boericke.isLoading || tyler.isLoading);

  const curated = useMemo(() => {
    if (!active) return [];
    return REMEDIES.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.commonName.toLowerCase().includes(q) ||
        r.keynotes.some((k) => k.toLowerCase().includes(q)),
    ).slice(0, 8);
  }, [q, active]);

  const bookHits = useMemo(() => {
    if (!active) return [];
    const out: { book: string; id: string; slug: string; name: string; snip: string }[] = [];
    for (const b of [boericke.data, tyler.data]) {
      if (!b) continue;
      for (const r of b.remedies) {
        const hay = (r.name + ' ' + r.text).toLowerCase();
        if (hay.includes(q)) {
          out.push({
            book: b.id,
            id: b.id,
            slug: r.slug,
            name: r.name,
            snip: snippet(r.text, q),
          });
          if (out.length > 60) break;
        }
      }
    }
    return out;
  }, [q, active, boericke.data, tyler.data]);

  const rubricHits = useMemo(() => {
    if (!active || !rep) return [];
    return rep.rubrics
      .filter(
        (r) =>
          r.rubric.toLowerCase().includes(q) ||
          r.remedies.some((rm) => rm.name.toLowerCase().includes(q)),
      )
      .slice(0, 20);
  }, [q, active, rep]);

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <header className="mb-4 flex items-center gap-3">
        <Search className="h-6 w-6 text-brand-600" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Search</h1>
          <p className="text-sm text-slate-500">
            Across materia medica, reference books and the repertory.
          </p>
        </div>
      </header>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search remedies, symptoms, rubrics…"
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {!active && (
        <p className="text-sm text-slate-400">Type at least two characters to search.</p>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Searching the books…
        </div>
      )}

      {active && !loading && (
        <div className="space-y-6">
          {curated.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Materia Medica ({curated.length})
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {curated.map((r) => (
                  <Link key={r.id} to={`/materia-medica/${r.id}`} className="card p-3 hover:shadow-md">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <FlaskConical className="h-4 w-4 text-brand-500" />
                      <Highlight text={r.name} q={q} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{r.essence}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Reference Books ({bookHits.length})
            </h2>
            <div className="space-y-2">
              {bookHits.slice(0, 20).map((h, i) => (
                <Link
                  key={`${h.id}-${h.slug}-${i}`}
                  to={`/books/${h.id}/${h.slug}`}
                  className="card block p-3 hover:shadow-md"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <BookText className="h-4 w-4 text-brand-500" />
                    {h.name}
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                      {h.book}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    <Highlight text={h.snip} q={q} />
                  </p>
                </Link>
              ))}
              {bookHits.length === 0 && (
                <p className="text-sm text-slate-400">No book matches.</p>
              )}
            </div>
          </section>

          {rubricHits.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Repertory rubrics ({rubricHits.length})
              </h2>
              <div className="card overflow-hidden">
                {rubricHits.map((r) => (
                  <Link
                    key={r.id}
                    to="/repertory"
                    className="block border-b border-slate-100 px-3 py-2 text-sm last:border-0 hover:bg-slate-50"
                  >
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                      {r.chapter}
                    </span>{' '}
                    <Highlight text={r.rubric} q={q} />
                    <span className="ml-1 text-xs text-slate-400">
                      ({r.remedies.length})
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
