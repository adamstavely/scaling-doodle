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

  it('writes the review as CSV, quoting text with commas or quotes', () => {
    const [head, row] = gapReviewCsv([gap]).trim().split('\n');
    expect(head).toBe('Severity,Gap,Topic,Priority,Status,Owner,Active work,Invested ($M),Invested (FTE)');
    expect(row).toBe('critical,"On-chip learning rule, ""local & stable"", is unproven",Neuromorphic Computing,P1 · Flagship,open,Marcus Okonkwo,0,0.9,1.2');
  });
});
