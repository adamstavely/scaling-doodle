import { firstCitationLabel, firstCitationTiles, monthsLabel } from './first-citation';

describe('time to first citation', () => {
  it('says lags the way people do', () => {
    expect(monthsLabel(0)).toBe('same month');
    expect(monthsLabel(1)).toBe('1 month');
    expect(monthsLabel(3.5)).toBe('3.5 months');
  });

  it('labels a paper by its first citation', () => {
    expect(firstCitationLabel({ month: '2026-02', monthsAfterPublication: 3 })).toBe('First cited after 3 months');
    expect(firstCitationLabel({ month: '2026-02', monthsAfterPublication: 0 })).toBe('First cited the month it came out');
    expect(firstCitationLabel({ month: null, monthsAfterPublication: null })).toBe('Not yet cited');
  });

  it('builds the summary tiles', () => {
    const tiles = firstCitationTiles({
      papers: 4,
      cited: 3,
      awaiting: 1,
      medianMonths: 3,
      fastestMonths: 1,
      slowestMonths: 7,
      longestWaitMonths: 5,
    });
    expect(tiles.map((t) => [t.id, t.value, t.sub])).toEqual([
      ['median', '3 months', 'from publication'],
      ['range', '1–7 months', 'of cited papers'],
      ['cited', '3 of 4', 'papers cited at least once'],
      ['awaiting', 1, 'longest wait 5 months'],
    ]);
    expect(firstCitationTiles({ papers: 0, cited: 0, awaiting: 0, medianMonths: null, fastestMonths: null, slowestMonths: null, longestWaitMonths: null })[0].value).toBe('—');
  });
});
