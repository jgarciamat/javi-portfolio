import type { Page } from '@playwright/test';
import { API_URL, DEMO_USER } from '../playwright.config';
import { test, expect, signIn } from './fixtures';

/** A movement of the demo user `daysBack` days ago, through the API (euros). */
const movement = (daysBack: number, i: number) => ({
  description: `Gasto de prueba ${i}`,
  amount: 10 * i,
  type: 'EXPENSE',
  category: 'Alimentación',
  date: new Date(Date.now() - daysBack * 86_400_000).toISOString().slice(0, 10),
});

/**
 * The forecast panel keeps its height while it loads: no layout jump (CLS < 0.1) on a phone. It
 * only shows with five movements or more, so each case brings its own (and takes them away
 * after) instead of relying on what the tests before it happened to leave: a new account (five
 * movements of today: «not enough data yet» instead of the end of the month) and one in use for
 * a while (the first movement ten days back: the whole end of the month).
 */
for (const [name, firstDaysBack] of [
  ['a new account', 0],
  ['an account in use', 10],
] as const)
  test(`the forecast panel does not shift the page when its data arrives (${name})`, async ({
    page,
    request,
  }) => {
    const login = await request.post(`${API_URL}/auth/login`, { data: DEMO_USER });
    const headers = { Authorization: `Bearer ${(await login.json()).accessToken}` };
    const ids: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const made = await request.post(`${API_URL}/transactions`, {
        headers,
        data: movement(i === 1 ? firstDaysBack : 0, i),
      });
      expect(made.status()).toBe(201);
      ids.push((await made.json()).id);
    }
    try {
      await forecastStaysPut(page);
    } finally {
      await request.post(`${API_URL}/transactions/bulk-delete`, { headers, data: { ids } });
    }
  });

async function forecastStaysPut(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/forecast*', async (route) => {
    await new Promise((done) => setTimeout(done, 1200));
    await route.continue();
  });
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[])
        if (!e.hadRecentInput) w.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await signIn(page);
  const panel = page.locator('[data-tour="forecast"]');
  // What loads above the panel (month summary, tour closing) is not the forecast's doing: count from here.
  await expect(page.locator('.summary-card').first()).toBeVisible();
  await page.evaluate(() => ((window as unknown as { __cls: number }).__cls = 0));
  const loading = (await panel.boundingBox())?.height ?? 0;
  await expect(panel.locator('.eom')).toBeVisible();
  const loaded = (await panel.boundingBox())?.height ?? 0;
  expect(Math.abs(loaded - loading)).toBeLessThan(60);
  expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(
    0.1
  );
}

/** On a phone the three social links share the line of the Videoteca pill, inside the screen. */
test('the social links show on a phone, beside the Videoteca pill', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  const links = page.getByRole('navigation', { name: /Síguenos en|Follow us on/ });
  await expect(links.getByRole('link')).toHaveCount(3);
  const pill = await page.locator('.header-learn-btn').boundingBox();
  const box = await links.boundingBox();
  expect(pill && box).toBeTruthy();
  expect(Math.abs((pill?.y ?? 0) - (box?.y ?? 99))).toBeLessThan(12);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  expect((pill?.x ?? 0) + (pill?.width ?? 0)).toBeLessThanOrEqual(box?.x ?? 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('.header').screenshot({
    path: '../docs/auditoria-recorrido-2026-10-26/despues/movil-cabecera-redes.png',
  });
});

/** The menu shows every group at once, and its first title does not touch the line above it. */
test('the menu fits a 1280x720 screen without scrolling and spaces its first title', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await signIn(page);
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  const nav = page.locator('.burger-nav');
  await expect(nav).toBeVisible();
  const size = await nav.evaluate((e) => ({ scroll: e.scrollHeight, client: e.clientHeight }));
  expect(size.scroll).toBeLessThanOrEqual(size.client + 1);
  const title = await page.locator('.burger-nav-group-title').first().boundingBox();
  const head = await page.locator('.burger-panel-header').boundingBox();
  expect((title?.y ?? 0) - ((head?.y ?? 0) + (head?.height ?? 0))).toBeGreaterThanOrEqual(12);
});

/** The N key jumps to «Registrar transacción rápida» (the closed menu is a hidden dialog in the page). */
test('the N key puts the cursor in the quick entry on a computer', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await signIn(page);
  await page.locator('body').press('n');
  await expect(page.getByLabel('Registrar transacción rápida', { exact: true })).toBeFocused();
});

/** The pages that open from an e-mail link load their own styles: a centred panel, not bare HTML. */
for (const [url, badge] of [
  ['/reset-password?token=abc', '.auth-badge'],
  ['/verify-email', '.auth-badge--error'],
] as const) {
  test(`${url.split('?')[0]} is a styled, centred panel`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(url);
    await expect(page.locator(badge)).toBeVisible();
    const card = await page.locator('.auth-card').boundingBox();
    expect(card?.width ?? 0).toBeGreaterThan(400);
    expect(Math.abs((card?.x ?? 0) + (card?.width ?? 0) / 2 - 640)).toBeLessThan(2);
    expect(
      await page
        .locator('.auth-btn')
        .first()
        .evaluate((e) => getComputedStyle(e).borderRadius)
    ).not.toBe('0px');
  });
}
