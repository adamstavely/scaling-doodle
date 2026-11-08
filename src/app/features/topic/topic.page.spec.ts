import { topicCapacity } from './topic.page';

describe('topicCapacity', () => {
  const person = { id: 'ec', name: 'Elena Castellanos' };

  it('uses the person’s own capacity, so a half-time person at 0.6 is over', () => {
    const row = topicCapacity('t-neuro', 'Neuromorphic Computing', person, 0.6, { capacity: 0.5, allocations: [{ topicId: 't-neuro', fte: 0.6 }] });
    expect(row.capacity).toBe(0.5);
    const total = row.allocations.reduce((s, a) => s + a.amount, 0);
    expect(total).toBeGreaterThan(row.capacity ?? 1);
  });

  it('adds what they give other topics, apart from this one', () => {
    const row = topicCapacity('t-neuro', 'Neuromorphic Computing', person, 0.4, {
      capacity: 1,
      allocations: [
        { topicId: 't-neuro', fte: 0.4 },
        { topicId: 't-advml', fte: 0.5 },
        { topicId: 't-swarm', fte: 0.3 },
      ],
    });
    expect(row.allocations).toEqual([
      { id: 't-neuro', label: 'Neuromorphic Computing', amount: 0.4 },
      { id: 'elsewhere', label: 'Other topics', amount: 0.8 },
    ]);
  });

  it('falls back to full time when the person isn’t in view', () => {
    expect(topicCapacity('t-neuro', 'Neuromorphic Computing', person, 0.4, undefined)).toEqual({
      id: 'ec',
      name: 'Elena Castellanos',
      capacity: 1,
      allocations: [{ id: 't-neuro', label: 'Neuromorphic Computing', amount: 0.4 }],
    });
  });
});
