import type { Tour } from '../types';

// The Knowledge Graph: one item in the middle of a ring of up to 14 linked
// items, built from the 55-rubric sample repertory (public/repertory/seed.json).
// The map, details, list and colour key show once that sample has loaded, so
// the map step falls back to a centred card. Never magnify the svg.
export default {
  id: 'graph',
  title: 'Knowledge Graph',
  summary: 'See how remedies, rubrics and chapters link up, using a small sample of the repertory.',
  route: '/graph',
  order: 110,
  version: 1,
  steps: [
    {
      id: 'sample',
      target: 'graph-sample',
      magnify: false,
      title: 'Sample data',
      body: "This graph uses a small sample of 55 rubrics, not the full Kent repertory. It's for exploring how things link up, not for real cases.",
    },
    {
      id: 'search',
      target: 'graph-search',
      magnify: false,
      title: 'Find',
      body: 'Type at least two letters of a remedy, rubric or chapter. {Tap} a match to put it in the middle of the graph.',
      tip: 'Type “thirst” and {tap} one of the matches.',
    },
    {
      id: 'map',
      target: 'graph-map',
      magnify: false,
      ifMissing: 'center',
      title: 'The graph',
      body: 'The big dot in the middle is what you are exploring; the dots around it link to it. Thicker lines mean a higher grade. {Tap} any dot to move there.',
    },
    {
      id: 'details',
      target: 'graph-details',
      magnify: false,
      title: 'Details',
      body: 'Shows what the middle dot is and how many links it has. For a remedy, {tap} Read in reference books to look it up in Boericke.',
    },
    {
      id: 'connections',
      target: 'graph-connections',
      magnify: false,
      title: 'Connections',
      body: "The same links as a list, strongest first. g1 to g3 is the remedy's grade in that rubric. {Tap} one to move there.",
    },
    {
      id: 'legend',
      target: 'graph-legend',
      title: 'Colours',
      body: 'The colour of a dot shows what it is: green for a remedy, violet for a rubric and blue for a chapter.',
    },
  ],
} satisfies Tour;
