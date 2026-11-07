import { fiscalQuarter, periodOptions, periodShort } from './period';

describe('periods', () => {
  it('places dates in the US federal fiscal year', () => {
    expect(fiscalQuarter('2026-11-07')).toEqual({ fy: 2027, q: 1 });
    expect(fiscalQuarter('2026-09-30')).toEqual({ fy: 2026, q: 4 });
    expect(fiscalQuarter('2026-01-02')).toEqual({ fy: 2026, q: 2 });
    expect(fiscalQuarter('2026-04-15')).toEqual({ fy: 2026, q: 3 });
  });

  it('offers this quarter, last quarter (across a fiscal year), YTD and the fiscal year', () => {
    expect(periodOptions('2026-11-07').map((p) => [p.value, p.short])).toEqual([
      ['FY27-Q1', 'Q1 FY27'],
      ['FY26-Q4', 'Q4 FY26'],
      ['ytd', 'YTD'],
      ['FY27', 'FY27'],
    ]);
  });

  it('shortens any period', () => {
    expect(periodShort('FY26-Q2')).toBe('Q2 FY26');
    expect(periodShort('FY26')).toBe('FY26');
    expect(periodShort('ytd')).toBe('YTD');
  });
});
