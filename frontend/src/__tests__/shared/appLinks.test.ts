import { appTabOf, appTabPath, appTarget, isGatedPath, safeNext } from '@shared/utils/appLinks';

describe('links to sections of the app', () => {
  it('knows which public pages have a section in the app', () => {
    expect(appTabOf('/calculadora-renta')).toBe('renta');
    expect(appTabOf('/calculadora-iva')).toBeNull();
  });

  it('goes straight to the section when signed in and through the login when not', () => {
    expect(appTabPath('renta')).toBe('/?tab=renta');
    expect(appTarget('renta', true)).toBe('/?tab=renta');
    expect(appTarget('renta', false)).toBe('/login?next=%2F%3Ftab%3Drenta');
  });

  it('only follows `next` addresses that point to a section of the app', () => {
    expect(safeNext('/?tab=renta')).toBe('/?tab=renta');
    expect(safeNext('/?tab=custom-alerts')).toBe('/?tab=custom-alerts');
    expect(safeNext(null)).toBe('/');
    expect(safeNext('https://evil.example')).toBe('/');
    expect(safeNext('//evil.example')).toBe('/');
    expect(safeNext('/?tab=x&y=https://evil.example')).toBe('/');
  });

  it('also follows the guides and calculators that only people with an account see', () => {
    for (const path of [
      '/guias/metodo-50-30-20',
      '/hacienda-paso-a-paso/renta-web',
      '/calculadora-renta',
      '/simulador-ahorro',
    ]) {
      expect(isGatedPath(path)).toBe(true);
      expect(safeNext(path)).toBe(path);
    }
    for (const path of [
      '/guias',
      '/videoteca',
      '/pricing',
      '/guias/x/../../evil',
      '/guias/x?y=1',
    ]) {
      expect(isGatedPath(path)).toBe(false);
      expect(safeNext(path)).toBe('/');
    }
  });
});
