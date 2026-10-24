import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Grade, Repertory, RubricRemedy } from './types';
import { safeStorage } from '../../lib/safeStorage';

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
    { name: 'hom-compass.repertory', storage: safeStorage() },
  ),
);

/** Compact on-disk form (remedy dictionary + integer indices) for large
 *  repertories, expanded here into the full Repertory shape. A slot whose path
 *  is "" is a retired rubric (merged into an earlier duplicate); it is skipped
 *  but still counts as a position, so every other rubric keeps its id. */
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

/** Rubric ids retired when duplicate rubrics were merged, per repertory:
 *  retired id → surviving id. Saved worksheets are migrated with this
 *  (see worksheetStore). Kept in sync with scripts/ingestion/dedupe_kent.py. */
export const RETIRED_RUBRIC_IDS: Record<string, Record<string, string>> = {
  kent: { k46002: 'k46001', k65312: 'k15312' },
};

/** One entry per remedy, at its highest listed grade, in first-listed order.
 *  The source data occasionally lists a remedy twice in the same rubric. */
function uniqueRemedies(remedies: RubricRemedy[]): RubricRemedy[] {
  const byName = new Map<string, RubricRemedy>();
  for (const r of remedies) {
    const cur = byName.get(r.name);
    if (!cur) byName.set(r.name, { ...r });
    else if (r.grade > cur.grade) cur.grade = r.grade;
  }
  return [...byName.values()];
}

function expand(c: CompactRepertory): Repertory {
  // Canonical chapter order (Mind, Vertigo, Head, …) so results follow the
  // repertory schema — Chapter → Rubric → Sub-rubric — not alphabetically.
  const chapterOrder = new Map(c.chapters.map((ch, i) => [ch.toLowerCase(), i]));
  const rubrics = c.rubrics
    .map(([fullpath, rems], i) => ({
      id: `k${i}`, // stable id tied to source position (saved worksheets keep working)
      ord: i, // source order = true rubric/sub-rubric sequence within a chapter
      chapter: fullpath.split(',')[0].trim(),
      rubric: fullpath,
      remedies: uniqueRemedies(
        rems.map(([idx, grade]) => ({
          name: c.remedies[idx],
          grade: grade as Grade,
        })),
      ),
    }))
    .filter((r) => r.rubric !== '') // retired slot — index (and so ids) preserved above
    .sort((a, b) => {
      const ca = chapterOrder.get(a.chapter.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
      const cb = chapterOrder.get(b.chapter.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
      // chapter first (schema order), then the source order inside the chapter
      return ca - cb || a.ord - b.ord;
    })
    .map(({ ord: _ord, ...r }) => r);
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

/** Full-form repertories get the same per-rubric remedy de-duplication. */
function normalise(r: Repertory): Repertory {
  return {
    ...r,
    rubrics: r.rubrics.map((rb) => ({ ...rb, remedies: uniqueRemedies(rb.remedies) })),
  };
}

async function fetchRepertory(id: string): Promise<Repertory> {
  const res = await fetch(`${import.meta.env.BASE_URL}repertory/${id}.json`);
  if (!res.ok) throw new Error(`Could not load repertory "${id}" (${res.status})`);
  const data = await res.json();
  return data.compact ? expand(data as CompactRepertory) : normalise(data as Repertory);
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

/** A specific repertory regardless of the user's selection (e.g. the full Kentian one for remedy profiles). */
export function useRepertoryById(id: string) {
  return useQuery({
    queryKey: ['repertory', id],
    queryFn: () => fetchRepertory(id),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
}
