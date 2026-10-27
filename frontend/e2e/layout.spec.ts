import { test, expect, signIn } from './fixtures';

/** The forecast panel keeps its height while it loads: no layout jump (CLS < 0.1) on a phone. */
test('the forecast panel does not shift the page when its data arrives', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/forecast*', async (route) => {
    await new Promise((done) => setTimeout(done, 1200));
    await route.continue();
  });
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[])
        if (!e.hadRecentInput) w.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await signIn(page);
  const panel = page.locator('[data-tour="forecast"]');
  // What loads above the panel (month summary, tour closing) is not the forecast's doing: count from here.
  await expect(page.locator('.summary-card').first()).toBeVisible();
  await page.evaluate(() => ((window as unknown as { __cls: number }).__cls = 0));
  const loading = (await panel.boundingBox())?.height ?? 0;
  await expect(panel.locator('.eom')).toBeVisible();
  const loaded = (await panel.boundingBox())?.height ?? 0;
  expect(Math.abs(loaded - loading)).toBeLessThan(60);
  expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(
    0.1
  );
});

/** On a phone the three social links share the line of the Videoteca pill, inside the screen. */
test('the social links show on a phone, beside the Videoteca pill', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  const links = page.getByRole('navigation', { name: /Síguenos en|Follow us on/ });
  await expect(links.getByRole('link')).toHaveCount(3);
  const pill = await page.locator('.header-learn-btn').boundingBox();
  const box = await links.boundingBox();
  expect(pill && box).toBeTruthy();
  expect(Math.abs((pill?.y ?? 0) - (box?.y ?? 99))).toBeLessThan(12);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  expect((pill?.x ?? 0) + (pill?.width ?? 0)).toBeLessThanOrEqual(box?.x ?? 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('.header').screenshot({
    path: '../docs/auditoria-recorrido-2026-10-26/despues/movil-cabecera-redes.png',
  });
});
