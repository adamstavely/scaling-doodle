import type { GapListItemDto } from '../api/generated/models/gap-list-item-dto';
import { exposureGap, gapReviewCsv } from './gaps';

const gap = {
  id: 'g2',
  topicId: 't-neuro',
  text: 'On-chip learning rule, "local & stable", is unproven',
  severity: 'critical',
  status: 'open',
  topic: { id: 't-neuro', name: 'Neuromorphic Computing', health: 'at-risk', healthScore: 18, bin: 1 },
  owner: { id: 'mo', name: 'Marcus Okonkwo', initials: 'MO' },
  covered: false,
  activeWork: 0,
  invested: { budget: 0.9, fte: 1.2 },
} as unknown as GapListItemDto;

describe('gaps', () => {
  it('maps a gap onto an exposure row, with money in dollars', () => {
    expect(exposureGap(gap)).toEqual({
      id: 'g2',
      text: gap.text,
      severity: 'critical',
      item: 'Neuromorphic Computing',
      priority: 1,
      work: 0,
      owner: 'Marcus Okonkwo',
      budget: 900_000,
      fte: 1.2,
    });
    expect(exposureGap({ ...gap, invested: { budget: 0, fte: 0 } }).budget).toBeUndefined();
  });

  it('keeps text a spreadsheet would run as a formula from running', () => {
    const risky = { ...gap, text: '=1+1', topic: { ...gap.topic, name: '@SUM(A1:A9)' }, owner: { ...gap.owner, name: '+cmd|calc' } } as GapListItemDto;
    const [, row] = gapReviewCsv([risky]).trim().split('\n');
    expect(row.split(',').slice(1, 3)).toEqual(["'=1+1", "'@SUM(A1:A9)"]);
    expect(row).toContain("'+cmd|calc");
    for (const start of ['-2+3', '\tx', '\rx']) {
      const [, r] = gapReviewCsv([{ ...gap, text: start } as GapListItemDto]).trim().split('\n');
      expect(r.split(',')[1].replace(/^"/, '')).toMatch(/^'/);
    }
    // Our own numbers stay numbers
    expect(gapReviewCsv([{ ...gap, invested: { budget: 0.9, fte: 1.2 } } as GapListItemDto])).toContain(',0.9,1.2');
  });

  it('writes the review as CSV, quoting text with commas or quotes', () => {
    const [head, row] = gapReviewCsv([gap]).trim().split('\n');
    expect(head).toBe('Severity,Gap,Topic,Priority,Status,Owner,Active work,Invested ($M),Invested (FTE)');
    expect(row).toBe('critical,"On-chip learning rule, ""local & stable"", is unproven",Neuromorphic Computing,P1 · Flagship,open,Marcus Okonkwo,0,0.9,1.2');
  });
});
