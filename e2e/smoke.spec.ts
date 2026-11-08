import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from './api';

// Trench Coat elements take their data as properties, so the tests read those off the element.
test.describe('smoke', () => {
  test('dashboard shows the whole portfolio to the Chief and scopes to the PI', async ({ page, errors }) => {
    void errors;
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Metrics Summary' })).toBeVisible();
    const charts = page.locator('.priorities tc-bar-chart');
    await expect(charts).toHaveCount(3);
    // A bar per topic (stacked by center): count the topics each chart draws
    const bars = () => charts.evaluateAll((els) => els.map((e) => new Set((e as unknown as { data: { id: string }[] }).data.map((d) => d.id)).size));
    expect(await bars()).toEqual([4, 4, 4]);
    // Readership and citations: every topic in each
    const metrics = page.locator('.metrics tc-bar-chart');
    await expect(metrics).toHaveCount(2);
    expect(await metrics.evaluateAll((els) => els.map((e) => new Set((e as unknown as { data: { id: string }[] }).data.map((d) => d.id)).size))).toEqual([12, 12]);
    const centers = page.locator('tc-priority-list[heading="Mission Centers"]');
    expect(await centers.evaluate((e) => (e as unknown as { items: { badge?: string }[] }).items.map((i) => i.badge))).toEqual(['AFMC', 'ACMC', 'CCI', 'CMC', 'CIMC', 'CTMC', 'EAPMC', 'EEMC', 'NEMC', 'SCAMC', 'WCPMC']);

    // The view switch lives in the avatar's account card.
    await page.getByRole('button', { name: /^Account/ }).click();
    await page.getByRole('menuitem', { name: /PI view/ }).or(page.getByRole('button', { name: /PI view/ })).first().click();
    await expect.poll(async () => (await bars()).reduce((a, b) => a + b, 0)).toBe(2);
  });

  test('a thirteenth topic wraps the priority row instead of hiding a card', async ({ page, errors }) => {
    void errors;
    // One more topic than the seed's twelve: four charts plus unilateral vs. joint
    const topics = JSON.parse(readFileSync(join(__dirname, 'fixtures/hv/topics_sort_risk.json'), 'utf8')) as { id: string; name: string }[];
    await page.route('**/api/topics?sort=risk', (route) =>
      route.fulfill({ json: [...topics, { ...topics[topics.length - 1], id: 't-extra', name: 'Extra Topic' }] }),
    );
    await page.goto('/');
    const boxes = page.locator('.priorities > *');
    await expect(boxes).toHaveCount(5);
    const widths = await boxes.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
    expect(Math.min(...widths)).toBeGreaterThan(150);
  });

  test('research topics lists every topic in view, grouped by priority', async ({ page, errors }) => {
    void errors;
    await page.goto('/topics');
    await expect(page.getByRole('heading', { name: 'Research Topics' })).toBeVisible();
    const list = page.locator('tc-priority-list');
    expect(await list.evaluate((e) => (e as unknown as { grouped: boolean; items: unknown[] }).grouped)).toBe(true);
    expect(await list.evaluate((e) => (e as unknown as { items: unknown[] }).items.length)).toBe(12);
  });

  test('gaps and coverage lists every gap still open, with what is invested', async ({ page, errors }) => {
    void errors;
    await page.goto('/gaps');
    await expect(page.getByRole('heading', { name: 'Gaps & Coverage' })).toBeVisible();
    const gaps = await page.locator('tc-gap-exposure').evaluate((e) => (e as unknown as { gaps: { id: string; work: number; budget?: number }[] }).gaps);
    expect(gaps.length).toBe(11);
    expect(gaps.find((g) => g.id === 'g2')).toMatchObject({ work: 0, budget: 900_000 });
  });

  test('resourcing weighs dollars and people against priority', async ({ page, errors }) => {
    void errors;
    await page.goto('/resourcing');
    await expect(page.getByRole('heading', { name: 'Resourcing' })).toBeVisible();
    const tiers = await page.locator('tc-investment-balance').evaluate((e) => (e as unknown as { tiers: { items: number }[] }).tiers);
    expect(tiers.reduce((s, t) => s + t.items, 0)).toBe(12);
    expect(await page.locator('tc-budget-burn').evaluate((e) => (e as unknown as { items: unknown[] }).items.length)).toBe(12);
  });

  test('search finds a topic from the top bar and opens it', async ({ page, errors }) => {
    void errors;
    await page.goto('/');
    const search = page.locator('app-search-box tc-command-menu');
    await expect(search).toBeVisible();
    await search.locator('input').fill('neu');
    await expect(page.getByText('Neuromorphic Computing').first()).toBeVisible();
    await expect
      .poll(() => search.evaluate((e) => (e as unknown as { groups: { id: string }[] }).groups.map((g) => g.id)))
      .toEqual(['topics', 'papers']);
    await search.locator('input').press('Enter');
    await expect(page).toHaveURL(/\/topics\/t-neuro$/);
  });

  test('arrow keys move through two gaps of the same topic', async ({ page, errors }) => {
    void errors;
    const hit = (id: string, label: string) => ({ id, label, detail: 'high', topicId: 't-neuro', score: 1 });
    await page.route('**/api/search?q=unproven*', (route) =>
      route.fulfill({ json: { topics: [], gaps: [hit('g2', 'Learning rule unproven'), hit('g3', 'Endurance unproven')], papers: [], people: [] } }),
    );
    await page.goto('/');
    const search = page.locator('app-search-box tc-command-menu');
    const input = search.locator('input');
    await input.fill('unproven');
    await expect(page.getByText('Endurance unproven').first()).toBeVisible();
    // The active row, by the combobox's aria-activedescendant
    const active = () =>
      input.evaluate((el) => (document.getElementById(el.getAttribute('aria-activedescendant') ?? '')?.textContent ?? '').replace(/\s+/g, ' ').trim());
    const seen = [await active()];
    await input.press('ArrowDown');
    seen.push(await active());
    expect(seen).toEqual(['Learning rule unproven high', 'Endurance unproven high']);
  });

  test('topic detail draws the traceability spine', async ({ page, errors }) => {
    void errors;
    await page.goto('/topics/t-neuro');
    const spine = page.locator('tc-traceability-spine');
    await expect(spine).toBeVisible();
    const stages = await spine.evaluate((e) =>
      (e as unknown as { nodes: { stage: string }[] }).nodes.map((n) => n.stage),
    );
    expect(new Set(stages)).toEqual(new Set(['questions', 'gaps', 'work', 'papers', 'citations']));
    await expect(page.locator('tc-work-item')).toHaveCount(4);
  });

  test('papers opens the first paper and offers the Chief a grade', async ({ page, errors }) => {
    void errors;
    await page.goto('/papers');
    await expect(page).toHaveURL(/\/papers\/p4$/);
    await expect(page.locator('tc-publication-impact')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Assessment' })).toBeVisible();
  });

  test('a late answer to an earlier grade never overwrites a newer grade', async ({ page, errors }) => {
    void errors;
    const detail = JSON.parse(readFileSync(join(__dirname, 'fixtures/hv/papers_p4.json'), 'utf8'));
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    let saves = 0;
    await page.route('**/api/papers/p4/grade', async (route) => {
      const grade = (route.request().postDataJSON() as { grade: string }).grade;
      // The first save answers late, after the second
      if (++saves === 1) await held;
      await route.fulfill({ json: { ...detail, grade } });
    });
    const grade = page.locator('.grade tc-segmented-control');
    const pick = (label: string) => grade.getByText(label, { exact: true }).click();

    await page.goto('/papers');
    await expect(page).toHaveURL(/\/papers\/p4$/);
    await expect(page.getByRole('heading', { name: 'Assessment' })).toBeVisible();
    await pick('Excellent');
    // Away to another paper and back, in the app
    await page.locator('tc-results-list').getByText(/Seawater/).first().click();
    await expect(page).toHaveURL(/\/papers\/p5$/);
    await page.locator('tc-results-list').getByText(/Retargetable/).first().click();
    await expect(page).toHaveURL(/\/papers\/p4$/);
    await pick('Outstanding');
    await expect.poll(() => grade.evaluate((e) => (e as unknown as { value: string }).value)).toBe('outstanding');
    release();
    await page.waitForTimeout(300);
    expect(await grade.evaluate((e) => (e as unknown as { value: string }).value)).toBe('outstanding');
  });

  test('org shows each center', async ({ page, errors }) => {
    void errors;
    await page.goto('/org');
    await expect(page.locator('tc-org-unit-card')).toHaveCount(11);
  });

  test('partner labs shows each lab and who started the work', async ({ page, errors }) => {
    void errors;
    await page.goto('/partners');
    await expect(page.getByRole('heading', { name: 'Partner Labs' })).toBeVisible();
    const chart = page.locator('tc-breakdown-chart');
    await expect(chart).toBeVisible();
    expect(await chart.evaluate((e) => (e as unknown as { records: unknown[] }).records.length)).toBe(3);
    await expect(page.locator('tc-results-list')).toContainText('Sparse Spiking Networks');
  });

  test('a center page opens from Centers & Teams and shows that center', async ({ page, errors }) => {
    void errors;
    await page.goto('/org');
    await page.locator('tc-org-unit-card').filter({ hasText: 'Center for Cyber Intelligence' }).getByRole('button', { name: 'Open center' }).click();
    await expect(page).toHaveURL(/\/centers\/c-cci/);
    await expect(page.getByRole('heading', { name: 'Center for Cyber Intelligence' })).toBeVisible();
    const topics = page.locator('tc-priority-list[heading="Topics"]');
    await expect(topics).toBeVisible();
    expect(await topics.evaluate((e) => (e as unknown as { items: unknown[] }).items.length)).toBe(4);
  });

  test('New Topic waits for its data, then keeps what was typed', async ({ page, errors }) => {
    void errors;
    const people = readFileSync(join(__dirname, 'fixtures/hv/people.json'), 'utf8');
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    await page.route('**/api/people', async (route) => {
      await held;
      await route.fulfill({ contentType: 'application/json', body: people });
    });
    await page.goto('/topics?new=topic');
    // While people are loading, there's no form to type into
    await expect(page.locator('tc-dialog tc-skeleton')).toBeVisible();
    await expect(page.locator('tc-dialog tc-stepper-form')).toHaveCount(0);
    release();
    const name = page.locator('tc-dialog tc-stepper-form').getByRole('textbox').first();
    await name.fill('Quantum Networking');
    await page.waitForTimeout(400);
    await expect(name).toHaveValue('Quantum Networking');
  });

  test('every page reflows at 320px: nothing scrolls sideways (WCAG 1.4.10)', async ({ page, errors }) => {
    void errors;
    await page.setViewportSize({ width: 320, height: 800 });
    for (const path of ['/', '/org', '/centers/c-cci', '/topics', '/topics/t-neuro', '/gaps', '/resourcing', '/papers', '/partners', '/people']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main tc-skeleton')).toHaveCount(0);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width, path).toBeLessThanOrEqual(320);
    }
  });

  test('people lists the roster', async ({ page, errors }) => {
    void errors;
    await page.goto('/people');
    const table = page.locator('tc-data-table');
    await expect(table).toBeVisible();
    expect(await table.evaluate((e) => (e as unknown as { rows: unknown[] }).rows.length)).toBe(11);
  });

  test('the Directorate Brief renders its six sections', async ({ page, errors }) => {
    void errors;
    await page.goto('/?brief=ytd');
    await expect(page.locator('.brief > h3')).toHaveCount(6);
  });
});

