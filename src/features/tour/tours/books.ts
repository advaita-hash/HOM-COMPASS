import type { Tour } from '../types';

// The shelf of bundled books, then what's inside one (the reader has its own
// tour). A book's note count only shows once it has notes, so that step falls
// back to a centred card.
export default {
  id: 'books',
  title: 'Reference Books',
  summary: 'Read Boericke, Tyler and Allen in full, one remedy at a time.',
  route: '/books',
  order: 90,
  version: 1,
  steps: [
    {
      id: 'intro',
      title: 'Reference Books',
      body: 'Read three classic materia medica books in full, one remedy at a time: Boericke, Tyler and Allen.',
    },
    {
      id: 'book',
      target: 'books-book',
      magnify: false,
      title: 'Open a book',
      body: '{Tap} a book to open it. Each card says who wrote it, what kind of book it is and about how many remedies it has.',
      tip: '{Tap} Boericke, the short classic with over 600 remedies.',
    },
    {
      id: 'notes',
      target: 'books-note-count',
      ifMissing: 'center',
      title: 'Your notes',
      body: 'When you write notes on a book, or pin notes in it, its card shows how many. Notes are saved on this device only.',
    },
    {
      id: 'inside',
      title: 'Inside a book',
      body: 'Pick a remedy, then read its short Drug picture or the Full text. In Full text you can pin a note to any words you select.',
    },
  ],
} satisfies Tour;
