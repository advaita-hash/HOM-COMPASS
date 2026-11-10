import { useMemo } from 'react';
import { REMEDIES } from '../../data/remedies';
import { BOOKS } from '../books/booksIndex';
import type { BookData } from '../books/types';
import { linesOf, matchesAll, termsOf } from './textSearch';

export interface TextHit {
  text: string;
  to: string;
}

export interface TextGroup {
  key: string;
  name: string;
  /** Source label: 'Curated' or a book's label. */
  source: string;
  to: string;
  hits: TextHit[];
}

/** The study cards' own lines (essence, keynotes, mind, generals, modalities). */
const CURATED_LINES = REMEDIES.map((r) => ({
  r,
  lines: [
    r.essence,
    ...r.keynotes,
    ...r.mind,
    ...r.generals,
    ...r.worse.map((w) => `Worse: ${w}`),
    ...r.better.map((b) => `Better: ${b}`),
  ],
}));

/**
 * Every line in the study cards and the books that contains all the query's
 * words (or "phrases"), grouped by remedy, with counts per source.
 */
export function useTextSearch(bookData: (BookData | undefined)[], query: string, enabled: boolean) {
  // split each book into lines once, the first time text search is used
  const index = useMemo(
    () =>
      enabled
        ? BOOKS.map((meta, i) => ({ meta, chapters: (bookData[i]?.remedies ?? []).map((r) => ({ r, lines: linesOf(r) })) }))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, ...bookData],
  );
  const terms = useMemo(() => termsOf(query), [query]);
  const active = enabled && terms.some((t) => t.length >= 2);

  const result = useMemo(() => {
    const groups: TextGroup[] = [];
    const counts: Record<string, number> = { All: 0, Curated: 0 };
    for (const b of BOOKS) counts[b.label] = 0;
    if (!active) return { groups, counts };
    for (const { r, lines } of CURATED_LINES) {
      const hits = lines.filter((l) => matchesAll(l, terms)).map((text) => ({ text, to: `/materia-medica/${r.id}` }));
      if (hits.length) groups.push({ key: `c-${r.id}`, name: r.name, source: 'Curated', to: `/materia-medica/${r.id}`, hits });
      counts.Curated += hits.length;
    }
    for (const { meta, chapters } of index) {
      for (const { r, lines } of chapters) {
        const base = `/books/${meta.id}/${r.slug}`;
        const hits = lines
          .filter((l) => matchesAll(l.text, terms))
          .map((l) => ({ text: l.text, to: `${base}?view=full&find=${l.block}:${l.start}-${l.end}` }));
        if (hits.length) groups.push({ key: `${meta.id}-${r.slug}`, name: r.name, source: meta.label, to: `${base}?view=full`, hits });
        counts[meta.label] += hits.length;
      }
    }
    counts.All = Object.values(counts).reduce((a, b) => a + b, 0);
    return { groups, counts };
  }, [active, terms, index]);

  return { ...result, terms, active };
}
