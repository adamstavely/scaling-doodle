import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { test as base, expect, type Page } from '@playwright/test';

const FIXTURES = join(__dirname, 'fixtures');

/** `/api/topics?sort=risk` as Chief → fixtures/hv/topics_sort_risk.json (recorded from a seeded intellect-api). */
function fixtureFor(url: URL, user: string): string | undefined {
  const key = (url.pathname.replace(/^\/api\//, '') + url.search).replace(/[?&=/]/g, '_');
  const file = join(FIXTURES, user, `${key}.json`);
  return existsSync(file) ? readFileSync(file, 'utf8') : undefined;
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
