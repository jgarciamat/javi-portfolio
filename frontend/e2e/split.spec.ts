import { API_URL, DEMO_USER } from '../playwright.config';
import { expect, signIn, test } from './fixtures';

/** «Dividir entre varias cuentas»: 800 € = 500 € from one account + 300 € from another. */
test('splits a movement between two accounts and each one counts its part', async ({
  page,
  request,
}) => {
  const login = await request.post(`${API_URL}/auth/login`, { data: DEMO_USER });
  const headers = { Authorization: `Bearer ${(await login.json()).accessToken}` };
  const list = async () =>
    (await (await request.get(`${API_URL}/accounts`, { headers })).json()).accounts as {
      id: string;
      name: string;
      archived: boolean;
      balance: number;
    }[];
  // A second account to split with, unless the demo user has one already.
  if ((await list()).filter((a) => !a.archived).length < 2) {
    const res = await request.post(`${API_URL}/accounts`, {
      headers,
      data: { name: `Efectivo ${Date.now()}`, type: 'cash' },
    });
    expect(res.ok()).toBe(true);
  }
  const before = await list();

  await signIn(page);
  const description = `Cuenta común ${Date.now()}`;
  await page.getByRole('button', { name: /Nueva transacción/ }).click();
  await page.getByLabel('Descripción').fill(description);
  await page.getByLabel('Importe', { exact: true }).fill('800');
  await page.getByLabel('Categoría', { exact: true }).selectOption({ label: '🍔 Alimentación' });
  await page.getByRole('switch', { name: 'Dividir entre varias cuentas' }).check();
  await page.getByLabel('Importe de la cuenta 1').fill('500');
  // The second part takes what is left by itself, and the line says it adds up.
  await expect(page.getByLabel('Importe de la cuenta 2')).toHaveValue('300');
  await expect(page.getByRole('status').filter({ hasText: 'Cuadra' })).toBeVisible();
  const first = await page.getByLabel('Cuenta 1', { exact: true }).inputValue();
  const second = await page.getByLabel('Cuenta 2', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Guardar transacción' }).click();

  await expect(page.getByRole('button', { name: `Editar: ${description}` })).toBeVisible();
  const after = await list();
  const moved = (id: string) =>
    after.find((a) => a.id === id)!.balance - before.find((a) => a.id === id)!.balance;
  expect(moved(first)).toBeCloseTo(-500);
  expect(moved(second)).toBeCloseTo(-300);
});
