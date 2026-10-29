import { useEffect } from 'react';
import { WELCOME_ID } from './registry';
import { autoStartTour, useTour } from './tourStore';

/** Time for a page to load and lay out before its tour starts by itself. */
const PAGE_SETTLE_MS = 700;
/** The welcome tour waits a little longer, so a page's first paint comes first. */
const WELCOME_DELAY_MS = 800;

/**
 * Call once near the top of a page component. Registers the page's tour (so
 * finishing the welcome tour can continue with it) and starts it by itself
 * the first time the page is shown: only after the welcome tour, only with
 * tips on, never over another tour, and never twice in one session.
 */
export function usePageTour(id: string): void {
  useEffect(() => {
    useTour.getState().setCurrentPageTour(id);
    const timer = window.setTimeout(() => autoStartTour(id), PAGE_SETTLE_MS);
    return () => {
      window.clearTimeout(timer);
      if (useTour.getState().currentPageTour === id) useTour.getState().setCurrentPageTour(null);
    };
  }, [id]);
}

/**
 * Starts the welcome tour once per device, for new and existing users alike,
 * shortly after the app first loads. `enabled` is false on pages without the
 * app shell (shared notes).
 */
export function useWelcomeTour(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => autoStartTour(WELCOME_ID), WELCOME_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [enabled]);
}

export default usePageTour;
