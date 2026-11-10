import { type CSSProperties, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Lightbulb, X } from 'lucide-react';
import { useShell } from '../../lib/shell';
import { WELCOME_ID, getTour } from './registry';
import { type ActiveTour, useTour } from './tourStore';
import { resolveTap, useTouchScreen } from './tapText';
import { Loupe } from './Loupe';
import {
  type Box,
  type Insets,
  findVisible,
  isFixed,
  isVisible,
  measureHole,
  needsScroll,
  prefersReducedMotion,
  readInsets,
  sameBox,
  scrollParent,
  settle,
  shouldMagnify,
  sleep,
  waitForTarget,
} from './dom';
import type { Tour, TourPlacement } from './types';

// ---------------------------------------------------------------------------
// The visible tour: the screen dims except for a rounded spotlight around the
// step's target (with a pulsing accent ring), and a card explains it. Wide
// screens put the card beside the target with a small arrow; phones dock it to
// the bottom edge (or the top, when the target is low). The app behind is
// inert while a tour runs; focus moves into the card and comes back after.
// ---------------------------------------------------------------------------

/** Space between the target and the edge of the spotlight. */
const PAD = 6;
/** How long to wait for a step's target to appear before skipping it (while the page loads). */
const WAIT_MS = 1500;
/** A tour has just started or the page just changed: its targets may still be loading. */
const LOADING_MS = 1000;
/** A centred step's target is checked this briefly once the page has loaded. */
const GRACE_MS = 200;
/** Re-measure this often, for targets that move without scrolling or resizing. */
const FOLLOW_MS = 250;
/** The nav drawer slides for 500 ms; measure after it stops. */
const DRAWER_MS = 550;
/** Longest wait for a target to stop moving (long smooth scrolls). */
const SETTLE_MS = 900;
/** Fade the card out while a lookup takes longer than this. */
const SLOW_MS = 150;
/** Card distance from the viewport edges. */
const EDGE = 16;
/** Card distance from the spotlight; the arrow sits in this gap. */
const GAP = 14;
const CARD_MAX_W = 360;
/** Tailwind's lg (sidebar becomes a drawer below it) and sm (phones dock the card below it). */
const LG = 1024;
const SM = 640;
/** Shorter than this (a phone on its side): drop the magnifier when the card won't fit. */
const COMPACT_H = 520;
/** Smallest a phone card shrinks to (its text scrolls) to stay clear of the target. */
const MIN_CARD_H = 220;
/** The same on a phone on its side, where the whole screen is about 390px tall. */
const MIN_CARD_H_SHORT = 180;
/** The phone/tablet top bar (h-14), fixed over the top of the page. */
const TOP_BAR = 56;
const MOVE = '300ms cubic-bezier(0.16, 1, 0.3, 1)'; // ease-smooth
const FADE = '200ms cubic-bezier(0.16, 1, 0.3, 1)';
const SIDES = ['bottom', 'top', 'right', 'left'] as const;

type Side = (typeof SIDES)[number];

interface Viewport {
  w: number;
  h: number;
  insets: Insets;
}

/** The step on screen (lags behind the store's index while the next target is found). */
interface Shown {
  tourId: string;
  index: number;
  target: Element | null;
  /** null: a centred step, plain dim with no spotlight. */
  hole: Box | null;
  radius: number;
}

interface Placed {
  x: number;
  y: number;
  /** Which side of the target the card is on, for the arrow. */
  side?: Side;
  /** The target's centre along that edge, from the card's left (or top). */
  arrow?: number;
  /** A shorter card than its content (which then scrolls), to keep clear of the target. */
  maxH?: number;
}

const readViewport = (): Viewport => ({ w: window.innerWidth, h: window.innerHeight, insets: readInsets() });

/** What the fixed top bar hides of the page (phones and tablets only). */
const topBarOf = (vp: Viewport) => (vp.w < LG ? TOP_BAR + vp.insets.top : 0);

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

