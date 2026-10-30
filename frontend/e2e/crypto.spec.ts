import type { Page } from '@playwright/test';
import { API_URL, DEMO_USER } from '../playwright.config';
import { test, expect, openSection, signIn } from './fixtures';

/**
 * «Consola crypto» with the server's invented prices (CRYPTO_MARKET=demo in the config): the
 * chart and its layer chips, a long opened with its take profit and stop loss on its card, both
 * changed and the trade closed at once, a pending short cancelled, the panels in pages,
 * dollars, the panel «Learn before playing» with its tabs, the coins in pages, the zoom bar, the
 * words of the console in the guide and the layout on phones; the monthly season, a practice
 * portfolio, the ranking (everybody is in, with an alias) and the Premium comforts.
 */
const LEARN = 'Antes de empezar a jugar, aprende todo sobre el análisis de criptomonedas';

/** A panel of operations by the start of its title («Abiertas», «Pendientes», «Cerradas»). */
const panel = (page: Page, title: string) =>
  page.locator('section.cc-panel', {
    has: page.getByRole('heading', { name: new RegExp(`^${title} \\(`) }),
  });

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await openSection(page, 'Consola crypto');
});

test('opens a long with take profit and stop loss, changes them and closes it at once', async ({
  page,
}) => {
  await expect(page.getByRole('note', { name: 'Aviso importante' })).toContainText(
    'No es asesoramiento financiero'
  );
  await expect(page.getByText(/Precios inventados de demostración/)).toBeVisible();
  const chart = page.getByRole('img', { name: 'Gráfica de Bitcoin, velas de 1 hora' });
  await expect(chart.locator('canvas').first()).toBeVisible();
  await page.getByRole('radio', { name: '1 día' }).check();
  await expect(page.getByRole('img', { name: 'Gráfica de Bitcoin, velas de 1 día' })).toBeVisible();

  // The invented BTC price moves around 60.000 €: far from both.
  await page.getByLabel('Capital por operación').fill('100');
  await page.getByLabel(/^Take profit/).fill('100000');
  await page.getByLabel(/^Stop loss/).fill('30000');
  await expect(page.getByText('Todo listo. Revisa las cifras de abajo.')).toBeVisible();
  // The commission is explained before opening: amount and percentage, kind and reason.
  await expect(
    page.getByText(/Comisión simulada: .* \(0,1 %\) al abrir \+ otra similar al cerrar/)
  ).toBeVisible();
  const why = page.getByRole('button', { name: '¿Por qué hay comisión y de qué tipo es?' });
  await expect(why).toHaveAttribute('aria-expanded', 'false');
  await why.click();
  await expect(why).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText(/comisión porcentual fija sobre el importe/)).toBeVisible();
  await expect(page.getByText(/no se cobra dinero real/)).toBeVisible();
  await page.getByRole('button', { name: 'Abrir long' }).click();
  await expect(page.getByRole('heading', { name: 'Abiertas (1)' })).toBeVisible();

  // One row, with its take profit in green and its stop loss in red; not among the pending orders.
  const open = panel(page, 'Abiertas');
  const row = open.locator('.cc-trades > li');
  await expect(row).toHaveCount(1);
  const takeProfit = open.locator('.cc-exit-lines .cc-exit--takeProfit');
  const stopLoss = open.locator('.cc-exit-lines .cc-exit--stopLoss');
  await expect(takeProfit).toContainText('100.000,00 €');
  await expect(takeProfit).toContainText(/\+\d+,\d\d\s*%/);
  await expect(takeProfit.locator('.cc-exit-price')).toBeVisible();
  await expect(stopLoss).toContainText('30.000,00 €');
  await expect(open.locator('.cc-big')).toBeVisible();
  await expect(open.locator('.cc-cell--end .cc-sub')).toContainText(
    /^Precio: [+−]?\d.*Comisiones: /
  );
  const rowBox = await row.boundingBox();
  expect(rowBox!.height).toBeLessThan(110);
  // The rest opens in a second line: what it gives, the distances and the breakdown of the result.
  const details = open.getByRole('button', { name: /^Detalles/ });
  await expect(details).toHaveAttribute('aria-expanded', 'false');
  await details.click();
  await expect(details).toHaveAttribute('aria-expanded', 'true');
  const detail = open.locator('.cc-detail');
  await expect(detail).toContainText('Si cerraras ahora recibirías');
  await expect(detail.locator('.cc-exit--takeProfit')).toContainText('(el precio debe subir)');
  await expect(detail.locator('.cc-exit--takeProfit .pnl-pos')).toBeVisible();
  await expect(detail.locator('.cc-exit--stopLoss')).toContainText('(el precio debe bajar)');
  await expect(detail.locator('.cc-exit--stopLoss .pnl-neg')).toBeVisible();
  await expect(detail).toContainText('Resultado del precio');
  await expect(detail).toContainText('Comisiones (entrada + salida estimada)');
  await expect(detail).toContainText('Resultado neto');
  const colour = (part: typeof takeProfit) =>
    part.locator('dt').evaluate((el) => getComputedStyle(el).color);
  expect(await colour(takeProfit)).not.toEqual(await colour(stopLoss));
  await expect(page.getByRole('heading', { name: 'Pendientes (0)' })).toBeVisible();

  // Moved and removed, checked against the current price first.
  await open.getByRole('button', { name: /^Editar TP\/SL/ }).click();
  await open.getByLabel('Take profit (€)').fill('20000');
  await expect(open.getByText(/el take profit tiene que estar por encima/)).toBeVisible();
  await expect(open.getByRole('button', { name: 'Guardar TP/SL' })).toBeDisabled();
  await open.getByLabel('Take profit (€)').fill('110000');
  await open.getByLabel('Stop loss (€)').fill('');
  await open.getByRole('button', { name: 'Guardar TP/SL' }).click();
  await expect(takeProfit).toContainText('110.000,00 €');
  await expect(stopLoss).toContainText('—');
  await expect(stopLoss).not.toContainText('30.000');
  await expect(page.getByRole('heading', { name: 'Pendientes (0)' })).toBeVisible();

  // «Close trade» asks once more on the same button, then closes at the market price.
  await open.getByRole('button', { name: /^Cerrar operación/ }).click();
  await open.getByRole('button', { name: /^¿Seguro\? Sí, cerrar/ }).click();
  await expect(page.getByText(/Operación de BTC #1 cerrada al precio de mercado/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cerradas (1)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Abiertas (0)' })).toBeVisible();
});

test('keeps a pending short until it is cancelled', async ({ page }) => {
  await page.getByRole('radio', { name: /Osos \(Short\)/ }).check();
  await page.getByRole('radio', { name: 'Límite' }).check();
  await page.getByLabel('Capital por operación').fill('250');
  await page.getByLabel('Abrir si el precio sube a').fill('200000');
  await page.getByRole('button', { name: 'Abrir short' }).click();
  await expect(page.getByRole('heading', { name: 'Pendientes (1)' })).toBeVisible();
  // Only the orders that open a trade wait there, until the price reaches them.
  await expect(
    panel(page, 'Pendientes').getByText('Abrir short (límite)', { exact: true })
  ).toBeVisible();
  await expect(panel(page, 'Pendientes').getByText(/pasan a «Abiertas»/)).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar Abrir short (límite) BTC #1' }).click();
  await expect(page.getByRole('heading', { name: 'Pendientes (0)' })).toBeVisible();
});

test('shows dollars, a layer and the guide', async ({ page }) => {
  await page.getByRole('radio', { name: '$ USD' }).check();
  await expect(
    page.getByText(/conversión informativa al cambio de referencia del BCE de hoy \(1 € = /)
  ).toBeVisible();
  await expect(page.locator('.cc-quote-price')).toContainText('US$');
  const layers = page.getByRole('group', { name: 'Capas de la gráfica' });
  const ema = layers.getByRole('button', { name: /^EMA 20( ·|$)/ });
  await ema.click();
  await expect(ema).toHaveAttribute('aria-pressed', 'true');
  await expect(ema).toContainText(/EMA 20 · .*US\$/);
  await expect(page.getByText('Medias móviles')).toHaveCount(0);

  // A bar as wide as the chart, glowing until it is opened for the first time.
  const open = page.getByRole('button', { name: 'Aprende antes de jugar' });
  await expect(open).toHaveClass(/is-new/);
  const [bar, canvas] = await Promise.all([
    open.boundingBox(),
    page.locator('.cc-chart-canvas').boundingBox(),
  ]);
  expect(Math.abs(bar!.width - canvas!.width)).toBeLessThan(2);
  await open.click();
  await expect(open).toHaveAttribute('aria-expanded', 'true');
  await expect(open).not.toHaveClass(/is-new/);
  const guide = page.getByRole('region', { name: LEARN });
  await expect(guide.getByRole('heading', { name: LEARN })).toBeInViewport();
  await guide.getByRole('tab', { name: 'Toros y osos, Long y Short' }).click();
  await expect(guide.getByRole('heading', { name: 'Toros y osos: long y short' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(guide.getByRole('tab', { name: /^Órdenes/ })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await page.keyboard.press('Escape');
  await expect(open).toHaveAttribute('aria-expanded', 'false');
  await expect(guide.getByRole('tablist')).toBeHidden();
});

test('says when a coin comes from USDT, shows its dollars as they are and warns of little volume', async ({
  page,
}) => {
  // The demo invents prices in euros: the answers of NEAR are dressed as the real source's for a
  // coin quoted in USDT, converted at a made-up rate, with half its candles empty (no trades).
  await page.route('**/api/crypto/candles?*', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    if (body.symbol === 'NEAR') {
      body.quote = 'USDT';
      body.market = { ...body.market, source: 'binance', usdPerEur: 1.25 };
      body.candles = body.candles.map((c: Record<string, number>, i: number) =>
        i % 2 ? { ...c, high: c.open, low: c.open, close: c.open, volume: 0 } : c
      );
    }
    await route.fulfill({ response, json: body });
  });
  await page.evaluate(() =>
    localStorage.setItem('mm_crypto_view', JSON.stringify({ symbol: 'NEAR', interval: '5m' }))
  );
  await page.reload();
  await openSection(page, 'Consola crypto');
  await expect(page.getByRole('img', { name: /Gráfica de NEAR Protocol/ })).toBeVisible();
  await expect(
    page.getByText(
      /NEAR: precio convertido desde USDT al cambio de referencia del BCE de hoy \(1 € = 1,25 US\$; tomamos 1 USDT = 1 US\$\)/
    )
  ).toBeVisible();
  const thin = page.locator('.cc-chart-thin');
  await expect(thin).toHaveText(
    'Poco volumen en esta moneda: prueba una temporalidad mayor (1 h o 4 h).'
  );
  // The dollars use the rate of the data: the price in USDT again (euros × 1,25).
  const euros = await page.locator('.cc-quote-price').textContent();
  await page.getByRole('radio', { name: '$ USD' }).check();
  await expect(
    page.getByText(/NEAR: precio en USDT mostrado en dólares sin más conversión/)
  ).toBeVisible();
  await expect(page.getByText(/\(1 € = 1,25 US\$\); el simulador guarda/)).toBeVisible();
  const value = (text: string | null) => Number(text!.replace(/[^\d,]/g, '').replace(',', '.'));
  const dollars = await page.locator('.cc-quote-price').textContent();
  expect(value(dollars)).toBeCloseTo(value(euros) * 1.25, 1);
  // In full screen too.
  await page.locator('.cc-zoom--full').click();
  await expect(
    page.getByRole('dialog', { name: 'Gráfica en pantalla completa' }).locator('.cc-chart-thin')
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Gráfica en pantalla completa' })).toBeHidden();
});

test('pages the coins, zooms from the bar and opens the words of the console', async ({ page }) => {
  // As many whole rows as fit beside the chart, in pages: no scroll inside, no row cut in half.
  // Measured once the chart is drawn: until its code arrives the column is shorter (fewer rows).
  const coins = page.getByRole('navigation', { name: 'Monedas' });
  const rows = coins.getByRole('listitem');
  await expect(
    page
      .getByRole('img', { name: /Gráfica de Bitcoin/ })
      .locator('canvas')
      .first()
  ).toBeVisible();
  await expect(coins.getByText(/^1 \/ [2-9]$/)).toBeVisible();
  const perPage = await rows.count();
  expect(perPage).toBeGreaterThan(3);
  expect(perPage).toBeLessThan(20);
  const list = await coins.getByRole('list').boundingBox();
  const last = await rows.last().boundingBox();
  expect(last!.y + last!.height).toBeLessThanOrEqual(list!.y + list!.height + 1);
  await coins.getByRole('button', { name: /^Sig\./ }).click();
  await expect(coins.getByText(/^2 \/ [2-9]$/)).toBeVisible();
  await coins.getByRole('button', { name: /^Ant\./ }).click();
  await expect(coins.getByText(/^1 \/ [2-9]$/)).toBeVisible();
  await coins.getByRole('button', { name: /Ethereum/ }).click();
  await expect(page.getByRole('img', { name: /Gráfica de Ethereum/ })).toBeVisible();
  await page.getByRole('button', { name: 'Acercar' }).click();
  await page.getByRole('button', { name: 'Alejar' }).click();
  await page.getByRole('button', { name: 'Ver todo' }).click();
  await page.getByRole('button', { name: 'Lo más reciente' }).click();
  await expect(page.getByText(/Velas a la vista: \d+/)).toBeVisible();

  await page.getByRole('button', { name: 'Aprende todas las palabras importantes' }).last().click();
  const guide = page.getByRole('region', { name: LEARN });
  await expect(guide.getByRole('heading', { name: LEARN })).toBeInViewport();
  const words = guide.getByRole('region', { name: 'Palabras de la consola' });
  await words.getByRole('searchbox', { name: 'Buscar una palabra' }).fill('comisión');
  await expect(words.getByRole('term').first()).toHaveText('Comisión');
  await page.keyboard.press('Escape');
  await expect(words).toBeHidden();
});

test('keeps every coin on one line, so the pages fit with a wider font too', async ({ page }) => {
  // The fonts of Linux are wider than those of a Mac: «SHIB / EUR» wrapped onto a second line,
  // its row was taller and the last row of the page stuck out of the column.
  await page.addStyleTag({
    content: `.cc { --cc-num: Verdana, 'DejaVu Sans', sans-serif; font-family: Verdana, 'DejaVu Sans', sans-serif; }`,
  });
  const coins = page.getByRole('navigation', { name: 'Monedas' });
  await expect(
    page
      .getByRole('img', { name: /Gráfica de Bitcoin/ })
      .locator('canvas')
      .first()
  ).toBeVisible();
  await coins.getByRole('button', { name: /^Sig\./ }).click();
  const heights = await coins
    .getByRole('listitem')
    .evaluateAll((rows) => rows.map((r) => Math.round(r.getBoundingClientRect().height)));
  expect(new Set(heights).size).toBe(1);
  const list = await coins.getByRole('list').boundingBox();
  const last = await coins.getByRole('listitem').last().boundingBox();
  expect(last!.y + last!.height).toBeLessThanOrEqual(list!.y + list!.height + 1);
});

test('keeps candle sizes, currency, coin and zoom in the full screen chart', async ({ page }) => {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await page.locator('.cc-zoom--full').click();
    const full = page.getByRole('dialog', { name: 'Gráfica en pantalla completa' });
    await expect(full).toBeVisible();
    const canvas = full.getByRole('img', { name: /Gráfica de/ });
    // Everything is in reach and nothing covers the drawing.
    for (const control of [
      full.getByRole('radio', { name: '5 minutos', exact: true }),
      full.getByRole('radio', { name: '1 semana', exact: true }),
      full.getByRole('radio', { name: '$ USD' }),
      full.getByRole('combobox', { name: 'Cambiar de moneda' }),
      full.getByRole('button', { name: 'Acercar' }),
      full.getByRole('button', { name: 'Lo más reciente' }),
      full.getByRole('button', { name: 'Ver todo' }),
      full.getByRole('button', { name: 'Salir de pantalla completa' }),
    ]) {
      await expect(control).toBeVisible();
      await expect(control).toBeInViewport();
    }
    await expect(full.getByRole('button', { name: /Antes de empezar/ })).toHaveCount(0);
    const box = await canvas.boundingBox();
    expect(box!.height).toBeGreaterThan(size.height * 0.45);
    await full.getByRole('radio', { name: '1 día' }).check();
    await full.getByRole('combobox', { name: 'Cambiar de moneda' }).selectOption('ETH');
    await expect(
      full.getByRole('img', { name: 'Gráfica de Ethereum, velas de 1 día' })
    ).toBeVisible();
    await full.getByRole('radio', { name: '$ USD' }).check();
    await full.getByRole('button', { name: 'Acercar' }).click();
    await page.keyboard.press('Escape');
    await expect(full).toBeHidden();
    // What was chosen up there stays chosen down here.
    await expect(page.getByRole('radio', { name: '1 día' })).toBeChecked();
    await expect(page.getByRole('radio', { name: '$ USD' })).toBeChecked();
    await expect(page.getByRole('img', { name: /Gráfica de Ethereum/ })).toBeVisible();
    // Back to the starting point for the next size.
    await page.evaluate(() => localStorage.removeItem('mm_crypto_view'));
    await page.evaluate(() => localStorage.removeItem('mm_crypto_currency'));
    await page.reload();
    await openSection(page, 'Consola crypto');
    await expect(
      page.getByRole('img', { name: 'Gráfica de Bitcoin, velas de 1 hora' })
    ).toBeVisible();
  }
});

/**
 * Watches the console while it loads: whenever the real panel is not there yet, records any text
 * on screen (screen-reader words and the risk notice aside) with a figure or «Cargando», and when
 * the panel appears, whether the price, the figures of the day and the chart came all at once.
 */
async function watchLoading(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { leaks: string[]; arrival: string | null };
    w.leaks = [];
    w.arrival = null;
    const visibleText = (root: Element) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let text = '';
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement!;
        if (el.closest('.sr-only, .cc-risk') || !el.checkVisibility()) continue;
        text += `${n.textContent} `;
      }
      return text;
    };
    const check = () => {
      const cc = document.querySelector('.cc');
      if (!cc || w.arrival) return;
      const panel = cc.querySelector('section.cc-market');
      if (panel) {
        const price = panel.querySelector('.cc-quote-price')?.textContent ?? '';
        const stats = panel.querySelector('.cc-stats')?.textContent ?? '';
        const chart = panel.querySelector('[role="img"][aria-label^="Gráfica de"]');
        w.arrival = `${/\d/.test(price)} ${/\d/.test(stats)} ${!!chart}`;
        return;
      }
      const text = visibleText(cc);
      if (/\d|Cargando/.test(text)) w.leaks.push(text.trim().slice(0, 120));
    };
    new MutationObserver(check).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    check();
  });
}

test('shows only the blue outline of the panel until everything is there', async ({ page }) => {
  // The candles take their time: nothing of the console may show meanwhile.
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/api/crypto/candles**', async (route) => {
    await held;
    await route.continue();
  });
  await page.evaluate(() => localStorage.removeItem('mm_crypto_rotate_hint'));
  await page.reload();
  await watchLoading(page);
  await openSection(page, 'Consola crypto');
  const skeleton = page.getByRole('status').filter({ hasText: 'Cargando la consola…' });
  await expect(skeleton).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.cc-skel .cc-skel-canvas svg')).toBeVisible();
  // The outline in the accent blue, and as tall as the chart will be.
  const frame = page.locator('.cc-skel .cc-skel-canvas');
  expect((await frame.boundingBox())!.height).toBe(420);
  const skeletonBox = await page.locator('.cc-skel').boundingBox();
  await page.waitForTimeout(1500);
  await expect(page.getByRole('img', { name: /Gráfica de/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Bitcoin/ })).toHaveCount(0);
  release();
  await expect(
    page.getByRole('img', { name: 'Gráfica de Bitcoin, velas de 1 hora' })
  ).toBeVisible();
  await expect(page.locator('.cc-skeleton')).toHaveCount(0);
  const result = await page.evaluate(() => {
    const w = window as unknown as { leaks: string[]; arrival: string | null };
    return { leaks: w.leaks, arrival: w.arrival };
  });
  expect(result.leaks).toEqual([]);
  expect(result.arrival).toBe('true true true');
  // The panel takes the room of its outline: the same height, give or take a few pixels.
  const panelBox = await page.locator('section.cc-market').boundingBox();
  expect(Math.abs(panelBox!.height - skeletonBox!.height)).toBeLessThan(12);
  await page.unroute('**/api/crypto/candles**');

  // Another candle size veils only the chart: the panel stays and nothing old shows through.
  let next: () => void = () => undefined;
  const second = new Promise<void>((resolve) => (next = resolve));
  await page.route('**/api/crypto/candles**', async (route) => {
    await second;
    await route.continue();
  });
  await page.getByRole('radio', { name: '1 día' }).check();
  await expect(page.locator('.cc-chart-veil')).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Gráfica de Bitcoin, velas de 1 día' })
  ).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.cc-skeleton')).toHaveCount(0);
  await expect(page.getByText(/^Cargando/)).toHaveCount(0);
  next();
  await expect(page.locator('.cc-chart-veil')).toHaveCount(0);
  await page.unroute('**/api/crypto/candles**');
  await page.evaluate(() => localStorage.removeItem('mm_crypto_view'));
});

