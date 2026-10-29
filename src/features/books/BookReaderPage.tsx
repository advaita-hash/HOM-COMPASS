import { Fragment, type ReactNode, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, List, Loader2, NotebookPen, Search, StickyNote } from 'lucide-react';
import { getBookMeta, useBook } from './booksIndex';
import { DrugPictureView, RemedyHeading } from './DrugPictureView';
import { canonicalName } from '../../lib/remedyName';
import type { BookRemedy } from './types';
import { parseSections } from './sections';
import { commonNameFor } from './commonName';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Sheet } from '../../components/ui/Sheet';
import { CompareButton, CompareTray } from '../compare/CompareControls';
import {
  type NotePlace,
  type PadNote,
  isGeneralBookNote,
  isGeneralRemedyNote,
  useBookPad,
  useChapterPad,
  useNotepad,
  useRemedyPad,
} from '../notepad/notepadStore';
import { type TextBlock, blocksOf, placeFromSelection, resolvePlace } from '../notepad/places';
import { remedyKeyForBookRemedy } from '../notepad/remedyKey';
import { RemedyNotepad } from '../notepad/RemedyNotepad';
import { noteHref } from '../notepad/links';
import { BookNotepad } from '../notepad/BookNotepad';
import { useTextSelection } from '../notepad/useTextSelection';
import { type StickyCloseOptions, StickyNotePopover } from '../notepad/StickyNotePopover';
import { toneOf } from '../notepad/noteColors';

// ---------------------------------------------------------------------------
// Notes in the reader. URL contract (other pages link here):
//   ?note=<id>      open the note's chapter in Full text at its place, with
//                   the note open as a sticky note above its marker
//                   (general notes open the notepad)
//   ?notes=remedy   open the notepad on "This remedy"
//   ?notes=book     open the notepad on "This book"
// Each param is removed once acted on, so refresh/back doesn't reopen it. A
// ?note= for a note that belongs to another chapter, remedy or book is sent
// on to that note's own page (links.ts noteHref).
// ---------------------------------------------------------------------------

/** Notes pinned in one block: passages (character ranges) and whole sections. */
interface BlockPins {
  ranges: { start: number; end: number; notes: PadNote[] }[];
  section: PadNote[];
}

const WORD_CHAR = /[\p{L}\p{N}]/u;
/** Joins two words into one: weather-cock, child's. */
const JOINER = /['’\-‐]/;
/** Closes a phrase; a pin takes it in so its marker follows it. */
const CLOSING = /[.,;:!?)\]’”"']/;

/**
 * Widen [start, end) so it doesn't begin or end part-way through a word
 * (hyphenated and apostrophe words count as one), and take in the punctuation
 * that closes the last word, so the marker never lands between them.
 */
function snapToWords(text: string, start: number, end: number): [number, number] {
  let s = Math.min(start, end);
  let e = Math.max(start, end);
  const w = (i: number) => i >= 0 && i < text.length && WORD_CHAR.test(text[i]);
  // the boundary before i falls inside a word
  const inWord = (i: number) =>
    i > 0 &&
    i < text.length &&
    ((w(i - 1) && w(i)) || (JOINER.test(text[i]) && w(i - 1) && w(i + 1)) || (JOINER.test(text[i - 1]) && w(i - 2) && w(i)));
  while (inWord(s)) s--;
  while (inWord(e)) e++;
  if (e > s && w(e - 1)) {
    let k = e;
    while (k < text.length && CLOSING.test(text[k])) k++;
    // only where the phrase really ends ("irresolute." but not the "e." of "e.g.")
    if (k > e && (k === text.length || /[\s—–]/.test(text[k]))) e = k;
  }
  return [s, e];
}

/** Last reading view, so a reload stays on Full text (this tab only). */
const VIEW_KEY = 'reader.view';
function readView(): 'portrait' | 'full' {
  try {
    return window.sessionStorage.getItem(VIEW_KEY) === 'full' ? 'full' : 'portrait';
  } catch {
    return 'portrait';
  }
}
function saveView(v: 'portrait' | 'full') {
  try {
    window.sessionStorage.setItem(VIEW_KEY, v);
  } catch {
    // storage blocked: the view just isn't remembered
  }
}

