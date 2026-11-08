import type { PriorityItem } from '@adamstavely/trenchcoat/priority-list';
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

/** A topic as a bar: its name, health score and health, for tc-bar-chart. */
export type TopicBar = {
  id: string;
  x: string;
  y: number;
  health: TopicSummaryDto['health'];
};

/**
 * The Summary's two priority charts: P1–P2 in one, P3–P4 in the other, each topic's health score as a bar, in the order
 * given (most at risk first).
 */
export function priorityCharts(topics: TopicSummaryDto[]): { id: string; heading: string; bars: TopicBar[] }[] {
  const bars = (bins: number[]) =>
    topics.filter((t) => bins.includes(t.bin)).map((t) => ({ id: t.id, x: t.name, y: t.healthScore, health: t.health }));
  return [
    { id: 'p1-p2', heading: 'P1–P2 · Flagship and core', bars: bars([1, 2]) },
    { id: 'p3-p4', heading: 'P3–P4 · Core and emerging', bars: bars([3, 4]) },
  ];
}
