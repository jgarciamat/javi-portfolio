import { expect, logIn, openSection, test } from './fixtures';

const SECTIONS = ['Balance anual', 'Análisis', 'Buscar', 'Cuentas', 'Presupuestos', 'Metas'];

test('the welcome tour visits every section after signing in, until it is turned off', async ({
  page,
}) => {
  await logIn(page);
  const tour = page.getByRole('dialog');
  await expect(tour.getByRole('heading', { name: /Bienvenido a Money Manager/ })).toBeVisible();
  const progress = await tour.getByText(/^Paso 1 de \d+$/).textContent();
  const total = Number(progress!.split(' de ')[1]);

  const visited: string[] = [];
  for (let step = 2; step <= total; step++) {
    await tour.getByRole('button', { name: 'Siguiente' }).click();
    await expect(tour.getByText(`Paso ${step} de ${total}`)).toBeVisible();
    // A section step opens that section behind the explanation.
    const title = (await tour.getByRole('heading').textContent()) ?? '';
    const section = SECTIONS.find((name) => title.includes(name));
    if (section) {
      await expect(page.getByRole('region', { name: section })).toBeVisible();
      visited.push(section);
    }
  }
  expect(visited).toEqual(SECTIONS);
  await expect(tour.getByRole('heading', { name: /Listo/ })).toBeVisible();

  await tour.getByRole('checkbox', { name: 'No volver a mostrar al iniciar sesión' }).check();
  await tour.getByRole('button', { name: 'Terminar' }).click();
  await expect(tour).toBeHidden();
  await expect(page.getByRole('region', { name: 'Resumen mensual' })).toBeVisible();

  // Next sign-in: no tour.
  await page.getByRole('button', { name: 'Salir' }).click();
  await logIn(page);
  await page.waitForTimeout(1000);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // It can be replayed and switched back on from Settings.
  await openSection(page, 'Ajustes');
  await page.getByRole('button', { name: /Ver el tour ahora/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Ajustes' })).toBeVisible();
  const toggle = page.getByRole('checkbox', { name: 'Mostrar el tour al iniciar sesión' });
  // The switch reflects the saved value: it turns on once the server confirms it.
  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect(page.getByText('Ajustes guardados')).toBeVisible();
});
