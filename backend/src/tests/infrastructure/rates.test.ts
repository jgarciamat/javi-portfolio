import { FrankfurterRates } from '@infrastructure/rates/FrankfurterRates';

const reply = (body: unknown, ok = true, status = 200) =>
  jest.fn().mockResolvedValue({ ok, status, json: async () => body });

describe('FrankfurterRates', () => {
  it('asks for the pair once and caches it for twelve hours', async () => {
    const http = reply({ rates: { EUR: 0.9231 } });
    let now = 1_000;
    const rates = new FrankfurterRates(
      () => now,
      http as unknown as typeof fetch,
      'https://x.test/v1'
    );
    expect(await rates.rate('USD', 'EUR')).toBe(0.9231);
    expect(await rates.rate('USD', 'EUR')).toBe(0.9231);
    expect(http).toHaveBeenCalledTimes(1);
    expect(http.mock.calls[0][0]).toBe('https://x.test/v1/latest?base=USD&symbols=EUR');
    now += 13 * 60 * 60 * 1000;
    await rates.rate('USD', 'EUR');
    expect(http).toHaveBeenCalledTimes(2);
  });

  it('is 1 for the same currency without asking', async () => {
    const http = reply({});
    expect(
      await new FrankfurterRates(Date.now, http as unknown as typeof fetch).rate('EUR', 'EUR')
    ).toBe(1);
    expect(http).not.toHaveBeenCalled();
  });

  it('fails clearly when the service is down or answers nonsense', async () => {
    const make = (http: unknown) => new FrankfurterRates(Date.now, http as typeof fetch);
    await expect(make(reply({}, false, 500)).rate('USD', 'EUR')).rejects.toMatchObject({
      code: 'RATES_UNAVAILABLE',
    });
    await expect(make(reply({ rates: {} })).rate('USD', 'EUR')).rejects.toMatchObject({
      code: 'RATES_UNAVAILABLE',
    });
    await expect(make(reply({ rates: { EUR: -1 } })).rate('USD', 'EUR')).rejects.toMatchObject({
      code: 'RATES_UNAVAILABLE',
    });
    await expect(
      make(jest.fn().mockRejectedValue(new Error('offline'))).rate('USD', 'EUR')
    ).rejects.toMatchObject({
      code: 'RATES_UNAVAILABLE',
    });
  });
});
