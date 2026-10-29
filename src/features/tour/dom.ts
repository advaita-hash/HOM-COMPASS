import type { TourStep } from './types';

// ---------------------------------------------------------------------------
// DOM helpers for the tour overlay: finding a step's target, waiting for it
// to stop moving, and measuring the part of it people can see.
// ---------------------------------------------------------------------------

/** A rectangle in viewport (CSS px) coordinates. */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Cancels a running step lookup when the step changes or the tour ends. */
export interface Token {
  cancelled: boolean;
}

export const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
export const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const boxOf = (r: DOMRect): Box => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });

function intersect(a: Box, b: Box): Box {
  return {
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom),
  };
}

const isEmpty = (b: Box) => b.right - b.left < 1 || b.bottom - b.top < 1;

export const sameBox = (a: Box | null, b: Box | null, eps = 0.5) =>
  !!a &&
  !!b &&
  Math.abs(a.left - b.left) < eps &&
  Math.abs(a.top - b.top) < eps &&
  Math.abs(a.right - b.right) < eps &&
  Math.abs(a.bottom - b.bottom) < eps;

function matches(id: string): Element[] {
  return Array.from(document.querySelectorAll(`[data-tour="${CSS.escape(id)}"]`));
}

/**
 * Laid out, not hidden, and not inside an aria-hidden or inert ancestor
 * (other than #root, which the tour itself makes inert).
 */
export function isVisible(el: Element): boolean {
  if (!el.isConnected) return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
  const root = document.getElementById('root');
  for (let n: Element | null = el; n && n !== root; n = n.parentElement) {
    if (n.getAttribute('aria-hidden') === 'true' || n.hasAttribute('inert')) return false;
  }
  return true;
}

/** The first match people can actually see. */
export function findVisible(id: string): Element | null {
  return matches(id).find(isVisible) ?? null;
}

/**
 * Matches exist but every one is hidden by CSS (display: none on a breakpoint,
 * a collapsed section): no point waiting the full time for those.
 */
function presentButHidden(id: string): boolean {
  const all = matches(id);
  return all.length > 0 && all.every((el) => !isVisible(el));
}

/** Waits up to `timeoutMs` for a visible match; null when there is none. */
export async function waitForTarget(id: string, token: Token, timeoutMs: number): Promise<Element | null> {
  const t0 = performance.now();
  for (;;) {
    const el = findVisible(id);
    if (el || token.cancelled) return el;
    const waited = performance.now() - t0;
    if (waited >= timeoutMs || (waited >= 150 && presentButHidden(id))) return null;
    await frame();
  }
}

/** Resolves once the element's box has held still for two frames (or after maxMs). */
export async function settle(el: Element, token: Token, maxMs: number): Promise<void> {
  const t0 = performance.now();
  let last = boxOf(el.getBoundingClientRect());
  let still = 0;
  while (performance.now() - t0 < maxMs) {
    await frame();
    if (token.cancelled) return;
    const now = boxOf(el.getBoundingClientRect());
    if (sameBox(now, last)) {
      if (++still >= 2) return;
    } else {
      still = 0;
      last = now;
    }
  }
}

/** In a fixed layer (the top bar, the nav drawer), so page scrolling doesn't move it. */
export function isFixed(el: Element): boolean {
  for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
    if (getComputedStyle(n).position === 'fixed') return true;
  }
  return false;
}

/** The nearest ancestor that scrolls vertically (here usually <main>), if any. */
export function scrollParent(el: Element): Element | null {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && p.scrollHeight > p.clientHeight) return p;
  }
  const doc = document.scrollingElement;
  return doc && doc.scrollHeight > doc.clientHeight ? doc : null;
}

/**
 * The part of the element inside the viewport and every scrolling (or
 * overflow-clipping) ancestor; null when none of it shows. `topInset` is a
 * fixed bar over the top of the page (the phone top bar).
 */
export function visibleBox(el: Element, topInset = 0): Box | null {
  let b = boxOf(el.getBoundingClientRect());
  const fixed = getComputedStyle(el).position === 'fixed';
  for (let p = fixed ? null : el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') b = intersect(b, boxOf(p.getBoundingClientRect()));
    if (cs.position === 'fixed') break;
  }
  const top = topInset && !isFixed(el) ? topInset : 0;
  b = intersect(b, { left: 0, top, right: window.innerWidth, bottom: window.innerHeight });
  return isEmpty(b) ? null : b;
}

/** Less than (nearly) all of it shows: scroll it into view first. */
export function needsScroll(el: Element, topInset = 0): boolean {
  const r = el.getBoundingClientRect();
  const v = visibleBox(el, topInset);
  if (!v) return true;
  return (v.right - v.left) * (v.bottom - v.top) < r.width * r.height * 0.95;
}

/** The hole around a target: its visible part plus padding, and a matching radius. */
export function measureHole(el: Element, pad: number, topInset = 0): { hole: Box; radius: number } {
  const b = visibleBox(el, topInset) ?? boxOf(el.getBoundingClientRect());
  let hole = { left: b.left - pad, top: b.top - pad, right: b.right + pad, bottom: b.bottom + pad };
  // keep the ring on screen for targets that touch an edge (a 2px margin fits its border)
  const m = 2;
  const vw = document.documentElement.clientWidth || window.innerWidth;
  const inside = {
    left: Math.max(m, hole.left),
    top: Math.max((topInset && !isFixed(el) ? topInset : 0) + m, hole.top),
    right: Math.min(vw - m, hole.right),
    bottom: Math.min(window.innerHeight - m, hole.bottom),
  };
  if (!isEmpty(inside)) hole = inside;
  const own = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
  const radius = Math.min(Math.max(12, own + pad), (hole.right - hole.left) / 2, (hole.bottom - hole.top) / 2);
  return { hole, radius };
}

/** Targets up to this size can get the magnifier unless the step says otherwise. */
const SMALL_W = 200;
const SMALL_H = 72;
/** Below these, a target is hard to read as it is (a short control, small type). */
const SHORT_H = 40;
const SMALL_FONT = 14;

/**
 * Hard to read at its own size: no words on screen (an icon), small text, or
 * a short control. A normal 44px labelled button reads fine as it is.
 */
function hardToRead(el: Element, h: number): boolean {
  if (h < SHORT_H) return true;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const parent = n.parentElement;
    if (!n.textContent?.trim() || !parent) continue;
    // screen-reader-only labels (1px boxes) don't count as words on screen
    const r = parent.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue;
    return parseFloat(getComputedStyle(parent).fontSize) < SMALL_FONT;
  }
  return true;
}

/** Whether a step's target gets the magnifier (Loupe). Never for media or charts. */
export function shouldMagnify(step: TourStep, el: Element): boolean {
  if (step.magnify === false) return false;
  if (/^(canvas|video|iframe|object|embed)$/i.test(el.tagName)) return false;
  if (el.querySelector('canvas, video, iframe, object, embed')) return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const small = r.width <= SMALL_W && r.height <= SMALL_H;
  if (el instanceof SVGElement && !small) return false;
  for (const svg of el.querySelectorAll('svg')) {
    const s = svg.getBoundingClientRect();
    if (s.width > SMALL_W || s.height > SMALL_H) return false;
  }
  return step.magnify === true || (small && hardToRead(el, r.height));
}

/** env(safe-area-inset-*) in px (notches, the home indicator). */
export function readInsets(): Insets {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;' +
    'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const insets = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}
