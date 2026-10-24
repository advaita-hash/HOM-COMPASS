import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from './safeStorage';

// ---------------------------------------------------------------------------
// Appearance (Light / Dark / Auto), as in Apple's Settings › Display.
// Auto follows the system; a manual choice is written to <html data-theme>,
// which the design tokens (design/tokens.js) honour over the system setting.
// index.html applies the stored choice before first paint, so there's no flash.
// ---------------------------------------------------------------------------

export type Appearance = 'system' | 'light' | 'dark';
export const APPEARANCE_KEY = 'hom-compass.appearance';

/** Browser-chrome colours — must match the base tokens. */
const CHROME = { light: '#f4f9f8', dark: '#0c1d1a' } as const;

export const useAppearance = create<{ mode: Appearance; setMode: (m: Appearance) => void }>()(
  persist((set) => ({ mode: 'system', setMode: (mode) => set({ mode }) }), {
    name: APPEARANCE_KEY,
    storage: safeStorage(),
  }),
);

export function applyAppearance(mode: Appearance) {
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);

  // Tint the browser chrome / iOS status area to match.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const scheme = (m.getAttribute('media') ?? '').includes('dark') ? 'dark' : 'light';
    m.content = CHROME[mode === 'system' ? scheme : mode];
  });
}

/** Keeps <html> in sync with the stored appearance. Mount once at the root. */
export function useApplyAppearance() {
  const mode = useAppearance((s) => s.mode);
  useEffect(() => applyAppearance(mode), [mode]);
}
