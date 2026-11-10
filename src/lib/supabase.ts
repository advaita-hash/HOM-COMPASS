import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from './supabaseConfig';

export { isSupabaseConfigured };

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Shared Supabase client, or `null` in demo mode. Consumers should branch on
 * `isSupabaseConfigured` (or the null check) and fall back to seed data.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null;
