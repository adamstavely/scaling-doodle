import type { OrgCenterDto } from '../api/generated/models/org-center-dto';
import type { PaperListItemDto } from '../api/generated/models/paper-list-item-dto';
import type { PersonSummaryDto } from '../api/generated/models/person-summary-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { centerCollaboration, centerData, centerPaperResults, centerTiles, centerTopicItems } from './center';

const center = {
  id: 'c-cci',
  name: 'Center for Cyber Intelligence',
  code: 'CCI',
  teams: [{ id: 'team-cog' }, { id: 'team-auto' }],
  rollup: { topics: 2, coverage: 0.5, openGaps: 4, fte: 3.5, budget: { allocated: 6.7, spent: 3.6 } },
} as unknown as OrgCenterDto;
const topic = (id: string, centerId: string, health: string) =>
  ({ id, name: id, centerId, health, bin: 1, momentum: 0, trend: [], stats: { coverage: 0.5, openGaps: 2, work: 1 }, recentPapers: { lastMonth: 1, thisMonth: 0 } }) as unknown as TopicSummaryDto;
const person = (id: string, team: string | null) => ({ id, team }) as unknown as PersonSummaryDto;
const paper = (id: string, published: string, centers: string[], partners: string[] = []) =>
  ({
    id,
    title: `Paper ${id}`,
    venue: 'Nature',
    published,
    topic: { id: 't', name: 'Neuromorphic Computing' },
    partners,
    authorCenters: centers.map((c) => ({ id: c, code: c, name: c })),
    periodTotals: { views: 1500, citations: 4 },
  }) as unknown as PaperListItemDto;

describe('center', () => {
  const data = centerData(
    center,
    [topic('t-neuro', 'c-cci', 'at-risk'), topic('t-advml', 'c-cci', 'healthy'), topic('t-grid', 'c-nemc', 'healthy')],
    [person('mo', 'team-cog'), person('dw', 'team-auto'), person('sa', 'team-energy'), person('hv', null)],
    [paper('p1', '2026-10-05', ['c-cci']), paper('p2', '2026-11-01', ['c-cci', 'c-nemc'], ['NREL']), paper('p3', '2026-10-10', ['c-nemc']), paper('p4', '2025-01-01', ['c-cci'])],
    '2026-10-01',
    '2026-12-31',
  );

  it('keeps the center’s own topics, people on its teams, and its authors’ papers in the period', () => {
    expect(data.topics.map((t) => t.id)).toEqual(['t-neuro', 't-advml']);
    expect(data.people.map((p) => p.id)).toEqual(['mo', 'dw']);
    expect(data.papers.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('sums the center up in tiles', () => {
    expect(centerTiles(data).map((t) => [t.label, t.value, t.sub])).toEqual([
      ['Topics', 2, '1 at risk'],
      ['Gap coverage', '50%', '4 open gaps'],
      ['Papers', 2, '1 with partner labs'],
      ['People', 2, '3.5 FTE allocated'],
      ['Budget', '$6.7M', '54% spent'],
    ]);
  });

  it('shows no coverage figure for a center without topics', () => {
    const empty = centerData({ ...center, teams: [], rollup: { ...center.rollup, topics: 0, coverage: 1, openGaps: 0 } }, [], [], [], '2026-10-01', '2026-12-31');
    expect(centerTiles(empty)[1]).toMatchObject({ value: '—', sub: 'no topics yet' });
  });

  it('lists its topics with papers last month and this', () => {
    expect(centerTopicItems(data)[0]).toMatchObject({ id: 't-neuro', figures: { lastMonth: 1, thisMonth: 0 } });
  });

  it('lists its papers newest first, with partners and period readership', () => {
    const results = centerPaperResults(data);
    expect(results.map((r) => r.id)).toEqual(['p2', 'p1']);
    expect(results[0]).toMatchObject({ kind: 'Neuromorphic Computing', href: '/papers/p2', meta: ['with NREL', '1.5K views', '4 citations'] });
  });

  it('splits its papers into unilateral and joint', () => {
    expect(centerCollaboration(data)).toEqual({ unilateral: 1, joint: 1 });
  });
});