test('fits a phone upright and on its side without sideways scrolling', async ({ page }) => {
  for (const size of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await expect(page.getByRole('img', { name: /Gráfica de Bitcoin/ })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  }
});

test('keeps the console as wide and centred as the other screens, without sideways scrolling', async ({
  page,
}) => {
  const box = () => page.locator('main.main').boundingBox();
  for (const width of [1280, 1920, 2560]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.getByRole('img', { name: /Gráfica de Bitcoin/ })).toBeVisible();
    const crypto = await box();
    // The same container as «Resumen mensual»: at most ~1.2k px, equal margins either side.
    expect(crypto!.width).toBeLessThanOrEqual(1250);
    expect(Math.abs(crypto!.x - (width - crypto!.x - crypto!.width))).toBeLessThanOrEqual(20);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  }
});

test('season, practice portfolio, ranking and Premium comforts', async ({ page, pageErrors }) => {
  // The official season of this month, with its countdown; no commission notice before typing an
  // amount (it appears in «Before opening») and no free CSV.
  await expect(page.getByRole('heading', { name: /^Temporada de / })).toBeVisible();
  await expect(page.getByRole('timer').first()).toContainText(/Nueva temporada|último día/);
  await expect(page.getByText(/Comisión fija/)).toHaveCount(0);
  await expect(page.getByText('¿Qué es la comisión?')).toHaveCount(0);
  await expect(page.locator('section.cc-panel').getByRole('button', { name: /CSV/ })).toHaveCount(
    0
  );
  await expect(page.getByText('Tu historial y ajustes')).toHaveCount(0);

  // A practice portfolio: separate, restarted with its own button and deleted.
  await page.getByRole('button', { name: /^Cartera de prácticas$/ }).click();
  await expect(page.getByRole('heading', { name: 'Cartera de prácticas' })).toBeVisible();
  await page.getByLabel('Capital por operación').fill('100');
  await page.getByRole('button', { name: 'Abrir long' }).click();
  await expect(page.getByRole('heading', { name: 'Abiertas (1)' })).toBeVisible();
  await page.getByRole('button', { name: 'Empezar de nuevo con 100.000 €' }).click();
  await page.getByRole('button', { name: 'Sí, empezar de nuevo' }).click();
  await expect(page.getByRole('heading', { name: 'Abiertas (0)' })).toBeVisible();
  await page.getByRole('button', { name: 'Borrar esta cartera' }).click();
  await page.getByRole('button', { name: 'Sí, borrar' }).click();
  await expect(page.getByRole('heading', { name: /^Temporada de / })).toBeVisible();

  // The ranking: everybody is in with an alias (no switch), told once on entering.
  const ranking = page.locator('section.cc-ranking');
  await expect(ranking.getByRole('switch')).toHaveCount(0);
  await expect(ranking.getByText(/Si estás en el ranking del mes, se ve tu alias/)).toBeVisible();
  const intro = page.getByRole('complementary', { name: /En el ranking del mes saldrás como/ });
  await expect(intro).toContainText('Para entrar necesitas al menos 5 operaciones cerradas');
  await intro.getByRole('button', { name: 'Cambiar mi alias' }).click();
  await expect(intro).toHaveCount(0);
  await expect(ranking.getByLabel('Tu alias')).toBeFocused();
  await ranking.getByLabel('Tu alias').fill('Lince E2E');
  await ranking.getByRole('button', { name: 'Guardar alias' }).click();
  await expect(ranking.getByLabel('Tu alias')).toHaveValue('Lince E2E');
  await ranking.getByLabel('Tu alias').fill('yo@correo.es');
  await ranking.getByRole('button', { name: 'Guardar alias' }).click();
  await expect(ranking.getByRole('alert')).toContainText('correos');
  // The refused alias is the only error the browser logs (the 400 of the API).
  expect(pageErrors.splice(0)).toEqual([expect.stringContaining('400')]);

  // Premium (the demo user is on the trial): statistics and a price alert.
  await expect(page.getByRole('heading', { name: /Gratis y Premium en la consola/ })).toBeVisible();
  const alerts = page.locator('section.cc-alerts-card');
  await alerts.getByLabel('Precio (€)').fill('999999');
  await alerts.getByRole('button', { name: 'Crear aviso' }).click();
  await expect(alerts.getByText(/sube a/)).toBeVisible();
  await alerts.getByRole('button', { name: /Borrar el aviso de BTC/ }).click();
  await expect(alerts.getByText('Todavía no tienes avisos.')).toBeVisible();
});

