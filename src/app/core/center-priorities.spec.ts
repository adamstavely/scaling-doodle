import type { OrgCenterDto } from '../api/generated/models/org-center-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { centerPriorityRows } from './center-priorities';

const center = (id: string, code: string | null, name: string) => ({ id, code, name }) as unknown as OrgCenterDto;
const topic = (
  name: string,
  centerId: string,
  bin: number,
  health: string,
  more: { momentum?: number; trend?: number[]; openGaps?: number; coverage?: number; work?: number; papers?: [number, number] } = {},
) =>
  ({
    id: name,
    name,
    centerId,
    bin,
    health,
    momentum: more.momentum ?? 0,
    trend: more.trend ?? [],
    stats: { openGaps: more.openGaps ?? 0, coverage: more.coverage ?? 0, work: more.work ?? 0 },
    recentPapers: { lastMonth: more.papers?.[0] ?? 0, thisMonth: more.papers?.[1] ?? 0 },
  }) as unknown as TopicSummaryDto;

describe('centerPriorityRows', () => {
  const centers = [center('cec', 'CEC', 'Center for Energy & Climate'), center('cis', null, 'Center for Intelligent Systems')];
  const topics = [
    topic('Grid storage', 'cec', 1, 'healthy', { momentum: 6, trend: [70, 80], openGaps: 3, coverage: 1, work: 2, papers: [2, 1] }),
    topic('Fusion', 'cec', 1, 'at-risk', { momentum: -2, trend: [10, 30, 40], openGaps: 1, coverage: 0, work: 1, papers: [1, 0] }),
    topic('Robotics', 'cis', 2, 'healthy', { papers: [0, 3] }),
  ];

  it('makes a row per center per tier it has topics in', () => {
    expect(centerPriorityRows(centers, topics).map((r) => [r.id, r.priority, r.badge])).toEqual([
      ['cec:1', 1, 'CEC'],
      ['cis:2', 2, undefined],
    ]);
  });

  it("sums papers and work, averages momentum and the trend, and takes the weakest topic's health", () => {
    const [cec] = centerPriorityRows(centers, topics);
    expect(cec).toMatchObject({
      name: 'Center for Energy & Climate',
      owner: '2 topics',
      health: 'at-risk',
      change: 0.02,
      trend: [10, 50, 60],
      coverage: 0.75,
      open: 4,
      work: 3,
      figures: { lastMonth: 3, thisMonth: 1 },
    });
  });

  it('counts a tier with no open gaps as fully covered', () => {
    expect(centerPriorityRows(centers, topics)[1]).toMatchObject({ coverage: 1, open: 0, figures: { lastMonth: 0, thisMonth: 3 } });
  });
});
