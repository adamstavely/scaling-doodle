import type { HistorySeriesDto } from '../api/generated/models/history-series-dto';
import { historyCard, yearChange } from './history';

const months = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(Date.UTC(2025, 9 + i, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
});

describe('historyCard', () => {
  const series = { current: 5, actual: [1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5], forecast: [] } as HistorySeriesDto;
  const card = historyCard('Papers', series, months);

  it('shows the total now and its change over a year', () => {
    expect(card.value).toBe('5');
    // Thirteen months back from the last is a year ago: 1, so +4
    expect(card.delta).toBe(4);
  });

  it('labels the months short on the axis and long in the tooltip', () => {
    expect(card.labels.slice(0, 4)).toEqual(['Oct', 'Nov', 'Dec', 'Jan']);
    expect(card.tooltipLabels[3]).toBe('Jan 2026');
    expect(card.footer).toBe('Oct 2025 – Nov 2026');
  });

  it('draws one line, the measure itself', () => {
    expect(card.series).toEqual([{ label: 'Papers', values: series.actual }]);
  });

  it('continues the line into the forecast, dashed, with its range', () => {
    const withForecast = { ...series, forecast: [{ value: 6, low: 5, high: 7 }, { value: 7, low: 5, high: 9 }] } as HistorySeriesDto;
    const c = historyCard('Papers', withForecast, months, ['2026-12', '2027-01']);
    expect(c.labels.slice(-3)).toEqual(['Nov', 'Dec', 'Jan']);
    expect(c.series[0].values.slice(-3)).toEqual([5, 6, 7]);
    expect(c.series[0].forecastFrom).toBe(14);
    expect(c.series[0].band?.low.slice(-2)).toEqual([5, 5]);
    expect(c.series[0].band?.high.slice(-2)).toEqual([7, 9]);
    expect(c.footer).toBe('Oct 2025 – Nov 2026 · forecast to Jan 2027');
    // The value and the year's change are today's, not the forecast's
    expect(c.value).toBe('5');
    expect(c.delta).toBe(4);
  });

  it('has no change with under a year of history', () => {
    expect(historyCard('People', { current: 2, actual: [1, 2], forecast: [] } as HistorySeriesDto, months.slice(0, 2)).delta).toBeUndefined();
  });

  it('says the change in words, leaving the sign to the card', () => {
    expect([yearChange(3), yearChange(-1), yearChange(0)]).toEqual(['3 in a year', '1 in a year', '0 in a year']);
  });
});
