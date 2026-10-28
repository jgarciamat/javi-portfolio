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

/**
 * Four accounts (the demo has fewer, and a fourth would hit the free plan): the answer of the
 * server is widened, nothing is written. The list arrives 1 s late.
 */
async function fourAccountsLate(page: import('@playwright/test').Page) {
  await page.route(/\/api\/accounts(\?|$)/, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    const body = await response.json();
    const [first] = body.accounts;
    body.accounts = [
      first,
      ...['Ahorro', 'Efectivo', 'Tarjeta'].map((name, i) => ({
        ...first,
        id: `extra-${i}`,
        name,
        isDefault: false,
        type: 'savings',
      })),
    ];
    await new Promise((done) => setTimeout(done, 1000));
    await route.fulfill({ response, json: body });
  });
}

for (const width of [390, 1280]) {
  test(`Cuentas does not jump while it loads (${width} px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    await signIn(page);
    await fourAccountsLate(page);
    await openSection(page, 'Cuentas');
    await expect(page.getByText('Tarjeta', { exact: true })).toBeVisible();
    // A later visit, from the reload: the place of the list is kept from the first one.
    await trackShifts(page);
    await page.reload();
    await expect(page.getByRole('list', { busy: true })).toBeVisible();
    await expect(page.getByText('Tarjeta', { exact: true })).toBeVisible();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(
      0.05
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
  const dates = page.getByRole('button', { name: /^Fechas de la campaña de la Renta \d{4}$/ });
  await dates.click();
  await expect(dates).toHaveAttribute('aria-expanded', 'true');
  const note = page.getByRole('complementary', { name: 'Referencia (no es tu declaración)' });
  await expect(note).toBeVisible();
  await expect(note).toContainText('entraron');
  await note.scrollIntoViewIfNeeded();
  await note.screenshot({ path: `${SHOTS}/renta-referencia-1280.png` });
});

for (const width of [390, 1280]) {
  test(`Renta: the dates and what to gather folded, the year at the head of the assistant, without a jump (${width} px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await signIn(page);
    // A slow year: the section paints first and the figures of the accounts arrive later.
    await page.route('**/api/transactions/annual**', async (route) => {
      await new Promise((done) => setTimeout(done, 1000));
      await route.continue();
    });
    await trackShifts(page);
    await openSection(page, 'Renta (IRPF)');
    await page.evaluate(() => ((window as unknown as { __cls: number }).__cls = 0));
    const dates = page.getByRole('button', { name: /^Fechas de la campaña de la Renta \d{4}$/ });
    const gather = page.getByRole('button', { name: 'Qué reunir antes de declarar' });
    const year = page.getByRole('combobox', { name: 'Año de la declaración' });
    const tools = page.getByRole('toolbar');
    const route = page.getByRole('navigation', { name: 'Pasos' });
    for (const fold of [dates, gather])
      await expect(fold).toHaveAttribute('aria-expanded', 'false');
    // Closed, nothing inside is reachable: the link of the Agencia is out of the keyboard's way.
    const aeat = page.getByRole('link', { name: 'Abrir la Agencia Tributaria' });
    expect(await aeat.evaluate((e) => e.closest('[inert]') !== null)).toBe(true);
    await expect(route).toBeVisible();
    const box = async (l: import('@playwright/test').Locator) => (await l.boundingBox())!;
    // The assistant and its steps on the first screen, the year right above its toolbar.
    expect((await box(route)).y).toBeLessThan(width === 390 ? 844 : 900);
    const [pick, row] = [await box(page.locator('.renta-year-pick')), await box(tools)];
    expect(pick.y + pick.height).toBeLessThanOrEqual(row.y);
    expect(Math.abs(pick.width - row.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(pick.x - row.x)).toBeLessThanOrEqual(1);
    expect((await box(year)).height).toBeGreaterThanOrEqual(44);
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(
      0.1
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width
    );
    await page.screenshot({ path: `${SHOTS}/renta-plegados-arriba-${width}.png` });

    // Opened with the keyboard, one at a time.
    await gather.focus();
    await page.keyboard.press('Enter');
    await expect(gather).toHaveAttribute('aria-expanded', 'true');
    const card = page.locator('.card', { has: gather });
    await expect(card.getByRole('link', { name: 'Abrir la Agencia Tributaria' })).toBeVisible();
    await expect(card.getByText('¿Cómo lo presento en Hacienda?')).toBeVisible();
    await dates.focus();
    await page.keyboard.press(' ');
    await expect(dates).toHaveAttribute('aria-expanded', 'true');
    await expect(
      page.getByRole('complementary', { name: 'Referencia (no es tu declaración)' })
    ).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${SHOTS}/renta-plegados-abiertos-${width}.png`,
      fullPage: width === 390,
    });
  });
}

/** The text against the background of an element, as WCAG measures it. */
async function contrastOf(target: import('@playwright/test').Locator) {
  return target.evaluate((e) => {
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
}

for (const width of [390, 1280]) {
  test(`Renta: «Continuar sin borrador» as big as «Subir mi borrador», under it, in emerald (${width} px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await signIn(page);
    await openSection(page, 'Renta (IRPF)');
    const card = page.locator('.wiz-step');
    const upload = card.getByRole('button', { name: 'Subir mi borrador' });
    const skip = card.getByRole('button', { name: 'Continuar sin borrador' });
    const paste = card.getByText('O pega aquí el texto del borrador');
    const next = card.getByRole('button', { name: 'Siguiente →' });
    await expect(skip).toBeVisible();
    const [u, s, p, n] = await Promise.all(
      [upload, skip, paste, next].map(async (l) => (await l.boundingBox())!)
    );
    expect(Math.abs(s.width - u.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(s.height - u.height)).toBeLessThanOrEqual(1);
    const type = (l: import('@playwright/test').Locator) =>
      l.evaluate((e) => {
        const style = getComputedStyle(e);
        return [style.fontSize, style.fontWeight, style.fontFamily];
      });
    expect(await type(skip)).toEqual(await type(upload));
    // Under the upload and the pasted text, and above «Siguiente», which keeps its row.
    expect(s.y).toBeGreaterThan(p.y + p.height - 1);
    expect(n.y).toBeGreaterThan(s.y + s.height - 1);
    await expect(
      card.locator('.wiz-nav').getByRole('button', { name: 'Siguiente →' })
    ).toBeVisible();
    await expect(
      card.locator('.wiz-nav').getByRole('button', { name: /Continuar sin/ })
    ).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width
    );
    // The upload, the pasted text, «Continuar sin borrador» and «Siguiente», under the sticky header.
    await page.evaluate(
      (y) => window.scrollTo(0, y - 200),
      u.y + (await page.evaluate(() => scrollY))
    );
    const shot = async (name: string) => {
      const [top, bottom] = [(await upload.boundingBox())!, (await next.boundingBox())!];
      const left = Math.max(0, top.x - 16);
      await page.screenshot({
        path: `${SHOTS}/renta-borrador-sin-el-${name}${width}.png`,
        clip: {
          x: left,
          y: top.y - 16,
          width: Math.min(width - left, top.width + 32),
          height: bottom.y + bottom.height - top.y + 32,
        },
      });
    };

    // AA in both themes, with and without «Contraste».
    for (const theme of ['dark', 'light']) {
      for (const contrast of [false, true]) {
        await page.evaluate(
          ([t, c]) => {
            document.documentElement.setAttribute('data-theme', t as string);
            document.documentElement.classList.toggle('wiz-contrast', c as boolean);
          },
          [theme, contrast]
        );
        // The colours fade in (0.15 s): measured once they have settled.
        await page.waitForTimeout(300);
        expect(await contrastOf(skip), `${theme} ${contrast}`).toBeGreaterThanOrEqual(4.5);
        if (!contrast || width === 390)
          await shot(`${theme === 'light' ? 'claro-' : ''}${contrast ? 'contraste-' : ''}`);
      }
    }
  });
}
