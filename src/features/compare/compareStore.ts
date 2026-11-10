import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistedObject, safeStorage } from '../../lib/safeStorage';

// ---------------------------------------------------------------------------
// Remedies chosen for side-by-side comparison. An item is a remedy *in a
// book*, so the same remedy can be compared across authors (Boericke's
// Pulsatilla vs Tyler's). Capped at four columns — beyond that a comparison
// stops being scannable.
// ---------------------------------------------------------------------------

export const COMPARE_MAX = 4;

export interface CompareItem {
  book: string; // book id, e.g. 'boericke'
  slug: string;
  name: string; // display name at the time it was added
}

const keyOf = (book: string, slug: string) => `${book}:${slug}`;

interface CompareState {
  items: CompareItem[];
  has: (book: string, slug: string) => boolean;
  /** Adds or removes; returns false if adding was refused because the set is full. */
  toggle: (item: CompareItem) => boolean;
  remove: (book: string, slug: string) => void;
  clear: () => void;
}

export const useCompare = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      has: (book, slug) => get().items.some((i) => keyOf(i.book, i.slug) === keyOf(book, slug)),
      toggle: (item) => {
        const { items } = get();
        if (items.some((i) => keyOf(i.book, i.slug) === keyOf(item.book, item.slug))) {
          set({ items: items.filter((i) => keyOf(i.book, i.slug) !== keyOf(item.book, item.slug)) });
          return true;
        }
        if (items.length >= COMPARE_MAX) return false;
        set({ items: [...items, item] });
        return true;
      },
      remove: (book, slug) =>
        set({ items: get().items.filter((i) => keyOf(i.book, i.slug) !== keyOf(book, slug)) }),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'hom-compass.compare',
      storage: safeStorage(),
      // keep only well-formed, distinct items, at most COMPARE_MAX
      merge: (persisted, current) => {
        const raw = persistedObject(persisted).items;
        if (!Array.isArray(raw)) return current;
        const seen = new Set<string>();
        const items: CompareItem[] = [];
        for (const i of raw as Array<Partial<CompareItem> | null>) {
          if (!i || typeof i.book !== 'string' || typeof i.slug !== 'string' || typeof i.name !== 'string') continue;
          const k = keyOf(i.book, i.slug);
          if (seen.has(k)) continue;
          seen.add(k);
          items.push({ book: i.book, slug: i.slug, name: i.name });
        }
        return { ...current, items: items.slice(0, COMPARE_MAX) };
      },
    },
  ),
);