test('gets into the ranking with five operations closed on the same day, with no days asked', async ({
  page,
  request,
}) => {
  const login = await request.post(`${API_URL}/auth/login`, { data: DEMO_USER });
  const { accessToken } = await login.json();
  const headers = { Authorization: `Bearer ${accessToken}` };
  const trades = async () =>
    (await (await request.get(`${API_URL}/crypto/ranking`, { headers })).json()).me
      .trades as number;
  /** A purchase and its sale at once, in the official portfolio (today, like all the others). */
  const roundTrip = async () => {
    const bought = await request.post(`${API_URL}/crypto/sim/orders`, {
      headers,
      data: { action: 'buy', symbol: 'BTC', type: 'market', amount: 10 },
    });
    const positionId = (await bought.json()).open[0].id;
    const sold = await request.post(`${API_URL}/crypto/sim/orders`, {
      headers,
      data: { action: 'sell', positionId, type: 'market' },
    });
    expect(sold.ok()).toBe(true);
  };
  const before = await trades();
  expect(before).toBeLessThan(5);
  for (let i = before; i < 4; i++) await roundTrip();
  await page.reload();
  await openSection(page, 'Consola crypto');
  const ranking = page.locator('section.cc-ranking');
  await expect(ranking.getByText('Te falta 1 operación para entrar al ranking.')).toBeVisible();
  await expect(
    ranking.getByRole('progressbar', { name: '4 de 5 operaciones cerradas' })
  ).toBeVisible();
  await ranking.getByText('Cómo funciona el ranking (bases)').click();
  await expect(ranking).toContainText(
    'Para entrar necesitas al menos 5 operaciones cerradas este mes en tu cartera oficial. Las carteras de prácticas no cuentan.'
  );
  await expect(ranking).not.toContainText(/días? con actividad/);

  // The fifth, on the same day: in at once, without waiting for the minute of the cache.
  await roundTrip();
  await page.reload();
  await openSection(page, 'Consola crypto');
  await expect(ranking.getByText(/^Vas en el puesto \d+ de \d+\.$/)).toBeVisible();
  await expect(ranking.getByRole('progressbar')).toHaveCount(0);
  await expect(ranking.getByText(/Te faltan? /)).toHaveCount(0);
});

