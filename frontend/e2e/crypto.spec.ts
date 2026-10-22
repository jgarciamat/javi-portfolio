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
  await page.getByLabel('Take profit (opcional)').fill('100000');
  await page.getByLabel('Stop loss (opcional)').fill('30000');
  await expect(page.getByText('Todo listo. Revisa las cifras de abajo.')).toBeVisible();
  await page.getByRole('button', { name: 'Abrir long' }).click();
  await expect(page.getByRole('heading', { name: 'Abiertas (1)' })).toBeVisible();

  // On the card, green and red; not among the pending orders.
  const open = panel(page, 'Abiertas');
  const takeProfit = open.locator('.cc-exit--takeProfit');
  const stopLoss = open.locator('.cc-exit--stopLoss');
  await expect(takeProfit).toContainText('100.000,00 €');
  await expect(takeProfit).toContainText(/\+\d+,\d\d\s*% del precio actual/);
  await expect(takeProfit.locator('.pnl-pos')).toBeVisible();
  await expect(takeProfit).toContainText('(el precio debe subir)');
  await expect(stopLoss).toContainText('(el precio debe bajar)');
  // The result is explained: price, commissions (entry + estimated exit) and net.
  const breakdown = open.locator('.cc-breakdown');
  await expect(breakdown).toContainText('Resultado del precio');
  await expect(breakdown).toContainText('Comisiones (entrada + salida estimada)');
  await expect(breakdown).toContainText('Resultado neto');
  await expect(open.locator('.cc-price-result')).toContainText(/^Precio: [+−]?\d/);
  await expect(stopLoss).toContainText('30.000,00 €');
  await expect(stopLoss.locator('.pnl-neg')).toBeVisible();
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
  await expect(stopLoss).toHaveText(/^Stop loss\s*—$/);
  await expect(page.getByRole('heading', { name: 'Pendientes (0)' })).toBeVisible();

  // «Close trade» asks once more on the same button, then closes at the market price.
  await open.getByRole('button', { name: /^Cerrar operación/ }).click();
  await open.getByRole('button', { name: /^¿Seguro\? Sí, cerrar/ }).click();
  await expect(page.getByText(/Operación de BTC cerrada al precio de mercado/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cerradas (1)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Abiertas (0)' })).toBeVisible();
});

test('keeps a pending short until it is cancelled', async ({ page }) => {
  await page.getByRole('radio', { name: /Osos · Short/ }).check();
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
  await page.getByRole('button', { name: 'Cancelar Abrir short (límite) BTC' }).click();
  await expect(page.getByRole('heading', { name: 'Pendientes (0)' })).toBeVisible();
});

test('shows dollars, a layer and the guide', async ({ page }) => {
  await page.getByRole('radio', { name: '$ USD' }).check();
  await expect(page.getByText(/Conversión informativa al cambio del BCE de hoy/)).toBeVisible();
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

test('pages the coins, zooms from the bar and opens the words of the console', async ({ page }) => {
  // As many whole rows as fit beside the chart, in pages: no scroll inside, no row cut in half.
  const coins = page.getByRole('navigation', { name: 'Monedas' });
  const rows = coins.getByRole('listitem');
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

test('season, practice portfolio, ranking and Premium comforts', async ({ page, pageErrors }) => {
  // The official season of this month, with its countdown; no commission notice and no free CSV.
  await expect(page.getByRole('heading', { name: /^Temporada de / })).toBeVisible();
  await expect(page.getByRole('timer').first()).toContainText(/Nueva temporada|último día/);
  await expect(page.getByText(/Comisión fija/)).toHaveCount(0);
  await expect(page.getByText('¿Qué es la comisión?')).toHaveCount(0);
  await expect(page.locator('section.cc-panel').getByRole('button', { name: /CSV/ })).toHaveCount(
    0
  );
  await expect(page.getByText('Tu historial y ajustes')).toHaveCount(0);

  // A practice portfolio: separate, restarted with its own button and deleted.
  await page.getByRole('button', { name: /Nueva cartera de prácticas/ }).click();
  await expect(page.getByRole('heading', { name: 'Cartera de prácticas' })).toBeVisible();
  await page.getByLabel('Capital por operación').fill('100');
  await page.getByRole('button', { name: 'Abrir long' }).click();
  await expect(page.getByRole('heading', { name: 'Abiertas (1)' })).toBeVisible();
  await page.getByRole('button', { name: 'Empezar de nuevo con 10.000 €' }).click();
  await page.getByRole('button', { name: 'Sí, empezar de nuevo' }).click();
  await expect(page.getByRole('heading', { name: 'Abiertas (0)' })).toBeVisible();
  await page.getByRole('button', { name: 'Borrar esta cartera' }).click();
  await page.getByRole('button', { name: 'Sí, borrar' }).click();
  await expect(page.getByRole('heading', { name: /^Temporada de / })).toBeVisible();

  // The ranking: everybody is in with an alias (no switch), told once on entering.
  const ranking = page.locator('section.cc-ranking');
  await expect(ranking.getByRole('switch')).toHaveCount(0);
  await expect(ranking.getByText(/Tu alias aparece en el ranking del mes/)).toBeVisible();
  const intro = page.getByRole('complementary', { name: /Apareces en el ranking del mes/ });
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

test('pages the open trades ten at a time and goes back a page when the last row goes', async ({
  page,
  request,
}) => {
  // Eleven small purchases through the API, then the console shows them in pages.
  const login = await request.post(`${API_URL}/auth/login`, { data: DEMO_USER });
  const { accessToken } = await login.json();
  const headers = { Authorization: `Bearer ${accessToken}` };
  for (let i = 0; i < 11; i++) {
    const bought = await request.post(`${API_URL}/crypto/sim/orders`, {
      headers,
      data: { action: 'buy', symbol: 'ETH', type: 'market', amount: 10 },
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
