import {
  LeakDecision,
  LeakFinding,
  LeakMovement,
  cadenceOf,
  coverageOf,
  detectMoneyLeaks,
  findingId,
  merchantKey,
  summarizeLeaks,
  windowStart,
} from '@domain/services/money-leaks';

// Every merchant, amount and date below is made up.
const TODAY = '2026-10-24';
const DAY = 24 * 60 * 60 * 1000;

const move = (
  description: string,
  date: string,
  euros: number,
  extra: Partial<LeakMovement> = {}
): LeakMovement => ({
  description,
  amountCents: Math.round(euros * 100),
  date,
  type: 'EXPENSE',
  categoryName: 'Ocio',
  recurringRuleId: null,
  ...extra,
});

const shift = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

/** `count` charges `every` days apart, the last one on `last`. */
const series = (
  description: string,
  last: string,
  every: number,
  count: number,
  euros: number | ((i: number) => number),
  extra: Partial<LeakMovement> = {}
): LeakMovement[] =>
  Array.from({ length: count }, (_, i) =>
    move(
      description,
      shift(last, -(count - 1 - i) * every),
      typeof euros === 'number' ? euros : euros(i),
      extra
    )
  );

/** Day `day` of each month from `from` (YYYY-MM) on, `count` months. */
const monthly = (
  description: string,
  from: string,
  count: number,
  day: number,
  euros: number | ((i: number) => number),
  extra: Partial<LeakMovement> = {}
): LeakMovement[] =>
  Array.from({ length: count }, (_, i) => {
    const [y, m] = from.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + i, day));
    return move(
      description,
      d.toISOString().slice(0, 10),
      typeof euros === 'number' ? euros : euros(i),
      extra
    );
  });

/** Enough everyday spending to make the coverage complete, none of it a finding. */
const filler = (from = '2026-06-01', count = 40): LeakMovement[] =>
  Array.from({ length: count }, (_, i) =>
    move(
      `Tienda ${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + ((i * 7) % 26))}x`,
      shift(from, i * 3),
      20 + i
    )
  );

const detect = (
  movements: LeakMovement[],
  extra: Parameters<typeof detectMoneyLeaks>[1] = { today: TODAY }
) => detectMoneyLeaks(movements, extra);

const kinds = (findings: LeakFinding[]) => findings.map((f) => `${f.kind}:${f.label}`);

describe('merchantKey', () => {
  it('groups the same merchant written by different banks', () => {
    expect(merchantKey('COMPRA TARJ. 5402 STREAMFLIX.COM 28/09')).toBe('streamflix');
    expect(merchantKey('STREAMFLIX.COM')).toBe('streamflix');
    expect(merchantKey('PAYPAL *STREAMFLIX')).toBe('streamflix');
    expect(merchantKey('SUMUP *CAFETERÍA LA PLAZA')).toBe('cafeteria la plaza');
    expect(merchantKey('Pago con Apple Pay FITBOX S.L. MADRID')).toBe('con fitbox');
    expect(merchantKey('RECIBO SEGUROS HOGAR ALFA SA 2026/10/01')).toBe('seguros hogar alfa');
    expect(merchantKey('DEVOLUCION ELECTRO MARKET')).toBe('electro market');
  });

  it('keeps a city that is the whole name and gives up when too little is left', () => {
    expect(merchantKey('Madrid')).toBe('madrid');
    expect(merchantKey('CAFE MADRID')).toBe('cafe');
    expect(merchantKey('TPV 1234 AB')).toBe('tpv ab');
    expect(merchantKey('PAGO 1234')).toBeNull();
    expect(merchantKey('X 1')).toBeNull();
  });

  it('uses the longest pinned rule of the user found in the description', () => {
    const aliases = ['nube', 'nube fotos', 'zz'];
    expect(merchantKey('CARGO NUBE FOTOS 2TB', aliases)).toBe('nube fotos');
    expect(merchantKey('NUBE BACKUP', aliases)).toBe('nube');
    expect(merchantKey('Otra cosa', aliases)).toBe('otra cosa');
  });
});

