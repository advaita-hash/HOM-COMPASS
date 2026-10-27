import { forwardRef, useCallback, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { MapPin, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { type PadNote, useNotepad } from './notepadStore';
import { placeLabel } from './places';

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Where "Show in text" goes: a callback inside the reader, a link elsewhere. */
export type ShowInText = { onClick: () => void } | { to: string };

/** Deep link to a pinned note in the reader (see the URL contract in BookReaderPage). */
export const noteHref = (n: PadNote) =>
  n.place ? `/books/${n.place.book}/${n.place.slug}?note=${encodeURIComponent(n.id)}` : undefined;

/**
 * One note: its words, a quiet line saying where it is pinned and when it was
 * written, and Edit / Delete (plus "Show in text" for pinned notes). Editing
 * happens in place; deleting always asks first.
 */
export const NoteCard = forwardRef<
  HTMLLIElement,
  {
    note: PadNote;
    /** Prefix for the meta line, e.g. the book a pinned note lives in. */
    source?: string;
    showInText?: ShowInText;
    /** Draws attention to the card (opened from a marker or a link). */
    highlighted?: boolean;
    /** Hide the place label (e.g. when the list is already grouped by it). */
    hidePlace?: boolean;
  }
>(function NoteCard({ note, source, showInText, highlighted = false, hidePlace = false }, ref) {
  const update = useNotepad((s) => s.update);
  const remove = useNotepad((s) => s.remove);
  const [draft, setDraft] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const cancelDelete = useCallback(() => setConfirm(false), []);
  const editId = useId();

  // Escape cancels the delete without also closing a sheet around the card
  // (both listen on window; this runs first, on document)
  useEffect(() => {
    if (!confirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setConfirm(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirm]);

  const edited = note.updatedAt !== note.createdAt;
  const meta = [
    source,
    note.place && !hidePlace ? placeLabel(note.place) : null,
    `${edited ? 'Edited' : 'Added'} ${fmtDate(note.updatedAt)}`,
  ].filter(Boolean);

  const save = () => {
    if (draft === null || !draft.trim()) return;
    if (draft !== note.body) update(note.id, draft.trim());
    setDraft(null);
  };

  return (
    <li
      ref={ref}
      data-note-id={note.id}
      className={`rounded-xl border p-3 transition-shadow ${
        highlighted ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-400/50' : 'border-ink/10 bg-surface'
      }`}
    >
      {draft === null ? (
        <p className="whitespace-pre-wrap break-words text-subhead text-ink/90">{note.body}</p>
      ) : (
        <div>
          <label htmlFor={editId} className="sr-only">
            Edit note
          </label>
          <textarea
            id={editId}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setDraft(null);
              } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
            }}
            rows={Math.min(10, Math.max(3, draft.split('\n').length + 1))}
            className="input resize-y py-2"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!draft.trim() || draft.trim() === note.body}
              onClick={save}
            >
              Save
            </button>
          </div>
        </div>
      )}

      <p className="mt-2 break-words text-xs text-ink/70">{meta.join(' · ')}</p>

      {draft === null && (
        <div className="-mb-2 -ml-3 mt-1 flex flex-wrap items-center">
          {showInText &&
            ('to' in showInText ? (
              <Link to={showInText.to} className="btn-ghost px-3 text-sm">
                <MapPin className="h-4 w-4" /> Show in text
              </Link>
            ) : (
              <button type="button" onClick={showInText.onClick} className="btn-ghost px-3 text-sm">
                <MapPin className="h-4 w-4" /> Show in text
              </button>
            ))}
          <button type="button" onClick={() => setDraft(note.body)} className="btn-ghost px-3 text-sm">
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="btn-ghost px-3 text-sm text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      )}

      {/* in <body>, above any sheet the card sits in */}
      {confirm &&
        createPortal(
          <ConfirmDialog
            open
            title="Delete this note?"
            message="It will be removed from this device. This can’t be undone."
            confirmLabel="Delete"
            destructive
            onCancel={cancelDelete}
            onConfirm={() => {
              setConfirm(false);
              remove(note.id);
            }}
          />,
          document.body,
        )}
    </li>
  );
});
