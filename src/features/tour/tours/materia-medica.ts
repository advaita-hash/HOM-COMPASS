import type { Tour } from '../types';

// One tour for the remedy list and an open Curated remedy. It starts with a
// centred card, so on an open remedy Next goes straight past the list's
// controls. On the list, the open remedy's parts show as centred cards.
export default {
  id: 'materia-medica',
  title: 'Materia Medica',
  summary: 'Browse and search remedies from the Study cards, Boericke, Tyler, Allen and Farrington, and open one to read it.',
  route: '/materia-medica',
  order: 60,
  version: 1,
  steps: [
    {
      id: 'intro',
      title: 'Materia Medica',
      body: "Read remedies from five sources. Study cards are the app's own short summaries, and Boericke, Tyler, Allen and Farrington are the full classic books.",
    },
    {
      id: 'sources',
      target: 'materia-medica-sources',
      magnify: false,
      title: 'Choose a source',
      body: 'Show remedies from every source, or from just one. The small number on each tab is how many remedies it has.',
    },
    {
      id: 'search',
      target: 'materia-medica-search',
      title: 'Search remedies',
      body: "Type a remedy's name to narrow the list. Switch Search in to Text to find every line, in every book, that has all your words.",
      tip: 'Put words in quotes, like "better from motion", for an exact phrase.',
    },
    {
      id: 'remedy',
      target: 'materia-medica-remedy',
      title: 'Open a remedy',
      body: '{Tap} a remedy to read it. The coloured label shows its source: study cards open here, book remedies open in Reference Books.',
    },
    {
      // only on an open remedy
      id: 'back',
      target: 'materia-medica-back',
      title: 'Back to Materia Medica',
      body: '{Tap} Back to Materia Medica to return to the full list of remedies.',
    },
    {
      id: 'keynotes',
      target: 'materia-medica-keynotes',
      magnify: false,
      ifMissing: 'center',
      title: 'Keynotes and more',
      body: 'A study card shows a one-line picture and its keynotes, then mind, generals, what makes it worse or better, and typical rubrics.',
    },
    {
      id: 'notepad',
      target: 'note-composer',
      magnify: false,
      ifMissing: 'center',
      title: 'Notepad',
      body: 'Under each study card, write your own note, pick a colour, then {tap} Save. Notes stay on this device and also show in My notes.',
    },
    {
      id: 'books',
      target: 'materia-medica-books',
      magnify: false,
      ifMissing: 'center',
      title: 'Read in the books',
      body: 'At the end of each study card, buttons open its chapter in Boericke, Tyler, Allen or Farrington, where the book has it, so you can read it in full.',
    },
  ],
} satisfies Tour;
