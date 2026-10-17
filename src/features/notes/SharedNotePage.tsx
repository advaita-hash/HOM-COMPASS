import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Lock, NotebookPen } from 'lucide-react';
import { canonicalName } from '../../lib/remedyName';
import { decodeNote, type SharedNote } from './shareNote';

const fmt = (d?: string | null) =>
  d
    ? new Date(d.length === 10 ? d + 'T00:00' : d).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

/**
 * Public, read-only view of a single shared remedy note. The note is decoded
 * from the URL fragment — no sign-in, no database, nothing but this one note.
 */
export default function SharedNotePage() {
  const [note, setNote] = useState<SharedNote | null | undefined>(undefined);

  useEffect(() => {
    const read = () => setNote(decodeNote(window.location.hash.replace(/^#/, '')));
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  return (
    <div className="min-h-full bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-5 flex items-center gap-2">
          <Compass className="h-6 w-6 text-brand-600" />
          <span className="font-bold text-slate-800">HOM-COMPASS</span>
        </div>

        {note === undefined ? null : !note ? (
          <div className="card p-6 text-sm text-slate-500">
            This shared note link is invalid or incomplete. Ask whoever shared it to send the link
            again.
          </div>
        ) : (
          <div className="card p-6">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-violet-500">
              <NotebookPen className="h-3.5 w-3.5" /> Shared remedy note
            </div>
            <h1 className="font-serif text-2xl font-semibold text-slate-800">
              {canonicalName(note.remedy)}
              {note.abbr && <span className="ml-2 font-mono text-sm text-slate-400">{note.abbr}</span>}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              {note.date && <span>{fmt(note.date)}</span>}
              {note.by && <span>by {note.by}</span>}
            </div>
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">
              {note.body}
            </p>
          </div>
        )}

        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
          <Lock className="h-3 w-3" />
          This note was shared as a private link — its contents live only in the link, not on any
          server.
        </p>
        <Link to="/dashboard" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
          Open HOM-COMPASS →
        </Link>
      </div>
    </div>
  );
}
