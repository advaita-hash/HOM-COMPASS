import { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { MapPin, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { type PadNote, useNotepad } from './notepadStore';
import { placeLabel } from './places';
import { drafts, useAnnounce } from './notepadUi';

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Where "Show in text" goes: a callback inside the reader, a link elsewhere. */
export type ShowInText = { onClick: () => void } | { to: string };

/**
 * After a card goes away, the card that took its place (or the one before
 * it, or the composer when the list is empty), so focus stays in the notepad.
 */
function focusAfterRemoving(card: HTMLElement | null) {
  const root = card?.closest('[data-notepad]');
  if (!root || !card) return () => {};
  const cards = [...root.querySelectorAll<HTMLElement>('[data-note-id]')];
  const i = cards.indexOf(card);
  const id = (cards[i + 1] ?? cards[i - 1])?.getAttribute('data-note-id');
  return () => {
    const next = id ? root.querySelector<HTMLElement>(`[data-note-id="${CSS.escape(id)}"]`) : null;
    (next ?? root.querySelector<HTMLElement>('[data-composer-input]'))?.focus({ preventScroll: !!next });
  };
}

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
  const announce = useAnnounce();
  // an edit in progress survives the sheet being dismissed (kept for the session)
  const draftKey = `edit:${note.id}`;
  const [draft, setDraftState] = useState<string | null>(() => drafts.get(draftKey) ?? null);
  const setDraft = (d: string | null) => {
    if (d === null) drafts.delete(draftKey);
    else drafts.set(draftKey, d);
    setDraftState(d);
  };
  const [confirm, setConfirm] = useState(false);
  const cancelDelete = useCallback(() => setConfirm(false), []);
  const editId = useId();
  const cardRef = useRef<HTMLLIElement | null>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const editBox = useRef<HTMLTextAreaElement>(null);
  /** Where focus goes on the next render: into the edit box, or back to Edit. */
  const refocus = useRef<'box' | 'button' | null>(null);

  useEffect(() => {
    const box = editBox.current;
    if (refocus.current === 'box' && box) {
      box.focus();
      box.setSelectionRange(box.value.length, box.value.length);
    } else if (refocus.current === 'button') editButton.current?.focus();
    refocus.current = null;
  }, [draft]);

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

  const startEdit = () => {
    refocus.current = 'box';
    setDraft(note.body);
  };
  const stopEdit = () => {
    refocus.current = 'button';
    setDraft(null);
  };
  const save = () => {
    if (draft === null || !draft.trim()) return;
    if (draft.trim() !== note.body) {
      update(note.id, draft.trim());
      announce('Note saved');
    }
    stopEdit();
  };

  // brand-700 on the amber wash of a highlighted card: brand-600 falls under
  // 4.5:1 there in dark mode
  const action = `btn-ghost px-3 text-sm ${highlighted ? 'text-brand-700' : ''}`;

  return (
    <li
      ref={(el) => {
        cardRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
      data-note-id={note.id}
      // focus lands here when a neighbouring card is deleted
      tabIndex={-1}
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
            ref={editBox}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                stopEdit();
              } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
            }}
            rows={Math.min(10, Math.max(3, draft.split('\n').length + 1))}
            className="input resize-y py-2"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={stopEdit}>
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
              <Link to={showInText.to} className={action}>
                <MapPin className="h-4 w-4" /> Show in text
              </Link>
            ) : (
              <button type="button" onClick={showInText.onClick} className={action}>
                <MapPin className="h-4 w-4" /> Show in text
              </button>
            ))}
          <button ref={editButton} type="button" onClick={startEdit} className={action}>
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
              const refocusNext = focusAfterRemoving(cardRef.current);
              setConfirm(false);
              remove(note.id);
              drafts.delete(draftKey);
              announce('Note deleted');
              // after the dialog has handed focus back to the (now gone) Delete button
              window.setTimeout(refocusNext, 0);
            }}
          />,
          document.body,
        )}
    </li>
  );
});
