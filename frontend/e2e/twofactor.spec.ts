import type { APIRequestContext, Page } from '@playwright/test';
import { API_URL, DEMO_USER } from '../playwright.config';
import { expect, logIn, openSection, test } from './fixtures';
import { totp } from './totp';

/**
 * Two-step verification, end to end, with the demo user (it is the only account of the test
 * database): it is turned on, used (app code, then a recovery code) and turned off again. The
 * codes of the authenticator app are generated here from the key the screen shows, exactly as an
 * app would. Whatever happens, the account is left with 2FA off for the tests that follow.
 */

const fillLogin = async (page: Page) => {
  await page.goto('/login');
  await page.locator('#login-email').fill(DEMO_USER.email);
  await page.locator('input[type="password"]').fill(DEMO_USER.password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
};

/** Safety net: turns 2FA off through the API, whatever the screens did. */
async function forceOff(request: APIRequestContext, secret: string, recovery: string[]) {
  const login = await request.post(`${API_URL}/auth/login`, { data: DEMO_USER });
  const body = await login.json();
  if (!body.twoFactorRequired) return;
  const verified = await request.post(`${API_URL}/auth/2fa/verify`, {
    data: {
      challengeToken: body.challengeToken,
      code: recovery[recovery.length - 1] ?? totp(secret, 1),
    },
  });
  const { accessToken } = await verified.json();
  await request.post(`${API_URL}/auth/2fa/disable`, {
    data: { password: DEMO_USER.password },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

test('2FA: turn it on, sign in with the app code and with a recovery code, turn it off', async ({
  page,
  request,
  pageErrors,
}) => {
  test.setTimeout(90_000);
  let secret = '';
  let recovery: string[] = [];
  try {
    await logIn(page);
    await page.getByRole('button', { name: 'Saltar el tour' }).click();
    await openSection(page, 'Ajustes');

    // Set-up: the password first, then the key (what the QR holds) and a code from the "app".
    const panel = page.getByRole('region', { name: 'Verificación en dos pasos' });
    await expect(panel.getByText(/Desactivada/)).toBeVisible();
    await page.getByRole('button', { name: 'Activar verificación en dos pasos' }).click();
    await panel.getByLabel('Tu contraseña actual').fill(DEMO_USER.password);
    await panel.getByRole('button', { name: 'Continuar' }).click();
    secret = ((await panel.locator('code').first().textContent()) ?? '').replace(/\s/g, '');
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    await panel.getByLabel('Código de 6 cifras').fill(totp(secret));
    await panel.getByRole('button', { name: 'Activar' }).click();

    // The recovery codes are shown once.
    await expect(panel.getByText('Guarda tus códigos de recuperación.')).toBeVisible();
    recovery = (
      await panel
        .getByRole('list', { name: 'Códigos de recuperación' })
        .locator('li')
        .allTextContents()
    ).map((c) => c.trim());
    expect(recovery.length).toBeGreaterThanOrEqual(8);
    await panel.getByRole('button', { name: 'Ya los he guardado' }).click();
    await expect(panel.getByText(/Activada desde el/)).toBeVisible();
    await expect(
      panel.getByText(`Códigos de recuperación sin usar: ${recovery.length}.`)
    ).toBeVisible();

    // Signing in now asks for a second step. A wrong code is refused (the browser logs the 4xx).
    await page.getByRole('button', { name: 'Salir' }).click();
    await fillLogin(page);
    await expect(page.getByRole('heading', { name: 'Verificación en dos pasos' })).toBeVisible();
    await page.getByLabel('Código de verificación').fill('000000');
    await page.getByRole('button', { name: 'Verificar', exact: true }).click();
    await expect(page.getByText('El código no es correcto')).toBeVisible();
    expect(pageErrors.splice(0).length).toBeGreaterThan(0);

    // The next step's code: always valid (±1 step) and never one the server took already.
    await page.getByLabel('Código de verificación').fill(totp(secret, 1));
    await page.getByRole('button', { name: 'Verificar', exact: true }).click();
    await expect(page.getByText('Mes actual')).toBeVisible();
    await page.getByRole('button', { name: 'Saltar el tour' }).click();

    // A recovery code gets in too, once.
    await page.getByRole('button', { name: 'Salir' }).click();
    await fillLogin(page);
    await page.getByRole('button', { name: 'Usar un código de recuperación' }).click();
    await page.getByLabel('Código de recuperación').fill(recovery[0]);
    await page.getByRole('button', { name: 'Verificar', exact: true }).click();
    await expect(page.getByText('Mes actual')).toBeVisible();
    await page.getByRole('button', { name: 'Saltar el tour' }).click();

    // Turning it off asks for the password.
    await openSection(page, 'Ajustes');
    await expect(
      panel.getByText(`Códigos de recuperación sin usar: ${recovery.length - 1}.`)
    ).toBeVisible();
    await panel.getByRole('button', { name: 'Desactivar', exact: true }).click();
    await panel.getByLabel('Tu contraseña actual').fill(DEMO_USER.password);
    await panel.getByRole('button', { name: 'Desactivar verificación en dos pasos' }).click();
    await expect(panel.getByText(/Desactivada/)).toBeVisible();
  } finally {
    if (secret) await forceOff(request, secret, recovery.slice(1));
  }
});
