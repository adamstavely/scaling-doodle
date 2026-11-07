import type { OpsTile } from '@adamstavely/trenchcoat/ops-overview';
import type { PortfolioSummaryDto } from '../api/generated/models/portfolio-summary-dto';
import { compactNumber, percent } from './format';
import { periodShort } from './period';

/** The portfolio's KPI tiles, shared by the dashboard and the Directorate Brief. */
export function portfolioTiles(s: PortfolioSummaryDto, isChief: boolean): OpsTile[] {
  const period = periodShort(s.period.label);
  const coverageTone = s.gapsCovered >= 0.7 ? 'success' : s.gapsCovered >= 0.5 ? 'warning' : 'danger';
  return [
    { id: 'topics', label: isChief ? 'Active topics' : 'Your topics', value: s.topics, sub: 'tracked' },
    { id: 'gaps', label: 'Open gaps', value: s.openGaps, sub: 'unresolved', goodWhen: 'down' },
    { id: 'coverage', label: 'Gap coverage', value: percent(s.gapsCovered), sub: 'have active work', tone: coverageTone },
    { id: 'work', label: 'Work in flight', value: s.workInFlight, sub: 'projects active' },
    { id: 'papers', label: `Papers (${period})`, value: s.papersInPeriod, sub: 'published' },
    {
      id: 'reads',
      label: `Readership (${period})`,
      value: compactNumber(s.readsInPeriod),
      sub: 'views',
      trend: s.readTrend.map((m) => m.views),
    },
  ];
}
