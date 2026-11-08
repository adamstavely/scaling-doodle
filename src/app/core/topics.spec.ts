import type { PaperListItemDto } from '../api/generated/models/paper-list-item-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { priorityCharts } from './topics';

const topic = (id: string, bin: number) => ({ id, name: id.toUpperCase(), bin }) as unknown as TopicSummaryDto;
const paper = (topicId: string, published: string, ...codes: string[]) =>
  ({ topicId, published, authorCenters: codes.map((code) => ({ id: code.toLowerCase(), code, name: code })) }) as unknown as PaperListItemDto;

describe('priorityCharts', () => {
  const topics = [topic('a', 1), topic('b', 2), topic('c', 3)];
  const papers = [
    paper('a', '2026-10-05', 'CCI'),
    paper('a', '2026-11-01', 'CCI', 'NEMC'),
    paper('b', '2026-10-20', 'NEMC'),
    paper('c', '2026-09-30', 'CCI'), // before the period
  ];
  const [top, rest] = priorityCharts(topics, papers, '2026-10-01', '2026-12-31');

  it('splits P1–P2 from P3–P4', () => {
    expect([top.id, rest.id]).toEqual(['p1-p2', 'p3-p4']);
    expect([...new Set(top.bars.map((b) => b.x))]).toEqual(['A', 'B']);
    expect([...new Set(rest.bars.map((b) => b.x))]).toEqual(['C']);
  });

  it('counts each topic’s papers in the period by author center, a joint paper toward each', () => {
    expect(top.bars).toEqual([
      { id: 'a', x: 'A', center: 'CCI', y: 2 },
      { id: 'a', x: 'A', center: 'NEMC', y: 1 },
      { id: 'b', x: 'B', center: 'CCI', y: 0 },
      { id: 'b', x: 'B', center: 'NEMC', y: 1 },
    ]);
  });

  it('keeps every center on every bar, so both charts share colours', () => {
    expect(rest.bars).toEqual([
      { id: 'c', x: 'C', center: 'CCI', y: 0 },
      { id: 'c', x: 'C', center: 'NEMC', y: 0 },
    ]);
  });

  it('still draws a bar per topic with no papers in the period', () => {
    expect(priorityCharts(topics, [], '2026-10-01', '2026-12-31')[0].bars).toEqual([
      { id: 'a', x: 'A', center: '', y: 0 },
      { id: 'b', x: 'B', center: '', y: 0 },
    ]);
  });
});
