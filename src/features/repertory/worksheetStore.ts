import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Repertory, RemedyScore, Rubric, WorksheetItem } from './types';

interface WorksheetState {
  items: WorksheetItem[];
  add: (rubricId: string) => void;
  remove: (rubricId: string) => void;
  toggle: (rubricId: string) => void;
  setIntensity: (rubricId: string, intensity: number) => void;
  clear: () => void;
  has: (rubricId: string) => boolean;
}

export const useWorksheet = create<WorksheetState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (rubricId) => {
        if (get().items.some((i) => i.rubricId === rubricId)) return;
        set({ items: [...get().items, { rubricId, intensity: 1 }] });
      },
      remove: (rubricId) =>
        set({ items: get().items.filter((i) => i.rubricId !== rubricId) }),
      toggle: (rubricId) =>
        get().has(rubricId) ? get().remove(rubricId) : get().add(rubricId),
      setIntensity: (rubricId, intensity) =>
        set({
          items: get().items.map((i) =>
            i.rubricId === rubricId ? { ...i, intensity } : i,
          ),
        }),
      clear: () => set({ items: [] }),
      has: (rubricId) => get().items.some((i) => i.rubricId === rubricId),
    }),
    { name: 'hom-compass.worksheet' },
  ),
);

/**
 * Grade-weighted repertorisation: for each remedy across the selected rubrics,
 * sum (grade × rubric intensity) and count rubrics covered. Mirrors the
 * `graphrag_repertorize_symptoms` aggregation, computed client-side.
 */
export function repertorize(
  repertory: Repertory | undefined,
  items: WorksheetItem[],
): { scores: RemedyScore[]; rubrics: Rubric[] } {
  if (!repertory || items.length === 0) return { scores: [], rubrics: [] };

  const byId = new Map(repertory.rubrics.map((r) => [r.id, r]));
  const selected = items
    .map((i) => ({ item: i, rubric: byId.get(i.rubricId) }))
    .filter((x): x is { item: WorksheetItem; rubric: Rubric } => Boolean(x.rubric));

  const map = new Map<string, RemedyScore>();
  for (const { item, rubric } of selected) {
    for (const rem of rubric.remedies) {
      const cur =
        map.get(rem.name) ??
        { name: rem.name, rubricsCovered: 0, totalScore: 0, grades: {} };
      cur.rubricsCovered += 1;
      cur.totalScore += rem.grade * item.intensity;
      cur.grades[rubric.id] = rem.grade;
      map.set(rem.name, cur);
    }
  }

  const scores = [...map.values()].sort(
    (a, b) =>
      b.rubricsCovered - a.rubricsCovered || b.totalScore - a.totalScore,
  );
  return { scores, rubrics: selected.map((s) => s.rubric) };
}
