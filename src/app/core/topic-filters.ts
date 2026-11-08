import type { Facet, FacetValues } from '@adamstavely/trenchcoat/facet-sidebar';
import type { OrgCenterDto } from '../api/generated/models/org-center-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { PRIORITY_TIERS, PRIORITY_TYPES } from './format';

/** The Research Topics filters: the search box's text and the picked options, by facet. */
export interface TopicFilters {
  q: string;
  priority: string[];
  type: string[];
  region: string[];
  subject: string[];
}

export type TopicFacetId = Exclude<keyof TopicFilters, 'q'>;
export const TOPIC_FACETS: readonly TopicFacetId[] = ['priority', 'type', 'region', 'subject'];

export const NO_FILTERS: TopicFilters = { q: '', priority: [], type: [], region: [], subject: [] };

/** A topic whose team sits under no center */
const NO_CENTER = 'none';

/** The value a facet reads off a topic: one for priority, type and region, any number of subjects. */
function facetValues(t: TopicSummaryDto, facet: TopicFacetId): string[] {
  switch (facet) {
    case 'priority':
      return [String(t.bin)];
    case 'type':
      return [t.priorityType];
    case 'region':
      return [t.centerId ?? NO_CENTER];
    case 'subject':
      return t.tags;
  }
}

/** Every word of the search somewhere in the topic's name, summary, lead, subjects or sponsors. */
function matchesQuery(t: TopicSummaryDto, q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = [t.name, t.summary, t.lead?.name ?? '', ...t.tags, ...t.sponsors].join(' ').toLowerCase();
  return words.every((w) => text.includes(w));
}

/** Matches the search and every facet in use, leaving out `skip` – a facet's counts ignore its own picks. */
function matches(t: TopicSummaryDto, f: TopicFilters, skip?: TopicFacetId): boolean {
  return (
    matchesQuery(t, f.q) &&
    TOPIC_FACETS.every((id) => id === skip || !f[id].length || facetValues(t, id).some((v) => f[id].includes(v)))
  );
}

/** The topics the filters leave, in the order given. Within a facet any picked option matches; across facets, all. */
export function filterTopics(topics: TopicSummaryDto[], f: TopicFilters): TopicSummaryDto[] {
  return topics.filter((t) => matches(t, f));
}

/**
 * The facets for tc-facet-sidebar, each option counting the topics it would leave with the other filters as they are.
 * Every center is a region, those with no topics in view counted 0; subjects are the ones the topics carry, A–Z.
 */
export function topicFacets(topics: TopicSummaryDto[], centers: OrgCenterDto[], f: TopicFilters): Facet[] {
  const count = (facet: TopicFacetId, value: string) =>
    topics.filter((t) => matches(t, f, facet) && facetValues(t, facet).includes(value)).length;
  const options = (facet: TopicFacetId, values: [string, string][]) =>
    values.map(([value, label]) => ({ value, label, count: count(facet, value) }));

  const regions: [string, string][] = centers.map((c) => [c.id, c.name]);
  if (topics.some((t) => !t.centerId)) regions.push([NO_CENTER, 'No center']);
  const subjects = [...new Set(topics.flatMap((t) => t.tags))].sort((a, b) => a.localeCompare(b));

  return [
    { id: 'priority', label: 'Priority', type: 'checkbox', options: options('priority', Object.entries(PRIORITY_TIERS)) },
    { id: 'type', label: 'Priority type', type: 'checkbox', options: options('type', Object.entries(PRIORITY_TYPES)) },
    { id: 'region', label: 'Region', type: 'checkbox', options: options('region', regions) },
    { id: 'subject', label: 'Subject', type: 'checkbox', options: options('subject', subjects.map((s) => [s, s])) },
  ];
}

/** The filters as tc-facet-sidebar's value: only the facets in use. */
export function facetValue(f: TopicFilters): FacetValues {
  return Object.fromEntries(TOPIC_FACETS.filter((id) => f[id].length).map((id) => [id, f[id]]));
}

/** The filters as query params – comma-separated picks, null for a facet not in use, so the URL drops it. */
export function filterParams(f: TopicFilters): Record<keyof TopicFilters, string | null> {
  const list = (v: string[]) => (v.length ? v.join(',') : null);
  return { q: f.q || null, priority: list(f.priority), type: list(f.type), region: list(f.region), subject: list(f.subject) };
}

/** Query params back into filters. */
export function parseFilters(params: Partial<Record<keyof TopicFilters, string | undefined>>): TopicFilters {
  const list = (v?: string) => (v ? v.split(',').filter(Boolean) : []);
  return {
    q: params.q ?? '',
    priority: list(params.priority),
    type: list(params.type),
    region: list(params.region),
    subject: list(params.subject),
  };
}
