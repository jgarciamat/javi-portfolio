import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { API_URL, DEMO_USER } from '../playwright.config';
import { test, expect, openSection, signIn } from './fixtures';

/**
 * Drawings on the chart of the crypto console (invented prices, CRYPTO_MARKET=demo): drawn with
 * the mouse and with a finger, kept per coin on the server (they come back after a reload and on
 * any device), in place after a zoom or another candle size, and in full screen with the coin
 * changed from there. With DRAW_SHOTS=1 the screenshots go to docs/consola-dibujo/.
 */
const SHOTS = process.env.DRAW_SHOTS ? '../docs/consola-dibujo' : null;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};

/** The person starts with no drawings on the coins these tests use. */
async function forget(request: APIRequestContext) {
  const login = await request.post(`${API_URL}/auth/login`, { data: DEMO_USER });
  const { accessToken } = await login.json();
  for (const symbol of ['BTC', 'ETH']) {
    const res = await request.put(`${API_URL}/crypto/drawings/${symbol}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { drawings: [] },
    });
    expect(res.ok()).toBe(true);
  }
}

const bar = (scope: Page | Locator) => scope.getByRole('group', { name: 'Herramientas de dibujo' });
const tool = (scope: Page | Locator, name: string) => bar(scope).getByRole('button', { name });
const layer = (scope: Page | Locator) => scope.locator('.cc-draw-layer');
const drawn = (scope: Page | Locator, kind?: string) =>
  layer(scope).locator(kind ? `[data-drawing="${kind}"]` : '[data-drawing]');

/** Waits for the list of a coin to be saved while `act` runs. */
async function saving(page: Page, symbol: string, act: () => Promise<void>) {
  const saved = page.waitForResponse(
    (r) => r.url().endsWith(`/crypto/drawings/${symbol}`) && r.request().method() === 'PUT'
  );
  await act();
  expect((await saved).ok()).toBe(true);
}

/** A point of the pane, as a share of its width and height. */
async function point(scope: Page | Locator, x: number, y: number) {
  const box = (await layer(scope).boundingBox())!;
  return { x: box.x + box.width * x, y: box.y + box.height * y };
}

async function mouseDrag(page: Page, from: [number, number], to: [number, number]) {
  const a = await point(page, ...from);
  const b = await point(page, ...to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up();
}

async function click(scope: Page | Locator, page: Page, x: number, y: number) {
  const p = await point(scope, x, y);
  await page.mouse.click(p.x, p.y);
}

test.describe('with the mouse', () => {
  test.beforeEach(async ({ page, request }) => {
    await forget(request);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await openSection(page, 'Consola crypto');
    await expect(
      page.getByRole('img', { name: 'Gráfica de Bitcoin, velas de 1 hora' })
    ).toBeVisible();
    await expect(tool(page, 'Línea de tendencia')).toBeEnabled();
  });

  test('draws, keeps the drawings of each coin after a reload and moves them with the chart', async ({
    page,
  }) => {
    await tool(page, 'Línea de tendencia').click();
    await expect(tool(page, 'Línea de tendencia')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.cc-draw-hint')).toContainText('Arrastra de un punto a otro');
    await mouseDrag(page, [0.3, 0.7], [0.7, 0.3]);
    await expect(drawn(page, 'trend')).toHaveCount(1);
    // After a drawing the chart moves again.
    await expect(tool(page, 'Línea de tendencia')).toHaveAttribute('aria-pressed', 'false');

    await tool(page, 'Turquesa').click();
    await tool(page, 'Línea horizontal').click();
    await click(page, page, 0.5, 0.5);
    await tool(page, 'Naranja').click();
    await tool(page, 'Zona').click();
    await mouseDrag(page, [0.55, 0.2], [0.8, 0.4]);
    await tool(page, 'Nota de texto').click();
    await click(page, page, 0.2, 0.25);
    const note = page.getByRole('textbox', { name: 'Texto de la nota' });
    await expect(note).toBeFocused();
    await note.fill('Soporte de prueba');
    await saving(page, 'BTC', () => note.press('Enter'));
    await expect(drawn(page)).toHaveCount(4);
    await expect(drawn(page, 'text')).toHaveText('Soporte de prueba');
    // The tone follows the theme: a contrast of 4.5:1 or more on light and dark charts.
    await expect(drawn(page, 'horizontal').locator('line').nth(1)).toHaveAttribute(
      'style',
      /--cc-draw-cyan/
    );
    const tone = await drawn(page, 'horizontal')
      .locator('line')
      .nth(1)
      .evaluate((el) => getComputedStyle(el).stroke);
    expect(['rgb(34, 211, 238)', 'rgb(14, 116, 144)']).toContain(tone);
    await shot(page, 'pc-dibujos');
    if (SHOTS) {
      // The same drawings on the dark theme (the palette has a tone for each theme).
      const theme = (value: string) =>
        page.evaluate((v) => document.documentElement.setAttribute('data-theme', v), value);
      const before = await page.evaluate(() => document.documentElement.dataset.theme ?? 'light');
      await theme('dark');
      await shot(page, 'pc-dibujos-oscuro');
      await theme(before);
    }

    // A zoom moves the drawings with their candles.
    const x1 = () => drawn(page, 'trend').locator('line').nth(1).getAttribute('x1');
    const before = await x1();
    await page.getByRole('button', { name: 'Acercar' }).click();
    await expect.poll(x1).not.toBe(before);

    // Back after a reload, and only on Bitcoin.
    await page.reload();
    await openSection(page, 'Consola crypto');
    await expect(drawn(page)).toHaveCount(4);
    await page.getByRole('radio', { name: '1 día' }).check();
    await expect(
      page.getByRole('img', { name: 'Gráfica de Bitcoin, velas de 1 día' })
    ).toBeVisible();
    await expect(drawn(page)).toHaveCount(4);
    await page.getByRole('button', { name: /^Ethereum/ }).click();
    await expect(page.getByRole('img', { name: /Gráfica de Ethereum/ })).toBeVisible();
    await expect(drawn(page)).toHaveCount(0);
    await page.getByRole('button', { name: /^Bitcoin(?! Cash)/ }).click();
    await expect(drawn(page)).toHaveCount(4);

    // The eraser removes one; «Undo» brings it back; Escape leaves the tool.
    await tool(page, 'Goma: borrar un dibujo').click();
    await page.getByRole('button', { name: 'Borrar la nota «Soporte de prueba»' }).click();
    await expect(drawn(page)).toHaveCount(3);
    await page.keyboard.press('Escape');
    await expect(tool(page, 'Goma: borrar un dibujo')).toHaveAttribute('aria-pressed', 'false');
    await saving(page, 'BTC', () => tool(page, 'Deshacer').click());
    await expect(drawn(page)).toHaveCount(4);
  });

  test('draws with two thicknesses and keeps them after a reload', async ({ page }) => {
    const widths = bar(page).getByRole('group', { name: 'Grosor de la línea' });
    await widths.getByRole('button', { name: 'Fino (1 px)' }).click();
    await tool(page, 'Línea de tendencia').click();
    await mouseDrag(page, [0.2, 0.7], [0.5, 0.4]);
    await widths.getByRole('button', { name: 'Muy grueso (6 px)' }).click();
    await expect(widths.getByRole('button', { name: 'Muy grueso (6 px)' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await tool(page, 'Línea de tendencia').click();
    await saving(page, 'BTC', () => mouseDrag(page, [0.5, 0.75], [0.8, 0.35]));
    const strokes = () =>
      drawn(page, 'trend').evaluateAll((all) =>
        all.map((g) => g.querySelectorAll('line')[1].getAttribute('stroke-width'))
      );
    await expect.poll(strokes).toEqual(['1', '6']);
    // In screen pixels: a zoom moves the lines, never makes them thicker.
    await page.getByRole('button', { name: 'Acercar' }).click();
    expect(await strokes()).toEqual(['1', '6']);
    await shot(page, 'pc-grosores');
    await page.reload();
    await openSection(page, 'Consola crypto');
    await expect(drawn(page, 'trend')).toHaveCount(2);
    expect(await strokes()).toEqual(['1', '6']);
    // The thickness last chosen stays on this device.
    await expect(
      bar(page)
        .getByRole('group', { name: 'Grosor de la línea' })
        .getByRole('button', { name: 'Muy grueso (6 px)' })
    ).toHaveAttribute('aria-pressed', 'true');
    // A thin line is still easy to erase (its hit area is wider than the stroke).
    await tool(page, 'Goma: borrar un dibujo').click();
    const thin = drawn(page, 'trend').first().locator('line').nth(1);
    const box = (await thin.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2 + 5, box.y + box.height / 2);
    await expect(drawn(page, 'trend')).toHaveCount(1);
  });

  test('changes the coin in full screen and brings the drawings of each one', async ({ page }) => {
    let btc = 0;
    let eth = 0;
    for (const size of [
      { width: 1440, height: 900 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(size);
      await page.locator('.cc-zoom--full').click();
      const full = page.getByRole('dialog', { name: 'Gráfica en pantalla completa' });
      await expect(full).toBeVisible();
      const coin = full.getByRole('combobox', { name: 'Cambiar de moneda' });
      for (const control of [coin, tool(full, 'Línea horizontal'), tool(full, 'Deshacer')]) {
        await expect(control).toBeInViewport();
      }
      // The drawing bar takes little: the chart keeps most of the height.
      const canvas = full.getByRole('img', { name: /Gráfica de/ });
      expect((await canvas.boundingBox())!.height).toBeGreaterThan(size.height * 0.45);

      await tool(full, 'Línea horizontal').click();
      await saving(page, 'BTC', () => click(full, page, 0.5, 0.4));
      await expect(drawn(full)).toHaveCount(++btc);
      await coin.selectOption('ETH');
      await expect(full.getByRole('img', { name: /Gráfica de Ethereum/ })).toBeVisible();
      await expect(drawn(full)).toHaveCount(eth);
      await tool(full, 'Zona').click();
      await saving(page, 'ETH', () => mouseDrag(page, [0.3, 0.3], [0.6, 0.6]));
      await expect(drawn(full, 'rect')).toHaveCount(++eth);
      if (size.width > 1000) await shot(page, 'pc-pantalla-completa');
      else await shot(page, 'movil-horizontal-pantalla-completa');
      // Escape with a tool on leaves the tool; with none, the full screen.
      await tool(full, 'Línea de tendencia').click();
      await page.keyboard.press('Escape');
      await expect(full).toBeVisible();
      await coin.selectOption('BTC');
      await expect(drawn(full)).toHaveCount(btc);
      await page.keyboard.press('Escape');
      await expect(full).toBeHidden();
      // A real Escape also leaves the browser's own full screen; a test key does not: reload.
      await page.reload();
      await openSection(page, 'Consola crypto');
      await expect(drawn(page)).toHaveCount(btc);
    }
  });
});

test.describe('with a finger on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test.beforeEach(async ({ page, request }) => {
    await forget(request);
    await signIn(page);
    await openSection(page, 'Consola crypto');
    await expect(tool(page, 'Línea de tendencia')).toBeEnabled();
  });

  test('draws with taps, scrolls nothing sideways and keeps it in full screen', async ({
    page,
  }) => {
    const tap = async (scope: Page | Locator, x: number, y: number) => {
      const p = await point(scope, x, y);
      await page.touchscreen.tap(p.x, p.y);
    };
    await tool(page, 'Línea de tendencia').tap();
    await tap(page, 0.2, 0.7);
    await tap(page, 0.75, 0.3);
    await expect(drawn(page, 'trend')).toHaveCount(1);
    await tool(page, 'Línea horizontal').tap();
    await saving(page, 'BTC', () => tap(page, 0.5, 0.55));
    await expect(drawn(page)).toHaveCount(2);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await bar(page).scrollIntoViewIfNeeded();
    await shot(page, 'movil-dibujos');

    await page.locator('.cc-zoom--full').tap();
    const full = page.getByRole('dialog', { name: 'Gráfica en pantalla completa' });
    await expect(drawn(full)).toHaveCount(2);
    await expect(tool(full, 'Nota de texto')).toBeInViewport();
    await tool(full, 'Nota de texto').tap();
    await tap(full, 0.3, 0.3);
    const note = full.getByRole('textbox', { name: 'Texto de la nota' });
    await note.fill('Mínimo');
    await saving(page, 'BTC', () => note.press('Enter'));
    await expect(drawn(full, 'text')).toHaveText('Mínimo');
    await full.getByRole('combobox', { name: 'Cambiar de moneda' }).selectOption('ETH');
    await expect(drawn(full)).toHaveCount(0);
    await full.getByRole('combobox', { name: 'Cambiar de moneda' }).selectOption('BTC');
    await expect(drawn(full)).toHaveCount(3);
    await shot(page, 'movil-pantalla-completa');
  });
});
