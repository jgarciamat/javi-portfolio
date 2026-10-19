import { deflateSync } from 'zlib';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

/**
 * Synthetic invoices in PDF to try the invoice reader of Autónomos: every company, tax id and amount
 * is made up (the tax ids only have a valid format). Each one has a different layout, the way
 * invoices that arrive by email do. The self-employed person of the examples is Laura Martín Gómez.
 */

const WIDTH = 595;
const HEIGHT = 842;
const INK = rgb(0.12, 0.14, 0.2);
const GREY = rgb(0.4, 0.43, 0.5);

interface Pen {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  /** Text from its left edge. */
  t(
    text: string,
    x: number,
    y: number,
    o?: { size?: number; bold?: boolean; grey?: boolean }
  ): void;
  /** Text ending at `x` (amounts in columns). */
  r(text: string, x: number, y: number, o?: { size?: number; bold?: boolean }): void;
  rule(y: number, from?: number, to?: number): void;
}

async function draw(paint: (pen: Pen) => void): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([WIDTH, HEIGHT]);
  const pen: Pen = {
    page,
    font,
    bold,
    t: (text, x, y, o = {}) =>
      page.drawText(text, {
        x,
        y,
        size: o.size ?? 9.5,
        font: o.bold ? bold : font,
        color: o.grey ? GREY : INK,
      }),
    r: (text, x, y, o = {}) => {
      const f = o.bold ? bold : font;
      const size = o.size ?? 9.5;
      page.drawText(text, { x: x - f.widthOfTextAtSize(text, size), y, size, font: f, color: INK });
    },
    rule: (y, from = 40, to = WIDTH - 40) =>
      page.drawLine({ start: { x: from, y }, end: { x: to, y }, thickness: 0.6, color: GREY }),
  };
  paint(pen);
  doc.setTitle('Factura de ejemplo (sintética)');
  doc.setProducer('Finanverso, ejemplos de importación');
  return doc.save();
}

const ME = ['Laura Martín Gómez', 'NIF 12345678Z', 'C/ Ejemplo 10, 3.º B', '28001 Madrid'];

