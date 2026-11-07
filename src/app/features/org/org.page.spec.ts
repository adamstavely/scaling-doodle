import type { OrgCenterDto } from '../../api/generated/models/org-center-dto';
import type { OrgDto } from '../../api/generated/models/org-dto';
import type { PersonSummaryDto } from '../../api/generated/models/person-summary-dto';
import { centerCard, orgSummaryTiles } from './org.page';

const rollup = {
  topics: 2,
  healthMix: { healthy: 1, watch: 0, atRisk: 1 },
  avgHealthScore: 50,
  openGaps: 3,
  coverage: 0.333,
  fte: 1.2,
  budget: { allocated: 3.2, spent: 2.2 },
  papers: 5,
  collaboration: { unilateral: 3, joint: 2 },
};
const center = {
  id: 'sl-energy',
  name: 'Center for Energy & Climate',
  code: 'CEC',
  focus: 'Decarbonization.',
  lead: { id: 'sa', name: 'Sofia Almeida', initials: 'SA' },
  rollup,
  teams: [
    {
      id: 'team-climate',
      name: 'Climate Systems',
      code: null,
      lead: { id: 'am', name: 'Arjun Mehta', initials: 'AM' },
      rollup,
      topics: [
        { id: 't-climate', name: 'Climate', bin: 2, health: 'at-risk', healthScore: 0, momentum: -3, leadId: 'am', openGaps: 3, coverage: 0.333, fte: 0.7 },
      ],
    },
  ],
} as unknown as OrgCenterDto;

describe('centerCard', () => {
  const card = centerCard(center);

  it('maps the roll-up to stats and health counts', () => {
    expect(card.health).toEqual({ 'on-track': 1, watch: 0, 'at-risk': 1 });
    expect(card.stats.find((s) => s.id === 'coverage')).toMatchObject({ value: '33%', tone: 'danger' });
    expect(card.stats.find((s) => s.id === 'budget')).toMatchObject({ value: '$2.2M', sub: 'of $3.2M' });
    expect(card.stats.find((s) => s.id === 'joint')).toEqual({
      id: 'joint',
      label: 'Joint research',
      value: '40%',
      sub: '2 joint · 3 unilateral',
      meter: 0.4,
    });
  });

  it('gives each team row its joint-research share', () => {
    expect(card.teams[0].figures).toEqual([{ id: 'joint', value: '40%', label: 'joint' }]);
  });

  it('nests topics under teams with momentum as a fraction', () => {
    expect(card.teams[0].items?.[0]).toMatchObject({ id: 't-climate', health: 'at-risk', momentum: -0.03, tag: 'P2 · Core' });
  });

  it('shows a dash when a unit has no average health', () => {
    const empty = centerCard({ ...center, rollup: { ...rollup, avgHealthScore: null } } as unknown as OrgCenterDto);
    expect(empty.stats.find((s) => s.id === 'health')).toEqual({ id: 'health', label: 'Avg health', value: '—' });
  });

  it('shows a dash for joint research when a unit has published nothing', () => {
    const none = centerCard({ ...center, rollup: { ...rollup, papers: 0, collaboration: { unilateral: 0, joint: 0 } } } as unknown as OrgCenterDto);
    expect(none.stats.find((s) => s.id === 'joint')).toMatchObject({ value: '—', sub: 'no papers yet' });
  });
});

describe('orgSummaryTiles', () => {
  it('totals topics, researchers and budget across centers and other teams', () => {
    const org = {
      centers: [{ rollup: { ...rollup, topics: 2, fte: 1.2, budget: { allocated: 3.2, spent: 2.2 } } }],
      otherTeams: [{ rollup: { ...rollup, topics: 1, fte: 0.5, budget: { allocated: 1, spent: 0.4 } } }],
    } as unknown as OrgDto;
    const people = [{ allocations: [{ topicId: 't1', fte: 1 }] }, { allocations: [] }] as unknown as PersonSummaryDto[];
    expect(orgSummaryTiles(org, people).map((t) => [t.id, t.value, t.sub])).toEqual([
      ['topics', 3, 'tracked'],
      ['researchers', 1, '1.7 FTE allocated'],
      ['budget', '$4.2M', '$2.6M spent'],
    ]);
  });
});
