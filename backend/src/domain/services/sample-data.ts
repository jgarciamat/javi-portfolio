import { Cents } from '@domain/shared/money';
import { TransactionType } from '@domain/model/TransactionType';

/**
 * Invented movements to try the app before adding your own: four months of a made-up person (a
 * salary, the rent, bills, a few subscriptions, the shopping, small coffees, a saving), so the
 * month, «Tu dinero perdido» and the detected subscriptions have something to show. Every name is
 * invented. They are told apart from the person's own movements by their import hash
 * (`sample:…`) and removed together.
 */
export interface SampleMovement {
  date: string;
  description: string;
  /** Positive; the type says whether it is an expense, an income or a saving. */
  amountCents: Cents;
  type: TransactionType;
  category: string;
}

/** Months of movements: the current one and the three before (90 days or more). */
export const SAMPLE_MONTHS = 4;
export const SAMPLE_HASH_PREFIX = 'sample:';

interface Monthly {
  day: number;
  description: string;
  /** One amount per month, from the oldest; the last one repeats. */
  cents: number[];
  type: TransactionType;
  category: string;
}

const MONTHLY: Monthly[] = [
  {
    day: 1,
    description: 'NÓMINA EMPRESA INVENTADA SL',
    cents: [185000],
    type: 'INCOME',
    category: 'Salario',
  },
  { day: 3, description: 'ALQUILER PISO', cents: [65000], type: 'EXPENSE', category: 'Vivienda' },
  {
    day: 5,
    description: 'RECIBO LUZ ENERGÍA DEL ESTE',
    cents: [5420, 4810, 5135, 6260],
    type: 'EXPENSE',
    category: 'Luz',
  },
  { day: 8, description: 'PLATAFORMA DE SERIES', cents: [1299], type: 'EXPENSE', category: 'Ocio' },
  // A price rise in the last month: «Tu dinero perdido» points it out.
  {
    day: 12,
    description: 'MÚSICA EN STREAMING',
    cents: [1099, 1099, 1099, 1199],
    type: 'EXPENSE',
    category: 'Ocio',
  },
  {
    day: 14,
    description: 'GASOLINERA DEL CRUCE',
    cents: [5500, 4870, 6010, 5230],
    type: 'EXPENSE',
    category: 'Transporte',
  },
  {
    day: 15,
    description: 'GIMNASIO BARRIO FIT',
    cents: [3990],
    type: 'EXPENSE',
    category: 'Salud',
  },
  {
    day: 20,
    description: 'SEGURO HOGAR AMPARO',
    cents: [2450],
    type: 'EXPENSE',
    category: 'Vivienda',
  },
  {
    day: 22,
    description: 'RESTAURANTE LA PLAZA',
    cents: [3840, 4520, 3275, 4110],
    type: 'EXPENSE',
    category: 'Ocio',
  },
  { day: 26, description: 'TRASPASO A AHORRO', cents: [15000], type: 'SAVING', category: 'Ahorro' },
];

/** The weekly shop and the small coffees (a «gasto hormiga»). */
const SHOP_DAYS = [2, 9, 16, 23];
const SHOP_CENTS = [6230, 4875, 7110, 5590, 6640, 4320, 8015, 5260];
const COFFEE_DAYS = [4, 6, 10, 11, 17, 18, 24, 25];

const iso = (year: number, month: number, day: number): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/** The movements up to `today` (YYYY-MM-DD), oldest first. */
export function sampleMovements(today: string): SampleMovement[] {
  const [year, month] = today.split('-').map(Number);
  const out: SampleMovement[] = [];
  for (let back = SAMPLE_MONTHS - 1; back >= 0; back--) {
    const first = new Date(Date.UTC(year, month - 1 - back, 1));
    const y = first.getUTCFullYear();
    const m = first.getUTCMonth() + 1;
    const n = SAMPLE_MONTHS - 1 - back;
    const add = (
      day: number,
      description: string,
      cents: number,
      type: TransactionType,
      category: string
    ): void => {
      out.push({ date: iso(y, m, day), description, amountCents: cents, type, category });
    };
    for (const item of MONTHLY) {
      add(
        item.day,
        item.description,
        item.cents[Math.min(n, item.cents.length - 1)],
        item.type,
        item.category
      );
    }
    SHOP_DAYS.forEach((day, i) => {
      add(
        day,
        'SUPERMERCADO EL MERCADO',
        SHOP_CENTS[(n * 2 + i) % SHOP_CENTS.length],
        'EXPENSE',
        'Alimentación'
      );
    });
    for (const day of COFFEE_DAYS) add(day, 'CAFETERÍA LA ESQUINA', 180, 'EXPENSE', 'Alimentación');
    // The month before this one, a purchase charged twice (a «cobro doble»).
    if (n === SAMPLE_MONTHS - 2) {
      add(19, 'TIENDA ONLINE BAZAR', 2999, 'EXPENSE', 'Otros');
      add(19, 'TIENDA ONLINE BAZAR', 2999, 'EXPENSE', 'Otros');
    }
  }
  return out
    .filter((movement) => movement.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
}
