import type { KpiSeries } from '@adamstavely/trenchcoat/kpi-chart';
import type { HistorySeriesDto } from '../api/generated/models/history-series-dto';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = (month: string) => MONTHS[Number(month.slice(5, 7)) - 1];
const long = (month: string) => `${short(month)} ${month.slice(0, 4)}`;

/** A Papers or People card for tc-kpi-chart: the total now, its change over a year, and the months behind it. */
export interface HistoryCard {
  heading: string;
  value: string;
  /** The change over the last twelve months; undefined with less history than that */
  delta: number | undefined;
  labels: string[];
  tooltipLabels: string[];
  series: KpiSeries[];
  footer: string;
}

/** One measure's history as a card: "Papers", "People". */
export function historyCard(heading: string, series: HistorySeriesDto, months: string[], color?: string): HistoryCard {
  const { actual, current } = series;
  const yearAgo = actual.length > 12 ? actual[actual.length - 13] : undefined;
  return {
    heading,
    value: new Intl.NumberFormat('en-US').format(current),
    delta: yearAgo === undefined ? undefined : current - yearAgo,
    labels: months.map(short),
    tooltipLabels: months.map(long),
    series: [{ label: heading, values: actual, ...(color ? { color } : {}) }],
    footer: months.length ? `${long(months[0])} – ${long(months[months.length - 1])}` : '',
  };
}

/** A change over the year in words, without its sign – the card shows which way it went: "3 in a year". */
export const yearChange = (n: number) => `${Math.abs(n)} in a year`;
