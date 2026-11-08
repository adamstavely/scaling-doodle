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
    expect(await centers.evaluate((e) => (e as unknown as { items: { name: string }[] }).items.map((i) => i.name))).toEqual(['AFMC', 'ACMC', 'CCI', 'CMC', 'CIMC', 'CTMC', 'EAPMC', 'EEMC', 'NEMC', 'SCAMC', 'WCPMC']);

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

  test('a failed search says so and can be retried', async ({ page }) => {
    // The failing request's 500 is expected here, so this test doesn't fail on console errors
    let fail = true;
    await page.route('**/api/search?q=neu*', (route) =>
      fail
        ? route.fulfill({ status: 500, json: { statusCode: 500 } })
        : route.fulfill({ json: { topics: [{ id: 't-neuro', label: 'Neuromorphic Computing', detail: 'at-risk', topicId: null, score: 1 }], gaps: [], papers: [], people: [] } }),
    );
    await page.goto('/');
    const search = page.locator('app-search-box tc-command-menu');
    await search.locator('input').fill('neu');
    await expect(page.getByText("Couldn't search")).toBeVisible();
    await expect(page.getByText('Nothing matches')).toHaveCount(0);
    fail = false;
    await search.locator('input').press('Enter');
    await expect(page.getByText('Neuromorphic Computing').first()).toBeVisible();
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

  test('New Topic can be finished with the keyboard: every choice group takes focus with nothing chosen', async ({ page, errors }) => {
    void errors;
    await page.goto('/topics?new=topic');
    const form = page.locator('tc-dialog tc-stepper-form');
    await form.getByRole('textbox').first().fill('Quantum Networking');
    await form.getByRole('button', { name: 'Continue' }).click();
    await expect(form.getByText('Where does it sit?')).toBeVisible();
    // Tab through the step; Space picks the first card of each choice group still empty.
    const chosen = new Set<string>();
    for (let i = 0; i < 30 && chosen.size < 3; i++) {
      await page.keyboard.press('Tab');
      const group = await page.evaluate(() => {
        let el = document.activeElement;
        while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
        // The focused card sits in the group's light DOM or its shadow root
        const host = (el?.closest('tc-stepper-choices') ?? (el?.getRootNode() as ShadowRoot | undefined)?.host) as
          | (Element & { label: string; value: string })
          | undefined;
        return host?.tagName === 'TC-STEPPER-CHOICES' ? { label: host.label, value: host.value } : null;
      });
      if (group && !chosen.has(group.label)) {
        if (!group.value) await page.keyboard.press('Space');
        chosen.add(group.label);
      }
    }
    expect([...chosen].sort()).toEqual(['Center', 'Priority', 'Team']);
    await form.getByRole('button', { name: 'Continue' }).click();
    await expect(form.getByText('How is it funded?')).toBeVisible();
  });

  test('a follow-up to Donovan turns the Summary into a chat, and Back returns the page', async ({ page, errors }) => {
    void errors;
    await page.goto('/');
    const donovan = page.locator('tc-ai-summary');
    const ask = donovan.getByRole('textbox', { name: 'Ask Donovan a follow-up…' });
    await ask.fill('What is at risk?');
    await ask.press('Enter');
    // Everything but Donovan leaves the page
    await expect(page.locator('tc-priority-list[heading="Mission Centers"]')).toBeHidden();
    await expect(page.locator('tc-bar-chart').first()).toBeHidden();
    await expect(donovan.getByText('What is at risk?')).toBeVisible();
    await expect(donovan.locator('[aria-busy="true"]')).toHaveCount(0);
    expect(await donovan.evaluate((e) => (e as unknown as { messages: { status?: string }[] }).messages.map((m) => m.status))).toEqual(['done', 'done']);
    await page.getByRole('button', { name: 'Back to the page' }).click();
    await expect(page.locator('tc-priority-list[heading="Mission Centers"]')).toBeVisible();
  });

  test("the Summary's notes sit under unilateral vs. joint, and their link opens in the app", async ({ page, errors }) => {
    void errors;
    await page.goto('/');
    const notes = page.locator('tc-footnotes');
    await expect(notes.getByText('A paper is joint if')).toBeVisible();
    const bar = await page.locator('tc-segmented-bar').boundingBox();
    const box = await notes.boundingBox();
    expect(box!.y).toBeGreaterThan(bar!.y + bar!.height - 1);
    expect(Math.abs(box!.x - bar!.x)).toBeLessThan(1);
    await notes.getByRole('link', { name: 'Partner Labs' }).click();
    await expect(page).toHaveURL(/\/partners$/);
  });

  test('Terms and Conditions opens from the account card, read-only', async ({ page, errors }) => {
    void errors;
    await page.goto('/');
    await page.getByRole('button', { name: /^Account:/ }).click();
    await page.getByText('Terms and Conditions', { exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Terms and Conditions' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('These are placeholder terms.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Decline|Not now/ })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Close', exact: true }).last().click();
    await expect(dialog).toBeHidden();
  });

  test("Donovan's short summary fits its cell at 1440px, the ask box and footer at the card's bottom", async ({ page, errors }) => {
    void errors;
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const cell = page.locator('.donovan');
    await expect(cell.locator('.ui-aism__ask')).toBeVisible();
    const { scrolls, underFoot, askToFoot } = await cell.evaluate((d) => {
      const box = (sel: string) => d.querySelector(sel)!.getBoundingClientRect();
      return {
        scrolls: d.scrollHeight > d.clientHeight + 1,
        underFoot: box('.ui-aism__card').bottom - box('.ui-aism__foot').bottom,
        askToFoot: box('.ui-aism__foot').top - box('.ui-aism__ask').bottom,
      };
    });
    expect(scrolls).toBe(false);
    expect(Math.abs(underFoot)).toBeLessThanOrEqual(1);
    expect(Math.abs(askToFoot)).toBeLessThanOrEqual(1);
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

  test('keyboard focus is never hidden under the sticky top bar (WCAG 2.4.11)', async ({ page, errors }) => {
    void errors;
    await page.setViewportSize({ width: 1440, height: 600 });
    await page.goto('/topics');
    const rows = page.locator('tc-priority-list [data-row]');
    await expect(rows.first()).toBeVisible();
    // From the last row, back up through every row as a keyboard user would
    await rows.last().focus();
    const bar = await page.locator('.topbar').evaluate((e) => e.getBoundingClientRect().bottom);
    for (let i = 0; i < (await rows.count()) - 1; i++) {
      await page.keyboard.press('ArrowUp');
      const top = await page.evaluate(() => document.activeElement!.getBoundingClientRect().top);
      expect(top).toBeGreaterThanOrEqual(bar);
    }
  });

  test('a center with teams but no topics shows its teams', async ({ page, errors }) => {
    void errors;
    const org = JSON.parse(readFileSync(join(__dirname, 'fixtures/hv/org.json'), 'utf8'));
    const afmc = org.centers.find((c: { id: string }) => c.id === 'c-afmc');
    const cci = org.centers.find((c: { id: string }) => c.id === 'c-cci');
    // Give Africa two of CCI's teams, without their topics
    afmc.teams = cci.teams.map((t: { topics: unknown[] }) => ({ ...t, topics: [] }));
    await page.route('**/api/org', (route) => route.fulfill({ json: org }));
    await page.goto('/centers/c-afmc');
    await expect(page.getByRole('heading', { name: 'Africa Mission Center' })).toBeVisible();
    await expect(page.locator('tc-org-unit-card.teams')).toBeVisible();
    await expect(page.locator('tc-priority-list[heading="Topics"]')).toHaveCount(0);
    await expect(page.getByText('has no teams, topics or papers yet')).toHaveCount(0);
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