describe('windowStart and coverageOf', () => {
  it('goes back 25 months, staying inside short months', () => {
    expect(windowStart('2026-10-24')).toBe('2024-09-24');
    expect(windowStart('2026-03-31', 1)).toBe('2026-02-28');
  });

  it('tells none, partial and complete coverage', () => {
    expect(coverageOf([])).toEqual({
      level: 'none',
      from: null,
      to: null,
      days: 0,
      movements: 0,
      yearlyReady: false,
    });
    const fortyOne = Array.from({ length: 41 }, (_, i) => ({ date: shift('2026-09-14', i) }));
    expect(coverageOf(fortyOne)).toMatchObject({ level: 'partial', days: 41, movements: 41 });
    const fewMovements = [{ date: '2026-01-01' }, { date: '2026-10-01' }];
    expect(coverageOf(fewMovements)).toMatchObject({ level: 'partial', days: 274 });
    const full = Array.from({ length: 30 }, (_, i) => ({ date: shift('2025-09-01', i * 14) }));
    expect(coverageOf(full)).toMatchObject({ level: 'complete', yearlyReady: true });
    const almostYear = Array.from({ length: 30 }, (_, i) => ({
      date: shift('2026-01-01', i * 10),
    }));
    expect(coverageOf(almostYear)).toMatchObject({ level: 'complete', yearlyReady: false });
  });
});

describe('cadenceOf', () => {
  const dates = (gaps: number[]) =>
    gaps.reduce<string[]>(
      (list, gap) => [...list, shift(list[list.length - 1], gap)],
      ['2026-01-01']
    );

  it('accepts monthly gaps of 24 to 37 days only', () => {
    expect(cadenceOf(dates([24, 37]))).toEqual({ cadence: 'monthly', tolerated: false });
    expect(cadenceOf(dates([23, 30]))).toBeNull();
    expect(cadenceOf(dates([30, 38]))).toBeNull();
    // February and charges moved by a weekend.
    expect(cadenceOf(['2026-01-31', '2026-02-28', '2026-03-31'])?.cadence).toBe('monthly');
  });

  it('needs five weekly charges and knows the other rhythms', () => {
    expect(cadenceOf(dates([7, 7, 7]))).toBeNull();
    expect(cadenceOf(dates([7, 6, 8, 7]))?.cadence).toBe('weekly');
    expect(cadenceOf(dates([61, 60]))?.cadence).toBe('bimonthly');
    expect(cadenceOf(dates([91, 90]))?.cadence).toBe('quarterly');
    expect(cadenceOf(dates([365]))?.cadence).toBe('yearly');
    expect(cadenceOf(dates([200]))).toBeNull();
  });

  it('tolerates one missed charge with five charges or more, not with four', () => {
    expect(cadenceOf(dates([30, 61, 30, 30]))).toEqual({ cadence: 'monthly', tolerated: true });
    expect(cadenceOf(dates([30, 61, 30]))).toBeNull();
    expect(cadenceOf(dates([30, 61, 61, 30]))).toBeNull();
    expect(cadenceOf(dates([30, 90, 30, 30]))).toBeNull();
  });
});

