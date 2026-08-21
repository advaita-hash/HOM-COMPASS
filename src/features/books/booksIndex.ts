import { useQuery } from '@tanstack/react-query';
import type { BookData, BookMeta } from './types';

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
