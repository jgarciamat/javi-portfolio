import {
  EomInput,
  EomMovement,
  EomPastPeriod,
  isOwnTransfer,
  madridDay,
  median,
  planEndOfMonth,
} from '@domain/services/end-of-month';

const mv = (
  date: string,
  amountCents: number,
  description = 'Compra',
  extra: Partial<EomMovement> = {}
): EomMovement => ({
  description,
  amountCents,
  date,
  type: 'EXPENSE',
  recurringRuleId: null,
  categoryName: 'Alimentación',
  ...extra,
});

const past = (
  year: number,
  month: number,
  start: string,
  end: string,
  movements: EomMovement[]
): EomPastPeriod => ({ year, month, start, end, movements });

/** `count` expenses of `cents` each, on the first day of a period. */
const many = (date: string, count: number, cents: number): EomMovement[] =>
  Array.from({ length: count }, () => mv(date, cents));

const OCTOBER = { periodStart: '2026-10-01', periodEnd: '2026-10-31' };

const base = (over: Partial<EomInput> = {}): EomInput => ({
  availableCents: 0,
  today: '2026-10-27',
  ...OCTOBER,
  movements: [],
  history: [],
  subscriptions: [],
  ruleKeys: new Set(),
  firstDate: '2026-01-01',
  totalMovements: 40,
  ...over,
});

/** July, August and September at 78, 72 and 75 €/day of variable spending: 75 €/day on average. */
const SUMMER = [
  past(2026, 9, '2026-09-01', '2026-09-30', [
    mv('2026-09-04', 125000),
    mv('2026-09-18', 100000),
    mv('2026-09-29', 1299, 'NETFLIX.COM'),
  ]),
  past(2026, 8, '2026-08-01', '2026-08-31', [mv('2026-08-04', 123200), mv('2026-08-18', 100000)]),
  past(2026, 7, '2026-07-01', '2026-07-31', [mv('2026-07-04', 141800), mv('2026-07-18', 100000)]),
];