describe('detectMoneyLeaks: repeating charges', () => {
  it('finds a monthly charge with its yearly cost, next date and evidence', () => {
    const report = detect([...monthly('FITBOX', '2025-08', 15, 3, 39.9), ...filler()]);
    const [fitbox] = report.findings;
    expect(fitbox).toMatchObject({
      id: findingId('rec:fitbox:monthly:0'),
      kind: 'recurring',
      confidence: 'high',
      status: 'new',
      label: 'FITBOX',
      essential: false,
      cadence: 'monthly',
      amountCents: 3990,
      previousAmountCents: null,
      annualCents: 47880,
      count: 15,
      firstDate: '2025-08-03',
      lastDate: '2026-10-03',
      nextDate: '2026-11-02',
    });
    expect(fitbox.evidence[0]).toEqual({ date: '2026-10-03', amountCents: 3990 });
    expect(fitbox.evidence).toHaveLength(15);
    expect(fitbox.id).toMatch(/^[0-9a-f]{16}$/);
  });

  it('keeps at most 24 charges of evidence', () => {
    const [weekly] = detect(series('CLASE YOGA', '2026-10-20', 7, 40, 9)).findings;
    expect(weekly).toMatchObject({ cadence: 'weekly', count: 40, annualCents: 9 * 100 * 52 });
    expect(weekly.evidence).toHaveLength(24);
  });

  it('marks the bare minimum, a tolerated gap or loose amounts as «check this is right»', () => {
    const three = detect(monthly('NUBE', '2026-08', 3, 5, 2.99)).findings[0];
    expect(three.confidence).toBe('medium');
    const gap = detect([
      ...monthly('PRENSA', '2026-03', 2, 5, 7.99),
      ...monthly('PRENSA', '2026-06', 5, 5, 7.99),
    ]).findings[0];
    expect(gap).toMatchObject({ confidence: 'medium', count: 7 });
    const loose = detect(monthly('LUDO', '2026-05', 6, 5, (i) => (i % 2 ? 10 : 11.5))).findings[0];
    expect(loose.confidence).toBe('medium');
    const quarterly = detect(series('REVISTA', '2026-10-01', 91, 3, 15)).findings[0];
    expect(quarterly).toMatchObject({
      cadence: 'quarterly',
      confidence: 'high',
      annualCents: 6000,
    });
  });

  it('uses the median, so a price rise does not break the group', () => {
    const report = detect(
      monthly('STREAMFLIX', '2025-08', 15, 10, (i) => (i < 13 ? 12.99 : 13.99))
    );
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]).toMatchObject({
      kind: 'recurring',
      amountCents: 1399,
      previousAmountCents: 1299,
      annualCents: 16788,
    });
  });

  it('splits two plans of the same shop and leaves out what is not steady', () => {
    const report = detect([
      ...monthly('TIENDA APPS', '2026-05', 5, 2, 4.99),
      ...monthly('TIENDA APPS', '2026-05', 5, 4, 9.99),
    ]);
    expect(report.findings.map((f) => [f.fingerprint, f.amountCents])).toEqual([
      ['rec:tienda apps:monthly:1', 999],
      ['rec:tienda apps:monthly:0', 499],
    ]);
    const chain = detect(monthly('BAR', '2026-05', 5, 2, (i) => [10, 12, 14, 17, 9.5][i]));
    expect(chain.findings).toEqual([]);
  });

  it('leaves out the weekly shop, a varying grocery and stopped charges', () => {
    const report = detect([
      ...series('SUPER ESQUINA', '2026-10-20', 7, 10, (i) => 50 + (i % 3) * 4),
      ...monthly('MERCADO', '2026-05', 5, 2, (i) => 80 + i * 5, { categoryName: 'Alimentación' }),
      ...monthly('BONO BUS', '2026-05', 5, 2, 20, { categoryName: 'Transporte' }),
      ...monthly('VIEJO', '2025-01', 6, 2, 5),
      ...series('ANUAL VIEJO', '2025-08-01', 365, 2, 30),
    ]);
    expect(kinds(report.findings)).toEqual(['recurring:BONO BUS']);
  });

  it('never counts essentials, transfers or what a recurring rule already covers', () => {
    const report = detect(
      [
        ...monthly('IBERLUZ', '2026-04', 6, 8, 60, { categoryName: 'Luz' }),
        ...monthly('PRESTAMO COCHE', '2026-04', 6, 1, 210),
        ...monthly('BIZUM A MARTA ALQUILER', '2026-04', 6, 1, 450),
        ...monthly('GYM', '2026-04', 6, 1, 30),
        ...monthly('APUNTADO', '2026-04', 6, 1, 9, { recurringRuleId: 'r1' }),
        ...monthly('SPOTIMUS', '2026-04', 6, 1, 10.99),
      ],
      { today: TODAY, coveredKeys: new Set(['gym']) }
    );
    expect(kinds(report.findings)).toEqual(['recurring:SPOTIMUS']);
  });

  it('puts first what tends to go unnoticed: old, cheap and alone', () => {
    const report = detect([
      // 15 €/month, 15 months old, no other spending there.
      ...monthly('CLOUDY', '2025-08', 15, 1, 15),
      // 20 €/month, recent, with other purchases at the same shop.
      ...monthly('PLAY STORE', '2026-07', 4, 1, 20),
      move('PLAY STORE', '2026-08-15', 59),
    ]);
    expect(kinds(report.findings)).toEqual(['recurring:CLOUDY', 'recurring:PLAY STORE']);
  });

  it('ignores future and too old movements and incomes without a charge', () => {
    const report = detect([
      ...monthly('FUTURO', '2026-11', 4, 1, 5),
      ...monthly('ANTIGUO', '2024-01', 5, 1, 5),
      ...monthly('NOMINA', '2026-05', 5, 1, 2000, { type: 'INCOME' }),
      ...monthly('AHORRO', '2026-05', 5, 1, 100, { type: 'SAVING' }),
    ]);
    expect(report.findings).toEqual([]);
    expect(report.coverage.level).toBe('none');
  });
});

