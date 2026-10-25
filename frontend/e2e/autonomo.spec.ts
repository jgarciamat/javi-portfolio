import { readFileSync } from 'node:fs';
import { expect, openSection, signIn, test } from './fixtures';
import { walkWizard } from './wizard';

// The page's calendar is pinned to a day of the 3rd quarter's filing window (15 October 2026), so
// the years offered (last, this and next) and the warnings of past quarters do not depend on the
// day the suite runs. The clock keeps running from there; the server keeps its own.
const TODAY = new Date('2026-10-15T10:00:00+02:00');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: TODAY });
  await signIn(page);
});

// An invented issued-invoices book (semicolon CSV, as a Spanish Excel saves it): three invoices of
// the 3rd quarter of 2026. VAT: 3000 at 21 % + 500 at 10 % = 680. IRPF: 20 % of 3500, minus the
// 150 withheld by a client = 550.
const book = [
  'Fecha expedición;Cliente;Base imponible;Tipo de IVA;Importe retenido del IRPF',
  '15/07/2026;Cliente Inventado SL;1000,00;21;150,00',
  '20/08/2026;Estudio Imaginario SA;2000,00;21;0',
  '10/09/2026;Taller Ficticio SL;500,00;10;0',
].join('\n');

test('the self-employed assistant imports an invoice book and prepares the quarter (303 and 130), with previews and downloads', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openSection(page, 'Autónomos');
  const steps = page.getByRole('navigation', { name: 'Pasos' });
  await expect(steps.getByRole('button', { name: /^Paso 2:/ })).toBeDisabled();

  const asked = await walkWizard(page, {
    until: page.getByRole('heading', { name: 'Prepara tu Renta' }),
    hooks: {
      // The year and the quarter do not depend on the day the test runs.
      '¿Qué trimestre quieres preparar?': async (card) => {
        await card.getByRole('combobox', { name: 'Año del borrador' }).selectOption('2026');
        await card
          .getByRole('combobox', { name: 'Trimestre' })
          .selectOption({ label: '3.º trimestre' });
      },
      '¿Cómo quieres traer tus facturas?': async (card) => {
        await card.locator('label').filter({ hasText: 'Subo archivos' }).click();
        await card.locator('input[type="file"]').setInputFiles({
          name: 'emitidas.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from(book, 'utf8'),
        });
        await expect(page.getByText('Importadas 3 facturas emitidas de 2026 (T3).')).toBeVisible();
      },
      // The invoices already fill the quarter: nothing typed on top of them.
      'Tus ingresos y gastos': async () => {},
      'Calcula tu 130': async (card) => {
        await card.getByRole('button', { name: 'Preparar mi borrador' }).click();
        await expect(page.getByText(/IVA \(303\): a pagar 680,00\s€/)).toBeVisible();
        await expect(page.getByText(/IRPF \(130\): a pagar 550,00\s€/)).toBeVisible();
        const sheet = page.getByRole('row', { name: /^27 Total cuota devengada/ });
        await expect(sheet).toContainText(/680,00\s€/);
      },
      'Revisión final': async (card) => {
        await expect(card.getByText('Facturas importadas: 3')).toBeVisible();
        // The warnings do not block: the other quarters have no income and the person goes on.
        await expect(card.getByText(/El 1\.º trimestre no tiene ingresos/)).toBeVisible();
      },
      'Descarga lo que necesitas': async (card) => {
        const model303 = card.getByRole('region', { name: 'Modelo 303 · IVA' });
        await model303.getByRole('button', { name: 'Ver vista previa' }).click();
        await expect(model303.getByRole('button', { name: 'Ocultar vista previa' })).toBeVisible();
        await expect(model303.locator('canvas')).toBeVisible();

        const [pdf] = await Promise.all([
          page.waitForEvent('download', { timeout: 15_000 }),
          model303.getByRole('button', { name: 'Descargar PDF' }).click(),
        ]);
        expect(
          readFileSync((await pdf.path())!)
            .subarray(0, 5)
            .toString()
        ).toBe('%PDF-');

        // The file for the AEAT site asks for the declarant's data first (it is never sent anywhere).
        const sede = card.getByRole('region', {
          name: 'Fichero para la sede de la Agencia Tributaria',
        });
        await sede.getByRole('button', { name: 'Descargar fichero para la sede' }).click();
        await expect(sede.getByText(/no se envían a Finanverso/)).toBeVisible();
        await expect(sede.getByLabel('NIF')).toBeVisible();
      },
    },
  });

  expect(asked).toContain('Calcula tu 130 y tu 303');
});

test('typed totals work without files: the quarter is worked out from them', async ({ page }) => {
  test.setTimeout(120_000);
  await openSection(page, 'Autónomos');
  await walkWizard(page, {
    until: page.getByRole('heading', { name: 'Prepara tu Renta' }),
    hooks: {
      '¿Qué trimestre quieres preparar?': async (card) => {
        await card.getByRole('combobox', { name: 'Año del borrador' }).selectOption('2026');
        await card
          .getByRole('combobox', { name: 'Trimestre' })
          .selectOption({ label: '1.º trimestre' });
      },
      '¿Cómo quieres traer tus facturas?': async (card) => {
        await card.locator('label').filter({ hasText: 'Escribo los totales a mano' }).click();
      },
      'Tus ingresos y gastos del trimestre 1': async (card) => {
        await card.getByRole('textbox', { name: 'Ingresos sin IVA al 21 % 1' }).fill('1000');
      },
      'Calcula tu 130': async (card) => {
        await card.getByRole('button', { name: 'Preparar mi borrador' }).click();
        await expect(page.getByText(/IVA \(303\): a pagar 210,00\s€/)).toBeVisible();
        await expect(page.getByText(/IRPF \(130\): a pagar 200,00\s€/)).toBeVisible();
      },
    },
  });
});
