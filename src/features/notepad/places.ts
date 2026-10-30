import { parseSections } from '../books/sections';
import type { NotePlace } from './notepadStore';

// ---------------------------------------------------------------------------
// Places inside a book chapter, for pinning notes.
//
// A chapter's text is split into BLOCKS exactly as the Full text reader
// renders it: parseSections() → section i, item j → block key "i.j". A block's
// `text` is its rendered plain text (Allen's labelled bullets render as
// "Label: text"), so DOM selection offsets inside a block map 1:1 onto it.
//
// A note is pinned either to a whole SECTION (no quote) or to a PASSAGE (the
// selected words plus a little context). Book text can be cleaned up later,
// so a place is found again by its words first and its block key last.
// ---------------------------------------------------------------------------

export interface TextBlock {
  /** "section.item", stable for a given text. */
  key: string;
  /** Section the block belongs to: Allen's heading, Boericke's "Mind." label, or null. */
  section: string | null;
  /** True for the first block of a section (where a section pin is shown). */
  sectionStart: boolean;
  /** Rendered plain text of the block. */
  text: string;
}

/** Boericke's paragraph labels: "Mind. — …", "Female. — …", "Modalities. — …". */
const LABEL_RE = /^([A-Z][A-Za-z ,&'’()-]{1,48}?)\.\s+[—–-]\s/;

export function blocksOf(text: string): TextBlock[] {
  const out: TextBlock[] = [];
  parseSections(text).forEach(({ heading, items }, i) => {
    items.forEach((it, j) => {
      const rendered = it.label ? `${it.label}: ${it.text}` : it.text;
      const label = heading ?? LABEL_RE.exec(rendered)?.[1]?.trim() ?? null;
      out.push({ key: `${i}.${j}`, section: label, sectionStart: j === 0, text: rendered });
    });
  });
  return out;
}

export interface PlaceOption {
  /** Block key where the section starts. */
  key: string;
  label: string;
}

/**
 * Sections a note can be pinned to without selecting text. Allen: his
 * headings. Boericke: its labelled paragraphs (the opening paragraph is
 * "Introduction"). Tyler's chapters are one long passage, so they have no
 * sections; pin by selecting words instead.
 */
export function placesOf(blocks: TextBlock[]): PlaceOption[] {
  const starts = blocks.filter((b) => b.sectionStart);
  if (starts.length < 2) return [];
  const seen = new Map<string, number>();
  const out: PlaceOption[] = [];
  starts.forEach((b, i) => {
    const label = b.section ?? (i === 0 ? 'Introduction' : `Paragraph ${i + 1}`);
    // a repeated label is numbered by occurrence ("Throat (2)"), so the
    // picker stays unambiguous
    const nth = (seen.get(label) ?? 0) + 1;
    seen.set(label, nth);
    out.push({ key: b.key, label: nth > 1 ? `${label} (${nth})` : label });
  });
  return out;
}

const QUOTE_MAX = 280;
const CONTEXT = 32;
const WORD_CHAR = /[\p{L}\p{N}]/u;

/** Passages built from a selection longer than QUOTE_MAX (see wasShortened). */
const shortened = new WeakSet<NotePlace>();

/**
 * True when `place` came from placeFromSelection and keeps only the start of a
 * longer selection, so the UI can say so. Not stored with the note.
 */
export const wasShortened = (place: NotePlace) => shortened.has(place);

/**
 * Build a passage pin from a selection [start, end) inside one block. A long
 * selection keeps its first QUOTE_MAX characters, cut back to a word boundary.
 */
export function placeFromSelection(
  book: string,
  slug: string,
  block: TextBlock,
  start: number,
  end: number,
): NotePlace | null {
  let s = Math.max(0, Math.min(start, end));
  let e = Math.min(block.text.length, Math.max(start, end));
  while (s < e && /\s/.test(block.text[s])) s++;
  while (e > s && /\s/.test(block.text[e - 1])) e--;
  if (e - s < 2) return null;
  const long = e - s > QUOTE_MAX;
  if (long) {
    const t = block.text;
    e = s + QUOTE_MAX;
    // never end part-way through a word, nor on the space before the next one
    while (e > s && WORD_CHAR.test(t[e - 1]) && WORD_CHAR.test(t[e] ?? '')) e--;
    while (e > s && /\s/.test(t[e - 1])) e--;
    // a single 280+ character token: nothing better than the plain cut
    if (e - s < 2) e = s + QUOTE_MAX;
  }
  const place: NotePlace = {
    book,
    slug,
    block: block.key,
    section: block.section,
    quote: block.text.slice(s, e),
    prefix: block.text.slice(Math.max(0, s - CONTEXT), s),
    suffix: block.text.slice(e, e + CONTEXT),
  };
  if (long) shortened.add(place);
  return place;
}

/** Build a section pin. */
export function placeFromSection(book: string, slug: string, block: TextBlock): NotePlace {
  return { book, slug, block: block.key, section: block.section };
}

export interface ResolvedPlace {
  key: string;
  /** Character range of the quote inside the block (passage pins only). */
  start?: number;
  end?: number;
}

function occurrences(hay: string, needle: string): number[] {
  const out: number[] = [];
  for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + 1)) out.push(i);
  return out;
}

/** How well the text around position `at` matches the saved context. */
function contextScore(text: string, at: number, len: number, place: NotePlace): number {
  let score = 0;
  const before = text.slice(Math.max(0, at - CONTEXT), at);
  const after = text.slice(at + len, at + len + CONTEXT);
  if (place.prefix && before.endsWith(place.prefix.slice(-12))) score += 2;
  if (place.suffix && after.startsWith(place.suffix.slice(0, 12))) score += 2;
  return score;
}

/**
 * Find a pinned place again in the current text: the quote (scored by its
 * context, preferring the original block and section); for a section pin, its
 * own block while that still starts the same section (a chapter can repeat a
 * heading), else the first section with its label, else the original block.
 * Null when the place no longer exists.
 */
export function resolvePlace(blocks: TextBlock[], place: NotePlace): ResolvedPlace | null {
  if (place.quote) {
    let best: { key: string; start: number; score: number } | null = null;
    for (const b of blocks) {
      for (const at of occurrences(b.text, place.quote)) {
        const score =
          contextScore(b.text, at, place.quote.length, place) +
          (b.key === place.block ? 3 : 0) +
          (place.section && b.section === place.section ? 1 : 0);
        if (!best || score > best.score) best = { key: b.key, start: at, score };
      }
    }
    if (best) return { key: best.key, start: best.start, end: best.start + place.quote.length };
    return null;
  }
  if (place.section) {
    const own = blocks.find((x) => x.key === place.block);
    if (own?.sectionStart && own.section === place.section) return { key: own.key };
    const b = blocks.find((x) => x.sectionStart && x.section === place.section);
    if (b) return { key: b.key };
  }
  return blocks.some((b) => b.key === place.block) ? { key: place.block } : null;
}

/** Short human label for a place: its section, or the start of the quote. */
export function placeLabel(place: NotePlace): string {
  if (place.quote) {
    const q = place.quote.length > 60 ? `${place.quote.slice(0, 57).trimEnd()}…` : place.quote;
    return place.section ? `${place.section} · “${q}”` : `“${q}”`;
  }
  return place.section ?? 'Section';
}
