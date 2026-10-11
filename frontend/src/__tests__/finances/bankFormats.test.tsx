import { fireEvent, screen } from '@testing-library/react';
import { bankMapping, detectBank, normalizeBankTable } from '@modules/finances/domain/bankFormats';
import { parseCSV, rowsFromCSV } from '@modules/finances/domain/importParsers';
import { ImportModal } from '@modules/finances/ui/components/ImportModal';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

/** Statements laid out like each bank's download (synthetic data). */
const FILES = {
  caixabank: [
    'Número de cuenta;Oficina;Divisa;F. Operación;F. Valor;Ingreso (+);Gasto (-);Saldo (+);Saldo (-);Concepto común;Concepto propio;Referencia 1;Referencia 2;Concepto complementario 1',
    'ES1200000000000000000000;0123;EUR;03/03/2026;03/03/2026;;54,30;1.200,00;;COMPRAS Y OPERACIONES;MERCADONA 0231;;;',
    'ES1200000000000000000000;0123;EUR;01/03/2026;01/03/2026;1.800,00;;1.254,30;;NÓMINA;ACME SL;;;MARZO',
  ].join('\n'),
  bbva: [
    'F.Valor;Fecha;Concepto;Movimiento;Importe;Divisa;Disponible;Divisa;Observaciones',
    '03/03/2026;03/03/2026;MERCADONA;Compra con tarjeta;-54,30;EUR;1.200,00;EUR;',
    '01/03/2026;01/03/2026;NOMINA ACME;Transferencia;1.800,00;EUR;1.254,30;EUR;',
  ].join('\n'),
  santander: [
    'Cuenta: ES12 0000 0000 00 0000000000',
    'Titular: Persona de Prueba',
    '',
    'FECHA OPERACIÓN;FECHA VALOR;CONCEPTO;IMPORTE;SALDO',
    '03/03/2026;03/03/2026;COMPRA MERCADONA;-54,30;1.200,00',
    '01/03/2026;01/03/2026;TRANSFERENCIA NOMINA;1.800,00;1.254,30',
  ].join('\n'),
  ing: [
    'Movimientos de la Cuenta',
    'Cuenta Nómina;ES12 0000 0000 00 0000000000',
    'Saldo;1.200,00',
    '',
    'F. VALOR;CATEGORÍA;SUBCATEGORÍA;DESCRIPCIÓN;COMENTARIO;IMAGEN;IMPORTE (€);SALDO (€)',
    '03/03/2026;Alimentación;Supermercado;Compra Mercadona;;;-54,30;1.200,00',
    '01/03/2026;Nómina;Nómina;Nómina Acme;;;1.800,00;1.254,30',
  ].join('\n'),
  revolut: [
    'Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance',
    'CARD_PAYMENT,Current,2026-03-03 10:15:00,2026-03-03 10:15:02,Mercadona,-54.30,0.00,EUR,COMPLETED,1200.00',
    'TRANSFER,Current,2026-03-01 08:00:00,2026-03-01 08:00:05,Nómina Acme,1800.00,0.00,EUR,COMPLETED,1254.30',
    'CARD_PAYMENT,Current,2026-03-04 10:15:00,,Gasolinera,-40.00,0.00,EUR,PENDING,',
    'EXCHANGE,Current,2026-03-05 09:00:00,2026-03-05 09:00:01,Cambio a USD,-100.00,1.50,EUR,COMPLETED,1100.00',
    'CARD_PAYMENT,Current,2026-03-06 09:00:00,2026-03-06 09:00:01,Cancelado,-9.00,0.00,EUR,REVERTED,',
  ].join('\n'),
  revolutEs: [
    'Tipo,Producto,Fecha de inicio,Fecha de finalización,Descripción,Importe,Comisión,Divisa,Estado,Saldo',
    'Pago con tarjeta,Actual,2026-03-03 10:15:00,2026-03-03 10:15:02,Mercadona,"-54,30",0,EUR,Completado,',
  ].join('\n'),
};

const read = (name: keyof typeof FILES) => {
  const table = parseCSV(FILES[name]);
  const found = detectBank(table);
  const bankTable = normalizeBankTable(table.slice(found.headerRow), found.bank);
  const parsed = rowsFromCSV(bankTable, bankMapping(bankTable[0], found.bank));
  return { found, parsed };
};

