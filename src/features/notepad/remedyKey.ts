import ABBREV from '../../data/remedyAbbrev.json';
import type { Remedy } from '../../data/remedies';
import { canonicalName } from '../../lib/remedyName';
import { findBookRemedy } from '../books/booksIndex';
import type { BookData, BookRemedy } from '../books/types';

// ---------------------------------------------------------------------------
// One identity per remedy across the app, so a note written in Allen's
// "Pulsatilla Nigricans" also shows on Boericke's "Pulsatilla", the curated
// profile and the repertory's "Pulsatilla Pratensis".
//
// The key is the repertory (Kent / OOREP) remedy name. Book chapters that
// match no repertory remedy (e.g. Allen's bowel nosodes) get a book-scoped
// key, "book:<book>:<slug>".
// ---------------------------------------------------------------------------

const TABLE = ABBREV as unknown as Record<string, [string] | [string, string[]]>;
const REP_NAMES = Object.keys(TABLE);

const reverseCache = new WeakMap<BookData, Map<string, string>>();

/** Lower is better: principal remedy of a genus (abbr without "-"), then fewer words. */
function rank(repName: string): number {
  const abbr = TABLE[repName]?.[0] ?? '';
  return (abbr.includes('-') ? 100 : 0) + repName.split(/\s+/).length;
}

function reverseIndex(book: BookData): Map<string, string> {
  let idx = reverseCache.get(book);
  if (idx) return idx;
  idx = new Map();
  for (const rep of REP_NAMES) {
    const hit = findBookRemedy(book, rep);
    if (!hit) continue;
    const cur = idx.get(hit.slug);
    // exact name match wins; otherwise the principal / shortest candidate
    const exact = canonicalName(rep).toLowerCase() === canonicalName(hit.name).toLowerCase();
    if (!cur || exact || (canonicalName(cur).toLowerCase() !== canonicalName(hit.name).toLowerCase() && rank(rep) < rank(cur))) {
      idx.set(hit.slug, rep);
    }
  }
  reverseCache.set(book, idx);
  return idx;
}

/** Remedy key for a book chapter. */
export function remedyKeyForBookRemedy(book: BookData, remedy: BookRemedy): string {
  return reverseIndex(book).get(remedy.slug) ?? `book:${book.id}:${remedy.slug}`;
}

/** Remedy key for a curated Materia Medica remedy (matched by abbreviation). */
export function remedyKeyForCurated(r: Remedy): string {
  const byAbbr = REP_NAMES.find((n) => TABLE[n][0] === r.abbr);
  return byAbbr ?? r.name;
}

/** True when the key is a repertory remedy (so /remedy/:name exists for it). */
export const isRepertoryKey = (key: string) => key in TABLE;

/** Display name for a key (book-scoped keys need the note's remedyName). */
export function remedyKeyLabel(key: string, fallback?: string): string {
  if (key.startsWith('book:')) return fallback ? canonicalName(fallback) : key.split(':').pop() ?? key;
  return canonicalName(key);
}
