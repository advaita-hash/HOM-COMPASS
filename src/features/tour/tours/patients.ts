import type { Tour } from '../types';

// Patients: the add form, then the list (an empty state with Take a new case,
// or one line per patient; only one of the two shows), then Backup. Records
// live only in this browser (patientsStore persists to localStorage);
// Export backup downloads every hom-compass.* key but the Common Room sign-in,
// and Restore replaces them after a confirm (lib/backup.ts).
export default {
  id: 'patients',
  title: 'Patients',
  summary: 'Add patients, open their records, and back up everything this app keeps on your device.',
  route: '/patients',
  order: 120,
  version: 1,
  steps: [
    {
      id: 'add',
      target: 'patients-add',
      magnify: false,
      title: 'Add a patient',
      body: 'Type a name, and age and gender if you like, then {tap} Add. A name is all you need.',
    },
    {
      // only while there are no patients
      id: 'new-case',
      target: 'patients-new-case',
      title: 'Take a new case',
      body: 'No patients yet? {Tap} Take a new case to open the Cases page. Saving a case there adds the patient here too.',
    },
    {
      id: 'patient',
      target: 'patients-row',
      magnify: false,
      ifMissing: 'center',
      title: 'Your patients',
      body: 'Each patient gets a line with their age, gender and number of cases. {Tap} the line to open their record, or the bin button to delete them.',
    },
    {
      id: 'backup',
      target: 'patients-backup',
      magnify: false,
      title: 'Saved on this device',
      body: "Patients, cases and notes are kept only in this browser. They aren't uploaded, so clearing browser data or using another device starts empty.",
    },
    {
      id: 'export',
      target: 'patients-export',
      title: 'Export backup',
      body: '{Tap} to save one file with all your patients, cases, notes and settings to your downloads. Keep it safe: it holds patient details.',
      tip: 'Export every two weeks or so. A yellow note reminds you.',
    },
    {
      id: 'restore',
      target: 'patients-restore',
      title: 'Restore from backup',
      body: "Choose a backup file to bring your records back, for example on a new device. It replaces what's on this device, so it asks first.",
    },
  ],
} satisfies Tour;
