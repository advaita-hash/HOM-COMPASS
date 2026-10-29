import type { Tour } from '../types';

// My notes: the notepad saved on this device (an empty-state button, or lists
// by remedy and by book), then Common Room (the sign-in form, or once signed
// in, Sign out and the remedy notes from there). Only one of each pair shows,
// so the other is skipped; the remedy list falls back to a centred card.
export default {
  id: 'my-notes',
  title: 'My notes',
  summary: 'All your notes in one place: the ones you write in this app, and your remedy notes from Common Room.',
  route: '/my-notes',
  order: 80,
  version: 1,
  steps: [
    {
      id: 'notepad',
      target: 'my-notes-notepad',
      magnify: false,
      title: 'Notepad',
      body: "Notes you write on remedies and books gather here. They're saved on this device only, so use Export backup on the Patients page to keep a copy.",
    },
    {
      // only while the notepad is empty
      id: 'open-books',
      target: 'my-notes-open-books',
      title: 'Open Reference Books',
      body: "No notes yet? {Tap} Open Reference Books, choose a book and a remedy, then {tap} Notes. You can also use the My notes tab on a remedy's page.",
      tip: 'In Full text, select some words and {tap} Add note to pin a note there.',
    },
    {
      id: 'remedies',
      target: 'my-notes-remedy',
      magnify: false,
      ifMissing: 'center',
      title: 'Notes by remedy',
      body: 'Once you write notes on a remedy, it gets a line under Remedies with its newest note and how many there are. {Tap} the line to read, edit or delete them.',
    },
    {
      id: 'books',
      target: 'my-notes-book',
      magnify: false,
      title: 'Notes by book',
      body: "Each book you wrote notes in gets a line under Books, with how many notes it holds. {Tap} one to open that book's notes.",
    },
    {
      // signed out of Common Room
      id: 'sign-in',
      target: 'common-room-sign-in',
      magnify: false,
      title: 'Common Room sign-in',
      body: 'Common Room is a separate app with OPD notes. Sign in with your Common Room username or email and password to see your remedy notes from there.',
      tip: 'No password yet? {Tap} the Common Room link and set one under Edit profile.',
    },
    {
      // signed in
      id: 'sign-out',
      target: 'my-notes-sign-out',
      title: 'Sign out',
      body: "Once you're signed in to Common Room, your notes from there show below. {Tap} Sign out to stop showing them; they stay safe in Common Room.",
    },
    {
      id: 'common-room-notes',
      target: 'my-notes-common-room-note',
      magnify: false,
      title: 'Common Room notes',
      body: "Each remedy you noted in Common Room gets a line. {Tap} one to see its notes on the remedy's page, where you can share or delete them.",
      tip: "Share only notes without patient names; a share link can't be taken back.",
    },
    {
      // signed in, but no remedy notes in Common Room yet
      id: 'open-common-room',
      target: 'my-notes-open-common-room',
      title: 'Open Common Room',
      body: 'No Common Room notes yet? In its OPD notes, start a line with a remedy and a dash, like “Puls - weepy, thirstless”, and it shows up here.',
      tip: '{Tap} Open Common Room. It opens in another tab.',
    },
  ],
} satisfies Tour;
