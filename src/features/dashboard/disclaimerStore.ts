import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistedObject, safeStorage } from '../../lib/safeStorage';

/** Whether the user has dismissed the one-time clinical disclaimer notice. */
interface DisclaimerAckState {
  acknowledged: boolean;
  acknowledge: () => void;
}

export const useDisclaimerAck = create<DisclaimerAckState>()(
  persist((set) => ({ acknowledged: false, acknowledge: () => set({ acknowledged: true }) }), {
    name: 'hom-compass.disclaimer-ack',
    storage: safeStorage(),
    merge: (persisted, current) => ({ ...current, acknowledged: persistedObject(persisted).acknowledged === true }),
  }),
);
