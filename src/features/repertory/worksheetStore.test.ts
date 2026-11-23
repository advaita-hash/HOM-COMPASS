import { describe, expect, it } from 'vitest';
import { repertorize } from './worksheetStore';
import type { Repertory } from './types';

const rep = {
  id: 't', title: 't', author: 't', source: 't', chapters: ['Mind'], rubricCount: 3,
  rubrics: [
    { id: 'r1', chapter: 'Mind', rubric: 'Weeping', remedies: [{ name: 'Puls', grade: 3 }, { name: 'Nat-m', grade: 2 }] },
    { id: 'r2', chapter: 'Mind', rubric: 'Consolation agg', remedies: [{ name: 'Nat-m', grade: 3 }, { name: 'Nat-m', grade: 1 }] },
    { id: 'r3', chapter: 'Mind', rubric: 'Thirstless', remedies: [{ name: 'Puls', grade: 3 }] },
  ],
} as unknown as Repertory;

describe('repertorize', () => {
  it('ranks by rubrics covered, then by grade x intensity', () => {
    const { scores } = repertorize(rep, [
      { rubricId: 'r1', intensity: 1 },
      { rubricId: 'r2', intensity: 2 },
      { rubricId: 'r3', intensity: 1 },
    ]);
    expect(scores.map((s) => [s.name, s.rubricsCovered, s.totalScore])).toEqual([
      ['Nat-m', 2, 2 + 3 * 2], // a remedy listed twice in a rubric counts at its highest grade
      ['Puls', 2, 3 + 3],
    ]);
  });

  it('counts a rubric added twice once, and ignores unknown rubrics', () => {
    const { scores, rubrics } = repertorize(rep, [
      { rubricId: 'r3', intensity: 1 },
      { rubricId: 'r3', intensity: 3 },
      { rubricId: 'nope', intensity: 1 },
    ]);
    expect(rubrics.map((r) => r.id)).toEqual(['r3']);
    expect(scores).toEqual([{ name: 'Puls', rubricsCovered: 1, totalScore: 3, grades: { r3: 3 } }]);
  });

  it('is empty without a repertory or rubrics', () => {
    expect(repertorize(undefined, [{ rubricId: 'r1', intensity: 1 }]).scores).toEqual([]);
    expect(repertorize(rep, []).scores).toEqual([]);
  });
});
