import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Shareable remedy notes — fully client-side, no backend.
//
// A note is PRIVATE by default (only visible to its author, signed in to
// Common Room). Marking it PUBLIC produces a self-contained share link whose
// payload carries the note itself in the URL fragment (after '#'), so:
//   • nothing is exposed in the Common Room database,
//   • the fragment is never sent to any server (it stays in the browser),
//   • anyone with the link can read that one note — and nothing else.
// The link is a snapshot taken when it was shared.
// ---------------------------------------------------------------------------

export interface SharedNote {
  v: 1;
  remedy: string; // full repertory name
  abbr?: string;
  body: string;
  date?: string | null;
  by?: string; // author's Common Room username (attribution only)
}

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = Uint8Array.from(b, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeNote(note: SharedNote): string {
  return b64urlEncode(JSON.stringify(note));
}

export function decodeNote(token: string): SharedNote | null {
  try {
    const obj = JSON.parse(b64urlDecode(token));
    if (obj && obj.v === 1 && typeof obj.remedy === 'string' && typeof obj.body === 'string') {
      return obj as SharedNote;
    }
  } catch {
    /* malformed */
  }
  return null;
}

/** Full share URL for a note (content travels in the fragment). */
export function buildShareUrl(note: SharedNote): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/shared/note#${encodeNote(note)}`;
}

/** Which of the student's notes they have marked public (persisted locally). */
interface VisibilityState {
  publicIds: Record<string, true>;
  isPublic: (id: string) => boolean;
  setPublic: (id: string, v: boolean) => void;
}

export const useNoteVisibility = create<VisibilityState>()(
  persist(
    (set, get) => ({
      publicIds: {},
      isPublic: (id) => !!get().publicIds[id],
      setPublic: (id, v) => {
        const publicIds = { ...get().publicIds };
        if (v) publicIds[id] = true;
        else delete publicIds[id];
        set({ publicIds });
      },
    }),
    { name: 'hom-compass.note-visibility' },
  ),
);
