import type { BreakdownDimension, BreakdownMeasure, BreakdownRecord } from '@adamstavely/trenchcoat/breakdown-chart';
import type { OpsTile } from '@adamstavely/trenchcoat/ops-overview';
import type { SearchResult } from '@adamstavely/trenchcoat/results-list';
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

/** Every lab's joint papers, lab by lab, each saying who started it. */
export function partnerPapers(p: PartnerLabsDto): SearchResult[] {
  return p.labs.flatMap((lab) =>
    lab.papers.map((paper) => ({
      // A paper with two partners shows under each, so its id here is per lab.
      id: `${lab.name}|${paper.id}`,
      title: paper.title,
      // The lab shows as the result's tag.
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
