import type { PersonSummaryDto } from '../api/generated/models/person-summary-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { burnItems, capacityPeople, fiscalYearProgress, investmentTiers, resourcingTiles } from './resourcing';

const topic = (id: string, bin: number, allocated: number, spent: number, fte: number, plannedFte: number) =>
  ({ id, name: id.toUpperCase(), bin, budget: { allocated, spent, fy: 'FY26' }, stats: { fte }, plannedFte, lead: { name: 'Lead' } }) as unknown as TopicSummaryDto;
const topics = [topic('a', 1, 4, 2, 2, 2.5), topic('b', 2, 1, 0.5, 1, 1.5), topic('c', 1, 2, 1, 0.5, 0)];
const people = [
  { id: 'x', name: 'X', title: 'PI', capacity: 1, allocations: [{ topicId: 'a', fte: 0.6 }] },
  { id: 'y', name: 'Y', title: 'Staff', capacity: 1, allocations: [] },
] as unknown as PersonSummaryDto[];

describe('resourcing', () => {
  it('totals budget, spend, people and the staffing plan', () => {
    expect(resourcingTiles(topics, people).map((t) => [t.id, t.value, t.sub])).toEqual([
      ['budget', '$7M', 'FY26 commitments'],
      ['spent', '$3.5M', '50% of budget'],
      ['people', '3.5 FTE', '1 allocated researchers'],
      ['plan', '4 FTE', '88% staffed'],
    ]);
  });

  it('splits topics, dollars and people by priority tier', () => {
    expect(investmentTiers(topics).slice(0, 2)).toEqual([
      { id: 'p1', label: 'Flagship', badge: 'P1', items: 2, budget: 6_000_000, people: 2.5 },
      { id: 'p2', label: 'Core', badge: 'P2', items: 1, budget: 1_000_000, people: 1 },
    ]);
  });

  it('lists burn top priority first, then biggest budget', () => {
    expect(burnItems(topics).map((b) => b.id)).toEqual(['a', 'c', 'b']);
    expect(burnItems(topics)[0]).toMatchObject({ budget: 4_000_000, spent: 2_000_000, people: 2, priority: 'P1' });
  });

  it('measures progress through the fiscal year', () => {
    expect(fiscalYearProgress('2026-10-01')).toBe(0);
    expect(fiscalYearProgress('2027-04-01')).toBeCloseTo(0.5, 1);
    // Against the budgets' own year: FY26 is over by November 2026, FY28 hasn't started.
    expect(fiscalYearProgress('2026-11-07', 'FY26')).toBe(1);
    expect(fiscalYearProgress('2026-11-07', 'FY28')).toBe(0);
  });

  it('draws only people with allocations', () => {
    expect(capacityPeople(people, new Map([['a', 'Alpha']]))).toEqual([
      { id: 'x', name: 'X', role: 'PI', capacity: 1, allocations: [{ id: 'a', label: 'Alpha', amount: 0.6 }] },
    ]);
  });
});
