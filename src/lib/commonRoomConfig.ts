// Common Room's database address and publishable key, apart from the client in
// commonRoom.ts so the server (api/ask.ts) can use them without the client.
// The key is safe to ship: row-level security limits every row to its owner.
export const COMMON_ROOM_SUPABASE_URL = 'https://iltosbkrqufpjprxbnmz.supabase.co';
export const COMMON_ROOM_PUBLISHABLE_KEY = 'sb_publishable_aqoCvEjShkCXYa5qAWD5Hg_b0jrCPsD';
