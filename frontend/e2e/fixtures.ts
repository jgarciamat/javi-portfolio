import { test as base, expect, type Page } from '@playwright/test';
import { DEMO_USER } from '../playwright.config';

/** Every test also fails if the page logs an error or throws one. */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Signs in with the demo user (the welcome tour may open right after). */
export async function logIn(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('#login-email').fill(DEMO_USER.email);
  await page.locator('input[type="password"]').fill(DEMO_USER.password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByText('Mes actual')).toBeVisible();
}

/** Signs in and skips the welcome tour, which opens after every sign-in. */
export async function signIn(page: Page): Promise<void> {
  await logIn(page);
  await page.getByRole('button', { name: 'Saltar el tour' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

/** Opens a dashboard section from the burger menu. */
export async function openSection(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page.locator('.burger-nav-item', { hasText: label }).click();
  await expect(page.getByRole('region', { name: label })).toBeVisible();
}
