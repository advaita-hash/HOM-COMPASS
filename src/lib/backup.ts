// ---------------------------------------------------------------------------
// Backup and restore of everything HOM-COMPASS keeps in this browser.
//
// Records live only in localStorage, so a backup file is the only way to move
// them to another browser or survive cleared site data. The functions here are
// pure apart from the storage passed in, so they can be exercised with a fake.
// ---------------------------------------------------------------------------

export const BACKUP_APP = 'hom-compass';
export const BACKUP_FORMAT = 1;
export const KEY_PREFIX = 'hom-compass.';
export const PATIENTS_KEY = 'hom-compass.patients';
/** The notepad store (src/features/notepad/notepadStore.ts). */
export const NOTEPAD_KEY = 'hom-compass.notepad';
export const LAST_BACKUP_KEY = 'hom-compass.last-backup';

/**
 * Keys that never travel in a backup: the sign-in session for the shared
 * Common Room (a credential, not a record) and this device's own
 * last-export timestamp.
 */
const EXCLUDED_KEYS = new Set(['hom-compass.common-room-auth', LAST_BACKUP_KEY]);

/** The subset of `Storage` the backup needs; `window.localStorage` fits. */
export interface KeyValueStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * `window.localStorage`, or an empty stand-in when the browser blocks it
 * (merely touching `localStorage` can throw in that case).
 */
export function browserStorage(): KeyValueStorage {
  try {
    return window.localStorage;
  } catch {
    const blocked = () => {
      throw new Error('storage unavailable');
    };
    return { length: 0, key: () => null, getItem: () => null, setItem: blocked, removeItem: () => {} };
  }
}

export interface Backup {
  app: typeof BACKUP_APP;
  format: typeof BACKUP_FORMAT;
  exportedAt: string;
  data: Record<string, unknown>;
}

export interface BackupCounts {
  patients: number;
  cases: number;
  /** Notepad notes, or null when the backup has no notepad (made before notes existed). */
  notes: number | null;
}

export type ParseResult = { ok: true; backup: Backup; counts: BackupCounts } | { ok: false; error: string };

export type RestoreResult = { ok: true; written: number } | { ok: false; error: string };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function included(key: string): boolean {
  return key.startsWith(KEY_PREFIX) && !EXCLUDED_KEYS.has(key);
}

/**
 * Collects every app key from `storage` (JSON-parsed). `live` values win over
 * what is stored, so state that failed to save can still be exported.
 */
export function buildBackup(
  storage: KeyValueStorage,
  live: Record<string, unknown> = {},
  now: Date = new Date(),
): Backup {
  const data: Record<string, unknown> = {};
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && included(k)) keys.push(k);
    }
    for (const k of keys.sort()) {
      const raw = storage.getItem(k);
      if (raw === null) continue;
      try {
        data[k] = JSON.parse(raw);
      } catch {
        /* not one of our JSON entries; leave it out */
      }
    }
  } catch {
    /* storage blocked: export whatever is live in memory */
  }
  for (const [k, v] of Object.entries(live)) {
    if (included(k)) data[k] = v;
  }
  return { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: now.toISOString(), data };
}

/** A saved store's `state`, or null when the entry isn't one. */
function storeState(entry: unknown): Record<string, unknown> | null {
  return isPlainObject(entry) && isPlainObject(entry.state) ? entry.state : null;
}

const nonEmpty = (v: unknown) => typeof v === 'string' && v !== '';

/** A note the notepad will keep on rehydrate (the same test as its cleanNote). */
function isUsableNote(n: unknown): boolean {
  return isPlainObject(n) && nonEmpty(n.id) && typeof n.body === 'string' && (nonEmpty(n.remedy) || nonEmpty(n.book));
}

/** Patients and cases in a backup's `hom-compass.patients` entry, notes in its notepad. */
export function countRecords(data: Record<string, unknown>): BackupCounts {
  const state = storeState(data[PATIENTS_KEY]);
  const pad = storeState(data[NOTEPAD_KEY]);
  return {
    patients: state && Array.isArray(state.patients) ? state.patients.length : 0,
    cases: state && Array.isArray(state.cases) ? state.cases.length : 0,
    notes: pad ? (Array.isArray(pad.notes) ? pad.notes.filter(isUsableNote).length : 0) : null,
  };
}

