/**
 * Fourth batch of the case bank (personas «p4-109» to «p4-118»): investors in crypto, funds, ETFs,
 * shares and derivatives, each with the files of their platforms (made up, with the columns of each
 * platform's public help). Writes docs/casos-practicos/personas/p4-…/{persona.json, esperado.json,
 * calculo.md, archivos/} and a copy for the owner in ~/Downloads/pruebas finanverso/personas/NNN -
 * <name>/ with LEEME.txt (names from the private nombres-p4.json there).
 *
 * The figures of esperado.json are worked out by hand (the formula is in calculo.md); the import
 * of the files is run here only to store what «Llevar a mi Renta» puts in the form, which the case
 * tests then check against those hand figures.
 *
 *   node scripts/casos/run-personas4.mjs      (from frontend/)
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { pathToFileURL } from 'url';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { buildXlsx, type XlsxSheet } from '../xlsx';
import { linesOf } from '../../src/modules/tools/application/readPdf';
import { investCase, type CaseFile } from '../../src/test-utils/investCase';

const ROOT = (() => {
  let dir = __dirname;
  while (!existsSync(join(dir, 'docs', 'casos-practicos'))) dir = dirname(dir);
  return dir;
})();
const PEOPLE = join(ROOT, 'docs', 'casos-practicos', 'personas');
const PRIVATE = join(homedir(), 'Downloads', 'pruebas finanverso', 'personas');
const CHECKED = '2026-10-19';

interface Figure {
  casilla: string | null;
  concepto: string;
  importe: number;
  campo: string;
  /** How it is worked out, for calculo.md. */
  calculo: string;
}

interface Persona {
  n: number;
  slug: string;
  titulo: string;
  comunidad: string;
  descripcion: string;
  prueba: string[];
  files: Record<string, string | XlsxSheet[] | string[]>;
  /** Invented exchange rate (NOT the ECB's): one dollar rate for every day. */
  usd?: number;
  pending?: { gains: { year: number; amount: number }[] };
  warnings: string[];
  figures: Figure[];
}

const WORK = { gross: 30000, socialSecurity: 1905, withheld: 4500 };
const CITY: Record<string, string> = {
  madrid: '28001 Madrid',
  cataluna: '08001 Barcelona',
  'comunitat-valenciana': '46001 València',
  andalucia: '41001 Sevilla',
  galicia: '15001 A Coruña',
  'castilla-y-leon': '47001 Valladolid',
  baleares: '07001 Palma',
  murcia: '30001 Murcia',
  aragon: '50001 Zaragoza',
  asturias: '33001 Oviedo',
};
const nifOf = (n: number) => {
  const num = String(n).padStart(8, '0');
  return `${num}${'TRWAGMYFPDXBNJZSQVHLCKE'[n % 23]}`;
};
const m = (n: number) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const withheld = (extra = 0): Figure => ({
  casilla: '0609',
  concepto: 'Total pagos a cuenta',
  importe: WORK.withheld + extra,
  campo: 'boxes.0609',
  calculo: `Retenciones del trabajo ${m(WORK.withheld)}${
    extra ? ` + retenciones de las inversiones ${m(extra)}` : ''
  } = ${m(WORK.withheld + extra)}`,
});
const box = (casilla: string, concepto: string, importe: number, calculo: string): Figure => ({
  casilla,
  concepto,
  importe,
  campo: `savings.${casilla}`,
  calculo,
});

const QUANTFURY = [
  'Informe del historial de trading',
  '01/01/2024 - 31/12/2025',
  'Generado: 15/01/2026 10:00:00 AM UTC',
  'Nombre del cliente: PERSONA FICTICIA 115 (datos inventados)',
  'Posiciones Cerradas',
  'Acciones y ETFs',
  'Símbolo | Fecha/Hora de la posición | Acción | Precio | Cantidad | Valor | G&P de la posición',
  'FICTA | 10/12/2024 3:00:00 PM UTC | COMPRAR (abrir) | $50.00 | 10 acciones | $500.00',
  '12/12/2024 3:00:00 PM UTC | VENDER (cerrar) | $48.90 | 10 acciones | $500.00 | -$11.00',
  'Total | -$11.00',
  'FICTB | 03/03/2025 3:00:00 PM UTC | COMPRAR (abrir) | $100.00 | 10 acciones | $1,000.00',
  '10/03/2025 3:00:00 PM UTC | VENDER (cerrar) | $111.00 | 10 acciones | $1,000.00 | +$110.00',
  'Total | +$110.00',
  'FICTC | 01/05/2025 3:00:00 PM UTC | VENDER (abrir) | $20.00 | 50 acciones | $1,000.00',
  '05/05/2025 3:00:00 PM UTC | COMPRAR (añadir) | $21.00 | 25 acciones | $525.00',
  '12/05/2025 3:00:00 PM UTC | COMPRAR (cerrar) | $20.80 | 75 acciones | $1,525.00 | -$55.00',
  'Total | -$55.00',
  'Pares de criptomonedas',
  'Símbolo | Fecha/Hora de la posición | Acción | Precio | Cantidad | Valor | G&P de la posición',
  'BTC/USDT | 01/08/2025 11:00:00 AM UTC | COMPRAR (abrir) | 60,000.00 | 0.05 BTC | ₮3,000.00',
  '20/08/2025 11:00:00 AM UTC | VENDER (cerrar) | 64,400.00 | 0.05 BTC | ₮3,000.00 | +₮220.00',
  'Total | +₮220.00',
];

