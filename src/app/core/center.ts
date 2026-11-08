import type { OpsTile } from '@adamstavely/trenchcoat/ops-overview';
import type { PriorityItem } from '@adamstavely/trenchcoat/priority-list';
import type { SearchResult } from '@adamstavely/trenchcoat/results-list';
import type { CollaborationCountsDto } from '../api/generated/models/collaboration-counts-dto';
import type { OrgCenterDto } from '../api/generated/models/org-center-dto';
import type { PaperListItemDto } from '../api/generated/models/paper-list-item-dto';
import type { PersonSummaryDto } from '../api/generated/models/person-summary-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { compactNumber, localDate, percent } from './format';
import { topicPriorityItem } from './topics';

/** What a center page shows, from the org tree, topics, people and papers already in the caller's scope. */
export interface CenterData {
  center: OrgCenterDto;
  /** The center's topics */
  topics: TopicSummaryDto[];
  /** People on the center's teams */
  people: PersonSummaryDto[];
  /** Papers published in the period with an author in the center */
  papers: PaperListItemDto[];
}

/** Gathers a center's own topics, people and papers (published from `from` to `to`) from the page's lists. */
export function centerData(
  center: OrgCenterDto,
  topics: TopicSummaryDto[],
  people: PersonSummaryDto[],
  papers: PaperListItemDto[],
  from: string,
  to: string,
): CenterData {
  const teams = new Set(center.teams.map((t) => t.id));
  return {
    center,
    topics: topics.filter((t) => t.centerId === center.id),
    people: people.filter((p) => p.team !== null && teams.has(p.team)),
    papers: papers.filter((p) => p.published >= from && p.published <= to && p.authorCenters.some((c) => c.id === center.id)),
  };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const money = (m: number) => `$${Math.round(m * 10) / 10}M`;

/** The center at a glance: topics, gap coverage, papers in the period, people and budget. */
export function centerTiles({ center, topics, people, papers }: CenterData): OpsTile[] {
  const r = center.rollup;
  const atRisk = topics.filter((t) => t.health === 'at-risk').length;
  const joint = papers.filter((p) => p.partners.length > 0).length;
  return [
    { id: 'topics', label: 'Topics', value: r.topics, sub: atRisk ? `${atRisk} at risk` : 'none at risk', tone: atRisk ? 'danger' : undefined },
    // With no topics there are no gaps to cover; "100%" would read as full coverage
    { id: 'coverage', label: 'Gap coverage', value: r.topics ? percent(r.coverage) : '—', sub: r.topics ? plural(r.openGaps, 'open gap') : 'no topics yet' },
    { id: 'papers', label: 'Papers', value: papers.length, sub: papers.length ? `${joint} with partner labs` : 'none in the period' },
    { id: 'people', label: 'People', value: people.length, sub: `${r.fte} FTE allocated` },
    {
      id: 'budget',
      label: 'Budget',
      value: money(r.budget.allocated),
      sub: r.budget.allocated ? `${percent(r.budget.spent / r.budget.allocated)} spent` : 'none allocated',
    },
  ];
}

/** The center's topics as priority-list rows, with papers last month and this month. */
export function centerTopicItems({ topics }: CenterData): PriorityItem[] {
  return topics.map((t) => ({ ...topicPriorityItem(t), figures: { lastMonth: t.recentPapers.lastMonth, thisMonth: t.recentPapers.thisMonth } }));
}

/** The center's papers in the period, newest first, each with its topic, partners and period readership. */
export function centerPaperResults({ papers }: CenterData): SearchResult[] {
  return [...papers]
    .sort((a, b) => b.published.localeCompare(a.published))
    .map((p) => ({
      id: p.id,
      title: p.title,
      source: p.venue,
      kind: p.topic.name,
      href: `/papers/${p.id}`,
      date: localDate(p.published),
      meta: [
        ...(p.partners.length ? [`with ${p.partners.join(', ')}`] : []),
        ...(p.periodTotals ? [`${compactNumber(p.periodTotals.views)} views`, `${p.periodTotals.citations} citations`] : []),
      ],
    }));
}

/** The center's papers in the period, done alone vs. with partner labs. */
export function centerCollaboration({ papers }: CenterData): CollaborationCountsDto {
  const joint = papers.filter((p) => p.partners.length > 0).length;
  return { unilateral: papers.length - joint, joint };
}
