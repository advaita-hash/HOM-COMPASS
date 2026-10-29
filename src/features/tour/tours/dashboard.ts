import type { Tour } from '../types';

// The home page: the one-time disclaimer (skipped once "Got it" is tapped),
// today's remedy, the count tiles and the two quick actions.
export default {
  id: 'dashboard',
  title: 'Dashboard',
  summary: "Your home page: today's remedy, a few quick counts and shortcuts to the main parts of the app.",
  route: '/dashboard',
  order: 10,
  version: 1,
  steps: [
    {
      id: 'disclaimer',
      target: 'dashboard-disclaimer',
      title: 'About this app',
      body: 'A reminder that this app is a study aid, not a diagnosis or prescription. {Tap} Got it to hide this note on this device.',
    },
    {
      id: 'remedy-of-the-day',
      target: 'dashboard-remedy-of-the-day',
      magnify: false,
      title: 'Remedy of the Day',
      body: 'A new remedy from Boericke every day, with its opening words and a few keynotes. {Tap} the card or Study now to read all about it.',
    },
    {
      id: 'stats',
      target: 'dashboard-stats',
      magnify: false,
      title: 'Quick counts',
      body: "How many remedies the app holds and how many books you've uploaded. Each box is also a shortcut: {tap} it to open that part of the app.",
      tip: '{Tap} Repertory chapters to jump straight to the Repertory.',
    },
    {
      id: 'quick-actions',
      target: 'dashboard-quick-actions',
      magnify: false,
      title: 'Quick actions',
      body: 'Upload a book opens your Library, where you add your own repertory or materia medica files. Browse Materia Medica opens the list of remedies to study.',
    },
  ],
} satisfies Tour;
