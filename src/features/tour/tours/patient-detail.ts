import type { Tour } from '../types';

// One patient's record (/patients/:patientId): no route, since it needs a
// patient the person may not have. General notes, then one card per visit,
// newest first. The case card, its bin button and its link only exist once
// there is a case; the card step falls back to a centred card.
export default {
  id: 'patient-detail',
  title: 'Patient record',
  summary: "One patient's record: general notes, and a card for each visit with its symptoms and notes.",
  howToOpen: 'Open a patient on the Patients page to see this tour.',
  order: 125,
  version: 1,
  steps: [
    {
      id: 'back',
      target: 'patient-detail-back',
      title: 'Back to Patients',
      body: '{Tap} Patients to go back to your list of patients.',
    },
    {
      id: 'notes',
      target: 'patient-detail-notes',
      magnify: false,
      title: 'Patient notes',
      body: 'Write general notes here, like constitution or background. They save as you type, on this device only.',
    },
    {
      id: 'new-case',
      target: 'patient-detail-new-case',
      title: 'New case',
      body: '{Tap} New case at each visit. It adds a case card dated today, with the newest at the top.',
    },
    {
      id: 'case',
      target: 'patient-detail-case',
      magnify: false,
      ifMissing: 'center',
      title: 'A visit',
      body: 'Each new case card shows the visit date; change it for a past visit. List symptoms one per line and notes like the remedy given. It saves as you type.',
    },
    {
      id: 'delete',
      target: 'patient-detail-delete',
      magnify: true,
      title: 'Delete a case',
      body: '{Tap} the bin button to delete this visit, with its symptoms and notes. It asks you first.',
    },
    {
      id: 'workspace',
      target: 'patient-detail-workspace',
      title: 'Find remedies',
      body: "{Tap} Find remedies in Cases to open the Cases page. Enter this case's symptoms there to turn them into rubrics and see which remedies fit.",
    },
  ],
} satisfies Tour;
