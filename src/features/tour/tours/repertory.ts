import type { Tour } from '../types';

// The Repertory page: choose a repertory, find rubrics by word or chapter, and
// put them on the case worksheet. Rubric rows only show after a search or a
// chapter pick, so their steps fall back to a centred card.
export default {
  id: 'repertory',
  title: 'Repertory',
  summary: "Find rubrics by word or chapter, read each remedy's grade, and add rubrics to your case worksheet.",
  route: '/repertory',
  order: 40,
  version: 1,
  steps: [
    {
      id: 'choose-repertory',
      target: 'repertory-select',
      title: 'Choose a repertory',
      body: 'Pick the repertory to search: Repertorium Publicum, the full Kent-style repertory, or Study Seed, a small checked set. Switching empties your worksheet.',
    },
    {
      id: 'worksheet',
      target: 'repertory-worksheet',
      title: 'Worksheet',
      body: 'Rubrics you add go on your worksheet, saved on this device; the number shows how many. {Tap} Worksheet to open the Cases page and see which remedies cover them best.',
    },
    {
      id: 'search',
      target: 'repertory-search',
      title: 'Search rubrics',
      body: 'Type a repertory word, like thirst, to list the rubrics that contain exactly what you typed. For everyday wording, use Symptoms → rubrics on the Cases page.',
      tip: 'Type burning, then pick a chapter to narrow the list.',
    },
    {
      id: 'chapter',
      target: 'repertory-chapter',
      title: 'Pick a chapter',
      body: 'Choose a chapter, like Mind or Head, to see only its rubrics, in the same order as the book. Choose All to search every chapter.',
      magnify: false,
    },
    {
      // only while the full repertory is waiting for a search or a chapter
      id: 'browse',
      target: 'repertory-browse',
      title: 'Browse Mind',
      body: 'Not sure what to type? {Tap} Browse Mind to read the Mind chapter rubric by rubric, like turning the pages of the book.',
    },
    {
      id: 'add',
      target: 'repertory-add',
      title: 'Add to worksheet',
      body: 'Once rubrics are listed, {tap} the + button beside one to add it to your worksheet. It turns into a ✓; {tap} again to take it off.',
      magnify: true,
      ifMissing: 'center',
    },
    {
      id: 'remedy',
      target: 'repertory-remedy',
      title: 'Remedy names',
      body: "{Tap} any remedy name under a rubric to read the lines in Boericke, Tyler and Allen that mention the rubric's words, plus a link to the full text.",
      magnify: true,
      ifMissing: 'center',
    },
    {
      id: 'grades',
      target: 'repertory-grades',
      title: 'Remedy grades',
      body: "Colour shows a remedy's grade, how strongly it is known for the symptom: purple bold is 3, blue is 2, grey is 1. Higher grades score more in Cases.",
    },
  ],
} satisfies Tour;
