import {
  detectBooks,
  expensesByQuarter,
  parseInvoiceBook,
  quarterOfPeriod,
  type BookEntry,
} from '@modules/finances/domain/invoiceBook';
import {
  mergeInvoices,
  sameSupplier,
  supplierKey,
  toInvoices,
  updateInvoices,
} from '@modules/finances/domain/invoiceLedger';

const entry = (over: Partial<BookEntry> = {}): BookEntry => ({
  date: '2026-02-10',
  quarter: 1,
  base: 100,
  vatRate: 21,
  vat: 21,
  total: 121,
  withheld: 0,
  concept: 'Gestoría Pérez SL',
  ...over,
});

describe('The quarter a «Periodo» column says', () => {
  it.each([
    ['1T', 1],
    ['T2', 2],
    ['3', 3],
    ['4.º trimestre', 4],
    ['2º T', 2],
    ['1er trimestre', 1],
    ['Q3', 3],
    ['trimestre 4', 4],
    ['3T 2026', 3],
  ])('reads %s', (text, quarter) => expect(quarterOfPeriod(text)).toBe(quarter));

  it.each([['07'], ['12'], [''], [null], ['anual'], [5]])('ignores %s', (text) =>
    expect(quarterOfPeriod(text)).toBeNull()
  );

  it('is kept with each invoice only when the book has that column', () => {
    const withPeriod = parseInvoiceBook(
      [
        ['Ejercicio', 'Periodo', 'Fecha', 'Base imponible', 'Tipo IVA'],
        ['2026', '2T', '2026-07-10', 100, 21],
      ],
      'issued',
      2026
    );
    expect(withPeriod.ok && withPeriod.result.entries[0]).toMatchObject({ quarter: 3, period: 2 });
    const without = parseInvoiceBook(
      [
        ['Fecha', 'Base imponible', 'Tipo IVA'],
        ['2026-07-10', 100, 21],
      ],
      'issued',
      2026
    );
    expect(without.ok && 'period' in without.result.entries[0]).toBe(false);
  });
});

describe('Which book a sheet is', () => {
  const head = (...cols: string[]) => [[...cols, 'Base imponible', 'Tipo IVA']];

  it('goes by the sheet name, then the headings, then the file name', () => {
    const found = detectBooks(
      [
        { name: 'Ventas', rows: head('Fecha') },
        { name: 'Hoja2', rows: head('Fecha', 'Proveedor') },
        { name: 'Hoja3', rows: head('Fecha', 'Nombre destinatario') },
        { name: 'Hoja4', rows: head('Fecha') },
        { name: 'Instrucciones', rows: [['Escribe una factura por fila']] },
      ],
      'gastos.xlsx'
    );
    expect(found.books.issued?.map((s) => s.name)).toEqual(['Ventas', 'Hoja3']);
    expect(found.books.received?.map((s) => s.name)).toEqual(['Hoja2', 'Hoja4']);
    expect(found.unknown).toEqual([]);
  });

  it('asks when the signals contradict each other or there are none', () => {
    const found = detectBooks(
      [
        { name: 'Ingresos y gastos', rows: head('Fecha', 'Cliente', 'Proveedor') },
        { name: 'Hoja', rows: head('Fecha') },
      ],
      'libro.csv'
    );
    expect(found.books).toEqual({});
    expect(found.unknown).toHaveLength(2);
  });

  it('knows the books of the AEAT by «expedidor» and the withholdings, not by «fecha expedición»', () => {
    const issued = [['Fecha expedición', 'Base imponible', 'Tipo de IVA', 'Importe retenido']];
    const received = [['Fecha expedición', 'Nombre expedidor', 'Base imponible', 'Tipo de IVA']];
    expect(Object.keys(detectBooks([{ name: 'A', rows: issued }], 'a.xlsx').books)).toEqual([
      'issued',
    ]);
    expect(Object.keys(detectBooks([{ name: 'A', rows: received }], 'a.xlsx').books)).toEqual([
      'received',
    ]);
  });
});

