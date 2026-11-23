import { describe, expect, it } from 'vitest';
import { buildBackup, decryptBackup, encryptBackup, isEncryptedBackup, parseBackup, type KeyValueStorage } from './backup';

function memory(entries: Record<string, unknown>): KeyValueStorage {
  const m = new Map(Object.entries(entries).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

const patients = { state: { patients: [{ id: 'p1', name: 'Asha' }], cases: [] }, version: 1 };

describe('backups', () => {
  it('exports app data but never the Common Room sign-in', () => {
    const b = buildBackup(memory({ 'hom-compass.patients': patients, 'hom-compass.common-room-auth': { token: 'x' }, other: 1 }));
    expect(Object.keys(b.data)).toEqual(['hom-compass.patients']);
  });

  it('rejects files that are not HOM-COMPASS backups', () => {
    expect(parseBackup('not json').ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'other', format: 1 })).ok).toBe(false);
  });

  it('round-trips a password-protected backup and refuses a wrong password', async () => {
    const b = buildBackup(memory({ 'hom-compass.patients': patients }));
    const sealed = await encryptBackup(b, 'pw');
    expect(isEncryptedBackup(sealed)).toBe(true);
    expect(sealed).not.toContain('Asha');
    expect(await decryptBackup(sealed, 'wrong')).toBeNull();
    const parsed = parseBackup((await decryptBackup(sealed, 'pw'))!);
    expect(parsed.ok && parsed.counts.patients).toBe(1);
  });
});
