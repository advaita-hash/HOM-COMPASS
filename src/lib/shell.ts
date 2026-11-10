import { create } from 'zustand';

/**
 * App-shell UI state that lives outside App: whether the phone/tablet nav
 * drawer is open. Not persisted. The tour opens the drawer to point at menu
 * items, and App closes it again on every navigation.
 */
interface ShellState {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}

export const useShell = create<ShellState>((set) => ({
  menuOpen: false,
  setMenuOpen: (menuOpen) => set({ menuOpen }),
}));