describe('detectMoneyLeaks: price rises', () => {
  const rise = (description: string, prices: number[], extra: Partial<LeakMovement> = {}) =>
    // Monthly, the last one this October.
    monthly(
      description,
      `2026-${String(11 - prices.length).padStart(2, '0')}`,
      prices.length,
      6,
      (i) => prices[i],
      extra
    );

  it('needs 3 % and 0,50 € more', () => {
    const percent = (p: number) =>
      detect(rise('LUZ VERDE', [20, 20, 20, p], { categoryName: 'Luz' })).findings;
    expect(percent(20.58)).toEqual([]); // 2,9 %
    expect(percent(20.6)).toHaveLength(1); // 3 %
    const cents = (p: number) =>
      detect(rise('AGUA CLARA', [10, 10, 10, p], { categoryName: 'Agua' })).findings;
    expect(cents(10.49)).toEqual([]);
    expect(cents(10.5)[0]).toMatchObject({
      kind: 'increase',
      essential: true,
      amountCents: 1050,
      previousAmountCents: 1000,
      annualCents: 600,
      confidence: 'high',
    });
  });

  it('is not a rise when the price goes back, nor a varying bill', () => {
    const back = detect(rise('SEGURO VIDA', [30, 30, 33, 30])).findings;
    expect(back).toEqual([]);
    const varying = detect(rise('GAS NORTE', [40, 47, 52, 58], { categoryName: 'Gas' })).findings;
    expect(varying).toEqual([]);
  });

  it('finds a yearly rise of an essential with one charge before and one after', () => {
    const report = detect(series('SEGUROS HOGAR ALFA', '2026-10-01', 365, 2, (i) => [186, 214][i]));
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]).toMatchObject({
      fingerprint: 'inc:seguros hogar alfa:21400',
      kind: 'increase',
      confidence: 'medium',
      essential: true,
      cadence: 'yearly',
      annualCents: 2800,
    });
  });

  it('shows the rise of a charge the user keeps as a finding of its own', () => {
    const movements = rise('STREAMFLIX', [12.99, 12.99, 12.99, 12.99, 13.99]);
    const rec = findingId('rec:streamflix:monthly:0');
    const kept: LeakDecision = {
      findingId: rec,
      fingerprint: 'rec:streamflix:monthly:0',
      kind: 'recurring',
      status: 'keep',
      annualCents: 15588,
      decidedAt: '2026-08-01T10:00:00.000Z',
      recoveredAt: null,
    };
    expect(kinds(detect(movements).findings)).toEqual(['recurring:STREAMFLIX']);
    const after = detect(movements, { today: TODAY, decisions: [kept] }).findings;
    expect(after.map((f) => [f.kind, f.status])).toEqual([
      ['increase', 'new'],
      ['recurring', 'keep'],
    ]);
    expect(after[0]).toMatchObject({ annualCents: 1200, previousAmountCents: 1299 });
    const cancelled = detect(movements, {
      today: TODAY,
      decisions: [{ ...kept, status: 'dismissed' }],
    }).findings;
    expect(cancelled.map((f) => [f.kind, f.status])).toEqual([['recurring', 'dismissed']]);
  });

  it('stands alone for a yearly charge whose amounts are too different to list', () => {
    const report = detect(series('ANTIVIRUS PRO', '2026-10-01', 365, 2, (i) => [49, 59][i]));
    expect(kinds(report.findings)).toEqual(['increase:ANTIVIRUS PRO']);
  });
});

