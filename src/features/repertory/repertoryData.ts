import { useQuery } from '@tanstack/react-query';
import type { Repertory } from './types';

/**
 * Active repertory id. Defaults to the bundled study seed; swap to a full
 * repertory (e.g. "kent") once ingested into public/repertory/{id}.json.
 */
export const ACTIVE_REPERTORY = 'seed';

async function fetchRepertory(id: string): Promise<Repertory> {
  const res = await fetch(`${import.meta.env.BASE_URL}repertory/${id}.json`);
  if (!res.ok) throw new Error(`Could not load repertory "${id}" (${res.status})`);
  return res.json();
}

export function useRepertory(id: string = ACTIVE_REPERTORY) {
  return useQuery({
    queryKey: ['repertory', id],
    queryFn: () => fetchRepertory(id),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
}
