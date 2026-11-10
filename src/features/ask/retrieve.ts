import type { BookData } from '../books/types';
import { type Line, linesOf } from '../materia-medica/textSearch';

// ---------------------------------------------------------------------------
// Picks the book passages an "Ask the books" answer may use. Remedies named in
// the question bring in their chapters (whole when short, else the lines about
// the question's topic); with no remedy named, the best-matching lines across
// the books are used. Runs on the server (api/ask.ts); kept free of browser
// and Vite APIs.
// ---------------------------------------------------------------------------

export interface SourceBook {
  id: string;
  label: string;
  data: BookData;
}

export interface Passage {
  book: string;
  bookLabel: string;
  slug: string;
  name: string;
  lines: Line[];
}

/** Characters of book text sent with one question (about 20k tokens). */
const TOTAL_BUDGET = 80_000;
/** A chapter longer than this is cut to the lines about the question's topic. */
const WHOLE_CHAPTER = 16_000;
/** At most this much of one long chapter. */
const PER_LONG_CHAPTER = 6_000;

const STOP = new Set(
  (
    'a an and are as at be between by can compare comparison compared describe difference differences ' +
    'do does drug explain for from give how in is it its me of on or picture remedy remedies short ' +
    'tell the their them these this to vs versus what when where which who why with write answer ' +
    'affections affection complaints complaint symptoms symptom indications case cases'
  ).split(' '),
);

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

/** Same word up to its ending: "aloes" ~ "aloe", "acetic" ~ "aceticum" (not "rheumatic" ~ "rheum"). */
const sameWord = (q: string, n: string) =>
  q === n ||
  (Math.min(q.length, n.length) >= 4 && Math.abs(q.length - n.length) <= 2 && (q.startsWith(n) || n.startsWith(q)));

/** A later word of a name, which may be shortened: "tox" ~ "toxicodendron", "brom" ~ "bromatum". */
const sameTail = (q: string, n: string) => !STOP.has(q) && (sameWord(q, n) || (q.length >= 3 && n.startsWith(q)));

/**
 * Chapters whose remedy the question names: every word of the name must be in
 * the question (a shortened second word counts), or the first word alone when
 * no other chapter of the book shares it ("Apis" for Apis Mellifica).
 */
function namedChapters(
  question: string,
  book: SourceBook,
  /** Names other books matched, to settle a shared first word ("Apocynum" → Apocynum Cannabinum). */
  preferred: Set<string> = new Set(),
): { slug: string; used: string[] }[] {
  const q = words(question);
  const out: { slug: string; used: string[] }[] = [];
  const firstWordCount = new Map<string, number>();
  const names = book.data.remedies.map((r) => ({ r, w: words(r.name) }));
  for (const { w } of names) firstWordCount.set(w[0], (firstWordCount.get(w[0]) ?? 0) + 1);
  for (const { r, w } of names) {
    if (!w.length || w[0].length < 3 || STOP.has(w[0])) continue;
    const head = q.findIndex((t) => sameWord(t, w[0]));
    if (head < 0) continue;
    const rest = w.slice(1);
    const used = [q[head]];
    let all = true;
    for (const n of rest) {
      const t = q.slice(head + 1, head + 1 + rest.length + 1).find((x) => sameTail(x, n));
      if (t) used.push(t);
      else all = false;
    }
    const alone = rest.length > 0 && used.length === 1;
    if (all || (alone && (firstWordCount.get(w[0]) === 1 || preferred.has(w.join(' '))))) out.push({ slug: r.slug, used });
  }
  // "Nux vomica" names Nux Vomica, not also a lone "Nux" match elsewhere: keep
  // the fullest matches for each first word
  const best = new Map<string, number>();
  for (const m of out) {
    const k = m.used[0];
    best.set(k, Math.max(best.get(k) ?? 0, m.used.length));
  }
  // a word that finished one name ("brom" in Kali brom) doesn't start another (Bromium)
  const tails = new Set(out.filter((m) => m.used.length === best.get(m.used[0])).flatMap((m) => m.used.slice(1)));
  return out.filter((m) => m.used.length === best.get(m.used[0]) && !tails.has(m.used[0]));
}

