import { useEffect, useMemo, useState } from 'react';
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

/**
 * Today's local day number, kept current: it moves on at local midnight (a
 * timer) and is re-checked whenever the tab becomes visible or focused again,
 * since background tabs and sleeping devices throttle or skip timers.
 */
export function useLocalDay(): number {
  const [day, setDay] = useState(() => localDayNumber(new Date()));
  useEffect(() => {
    let timer: number | undefined;
    const sync = () => {
      const now = new Date();
      setDay(localDayNumber(now)); // same number → React skips the render
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      window.clearTimeout(timer);
      timer = window.setTimeout(sync, midnight.getTime() - now.getTime() + 1000);
    };
    const onWake = () => {
      if (document.visibilityState === 'visible') sync();
    };
    sync();
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, []);
  return day;
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

const deckCache = new WeakMap<BookData, BookRemedy[]>();

/**
 * The book's remedies ordered by slug, compared by code point rather than
 * localeCompare so the order (and so every day's remedy) is the same in every
 * browser locale. Slugs are ASCII, so this matches the English collation.
 */
function deckOf(book: BookData): BookRemedy[] {
  let deck = deckCache.get(book);
  if (!deck) {
    deck = [...book.remedies].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    deckCache.set(book, deck);
  }
  return deck;
}

/** The book remedy for a day number. Remedies are ordered by slug so the deck is stable. */
export function pickDaily(book: BookData, day: number): DailyPick {
  const remedies = deckOf(book);
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

// ---------------------------------------------------------------------------
// Boericke's chapters open with a header before the prose: the common name,
// often a "(LATIN NAME)" group, sometimes a descriptor ("Peruvian Balsam from
// Myroxylon Pereiræ", "Metal Chemical Element (RHODIUM)"), with OCR debris
// here and there. The helpers below only trim and select Boericke's own words.
// ---------------------------------------------------------------------------

/** A "(LATIN NAME)" group in capitals, closing with ")" or an OCR'd "}". */
const CAPS_GROUP = /\((?=[^)}]*[A-Z]{3})[A-Z][A-Z0-9 .,'’&-]*[)}]\s*/;
/** A bracketed group at the very start, also with mismatched brackets ("{Jaborandi)"). */
const LEADING_GROUP = /^[({[][^)}\]]{0,120}[)}\]]\s*/;
/** Stray leading punctuation and brackets left by the source (">From", ": GL = …"). */
const LEADING_DEBRIS = /^[\s>:;,.!?)}\]—–-]+/;
/** A chemical legend before the name, e.g. ": GL = Glycerin; O = Oxygen; N = Nitrogen". */
const LEGEND = /^(?:[A-Z]{1,3}\s*=\s*[A-Z][a-z]+[;,]?\s*)+/;
/**
 * A run-in section label: "Head. —", "Head.—", "Abdomen. —Griping",
 * "Relationship. —-", "Mind, —" (OCR comma). One to four words, starting with a
 * capital; joining words may be lower case ("Back and Extremities").
 */
const LABEL = /(?:^|(?<=[\s.,;]))[A-Z][\w'’-]*(?: (?:[A-Z][\w'’-]*|and|of|for|in)){0,3}\s?[.,]\s*[—–]+-?\s*/u;
/** A cross-reference run into the prose: "Compare: Kali carb; …", "… cases. Compare in cataract …". */
const CROSS_REF = /\s(?:Compare|Antidotes?|Complementary|Relationship)\s*[:.]|(?<=[.!?])\s+Compare\b/;
/** Lower-case words that can sit inside a name header ("Oxide et Aluminum", "Chlorine Gas in Water"). */
const JOINER = /^(?:of|et|the|and|or|in|a|an|from|de|du|la|sine|with|for|on|[—–-]+)$/;
/** Capitalised words that open Boericke's prose rather than end a name ("Ikshugandha An East Indian drug…"). */
const ARTICLE = /^(?:A|An|The|This|It|Its|In)$/;
/** Adjectives that open the prose with the word after them ("Recent German provings…"). */
const LEAD_IN = /^(?:Recent|Great|Much|Most|All|One)$/;
/** Capitalised verbs that can only start a sentence: after a name with no full stop, the prose begins there. */
const VERB = /^(?:Has|Have|Is|Are|Acts|Used|Useful|Produces|Affects|Seems|Causes|Increases|Excites|Should|Manifests|Contains|Found|Indicated|Said|Suitable)$/;

