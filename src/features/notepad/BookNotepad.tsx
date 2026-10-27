import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, StickyNote } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { NoteCard } from './NoteCard';
import { bookLabel, chapterHref, noteHref } from './links';
import { NoteComposer } from './NoteComposer';
import { type PadNote, isGeneralBookNote, useBookPad, useNotepad } from './notepadStore';
import { remedyKeyLabel } from './remedyKey';
import { canonicalName } from '../../lib/remedyName';
import { ListHeading, useScrollToNote } from './RemedyNotepad';
import { Announcer } from './notepadUi';

/**
 * Notepad for a book: general notes about the book, then every note pinned
 * inside it, grouped by remedy chapter with a link to each.
 */
export function BookNotepad({
  bookId,
  focusId,
  current,
}: {
  bookId: string;
  focusId?: string | null;
  /** In the reader: the open chapter, whose pinned notes are shown without leaving the page. */
  current?: { slug: string; onShowInText: (note: PadNote) => void };
}) {
  const add = useNotepad((s) => s.add);
  const notes = useBookPad(bookId);
  const root = useScrollToNote(focusId);
  const label = bookLabel(bookId);

  const { general, groups } = useMemo(() => {
    const general = notes.filter((n) => isGeneralBookNote(n, bookId));
    const bySlug = new Map<string, PadNote[]>();
    for (const n of notes) {
      if (!n.place) continue;
      bySlug.set(n.place.slug, [...(bySlug.get(n.place.slug) ?? []), n]);
    }
    const groups = [...bySlug.entries()]
      .map(([slug, list]) => {
        // the chapter's own name in this book ("Pulsatilla Nigricans" in Allen)
        const first = list.find((n) => n.remedyName) ?? list[0];
        const name = first.remedyName ? canonicalName(first.remedyName) : remedyKeyLabel(first.remedy ?? slug);
        return { slug, name, list };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    return { general, groups };
  }, [notes, bookId]);

  const pinned = groups.reduce((s, g) => s + g.list.length, 0);

  return (
    // own stacking context: the segmented controls inside must not rise above a
    // sheet's sticky header
    <div ref={root} data-notepad className="relative z-0">
      <Announcer>
        <NoteComposer
          key={bookId}
          draftKey={`book:${bookId}`}
          placeholder={`Your note on ${label}`}
          onSave={(body) => add({ body, book: bookId })}
        />

        {general.length + pinned === 0 && (
          <EmptyState
            className="!py-8"
            icon={StickyNote}
            title="No notes on this book yet"
            description="Write a note above about the book as a whole. Notes you pin to a remedy’s text in this book are gathered here too."
          />
        )}

        {general.length > 0 && (
          <section aria-label="About this book">
            <ListHeading count={general.length}>About this book</ListHeading>
            <ul className="space-y-2">
              {general.map((n) => (
                <NoteCard key={n.id} note={n} highlighted={n.id === focusId} />
              ))}
            </ul>
          </section>
        )}

        {pinned > 0 && (
          <section aria-label="Pinned in this book">
            <ListHeading count={pinned}>Pinned in this book</ListHeading>
            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g.slug}>
                  <Link
                    to={chapterHref(bookId, g.slug)}
                    className="tap -mx-1 mb-1 inline-flex min-h-[32px] items-center gap-1 rounded-md px-1 font-serif text-base font-semibold text-brand-700 hover:bg-accent/[0.08]"
                  >
                    {g.name}
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <ul className="space-y-2">
                    {g.list.map((n) => (
                      <NoteCard
                        key={n.id}
                        note={n}
                        highlighted={n.id === focusId}
                        showInText={
                          current && current.slug === g.slug
                            ? { onClick: () => current.onShowInText(n) }
                            : { to: noteHref(n) }
                        }
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </Announcer>
    </div>
  );
}
