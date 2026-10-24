import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, NotebookPen } from 'lucide-react';
import ABBREV from '../../data/remedyAbbrev.json';
import { canonicalName } from '../../lib/remedyName';
import { COMMON_ROOM_URL, usernameOf } from '../../lib/commonRoom';
import { EmptyState } from '../../components/ui/EmptyState';
import CommonRoomSignIn from './CommonRoomSignIn';
import { signOutOfCommonRoom, useCommonRoomSession, useRemedyNotes } from './useCommonRoom';

const TABLE = ABBREV as unknown as Record<string, [string] | [string, string[]]>;

/** Every remedy the student keeps notes on: one file per remedy. */
export default function MyNotesPage() {
  const session = useCommonRoomSession();
  const notes = useRemedyNotes(session?.user.id);
  const files = useMemo(() => {
    const m = new Map<string, { remedy: string; count: number; last: string; latest: string }>();
    for (const n of notes.data ?? []) {
      const f = m.get(n.remedy) ?? {
        remedy: n.remedy,
        count: 0,
        last: n.updated_at,
        latest: n.body,
      };
      f.count++;
      if (n.updated_at >= f.last) {
        f.last = n.updated_at;
        f.latest = n.body;
      }
      m.set(n.remedy, f);
    }
    return [...m.values()].sort((a, b) => b.last.localeCompare(a.last));
  }, [notes.data]);

  return (
    <div className="page space-y-5">
      <header className="flex items-center gap-2">
        <NotebookPen className="h-5 w-5 text-brand-600" />
        <h1 className="text-2xl font-semibold text-ink/90">My remedy notes</h1>
      </header>
      <div className="card p-5">
        {session === undefined ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : !session ? (
          <CommonRoomSignIn />
        ) : notes.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>Signed in to Common Room as {usernameOf(session.user.email)}</span>
              <button className="underline" onClick={() => signOutOfCommonRoom()}>
                Sign out
              </button>
            </div>
            {!files.length ? (
              <EmptyState
                icon={NotebookPen}
                title="No remedy notes yet"
                description="In Common Room’s OPD notes, start a line with a remedy and a dash — “Puls - weepy, thirstless” — and it’s filed here under that remedy."
                action={
                  <a className="btn-primary" href={COMMON_ROOM_URL} target="common-room" rel="noopener noreferrer">
                Open Common Room
              </a>
                }
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {files.map((f) => (
                  <li key={f.remedy}>
                    <Link
                      to={`/remedy/${encodeURIComponent(f.remedy)}?tab=notes`}
                      className="flex items-baseline gap-3 py-3 hover:bg-slate-50"
                    >
                      <span className="w-20 shrink-0 font-mono text-sm font-semibold text-brand-700">
                        {TABLE[f.remedy]?.[0] ?? ''}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-slate-800">{canonicalName(f.remedy)}</span>
                        <span className="block truncate text-sm text-slate-500">{f.latest}</span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {f.count} {f.count === 1 ? 'note' : 'notes'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
