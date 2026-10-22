import { expect, openSection, signIn, test } from './fixtures';

/** iPhone browsers (versions are examples). */
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1';
const IPHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

test.describe('on an iPhone with Safari', () => {
  test.use({ ...IPHONE, userAgent: IPHONE_SAFARI });

  test('offers the install guide, which opens on Safari and does not come back', async ({
    page,
  }) => {
    await page.goto('/');
    const notice = page.getByRole('region', { name: 'Instálala en tu iPhone' });
    await expect(notice).toContainText('desde Google Chrome o Safari');
    await notice.getByRole('button', { name: 'Ver cómo' }).click();

    const guide = page.getByRole('dialog', { name: 'Ten Finanverso como una app' });
    await expect(guide.getByRole('button', { name: 'Safari' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(
      guide.getByRole('heading', { name: 'Abre finanverso.app en Safari' })
    ).toBeVisible();
    await expect(guide.getByText(/pulsa antes «Más»/)).toBeVisible();
    await guide.getByRole('button', { name: 'Google Chrome' }).click();
    await expect(guide.getByText(/a la derecha de la barra de direcciones/)).toBeVisible();
    await guide.getByRole('button', { name: 'Cerrar la guía' }).click();
    await expect(guide).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Instálala en tu iPhone' })).toHaveCount(0);
  });
});

test.describe('on an iPhone with Google Chrome', () => {
  test.use({ ...IPHONE, userAgent: IPHONE_CHROME });

  test('offers the guide too, and «Ahora no» hides it on this device', async ({ page }) => {
    await page.goto('/');
    const notice = page.getByRole('region', { name: 'Instálala en tu iPhone' });
    await notice.getByRole('button', { name: 'Ahora no' }).click();
    await expect(notice).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(notice).toHaveCount(0);
  });
});

test('on a computer there is no notice, and the guide is in Ajustes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.install-hint')).toHaveCount(0);

  await signIn(page);
  await openSection(page, 'Ajustes');
  await page.getByRole('button', { name: 'Ver cómo se hace' }).click();
  const guide = page.getByRole('dialog', { name: 'Ten Finanverso como una app' });
  await expect(guide.getByRole('listitem')).toHaveCount(3);
  await expect(
    guide.getByText(/En Android, Finanverso se instala desde Google Play/)
  ).toBeVisible();
  await guide.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(guide).toHaveCount(0);
});
