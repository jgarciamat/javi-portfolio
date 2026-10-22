import { test, expect, openSection, signIn } from './fixtures';

/**
 * «Consola crypto» with the server's invented prices (CRYPTO_MARKET=demo in the config): the
 * chart and its layers, a long opened and closed with play money, a pending short cancelled,
 * dollars, the guide and the layout on phones.
 */
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
  const ema = page.getByRole('button', { name: 'EMA 20', exact: true });
  await ema.click();
  await expect(ema).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('list', { name: 'Valores de las capas encendidas' })).toContainText(
    'EMA 20'
  );
  await page.getByRole('button', { name: '¿Qué es cada cosa?' }).click();
  const guide = page.getByRole('dialog', { name: '¿Qué es cada cosa?' });
  await expect(guide.getByRole('heading', { name: 'Toros y osos: long y short' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(guide).toBeHidden();
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