describe('detectMoneyLeaks: double charges', () => {
  const pair = (gap: number, euros = 89, extra: Partial<LeakMovement> = {}) => [
    move('ELECTRO MARKET', '2026-08-01', euros, extra),
    move('ELECTRO MARKET', shift('2026-08-01', gap), euros, extra),
  ];

  it('finds the same amount 0 to 2 days apart, not 3', () => {
    expect(detect(pair(0)).findings[0]).toMatchObject({
      kind: 'duplicate',
      confidence: 'high',
      amountCents: 8900,
      oneOffCents: 8900,
      annualCents: 0,
      count: 2,
      firstDate: '2026-08-01',
      lastDate: '2026-08-01',
    });
    expect(detect(pair(2)).findings[0].confidence).toBe('medium');
    expect(detect(pair(3)).findings).toEqual([]);
    expect(detect(pair(0, 9.99)).findings).toEqual([]);
    expect(detect([...pair(0), move('ELECTRO MARKET', '2026-08-01', 88.99)]).findings).toHaveLength(
      1
    );
  });

  it('ignores frequent purchases of the same amount and usual essential amounts', () => {
    const parking = Array.from({ length: 4 }, (_, i) =>
      move('PARKING CENTRO', shift('2026-09-01', i * 3), 12)
    );
    const metro = [...parking, move('PARKING CENTRO', '2026-09-10', 12)];
    expect(detect(metro).findings).toEqual([]);
    const rent = [
      ...monthly('COMUNIDAD VECINOS', '2026-06', 3, 1, 60),
      move('COMUNIDAD VECINOS', '2026-09-01', 60),
    ];
    expect(detect(rent).findings.filter((f) => f.kind === 'duplicate')).toEqual([]);
  });

  it('solves itself with a refund within 45 days, not 46', () => {
    const refund = (days: number) =>
      detect([
        ...pair(0),
        move('DEVOLUCION ELECTRO MARKET', shift('2026-08-01', days), 89, { type: 'INCOME' }),
      ]).findings[0];
    expect(refund(45).status).toBe('refunded');
    expect(refund(46).status).toBe('new');
    expect(
      detect([...pair(0), move('ELECTRO MARKET', '2026-08-20', 20, { type: 'INCOME' })]).findings[0]
        .status
    ).toBe('new');
  });

  it('finds an essential charged twice and orders equal amounts by name', () => {
    const report = detect([
      move('SEGURO MOTO', '2026-08-01', 50),
      move('SEGURO MOTO', '2026-08-01', 50),
      move('ALFA TIENDA', '2026-08-03', 50),
      move('ALFA TIENDA', '2026-08-03', 50),
    ]);
    expect(report.findings.map((f) => [f.label, f.essential])).toEqual([
      ['ALFA TIENDA', false],
      ['SEGURO MOTO', true],
    ]);
  });

  it('pairs each charge once', () => {
    const three = [...pair(0), move('ELECTRO MARKET', '2026-08-02', 89)];
    expect(detect(three).findings).toHaveLength(1);
    const four = [...pair(0), ...pair(1, 45)];
    expect(detect(four).findings).toHaveLength(2);
  });
});

