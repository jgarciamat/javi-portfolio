/**
 * The PDF to copy into Renta WEB: «Empieza aquí», a section per window, the totals and the annex,
 * with the title, the «not an official document» mark and «Página X de Y» on every page, and only
 * characters the standard fonts can draw.
 */
import { buildLedger } from '@modules/tools/domain/invest/ledger';
import { copyPlan, reportTables } from '@modules/tools/domain/invest/report';
import { rentaWebKit } from '@modules/tools/domain/invest/rentaWeb';
import type { InvestOp } from '@modules/tools/domain/invest/types';
import { reportPdfBytes, winAnsi } from '@modules/tools/application/reportPdf';

let n = 0;
const op = (o: Partial<InvestOp> & Pick<InvestOp, 'kind' | 'date' | 'asset'>): InvestOp => ({
  id: `p:${++n}`,
  format: 'test',
  account: 'Bróker',
  at: `${o.date}T12:00:00`,
  assetClass: 'crypto',
  units: 1,
  amount: null,
  currency: 'EUR',
  eur: null,
  fee: 0,
  feeCurrency: null,
  ...o,
});
const ledgerOf = (ops: InvestOp[]) => buildLedger(ops, { year: 2025, rates: {} });

/** The PDF, uncompressed, as text: what it writes can be searched. */
async function pdfOf(ops: InvestOp[]) {
  const ledger = ledgerOf(ops);
  const kit = rentaWebKit(ledger);
  const bytes = await reportPdfBytes(
    {
      title: 'Renta 2025: lo que tienes que copiar en Renta WEB',
      year: 2025,
      plan: copyPlan(kit),
      sheets: reportTables(ledger, kit),
    },
    { compress: false }
  );
  return new TextDecoder('latin1').decode(bytes);
}
const pages = (pdf: string) => Number(/\/Count (\d+)/.exec(pdf)?.[1]);

describe('what the standard fonts can draw', () => {
  it('keeps accents, ñ, € and quotes; spells or replaces the rest', () => {
    expect(winAnsi('Año: 1,5 € «sí» “ok” · •')).toBe('Año: 1,5 € «sí» “ok” · •');
    expect(winAnsi('≥ 5 → ₮\t✓')).toBe('>= 5 -> USDT x');
    expect(winAnsi('ŁĀ①🚀')).toBe('?A1?');
  });
});

describe('the PDF', () => {
  it('has «Empieza aquí», a section per window, the totals and the annex, with header and footer', async () => {
    const pdf = await pdfOf([
      op({ kind: 'buy', date: '2024-01-01', asset: 'BTC', eur: 100 }),
      op({ kind: 'sell', date: '2025-02-01', asset: 'BTC', eur: 150 }),
      op({ kind: 'buy', date: '2024-01-01', asset: 'ETH', eur: 100 }),
      op({ kind: 'sell', date: '2025-03-01', asset: 'ETH', eur: 50 }),
      op({ kind: 'interest', date: '2025-01-01', asset: 'C', units: 0, eur: 5 }),
    ]);
    const total = pages(pdf);
    expect(total).toBeGreaterThanOrEqual(4);
    for (const text of [
      'Empieza aqu',
      'Filas que copiar',
      'Los 3 pasos',
      'Ejemplo resuelto',
      'Copia estas 2 filas en la ventana',
      'COPIAR EN RENTA WEB',
      'NO COPIAR: solo para comprobar',
      'Hecho',
      'Al terminar esta ventana',
      'Totales que debes ver en Renta WEB',
      'Comprobado',
      'al menos 4 a',
      'art. 66 LGT',
      'Anexo: detalle por operaci',
      'Preparado con Finanverso',
      'no es un documento oficial',
      'Renta 2025 ',
      'Finanverso-Renta-2025-copiar-en-Renta-WEB.pdf',
      `de ${total})`,
      '50,00',
      'F - Moneda de curso legal',
    ])
      expect(pdf).toContain(text);
    expect(pdf).not.toMatch(/Excel/);
  });

  it('with income alone: the boxes to write on the first page', async () => {
    const pdf = await pdfOf([
      op({ kind: 'interest', date: '2025-01-01', asset: 'C', units: 0, eur: 5 }),
    ]);
    expect(pdf).toContain('Escribe estos importes en Renta WEB');
    expect(pdf).not.toContain('Filas que copiar');
    expect(pdf).not.toContain('Copia est');
  });

  it('with hundreds of rows and long names: fast, wrapped and the header on every page', async () => {
    const ops: InvestOp[] = [];
    for (let i = 0; i < 420; i++) {
      const asset = `MONEDA FICTICIA CON UN NOMBRE MUY LARGO QUE NO CABE EN UNA SOLA LINEA ${i}`;
      ops.push(op({ kind: 'buy', date: '2024-01-01', asset, eur: 100 }));
      ops.push(op({ kind: 'sell', date: '2025-02-01', asset, eur: 100 + (i % 7) - 3 }));
    }
    const started = Date.now();
    const pdf = await pdfOf(ops);
    expect(Date.now() - started).toBeLessThan(20000);
    expect(pages(pdf)).toBeGreaterThan(10);
    // The band over the columns comes back on every page of the window.
    expect(pdf.split('COPIAR EN RENTA WEB').length - 1).toBeGreaterThan(5);
  });

  it('lays out sections without a kind as the annex, and the start without totals', async () => {
    const bytes = await reportPdfBytes({
      title: 'Renta 2025',
      year: 2025,
      plan: { windows: [], rows: 0, minutes: 0, example: null },
      sheets: [
        {
          name: '0',
          kind: 'start',
          title: 'Empieza aquí',
          caption: 'Escribe estos importes:',
          rows: [
            ['Casilla', 'Importe'],
            ['0027', 1],
          ],
        },
        { name: 'Sin tipo', rows: [['A'], ['x']] },
      ],
    });
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });
});
