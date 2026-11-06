import {
  CAPTURE_PACKAGES,
  SAME_PAYMENT_MS,
  betterOf,
  notificationId,
  parseBankNotification,
  samePayment,
} from '@modules/finances/domain/bankNotifications';

const at = new Date(2026, 2, 5, 12, 30).getTime();
const parse = (title: string, text: string) => parseBankNotification(title, text, at);

describe('parseBankNotification', () => {
  it('reads a card payment', () => {
    expect(parse('BBVA', 'Pago con tarjeta de 23,40 € en MERCADONA')).toMatchObject({
      description: 'MERCADONA',
      amount: 23.4,
      type: 'EXPENSE',
      date: '2026-03-05',
    });
  });

  it('reads purchases written in other ways', () => {
    expect(
      parse('Santander', 'Has realizado una compra de 45,00 EUR en REPSOL con tu tarjeta ****1234')
    ).toMatchObject({ description: 'REPSOL', amount: 45, type: 'EXPENSE' });
    expect(parse('Tarjeta', 'Compra: €12.50 at AMAZON')).toMatchObject({
      description: 'AMAZON',
      amount: 12.5,
    });
    expect(parse('Caixa', 'Pago de 1.234,56 euros a ENDESA')).toMatchObject({
      description: 'ENDESA',
      amount: 1234.56,
    });
  });

  it('tells incomes from expenses', () => {
    expect(parse('Bizum', 'Has recibido un Bizum de 20,00 € de Ana')).toMatchObject({
      description: 'Ana',
      amount: 20,
      type: 'INCOME',
    });
    expect(parse('Banco', 'Has enviado un Bizum de 10 € a María')).toMatchObject({
      description: 'María',
      amount: 10,
      type: 'EXPENSE',
    });
    expect(parse('ING', 'Abono de nómina: 1.500,00 € de EMPRESA SL')).toMatchObject({
      type: 'INCOME',
      amount: 1500,
    });
  });

  it('falls back to the title and then to a generic name', () => {
    expect(parse('Netflix', 'Pago de 12,99 €')).toMatchObject({ description: 'Netflix' });
    expect(parse('12,99 €', 'Pago realizado 12,99 €')).toMatchObject({
      description: 'Pago con tarjeta',
    });
    expect(parse('', 'Ingreso de 50,00 €')).toMatchObject({
      description: 'Ingreso',
      type: 'INCOME',
    });
  });

  it('ignores what is not a payment', () => {
    expect(parse('BBVA', 'Tu saldo es de 1.250,00 €')).toBeNull();
    expect(parse('BBVA', 'Tu código de verificación es 123456. Pago de 10,00 €')).toBeNull();
    expect(parse('BBVA', 'Contrata nuestra oferta: 5,00 € al mes')).toBeNull();
    expect(parse('BBVA', 'Pago realizado correctamente')).toBeNull();
    expect(parse('BBVA', 'Hola 12,00 €')).toBeNull();
    expect(parse('BBVA', 'Pago de 0,00 € en X')).toBeNull();
    expect(parse('BBVA', 'Pago de 2.000.000,00 € en X')).toBeNull();
  });

  it('ignores payments that were refused, cancelled or only held on the card', () => {
    for (const text of [
      'Compra denegada de 23,40 € en MERCADONA',
      'Pago rechazado: 12,00 € en AMAZON',
      'Se ha anulado el pago de 9,99 € en NETFLIX',
      'Compra anulada 9,99 € NETFLIX',
      'Tu pago de 15,00 € en ZARA ha sido cancelado',
      'No se ha podido realizar el pago de 30,00 € en IKEA',
      'Pago no autorizado de 5,00 € en BAR',
      'Preautorización de 150,00 € en HOTEL SOL',
      'Pre-autorización: cargo de 60,00 € en GASOLINERA',
      'Retención de 50,00 € en tu tarjeta por RENT A CAR',
      'Importe retenido 40,00 € en GASOLINERA',
      'Payment declined: €12.50 at AMAZON',
      'Card payment of €8.00 at UBER was rejected',
      'Pre-authorisation of €100.00 at HOTEL',
    ]) {
      expect(parse('Banco', text)).toBeNull();
    }
    // A refund is an income, not a refused payment.
    expect(parse('Banco', 'Devolución de 9,99 € de NETFLIX')).toMatchObject({ type: 'INCOME' });
  });

  it('keeps when and from which app the payment was told', () => {
    expect(parseBankNotification('BBVA', 'Pago de 5,00 € en BAR', at, 'com.bbva')).toMatchObject({
      postedAt: at,
      app: 'com.bbva',
    });
    expect(parse('BBVA', 'Pago de 5,00 € en BAR')).not.toHaveProperty('app');
  });

  it('gives the same id to the same notification and different ones to different notifications', () => {
    const a = parse('BBVA', 'Pago de 23,40 € en MERCADONA');
    expect(a?.id).toBe(parse('BBVA', 'Pago de 23,40 € en MERCADONA')?.id);
    expect(a?.id).not.toBe(parse('BBVA', 'Pago de 23,41 € en MERCADONA')?.id);
    expect(notificationId(1, 'a')).not.toBe(notificationId(2, 'a'));
  });

  it('only reads known bank and payment apps', () => {
    expect(CAPTURE_PACKAGES).toContain('com.revolut.revolut');
    expect(new Set(CAPTURE_PACKAGES).size).toBe(CAPTURE_PACKAGES.length);
  });
});

describe('the same payment told by two apps', () => {
  const WALLET = 'com.google.android.apps.walletnfcrel';
  const BANK = 'com.bbva.bbvacontigo';
  const pay = (app: string | undefined, minutes = 0, text = 'Pago de 23,40 € en MERCADONA') =>
    parseBankNotification('Banco', text, at + minutes * 60_000, app)!;

  it('is one payment: same amount and type, different apps, less than 10 minutes apart', () => {
    expect(samePayment(pay(WALLET), pay(BANK, 2))).toBe(true);
    expect(samePayment(pay(BANK, 9), pay(WALLET))).toBe(true);
    expect(SAME_PAYMENT_MS).toBe(10 * 60_000);
  });

  it('is two payments otherwise', () => {
    // Two equal coffees in the same app, or far apart.
    expect(samePayment(pay(BANK), pay(BANK, 1))).toBe(false);
    expect(samePayment(pay(WALLET), pay(BANK, 10))).toBe(false);
    expect(samePayment(pay(WALLET), pay(BANK, 1, 'Pago de 23,41 € en MERCADONA'))).toBe(false);
    expect(samePayment(pay(WALLET), pay(BANK, 1, 'Has recibido 23,40 € de Ana'))).toBe(false);
    // Saved before the app and the time were kept.
    expect(samePayment(pay(undefined), pay(BANK))).toBe(false);
    expect(samePayment(pay(BANK), pay(undefined))).toBe(false);
    expect(samePayment({ ...pay(WALLET), postedAt: undefined }, pay(BANK))).toBe(false);
    expect(samePayment(pay(WALLET), { ...pay(BANK), postedAt: undefined })).toBe(false);
  });

  it("keeps the bank's notification, which names the shop", () => {
    const wallet = pay(WALLET, 0, 'Pago de 23,40 €');
    const bank = pay(BANK, 1);
    expect(betterOf(wallet, bank)).toBe(bank);
    expect(betterOf(bank, wallet)).toBe(bank);
    const other = pay('com.revolut.revolut', 2);
    expect(betterOf(bank, other)).toBe(bank);
  });
});
