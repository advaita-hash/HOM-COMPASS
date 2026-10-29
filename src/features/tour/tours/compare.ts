import type { Tour } from '../types';

// The remedy picker first, then the comparison. The table only exists once two
// remedies are picked, so its steps fall back to a centred card. "Selected"
// and Clear all show only with something picked; "Browse the books" only with
// fewer than two.
export default {
  id: 'compare',
  title: 'Compare',
  summary: 'Put two to four remedies from Boericke, Tyler and Allen side by side to see how they differ.',
  route: '/compare',
  order: 70,
  version: 1,
  steps: [
    {
      id: 'choose',
      target: 'compare-choose',
      title: 'Choose remedies',
      body: "Pick 2 to 4 remedies to compare. {Tap} Choose remedies to fold this list away or open it again; it shows how many you've picked.",
    },
    {
      id: 'search',
      target: 'compare-search',
      title: 'Search remedies',
      body: "Type a remedy's name or common name to find it in Boericke, Tyler and Allen at once. The × button clears it.",
      tip: 'Type sepia and pick it from two different books.',
    },
    {
      id: 'books',
      target: 'compare-book',
      magnify: false,
      title: 'Books and letters',
      body: 'Remedies are grouped by book, then A to Z. {Tap} a letter to open it, then {tap} a remedy to tick it. {Tap} it again to untick.',
    },
    {
      id: 'selected',
      target: 'compare-selected',
      magnify: false,
      title: 'Selected',
      body: "The remedies you've picked are listed here first. {Tap} one to take it out. They stay saved on this device.",
    },
    {
      id: 'clear',
      target: 'compare-clear',
      title: 'Clear all',
      body: '{Tap} Clear all to take every remedy out and start a new comparison.',
    },
    {
      id: 'browse',
      target: 'compare-browse',
      title: 'Browse the books',
      body: '{Tap} it to open Reference Books. While you read a remedy there, {tap} Compare at the top to add it here.',
    },
    {
      id: 'column',
      target: 'compare-column',
      magnify: false,
      ifMissing: 'center',
      title: 'Each column',
      body: 'Once you pick 2 or more, each remedy gets a column. {Tap} Read full text to open it in its book, or the × button to take it out.',
    },
    {
      id: 'rows',
      target: 'compare-rows',
      magnify: false,
      ifMissing: 'center',
      title: 'Side by side',
      body: 'Rows show constitution, mind, generals, and what makes each remedy worse or better, so you can read across. {Tap} Show all on a row to see every line.',
    },
  ],
} satisfies Tour;
