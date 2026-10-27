import { BOOKS } from '../books/booksIndex';
import type { PadNote } from './notepadStore';
import { isRepertoryKey, remedyKeyLabel } from './remedyKey';

// ---------------------------------------------------------------------------
// Where a note lives in the app, for lists that link to notes (My notes,
// search). The reader and the remedy page act on these query params:
//   /books/:book/:slug?note=<id>   open the chapter at the note's place
//   /books/:book/:slug?notes=remedy  open the Notes sheet on "This remedy"
//   /books/:book?notes=book        open the Notes sheet on "This book"
//   /remedy/:name?tab=notes        the remedy page's notes tab
// ---------------------------------------------------------------------------

const enc = encodeURIComponent;

/** "book:<book>:<slug>" → { book, slug }, or null for any other key. */
function bookScoped(key: string): { book: string; slug: string } | null {
  if (!key.startsWith('book:')) return null;
  const rest = key.slice(5);
  const i = rest.indexOf(':');
  if (i <= 0 || i === rest.length - 1) return null;
  return { book: rest.slice(0, i), slug: rest.slice(i + 1) };
}

/** A remedy's notepad: its profile page, or the book chapter for book-only remedies. */
export function remedyHref(key: string): string {
  const scoped = !isRepertoryKey(key) && bookScoped(key);
  if (scoped) return `/books/${enc(scoped.book)}/${enc(scoped.slug)}?notes=remedy`;
  return `/remedy/${enc(key)}?tab=notes`;
}

/** A book's notepad (the reader's Notes sheet on "This book"). */
export const bookHref = (book: string) => `/books/${enc(book)}?notes=book`;

/** Where one note is shown: its pinned place, else its remedy's or book's notepad. */
export function noteHref(note: PadNote): string {
  if (note.place) return `/books/${enc(note.place.book)}/${enc(note.place.slug)}?note=${enc(note.id)}`;
  if (note.remedy) return remedyHref(note.remedy);
  return bookHref(note.book ?? '');
}

/** Short book name ("Boericke"), or the id for a book this build doesn't have. */
export const bookLabel = (book: string) => BOOKS.find((b) => b.id === book)?.label ?? book;

/** What a note is about: its remedy, or (for a general book note) its book. */
export function noteTitle(note: PadNote): string {
  if (note.remedy) return remedyKeyLabel(note.remedy, note.remedyName);
  return bookLabel(note.book ?? '');
}
