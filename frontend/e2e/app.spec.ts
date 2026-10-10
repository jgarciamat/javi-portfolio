import { expect, openSection, signIn, test } from './fixtures';

test.beforeEach(async ({ page }) => signIn(page));

test('adds a movement and edits it in a dialog that keeps the focus', async ({ page }) => {
  const description = `Cena ${Date.now()}`;
  await page.getByRole('button', { name: /Nueva transacción/ }).click();
  await page.getByLabel('Descripción').fill(description);
  await page.getByLabel('Importe', { exact: true }).fill('12.5');
  await page.getByLabel('Categoría...').selectOption({ label: '🍔 Alimentación' });
  await page.getByRole('button', { name: 'Guardar transacción' }).click();

  const edit = page.getByRole('button', { name: `Editar: ${description}` });
  await expect(edit).toBeVisible();
  await edit.click();
  const dialog = page.getByRole('dialog', { name: 'Editar transacción' });
  await expect(dialog).toBeVisible();

  // Tab never leaves the dialog, and Escape gives the focus back to the row.
  for (let i = 0; i < 15; i++) await page.keyboard.press('Tab');
  await expect(dialog.locator(':focus')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(edit).toBeFocused();
});

test('loads every section on demand', async ({ page }) => {
  for (const label of [
    'Balance anual',
    'Análisis',
    'Buscar',
    'Cuentas',
    'Presupuestos',
    'Metas',
    'Tu plan',
    'Ajustes',
  ]) {
    await openSection(page, label);
  }
});

test('warns while the connection is lost', async ({ page, context }) => {
  const banner = page.getByText('Sin conexión. Lo que hagas ahora no se guardará');
  await context.setOffline(true);
  await expect(banner).toBeVisible();
  await context.setOffline(false);
  await expect(banner).toBeHidden();
});

test('ticks a first step as soon as it is done in its section', async ({ page }) => {
  const steps = page.getByRole('region', { name: 'Primeros pasos' });
  const budgetStep = steps.locator('li', { hasText: 'Crea un presupuesto para una categoría' });
  await expect(budgetStep).not.toHaveClass(/is-done/);
  await budgetStep.getByRole('button', { name: 'Ir' }).click();
  await expect(page.getByRole('region', { name: 'Presupuestos' })).toBeVisible();

  await page
    .getByRole('spinbutton', { name: /^Límite para/ })
    .first()
    .fill('150');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toHaveCount(0);

  // Back in the month view, without reloading.
  await openSection(page, 'Resumen mensual');
  await expect(budgetStep).toHaveClass(/is-done/);
  await expect(budgetStep.getByRole('button', { name: 'Ir' })).toHaveCount(0);
});

test('the first steps stay until they are hidden, for good and on every device', async ({
  page,
}) => {
  const steps = page.getByRole('region', { name: 'Primeros pasos' });
  await expect(steps).toBeVisible();
  await steps.getByRole('button', { name: 'Ocultar' }).click();
  await expect(steps).toHaveCount(0);

  // Saved in the account: a new session on a clean device does not bring it back.
  await page.getByRole('button', { name: 'Salir' }).click();
  await page.evaluate(() => localStorage.clear());
  await signIn(page);
  await page.waitForTimeout(1500);
  await expect(steps).toHaveCount(0);
});
