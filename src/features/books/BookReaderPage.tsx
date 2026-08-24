import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Loader2, Search } from 'lucide-react';
import { getBookMeta, useBook } from './booksIndex';
import { DrugPictureView } from './DrugPictureView';
import type { BookRemedy } from './types';

function RemedyText({ remedy }: { remedy: BookRemedy }) {
  const paragraphs = useMemo(
    () => remedy.text.split(/\n{2,}/).filter((p) => p.trim().length > 0),
    [remedy.text],
  );
  return (
    <article className="prose-sm max-w-none">
      <h2 className="font-serif text-2xl font-bold text-slate-800">{remedy.name}</h2>
      {remedy.commonName && (
        <p className="mt-0.5 text-sm italic text-slate-500">{remedy.commonName}</p>
      )}
      <div className="mt-4 space-y-3 font-serif text-[15px] leading-relaxed text-slate-700">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  );
}

export default function BookReaderPage() {
  const { bookId, remedySlug } = useParams();
  const [searchParams] = useSearchParams();
  const meta = getBookMeta(bookId);
  const { data: book, isLoading, isError, error } = useBook(bookId);
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [view, setView] = useState<'portrait' | 'full'>('portrait');

  const q = query.trim().toLowerCase();
  const remedies = book?.remedies ?? [];
  const filtered = useMemo(() => {
    if (!q) return remedies;
    return remedies.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.commonName ?? '').toLowerCase().includes(q),
    );
  }, [remedies, q]);

  const selected =
    remedies.find((r) => r.slug === remedySlug) ?? filtered[0] ?? remedies[0];

  if (!meta) {
    return (
      <div className="p-8">
        <Link to="/books" className="btn-ghost mb-4">
          <ChevronLeft className="h-4 w-4" /> Reference Books
        </Link>
        <p className="text-sm text-slate-500">Unknown book “{bookId}”.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <Link to="/books" className="mb-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600">
          <ChevronLeft className="h-3.5 w-3.5" /> Reference Books
        </Link>
        <h1 className="font-serif text-xl font-semibold text-slate-800">{meta.title}</h1>
        <p className="text-xs text-brand-600">{meta.author}</p>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Remedy index */}
        <div className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="relative p-3">
            <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search remedies…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
            {isLoading && (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            {filtered.map((r) => {
              const active = selected?.slug === r.slug;
              return (
                <Link
                  key={r.slug}
                  to={`/books/${bookId}/${r.slug}`}
                  className={`block truncate rounded-md px-3 py-1.5 text-sm ${
                    active
                      ? 'bg-brand-100 font-medium text-brand-800'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {r.name}
                </Link>
              );
            })}
            {!isLoading && filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-slate-400">No matches.</p>
            )}
          </div>
          {book && (
            <div className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-400">
              {book.remedyCount} remedies
            </div>
          )}
        </div>

        {/* Reader */}
        <div className="min-h-0 flex-1 overflow-auto bg-white px-6 py-6 md:px-10">
          {isError && (
            <p className="text-sm text-red-600">
              {(error as Error)?.message ?? 'Failed to load this book.'}
            </p>
          )}
          {selected ? (
            <div className="mx-auto max-w-2xl">
              <div className="mb-4 inline-flex rounded-lg border border-slate-200 p-0.5 text-sm">
                {(['portrait', 'full'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`rounded-md px-3 py-1 font-medium transition-colors ${
                      view === v ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {v === 'portrait' ? 'Drug picture' : 'Full text'}
                  </button>
                ))}
              </div>
              {view === 'portrait' ? (
                <DrugPictureView remedy={selected} />
              ) : (
                <RemedyText remedy={selected} />
              )}
            </div>
          ) : (
            !isLoading && (
              <p className="text-sm text-slate-400">Select a remedy to begin reading.</p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
