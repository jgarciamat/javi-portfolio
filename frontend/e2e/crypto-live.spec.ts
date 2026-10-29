import type { Locator, Page, Request } from '@playwright/test';
import { test, expect, openSection, signIn } from './fixtures';

/**
 * The live chart of the crypto console (invented prices, CRYPTO_MARKET=demo, which move every
 * couple of seconds): the candle in progress and the price move every ~2 s in place, without
 * touching the view or the drawings, a change of coin or size never shows the tick of the one
 * before, a new candle opens when the time comes, and nothing is asked while the chart is off
 * screen or the page hidden. With LIVE_SHOTS=1 the screenshots (named by the time they were
 * taken) go to docs/consola-vivo/.
 */
const SHOTS = process.env.LIVE_SHOTS ? '../docs/consola-vivo' : null;
const shot = async (target: Page | Locator, name: string) => {
  if (!SHOTS) return;
  const time = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
  await target.screenshot({ path: `${SHOTS}/${name}-${time}.png` });
};

const chart = (page: Page) => page.locator('.cc-chart');
const mark = (page: Page) => page.locator('.cc-live');
/** The close of the last candle, as the line above the chart reads it (not hovering). */
const close = async (page: Page) => {
  const text = await page
    .locator('.cc-chart-readout span', { has: page.locator('abbr[title="Cierre"]') })
    .locator('b')
    .textContent();
  return Number(text!.replace(/[^\d,]/g, '').replace(',', '.'));
};
/** When the last candle opened, as the same line reads it («29 oct 2026, 10:35»). */
const opened = async (page: Page) =>
  (await page.locator('.cc-chart-readout > span').first().textContent())!;
const isLive = (r: Request) => r.url().includes('/crypto/live?');

/** Counts the live ticks asked for while `act` runs. */
async function ticks(page: Page, act: () => Promise<void>): Promise<string[]> {
  const asked: string[] = [];
  const listen = (r: Request) => {
    if (isLive(r)) asked.push(r.url());
  };
  page.on('request', listen);
  await act();
  page.off('request', listen);
  return asked;
}

async function open(page: Page, symbol: string, interval: string) {
  await page.evaluate((view) => localStorage.setItem('mm_crypto_view', JSON.stringify(view)), {
    symbol,
    interval,
  });
  await page.reload();
  await openSection(page, 'Consola crypto');
  await expect(chart(page).locator('canvas').first()).toBeVisible();
  // The live tick only runs with the chart on screen (it opens below the season and the summary).
  await chart(page).locator('.cc-chart-canvas').scrollIntoViewIfNeeded();
  // The mouse off the chart: the line above it reads the last candle.
  await page.mouse.move(0, 0);
  await expect(mark(page)).toHaveClass(/cc-live--live/);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
});

test('moves the candle in progress every 2 s in place: view, zoom and drawings stay', async ({
  page,
}) => {
  await open(page, 'BTC', '5m');
  // A level drawn on the chart and the view zoomed and moved back a little.
  await page.getByRole('button', { name: 'Línea horizontal' }).click();
  const pane = (await page.locator('.cc-draw-layer').boundingBox())!;
  await page.mouse.click(pane.x + pane.width * 0.4, pane.y + pane.height * 0.5);
  const level = page.locator('.cc-draw-layer [data-drawing="horizontal"] line').nth(1);
  await expect(level).toHaveCount(1);
  await page.getByRole('button', { name: 'Acercar' }).click();
  await chart(page).locator('.cc-chart-canvas').focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft');
  await page.mouse.move(0, 0);
  const count = page.getByText(/Velas a la vista: \d+/);
  const inView = await count.textContent();
  const x = await level.getAttribute('x2');

  const closes: number[] = [];
  const times: string[] = [];
  const asked = await ticks(page, async () => {
    for (let i = 0; i < 5; i++) {
      closes.push(await close(page));
      times.push((await mark(page).locator('time').textContent())!);
      await shot(chart(page), 'pc-5m');
      await page.waitForTimeout(2100);
    }
  });
  // About one tick every 2 s (10,5 s watched), each with a newer time and a price that moved.
  expect(asked.length).toBeGreaterThanOrEqual(4);
  expect(asked.length).toBeLessThanOrEqual(7);
  expect(new Set(times).size).toBeGreaterThanOrEqual(4);
  expect(new Set(closes).size).toBeGreaterThanOrEqual(3);
  // The header and the coin list follow the last price.
  const header = Number(
    (await page.locator('.cc-quote-price').first().textContent())!
      .replace(/[^\d,]/g, '')
      .replace(',', '.')
  );
  expect(Math.abs(header - (await close(page)))).toBeLessThan(150);
  // Nothing moved under the person.
  await expect(count).toHaveText(inView!);
  expect(await level.getAttribute('x2')).toBe(x);
});

