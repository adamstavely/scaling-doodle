import type { BriefDto } from '../../api/generated/models/brief-dto';
import { briefModel } from './brief';

const summary = {
  period: { label: 'ytd', from: '2026-01-01', to: '2026-11-07' },
  topics: 12,
  openGaps: 11,
  gapsCovered: 0.363,
  workInFlight: 8,
  papersInPeriod: 2,
  collaborationInPeriod: { unilateral: 1, joint: 1 },
  readsInPeriod: 101047,
  readTrend: [],
};
const rollup = {
  topics: 4,
  avgHealthScore: null,
  coverage: 0.333,
  openGaps: 6,
  budget: { allocated: 10.1, spent: 6.2 },
  papers: 4,
  collaboration: { unilateral: 3, joint: 1 },
};

const brief = {
  executiveSummary: ['12 topics in scope.'],
  decisions: [
    { tag: 'Resourcing', lead: 'Review Neuromorphic.', body: 'It is at risk.', topicId: 't-neuro' },
    { tag: 'Portfolio', lead: 'Rebalance.', body: 'Too much in P1.', topicId: null },
  ],
  atAGlance: summary,
  centers: [{ id: 'sl-energy', name: 'Energy & Climate', code: 'CEC', rollup }],
  exposure: [],
  investment: [{ bin: 1, label: 'Flagship', topics: 2, topicShare: 0.167, budget: 8, budgetShare: 0.315, fte: 3.1, fteShare: 0.33 }],
  impact: [],
} as unknown as BriefDto;

describe('briefModel', () => {
  const m = briefModel(brief);

  it('turns decisions into digest actions, linking topics when there is one', () => {
    expect(m.decisions).toEqual([
      { id: 'd0', text: 'Resourcing: Review Neuromorphic. It is at risk.', source: { label: 'Open topic', href: '/topics/t-neuro' } },
      { id: 'd1', text: 'Portfolio: Rebalance. Too much in P1.', source: undefined },
    ]);
  });

  it('splits the period papers into unilateral and joint', () => {
    expect(m.collaboration).toEqual([
      { label: 'Unilateral', value: 1 },
      { label: 'Joint', value: 1 },
    ]);
  });

  it('formats center and investment rows', () => {
    expect(m.centers[0]).toEqual({
      id: 'sl-energy',
      name: 'Energy & Climate (CEC)',
      topics: 4,
      health: '—',
      coverage: '33%',
      gaps: 6,
      budget: '$6.2M of $10.1M',
      joint: '1 of 4 (25%)',
    });
    expect(m.investment[0]).toEqual({
      id: 'bin-1',
      tier: 'P1 · Flagship',
      topics: '2 (17%)',
      budget: '$8M (32%)',
      fte: '3.1 (33%)',
    });
  });

  it('reuses the portfolio KPI tiles', () => {
    expect(m.tiles.find((t) => t.id === 'coverage')?.value).toBe('36%');
  });
});
