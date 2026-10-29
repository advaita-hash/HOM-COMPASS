import type { Tour } from '../types';

// The Library: a list of the practitioner's own book files, kept on this
// device. Adding a book saves only its name, type and size (addBook in
// libraryStore); the file itself is never stored or read. The book line and
// its bin button only exist once a book is added.
export default {
  id: 'library',
  title: 'Library',
  summary: 'A list of your own repertory and materia medica files, kept on this device.',
  route: '/library',
  order: 100,
  version: 1,
  steps: [
    {
      id: 'upload',
      target: 'library-upload',
      magnify: false,
      title: 'Add books',
      body: '{Tap} this box to pick book files from your device, or drag them onto it. PDF, EPUB, TXT and Word files work, several at a time.',
    },
    {
      id: 'about',
      target: 'library-about',
      magnify: false,
      title: 'What gets saved',
      body: "The app saves each book's name, type and size, on this device only. It doesn't keep a copy of the file or read rubrics from it.",
    },
    {
      id: 'catalogue',
      target: 'library-catalogue',
      title: 'Catalogue',
      body: 'Your books are listed below, and the number shows how many. With no books yet, {tap} Upload a book.',
    },
    {
      id: 'book',
      target: 'library-book',
      magnify: false,
      ifMissing: 'center',
      title: 'Your books',
      body: 'Once you add a book, it gets a line here marked Stored locally. On wider screens, its menu sets the type: Repertory, Materia Medica or Other.',
    },
    {
      id: 'remove',
      target: 'library-remove',
      magnify: true,
      title: 'Remove a book',
      body: '{Tap} the bin button to take a book off your list. It goes straight away, without asking first.',
    },
  ],
} satisfies Tour;