test('numbers two operations per coin on rows and chart lines, and refuses a third', async ({
  page,
  request,
}) => {
  await page.evaluate(() =>
    localStorage.setItem('mm_crypto_view', JSON.stringify({ symbol: 'SOL', interval: '1h' }))
  );
  await page.reload();
  await openSection(page, 'Consola crypto');
  await expect(page.getByRole('img', { name: /Gráfica de Solana/ })).toBeVisible();
  const open = panel(page, 'Abiertas');
  const who = open.locator('.cc-who');
  const note = page.locator('.cc-slot-note');
  /** What a screen reader hears about the chart: its lines with their numbers. */
  const spoken = () =>
    page.locator('.cc-chart-canvas').evaluate((el) =>
      el
        .getAttribute('aria-describedby')!
        .split(' ')
        .map((id) => document.getElementById(id)!.textContent)
        .join(' ')
    );

  await page.getByLabel('Capital por operación').fill('100');
  await page.getByRole('button', { name: 'Abrir long' }).click();
  await expect(page.getByRole('heading', { name: 'Abiertas (1)' })).toBeVisible();
  await expect(who).toHaveText(['▲ LongSOL#1(operación 1)']);
  await expect(note).toHaveText('Ya tienes 1 de 2 operaciones de SOL; esta será la #2.');

  await page.getByRole('radio', { name: /Osos \(Short\)/ }).check();
  await page.getByLabel('Capital por operación').fill('100');
  await page.getByRole('button', { name: 'Abrir short' }).click();
  await expect(page.getByRole('heading', { name: 'Abiertas (2)' })).toBeVisible();
  await expect(who).toHaveText(['▼ ShortSOL#2(operación 2)', '▲ LongSOL#1(operación 1)']);
  await expect.poll(spoken).toContain('Entrada long #1');
  expect(await spoken()).toContain('Entrada short #2');
  await expect(page.locator('.cc-chart-slots')).toHaveText('Tus operaciones: #1 #2');

  // Two of two: the button is off with its reason, and the server refuses a third anyway.
  await page.getByLabel('Capital por operación').fill('100');
  const submit = page.getByRole('button', { name: 'Abrir short' });
  await expect(submit).toBeDisabled();
  await expect(submit).toHaveAccessibleDescription(
    'Ya tienes 2 de 2 operaciones de SOL: cierra o cancela una para abrir otra.'
  );
  const login = await request.post(`${API_URL}/auth/login`, { data: DEMO_USER });
  const { accessToken } = await login.json();
  const third = await request.post(`${API_URL}/crypto/sim/orders`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { action: 'buy', symbol: 'SOL', type: 'limit', price: 1, amount: 10 },
  });
  expect(third.status()).toBe(409);
  expect((await third.json()).code).toBe('CRYPTO_COIN_FULL');

  // Closing #1 frees its number: the next one is #1 again and the short keeps #2.
  await open.getByRole('button', { name: 'Cerrar operación (Long de SOL #1)' }).click();
  await open.getByRole('button', { name: '¿Seguro? Sí, cerrar (Long de SOL #1)' }).click();
  await expect(page.getByRole('heading', { name: 'Abiertas (1)' })).toBeVisible();
  await expect(note).toHaveText('Ya tienes 1 de 2 operaciones de SOL; esta será la #1.');
  await page.getByRole('radio', { name: /Toros \(Long\)/ }).check();
  await page.getByLabel('Capital por operación').fill('100');
  await page.getByRole('button', { name: 'Abrir long' }).click();
  await expect(page.getByRole('heading', { name: 'Abiertas (2)' })).toBeVisible();
  await expect(who).toHaveText(['▲ LongSOL#1(operación 1)', '▼ ShortSOL#2(operación 2)']);
  await expect(panel(page, 'Cerradas').locator('.cc-who').first()).toHaveText(
    '▲ LongSOL#1(operación 1)'
  );

  // Both closed again, so the next tests start from an empty panel.
  for (const name of ['Long de SOL #1', 'Short de SOL #2']) {
    await open.getByRole('button', { name: `Cerrar operación (${name})` }).click();
    await open.getByRole('button', { name: `¿Seguro? Sí, cerrar (${name})` }).click();
  }
  await expect(page.getByRole('heading', { name: 'Abiertas (0)' })).toBeVisible();
});

