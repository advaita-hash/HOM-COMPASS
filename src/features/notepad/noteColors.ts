// ---------------------------------------------------------------------------
// Note colours: the Apple Books highlight palette (yellow, green, blue, pink,
// purple) drawn with the design system's hues. There is no pink scale, so
// pink uses red, whose light tints read as pink.
//
// A note's colour tints its passage highlight, its marker in the text, its
// sticky note and the tab on its card. Notes saved before colours existed
// have none and show yellow.
//
// Contrast (checked for both themes, see design/tokens.js): the reader's body
// text (slate-700) on every highlight tint, and ink/90 and ink/70 on every
// sticky background, stay above 4.5:1. In dark mode the -100/-200 tints are
// low-alpha washes of the hue over the dark surface, so light text still reads.
//
// Class names are written out in full so Tailwind finds them.
// ---------------------------------------------------------------------------

export const NOTE_COLORS = ['yellow', 'green', 'blue', 'pink', 'purple'] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];
export const DEFAULT_NOTE_COLOR: NoteColor = 'yellow';

export const isNoteColor = (v: unknown): v is NoteColor =>
  typeof v === 'string' && (NOTE_COLORS as readonly string[]).includes(v);

/** A note's colour; notes without one (older notes) are yellow. */
export const colorOf = (n: { color?: NoteColor } | undefined): NoteColor => n?.color ?? DEFAULT_NOTE_COLOR;

interface Tone {
  /** Spoken and shown name. */
  label: string;
  /** Passage highlight in the text, at rest and while its note is open. */
  mark: string;
  markActive: string;
  /** The marker pill after a passage / beside a section. */
  marker: string;
  markerActive: string;
  /** Sticky note paper and its edge (also the tail). */
  paper: string;
  /** Coloured tab down a note card's leading edge. */
  tab: string;
  /** A note card drawn attention to (opened from a marker or a link). */
  wash: string;
  /** The colour swatch (solid, bright enough for a dark check in both themes). */
  swatch: string;
  /** Small icon / dot in lists. */
  dot: string;
  icon: string;
}

export const TONES: Record<NoteColor, Tone> = {
  yellow: {
    label: 'Yellow',
    mark: 'bg-amber-100',
    markActive: 'bg-amber-200',
    marker: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
    markerActive: 'bg-amber-200 text-amber-800 ring-2 ring-amber-400',
    paper: 'bg-amber-100 border-amber-300',
    tab: 'border-l-amber-400',
    wash: 'border-amber-400 bg-amber-50 ring-2 ring-amber-400/50',
    swatch: 'bg-amber-400',
    dot: 'bg-amber-400',
    icon: 'text-amber-600',
  },
  green: {
    label: 'Green',
    mark: 'bg-emerald-100',
    markActive: 'bg-emerald-200',
    marker: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
    markerActive: 'bg-emerald-200 text-emerald-800 ring-2 ring-emerald-400',
    paper: 'bg-emerald-100 border-emerald-300',
    tab: 'border-l-emerald-400',
    wash: 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/50',
    swatch: 'bg-emerald-400',
    dot: 'bg-emerald-400',
    icon: 'text-emerald-600',
  },
  blue: {
    label: 'Blue',
    mark: 'bg-blue-100',
    markActive: 'bg-blue-200',
    marker: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    markerActive: 'bg-blue-200 text-blue-800 ring-2 ring-blue-400',
    paper: 'bg-blue-100 border-blue-300',
    tab: 'border-l-blue-400',
    wash: 'border-blue-400 bg-blue-50 ring-2 ring-blue-400/50',
    swatch: 'bg-blue-400',
    dot: 'bg-blue-400',
    icon: 'text-blue-600',
  },
  pink: {
    label: 'Pink',
    mark: 'bg-red-100',
    markActive: 'bg-red-200',
    marker: 'bg-red-100 text-red-800 hover:bg-red-200',
    markerActive: 'bg-red-200 text-red-800 ring-2 ring-red-300',
    paper: 'bg-red-100 border-red-200',
    tab: 'border-l-red-300',
    wash: 'border-red-300 bg-red-50 ring-2 ring-red-300/50',
    // red-300 reads pink in light; its dark-mode token is a wash, so use 400
    swatch: 'bg-red-300 dark:bg-red-400',
    dot: 'bg-red-300 dark:bg-red-400',
    icon: 'text-red-500',
  },
  purple: {
    label: 'Purple',
    mark: 'bg-violet-100',
    markActive: 'bg-violet-200',
    marker: 'bg-violet-100 text-violet-800 hover:bg-violet-200',
    markerActive: 'bg-violet-200 text-violet-800 ring-2 ring-violet-400',
    paper: 'bg-violet-100 border-violet-300',
    tab: 'border-l-violet-400',
    wash: 'border-violet-400 bg-violet-50 ring-2 ring-violet-400/50',
    swatch: 'bg-violet-400',
    dot: 'bg-violet-400',
    icon: 'text-violet-600',
  },
};

export const toneOf = (n: { color?: NoteColor } | undefined) => TONES[colorOf(n)];