/** The question's topic words, without remedy names and filler words. */
function topicOf(question: string, nameWords: Set<string>): string[] {
  return [...new Set(words(question))].filter((w) => w.length >= 3 && !STOP.has(w) && !nameWords.has(w));
}

const hits = (text: string, topic: string[]) => {
  const low = text.toLowerCase();
  return topic.filter((t) => low.includes(t.length > 5 ? t.slice(0, -2) : t)).length;
};

/** Lines of one long chapter: its opening, then the lines about the topic, within `cap` characters. */
function excerpt(lines: Line[], topic: string[], cap: number): Line[] {
  const keep = new Set<number>();
  let size = 0;
  const add = (i: number) => {
    if (keep.has(i) || size + lines[i].text.length > cap) return;
    keep.add(i);
    size += lines[i].text.length;
  };
  for (let i = 0; i < Math.min(6, lines.length); i++) add(i);
  const ranked = lines
    .map((l, i) => ({ i, n: hits(l.text, topic) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.i - b.i);
  for (const { i } of ranked) add(i);
  if (!topic.length) for (let i = 0; i < lines.length; i++) add(i);
  return [...keep].sort((a, b) => a - b).map((i) => lines[i]);
}

/** The passages to answer a question from, in the books' order. */
export function retrieve(question: string, books: SourceBook[]): Passage[] {
  const first = books.map((b) => namedChapters(question, b));
  const preferred = new Set(
    books.flatMap((b, i) => first[i].map((c) => words(b.data.remedies.find((r) => r.slug === c.slug)!.name).join(' '))),
  );
  const named = books.map((b) => ({ b, chapters: namedChapters(question, b, preferred) }));
  const nameWords = new Set(named.flatMap((n) => n.chapters.flatMap((c) => c.used)));
  const topic = topicOf(question, nameWords);
  const out: Passage[] = [];
  let budget = TOTAL_BUDGET;

  if (named.some((n) => n.chapters.length)) {
    // short chapters first, so a long one can't crowd them out
    const wanted = named.flatMap(({ b, chapters }) =>
      chapters.map((c) => {
        const r = b.data.remedies.find((x) => x.slug === c.slug)!;
        return { b, r, lines: linesOf(r), len: r.text.length };
      }),
    );
    const share = Math.max(3_000, Math.floor(TOTAL_BUDGET / Math.max(1, wanted.length)));
    for (const w of [...wanted].sort((a, b) => a.len - b.len)) {
      const cap = Math.min(budget, w.len <= WHOLE_CHAPTER ? Math.max(share, Math.min(w.len, budget)) : Math.min(PER_LONG_CHAPTER, share));
      const lines = w.len <= cap ? w.lines : excerpt(w.lines, topic, cap);
      if (!lines.length) continue;
      budget -= lines.reduce((n, l) => n + l.text.length, 0);
      out.push({ book: w.b.id, bookLabel: w.b.label, slug: w.r.slug, name: w.r.name, lines });
    }
  } else if (topic.length) {
    // no remedy named: the lines that share the most topic words, across the books
    const scored: { b: SourceBook; slug: string; name: string; line: Line; n: number }[] = [];
    for (const b of books)
      for (const r of b.data.remedies)
        for (const line of linesOf(r)) {
          const n = hits(line.text, topic);
          if (n >= Math.min(2, topic.length)) scored.push({ b, slug: r.slug, name: r.name, line, n });
        }
    scored.sort((a, b) => b.n - a.n);
    const byChapter = new Map<string, Passage>();
    for (const s of scored) {
      if (budget - s.line.text.length < 0) break;
      budget -= s.line.text.length;
      const k = `${s.b.id}/${s.slug}`;
      let p = byChapter.get(k);
      if (!p) byChapter.set(k, (p = { book: s.b.id, bookLabel: s.b.label, slug: s.slug, name: s.name, lines: [] }));
      p.lines.push(s.line);
    }
    out.push(...byChapter.values());
  }
  const order = new Map(books.map((b, i) => [b.id, i]));
  return out.sort((a, b) => order.get(a.book)! - order.get(b.book)! || a.name.localeCompare(b.name));
}
