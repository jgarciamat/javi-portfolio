import { expect, openSection, signIn, test } from './fixtures';
import { readFileSync } from 'node:fs';
import { walkWizard } from './wizard';

test.beforeEach(async ({ page }) => signIn(page));

test('the Renta assistant goes through the nine steps, in order, to the official-model preview and the PDF', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openSection(page, 'Renta (IRPF)');
  const steps = page.getByRole('navigation', { name: 'Pasos' });

  // Steps are locked until the one before is done.
  await expect(steps.getByRole('button', { name: /^Paso 2:/ })).toBeDisabled();
  await page.getByRole('button', { name: 'No lo tengo, sigo sin él' }).click();

  const last = page.getByRole('button', { name: 'Terminar ✓', exact: true });
  const asked = await walkWizard(page, { until: last });
  expect(asked[0]).toBe('¿En qué comunidad vives?');
  expect(asked.length).toBeGreaterThan(15);
  await expect(page.getByText('89 % hecho')).toBeVisible();

  // The result: how to file it (the app never files) and the model as the official form.
  await expect(page.getByText('Finanverso no presenta nada por ti')).toBeVisible();
  const model = page.getByRole('region', { name: 'Modelo 100 · Declaración de la Renta' });
  await model.getByRole('button', { name: 'Ver vista previa' }).click();
  await expect(model.getByRole('button', { name: 'Ocultar vista previa' })).toBeVisible();
  await expect(model.locator('canvas')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15_000 }),
    model.getByRole('button', { name: 'Descargar PDF' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('modelo-100-2025-vista-previa.pdf');
  expect(
    readFileSync((await download.path())!)
      .subarray(0, 5)
      .toString()
  ).toBe('%PDF-');

  await last.click();
  await expect(steps.getByRole('button', { name: /^Paso 9:/ })).toBeEnabled();
});
