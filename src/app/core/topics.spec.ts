import type { PaperListItemDto } from '../api/generated/models/paper-list-item-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { priorityCharts, priorityMetricCharts } from './topics';

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

describe('priorityMetricCharts', () => {
  const topics = [topic('b', 2), topic('a', 1)];
  const withTotals = (topicId: string, views: number, citations: number, ...codes: string[]) =>
    ({ ...paper(topicId, '2020-01-01', ...codes), periodTotals: { views, citations } }) as unknown as PaperListItemDto;
  const [readership, citations] = priorityMetricCharts(topics, [withTotals('a', 100, 3, 'CCI'), withTotals('a', 50, 1, 'CCI', 'NEMC'), withTotals('b', 20, 0, 'NEMC')]);

  it('makes a readership chart and a citations chart over every topic, in priority order', () => {
    expect([readership.id, citations.id]).toEqual(['readership', 'citations']);
    expect([...new Set(readership.bars.map((b) => b.x))]).toEqual(['A', 'B']);
  });

  it('sums each topic’s period views and citations by author center, whenever the paper was published', () => {
    expect(readership.bars.filter((b) => b.x === 'A').map((b) => [b.center, b.y])).toEqual([
      ['CCI', 150],
      ['NEMC', 50],
    ]);
    expect(citations.bars.filter((b) => b.x === 'A').map((b) => [b.center, b.y])).toEqual([
      ['CCI', 4],
      ['NEMC', 1],
    ]);
  });

  it('counts papers without period totals as 0', () => {
    const [r] = priorityMetricCharts(topics, [paper('a', '2026-10-01', 'CCI')]);
    expect(r.bars.every((b) => b.y === 0)).toBe(true);
  });
});
