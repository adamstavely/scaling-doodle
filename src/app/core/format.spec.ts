import { compactNumber, percent, priorityHealth } from './format';

describe('format', () => {
  it('compacts big numbers', () => {
    expect(compactNumber(101047)).toBe('101K');
    expect(compactNumber(950)).toBe('950');
  });

  it('rounds fractions to whole percents', () => {
    expect(percent(0.363)).toBe('36%');
    expect(percent(1)).toBe('100%');
  });

  it("maps the API's health words to Trench Coat's", () => {
    expect(priorityHealth('healthy')).toBe('on-track');
    expect(priorityHealth('at-risk')).toBe('at-risk');
  });
});
