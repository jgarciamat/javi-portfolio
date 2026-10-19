import request from 'supertest';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
  expireTrial,
} from '../helpers/testApp';

describe('Self-employed: professional categories and quarterly tax', () => {
  let ctx: TestContext;
  let user: TestUser;
  let categories: Record<string, string>;

  const put = (id: string, vatRate: number, who = user) =>
    request(ctx.app).put(`/api/business/categories/${id}`).set(who.auth).send({ vatRate });

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-07-10T12:00:00Z' });
    user = await createUser(ctx);
    const list = (await request(ctx.app).get('/api/categories').set(user.auth)).body as {
      id: string;
      name: string;
    }[];
    categories = Object.fromEntries(list.map((c) => [c.name, c.id]));
  });

  it('marks categories as professional with a VAT rate, changes it and unmarks it', async () => {
    await put(categories['Salario'], 21).expect(204);
    await put(categories['Educación'], 10).expect(204);
    await put(categories['Educación'], 4).expect(204);
    const list = (await request(ctx.app).get('/api/business/categories').set(user.auth).expect(200))
      .body;
    expect(list).toEqual(
      expect.arrayContaining([
        { categoryId: categories['Salario'], categoryName: 'Salario', vatRate: 21 },
        { categoryId: categories['Educación'], categoryName: 'Educación', vatRate: 4 },
      ])
    );
    expect(list).toHaveLength(2);
    await request(ctx.app)
      .delete(`/api/business/categories/${categories['Educación']}`)
      .set(user.auth)
      .expect(204);
    expect(
      (await request(ctx.app).get('/api/business/categories').set(user.auth)).body
    ).toHaveLength(1);
  });

  it('rejects unknown VAT rates and categories', async () => {
    await put(categories['Salario'], 7).expect(400);
    await put('00000000-0000-4000-8000-000000000000', 21).expect(404);
  });

  it('computes each quarter from the professional categories only', async () => {
    await put(categories['Salario'], 21).expect(204);
    await put(categories['Educación'], 21).expect(204);
    await addTransaction(ctx, user, {
      type: 'INCOME',
      category: 'Salario',
      amount: 1210,
      date: '2026-02-10',
    });
    await addTransaction(ctx, user, { category: 'Educación', amount: 242, date: '2026-03-02' });
    await addTransaction(ctx, user, { category: 'Ocio', amount: 500, date: '2026-03-03' });
    await addTransaction(ctx, user, {
      type: 'INCOME',
      category: 'Salario',
      amount: 605,
      date: '2026-05-10',
    });
    const res = await request(ctx.app).get('/api/business/tax/2026').set(user.auth).expect(200);
    expect(res.body.year).toBe(2026);
    expect(res.body.quarters[0]).toMatchObject({
      quarter: 1,
      incomeBase: 1000,
      vatCollected: 210,
      expenseBase: 200,
      vatPaid: 42,
      vatDue: 168,
      netIncome: 800,
      irpfAdvance: 160,
    });
    expect(res.body.quarters[1]).toMatchObject({ quarter: 2, incomeBase: 500, irpfAdvance: 100 });
    expect(res.body.totals).toMatchObject({ incomeBase: 1500, expenseBase: 200, irpfAdvance: 260 });
  });

  it('is private to each user', async () => {
    const other = await createUser(ctx, 'otra@example.com');
    await put(categories['Salario'], 21).expect(204);
    expect((await request(ctx.app).get('/api/business/categories').set(other.auth)).body).toEqual(
      []
    );
    expireTrial(ctx, user);
    // The categories and the estimate are open to the free plan: the drafts are what is limited.
    await request(ctx.app).get('/api/business/categories').set(user.auth).expect(200);
    await request(ctx.app).get('/api/business/tax/2026').set(user.auth).expect(200);
    await put(categories['Salario'], 21).expect(204);
    await request(ctx.app)
      .delete(`/api/business/categories/${categories['Salario']}`)
      .set(user.auth)
      .expect(204);
  });

  describe('the draft of a quarter', () => {
    const extras = { withheld: 0, socialSecurity: 0, vatNotDeductible: 0 };
    const inputs = (over: Record<string, unknown> = {}) => ({
      quarters: [extras, extras, extras, extras],
      hardToJustify: false,
      priorYearNet: null,
      exempt130: false,
      vatToOffset: 0,
      ...over,
    });
    const draft = (quarter: number, over: Record<string, unknown> = {}, year = 2026) =>
      request(ctx.app)
        .post('/api/business/draft')
        .set(user.auth)
        .send({ year, quarter, inputs: inputs(over) });
    const add = async (body: Record<string, unknown>) => {
      expect((await addTransaction(ctx, user, body)).status).toBe(201);
    };
    const box = (list: { box: string; amount: number }[], n: string) =>
      list.find((b) => b.box === n)?.amount;

    beforeEach(async () => {
      await put(categories['Salario'], 21).expect(204);
      await put(categories['Educación'], 10).expect(204);
      await put(categories['Gastos'], 21).expect(204);
      // 2026-Q1: 1,210 with 21 % VAT and 110 with 10 %; 242 of expenses with 21 % VAT.
      await add({
        type: 'INCOME',
        category: 'Salario',
        amount: 1210,
        date: '2026-02-10',
      });
      await add({
        type: 'INCOME',
        category: 'Educación',
        amount: 110,
        date: '2026-03-10',
      });
      await add({
        type: 'EXPENSE',
        category: 'Gastos',
        amount: 242,
        date: '2026-03-12',
      });
    });

    it('fills the VAT boxes by rate, the deductible VAT and the result', async () => {
      const { body } = await draft(1).expect(201);
      expect(box(body.vat.accrued, '07')).toBe(1000);
      expect(box(body.vat.accrued, '09')).toBe(210);
      expect(box(body.vat.accrued, '04')).toBe(100);
      expect(box(body.vat.accrued, '06')).toBe(10);
      expect(box(body.vat.accrued, '27')).toBe(220);
      expect(box(body.vat.deductible, '29')).toBe(42);
      expect(box(body.vat.settlement, '46')).toBe(178);
      expect(body.vat).toMatchObject({ result: 'pay', amountDue: 178 });
    });

    it('does not deduct the VAT that cannot be deducted, and offsets what was pending', async () => {
      const { body } = await draft(1, {
        quarters: [{ ...extras, vatNotDeductible: 12 }, extras, extras, extras],
        vatToOffset: 50,
      }).expect(201);
      expect(box(body.vat.deductible, '29')).toBe(30);
      expect(box(body.vat.settlement, '78')).toBe(50);
      expect(box(body.vat.settlement, '87')).toBe(0);
      expect(box(body.vat.settlement, '46')).toBe(190);
      expect(body.vat.amountDue).toBe(140);
    });

    it('says to offset when the VAT is negative, and when there was no activity', async () => {
      const offset = await draft(1, {}).expect(201);
      expect(offset.body.vat.result).toBe('pay');
      // Q2 has an expense only.
      await add({
        type: 'EXPENSE',
        category: 'Gastos',
        amount: 121,
        date: '2026-05-05',
      });
      const q2 = (await draft(2).expect(201)).body;
      expect(q2.vat).toMatchObject({ result: 'offset', amountDue: -21 });
      const q3 = (await draft(3).expect(201)).body;
      expect(q3.vat.result).toBe('noActivity');
    });

    it('works the income tax advance out on the accumulated figures', async () => {
      const { body } = await draft(1).expect(201);
      expect(box(body.irpf.boxes, '01')).toBe(1100);
      expect(box(body.irpf.boxes, '02')).toBe(200);
      expect(box(body.irpf.boxes, '03')).toBe(900);
      expect(box(body.irpf.boxes, '04')).toBe(180);
      expect(body.irpf).toMatchObject({ required: true, result: 'pay', amountDue: 180 });
    });

    it('subtracts the contribution, the withholdings and the payments of earlier quarters', async () => {
      await add({
        type: 'INCOME',
        category: 'Salario',
        amount: 1210,
        date: '2026-05-10',
      });
      const q2 = (
        await draft(2, {
          quarters: [
            { ...extras, socialSecurity: 100 },
            { ...extras, socialSecurity: 100, withheld: 30 },
            extras,
            extras,
          ],
        }).expect(201)
      ).body;
      // Income 2,100; expenses 200 + 200 of fees; net 1,700; 20 % = 340; Q1 paid 160; withheld 30.
      expect(box(q2.irpf.boxes, '01')).toBe(2100);
      expect(box(q2.irpf.boxes, '02')).toBe(400);
      expect(box(q2.irpf.boxes, '04')).toBe(340);
      expect(box(q2.irpf.boxes, '05')).toBe(160);
      expect(box(q2.irpf.boxes, '06')).toBe(30);
      expect(q2.irpf.amountDue).toBe(150);
    });

    it('applies the hard-to-justify expenses, the low-income reduction and the exemption', async () => {
      const hard = (await draft(1, { hardToJustify: true }).expect(201)).body;
      // 5 % of 900 = 45 extra expenses.
      expect(box(hard.irpf.boxes, '02')).toBe(245);
      const low = (await draft(1, { priorYearNet: 9500 }).expect(201)).body;
      expect(box(low.irpf.boxes, '13')).toBe(75);
      expect(low.irpf.amountDue).toBe(105);
      const none = (await draft(1, { priorYearNet: 20000 }).expect(201)).body;
      expect(box(none.irpf.boxes, '13')).toBe(0);
      const exempt = (await draft(1, { exempt130: true }).expect(201)).body;
      expect(exempt.irpf).toMatchObject({ required: false, result: 'notRequired', boxes: [] });
    });

    it('does not carry a negative advance, but does carry what the low-income reduction left', async () => {
      const q1 = (
        await draft(1, {
          quarters: [{ ...extras, withheld: 250 }, extras, extras, extras],
          priorYearNet: 5000,
        }).expect(201)
      ).body;
      // 20 % of 900 = 180, less 250 withheld: negative, lost; the reduction of 100 is left over.
      expect(box(q1.irpf.boxes, '07')).toBe(-70);
      expect(box(q1.irpf.boxes, '14')).toBe(-100);
      expect(q1.irpf).toMatchObject({ result: 'negative', amountDue: -100 });
      await add({ type: 'INCOME', category: 'Salario', amount: 1210, date: '2026-05-10' });
      const q2 = (
        await draft(2, {
          quarters: [{ ...extras, withheld: 250 }, extras, extras, extras],
          priorYearNet: 5000,
        }).expect(201)
      ).body;
      expect(box(q2.irpf.boxes, '14')).toBe(30);
      expect(box(q2.irpf.boxes, '15')).toBe(30);
      expect(q2.irpf).toMatchObject({ result: 'zero', amountDue: 0 });
      const plain = (await draft(1, { priorYearNet: 5000 }).expect(201)).body;
      expect(box(plain.irpf.boxes, '14')).toBe(80);
    });

    it('estimates the contribution of the self-employed scheme', async () => {
      const { body } = await draft(1).expect(201);
      // 900 net in the quarter = 300 a month, minus 7 %: the first reduced bracket.
      expect(body.reta).toMatchObject({ bracket: 'R1', baseMin: 653.59, feeMin: 205.88 });
      await add({
        type: 'INCOME',
        category: 'Salario',
        amount: 30000,
        date: '2026-03-20',
      });
      const high = (await draft(1).expect(201)).body;
      expect(high.reta).toMatchObject({ bracket: 'G12', baseMin: 1928.1, feeMax: 1606.88 });
      expect(high.reta.rate).toBe(0.315);
    });

    it('lists the deadlines of the quarter, with the annual ones at the year end', async () => {
      const q1 = (await draft(1).expect(201)).body;
      expect(q1.deadlines.find((d: { model: string }) => d.model === '303').date).toBe(
        '2026-04-20'
      );
      const q4 = (await draft(4).expect(201)).body;
      const models = q4.deadlines.map((d: { model: string }) => d.model);
      expect(models).toEqual(
        expect.arrayContaining(['303', '130', '111', '115', '390', '190', '347'])
      );
      // 30 January 2027 is a Saturday: the next working day.
      expect(q4.deadlines.find((d: { model: string }) => d.model === '303').date).toBe(
        '2027-02-01'
      );
    });

    describe('with the income and expenses typed by hand', () => {
      const profile = {
        workArea: 20,
        homeArea: 100,
        vehicleExclusive: false,
        healthPeople: 2,
        healthDisability: false,
      };
      const q = (income: Record<string, number>, expenses: unknown[] = []) => ({
        income: { r21: 0, r10: 0, r4: 0, r0: 0, ...income },
        expenses,
      });
      const manual = (first: ReturnType<typeof q>, over: Record<string, unknown> = {}) => ({
        quarters: [first, q({}), q({}), q({})],
        profile: { ...profile, ...over },
      });
      const line = (body: { expenses: { kind: string }[] }, kind: string) =>
        body.expenses.find((l) => l.kind === kind) as Record<string, number | string>;

      it('does not use the movements and applies the rule of each kind of expense', async () => {
        const { body } = await draft(1, {
          manual: manual(
            q({ r21: 5000, r10: 1000 }, [
              { kind: 'quota', amount: 300, vatRate: 0 },
              { kind: 'supplies', amount: 121, vatRate: 21 },
              { kind: 'vehicle', amount: 121, vatRate: 21 },
              { kind: 'meals', amount: 121, vatRate: 21, days: 2 },
              { kind: 'clients', amount: 121, vatRate: 21 },
              { kind: 'health', amount: 1500, vatRate: 0 },
              { kind: 'training', amount: 121, vatRate: 21 },
              { kind: 'fines', amount: 100, vatRate: 0 },
            ])
          ),
        }).expect(201);
        // Income only from the manual data (the movements of the beforeEach are ignored).
        expect(box(body.vat.accrued, '07')).toBe(5000);
        expect(box(body.vat.accrued, '04')).toBe(1000);
        expect(line(body, 'quota')).toMatchObject({ deductible: 300, vatDeductible: 0 });
        // 30 % of 20 m2 over 100 m2 = 6 %.
        expect(line(body, 'supplies')).toMatchObject({
          deductible: 6,
          vatDeductible: 1.26,
          note: 'supplies',
        });
        // Mixed-use car: no expense for the income tax, half of the VAT.
        expect(line(body, 'vehicle')).toMatchObject({
          deductible: 0,
          vatDeductible: 10.5,
          note: 'vehicle',
        });
        // Two days at 26.67 = 53.34 of the 121 paid: 44.08 of expense plus the VAT recovered in proportion.
        expect(line(body, 'meals')).toMatchObject({ deductible: 44.08, note: 'meals' });
        // Client gifts: deductible expense, but the VAT is not.
        expect(line(body, 'clients')).toMatchObject({ deductible: 121, vatDeductible: 0 });
        // Insurance for two people: 1,000 of the 1,500.
        expect(line(body, 'health')).toMatchObject({ deductible: 1000, note: 'health' });
        expect(line(body, 'training')).toMatchObject({ deductible: 100, vatDeductible: 21 });
        expect(line(body, 'fines')).toMatchObject({ deductible: 0, note: 'fines' });
      });

      it('deducts the whole car when it is used only for the activity', async () => {
        const { body } = await draft(1, {
          manual: manual(q({ r21: 1000 }, [{ kind: 'vehicle', amount: 121, vatRate: 21 }]), {
            vehicleExclusive: true,
          }),
        }).expect(201);
        expect(line(body, 'vehicle')).toMatchObject({ deductible: 100, vatDeductible: 21 });
        expect(body.vat.deductible.find((b: { box: string }) => b.box === '29').amount).toBe(21);
        expect(box(body.irpf.boxes, '02')).toBe(100);
      });

      it('handles the empty cases: no area, no days, no people, 1,500 with a disability', async () => {
        const { body } = await draft(1, {
          manual: manual(
            q({}, [
              { kind: 'supplies', amount: 121, vatRate: 21 },
              { kind: 'meals', amount: 121, vatRate: 21 },
              { kind: 'health', amount: 0, vatRate: 0 },
              { kind: 'vehicle', amount: 0, vatRate: 0 },
            ]),
            { homeArea: 0, healthPeople: 0 }
          ),
        }).expect(201);
        expect(line(body, 'supplies')).toMatchObject({ deductible: 0, vatDeductible: 0 });
        expect(line(body, 'meals')).toMatchObject({ deductible: 0 });
        expect(line(body, 'health')).toMatchObject({ deductible: 0 });
        const disabled = (
          await draft(1, {
            manual: manual(q({}, [{ kind: 'health', amount: 1500, vatRate: 0 }]), {
              healthPeople: 1,
              healthDisability: true,
            }),
          }).expect(201)
        ).body;
        expect(line(disabled, 'health')).toMatchObject({ deductible: 1500 });
      });

      it('rejects an unknown kind of expense and has no breakdown without manual data', async () => {
        await draft(1, {
          manual: manual(q({}, [{ kind: 'yacht', amount: 1, vatRate: 21 }])),
        }).expect(400);
        expect((await draft(1).expect(201)).body.expenses).toBeNull();
      });
    });

    it('starts from the totals of the modelo 130 already filed, without the earlier quarters', async () => {
      await add({ type: 'INCOME', category: 'Salario', amount: 1210, date: '2026-11-10' });
      const { body } = await draft(4, {
        prior: { income: 3000, expenses: 600, previousPayments: 360, withheld: 100 },
        hardToJustify: true,
        manual: {
          quarters: [
            { income: { r21: 0, r10: 0, r4: 0, r0: 0 }, expenses: [] },
            { income: { r21: 0, r10: 0, r4: 0, r0: 0 }, expenses: [] },
            { income: { r21: 0, r10: 0, r4: 0, r0: 0 }, expenses: [] },
            {
              income: { r21: 1000, r10: 0, r4: 0, r0: 0 },
              expenses: [{ kind: 'training', amount: 121, vatRate: 21 }],
            },
          ],
          profile: {
            workArea: 0,
            homeArea: 0,
            vehicleExclusive: false,
            healthPeople: 0,
            healthDisability: false,
          },
        },
        quarters: [extras, extras, extras, { ...extras, withheld: 50 }],
      }).expect(201);
      // 3,000 + 1,000 of income; 600 + 100 of expenses; no extra 5 % (it was in the filed 02).
      expect(box(body.irpf.boxes, '01')).toBe(4000);
      expect(box(body.irpf.boxes, '02')).toBe(700);
      expect(box(body.irpf.boxes, '03')).toBe(3300);
      expect(box(body.irpf.boxes, '04')).toBe(660);
      expect(box(body.irpf.boxes, '05')).toBe(360);
      expect(box(body.irpf.boxes, '06')).toBe(150);
      expect(body.irpf.amountDue).toBe(150);
      // The VAT is only of the viewed quarter, and the contribution counts the filed totals.
      expect(box(body.vat.accrued, '07')).toBe(1000);
      // 3,300 net over 12 months, less the 7 %.
      expect(body.reta.monthlyNet).toBe(255.75);
    });

    it('drafts the whole VAT family: sales without VAT, intra-EU purchases, the 349 and the 390', async () => {
      const empty = { income: { r21: 0, r10: 0, r4: 0, r0: 0 }, expenses: [] };
      const { body } = await draft(4, {
        vat: { offsetStart: 0, refund: true },
        manual: {
          quarters: [
            empty,
            empty,
            empty,
            {
              income: { r21: 1000, r10: 0, r4: 0, r0: 0 },
              expenses: [
                // An intra-EU purchase and an imported machine: their amounts are the bases.
                { kind: 'material', amount: 500, vatRate: 21, op: 'intraGoods' },
                { kind: 'material', amount: 4000, vatRate: 21, op: 'import', investment: true },
              ],
              vat: {
                sales: { intraEU: 2000, exports: 1000 },
                intra: [
                  { key: 'E', vatId: 'FR00000000001', name: 'Client fictif', base: 2000 },
                  { key: 'A', vatId: 'DE000000001', name: 'Lieferant', base: 500 },
                ],
              },
            },
          ],
          profile: {
            workArea: 0,
            homeArea: 0,
            vehicleExclusive: false,
            healthPeople: 0,
            healthDisability: false,
          },
        },
      }).expect(201);
      // 27 = 210 + 105 (self-assessed); 45 = 105 + 840; the −630 is refunded in the fourth quarter.
      expect(box(body.vat.accrued, '27')).toBe(315);
      expect(box(body.vat.deductible, '35')).toBe(840);
      expect(box(body.vat.deductible, '45')).toBe(945);
      expect(box(body.vat.info, '59')).toBe(2000);
      expect(box(body.vat.info, '60')).toBe(1000);
      expect(box(body.vat.settlement, '73')).toBe(630);
      expect(body.vat.result).toBe('refund');
      expect(body.m349.boxes.map((b: { amount: number }) => b.amount)).toEqual([2, 2500, 0, 0]);
      expect(body.m349.warnings).toEqual([]);
      const m390 = Object.fromEntries(
        body.m390.sections.flatMap((s: { boxes: { box: string; amount: number }[] }) =>
          s.boxes.map((b) => [b.box, b.amount])
        )
      );
      expect(m390).toMatchObject({ '99': 1000, '103': 2000, '104': 1000, '108': 4000, '98': 630 });
      // The machine is depreciated, not deducted at once in the 130.
      expect(box(body.irpf.boxes, '01')).toBe(4000);
      expect(box(body.irpf.boxes, '02')).toBe(500);
      expect(body.expenses.map((l: { note: string }) => l.note)).toEqual(['', 'investment']);
      expect(body.deadlines.map((d: { model: string }) => d.model)).toContain('349');
    });

    it('rejects an unknown VAT operation, key of the 349 or percentage', async () => {
      const q = (vat: unknown, expenses: unknown[] = []) => ({
        income: { r21: 0, r10: 0, r4: 0, r0: 0 },
        expenses,
        vat,
      });
      const profile = {
        workArea: 0,
        homeArea: 0,
        vehicleExclusive: false,
        healthPeople: 0,
        healthDisability: false,
      };
      const with4 = (first: unknown) => ({ quarters: [first, q(null), q(null), q(null)], profile });
      await draft(1, {
        manual: with4(q(null, [{ kind: 'other', amount: 1, vatRate: 21, op: 'smuggling' }])),
      }).expect(400);
      await draft(1, {
        manual: with4(q({ intra: [{ key: 'Z', vatId: 'FR1', name: '', base: 1 }] })),
      }).expect(400);
      await draft(1, { vat: { prorrata: { provisional: 120, special: false } } }).expect(400);
    });

    it('ignores the filed totals in the first quarter', async () => {
      const { body } = await draft(1, {
        prior: { income: 9999, expenses: 0, previousPayments: 0, withheld: 0 },
      }).expect(201);
      expect(box(body.irpf.boxes, '01')).toBe(1100);
    });

    it('lets the free plan draft the current quarter and the one being filed, Premium any', async () => {
      expireTrial(ctx, user);
      // 10 July 2026: the third quarter is the current one and the second can still be filed.
      const past = await draft(1).expect(402);
      expect(past.body).toMatchObject({
        code: 'AUTONOMO_QUARTER_LOCKED',
        details: {
          year: 2026,
          quarter: 3,
          allowed: [
            { year: 2026, quarter: 3 },
            { year: 2026, quarter: 2 },
          ],
        },
      });
      await draft(3, {}, 2025).expect(402);
      expect((await draft(3).expect(201)).body.used).toBe(1);
      const refused = await draft(3).expect(402);
      expect(refused.body.code).toBe('PLAN_LIMIT');
      expect(refused.body.details).toEqual({ resource: 'autonomoDrafts', limit: 1 });
      expect((await draft(2).expect(201)).body.used).toBe(1);
      await draft(2).expect(402);
      const billing = async () => (await request(ctx.app).get('/api/billing').set(user.auth)).body;
      expect((await billing()).usage.autonomoDrafts).toBe(1);
      expect((await billing()).autonomoQuarters).toEqual([
        { year: 2026, quarter: 3, used: 1 },
        { year: 2026, quarter: 2, used: 1 },
      ]);
      // The filing window of the second quarter closes on 20 July.
      ctx.clock.set('2026-07-21T10:00:00Z');
      expect((await billing()).autonomoQuarters).toEqual([{ year: 2026, quarter: 3, used: 1 }]);
      expect((await draft(2).expect(402)).body.code).toBe('AUTONOMO_QUARTER_LOCKED');
      // A new quarter brings a new free draft.
      ctx.clock.set('2026-10-02T10:00:00Z');
      expect((await billing()).usage.autonomoDrafts).toBe(0);
      expect((await draft(4).expect(201)).body.used).toBe(1);
      await draft(3).expect(402); // already drafted in July
      await draft(2).expect(402);
      ctx.container.entitlements.grantDays(user.id, 30);
      for (let i = 2; i <= 3; i++) expect((await draft(4).expect(201)).body.used).toBe(i);
      expect((await draft(1).expect(201)).body.used).toBe(1);
    });

    it('lets the free plan download one PDF only, and Premium as many as it wants', async () => {
      const pdf = () => request(ctx.app).post('/api/business/draft/pdf').set(user.auth);
      for (let i = 1; i <= 2; i++) expect((await pdf().expect(201)).body).toEqual({ used: i });
      expireTrial(ctx, user);
      const refused = await pdf().expect(402);
      expect(refused.body.details).toEqual({ resource: 'autonomoPdfs', limit: 1 });
      const overview = (await request(ctx.app).get('/api/billing').set(user.auth)).body;
      expect(overview.usage.autonomoPdfs).toBe(2);
      await request(ctx.app).post('/api/business/draft/pdf').expect(401);
    });

    it('is unlimited in the trial and rejects invalid data', async () => {
      for (let i = 1; i <= 3; i++) expect((await draft(1).expect(201)).body.used).toBe(i);
      await request(ctx.app)
        .post('/api/business/draft')
        .set(user.auth)
        .send({ year: 2026, quarter: 5, inputs: inputs() })
        .expect(400);
      await request(ctx.app).post('/api/business/draft').send({}).expect(401);
    });
  });
});
