import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Repertory, RemedyScore, Rubric, WorksheetItem } from './types';
import { persistedObject, safeStorage } from '../../lib/safeStorage';
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
      // v1: duplicate Kent rubrics were merged. The remap itself runs in
      // `merge` on every load, so a future alias in RETIRED_RUBRIC_IDS reaches
      // existing worksheets without another version bump; bumping to 1 only
      // makes zustand write the remapped v0 worksheet back once.
      version: 1,
      migrate: (persisted) => persisted as WorksheetState,
      // Point saved items at the surviving rubric (ids of all other rubrics
      // are unchanged). Retired ids are tombstones, so this never touches a
      // live rubric. Only fields of the right type are taken from storage.
      merge: (persisted, current) => {
        const state = persistedObject(persisted);
        const repId = typeof state.repId === 'string' ? state.repId : current.repId;
        const items = Array.isArray(state.items)
          ? (state.items as Array<Partial<WorksheetItem> | null>).flatMap((i) =>
              i && typeof i.rubricId === 'string' && Number.isFinite(i.intensity)
                ? [{ rubricId: i.rubricId, intensity: i.intensity as number }]
                : [],
            )
          : current.items;
        return { ...current, repId, items: migrateRetiredIds(repId, items) };
      },
    },
  ),
);

/** Replace retired rubric ids with their surviving rubric. If that rubric is
 *  already on the worksheet, the two items become one at the higher intensity
 *  (in the position of the first), so no intensity a clinician set is lost. */
export function migrateRetiredIds(
  repId: string | null,
  items: WorksheetItem[],
): WorksheetItem[] {
  const aliases = (repId && RETIRED_RUBRIC_IDS[repId]) || {};
  const byId = new Map<string, WorksheetItem>();
  for (const item of items) {
    const rubricId = aliases[item.rubricId] ?? item.rubricId;
    const cur = byId.get(rubricId);
    if (cur) cur.intensity = Math.max(cur.intensity, item.intensity);
    else byId.set(rubricId, { ...item, rubricId });
  }
  return [...byId.values()];
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
