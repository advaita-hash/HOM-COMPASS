import { Link } from 'react-router-dom';
import { BookOpen, Library as LibraryIcon } from 'lucide-react';
import { BOOKS } from './booksIndex';

/** Catalogue of bundled reference materia medica. */
export default function BooksPage() {
  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <header className="mb-6 flex items-center gap-3">
        <LibraryIcon className="h-6 w-6 text-brand-600" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Reference Books</h1>
          <p className="text-sm text-slate-500">
            Full-text materia medica, searchable by remedy.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {BOOKS.map((book) => (
          <Link
            key={book.id}
            to={`/books/${book.id}`}
            className="group card overflow-hidden transition-shadow hover:shadow-md"
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
              <p className="mt-3 text-xs text-slate-400">
                ~{book.approxRemedies} remedies
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
