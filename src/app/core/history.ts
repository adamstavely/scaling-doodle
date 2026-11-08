import type { KpiSeries } from '@adamstavely/trenchcoat/kpi-chart';
import type { HistorySeriesDto } from '../api/generated/models/history-series-dto';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = (month: string) => MONTHS[Number(month.slice(5, 7)) - 1];
const long = (month: string) => `${short(month)} ${month.slice(0, 4)}`;

/**
 * A Papers or People card for tc-kpi-chart: the total now, its change over a year, the months behind it, and the
 * forecast ahead of it – dashed, in its likely range.
 */
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

/** One measure's history and forecast as a card: "Papers", "People". */
export function historyCard(
  heading: string,
  series: HistorySeriesDto,
  months: string[],
  forecastMonths: string[] = [],
  color?: string,
): HistoryCard {
  const { actual, current, forecast } = series;
  const ahead = forecast.slice(0, forecastMonths.length);
  const all = [...months, ...forecastMonths.slice(0, ahead.length)];
  const yearAgo = actual.length > 12 ? actual[actual.length - 13] : undefined;
  return {
    heading,
    value: new Intl.NumberFormat('en-US').format(current),
    delta: yearAgo === undefined ? undefined : current - yearAgo,
    labels: all.map(short),
    tooltipLabels: all.map(long),
    series: [
      {
        label: heading,
        values: [...actual, ...ahead.map((f) => f.value)],
        ...(color ? { color } : {}),
        // The actual months have no range of their own; the band shows over the forecast only
        ...(ahead.length
          ? {
              forecastFrom: actual.length,
              band: { low: [...actual, ...ahead.map((f) => f.low)], high: [...actual, ...ahead.map((f) => f.high)] },
            }
          : {}),
      },
    ],
    footer: months.length
      ? `${long(months[0])} – ${long(months[months.length - 1])}${ahead.length ? ` · forecast to ${long(all[all.length - 1])}` : ''}`
      : '',
  };
}

/** A change over the year in words, without its sign – the card shows which way it went: "3 in a year". */
export const yearChange = (n: number) => `${Math.abs(n)} in a year`;