describe('detectMoneyLeaks: small, frequent spending', () => {
  /** `count` purchases spread over the last 90 days. */
  const coffees = (count: number, euros = 1.8, description = 'CAFETERÍA LA PLAZA', extra = {}) =>
    Array.from({ length: count }, (_, i) =>
      move(
        description,
        shift(TODAY, -Math.floor((i * 85) / count) - [0, 3, 1, 4, 2][i % 5]),
        euros,
        extra
      )
    );
  const since = (days: number) => [move('LIBRERIA', shift(TODAY, -days), 30)];

  it('finds 12 purchases of up to 12 € in 90 days worth 120 € a year or more', () => {
    const [small] = detect([...coffees(22), ...since(200)]).findings;
    expect(small).toMatchObject({
      kind: 'small',
      confidence: 'high',
      fingerprint: 'ant:cafeteria la plaza',
      amountCents: 180,
      annualCents: 16000,
      count: 22,
      perMonth: 7,
    });
    expect(detect([...coffees(11, 5), ...since(200)]).findings).toEqual([]);
    expect(detect([...coffees(12, 2.4), ...since(200)]).findings).toEqual([]); // 116 € a year
    expect(detect([...coffees(12, 2.5), ...since(200)]).findings[0].annualCents).toBe(12000);
    expect(detect([...coffees(14, 12.01), ...since(200)]).findings).toEqual([]);
  });

  it('annualises with the real days between 45 and 89, and hides less than 45', () => {
    const recent = (days: number) =>
      Array.from({ length: 14 }, (_, i) =>
        move('KIOSKO SOL', shift(TODAY, -Math.floor((i * days) / 14)), 3)
      );
    expect(detect(recent(60)).findings[0]).toMatchObject({ confidence: 'medium' });
    expect(detect(recent(40)).findings).toEqual([]);
  });

  it('leaves out essentials, food, transport and what repeats like a charge', () => {
    expect(
      detect([...coffees(20, 3, 'FARMACIA', { categoryName: 'Salud' }), ...since(200)]).findings
    ).toEqual([]);
    expect(
      detect([...coffees(20, 3, 'PANADERIA', { categoryName: 'Alimentación' }), ...since(200)])
        .findings
    ).toEqual([]);
    expect(
      detect([...series('METRO', TODAY, 7, 14, 9), ...since(200)]).findings.map((f) => f.kind)
    ).toEqual(['recurring']);
  });
});

describe('detectMoneyLeaks: decisions', () => {
  const fitbox = monthly('FITBOX', '2025-08', 15, 3, 39.9);
  const id = findingId('rec:fitbox:monthly:0');
  const decision = (status: LeakDecision['status']): LeakDecision => ({
    findingId: id,
    fingerprint: 'rec:fitbox:monthly:0',
    kind: 'recurring',
    status,
    annualCents: 47880,
    decidedAt: '2026-10-05T10:00:00.000Z',
    recoveredAt: null,
  });

  it('applies the decision and moves the finding after the new ones', () => {
    const report = detect([...fitbox, ...monthly('NUBE', '2026-05', 6, 2, 2.99)], {
      today: TODAY,
      decisions: [decision('keep')],
    });
    expect(report.findings.map((f) => [f.label, f.status])).toEqual([
      ['NUBE', 'new'],
      ['FITBOX', 'keep'],
    ]);
  });

  it('turns a cancellation into «no longer charged» after the next date and its margin', () => {
    const at = (today: string, movements = fitbox) =>
      detect(movements, { today, decisions: [decision('cancel')] }).findings[0]?.status;
    expect(at('2026-11-12')).toBe('cancel'); // next 2026-11-02 + 10 days
    expect(at('2026-11-13')).toBe('recovered');
    // Long stopped: still listed because the user said they would cancel it.
    expect(at('2027-06-01')).toBe('recovered');
    // Charged again: the next date moves and it is not recovered.
    expect(at('2026-11-13', [...fitbox, move('FITBOX', '2026-11-03', 39.9)])).toBe('cancel');
  });

  it('keeps an old «keep» out once the charge stopped', () => {
    const report = detect(fitbox, { today: '2027-06-01', decisions: [decision('keep')] });
    expect(report.findings).toEqual([]);
  });
});