test('a change of coin or size never shows the tick of the one before', async ({ page }) => {
  await open(page, 'BTC', '5m');
  // Bitcoin's ticks arrive late (2,5 s): one is on its way when the coin changes.
  await page.route('**/crypto/live?symbol=BTC*', async (route) => {
    await new Promise((done) => setTimeout(done, 2500));
    await route.continue().catch(() => undefined);
  });
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /^Ethereum/ }).click();
  await expect(page.getByRole('img', { name: /Gráfica de Ethereum/ })).toBeVisible();
  await expect(mark(page)).toHaveClass(/cc-live--live/);
  await page.mouse.move(0, 0);
  // The invented Ethereum is around 2.500 € and Bitcoin around 60.000 €.
  for (let i = 0; i < 20; i++) {
    const value = await close(page);
    expect(value).toBeGreaterThan(500);
    expect(value).toBeLessThan(10_000);
    await page.waitForTimeout(250);
  }
  await page.unroute('**/crypto/live?symbol=BTC*');

  // The same with the size: late ticks of 5 minutes never land on the candles of 1 hour.
  await page.route('**/crypto/live?symbol=ETH&interval=5m', async (route) => {
    await new Promise((done) => setTimeout(done, 2500));
    await route.continue().catch(() => undefined);
  });
  await page.waitForTimeout(500);
  await page.getByRole('radio', { name: '1 hora' }).check();
  await expect(
    page.getByRole('img', { name: 'Gráfica de Ethereum, velas de 1 hora' })
  ).toBeVisible();
  await expect(mark(page)).toHaveClass(/cc-live--live/);
  await page.mouse.move(0, 0);
  for (let i = 0; i < 16; i++) {
    expect(await opened(page)).toMatch(/:00$/);
    await page.waitForTimeout(250);
  }
});

test('opens a new candle when the time comes, after the last one', async ({ page }) => {
  await open(page, 'BTC', '5m');
  const before = await opened(page);
  const table = page.locator('.cc-table-details');
  // The next tick says the candle closed and the next one opened (dressed so as not to wait
  // up to five minutes): the chart adds it after the last one.
  await page.route('**/crypto/live?*', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    const last = body.candles[body.candles.length - 1];
    const next = { ...last, time: last.time + 5 * 60_000, open: last.close, volume: 0.1 };
    body.candles = [last, next];
    await route.fulfill({ response, json: body });
  });
  await expect.poll(() => opened(page), { timeout: 6000 }).not.toBe(before);
  const minutes = (text: string) => {
    const [h, m] = text.split(', ').pop()!.split(':').map(Number);
    return h * 60 + m;
  };
  expect((minutes(await opened(page)) - minutes(before) + 1440) % 1440).toBe(5);
  await table.locator('summary').click();
  const rows = table.locator('tbody tr');
  await expect(rows.first().locator('th')).toHaveText(await opened(page));
  await expect(rows.nth(1).locator('th')).toHaveText(before);
  await shot(chart(page), 'pc-vela-nueva');
});

test('asks nothing while the chart is off screen or the page hidden, and comes back', async ({
  page,
}) => {
  await open(page, 'BTC', '1h');
  // The chart scrolled out of view.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  expect(await ticks(page, () => page.waitForTimeout(5000))).toHaveLength(0);
  const back = page.waitForRequest(isLive);
  await chart(page).scrollIntoViewIfNeeded();
  await back;
  // A tab behind another one (the browser says the page is hidden).
  const hide = (hidden: boolean) =>
    page.evaluate((h) => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => (h ? 'hidden' : 'visible'),
      });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
  await hide(true);
  await page.waitForTimeout(500);
  expect(await ticks(page, () => page.waitForTimeout(5000))).toHaveLength(0);
  const again = page.waitForRequest(isLive);
  await hide(false);
  await again;
});

test('keeps ticking in full screen and on a phone, with the live mark', async ({ page }) => {
  await open(page, 'BTC', '15m');
  await page.locator('.cc-zoom--full').click();
  const dialog = page.getByRole('dialog', { name: 'Gráfica en pantalla completa' });
  await expect(dialog).toBeVisible();
  const first = await mark(page).locator('time').textContent();
  await expect
    .poll(() => mark(page).locator('time').textContent(), { timeout: 5000 })
    .not.toBe(first);
  await shot(page, 'pc-pantalla-completa');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  // A real browser leaves its own full screen with Escape; the automated one needs telling.
  await page.evaluate(() => document.fullscreenElement && document.exitFullscreen());

  await page.setViewportSize({ width: 390, height: 844 });
  await chart(page).scrollIntoViewIfNeeded();
  await expect(mark(page)).toHaveClass(/cc-live--live/);
  const now = await mark(page).locator('time').textContent();
  await expect
    .poll(() => mark(page).locator('time').textContent(), { timeout: 5000 })
    .not.toBe(now);
  // No sideways scroll on the phone.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('.cc-chart-head').scrollIntoViewIfNeeded();
  await shot(page, 'movil');
});
