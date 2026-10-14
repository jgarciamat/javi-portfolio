import {
  CAPTURE_PACKAGES,
  notificationId,
  parseBankNotification,
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
