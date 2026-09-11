import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Whether on-device semantic understanding is switched on (persisted). */
interface SemanticState {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}

export const useSemanticEnabled = create<SemanticState>()(
  persist((set) => ({ enabled: false, setEnabled: (v) => set({ enabled: v }) }), {
    name: 'hom-compass.semantic-enabled',
  }),
);
