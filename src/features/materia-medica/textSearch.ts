import type { BookRemedy } from '../books/types';
import { blocksOf } from '../notepad/places';

// ---------------------------------------------------------------------------
// Line search across the books' text. A "line" is one sentence or one
// semicolon-separated symptom within a paragraph or keynote (Boericke runs
// many symptoms together with ";"). A line matches when it contains every
// word typed, in any order; text in "quotes" must appear as written.
// ---------------------------------------------------------------------------

export interface Line {
  /** Block key ("i.j", as in the reader's data-block) and offsets in its text. */
  block: string;
  start: number;
  end: number;
  text: string;
}

/** Lines of a chapter, with their place in the reader's blocks. */
export function linesOf(remedy: BookRemedy): Line[] {
  const out: Line[] = [];
  for (const b of blocksOf(remedy.text)) {
    const re = /[^.;!?]+(?:[.;!?]+["”’)]?|$)/g;
    for (let m = re.exec(b.text); m; m = re.exec(b.text)) {
      const raw = m[0];
      // drop the dash or colon left from a label ("Modalities. — Worse, …")
      const lead = raw.length - raw.replace(/^[\s—–:-]+/, '').length;
      const text = raw.slice(lead).trimEnd();
      if (text.length < 3) continue;
      const start = m.index + lead;
      out.push({ block: b.key, start, end: start + text.length, text });
    }
  }
  return out;
}

/** The query's terms: quoted phrases kept whole, other words split. */
export function termsOf(query: string): string[] {
  const out: string[] = [];
  const re = /"([^"]+)"|“([^”]+)”|(\S+)/g;
  for (let m = re.exec(query); m; m = re.exec(query)) {
    const t = (m[1] ?? m[2] ?? m[3]).trim().toLowerCase();
    if (t) out.push(t);
  }
  return out;
}

/** True when the text contains every term. */
export function matchesAll(text: string, terms: string[]): boolean {
  const low = text.toLowerCase();
  return terms.every((t) => low.includes(t));
}

/** Where each term occurs in the text, merged, for highlighting. */
export function termRanges(text: string, terms: string[]): [number, number][] {
  const low = text.toLowerCase();
  const found: [number, number][] = [];
  for (const t of terms) {
    for (let i = low.indexOf(t); i >= 0; i = low.indexOf(t, i + t.length)) found.push([i, i + t.length]);
  }
  found.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of found) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}
