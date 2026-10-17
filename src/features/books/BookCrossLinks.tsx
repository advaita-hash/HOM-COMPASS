import { Link } from 'react-router-dom';
import { BookText } from 'lucide-react';
import { BOOKS } from './booksIndex';

/**
 * Links from a curated remedy out to its full drug picture in the reference
 * books. Uses the book search (`?q=`) so it lands correctly even when the
 * book's slug for the remedy differs slightly from the curated one.
 */
export function BookCrossLinks({ remedyName }: { remedyName: string }) {
  // Match on the first word of the Latin name (e.g. "Natrum", "Calcarea").
  const term = remedyName.split(/\s+/)[0];
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <BookText className="h-4 w-4 text-brand-600" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Read the full drug picture
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {BOOKS.map((book) => (
          <Link
            key={book.id}
            to={`/books/${book.id}?q=${encodeURIComponent(term)}`}
            className="btn-ghost border border-slate-200"
          >
            {book.author.split(' ').slice(-1)[0]} — {book.title.length > 28 ? 'Materia Medica' : book.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
