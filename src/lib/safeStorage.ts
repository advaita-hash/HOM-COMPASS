import { create } from 'zustand';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Guarded browser storage for every persisted store.
//
// zustand's persist middleware updates the screen first and then writes to
// localStorage without catching errors, so a full or blocked store loses data
// silently. This wrapper catches every failure and raises a visible flag
// (StorageStatusBanner) instead.
// ---------------------------------------------------------------------------

interface StorageHealth {
  /**
   * Every key whose last read or write failed, with a reason for the user.
   * Tracked per key so one store recovering never hides another that is still
   * unsaved. '*' is the startup probe.
   */
  failed: Record<string, string>;
}

export const useStorageHealth = create<StorageHealth>(() => ({ failed: {} }));

export const PROBE_KEY = '*';

function describe(err: unknown): string {
  const name = (err as { name?: string })?.name ?? '';
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
    return 'This device’s storage for HOM-COMPASS is full.';
  }
  return 'This browser is blocking storage (private window or site data turned off).';
}

function markFailed(name: string, err: unknown): void {
  useStorageHealth.setState((s) => ({ failed: { ...s.failed, [name]: describe(err) } }));
}

/** A real write succeeded: clear that key, and the probe (storage works). */
function markOk(name: string): void {
  const { failed } = useStorageHealth.getState();
  if (!(name in failed) && !(PROBE_KEY in failed)) return;
  const rest = { ...failed };
  delete rest[name];
  delete rest[PROBE_KEY];
  useStorageHealth.setState({ failed: rest });
}

const guarded: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch (err) {
      markFailed(name, err);
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
      markOk(name);
    } catch (err) {
      markFailed(name, err);
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* nothing to lose */
    }
  },
};

/** Drop-in `storage` option for zustand persist: `storage: safeStorage()`. */
export function safeStorage<S>() {
  return createJSONStorage<S>(() => guarded);
}

/**
 * The persisted state as a plain object ({} for anything else). For a store's
 * `merge`, which should copy only fields of the right type from it: storage
 * can hold anything (hand-edited, damaged, or restored from an older backup),
 * and zustand's default merge would copy wrong shapes straight into the store.
 */
export function persistedObject(persisted: unknown): Record<string, unknown> {
  return typeof persisted === 'object' && persisted !== null && !Array.isArray(persisted)
    ? (persisted as Record<string, unknown>)
    : {};
}

/** Check once at startup that writes work at all. */
export function probeStorage(): boolean {
  try {
    const k = '__hom-compass-probe';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch (err) {
    markFailed(PROBE_KEY, err);
    return false;
  }
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    /* best effort */
  }
}
