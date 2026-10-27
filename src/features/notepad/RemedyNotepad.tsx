import { type ReactNode, useEffect, useMemo, useRef } from 'react';
import { StickyNote } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { NoteCard } from './NoteCard';
import { bookLabel, noteHref } from './links';
import { NoteComposer } from './NoteComposer';
import { type NotePlace, type PadNote, useChapterPad, useNotepad, useRemedyPad } from './notepadStore';
import { type TextBlock, placeFromSection, placesOf, resolvePlace } from './places';
import { Announcer } from './notepadUi';

/** The book chapter the notepad is open beside (the reader). */
export interface NotepadChapter {
  book: string;
  slug: string;
  blocks: TextBlock[];
  /** Passage selected in Full text, waiting for its note. */
  pending: NotePlace | null;
  clearPending: () => void;
  /** Close the notepad and show a note pinned in this chapter. */
  onShowInText: (note: PadNote) => void;
}

/** Small uppercase list heading with a count. */
export function ListHeading({ children, count }: { children: ReactNode; count: number }) {
  return (
    <h3 className="mb-2 mt-6 flex items-baseline gap-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
      {children}
      <span className="font-normal tabular-nums">{count}</span>
    </h3>
  );
}

/** Scroll a highlighted note into view once its list has rendered, and focus it. */
export function useScrollToNote(focusId: string | null | undefined) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusId) return;
    const t = window.setTimeout(() => {
      const el = root.current?.querySelector<HTMLElement>(`[data-note-id="${CSS.escape(focusId)}"]`);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 120);
    return () => window.clearTimeout(t);
  }, [focusId]);
  return root;
}

/**
 * Notepad for one remedy: a composer, then its notes — those pinned in the
 * chapter being read (in text order), general notes, and notes pinned in
 * other books' chapters on the same remedy.
 */
export function RemedyNotepad({
  remedyKey,
  remedyName,
  chapter,
  focusId,
}: {
  remedyKey: string;
  remedyName: string;
  chapter?: NotepadChapter;
  focusId?: string | null;
}) {
  const add = useNotepad((s) => s.add);
  const remedyNotes = useRemedyPad(remedyKey);
  const chapterNotes = useChapterPad(chapter?.book, chapter?.slug);
  const root = useScrollToNote(focusId);

  const blocks = chapter?.blocks;
  const places = useMemo(() => (blocks ? placesOf(blocks) : []), [blocks]);

  const lists = useMemo(() => {
    const inChapter = (n: PadNote) => !!chapter && n.place?.book === chapter.book && n.place.slug === chapter.slug;
    const here: { note: PadNote; order: number }[] = [];
    const lost: PadNote[] = [];
    if (chapter) {
      const order = new Map(chapter.blocks.map((b, i) => [b.key, i]));
      for (const n of chapterNotes) {
        const at = resolvePlace(chapter.blocks, n.place!);
        if (at) here.push({ note: n, order: (order.get(at.key) ?? 0) * 1e6 + (at.start ?? -1) });
        else lost.push(n);
      }
      here.sort((a, b) => a.order - b.order);
    }
    return {
      here: here.map((h) => h.note),
      lost,
      general: remedyNotes.filter((n) => !n.place),
      elsewhere: remedyNotes.filter((n) => n.place && !inChapter(n)),
    };
  }, [chapter, chapterNotes, remedyNotes]);

  const total = lists.here.length + lists.lost.length + lists.general.length + lists.elsewhere.length;

  const save = (body: string, place?: NotePlace) => add({ body, remedy: remedyKey, remedyName, ...(place ? { place } : {}) });
  // one draft per chapter; keyed so a new chapter starts with a fresh section choice
  const draftKey = chapter ? `remedy:${remedyKey}@${chapter.book}/${chapter.slug}` : `remedy:${remedyKey}`;

  return (
    // own stacking context: the segmented controls inside must not rise above a
    // sheet's sticky header
    <div ref={root} data-notepad className="relative z-0">
      <Announcer>
        <NoteComposer
          key={draftKey}
          draftKey={draftKey}
          placeholder={`Your note on ${remedyName}`}
          onSave={save}
          chapter={
            chapter && {
              places,
              pending: chapter.pending,
              clearPending: chapter.clearPending,
              sectionPlace: (key) => {
                const b = chapter.blocks.find((x) => x.key === key);
                return b ? placeFromSection(chapter.book, chapter.slug, b) : null;
              },
            }
          }
        />

        {total === 0 && (
          <EmptyState
            className="!py-8"
            icon={StickyNote}
            title="No notes yet"
            description={
              chapter
                ? 'Write a note above about the remedy in general, or select words in Full text and tap “Add note” to pin one to a passage.'
                : `Write a note above about ${remedyName} in general. To pin a note to a passage, open the remedy in a reference book and select words in Full text.`
            }
          />
        )}

        {lists.here.length > 0 && (
          <section aria-label="In this chapter">
            <ListHeading count={lists.here.length}>In this chapter</ListHeading>
            <ul className="space-y-2">
              {lists.here.map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  highlighted={n.id === focusId}
                  showInText={{ onClick: () => chapter!.onShowInText(n) }}
                />
              ))}
            </ul>
          </section>
        )}

        {lists.general.length > 0 && (
          <section aria-label="General">
            <ListHeading count={lists.general.length}>General</ListHeading>
            <ul className="space-y-2">
              {lists.general.map((n) => (
                <NoteCard key={n.id} note={n} highlighted={n.id === focusId} />
              ))}
            </ul>
          </section>
        )}

        {lists.elsewhere.length > 0 && (
          <section aria-label={chapter ? 'In other chapters' : 'In books'}>
            <ListHeading count={lists.elsewhere.length}>{chapter ? 'In other chapters' : 'In books'}</ListHeading>
            <ul className="space-y-2">
              {lists.elsewhere.map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  source={bookLabel(n.place!.book)}
                  highlighted={n.id === focusId}
                  showInText={{ to: noteHref(n) }}
                />
              ))}
            </ul>
          </section>
        )}

        {lists.lost.length > 0 && (
          <section aria-label="Place not found">
            <ListHeading count={lists.lost.length}>Place not found</ListHeading>
            <p className="mb-2 text-xs text-ink/70">
              The text these notes were pinned to has changed. The notes are kept with the words they were pinned to.
            </p>
            <ul className="space-y-2">
              {lists.lost.map((n) => (
                <NoteCard key={n.id} note={n} highlighted={n.id === focusId} />
              ))}
            </ul>
          </section>
        )}
      </Announcer>
    </div>
  );
}
