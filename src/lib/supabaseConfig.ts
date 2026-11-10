/**
 * Whether a live Supabase backend is configured. When false the app runs in
 * DEMO MODE and reads from the bundled seed knowledge graph instead.
 *
 * Kept apart from supabase.ts so the app shell can check it without loading
 * the Supabase client library at startup.
 */
export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);