const firstWords = (body: string, n = 6) => {
  const w = body.trim().split(/\s+/);
  return w.slice(0, n).join(' ') + (w.length > n ? '…' : '');
};

/** Opens a marker's sticky note; `focusText` when opened by keyboard or mouse. */
type OpenNotes = (notes: PadNote[], focusText: boolean) => void;

/**
 * Small inline button marking pinned notes; not part of the block's text.
 * Tinted with its (first) note's colour; opens the sticky note above it.
 */
function NoteMarker({
  notes,
  active,
  onOpen,
  at = 'end',
}: {
  notes: PadNote[];
  active: boolean;
  onOpen: OpenNotes;
  /** 'start': opens a block, spaced from the text after it; 'end': follows words, spaced from them only. */
  at?: 'start' | 'end';
}) {
  const pointer = useRef('mouse');
  const tone = toneOf(notes[0]);
  const label =
    notes.length === 1 ? `Note: ${firstWords(notes[0].body)}` : `${notes.length} notes: ${firstWords(notes[0].body)}`;
  return (
    <button
      type="button"
      data-note-ui
      data-notes={notes.map((n) => n.id).join(' ')}
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={active}
      title={label}
      onPointerDown={(e) => {
        pointer.current = e.pointerType;
      }}
      // keyboard (detail 0) and mouse start in the text box; touch and pen
      // don't, so the on-screen keyboard only comes up when asked for
      onClick={(e) => onOpen(notes, e.detail === 0 || pointer.current === 'mouse')}
      className={`tap ${at === 'start' ? 'mr-1' : 'ml-1'} inline-flex h-6 select-none items-center gap-1 rounded-full px-2 align-text-bottom font-sans text-2xs font-semibold normal-case tracking-normal transition-colors ${
        active ? tone.markerActive : tone.marker
      }`}
    >
      <StickyNote className="h-3.5 w-3.5" aria-hidden strokeWidth={2.25} />
      {notes.length > 1 && <span className="tabular-nums">{notes.length}</span>}
    </button>
  );
}

/**
 * One block's text with its pinned passages highlighted, each followed by
 * its marker. `labelLen` chars at the start render bold (Allen's "Label: ").
 */
function PinnedText({
  text,
  labelLen,
  pins,
  sectionMarker,
  active,
  onOpen,
}: {
  text: string;
  labelLen: number;
  pins?: BlockPins;
  sectionMarker: boolean;
  active: Set<string>;
  onOpen: OpenNotes;
}) {
  const ranges = pins?.ranges ?? [];
  const cuts = [...new Set([0, text.length, labelLen, ...ranges.flatMap((r) => [r.start, r.end])])].sort((a, b) => a - b);
  const out: ReactNode[] = [];
  if (sectionMarker && pins?.section.length) {
    out.push(
      <NoteMarker
        key="section"
        at="start"
        notes={pins.section}
        active={pins.section.some((n) => active.has(n.id))}
        onOpen={onOpen}
      />,
    );
  }
  for (let k = 0; k < cuts.length - 1; k++) {
    const [a, b] = [cuts[k], cuts[k + 1]];
    let node: ReactNode = text.slice(a, b);
    if (b <= labelLen) node = <strong className="font-semibold text-slate-800">{node}</strong>;
    const cover = ranges.filter((r) => r.start <= a && r.end >= b);
    if (cover.length) {
      const ids = cover.flatMap((r) => r.notes.map((n) => n.id));
      // overlapping passages: the innermost (last pinned) one's colour
      const tone = toneOf(cover[cover.length - 1].notes[0]);
      node = (
        <mark
          data-notes={ids.join(' ')}
          className={`rounded-sm text-inherit [-webkit-box-decoration-break:clone] [box-decoration-break:clone] ${
            ids.some((id) => active.has(id)) ? tone.markActive : tone.mark
          }`}
        >
          {node}
        </mark>
      );
    }
    out.push(<Fragment key={a}>{node}</Fragment>);
    const ending = ranges.filter((r) => r.end === b);
    if (ending.length) {
      const notes = ending.flatMap((r) => r.notes);
      out.push(<NoteMarker key={`m${b}`} notes={notes} active={notes.some((n) => active.has(n.id))} onOpen={onOpen} />);
    }
  }
  return <>{out}</>;
}

