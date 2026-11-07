import type { CollaborationCountsDto } from '../api/generated/models/collaboration-counts-dto';
import { percent } from './format';

export type CollaborationPart = { label: 'Unilateral' | 'Joint'; value: number };

/** Unilateral vs. joint papers → tc-segmented-bar's data, always in that order. */
export function collaborationParts(c: CollaborationCountsDto | undefined): CollaborationPart[] {
  return [
    { label: 'Unilateral', value: c?.unilateral ?? 0 },
    { label: 'Joint', value: c?.joint ?? 0 },
  ];
}

/** Joint papers as a share of everything published; null with nothing published. */
export function jointShare(c: CollaborationCountsDto | undefined): number | null {
  const total = (c?.unilateral ?? 0) + (c?.joint ?? 0);
  return total ? (c?.joint ?? 0) / total : null;
}

/** A paper's collaboration, as a short tag for lists: "Unilateral", "Joint with NREL, Scripps". */
export function collaborationLabel(partners: readonly string[] | undefined): string {
  return partners?.length ? `Joint with ${partners.join(', ')}` : 'Unilateral';
}

/** The headline line for a set of papers: "1 of 2 joint (50%)". */
export function collaborationSummary(c: CollaborationCountsDto | undefined): string {
  const share = jointShare(c);
  if (share === null) return 'No papers yet';
  return `${c!.joint} of ${c!.unilateral + c!.joint} joint (${percent(share)})`;
}
