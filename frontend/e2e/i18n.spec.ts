import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, signIn, test } from './fixtures';

/**
 * The texts come in two parts (A04, scripts/i18n/split.cjs): the landing, the login and the plans
 * only download the core; every other page waits for the rest. No screen may show a raw key.
 */
const KEYS = Object.keys(JSON.parse(readFileSync('src/locales/es.json', 'utf8')));

/** Keys that appear on the screen as they are (text, labels, placeholders, titles). */
async function rawKeys(page: Page): Promise<string[]> {
  return page.evaluate((keys) => {
    const known = new Set(keys);
    const seen = [document.body.innerText];
    document.querySelectorAll('[aria-label],[placeholder],[title],[alt]').forEach((el) => {
      for (const name of ['aria-label', 'placeholder', 'title', 'alt']) {
        seen.push(el.getAttribute(name) ?? '');
      }
    });
    seen.push(document.title);
    const words = seen.join(' ').split(/[\s"'«»(),:;!?¿¡]+/);
    return words.map((w) => w.replace(/\.$/, '')).filter((w) => known.has(w));
  }, KEYS);
}

/** Records whether the page downloaded the rest of the texts. */
function watchRest(page: Page) {
  const asked: string[] = [];
  page.on('request', (request) => {
    if (/virtual:locale\/(es|en)\/rest|texts-(es|en)-rest/.test(request.url())) {
      asked.push(request.url());
    }
  });
  return asked;
}

for (const [path, ready] of [
  ['/', 'h1'],
  ['/login', '#login-email'],
  ['/pricing', 'h1'],
  ['/en/', 'h1'],
  ['/en/login', '#login-email'],
  ['/en/pricing', 'h1'],
] as const) {
  test(`${path} paints with the core texts only`, async ({ page }) => {
    const rest = watchRest(page);
    await page.goto(path);
    await expect(page.locator(ready).first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(await rawKeys(page)).toEqual([]);
    expect(rest).toEqual([]);
  });
}

for (const path of [
  '/calculadora-renta',
  '/calculadora-sueldo-neto',
  '/guias',
  '/hacienda-paso-a-paso',
  '/privacy',
  '/terms',
  '/videoteca',
  '/en/calculadora-renta',
  '/en/guias',
  '/en/privacy',
]) {
  test(`${path} waits for the rest of the texts`, async ({ page }) => {
    const rest = watchRest(page);
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(await rawKeys(page)).toEqual([]);
    expect(rest.length).toBeGreaterThan(0);
  });
}

test('from the landing to a calculator inside the app, no raw key', async ({ page }) => {
  const rest = watchRest(page);
  await page.goto('/');
  await expect(page.locator('h1').first()).toBeVisible();
  expect(rest).toEqual([]);
  // A link of the app (no new page load): the calculator waits for the rest of the texts.
  await page.getByRole('link', { name: 'Calculadora 50/30/20' }).first().click();
  await expect(page).toHaveURL(/calculadora-50-30-20/);
  await expect(page.locator('h1').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(rest.length).toBeGreaterThan(0);
  expect(await rawKeys(page)).toEqual([]);
});

test('every section of the app shows its texts, none raw', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page);
  expect(await rawKeys(page)).toEqual([]);
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  const labels = (await page.locator('.burger-nav-item').allInnerTexts()).map(
    (l) => l.trim().split('\n')[0]
  );
  await page.keyboard.press('Escape');
  expect(labels.length).toBeGreaterThan(15);
  const found: string[] = [];
  for (const label of labels) {
    // From a fresh page each time: some items open a panel over the page.
    await page.goto('/');
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await page.locator('.burger-nav-item', { hasText: label }).first().click();
    await page.waitForLoadState('networkidle');
    for (const key of await rawKeys(page)) found.push(`${label}: ${key}`);
  }
  expect(found).toEqual([]);
});
