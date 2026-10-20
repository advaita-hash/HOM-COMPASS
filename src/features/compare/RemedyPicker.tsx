import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Check, Loader2, Search, SearchX, X } from 'lucide-react';
import { BOOKS, bookQueryOptions, useBook } from '../books/booksIndex';
import type { BookMeta } from '../books/types';
import { canonicalName } from '../../lib/remedyName';
import { commonNameFor } from '../books/commonName';
import { Disclosure } from '../../components/ui/Disclosure';
import { COMPARE_MAX, useCompare, type CompareItem } from './compareStore';

const keyOf = (book: string, slug: string) => `${book}:${slug}`;
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, '');

/**
 * One selectable remedy row. iOS multi-select pattern: a leading selection
 * circle (filled accent + check when chosen), 44px tall, with an *inset*
 * hairline that starts after the circle, as in grouped iOS lists.
 */
function RemedyRow({
  name,
  sub,
  selected,
  disabled,
  last,
  onToggle,
}: {
  name: string;
  sub?: string | null;
  selected: boolean;
  disabled: boolean;
  last: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-disabled={disabled}
      onClick={() => !disabled && onToggle()}
      className={`flex w-full items-center gap-3 pl-4 text-left transition-colors ${
        disabled ? 'cursor-not-allowed opacity-40' : 'active:bg-ink/[0.06]'
      }`}
    >
      <span
        aria-hidden
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full transition-[background-color,border-color,transform] duration-300 ease-spring ${
          selected ? 'scale-100 bg-accent text-on-accent' : 'border-2 border-ink/20'
        }`}
      >
        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span
        className={`flex min-h-[44px] min-w-0 flex-1 flex-col justify-center py-2 pr-4 ${
          last ? '' : 'border-b border-ink/10'
        }`}
      >
        <span className="truncate text-subhead leading-5 text-ink/90">{name}</span>
        {sub && <span className="truncate text-xs text-ink/60">{sub}</span>}
      </span>
    </button>
  );
}

/** A book's remedies, grouped A–Z into collapsible letter sections. */
function BookGroup({
  meta,
  query,
  open,
  onToggle,
}: {
  meta: BookMeta;
  query: string;
  open: boolean;
  onToggle: () => void;
}) {
  const { data, isLoading, isError } = useBook(meta.id);
  const { data: boericke } = useBook('boericke');
  const items = useCompare((s) => s.items);
  const toggle = useCompare((s) => s.toggle);
  const [openLetters, setOpenLetters] = useState<Set<string>>(new Set());
  const searching = query.length > 0;

  const letters = useMemo(() => {
    const groups = new Map<string, { slug: string; name: string; sub: string | null }[]>();
    const q = norm(query);
    for (const r of data?.remedies ?? []) {
      const name = canonicalName(r.name);
      if (q && !norm(`${name} ${r.name} ${r.commonName ?? ''}`).includes(q)) continue;
      const L = /[a-z]/i.test(name[0]) ? name[0].toUpperCase() : '#';
      if (!groups.has(L)) groups.set(L, []);
      groups.get(L)!.push({ slug: r.slug, name, sub: commonNameFor(meta.id, r, boericke) });
    }
    for (const list of groups.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data, query, boericke]);

  const total = letters.reduce((n, [, l]) => n + l.length, 0);
  if (searching && data && total === 0) return null; // hide books with no matches
  const selectedKeys = new Set(items.map((i) => keyOf(i.book, i.slug)));
  const full = items.length >= COMPARE_MAX;
  const author = meta.label;

  return (
    <Disclosure
      open={open || searching}
      onToggle={onToggle}
      headerClassName="px-4 py-2"
      header={
        <>
          <span
            aria-hidden
            className={`h-8 w-8 shrink-0 rounded-md bg-gradient-to-br ${meta.cover} shadow-card`}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-subhead font-semibold leading-5 text-ink/90">{author}</span>
            <span className="block truncate text-xs text-ink/60">{meta.title}</span>
          </span>
          <span className="shrink-0 rounded-full bg-ink/[0.06] px-2 text-xs tabular-nums leading-5 text-ink/60">
            {isLoading ? '…' : total}
          </span>
        </>
      }
    >
      {isLoading ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-ink/60">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading {author}…
        </div>
      ) : isError ? (
        <p className="px-4 py-3 text-sm text-red-600">Couldn’t load this book.</p>
      ) : (
        <div className="pb-2">
          {letters.map(([L, list]) => {
            const letterOpen = searching || openLetters.has(L);
            return (
              <Disclosure
                key={L}
                open={letterOpen}
                onToggle={() =>
                  setOpenLetters((s) => {
                    const n = new Set(s);
                    if (n.has(L)) n.delete(L);
                    else n.add(L);
                    return n;
                  })
                }
                headerClassName="pl-8 pr-4"
                header={
                  <>
                    <span className="w-6 text-subhead font-semibold text-ink/90">{L}</span>
                    <span className="text-xs tabular-nums text-ink/45">{list.length}</span>
                  </>
                }
              >
                <div className="ml-8">
                  {list.map((r, i) => {
                    const selected = selectedKeys.has(keyOf(meta.id, r.slug));
                    return (
                      <RemedyRow
                        key={r.slug}
                        name={r.name}
                        sub={r.sub}
                        selected={selected}
                        disabled={full && !selected}
                        last={i === list.length - 1}
                        onToggle={() => toggle({ book: meta.id, slug: r.slug, name: r.name })}
                      />
                    );
                  })}
                </div>
              </Disclosure>
            );
          })}
        </div>
      )}
    </Disclosure>
  );
}

/**
 * Collapsible, searchable chooser for the remedies to compare: a pinned
 * "Selected" section, then each book as a disclosure group with A–Z letter
 * sections inside.
 */
export function RemedyPicker({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const items = useCompare((s) => s.items);
  const toggle = useCompare((s) => s.toggle);
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const [openBooks, setOpenBooks] = useState<Set<string>>(() => new Set(BOOKS.map((b) => b.id)));
  const q = query.trim();
  const full = items.length >= COMPARE_MAX;
  const books = useQueries({ queries: BOOKS.map((b) => bookQueryOptions(b.id)) });
  const matches = useMemo(() => {
    if (!q) return 0;
    const nq = norm(q);
    return books.reduce(
      (n, b) =>
        n +
        (b.data?.remedies ?? []).filter((r) =>
          norm(`${canonicalName(r.name)} ${r.name} ${r.commonName ?? ''}`).includes(nq),
        ).length,
      0,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, books.map((b) => b.dataUpdatedAt).join()]);

  return (
    <div className="card overflow-hidden">
      <Disclosure
        open={open}
        onToggle={() => setOpen((o) => !o)}
        headerClassName="px-4 py-3"
        header={
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold text-ink/90">Choose remedies</span>
            <span className="block text-xs text-ink/60">
              {items.length} of {COMPARE_MAX} selected
            </span>
          </span>
        }
      >
        <div className="border-t border-ink/10 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto">
          {/* search — pinned above the scrolling list */}
          <div className="material sticky top-0 z-10 border-b border-ink/10 p-3">
            <label className="relative block">
              <span className="sr-only">Search remedies</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search remedies"
                className="w-full rounded-lg border bg-ink/[0.04] py-2 pl-9 pr-10 text-subhead"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="tap absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-ink/30 text-surface transition-opacity active:opacity-60"
                >
                  <X className="h-3 w-3" strokeWidth={3} />
                </button>
              )}
            </label>
          </div>

          <p role="status" className={full ? 'px-4 pt-3 text-xs text-ink/60' : 'sr-only'}>
            {full ? `Compare holds ${COMPARE_MAX} remedies. Deselect one to choose another.` : ''}
          </p>

          {items.length > 0 && !q && (
            <section aria-label="Selected remedies" className="pt-3">
              <h3 className="px-4 pb-1 text-2xs font-semibold uppercase tracking-wide text-ink/60">Selected</h3>
              {items.map((i: CompareItem, idx) => {
                const meta = BOOKS.find((b) => b.id === i.book);
                return (
                  <RemedyRow
                    key={keyOf(i.book, i.slug)}
                    name={canonicalName(i.name)}
                    sub={meta ? meta.author : i.book}
                    selected
                    disabled={false}
                    last={idx === items.length - 1}
                    onToggle={() => toggle(i)}
                  />
                );
              })}
            </section>
          )}

          <div className="pt-3">
            {items.length > 0 && !q && (
              <h3 className="px-4 pb-1 text-2xs font-semibold uppercase tracking-wide text-ink/60">All books</h3>
            )}
            {BOOKS.map((meta) => (
              <BookGroup
                key={meta.id}
                meta={meta}
                query={q}
                open={openBooks.has(meta.id)}
                onToggle={() =>
                  setOpenBooks((s) => {
                    const n = new Set(s);
                    if (n.has(meta.id)) n.delete(meta.id);
                    else n.add(meta.id);
                    return n;
                  })
                }
              />
            ))}
            <SearchEmpty query={q} count={matches} onClear={() => setQuery('')} />
          </div>
        </div>
      </Disclosure>
    </div>
  );
}

/** Search summary under the groups (the groups themselves hide when empty). */
function SearchEmpty({ query, count, onClear }: { query: string; count: number; onClear: () => void }) {
  if (!query) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-ink/60" role="status">
      <span className="inline-flex items-center gap-2">
        {count === 0 ? (
          <>
            <SearchX className="h-4 w-4" /> No remedies match “{query}”
          </>
        ) : (
          <>
            {count} {count === 1 ? 'match' : 'matches'} for “{query}”
          </>
        )}
      </span>
      <button type="button" onClick={onClear} className="tap inline-flex items-center gap-1 text-brand-600">
        <X className="h-3.5 w-3.5" /> Clear
      </button>
    </div>
  );
}