describe('detectMoneyLeaks: acceptance example (docs C.8)', () => {
  const movements = [
    ...monthly('FITBOX', '2025-08', 15, 3, 39.9),
    ...monthly('COMPRA TARJ. STREAMFLIX.COM', '2025-08', 15, 10, (i) => (i < 13 ? 12.99 : 13.99)),
    ...monthly('CLOUDY', '2025-08', 15, 18, 2.99),
    ...series('SEGUROS HOGAR ALFA', '2026-10-01', 365, 2, (i) => [186, 214][i]),
    ...Array.from({ length: 22 }, (_, i) =>
      move('CAFETERÍA LA PLAZA', shift(TODAY, -Math.floor(i * 4)), 1.8)
    ),
    move('ELECTRO MARKET', '2026-09-12', 89),
    move('ELECTRO MARKET', '2026-09-12', 89),
    ...filler('2025-09-01', 60),
  ];

  it('costs about 870 € a year in 5 things, plus 89 € of a possible double charge', () => {
    const report = detect(movements);
    expect(report.coverage).toMatchObject({ level: 'complete', yearlyReady: true });
    const summary = summarizeLeaks(report.findings);
    expect(summary.total).toEqual({ annualCents: 87000, oneOffCents: 8900, count: 5 });
    expect(summary.count).toBe(6);
    expect(summary.byKind).toEqual({
      recurring: { count: 3, annualCents: 47880 + 16788 + 3588 },
      increase: { count: 1, annualCents: 2800 },
      duplicate: { count: 1, annualCents: 0 },
      small: { count: 1, annualCents: 16000 },
    });
    expect(kinds(report.findings)).toEqual([
      'recurring:FITBOX',
      'recurring:COMPRA TARJ. STREAMFLIX.COM',
      'small:CAFETERÍA LA PLAZA',
      'duplicate:ELECTRO MARKET',
      'recurring:CLOUDY',
      'increase:SEGUROS HOGAR ALFA',
    ]);
  });

  it('is the same with the same movements and stable when new ones arrive', () => {
    const first = detect(movements).findings.map((f) => f.id);
    expect(detect([...movements].reverse()).findings.map((f) => f.id)).toEqual(first);
    const later = detect([...movements, move('LIBRERIA', '2026-10-24', 15)]).findings.map(
      (f) => f.id
    );
    expect(later).toEqual(first);
  });

  it('adds up what the user is cancelling and what is no longer charged', () => {
    const report = detect(movements);
    const byLabel = (label: string) => report.findings.find((f) => f.label === label)!;
    const decided: LeakFinding[] = [
      { ...byLabel('FITBOX'), status: 'cancel' },
      { ...byLabel('CLOUDY'), status: 'recovered' },
      { ...byLabel('ELECTRO MARKET'), status: 'cancel' },
      ...report.findings.filter((f) => !['FITBOX', 'CLOUDY', 'ELECTRO MARKET'].includes(f.label)),
    ];
    const summary = summarizeLeaks(decided);
    expect(summary.reviewed).toEqual({
      count: 3,
      cancelMonthlyCents: Math.floor(47880 / 12),
      recoveredAnnualCents: 3588,
    });
    expect(summary.total).toEqual({
      annualCents: 35000,
      oneOffCents: 0,
      count: 3,
    });
  });
});

describe('detectMoneyLeaks: no pattern', () => {
  it('finds nothing in random spending', () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const names = ['Restaurante Uno', 'Ropa Dos', 'Libros Tres', 'Viajes Cuatro', 'Regalos Cinco'];
    const movements = Array.from({ length: 300 }, () =>
      move(
        names[Math.floor(random() * names.length)],
        shift(TODAY, -Math.floor(random() * 700)),
        Math.round((15 + random() * 150) * 100) / 100
      )
    );
    const report = detect(movements);
    expect(report.coverage.level).toBe('complete');
    expect(report.findings.filter((f) => f.kind !== 'duplicate')).toEqual([]);
  });

  it('checks 20.000 movements fast enough', () => {
    const movements = Array.from({ length: 20_000 }, (_, i) =>
      move(
        `Comercio ${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + ((i >> 5) % 26))}`,
        shift(TODAY, -(i % 700)),
        5 + (i % 90)
      )
    );
    const started = Date.now();
    detect(movements);
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
