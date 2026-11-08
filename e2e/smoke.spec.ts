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