/** A small greyscale PNG that looks like a scanned page: bars where the lines of text would be. */
function scannedPng(width: number, height: number): Uint8Array {
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const line = y % 18 < 7 && y > 30 && y < height - 30;
      const word = (Math.floor(x / 23) + Math.floor(y / 18)) % 5 !== 0;
      const ink = line && x > 30 && x < width - 30 - ((y * 7) % 90) && word;
      raw[y * (width + 1) + 1 + x] = ink ? 60 : 235 + ((x * y) % 13);
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes: Buffer) => {
    let c = 0xffffffff;
    for (const b of bytes) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const head = Buffer.alloc(4);
    head.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const tail = Buffer.alloc(4);
    tail.writeUInt32BE(crc(body));
    return Buffer.concat([head, body, tail]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // greyscale
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** What the reader should find in each example (null: it must be turned down). */
export interface Expected {
  date: string | null;
  number: string | null;
  issuer: { name: string | null; nif: string | null };
  client: { name: string | null; nif: string | null };
  taxes: { rate: number | null; base: number | null; vat: number | null }[];
  withheld: number;
  total: number | null;
  credit: boolean;
  review: string[];
  /** Which book it goes to with nothing known about the person: null means it asks. */
  book: 'issued' | 'received' | null;
}

export interface Example {
  file: string;
  /** Rejected with this reason instead of read. */
  rejected?: 'noText' | 'currency';
  expected?: Expected;
  build: () => Promise<Uint8Array>;
}

export const INVOICE_EXAMPLES: Example[] = [
  {
    // Issuer on the left, client on the right, labels with their amounts on the same line.
    file: '01-luz-cabecera-izquierda.pdf',
    expected: {
      date: '2026-03-12',
      number: 'E-2026-000318',
      issuer: { name: 'Eléctrica del Ejemplo SA', nif: 'A87654321' },
      client: { name: 'Laura Martín Gómez', nif: '12345678Z' },
      taxes: [{ rate: 21, base: 100, vat: 21 }],
      withheld: 0,
      total: 121,
      credit: false,
      review: [],
      book: 'received',
    },
    build: () =>
      draw((p) => {
        p.t('Eléctrica del Ejemplo SA', 40, 790, { size: 15, bold: true });
        p.t('CIF A87654321', 40, 772);
        p.t('Avda. de la Luz 1, 28010 Madrid', 40, 759, { grey: true });
        p.t('Cliente:', 340, 790, { bold: true });
        ME.forEach((l, i) => p.t(l, 340, 776 - i * 13));
        p.t('FACTURA', 40, 700, { size: 18, bold: true });
        p.t('Nº factura: E-2026-000318', 40, 680);
        p.t('Fecha factura: 12/03/2026', 40, 666);
        p.t('Fecha de vencimiento: 12/04/2026', 40, 652);
        p.t('Periodo de facturación: 01/02/2026 - 28/02/2026', 40, 638, { grey: true });
        p.rule(620);
        p.t('Concepto', 40, 604, { bold: true });
        p.r('Importe', 555, 604, { bold: true });
        p.t('Energía consumida (suministro eléctrico)', 40, 588);
        p.r('80,00 €', 555, 588);
        p.t('Término de potencia', 40, 574);
        p.r('20,00 €', 555, 574);
        p.rule(560);
        p.t('Base imponible', 360, 540);
        p.r('100,00 €', 555, 540);
        p.t('IVA 21 %', 360, 525);
        p.r('21,00 €', 555, 525);
        p.t('Total factura', 360, 506, { bold: true });
        p.r('121,00 €', 555, 506, { bold: true });
      }),
  },
  {
    // Issuer on the right, a table of lines and the totals as headings over their values.
    file: '02-papeleria-tabla-cabecera-derecha.pdf',
    expected: {
      date: '2026-02-05',
      number: 'F-2026-0012',
      issuer: { name: 'Papelería Ejemplar SL', nif: 'B23456789' },
      client: { name: 'Laura Martín Gómez', nif: '12345678Z' },
      taxes: [{ rate: 21, base: 85, vat: 17.85 }],
      withheld: 0,
      total: 102.85,
      credit: false,
      review: [],
      book: 'received',
    },
    build: () =>
      draw((p) => {
        p.r('Papelería Ejemplar SL', 555, 795, { size: 14, bold: true });
        p.r('B23456789', 555, 778);
        p.r('C/ Tinta 4, 46001 Valencia', 555, 765);
        p.t('FACTURA', 40, 795, { size: 20, bold: true });
        p.t('Factura nº F-2026-0012', 40, 770);
        p.t('Fecha: 05-02-26', 40, 756);
        p.t('Facturar a', 40, 720, { bold: true });
        ME.forEach((l, i) => p.t(l, 40, 706 - i * 13));
        p.rule(640);
        p.t('Descripción', 40, 626, { bold: true });
        p.r('Cantidad', 360, 626, { bold: true });
        p.r('Precio', 450, 626, { bold: true });
        p.r('Total', 555, 626, { bold: true });
        const items: [string, string, string, string][] = [
          ['Paquete de folios A4 (500 hojas)', '4', '5,00', '20,00'],
          ['Cuadernos de tapa dura', '5', '7,00', '35,00'],
          ['Material de oficina variado', '1', '30,00', '30,00'],
        ];
        items.forEach(([d, q, u, a], i) => {
          const y = 608 - i * 16;
          p.t(d, 40, y);
          p.r(q, 360, y);
          p.r(u, 450, y);
          p.r(a, 555, y);
        });
        p.rule(552);
        p.r('Base imponible', 360, 530, { bold: true });
        p.r('IVA 21%', 450, 530, { bold: true });
        p.r('Total', 555, 530, { bold: true });
        p.r('85,00', 360, 514);
        p.r('17,85', 450, 514);
        p.r('102,85 €', 555, 514, { bold: true });
      }),
  },
  {
    // A restaurant with two VAT rates, in a breakdown table; the date as 2026-04-15.
    file: '03-restaurante-dos-tipos-iva.pdf',
    expected: {
      date: '2026-04-15',
      number: 'T-0457',
      issuer: { name: 'Restaurante La Mesa Ejemplo SL', nif: 'B34567812' },
      client: { name: 'Laura Martín Gómez', nif: '12345678Z' },
      taxes: [
        { rate: 10, base: 60, vat: 6 },
        { rate: 21, base: 20, vat: 4.2 },
      ],
      withheld: 0,
      total: 90.2,
      credit: false,
      review: [],
      book: 'received',
    },
    build: () =>
      draw((p) => {
        p.t('Restaurante La Mesa Ejemplo SL', 40, 795, { size: 14, bold: true });
        p.t('NIF: B34567812 · Plaza Mayor 3, 37001 Salamanca', 40, 780, { grey: true });
        p.t('Factura simplificada completa', 40, 745, { bold: true });
        p.t('Número: T-0457', 40, 731);
        p.t('Fecha de expedición: 2026-04-15', 40, 717);
        p.t('Destinatario', 330, 745, { bold: true });
        ME.slice(0, 2).forEach((l, i) => p.t(l, 330, 731 - i * 13));
        p.rule(690);
        p.t('Concepto', 40, 676, { bold: true });
        p.r('Importe', 555, 676, { bold: true });
        p.t('Menú del día comida de trabajo (x3)', 40, 660);
        p.r('66,00', 555, 660);
        p.t('Bebidas alcohólicas', 40, 646);
        p.r('24,20', 555, 646);
        p.rule(630);
        p.t('Base imponible', 300, 610, { bold: true });
        p.t('% IVA', 400, 610, { bold: true });
        p.r('Cuota IVA', 555, 610, { bold: true });
        p.r('60,00', 360, 594);
        p.t('10 %', 400, 594);
        p.r('6,00', 555, 594);
        p.r('20,00', 360, 580);
        p.t('21 %', 400, 580);
        p.r('4,20', 555, 580);
        p.t('TOTAL', 300, 556, { bold: true, size: 12 });
        p.r('90,20 €', 555, 556, { bold: true, size: 12 });
      }),
  },
  {
    // Issued by the self-employed person to a company, with the IRPF withheld: the app asks.
    file: '04-emitida-profesional-retencion-irpf.pdf',
    expected: {
      date: '2026-05-12',
      number: '2026/014',
      issuer: { name: 'Laura Martín Gómez', nif: '12345678Z' },
      client: { name: 'Estudio Norte Ejemplo SL', nif: 'B45678123' },
      taxes: [{ rate: 21, base: 1000, vat: 210 }],
      withheld: 150,
      total: 1060,
      credit: false,
      review: [],
      book: null,
    },
    build: () =>
      draw((p) => {
        p.t(ME[0], 40, 795, { size: 14, bold: true });
        ME.slice(1).forEach((l, i) => p.t(l, 40, 780 - i * 13));
        p.t('Diseño gráfico y web', 40, 741, { grey: true });
        p.r('FACTURA 2026/014', 555, 795, { size: 13, bold: true });
        p.r('Fecha: 12.05.2026', 555, 778);
        p.t('Cliente', 300, 720, { bold: true });
        p.t('Estudio Norte Ejemplo SL', 300, 706);
        p.t('CIF B45678123', 300, 693);
        p.t('C/ Norte 7, 48001 Bilbao', 300, 680);
        p.rule(650);
        p.t('Descripción', 40, 636, { bold: true });
        p.r('Importe', 555, 636, { bold: true });
        p.t('Diseño de la identidad visual (abril 2026)', 40, 620);
        p.r('1.000,00 €', 555, 620);
        p.rule(600);
        p.t('Base imponible', 340, 580);
        p.r('1.000,00 €', 555, 580);
        p.t('IVA (21%)', 340, 565);
        p.r('210,00 €', 555, 565);
        p.t('Retención IRPF (15%)', 340, 550);
        p.r('-150,00 €', 555, 550);
        p.t('Total a pagar', 340, 530, { bold: true });
        p.r('1.060,00 €', 555, 530, { bold: true });
        p.t('Forma de pago: transferencia a ES00 0000 0000 0000 0000 0000', 40, 480, {
          grey: true,
        });
      }),
  },
  {
    // A credit note: the amounts are negative and the title says it.
    file: '05-abono-rectificativa.pdf',
    expected: {
      date: '2026-05-20',
      number: 'R-2026-003',
      issuer: { name: 'Informática Ejemplo SL', nif: 'B56781234' },
      client: { name: 'Laura Martín Gómez', nif: '12345678Z' },
      taxes: [{ rate: 21, base: -50, vat: -10.5 }],
      withheld: 0,
      total: -60.5,
      credit: true,
      review: [],
      book: 'received',
    },
    build: () =>
      draw((p) => {
        p.t('Informática Ejemplo SL', 40, 795, { size: 14, bold: true });
        p.t('CIF: B56781234', 40, 780);
        p.t('FACTURA RECTIFICATIVA (ABONO)', 40, 740, { size: 14, bold: true });
        p.t('Nº factura: R-2026-003', 40, 722);
        p.t('Rectifica a la factura F-2026-0101 del 02/05/2026', 40, 708, { grey: true });
        p.t('Fecha de emisión: 20/05/2026', 40, 694);
        p.t('Datos del cliente', 330, 740, { bold: true });
        ME.forEach((l, i) => p.t(l, 330, 726 - i * 13));
        p.rule(650);
        p.t('Concepto', 40, 636, { bold: true });
        p.r('Importe', 555, 636, { bold: true });
        p.t('Devolución de un ratón inalámbrico', 40, 620);
        p.r('-50,00', 555, 620);
        p.rule(600);
        p.t('Base imponible', 360, 580);
        p.r('-50,00 €', 555, 580);
        p.t('IVA 21%', 360, 565);
        p.r('-10,50 €', 555, 565);
        p.t('Total', 360, 546, { bold: true });
        p.r('-60,50 €', 555, 546, { bold: true });
      }),
  },
  {
    // The date in words, thousands with a dot, and the issuer only in the footer.
    file: '06-coworking-fecha-escrita-pie.pdf',
    expected: {
      date: '2026-03-12',
      number: 'CW-26-0031',
      issuer: { name: 'Coworking Ejemplo SL', nif: 'B67812345' },
      client: { name: 'Laura Martín Gómez', nif: '12345678Z' },
      taxes: [{ rate: 21, base: 1250, vat: 262.5 }],
      withheld: 0,
      total: 1512.5,
      credit: false,
      review: [],
      book: 'received',
    },
    build: () =>
      draw((p) => {
        p.t('FACTURA', 40, 790, { size: 22, bold: true });
        p.t('Madrid, 12 de marzo de 2026', 380, 795);
        p.t('Número de factura: CW-26-0031', 40, 760);
        p.t('Cliente:', 40, 730, { bold: true });
        p.t(`${ME[0]} · ${ME[1]}`, 90, 730);
        p.rule(700);
        p.t('Descripción', 40, 686, { bold: true });
        p.r('Importe', 555, 686, { bold: true });
        p.t('Alquiler de puesto fijo en coworking, marzo de 2026', 40, 670);
        p.r('1.250,00', 555, 670);
        p.rule(650);
        p.t('Base imponible: 1.250,00 €', 330, 630);
        p.t('IVA 21 %: 262,50 €', 330, 615);
        p.t('Total factura: 1.512,50 €', 330, 596, { bold: true });
        p.rule(70);
        p.t('Coworking Ejemplo SL · CIF B67812345 · C/ Compartida 2, 28004 Madrid', 40, 56, {
          size: 8,
          grey: true,
        });
      }),
  },
  {
    // In English, the euro sign before the amounts and the date as «March 12, 2026».
    file: '07-invoice-in-english.pdf',
    expected: {
      date: '2026-03-12',
      number: 'INV-0042',
      issuer: { name: 'Example Cloud Software Ltd', nif: 'B78123456' },
      client: { name: 'Laura Martín Gómez', nif: '12345678Z' },
      taxes: [{ rate: 21, base: 200, vat: 42 }],
      withheld: 0,
      total: 242,
      credit: false,
      review: [],
      book: 'received',
    },
    build: () =>
      draw((p) => {
        p.t('Example Cloud Software Ltd', 40, 795, { size: 14, bold: true });
        p.t('VAT ID: ESB78123456', 40, 780);
        p.t('INVOICE', 420, 795, { size: 18, bold: true });
        p.t('Invoice number: INV-0042', 380, 772);
        p.t('Invoice date: March 12, 2026', 380, 758);
        p.t('Due date: April 11, 2026', 380, 744);
        p.t('Bill to:', 40, 730, { bold: true });
        ME.slice(0, 2).forEach((l, i) => p.t(l, 40, 716 - i * 13));
        p.rule(670);
        p.t('Description', 40, 656, { bold: true });
        p.r('Amount', 555, 656, { bold: true });
        p.t('Annual software subscription (hosting plan)', 40, 640);
        p.r('€200.00', 555, 640);
        p.rule(620);
        p.t('Subtotal', 380, 600);
        p.r('€200.00', 555, 600);
        p.t('VAT (21%)', 380, 585);
        p.r('€42.00', 555, 585);
        p.t('Total', 380, 566, { bold: true });
        p.r('€242.00', 555, 566, { bold: true });
      }),
  },
  {
    // A wholesaler billing a shop with «recargo de equivalencia»: read, but marked to check.
    file: '08-mayorista-recargo-equivalencia.pdf',
    expected: {
      date: '2026-06-03',
      number: 'M-7781',
      issuer: { name: 'Distribuciones Ejemplo SA', nif: 'A81234567' },
      client: { name: 'Laura Martín Gómez', nif: '12345678Z' },
      taxes: [{ rate: 21, base: 200, vat: 42 }],
      withheld: 0,
      total: 252.4,
      credit: false,
      review: ['surcharge'],
      book: 'received',
    },
    build: () =>
      draw((p) => {
        p.t('Distribuciones Ejemplo SA', 40, 795, { size: 14, bold: true });
        p.t('A81234567 · Polígono Sur, nave 8, 41001 Sevilla', 40, 780, { grey: true });
        p.t('Factura M-7781', 40, 750, { bold: true });
        p.t('Fecha: 03/06/2026', 40, 736);
        p.t('Cliente', 330, 750, { bold: true });
        ME.forEach((l, i) => p.t(l, 330, 736 - i * 13));
        p.rule(670);
        p.t('Artículo', 40, 656, { bold: true });
        p.r('Importe', 555, 656, { bold: true });
        p.t('Género para la tienda (lote de temporada)', 40, 640);
        p.r('200,00', 555, 640);
        p.rule(620);
        p.t('Base imponible', 340, 600);
        p.r('200,00', 555, 600);
        p.t('IVA 21%', 340, 585);
        p.r('42,00', 555, 585);
        p.t('Recargo de equivalencia 5,2%', 340, 570);
        p.r('10,40', 555, 570);
        p.t('Total factura', 340, 550, { bold: true });
        p.r('252,40 €', 555, 550, { bold: true });
      }),
  },
  {
    // Only an image of a page: there is no text to read.
    file: '09-escaneada-sin-texto.pdf',
    rejected: 'noText',
    build: async () => {
      const doc = await PDFDocument.create();
      const page = doc.addPage([WIDTH, HEIGHT]);
      const png = await doc.embedPng(scannedPng(420, 600));
      page.drawImage(png, { x: 40, y: 80, width: WIDTH - 80, height: HEIGHT - 160 });
      return doc.save();
    },
  },
  {
    // In dollars: the draft is in euros, so it is turned down.
    file: '10-factura-en-dolares.pdf',
    rejected: 'currency',
    build: () =>
      draw((p) => {
        p.t('Example Hosting Inc', 40, 795, { size: 14, bold: true });
        p.t('INVOICE #US-2026-77', 40, 760, { bold: true });
        p.t('Invoice date: 04/02/2026', 40, 746);
        p.t('Bill to: Laura Martín Gómez', 40, 720);
        p.t('Subtotal', 380, 600);
        p.r('$100.00', 555, 600);
        p.t('Tax', 380, 585);
        p.r('$0.00', 555, 585);
        p.t('Total (USD)', 380, 566, { bold: true });
        p.r('$100.00', 555, 566, { bold: true });
      }),
  },
  {
    // A gestoría billing the person with IRPF withheld: the client is a person, so it is an expense.
    file: '11-gestoria-recibida-con-retencion.pdf',
    expected: {
      date: '2026-01-31',
      number: 'G-26/0009',
      issuer: { name: 'Asesoría Fiscal Ejemplo SL', nif: 'B81234560' },
      client: { name: 'Laura Martín Gómez', nif: '12345678Z' },
      taxes: [{ rate: 21, base: 60, vat: 12.6 }],
      withheld: 9,
      total: 63.6,
      credit: false,
      review: [],
      book: 'received',
    },
    build: () =>
      draw((p) => {
        p.r('Asesoría Fiscal Ejemplo SL', 555, 795, { size: 13, bold: true });
        p.r('CIF B81234560 · gestoria@example.test', 555, 780);
        p.t('Factura', 40, 795, { size: 16, bold: true });
        p.t('Nº factura', 40, 770, { bold: true });
        p.t('Fecha factura', 160, 770, { bold: true });
        p.t('Vencimiento', 280, 770, { bold: true });
        p.t('G-26/0009', 40, 756);
        p.t('31/01/2026', 160, 756);
        p.t('15/02/2026', 280, 756);
        p.t('Cliente:', 40, 720, { bold: true });
        ME.forEach((l, i) => p.t(l, 40, 706 - i * 13));
        p.rule(640);
        p.t('Concepto', 40, 626, { bold: true });
        p.r('Importe', 555, 626, { bold: true });
        p.t('Asesoría fiscal y contable de enero', 40, 610);
        p.r('60,00', 555, 610);
        p.rule(590);
        p.t('Base imponible', 340, 570);
        p.r('60,00', 555, 570);
        p.t('IVA 21%', 340, 555);
        p.r('12,60', 555, 555);
        p.t('Retención IRPF 15%', 340, 540);
        p.r('-9,00', 555, 540);
        p.t('Total', 340, 520, { bold: true });
        p.r('63,60 €', 555, 520, { bold: true });
      }),
  },
];