const normName = (x: string) =>
  x
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/[^a-z]/g, '');
const isCap = (w: string) => /^\p{Lu}/u.test(w.replace(/^["“‘']/, ''));
const isLower = (w: string) => /^\p{Ll}/u.test(w.replace(/^["“‘']/, ''));

/** Number of leading words that spell out the common name exactly, or 0. */
function commonNameWords(words: string[], commonName: string | null): number {
  if (!commonName) return 0;
  const target = normName(commonName);
  const bare = target.replace(/^(?:a|an|the)(?=[a-z]{4})/, '');
  for (let k = Math.min(10, words.length - 1); k > 0; k--) {
    const head = normName(words.slice(0, k).join(' '));
    if (head === target || head === bare) return k;
  }
  return 0;
}

/**
 * A name run straight into a verb with no full stop between them ("Arbor vitæ
 * Acts on skin", "Jambol Seeds - Enlexing, active principle Has an immediate
 * effect"): the number of words before the verb, or 0.
 */
function wordsBeforeVerb(words: string[]): number {
  for (let i = 1; i < Math.min(words.length, 10); i++) {
    if (/[.!?]$/.test(words[i - 1])) return 0;
    if (VERB.test(words[i]) && isLower(words[i + 1] ?? '')) return i;
  }
  return 0;
}

/**
 * Number of leading words that form a name header when the common name
 * doesn't match the text ("Black Spruce", "Arsenious Acid-Arsenic Trioxide",
 * "Peruvian Balsam from Myroxylon Pereiræ"): capitalised words and joiners up to
 * the first lower-case word, minus the capitalised word that starts the prose.
 */
function headerWords(words: string[]): number {
  let lastCap = -1;
  for (let i = 0; i < Math.min(words.length, 12); i++) {
    const w = words[i];
    if (/-(?:but|and|or|the)$/.test(w)) return 0; // "Incas-but the Spanish priests…" is prose already
    if (isCap(w)) {
      // "Ascites." / "Emaciation," after the name — a capitalised word with punctuation starts the prose
      if (i > 0 && /[.,;:!?]$/.test(w) && !/^(?:St|Dr|Mt)\.$/.test(w)) {
        // …unless a second name follows ("Cevadilla Seed. Asagræa Officialis Action on…")
        const more = /^[—–-]/.test(words[i + 1] ?? '') ? 0 : headerWords(words.slice(i));
        return more >= 2 ? i + more : i;
      }
      lastCap = i;
      continue;
    }
    if (JOINER.test(w)) continue;
    // a botanical epithet inside the name ("Arbor vitæ", "Erythraea venusta-Centaury")
    if (isLower(w) && i <= 3 && lastCap >= 0 && /^\p{Ll}[\p{L}-]{3,}$/u.test(w) && /^\p{Lu}[\p{L}-]*$/u.test(words[i + 1] ?? '')) {
      continue;
    }
    if (isLower(w)) {
      if (lastCap <= 0) return 0;
      // the prose opens with an article ("… An East Indian drug") or a lead-in adjective ("Recent German provings")
      for (let j = 1; j < lastCap; j++) {
        if (ARTICLE.test(words[j]) && !JOINER.test(words[j - 1])) return j;
      }
      let start = lastCap;
      while (start > 1 && LEAD_IN.test(words[start - 1])) start--;
      return start <= 8 ? start : 0;
    }
    return 0; // digits, symbols: leave the text alone
  }
  return 0;
}

/**
 * A chapter's first paragraph without the header it opens with: the common
 * name or descriptor, a "(LATIN NAME)" group, a leading bracketed name and any
 * stray punctuation. Section labels and the rest of the text are kept, so a
 * short chapter can be shown in full without repeating its name.
 */
export function stripChapterOpening(remedy: BookRemedy, paragraph: string): string {
  let s = paragraph.replace(/\s+/g, ' ').trim();
  s = s.replace(LEADING_DEBRIS, '').replace(LEGEND, '');
  // everything up to a "(LATIN NAME)" group near the start is header
  const caps = CAPS_GROUP.exec(s);
  if (caps && caps.index <= 120) {
    s = s.slice(caps.index + caps[0].length);
  } else if (LEADING_GROUP.test(s)) {
    s = s.replace(LEADING_GROUP, ''); // "(Smartweed) Amenorrhea in young girls…": the name was the group
  } else {
    // an unclosed bracket opening the paragraph ("(Heracleum-Hogweed Headache, …")
    if (/^[({[]/.test(s) && !/[)}\]]/.test(s.slice(0, 80))) s = s.slice(1);
    const words = s.split(' ');
    let k = wordsBeforeVerb(words);
    if (!k) {
      k = commonNameWords(words, remedy.commonName);
      if (!k || /,$/.test(words[k - 1]) || isLower(words[k] ?? '')) {
        // the name runs on into a descriptor ("Peruvian Balsam from Myroxylon Pereiræ", "Gopher-Plant, Caper Spurge")
        k = Math.max(k, headerWords(words));
      } else {
        // …or into a second name ("Cevadilla Seed. Asagræa Officialis Action on mucous membrane")
        const more = ARTICLE.test(words[k]) || LEAD_IN.test(words[k]) ? 0 : headerWords(words.slice(k));
        if (more >= 2) k += more;
      }
    }
    s = words.slice(k).join(' ');
  }
  for (let i = 0; i < 3; i++) s = s.replace(LEADING_GROUP, '').replace(LEADING_DEBRIS, '');
  // the header ate the start of the first sentence: begin at the next whole one
  if (/^\p{Ll}/u.test(s)) {
    const next = /[.!?]\s+(?=[A-Z“"])/.exec(s);
    if (next) s = s.slice(next.index + next[0].length);
  }
  return s.trim();
}

/** Text before the first run-in section label, skipping labels at the very start. */
function beforeLabel(s: string): string {
  let t = s;
  for (let m = LABEL.exec(t); m && m.index === 0; m = LABEL.exec(t)) t = t.slice(m[0].length);
  // the next section: a label, a lower-case one ("…in the head. — Superficial"), or a cross-reference
  const next = [LABEL.exec(t)?.index, /(?<=[.!?])\s*[—–]+-?\s/.exec(t)?.index, CROSS_REF.exec(t)?.index];
  const cut = Math.min(...next.filter((i): i is number => i !== undefined && i > 0));
  if (Number.isFinite(cut)) t = t.slice(0, cut);
  return t
    .replace(/\s*\[[^\]]*\]?\s*$/, '') // trailing "[Indigo.]" cross-reference
    .replace(/[\s,;:—–-]+$/, '')
    .trim();
}

/**
 * A paragraph split around its run-in section labels ("Head. — …",
 * "Relationship. — Compare: …"), so they can be set as bold run-ins.
 */
export function runInSegments(paragraph: string): { label: string | null; text: string }[] {
  const out: { label: string | null; text: string }[] = [];
  const re = new RegExp(LABEL.source, 'gu');
  let at = 0;
  for (let m = re.exec(paragraph); m; m = re.exec(paragraph)) {
    if (m.index > at) out.push({ label: null, text: paragraph.slice(at, m.index) });
    out.push({ label: `${m[0].trim().replace(/[\s.,]*[—–]+-?$/, '')}.`, text: m[0] });
    at = m.index + m[0].length;
  }
  if (at < paragraph.length) out.push({ label: null, text: paragraph.slice(at) });
  return out;
}

/** Prose worth quoting: a few words, and more than a name or a fragment. */
const isMeaningful = (s: string) => s.length >= 25 && s.split(' ').length >= 4 && /^[A-Z“"]/.test(s);

/**
 * Boericke's opening as a short lede, without the name header it begins with
 * and stopping before the first section label, cut at a sentence end near
 * `max` characters. When the opening paragraph has no prose of its own (a
 * name followed straight away by "Mind. —"), the next paragraphs supply it.
 */
export function openingLede(remedy: BookRemedy, max = 220): string {
  const paras = remedy.text.split(/\n{2,}/);
  let s = beforeLabel(stripChapterOpening(remedy, paras[0] ?? ''));
  for (let i = 1; !isMeaningful(s) && i < paras.length; i++) {
    const next = beforeLabel(paras[i].replace(/\s+/g, ' ').trim());
    if (isMeaningful(next)) s = next;
  }
  if (!s) s = (paras[0] ?? '').trim();
  if (s && !/[.!?…]$/.test(s)) s += '.';
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '));
  let lede = end > max * 0.5 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}`;
  // don't leave a bracket open at the cut
  const open = Math.max(lede.lastIndexOf('('), lede.lastIndexOf('['));
  if (open > lede.lastIndexOf(')') && open > lede.lastIndexOf(']') && open > max * 0.5) lede = lede.slice(0, open);
  lede = lede.replace(/;$/, '.').replace(/[\s,;:—–-]+$/, '');
  return /[.!?]$/.test(lede) ? lede : `${lede}…`;
}
