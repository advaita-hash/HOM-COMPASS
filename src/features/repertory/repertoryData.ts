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
    label: 'Repertorium Publicum',
    blurb:
      'A complete public Kentian repertory (~74k rubrics, all chapters) with proper grades 1–4 and clean remedy names, from the open OOREP database (GPL-3.0).',
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

/** Compact on-disk form (remedy dictionary + integer indices) for large
 *  repertories, expanded here into the full Repertory shape. */
interface CompactRepertory {
  compact: true;
  id: string;
  title: string;
  author: string;
  source: string;
  note?: string;
  chapters: string[];
  rubricCount: number;
  remedies: string[];
  rubrics: [string, [number, number][]][];
}

function expand(c: CompactRepertory): Repertory {
  const rubrics = c.rubrics.map(([fullpath, rems], i) => ({
    id: `k${i}`,
    chapter: fullpath.split(',')[0].trim(),
    rubric: fullpath,
    remedies: rems.map(([idx, grade]) => ({
      name: c.remedies[idx],
      grade: grade as 1 | 2 | 3 | 4,
    })),
  }));
  return {
    id: c.id,
    title: c.title,
    author: c.author,
    source: c.source,
    note: c.note,
    chapters: c.chapters,
    rubricCount: c.rubricCount,
    rubrics,
  };
}

async function fetchRepertory(id: string): Promise<Repertory> {
  const res = await fetch(`${import.meta.env.BASE_URL}repertory/${id}.json`);
  if (!res.ok) throw new Error(`Could not load repertory "${id}" (${res.status})`);
  const data = await res.json();
  return data.compact ? expand(data as CompactRepertory) : (data as Repertory);
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
