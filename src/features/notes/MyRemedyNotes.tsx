import { useState } from 'react';
import { Check, Globe, Link2, Loader2, Lock, Trash2 } from 'lucide-react';
import { COMMON_ROOM_URL, usernameOf } from '../../lib/commonRoom';
import CommonRoomSignIn from './CommonRoomSignIn';
import {
  signOutOfCommonRoom,
  useCommonRoomSession,
  useDeleteRemedyNote,
  useRemedyNotes,
} from './useCommonRoom';
import { buildShareUrl, useNoteVisibility } from './shareNote';
import type { RemedyNoteEntry } from '../../lib/commonRoom';

const fmt = (d: string) =>
  new Date(d.length === 10 ? d + 'T00:00' : d).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** One note with its private/public toggle and share link. */
function NoteItem({
  note,
  remedy,
  abbr,
  by,
  onDelete,
}: {
  note: RemedyNoteEntry;
  remedy: string;
  abbr: string;
  by: string;
  onDelete: () => void;
}) {
  const isPublic = useNoteVisibility((s) => !!s.publicIds[note.id]);
  const setPublic = useNoteVisibility((s) => s.setPublic);
  const [copied, setCopied] = useState(false);

  const shareUrl = buildShareUrl({
    v: 1,
    remedy,
    abbr,
    body: note.body,
    date: note.visit_date ?? note.created_at,
    by,
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the link is still shown below */
    }
  }

  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-start gap-3">
        <span className="shrink-0 font-mono text-xs text-slate-400">
          {fmt(note.visit_date ?? note.created_at)}
        </span>
        <span className="flex-1 text-sm text-slate-800">{note.body}</span>
        <button
          className="text-slate-300 hover:text-red-600"
          title="Delete this note"
          aria-label="Delete this note"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
        <button
          onClick={() => setPublic(note.id, !isPublic)}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            isPublic
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
          title={isPublic ? 'Shared by link — click to make private' : 'Private — click to share by link'}
        >
          {isPublic ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {isPublic ? 'Public (link)' : 'Private'}
        </button>

        {isPublic && (
          <>
            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 truncate rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-500"
            />
          </>
        )}
      </div>
    </li>
  );
}

/** One remedy's own notes, newest last, as written in Common Room ("Puls - …" lines). */
export default function MyRemedyNotes({ remedy, abbr }: { remedy: string; abbr: string }) {
  const session = useCommonRoomSession();
  const notes = useRemedyNotes(session?.user.id, remedy);
  const del = useDeleteRemedyNote();

  if (session === undefined) return <Loader2 className="h-4 w-4 animate-spin text-slate-400" />;
  if (!session) return <CommonRoomSignIn />;

  const by = usernameOf(session.user.email);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Signed in to Common Room as {by}</span>
        <button className="underline" onClick={() => signOutOfCommonRoom()}>
          Sign out
        </button>
      </div>
      {notes.isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      ) : notes.error ? (
        <p className="text-sm text-red-600">Could not load your notes. {(notes.error as Error).message}</p>
      ) : !notes.data?.length ? (
        <p className="text-sm text-slate-500">
          No notes on {abbr} yet. In Common Room's OPD notes, start a line with “{abbr} -” and what you
          observed, e.g. “{abbr} - weepy, thirstless”. It appears here.
        </p>
      ) : (
        <ol className="space-y-2">
          {notes.data.map((n) => (
            <NoteItem
              key={n.id}
              note={n}
              remedy={remedy}
              abbr={abbr}
              by={by}
              onDelete={() => confirm('Delete this note?') && del.mutate(n.id)}
            />
          ))}
        </ol>
      )}
      <a
        className="text-xs text-slate-500 underline"
        href={COMMON_ROOM_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Write notes in Common Room
      </a>
    </div>
  );
}
