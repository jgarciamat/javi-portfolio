import { test, expect, openSection, signIn } from './fixtures';

/**
 * «Consola crypto» with the server's invented prices (CRYPTO_MARKET=demo in the config): the
 * chart, a purchase and its sale with play money, and a pending order that is cancelled.
 */
test.beforeEach(async ({ page }) => {
  await signIn(page);
  await openSection(page, 'Consola crypto');
});

test('shows the risk notice and the chart, and buys and sells with play money', async ({
  page,
}) => {
  await expect(page.getByRole('note', { name: 'Aviso importante' })).toContainText(
    'No es asesoramiento financiero'
  );
  await expect(page.getByText(/Precios inventados de demostración/)).toBeVisible();
  const chart = page.getByRole('img', { name: 'Gráfica de Bitcoin, velas de 1 hora' });
  await expect(chart).toBeVisible();
  await expect(chart.locator('canvas').first()).toBeVisible();
  await page.getByRole('radio', { name: '1 día' }).check();
  await expect(page.getByRole('img', { name: 'Gráfica de Bitcoin, velas de 1 día' })).toBeVisible();

  await page.getByLabel('¿Cuántos euros ficticios quieres usar?').fill('100');
  await page.getByRole('button', { name: 'Comprar (simulado)' }).click();
  await expect(page.getByRole('heading', { name: 'Abiertas (1)' })).toBeVisible();
  await page.getByRole('button', { name: 'Vender ahora (simulado)' }).click();
  await expect(page.getByRole('heading', { name: 'Cerradas (1)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Abiertas (0)' })).toBeVisible();
});

test('keeps a limit purchase pending until it is cancelled', async ({ page }) => {
  await page.getByRole('radio', { name: /^Límite/ }).check();
  await page.getByLabel('¿Cuántos euros ficticios quieres usar?').fill('250');
  await page.getByLabel('Comprar si el precio baja a (€)').fill('1000');
  await page.getByRole('button', { name: 'Guardar la orden (simulada)' }).click();
  await expect(page.getByRole('heading', { name: 'Pendientes (1)' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar Compra límite BTC' }).click();
  await expect(page.getByRole('heading', { name: 'Pendientes (0)' })).toBeVisible();
});

test('fits a phone without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('img', { name: /Gráfica de Bitcoin/ })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
