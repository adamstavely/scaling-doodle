import { DEFAULT_APPS, parseApps } from './apps';

describe('parseApps', () => {
  it('keeps well-formed apps and the current id', () => {
    const cfg = parseApps({ current: 'mail', apps: [{ id: 'mail', name: 'Mail', href: 'https://mail' }, { name: 'No id' }, null] });
    expect(cfg).toEqual({ current: 'mail', apps: [{ id: 'mail', name: 'Mail', href: 'https://mail' }] });
  });

  it('falls back to Intellect alone for anything unusable', () => {
    expect(parseApps(null)).toBe(DEFAULT_APPS);
    expect(parseApps({ apps: [] })).toBe(DEFAULT_APPS);
    expect(parseApps('<!doctype html>')).toBe(DEFAULT_APPS);
  });

  it('defaults the current app when it is missing', () => {
    expect(parseApps({ apps: [{ id: 'x', name: 'X' }] }).current).toBe('intellect');
  });
});
