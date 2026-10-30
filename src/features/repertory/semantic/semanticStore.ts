import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistedObject, safeStorage } from '../../../lib/safeStorage';

/** Whether on-device semantic understanding is switched on (persisted). */
interface SemanticState {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}

export const useSemanticEnabled = create<SemanticState>()(
  persist((set) => ({ enabled: false, setEnabled: (v) => set({ enabled: v }) }), {
    name: 'hom-compass.semantic-enabled',
    storage: safeStorage(),
    merge: (persisted, current) => {
      const enabled = persistedObject(persisted).enabled;
      return { ...current, enabled: typeof enabled === 'boolean' ? enabled : current.enabled };
    },
  }),
);
