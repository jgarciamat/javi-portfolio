import { apiErrorMessage } from '@core/api/errorMessages';
import { translate } from '@core/i18n/I18nContext';

const en = (key: string, vars?: Record<string, string | number>) => translate('en', key, vars);

afterEach(() => localStorage.clear());

describe('apiErrorMessage in Spanish', () => {
  it("keeps the server's own message", () => {
    expect(
      apiErrorMessage('INSUFFICIENT_BALANCE', 'Saldo insuficiente. Saldo disponible: 3.00')
    ).toBe('Saldo insuficiente. Saldo disponible: 3.00');
  });

  it('translates errors produced in the browser', () => {
    expect(apiErrorMessage('NETWORK_ERROR')).toBe(translate('es', 'app.apiError.NETWORK_ERROR'));
  });
});

describe('apiErrorMessage in English', () => {
  beforeEach(() => localStorage.setItem('mm_locale', 'en'));

  it('translates the error code', () => {
    expect(apiErrorMessage('INVALID_CREDENTIALS', 'Email o contraseña incorrectos')).toBe(
      en('app.apiError.INVALID_CREDENTIALS')
    );
  });

  it('shares one message for every missing resource', () => {
    expect(apiErrorMessage('GOAL_NOT_FOUND', 'Meta no encontrada')).toBe(
      en('app.apiError.NOT_FOUND')
    );
  });

  it('fills in the details the message needs', () => {
    expect(apiErrorMessage('INSUFFICIENT_BALANCE', 'x', { availableCents: 1250 })).toBe(
      'Insufficient balance. Available: 12.50'
    );
    expect(apiErrorMessage('PLAN_LIMIT', 'x', { resource: 'goals', limit: 2 })).toBe(
      en('app.apiError.PLAN_LIMIT', { resource: en('billing.resource.goals'), limit: 2 })
    );
  });

  it('falls back to a generic message for unknown or missing codes', () => {
    const generic = en('app.apiError.generic');
    expect(apiErrorMessage('SOMETHING_NEW', 'Algo nuevo')).toBe(generic);
    expect(apiErrorMessage(undefined, 'Algo')).toBe(generic);
  });
});
