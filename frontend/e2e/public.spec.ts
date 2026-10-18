import { expect, test } from './fixtures';

test('shows the presentation page to visitors without a session, with a way in', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Controla tu dinero sin hojas de cálculo' })
  ).toBeVisible();
  await page.getByRole('link', { name: 'Ya tengo cuenta' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Iniciar sesión', exact: true })).toBeVisible();
});

test('shows the plans to anyone', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByRole('heading', { name: 'Planes' })).toBeVisible();
  await expect(page.getByText(/3,49/).first()).toBeVisible();
});

test('publishes robots.txt and the sitemap', async ({ request }) => {
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap:');
  expect(await (await request.get('/sitemap.xml')).text()).toContain('/pricing');
});

test('the back button of the legal pages works when they are opened directly', async ({ page }) => {
  await page.goto('/terms');
  await page.getByRole('button', { name: '← Volver' }).click();
  // Home without a session is the presentation page.
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/privacy');
  await page.getByRole('button', { name: '← Volver' }).click();
  await expect(page).toHaveURL(/\/$/);
});
