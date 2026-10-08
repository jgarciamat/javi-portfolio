import { storage } from '@shared/utils/storage';
import { errorMessage } from '@shared/utils/errors';
import { isPositiveAmount, parseDecimal } from '@shared/utils/numbers';
import { redirectTo, reloadPage } from '@shared/utils/navigation';

describe('storage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => jest.restoreAllMocks());

  it('reads, writes and removes strings and JSON', () => {
    storage.set('k', 'v');
    expect(storage.get('k')).toBe('v');
    storage.set('k', null);
    expect(storage.get('k')).toBeNull();
    storage.setJSON('j', { a: 1 });
    expect(storage.getJSON('j', null)).toEqual({ a: 1 });
    expect(storage.getJSON('missing', 'fallback')).toBe('fallback');
  });

  it('returns the fallback for corrupt JSON', () => {
    localStorage.setItem('j', '{nope');
    expect(storage.getJSON('j', [])).toEqual([]);
  });

  it('never throws when storage is unavailable', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(storage.get('k')).toBeNull();
    expect(() => storage.set('k', 'v')).not.toThrow();
  });
});

describe('errorMessage', () => {
  it('uses the error message or the fallback', () => {
    expect(errorMessage(new Error('boom'), 'fallback')).toBe('boom');
    expect(errorMessage(new Error(''), 'fallback')).toBe('fallback');
    expect(errorMessage('text', 'fallback')).toBe('fallback');
  });
});

describe('numbers', () => {
  it('parses decimals typed with comma or dot', () => {
    expect(parseDecimal('12,5')).toBe(12.5);
    expect(parseDecimal(' 7 ')).toBe(7);
    expect(parseDecimal('')).toBeNaN();
    expect(parseDecimal('abc')).toBeNaN();
  });

  it('accepts only finite positive amounts', () => {
    expect(isPositiveAmount(1)).toBe(true);
    expect(isPositiveAmount(0)).toBe(false);
    expect(isPositiveAmount(NaN)).toBe(false);
    expect(isPositiveAmount(Infinity)).toBe(false);
  });
});

describe('redirectTo', () => {
  it('navigates the whole page', () => {
    // jsdom only implements hash navigation, enough to see that location changed.
    redirectTo('#paid');
    expect(window.location.hash).toBe('#paid');
  });

  it('reloads the page', () => {
    // jsdom does not implement reloads: it only reports "not implemented".
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    reloadPage();
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ type: 'not implemented' }));
  });
});
