import { useSyncExternalStore } from 'react';

// Tour text says {Tap}/{tap}; people with a mouse read Click/click instead.

const COARSE = '(pointer: coarse)';
const FINE = '(pointer: fine)';

/** A touch screen is the main (or only) way to point. */
export function isTouchScreen(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  if (window.matchMedia(COARSE).matches) return true;
  return navigator.maxTouchPoints > 0 && !window.matchMedia(FINE).matches;
}

/** Replaces {Tap} / {tap} with Tap/tap on touch screens, Click/click otherwise. */
export function resolveTap(text: string, touch: boolean = isTouchScreen()): string {
  return text.replace(/\{Tap\}/g, touch ? 'Tap' : 'Click').replace(/\{tap\}/g, touch ? 'tap' : 'click');
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const queries = [window.matchMedia(COARSE), window.matchMedia(FINE)];
  queries.forEach((q) => q.addEventListener('change', onChange));
  return () => queries.forEach((q) => q.removeEventListener('change', onChange));
}

/** isTouchScreen(), kept current when a tablet gains or loses a mouse. */
export function useTouchScreen(): boolean {
  return useSyncExternalStore(subscribe, isTouchScreen, () => false);
}
