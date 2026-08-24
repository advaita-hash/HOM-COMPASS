import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Repertory } from './types';

export interface RepertoryOption {
  id: string;
  label: string;
  blurb: string;
}

/** Available repertories. Kent is the full (OCR-approximate) work; the seed is a
 *  compact, hand-verified study set. */
export const REPERTORIES: RepertoryOption[] = [
  {
    id: 'kent',
    label: "Kent's Repertory",
    blurb:
      'Full Kent, Mind–Urine (~27k rubrics). Extracted from a compressed scan — grades are reconstructed from case and remedy tallies are approximate.',
  },
  {
    id: 'seed',
    label: 'Study Seed',
    blurb: 'A compact, hand-verified set of classic rubrics with accurate grades.',
  },
];

interface SelectionState {
  id: string;
  setId: (id: string) => void;
}

/** Which repertory is active (persisted per browser). */
export const useRepertorySelection = create<SelectionState>()(
  persist(
    (set) => ({ id: 'kent', setId: (id) => set({ id }) }),
    { name: 'hom-compass.repertory' },
  ),
);

async function fetchRepertory(id: string): Promise<Repertory> {
  const res = await fetch(`${import.meta.env.BASE_URL}repertory/${id}.json`);
  if (!res.ok) throw new Error(`Could not load repertory "${id}" (${res.status})`);
  return res.json();
}

export function useRepertory() {
  const id = useRepertorySelection((s) => s.id);
  return useQuery({
    queryKey: ['repertory', id],
    queryFn: () => fetchRepertory(id),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
}
