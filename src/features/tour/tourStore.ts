import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistedObject, safeStorage } from '../../lib/safeStorage';
import { WELCOME_ID, getTour } from './registry';
import type { Tour } from './types';

// ---------------------------------------------------------------------------
// Tutorial state. Persisted: which tours each device has finished or
// dismissed (by version) and whether page tours start by themselves.
// Not persisted: the tour on screen and the page that is showing.
// ---------------------------------------------------------------------------

export interface ActiveTour {
  tourId: string;
  index: number;
  /** Started by itself (first visit) rather than from a ? button. */
  auto: boolean;
}

interface TourState {
  /** Tour id → the version finished or dismissed on this device. */
  seen: Record<string, number>;
  /** Page tours start by themselves the first time a page is opened. */
  tipsEnabled: boolean;
  active: ActiveTour | null;
  /** The mounted page's tour id, registered by usePageTour. */
  currentPageTour: string | null;
  start: (id: string, opts?: { auto?: boolean }) => void;
  next: () => void;
  back: () => void;
  /** Jump to a step (the overlay uses it to step back over skipped steps). */
  goTo: (index: number) => void;
  close: (reason: 'done' | 'skipped') => void;
  setTipsEnabled: (on: boolean) => void;
  /** Forget every seen tour, so each one shows again. */
  resetAll: () => void;
  setCurrentPageTour: (id: string | null) => void;
}

// Session memory, kept outside the store so blocked storage can't reset it:
// a tour never starts by itself twice in one session, and page tours wait
// until the welcome tour has had its turn.
const autoStarted = new Set<string>();
let welcomeShown = false;

export const hasSeen = (seen: Record<string, number>, tour: Tour) => (seen[tour.id] ?? 0) >= tour.version;

/** The welcome tour is out of the way: seen before, or already shown this session. */
function welcomeSettled(seen: Record<string, number>): boolean {
  const welcome = getTour(WELCOME_ID);
  return !welcome || welcomeShown || hasSeen(seen, welcome);
}

export const useTour = create<TourState>()(
  persist(
    (set, get) => ({
      seen: {},
      tipsEnabled: true,
      active: null,
      currentPageTour: null,

      start: (id, opts) => {
        const tour = getTour(id);
        if (!tour || tour.steps.length === 0) return;
        const auto = opts?.auto === true;
        if (auto) autoStarted.add(id);
        if (id === WELCOME_ID) welcomeShown = true;
        set({ active: { tourId: id, index: 0, auto } });
      },

      next: () => {
        const { active } = get();
        if (!active) return;
        const tour = getTour(active.tourId);
        if (!tour || active.index >= tour.steps.length - 1) get().close('done');
        else set({ active: { ...active, index: active.index + 1 } });
      },

      back: () => {
        const { active } = get();
        if (active && active.index > 0) set({ active: { ...active, index: active.index - 1 } });
      },

      goTo: (index) => {
        const { active } = get();
        const tour = active && getTour(active.tourId);
        if (!active || !tour) return;
        set({ active: { ...active, index: Math.max(0, Math.min(index, tour.steps.length - 1)) } });
      },

      close: (reason) => {
        const { active, seen, tipsEnabled, currentPageTour } = get();
        if (!active) return;
        const tour = getTour(active.tourId);
        const nextSeen = tour ? { ...seen, [tour.id]: tour.version } : seen;

        // Finishing the welcome tour goes straight on to this page's own tour.
        // (Skipping it doesn't: the page's tour waits for the next visit.)
        let follow: ActiveTour | null = null;
        const page = reason === 'done' && active.tourId === WELCOME_ID && currentPageTour ? getTour(currentPageTour) : undefined;
        if (page && page.steps.length > 0 && tipsEnabled && !hasSeen(nextSeen, page) && !autoStarted.has(page.id)) {
          autoStarted.add(page.id);
          follow = { tourId: page.id, index: 0, auto: true };
        }
        set({ seen: nextSeen, active: follow });
      },

      setTipsEnabled: (tipsEnabled) => set({ tipsEnabled }),

      resetAll: () => {
        autoStarted.clear();
        // the welcome tour comes back on the next launch; page tips come back
        // now (without this they would wait for a welcome that never starts)
        welcomeShown = true;
        set({ seen: {}, tipsEnabled: true });
      },

      setCurrentPageTour: (currentPageTour) => set({ currentPageTour }),
    }),
    {
      name: 'hom-compass.tour',
      storage: safeStorage(),
      partialize: (s) => ({ seen: s.seen, tipsEnabled: s.tipsEnabled }),
      merge: (persisted, current) => {
        const p = persistedObject(persisted);
        const seen: Record<string, number> = {};
        for (const [id, v] of Object.entries(persistedObject(p.seen))) {
          if (typeof v === 'number' && Number.isFinite(v)) seen[id] = v;
        }
        return {
          ...current,
          seen,
          tipsEnabled: typeof p.tipsEnabled === 'boolean' ? p.tipsEnabled : current.tipsEnabled,
        };
      },
    },
  ),
);

