import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistedObject, safeStorage } from '../../lib/safeStorage';

// ---------------------------------------------------------------------------
// Notepad: the practitioner's own notes on remedies and reference books,
// kept on this device (and in the backup file, like every hom-compass.* key).
//
// A note is one of:
//   • general remedy note — `remedy` set, no `place`
//   • general book note   — `book` set, no `remedy`, no `place`
//   • pinned note         — `remedy` set AND `place` (a spot inside one book
//                           chapter); it belongs to that remedy and that book
// ---------------------------------------------------------------------------

export const NOTEPAD_KEY = 'hom-compass.notepad';
/** Persist version of the saved notepad (also written into backups). */
export const NOTEPAD_VERSION = 2;

/** A spot inside one book chapter (see places.ts for how it is resolved). */
export interface NotePlace {
  book: string;
  slug: string;
  /** Block key ("section.item") the note was pinned in, as a hint. */
  block: string;
  /** Section label at pin time ("Mind", "Mental Generals"), if any. */
  section?: string | null;
  /** The selected words, when pinned to a passage rather than a section. */
  quote?: string;
  /** A little text either side of the quote, to tell repeats apart. */
  prefix?: string;
  suffix?: string;
}

export interface PadNote {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  /** Remedy key (see remedyKey.ts) for remedy and pinned notes. */
  remedy?: string;
  /** Display name of the remedy when the note was written. */
  remedyName?: string;
  /** Book id for general book notes. */
  book?: string;
  place?: NotePlace;
}

export type NewNote = Omit<PadNote, 'id' | 'createdAt' | 'updatedAt'>;