const ETORO_CLOSED = [
  'Position ID',
  'Action',
  'Long / Short',
  'Amount',
  'Units / Contracts',
  'Open Date',
  'Close Date',
  'Leverage',
  'Spread Fees (USD)',
  'Market Spread (USD)',
  'Profit(USD)',
  'FX rate at open (USD)',
  'FX rate at close (USD)',
  'Open Rate',
  'Close Rate',
  'Take profit rate',
  'Stop lose rate',
  'Overnight Fees and Dividends',
  'Copied From',
  'Type',
  'ISIN',
  'Notes',
];

const PERSONAS: Persona[] = [
  {
    n: 109,
    slug: 'p4-109-cripto-binance-ledger-staking-madrid',
    titulo: 'Vende bitcoin comprado en dos veces en Binance y cobra staking en su Ledger',
    comunidad: 'madrid',
    descripcion:
      'Compró 0,5 BTC en 2023 por 10.000 € y otros 0,5 en 2024 por 15.000 €; en 2025 vende 0,6 por 36.000 €. Pasa 0,2 BTC a su cartera Ledger (no tributa) y recibe 2 DOT de staking valorados en 10 €.',
    prueba: [
      'FIFO entre compras de años distintos (art. 37.2 y ayuda AEAT de monedas virtuales)',
      'transferencia a una cartera propia emparejada (no es transmisión)',
      'staking como capital mobiliario (DGT V1766-22), casilla 0027 NO CONFIRMADA',
    ],
    files: {
      'binance-historial-transacciones.csv': `"User_ID","UTC_Time","Account","Operation","Coin","Change","Remark"
"10900001","2023-05-10 09:00:00","Spot","Buy","EUR","-10000",""
"10900001","2023-05-10 09:00:00","Spot","Buy","BTC","0.5",""
"10900001","2024-02-01 09:00:00","Spot","Buy","EUR","-15000",""
"10900001","2024-02-01 09:00:00","Spot","Buy","BTC","0.5",""
"10900001","2025-03-15 09:00:00","Spot","Sell","BTC","-0.6",""
"10900001","2025-03-15 09:00:00","Spot","Sell","EUR","36000",""
"10900001","2025-06-01 09:00:00","Spot","Withdraw","BTC","-0.2",""
`,
      'ledger-live-operaciones.csv': `Operation Date,Status,Currency Ticker,Operation Type,Operation Amount,Operation Fees,Operation Hash,Account Name,Account xpub,Countervalue Ticker,Countervalue at Operation Date,Countervalue at CSV Export
2025-06-02T10:00:00.000Z,Confirmed,BTC,IN,0.2,0,0xficticio109a,Bitcoin 1,xpubFICTICIO,EUR,12000,13000
2025-08-01T10:00:00.000Z,Confirmed,DOT,REWARD,2,0,0xficticio109b,Polkadot 1,xpubFICTICIO,EUR,10,12
`,
    },
    warnings: [],
    figures: [
      box(
        '0027',
        'Intereses (recompensas de staking)',
        10,
        'Staking: 2 DOT valorados en 10 € el día que se reciben'
      ),
      box('0041', 'Rendimiento neto del capital mobiliario', 10, '10 − 0 de gastos = 10'),
      box(
        '0424',
        'Saldo neto positivo de ganancias del ahorro',
        23000,
        'Venta de 0,6 BTC: transmisión 36.000; adquisición FIFO 10.000 (0,5 de 2023) + 0,1 × 30.000 (lote de 2024 a 15.000 / 0,5) = 13.000; ganancia 23.000'
      ),
      box('0460', 'Base imponible del ahorro', 23010, '23.000 + 10 = 23.010'),
      withheld(),
    ],
  },
  {
    n: 110,
    slug: 'p4-110-cripto-coinbase-permuta-learn-cataluna',
    titulo: 'Cambia bitcoin por ether en Coinbase y después vende el ether con pérdida',
    comunidad: 'cataluna',
    descripcion:
      'Compra 0,2 BTC en 2024 por 8.000 € más 80 € de comisión. En 2025 convierte 0,1 BTC en 3 ETH (valor de mercado 9.000 €) y vende los 3 ETH por 7.500 € con 75 € de comisión. Recibe 10 XLM (2 €) por aprender.',
    prueba: [
      'permuta cripto-cripto: transmisión por el valor de mercado (art. 37.1.h)',
      'el valor de la permuta es el coste del ether recibido',
      'comisiones en la adquisición y en la transmisión (art. 35)',
      'recompensa «learn» como ganancia de la base general (NO CONFIRMADO)',
    ],
    files: {
      'coinbase-transacciones.csv': `Transactions
User,persona.ficticia.110@example.com,ficticio
Timestamp,Transaction Type,Asset,Quantity Transacted,Price Currency,Price at Transaction,Subtotal,Total (inclusive of fees and/or spread),Fees and/or Spread,Notes
2024-01-05T10:00:00Z,Buy,BTC,0.2,EUR,€40000.00,€8000.00,€8080.00,€80.00,Bought 0.2 BTC for €8080.00 EUR
2025-02-10T10:00:00Z,Convert,BTC,0.1,EUR,€90000.00,€9000.00,€9000.00,€0.00,Converted 0.1 BTC to 3 ETH
2025-04-01T10:00:00Z,Learning Reward,XLM,10,EUR,€0.20,€2.00,€2.00,€0.00,
2025-09-01T10:00:00Z,Sell,ETH,3,EUR,€2500.00,€7500.00,€7425.00,€75.00,Sold 3 ETH for €7425.00 EUR
`,
    },
    warnings: [],
    figures: [
      box(
        '0422',
        'Suma de ganancias del ahorro',
        4960,
        'Permuta: transmisión 9.000 − adquisición 0,1 × 8.080 / 0,2 = 4.040 → 4.960 (clave N)'
      ),
      box(
        '0423',
        'Suma de pérdidas del ahorro',
        1575,
        'Venta de 3 ETH: 7.500 − 75 = 7.425 − adquisición 9.000 (valor de la permuta) → −1.575 (clave F)'
      ),
      box('0424', 'Saldo neto positivo de ganancias del ahorro', 3385, '4.960 − 1.575 = 3.385'),
      box('0460', 'Base imponible del ahorro', 3385, 'Solo ganancias: 3.385'),
      box('0420', 'Saldo positivo de ganancias de la base general', 2, '10 XLM por aprender: 2 €'),
      withheld(),
    ],
  },
  {
    n: 111,
    slug: 'p4-111-cripto-kraken-perdidas-2023-comunitat-valenciana',
    titulo: 'Gana con polkadot en Kraken y compensa pérdidas de 2023',
    comunidad: 'comunitat-valenciana',
    descripcion:
      'Compró 500 DOT en 2023 por 3.000 €; en 2025 los vende por 4.500 € con 5 € de comisión. Tiene 2.000 € de pérdidas de 2023 sin compensar.',
    prueba: [
      'libro mayor de Kraken (refid) con la comisión en la pata en euros',
      'compensación de pérdidas de los 4 años anteriores (art. 49)',
      'lo que sobra pasa a los años siguientes',
    ],
    files: {
      'kraken-ledgers.csv': `"txid","refid","time","type","subtype","aclass","asset","amount","fee","balance"
"LFIC1","RFIC1","2023-03-01 10:00:00","trade","","currency","ZEUR","-3000.0000","0.0000","0.0000"
"LFIC2","RFIC1","2023-03-01 10:00:00","trade","","currency","DOT","500.0000000000","0.0000000000","500.0000000000"
"LFIC3","RFIC2","2025-05-01 10:00:00","trade","","currency","DOT","-500.0000000000","0.0000000000","0.0000000000"
"LFIC4","RFIC2","2025-05-01 10:00:00","trade","","currency","ZEUR","4500.0000","5.0000","4495.0000"
`,
    },
    pending: { gains: [{ year: 2023, amount: 2000 }] },
    warnings: [],
    figures: [
      box(
        '0424',
        'Saldo neto positivo de ganancias del ahorro',
        1495,
        'Venta de 500 DOT: 4.500 − 5 = 4.495 − 3.000 = 1.495'
      ),
      {
        casilla: '0439',
        concepto: 'Pérdidas de años anteriores compensadas con las ganancias',
        importe: 1495,
        campo: 'savings.pendingGainsOnGains',
        calculo: 'De los 2.000 de 2023 se compensan 1.495 (hasta dejar el saldo a cero)',
      },
      box('0460', 'Base imponible del ahorro', 0, '1.495 − 1.495 = 0'),
      {
        casilla: null,
        concepto: 'Pérdidas que quedan para los años siguientes',
        importe: 505,
        campo: 'savings.carry.gains',
        calculo: '2.000 − 1.495 = 505, de 2023 (se pueden usar hasta 2027)',
      },
      withheld(),
    ],
  },
  {
    n: 112,
    slug: 'p4-112-acciones-revolut-dividendos-usa-andalucia',
    titulo: 'Acciones de EE. UU. en Revolut con dividendos retenidos en origen',
    comunidad: 'andalucia',
    descripcion:
      'Compró 10 acciones ficticias por 1.100 $ en 2024 y vende 5 por 660 $ en 2025. Cobra 22 $ de dividendo con 3,30 $ retenidos en EE. UU. y paga 1,10 $ de custodia. Tipo de cambio INVENTADO: 1,10 $ por euro.',
    prueba: [
      'importes en dólares pasados a euros con el tipo de cada día (aquí uno inventado)',
      'dividendos (0029) y gastos de custodia (0037)',
      'deducción por doble imposición internacional (0588, art. 80)',
    ],
    usd: 1.1,
    files: {
      'revolut-extracto-acciones.csv': `Date,Ticker,Type,Quantity,Price per share,Total Amount,Currency,FX Rate
2024-02-01T15:00:00.000Z,FICT,BUY - MARKET,10,USD 110,USD 1100,USD,1.10
2025-03-03T15:00:00.000Z,FICT,SELL - MARKET,5,USD 132,USD 660,USD,1.10
2025-06-02T12:00:00.000Z,FICT,DIVIDEND,,,USD 22,USD,1.10
2025-06-02T12:00:01.000Z,FICT,DIVIDEND TAX (CORRECTION),,,USD -3.30,USD,1.10
2025-07-01T12:00:00.000Z,,CUSTODY FEE,,,USD -1.10,USD,1.10
`,
    },
    warnings: [],
    figures: [
      box('0029', 'Dividendos', 20, '22 $ / 1,10 = 20 €'),
      box('0037', 'Gastos de administración y custodia', 1, '1,10 $ / 1,10 = 1 €'),
      box('0041', 'Rendimiento neto del capital mobiliario', 19, '20 − 1 = 19'),
      box(
        '0424',
        'Saldo neto positivo de ganancias del ahorro',
        100,
        'Venta de 5 acciones: 660 $ / 1,10 = 600 − adquisición 5/10 × 1.000 € = 500 → 100'
      ),
      box('0460', 'Base imponible del ahorro', 119, '100 + 19 = 119'),
      {
        casilla: '0588',
        concepto: 'Deducción por doble imposición internacional',
        importe: 3,
        campo: 'result.doubleTaxation',
        calculo:
          'La menor de: impuesto pagado en EE. UU. 3,30 $ / 1,10 = 3 €, y 20 € × tipo medio del ahorro 19 % = 3,80 € → 3 €',
      },
      withheld(),
    ],
  },
  {
    n: 113,
    slug: 'p4-113-etf-degiro-traspaso-fondos-indexa-galicia',
    titulo: 'Vende un ETF en Degiro y reembolsa un fondo que antes traspasó',
    comunidad: 'galicia',
    descripcion:
      'ETF comprado en Degiro en 2024 por 2.000 € + 2 € y vendido en 2025 por 2.400 € − 2 €; dividendo de 30 € con 4,50 € retenidos fuera. En su gestora traspasa en 2025 un fondo comprado en 2021 por 1.000 € a otro fondo (no tributa) y después reembolsa este por 1.800 € con 152 € de retención.',
    prueba: [
      'ETF en el apartado de instituciones de inversión colectiva (0310-0325)',
      'traspaso entre fondos: el nuevo conserva coste y fecha (art. 94.1.a)',
      'retención del 19 % en el reembolso (casilla 0603)',
      'doble imposición internacional del dividendo (0588)',
    ],
    files: {
      'degiro-transacciones.csv': `Fecha,Hora,Producto,ISIN,Bolsa de referencia,Centro de ejecución,Número,Precio,,Valor local,,Valor,,Tipo de cambio,Costes de transacción,,Total,,ID Orden
02-04-2024,10:00,VANGUARD FICTICIO ALL-WORLD UCITS ETF,IE00FICT0001,XET,XETR,20,"100,00",EUR,"-2000,00",EUR,"-2000,00",EUR,,"-2,00",EUR,"-2002,00",EUR,ficticia-1
05-05-2025,10:00,VANGUARD FICTICIO ALL-WORLD UCITS ETF,IE00FICT0001,XET,XETR,-20,"120,00",EUR,"2400,00",EUR,"2400,00",EUR,,"-2,00",EUR,"2398,00",EUR,ficticia-2
`,
      'degiro-estado-de-cuenta.csv': `Fecha,Hora,Fecha valor,Producto,ISIN,Descripción,Tipo,Variación,,Saldo,,ID Orden
01-03-2025,08:00,01-03-2025,EMPRESA FICTICIA SA,FR00FICT0002,Dividendo,,EUR,"30,00",EUR,"30,00",
01-03-2025,08:00,01-03-2025,EMPRESA FICTICIA SA,FR00FICT0002,Retención del dividendo,,EUR,"-4,50",EUR,"25,50",
`,
      'gestora-movimientos-fondos.csv': `Fecha de operación;Fondo;ISIN;Tipo de operación;Participaciones;Valor liquidativo;Importe;Retención
01/02/2021;Fondo Indexado Ficticio A FI;ES00FICT0003;Suscripción;100;10,00;1.000,00;
03/02/2025;Fondo Indexado Ficticio A FI;ES00FICT0003;Traspaso de salida;100;15,00;1.500,00;
05/02/2025;Fondo Ficticio B FI;ES00FICT0004;Traspaso de entrada;150;10,00;1.500,00;
01/10/2025;Fondo Ficticio B FI;ES00FICT0004;Reembolso;150;12,00;1.800,00;152,00
`,
    },
    warnings: [],
    figures: [
      box('0029', 'Dividendos', 30, 'Dividendo bruto de 30 €'),
      box(
        '0424',
        'Saldo neto positivo de ganancias del ahorro',
        1196,
        'ETF: 2.400 − 2 = 2.398 − (2.000 + 2) = 396; fondo B: 1.800 − 1.000 (coste del fondo A traspasado, de 2021) = 800; 396 + 800 = 1.196'
      ),
      box('0460', 'Base imponible del ahorro', 1226, '1.196 + 30 = 1.226'),
      {
        casilla: '0588',
        concepto: 'Deducción por doble imposición internacional',
        importe: 4.5,
        campo: 'result.doubleTaxation',
        calculo: 'La menor de 4,50 € pagados fuera y 30 × 19 % = 5,70 € → 4,50 €',
      },
      withheld(152),
    ],
  },
  {
    n: 114,
    slug: 'p4-114-fondos-perdida-recompra-un-ano-castilla-y-leon',
    titulo: 'Reembolsa un fondo con pérdida y vuelve a suscribirlo antes de un año',
    comunidad: 'castilla-y-leon',
    descripcion:
      'Reembolsa en abril de 2025 un fondo de bolsa con 1.000 € de pérdida y lo vuelve a suscribir en septiembre: la pérdida no cuenta este año (art. 33.5.g). Reembolsa otro de renta fija con 300 € de ganancia y 57 € de retención.',
    prueba: [
      'regla antiaplicación de pérdidas en participaciones no cotizadas: un año (art. 33.5.g)',
      'retención del 19 % de la ganancia del fondo (0603)',
    ],
    files: {
      'banco-movimientos-fondos.csv': `Fecha;Fondo;ISIN;Tipo de operación;Participaciones;Importe;Retención
10/01/2023;Fondo Ficticio Bolsa FI;ES00FICT0005;Suscripción;50;5.000,00;
01/01/2022;Fondo Ficticio Renta Fija FI;ES00FICT0006;Suscripción;100;2.000,00;
01/04/2025;Fondo Ficticio Bolsa FI;ES00FICT0005;Reembolso;50;4.000,00;
01/06/2025;Fondo Ficticio Renta Fija FI;ES00FICT0006;Reembolso;100;2.300,00;57,00
01/09/2025;Fondo Ficticio Bolsa FI;ES00FICT0005;Suscripción;50;3.800,00;
`,
    },
    warnings: [],
    figures: [
      box('0422', 'Suma de ganancias del ahorro', 300, 'Renta fija: 2.300 − 2.000 = 300'),
      box(
        '0423',
        'Suma de pérdidas del ahorro',
        0,
        'Bolsa: 4.000 − 5.000 = −1.000, pero se vuelven a comprar participaciones en el año siguiente y siguen en el patrimonio: no se computa (art. 33.5.g)'
      ),
      box('0424', 'Saldo neto positivo de ganancias del ahorro', 300, '300 − 0 = 300'),
      box('0460', 'Base imponible del ahorro', 300, '300'),
      withheld(57),
    ],
  },
  {
    n: 115,
    slug: 'p4-115-derivados-quantfury-apalancado-baleares',
    titulo: 'Opera con apalancamiento en Quantfury: acciones y pares de cripto',
    comunidad: 'baleares',
    descripcion:
      'Cierra en 2025 tres posiciones: una larga de acciones con +110 $, una corta con −55 $ y un par BTC/USDT con +220 ₮. Una posición de 2024 perdió 11 $ (va en la Renta de 2024). Tipo de cambio INVENTADO: 1,10 $ por euro; el USDT se valora como un dólar (NO CONFIRMADO).',
    prueba: [
      'informe PDF de Quantfury: una ganancia o pérdida por posición, del año del cierre',
      'derivados en la base del ahorro (arts. 46.b y 49; NO CONFIRMADO)',
      'aviso de resultados de años anteriores',
    ],
    usd: 1.1,
    files: { 'quantfury-historial-de-trading.pdf': QUANTFURY },
    warnings: ['stablecoinPrice', 'derivative', 'earlierYears', 'lossYears'],
    figures: [
      box(
        '0422',
        'Suma de ganancias del ahorro',
        300,
        '+110 $ / 1,10 = 100 € y +220 ₮ / 1,10 = 200 € → 300'
      ),
      box('0423', 'Suma de pérdidas del ahorro', 50, '−55 $ / 1,10 = −50 €'),
      box('0424', 'Saldo neto positivo de ganancias del ahorro', 250, '300 − 50 = 250'),
      box(
        '0460',
        'Base imponible del ahorro',
        250,
        '250 (la pérdida de 2024, −10 €, no es de este año)'
      ),
      withheld(),
    ],
  },
  {
    n: 116,
    slug: 'p4-116-etoro-acciones-cripto-cfd-dividendos-murcia',
    titulo: 'Extracto de eToro con acciones, bitcoin, un CFD y dividendos',
    comunidad: 'murcia',
    descripcion:
      'Posiciones cerradas en 2025: acciones (+220 $), bitcoin (−110 $) y un CFD corto apalancado (+33 $). Dividendo neto de 18,70 $ con 3,30 $ retenidos. Tipo de cambio INVENTADO: 1,10 $ por euro.',
    prueba: [
      'extracto de eToro en Excel (hojas «Closed Positions» y «Dividends»)',
      'las acciones y el bitcoin con su compra (FIFO), el CFD como derivado',
      'doble imposición internacional (0588)',
    ],
    usd: 1.1,
    files: {
      'etoro-extracto-de-cuenta.xlsx': [
        {
          name: 'Closed Positions',
          rows: [
            ETORO_CLOSED,
            [
              '1160001',
              'Buy Ficticia Corp',
              'Long',
              1100,
              10,
              '10/01/2024 15:00:00',
              '10/02/2025 15:00:00',
              1,
              0,
              0,
              220,
              1,
              1,
              110,
              132,
              0,
              0,
              0,
              '-',
              'Stocks',
              'US00FICT0007',
              '',
            ],
            [
              '1160002',
              'Buy Bitcoin',
              'Long',
              550,
              0.01,
              '01/05/2024 15:00:00',
              '01/04/2025 15:00:00',
              1,
              0,
              0,
              -110,
              1,
              1,
              55000,
              44000,
              0,
              0,
              0,
              '-',
              'Crypto',
              '',
              '',
            ],
            [
              '1160003',
              'Sell Oro Ficticio',
              'Short',
              220,
              1,
              '01/06/2025 15:00:00',
              '01/07/2025 15:00:00',
              10,
              0,
              0,
              33,
              1,
              1,
              2200,
              2167,
              0,
              0,
              0,
              '-',
              'CFD',
              '',
              '',
            ],
          ],
        },
        {
          name: 'Dividends',
          rows: [
            [
              'Date of Payment',
              'Instrument Name',
              'Net Dividend Received (USD)',
              'Withholding Tax Rate (%)',
              'Withholding Tax Amount (USD)',
              'Position ID',
              'Type',
              'ISIN',
            ],
            ['01/06/2025', 'Ficticia Corp', 18.7, '15 %', 3.3, '1160001', 'Stocks', 'US00FICT0007'],
          ],
        },
      ],
    },
    warnings: ['derivative', 'realizedMatching'],
    figures: [
      box('0029', 'Dividendos', 20, '(18,70 + 3,30) $ / 1,10 = 20 €'),
      box(
        '0422',
        'Suma de ganancias del ahorro',
        230,
        'Acciones: (1.100 + 220) / 1,10 = 1.200 − 1.100 / 1,10 = 1.000 → 200; CFD: (220 + 33) / 1,10 = 230 − 200 → 30; 200 + 30 = 230'
      ),
      box(
        '0423',
        'Suma de pérdidas del ahorro',
        100,
        'Bitcoin: (550 − 110) / 1,10 = 400 − 550 / 1,10 = 500 → −100'
      ),
      box('0424', 'Saldo neto positivo de ganancias del ahorro', 130, '230 − 100 = 130'),
      box('0460', 'Base imponible del ahorro', 150, '130 + 20 = 150'),
      {
        casilla: '0588',
        concepto: 'Deducción por doble imposición internacional',
        importe: 3,
        campo: 'result.doubleTaxation',
        calculo: 'La menor de 3,30 $ / 1,10 = 3 € y 20 × 19 % = 3,80 € → 3 €',
      },
      withheld(),
    ],
  },
  {
    n: 117,
    slug: 'p4-117-cripto-bitpanda-cryptocom-cashback-earn-aragon',
    titulo: 'Vende ether en Bitpanda y cobra recompensas y cashback en Crypto.com',
    comunidad: 'aragon',
    descripcion:
      'Compró 1 ETH en 2024 por 2.000 € y vende medio en 2025 por 1.500 €. Recibe 0,01 ETH de staking (30 €), 0,001 BTC de «Crypto Earn» (50 €) y 10 CRO de cashback de la tarjeta (1 €).',
    prueba: [
      'recompensas de staking y préstamo como capital mobiliario (0027)',
      'cashback en cripto como ganancia de la base general (NO CONFIRMADO)',
      'el valor de la recompensa es el coste de las monedas recibidas',
    ],
    files: {
      'bitpanda-transacciones.csv': `Disclaimer: archivo inventado para pruebas de Finanverso
Transaction ID,Timestamp,Transaction Type,In/Out,Amount Fiat,Fiat,Amount Asset,Asset,Asset market price,Asset market price currency,Asset class,Product ID,Fee,Fee asset,Spread,Spread Currency,Tax Fiat
FICT-1,2024-03-01T10:00:00+01:00,buy,outgoing,2000.00,EUR,1.00000000,ETH,2000.00,EUR,Cryptocurrency,5,0.00000000,BEST,,,0.00
FICT-2,2025-03-01T10:00:00+01:00,sell,incoming,1500.00,EUR,0.50000000,ETH,3000.00,EUR,Cryptocurrency,5,0.00000000,BEST,,,0.00
FICT-3,2025-05-01T10:00:00+02:00,reward,incoming,30.00,EUR,0.01000000,ETH,3000.00,EUR,Cryptocurrency,5,0.00000000,ETH,,,0.00
`,
      'cryptocom-transacciones.csv': `Timestamp (UTC),Transaction Description,Currency,Amount,To Currency,To Amount,Native Currency,Native Amount,Native Amount (in USD),Transaction Kind,Transaction Hash
2025-02-01 10:00:00,Card Cashback,CRO,10,,,EUR,1.00,1.08,referral_card_cashback,
2025-02-15 10:00:00,Crypto Earn,BTC,0.001,,,EUR,50.00,54.00,crypto_earn_interest_paid,
`,
    },
    warnings: [],
    figures: [
      box('0027', 'Intereses (staking y Crypto Earn)', 80, '30 + 50 = 80'),
      box('0041', 'Rendimiento neto del capital mobiliario', 80, '80'),
      box(
        '0424',
        'Saldo neto positivo de ganancias del ahorro',
        500,
        'Venta de 0,5 ETH: 1.500 − 0,5 × 2.000 = 500'
      ),
      box('0460', 'Base imponible del ahorro', 580, '500 + 80 = 580'),
      box('0420', 'Saldo positivo de ganancias de la base general', 1, 'Cashback: 10 CRO = 1 €'),
      withheld(),
    ],
  },
  {
    n: 118,
    slug: 'p4-118-ibkr-trading212-dividendos-modelo-720-asturias',
    titulo: 'Acciones en Interactive Brokers por más de 50.000 € y un ETF en Trading 212',
    comunidad: 'asturias',
    descripcion:
      'Compró 100 acciones ficticias en 2024 por 55.000 $ + 11 $; en 2025 vende 10 por 6.600 $ − 11 $ y cobra 440 $ de dividendo con 66 $ retenidos. En Trading 212 compra y vende un ETF con 50 € de pérdida y cobra 2 € de intereses. Tipo de cambio INVENTADO: 1,10 $ por euro.',
    prueba: [
      'extracto de actividad de Interactive Brokers (secciones Trades, Dividends, Withholding Tax)',
      'aviso del modelo 720: valores en el extranjero por más de 50.000 €',
      'pérdida de un ETF en el apartado de IIC',
    ],
    usd: 1.1,
    files: {
      'ibkr-activity-statement.csv': `Statement,Header,Field Name,Field Value
Statement,Data,Title,Activity Statement (archivo inventado)
Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,C. Price,Proceeds,Comm/Fee,Basis,Realized P/L,MTM P/L,Code
Trades,Data,Order,Stocks,USD,FICT,"2024-03-05, 10:00:00",100,550,550,-55000,-11,55011,0,0,O
Trades,Data,Order,Stocks,USD,FICT,"2025-09-10, 10:00:00",-10,660,660,6600,-11,-5501.1,1087.9,0,C
Dividends,Header,Currency,Date,Description,Amount
Dividends,Data,USD,2025-06-15,FICT(US00FICT0008) Cash Dividend USD 4.40 per Share (Ordinary Dividend),440.00
Dividends,Data,Total,,,440.00
Withholding Tax,Header,Currency,Date,Description,Amount,Code
Withholding Tax,Data,USD,2025-06-15,FICT(US00FICT0008) Cash Dividend USD 4.40 per Share - US Tax,-66.00,
`,
      'trading212-historial.csv': `Action,Time,ISIN,Ticker,Name,No. of shares,Price / share,Currency (Price / share),Exchange rate,Result,Currency (Result),Total,Currency (Total),Withholding tax,Currency (Withholding tax),Currency conversion fee,Currency (Currency conversion fee)
Market buy,2025-01-10 10:00:00,IE00FICT0009,FICE,Fondo Indexado Ficticio UCITS ETF,10,100.00,EUR,1.00,,,1000.00,EUR,,,,
Market sell,2025-11-10 10:00:00,IE00FICT0009,FICE,Fondo Indexado Ficticio UCITS ETF,10,95.00,EUR,1.00,-50.00,EUR,950.00,EUR,,,,
Interest on cash,2025-12-01 10:00:00,,,,,,,,,,2.00,EUR,,,,
`,
    },
    warnings: ['model720'],
    figures: [
      box('0027', 'Intereses', 2, 'Intereses de la cuenta: 2 €'),
      box('0029', 'Dividendos', 400, '440 $ / 1,10 = 400 €'),
      box('0041', 'Rendimiento neto del capital mobiliario', 402, '400 + 2 = 402'),
      box(
        '0422',
        'Suma de ganancias del ahorro',
        989,
        'Venta de 10 acciones: (6.600 − 11) / 1,10 = 5.990 − 10/100 × (55.000 + 11) / 1,10 = 5.001 → 989'
      ),
      box('0423', 'Suma de pérdidas del ahorro', 50, 'ETF: 950 − 1.000 = −50'),
      box('0424', 'Saldo neto positivo de ganancias del ahorro', 939, '989 − 50 = 939'),
      box('0460', 'Base imponible del ahorro', 1341, '939 + 402 = 1.341'),
      {
        casilla: '0588',
        concepto: 'Deducción por doble imposición internacional',
        importe: 60,
        campo: 'result.doubleTaxation',
        calculo: 'La menor de 66 $ / 1,10 = 60 € y 400 × 19 % = 76 € → 60 €',
      },
      withheld(),
    ],
  },
];

