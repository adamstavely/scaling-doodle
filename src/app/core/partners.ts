import type { BreakdownDimension, BreakdownMeasure, BreakdownRecord } from '@adamstavely/trenchcoat/breakdown-chart';
import type { DataColumn, DataRow } from '@adamstavely/trenchcoat/data-table';
import type { OpsTile } from '@adamstavely/trenchcoat/ops-overview';
import type { SearchResult } from '@adamstavely/trenchcoat/results-list';
import type { PartnerLabDto } from '../api/generated/models/partner-lab-dto';
import type { PartnerLabsDto } from '../api/generated/models/partner-labs-dto';
import type { PartnerPaperDto } from '../api/generated/models/partner-paper-dto';
import { compactNumber, localDate, percent } from './format';

/** Who started a joint paper, from one lab's side, as the page words it. */
export const STARTED_BY: Record<PartnerPaperDto['initiatedBy'], string> = {
  us: 'We started',
  partner: 'They started',
  'other-partner': 'Another partner started',
};

/** Ours in the first chart colour (blue), theirs in the sixth (amber) for contrast in both looks, a third lab's neutral. */
const STARTED_COLORS: Record<string, string> = {
  [STARTED_BY.us]: 'var(--tc-chart-1)',
  [STARTED_BY.partner]: 'var(--tc-chart-6)',
  [STARTED_BY['other-partner']]: 'var(--tc-chart-neutral)',
};

/** Labs, joint papers, and who started them, across the caller's scope. */
export function partnerTiles(p: PartnerLabsDto): OpsTile[] {
  const share = (n: number) => (p.joint ? `${percent(n / p.joint)} of joint papers` : 'no joint papers');
  return [
    { id: 'labs', label: 'Partner labs', value: String(p.labs.length), sub: 'published with' },
    { id: 'joint', label: 'Joint papers', value: String(p.joint), sub: p.papers ? `${percent(p.joint / p.papers)} of ${p.papers} papers` : 'no papers' },
    { id: 'us', label: 'We started', value: String(p.initiatedByUs), sub: share(p.initiatedByUs) },
    { id: 'them', label: 'Partners started', value: String(p.initiatedByPartners), sub: share(p.initiatedByPartners) },
  ];
}

/** The overall split of joint papers by who started them, for tc-segmented-bar. */
export function startedSplit(p: PartnerLabsDto): { label: string; value: number }[] {
  return [
    { label: 'We started', value: p.initiatedByUs },
    { label: 'Partners started', value: p.initiatedByPartners },
  ];
}

/**
 * One record per lab per joint paper, for tc-breakdown-chart: bars per lab (or topic), split by who started the work,
 * counting papers or summing their citations. A paper with two partners counts once under each lab.
 */
export function partnerBreakdown(p: PartnerLabsDto): {
  records: BreakdownRecord[];
  dimensions: BreakdownDimension[];
  measures: BreakdownMeasure[];
} {
  const records = p.labs.flatMap((lab) =>
    lab.papers.map((paper) => ({ lab: lab.name, started: STARTED_BY[paper.initiatedBy], topic: paper.topic.name, citations: paper.citations })),
  );
  const topics = [...new Set(records.map((r) => r.topic))].sort();
  return {
    records,
    dimensions: [
      { key: 'lab', label: 'Lab', values: p.labs.map((l) => l.name) },
      { key: 'started', label: 'Started by', values: Object.values(STARTED_BY), colors: STARTED_COLORS },
      { key: 'topic', label: 'Topic', values: topics },
    ],
    measures: [
      { key: 'papers', label: 'Joint papers', unit: 'papers' },
      { key: 'citations', label: 'Citations', unit: 'citations', field: 'citations' },
    ],
  };
}

/** Every lab's joint papers, grouped under the lab, each saying who started it. */
export function partnerPapers(p: PartnerLabsDto): SearchResult[] {
  return p.labs.flatMap((lab) =>
    lab.papers.map((paper) => ({
      // A paper with two partners shows under each, so its id here is per lab.
      id: `${lab.name}|${paper.id}`,
      title: paper.title,
      // The list groups by kind, so this puts each paper under its lab.
      kind: lab.name,
      source: paper.venue,
      href: `/papers/${paper.id}`,
      date: localDate(paper.published),
      meta: [
        paper.initiatedBy === 'other-partner' ? `${paper.initiator} started` : STARTED_BY[paper.initiatedBy],
        paper.topic.name,
        ...(paper.otherPartners.length ? [`with ${paper.otherPartners.join(', ')}`] : []),
        `${paper.citations} citations`,
        `${compactNumber(paper.views)} views`,
      ],
    })),
  );
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

/** The Labs table: a row per lab, most joint papers first as the API gives them; the name links to the lab's page. */
export const LAB_COLUMNS: DataColumn[] = [
  { key: 'name', label: 'Lab', type: 'text', width: '280px' },
  { key: 'joint', label: 'Joint papers', type: 'number' },
  { key: 'us', label: 'We started', type: 'number' },
  { key: 'them', label: 'They started', type: 'number' },
  { key: 'citations', label: 'Citations', type: 'number' },
  { key: 'topics', label: 'Topics', type: 'number' },
  // YYYY-MM-DD, so sorting the column sorts by date
  { key: 'last', label: 'Latest joint paper', type: 'text' },
];

export function labRows(p: PartnerLabsDto): DataRow[] {
  return p.labs.map((l) => ({
    id: labSlug(l.name),
    name: l.name,
    joint: l.joint,
    us: l.initiatedByUs,
    them: l.initiatedByThem,
    citations: l.citations,
    topics: l.topics.length,
    last: l.lastPublished,
  }));
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