test('pages the open trades ten at a time and goes back a page when the last row goes', async ({
  page,
  request,
}) => {
  // Eleven small purchases through the API (two per coin at most), then the console shows them
  // in pages.
  const login = await request.post(`${API_URL}/auth/login`, { data: DEMO_USER });
  const { accessToken } = await login.json();
  const headers = { Authorization: `Bearer ${accessToken}` };
  const coins = ['ETH', 'BNB', 'XRP', 'ADA', 'DOGE', 'TRX'];
  for (let i = 0; i < 11; i++) {
    const bought = await request.post(`${API_URL}/crypto/sim/orders`, {
      headers,
      data: { action: 'buy', symbol: coins[i >> 1], type: 'market', amount: 10 },
    });
    expect(bought.ok()).toBe(true);
  }
  await page.reload();
  await openSection(page, 'Consola crypto');
  const open = panel(page, 'Abiertas');
  await expect(open.getByRole('heading')).toHaveText(/^Abiertas \(\d+\)$/);
  const count = Number((await open.getByRole('heading').textContent())!.replace(/\D/g, ''));
  expect(count).toBeGreaterThan(10);
  const rows = open.locator('.cc-trades > li');
  const pager = open.getByRole('navigation', { name: 'Páginas de operaciones abiertas' });
  await expect(rows).toHaveCount(10);
  await expect(pager).toContainText(`Página 1 de ${Math.ceil(count / 10)}`);
  await expect(pager.getByRole('button', { name: /^Ant\./ })).toBeDisabled();
  const last = Math.ceil(count / 10);
  for (let p = 2; p <= last; p++) await pager.getByRole('button', { name: /^Sig\./ }).click();
  await expect(pager).toContainText(`Página ${last} de ${last}`);
  await expect(rows).toHaveCount(count - (last - 1) * 10);

  // Closing every trade of the last page goes back to the page before.
  const onLast = count - (last - 1) * 10;
  for (let i = 0; i < onLast; i++) {
    await rows
      .first()
      .getByRole('button', { name: /^Cerrar operación/ })
      .click();
    await rows
      .first()
      .getByRole('button', { name: /^¿Seguro\? Sí, cerrar/ })
      .click();
    await expect(open.getByRole('heading')).toHaveText(`Abiertas (${count - i - 1})`);
  }
  await expect(rows).toHaveCount(10);
  if (last > 2) await expect(pager).toContainText(`Página ${last - 1} de ${last - 1}`);
  else await expect(pager).toHaveCount(0);
});

