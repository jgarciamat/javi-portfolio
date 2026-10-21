import { parseInvoiceBook, type BookCell } from '@modules/finances/domain/invoiceBook';
import {
  cashOf,
  intraKeyOf,
  investmentOf,
  isEuVatId,
  key349Of,
  normalVatId,
  purchaseOpOf,
  saleOpOf,
  vatByQuarter,
  type VatCells,
} from '@modules/finances/domain/vatBook';

/**
 * What an invoice of a book is for VAT, from the columns of the AEAT layout of the books (LSI.xlsx
 * 2026: «Clave de Operación», «Calificación», «Operación Exenta», «Bien de Inversión», «Inversión del
 * Sujeto Pasivo», «Tipo de Factura») or a free «Tipo de operación» column. Invented data.
 */
const cells = (over: Partial<VatCells> = {}): VatCells => ({
  key: '',
  qualification: '',
  exempt: '',
  reverse: '',
  investment: '',
  invoiceType: '',
  free: '',
  key349: '',
  surcharge: false,
  vatId: '',
  ...over,
});

describe('VAT numbers of the EU', () => {
  it('knows a VAT number of another member state, with its prefix', () => {
    expect(isEuVatId('FR 123.456-789/01')).toBe(true);
    expect(normalVatId('fr 123.456-789/01')).toBe('FR12345678901');
    expect(isEuVatId('EL123456789')).toBe(true);
    // Spain is not «another» member state, the UK left, and a prefix alone is not a number.
    expect(isEuVatId('ES12345678Z')).toBe(false);
    expect(isEuVatId('GB123456789')).toBe(false);
    expect(isEuVatId('DE')).toBe(false);
    expect(isEuVatId('DEABCDE')).toBe(false);
    expect(isEuVatId(null)).toBe(false);
    expect(isEuVatId(undefined)).toBe(false);
  });
});

describe('The operation of an issued invoice', () => {
  it('follows the cause of exemption of the AEAT books (E1-E6)', () => {
    expect(saleOpOf(cells({ exempt: 'e1' }))).toBe('exempt');
    expect(saleOpOf(cells({ exempt: 'E2 - Exportación' }))).toBe('export');
    expect(saleOpOf(cells({ exempt: 'e3' }))).toBe('export');
    expect(saleOpOf(cells({ exempt: 'e4' }))).toBe('export');
    expect(saleOpOf(cells({ exempt: 'e5' }))).toBe('intraEU');
    expect(saleOpOf(cells({ exempt: 'e6' }))).toBe('exempt');
  });

  it('follows the qualification: S2 reverse charge, N1 not subject, N2 by the place of supply', () => {
    expect(saleOpOf(cells({ qualification: 's2' }))).toBe('reverse');
    expect(saleOpOf(cells({ qualification: 'n1' }))).toBe('nonVat');
    expect(saleOpOf(cells({ qualification: 'n2' }))).toBe('notSubject');
    // To a business of another member state it is an intra-EU service (box 59).
    expect(saleOpOf(cells({ qualification: 'n2', vatId: 'PT123456789' }))).toBe('intraEU');
    expect(saleOpOf(cells({ qualification: 'n2', key: '17' }))).toBe('oss');
    expect(saleOpOf(cells({ qualification: 's1' }))).toBe('domestic');
  });

  it('follows the key (02 export, 17 one-stop shop) and the surcharge', () => {
    expect(saleOpOf(cells({ key: '2' }))).toBe('export');
    expect(saleOpOf(cells({ key: '17' }))).toBe('ossSubject');
    expect(saleOpOf(cells({ surcharge: true }))).toBe('re');
    expect(saleOpOf(cells({ key: 'abc' }))).toBe('domestic');
  });

  it('reads a free «Tipo de operación»', () => {
    const op = (free: string) => saleOpOf(cells({ free }));
    expect(op('con recargo')).toBe('re');
    expect(op('inversion del sujeto pasivo')).toBe('reverse');
    expect(op('entrega intracomunitaria')).toBe('intraEU');
    expect(op('exportacion')).toBe('export');
    expect(op('ventanilla unica')).toBe('oss');
    expect(op('no sujeta por localizacion')).toBe('notSubject');
    expect(op('no sujeta')).toBe('nonVat');
    expect(op('venta exenta de un inmueble')).toBe('exemptOccasional');
    expect(op('exenta art. 20')).toBe('exempt');
    expect(op('nacional')).toBe('domestic');
  });
});