/** A PDF with selectable text, one line of pieces per row (as the real report prints it). */
async function pdfOf(lines: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let page = doc.addPage([842, 595]);
  let y = 560;
  for (const line of lines) {
    if (y < 40) {
      page = doc.addPage([842, 595]);
      y = 560;
    }
    let x = 30;
    for (const piece of line.split(' | ')) {
      // The standard PDF fonts have no ₮: the test report writes "USDT" where the real one has ₮
      // (the reader takes both; the ₮ itself is tested with made-up lines in readers.test.ts).
      const text = piece.replace(/₮/g, 'USDT ');
      page.drawText(text, { x, y, size: 8, font });
      x += Math.max(70, font.widthOfTextAtSize(text, 8) + 12);
    }
    y -= 14;
  }
  doc.setTitle('Informe del historial de trading (inventado)');
  return doc.save();
}

/** The lines of a PDF as the app reads them (pdfjs, same grouping as readPdf.ts). */
async function linesOfPdf(bytes: Uint8Array): Promise<string[]> {
  const pdfjs = (await import(
    pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href
  )) as typeof import('pdfjs-dist');
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const out: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    const pieces = content.items
      .filter((it): it is Extract<typeof it, { str: string }> => 'str' in it)
      .map((it) => ({ x: it.transform[4], y: it.transform[5], str: it.str }));
    out.push(...linesOf(pieces));
  }
  return out;
}

