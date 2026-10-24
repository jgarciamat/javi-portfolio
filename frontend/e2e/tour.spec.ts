import { expect, logIn, openSection, test, type Page } from './fixtures';

/** Steps that talk about the screen as a whole: no element is highlighted. */
const NO_ELEMENT = [
  /Te enseñamos/,
  /La Renta, paso a paso/,
  /Qué hace y qué no hace/,
  /Con tu (plan gratis|Premium)/,
  /Autónomos, por trimestres/,
  /Quién debe a quién/,
  /Consola crypto: un simulador/,
  /¡Listo!/,
];

/** What each new block says, so a missing step is noticed. */
const EXPECTED_TITLES = [
  /Elige el mes/,
  /Importa tu extracto/,
  /Invita a un amigo/,
  /Tu perfil/,
  /Los pasos de la Renta/,
  /Tu resultado/,
  /Qué trimestre abre/,
  /Ficheros para la sede/,
  /¿Cuándo llegas a tu meta\?/,
  /Tu dinero perdido/,
  /Gastos compartidos/,
  /Operaciones automáticas/,
  /Crea una/,
  /La gráfica y sus capas/,
  /Practica una operación/,
];

async function totalSteps(page: Page): Promise<number> {
  const progress = await page
    .getByRole('dialog')
    .getByText(/^Paso 1 de \d+$/)
    .textContent();
  return Number(progress!.split(' de ')[1]);
}

/** Opens the tour: after signing in, or from Settings when it did not open by itself. */
async function ensureTour(page: Page): Promise<void> {
  await logIn(page);
  if ((await page.getByRole('dialog').count()) === 0) {
    await openSection(page, 'Ajustes');
    await page.getByRole('button', { name: /Ver el tour ahora/ }).click();
  }
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: /Te enseñamos/ })
  ).toBeVisible();
}

/** Walks every step with the «Next» button and checks each one finds what it explains. */
async function walk(page: Page, phone: boolean): Promise<string[]> {
  const tour = page.getByRole('dialog');
  const total = await totalSteps(page);
  const titles: string[] = [];
  for (let step = 1; step <= total; step++) {
    await expect(tour.getByText(`Paso ${step} de ${total}`)).toBeVisible();
    const title = (await tour.getByRole('heading').textContent()) ?? '';
    titles.push(title);
    const spotlight = page.locator('.tour-spotlight');
    if (NO_ELEMENT.some((pattern) => pattern.test(title))) {
      await expect(spotlight).toHaveCount(0);
    } else {
      await expect(spotlight, `«${title}» finds its element`).toBeVisible();
      await page.waitForTimeout(700); // the page scrolls smoothly: wait for it to settle
      const card = (await tour.boundingBox())!;
      const mark = (await spotlight.boundingBox())!;
      const viewport = page.viewportSize()!;
      // The card stays inside the screen and never covers the element it explains.
      expect(card.x).toBeGreaterThanOrEqual(0);
      expect(card.x + card.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(card.y + card.height).toBeLessThanOrEqual(viewport.height + 1);
      const overlap =
        Math.min(card.x + card.width, mark.x + mark.width) - Math.max(card.x, mark.x) > 4 &&
        Math.min(card.y + card.height, mark.y + mark.height) - Math.max(card.y, mark.y) > 4;
      expect(
        overlap,
        `«${title}» is not covered by the card (${phone ? 'phone' : 'desktop'})`
      ).toBe(false);
    }
    // Big buttons, easy to hit.
    const next = tour.getByRole('button', { name: step === total ? 'Terminar' : 'Siguiente' });
    expect((await next.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    if (step < total) await next.click();
  }
  return titles;
}

function expectCovered(titles: string[]) {
  for (const expected of EXPECTED_TITLES) {
    expect(
      titles.some((title) => expected.test(title)),
      `step ${expected}`
    ).toBe(true);
  }
}

test('the tour walks the whole app on a desktop screen and can be turned off and replayed', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await ensureTour(page);
  expectCovered(await walk(page, false));
  const tour = page.getByRole('dialog');
  await expect(tour.getByRole('heading', { name: /Listo/ })).toBeVisible();

  await tour.getByRole('checkbox', { name: 'No volver a mostrar al iniciar sesión' }).check();
  await tour.getByRole('button', { name: 'Terminar' }).click();
  await expect(tour).toBeHidden();
  await expect(page.getByRole('region', { name: 'Resumen mensual' })).toBeVisible();

  // Next sign-in: no tour, and no notice either (this version was seen).
  await page.getByRole('button', { name: 'Salir' }).click();
  await logIn(page);
  await page.waitForTimeout(1000);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Hemos renovado el tour' })).toHaveCount(0);

  // It can be replayed (keyboard: arrows and Escape) and switched back on from Settings.
  await openSection(page, 'Ajustes');
  await page.getByRole('button', { name: /Ver el tour ahora/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/^Paso 2 de \d+$/)).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByText(/^Paso 1 de \d+$/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Ajustes' })).toBeVisible();
  const toggle = page.getByRole('checkbox', { name: 'Mostrar el tour al iniciar sesión' });
  // The switch reflects the saved value: it turns on once the server confirms it.
  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect(page.getByText('Ajustes guardados')).toBeVisible();
});

test('the tour walks the whole app on a phone screen without covering what it explains', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 760 });
  await ensureTour(page);
  expectCovered(await walk(page, true));
  await page.getByRole('dialog').getByRole('button', { name: 'Terminar' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('whoever turned the tour off is offered the renewed one once, without blocking', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await ensureTour(page);
  const tour = page.getByRole('dialog');
  await tour.getByRole('checkbox', { name: 'No volver a mostrar al iniciar sesión' }).check();
  await tour.getByRole('button', { name: 'Saltar el tour' }).click();
  await expect(tour).toBeHidden();

  // An older version of the tour was the last one seen on this device.
  await page.evaluate(() => localStorage.removeItem('finanverso.tour.seenVersion'));
  await page.getByRole('button', { name: 'Salir' }).click();
  await logIn(page);
  const notice = page.getByRole('region', { name: 'Hemos renovado el tour' });
  await expect(notice).toBeVisible();
  // Not blocking: the app underneath still works.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await expect(page.getByRole('dialog', { name: /menú/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await notice.getByRole('button', { name: 'Ahora no' }).click();
  await expect(notice).toBeHidden();

  // Seen: not offered on the next sign-in.
  await page.getByRole('button', { name: 'Salir' }).click();
  await logIn(page);
  await page.waitForTimeout(800);
  await expect(page.getByRole('region', { name: 'Hemos renovado el tour' })).toHaveCount(0);

  // Leave the account as the other tests expect: tour on at sign-in.
  await openSection(page, 'Ajustes');
  const toggle = page.getByRole('checkbox', { name: 'Mostrar el tour al iniciar sesión' });
  await toggle.click();
  await expect(toggle).toBeChecked();
});