/** `natural` is the card's full height; it is capped to the screen (its content scrolls). */
function placeCard(hole: Box | null, cw: number, natural: number, vp: Viewport, pref?: TourPlacement): Placed {
  const safe = {
    left: EDGE + vp.insets.left,
    top: EDGE + vp.insets.top,
    right: vp.w - EDGE - vp.insets.right,
    bottom: vp.h - EDGE - vp.insets.bottom,
  };
  const ch = Math.min(natural, safe.bottom - safe.top);
  const centreX = (vp.w - cw) / 2;
  if (!hole) return { x: centreX, y: Math.max(safe.top, (vp.h - ch) / 2) };

  const hx = (hole.left + hole.right) / 2;
  const hy = (hole.top + hole.bottom) / 2;
  // phones: dock to the bottom edge, or to the top when the target is low
  // (or when only the top has room for a tall card)
  if (vp.w < SM) {
    const fitsBelow = hole.bottom + GAP + ch <= safe.bottom;
    const fitsAbove = hole.top - GAP - ch >= safe.top;
    if (fitsBelow || fitsAbove) {
      const top = fitsBelow !== fitsAbove ? fitsAbove : hy > vp.h / 2;
      return { x: centreX, y: top ? safe.top : safe.bottom - ch };
    }
    // room on neither side: a shorter card on the roomier side, if that leaves enough
    const roomAbove = hole.top - GAP - safe.top;
    const roomBelow = safe.bottom - (hole.bottom + GAP);
    if (Math.max(roomAbove, roomBelow) >= MIN_CARD_H) {
      return roomAbove >= roomBelow
        ? { x: centreX, y: safe.top, maxH: roomAbove }
        : { x: centreX, y: hole.bottom + GAP, maxH: roomBelow };
    }
    // a target taller than the room: keep its top edge in view above a bottom
    // card when it can be, otherwise hide less of it
    const topShows = hole.top + 24 <= safe.bottom - ch - GAP;
    const top = !topShows && safe.top + ch - hole.top < hole.bottom - (safe.bottom - ch);
    return { x: centreX, y: top ? safe.top : safe.bottom - ch };
  }

  const atX = (x: number) => clamp(x, safe.left, safe.right - cw);
  const atY = (y: number) => clamp(y, safe.top, safe.bottom - ch);
  const order = pref && pref !== 'auto' ? [pref, ...SIDES.filter((s) => s !== pref)] : SIDES;
  for (const side of order) {
    if (side === 'bottom' && hole.bottom + GAP + ch <= safe.bottom) {
      const x = atX(hx - cw / 2);
      return { x, y: hole.bottom + GAP, side, arrow: hx - x };
    }
    if (side === 'top' && hole.top - GAP - ch >= safe.top) {
      const x = atX(hx - cw / 2);
      return { x, y: hole.top - GAP - ch, side, arrow: hx - x };
    }
    if (side === 'right' && hole.right + GAP + cw <= safe.right) {
      const y = atY(hy - ch / 2);
      return { x: hole.right + GAP, y, side, arrow: hy - y };
    }
    if (side === 'left' && hole.left - GAP - cw >= safe.left) {
      const y = atY(hy - ch / 2);
      return { x: hole.left - GAP - cw, y, side, arrow: hy - y };
    }
  }
  // no room beside it (a whole area, a short screen): a step that asks for a
  // side keeps to that edge of the screen (over the target's empty margin);
  // otherwise the spot that covers least of the target
  if (pref === 'left' || pref === 'right') return { x: pref === 'left' ? safe.left : safe.right - cw, y: atY(hy - ch / 2) };
  const roomBelow = safe.bottom - hole.bottom;
  const roomAbove = hole.top - safe.top;
  // a phone on its side: a shorter card (its text scrolls) above or below,
  // as on phones, when that side leaves enough room
  if (vp.h < COMPACT_H) {
    const above = roomAbove - GAP;
    const below = roomBelow - GAP;
    if (Math.max(above, below) >= MIN_CARD_H_SHORT) {
      const x = atX(hx - cw / 2);
      return above >= below
        ? { x, y: safe.top, maxH: above }
        : { x, y: hole.bottom + GAP, maxH: below };
    }
  }
  const xs = [atX(hx - cw / 2), safe.left, safe.right - cw];
  const ys = [roomBelow >= roomAbove ? safe.bottom - ch : safe.top, safe.top, safe.bottom - ch, atY(hy - ch / 2)];
  let best = { x: xs[0], y: ys[0], area: Infinity };
  for (const y of ys) {
    for (const x of xs) {
      const area = overlap({ left: x, top: y, right: x + cw, bottom: y + ch }, hole);
      if (area < best.area - 1) best = { x, y, area };
    }
  }
  return { x: best.x, y: best.y };
}

function arrowStyle(p: Placed, cw: number, ch: number): CSSProperties | undefined {
  if (!p.side || p.arrow === undefined) return undefined;
  // a 12px square turned 45°, half of it outside the card, kept clear of the corners
  if (p.side === 'bottom' || p.side === 'top') {
    const left = clamp(p.arrow - 6, 20, cw - 32);
    return p.side === 'bottom' ? { top: -6, left } : { bottom: -6, left };
  }
  const top = clamp(p.arrow - 6, 20, ch - 32);
  return p.side === 'right' ? { left: -6, top } : { right: -6, top };
}

