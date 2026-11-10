import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ZoomIn } from 'lucide-react';

// ---------------------------------------------------------------------------
// The magnifier at the top of a tour card: a live copy of a small target
// (icon buttons, chips, small links) drawn 1.5–2.5× larger. The copy is a
// cloneNode of the real element, made inert and stripped of ids and labels,
// and re-made whenever the real one changes. Which targets get one:
// shouldMagnify in dom.ts.
// ---------------------------------------------------------------------------

const BOX_W = 320;
const BOX_H = 128;
/** p-3 plus the 1px border, each side. */
const BOX_INSET = 13;
const MAX_ZOOM = 2.5;
/** Below this the copy would hardly be bigger than the real thing. */
const MIN_ZOOM = 1.25;

const ATTRS_TO_DROP = [
  'id',
  'name',
  'for',
  'tabindex',
  'data-tour',
  'aria-labelledby',
  'aria-describedby',
  'aria-controls',
  'autofocus',
  'accesskey',
];

interface Geometry {
  w: number;
  h: number;
  k: number;
  /** Inherited text styles of the target, so the copy reads the same. */
  text: CSSProperties;
  /** What the target sits on (a tinted bar, a gradient), so light-on-colour stays legible. */
  backdrop?: CSSProperties;
}

function alphaOf(color: string): number {
  if (!color || color === 'transparent') return 0;
  const parts = color.match(/\(([^)]*)\)/)?.[1].split(/[\s,/]+/).filter(Boolean) ?? [];
  if (parts.length < 4) return 1;
  const a = parts[3];
  return a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a);
}

function backdropOf(el: Element): CSSProperties | undefined {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (cs.backgroundImage && cs.backgroundImage !== 'none') {
      return { backgroundImage: cs.backgroundImage, backgroundColor: cs.backgroundColor, backgroundSize: 'cover' };
    }
    if (alphaOf(cs.backgroundColor) > 0) return { backgroundColor: cs.backgroundColor };
  }
  return undefined;
}

function measure(el: Element, width: number): Geometry | null {
  const r = el.getBoundingClientRect();
  // offsetWidth ignores transforms (a pressed button's scale) but rounds down,
  // and a copy even 0.4px narrower wraps "Got it" onto two lines: take the
  // larger of the two, rounded up
  const w = Math.ceil(Math.max((el as HTMLElement).offsetWidth || 0, r.width));
  const h = Math.ceil(Math.max((el as HTMLElement).offsetHeight || 0, r.height));
  if (!w || !h) return null;
  const k = Math.min(MAX_ZOOM, (Math.min(BOX_W, width) - 2 * BOX_INSET) / w, (BOX_H - 2 * BOX_INSET) / h);
  if (k < MIN_ZOOM) return null;
  const cs = getComputedStyle(el);
  return {
    w,
    h,
    k,
    text: {
      color: cs.color,
      fontSize: cs.fontSize,
      fontFamily: cs.fontFamily,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
    },
    backdrop: backdropOf(el),
  };
}

/** A deep copy that can't be focused, clicked, labelled by, or mistaken for the original. */
function copyOf(el: Element, w: number, h: number): Element {
  const copy = el.cloneNode(true) as Element;
  const from = [el, ...el.querySelectorAll('*')];
  const to = [copy, ...copy.querySelectorAll('*')];
  to.forEach((n, i) => {
    for (const a of ATTRS_TO_DROP) n.removeAttribute(a);
    // out of the tab order too (the host is inert; this guards other focus code)
    if (n.matches('a[href], button, input, select, textarea, summary, [contenteditable]')) n.setAttribute('tabindex', '-1');
    // typed values live in properties, not attributes
    const s = from[i];
    if (s instanceof HTMLInputElement && n instanceof HTMLInputElement) {
      n.value = s.value;
      n.checked = s.checked;
    } else if (s instanceof HTMLTextAreaElement && n instanceof HTMLTextAreaElement) {
      n.value = s.value;
    } else if (s instanceof HTMLSelectElement && n instanceof HTMLSelectElement) {
      n.selectedIndex = s.selectedIndex;
    }
  });
  if (copy instanceof HTMLElement || copy instanceof SVGElement) {
    const st = copy.style;
    // same box as the original, at the wrapper's top left, standing still
    st.setProperty('margin', '0');
    st.setProperty('width', `${w}px`);
    st.setProperty('height', `${h}px`);
    st.setProperty('min-width', '0');
    st.setProperty('max-width', 'none');
    st.setProperty('max-height', 'none');
    st.setProperty('box-sizing', 'border-box');
    st.setProperty('flex', 'none');
    for (const p of ['transform', 'translate', 'scale', 'rotate', 'transition', 'animation']) st.setProperty(p, 'none');
    const pos = getComputedStyle(el).position;
    if (pos === 'absolute' || pos === 'fixed' || pos === 'sticky') {
      st.setProperty('position', 'relative');
      st.setProperty('inset', 'auto');
    }
  }
  return copy;
}

export function Loupe({ target, width }: { target: Element; width: number }) {
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [rev, setRev] = useState(0);
  const hostRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => setGeo(measure(target, width)), [target, width, rev]);

  // keep the copy live: re-make it (at most once a frame) when the original changes
  useEffect(() => {
    let raf = 0;
    const bump = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setRev((n) => n + 1);
      });
    };
    const mo = new MutationObserver(bump);
    mo.observe(target, { subtree: true, childList: true, characterData: true, attributes: true });
    const ro = new ResizeObserver(bump);
    ro.observe(target);
    target.addEventListener('input', bump);
    return () => {
      mo.disconnect();
      ro.disconnect();
      target.removeEventListener('input', bump);
      cancelAnimationFrame(raf);
    };
  }, [target]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || !geo) return;
    host.setAttribute('inert', '');
    host.replaceChildren(copyOf(target, geo.w, geo.h));
  }, [target, geo]);

  if (!geo) return null;
  return (
    <div aria-hidden="true" className="mb-4">
      {/* pr-10 keeps the label clear of the card's close button */}
      <div className="flex h-8 items-center gap-1 pr-10 text-2xs font-medium text-ink/70">
        <ZoomIn className="h-3 w-3" aria-hidden />
        Magnified
      </div>
      <div
        className="pointer-events-none mt-1 flex w-full max-w-[320px] items-center justify-center overflow-hidden rounded-xl border border-ink/10 bg-surface p-3"
        style={geo.backdrop}
      >
        <div className="relative shrink-0" style={{ width: geo.w * geo.k, height: geo.h * geo.k }}>
          <div
            ref={hostRef}
            className="pointer-events-none absolute left-0 top-0"
            style={{ ...geo.text, width: geo.w, height: geo.h, transform: `scale(${geo.k})`, transformOrigin: 'top left' }}
          />
        </div>
      </div>
    </div>
  );
}
