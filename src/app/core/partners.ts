import type { OpsTile } from '@adamstavely/trenchcoat/ops-overview';
import type { OrgHealthCounts, OrgStat, OrgTeam } from '@adamstavely/trenchcoat/org-unit-card';
import type { SearchResult } from '@adamstavely/trenchcoat/results-list';
import type { PartnerLabDto } from '../api/generated/models/partner-lab-dto';
import type { PartnerLabsDto } from '../api/generated/models/partner-labs-dto';
import type { PartnerPaperDto } from '../api/generated/models/partner-paper-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { compactNumber, localDate, percent, priorityHealth, PRIORITY_TIERS } from './format';

/** Who started a joint paper, from one lab's side, as the page words it. */
export const STARTED_BY: Record<PartnerPaperDto['initiatedBy'], string> = {
  us: 'We started',
  partner: 'They started',
  'other-partner': 'Another partner started',
};

/** The row above the labs: labs, joint papers, and who started them, across the caller's scope. */
export function partnerTiles(p: PartnerLabsDto): OpsTile[] {
  const share = (n: number) => (p.joint ? `${percent(n / p.joint)} of joint papers` : 'no joint papers');
  return [
    { id: 'labs', label: 'Partner labs', value: String(p.labs.length), sub: 'published with' },
    { id: 'joint', label: 'Joint papers', value: String(p.joint), sub: p.papers ? `${percent(p.joint / p.papers)} of ${p.papers} papers` : 'no papers' },
    { id: 'us', label: 'We started', value: String(p.initiatedByUs), sub: share(p.initiatedByUs) },
    { id: 'them', label: 'Partners started', value: String(p.initiatedByPartners), sub: share(p.initiatedByPartners) },
  ];
}

/**
 * A lab's address on the site, from its name – labs have no id of their own: "Sandia National Laboratories" →
 * "sandia-national-laboratories".
 */
export function labSlug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** The lab with that address, if it's in the caller's view. */
export function findLab(p: PartnerLabsDto, slug: string): PartnerLabDto | undefined {
  return p.labs.find((l) => labSlug(l.name) === slug);
}

/** One lab's joint papers, and who started them, citations and views. */
export function labTiles(l: PartnerLabDto): OpsTile[] {
  const share = (n: number) => (l.joint ? `${percent(n / l.joint)} of joint papers` : 'no joint papers');
  return [
    { id: 'joint', label: 'Joint papers', value: String(l.joint), sub: `latest ${shortDate(l.lastPublished)}` },
    { id: 'us', label: 'We started', value: String(l.initiatedByUs), sub: share(l.initiatedByUs) },
    { id: 'them', label: 'They started', value: String(l.initiatedByThem), sub: share(l.initiatedByThem) },
    { id: 'citations', label: 'Citations', value: compactNumber(l.citations), sub: `${compactNumber(l.views)} views` },
    { id: 'topics', label: 'Topics', value: String(l.topics.length), sub: 'the joint papers are in' },
  ];
}

/** Who started one lab's joint papers, for tc-segmented-bar; a third partner's share only when there is one. */
export function labStartedSplit(l: PartnerLabDto): { label: string; value: number }[] {
  return [
    { label: STARTED_BY.us, value: l.initiatedByUs },
    { label: STARTED_BY.partner, value: l.initiatedByThem },
    ...(l.initiatedByOthers ? [{ label: STARTED_BY['other-partner'], value: l.initiatedByOthers }] : []),
  ];
}

/** "1 Nov 2025", in the viewer's locale. */
const shortDate = (iso: string) => new Date(localDate(iso)).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** One lab's joint papers, newest first, each tagged with its topic as a center's papers are, and who started it. */
export function labPapers(l: PartnerLabDto): SearchResult[] {
  return l.papers.map((paper) => ({
    id: paper.id,
    title: paper.title,
    kind: paper.topic.name,
    source: paper.venue,
    href: `/papers/${paper.id}`,
    date: localDate(paper.published),
    meta: [
      paper.initiatedBy === 'other-partner' ? `${paper.initiator} started` : STARTED_BY[paper.initiatedBy],
      ...(paper.otherPartners.length ? [`with ${paper.otherPartners.join(', ')}`] : []),
      `${paper.citations} citations`,
      `${compactNumber(paper.views)} views`,
    ],
  }));
}

