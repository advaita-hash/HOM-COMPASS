import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from '../../lib/safeStorage';

// ---------------------------------------------------------------------------
// Shareable remedy notes — fully client-side, no backend.
//
// A note is PRIVATE by default (only visible to its author, signed in to
// Common Room). Marking it PUBLIC produces a self-contained share link whose
// payload carries the note itself in the URL fragment (after '#'), so:
//   • nothing is exposed in the Common Room database,
//   • the fragment is never sent to any server (it stays in the browser),
//   • anyone with the link can read that one note — and nothing else.
// The link is a snapshot taken when it was shared. Because the note lives in
// the link itself, it can't be withdrawn: marking the note private again only
// hides the share option on this device.
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

/** Upper bounds for each field of a shared note (characters). */
const LIMITS = { remedy: 120, body: 20_000, abbr: 40, by: 80, date: 40 } as const;

const isText = (x: unknown, max: number): x is string => typeof x === 'string' && x.length <= max;

/**
 * Decode and strictly validate a share token. Every field is checked — a link
 * is untrusted input, so anything malformed, oversized or of the wrong type
 * yields null. Only known fields are copied; unknown keys are dropped.
 */
export function decodeNote(token: string): SharedNote | null {
  if (!token || token.length > 60_000) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(b64urlDecode(token));
  } catch {
    return null; /* malformed */
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const o = obj as Record<string, unknown>;

  if (o.v !== 1) return null;
  if (!isText(o.remedy, LIMITS.remedy) || !o.remedy.trim()) return null;
  if (!isText(o.body, LIMITS.body) || !o.body.trim()) return null;
  if (o.abbr !== undefined && !isText(o.abbr, LIMITS.abbr)) return null;
  if (o.by !== undefined && !isText(o.by, LIMITS.by)) return null;
  // `date` may be null (a note without a visit date).
  if (o.date !== undefined && o.date !== null && !isText(o.date, LIMITS.date)) return null;

  const note: SharedNote = { v: 1, remedy: o.remedy, body: o.body };
  if (o.abbr) note.abbr = o.abbr as string;
  if (o.by) note.by = o.by as string;
  if (o.date) note.date = o.date as string;
  return note;
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
    { name: 'hom-compass.note-visibility', storage: safeStorage() },
  ),
);
