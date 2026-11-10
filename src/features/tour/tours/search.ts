import type { Tour } from '../types';

// The search box, a centred card naming the four result groups, then one step
// per group, in on-screen order. Results only show after typing two letters (and the query isn't
// kept in the URL), so on a first visit the group steps are skipped and the
// centred card explains them; replaying the tour after a search points at each
// group's first result.
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
      tip: 'Close this tour, type thirst, then {tap} the ? button to see the results explained.',
    },
    {
      id: 'results',
      title: 'Your results',
      body: "After you search, matches show in four groups: your notes, the Materia Medica, repertory rubrics and the reference books. {Tap} a match to open it, or a group button to jump there.",
    },
    {
      id: 'notes',
      target: 'search-note-result',
      title: 'Your notes',
      body: 'Notes you wrote that match come first; this group only shows when one does. {Tap} a note to open it where you wrote it.',
    },
    {
      id: 'materia-medica',
      target: 'search-remedy-result',
      title: 'Materia Medica',
      body: "Matching remedies from the app's own study cards. {Tap} one to open it.",
    },
    {
      id: 'rubrics',
      target: 'search-rubric-result',
      title: 'Repertory rubrics',
      body: 'Matching repertory rubrics, with the number of remedies in brackets. {Tap} one to find it in the Repertory and add it to your case.',
    },
    {
      id: 'books',
      target: 'search-book-result',
      title: 'Reference Books',
      body: 'Remedy chapters in Boericke, Tyler, Allen and Farrington that use your words, with the words highlighted. {Tap} one to read that chapter.',
    },
  ],
} satisfies Tour;
