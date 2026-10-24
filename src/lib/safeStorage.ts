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
  /** Key of the last write that failed, or null while everything saves. */
  failedKey: string | null;
  reason: string | null;
}

export const useStorageHealth = create<StorageHealth>(() => ({ failedKey: null, reason: null }));

function describe(err: unknown): string {
  const name = (err as { name?: string })?.name ?? '';
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
    return 'This device’s storage for HOM-COMPASS is full.';
  }
  return 'This browser is blocking storage (private window or site data turned off).';
}

const guarded: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch (err) {
      useStorageHealth.setState({ failedKey: name, reason: describe(err) });
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
      if (useStorageHealth.getState().failedKey === name) {
        useStorageHealth.setState({ failedKey: null, reason: null });
      }
    } catch (err) {
      useStorageHealth.setState({ failedKey: name, reason: describe(err) });
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

/** Check once at startup that writes work at all. */
export function probeStorage(): boolean {
  try {
    const k = '__hom-compass-probe';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch (err) {
    useStorageHealth.setState({ failedKey: '*', reason: describe(err) });
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
