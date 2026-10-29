import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { BookText, Loader2 } from 'lucide-react';
import { BOOKS, bookQueryOptions, findBookRemedy } from './booksIndex';

/**
 * Links from a curated remedy out to its own chapter in each reference book
 * that has it, opened on Full text. Books without the remedy get no button,
 * as on the remedy profile page.
 */
export function BookCrossLinks({ remedyName }: { remedyName: string }) {
  const books = useQueries({ queries: BOOKS.map((b) => bookQueryOptions(b.id)) });
  const loading = books.some((b) => b.isLoading);
  const links = BOOKS.flatMap((meta, i) => {
    const data = books[i].data;
    const hit = data ? findBookRemedy(data, remedyName) : undefined;
    return hit ? [{ meta, slug: hit.slug }] : [];
  });
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <BookText className="h-4 w-4 text-brand-600" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/70">
          Read in the books
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map(({ meta, slug }) => (
          <Link key={meta.id} to={`/books/${meta.id}/${slug}?view=full`} className="btn-secondary">
            {meta.label} — {meta.shortTitle}
          </Link>
        ))}
        {loading && (
          <span className="flex items-center gap-2 text-sm text-ink/70">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking the books…
          </span>
        )}
        {!loading && links.length === 0 && (
          <p className="text-sm text-ink/70">None of the reference books has a chapter on this remedy.</p>
        )}
      </div>
    </div>
  );
}
