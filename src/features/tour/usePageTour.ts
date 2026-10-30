import { useEffect } from 'react';
import { WELCOME_ID } from './registry';
import { tryAutoStart, useTour } from './tourStore';

/** Time for a page to load and lay out before its tour starts by itself. */
const PAGE_SETTLE_MS = 700;
/** The welcome tour waits a little longer, so a page's first paint comes first. */
const WELCOME_DELAY_MS = 800;
/** Try again this often while a sheet or dialog (or another tour) is in the way. */
const RETRY_MS = 500;

/** Tries to start a tour by itself after `delay`, again while something is in the way. */
function autoStartSoon(id: string, delay: number, stillWanted: () => boolean): () => void {
  let timer = 0;
  const attempt = () => {
    if (stillWanted() && tryAutoStart(id) === 'wait') timer = window.setTimeout(attempt, RETRY_MS);
  };
  timer = window.setTimeout(attempt, delay);
  return () => window.clearTimeout(timer);
}

/**
 * Call once near the top of a page component. Registers the page's tour (so
 * finishing the welcome tour can continue with it) and starts it by itself
 * the first time the page is shown: only after the welcome tour, only with
 * tips on, never over another tour or an open sheet or dialog (it waits for
 * those to close), and never twice in one session.
 */
export function usePageTour(id: string): void {
  useEffect(() => {
    useTour.getState().setCurrentPageTour(id);
    const stop = autoStartSoon(id, PAGE_SETTLE_MS, () => useTour.getState().currentPageTour === id);
    return () => {
      stop();
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
    return autoStartSoon(WELCOME_ID, WELCOME_DELAY_MS, () => true);
  }, [enabled]);
}

export default usePageTour;
