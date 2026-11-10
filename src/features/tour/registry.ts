import type { Tour } from './types';

// Every ./tours/*.ts default-exports one tour; there is no central list to edit.
const modules = import.meta.glob<{ default: Tour }>('./tours/*.ts', { eager: true });

const TOURS: Tour[] = Object.values(modules)
  .map((m) => m.default)
  .filter((t): t is Tour => !!t && typeof t.id === 'string' && Array.isArray(t.steps))
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

const BY_ID = new Map(TOURS.map((t) => [t.id, t]));

/** Every registered tour, in Help page order (welcome first). */
export function allTours(): Tour[] {
  return TOURS;
}

export function getTour(id: string): Tour | undefined {
  return BY_ID.get(id);
}

export const WELCOME_ID = 'welcome';
