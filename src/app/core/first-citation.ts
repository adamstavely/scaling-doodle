import type { OpsTile } from '@adamstavely/trenchcoat/ops-overview';
import type { FirstCitationDto } from '../api/generated/models/first-citation-dto';
import type { FirstCitationSummaryDto } from '../api/generated/models/first-citation-summary-dto';

/** A lag in whole months, as people say it: "same month", "1 month", "3.5 months". */
export function monthsLabel(months: number): string {
  if (months === 0) return 'same month';
  return `${months} ${months === 1 ? 'month' : 'months'}`;
}

/** One paper's time to first citation, for its row in the papers list. */
export function firstCitationLabel(fc: FirstCitationDto | undefined): string {
  if (fc?.monthsAfterPublication == null) return 'Not yet cited';
  return fc.monthsAfterPublication === 0 ? 'First cited the month it came out' : `First cited after ${monthsLabel(fc.monthsAfterPublication)}`;
}

/** The Papers & Impact summary tiles for time to first citation. */
export function firstCitationTiles(s: FirstCitationSummaryDto): OpsTile[] {
  const range =
    s.fastestMonths === null || s.slowestMonths === null
      ? '—'
      : s.fastestMonths === s.slowestMonths
        ? monthsLabel(s.fastestMonths)
        : `${s.fastestMonths}–${s.slowestMonths} months`;
  return [
    {
      id: 'median',
      label: 'Median time to first citation',
      value: s.medianMonths === null ? '—' : monthsLabel(s.medianMonths),
      sub: 'from publication',
      goodWhen: 'down',
    },
    { id: 'range', label: 'Fastest – slowest', value: range, sub: 'of cited papers' },
    { id: 'cited', label: 'Cited', value: `${s.cited} of ${s.papers}`, sub: 'papers cited at least once' },
    {
      id: 'awaiting',
      label: 'Awaiting first citation',
      value: s.awaiting,
      sub: s.longestWaitMonths === null ? 'none waiting' : `longest wait ${monthsLabel(s.longestWaitMonths)}`,
      goodWhen: 'down',
      tone: s.awaiting ? 'warning' : undefined,
    },
  ];
}
