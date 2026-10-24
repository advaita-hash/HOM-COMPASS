import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Repertory, RemedyScore, Rubric, WorksheetItem } from './types';
import { safeStorage } from '../../lib/safeStorage';
import { RETIRED_RUBRIC_IDS } from './repertoryData';

interface WorksheetState {
  /** Repertory the current worksheet belongs to (rubric ids are per-repertory). */
  repId: string | null;
  items: WorksheetItem[];
  /** Bind to a repertory; if it changed, clear items so rubrics only ever come
   *  from the chosen repertory. */
  setRepertory: (id: string) => void;
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
      repId: null,
      items: [],
      setRepertory: (id) => {
        if (get().repId !== id) set({ repId: id, items: [] });
      },
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
    {
      name: 'hom-compass.worksheet',
      storage: safeStorage(),
      version: 1,
      // v0 → v1: duplicate rubrics were merged in the Kent data; point saved
      // items at the surviving rubric (ids of all other rubrics are unchanged).
      migrate: (persisted, version) => {
        const state = persisted as Pick<WorksheetState, 'repId' | 'items'>;
        if (version < 1) state.items = migrateRetiredIds(state.repId, state.items ?? []);
        return state as WorksheetState;
      },
    },
  ),
);

/** Replace retired rubric ids with their surviving rubric, dropping any item
 *  that would then duplicate one already on the worksheet. */
export function migrateRetiredIds(
  repId: string | null,
  items: WorksheetItem[],
): WorksheetItem[] {
  const aliases = (repId && RETIRED_RUBRIC_IDS[repId]) || {};
  const seen = new Set<string>();
  const out: WorksheetItem[] = [];
  for (const item of items) {
    const rubricId = aliases[item.rubricId] ?? item.rubricId;
    if (seen.has(rubricId)) continue;
    seen.add(rubricId);
    out.push({ ...item, rubricId });
  }
  return out;
}

/** Keep the worksheet bound to the active repertory; resets it if the chosen
 *  repertory changes, so rubrics are only ever from the chosen repertory. */
export function useBindWorksheet(repId: string) {
  const setRepertory = useWorksheet((s) => s.setRepertory);
  useEffect(() => {
    setRepertory(repId);
  }, [repId, setRepertory]);
}

/**
 * Grade-weighted repertorisation: for each remedy across the selected rubrics,
 * sum (grade × rubric intensity) and count rubrics covered. Mirrors the
 * `graphrag_repertorize_symptoms` aggregation, computed client-side.
 * A remedy counts at most once per rubric (at its highest grade there), so
 * rubricsCovered can never exceed the number of rubrics on the worksheet.
 */
export function repertorize(
  repertory: Repertory | undefined,
  items: WorksheetItem[],
): { scores: RemedyScore[]; rubrics: Rubric[] } {
  if (!repertory || items.length === 0) return { scores: [], rubrics: [] };

  const byId = new Map(repertory.rubrics.map((r) => [r.id, r]));
  const seen = new Set<string>();
  const selected = items
    .filter((i) => {
      if (seen.has(i.rubricId)) return false; // a rubric counts once
      seen.add(i.rubricId);
      return true;
    })
    .map((i) => ({ item: i, rubric: byId.get(i.rubricId) }))
    .filter((x): x is { item: WorksheetItem; rubric: Rubric } => Boolean(x.rubric));

  const map = new Map<string, RemedyScore>();
  for (const { item, rubric } of selected) {
    // remedy → highest grade in this rubric (guards against repeated listings)
    const best = new Map<string, number>();
    for (const rem of rubric.remedies) {
      best.set(rem.name, Math.max(best.get(rem.name) ?? 0, rem.grade));
    }
    for (const [name, grade] of best) {
      const cur =
        map.get(name) ?? { name, rubricsCovered: 0, totalScore: 0, grades: {} };
      cur.rubricsCovered += 1;
      cur.totalScore += grade * item.intensity;
      cur.grades[rubric.id] = grade;
      map.set(name, cur);
    }
  }

  const scores = [...map.values()].sort(
    (a, b) =>
      b.rubricsCovered - a.rubricsCovered || b.totalScore - a.totalScore,
  );
  return { scores, rubrics: selected.map((s) => s.rubric) };
}
