import { inboxTokenOf, parseAmountCents, parseReceiptEmail } from '@domain/services/receipt-email';

const email = (over: Partial<Parameters<typeof parseReceiptEmail>[0]> = {}) => ({
  from: 'Mercadona <no-reply@mercadona.es>',
  subject: 'Tu recibo de Mercadona',
  text: 'Gracias por tu compra.\nTotal: 23,40 €',
  ...over,
});

describe('parseAmountCents', () => {
  it('reads Spanish and English number formats', () => {
    expect(parseAmountCents('23,40')).toBe(2340);
    expect(parseAmountCents('23.40')).toBe(2340);
    expect(parseAmountCents('1.234,56')).toBe(123456);
    expect(parseAmountCents('1,234.56')).toBe(123456);
    expect(parseAmountCents('1.234')).toBe(123400);
    expect(parseAmountCents('45')).toBe(4500);
  });

  it('refuses what is not an amount', () => {
    expect(parseAmountCents('')).toBeNull();
    expect(parseAmountCents('abc')).toBeNull();
    expect(parseAmountCents('0,00')).toBeNull();
    expect(parseAmountCents('999999999,99')).toBeNull();
  });
});

describe('parseReceiptEmail', () => {
  it('takes the total, the merchant from the subject and no date when there is none', () => {
    expect(parseReceiptEmail(email())).toEqual({
      description: 'Mercadona',
      amountCents: 2340,
      date: null,
    });
  });

  it('prefers the labelled total over other amounts and takes the last one', () => {
    const parsed = parseReceiptEmail(
      email({
        text: 'Producto 5,00 €\nEnvío 3,00 €\nSubtotal 8,00 €\nTotal a pagar: 8,00 EUR\nTotal: 9,68 €',
      })
    );
    expect(parsed?.amountCents).toBe(968);
  });

  it('falls back to the largest amount with a currency', () => {
    expect(
      parseReceiptEmail(email({ text: 'Pagaste 5,00 € y 12,50 € en total, gracias' }))?.amountCents
    ).toBe(1250);
    expect(parseReceiptEmail(email({ text: 'Cobrado: EUR 7,25' }))?.amountCents).toBe(725);
  });

  it('understands English receipts', () => {
    const parsed = parseReceiptEmail({
      from: '"Spotify" <no-reply@spotify.com>',
      subject: 'Your receipt from Spotify #A-1234',
      text: 'Total paid: 10.99 EUR on 2026-03-02',
    });
    expect(parsed).toEqual({ description: 'Spotify', amountCents: 1099, date: '2026-03-02' });
  });

  it('reads Spanish dates and ignores impossible ones', () => {
    expect(parseReceiptEmail(email({ text: 'Fecha: 5/3/2026\nTotal 10,00 €' }))?.date).toBe(
      '2026-03-05'
    );
    expect(parseReceiptEmail(email({ text: 'Fecha: 31/02/2026\nTotal 10,00 €' }))?.date).toBeNull();
    expect(parseReceiptEmail(email({ text: '2026-13-40\nTotal 10,00 €' }))?.date).toBeNull();
  });

  it('uses the date of the message when the text has none', () => {
    expect(parseReceiptEmail(email({ date: '2026-03-09T10:00:00Z' }))?.date).toBe('2026-03-09');
    expect(parseReceiptEmail(email({ date: 'yesterday' }))?.date).toBeNull();
  });

  it('cleans forwarded subjects and falls back to the sender', () => {
    expect(
      parseReceiptEmail(email({ subject: 'Fwd: RE: Factura de Iberdrola' }))?.description
    ).toBe('Iberdrola');
    expect(parseReceiptEmail(email({ subject: 'Tu factura' }))?.description).toBe('Mercadona');
    expect(
      parseReceiptEmail(email({ subject: 'Recibo', from: 'pagos@amazon.es' }))?.description
    ).toBe('amazon');
    expect(parseReceiptEmail(email({ subject: 'Recibo', from: '<>' }))?.description).toBe(
      'Factura'
    );
  });

  it('returns nothing when there is no amount', () => {
    expect(parseReceiptEmail(email({ text: 'Hola, ¿qué tal?' }))).toBeNull();
    expect(parseReceiptEmail(email({ text: 'Total: 0,00 €' }))).toBeNull();
  });
});

describe('inboxTokenOf', () => {
  it('reads the token out of the recipient', () => {
    expect(inboxTokenOf('mm-abcdefghij12@facturas.finanverso.app')).toBe('mm-abcdefghij12');
    expect(inboxTokenOf('Money <MM-ABCDEFGHIJ12@facturas.finanverso.app>')).toBe('mm-abcdefghij12');
    expect(inboxTokenOf('otro@x.com, mm-abcdefghij12@facturas.finanverso.app')).toBe(
      'mm-abcdefghij12'
    );
  });

  it('refuses other addresses', () => {
    expect(inboxTokenOf('info@finanverso.app')).toBeNull();
    expect(inboxTokenOf('mm-short@x.com')).toBeNull();
    expect(inboxTokenOf('')).toBeNull();
  });
});