interface NotepadState {
  notes: PadNote[];
  add: (note: NewNote) => PadNote;
  update: (id: string, body: string) => void;
  remove: (id: string) => void;
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

/**
 * Keep only well-formed notes (storage may be damaged or from an old backup).
 * The backup's restore preview counts notes with this too, so the count it
 * shows is the number the notepad keeps.
 */
export function cleanNote(raw: unknown): PadNote | null {
  const o = persistedObject(raw);
  const id = str(o.id);
  const body = str(o.body);
  if (!id || body === undefined) return null;
  const now = new Date(0).toISOString();
  const note: PadNote = {
    id,
    body,
    createdAt: str(o.createdAt) ?? now,
    updatedAt: str(o.updatedAt) ?? str(o.createdAt) ?? now,
  };
  if (str(o.remedy)) note.remedy = str(o.remedy);
  if (str(o.remedyName)) note.remedyName = str(o.remedyName);
  if (str(o.book)) note.book = str(o.book);
  const p = persistedObject(o.place);
  if (str(p.book) && str(p.slug) && str(p.block)) {
    note.place = {
      book: p.book as string,
      slug: p.slug as string,
      block: p.block as string,
      section: str(p.section) ?? null,
      ...(str(p.quote) ? { quote: str(p.quote) } : {}),
      ...(str(p.prefix) !== undefined ? { prefix: str(p.prefix) } : {}),
      ...(str(p.suffix) !== undefined ? { suffix: str(p.suffix) } : {}),
    };
  }
  // must be about something
  if (!note.remedy && !note.book) return null;
  return note;
}

// ---- version 1 → 2: remedy keys ---------------------------------------------
// Version 2 changed how some book chapters are keyed (remedyKey.ts), and split
// two Allen chapters that had the next monograph run on into them. Notes saved
// under the old keys are moved so they still show with their remedy.

/** Book-only keys of chapters that now match a repertory remedy. */
const V1_BOOK_KEYS: Record<string, string> = {
  'book:boericke:anatherum': 'Anantherum Muricatum',
  'book:boericke:asclepias-syriaca': 'Asclepias Cornuti',
  'book:boericke:astacus-fluviatilis': 'Cancer Fluviatilis',
  'book:boericke:chenopodium-anthelminticum': 'Chenopodium Ambrosioides & Var. Anthelminticum',
  'book:boericke:condurango': 'Cundurango',
  'book:boericke:epiphegus': 'Orobanche Ramosa',
  'book:boericke:illicium': 'Anisum Stellatum',
  'book:boericke:iodoformum': 'Iodoformium',
  'book:boericke:kali-permanganicum': 'Kalium Permanganatum',
  'book:boericke:lycopersicum-esculentum': 'Lycopersicon Esculentum',
  'book:boericke:pertussin': 'Coqueluchinum',
  'book:boericke:pinus-sylvestris': 'Pinus Silvestris',
  'book:boericke:pothos-foetidus': 'Ictodes Foetida',
  'book:boericke:solidago-virga': 'Solidago Virgaurea',
  'book:tyler:asafoetida': 'Asa Foetida',
  'book:tyler:colocynth': 'Colocynthis',
  'book:tyler:hepar-sulphuris': 'Hepar Sulphur',
  'book:tyler:phosphorus-acid': 'Phosphoricum Acidum',
  'book:tyler:poeonia': 'Paeonia Officinalis',
  'book:tyler:pyrogen': 'Pyrogenium',
  'book:tyler:rhus-tox': 'Rhus Toxicodendron',
  'book:tyler:silica': 'Silicea Terra',
};

/**
 * Chapters that were keyed to the wrong repertory remedy. `name` is the
 * remedyName the reader saved, which tells a general note written in that
 * chapter from one written on the `from` remedy itself.
 */
const V1_WRONG_KEYS = [
  { book: 'allen', slug: 'mercurius', name: 'Mercurius', from: 'Mercurius Aceticus', to: 'Mercurius Solubilis' },
  { book: 'allen', slug: 'bismuthum', name: 'Bismuthum', from: 'Bismuthum Oxydatum', to: 'Bismutum Subnitricum (+ -o.)' },
  { book: 'boericke', slug: 'bismuthum', name: 'Bismuthum', from: 'Bismuthum Oxydatum', to: 'Bismutum Subnitricum (+ -o.)' },
];

/**
 * Allen chapters whose text ran on into the next monograph: sections from
 * `sections` on are now the `to` chapter (section i → i - sections).
 */
const V1_SPLIT_CHAPTERS = [
  { book: 'allen', slug: 'lycopodium-clavatum', sections: 14, to: 'lyssinum', remedy: 'Hydrophobinum', name: 'Lyssinum' },
  {
    book: 'allen',
    slug: 'trillium-pendulum',
    sections: 7,
    to: 'tuberculinum',
    remedy: 'Tuberculinum Bovinum Kent',
    name: 'Tuberculinum',
  },
];

/** One saved note re-keyed from version 1 (left as is when nothing applies). */
export function rekeyV1Note(raw: unknown): unknown {
  const n = persistedObject(raw);
  if (n !== raw) return raw;
  const place = persistedObject(n.place);
  const out: Record<string, unknown> = { ...n };
  const remedy = str(n.remedy);
  if (remedy && V1_BOOK_KEYS[remedy]) out.remedy = V1_BOOK_KEYS[remedy];
  for (const w of V1_WRONG_KEYS) {
    if (remedy !== w.from) continue;
    const here = n.place ? place.book === w.book && place.slug === w.slug : n.remedyName === w.name;
    if (here) out.remedy = w.to;
  }
  for (const c of V1_SPLIT_CHAPTERS) {
    if (place.book !== c.book || place.slug !== c.slug || typeof place.block !== 'string') continue;
    const [i, j] = place.block.split('.').map(Number);
    if (!Number.isInteger(i) || !Number.isInteger(j) || i < c.sections) continue;
    out.place = { ...place, slug: c.to, block: `${i - c.sections}.${j}` };
    out.remedy = c.remedy;
    out.remedyName = c.name;
  }
  return out;
}

/** Saved notepad state from `version` brought up to NOTEPAD_VERSION. */
export function migrateNotepad(persisted: unknown, version: number): unknown {
  const state = persistedObject(persisted);
  if (version >= 2 || !Array.isArray(state.notes)) return persisted;
  return { ...state, notes: state.notes.map(rekeyV1Note) };
}

export const useNotepad = create<NotepadState>()(
  persist(
    (set, get) => ({
      notes: [],
      add: (n) => {
        const now = new Date().toISOString();
        const note: PadNote = { ...n, id: newId(), createdAt: now, updatedAt: now };
        set({ notes: [...get().notes, note] });
        return note;
      },
      update: (id, body) =>
        set({
          notes: get().notes.map((n) => (n.id === id ? { ...n, body, updatedAt: new Date().toISOString() } : n)),
        }),
      remove: (id) => set({ notes: get().notes.filter((n) => n.id !== id) }),
    }),
    {
      name: NOTEPAD_KEY,
      storage: safeStorage(),
      version: NOTEPAD_VERSION,
      migrate: (persisted, version) => migrateNotepad(persisted, version) as NotepadState,
      merge: (persisted, current) => {
        const raw = persistedObject(persisted).notes;
        const notes = Array.isArray(raw) ? raw.map(cleanNote).filter((n): n is PadNote => !!n) : [];
        return { ...current, notes };
      },
    },
  ),
);

// ---- queries ----------------------------------------------------------------

/** The book a note belongs to, if any (general book note or pinned note). */
export const noteBook = (n: PadNote) => n.place?.book ?? n.book;

export const isGeneralRemedyNote = (n: PadNote, remedy: string) => n.remedy === remedy && !n.place;
export const isGeneralBookNote = (n: PadNote, book: string) => n.book === book && !n.remedy && !n.place;

const byNewest = (a: PadNote, b: PadNote) => b.updatedAt.localeCompare(a.updatedAt);

/** Every note about a remedy: general ones and those pinned in any book. */
export function useRemedyPad(remedy: string | undefined) {
  const notes = useNotepad((s) => s.notes);
  return useMemo(() => (remedy ? notes.filter((n) => n.remedy === remedy).sort(byNewest) : []), [notes, remedy]);
}

/** Every note about a book: general book notes and notes pinned inside it. */
export function useBookPad(book: string | undefined) {
  const notes = useNotepad((s) => s.notes);
  return useMemo(() => (book ? notes.filter((n) => noteBook(n) === book).sort(byNewest) : []), [notes, book]);
}

/** Notes pinned inside one book chapter. */
export function useChapterPad(book: string | undefined, slug: string | undefined) {
  const notes = useNotepad((s) => s.notes);
  return useMemo(
    () => (book && slug ? notes.filter((n) => n.place?.book === book && n.place.slug === slug) : []),
    [notes, book, slug],
  );
}
