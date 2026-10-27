import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookText, FlaskConical, Loader2, Search, StickyNote } from 'lucide-react';
import { REMEDIES } from '../../data/remedies';
import { useQueries } from '@tanstack/react-query';
import { BOOKS, bookQueryOptions } from '../books/booksIndex';
import { useRepertory } from '../repertory/repertoryData';
import { canonicalName } from '../../lib/remedyName';
import { useNotepad, type PadNote } from '../notepad/notepadStore';
import { bookLabel, noteHref, noteTitle } from '../notepad/links';
import { placeLabel } from '../notepad/places';

function snippet(text: string, q: string, len = 140): string {
  const i = text.toLowerCase().indexOf(q);
  const start = i < 0 ? 0 : Math.max(0, i - len / 2);
  return (start > 0 ? '…' : '') + text.slice(start, start + len).trim() + (start + len < text.length ? '…' : '');
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

  const books = useQueries({
    queries: BOOKS.map((b) => ({ ...bookQueryOptions(b.id), enabled: active })),
  });
  const { data: rep } = useRepertory();
  const loading = active && books.some((b) => b.isLoading);
  const notes = useNotepad((s) => s.notes);

  // The practitioner's own notes: their words, or the passage a note is pinned to.
  const noteHits = useMemo(() => {
    if (!active) return [];
    const out: { note: PadNote; snip: string }[] = [];
    for (const n of [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
      const body = n.body.replace(/\s+/g, ' ').trim();
      const quote = n.place?.quote;
      if (body.toLowerCase().includes(q)) out.push({ note: n, snip: snippet(body, q) });
      else if (quote?.toLowerCase().includes(q)) out.push({ note: n, snip: `“${snippet(quote, q)}”` });
      else continue;
      if (out.length >= 20) break;
    }
    return out;
  }, [q, active, notes]);

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
    // Up to 20 hits per book, interleaved so every book shows near the top.
    const perBook = BOOKS.map((meta, i) => {
      const hits: { book: string; id: string; slug: string; name: string; snip: string }[] = [];
      for (const r of books[i].data?.remedies ?? []) {
        if (!(r.name + ' ' + r.text).toLowerCase().includes(q)) continue;
        const flat = r.text.replace(/\s*•\s*/g, ' ');
        hits.push({ book: meta.label, id: meta.id, slug: r.slug, name: r.name, snip: snippet(flat, q) });
        if (hits.length >= 20) break;
      }
      return hits;
    });
    const out: (typeof perBook)[number] = [];
    for (let k = 0; k < 20; k++) for (const hits of perBook) if (hits[k]) out.push(hits[k]);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, active, books.map((b) => b.dataUpdatedAt).join()]);

  const rubricHits = useMemo(() => {
    if (!active || !rep) return [];
    const out = [];
    for (const r of rep.rubrics) {
      if (r.rubric.toLowerCase().includes(q)) {
        out.push(r);
        if (out.length >= 20) break; // early-break over large repertories
      }
    }
    return out;
  }, [q, active, rep]);

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <header className="mb-4 flex items-center gap-3">
        <Search className="h-6 w-6 text-brand-600" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Search</h1>
          <p className="text-sm text-slate-500">
            Across your notes, materia medica, reference books and the repertory.
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
          className="w-full rounded-lg border border-slate-200 bg-surface py-3 pl-10 pr-3 text-sm focus:outline-none"
        />
      </div>

      {active && noteHits.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Your notes ({noteHits.length})
          </h2>
          <div className="space-y-2">
            {noteHits.map(({ note, snip }) => (
              <Link key={note.id} to={noteHref(note)} className="card block p-3 pressable">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <StickyNote className="h-4 w-4 shrink-0 text-amber-600" />
                  <span className="min-w-0 truncate">{noteTitle(note)}</span>
                  {note.place && (
                    <span className="shrink-0 text-2xs uppercase tracking-wide text-ink/70">
                      {bookLabel(note.place.book)}
                    </span>
                  )}
                </div>
                {note.place && (
                  <p className="mt-1 truncate text-xs text-ink/70">Pinned · {placeLabel(note.place)}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  <Highlight text={snip} q={q} />
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

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
                  <Link key={r.id} to={`/materia-medica/${r.id}`} className="card p-3 pressable">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <FlaskConical className="h-4 w-4 text-brand-500" />
                      <Highlight text={canonicalName(r.name)} q={q} />
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
              {bookHits.slice(0, 30).map((h, i) => (
                <Link
                  key={`${h.id}-${h.slug}-${i}`}
                  to={`/books/${h.id}/${h.slug}`}
                  className="card block p-3 pressable"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <BookText className="h-4 w-4 text-brand-500" />
                    {canonicalName(h.name)}
                    <span className="text-2xs uppercase tracking-wide text-slate-400">
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
                    <span className="text-2xs uppercase tracking-wide text-slate-400">
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