/** A topic's health as a card counts it. */
function healthCounts(topics: TopicSummaryDto[]): OrgHealthCounts {
  const count = (h: TopicSummaryDto['health']) => topics.filter((t) => t.health === h).length;
  return { 'on-track': count('healthy'), watch: count('watch'), 'at-risk': count('at-risk') };
}

/**
 * The share of open gaps with work against them across topics: each topic's coverage weighted by its open gaps, so
 * one covered gap beside 99 uncovered ones is 1%, not the 50% an average of the topics' percentages would say. With no
 * open gaps, everything is covered.
 */
export function gapCoverage(topics: TopicSummaryDto[]): number {
  const open = topics.reduce((s, t) => s + t.stats.openGaps, 0);
  return open ? topics.reduce((s, t) => s + t.stats.coverage * t.stats.openGaps, 0) / open : 1;
}

/** Our team, as a lab's card lists it: its name and lead, from the org tree. */
export type TeamRef = { name: string; lead?: { name: string } | null };

/**
 * One lab → tc-org-unit-card's properties, as Centers & Teams draws a center: its joint research in the stats, the
 * health of the topics the joint papers are in, and our teams that wrote them, each with those topics and how many
 * joint papers it has with the lab.
 */
export function labCard(l: PartnerLabDto, topics: TopicSummaryDto[], teams: Map<string, TeamRef>) {
  const ids = new Set(l.topics.map((t) => t.id));
  const own = topics.filter((t) => ids.has(t.id));
  const share = (n: number): Partial<OrgStat> => (l.joint ? { sub: `${percent(n / l.joint)} of joint papers`, meter: n / l.joint } : {});
  const stats: OrgStat[] = [
    { id: 'joint', label: 'Joint papers', value: String(l.joint), sub: `latest ${shortDate(l.lastPublished)}` },
    { id: 'us', label: 'We started', value: String(l.initiatedByUs), ...share(l.initiatedByUs) },
    { id: 'them', label: 'They started', value: String(l.initiatedByThem), ...share(l.initiatedByThem) },
    ...(l.initiatedByOthers ? [{ id: 'others', label: 'Another partner started', value: String(l.initiatedByOthers), ...share(l.initiatedByOthers) }] : []),
    { id: 'citations', label: 'Citations', value: compactNumber(l.citations), sub: `${compactNumber(l.views)} views` },
    { id: 'topics', label: 'Topics', value: String(l.topics.length) },
  ];

  const byTeam = new Map<string, TopicSummaryDto[]>();
  for (const t of own) byTeam.set(t.teamId, [...(byTeam.get(t.teamId) ?? []), t]);
  const papersIn = (teamTopics: TopicSummaryDto[]) => l.papers.filter((p) => teamTopics.some((t) => t.id === p.topic.id)).length;
  const rows: OrgTeam[] = [...byTeam].map(([id, teamTopics]) => {
    const team = teams.get(id);
    return {
      id,
      name: team?.name ?? 'Team',
      lead: team?.lead ? { name: team.lead.name } : undefined,
      health: healthCounts(teamTopics),
      coverage: gapCoverage(teamTopics),
      gaps: teamTopics.reduce((s, t) => s + t.stats.openGaps, 0),
      fte: Math.round(teamTopics.reduce((s, t) => s + t.stats.fte, 0) * 10) / 10,
      figures: [{ id: 'joint', value: String(papersIn(teamTopics)), label: 'joint papers' }],
      items: teamTopics.map((t) => ({
        id: t.id,
        label: t.name,
        priority: t.bin,
        tag: PRIORITY_TIERS[t.bin],
        coverage: t.stats.coverage,
        open: t.stats.openGaps,
        // Health points on a 0–100 scale, as a fraction (see the dashboard).
        momentum: t.momentum / 100,
        health: priorityHealth(t.health),
      })),
    };
  });

  return {
    id: labSlug(l.name),
    heading: l.name,
    description: `Our joint research since ${shortDate(l.papers.at(-1)?.published ?? l.lastPublished)}`,
    stats,
    health: healthCounts(own),
    teams: rows,
    actions: [{ id: 'open', label: 'Open lab' }],
  };
}
