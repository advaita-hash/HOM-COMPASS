import type { Tour } from '../types';

// The day picker, then the remedy card's buttons and the other-books links.
// Repertory profile and Study card only exist for some remedies, so those
// steps are skipped when the button isn't there.
export default {
  id: 'remedy-of-the-day',
  title: 'Remedy of the Day',
  summary: 'One remedy from Boericke to study each day, with a short summary and links to read more.',
  route: '/remedy-of-the-day',
  order: 30,
  version: 1,
  steps: [
    {
      id: 'days',
      target: 'remedy-of-the-day-days',
      magnify: true,
      title: 'Choose a day',
      body: "A new Boericke remedy comes every day. The ‹ and › buttons move to earlier days and back. {Tap} Today to return to today's remedy.",
    },
    {
      id: 'read',
      target: 'remedy-of-the-day-read',
      title: 'Read in Boericke',
      body: "Opens this remedy's whole chapter in Boericke's book, on Full text, so you can read it from start to finish.",
    },
    {
      id: 'notes',
      target: 'remedy-of-the-day-notes',
      title: 'Add a note',
      body: 'Write your own notes on this remedy. They are saved on this device, and the button then shows how many you have.',
    },
    {
      id: 'compare',
      target: 'remedy-of-the-day-compare',
      title: 'Compare',
      body: 'Adds this remedy to your compare list. Pick two to four remedies, then {tap} Compare in the bar at the bottom to see them side by side.',
    },
    {
      id: 'profile',
      target: 'remedy-of-the-day-profile',
      title: 'Repertory profile',
      body: 'Lists every repertory rubric that has this remedy, grouped by chapter, with its grade.',
    },
    {
      id: 'study-card',
      target: 'remedy-of-the-day-study-card',
      title: 'Study card',
      body: "Opens this remedy's short study card from the app's own Curated list. Only some remedies have one.",
    },
    {
      id: 'books',
      target: 'remedy-of-the-day-books',
      magnify: false,
      title: 'Read in the books',
      body: "Read this remedy in Boericke, Tyler or Allen. Each button opens its chapter in that book; a book that doesn't have it shows no button.",
    },
  ],
} satisfies Tour;
