import { useMemo } from 'react';
import { useBook } from '../books/booksIndex';
import type { BookData, BookRemedy } from '../books/types';

// ---------------------------------------------------------------------------
// Remedy of the Day, drawn from every remedy in Boericke's Materia Medica.
//
// Days are counted by the viewer's LOCAL calendar date, so the remedy changes
// at local midnight and everyone sees the same remedy on the same date. The
// remedies are dealt out like a shuffled deck: each cycle visits all of them
// once, in an order seeded by the cycle number, so nothing repeats until every
// remedy has had its day.
// ---------------------------------------------------------------------------

export const DAILY_BOOK = 'boericke';

const DAY_MS = 86_400_000;
/** Day 0 of the rotation: 1 January 2026. */
const EPOCH_DAY = Date.UTC(2026, 0, 1) / DAY_MS;

/** Whole days since 1970-01-01 for the local calendar date of `d`. */
export function localDayNumber(d: Date): number {
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

/** Local midnight of a day number. */
export function dateOfDay(day: number): Date {
  const u = new Date(day * DAY_MS);
  return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate());
}

/** "2026-10-28" for a day number. */
export function isoOfDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** Day number of a "YYYY-MM-DD" string, or null if it isn't a real date. */
export function dayOfIso(iso: string | null | undefined): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  return isoOfDay(t / DAY_MS) === iso ? t / DAY_MS : null;
}

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const orderCache = new Map<string, number[]>();

/** A shuffled order of 0..n-1 for one cycle (Fisher–Yates). */
function cycleOrder(n: number, cycle: number): number[] {
  const key = `${n}:${cycle}`;
  const hit = orderCache.get(key);
  if (hit) return hit;
  const order = Array.from({ length: n }, (_, i) => i);
  const rand = rng(0x9e3779b9 ^ Math.imul(cycle + 1, 0x85ebca6b));
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  orderCache.set(key, order);
  return order;
}

export interface DailyPick {
  remedy: BookRemedy;
  /** 1-based position of this day within the current cycle. */
  dayInCycle: number;
  /** Number of remedies in a full cycle. */
  cycleLength: number;
}

/** The book remedy for a day number. Remedies are ordered by slug so the deck is stable. */
export function pickDaily(book: BookData, day: number): DailyPick {
  const remedies = [...book.remedies].sort((a, b) => a.slug.localeCompare(b.slug));
  const n = remedies.length;
  const offset = day - EPOCH_DAY;
  const cycle = Math.floor(offset / n);
  const pos = offset - cycle * n; // 0..n-1, also for days before the epoch
  return { remedy: remedies[cycleOrder(n, cycle)[pos]], dayInCycle: pos + 1, cycleLength: n };
}

/** Today's (or a given day's) remedy, once Boericke has loaded. */
export function useDailyRemedy(day: number) {
  const { data: book, isLoading, isError } = useBook(DAILY_BOOK);
  const pick = useMemo(() => (book ? pickDaily(book, day) : null), [book, day]);
  return { book, pick, isLoading, isError };
}

/**
 * Boericke's opening paragraph as a short lede: without the common name and
 * "(LATIN NAME)" it begins with, cut at a sentence end near `max` characters.
 */
export function openingLede(remedy: BookRemedy, max = 220): string {
  let s = (remedy.text.split(/\n{2,}/)[0] ?? '').trim();
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z]/g, '');
  if (remedy.commonName) {
    const words = s.split(/\s+/);
    // drop the leading words that spell out the common name
    for (let k = Math.min(6, words.length); k > 0; k--) {
      if (norm(words.slice(0, k).join(' ')) === norm(remedy.commonName)) {
        s = words.slice(k).join(' ');
        break;
      }
    }
  }
  s = s.replace(/^\([^)]*\)\s*/, '').trim();
  // stop before the first section label that shares the paragraph ("Relationship. —")
  const label = /\s[A-Z][A-Za-z ,&'’-]{1,40}\.\s+[—–]\s/.exec(s);
  if (label) s = s.slice(0, label.index).replace(/[,;:]\s*$/, '').trim();
  if (s && !/[.!?…]$/.test(s)) s += '.';
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '));
  return end > max * 0.5 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}
