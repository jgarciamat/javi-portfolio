/**
 * Builds the invoice-book templates users can download (public/plantillas) and the example workbooks
 * used to try the importers (docs/ejemplos-importacion). Run from the backend folder, which has ts-node:
 *   cd backend && node_modules/.bin/ts-node --transpile-only ../frontend/scripts/make-templates.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { buildXlsx, type XlsxCell, type XlsxSheet } from './xlsx';
import { model111, model115, model130, model303 } from './pdf-templates';

const root = join(__dirname, '..');
const templates = join(root, 'public', 'plantillas');
const examples = join(root, '..', 'docs', 'ejemplos-importacion');
mkdirSync(templates, { recursive: true });
mkdirSync(examples, { recursive: true });

const save = (dir: string, name: string, sheets: XlsxSheet[], shared = true) =>
  writeFileSync(join(dir, name), buildXlsx(sheets, { sharedStrings: shared }));

const round2 = (n: number) => Math.round(n * 100) / 100;

// ─── Templates: the headings and nothing else ───────────────────────────────

const ISSUED_HEAD: XlsxCell[] = [
  'Fecha expedición',
  'Nº factura',
  'Cliente',
  'NIF cliente',
  'Base imponible',
  'Tipo de IVA (%)',
  'Cuota IVA repercutida',
  'Tipo retención IRPF (%)',
  'Importe retenido IRPF',
  'Total factura',
];
const RECEIVED_HEAD: XlsxCell[] = [
  'Fecha expedición',
  'Nº factura',
  'Proveedor y concepto',
  'NIF proveedor',
  'Base imponible',
  'Tipo de IVA (%)',
  'Cuota IVA soportada',
  // What the person withholds from professionals and the landlord (modelos 111 and 115).
  'Tipo retención IRPF (%)',
  'Importe retenido IRPF',
  'Total factura',
];

const NOTES = (what: string): XlsxSheet => ({
  name: 'Instrucciones',
  rows: [
    [`Plantilla de facturas ${what} de Finanverso`],
    [],
    [
      '1. Escribe una factura por fila en la hoja «Facturas ' +
        what +
        '», debajo de los encabezados.',
    ],
    ['2. La fecha puede ser una fecha de Excel o texto como 15/03/2026.'],
    ['3. El tipo de IVA solo puede ser 0, 4, 10 o 21 (con o sin el signo %). También sirve 0,21.'],
    ['4. Los importes van en euros; una factura rectificativa lleva importes negativos.'],
    [
      '5. En Finanverso, Autónomos → Importar facturas: sube este archivo (.xlsx) o guárdalo como .csv.',
    ],
    [
      'Si subes otra vez el mismo libro, no se duplica nada: se sustituyen los trimestres que trae.',
    ],
  ],
});

save(templates, 'facturas-emitidas.xlsx', [
  { name: 'Facturas emitidas', rows: [ISSUED_HEAD] },
  NOTES('emitidas'),
]);
save(templates, 'facturas-recibidas.xlsx', [
  { name: 'Facturas recibidas', rows: [RECEIVED_HEAD] },
  NOTES('recibidas'),
]);

// ─── Examples: a freelancer's 2026, three quarters ──────────────────────────

interface Issued {
  date: string;
  client: string;
  base: number;
  rate: 0 | 4 | 10 | 21;
  retention: number;
}
const issued: Issued[] = [
  { date: '2026-01-15', client: 'Estudio Norte SL', base: 3000, rate: 21, retention: 15 },
  { date: '2026-02-10', client: 'Taller Beta SL', base: 1500, rate: 21, retention: 15 },
  { date: '2026-03-20', client: 'Comercial Cuatro SA', base: 800, rate: 21, retention: 0 },
  { date: '2026-04-12', client: 'Estudio Norte SL', base: 3200, rate: 21, retention: 15 },
  { date: '2026-05-18', client: 'Librería Sur SC', base: 1000, rate: 10, retention: 0 },
  { date: '2026-06-25', client: 'Taller Beta SL', base: 1800, rate: 21, retention: 15 },
  { date: '2026-07-10', client: 'Estudio Norte SL', base: 3000, rate: 21, retention: 15 },
  { date: '2026-08-05', client: 'Editorial Este SL', base: 600, rate: 4, retention: 0 },
  { date: '2026-09-22', client: 'Comercial Cuatro SA', base: 2200, rate: 21, retention: 15 },
];

const issuedRows = issued.map((i, n): XlsxCell[] => {
  const vat = round2((i.base * i.rate) / 100);
  const held = round2((i.base * i.retention) / 100);
  return [
    '2026',
    `${Math.ceil(Number(i.date.slice(5, 7)) / 3)}T`,
    'I01',
    { date: i.date },
    `2026-${String(n + 1).padStart(3, '0')}`,
    i.client,
    round2(i.base + vat - held),
    i.base,
    { percent: i.rate / 100 },
    vat,
    i.retention / 100,
    held,
  ];
});

// The layout of the books gestorías and Quipu hand out: two heading lines, rates as percentages.
save(examples, 'ejemplo-facturas-emitidas-2026.xlsx', [
  {
    name: 'Ingresos',
    rows: [
      ['Libro registro de facturas expedidas · ejemplo con datos inventados'],
      [],
      [],
      [
        'Autoliquidación',
        null,
        'Concepto de Ingreso',
        'Fecha Expedición',
        'Identificación de la Factura',
        'Nombre Destinatario',
        'Total Factura',
        'Base Imponible',
        'Tipo de IVA',
        'Cuota IVA Repercutida',
        'Tipo Retención del IRPF',
        'Importe Retenido del IRPF',
      ],
      ['Ejercicio', 'Periodo'],
      ...issuedRows,
    ],
  },
]);

interface Received {
  date: string;
  supplier: string;
  base: number;
  rate: 0 | 4 | 10 | 21;
  /** Tax id and IRPF withheld (%) of the professionals and the landlord. */
  nif?: string;
  retention?: number;
}
// Every quarter: the rent of the premises (19 % withheld, modelo 115), the gestoría (15 %) and a
// designer who started last year (7 %), both in the modelo 111.
const received: Received[] = [
  ...[1, 2, 3].flatMap((q) => [
    {
      date: `2026-0${q * 3 - 2}-05`,
      supplier: 'Inmuebles Ribera SL alquiler del local',
      base: 400,
      rate: 21 as const,
      nif: 'B00000001',
      retention: 19,
    },
    {
      date: `2026-0${q * 3 - 1}-10`,
      supplier: 'Gestoría Pérez asesoría fiscal',
      base: 150,
      rate: 21 as const,
      nif: '00000001R',
      retention: 15,
    },
    {
      date: `2026-0${q * 3 - 1}-20`,
      supplier: 'Marta Ejemplo diseño gráfico',
      base: 50,
      rate: 21 as const,
      nif: '00000002W',
      retention: 7,
    },
  ]),
  { date: '2026-01-20', supplier: 'Adobe licencia software', base: 60, rate: 21 },
  { date: '2026-02-14', supplier: 'Vodafone móvil e internet', base: 80, rate: 21 },
  { date: '2026-04-22', supplier: 'Repsol gasolina', base: 120, rate: 21 },
  { date: '2026-05-30', supplier: 'Restaurante La Plaza comida con cliente', base: 55, rate: 10 },
  { date: '2026-08-18', supplier: 'Google Ads publicidad', base: 300, rate: 21 },
  { date: '2026-09-03', supplier: 'Papelería Centro material de oficina', base: 90, rate: 21 },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((m) => ({
    date: `2026-0${m}-28`,
    supplier: 'Cuota autónomos RETA',
    base: 294,
    rate: 0 as const,
  })),
];

