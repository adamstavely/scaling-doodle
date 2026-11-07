import type { CoverageCell, CoverageCheck, CoverageMap, CoveragePart, CoverageStatus } from '@adamstavely/trenchcoat/coverage-matrix';
import type { OrgCenterDto } from '../api/generated/models/org-center-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { PRIORITY_TIERS } from './format';

/** Health on the matrix's scale: on track fills a cell, watch half-fills it, at risk leaves it a gap. */
const STATUS: Record<TopicSummaryDto['health'], CoverageStatus> = { healthy: 'covered', watch: 'partial', 'at-risk': 'gap' };
const HEALTH_LABEL: Record<TopicSummaryDto['health'], string> = { healthy: 'on track', watch: 'watch', 'at-risk': 'at risk' };
/** Worst first, so a cell takes the health of its weakest topic. */
const SEVERITY: TopicSummaryDto['health'][] = ['at-risk', 'watch', 'healthy'];

export const CENTER_PRIORITY_LABELS: Partial<Record<CoverageStatus, string>> = {
  covered: 'On track',
  partial: 'Watch',
  gap: 'At risk',
  none: 'No topics',
};

export interface CenterPriorities {
  checks: CoverageCheck[];
  parts: CoveragePart[];
  coverage: CoverageMap;
}

/**
 * Each center against each priority tier: a cell shows how the center's topics in that tier are doing, as the
 * weakest of them, and its detail lists them all. Tiers no center has a topic in are left out.
 */
export function centerPriorities(centers: OrgCenterDto[], topics: TopicSummaryDto[]): CenterPriorities {
  const tiers = Object.keys(PRIORITY_TIERS)
    .map(Number)
    .filter((bin) => topics.some((t) => t.bin === bin));
  const coverage: CoverageMap = {};
  for (const c of centers) {
    coverage[c.id] = {};
    for (const bin of tiers) {
      const cell = tierCell(topics.filter((t) => t.centerId === c.id && t.bin === bin));
      if (cell) coverage[c.id][String(bin)] = cell;
    }
  }
  return {
    checks: centers.map((c) => ({ id: c.id, label: c.code ?? c.name, description: c.code ? c.name : undefined })),
    parts: tiers.map((bin) => ({ id: String(bin), label: PRIORITY_TIERS[bin] })),
    coverage,
  };
}

function tierCell(topics: TopicSummaryDto[]): CoverageCell | undefined {
  if (!topics.length) return undefined;
  const worst = SEVERITY.find((h) => topics.some((t) => t.health === h))!;
  const sorted = [...topics].sort((a, b) => a.healthScore - b.healthScore);
  const counts = SEVERITY.map((h) => [h, topics.filter((t) => t.health === h).length] as const)
    .filter(([, n]) => n)
    .map(([h, n]) => `${n} ${HEALTH_LABEL[h]}`)
    .join(', ');
  return {
    status: STATUS[worst],
    detail: `${topics.length} ${topics.length === 1 ? 'topic' : 'topics'}: ${counts}.`,
    evidence: sorted.map((t) => `${t.name} (${HEALTH_LABEL[t.health]}, ${t.healthScore})`).join(' · '),
  };
}
