import type { Tour } from '../types';

// One remedy in a book at /books/:bookId/:remedySlug. Wide screens show the
// search box beside the reader; phones and tablets show All remedies instead
// (each step is skipped where its control is hidden). The toolbar buttons
// carry their own labels and sit under a tall header on small phones, so they
// go without the magnifier, which leaves the card room beside them. Add note
// and the note markers only exist in Full text, once words are selected or a
// note is pinned, so those steps fall back to a centred card.
export default {
  id: 'book-reader',
  title: 'Book reader',
  summary: 'Read one remedy from a book as a short drug picture or the full text, and pin your own notes to its words.',
  route: '/books/boericke/aconitum-napellus',
  order: 95,
  version: 1,
  steps: [
    {
      id: 'book-notes',
      target: 'book-reader-book-notes',
      title: 'Book notes',
      body: 'The notebook button, Book notes, keeps notes on this whole book and lists every note pinned in it. Reference Books, top left, goes back to all books.',
    },
    {
      // the remedy list: beside the reader on wide screens, behind All remedies on phones
      id: 'search',
      target: 'book-reader-search',
      title: 'Find a remedy',
      body: "Type a remedy's name or common name to narrow the list, then {tap} one to read it. Press Enter to open the first match.",
      tip: 'Type puls to find Pulsatilla.',
    },
    {
      // phones and tablets, while a remedy is open
      id: 'all-remedies',
      target: 'book-reader-all-remedies',
      magnify: false,
      title: 'All remedies',
      body: "{Tap} All remedies to see this book's full list. Search it by name, then {tap} a remedy to read it.",
    },
    {
      id: 'view',
      target: 'book-reader-view',
      title: 'Drug picture, Full text',
      body: 'Drug picture is a short summary of the remedy. Full text is the whole chapter, where you can pin your own notes to any words.',
    },
    {
      id: 'notes',
      target: 'book-reader-notes',
      magnify: false,
      title: 'Notes',
      body: '{Tap} Notes, or Open notes in Drug picture, to write your own notes on this remedy. They are saved on this device only.',
      tip: 'On iPad, write in any note with Apple Pencil. Scribble turns it into text.',
    },
    {
      id: 'compare',
      target: 'book-reader-compare',
      magnify: false,
      title: 'Compare',
      body: '{Tap} Compare to add this remedy to your list, up to 4. With 2 or more, {tap} Compare in the bar at the bottom to see them side by side.',
      tip: '{Tap} In Compare to take it out again.',
    },
    {
      id: 'add-note',
      target: 'book-reader-add-note',
      ifMissing: 'center',
      title: 'Add note',
      body: 'In Full text, select a few words. An Add note button appears: {tap} it, write your note and {tap} Save to pin it to those words.',
      tip: 'Press and hold a word on a touch screen, or drag across words with a mouse.',
    },
    {
      id: 'marker',
      target: 'book-reader-marker',
      ifMissing: 'center',
      title: 'Pinned notes',
      body: "After you pin a note, its words take the note's colour and get a small note button. {Tap} it for a sticky note: edit, change colour, delete or see All notes.",
      tip: '{Tap} outside the sticky note to close it. Your changes save as you type.',
    },
  ],
} satisfies Tour;
