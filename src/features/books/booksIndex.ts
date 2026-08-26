import { useQuery } from '@tanstack/react-query';
import type { BookData, BookMeta, BookRemedy } from './types';

function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const nameIndexCache = new WeakMap<BookData, Map<string, BookRemedy>>();

/**
 * Find a remedy in a book from a (possibly longer) repertory name, e.g.
 * "Borax Veneta" → Borax, "Mercurius Solubilis" → Mercurius. Matches the
 * longest exact word-prefix, so it never matches the wrong remedy.
 */
export function findBookRemedy(book: BookData, name: string): BookRemedy | undefined {
  let idx = nameIndexCache.get(book);
  if (!idx) {
    idx = new Map();
    for (const r of book.remedies) idx.set(normName(r.name).replace(/ /g, ''), r);
    nameIndexCache.set(book, idx);
  }
  const words = normName(name).split(' ').filter(Boolean);
  for (let k = words.length; k >= 1; k--) {
    const hit = idx.get(words.slice(0, k).join(''));
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Bundled reference books. The heavy full-text payloads live as static JSON in
 * `public/books/{id}.json` and are fetched on demand; only this light catalogue
 * is bundled into the app.
 */
export const BOOKS: BookMeta[] = [
  {
    id: 'boericke',
    title: 'Pocket Manual of Homœopathic Materia Medica',
    author: 'William Boericke',
    blurb:
      'The classic bedside repertory-materia medica — concise, system-by-system remedy pictures with modalities and relationships.',
    cover: 'from-teal-600 to-emerald-500',
    approxRemedies: 632,
  },
  {
    id: 'tyler',
    title: 'Homœopathic Drug Pictures',
    author: 'Margaret L. Tyler',
    blurb:
      'Vivid, narrative remedy portraits that bring the constitutional picture of each medicine to life for the practitioner.',
    cover: 'from-indigo-600 to-violet-500',
    approxRemedies: 120,
  },
];

export function getBookMeta(id: string | undefined): BookMeta | undefined {
  return BOOKS.find((b) => b.id === id);
}

async function fetchBook(id: string): Promise<BookData> {
  const res = await fetch(`${import.meta.env.BASE_URL}books/${id}.json`);
  if (!res.ok) {
    throw new Error(`Could not load "${id}" (${res.status})`);
  }
  return res.json();
}

/** Load a book's full text payload (cached by TanStack Query). */
export function useBook(id: string | undefined) {
  return useQuery({
    queryKey: ['book', id],
    queryFn: () => fetchBook(id as string),
    enabled: Boolean(id),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
}
