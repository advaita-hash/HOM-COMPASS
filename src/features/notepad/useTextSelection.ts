import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import type { NotePlace } from './notepadStore';

// ---------------------------------------------------------------------------
// Words selected in the Full text reader, as a place a note can be pinned to.
//
// Each rendered block carries data-block="i.j" (see places.ts). Offsets are
// counted over the block's text nodes, skipping note markers (data-note-ui),
// so they index the block's plain text exactly. A selection running into the
// next blocks is clamped to the block it starts in.
// ---------------------------------------------------------------------------

export interface PassageSelection {
  place: NotePlace;
  /** Where to float the "Add note" pill (viewport coordinates). */
  x: number;
  y: number;
}

const PILL_W = 132;
const PILL_H = 44;
const GAP = 12;

const elementOf = (n: Node) => (n.nodeType === Node.ELEMENT_NODE ? (n as Element) : n.parentElement);
const isUi = (n: Node) => !!elementOf(n)?.closest('[data-note-ui]');

/** Plain-text offset of a DOM point inside a block, ignoring note markers. */
export function offsetIn(block: Element, node: Node, offset: number): number {
  const upTo = document.createRange();
  upTo.selectNodeContents(block);
  upTo.setEnd(node, offset);
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let n = 0;
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (!upTo.intersectsNode(t) || isUi(t)) continue;
    n += t === upTo.endContainer ? upTo.endOffset : (t as Text).length;
  }
  return n;
}

/**
 * Track a selection inside `root` and turn it into a passage place. Shows on
 * mouse and touch (selectionchange + pointerup); clears when the selection
 * collapses, scrolls out of `scroller`, or on Escape.
 */
export function useTextSelection(
  root: RefObject<HTMLElement>,
  scroller: RefObject<HTMLElement>,
  enabled: boolean,
  toPlace: (blockKey: string, start: number, end: number) => NotePlace | null,
) {
  const [sel, setSel] = useState<PassageSelection | null>(null);
  const toPlaceRef = useRef(toPlace);
  toPlaceRef.current = toPlace;

  const clear = useCallback(() => setSel(null), []);

  useEffect(() => {
    if (!enabled) {
      setSel(null);
      return;
    }
    let frame = 0;
    let hideTimer = 0;
    // Escape hides the pill until the selection itself changes
    let dismissed = false;

    const read = (): PassageSelection | null => {
      const s = window.getSelection();
      const el = root.current;
      if (dismissed || !s || s.rangeCount === 0 || s.isCollapsed || !el) return null;
      const r = s.getRangeAt(0);
      if (!el.contains(r.commonAncestorContainer) && !r.intersectsNode(el)) return null;
      // the block the selection starts in (or the first one it touches)
      const startBlock = elementOf(r.startContainer)?.closest('[data-block]');
      const block =
        startBlock && el.contains(startBlock)
          ? startBlock
          : [...el.querySelectorAll('[data-block]')].find((b) => r.intersectsNode(b));
      if (!block) return null;
      const key = block.getAttribute('data-block')!;
      const clamped = document.createRange();
      if (block.contains(r.startContainer)) clamped.setStart(r.startContainer, r.startOffset);
      else clamped.setStart(block, 0);
      if (block.contains(r.endContainer)) clamped.setEnd(r.endContainer, r.endOffset);
      else clamped.setEnd(block, block.childNodes.length);
      const start = offsetIn(block, clamped.startContainer, clamped.startOffset);
      const end = offsetIn(block, clamped.endContainer, clamped.endOffset);
      const place = toPlaceRef.current(key, start, end);
      if (!place) return null;

      const rect = clamped.getBoundingClientRect();
      const view = scroller.current?.getBoundingClientRect();
      if (view && (rect.bottom < view.top || rect.top > view.bottom)) return null;
      // below the selection, leaving the native callout above it alone; kept
      // inside the reading column
      const col = el.getBoundingClientRect();
      const half = PILL_W / 2;
      const x = Math.min(Math.max(rect.left + rect.width / 2, col.left + half), col.right - half);
      let y = rect.bottom + GAP;
      if (y + PILL_H > window.innerHeight - 16) y = Math.max(rect.top - GAP - PILL_H, 8);
      return { place, x, y };
    };

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = read();
        window.clearTimeout(hideTimer);
        if (next) setSel(next);
        // a short grace period, so a tap on the pill that also clears the
        // selection (touch) still lands on it
        else hideTimer = window.setTimeout(() => setSel(null), 250);
      });
    };
    const onSelectionChange = () => {
      dismissed = false;
      update();
    };
    const onPointerUp = () => window.setTimeout(update, 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissed = true;
        window.clearTimeout(hideTimer);
        setSel(null);
      } else if (e.shiftKey) update();
    };

    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keyup', onKey);
    // capture: the reader scrolls inside its own column, not the window
    document.addEventListener('scroll', update, { capture: true, passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(hideTimer);
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keyup', onKey);
      document.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
    };
  }, [enabled, root, scroller]);

  return { selection: sel, clear };
}
