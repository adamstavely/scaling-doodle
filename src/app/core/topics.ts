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

/** Topics per priority chart. */
const CHART_SIZE = 4;

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
 * The Summary's priority charts: the topics in priority order (P1 first, most at risk first within a tier), four to a
 * chart, each headed by the tiers it covers. A bar per topic counts its papers published from `from` to `to`
 * (inclusive ISO dates), stacked by the centers their authors are in – a paper with authors in two centers counts
 * toward both. Every chart lists every contributing center, in one order, so their colours match.
 */
export function priorityCharts(
  topics: TopicSummaryDto[],
  papers: PaperListItemDto[],
  from: string,
  to: string,
): { id: string; heading: string; bars: PaperBar[] }[] {
  const inPeriod = papers.filter((p) => p.published >= from && p.published <= to);
  const centers = [...new Map(inPeriod.flatMap((p) => p.authorCenters).map((c) => [c.id, c.code ?? c.name])).values()].sort();
  const bars = (group: TopicSummaryDto[]): PaperBar[] =>
    group.flatMap((t) => {
      const own = inPeriod.filter((p) => p.topicId === t.id);
      // Every center on every bar, at 0 where it has none: the bars line up and the colours stay put
      return (centers.length ? centers : ['']).map((center) => ({
        id: t.id,
        x: t.name,
        center,
        y: own.filter((p) => p.authorCenters.some((c) => (c.code ?? c.name) === center)).length,
      }));
    });
  // Priority order; sort is stable, so within a tier the given (most at risk first) order holds
  const ordered = [...topics].sort((a, b) => a.bin - b.bin);
  const groups = Array.from({ length: Math.ceil(ordered.length / CHART_SIZE) }, (_, i) => ordered.slice(i * CHART_SIZE, (i + 1) * CHART_SIZE));
  return groups.map((group, i) => {
    const lo = group[0].bin;
    const hi = group[group.length - 1].bin;
    return { id: `priorities-${i + 1}`, heading: lo === hi ? `P${lo}` : `P${lo}–P${hi}`, bars: bars(group) };
  });
}