/** A sheet, dialog or sticky note is open: a tour started now would sit on top of it. */
export function modalOpen(): boolean {
  return !!document.querySelector('#root [aria-modal="true"], [role="alertdialog"], [data-sticky-note]');
}

/**
 * Start a tour by itself (first visit), if it may: it exists, tips are on,
 * nothing else is showing, this device hasn't seen this version, it hasn't
 * started by itself this session, and (for page tours) the welcome tour has
 * had its turn. 'wait' means it may start once a modal (or, for the welcome
 * tour, another tour) closes; 'no' means not this time.
 */
export function tryAutoStart(id: string): 'started' | 'wait' | 'no' {
  const s = useTour.getState();
  const tour = getTour(id);
  if (!tour || tour.steps.length === 0 || !s.tipsEnabled) return 'no';
  if (autoStarted.has(id) || hasSeen(s.seen, tour)) return 'no';
  if (s.active) return id === WELCOME_ID && s.active.tourId !== WELCOME_ID ? 'wait' : 'no';
  if (id !== WELCOME_ID && !welcomeSettled(s.seen)) return 'no';
  if (modalOpen()) return 'wait';
  s.start(id, { auto: true });
  return 'started';
}

/** tryAutoStart, as a yes/no. */
export function autoStartTour(id: string): boolean {
  return tryAutoStart(id) === 'started';
}

/** Stops the previous Help → "Show me" wait when another one starts. */
let cancelShowMe: (() => void) | null = null;

/**
 * Help → "Show me": after navigating to a tour's page, start the tour once
 * that page has mounted and registered itself (through usePageTour), as long
 * as the person is still on that page. Gives up when they go elsewhere, or
 * after `timeoutMs` (a page that never loads).
 */
export function startTourWhenPageShows(id: string, timeoutMs = 15000): void {
  cancelShowMe?.();
  const path = window.location.pathname;
  let timer = 0;
  const stillHere = () => window.location.pathname === path && useTour.getState().currentPageTour === id;
  const cancel = () => {
    unsubscribe();
    window.clearTimeout(timer);
    window.clearTimeout(giveUp);
    if (cancelShowMe === cancel) cancelShowMe = null;
  };
  const go = () => {
    unsubscribe();
    window.clearTimeout(giveUp);
    // let the page lay out first; the overlay also waits for each target
    timer = window.setTimeout(() => {
      cancel();
      const s = useTour.getState();
      if (!s.active && stillHere()) s.start(id);
    }, 300);
  };
  const unsubscribe = useTour.subscribe((s) => {
    if (window.location.pathname !== path) cancel();
    else if (s.currentPageTour === id) go();
  });
  const giveUp = window.setTimeout(cancel, timeoutMs);
  cancelShowMe = cancel;
  if (stillHere()) go();
}
