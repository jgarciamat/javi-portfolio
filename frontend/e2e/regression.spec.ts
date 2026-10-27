import type { APIRequestContext } from '@playwright/test';
import { API_URL, DEMO_USER } from '../playwright.config';
import { expect, openSection, signIn, test } from './fixtures';

/** Fixes of the regression audit of 27-10-2026 (docs/auditoria-regresion-2026-10-27). */
const SHOTS = '../docs/auditoria-regresion-2026-10-27/despues';

async function api(request: APIRequestContext) {
  const login = await request.post(`${API_URL}/auth/login`, { data: DEMO_USER });
  const { accessToken } = await login.json();
  return { Authorization: `Bearer ${accessToken}` };
}

/** Six movements in the current month (some days back), so the month has figures and a forecast. */
async function seedMonth(request: APIRequestContext) {
  const headers = await api(request);
  const categories: { name: string }[] = await (
    await request.get(`${API_URL}/categories`, { headers })
  ).json();
  const now = new Date();
  for (let i = 1; i <= 6; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - i * 3));
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(
      day.getDate()
    ).padStart(2, '0')}`;
    await request.post(`${API_URL}/transactions`, {
      headers,
      data: {
        description: `Compra ${i}`,
        amount: 12 + i,
        type: 'EXPENSE',
        category: categories[0].name,
        date,
      },
    });
  }
}

/** Layout shifts from the first paint, as the page reports them (not only after the summary). */
async function trackShifts(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[])
        if (!e.hadRecentInput) w.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

test.beforeAll(async ({ request }) => seedMonth(request));

for (const width of [390, 1280]) {
  test(`the month summary does not jump while it loads (${width} px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    await signIn(page);
    // A slow month: the screen paints first and the figures arrive later.
    await page.route('**/api/months/**', async (route) => {
      await new Promise((done) => setTimeout(done, 1000));
      await route.continue();
    });
    await trackShifts(page);
    await page.reload();
    await expect(page.locator('.summary-card').first()).toBeVisible();
    await expect(page.locator('[data-tour="forecast"] .eom')).toBeVisible();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(
      0.1
    );
  });
}

test('with «Contraste» the category labels of the table keep 4.5:1', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await signIn(page);
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.classList.add('app-contrast');
    }, theme);
    const badge = page.locator('.tx-cat-badge').first();
    await expect(badge).toBeVisible();
    const ratio = await badge.evaluate((e) => {
      const rgb = (c: string) => (c.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
      const lum = (c: number[]) => {
        const [r, g, b] = c.map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const style = getComputedStyle(e);
      const [a, b] = [lum(rgb(style.color)), lum(rgb(style.backgroundColor))];
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    expect(ratio, theme).toBeGreaterThanOrEqual(4.5);
  }
});

test('Análisis has no sideways scroll on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await openSection(page, 'Análisis');
  await expect(page.locator('.section-view').first()).toBeVisible();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('the list tabs keep their whole names on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  const tabs = page.getByRole('tablist', { name: /vista|view/i }).getByRole('tab');
  await expect(tabs).toHaveCount(3);
  for (const tab of await tabs.all()) {
    expect(await tab.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  }
});

test('«Recibos y cargos de este mes» lists the automatic charges apart', async ({
  page,
  request,
}) => {
  const headers = await api(request);
  const now = new Date();
  const [year, month] = [now.getFullYear(), now.getMonth() + 1];
  const last = new Date(year, month, 0).getDate();
  for (const [description, amount] of [
    ['Cuota gimnasio', 39.9],
    ['Seguro del coche', 42.5],
  ] as const) {
    const rule = await request.post(`${API_URL}/recurring-rules`, {
      headers,
      data: {
        description,
        amount,
        type: 'EXPENSE',
        category: 'Otros',
        startYear: year,
        startMonth: month,
      },
    });
    expect(rule.ok()).toBe(true);
  }
  const overview = await (
    await request.get(`${API_URL}/months/${year}/${month}`, { headers })
  ).json();
  const insurance = overview.transactions.find(
    (tx: { description: string }) => tx.description === 'Seguro del coche'
  );
  // The bank charges it at the end of the month: noted with that date, it is still to come.
  const pending = now.getDate() < last;
  if (pending) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
    await request.patch(`${API_URL}/transactions/${insurance.id}`, { headers, data: { date } });
  }

  await signIn(page);
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.reload();
    const card = page.getByRole('region', { name: 'Recibos y cargos de este mes' });
    await expect(card).toBeVisible();
    await expect(card.getByText('Cuota gimnasio')).toBeVisible();
    await expect(card.getByText('Total del mes').locator('..')).toContainText('82,40');
    if (pending) {
      await expect(card.getByText('Queda pendiente').locator('..')).toContainText('42,50');
      await expect(card.getByText('Pendiente', { exact: true })).toBeVisible();
      // Not among the movements of the month until its day.
      const list = page.locator('[data-tour="movements"]');
      await expect(list.getByText('Seguro del coche')).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width
    );
    await card.scrollIntoViewIfNeeded();
    await card.screenshot({ path: `${SHOTS}/recibos-y-cargos-${width}.png` });
  }
});

test('Renta: the year in the accounts is a reference note, apart from the return', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page);
  await openSection(page, 'Renta (IRPF)');
  const note = page.getByRole('complementary', { name: 'Referencia (no es tu declaración)' });
  await expect(note).toBeVisible();
  await expect(note).toContainText('entraron');
  await note.scrollIntoViewIfNeeded();
  await note.screenshot({ path: `${SHOTS}/renta-referencia-1280.png` });
});
