import { Loader2, Trash2 } from 'lucide-react';
import { COMMON_ROOM_URL, usernameOf } from '../../lib/commonRoom';
import CommonRoomSignIn from './CommonRoomSignIn';
import {
  signOutOfCommonRoom,
  useCommonRoomSession,
  useDeleteRemedyNote,
  useRemedyNotes,
} from './useCommonRoom';

const fmt = (d: string) =>
  new Date(d.length === 10 ? d + 'T00:00' : d).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** One remedy's own notes, newest last, as written in Common Room ("Puls - …" lines). */
export default function MyRemedyNotes({ remedy, abbr }: { remedy: string; abbr: string }) {
  const session = useCommonRoomSession();
  const notes = useRemedyNotes(session?.user.id, remedy);
  const del = useDeleteRemedyNote();

  if (session === undefined) return <Loader2 className="h-4 w-4 animate-spin text-slate-400" />;
  if (!session) return <CommonRoomSignIn />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Signed in to Common Room as {usernameOf(session.user.email)}</span>
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
            <li key={n.id} className="group flex items-start gap-3 rounded-lg border border-slate-200 p-3">
              <span className="shrink-0 font-mono text-xs text-slate-400">
                {fmt(n.visit_date ?? n.created_at)}
              </span>
              <span className="flex-1 text-sm text-slate-800">{n.body}</span>
              <button
                className="text-slate-300 hover:text-red-600"
                title="Delete this note"
                aria-label="Delete this note"
                onClick={() => confirm('Delete this note?') && del.mutate(n.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
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
