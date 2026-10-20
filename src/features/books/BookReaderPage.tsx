import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, List, Loader2, Search } from 'lucide-react';
import { getBookMeta, useBook } from './booksIndex';
import { DrugPictureView, RemedyHeading } from './DrugPictureView';
import { canonicalName } from '../../lib/remedyName';
import type { BookRemedy } from './types';
import { parseSections } from './sections';
import { commonNameFor } from './commonName';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { CompareButton, CompareTray } from '../compare/CompareControls';

function RemedyText({ remedy, common }: { remedy: BookRemedy; common: string | null }) {
  const sections = useMemo(() => parseSections(remedy.text), [remedy.text]);
  return (
    <article className="prose-sm max-w-none">
      <RemedyHeading remedy={remedy} common={common} />
      <div className="mt-4 space-y-4 font-serif text-subhead leading-relaxed text-slate-700">
        {sections.map(({ heading, items }, i) => (
          <section key={i} aria-label={heading ?? undefined}>
            {heading && (
              <h3 className="mb-2 mt-6 font-sans text-xs font-semibold uppercase tracking-wide text-brand-600">
                {heading}
              </h3>
            )}
            {items.some((it) => it.bullet) ? (
              <ul className="space-y-2">
                {items.map((it, j) => (
                  <li key={j} className="flex gap-3">
                    <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500/60" />
                    <span>
                      {it.label && <strong className="font-semibold text-slate-800">{it.label}: </strong>}
                      {it.text}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-3">
                {items.map((it, j) => (
                  <p key={j}>{it.text}</p>
                ))}
              </div>
            )}
          </section>
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
  // On phone/tablet the remedy index and the reader can't sit side by side, so
  // the list collapses once a remedy is chosen (tap "All remedies" to reopen).
  // Desktop (lg+) always shows both.
  const [listOpen, setListOpen] = useState(!remedySlug);

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
  // Tyler (and Allen, where he gives none) borrow Boericke's common name.
  const boericke = useBook(bookId && bookId !== 'boericke' ? 'boericke' : undefined);
  const common = selected
    ? commonNameFor(bookId ?? '', selected, bookId === 'boericke' ? book : boericke.data)
    : null;

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
      <div className="border-b border-slate-200 bg-surface px-6 py-4">
        <Link to="/books" className="mb-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600">
          <ChevronLeft className="h-3.5 w-3.5" /> Reference Books
        </Link>
        <h1 className="font-serif text-xl font-semibold text-slate-800">{meta.title}</h1>
        <p className="text-xs text-brand-600">{meta.author}</p>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Remedy index — full-width on mobile, collapses once a remedy is picked */}
        <div
          className={`${
            listOpen ? 'flex' : 'hidden'
          } w-full shrink-0 flex-col border-r border-slate-200 bg-slate-50 lg:flex lg:w-64`}
        >
          <div className="relative p-3">
            <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search remedies…"
              className="w-full rounded-lg border border-slate-200 bg-surface py-2 pl-9 pr-3 text-sm focus:outline-none"
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
                  onClick={() => setListOpen(false)}
                  className={`block truncate rounded-md px-3 py-2 text-sm ${
                    active
                      ? 'bg-brand-100 font-medium text-brand-800'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {canonicalName(r.name)}
                </Link>
              );
            })}
            {!isLoading && filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-slate-400">No matches.</p>
            )}
          </div>
          {book && (
            <div className="border-t border-slate-200 px-3 py-2 text-2xs text-slate-400">
              {book.remedyCount} remedies
            </div>
          )}
        </div>

        {/* Reader — hidden on mobile while the list is open */}
        <div
          className={`${
            listOpen ? 'hidden' : 'block'
          } min-h-0 flex-1 overflow-auto bg-surface px-6 pb-28 pt-6 md:px-10 lg:block`}
        >
          {isError && (
            <p className="text-sm text-red-600">
              {(error as Error)?.message ?? 'Failed to load this book.'}
            </p>
          )}
          {selected ? (
            <div className="mx-auto max-w-2xl">
              <div className="mb-4 flex flex-wrap items-center gap-3">
              <button onClick={() => setListOpen(true)} className="btn-secondary lg:hidden">
                <List className="h-4 w-4" /> All remedies
              </button>
              <SegmentedControl
                ariaLabel="Reading view"
                value={view}
                onChange={setView}
                options={[
                  { value: 'portrait', label: 'Drug picture' },
                  { value: 'full', label: 'Full text' },
                ]}
              />
              {/* Compare — on top of every remedy, in every book */}
              <div className="ml-auto">
                <CompareButton book={bookId!} slug={selected.slug} name={selected.name} />
              </div>
              </div>
              {view === 'portrait' ? (
                <DrugPictureView remedy={selected} common={common} />
              ) : (
                <RemedyText remedy={selected} common={common} />
              )}
            </div>
          ) : (
            !isLoading && (
              <p className="text-sm text-slate-400">Select a remedy to begin reading.</p>
            )
          )}
        </div>
      </div>
      <CompareTray />
    </div>
  );
}
