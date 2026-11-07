import { collaborationLabel, collaborationParts, collaborationSummary, jointShare } from './collaboration';

describe('collaboration', () => {
  it('splits papers into unilateral then joint parts', () => {
    expect(collaborationParts({ unilateral: 3, joint: 1 })).toEqual([
      { label: 'Unilateral', value: 3 },
      { label: 'Joint', value: 1 },
    ]);
    expect(collaborationParts(undefined)).toEqual([
      { label: 'Unilateral', value: 0 },
      { label: 'Joint', value: 0 },
    ]);
  });

  it('gives the joint share of everything published, or null with nothing', () => {
    expect(jointShare({ unilateral: 3, joint: 1 })).toBe(0.25);
    expect(jointShare({ unilateral: 0, joint: 0 })).toBeNull();
    expect(collaborationSummary({ unilateral: 1, joint: 1 })).toBe('1 of 2 joint (50%)');
    expect(collaborationSummary(undefined)).toBe('No papers yet');
  });

  it('labels a paper by its partner labs', () => {
    expect(collaborationLabel([])).toBe('Unilateral');
    expect(collaborationLabel(['NREL', 'Scripps'])).toBe('Joint with NREL, Scripps');
  });
});
