import { expect, signIn, test } from './fixtures';

test.use({ viewport: { width: 375, height: 600 }, hasTouch: true });

/** The edit dialog on a short phone screen: inside the screen, scrollable, with Guardar always reachable. */
test('the edit dialog fits a short phone screen and keeps Guardar reachable', async ({ page }) => {
  await signIn(page);
  const description = `Café móvil ${Date.now()}`;
  // Quick entry: the category is a dropdown (a single account has no account dropdown).
  const quick = page.getByLabel('Registrar transacción rápida', { exact: true });
  await quick.fill(`${description} 1,50`);
  await page
    .getByRole('combobox', { name: 'Categoría', exact: true })
    .first()
    .selectOption({ label: '🍔 Alimentación' });
  await quick.press('Enter');

  const edit = page.getByRole('button', { name: `Editar: ${description}` });
  await expect(edit).toBeVisible();
  await edit.click();
  const dialog = page.getByRole('dialog', { name: 'Editar transacción' });
  await expect(dialog).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

  const save = dialog.getByRole('button', { name: 'Guardar cambios' });
  for (const height of [600, 320]) {
    await page.setViewportSize({ width: 375, height });
    // The visual viewport (which the keyboard shrinks) tells the dialog its height a moment later.
    await expect.poll(async () => ((await dialog.boundingBox())?.height ?? 0) <= height).toBe(true);
    const box = await dialog.boundingBox();
    expect(box?.y).toBeGreaterThanOrEqual(0);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(height);
    // The footer is pinned: Guardar is in the screen without scrolling, and the body scrolls under it.
    const button = await save.boundingBox();
    expect((button?.y ?? 0) + (button?.height ?? 0)).toBeLessThanOrEqual(height);
    await dialog.getByLabel('Notas').scrollIntoViewIfNeeded();
  }
  await save.click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});
