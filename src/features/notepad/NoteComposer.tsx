import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import type { NotePlace } from './notepadStore';
import type { PlaceOption } from './places';
import { drafts, useAnnounce } from './notepadUi';

/** What the composer needs to offer "In this chapter". */
export interface ComposerChapter {
  /** Sections a note can be pinned to (empty for Tyler). */
  places: PlaceOption[];
  /** Build a section pin from a section's block key. */
  sectionPlace: (key: string) => NotePlace | null;
  /** Passage the reader selected and tapped "Add note" on. */
  pending: NotePlace | null;
  clearPending: () => void;
}

type Where = 'general' | 'chapter';

/**
 * New note. With a chapter it asks where the note goes: about the remedy in
 * general, or pinned in this chapter (to the selected passage or a section).
 * Unsaved words are kept for the session under `draftKey`, so closing the
 * notepad half-way through a note doesn't lose it. Give the composer a React
 * key per chapter so the section choice starts afresh.
 */
export function NoteComposer({
  chapter,
  generalLabel = 'General',
  placeholder,
  draftKey,
  onSave,
}: {
  chapter?: ComposerChapter;
  generalLabel?: string;
  placeholder?: string;
  draftKey: string;
  onSave: (body: string, place?: NotePlace) => void;
}) {
  const id = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const announce = useAnnounce();
  const [body, setBodyState] = useState(() => drafts.get(`new:${draftKey}`) ?? '');
  const setBody = (b: string) => {
    if (b) drafts.set(`new:${draftKey}`, b);
    else drafts.delete(`new:${draftKey}`);
    setBodyState(b);
  };
  const [where, setWhere] = useState<Where>(chapter?.pending ? 'chapter' : 'general');
  const [section, setSection] = useState('');
  const pending = chapter?.pending ?? null;

  // a freshly selected passage switches to "In this chapter" and starts writing
  useEffect(() => {
    if (!pending) return;
    setWhere('chapter');
    textRef.current?.focus({ preventScroll: true });
  }, [pending]);

  const place: NotePlace | null =
    where !== 'chapter' || !chapter ? null : pending ?? (section ? chapter.sectionPlace(section) : null);
  const canSave = body.trim().length > 0 && (where === 'general' || !!place);
  const dirty = body.length > 0 || !!pending;

  // Save and Cancel disable or disappear once used: keep focus in the text box
  const reset = () => {
    setBody('');
    setSection('');
    chapter?.clearPending();
    textRef.current?.focus();
  };

  const save = () => {
    if (!canSave) return;
    onSave(body.trim(), place ?? undefined);
    reset();
    announce('Note saved');
  };

  return (
    <div className="rounded-xl border border-ink/10 bg-surface p-3">
      <label htmlFor={`${id}-body`} className="mb-2 block text-sm font-semibold text-ink/90">
        New note
      </label>

      {chapter && (
        <div className="mb-3">
          <SegmentedControl
            ariaLabel="Where the note goes"
            fullWidth
            value={where}
            onChange={setWhere}
            options={[
              { value: 'general', label: generalLabel },
              { value: 'chapter', label: 'In this chapter' },
            ]}
          />
          {where === 'chapter' && (
            <div className="mt-3">
              {pending ? (
                <div className="flex items-start gap-2 rounded-lg bg-amber-100 py-2 pl-3 pr-1">
                  <p className="min-w-0 flex-1 py-1 text-sm text-ink/90">
                    <span className="sr-only">Pinned to the passage </span>
                    <span className="line-clamp-3 break-words font-serif">“{pending.quote}”</span>
                  </p>
                  <button
                    type="button"
                    onClick={chapter.clearPending}
                    className="tap flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-medium text-brand-700 hover:bg-ink/[0.06]"
                  >
                    <X className="h-4 w-4" /> Remove
                  </button>
                </div>
              ) : chapter.places.length > 0 ? (
                <>
                  <label htmlFor={`${id}-section`} className="sr-only">
                    Section
                  </label>
                  <select
                    id={`${id}-section`}
                    className="input"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                  >
                    <option value="">Choose a section…</option>
                    {chapter.places.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-ink/70">Or select words in Full text to pin a note to a passage.</p>
                </>
              ) : (
                <p className="rounded-lg bg-ink/[0.04] px-3 py-2 text-sm text-ink/70">
                  Select words in Full text to pin a note there.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <textarea
        id={`${id}-body`}
        ref={textRef}
        data-composer-input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
          // Escape must not close a sheet around a note being written
          else if (e.key === 'Escape' && body.trim()) e.stopPropagation();
        }}
        rows={3}
        placeholder={placeholder}
        className="input resize-y py-2"
      />

      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        {dirty && (
          <button type="button" className="btn-ghost" onClick={reset}>
            Cancel
          </button>
        )}
        <button type="button" className="btn-primary" disabled={!canSave} onClick={save}>
          Save
        </button>
      </div>
      <p className="mt-2 text-xs text-ink/70">Notes are saved on this device and included in your backup.</p>
    </div>
  );
}
