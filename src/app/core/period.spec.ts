import { asOfDate, daysToQuarterEnd, fiscalQuarter, periodOptions, periodShort } from './period';

describe('periods', () => {
  it('places dates in the US federal fiscal year', () => {
    expect(fiscalQuarter('2026-11-07')).toEqual({ fy: 2027, q: 1 });
    expect(fiscalQuarter('2026-09-30')).toEqual({ fy: 2026, q: 4 });
    expect(fiscalQuarter('2026-01-02')).toEqual({ fy: 2026, q: 2 });
    expect(fiscalQuarter('2026-04-15')).toEqual({ fy: 2026, q: 3 });
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

  it('writes the as-of date day, month, year', () => {
    expect(asOfDate('2026-11-08')).toBe('08 11 2026');
  });

  it('shortens any period', () => {
    expect(periodShort('FY26-Q2')).toBe('Q2 FY26');
    expect(periodShort('FY26')).toBe('FY26');
    expect(periodShort('ytd')).toBe('YTD');
    expect(periodShort('2026-11')).toBe('Nov 2026');
  });
});
