import { expect, signIn, test } from './fixtures';

test.beforeEach(async ({ page }) => signIn(page));

// An invented statement: unique descriptions per run, so re-runs on a used database still import.
const run = Date.now();
const csv = [
  'Fecha;Concepto;Importe',
  `05/03/2026;Supermercado Inventado ${run};-23,40`,
  `06/03/2026;Nomina Empresa Ficticia ${run};1500,00`,
  `07/03/2026;Gasolinera Imaginaria ${run};-40,00`,
].join('\n');

test('imports a bank statement: preview first, then the movements, and a second import finds them as duplicates', async ({
  page,
}) => {
  const dialog = page.getByRole('dialog', { name: 'Importar movimientos' });
  const open = async () => {
    await page.getByRole('button', { name: /Importar extracto/ }).click();
    await expect(dialog).toBeVisible();
  };
  await open();

  const upload = () =>
    dialog.locator('input[type="file"]').setInputFiles({
      name: 'extracto.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf8'),
    });
  await upload();
  await expect(dialog.getByText('3 movimientos leídos')).toBeVisible();

  // The AI is off by default and nothing is saved by previewing.
  await dialog.getByRole('button', { name: 'Previsualizar' }).click();
  await expect(dialog.getByText(/Se importarán 3 movimientos · 0 ya existían/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Importar 3' }).click();
  await expect(dialog.getByText(/Importados 3 movimientos \(0 duplicados omitidos\)/)).toBeVisible();

  // The same file again: everything is recognised as already imported.
  await dialog.getByRole('button', { name: 'Cerrar', exact: true }).last().click();
  await expect(dialog).toBeHidden();
  await open();
  await upload();
  await dialog.getByRole('button', { name: 'Previsualizar' }).click();
  await expect(dialog.getByText(/Se importarán 0 movimientos · 3 ya existían/)).toBeVisible();
});