/**
 * Which steps can show now: no target, shown centred when missing, or a
 * visible target, and not skipped already. Drives the counter, the dots and
 * where Next and Back go (straight past controls this screen doesn't have).
 */
function plan(tour: Tour, at: number, skipped: Set<number>) {
  const ok = tour.steps.map(
    (s, i) => i === at || (!skipped.has(i) && (!s.target || s.ifMissing === 'center' || !!findVisible(s.target))),
  );
  let prev = -1;
  for (let j = at - 1; j >= 0; j--) {
    if (ok[j]) {
      prev = j;
      break;
    }
  }
  return {
    total: ok.filter(Boolean).length,
    pos: ok.slice(0, at + 1).filter(Boolean).length,
    prev,
    next: ok.indexOf(true, at + 1),
  };
}

/**
 * Tab and Shift+Tab cycle through the card's own controls. The tour owns the
 * key outright, so traps of a sheet or dialog underneath never see it.
 */
function trapTab(e: KeyboardEvent, card: HTMLElement | null) {
  e.preventDefault();
  e.stopPropagation();
  if (!card) return;
  // not the magnifier's copy of the target (inert, hidden from assistive tech)
  const items = Array.from(
    card.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'),
  ).filter((el) => !el.closest('[inert], [aria-hidden="true"]'));
  if (items.length === 0) return;
  const at = items.indexOf(document.activeElement as HTMLElement);
  const to = at < 0 ? (e.shiftKey ? items.length - 1 : 0) : (at + (e.shiftKey ? -1 : 1) + items.length) % items.length;
  items[to].focus();
}

/** A tour's entry in a per-tour set of step indexes (made on first use). */
function setOf(map: Map<string, Set<number>>, tourId: string): Set<number> {
  const known = map.get(tourId);
  if (known) return known;
  const steps = new Set<number>();
  map.set(tourId, steps);
  return steps;
}

/** Mount once inside the router. Renders the active tour over everything. */
export function TourOverlay() {
  const active = useTour((s) => s.active);
  const { pathname } = useLocation();
  const tour = active ? getTour(active.tourId) : undefined;
  if (!active || !tour || pathname === '/shared/note') return null;
  return createPortal(<TourLayer active={active} tour={tour} />, document.body);
}

