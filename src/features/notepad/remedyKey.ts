import type { Remedy } from '../../data/remedies';
import { canonicalName } from '../../lib/remedyName';
import { REMEDY_TABLE, resolveRemedyMatch } from '../../lib/remedyResolve';
import { bookNameKey, findBookRemedy } from '../books/booksIndex';
import type { BookData, BookRemedy } from '../books/types';

// ---------------------------------------------------------------------------
// One identity per remedy across the app, so a note written in Allen's
// "Pulsatilla Nigricans" also shows on Boericke's "Pulsatilla", the curated
// profile and the repertory's "Pulsatilla Pratensis".
//
// The key is the repertory (Kent / OOREP) remedy name. Book chapters that
// match no repertory remedy (e.g. Allen's bowel nosodes) get a book-scoped
// key, "book:<book>:<slug>".
//
// Changing how a chapter is keyed orphans notes saved under its old key:
// bump NOTEPAD_VERSION in notepadStore.ts and re-key them in migrateNotepad
// so saved notes follow.
// ---------------------------------------------------------------------------

const TABLE = REMEDY_TABLE;
const REP_NAMES = Object.keys(TABLE);

/** How a repertory name reached a chapter: its own name, an alternative name, or only a prefix. */
const Fit = { Name: 0, AltName: 1, Prefix: 2 } as const;
type Fit = (typeof Fit)[keyof typeof Fit];

interface Candidate {
  rep: string;
  fit: Fit;
}

const reverseCache = new WeakMap<BookData, Map<string, Candidate>>();

/** Lower is better: principal remedy of a genus (abbr without "-"), then fewer words. */
function rank(repName: string): number {
  const abbr = TABLE[repName]?.[0] ?? '';
  return (abbr.includes('-') ? 100 : 0) + repName.split(/\s+/).length;
}

const sameName = (a: string, b: string) =>
  canonicalName(a).toLowerCase() === canonicalName(b).toLowerCase() || bookNameKey(a) === bookNameKey(b);

/** Chapter slug → the repertory remedy that best fits it. */
function reverseIndex(book: BookData): Map<string, Candidate> {
  let idx = reverseCache.get(book);
  if (idx) return idx;
  const found = new Map<string, Candidate>();
  const offer = (slug: string, c: Candidate) => {
    const cur = found.get(slug);
    // a closer fit wins; among equal fits the principal / shortest, then the first
    if (!cur || c.fit < cur.fit || (c.fit === cur.fit && rank(c.rep) < rank(cur.rep))) found.set(slug, c);
  };
  for (const rep of REP_NAMES) {
    const hit = findBookRemedy(book, rep);
    if (hit) offer(hit.slug, { rep, fit: sameName(rep, hit.name) ? Fit.Name : Fit.Prefix });
    // alternative names ("Silica" for Silicea Terra, "Condurango" for Cundurango)
    for (const alt of TABLE[rep][1] ?? []) {
      const altHit = findBookRemedy(book, alt);
      if (altHit && sameName(alt, altHit.name)) offer(altHit.slug, { rep, fit: Fit.AltName });
    }
  }
  idx = found;
  reverseCache.set(book, idx);
  return idx;
}

/**
 * Remedy key for a book chapter: the repertory remedy of that name (or
 * alternative name); else what the remedy profile would open for the chapter's
 * name ("Mercurius" → Mercurius Solubilis, "Solidago Virga" → Solidago
 * Virgaurea); else the closest prefix match; else a book-scoped key.
 *
 * A word-prefix guess never takes a remedy another chapter of the same book
 * has by name: Allen's "Lac Vaccinum" (whole milk) is not his "Lac
 * Defloratum" (skimmed milk, the repertory's Lac Vaccinum Defloratum).
 */
export function remedyKeyForBookRemedy(book: BookData, remedy: BookRemedy): string {
  const idx = reverseIndex(book);
  const fit = idx.get(remedy.slug);
  if (fit && fit.fit !== Fit.Prefix) return fit.rep;
  const resolved = resolveRemedyMatch(remedy.name);
  if (resolved) {
    const named = (slug: string, c: Candidate) => slug !== remedy.slug && c.rep === resolved.name && c.fit !== Fit.Prefix;
    if (resolved.how !== 'prefix' || ![...idx].some(([slug, c]) => named(slug, c))) return resolved.name;
  }
  return fit?.rep ?? `book:${book.id}:${remedy.slug}`;
}

/**
 * The book's chapter on this very remedy, if it has one. findBookRemedy also
 * takes a shorter name ("Hydrastis Canadensis" → "Hydrastis"), which for a
 * salt or a sister species lands on another medicine: Mercurius Corrosivus →
 * Tyler's Mercurius, Tarentula Cubensis → Allen's Tarentula. Such a chapter
 * counts only when it is keyed to the same remedy.
 */
export function findChapterFor(book: BookData, name: string): BookRemedy | undefined {
  const hit = findBookRemedy(book, name);
  if (!hit || bookNameKey(hit.name) === bookNameKey(name)) return hit;
  const want = resolveRemedyMatch(name);
  const chapter = remedyKeyForBookRemedy(book, hit);
  if (want && want.how !== 'prefix') return chapter === want.name ? hit : undefined;
  // a name the repertory doesn't know (Arsenicum Bromatum) is not the
  // repertory remedy the chapter stands for (Arsenicum Album)
  return isRepertoryKey(chapter) && !sameName(chapter, name) ? undefined : hit;
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
