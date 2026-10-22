import { test, expect, openSection, signIn } from './fixtures';

/**
 * «Consola crypto» with the server's invented prices (CRYPTO_MARKET=demo in the config): the
 * chart and its layer chips, a long opened and closed with play money, a pending short cancelled,
 * dollars, the panel «Learn before playing» with its tabs, the coins in pages, the zoom bar, the
 * words of the console in the guide and the layout on phones; the monthly season, a practice
 * portfolio, the voluntary ranking and the Premium comforts.
 */
const LEARN = 'Antes de empezar a jugar, aprende todo sobre el análisis de criptomonedas';

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await openSection(page, 'Consola crypto');
});

test('opens and closes a long with play money', async ({ page }) => {
  await expect(page.getByRole('note', { name: 'Aviso importante' })).toContainText(
    'No es asesoramiento financiero'
  );
  await expect(page.getByText(/Precios inventados de demostración/)).toBeVisible();
  const chart = page.getByRole('img', { name: 'Gráfica de Bitcoin, velas de 1 hora' });
  await expect(chart.locator('canvas').first()).toBeVisible();
  await page.getByRole('radio', { name: '1 día' }).check();
  await expect(page.getByRole('img', { name: 'Gráfica de Bitcoin, velas de 1 día' })).toBeVisible();

  await page.getByLabel('Capital por operación').fill('100');
  await expect(page.getByText('Todo listo. Revisa las cifras de abajo.')).toBeVisible();
  await page.getByRole('button', { name: 'Abrir long' }).click();
  await expect(page.getByRole('heading', { name: 'Abiertas (1)' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar ahora (simulado)' }).click();
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

  const open = page.getByRole('button', { name: 'Aprende antes de jugar' });
  await open.click();
  await expect(open).toHaveAttribute('aria-expanded', 'true');
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

  // The voluntary ranking: off by default, on with an alias, then off again.
  const ranking = page.locator('section.cc-ranking');
  const toggle = ranking.getByRole('switch', { name: 'Aparecer en el ranking' });
  await expect(toggle).not.toBeChecked();
  await ranking.getByLabel('Tu alias').fill('Lince E2E');
  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect(ranking.getByLabel('Tu alias')).toHaveValue('Lince E2E');
  await ranking.getByLabel('Tu alias').fill('yo@correo.es');
  await ranking.getByRole('button', { name: 'Guardar alias' }).click();
  await expect(ranking.getByRole('alert')).toContainText('correos');
  // The refused alias is the only error the browser logs (the 400 of the API).
  expect(pageErrors.splice(0)).toEqual([expect.stringContaining('400')]);
  await ranking.getByLabel('Tu alias').fill('Lince E2E');
  await toggle.click();
  await expect(toggle).not.toBeChecked();

  // Premium (the demo user is on the trial): statistics and a price alert.
  await expect(page.getByRole('heading', { name: /Gratis y Premium en la consola/ })).toBeVisible();
  const alerts = page.locator('section.cc-alerts-card');
  await alerts.getByLabel('Precio (€)').fill('999999');
  await alerts.getByRole('button', { name: 'Crear aviso' }).click();
  await expect(alerts.getByText(/sube a/)).toBeVisible();
  await alerts.getByRole('button', { name: /Borrar el aviso de BTC/ }).click();
  await expect(alerts.getByText('Todavía no tienes avisos.')).toBeVisible();
});
