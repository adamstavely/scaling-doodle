import type { ExposureGap } from '@adamstavely/trenchcoat/gap-exposure';
import type { GapListItemDto } from '../api/generated/models/gap-list-item-dto';
import { PRIORITY_TIERS } from './format';

/** A gap → a tc-gap-exposure row: its topic and tier, the work on it, its owner and what's invested. */
export function exposureGap(g: GapListItemDto): ExposureGap {
  return {
    id: g.id,
    text: g.text,
    severity: g.severity,
    item: g.topic.name,
    priority: g.topic.bin,
    work: g.activeWork,
    owner: g.owner?.name,
    // tc-gap-exposure takes money in `currency`; the API counts in $M.
    budget: g.invested.budget ? g.invested.budget * 1_000_000 : undefined,
    fte: g.invested.fte || undefined,
  };
}

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The gap review as CSV: one row per gap, most severe first as given. */
export function gapReviewCsv(gaps: GapListItemDto[]): string {
  const head = ['Severity', 'Gap', 'Topic', 'Priority', 'Status', 'Owner', 'Active work', 'Invested ($M)', 'Invested (FTE)'];
  const rows = gaps.map((g) => [
    g.severity,
    g.text,
    g.topic.name,
    PRIORITY_TIERS[g.topic.bin] ?? `P${g.topic.bin}`,
    g.status,
    g.owner?.name ?? '',
    g.activeWork,
    g.invested.budget,
    g.invested.fte,
  ]);
  return [head, ...rows].map((r) => r.map(cell).join(',')).join('\n') + '\n';
}
