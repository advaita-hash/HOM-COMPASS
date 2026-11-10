import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistedObject, safeStorage } from '../../lib/safeStorage';

/**
 * The current case's symptoms, stored as INDIVIDUAL entries (one per line) and
 * persisted. The typing UI is unchanged (a single textarea) — only the storage
 * differs: every symptom line is kept as its own item, so nothing is lumped
 * together or lost.
 */
interface CaseDraftState {
  symptoms: string[];
  /** Bind the textarea: keep raw lines (incl. blanks) so editing stays natural. */
  setFromText: (text: string) => void;
  removeSymptom: (index: number) => void;
  clear: () => void;
}

export const useCaseDraft = create<CaseDraftState>()(
  persist(
    (set, get) => ({
      symptoms: [],
      setFromText: (text) => set({ symptoms: text.split('\n') }),
      removeSymptom: (index) =>
        set({ symptoms: get().symptoms.filter((_, i) => i !== index) }),
      clear: () => set({ symptoms: [] }),
    }),
    {
      name: 'hom-compass.casedraft',
      storage: safeStorage(),
      // keep only string lines, whatever storage or a restored backup holds
      merge: (persisted, current) => {
        const s = persistedObject(persisted).symptoms;
        const symptoms = Array.isArray(s)
          ? s.filter((x): x is string => typeof x === 'string')
          : typeof s === 'string'
            ? s.split('\n')
            : current.symptoms;
        return { ...current, symptoms };
      },
    },
  ),
);

/** The individual, non-empty symptoms (what gets saved to the case). */
export function cleanSymptoms(symptoms: string[]): string[] {
  return symptoms.map((s) => s.trim()).filter(Boolean);
}