/**
 * Full text. Every paragraph / keynote is a block with data-block="i.j",
 * one-to-one with blocksOf(remedy.text), so selections and pinned notes can be
 * mapped onto the text.
 */
function RemedyText({
  remedy,
  common,
  pins,
  active,
  onOpenNotes,
  textRef,
}: {
  remedy: BookRemedy;
  common: string | null;
  pins: Map<string, BlockPins>;
  active: Set<string>;
  onOpenNotes: OpenNotes;
  textRef: RefObject<HTMLDivElement>;
}) {
  const sections = useMemo(() => parseSections(remedy.text), [remedy.text]);
  return (
    <article className="prose-sm max-w-none">
      <RemedyHeading remedy={remedy} common={common} />
      <div ref={textRef} className="mt-4 space-y-4 font-serif text-subhead leading-relaxed text-slate-700">
        {sections.map(({ heading, items }, i) => {
          const headPins = heading ? pins.get(`${i}.0`)?.section ?? [] : [];
          const text = (j: number) => {
            const it = items[j];
            const label = it.label ? `${it.label}: ` : '';
            return (
              <PinnedText
                text={label + it.text}
                labelLen={label.length}
                pins={pins.get(`${i}.${j}`)}
                sectionMarker={!heading || j !== 0}
                active={active}
                onOpen={onOpenNotes}
              />
            );
          };
          return (
            <section key={i} aria-label={heading ?? undefined}>
              {heading && (
                <h3 className="mb-2 mt-6 font-sans text-xs font-semibold uppercase tracking-wide text-brand-600">
                  {heading}
                  {headPins.length > 0 && (
                    <NoteMarker notes={headPins} active={headPins.some((n) => active.has(n.id))} onOpen={onOpenNotes} />
                  )}
                </h3>
              )}
              {items.some((it) => it.bullet) ? (
                <ul className="space-y-2">
                  {items.map((_, j) => (
                    <li key={j} className="flex gap-3">
                      <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500/60" />
                      <span data-block={`${i}.${j}`}>{text(j)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-3">
                  {items.map((_, j) => (
                    <p key={j} data-block={`${i}.${j}`}>
                      {text(j)}
                    </p>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </article>
  );
}

/** Group a chapter's pinned notes by the block they resolve to. */
function pinsFor(blocks: TextBlock[], notes: PadNote[]): Map<string, BlockPins> {
  const m = new Map<string, BlockPins>();
  for (const n of notes) {
    const at = n.place && resolvePlace(blocks, n.place);
    if (!at) continue;
    const bp = m.get(at.key) ?? { ranges: [], section: [] };
    if (at.start === undefined || at.end === undefined) bp.section.push(n);
    else {
      const same = bp.ranges.find((r) => r.start === at.start && r.end === at.end);
      if (same) same.notes.push(n);
      else bp.ranges.push({ start: at.start, end: at.end, notes: [n] });
    }
    m.set(at.key, bp);
  }
  return m;
}

export default function BookReaderPage() {
  const { bookId, remedySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const meta = getBookMeta(bookId);
  const { data: book, isLoading, isError, error } = useBook(bookId);
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [view, setViewState] = useState<'portrait' | 'full'>(readView);
  const setView = useCallback((v: 'portrait' | 'full') => {
    saveView(v);
    setViewState(v);
  }, []);
  // On phone/tablet the remedy index and the reader can't sit side by side, so
  // the list collapses once a remedy is chosen (tap "All remedies" to reopen).
  // Desktop (lg+) always shows both.
  const [listOpen, setListOpen] = useState(!remedySlug);

  const q = query.trim().toLowerCase();
  const remedies = book?.remedies ?? [];
  const filtered = useMemo(() => {
    if (!q) return remedies;
    return remedies.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.commonName ?? '').toLowerCase().includes(q),
    );
  }, [remedies, q]);

  const selected =
    remedies.find((r) => r.slug === remedySlug) ?? filtered[0] ?? remedies[0];
  // Tyler (and Allen, where he gives none) borrow Boericke's common name.
  const boericke = useBook(bookId && bookId !== 'boericke' ? 'boericke' : undefined);
  const common = selected
    ? commonNameFor(bookId ?? '', selected, bookId === 'boericke' ? book : boericke.data)
    : null;

  // ---- notes ---------------------------------------------------------------
  const slug = selected?.slug;
  const remedyKey = book && selected ? remedyKeyForBookRemedy(book, selected) : undefined;
  const remedyName = selected ? canonicalName(selected.name) : '';
  const blocks = useMemo(() => (selected ? blocksOf(selected.text) : []), [selected]);
  const chapterNotes = useChapterPad(bookId, slug);
  const remedyNotes = useRemedyPad(remedyKey);
  const bookNotes = useBookPad(bookId);
  const remedyCount = useMemo(
    () => new Set([...remedyNotes, ...chapterNotes].map((n) => n.id)).size,
    [remedyNotes, chapterNotes],
  );
  const pins = useMemo(() => pinsFor(blocks, chapterNotes), [blocks, chapterNotes]);

  /** Which notepad tab is open in the sheet (null: closed). */
  const [notesTab, setNotesTab] = useState<'remedy' | 'book' | null>(null);
  /** Note to scroll to and highlight inside the sheet. */
  const [focusNote, setFocusNote] = useState<string | null>(null);
  /** Notes whose marker was tapped (emphasised in the text while the sheet is open). */
  const [markerIds, setMarkerIds] = useState<string[]>([]);
  /** Selected passage waiting for its note. */
  const [pending, setPending] = useState<NotePlace | null>(null);
  /**
   * The sticky note open above a marker: the marker's notes and the one
   * shown. Opened from the marker, "Show in text" or a ?note= link.
   */
  const [sticky, setSticky] = useState<{ ids: string[]; id: string; focusText: boolean } | null>(null);
  /** A pinned note to bring into view and open as a sticky once Full text shows it. */
  const [scrollTo, setScrollTo] = useState<{ id: string } | null>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  /** Inside the sheet, to find its heading. */
  const sheetBodyRef = useRef<HTMLDivElement>(null);
  /** Wraps the Drug picture / Full text control. */
  const readingViewRef = useRef<HTMLDivElement>(null);
  /** The toolbar "Notes" button: where focus returns when the opener is gone. */
  const notesButtonRef = useRef<HTMLButtonElement>(null);
  /** What had focus when the sheet opened; it gets focus back on close. */
  const openerRef = useRef<HTMLElement | null>(null);
  /** The ?note= last sent on to the note's own page. */
  const redirectedRef = useRef<string | null>(null);

  /** Opened on "This remedy" (from the toolbar, a marker or a link). */
  const [openedOnRemedy, setOpenedOnRemedy] = useState(false);
  // "This remedy" needs a chosen chapter: one in the URL, or the one on screen
  // when the notepad was opened on it (before a pick, the book's first chapter
  // shows on desktop but the phone shows the remedy list)
  const remedyTab = !!(selected && remedyKey && (remedySlug || openedOnRemedy));

  const active = useMemo(
    () => new Set(sticky ? [sticky.id] : notesTab ? markerIds : []),
    [sticky, notesTab, markerIds],
  );

  const openNotes = (tab: 'remedy' | 'book', focus: string | null = null) => {
    if (!notesTab && document.activeElement !== document.body) openerRef.current = document.activeElement as HTMLElement;
    setSticky(null);
    setFocusNote(focus);
    setNotesTab(tab);
    setOpenedOnRemedy(tab === 'remedy');
  };
  // A passage waiting for its note (and the words typed for it, see
  // NoteComposer) outlive the sheet, so a stray tap on the backdrop loses
  // nothing; a new chapter clears it.
  const closeNotes = useCallback(() => {
    setNotesTab(null);
    setFocusNote(null);
    setMarkerIds([]);
    const back = openerRef.current;
    openerRef.current = null;
    window.setTimeout(() => (back?.isConnected ? back : notesButtonRef.current)?.focus({ preventScroll: true }), 0);
  }, []);
  const showInText = useCallback((n: PadNote) => {
    openerRef.current = null;
    setNotesTab(null);
    setFocusNote(null);
    setMarkerIds([]);
    setView('full');
    setSticky(null);
    setScrollTo({ id: n.id });
  }, [setView]);
  /** Put focus on the marker of a note in the text, else on the toolbar Notes button. */
  const focusMarker = useCallback((id: string) => {
    window.setTimeout(() => {
      const m = scrollerRef.current?.querySelector<HTMLElement>(`button[data-notes~="${CSS.escape(id)}"]`);
      (m ?? notesButtonRef.current)?.focus({ preventScroll: true });
    }, 0);
  }, []);
  /** Close the sticky note; focus goes back to its marker (not after a tap elsewhere). */
  const stickyId = sticky?.id;
  const closeSticky = useCallback(
    ({ restoreFocus }: StickyCloseOptions) => {
      setSticky(null);
      if (restoreFocus && stickyId) focusMarker(stickyId);
    },
    [stickyId, focusMarker],
  );
  /** "All notes" on a sticky: the Notes sheet on that note; closing it comes back to the marker. */
  const stickyToSheet = (id: string) => {
    const ids = sticky?.ids ?? [id];
    openNotes('remedy', id);
    setMarkerIds(ids);
    openerRef.current = scrollerRef.current?.querySelector<HTMLElement>(`button[data-notes~="${CSS.escape(id)}"]`) ?? null;
  };
  /** Keyboard: to the reader's first control (the reading view). */
  const focusReader = useCallback(() => {
    const first =
      readingViewRef.current?.querySelector<HTMLElement>('[aria-checked="true"]') ?? notesButtonRef.current ?? scrollerRef.current;
    first?.focus();
  }, []);
  /** A marker: its sticky note (a second click on the same marker closes it). */
  const onOpenMarker: OpenNotes = (notes, focusText) => {
    const ids = notes.map((n) => n.id);
    if (sticky && sticky.ids.join(' ') === ids.join(' ')) {
      closeSticky({ restoreFocus: true });
      return;
    }
    setSticky({ ids, id: ids[0], focusText });
  };

  // a new chapter starts clean
  useEffect(() => {
    setPending(null);
    setSticky(null);
    setMarkerIds([]);
  }, [bookId, slug]);

  // URL contract (see the top of this file)
  useEffect(() => {
    const noteId = searchParams.get('note');
    const which = searchParams.get('notes');
    if (!noteId && !which) return;
    if ((noteId || which === 'remedy') && !selected) return; // wait for the chapter
    if (noteId) {
      const n = useNotepad.getState().notes.find((x) => x.id === noteId);
      const here = !!n?.place && n.place.book === bookId && n.place.slug === selected!.slug;
      const generalHere =
        !!n && ((!!remedyKey && isGeneralRemedyNote(n, remedyKey)) || (!!bookId && isGeneralBookNote(n, bookId)));
      const home = n && !here && !generalHere ? noteHref(n) : undefined;
      // not on this page: go to the note's own place (once, in case that
      // place no longer exists and leads back here)
      if (home && redirectedRef.current !== noteId) {
        redirectedRef.current = noteId;
        navigate(home, { replace: true });
        return;
      }
      if (n && here && resolvePlace(blocks, n.place!)) {
        setNotesTab(null);
        setView('full');
        setSticky(null);
        setScrollTo({ id: n.id });
      } else if (n && (here || generalHere)) {
        // general notes, and pins whose place is gone, are shown in the notepad
        setSticky(null);
        setFocusNote(n.id);
        const tab = here || n.remedy ? 'remedy' : 'book';
        setNotesTab(tab);
        setOpenedOnRemedy(tab === 'remedy');
      }
    } else if (which === 'remedy' || which === 'book') {
      setSticky(null);
      setFocusNote(null);
      setNotesTab(which);
      setOpenedOnRemedy(which === 'remedy');
    }
    const next = new URLSearchParams(searchParams);
    next.delete('note');
    next.delete('notes');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, selected, bookId, blocks, remedyKey, navigate, setView]);

  // bring a pinned note's place into view once Full text has rendered it, put
  // focus on its marker, and open the note as a sticky above it (it shows once
  // the marker has scrolled into view, and takes focus then)
  useEffect(() => {
    if (!scrollTo || view !== 'full') return;
    const t = window.setTimeout(() => {
      const sel = `[data-notes~="${CSS.escape(scrollTo.id)}"]`;
      const el = scrollerRef.current?.querySelector(sel);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const marker = scrollerRef.current?.querySelector<HTMLElement>(`button${sel}`);
      marker?.focus({ preventScroll: true });
      const ids = marker?.getAttribute('data-notes')?.split(' ').filter(Boolean);
      if (ids?.length) setSticky({ ids, id: scrollTo.id, focusText: false });
      setScrollTo(null);
    }, 80);
    return () => window.clearTimeout(t);
  }, [scrollTo, view, slug]);

  // focus moves into the sheet when it opens: onto the note it was opened for,
  // the composer (a passage to write about), or else the sheet's heading
  // (focusable by script only, see Sheet)
  const sheetOpen = notesTab !== null;
  useEffect(() => {
    if (!sheetOpen || focusNote || pending) return;
    const heading = sheetBodyRef.current?.closest('[role="dialog"]')?.querySelector<HTMLElement>('h2');
    heading?.focus({ preventScroll: true });
    // focusNote and pending are read only at the moment the sheet opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetOpen]);

  // ...and Tab stays inside it (the page behind is aria-hidden in spirit)
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const sheet = sheetBodyRef.current?.closest<HTMLElement>('[role="dialog"]');
      // the delete confirmation keeps its own focus
      if (e.key !== 'Tab' || !sheet || document.querySelector('[role="alertdialog"]')) return;
      const all = [
        ...sheet.querySelectorAll<HTMLElement>('a[href], button, select, textarea, input, [tabindex]:not([tabindex="-1"])'),
      ].filter((el) => !el.matches(':disabled') && el.getClientRects().length > 0);
      if (!all.length) return;
      const [first, last] = [all[0], all[all.length - 1]];
      const at = document.activeElement;
      // b comes after a in the document
      const follows = (a: Node, b: Node) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      const out = !at || !sheet.contains(at);
      if (e.shiftKey ? out || at === first || follows(at, first) : out || at === last || follows(last, at)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const toPlace = useCallback(
    (key: string, start: number, end: number) => {
      const b = blocks.find((x) => x.key === key);
      // whole words only, as in Apple Books: a pin never splits a word
      return b && bookId && slug ? placeFromSelection(bookId, slug, b, ...snapToWords(b.text, start, end)) : null;
    },
    [blocks, bookId, slug],
  );
  const { selection, clear: clearSelection } = useTextSelection(
    textRef,
    scrollerRef,
    view === 'full' && !notesTab,
    toPlace,
  );

  const chapter = useMemo(
    () =>
      bookId && slug
        ? { book: bookId, slug, blocks, pending, clearPending: () => setPending(null), onShowInText: showInText }
        : undefined,
    [bookId, slug, blocks, pending, showInText],
  );

  if (!meta) {
    return (
      <div className="p-8">
        <Link to="/books" className="btn-ghost mb-4">
          <ChevronLeft className="h-4 w-4" /> Reference Books
        </Link>
        <p className="text-sm text-slate-500">Unknown book “{bookId}”.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-slate-200 bg-surface px-6 py-4">
        <div className="min-w-0 flex-1">
          <Link to="/books" className="mb-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600">
            <ChevronLeft className="h-3.5 w-3.5" /> Reference Books
          </Link>
          <h1 className="font-serif text-xl font-semibold text-slate-800">{meta.title}</h1>
          <p className="text-xs text-brand-600">{meta.author}</p>
        </div>
        <button
          type="button"
          onClick={() => openNotes('book')}
          className="btn-ghost -mr-3 min-w-[44px] shrink-0 px-3"
          aria-label={`Book notes${bookNotes.length ? `, ${bookNotes.length}` : ''}`}
        >
          <NotebookPen className="h-4 w-4" />
          <span className="hidden sm:inline">Book notes</span>
          {bookNotes.length > 0 && <span className="text-xs tabular-nums text-ink/70">{bookNotes.length}</span>}
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Remedy index — full-width on mobile, collapses once a remedy is picked */}
        <div
          className={`${
            listOpen ? 'flex' : 'hidden'
          } w-full shrink-0 flex-col border-r border-slate-200 bg-slate-50 lg:flex lg:w-64`}
        >
          {/* keyboard: past the long remedy index, straight to the text
              (desktop only; on phones the index and the reader don't share the screen) */}
          {selected && (
            <button
              type="button"
              onClick={focusReader}
              className="btn-secondary sr-only hidden lg:inline-flex lg:focus:not-sr-only lg:focus:mx-3 lg:focus:mt-3"
            >
              Skip to {canonicalName(selected.name)}
            </button>
          )}
          <div className="relative p-3">
            <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Enter opens the first match
                const first = filtered[0];
                if (e.key !== 'Enter' || !first) return;
                e.preventDefault();
                setListOpen(false);
                navigate(`/books/${bookId}/${first.slug}`);
                window.setTimeout(focusReader, 0);
              }}
              aria-label={`Search remedies in ${meta.label}`}
              placeholder="Search remedies…"
              className="w-full rounded-lg border border-slate-200 bg-surface py-2 pl-9 pr-3 text-sm focus:outline-none"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
            {isLoading && (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            {filtered.map((r) => {
              const active = selected?.slug === r.slug;
              return (
                <Link
                  key={r.slug}
                  to={`/books/${bookId}/${r.slug}`}
                  onClick={() => setListOpen(false)}
                  className={`block truncate rounded-md px-3 py-2 text-sm ${
                    active
                      ? 'bg-brand-100 font-medium text-brand-800'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {canonicalName(r.name)}
                </Link>
              );
            })}
            {!isLoading && filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-slate-400">No matches.</p>
            )}
          </div>
          {book && (
            <div className="border-t border-slate-200 px-3 py-2 text-2xs text-slate-400">
              {book.remedyCount} remedies
            </div>
          )}
        </div>

        {/* Reader — hidden on mobile while the list is open */}
        <div
          ref={scrollerRef}
          tabIndex={-1}
          aria-label="Reader"
          className={`${
            listOpen ? 'hidden' : 'block'
          } min-h-0 flex-1 overflow-auto bg-surface px-6 pb-28 pt-6 focus:outline-none md:px-10 lg:block`}
        >
          {isError && (
            <p className="text-sm text-red-600">
              {(error as Error)?.message ?? 'Failed to load this book.'}
            </p>
          )}
          {selected ? (
            <div className="mx-auto max-w-2xl">
              <div className="mb-4 flex flex-wrap items-center gap-3">
              <button onClick={() => setListOpen(true)} className="btn-secondary lg:hidden">
                <List className="h-4 w-4" /> All remedies
              </button>
              <div ref={readingViewRef}>
                <SegmentedControl
                  ariaLabel="Reading view"
                  value={view}
                  onChange={setView}
                  options={[
                    { value: 'portrait', label: 'Drug picture' },
                    { value: 'full', label: 'Full text' },
                  ]}
                />
              </div>
              {/* Notes and Compare — on top of every remedy, in every book */}
              <div className="ml-auto flex items-center gap-2">
                <button
                  ref={notesButtonRef}
                  type="button"
                  onClick={() => openNotes('remedy')}
                  className="btn-secondary"
                  aria-label={`Notes, ${remedyCount} on this remedy`}
                >
                  <StickyNote className="h-4 w-4" /> Notes
                  {remedyCount > 0 && (
                    <span className="min-w-[20px] rounded-full bg-accent px-1 text-center text-2xs font-semibold leading-5 tabular-nums text-on-accent">
                      {remedyCount}
                    </span>
                  )}
                </button>
                <CompareButton book={bookId!} slug={selected.slug} name={selected.name} />
              </div>
              </div>
              {view === 'portrait' ? (
                <DrugPictureView
                  remedy={selected}
                  common={common}
                  notes={{
                    count: remedyCount,
                    remedyName,
                    onOpen: () => openNotes('remedy'),
                    onFullText: () => {
                      // the button goes away with the drug picture: keep focus
                      // on the reading view, now on Full text
                      setView('full');
                      window.setTimeout(() => readingViewRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus(), 0);
                    },
                  }}
                />
              ) : (
                <RemedyText
                  remedy={selected}
                  common={common}
                  pins={pins}
                  active={active}
                  onOpenNotes={onOpenMarker}
                  textRef={textRef}
                />
              )}
              {/* attribution for the edition the text comes from */}
              {book?.source && (
                <p className="mt-8 border-t border-ink/10 pt-4 text-xs leading-relaxed text-ink/70">
                  Source: {book.source}
                </p>
              )}
            </div>
          ) : (
            !isLoading && (
              <p className="text-sm text-slate-400">Select a remedy to begin reading.</p>
            )
          )}
        </div>
      </div>
      <CompareTray />

      {/* "Add note" for the selected words (placed by useTextSelection: below
          the selection on touch, clear of the native callout) */}
      {selection && (
        <button
          type="button"
          // keep the selection when clicked with a mouse
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setPending(selection.place);
            openNotes('remedy');
            window.getSelection()?.removeAllRanges();
            clearSelection();
          }}
          style={{ left: selection.x, top: selection.y }}
          className="material-thick fixed z-40 inline-flex h-11 -translate-x-1/2 animate-fade-in items-center gap-2 whitespace-nowrap rounded-full border border-ink/10 px-4 text-subhead font-semibold text-brand-600 shadow-elevated"
        >
          <StickyNote className="h-4 w-4" /> Add note
        </button>
      )}

      {/* A pinned note, opened from its marker, "Show in text" or a ?note= link */}
      {sticky && view === 'full' && !notesTab && (
        <StickyNotePopover
          key={sticky.ids.join(' ')}
          ids={sticky.ids}
          id={sticky.id}
          onIdChange={(id) => setSticky((s) => (s ? { ...s, id } : s))}
          scroller={scrollerRef}
          focusText={sticky.focusText}
          onClose={closeSticky}
          onOpenAll={stickyToSheet}
        />
      )}

      {notesTab && (
        <Sheet
          title="Notes"
          subtitle={notesTab === 'remedy' && remedyTab ? `${remedyName} · ${meta.label}` : meta.title}
          onClose={closeNotes}
        >
          {/* own stacking context, so the segmented controls stay under the sheet's sticky header */}
          <div ref={sheetBodyRef} className="relative z-0">
          {remedyTab && (
            <SegmentedControl
              className="mb-4"
              fullWidth
              ariaLabel="Notes on"
              value={notesTab}
              onChange={(t) => {
                setFocusNote(null);
                setNotesTab(t);
              }}
              options={[
                { value: 'remedy', label: `This remedy (${remedyCount})` },
                { value: 'book', label: `This book (${bookNotes.length})` },
              ]}
            />
          )}
          {notesTab === 'remedy' && selected && remedyKey ? (
            <RemedyNotepad remedyKey={remedyKey} remedyName={remedyName} chapter={chapter} focusId={focusNote} />
          ) : (
            <BookNotepad
              bookId={bookId!}
              focusId={focusNote}
              current={slug ? { slug, onShowInText: showInText } : undefined}
            />
          )}
          </div>
        </Sheet>
      )}
    </div>
  );
}