describe('The imported invoices, one by one', () => {
  it('normalises the supplier: accents, case, punctuation and company suffixes', () => {
    expect(supplierKey('Gestoría Pérez, S.L.')).toBe('gestoria perez');
    expect(supplierKey('GESTORIA PEREZ SL')).toBe('gestoria perez');
    expect(supplierKey('Taller Beta S.A.')).toBe('taller beta');
    expect(supplierKey('')).toBe('');
  });

  it('gives stable ids, a counter to repeated rows and keeps what was corrected', () => {
    const entries = [entry(), entry(), entry({ concept: 'Repsol', base: 50 })];
    const first = toInvoices('received', entries, {}, []);
    expect(new Set(first.map((i) => i.id)).size).toBe(3);
    expect(first[1].id).toBe(`${first[0].id}-2`);
    expect(first.map((i) => i.kind)).toEqual(['management', 'management', 'vehicle']);
    const corrected = [{ ...first[0], kind: 'training' as const, excluded: true }];
    const again = toInvoices('received', entries, {}, corrected);
    expect(again.map((i) => i.id)).toEqual(first.map((i) => i.id));
    expect(again[0]).toMatchObject({ kind: 'training', excluded: true });
    expect(again[1]).toMatchObject({ kind: 'management', excluded: false });
  });

  it('starts from the preferences of the supplier, and issued invoices have no kind', () => {
    const [received] = toInvoices('received', [entry()], { 'gestoria perez': 'software' }, []);
    expect(received.kind).toBe('software');
    const [issued] = toInvoices('issued', [entry()], { 'gestoria perez': 'software' }, []);
    expect(issued).toMatchObject({ kind: 'other', book: 'issued' });
    expect(issued.id).not.toBe(received.id);
  });

  it('replaces the quarters a book brings and keeps the rest', () => {
    const q1 = toInvoices('received', [entry()], {}, []);
    const q2 = toInvoices('received', [entry({ quarter: 2, date: '2026-05-01' })], {}, []);
    const issued = toInvoices('issued', [entry()], {}, []);
    const list = [...q1, ...q2, ...issued];
    const again = toInvoices('received', [entry({ base: 300 }), entry({ base: 5 })], {}, list);
    const merged = mergeInvoices(list, 'received', again);
    expect(merged.quarters).toEqual([1]);
    expect(merged.list).toEqual([...q2, ...issued, ...again]);
  });

  it('changes some invoices and says which quarters of which book change', () => {
    const list = [
      ...toInvoices('received', [entry(), entry({ quarter: 3, date: '2026-08-01' })], {}, []),
      ...toInvoices('issued', [entry({ quarter: 2, date: '2026-04-01' })], {}, []),
    ];
    const { list: next, quarters } = updateInvoices(
      list,
      list.map((i) => i.id),
      { excluded: true }
    );
    expect(next.every((i) => i.excluded)).toBe(true);
    expect(quarters).toEqual({ received: [1, 3], issued: [2] });
    expect(updateInvoices(list, [list[0].id, list[0].id], { kind: 'rent' }).quarters).toEqual({
      received: [1],
    });
  });

  it('finds the other invoices of the same supplier with another kind', () => {
    const list = toInvoices(
      'received',
      [
        entry(),
        entry({ date: '2026-03-10', concept: 'GESTORIA PEREZ' }),
        entry({ date: '2026-03-11', concept: 'Otro' }),
        entry({ date: '', concept: '' }),
        entry({ date: '2026-01-01', concept: '' }),
      ],
      {},
      []
    );
    const changed = { ...list[0], kind: 'training' as const };
    expect(sameSupplier(list, changed).map((i) => i.id)).toEqual([list[1].id]);
    expect(
      sameSupplier([...list, { ...list[1], id: 'x', kind: 'training' }], changed)
    ).toHaveLength(1);
    expect(sameSupplier(list, { ...list[3], kind: 'rent' })).toEqual([]);
    expect(
      sameSupplier(
        list.map((i) => ({ ...i, book: 'issued' as const })),
        changed
      )
    ).toEqual([]);
  });

  it('groups the expenses by the kind each invoice has', () => {
    const lines = expensesByQuarter([entry(), entry({ concept: 'Restaurante' })], () => 'meals');
    expect(lines[1]?.map((l) => [l.kind, l.days])).toEqual([
      ['meals', 1],
      ['meals', 1],
    ]);
  });
});
