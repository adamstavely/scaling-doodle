import type { OrgCenterDto } from '../../api/generated/models/org-center-dto';
import { centerCard } from './org.page';

const rollup = {
  topics: 2,
  healthMix: { healthy: 1, watch: 0, atRisk: 1 },
  avgHealthScore: 50,
  openGaps: 3,
  coverage: 0.333,
  fte: 1.2,
  budget: { allocated: 3.2, spent: 2.2 },
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
  });

  it('nests topics under teams with momentum as a fraction', () => {
    expect(card.teams[0].items?.[0]).toMatchObject({ id: 't-climate', health: 'at-risk', momentum: -0.03, tag: 'P2 · Core' });
  });

  it('shows a dash when a unit has no average health', () => {
    const empty = centerCard({ ...center, rollup: { ...rollup, avgHealthScore: null } } as unknown as OrgCenterDto);
    expect(empty.stats.find((s) => s.id === 'health')).toEqual({ id: 'health', label: 'Avg health', value: '—' });
  });
});
