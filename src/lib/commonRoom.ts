import { createClient } from '@supabase/supabase-js';

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
const SUPABASE_URL = 'https://iltosbkrqufpjprxbnmz.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_aqoCvEjShkCXYa5qAWD5Hg_b0jrCPsD';

export const commonRoom = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
  auth: {
    storageKey: 'hom-compass.common-room-auth',
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

export interface RemedyNoteEntry {
  id: string;
  remedy: string;
  body: string;
  visit_date: string | null;
  source_note_id: string | null;
  created_at: string;
  updated_at: string;
}
