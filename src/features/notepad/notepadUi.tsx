import { type ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { PenLine } from 'lucide-react';

// ---------------------------------------------------------------------------
// Shared bits of the notepad UI.
//
// Spoken confirmations ("Note saved", "Note deleted") for screen readers. A
// notepad wraps its content in <Announcer>; cards and the composer call
// useAnnounce(). Outside an Announcer it does nothing.
// ---------------------------------------------------------------------------

const AnnounceContext = createContext<(message: string) => void>(() => {});

export const useAnnounce = () => useContext(AnnounceContext);

export function Announcer({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const timer = useRef(0);

  const announce = useCallback((m: string) => {
    // clear first, so the same words twice in a row are still read out
    setMessage('');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(m), 60);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {message}
      </p>
    </AnnounceContext.Provider>
  );
}

/** Unsaved words, kept for the session so a dismissed sheet doesn't lose them. */
export const drafts = new Map<string, string>();

// ---------------------------------------------------------------------------
// Apple Pencil Scribble (handwriting → text, iPadOS Safari).
//
// Scribble needs no code: Safari turns handwriting into text in any standard
// editable field. Every note field (the sticky note in the reader, the
// composer, a card being edited) is therefore a plain <textarea> spreading
// NOTE_FIELD below. To keep Scribble working, a note field and its ancestors
// must never get:
//   • readOnly, or disabled while idle
//   • user-select: none, touch-action: none or pointer-events: none
//     (Tailwind select-none / touch-none / pointer-events-none)
//   • preventDefault() on pointerdown / touchstart / touchmove
//   • a font size under 16px (iOS zooms into smaller fields)
// useTextSelection ignores selections and pointers that start inside a field
// or inside [data-note-ui], so writing in a note never pops the "Add note" pill.
// Real Scribble can only be confirmed on an iPad with an Apple Pencil.
// ---------------------------------------------------------------------------

/** Props shared by every note <textarea> (see the Scribble notes above). */
export const NOTE_FIELD = {
  autoCapitalize: 'sentences',
  autoCorrect: 'on',
  spellCheck: true,
} as const;

/** iPadOS (which reports itself as a Mac with a touch screen). */
export function isIPadOS(): boolean {
  try {
    return (
      navigator.maxTouchPoints > 1 && (/iPad/.test(navigator.userAgent) || navigator.platform === 'MacIntel')
    );
  } catch {
    return false;
  }
}

/** Under an empty note field on iPad only: Scribble works here. */
export function ScribbleHint({ show, id }: { show: boolean; id?: string }) {
  const [iPad] = useState(isIPadOS);
  if (!iPad || !show) return null;
  return (
    <p id={id} className="mt-2 flex items-center gap-2 text-xs text-ink/70">
      <PenLine className="h-4 w-4 shrink-0" aria-hidden />
      Write with Apple Pencil — Scribble turns it into text
    </p>
  );
}
