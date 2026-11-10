import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { commonRoom, loginEmail, type RemedyNoteEntry } from '../../lib/commonRoom';

/** The signed-in Common Room session (undefined while it is being read). */
export function useCommonRoomSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    commonRoom.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = commonRoom.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

export async function signInToCommonRoom(id: string, password: string) {
  const { error } = await commonRoom.auth.signInWithPassword({
    email: loginEmail(id),
    password,
  });
  if (error) throw new Error(/invalid/i.test(error.message) ? 'Wrong username or password.' : error.message);
}
export const signOutOfCommonRoom = () => commonRoom.auth.signOut();

/** The student's own remedy notes: all of them, or one remedy's (full repertory name). */
export function useRemedyNotes(userId: string | undefined, remedy?: string) {
  return useQuery({
    queryKey: ['remedy-notes', userId, remedy ?? '*'],
    enabled: !!userId,
    queryFn: async () => {
      let q = commonRoom.from('remedy_note_entries').select('*').order('created_at', { ascending: true });
      if (remedy) q = q.eq('remedy', remedy);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as RemedyNoteEntry[];
    },
  });
}

export function useDeleteRemedyNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await commonRoom.from('remedy_note_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['remedy-notes'] }),
  });
}
