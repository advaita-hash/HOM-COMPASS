import { useCallback, useState } from 'react';
import { AlertTriangle, Check, Globe, Link2, Loader2, Lock, Trash2 } from 'lucide-react';
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
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { NotebookPen } from 'lucide-react';

const fmt = (d: string) =>
  new Date(d.length === 10 ? d + 'T00:00' : d).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const NO_IDENTIFIERS = 'Don’t include patient names or other identifying details in shared notes.';

/**
 * One note with its share toggle and link. Creating a link takes a snapshot
 * of the note that anyone with the link can read; it can't be withdrawn.
 * Switching back to private only hides the share option on this device.
 */
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
  const [confirmShare, setConfirmShare] = useState(false);
  const cancelShare = useCallback(() => setConfirmShare(false), []);

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
          className="tap rounded-full p-1 text-ink/30 transition-colors hover:bg-red-50 hover:text-red-600"
          title="Delete this note"
          aria-label="Delete this note"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
        <button
          onClick={() => (isPublic ? setPublic(note.id, false) : setConfirmShare(true))}
          className={`tap inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            isPublic
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
          title={
            isPublic
              ? 'Hide the share option on this device. Links you already sent keep working.'
              : 'Create a share link: a snapshot of this note that anyone with the link can read. It can’t be withdrawn later.'
          }
        >
          {isPublic ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {isPublic ? 'Link created' : 'Private — create share link'}
        </button>

        {isPublic && (
          <>
            <button
              onClick={copy}
              className="tap inline-flex items-center gap-2 rounded-full bg-accent/[0.12] px-3 py-1 text-xs font-medium text-brand-700 hover:bg-accent/[0.18]"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 truncate rounded border border-slate-200 bg-slate-50 px-2 py-1 text-2xs text-slate-500"
            />
            <p className="w-full text-2xs leading-relaxed text-ink/60">
              Anyone with this link can read this snapshot of the note. It can’t be withdrawn —
              switching back to private only hides the link on this device.
            </p>
            <p className="flex w-full items-start gap-1 text-2xs leading-relaxed text-amber-700">
              <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden />
              {NO_IDENTIFIERS}
            </p>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmShare}
        title="Create share link?"
        message={
          <>
            Anyone with the link will be able to read this note as it is now. Once sent, the link
            can’t be withdrawn. {NO_IDENTIFIERS}
          </>
        }
        confirmLabel="Create link"
        onConfirm={() => {
          setPublic(note.id, true);
          setConfirmShare(false);
        }}
        onCancel={cancelShare}
      />
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
        <EmptyState
          className="py-8"
          icon={NotebookPen}
          title={`No notes on ${abbr} yet`}
          description={<>In Common Room’s OPD notes, start a line with “{abbr} -” and what you observed — e.g. “{abbr} - weepy, thirstless” — and it appears here.</>}
          action={
            <a className="btn-primary" href={COMMON_ROOM_URL} target="common-room" rel="noopener noreferrer">
              Open Common Room
            </a>
          }
        />
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
        target="common-room"
        rel="noopener noreferrer"
      >
        Write notes in Common Room
      </a>
    </div>
  );
}
