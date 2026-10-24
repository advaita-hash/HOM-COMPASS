import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Link2, NotebookPen } from 'lucide-react';
import { canonicalName } from '../../lib/remedyName';
import { decodeNote, type SharedNote } from './shareNote';

/** Readable date, or '' when the link carries something that isn't a date. */
const fmt = (d?: string | null) => {
  if (!d) return '';
  const date = new Date(d.length === 10 ? d + 'T00:00' : d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Public, read-only view of a single shared remedy note. The note is decoded
 * from the URL fragment — no sign-in, no database, nothing but this one note.
 * Everything in the link is untrusted: decodeNote validates it, and the author
 * name is shown as an unverified claim.
 */
export default function SharedNotePage() {
  const [note, setNote] = useState<SharedNote | null | undefined>(undefined);

  useEffect(() => {
    const read = () => setNote(decodeNote(window.location.hash.replace(/^#/, '')));
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  const date = note ? fmt(note.date) : '';

  return (
    <div className="min-h-full bg-base px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-5 flex items-center gap-2">
          <Compass className="h-6 w-6 text-brand-600" />
          <span className="font-bold text-ink/90">HOM-COMPASS</span>
        </div>

        {note === undefined ? null : !note ? (
          <div role="alert" className="card p-6">
            <h1 className="text-base font-semibold text-ink/90">This link can’t be opened</h1>
            <p className="mt-1 text-sm text-ink/70">
              The shared note link is invalid, incomplete or has been altered. Ask whoever shared
              it to send the link again.
            </p>
          </div>
        ) : (
          <div className="card p-6">
            <div className="mb-1 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wide text-violet-600">
              <NotebookPen className="h-3.5 w-3.5" /> Shared remedy note
            </div>
            <h1 className="break-words font-serif text-2xl font-semibold text-ink/90">
              {canonicalName(note.remedy)}
              {note.abbr && <span className="ml-2 font-mono text-sm text-ink/70">{note.abbr}</span>}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/70">
              {date && <span>{date}</span>}
              {note.by && (
                <span className="break-words">
                  Shared by “{note.by}” <span className="italic">(not verified)</span>
                </span>
              )}
            </div>
            <p className="mt-4 whitespace-pre-wrap break-words text-subhead leading-relaxed text-ink/90">
              {note.body}
            </p>
          </div>
        )}

        <p className="mt-4 flex items-start gap-2 text-xs text-ink/70">
          <Link2 className="mt-px h-3 w-3 shrink-0" aria-hidden />
          <span>
            This note is contained in the link itself. Anyone with the link can read it, and it
            can’t be revoked.
          </span>
        </p>
        <Link to="/dashboard" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
          Open HOM-COMPASS →
        </Link>
      </div>
    </div>
  );
}
