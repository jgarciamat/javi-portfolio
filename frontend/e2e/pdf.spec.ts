import { readFileSync } from 'node:fs';
import { API_URL, DEMO_USER } from '../playwright.config';
import { expect, signIn, test } from './fixtures';

/**
 * The PDF of the month: a movement is added through the API (an invented one, unique per run) and
 * «Descargar mes (PDF)» saves a real PDF named `finanverso_mes_<year-month>_<today>.pdf`.
 */
test('downloads the PDF of the month', async ({ page, request }) => {
  const login = await request.post(`${API_URL}/auth/login`, { data: DEMO_USER });
  const { accessToken } = await login.json();
  const headers = { Authorization: `Bearer ${accessToken}` };
  const categories: { name: string }[] = await (
    await request.get(`${API_URL}/categories`, { headers })
  ).json();
  const created = await request.post(`${API_URL}/transactions`, {
    headers,
    data: {
      description: `Café inventado ${Date.now()}`,
      amount: 2.4,
      type: 'EXPENSE',
      category: categories[0].name,
    },
  });
  expect(created.ok()).toBe(true);

  await signIn(page);
  const button = page.getByRole('button', { name: 'Descargar mes (PDF)' });
  await expect(button).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
  expect(download.suggestedFilename()).toMatch(
    /^finanverso_mes_\d{4}-\d{2}_\d{4}-\d{2}-\d{2}\.pdf$/
  );
  const file = readFileSync(await download.path());
  expect(file.subarray(0, 5).toString('latin1')).toBe('%PDF-');
});
