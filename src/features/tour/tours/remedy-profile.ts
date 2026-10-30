import type { Tour } from '../types';

// One remedy at /remedy/:name: its header and links, then the two tabs. The
// tab that isn't open gets one centred card (filters, or the notepad); its
// other parts are skipped, since the tabs step already names them.
export default {
  id: 'remedy-profile',
  title: 'Remedy profile',
  summary: 'One remedy: every repertory rubric it appears in, with its grade, and your own notes on it.',
  route: '/remedy/Pulsatilla',
  order: 45,
  version: 1,
  steps: [
    {
      id: 'back',
      target: 'remedy-profile-back',
      title: 'Back to Repertory',
      body: '{Tap} Repertory to open the Repertory page and search for rubrics.',
    },
    {
      id: 'header',
      target: 'remedy-profile-header',
      magnify: false,
      title: 'Remedy name',
      body: "Its full name and Kentian abbreviation. The buttons below open its Study card or its chapter in Boericke, Tyler or Allen, where the app has one.",
    },
    {
      id: 'tabs',
      target: 'remedy-profile-tabs',
      title: 'Repertory or My notes',
      body: 'Repertory lists every rubric that has this remedy. My notes holds your own notes on it, and your Common Room notes once you sign in.',
    },
    {
      id: 'filters',
      target: 'remedy-profile-filters',
      magnify: false,
      ifMissing: 'center',
      title: 'Narrow the list',
      body: 'On the Repertory tab, type a word to filter the rubrics, pick one chapter, or choose Grade 2+ or 3+ to see only the stronger ones.',
      tip: "Choose Grade 3+ to see this remedy's strongest rubrics.",
    },
    {
      // only on the Repertory tab, once the repertory has loaded
      id: 'rubrics',
      target: 'remedy-profile-rubric',
      magnify: false,
      title: 'Rubrics and grades',
      body: 'Each line is a rubric with this remedy: purple capitals are grade 3, blue italics grade 2, plain grey grade 1. The numbers show its grade, then how many remedies share it.',
      tip: 'On a long list, scroll to the end and {tap} Show more.',
    },
    {
      id: 'notepad',
      target: 'note-composer',
      magnify: false,
      ifMissing: 'center',
      title: 'Notepad',
      body: 'On the My notes tab, write your own note on this remedy, pick a colour, then {tap} Save. Notes stay on this device and show below.',
    },
    {
      // only on the My notes tab
      id: 'common-room',
      target: 'remedy-profile-common-room',
      magnify: false,
      title: 'From Common Room',
      body: 'Sign in with your Common Room account to see the notes you wrote there on this remedy. You can share one as a link anyone can read.',
    },
  ],
} satisfies Tour;
