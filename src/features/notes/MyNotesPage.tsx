import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Loader2, NotebookPen, StickyNote } from 'lucide-react';
import ABBREV from '../../data/remedyAbbrev.json';
import { canonicalName } from '../../lib/remedyName';
import { COMMON_ROOM_URL, usernameOf } from '../../lib/commonRoom';
import { EmptyState } from '../../components/ui/EmptyState';
import { BOOKS } from '../books/booksIndex';
import { noteBook, useNotepad, type PadNote } from '../notepad/notepadStore';
import { bookHref, bookLabel, remedyHref } from '../notepad/links';
import { placeLabel } from '../notepad/places';
import { remedyKeyLabel } from '../notepad/remedyKey';
import CommonRoomSignIn from './CommonRoomSignIn';
import { signOutOfCommonRoom, useCommonRoomSession, useRemedyNotes } from './useCommonRoom';

const TABLE = ABBREV as unknown as Record<string, [string] | [string, string[]]>;
const DAY_MS = 24 * 60 * 60 * 1000;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "Today", "Yesterday", "3 days ago", or a date once it's more than a month old. */
function edited(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / DAY_MS);
  if (days < 0 || days > 30) return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const rel = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-days, 'day');
  return rel.charAt(0).toUpperCase() + rel.slice(1);
}

/** One line of a note for a list: its words, or where it is pinned when it has none yet. */
const preview = (n: PadNote) => n.body.trim().replace(/\s+/g, ' ') || (n.place ? placeLabel(n.place) : 'Empty note');

interface RemedyFile {
  key: string;
  name: string;
  /** Book a book-only remedy belongs to (e.g. Allen's bowel nosodes). */
  book: string | null;
  count: number;
  latest: PadNote;
}

interface BookFile {
  id: string;
  count: number;
}

/** The notepad, grouped by remedy and by book. */
function useNotepadFiles() {
  const notes = useNotepad((s) => s.notes);
  return useMemo(() => {
    const remedies = new Map<string, RemedyFile>();
    const books = new Map<string, BookFile>();
    for (const n of notes) {
      if (n.remedy) {
        const f = remedies.get(n.remedy);
        if (!f) {
          const scoped = n.remedy.startsWith('book:') ? n.remedy.split(':')[1] ?? null : null;
          remedies.set(n.remedy, { key: n.remedy, name: remedyKeyLabel(n.remedy, n.remedyName), book: scoped, count: 1, latest: n });
        } else {
          f.count++;
          if (n.updatedAt >= f.latest.updatedAt) f.latest = n;
        }
      }
      const b = noteBook(n);
      if (b) books.set(b, { id: b, count: (books.get(b)?.count ?? 0) + 1 });
    }
    // books in catalogue order; any the build doesn't know (old backup) last
    const order = (id: string) => {
      const i = BOOKS.findIndex((m) => m.id === id);
      return i < 0 ? BOOKS.length : i;
    };
    return {
      total: notes.length,
      remedies: [...remedies.values()].sort((a, b) => b.latest.updatedAt.localeCompare(a.latest.updatedAt)),
      books: [...books.values()].sort((a, b) => order(a.id) - order(b.id)),
    };
  }, [notes]);
}

function GroupHeading({ children }: { children: string }) {
  return <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wide text-ink/70">{children}</h3>;
}

/** The practitioner's own notes on this device: remedies and books. */
function Notepad() {
  const { total, remedies, books } = useNotepadFiles();

  if (!total) {
    return (
      <div className="card">
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          description={
            <>
              Open a remedy in Reference Books and tap Notes, or select words in Full text to pin a note to that
              passage. You can also use the Notes tab on a remedy’s page.
            </>
          }
          action={
            <Link className="btn-primary" to="/books">
              Open Reference Books
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {remedies.length > 0 && (
        <div>
          <GroupHeading>Remedies</GroupHeading>
          <ul className="card divide-y divide-ink/10 overflow-hidden">
            {remedies.map((f) => (
              <li key={f.key}>
                <Link
                  to={remedyHref(f.key)}
                  className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 active:bg-slate-100"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate font-medium text-ink/90">{f.name}</span>
                      {f.book && (
                        <span className="shrink-0 text-2xs uppercase tracking-wide text-ink/70">{bookLabel(f.book)}</span>
                      )}
                    </span>
                    <span className="block truncate text-sm text-ink/70">{preview(f.latest)}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-ink/70">
                    <span className="block">{plural(f.count, 'note')}</span>
                    <span className="block">{edited(f.latest.updatedAt)}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink/30" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {books.length > 0 && (
        <div>
          <GroupHeading>Books</GroupHeading>
          <ul className="card divide-y divide-ink/10 overflow-hidden">
            {books.map((b) => {
              const meta = BOOKS.find((m) => m.id === b.id);
              return (
                <li key={b.id}>
                  <Link
                    to={bookHref(b.id)}
                    className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 active:bg-slate-100"
                  >
                    <span
                      className={`h-10 w-8 shrink-0 rounded-md bg-gradient-to-br ${meta?.cover ?? 'from-slate-300 to-slate-400'}`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink/90">{meta?.title ?? bookLabel(b.id)}</span>
                      {meta && <span className="block truncate text-sm text-ink/70">{meta.author}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-ink/70">{plural(b.count, 'note')}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink/30" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Notes on this device, then the student's remedy notes from Common Room. */
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
    <div className="page space-y-8">
      <header className="flex items-center gap-2">
        <NotebookPen className="h-5 w-5 text-brand-600" />
        <h1 className="text-2xl font-semibold text-ink/90">My notes</h1>
      </header>

      <section aria-labelledby="notepad-heading">
        <div className="mb-4">
          <h2 id="notepad-heading" className="text-lg font-semibold text-ink/90">
            Notepad
          </h2>
          <p className="text-sm text-ink/70">Saved on this device</p>
        </div>
        <Notepad />
      </section>

      <section aria-labelledby="common-room-heading">
        <h2 id="common-room-heading" className="mb-4 text-lg font-semibold text-ink/90">
          From Common Room
        </h2>
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
      </section>
    </div>
  );
}