/** Validates the text of a backup file. Errors are written for the user. */
export function parseBackup(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file isn’t a HOM-COMPASS backup, or it’s damaged.' };
  }
  if (!isPlainObject(json) || json.app !== BACKUP_APP) {
    return { ok: false, error: 'This file isn’t a HOM-COMPASS backup.' };
  }
  if (json.format !== BACKUP_FORMAT) {
    return {
      ok: false,
      error: 'This backup was made by a different version of HOM-COMPASS and can’t be restored here.',
    };
  }
  if (typeof json.exportedAt !== 'string' || Number.isNaN(Date.parse(json.exportedAt))) {
    return { ok: false, error: 'This backup is damaged: its export date is missing.' };
  }
  const data = json.data;
  if (!isPlainObject(data)) {
    return { ok: false, error: 'This backup is damaged: it contains no data.' };
  }
  const keys = Object.keys(data);
  if (!keys.every((k) => k.startsWith(KEY_PREFIX))) {
    return { ok: false, error: 'This backup contains data that doesn’t belong to HOM-COMPASS.' };
  }
  // only excluded keys (sign-in, last-backup time) would mean nothing to restore
  if (!keys.some(included)) {
    return { ok: false, error: 'This backup is empty.' };
  }
  // Every app entry is a saved store: { state: {...}, version? }. A damaged
  // patients entry means the records can't be trusted; any other damaged
  // entry (a setting or draft) is left out so this device keeps its own.
  const isStoreEntry = (v: unknown) => isPlainObject(v) && isPlainObject(v.state);
  if (PATIENTS_KEY in data && !isStoreEntry(data[PATIENTS_KEY])) {
    return { ok: false, error: 'This backup is damaged: its patient records can’t be read.' };
  }
  const kept = Object.fromEntries(Object.entries(data).filter(([k, v]) => !included(k) || isStoreEntry(v)));
  if (!Object.keys(kept).some(included)) {
    return { ok: false, error: 'This backup is damaged: none of its data can be read.' };
  }
  const backup: Backup = { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: json.exportedAt, data: kept };
  return { ok: true, backup, counts: countRecords(kept) };
}

/**
 * Writes every entry of a validated backup into `storage`. If any write fails
 * (storage full or blocked) the entries already written are put back the way
 * they were, so a failed restore leaves the device unchanged.
 */
export function restoreBackup(backup: Backup, storage: KeyValueStorage): RestoreResult {
  const entries = Object.entries(backup.data).filter(([k]) => included(k));
  const previous: Array<[string, string | null]> = [];
  try {
    for (const [k, v] of entries) {
      previous.push([k, storage.getItem(k)]);
      storage.setItem(k, JSON.stringify(v));
    }
    return { ok: true, written: entries.length };
  } catch {
    for (const [k, old] of previous.reverse()) {
      try {
        // remove first so the old value has room to go back in
        storage.removeItem(k);
        if (old !== null) storage.setItem(k, old);
      } catch {
        /* best effort */
      }
    }
    return {
      ok: false,
      error: 'The backup couldn’t be restored because this browser’s storage is full or blocked. Nothing was changed.',
    };
  }
}

/** hom-compass-backup-YYYY-MM-DD.json, using the local calendar date. */
export function backupFileName(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `hom-compass-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

/** Time of the last export from this device, or null if there hasn't been one. */
export function readLastBackup(storage: KeyValueStorage): Date | null {
  try {
    const raw = storage.getItem(LAST_BACKUP_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'string') return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function recordLastBackup(storage: KeyValueStorage, date: Date): void {
  try {
    storage.setItem(LAST_BACKUP_KEY, JSON.stringify(date.toISOString()));
  } catch {
    /* the export itself still succeeded */
  }
}

/** Saves the backup as a JSON file through a temporary download link. */
export function downloadBackup(backup: Backup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFileName(new Date(backup.exportedAt));
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
