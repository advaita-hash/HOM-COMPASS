import { type RefObject, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, NotebookPen, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { type PadNote, useNotepad } from './notepadStore';
import { placeLabel } from './places';
import { fmtDate } from './NoteCard';
import { NOTE_FIELD, ScribbleHint } from './notepadUi';
import { TONES, colorOf } from './noteColors';
import { NoteColorPicker } from './NoteColorPicker';

// ---------------------------------------------------------------------------
// A pinned note opened from its marker in Full text: a small sticky note
// anchored above the marker (below it when there's no room under the top
// bar), in the note's colour, edited in place.
//
// Popover behaviour (HIG): focus moves in on open and back to the marker on
// close; Escape, the X or a tap outside closes it, saving first; it follows
// the marker while the reader scrolls or resizes and closes once the marker
// leaves the reader. Several notes on one marker get a pager.
//
// When the reader is too short for the sticky on either side of its marker,
// opening it scrolls the reader once to make room; after that (the reader
// scrolled by hand, a long note growing) the text box shrinks to the room on
// the roomier side and scrolls inside, so the marker stays visible.
//
// The text box is a plain <textarea> (NOTE_FIELD) so Apple Pencil Scribble
// works in it; see notepadUi.tsx before changing anything around it.
// ---------------------------------------------------------------------------

const W = 320;
/** Space between the marker and the sticky (the tail sits in it). */
const GAP = 12;
/** Kept clear of the reader's edges. */
const GUTTER = 16;
const SAVE_DELAY = 500;
/** The text box's smallest height (min-h-[88px]). */
const TEXT_MIN = 88;
/** A link's sticky whose marker never comes into view gives up after this. */
const REVEAL_TIMEOUT = 2000;

export interface StickyCloseOptions {
  /** Put focus back on the marker (not when closed by a tap elsewhere). */
  restoreFocus: boolean;
}

const coarse = () => !!window.matchMedia?.('(pointer: coarse)').matches;
/** The bottom safe-area inset (home indicator in a home-screen app), in px. */
let sabProbe: HTMLDivElement | null = null;
const safeBottom = () => {
  if (!sabProbe || !sabProbe.isConnected) {
    sabProbe = document.createElement('div');
    sabProbe.setAttribute('aria-hidden', 'true');
    sabProbe.style.cssText =
      'position:fixed;left:0;bottom:0;width:0;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none';
    document.body.appendChild(sabProbe);
  }
  return sabProbe.offsetHeight;
};
const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const markerFor = (root: HTMLElement | null, id: string) =>
  root?.querySelector<HTMLElement>(`button[data-notes~="${CSS.escape(id)}"]`) ?? null;

export function StickyNotePopover({
  ids,
  id,
  onIdChange,
  scroller,
  focusText,
  reveal = false,
  onClose,
  onOpenAll,
}: {
  /** The notes on the marker, in its order. */
  ids: string[];
  /** The one shown. */
  id: string;
  onIdChange: (id: string) => void;
  /** The reader's scrolling column: bounds the sticky and holds the markers. */
  scroller: RefObject<HTMLElement>;
  /** Start in the text box (keyboard, mouse) rather than on the sticky (touch, links). */
  focusText: boolean;
  /**
   * Opened from a link ("Show in text", ?note=): bring the marker into view
   * with room for the sticky beside it. A tapped marker is already in view.
   */
  reveal?: boolean;
  onClose: (o: StickyCloseOptions) => void;
  /** "All notes": the Notes sheet, on this note. */
  onOpenAll: (id: string) => void;
}) {
  const all = useNotepad((s) => s.notes);
  const setColor = useNotepad((s) => s.setColor);
  const remove = useNotepad((s) => s.remove);
  const list = useMemo(() => ids.map((i) => all.find((n) => n.id === i)).filter((n): n is PadNote => !!n), [ids, all]);
  const index = Math.max(
    0,
    list.findIndex((n) => n.id === id),
  );
  const note: PadNote | undefined = list[index];

  const boxRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const [side, setSide] = useState<'above' | 'below'>('above');
  const [confirm, setConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  /** Spoken (only) when the pager shows another note. */
  const [spoken, setSpoken] = useState('');
  const spokenTimer = useRef(0);
  const savedTimer = useRef(0);
  /** The marker has been on screen (a link may still be scrolling to it). */
  const seen = useRef(false);
  const focused = useRef(false);
  const closing = useRef(false);
  /** The first placement has run (and made room if it had to). */
  const placedOnce = useRef(false);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const close = useCallback((o: StickyCloseOptions) => {
    if (closing.current) return;
    closing.current = true;
    onCloseRef.current(o);
  }, []);

  // ---- text: edited in place, saved as you go -------------------------------
  const update = useNotepad((s) => s.update);
  const [text, setText] = useState(note?.body ?? '');
  const textNow = useRef(text);
  const editingId = useRef<string | undefined>(note?.id);
  const saveTimer = useRef(0);

  /** Save what's typed (never an empty note: delete is for that). */
  const flush = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = 0;
    const nid = editingId.current;
    const body = textNow.current.trim();
    const current = useNotepad.getState().notes.find((n) => n.id === nid);
    if (!nid || !current || !body || body === current.body) return;
    update(nid, body);
    setSaved(true);
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 2500);
  }, [update]);

  // another note on the marker (pager, delete): save this one, load that one
  useEffect(() => {
    if (!note || editingId.current === note.id) return;
    flush();
    editingId.current = note.id;
    textNow.current = note.body;
    setText(note.body);
    setSaved(false);
    // focus stays on the pager button, so say which note is showing now
    if (list.length > 1) {
      setSpoken('');
      window.clearTimeout(spokenTimer.current);
      spokenTimer.current = window.setTimeout(() => setSpoken(`Note ${index + 1} of ${list.length}`), 60);
    }
  }, [note, flush, index, list.length]);

  // closing, or the marker going away, saves first
  useEffect(
    () => () => {
      flush();
      window.clearTimeout(savedTimer.current);
      window.clearTimeout(spokenTimer.current);
    },
    [flush],
  );

  const onType = (v: string) => {
    textNow.current = v;
    setText(v);
    setSaved(false);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(flush, SAVE_DELAY);
  };

  // grows with its words, up to a limit (then it scrolls)
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [text, note?.id]);

  // ---- placement -----------------------------------------------------------
  const focusInitial = useCallback(() => {
    if (focused.current) return;
    focused.current = true;
    const t = textRef.current;
    if (focusText && t) {
      t.focus({ preventScroll: true });
      t.setSelectionRange(t.value.length, t.value.length);
    } else boxRef.current?.focus({ preventScroll: true });
  }, [focusText]);

  const place = useCallback(() => {
    const box = boxRef.current;
    const sc = scroller.current;
    if (!box || !sc || !note || closing.current) return;
    const marker = markerFor(sc, note.id);
    if (!marker) {
      // the view changed under it (Drug picture, another chapter)
      close({ restoreFocus: false });
      return;
    }
    let m = marker.getBoundingClientRect();
    const v = sc.getBoundingClientRect();
    const w = Math.min(W, v.width - GUTTER * 2, window.innerWidth - GUTTER * 2);
    box.style.width = `${w}px`;
    const top0 = Math.max(v.top, 0) + 8;
    // kept above the home indicator (env(safe-area-inset-bottom)) in a home-screen app
    const bottom0 = Math.min(v.bottom, window.innerHeight - safeBottom()) - 8;
    // the sticky's height with its text box at full size (up to 40vh), so a
    // text box shrunk to fit below doesn't change where it goes
    const ta = textRef.current;
    const taNow = ta?.offsetHeight ?? 0;
    const taFull = ta
      ? Math.max(TEXT_MIN, Math.min(parseFloat(ta.style.height) || taNow, window.innerHeight * 0.4))
      : 0;
    const hFull = box.offsetHeight - taNow + taFull;

    // opening: make room on one side of the marker if there is none (a link
    // also brings the marker into view, centred when the sticky fits)
    if (!placedOnce.current) {
      placedOnce.current = true;
      // with the marker's top at `mTop` the marker shows, and so does the sticky on one side
      const fitsAt = (mTop: number) =>
        mTop >= top0 &&
        mTop + m.height <= bottom0 &&
        (mTop - GAP - hFull >= top0 || mTop + m.height + GAP + hFull <= bottom0);
      const max = sc.scrollHeight - sc.clientHeight;
      // the reader's scroll that puts the marker's top at `y` (as near as it goes)
      const scrollFor = (y: number) => Math.max(0, Math.min(sc.scrollTop + (m.top - y), max));
      const lands = (to: number) => m.top - (to - sc.scrollTop);
      // where the marker could go: centred (a link) or where it is, nudged
      // just inside the margins (a tap); then just low enough for the sticky
      // above it, or just high enough for it below. A link takes the first
      // that fits; a tap the one that scrolls least
      const here = Math.max(top0, Math.min(m.top, bottom0 - m.height));
      const tries = [
        reveal ? top0 + (bottom0 - top0 - m.height) / 2 : here,
        top0 + GAP + hFull + 2,
        bottom0 - GAP - hFull - m.height - 2,
      ].map(scrollFor);
      const fits = tries.filter((t) => fitsAt(lands(t)));
      const to = reveal
        ? (fits[0] ?? tries[0])
        : ([...fits].sort((a, b) => Math.abs(a - sc.scrollTop) - Math.abs(b - sc.scrollTop))[0] ?? tries[0]);
      if (Math.abs(to - sc.scrollTop) > 1) {
        // the scroll moves the marker, and placing follows it
        sc.scrollTo({ top: to, behavior: reveal && !reducedMotion() ? 'smooth' : 'auto' });
        m = marker.getBoundingClientRect();
      }
    }

    const inView = m.width > 0 && m.bottom > v.top && m.top < v.bottom;
    if (inView) seen.current = true;
    else if (seen.current) {
      // scrolled away: close, unless someone is typing with an on-screen
      // keyboard (which can push the marker off by resizing the page)
      const typing = coarse() && document.activeElement === textRef.current;
      if (!typing) {
        close({ restoreFocus: false });
        return;
      }
    } else {
      box.style.visibility = 'hidden';
      return;
    }

    const roomAbove = m.top - GAP - top0;
    const roomBelow = bottom0 - m.bottom - GAP;
    let s: 'above' | 'below' = 'above';
    if (hFull > roomAbove && (hFull <= roomBelow || roomBelow > roomAbove)) s = 'below';
    const room = s === 'above' ? roomAbove : roomBelow;
    // no room either side: the text box shrinks (and scrolls) to fit
    if (ta) ta.style.maxHeight = hFull > room ? `${Math.max(TEXT_MIN, Math.floor(taFull - (hFull - room)))}px` : '';
    const h = box.offsetHeight;
    const cx = m.left + m.width / 2;
    const minLeft = Math.max(v.left, 0) + GUTTER;
    const maxLeft = Math.min(v.right, window.innerWidth) - GUTTER - w;
    const left = Math.max(minLeft, Math.min(cx - w / 2, maxLeft));
    const want = s === 'above' ? m.top - GAP - h : m.bottom + GAP;
    // still too tall (a very short reader): kept on screen, over the marker
    const top = Math.max(top0, Math.min(want, bottom0 - h));
    const attached = Math.abs(top - want) < 1;
    box.style.left = `${Math.round(left)}px`;
    box.style.top = `${Math.round(top)}px`;
    box.style.visibility = 'visible';
    setSide(s);
    const tail = tailRef.current;
    if (tail) {
      tail.style.left = `${Math.round(Math.max(20, Math.min(cx - left, w - 20)) - 8)}px`;
      tail.style.display = inView && attached ? '' : 'none';
    }
    focusInitial();
  }, [scroller, note, close, focusInitial, reveal]);

  useLayoutEffect(() => {
    place();
  });

  useEffect(() => {
    let frame = 0;
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    document.addEventListener('scroll', later, { capture: true, passive: true });
    window.addEventListener('resize', later);
    window.visualViewport?.addEventListener('resize', later);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(later) : null;
    if (boxRef.current) ro?.observe(boxRef.current);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('scroll', later, { capture: true });
      window.removeEventListener('resize', later);
      window.visualViewport?.removeEventListener('resize', later);
      ro?.disconnect();
    };
  }, [place]);

  // a link whose marker never scrolled into view (a passage taller than the
  // reader, say): don't stay open unseen, catching Escape and taps
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!seen.current) close({ restoreFocus: false });
    }, REVEAL_TIMEOUT);
    return () => window.clearTimeout(t);
  }, [close]);

  // no notes left on the marker (deleted elsewhere)
  useEffect(() => {
    if (!note) close({ restoreFocus: true });
  }, [note, close]);

  // ---- dismissal: Escape, a tap elsewhere ------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[role="alertdialog"]')) return;
      e.preventDefault();
      close({ restoreFocus: true });
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t || boxRef.current?.contains(t) || document.querySelector('[role="alertdialog"]')) return;
      // a marker opens / toggles its own sticky on click
      if (t.closest?.('button[data-notes]')) return;
      close({ restoreFocus: false });
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [close]);

  // Tab stays inside while it's open
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !boxRef.current) return;
    const items = [
      ...boxRef.current.querySelectorAll<HTMLElement>('button, textarea, [tabindex]:not([tabindex="-1"])'),
    ].filter((el) => !el.matches(':disabled') && el.getClientRects().length > 0);
    if (!items.length) return;
    const [first, last] = [items[0], items[items.length - 1]];
    const at = document.activeElement;
    if (e.shiftKey && (at === first || at === boxRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && at === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const cancelDelete = useCallback(() => setConfirm(false), []);

  if (!note) return null;
  const tone = TONES[colorOf(note)];
  const many = list.length > 1;
  const edited = note.updatedAt !== note.createdAt;
  const go = (by: number) => onIdChange(list[(index + by + list.length) % list.length].id);
  const iconBtn =
    'tap flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink/70 transition-colors hover:bg-ink/[0.08] hover:text-ink/90';

  return createPortal(
    <>
      <div
        ref={boxRef}
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        // markers and selection treat the sticky as note UI (never a passage)
        data-note-ui
        data-sticky-note={note.id}
        onKeyDown={trapTab}
        style={{ position: 'fixed', left: 0, top: 0, width: W, visibility: 'hidden' }}
        className={`z-40 rounded-xl border p-3 shadow-[0_12px_32px_rgb(var(--shadow)/0.18),0_2px_6px_rgb(var(--shadow)/0.1)] focus:outline-none ${tone.paper} ${
          side === 'above' ? 'origin-bottom' : 'origin-top'
        } animate-dialog-in`}
      >
        {/* header: which note (pager) and Close */}
        <div className="flex items-center gap-3">
          <h2
            id={titleId}
            className="min-w-0 flex-1 truncate pl-1 text-xs font-semibold uppercase tracking-wide text-ink/70"
          >
            {many ? `Note ${index + 1} of ${list.length}` : 'Note'}
          </h2>
          {many && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label="Previous note" className={iconBtn}>
                <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Next note" className={iconBtn}>
                <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => close({ restoreFocus: true })}
            aria-label="Close note"
            className={`${iconBtn} bg-ink/[0.06]`}
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <label htmlFor={`${titleId}-text`} className="sr-only">
          Note text
        </label>
        <textarea
          id={`${titleId}-text`}
          ref={textRef}
          value={text}
          onChange={(e) => onType(e.target.value)}
          onBlur={flush}
          rows={3}
          placeholder="Write a note"
          {...NOTE_FIELD}
          // 16px text: iOS doesn't zoom, and Scribble writes at reading size
          className="mt-2 block max-h-[40vh] min-h-[88px] w-full resize-none rounded-lg border border-transparent bg-transparent py-2 pl-[3px] pr-1 font-sans text-base leading-normal text-ink/90 focus:bg-white/40 dark:focus:bg-black/10"
        />
        <ScribbleHint show={!text} />
        {!text.trim() && (
          <p className="mt-2 px-1 text-xs text-ink/70">Empty notes aren’t saved. To remove this note, use Delete.</p>
        )}

        <p className="mt-2 flex min-w-0 flex-wrap gap-x-1 px-1 text-xs text-ink/70">
          {note.place && <span className="min-w-0 max-w-full truncate">{placeLabel(note.place)} ·</span>}
          <span>
            {edited ? 'Edited' : 'Added'} {fmtDate(note.updatedAt)}
          </span>
          <span aria-live="polite">{saved ? '· Saved' : ''}</span>
        </p>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {spoken}
        </span>

        <NoteColorPicker className="-ml-1 mt-1" value={colorOf(note)} onChange={(c) => setColor(note.id, c)} />

        <div className="-mb-1 mt-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="btn-ghost -ml-2 px-3 text-sm text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <button
            type="button"
            onClick={() => {
              flush();
              onOpenAll(note.id);
            }}
            className="btn-ghost -mr-2 px-3 text-sm text-brand-700"
          >
            <NotebookPen className="h-4 w-4" /> All notes
          </button>
        </div>

        {/* the tail, pointing at the marker */}
        <span
          ref={tailRef}
          aria-hidden
          className={`absolute h-4 w-4 rotate-45 ${tone.paper} ${
            side === 'above' ? 'border-b border-r' : 'border-l border-t'
          }`}
          style={side === 'above' ? { bottom: -8 } : { top: -8 }}
        />
      </div>

      {/* beside the sticky, not in it: its transform would trap a fixed dialog */}
      {confirm && (
        <ConfirmDialog
          open
          title="Delete this note?"
          message="It will be removed from this device. This can’t be undone."
          confirmLabel="Delete"
          destructive
          onCancel={cancelDelete}
          onConfirm={() => {
            const next = many ? list[(index + 1) % list.length].id : null;
            setConfirm(false);
            // nothing left to save for it
            editingId.current = undefined;
            window.clearTimeout(saveTimer.current);
            remove(note.id);
            if (next) {
              onIdChange(next);
              window.setTimeout(() => boxRef.current?.focus({ preventScroll: true }), 0);
            } else close({ restoreFocus: true });
          }}
        />
      )}
    </>,
    document.body,
  );
}
