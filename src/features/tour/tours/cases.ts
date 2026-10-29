import type { Tour } from '../types';

// The Case page (/analysis): pick the repertory, enter the patient, turn the
// symptoms into rubrics, save the case, and read the results. On phones and
// tablets the page shows whichever tab holds the current step's target (see
// TOUR_TABS in RepertorizationPage), so those steps fall back to a centred card
// only if that fails. The table needs rubrics first, so it often shows centred.
export default {
  id: 'cases',
  title: 'Cases',
  summary: "Turn a patient's symptoms into rubrics, see which remedies cover them best, and save the case to their record.",
  route: '/analysis',
  order: 50,
  version: 1,
  steps: [
    {
      id: 'tools',
      target: 'cases-tools',
      title: 'Choose a repertory',
      body: 'Rubrics come only from the repertory picked here; switching empties your worksheet. {Tap} Repertory to find more rubrics, and Clear case (once you start) to begin again.',
      magnify: false,
    },
    {
      // phones and tablets only; skipped on desktop, where every part shows
      id: 'tabs',
      target: 'cases-tabs',
      title: 'Patient, Symptoms, Analysis',
      body: 'On phones and tablets the case comes in three parts. {Tap} Patient, Symptoms or Analysis to switch; the number counts your rubrics.',
      magnify: false,
    },
    {
      id: 'patient',
      target: 'cases-patient',
      title: 'Patient',
      body: 'Pick a saved patient, or keep New patient… and type their name, plus age and gender if you like. Saving puts the case in their record.',
      magnify: false,
      ifMissing: 'center',
    },
    {
      id: 'cause',
      target: 'causative-factor',
      title: 'Causative factor',
      body: 'Type what brought the illness on, like grief, or {tap} one of the words below. {Tap} a rubric it finds to add it; causes count double.',
      magnify: false,
      ifMissing: 'center',
    },
    {
      id: 'symptoms',
      target: 'symptom-translator',
      title: 'Symptoms → rubrics',
      body: "Type the patient's own words, one symptom per line, and {tap} Find rubrics. {Tap} a suggested rubric to add it to the case.",
      tip: 'Turn on Translate everyday words. It runs on this device and understands more plain words.',
      magnify: false,
      ifMissing: 'center',
    },
    {
      id: 'save',
      target: 'cases-save',
      title: 'Save case',
      body: "With a patient and rubrics in, {tap} Save case. It goes into the patient's record on this device, and the page clears for the next patient.",
      tip: 'After saving, {tap} Open record to see the case.',
      ifMissing: 'center',
    },
    {
      // the empty state, or the ranked remedies once there are rubrics
      id: 'results',
      target: 'cases-results',
      title: 'Results',
      body: 'Remedies covering most rubrics come first. 3/4 means it covers 3 of your 4 rubrics; the next number is its score. {Tap} a remedy to read matching book lines.',
      magnify: false,
      ifMissing: 'center',
    },
    {
      id: 'table',
      target: 'cases-table',
      title: 'Rubric table',
      body: "Once you add rubrics, a table lists them with each remedy's grade. In the Int. column, set ×2 or ×3 to make a rubric count more, or {tap} × to remove it.",
      tip: 'Change Show above the table to see more remedies.',
      magnify: false,
      ifMissing: 'center',
    },
  ],
} satisfies Tour;
