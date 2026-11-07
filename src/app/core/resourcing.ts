import type { BurnItem } from '@adamstavely/trenchcoat/budget-burn';
import type { CapacityPerson } from '@adamstavely/trenchcoat/capacity-bars';
import type { InvestmentTier } from '@adamstavely/trenchcoat/investment-balance';
import type { OpsTile } from '@adamstavely/trenchcoat/ops-overview';
import type { PersonSummaryDto } from '../api/generated/models/person-summary-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { percent, PRIORITY_TIERS } from './format';

const M = 1_000_000;
const round1 = (n: number) => Math.round(n * 10) / 10;
const money = (m: number) => `$${round1(m)}M`;

/** Budget, spend, people and the staffing plan across the topics in view. */
export function resourcingTiles(topics: TopicSummaryDto[], people: PersonSummaryDto[]): OpsTile[] {
  const allocated = topics.reduce((s, t) => s + t.budget.allocated, 0);
  const spent = topics.reduce((s, t) => s + t.budget.spent, 0);
  const fte = round1(topics.reduce((s, t) => s + t.stats.fte, 0));
  const planned = round1(topics.reduce((s, t) => s + (t.plannedFte ?? 0), 0));
  const researchers = people.filter((p) => p.allocations.length).length;
  return [
    { id: 'budget', label: 'Budget allocated', value: money(allocated), sub: topics[0]?.budget.fy ? `${topics[0].budget.fy} commitments` : 'this fiscal year' },
    { id: 'spent', label: 'Spent to date', value: money(spent), sub: allocated ? `${percent(spent / allocated)} of budget` : 'no budget' },
    { id: 'people', label: 'People', value: `${fte} FTE`, sub: `${researchers} allocated researchers` },
    {
      id: 'plan',
      label: 'Staffing plan',
      value: `${planned} FTE`,
      sub: planned ? `${percent(fte / planned)} staffed` : 'nothing planned',
      tone: planned && fte < planned * 0.8 ? 'warning' : undefined,
    },
  ];
}

/** Each priority tier's topics, budget and people, for tc-investment-balance. */
export function investmentTiers(topics: TopicSummaryDto[]): InvestmentTier[] {
  return [1, 2, 3, 4].map((bin) => {
    const own = topics.filter((t) => t.bin === bin);
    return {
      id: `p${bin}`,
      label: PRIORITY_TIERS[bin].split(' · ')[1] ?? PRIORITY_TIERS[bin],
      badge: `P${bin}`,
      items: own.length,
      budget: own.reduce((s, t) => s + t.budget.allocated, 0) * M,
      people: round1(own.reduce((s, t) => s + t.stats.fte, 0)),
    };
  });
}

/** Each topic's spend against its budget, top priority first, for tc-budget-burn. */
export function burnItems(topics: TopicSummaryDto[]): BurnItem[] {
  return [...topics]
    .sort((a, b) => a.bin - b.bin || b.budget.allocated - a.budget.allocated)
    .map((t) => ({
      id: t.id,
      label: t.name,
      owner: t.lead?.name,
      budget: t.budget.allocated * M,
      spent: t.budget.spent * M,
      people: t.stats.fte,
      priority: `P${t.bin}`,
    }));
}

/**
 * How far through a US federal fiscal year (Oct 1 – Sep 30) `today` is, from 0 to 1: the budgets' own year (`FY26`)
 * when given – a past year is 1, a future one 0 – else the year `today` falls in.
 */
export function fiscalYearProgress(today: string, fy?: string): number {
  const [y, m, d] = today.split('-').map(Number);
  const named = /^FY(\d{2})$/i.exec(fy ?? '');
  const startYear = named ? 2000 + Number(named[1]) - 1 : m >= 10 ? y : y - 1;
  const start = Date.UTC(startYear, 9, 1);
  const end = Date.UTC(startYear + 1, 9, 1);
  return Math.min(1, Math.max(0, (Date.UTC(y, m - 1, d) - start) / (end - start)));
}

/** People with allocations → tc-capacity-bars, naming each topic. */
export function capacityPeople(people: PersonSummaryDto[], topicNames: Map<string, string>): CapacityPerson[] {
  return people
    .filter((p) => p.allocations.length)
    .map((p) => ({
      id: p.id,
      name: p.name,
      role: p.title,
      capacity: p.capacity,
      allocations: p.allocations.map((a) => ({ id: a.topicId, label: topicNames.get(a.topicId) ?? a.topicId, amount: a.fte })),
    }));
}
