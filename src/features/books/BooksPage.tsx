import { Link } from 'react-router-dom';
import { BookOpen, Library as LibraryIcon, StickyNote } from 'lucide-react';
import { useBookPad } from '../notepad/notepadStore';
import { TourButton } from '../tour/TourButton';
import { usePageTour } from '../tour/usePageTour';
import { BOOKS } from './booksIndex';

/** "3 notes" on a book's card, when the practitioner has notes in it. */
function BookNoteCount({ book }: { book: string }) {
  const n = useBookPad(book).length;
  if (!n) return null;
  return (
    <span data-tour="books-note-count" className="flex items-center gap-1 text-ink/70">
      <StickyNote className="h-3.5 w-3.5 text-amber-600" aria-hidden />
      {n} {n === 1 ? 'note' : 'notes'}
    </span>
  );
}

/** Catalogue of bundled reference materia medica. */
export default function BooksPage() {
  usePageTour('books');
  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <header className="mb-6 flex items-center gap-3">
        <LibraryIcon className="mt-1 h-6 w-6 shrink-0 self-start text-brand-600" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-slate-800">Reference Books</h1>
          <p className="text-sm text-slate-500">
            Full-text materia medica, searchable by remedy.
          </p>
        </div>
        <TourButton tour="books" />
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {BOOKS.map((book, i) => (
          <Link
            key={book.id}
            to={`/books/${book.id}`}
            data-tour={i === 0 ? 'books-book' : undefined}
            className="group card overflow-hidden pressable"
          >
            <div
              className={`flex h-28 items-end bg-gradient-to-br ${book.cover} p-4 text-white`}
            >
              <BookOpen className="h-8 w-8 opacity-90" />
            </div>
            <div className="p-4">
              <h2 className="font-serif text-lg font-semibold leading-snug text-slate-800">
                {book.title}
              </h2>
              <p className="text-xs font-medium text-brand-600">{book.author}</p>
              <p className="mt-2 line-clamp-3 text-sm text-slate-600">{book.blurb}</p>
              <p className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-400">
                <span>~{book.approxRemedies} remedies</span>
                <BookNoteCount book={book.id} />
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