describe('The operation of a received invoice', () => {
  it('follows the key 09 (intra-EU), 13 or F5 (import) and «Inversión del sujeto pasivo»', () => {
    expect(purchaseOpOf(cells({ key: '09' }), false)).toBe('intraGoods');
    expect(purchaseOpOf(cells({ key: '09' }), true)).toBe('intraServices');
    expect(purchaseOpOf(cells({ key: '13' }), false)).toBe('import');
    expect(purchaseOpOf(cells({ invoiceType: 'f5' }), false)).toBe('import');
    expect(purchaseOpOf(cells({ reverse: 's' }), false)).toBe('reverse');
    expect(purchaseOpOf(cells({ reverse: 'n' }), false)).toBe('domestic');
  });

  it('reads a free «Tipo de operación»: a reverse charge of the EU is an intra-EU purchase', () => {
    const op = (free: string, vatId = '') => purchaseOpOf(cells({ free, vatId }), false);
    expect(op('importacion dua')).toBe('import');
    expect(op('inversion del sujeto pasivo')).toBe('reverse');
    expect(op('reverse charge', 'DE123456789')).toBe('intraGoods');
    expect(op('adquisicion intracomunitaria de servicio')).toBe('intraServices');
    expect(op('compra')).toBe('domestic');
  });

  it('knows an investment good and cash accounting', () => {
    expect(investmentOf(cells({ investment: 'si' }))).toBe(true);
    expect(investmentOf(cells({ free: 'bien de inversion' }))).toBe(true);
    expect(investmentOf(cells({ investment: 'no' }))).toBe(false);
    expect(cashOf(cells({ key: '07' }))).toBe(true);
    expect(cashOf(cells({ free: 'criterio de caja' }))).toBe(true);
    expect(cashOf(cells())).toBe(false);
  });
});

describe('The key of the 349', () => {
  it('is the one of the book, or the usual one of the operation', () => {
    expect(key349Of(cells({ key349: 't' }), 'intraEU', false)).toBe('T');
    expect(key349Of(cells(), 'intraEU', false)).toBe('E');
    expect(key349Of(cells(), 'intraEU', true)).toBe('S');
    expect(key349Of(cells({ qualification: 'n2' }), 'intraEU', false)).toBe('S');
    expect(key349Of(cells(), 'intraGoods', false)).toBe('A');
    expect(key349Of(cells(), 'intraServices', true)).toBe('I');
    expect(key349Of(cells({ key349: 'X' }), 'export', false)).toBeNull();
  });

  it('of an invoice keeps its own only when it fits the operation', () => {
    expect(intraKeyOf({ op: 'intraEU', key349: 'S' })).toBe('S');
    expect(intraKeyOf({ op: 'intraEU', key349: 'A' })).toBe('E');
    expect(intraKeyOf({ op: 'intraGoods', key349: 'I' })).toBe('I');
    expect(intraKeyOf({ op: 'intraGoods', key349: 'E' })).toBe('A');
    expect(intraKeyOf({ op: 'export', key349: 'E' })).toBeNull();
    expect(intraKeyOf({})).toBeNull();
  });
});

describe('The VAT of the invoices of a quarter', () => {
  it('adds up the sales without VAT by box, the surcharge, cash accounting and the 349', () => {
    const out = vatByQuarter([
      { quarter: 1, base: 1000, vatRate: 0, concept: 'Client FR', op: 'intraEU', vatId: 'FR1' },
      { quarter: 1, base: 500, vatRate: 0, concept: 'Client FR', op: 'intraEU', vatId: 'FR1' },
      { quarter: 1, base: 300, vatRate: 0, concept: 'Export', op: 'export' },
      { quarter: 1, base: 200, vatRate: 21, concept: 'Tienda', op: 're' },
      { quarter: 1, base: 100, vatRate: 10, concept: 'Caja', cash: true },
      { quarter: 1, base: 50, vatRate: 0, concept: 'Otro', cash: true },
      { quarter: 2, base: 70, vatRate: 21, concept: 'Nacional' },
      { quarter: 2, base: 10, vatRate: 21, concept: 'Sin NIF', op: 'intraGoods' },
    ]);
    expect(out[1]).toEqual({
      sales: { intraEU: 1500, exports: 300 },
      re: { r21: 200, r10: 0, r4: 0 },
      intra: [
        { key: 'E', vatId: 'FR1', name: 'Client FR', base: 1000 },
        { key: 'E', vatId: 'FR1', name: 'Client FR', base: 500 },
      ],
      cash: { r21: 0, r10: 100, r4: 0 },
    });
    expect(out[2]).toEqual({
      sales: {},
      re: { r21: 0, r10: 0, r4: 0 },
      intra: [{ key: 'A', vatId: '', name: 'Sin NIF', base: 10 }],
      cash: { r21: 0, r10: 0, r4: 0 },
    });
  });
});