describe('bank statement formats', () => {
  it.each([
    ['caixabank', 'caixabank'],
    ['bbva', 'bbva'],
    ['santander', 'santander'],
    ['ing', 'ing'],
    ['revolut', 'revolut'],
    ['revolutEs', 'revolut'],
  ] as const)('recognises %s and reads its movements', (name, bank) => {
    const { found, parsed } = read(name);
    expect(found.bank).toBe(bank);
    expect(parsed.skipped).toEqual([]);
    expect(parsed.rows[0]).toMatchObject({ date: '2026-03-03', amount: -54.3 });
    expect(parsed.rows[0].description.toLowerCase()).toContain('mercadona');
    if (name !== 'revolutEs') {
      expect(parsed.rows[1]).toMatchObject({ date: '2026-03-01', amount: 1800 });
    }
  });

  it('skips the lines above the header', () => {
    expect(detectBank(parseCSV(FILES.santander)).headerRow).toBe(2);
    expect(detectBank(parseCSV(FILES.ing)).headerRow).toBe(3);
  });

  it('joins the CaixaBank concept columns', () => {
    expect(read('caixabank').parsed.rows.map((r) => r.description)).toEqual([
      'COMPRAS Y OPERACIONES MERCADONA 0231',
      'NÓMINA ACME SL MARZO',
    ]);
  });

  it('keeps only completed Revolut rows, taking the fee off the amount', () => {
    const { parsed } = read('revolut');
    expect(parsed.rows.map((r) => [r.description, r.amount])).toEqual([
      ['Mercadona', -54.3],
      ['Nómina Acme', 1800],
      ['Cambio a USD', -101.5],
    ]);
  });

  it('ignores the categories of ING, which are not ours', () => {
    expect(bankMapping(parseCSV(FILES.ing)[3], 'ing').category).toBe(-1);
    expect(read('ing').parsed.rows[0].category).toBeNull();
  });

  it('falls back to the generic detection for unknown layouts', () => {
    const table = parseCSV('Foo;Bar\nx;y\nFecha;Concepto;Importe\n01/03/2026;Café;-1,50');
    expect(detectBank(table)).toEqual({ bank: null, headerRow: 2 });
    expect(detectBank(parseCSV('a;b\n1;2'))).toEqual({ bank: null, headerRow: 0 });
    expect(normalizeBankTable(table, null)).toBe(table);
  });

  it('copes with short rows in CaixaBank and Revolut files', () => {
    const caixa = parseCSV(
      'F. Operación;Ingreso (+);Gasto (-);Concepto común\n03/03/2026;;5,00;COMPRA\n04/03/2026'
    );
    const normalized = normalizeBankTable(caixa, 'caixabank');
    expect(normalized[1]).toEqual(['03/03/2026', 'COMPRA', '', '5,00']);
    expect(normalized[2]).toEqual(['04/03/2026', '', '', '']);
    const revolut = parseCSV(
      'Started Date,Completed Date,Description,Amount,Fee,State\n2026-03-03,2026-03-03,Café,-1.5,,COMPLETED\n2026-03-04,2026-03-04'
    );
    expect(normalizeBankTable(revolut, 'revolut').slice(1)).toEqual([
      ['2026-03-03', 'Café', '-1.5'],
    ]);
    expect(normalizeBankTable([caixa[0], []], 'caixabank')[1]).toEqual(['', '', '', '']);
    const noColumns = [['x'], ['y']];
    expect(normalizeBankTable(noColumns, 'revolut')[1]).toEqual(['', '', '0']);
  });

  it('copes with a Revolut export without state or fee columns', () => {
    const table = parseCSV(
      'Started Date,Completed Date,Description,Amount\n2026-03-03,2026-03-03,Café,"-1,50"\n2026-03-04,2026-03-04,Libro,abc'
    );
    const normalized = normalizeBankTable(table, 'revolut');
    expect(normalized).toEqual([
      ['Fecha', 'Descripción', 'Importe'],
      ['2026-03-03', 'Café', '-1.5'],
      ['2026-03-04', 'Libro', '0'],
    ]);
  });
});

describe('ImportModal with a bank file', () => {
  const file = (content: string, name: string): File => {
    const bytes = new TextEncoder().encode(content);
    return Object.assign(new File([bytes as BlobPart], name), {
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });
  };

  it('says which bank it recognised and lets the user continue', async () => {
    const api = createFakeApi();
    renderWithProviders(
      <ImportModal
        accounts={[f.account({ id: 'a1', isDefault: true })]}
        onClose={jest.fn()}
        onImported={jest.fn()}
      />,
      { api, finances: false }
    );
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [file(FILES.ing, 'ing.csv')] },
    });
    expect(
      await screen.findByText(tr('app.import.bankDetected', { bank: 'ING' }), { exact: false })
    ).toBeInTheDocument();
    expect(screen.getByText(/2 movimientos leídos/)).toBeInTheDocument();
  });
});
