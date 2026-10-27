import { type ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

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
