import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { test as base, expect, type Page } from '@playwright/test';

const FIXTURES = join(__dirname, 'fixtures');

/** `/api/topics?sort=risk` as Chief → fixtures/hv/topics_sort_risk.json (recorded from a seeded intellect-api). */
function fixtureFor(url: URL, user: string): string | undefined {
  const keyOf = (u: URL) => (u.pathname.replace(/^\/api\//, '') + u.search).replace(/[?&=/]/g, '_');
  const file = join(FIXTURES, user, `${keyOf(url)}.json`);
  if (existsSync(file)) return readFileSync(file, 'utf8');
  // The dashboard's default period is the current quarter, which moves with the calendar; fixtures were recorded
  // without a period (year to date), so fall back to the same request without one.
  if (!url.searchParams.has('period')) return undefined;
  const bare = new URL(url);
  bare.searchParams.delete('period');
  const fallback = join(FIXTURES, user, `${keyOf(bare)}.json`);
  return existsSync(fallback) ? readFileSync(fallback, 'utf8') : undefined;
}

async function mockApi(page: Page): Promise<void> {
  await page.route('**/api/**', (route) => {
    const req = route.request();
    const user = req.headers()['x-intellect-user'] ?? 'hv';
    const body = fixtureFor(new URL(req.url()), user);
    return body
      ? route.fulfill({ status: 200, contentType: 'application/json', body })
      : route.fulfill({ status: 404, contentType: 'application/json', body: '{"statusCode":404}' });
  });
}

/** Every test gets the mocked API and fails on any console error. */
export const test = base.extend<{ errors: string[] }>({
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await mockApi(page);
    await use(errors);
    expect(errors, 'console errors').toEqual([]);
  },
});

export { expect };
