import type { PaperListItemDto } from '../api/generated/models/paper-list-item-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { priorityCharts } from './topics';

const topic = (id: string, bin: number) => ({ id, name: id.toUpperCase(), bin }) as unknown as TopicSummaryDto;
const paper = (topicId: string, published: string, ...codes: string[]) =>
  ({ topicId, published, authorCenters: codes.map((code) => ({ id: code.toLowerCase(), code, name: code })) }) as unknown as PaperListItemDto;

describe('priorityCharts', () => {
  // Most at risk first, as the API sorts them; tiers mixed
  const topics = [topic('c', 2), topic('a', 1), topic('d', 2), topic('e', 3), topic('b', 1), topic('f', 3), topic('g', 4), topic('h', 4), topic('i', 4)];
  const papers = [
    paper('a', '2026-10-05', 'CCI'),
    paper('a', '2026-11-01', 'CCI', 'NEMC'),
    paper('c', '2026-10-20', 'NEMC'),
    paper('e', '2026-09-30', 'CCI'), // before the period
  ];
  const charts = priorityCharts(topics, papers, '2026-10-01', '2026-12-31');
  const names = (i: number) => [...new Set(charts[i].bars.map((b) => b.x))];

  it('puts four topics in each chart, in priority order, most at risk first within a tier', () => {
    expect(charts.map((c) => c.id)).toEqual(['priorities-1', 'priorities-2', 'priorities-3']);
    expect(names(0)).toEqual(['A', 'B', 'C', 'D']);
    expect(names(1)).toEqual(['E', 'F', 'G', 'H']);
    expect(names(2)).toEqual(['I']);
  });

  it('heads each chart with the tiers it covers', () => {
    expect(charts.map((c) => c.heading)).toEqual(['P1–P2', 'P3–P4', 'P4']);
  });

  it('counts each topic’s papers in the period by author center, a joint paper toward each', () => {
    expect(charts[0].bars.filter((b) => b.x === 'A')).toEqual([
      { id: 'a', x: 'A', center: 'CCI', y: 2 },
      { id: 'a', x: 'A', center: 'NEMC', y: 1 },
    ]);
    expect(charts[0].bars.filter((b) => b.x === 'C')).toEqual([
      { id: 'c', x: 'C', center: 'CCI', y: 0 },
      { id: 'c', x: 'C', center: 'NEMC', y: 1 },
    ]);
  });

  it('keeps every center on every bar, so the charts share colours', () => {
    expect(charts[1].bars.filter((b) => b.x === 'E').map((b) => [b.center, b.y])).toEqual([
      ['CCI', 0],
      ['NEMC', 0],
    ]);
  });

  it('still draws a bar per topic with no papers in the period', () => {
    expect(priorityCharts(topics.slice(0, 2), [], '2026-10-01', '2026-12-31')[0].bars).toEqual([
      { id: 'a', x: 'A', center: '', y: 0 },
      { id: 'c', x: 'C', center: '', y: 0 },
    ]);
  });
});