function TourLayer({ active, tour }: { active: ActiveTour; tour: Tour }) {
  const index = active.index;
  const touch = useTouchScreen();
  const { pathname } = useLocation();
  const titleId = useId();
  const bodyId = useId();
  const tipId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  /** The card's scrolling part, and its content (to measure the card's full height). */
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [vp, setVp] = useState(readViewport);
  const [shown, setShown] = useState<Shown | null>(null);
  /** Follow scrolling/resizing without easing (easing would trail behind). */
  const [instant, setInstant] = useState(false);
  /** Still looking for the next target: hide the card meanwhile. */
  const [slow, setSlow] = useState(false);
  const [cardH, setCardH] = useState(0);
  /** The card has been painted in place once; animate moves from now on. */
  const [placed, setPlaced] = useState(false);
  const [, setSkipRev] = useState(0);

  const vpRef = useRef(vp);
  const shownRef = useRef(shown);
  const targetRef = useRef<Element | null>(null);
  /** The tour opened the drawer (so it closes it again). */
  const openedMenu = useRef(false);
  const drawerMovedAt = useRef(0);
  /** Steps skipped for a missing target, per tour (the welcome tour can hand over to a page's). */
  const skipped = useRef(new Map<string, Set<number>>());
  /** Centred steps whose target wasn't there, per tour: shown at once next time. */
  const missing = useRef(new Map<string, Set<number>>());
  const lastShown = useRef<{ tourId: string; index: number } | null>(null);
  const startPath = useRef({ tourId: tour.id, path: pathname });
  /** When this tour started or the page last changed (targets may still be loading). */
  const loadingSince = useRef(performance.now());
  /** Scroll areas (the menu, inner panels) the tour scrolled, and where they were. */
  const scrolled = useRef(new Map<Element, { top: number; left: number }>());

  useLayoutEffect(() => {
    vpRef.current = vp;
    shownRef.current = shown;
  });

  const skippedOf = (tourId: string) => setOf(skipped.current, tourId);

  /** Remember where the target's scroll areas were (not the page itself), to put them back. */
  const rememberScroll = (el: Element) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (p === document.scrollingElement || p.tagName === 'MAIN' || scrolled.current.has(p)) continue;
      const cs = getComputedStyle(p);
      const scrolls = /(auto|scroll|overlay)/.test(`${cs.overflowY} ${cs.overflowX}`);
      if (scrolls && (p.scrollHeight > p.clientHeight || p.scrollWidth > p.clientWidth)) {
        scrolled.current.set(p, { top: p.scrollTop, left: p.scrollLeft });
      }
    }
  };

  /** The card's full height, even while it is shorter and its content scrolls. */
  const naturalH = () => {
    const card = cardRef.current;
    const sc = scrollRef.current;
    if (!card) return 0;
    return card.offsetHeight + (sc ? sc.scrollHeight - sc.clientHeight : 0);
  };

  // The app behind can't be used while a tour runs; afterwards focus goes back.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.getElementById('root');
    root?.setAttribute('inert', '');
    return () => {
      root?.removeAttribute('inert');
      if (openedMenu.current) {
        openedMenu.current = false;
        useShell.getState().setMenuOpen(false);
      }
      if (opener && opener !== document.body && opener.isConnected) {
        opener.focus({ preventScroll: true });
        return;
      }
      // the opener is gone (Help → "Show me" changed page) or there was none (a
      // tour that started by itself): start from the page's heading, not <body>
      requestAnimationFrame(() => {
        if (document.activeElement && document.activeElement !== document.body) return;
        const to = document.querySelector<HTMLElement>('main h1') ?? document.querySelector<HTMLElement>('main');
        if (!to) return;
        if (!to.hasAttribute('tabindex')) to.setAttribute('tabindex', '-1');
        to.focus({ preventScroll: true });
      });
    };
  }, []);

  // Put back the menu and inner panels the tour scrolled, when it ends (or
  // hands over to a page's tour). The page itself stays where it is.
  useEffect(() => {
    const map = scrolled.current;
    return () => {
      for (const [el, at] of map) if (el.isConnected) el.scrollTo({ top: at.top, left: at.left, behavior: 'auto' });
      map.clear();
    };
  }, [tour.id]);

  useEffect(() => {
    const onResize = () => setVp(readViewport());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  // Leaving the page (browser Back) ends its tour. The welcome tour points at
  // the menu, which every page has, so it carries on.
  useEffect(() => {
    loadingSince.current = performance.now();
    const sp = startPath.current;
    if (sp.tourId !== tour.id) startPath.current = { tourId: tour.id, path: pathname };
    else if (tour.id !== WELCOME_ID && pathname !== sp.path) useTour.getState().close('skipped');
  }, [pathname, tour.id]);

  // Find, reveal and measure the current step's target.
  useEffect(() => {
    const step = tour.steps[index];
    if (!step) return;
    const token = { cancelled: false };
    const last = lastShown.current;
    const dir = last && last.tourId === tour.id && index < last.index ? -1 : 1;
    const reduced = prefersReducedMotion();
    // Wait the full time only while the page may still be loading; a centred
    // step's control (one that appears later) gets a short look once it has,
    // and none at all once it is known to be missing.
    const centred = step.ifMissing === 'center';
    const absent = setOf(missing.current, tour.id);
    const loading = !last || last.tourId !== tour.id || performance.now() - loadingSince.current < LOADING_MS;
    const waitMs = centred && absent.has(index) ? 0 : centred && !loading ? GRACE_MS : WAIT_MS;
    // the card fades out only while something takes a while (a long wait, the drawer, a scroll)
    let slowTimer = 0;
    const goSlow = () => {
      if (!slowTimer) slowTimer = window.setTimeout(() => setSlow(true), SLOW_MS);
    };
    if (step.target && waitMs > GRACE_MS) goSlow();

    void (async () => {
      // menu steps open the drawer (phones/tablets); other steps close it, as
      // it would cover their targets (even the ☰ button)
      const shell = useShell.getState();
      const narrow = window.innerWidth < LG;
      if (step.menu === 'open' && narrow) {
        if (!shell.menuOpen) {
          shell.setMenuOpen(true);
          openedMenu.current = true;
          drawerMovedAt.current = performance.now();
        }
      } else if (shell.menuOpen && (narrow || openedMenu.current)) {
        openedMenu.current = false;
        shell.setMenuOpen(false);
        drawerMovedAt.current = performance.now();
      }
      const drawerLeft = drawerMovedAt.current + (reduced ? 50 : DRAWER_MS) - performance.now();
      if (step.target && drawerLeft > 0) {
        goSlow();
        await sleep(drawerLeft);
      }
      if (token.cancelled) return;

      const el = step.target ? await waitForTarget(step.target, token, waitMs) : null;
      if (token.cancelled) return;
      if (step.target && centred) {
        if (el) absent.delete(index);
        else absent.add(index);
      }

      if (step.target && !el && step.ifMissing !== 'center') {
        // not on this screen: skip it, carrying on the way the person was going
        const gone = setOf(skipped.current, tour.id);
        gone.add(index);
        setSkipRev((n) => n + 1);
        const s = useTour.getState();
        let prev = index - 1;
        while (prev >= 0 && gone.has(prev)) prev--;
        if (dir < 0 && prev >= 0) s.goTo(prev);
        else s.next();
        return;
      }

      if (el) {
        if (needsScroll(el, topBarOf(vpRef.current))) {
          goSlow();
          rememberScroll(el);
          el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
        }
        await settle(el, token, SETTLE_MS);
        if (token.cancelled) return;
      }

      window.clearTimeout(slowTimer);
      targetRef.current = el;
      lastShown.current = { tourId: tour.id, index };
      const m = el ? measureHole(el, PAD, topBarOf(vpRef.current)) : null;
      setInstant(false);
      setSlow(false);
      setShown({ tourId: tour.id, index, target: el, hole: m?.hole ?? null, radius: m?.radius ?? 0 });
    })();

    return () => {
      token.cancelled = true;
      window.clearTimeout(slowTimer);
    };
  }, [tour, index]);

  // Keep the spotlight on the target as the page scrolls, resizes or re-renders.
  const shownTarget = shown?.target ?? null;
  const shownStepTarget = shown ? getTour(shown.tourId)?.steps[shown.index]?.target : undefined;
  useEffect(() => {
    if (!shownTarget) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const cur = shownRef.current;
      if (!cur) return;
      // the next step was just found but hasn't rendered yet: targetRef is
      // already its target, and writing it back with this (old) step would
      // undo the step change; the new step measures itself
      const ls = lastShown.current;
      if (ls && (ls.tourId !== cur.tourId || ls.index !== cur.index)) return;
      let el = targetRef.current;
      // React may have replaced the element: find it again
      if ((!el || !isVisible(el)) && shownStepTarget) el = findVisible(shownStepTarget) ?? el;
      if (!el) return;
      targetRef.current = el;
      const m = measureHole(el, PAD, topBarOf(vpRef.current));
      if (cur.target === el && sameBox(cur.hole, m.hole) && Math.abs(cur.radius - m.radius) < 0.5) return;
      setInstant(true);
      setShown({ ...cur, target: el, hole: m.hole, radius: m.radius });
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    document.addEventListener('scroll', schedule, true);
    const ro = new ResizeObserver(schedule);
    ro.observe(shownTarget);
    // content above it can grow (data arriving) or a drawer slide away: neither scrolls nor resizes it
    const follow = window.setInterval(schedule, FOLLOW_MS);
    return () => {
      window.clearInterval(follow);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      document.removeEventListener('scroll', schedule, true);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [shownTarget, shownStepTarget]);

  // Controls that appear (or go) while a step shows change the counter, the
  // dots and where Next goes: re-plan when they do.
  const shownTourId = shown?.tourId;
  useEffect(() => {
    const t = shownTourId ? getTour(shownTourId) : undefined;
    if (!t) return;
    let last = '';
    const timer = window.setInterval(() => {
      const sig = t.steps.map((s) => (!s.target || s.ifMissing === 'center' || findVisible(s.target) ? 1 : 0)).join('');
      if (last && sig !== last) setSkipRev((n) => n + 1);
      last = sig;
    }, FOLLOW_MS);
    return () => window.clearInterval(timer);
  }, [shownTourId]);

  // The card's height, for placing it (again whenever its content changes).
  const hasCard = !!shown;
  useLayoutEffect(() => {
    if (cardRef.current) setCardH(naturalH());
  }, [shown, vp, touch]);
  useEffect(() => {
    const el = cardRef.current;
    if (!hasCard || !el) return;
    const ro = new ResizeObserver(() => setCardH(naturalH()));
    ro.observe(el);
    if (contentRef.current) ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, [hasCard]);

  // Focus the title on each new step, so screen readers start there.
  const shownKey = shown ? `${shown.tourId}:${shown.index}` : '';
  useEffect(() => {
    if (shownKey) titleRef.current?.focus({ preventScroll: true });
  }, [shownKey]);

  const shownTour = shown ? getTour(shown.tourId) : undefined;
  const step = shown && shownTour ? shownTour.steps[shown.index] : undefined;
  /** The step whose magnifier was dropped because the card had no room on this phone. */
  const [noLoupeFor, setNoLoupeFor] = useState('');
  const magnify = !!shown?.target && !!step && noLoupeFor !== shownKey && shouldMagnify(step, shown.target);

  // Phones: a tall card (one with a magnifier) can leave no room above or
  // below the target. Scroll the target clear of it, once per step and card
  // height (the magnifier appears a moment after the rest of the card); when
  // scrolling can't make room, drop the magnifier instead.
  const roomMadeFor = useRef('');
  /** Steps whose room-making scroll was cut short (another scroll ran over it) and got one more go. */
  const roomRetried = useRef(new Set<string>());
  const roomCheck = useRef(0);
  /** Where the target's scroll area was when the room-making effect last looked. */
  const lastScroll = useRef<{ el: Element | null; top: number } | null>(null);
  const [roomRetry, setRoomRetry] = useState(0);
  useEffect(() => () => window.clearTimeout(roomCheck.current), []);
  const shownHole = shown?.hole ?? null;
  useEffect(() => {
    const el = shownTarget;
    // the card as it is now: cardH can still hold the previous step's height here
    const natural = naturalH();
    const key = `${shownKey}:${natural}`;
    if (!el || !shownHole || !natural || roomMadeFor.current === key) return;
    const safeTop = EDGE + vp.insets.top;
    const safeBottom = vp.h - EDGE - vp.insets.bottom;
    const ch = Math.min(natural, safeBottom - safeTop);
    if (vp.w >= SM) {
      if (vp.h >= COMPACT_H) return;
      // a phone on its side: a magnified card taller than the screen drops the magnifier
      if (magnify && natural > safeBottom - safeTop) {
        roomMadeFor.current = key;
        setNoLoupeFor(shownKey);
        return;
      }
      // with room beside the target, nothing to do; otherwise scroll as on phones
      const cw = Math.min(CARD_MAX_W, vp.w - 2 * EDGE);
      if (placeCard(shownHole, cw, natural, vp, step?.placement).side) return;
    }
    const holeH = shownHole.bottom - shownHole.top;
    if (shownHole.bottom + GAP + ch <= safeBottom || shownHole.top - GAP - ch >= safeTop) return;
    const scroller = scrollParent(el);
    // the page is still scrolling (to this target, or back from where the last
    // page was): decide once it has stopped
    const was = lastScroll.current;
    lastScroll.current = { el: scroller, top: scroller?.scrollTop ?? 0 };
    if (scroller && (was?.el !== scroller || Math.abs(was.top - scroller.scrollTop) >= 1)) {
      window.clearTimeout(roomCheck.current);
      roomCheck.current = window.setTimeout(() => setRoomRetry((n) => n + 1), 150);
      return;
    }
    roomMadeFor.current = key;
    // highest the target can go: just under the top bar (or the safe edge in the
    // drawer), and inside its scroll area when that sits below a fixed header
    let minTop = isFixed(el) ? safeTop : Math.max(safeTop, topBarOf(vp) + 8);
    let maxBottom = safeBottom;
    if (scroller && scroller !== document.scrollingElement) {
      const area = scroller.getBoundingClientRect();
      minTop = Math.max(minTop, area.top + 8);
      maxBottom = Math.min(maxBottom, area.bottom - 8);
    }
    const upTo = safeBottom - ch - GAP - holeH; // card below: the hole's top must reach this
    const downTo = safeTop + ch + GAP; // card above: the hole's top must reach this
    const below = upTo >= minTop && upTo < shownHole.top ? shownHole.top - upTo : 0;
    const above = downTo + holeH <= maxBottom && downTo > shownHole.top ? shownHole.top - downTo : 0;
    // the page may end before the target gets there
    const free = (by: number) =>
      !scroller ? 0 : by > 0 ? scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop : scroller.scrollTop;
    const canScroll = (by: number) => free(by) >= Math.abs(by) - 1;
    const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
    // part of the way only when that part is worth it (not the last few pixels)
    const canMove = (by: number) => by !== 0 && free(by) >= Math.min(Math.abs(by), 24);
    const by = below && canScroll(below) ? below : above && canScroll(above) ? above : 0;
    const near = below && canMove(below) ? below : above && canMove(above) ? above : 0;
    if (!scroller) {
      if (magnify) setNoLoupeFor(shownKey);
      return;
    }
    rememberScroll(el);
    let amount = 0;
    if (by) amount = by;
    else if (magnify) setNoLoupeFor(shownKey);
    else if (near) amount = near; // as close as it goes
    else {
      // taller than the room the card leaves: bring its top edge (its title)
      // into view, under the top bar above a bottom card, or under a top card
      const toTop = shownHole.top - minTop;
      const underCard = shownHole.top - (safeTop + ch + GAP);
      amount = [toTop, underCard].find((b) => Math.abs(b) >= 1 && canScroll(b)) ?? 0;
    }
    if (!amount) return;
    const from = scroller.scrollTop;
    const expected = clamp(from + amount, 0, scroller.scrollHeight - scroller.clientHeight);
    scroller.scrollBy({ top: amount, behavior });
    // a scroll still running (the page coming back to its top after a route
    // change) can cancel this one: if it didn't get there, try once more
    if (roomRetried.current.has(key)) return;
    window.clearTimeout(roomCheck.current);
    roomCheck.current = window.setTimeout(() => {
      if (roomMadeFor.current !== key || !scroller.isConnected || Math.abs(scroller.scrollTop - expected) < 8) return;
      roomRetried.current.add(key);
      roomMadeFor.current = '';
      setRoomRetry((n) => n + 1);
    }, behavior === 'auto' ? 100 : 900);
  }, [shownKey, shownTarget, shownHole, cardH, vp, magnify, step, roomRetry]);

  const seeking = !shown || shown.tourId !== tour.id || shown.index !== index;
  const info = shown && shownTour ? plan(shownTour, shown.index, skippedOf(shownTour.id)) : null;

  const goNext = () => {
    if (seeking || !shown || !shownTour) return;
    const p = plan(shownTour, shown.index, skippedOf(shownTour.id));
    const s = useTour.getState();
    if (p.next < 0) s.close('done');
    else s.goTo(p.next);
  };
  const goBack = () => {
    if (seeking || !shown || !shownTour) return;
    const p = plan(shownTour, shown.index, skippedOf(shownTour.id));
    if (p.prev >= 0) useTour.getState().goTo(p.prev);
  };
  // App closes the drawer on every navigation (browser Back during the welcome
  // tour): a step that points into it opens it again
  const menuOpen = useShell((s) => s.menuOpen);
  const wantsMenu = !seeking && step?.menu === 'open';
  useEffect(() => {
    if (!wantsMenu || menuOpen || window.innerWidth >= LG) return;
    useShell.getState().setMenuOpen(true);
    openedMenu.current = true;
    drawerMovedAt.current = performance.now();
  }, [wantsMenu, menuOpen]);

  const skip = () => useTour.getState().close('skipped');
  const turnOffTips = () => {
    useTour.getState().setTipsEnabled(false);
    useTour.getState().close('skipped');
  };

  // Escape closes; arrow keys step (not while typing); Tab stays in the card.
  const keys = useRef({ next: goNext, back: goBack });
  useLayoutEffect(() => {
    keys.current = { next: goNext, back: goBack };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        useTour.getState().close('skipped');
        return;
      }
      if (e.key === 'Tab') {
        trapTab(e, cardRef.current);
        return;
      }
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target instanceof HTMLElement ? e.target : null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'ArrowRight') keys.current.next();
        else keys.current.back();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  // ---- layout -------------------------------------------------------------
  const reduced = prefersReducedMotion();
  const animate = !instant && !reduced;
  const cardW = Math.min(CARD_MAX_W, vp.w - 2 * EDGE);
  const pos = placeCard(shown?.hole ?? null, cardW, cardH, vp, step?.placement);
  const cardMaxH = pos.maxH ?? vp.h - 2 * EDGE - vp.insets.top - vp.insets.bottom;
  const visible = !!shown && cardH > 0 && !slow;

  useEffect(() => {
    if (!visible || placed) return;
    const raf = requestAnimationFrame(() => setPlaced(true));
    return () => cancelAnimationFrame(raf);
  }, [visible, placed]);

  const hole = shown?.hole ?? null;
  const holeStyle: CSSProperties = {
    width: hole ? hole.right - hole.left : 0,
    height: hole ? hole.bottom - hole.top : 0,
    // a centred step shrinks the hole to nothing in the middle: plain dim
    transform: hole ? `translate3d(${hole.left}px, ${hole.top}px, 0)` : `translate3d(${vp.w / 2}px, ${vp.h / 2}px, 0)`,
    borderRadius: hole ? shown?.radius : 0,
    boxShadow: '0 0 0 200vmax var(--dim)',
    transition: animate ? ['transform', 'width', 'height', 'border-radius'].map((p) => `${p} ${MOVE}`).join(', ') : 'none',
  };

  const isWelcome = shown?.tourId === WELCOME_ID;
  const welcomeIntro = isWelcome && shown?.index === 0;

  return (
    <div className="fixed inset-0 z-[80] animate-fade-in">
      {/* dim + spotlight; clicks on the dim do nothing */}
      <div aria-hidden className="pointer-events-none fixed left-0 top-0" style={holeStyle}>
        <span
          className={`absolute inset-0 rounded-[inherit] transition-opacity duration-300 ${hole ? 'opacity-100' : 'opacity-0'}`}
        >
          <span className="absolute inset-0 rounded-[inherit] border-2 border-accent" />
          <span className="absolute inset-0 rounded-[inherit] motion-safe:animate-tour-pulse" />
        </span>
      </div>

      {shown && step && info && (
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={step.tip ? `${bodyId} ${tipId}` : bodyId}
          className="fixed left-0 top-0"
          style={{
            width: cardW,
            transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? 'auto' : 'none',
            transition: placed && animate ? `transform ${MOVE}, opacity ${FADE}` : `opacity ${FADE}`,
          }}
        >
          {pos.side && (
            <span
              aria-hidden
              className="absolute h-3 w-3 rotate-45 rounded-[2px] border border-ink/10 bg-elevated"
              style={arrowStyle(pos, cardW, Math.min(cardH, cardMaxH))}
            />
          )}
          <div
            className="relative flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-elevated shadow-float"
            style={{ maxHeight: cardMaxH }}
          >
            {/* the text scrolls when the card is short; the buttons below always show */}
            <div ref={scrollRef} className="min-h-0 overflow-y-auto overscroll-contain px-5 pt-5">
              <div ref={contentRef}>
                {magnify && shown.target && <Loupe target={shown.target} width={cardW - 40} />}
                <h2
                  ref={titleRef}
                  id={titleId}
                  tabIndex={-1}
                  className={`text-lg font-semibold text-ink/90 focus:outline-none ${magnify ? '' : 'pr-10'}`}
                >
                  {step.title}
                </h2>
                <p id={bodyId} className="mt-2 text-subhead leading-relaxed text-ink/80">
                  {resolveTap(step.body, touch)}
                </p>
                {step.tip && (
                  <p id={tipId} className="mt-3 flex items-start gap-2 text-sm text-ink/80">
                    <Lightbulb className="mt-px h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                    <span>
                      <span className="font-semibold">Tip:</span> {resolveTap(step.tip, touch)}
                    </span>
                  </p>
                )}

                <div className="mt-5 flex items-center gap-3">
                  <span className="shrink-0 text-xs tabular-nums text-ink/70">
                    {info.pos} of {info.total}
                  </span>
                  {info.total > 1 && info.total <= 24 && (
                    <span aria-hidden className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                      {Array.from({ length: info.total }, (_, i) => (
                        <span
                          key={i}
                          className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                            i + 1 === info.pos ? 'w-4 bg-accent' : i + 1 < info.pos ? 'w-1.5 bg-accent/40' : 'w-1.5 bg-ink/20'
                          }`}
                        />
                      ))}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 px-5 pb-5 pt-3">
              {!isWelcome && (
                <button
                  type="button"
                  onClick={turnOffTips}
                  className="mr-auto min-h-[44px] rounded-lg px-1 text-sm font-medium text-ink/70 transition-colors hover:text-ink/90"
                >
                  Turn off tips
                </button>
              )}
              {/* brand-700: brand-600 is too faint on the elevated card in dark mode */}
              {welcomeIntro ? (
                <>
                  <button type="button" onClick={skip} className="btn-ghost text-brand-700">
                    Not now
                  </button>
                  <button type="button" onClick={goNext} className="btn-primary">
                    Start tour
                  </button>
                </>
              ) : (
                <>
                  {info.prev >= 0 && (
                    <button type="button" onClick={goBack} className="btn-ghost text-brand-700">
                      Back
                    </button>
                  )}
                  <button type="button" onClick={goNext} className="btn-primary">
                    {info.next < 0 ? 'Done' : 'Next'}
                  </button>
                </>
              )}
            </div>

            {/* last in the DOM, so Tab reaches the step's own buttons first */}
            <button
              type="button"
              onClick={skip}
              aria-label="Close tour"
              className="tap absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-ink/[0.06] text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink/90"
            >
              <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </button>
          </div>
        </div>
      )}

      {/* the title is read as it takes focus; this adds where the step is */}
      <div aria-live="polite" className="sr-only">
        {shown && step && info ? `Step ${info.pos} of ${info.total}` : ''}
      </div>
    </div>
  );
}

export default TourOverlay;
