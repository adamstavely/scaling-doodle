import type { OrgCenterDto } from '../api/generated/models/org-center-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { facetValue, filterParams, filterTopics, NO_FILTERS, parseFilters, topicFacets } from './topic-filters';

const topic = (id: string, name: string, bin: number, priorityType: string, centerId: string | null, tags: string[], extra: object = {}) =>
  ({ id, name, bin, priorityType, centerId, tags, summary: '', sponsors: [], lead: null, ...extra }) as unknown as TopicSummaryDto;
const center = (id: string, name: string) => ({ id, name }) as unknown as OrgCenterDto;

describe('topic filters', () => {
  const topics = [
    topic('t-quantum', 'Quantum Sensing', 2, 'national', 'c-cci', ['sensing', 'quantum'], { sponsors: ['IARPA'] }),
    topic('t-climate', 'Climate Resilience Modeling', 2, 'national', 'c-nemc', ['climate', 'modeling'], { lead: { name: 'Arjun Mehta' } }),
    topic('t-carbon', 'Carbon-Negative Materials', 1, 'external', 'c-nemc', ['materials', 'climate']),
    topic('t-edge', 'Edge AI for Sensing', 4, 'internal', null, ['sensing']),
  ];
  const centers = [center('c-cci', 'Center for Cyber Intelligence'), center('c-nemc', 'Near East Mission Center'), center('c-afmc', 'Africa Mission Center')];
  const ids = (f: Partial<typeof NO_FILTERS>) => filterTopics(topics, { ...NO_FILTERS, ...f }).map((t) => t.id);

  it('searches names, summaries, leads, subjects and sponsors, every word', () => {
    expect(ids({ q: 'sensing' })).toEqual(['t-quantum', 't-edge']);
    expect(ids({ q: 'arjun' })).toEqual(['t-climate']);
    expect(ids({ q: 'iarpa' })).toEqual(['t-quantum']);
    expect(ids({ q: 'climate materials' })).toEqual(['t-carbon']);
    expect(ids({ q: '  ' })).toHaveLength(4);
  });

  it('matches any pick within a facet and every facet in use', () => {
    expect(ids({ priority: ['1', '4'] })).toEqual(['t-carbon', 't-edge']);
    expect(ids({ type: ['national'], region: ['c-nemc'] })).toEqual(['t-climate']);
    expect(ids({ region: ['none'] })).toEqual(['t-edge']);
    expect(ids({ subject: ['climate'], q: 'carbon' })).toEqual(['t-carbon']);
  });

  it('counts what each option would leave, ignoring its own facet’s picks', () => {
    const facets = topicFacets(topics, centers, { ...NO_FILTERS, type: ['national'] });
    const opts = (id: string) => facets.find((f) => f.id === id)!.options!.map((o) => `${o.label}:${o.count}`);
    expect(opts('priority')).toEqual(['P1 · Flagship:0', 'P2 · Core:2', 'P3 · Core:0', 'P4 · Emerging:0']);
    // Type's own counts don't narrow by the type picked
    expect(opts('type')).toEqual(['Internal:1', 'National:2', 'External:1']);
    expect(opts('region')).toEqual(['Center for Cyber Intelligence:1', 'Near East Mission Center:1', 'Africa Mission Center:0', 'No center:0']);
    expect(opts('subject')).toEqual(['climate:1', 'materials:0', 'modeling:1', 'quantum:1', 'sensing:1']);
  });

  it('round-trips through the URL, dropping what is not in use', () => {
    const f = { ...NO_FILTERS, q: 'quantum', priority: ['1', '2'], region: ['c-nemc'] };
    expect(filterParams(f)).toEqual({ q: 'quantum', priority: '1,2', type: null, region: 'c-nemc', subject: null });
    expect(parseFilters({ q: 'quantum', priority: '1,2', region: 'c-nemc' })).toEqual(f);
    expect(facetValue(f)).toEqual({ priority: ['1', '2'], region: ['c-nemc'] });
  });
});
