import { asOfLabel, daysToQuarterEnd, DEFAULT_PERIOD_INDEX, fiscalQuarter, periodOptions, periodShort } from './period';

describe('periods', () => {
  it('places dates in the US federal fiscal year', () => {
    expect(fiscalQuarter('2026-11-07')).toEqual({ fy: 2027, q: 1 });
    expect(fiscalQuarter('2026-09-30')).toEqual({ fy: 2026, q: 4 });
    expect(fiscalQuarter('2026-01-02')).toEqual({ fy: 2026, q: 2 });
    expect(fiscalQuarter('2026-04-15')).toEqual({ fy: 2026, q: 3 });
  });

  it('opens on this month', () => {
    expect(periodOptions('2026-11-07')[DEFAULT_PERIOD_INDEX]).toMatchObject({ value: '2026-11', label: 'This month' });
  });

  it('offers this and last month, this and last quarter (across a fiscal year), YTD and the fiscal year', () => {
    expect(periodOptions('2026-11-07').map((p) => [p.value, p.short])).toEqual([
      ['2026-11', 'Nov 2026'],
      ['2026-10', 'Oct 2026'],
      ['FY27-Q1', 'Q1 FY27'],
      ['FY26-Q4', 'Q4 FY26'],
      ['ytd', 'YTD'],
      ['FY27', 'FY27'],
    ]);
  });

  it('takes last month back across the new year', () => {
    expect(periodOptions('2027-01-15').slice(0, 2).map((p) => p.value)).toEqual(['2027-01', '2026-12']);
  });

  it('counts the days to the end of the fiscal quarter', () => {
    expect(daysToQuarterEnd('2026-11-07')).toBe(54);
    expect(daysToQuarterEnd('2026-12-31')).toBe(0);
    expect(daysToQuarterEnd('2027-02-01')).toBe(58);
  });

  it('says when the numbers are from: today, or a date, with the time', () => {
    const now = new Date(2026, 10, 8, 23, 5);
    expect(asOfLabel(new Date(2026, 10, 8, 22, 0), now)).toBe('as of: Today, 8 November 2026 at 22:00');
    expect(asOfLabel(new Date(2026, 10, 7, 9, 4), now)).toBe('as of: 7 November 2026 at 09:04');
    expect(asOfLabel(new Date(2027, 0, 31, 0, 0), new Date(2027, 0, 31, 12, 0))).toBe('as of: Today, 31 January 2027 at 00:00');
  });

  it('shortens any period', () => {
    expect(periodShort('FY26-Q2')).toBe('Q2 FY26');
    expect(periodShort('FY26')).toBe('FY26');
    expect(periodShort('ytd')).toBe('YTD');
    expect(periodShort('2026-11')).toBe('Nov 2026');
  });
});
