import { expect, test } from './api';

// Trench Coat elements take their data as properties, so the tests read those off the element.
test.describe('smoke', () => {
  test('dashboard shows the whole portfolio to the Chief and scopes to the PI', async ({ page, errors }) => {
    void errors;
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Portfolio Health' })).toBeVisible();
    const priorities = page.locator('tc-priority-list');
    await expect(priorities).toBeVisible();
    expect(await priorities.evaluate((e) => (e as unknown as { items: unknown[] }).items.length)).toBe(12);

    await page.getByText('PI view').first().click();
    await expect(page.getByText('Marcus Okonkwo · your topics')).toBeVisible();
    await expect
      .poll(() => priorities.evaluate((e) => (e as unknown as { items: unknown[] }).items.length))
      .toBe(2);
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
    await expect(page.locator('tc-org-unit-card')).toHaveCount(3);
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

