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
