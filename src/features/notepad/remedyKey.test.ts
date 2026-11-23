import { describe, expect, it } from 'vitest';
import { findChapterFor } from './remedyKey';
import { book } from '../../test/books';

const tyler = book('tyler');
const allen = book('allen');
const boericke = book('boericke');

describe('findChapterFor', () => {
  it('matches a book chapter that is the same remedy under a shorter name', () => {
    expect(findChapterFor(tyler, 'Mercurius Solubilis')?.name).toBe('Mercurius');
    expect(findChapterFor(tyler, 'Arsenicum Album')?.name).toBe('Arsenicum');
    expect(findChapterFor(boericke, 'Hydrastis Canadensis')?.slug).toBeTruthy();
  });

  it('never sends a salt or sister species to another remedy', () => {
    expect(findChapterFor(tyler, 'Mercurius Corrosivus')).toBeUndefined();
    expect(findChapterFor(tyler, 'Arsenicum Iodatum')).toBeUndefined();
    expect(findChapterFor(allen, 'Tarentula Cubensis')).toBeUndefined();
  });
});