/**
 * Nobody invited yet and a place in the ranking (the demo has no month of trades behind it), so
 * the notice after something good can come.
 */
async function invitable(page: Page) {
  await page.route('**/api/referral', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, qualified: 0, pending: 0 } });
  });
  await page.route('**/api/crypto/ranking', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.me = { ...body.me, place: 3, qualified: true };
    await route.fulfill({ response, json: body });
  });
  await page.evaluate(() => {
    localStorage.setItem('mm_crypto_ranking_intro', '1');
    localStorage.removeItem('mm_crypto_invite_nudge');
  });
  await page.reload();
  await openSection(page, 'Consola crypto');
}

test('invites a friend from the ranking: the card, its link copied and a notice closed for good', async ({
  page,
  context,
  pageErrors,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await invitable(page);
  const card = page.getByRole('region', { name: 'Invita a un amigo y competid' });
  await expect(card).toContainText('recibe 30 días de Premium y tú sumas meses de Premium');
  await expect(card).toContainText('Operar en la consola no cuenta para la invitación.');
  // Only the random code of the invitation: nothing about the person.
  const link = card.getByLabel('Tu enlace de invitación');
  await expect(link).toHaveText(/^https:\/\/finanverso\.app\/\?ref=[A-Z2-9]{8}$/);
  await card.getByRole('button', { name: 'Copiar enlace' }).click();
  await expect(card.getByRole('button', { name: '¡Copiado!' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await link.textContent());
  await expect(card.getByRole('button', { name: 'Compartir' })).toBeVisible();

  // The notice: not a dialog, closed with «Ahora no» and not back after reloading.
  const notice = page.getByRole('complementary', {
    name: 'Ya tienes puesto en el ranking del mes',
  });
  await expect(notice).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await notice.getByRole('button', { name: 'Ahora no' }).click();
  await expect(notice).toHaveCount(0);
  await page.reload();
  await openSection(page, 'Consola crypto');
  await expect(card).toBeVisible();
  await expect(notice).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});
