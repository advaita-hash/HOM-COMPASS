import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistedObject, safeStorage } from '../../lib/safeStorage';

/** Free questions a day on this device (the server also counts per network). */
export const FREE_DAILY = 2;

const today = () => new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD

interface AskState {
  /** Premium code the person entered ('' for free). */
  code: string;
  /** Local date of `used`. */
  day: string;
  /** Free questions asked on `day`. */
  used: number;
  setCode: (code: string) => void;
  countFreeQuestion: () => void;
}

export const useAsk = create<AskState>()(
  persist(
    (set, get) => ({
      code: '',
      day: today(),
      used: 0,
      setCode: (code) => set({ code: code.trim() }),
      countFreeQuestion: () => {
        const d = today();
        set({ day: d, used: get().day === d ? get().used + 1 : 1 });
      },
    }),
    {
      name: 'hom-compass.ask',
      storage: safeStorage(),
      merge: (persisted, current) => {
        const p = persistedObject(persisted);
        return {
          ...current,
          code: typeof p.code === 'string' ? p.code : '',
          day: typeof p.day === 'string' ? p.day : current.day,
          used: typeof p.used === 'number' ? p.used : 0,
        };
      },
    },
  ),
);

/** Free questions left today. */
export const freeLeft = (s: Pick<AskState, 'day' | 'used'>) => Math.max(0, FREE_DAILY - (s.day === today() ? s.used : 0));
