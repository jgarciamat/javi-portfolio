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