const money = (n: number) => `${m(n)} €`;

async function main() {
  const names: Record<string, string> = existsSync(join(PRIVATE, 'nombres-p4.json'))
    ? JSON.parse(readFileSync(join(PRIVATE, 'nombres-p4.json'), 'utf8'))
    : {};
  const index: unknown[] = [];
  for (const p of PERSONAS) {
    const dir = join(PEOPLE, p.slug);
    const files = join(dir, 'archivos');
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(files, { recursive: true });
    const caseFiles: CaseFile[] = [];
    for (const [name, content] of Object.entries(p.files)) {
      if (name.endsWith('.pdf')) {
        const bytes = await pdfOf(content as string[]);
        writeFileSync(join(files, name), bytes);
        // What the app reads from it, for the tests (Jest cannot run pdfjs).
        const lines = await linesOfPdf(bytes);
        writeFileSync(join(files, `${name}.lineas.txt`), `${lines.join('\n')}\n`);
        caseFiles.push({ name, lines });
      } else if (name.endsWith('.xlsx')) {
        writeFileSync(join(files, name), buildXlsx(content as XlsxSheet[]));
        caseFiles.push({ name, sheets: content as CaseFile['sheets'] });
      } else {
        writeFileSync(join(files, name), content as string);
        caseFiles.push({ name, text: content as string });
      }
    }
    if (p.usd)
      writeFileSync(
        join(files, 'tipos-de-cambio-INVENTADOS.csv'),
        `Date,USD\n2020-01-01,${p.usd.toFixed(4)}\n`
      );
    const { imported, warnings } = investCase(caseFiles, p.usd);
    const missing = p.warnings.filter((w) => !warnings.includes(w));
    if (missing.length) throw new Error(`${p.slug}: no sale el aviso ${missing.join(', ')}`);
    const form = {
      ccaaId: p.comunidad,
      age: '45',
      disability: 0,
      children: [],
      ascendants: [],
      shared: false,
      gross: String(WORK.gross),
      socialSecurity: String(WORK.socialSecurity),
      withheld: String(WORK.withheld),
      nonSalary: '',
      retired: false,
      workExpenses: {},
      mobility: false,
      pension: '',
      pensionEmployer: '',
      spousePlan: '',
      compensatory: '',
      savings: '',
      choices: {},
      savingsDetail: {
        capital: { interest: 0, dividends: 0, assets: 0, insurance: 0, expenses: 0 },
        assets: [],
        properties: [],
        otherGains: [],
        generalGains: [],
        pending: { gains: p.pending?.gains ?? [], capital: [], general: [] },
        imported,
      },
    };
    const persona = {
      slug: p.slug,
      banco: 'p4',
      nombre: `Persona Ficticia ${p.n}`,
      nif: nifOf(p.n),
      domicilio: `Calle Ficticia ${p.n}, ${CITY[p.comunidad]} (dirección inventada)`,
      ejercicio: 2025,
      comunidad: p.comunidad,
      titulo: p.titulo,
      descripcion: p.descripcion,
      prueba: p.prueba,
      modelos: ['100'],
      alcance: 'dentro',
      datosFicticios: true,
      archivos: Object.keys(p.files),
      tiposDeCambioInventados: p.usd ? { USD: p.usd } : null,
      avisos: p.warnings,
      renta: { declaraciones: [{ id: 'individual', form }], conjunta: null },
      documentos: {},
    };
    writeFileSync(join(dir, 'persona.json'), `${JSON.stringify(persona, null, 2)}\n`);
    const cifras = p.figures.map((f) => ({
      modelo: '100',
      declaracion: 'individual',
      casilla: f.casilla,
      concepto: f.concepto,
      importe: f.importe,
      origen: 'calculo-a-mano',
      ref: 'calculo.md#cálculo',
      campo: f.campo,
    }));
    writeFileSync(
      join(dir, 'esperado.json'),
      `${JSON.stringify({ slug: p.slug, ejercicio: 2025, comprobado: CHECKED, cifras }, null, 2)}\n`
    );
    writeFileSync(
      join(dir, 'calculo.md'),
      [
        `# Persona Ficticia ${p.n}: ${p.titulo}`,
        '',
        `> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el ${CHECKED}.`,
        '',
        p.descripcion,
        '',
        `Qué prueba: ${p.prueba.join('; ')}.`,
        '',
        `Archivos (inventados, con las columnas de la ayuda pública de cada plataforma): ${Object.keys(
          p.files
        )
          .map((f) => `\`archivos/${f}\``)
          .join(', ')}.`,
        '',
        `Trabajo: íntegros ${money(WORK.gross)}, Seguridad Social ${money(
          WORK.socialSecurity
        )}, retenciones ${money(WORK.withheld)} (no se detalla: lo comprueban otros casos).`,
        '',
        'Fuentes: Ley 35/2006 del IRPF, arts. 25, 33, 35, 37, 46, 49, 80 y 94 ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)); ayuda de Renta 2025 sobre [monedas virtuales](https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Presentacion/100/7_6_6_2/ganancias_perdidas_monedas_virtuales.html); Orden HAC/277/2026 (modelo 100 de 2025, [BOE-A-2026-7041](https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf)); docs/fiscalidad/inversiones.md.',
        '',
        '## Cálculo',
        '',
        ...p.figures.map(
          (f) =>
            `- ${f.casilla ? `[${f.casilla}] ` : ''}${f.concepto}: ${f.calculo} → **${m(
              f.importe
            )}**`
        ),
        '',
        p.warnings.length
          ? `Avisos que debe dar la app: ${p.warnings.join(
              ', '
            )} (ver docs/fiscalidad/inversiones.md).`
          : 'La app no debe dar avisos.',
        '',
      ].join('\n')
    );
    index.push({
      slug: p.slug,
      titulo: p.titulo,
      comunidad: p.comunidad,
      modelos: ['100'],
      prueba: p.prueba,
      alcance: 'dentro',
    });

    // Copy for the owner, outside the repository.
    if (existsSync(PRIVATE)) {
      const shown = names[String(p.n)] ?? `Persona Ficticia ${p.n}`;
      const own = join(PRIVATE, `${p.n} - ${shown}`);
      rmSync(own, { recursive: true, force: true });
      mkdirSync(own, { recursive: true });
      const list = [...Object.keys(p.files), ...(p.usd ? ['tipos-de-cambio-INVENTADOS.csv'] : [])];
      for (const f of list) writeFileSync(join(own, f), readFileSync(join(files, f)));
      writeFileSync(
        join(own, 'LEEME.txt'),
        [
          `${shown} · ${p.titulo}`,
          '',
          'DATOS INVENTADOS para probar Finanverso. Simulación orientativa: no es el modelo oficial.',
          `Caso del banco: ${p.slug}.`,
          '',
          p.descripcion,
          '',
          'Qué prueba:',
          ...p.prueba.map((t) => `  - ${t}`),
          '',
          'Archivos:',
          ...list.map((f) => `  - ${f}`),
          '',
          'Qué debe salir (todas las cifras, con su origen, en esperado.json y calculo.md del repositorio):',
          ...p.figures.map(
            (f) =>
              `  - ${f.casilla ? `Casilla ${f.casilla} ` : ''}${f.concepto}: ${money(f.importe)}`
          ),
          '',
          'Cómo probarlo: Renta → Inmuebles y ahorro → «Importar mis inversiones», arrastra los archivos',
          ...(p.usd
            ? ['(y carga tipos-de-cambio-INVENTADOS.csv en «Tipos de cambio»; no son los del BCE),']
            : []),
          'revisa la tabla y pulsa «Llevar a mi Renta». La guía «Cómo declarar esto» explica cada paso.',
          '',
        ].join('\n')
      );
    }
  }
  writeFileSync(join(PEOPLE, 'p4-indice.json'), `${JSON.stringify(index, null, 2)}\n`);
  if (existsSync(PRIVATE)) {
    const indice = join(PRIVATE, 'INDICE.txt');
    const keep = readFileSync(indice, 'utf8')
      .split('\n')
      .filter((l) => !/^1(09|1\d) - /.test(l));
    const added = PERSONAS.map(
      (p) =>
        `${p.n} - ${names[String(p.n)] ?? `Persona Ficticia ${p.n}`}   [${
          Object.keys(p.files).length + (p.usd ? 1 : 0)
        } archivos]  — ${p.titulo}`
    );
    writeFileSync(indice, `${[...keep.filter(Boolean), ...added].join('\n')}\n`);
  }
  console.log(`p4: ${PERSONAS.length} personas`);
}

void main();
