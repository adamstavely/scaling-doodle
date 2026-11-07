import type { PriorityItem } from '@adamstavely/trenchcoat/priority-list';
import type { OrgCenterDto } from '../api/generated/models/org-center-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { priorityHealth } from './format';

/** Worst first, so a row takes the health of its weakest topic. */
const SEVERITY: TopicSummaryDto['health'][] = ['at-risk', 'watch', 'healthy'];

/**
 * Each center's topics in each priority tier rolled into one row: the tier is the row's priority, so the list groups
 * centers under P1–P4. Momentum and the trend are the topics' means, coverage is weighted by open gaps (as the API
 * rolls up a center), and the paper counts are summed. A center with no topics in a tier has no row there.
 */
export function centerPriorityRows(centers: OrgCenterDto[], topics: TopicSummaryDto[]): PriorityItem[] {
  // Tier first, so each tier's centers sit together.
  return [1, 2, 3, 4].flatMap((bin) =>
    centers.flatMap((c) => {
      const ts = topics.filter((t) => t.centerId === c.id && t.bin === bin);
      return ts.length ? [row(c, bin, ts)] : [];
    }),
  );
}

function row(c: OrgCenterDto, bin: number, ts: TopicSummaryDto[]): PriorityItem {
  const sum = (f: (t: TopicSummaryDto) => number) => ts.reduce((s, t) => s + f(t), 0);
  const openGaps = sum((t) => t.stats.openGaps);
  return {
    id: `${c.id}:${bin}`,
    name: c.name,
    badge: c.code ?? undefined,
    owner: `${ts.length} ${ts.length === 1 ? 'topic' : 'topics'}`,
    priority: bin,
    health: priorityHealth(SEVERITY.find((h) => ts.some((t) => t.health === h))!),
    trend: meanTrend(ts.map((t) => t.trend)),
    // Momentum is health points on a 0–100 scale; the list wants a fraction.
    change: sum((t) => t.momentum) / ts.length / 100,
    coverage: openGaps ? sum((t) => t.stats.openGaps * t.stats.coverage) / openGaps : 1,
    open: openGaps,
    work: sum((t) => t.stats.work),
    figures: { lastMonth: sum((t) => t.recentPapers.lastMonth), thisMonth: sum((t) => t.recentPapers.thisMonth) },
  };
}

/** The month-by-month mean of trends that all end this month; a shorter trend just stops counting further back. */
function meanTrend(trends: number[][]): number[] {
  const length = Math.max(0, ...trends.map((t) => t.length));
  return Array.from({ length }, (_, i) => {
    const values = trends.map((t) => t[t.length - length + i]).filter((v): v is number => v !== undefined);
    return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
  });
}
