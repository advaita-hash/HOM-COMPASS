import type { Tour } from '../types';

// The search box, then one step per result group. Results only show after
// typing two letters, so those steps fall back to centred cards until then;
// each points at the group's first result.
export default {
  id: 'search',
  title: 'Search',
  summary: 'Look up a remedy, symptom or rubric in your notes, the materia medica, the reference books and the repertory at once.',
  route: '/search',
  order: 20,
  version: 1,
  steps: [
    {
      id: 'input',
      target: 'search-input',
      title: 'Search box',
      body: 'Type at least two letters of a remedy, symptom or rubric. Matches from all over the app show below as you type.',
      tip: 'Type thirst, then {tap} the ? button to tour the results.',
    },
    {
      id: 'notes',
      target: 'search-note-result',
      ifMissing: 'center',
      title: 'Your notes',
      body: 'Notes you wrote that match come first. This group only shows when one of your notes matches. {Tap} a note to open it where you wrote it.',
    },
    {
      id: 'materia-medica',
      target: 'search-remedy-result',
      ifMissing: 'center',
      title: 'Materia Medica',
      body: "After you search, matching remedies from the app's own Curated list show up. {Tap} one to open its study card.",
    },
    {
      id: 'books',
      target: 'search-book-result',
      ifMissing: 'center',
      title: 'Reference Books',
      body: 'After you search, remedy chapters in Boericke, Tyler and Allen that use your words show up, with the words highlighted. {Tap} one to read that chapter.',
    },
    {
      id: 'rubrics',
      target: 'search-rubric-result',
      ifMissing: 'center',
      title: 'Repertory rubrics',
      body: 'After you search, matching rubrics show up, with the number of remedies in brackets. {Tap} one to open the Repertory.',
    },
  ],
} satisfies Tour;
