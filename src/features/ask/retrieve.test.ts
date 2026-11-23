import { describe, expect, it } from 'vitest';
import { retrieve, type SourceBook } from './retrieve';
import { book } from '../../test/books';

const books: SourceBook[] = [
  { id: 'boericke', label: 'Boericke', data: book('boericke') },
  { id: 'allen', label: 'Allen', data: book('allen') },
];
const names = (q: string) => [...new Set(retrieve(q, books).map((p) => p.name))].sort();

describe('retrieve', () => {
  it('finds each named remedy, with shortened names', () => {
    const n = names('Compare Urtica urens, Rhus tox, Pulsatilla & Apis in Rheumatic complaints');
    expect(n).toEqual(expect.arrayContaining(['Urtica Urens', 'Rhus Toxicodendron', 'Apis Mellifica']));
    expect(n).not.toContain('Rheum'); // "Rheumatic" is not the remedy Rheum
  });

  it('does not take a later word of one name as another remedy', () => {
    const n = names('Drug picture of Kali brom');
    expect(n.some((x) => /^Kali/.test(x))).toBe(true);
    expect(n).not.toContain('Bromium');
  });

  it('settles a shared first word by what the other books mean', () => {
    expect(names('Apocynum in dropsy')).toContain('Apocynum Cannabinum');
    expect(names('Apocynum in dropsy')).not.toContain('Apocynum Androsaemifolium');
  });

  it('stays within the passage budget', () => {
    const chars = retrieve('Compare Nux vomica, Aloes and Aesculus', books).reduce(
      (n, p) => n + p.lines.reduce((m, l) => m + l.text.length, 0),
      0,
    );
    expect(chars).toBeGreaterThan(0);
    expect(chars).toBeLessThanOrEqual(80_000);
  });
});
