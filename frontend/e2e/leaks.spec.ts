import { expect, openSection, signIn, test } from './fixtures';

test.beforeEach(async ({ page }) => signIn(page));

/** dd/mm/yyyy of a day `days` from today (the bank format of the import). */
function bankDate(days: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Day 3 of the month `back` months ago (the newest one already past). */
function monthDay(back: number): string {
  const now = new Date();
  const newest = now.getDate() >= 3 ? 0 : 1;
  return bankDate(0, new Date(now.getFullYear(), now.getMonth() - back - newest, 3));
}

// An invented statement: a gym charged every month for a year, a shop charged twice the same day
// and everyday spending around, so the check is complete. No real merchant or amount.
const rows = [
  'Fecha;Concepto;Importe',
  ...Array.from({ length: 12 }, (_, i) => `${monthDay(11 - i)};CUOTA GIMNASIO ALFA;-39,90`),
  `${bankDate(-20)};TIENDA ELECTRO BETA;-89,00`,
  `${bankDate(-20)};TIENDA ELECTRO BETA;-89,00`,
  ...Array.from(
    { length: 30 },
    (_, i) =>
      `${bankDate(-6 * i - 1)};Comercio ${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + ((i * 7) % 26))}z;-${20 + i},00`
  ),
];

test('a statement with repeating charges: the figure after importing, the section and a decision', async ({
  page,
}) => {
  const dialog = page.getByRole('dialog', { name: 'Importar movimientos' });
  await page
    .getByRole('button', { name: /Importar extracto|Importar mi banco/ })
    .first()
    .click();
  await expect(dialog.getByText(/últimos 12 meses en un solo archivo/)).toBeVisible();
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'extracto.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(rows.join('\n'), 'utf8'),
  });
  await dialog.getByRole('button', { name: 'Previsualizar' }).click();
  await dialog.getByRole('button', { name: /^Importar \d+$/ }).click();

  // The moment it matters most: what was found, with the way there.
  await expect(dialog.getByText(/Hemos revisado tus transacciones: unos .* al año/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Ver', exact: true }).click();
  await expect(dialog).toBeHidden();
  const section = page.getByRole('region', { name: 'Tu dinero perdido' });
  await expect(section.getByText('Esto te cuesta')).toBeVisible();

  const gym = section.getByRole('article', { name: /^CUOTA GIMNASIO ALFA/ });
  await expect(gym.getByText(/Se cobra cada mes desde .* \(12 cobros\)/)).toBeVisible();
  await expect(gym.getByText(/39,90\s€ al mes · unos 478\s€ al año/)).toBeVisible();
  const shop = section.getByRole('article', { name: /^TIENDA ELECTRO BETA/ });
  await expect(shop.getByText(/89,00\s€ cobrados dos veces/)).toBeVisible();

  // A decision: out of the list, «you're about to stop paying…», and back with «Undo».
  await gym.getByRole('button', { name: 'Quiero darlo de baja' }).click();
  await expect(page.getByText(/Entra en la web o la app del servicio/).first()).toBeVisible();
  await expect(section.getByText(/Vas a dejar de pagar unos 39\s€ al mes/)).toBeVisible();
  await expect(gym).toHaveCount(0);
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(section.getByRole('article', { name: /^CUOTA GIMNASIO ALFA/ })).toBeVisible();

  // The old card of Analysis now leads here.
  await openSection(page, 'Análisis');
  await page.getByRole('button', { name: 'Ir a Tu dinero perdido' }).click();
  await expect(page.getByRole('region', { name: 'Tu dinero perdido' })).toBeVisible();
});

test('a goal says when it is reached and tries «what if I put aside more?»', async ({ page }) => {
  await openSection(page, 'Metas');
  await page.getByRole('textbox', { name: /^Nombre/ }).fill('Viaje de prueba');
  await page.getByRole('spinbutton', { name: 'Objetivo' }).fill('3000');
  await page.getByRole('button', { name: 'Crear meta' }).click();
  const goal = page.locator('.goal-card', { hasText: 'Viaje de prueba' });
  // Without a saving pace yet, it asks.
  await goal.getByRole('spinbutton', { name: /Dinos cuánto piensas apartar/ }).fill('120');
  await goal.getByRole('button', { name: 'Calcular' }).click();
  await expect(goal.getByText(/Apartando 120\s€\/mes llegas en/)).toBeVisible();
  await goal.getByRole('button', { name: /¿Y si aparto más\?/ }).click();
  const sheet = page.getByRole('dialog', { name: '¿Y si apartas más cada mes?' });
  await sheet.getByRole('button', { name: /^\+50/ }).click();
  await expect(sheet.getByText(/meses antes/)).toBeVisible();
  await sheet.getByRole('button', { name: 'Cerrar' }).click();
  await expect(sheet).toBeHidden();
});
