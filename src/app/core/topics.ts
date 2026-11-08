import type { PriorityItem } from '@adamstavely/trenchcoat/priority-list';
import type { PaperListItemDto } from '../api/generated/models/paper-list-item-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { priorityHealth } from './format';

/** A topic → a tc-priority-list row, as the dashboard's Priorities and the Research Topics page show it. */
export function topicPriorityItem(t: TopicSummaryDto): PriorityItem {
  return {
    id: t.id,
    name: t.name,
    owner: t.lead?.name,
    priority: t.bin,
    health: priorityHealth(t.health),
    trend: t.trend,
    // Momentum is health points on a 0–100 scale; the list wants a fraction, so −3 points shows as ▼ 3%.
    change: t.momentum / 100,
    coverage: t.stats.coverage,
    open: t.stats.openGaps,
    work: t.stats.work,
  };
}

/** One segment of a priority's bar: its papers by one contributing center, for tc-bar-chart's long table. */
export type PaperBar = {
  /** The topic's id, to open it */
  id: string;
  /** The topic's name: the bar */
  x: string;
  /** The center's code: the segment */
  center: string;
  y: number;
};

/**
 * The Summary's two priority charts: P1–P2 in one, P3–P4 in the other, a bar per topic counting its papers published
 * from `from` to `to` (inclusive ISO dates), stacked by the centers their authors are in – a paper with authors in two
 * centers counts toward both. Every chart lists every contributing center, in one order, so their colours match.
 */
export function priorityCharts(
  topics: TopicSummaryDto[],
  papers: PaperListItemDto[],
  from: string,
  to: string,
): { id: string; heading: string; bars: PaperBar[] }[] {
  const inPeriod = papers.filter((p) => p.published >= from && p.published <= to);
  const centers = [...new Map(inPeriod.flatMap((p) => p.authorCenters).map((c) => [c.id, c.code ?? c.name])).values()].sort();
  const bars = (bins: number[]): PaperBar[] =>
    topics
      .filter((t) => bins.includes(t.bin))
      .flatMap((t) => {
        const own = inPeriod.filter((p) => p.topicId === t.id);
        // Every center on every bar, at 0 where it has none: the bars line up and the colours stay put
        return (centers.length ? centers : ['']).map((center) => ({
          id: t.id,
          x: t.name,
          center,
          y: own.filter((p) => p.authorCenters.some((c) => (c.code ?? c.name) === center)).length,
        }));
      });
  return [
    { id: 'p1-p2', heading: 'P1–P2 · Flagship and core', bars: bars([1, 2]) },
    { id: 'p3-p4', heading: 'P3–P4 · Core and emerging', bars: bars([3, 4]) },
  ];
}
