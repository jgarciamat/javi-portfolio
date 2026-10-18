import { rememberReturn, takeReturn } from '@shared/utils/returnTo';

describe('the page to come back to after signing up', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => jest.restoreAllMocks());

  it('is read once', () => {
    rememberReturn('/guias/metodo-50-30-20');
    expect(takeReturn()).toBe('/guias/metodo-50-30-20');
    expect(takeReturn()).toBeNull();
  });

  it('only keeps the addresses the login page follows', () => {
    rememberReturn(null);
    rememberReturn('https://evil.example');
    rememberReturn('/pricing');
    expect(localStorage.getItem('mm_next')).toBeNull();
    rememberReturn('/?tab=renta');
    expect(takeReturn()).toBe('/?tab=renta');
  });

  it('is forgotten after a day, and when what is stored makes no sense', () => {
    const now = Date.now();
    rememberReturn('/calculadora-renta');
    jest.spyOn(Date, 'now').mockReturnValue(now + 25 * 60 * 60 * 1000);
    expect(takeReturn()).toBeNull();
    localStorage.setItem('mm_next', JSON.stringify({ to: 3, at: 'x' }));
    expect(takeReturn()).toBeNull();
    localStorage.setItem('mm_next', '"just text"');
    expect(takeReturn()).toBeNull();
  });
});