describe('planEndOfMonth', () => {
  it('reproduces the worked example of docs/llegas-a-fin-de-mes.md (2.317,52 €, 5 days left)', () => {
    const plan = planEndOfMonth(
      base({
        availableCents: 231752,
        firstDate: '2026-07-01',
        history: SUMMER,
        ruleKeys: new Set(['alquiler']),
        movements: [
          mv('2026-10-01', 80000, 'Alquiler', {
            recurringRuleId: 'r-rent',
            categoryName: 'Vivienda',
          }),
          mv('2026-10-01', 250000, 'Nómina', { type: 'INCOME', categoryName: 'Salario' }),
          mv('2026-10-02', 3500, 'GIMNASIO CENTRO'),
          mv('2026-10-03', 30000, 'Traspaso a cuenta ahorro', { categoryName: 'Otros' }),
          mv('2026-10-04', 20000, 'Fondo indexado', { categoryName: 'Inversiones' }),
          mv('2026-10-04', 15000, 'Hucha', { type: 'SAVING', categoryName: 'Ahorro' }),
          mv('2026-10-05', 95000, 'Supermercado'),
          mv('2026-10-12', 54000, 'Gasolina'),
          mv('2026-10-20', 40000, 'Restaurante'),
          mv('2026-10-30', 6000, 'Dentista'),
        ],
        subscriptions: [
          // Charged on the 2nd: already paid this month.
          {
            key: 'gimnasio centro',
            description: 'GIMNASIO CENTRO',
            amountCents: 3500,
            lastDate: '2026-10-02',
            nextDate: '2026-11-01',
          },
          {
            key: 'netflix com',
            description: 'NETFLIX.COM',
            amountCents: 1299,
            lastDate: '2026-09-29',
            nextDate: '2026-10-29',
          },
          {
            key: 'seguro hogar',
            description: 'Seguro hogar',
            amountCents: 18640,
            lastDate: '2025-10-30',
            nextDate: '2026-10-30',
          },
          // Was due on the 20th and has not come: not counted.
          {
            key: 'spotify',
            description: 'Spotify',
            amountCents: 1099,
            lastDate: '2026-09-20',
            nextDate: '2026-10-20',
          },
        ],
      })
    );
    // pace = (1.890 + 7 · 75) / (27 + 7) = 2.415 / 34 = 71,03 €/day
    // projectedEnd = 2.317,52 − 199,39 − 71,03 · 5 = 1.762,98 €
    // maxDaily = (2.317,52 − 199,39) / 5 = 423,62 €/day
    expect(plan).toEqual({
      enoughData: true,
      fewData: false,
      availableCents: 231752,
      daysLeft: 5,
      daysElapsed: 27,
      monthVariableCents: 189000,
      monthDailyCents: 7000,
      historyDailyCents: 7500,
      historyMonths: 3,
      paceCents: 7103,
      pending: [
        { description: 'NETFLIX.COM', date: '2026-10-29', amountCents: 1299 },
        { description: 'Seguro hogar', date: '2026-10-30', amountCents: 18640 },
      ],
      pendingCents: 19939,
      scheduled: [{ description: 'Dentista', date: '2026-10-30', amountCents: 6000 }],
      scheduledCents: 6000,
      oneOffs: [],
      outlierMonths: [],
      projectedEndCents: 176298,
      maxDailyCents: 42362,
      status: 'ok',
    });
  });

  // Each row worked out by hand: [case, input, expected subset].
  const cases: [string, Partial<EomInput>, Partial<ReturnType<typeof planEndOfMonth>>][] = [
    [
      'first day: history weighs 7 to 1 · pace = 7 · 75 / 8 = 65,63',
      {
        today: '2026-11-01',
        periodStart: '2026-11-01',
        periodEnd: '2026-11-30',
        availableCents: 150000,
        history: SUMMER,
        ruleKeys: new Set(['netflix com']),
        firstDate: '2026-07-01',
      },
      {
        daysLeft: 30,
        daysElapsed: 1,
        monthVariableCents: 0,
        paceCents: 6563,
        projectedEndCents: 150000 - 6563 * 30,
        maxDailyCents: 5000,
        status: 'short',
      },
    ],
    [
      'last day, no history, no automatic operations: one day left at 100 €/day',
      {
        today: '2026-10-31',
        availableCents: 50000,
        movements: [mv('2026-10-10', 310000)],
      },
      {
        daysLeft: 1,
        daysElapsed: 31,
        fewData: true,
        historyDailyCents: null,
        historyMonths: 0,
        paceCents: 10000,
        projectedEndCents: 40000,
        maxDailyCents: 50000,
        status: 'ok',
      },
    ],
    [
      'negative month (−3.575,08 €): no daily margin, short by 3.688,07 €',
      {
        availableCents: -357508,
        movements: [mv('2026-10-10', 54000)],
        subscriptions: [
          {
            key: 'netflix',
            description: 'Netflix',
            amountCents: 1299,
            lastDate: '2026-09-28',
            nextDate: '2026-10-28',
          },
        ],
      },
      {
        paceCents: 2000,
        pendingCents: 1299,
        projectedEndCents: -357508 - 1299 - 2000 * 5,
        maxDailyCents: 0,
        status: 'short',
      },
    ],
    [
      'tight: less than three days of margin · 400 − 5 · 70 = 50 < 3 · 70',
      {
        availableCents: 40000,
        movements: [mv('2026-10-10', 189000)],
      },
      { paceCents: 7000, projectedEndCents: 5000, maxDailyCents: 8000, status: 'tight' },
    ],
    [
      'leap February: 15 days from the 15th to the 29th',
      { today: '2028-02-15', periodStart: '2028-02-01', periodEnd: '2028-02-29' },
      { daysLeft: 15, daysElapsed: 15 },
    ],
    [
      'February of a common year: 14 days from the 15th to the 28th',
      { today: '2027-02-15', periodStart: '2027-02-01', periodEnd: '2027-02-28' },
      { daysLeft: 14, daysElapsed: 15 },
    ],
    [
      'little history: 10 days of September count, an empty August does not',
      {
        firstDate: '2026-09-21',
        history: [
          past(2026, 9, '2026-09-01', '2026-09-30', [mv('2026-09-21', 50000)]),
          past(2026, 8, '2026-08-01', '2026-08-31', []),
        ],
      },
      { historyDailyCents: 5000, historyMonths: 1, daysElapsed: 27 },
    ],
    [
      'a month with only 6 days of data is not history yet',
      {
        firstDate: '2026-09-25',
        history: [past(2026, 9, '2026-09-01', '2026-09-30', [mv('2026-09-25', 50000)])],
      },
      { historyDailyCents: null, historyMonths: 0, fewData: true },
    ],
    [
      'started this month: days elapsed from the first movement',
      { firstDate: '2026-10-20', totalMovements: 6, movements: [mv('2026-10-20', 16000)] },
      { daysElapsed: 8, monthDailyCents: 2000, enoughData: true, fewData: true },
    ],
  ];

  it.each(cases)('%s', (_name, over, expected) => {
    expect(planEndOfMonth(base(over))).toMatchObject(expected);
  });

  it('asks for more data without movements, with fewer than 5 or with less than a week', () => {
    const empty = planEndOfMonth(
      base({ firstDate: null, totalMovements: 0, availableCents: 1000 })
    );
    expect(empty).toMatchObject({
      enoughData: false,
      fewData: true,
      paceCents: 0,
      projectedEndCents: 1000,
      daysElapsed: 27,
      pending: [],
      scheduled: [],
    });
    expect(planEndOfMonth(base({ totalMovements: 4 })).enoughData).toBe(false);
    expect(planEndOfMonth(base({ firstDate: '2026-10-22' })).enoughData).toBe(false); // 6 days
    expect(planEndOfMonth(base({ firstDate: '2026-10-21' })).enoughData).toBe(true); // 7 days
  });

  it('leaves out months far above the usual and single one-off expenses', () => {
    // 50, 60, 55 and 300 €/day in 30-day months, all in 100 € expenses (and one of 150 €), plus
    // 1.500 € of flights in September.
    const history = [
      past(2026, 9, '2026-09-01', '2026-09-30', [
        ...many('2026-09-01', 15, 10000),
        mv('2026-09-10', 150000, 'Vuelos'),
      ]),
      past(2026, 6, '2026-06-01', '2026-06-30', many('2026-06-01', 18, 10000)),
      past(2026, 4, '2026-04-01', '2026-04-30', [
        ...many('2026-04-01', 15, 10000),
        mv('2026-04-02', 15000),
      ]),
      past(2025, 11, '2025-11-01', '2025-11-30', many('2025-11-01', 90, 10000)),
    ];
    const plan = planEndOfMonth(
      base({
        today: '2026-10-15',
        firstDate: '2025-01-01',
        history,
        movements: [mv('2026-10-03', 200000, 'Televisor'), ...many('2026-10-05', 10, 6000)],
      })
    );
    // Raw median 80 €/day (September at 100 with the flights): one-offs are over two usual weeks
    // (1.120 €) and 3× the typical expense (300 €): the flights and the TV. Without them the median
    // is 57,5 €/day and November (300) is over 3×. pace = (600 + 7 · 55) / (15 + 7) = 44,77.
    expect(plan).toMatchObject({
      outlierMonths: [{ year: 2025, month: 11 }],
      historyMonths: 3,
      historyDailyCents: 5500,
      oneOffs: [
        { description: 'Televisor', date: '2026-10-03', amountCents: 200000 },
        { description: 'Vuelos', date: '2026-09-10', amountCents: 150000 },
      ],
      monthVariableCents: 60000,
      monthDailyCents: 4000,
      paceCents: 4477,
    });
  });

  it('does not take a sparse history (one expense a month) for one-offs', () => {
    const history = [
      past(2026, 9, '2026-09-01', '2026-09-30', [mv('2026-09-10', 30000)]),
      past(2026, 8, '2026-08-01', '2026-08-31', [mv('2026-08-10', 30000)]),
    ];
    const plan = planEndOfMonth(base({ history, movements: [mv('2026-10-10', 30000)] }));
    expect(plan.oneOffs).toEqual([]);
    expect(plan.outlierMonths).toEqual([]); // fewer than three months: no outliers
    expect(plan.monthVariableCents).toBe(30000);
  });

  it('keeps transfers between own accounts, savings and recurring charges out of the pace', () => {
    const plan = planEndOfMonth(
      base({
        ruleKeys: new Set(['alquiler']),
        movements: [
          mv('2026-10-01', 70000, 'ALQUILER'), // imported, an automatic operation already covers it
          mv('2026-10-02', 50000, 'Traspaso a cuenta de ahorro'),
          mv('2026-10-03', 30000, 'Transferencia entre cuentas'),
          mv('2026-10-04', 20000, 'Mover dinero', { categoryName: 'Traspasos' }),
          mv('2026-10-05', 10000, 'Hucha', { categoryName: 'Ahorro' }),
          mv('2026-10-06', 2000, 'Bizum a Ana'),
        ],
      })
    );
    expect(plan.monthVariableCents).toBe(2000);
  });

  it('lists what is still to come in date order, the larger first on the same day', () => {
    const sub = (key: string, amountCents: number, nextDate: string) => ({
      key,
      description: key,
      amountCents,
      lastDate: '2026-09-30',
      nextDate,
    });
    const plan = planEndOfMonth(
      base({
        subscriptions: [
          sub('b', 500, '2026-10-30'),
          sub('a', 900, '2026-10-30'),
          sub('c', 100, '2026-10-27'),
          sub('late', 100, '2026-11-02'),
        ],
        movements: [
          mv('2026-10-29', 300, 'x'),
          mv('2026-10-29', 700, 'y'),
          mv('2026-10-28', 1, 'z'),
        ],
      })
    );
    expect(plan.pending.map((p) => p.description)).toEqual(['c', 'a', 'b']);
    expect(plan.scheduled.map((p) => p.description)).toEqual(['z', 'y', 'x']);
    expect(plan.scheduledCents).toBe(1001);
  });
});

describe('isOwnTransfer', () => {
  it.each([
    ['TRASPASO A CTA 1234', 'Otros', true],
    ['Transferencia a cuenta propia', 'Otros', true],
    ['Transfer between accounts', 'Others', true],
    ['Pago', 'Traspasos', true],
    ['Transferencia a Juan', 'Otros', false],
    ['Bizum', 'Ocio', false],
  ])('%s (%s) → %s', (description, categoryName, expected) => {
    expect(isOwnTransfer(mv('2026-10-01', 1, description, { categoryName }))).toBe(expected);
  });
});

describe('median', () => {
  it('takes the middle value, or the mean of the two in the middle', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('madridDay', () => {
  it('is the day in Spain, whatever the zone of the server', () => {
    expect(madridDay(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11-01'); // CET, +1
    expect(madridDay(new Date('2026-07-31T22:30:00Z'))).toBe('2026-08-01'); // CEST, +2
    expect(madridDay(new Date('2026-07-31T21:30:00Z'))).toBe('2026-07-31');
  });
});
