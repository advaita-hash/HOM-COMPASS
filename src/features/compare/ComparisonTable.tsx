import { type CSSProperties, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpenText,
  Brain,
  Leaf,
  Loader2,
  type LucideIcon,
  UserRound,
  X,
} from 'lucide-react';
import { BOOKS, bookQueryOptions } from '../books/booksIndex';
import { type DrugPicture, distill } from '../books/drugPicture';
import { canonicalName } from '../../lib/remedyName';
import { commonNameFor } from '../books/commonName';
import { type CompareItem, useCompare } from './compareStore';

const SECTIONS: { key: keyof DrugPicture; title: string; icon: LucideIcon; tint: string }[] = [
  { key: 'constitution', title: 'Constitution', icon: UserRound, tint: 'text-brand-600' },
  { key: 'mind', title: 'Mind', icon: Brain, tint: 'text-grade-3' },
  { key: 'generals', title: 'Generals', icon: Leaf, tint: 'text-brand-500' },
  { key: 'worse', title: 'Worse (aggravation)', icon: ArrowDownRight, tint: 'text-grade-4' },
  { key: 'better', title: 'Better (amelioration)', icon: ArrowUpRight, tint: 'text-grade-2' },
];
const PREVIEW = 4; // lines per cell before "Show all"

/**
 * Side-by-side comparison: remedies as columns, drug-picture sections as rows.
 * Desktop: sticky remedy headers under a blurred material. Phone: the table
 * scrolls horizontally and snaps column by column.
 */
export function ComparisonTable({ items }: { items: CompareItem[] }) {
  const remove = useCompare((s) => s.remove);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const books = useQueries({ queries: BOOKS.map((b) => bookQueryOptions(b.id)) });
  const loading = books.some((b) => b.isLoading);

  const columns = useMemo(
    () =>
      items.map((it) => {
        const idx = BOOKS.findIndex((b) => b.id === it.book);
        const data = idx >= 0 ? books[idx].data : undefined;
        const remedy = data?.remedies.find((r) => r.slug === it.slug);
        const boericke = books[BOOKS.findIndex((b) => b.id === 'boericke')]?.data;
        return {
          item: it,
          book: BOOKS[idx],
          remedy,
          common: remedy ? commonNameFor(it.book, remedy, boericke) : null,
          picture: remedy ? distill(remedy.text) : null,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, books.map((b) => b.dataUpdatedAt).join()],
  );

  if (loading) {
    return (
      <div className="card flex items-center gap-2 p-6 text-sm text-ink/60">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the books…
      </div>
    );
  }

  const n = columns.length;
  // Two columns fit a phone side by side. Three or four get fixed 240px
  // columns that scroll (and snap) sideways below lg; on desktop they share
  // the width. Fixed widths keep text wrapping — `1fr` inside a max-content
  // container would grow each column to its longest unwrapped sentence.
  const scrolls = n > 2;
  const gridVars = {
    '--cols-sm': scrolls ? `repeat(${n}, 240px)` : `repeat(${n}, minmax(0, 1fr))`,
    '--cols-lg': `repeat(${n}, minmax(0, 1fr))`,
  } as CSSProperties;
  const gridCls = 'grid [grid-template-columns:var(--cols-sm)] lg:[grid-template-columns:var(--cols-lg)]';

  return (
    <div className="card overflow-x-auto lg:overflow-visible">
      {scrolls && (
        <p className="px-4 pt-3 text-xs text-ink/60 lg:hidden">Swipe sideways to see all {n} remedies.</p>
      )}
      <div
        className={scrolls ? 'w-max lg:w-auto' : ''}
        style={{ ...gridVars, scrollSnapType: scrolls ? 'x mandatory' : undefined }}
      >
        {/* remedy headers */}
        <div className={`material rounded-t-2xl border-b border-ink/10 lg:sticky lg:top-0 lg:z-10 ${gridCls}`}>
          {columns.map(({ item, book, remedy, common }, i) => (
            <div
              key={`${item.book}:${item.slug}`}
              className={`flex flex-col gap-1 px-4 pb-2 pt-4 ${i ? 'border-l border-ink/10' : ''}`}
              style={{ scrollSnapAlign: 'start' }}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-2xs font-semibold uppercase tracking-wide text-ink/60">
                    {book?.author.split(' ').slice(-1)[0] ?? item.book}
                  </div>
                  <h3 className="font-serif text-lg font-semibold leading-tight text-ink/90">
                    {canonicalName(item.name)}
                  </h3>
                  {common && <p className="truncate text-xs italic text-ink/60">{common}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => remove(item.book, item.slug)}
                  aria-label={`Remove ${canonicalName(item.name)} from comparison`}
                  className="tap flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-ink/60 transition-colors hover:bg-ink/10 hover:text-ink/90"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              </div>
              {remedy && (
                <Link
                  to={`/books/${item.book}/${item.slug}`}
                  className="inline-flex min-h-[44px] items-center gap-2 self-start text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  <BookOpenText className="h-4 w-4" /> Read full text
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* sections */}
        {SECTIONS.map(({ key, title, icon: Icon, tint }) => {
          const isOpen = expanded.has(key);
          const longest = Math.max(0, ...columns.map((c) => c.picture?.[key].length ?? 0));
          return (
            <section key={key} aria-label={title} className="border-b border-ink/10 last:border-0">
              <div className="flex items-center gap-2 px-4 pb-2 pt-6">
                <Icon className={`h-4 w-4 ${tint}`} />
                <h4 className="flex-1 text-xs font-semibold uppercase tracking-wide text-ink/60">{title}</h4>
                {longest > PREVIEW && (
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setExpanded((s) => {
                        const next = new Set(s);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      })
                    }
                    className="tap text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    {isOpen ? 'Show less' : `Show all (${longest})`}
                  </button>
                )}
              </div>
              <div className={`pb-4 ${gridCls}`}>
                {columns.map(({ item, picture }, i) => {
                  const lines = picture?.[key] ?? [];
                  const shown = isOpen ? lines : lines.slice(0, PREVIEW);
                  return (
                    <div
                      key={`${item.book}:${item.slug}`}
                      className={`px-4 ${i ? 'border-l border-ink/10' : ''}`}
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      {!picture ? (
                        <p className="text-sm text-ink/45">Not found in this book.</p>
                      ) : lines.length === 0 ? (
                        <p className="text-sm text-ink/30">
                          —<span className="sr-only">No entries</span>
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {shown.map((line, j) => (
                            <li key={j} className="flex gap-2 text-sm text-ink/80">
                              <span
                                aria-hidden
                                className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current ${tint}`}
                              />
                              <span>{line}</span>
                            </li>
                          ))}
                          {!isOpen && lines.length > PREVIEW && (
                            <li className="pl-4 text-xs text-ink/45">+{lines.length - PREVIEW} more</li>
                          )}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
