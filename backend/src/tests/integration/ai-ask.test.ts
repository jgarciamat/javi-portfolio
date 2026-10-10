import request from 'supertest';
import { FinancialAdvisor } from '@domain/ports/services';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
  expireTrial,
} from '../helpers/testApp';

const answerQuestion = jest.fn();
const advisor: FinancialAdvisor = {
  name: 'fake',
  getAdvice: jest.fn(),
  answerQuestion,
};

describe('Asking the assistant', () => {
  let ctx: TestContext;
  let user: TestUser;

  const ask = (question = '¿Cuánto gasté en ocio?', auth = user.auth) =>
    request(ctx.app).post('/api/ai/ask').set(auth).send({ question, locale: 'es' });

  beforeEach(async () => {
    answerQuestion
      .mockReset()
      .mockResolvedValue({ answer: 'Gastaste 30 €.', usage: { neurons: 12 } });
    ctx = createTestApp({ advisor });
    user = await createUser(ctx);
    await addTransaction(ctx, user, {
      description: 'Cena secreta con Marta',
      amount: 30,
      category: 'Ocio',
      date: '2026-03-10',
    });
    await addTransaction(ctx, user, {
      type: 'INCOME',
      category: 'Salario',
      amount: 1000,
      date: '2026-03-01',
    });
  });

  it('answers from aggregated figures only and counts one analysis of the quota', async () => {
    const res = await ask().expect(200);
    expect(res.body).toEqual({ answer: 'Gastaste 30 €.', ai: { used: 1, quota: 10 } });

    const sent = answerQuestion.mock.calls[0][0];
    expect(sent).toMatchObject({ question: '¿Cuánto gasté en ocio?', locale: 'es' });
    expect(sent.facts).toMatchObject({
      currency: 'EUR',
      today: '2026-03-15',
      available: 970,
      expensesByCategory: { Ocio: { '2026-03': 30 } },
    });
    expect(sent.facts.months).toHaveLength(12);
    expect(sent.facts.months.at(-1)).toEqual({
      period: '2026-03',
      income: 1000,
      expenses: 30,
      saving: 0,
    });
    // Nothing that identifies a movement leaves the server.
    expect(JSON.stringify(sent)).not.toMatch(/Marta|secreta|Movimiento/);
    expect(ctx.container.repos.metrics.totals('2026-03-01', '2026-03-31')).toContainEqual({
      name: 'ai_question',
      count: 1,
    });
  });

  it('is part of Premium', async () => {
    expireTrial(ctx, user);
    const res = await ask().expect(402);
    expect(res.body).toMatchObject({ code: 'PREMIUM_REQUIRED', details: { feature: 'aiAdvisor' } });
    expect(answerQuestion).not.toHaveBeenCalled();
  });

  it('stops at the monthly quota and at the daily budget of the service', async () => {
    for (let i = 0; i < 10; i++) ctx.container.repos.aiUsage.addUserCall(user.id, '2026-03');
    expect((await ask().expect(400)).body.code).toBe('AI_QUOTA');

    const other = await createUser(ctx);
    ctx.container.repos.aiUsage.addNeurons('2026-03-15', 1_000_000);
    expect((await ask('¿Y ahora?', other.auth).expect(400)).body.code).toBe('AI_BUDGET');
    expect(answerQuestion).not.toHaveBeenCalled();
  });

  it('reports a provider that is down or that cannot answer questions', async () => {
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    answerQuestion.mockRejectedValue(new Error('provider down'));
    expect((await ask().expect(400)).body.code).toBe('AI_ERROR');
    expect(errorLog).toHaveBeenCalled();
    errorLog.mockRestore();
    // A failed call is not charged to the user.
    expect(ctx.container.advice['allowance'].quota(user.id).used).toBe(0);

    const plain = createTestApp({ advisor: { name: 'plain', getAdvice: jest.fn() } });
    const u = await createUser(plain);
    const res = await request(plain.app)
      .post('/api/ai/ask')
      .set(u.auth)
      .send({ question: 'hola', locale: 'es' })
      .expect(400);
    expect(res.body.code).toBe('AI_UNAVAILABLE');
    const none = createTestApp();
    const v = await createUser(none);
    await request(none.app)
      .post('/api/ai/ask')
      .set(v.auth)
      .send({ question: 'hola', locale: 'es' })
      .expect(400);
  });

  it('validates the question and needs a session', async () => {
    await ask('x').expect(400);
    await ask('y'.repeat(301)).expect(400);
    await request(ctx.app).post('/api/ai/ask').send({ question: 'hola', locale: 'es' }).expect(401);
  });
});