describe('Books with the VAT columns of the AEAT layout', () => {
  // The heading lines of the issued book of LSI.xlsx (abridged): «NIF Destinatario» has its
  // country and number in the second line.
  const issued: BookCell[][] = [
    [
      'Fecha Expedición',
      'Nombre Destinatario',
      'NIF Destinatario',
      null,
      null,
      'Clave de Operación',
      'Calificación de la Operación',
      'Operación Exenta',
      'Base Imponible',
      'Tipo de IVA',
      'Cuota IVA Repercutida',
      'Tipo de Recargo Eq.',
      'Cuota Recargo Eq.',
    ],
    [null, null, 'Tipo', 'Código País', 'Identificación'],
    [
      '15/01/2026',
      'Client Lyon',
      '02',
      'FR',
      '12345678901',
      '01',
      null,
      'E5',
      2000,
      null,
      null,
      null,
      null,
    ],
    ['20/01/2026', 'Export Inc', '04', 'US', '123', '02', null, 'E2', 800, null, null, null, null],
    ['25/01/2026', 'Tienda Centro', null, null, null, '01', 'S1', null, 100, 21, 21, 5.2, 5.2],
    [
      '28/01/2026',
      'Consulting PT',
      '02',
      'PT',
      '123456789',
      '01',
      'N2',
      null,
      600,
      null,
      null,
      null,
      null,
    ],
    ['30/01/2026', 'Mal tipo', null, null, null, '01', 'S1', null, 100, 7, null, null, null],
  ];

  it('reads the operation, the VAT number and the key of each issued invoice', () => {
    const parsed = parseInvoiceBook(issued, 'issued', 2026);
    if (!parsed.ok) throw new Error('no');
    const [eu, exp, re, service] = parsed.result.entries;
    expect(eu).toMatchObject({ op: 'intraEU', vatId: 'FR12345678901', key349: 'E', vatRate: 0 });
    expect(exp).toMatchObject({ op: 'export', vatRate: 0 });
    expect(exp.vatId).toBeUndefined();
    expect(re).toMatchObject({ op: 're', vatRate: 21 });
    expect(service).toMatchObject({ op: 'intraEU', vatId: 'PT123456789', key349: 'S' });
    // A rate the draft does not take is still left out.
    expect(parsed.result.skipped.rate).toBe(1);
  });

  // The received book: an intra-EU purchase without a rate, an import (F5), a reverse charge, an
  // investment good under cash accounting.
  const received: BookCell[][] = [
    [
      'Fecha Expedición',
      'Nombre Expedidor',
      'NIF Expedidor',
      'Tipo de Factura',
      'Clave de Operación',
      'Bien de Inversión',
      'Inversión del Sujeto Pasivo',
      'Base Imponible',
      'Tipo de IVA',
      'Cuota IVA Soportado',
    ],
    ['10/02/2026', 'Lieferant GmbH', 'DE123456789', 'F1', '09', 'N', 'N', 1000, null, null],
    ['11/02/2026', 'Aduana DUA', 'B00000000', 'F5', '01', 'N', 'N', 500, 21, 105],
    ['12/02/2026', 'Constructora', 'B00000001', 'F1', '01', 'N', 'S', 300, null, null],
    ['13/02/2026', 'Maquinaria SA', 'B00000002', 'F1', '07', 'S', 'N', 4000, 21, 840],
    ['14/02/2026', 'Software Ltd', 'IE1234567T', 'F1', '09', 'N', 'N', 100, 21, 21],
  ];

  it('reads the operation of each received invoice and assumes 21 % for a self-assessed one', () => {
    const parsed = parseInvoiceBook(received, 'received', 2026);
    if (!parsed.ok) throw new Error('no');
    const [aib, dua, isp, machine, service] = parsed.result.entries;
    expect(aib).toMatchObject({ op: 'intraGoods', vatRate: 21, rateGuessed: true, key349: 'A' });
    expect(aib.vatId).toBe('DE123456789');
    expect(dua).toMatchObject({ op: 'import', vatRate: 21 });
    expect(isp).toMatchObject({ op: 'reverse', vatRate: 21, rateGuessed: true });
    expect(machine).toMatchObject({ investment: true, cash: true });
    expect(machine.op).toBeUndefined();
    // «Software» is a service: key I.
    expect(service).toMatchObject({ op: 'intraServices', key349: 'I' });
    expect(service.rateGuessed).toBeUndefined();
  });

  it('reads the collections of the cash-accounting invoices, for the 347', () => {
    // The AEAT layout: «Cobro (Operación Criterio de Caja…)» over «Fecha» and «Importe». Key 07 is
    // the cash regime; an empty date means not collected yet; a plain invoice keeps no collections.
    const book: BookCell[][] = [
      [
        'Fecha Expedición',
        'Nombre Destinatario',
        'Clave de Operación',
        'Base Imponible',
        'Tipo de IVA',
        'Cuota IVA Repercutida',
        'Cobro (Operación Criterio de Caja de IVA y/o artículo 7.2.1º de Reglamento del IRPF)',
        null,
      ],
      [null, null, null, null, null, null, 'Fecha', 'Importe'],
      ['14/02/2026', 'Cliente Caja', '07', 1000, 21, 210, '20/11/2026', '605,00'],
      ['15/02/2026', 'Pendiente', '07', 1000, 21, 210, null, null],
      ['16/02/2026', 'General', '01', 1000, 21, 210, '16/02/2026', 1210],
    ];
    const parsed = parseInvoiceBook(book, 'issued', 2026);
    if (!parsed.ok) throw new Error('no');
    const [paid, open, plain] = parsed.result.entries;
    expect(paid).toMatchObject({ cash: true, collections: [{ date: '2026-11-20', amount: 605 }] });
    expect(open).toMatchObject({ cash: true, collections: [] });
    expect(plain.collections).toBeUndefined();
    // A simple sheet: «Fecha de pago» alone takes the whole invoice; «Importe pagado» its own amount.
    const simple = (headings: string[], cells: (string | number)[]) =>
      parseInvoiceBook(
        [
          ['Fecha', 'Proveedor', 'Base imponible', 'Tipo IVA', 'Clave de operación', ...headings],
          ['10/03/2026', 'Proveedor Caja', 1000, 21, '07', ...cells],
        ],
        'received',
        2026
      );
    const whole = simple(['Fecha de pago'], ['30/04/2026']);
    const part = simple(['Fecha de pago', 'Importe pagado'], ['30/04/2026', 500]);
    if (!whole.ok || !part.ok) throw new Error('no');
    expect(whole.result.entries[0].collections).toEqual([{ date: '2026-04-30', amount: 1210 }]);
    expect(part.result.entries[0].collections).toEqual([{ date: '2026-04-30', amount: 500 }]);
  });

  it('keeps the plain domestic invoices as they were (no VAT fields)', () => {
    const parsed = parseInvoiceBook(
      [
        ['Fecha', 'Proveedor', 'Base imponible', 'Tipo IVA'],
        ['15/03/2026', 'Papelería', 100, 21],
        ['16/03/2026', 'Sin tipo', 100, null],
      ],
      'received',
      2026
    );
    if (!parsed.ok) throw new Error('no');
    expect(parsed.result.entries).toEqual([
      {
        date: '2026-03-15',
        quarter: 1,
        base: 100,
        vatRate: 21,
        vat: 21,
        total: 121,
        withheld: 0,
        concept: 'Papelería',
      },
    ]);
    expect(parsed.result.skipped.rate).toBe(1);
  });
});
