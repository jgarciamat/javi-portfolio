import { buildXlsx } from '../scripts/xlsx';
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
    await page
      .getByRole('button', { name: /Importar extracto|Importar mi banco/ })
      .first()
      .click();
    await expect(dialog).toBeVisible();
  };
  await open();

  // The app's own button, the browser's field hidden behind it.
  await expect(dialog.getByRole('button', { name: 'Elegir fichero' })).toBeVisible();
  await expect(dialog.getByText(/Excel \(\.xlsx, \.xlsm\), CSV, Norma 43/)).toBeVisible();
  const upload = () =>
    dialog.getByLabel('Elegir fichero').setInputFiles({
      name: 'extracto.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf8'),
    });
  await upload();
  await expect(dialog.getByText('extracto.csv · CSV · 3 movimientos leídos')).toBeVisible();

  // The AI is off by default (its label next to the box) and nothing is saved by previewing.
  await expect(
    dialog.getByRole('checkbox', { name: 'Sugerir categorías con IA' })
  ).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Previsualizar' }).click();
  await expect(dialog.getByText(/Se importarán 3 movimientos · 0 ya existían/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Importar 3' }).click();
  await expect(
    dialog.getByRole('heading', { name: 'Listo: 3 transacciones importadas' })
  ).toBeVisible();

  // The same file again: everything is recognised as already imported.
  await dialog.getByRole('button', { name: 'Cerrar', exact: true }).last().click();
  await expect(dialog).toBeHidden();
  await open();
  await upload();
  await dialog.getByRole('button', { name: 'Previsualizar' }).click();
  await expect(dialog.getByText(/Se importarán 0 movimientos · 3 ya existían/)).toBeVisible();
});

test('names an Excel statement as Excel, also with macros', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: 'Importar movimientos' });
  await page
    .getByRole('button', { name: /Importar extracto|Importar mi banco/ })
    .first()
    .click();
  const workbook = buildXlsx([
    {
      name: 'Movimientos',
      rows: [
        ['Fecha', 'Concepto', 'Importe'],
        [{ date: '2026-03-08' }, `Ferreteria Inventada ${run}`, -9.95],
        [{ date: '2026-03-09' }, `Kiosco Ficticio ${run}`, -1.2],
      ],
    },
  ]);
  await dialog.getByLabel('Elegir fichero').setInputFiles({
    name: 'extracto.xlsm',
    mimeType: 'application/vnd.ms-excel.sheet.macroEnabled.12',
    buffer: Buffer.from(workbook),
  });
  await expect(dialog.getByText('extracto.xlsm · Excel · 2 movimientos leídos')).toBeVisible();
  await expect(dialog.getByText(/· CSV ·/)).toHaveCount(0);
});

test('pastes the movements copied from the bank app, corrects one and imports them', async ({
  page,
}) => {
  const dialog = page.getByRole('dialog', { name: 'Importar movimientos' });
  await page
    .getByRole('button', { name: /Importar extracto|Importar mi banco/ })
    .first()
    .click();
  await dialog.getByRole('tab', { name: /Pegar texto/ }).click();
  await dialog
    .getByLabel('Pega aquí tus movimientos')
    .fill(
      [
        '05/03/2026',
        `Panadería Inventada ${run}`,
        '-2,40 €',
        `Bizum Ficticio ${run}`,
        '+15,00 €',
      ].join('\n')
    );
  await dialog.getByRole('button', { name: /Leer movimientos/ }).click();
  await expect(dialog.getByText('2 movimientos leídos')).toBeVisible();
  const amount = dialog.getByLabel(`Importe Panadería Inventada ${run}`);
  await amount.fill('2,60');
  await amount.blur();
  await dialog.getByRole('button', { name: 'Previsualizar' }).click();
  await expect(dialog.getByText(/Se importarán 2 movimientos · 0 ya existían/)).toBeVisible();
  await expect(dialog.getByText('-2,60 €')).toBeVisible();
  await dialog.getByRole('button', { name: 'Importar 2' }).click();
  await expect(
    dialog.getByRole('heading', { name: 'Listo: 2 transacciones importadas' })
  ).toBeVisible();
});

/**
 * An invented screenshot of a bank app (light theme, a day above each block), with its header: a
 * greeting, the big balance, «Saldo disponible» and the tabs, none of which is a movement.
 */
const bankApp = `<!doctype html><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;margin:0;width:390px;color:#111}
.top{padding:16px}.big{font-size:30px;font-weight:700}
.day{background:#f4f4f4;color:#666;font-size:13px;padding:8px 16px}
.row{display:flex;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #eee;font-size:15px}
</style>
<div class="top"><div>Hola, Lucía</div><div class="big">+2.186,32 €</div><div>Saldo disponible</div></div>
<div class="top">Movimientos | Tarjetas</div>
<div class="day">5 MAR</div>
<div class="row"><span>FRUTERIA INVENTADA ${run % 1000}</span><b>-7,35 €</b></div>
<div class="row"><span>LIBRERIA FICTICIA</span><b>-12,90 €</b></div>
<div class="day">6 MAR</div>
<div class="row"><span>DEVOLUCION TIENDA</span><b>+19,99 €</b></div>`;

test('reads a screenshot of the bank app on the device and imports its movements', async ({
  page,
  context,
}) => {
  // Reading an image on a slow runner can take longer than the default 30 s.
  test.setTimeout(120_000);
  const painter = await context.newPage();
  await painter.setViewportSize({ width: 390, height: 600 });
  await painter.setContent(bankApp);
  const png = await painter.locator('body').screenshot();
  await painter.close();

  const uploads: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET') uploads.push(r.url());
  });
  const dialog = page.getByRole('dialog', { name: 'Importar movimientos' });
  await page
    .getByRole('button', { name: /Importar extracto|Importar mi banco/ })
    .first()
    .click();
  await dialog.getByRole('tab', { name: /Captura/ }).click();
  await expect(dialog.getByText(/la imagen no sale de él/)).toBeVisible();
  await dialog
    .getByLabel('Elegir captura de pantalla')
    .setInputFiles({ name: 'captura.png', mimeType: 'image/png', buffer: png });
  await expect(dialog.getByText('3 movimientos leídos')).toBeVisible({ timeout: 60_000 });
  // Nothing was sent while reading: the first request is the preview.
  expect(uploads).toEqual([]);
  await expect(dialog.getByLabel('Importe LIBRERIA FICTICIA')).toHaveValue('12,90');
  await expect(dialog.getByLabel('Importe DEVOLUCION TIENDA')).toHaveValue('19,99');
});