save(examples, 'ejemplo-facturas-recibidas-2026.xlsx', [
  {
    name: 'Gastos',
    rows: [
      ['Libro registro de facturas recibidas · ejemplo con datos inventados'],
      [],
      [],
      [
        'Fecha Expedición',
        'Nombre Expedidor',
        'Total Factura',
        'Base Imponible (Gasto Deducible)',
        'Tipo de IVA',
        'Cuota IVA Soportado',
        'NIF Expedidor',
        'Tipo Retención IRPF',
        'Importe Retenido IRPF',
      ],
      ...received.map((r): XlsxCell[] => {
        const vat = round2((r.base * r.rate) / 100);
        const held = round2((r.base * (r.retention ?? 0)) / 100);
        return [
          { date: r.date },
          r.supplier,
          round2(r.base + vat - held),
          r.base,
          r.rate,
          vat,
          r.nif ?? null,
          r.retention ?? null,
          r.retention ? held : null,
        ];
      }),
    ],
  },
]);

// A bank statement, as the banks export it to Excel.
save(examples, 'ejemplo-movimientos-banco-2026.xlsx', [
  {
    name: 'Movimientos',
    rows: [
      ['Fecha', 'Concepto', 'Importe', 'Saldo'],
      [{ date: '2026-09-01' }, 'NÓMINA SEPTIEMBRE', 1800, 2300],
      [{ date: '2026-09-02' }, 'MERCADONA COMPRA', -54.3, 2245.7],
      [{ date: '2026-09-05' }, 'RECIBO LUZ ENDESA', -61.2, 2184.5],
      [{ date: '2026-09-07' }, 'BIZUM RESTAURANTE', -18.5, 2166],
      [{ date: '2026-09-15' }, 'GASOLINERA REPSOL', -45, 2121],
    ],
  },
]);
// The employees of the example (from their payslips), typed in «Retenciones que practicas».
const EMPLOYEES = [
  { quarter: 1, people: 2, paid: 7500, withheld: 750 },
  { quarter: 2, people: 2, paid: 7500, withheld: 750 },
  { quarter: 3, people: 3, paid: 10500, withheld: 1050 },
];
writeFileSync(
  join(examples, 'ejemplo-empleados-2026.txt'),
  [
    'Empleados del ejemplo (datos inventados), para escribirlos en Autónomos → paso 2 →',
    '«Retenciones que practicas (modelos 111 y 115)» → Empleados (modelo 111).',
    'Salen de las nóminas del trimestre: sueldos brutos y retenciones de IRPF.',
    '',
    'Trimestre  Nº de empleados  Sueldos brutos  Retenciones',
    ...EMPLOYEES.map(
      (e) =>
        `T${e.quarter}`.padEnd(11) +
        String(e.people).padEnd(17) +
        `${e.paid} €`.padEnd(16) +
        `${e.withheld} €`
    ),
    '',
    'Con las facturas recibidas de ejemplo (gestoría 15 %, diseñadora 7 % y alquiler del local 19 %):',
    '  Modelo 111: T1 776,00 € · T2 776,00 € · T3 1.076,00 €  (2 profesionales: 26,00 € al trimestre)',
    '  Modelo 115: T1, T2 y T3 76,00 € (19 % de 400,00 € a 1 arrendador)',
    '',
  ].join('\n')
);

void (async () => {
  writeFileSync(join(templates, 'modelo-130-plantilla.pdf'), await model130());
  writeFileSync(join(templates, 'modelo-303-plantilla.pdf'), await model303());
  writeFileSync(join(templates, 'modelo-111-plantilla.pdf'), await model111());
  writeFileSync(join(templates, 'modelo-115-plantilla.pdf'), await model115());
  // The 111 and the 115 of the second quarter of the example, filed: to try importing them.
  const period = { 'dato.ejercicio': '2026', 'dato.periodo': '2T' };
  writeFileSync(
    join(examples, 'ejemplo-modelo-111-2T-2026.pdf'),
    await model111({
      ...period,
      'dato.01': '2',
      'dato.02': '7.500,00',
      'dato.03': '750,00',
      'dato.07': '2',
      'dato.08': '200,00',
      'dato.09': '26,00',
      'dato.28': '776,00',
      'dato.30': '776,00',
    })
  );
  writeFileSync(
    join(examples, 'ejemplo-modelo-115-2T-2026.pdf'),
    await model115({
      ...period,
      'dato.01': '1',
      'dato.02': '400,00',
      'dato.03': '76,00',
      'dato.05': '76,00',
    })
  );
  console.log('listo');
})();
