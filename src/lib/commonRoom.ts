import { createClient } from '@supabase/supabase-js';
import { COMMON_ROOM_PUBLISHABLE_KEY, COMMON_ROOM_SUPABASE_URL } from './commonRoomConfig';

// ---------------------------------------------------------------------------
// Common Room connection. Students' own remedy notes are written in Common
// Room's OPD notes ("Puls - weepy, thirstless") and stored in its database
// (table remedy_note_entries, readable only by their author). HOM COMPASS
// signs in with the same Common Room account to show them.
//
// The publishable key is safe to ship: row-level security limits every row to
// the signed-in student.
// ---------------------------------------------------------------------------

export const COMMON_ROOM_URL = 'https://common-room-six.vercel.app';

// localStorage that never throws (blocked site data, some private windows):
// the sign-in is then simply not kept, instead of an uncaught SecurityError.
const guardedStorage = {
  getItem: (k: string) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k: string, v: string) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* blocked */
    }
  },
  removeItem: (k: string) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* blocked */
    }
  },
};

export const commonRoom = createClient(COMMON_ROOM_SUPABASE_URL, COMMON_ROOM_PUBLISHABLE_KEY, {
  auth: {
    storageKey: 'hom-compass.common-room-auth',
    storage: guardedStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Common Room usernames are accounts on this domain (see Common Room's LOGIN_DOMAIN).
const LOGIN_DOMAIN = 'common-room-six.vercel.app';
export const loginEmail = (id: string) => {
  const v = id.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${LOGIN_DOMAIN}`;
};
export const usernameOf = (email?: string | null) =>
  email && email.endsWith('@' + LOGIN_DOMAIN) ? email.slice(0, -LOGIN_DOMAIN.length - 1) : (email ?? '');

/** A Common Room profile year: 1-4 are BHMS years, 11-13 the CA (ICAI) levels. */
export function yearLabel(year: number | null | undefined): string | null {
  if (year == null) return null;
  if (year >= 1 && year <= 4) return `${['1st', '2nd', '3rd', '4th'][year - 1]} year BHMS`;
  return ['CA Foundation', 'CA Intermediate', 'CA Final'][year - 11] ?? null;
}
export const isCaYear = (year: number | null | undefined) => year != null && year >= 11;

export interface RemedyNoteEntry {
  id: string;
  remedy: string;
  body: string;
  visit_date: string | null;
  source_note_id: string | null;
  created_at: string;
  updated_at: string;
}
