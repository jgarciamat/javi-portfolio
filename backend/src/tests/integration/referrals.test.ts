import request from 'supertest';
import {
  ReferralService,
  ACTIVE_DAYS_GOAL,
  MAX_INVITED_PER_USER,
  REFERRAL_MAX_PER_MONTH,
  REFERRAL_MAX_PER_YEAR,
  REFERRAL_REWARD_DAYS,
  REFERRAL_TIERS,
  firstStepsProgress,
} from '@application/referrals/ReferralService';
import { canonicalInbox, isDisposableEmail } from '@domain/services/email-identity';
import { referralSummaryResponse } from '@infrastructure/http/schemas';
import { openDatabase } from '@infrastructure/sqlite/database';
import { migrate } from '@infrastructure/sqlite/migrator';
import { migrations } from '@infrastructure/sqlite/migrations';
import { SqliteReferralRepository } from '@infrastructure/sqlite/repositories/SqliteReferralRepository';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
  expireTrial,
} from '../helpers/testApp';

describe('reward rules', () => {
  it('gives one month per friend, at most 3 a month and 6 a year', () => {
    expect(REFERRAL_MAX_PER_MONTH).toBe(3);
    expect(REFERRAL_MAX_PER_YEAR).toBe(6);
    expect(REFERRAL_TIERS).toEqual([1, 2, 3, 4, 5, 6]);
    expect(MAX_INVITED_PER_USER).toBe(100);
    expect(ACTIVE_DAYS_GOAL).toBe(3);
  });

  it('caps each step at its goal', () => {
    expect(firstStepsProgress({ movements: 7, budgets: 0, goals: 2, automations: 1 })).toEqual([
      { id: 'movements', count: 3, goal: 3, done: true },
      { id: 'budgets', count: 0, goal: 1, done: false },
      { id: 'goals', count: 1, goal: 1, done: true },
      { id: 'automations', count: 1, goal: 1, done: true },
    ]);
  });
});

describe('e-mail identity', () => {
  it('reads two spellings of the same inbox as one', () => {
    expect(canonicalInbox(' A.B+promo@GoogleMail.com ')).toBe('ab@gmail.com');
    expect(canonicalInbox('ab@gmail.com')).toBe('ab@gmail.com');
    // Only Gmail ignores the dots; the +tag goes everywhere.
    expect(canonicalInbox('ana.lopez+x@outlook.es')).toBe('ana.lopez@outlook.es');
    expect(
      ['', 'nope', '@gmail.com', 'ana@', '+x@gmail.com', null, undefined].map(canonicalInbox)
    ).toEqual([null, null, null, null, null, null, null]);
  });

  it('spots throwaway inboxes, also on their subdomains, and nothing else', () => {
    expect(isDisposableEmail('x@mailinator.com')).toBe(true);
    expect(isDisposableEmail('x@eu.yopmail.com')).toBe(true);
    expect(isDisposableEmail('x@gmail.com')).toBe(false);
    expect(isDisposableEmail('x@notmailinator.com')).toBe(false);
    expect(isDisposableEmail('not an address')).toBe(false);
    expect(isDisposableEmail(null)).toBe(false);
  });
});

describe('referral response', () => {
  const valid = {
    code: 'ABCD2345',
    qualified: 0,
    pending: 0,
    rewardDays: 30,
    rewardsEarned: 0,
    waiting: 0,
    missing: 1,
    nextAt: 1,
    maxed: false,
    maxRewards: 6,
    perMonth: 3,
    tiers: [1, 2, 3, 4, 5, 6],
    invited: null,
  };

  it('accepts the summary and rejects anything extra, such as who invited the user', () => {
    expect(referralSummaryResponse.parse(valid)).toEqual(valid);
    expect(() => referralSummaryResponse.parse({ ...valid, referrerId: 'u1' })).toThrow();
    expect(() =>
      referralSummaryResponse.parse({
        ...valid,
        invited: {
          rewarded: false,
          activeDays: { count: 0, goal: 3 },
          eligible: true,
          steps: [],
          inviter: 'Ana',
        },
      })
    ).toThrow();
    expect(() => referralSummaryResponse.parse({ ...valid, missing: -1 })).toThrow();
  });
});

describe('Invite a friend', () => {
  let ctx: TestContext;
  let host: TestUser;
  const START = '2026-03-15T12:00:00Z';

  beforeEach(async () => {
    ctx = createTestApp({ now: START });
    host = await createUser(ctx);
  });

  const summary = async (user = host) =>
    (await request(ctx.app).get('/api/referral').set(user.auth).expect(200)).body;
  const trialDays = async (user: TestUser) =>
    (await request(ctx.app).get('/api/billing').set(user.auth).expect(200)).body.trialDaysLeft;
  const dayAfter = (days: number) =>
    new Date(new Date(START).getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  /** One movement on each of these days after the start; the clock comes back afterwards. */
  const moveOn = async (user: TestUser, days: number[]) => {
    for (const d of days) {
      ctx.clock.set(dayAfter(d));
      await addTransaction(ctx, user, { amount: d + 1 });
    }
    ctx.clock.set(START);
  };

  /** A budget, a goal and an automation: with 3 movements, what the first-steps list asks for. */
  const doSetup = async (user: TestUser) => {
    await request(ctx.app)
      .put('/api/budgets')
      .set(user.auth)
      .send({ category: 'Ocio', amount: 100 })
      .expect(200);
    await request(ctx.app)
      .post('/api/goals')
      .set(user.auth)
      .send({ name: 'Viaje', target: 500 })
      .expect(201);
    await request(ctx.app)
      .post('/api/recurring-rules')
      .set(user.auth)
      .send({
        description: 'Alquiler',
        type: 'EXPENSE',
        category: 'Vivienda',
        amount: 700,
        startYear: 2026,
        startMonth: 4,
      })
      .expect(201);
  };

  /** The first steps, with the movements written down on three different days. */
  const doFirstSteps = async (user: TestUser) => {
    await moveOn(user, [0, 1, 2]);
    await doSetup(user);
  };

  it('gives each user a stable code and shows the rule', async () => {
    const first = await summary();
    expect(first.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(first).toMatchObject({
      qualified: 0,
      pending: 0,
      rewardDays: 30,
      rewardsEarned: 0,
      waiting: 0,
      missing: 1,
      nextAt: 1,
      maxed: false,
      maxRewards: 6,
      perMonth: 3,
      tiers: [1, 2, 3, 4, 5, 6],
      invited: null,
    });
    expect((await summary()).code).toBe(first.code);
    expect((await summary(await createUser(ctx))).code).not.toBe(first.code);
    await request(ctx.app).get('/api/referral').expect(401);
  });

  it('counts the invitation once the friend did the first steps on three days, then rewards both', async () => {
    const { code } = await summary();
    const friend = await createUser(ctx, undefined, code.toLowerCase()); // typed by hand
    expect(await summary()).toMatchObject({ qualified: 0, pending: 1, missing: 1 });
    expect(await trialDays(host)).toBe(14);

    // Everything in one minute: the first steps are done, but on a single day.
    for (const amount of [1, 2, 3]) await addTransaction(ctx, friend, { amount });
    await doSetup(friend);
    expect(await trialDays(friend)).toBe(14);
    expect((await summary(friend)).invited).toMatchObject({
      rewarded: false,
      activeDays: { count: 1, goal: 3 },
      eligible: true,
    });
    await moveOn(friend, [1]);
    expect(await trialDays(friend)).toBe(14); // two days are not enough
    await moveOn(friend, [2]);
    expect(await trialDays(friend)).toBe(44);
    expect(await summary()).toMatchObject({
      qualified: 1,
      pending: 0,
      rewardsEarned: 1,
      waiting: 0,
      missing: 1,
      nextAt: 2,
    });
    expect(await trialDays(host)).toBe(44);
    expect(ctx.container.repos.metrics.totals('2026-03-01', '2026-03-31')).toContainEqual({
      name: 'referral_joined',
      count: 1,
    });
    expect(await trialDays(friend)).toBe(44); // nothing more to give
    expect((await summary(friend)).invited.activeDays).toEqual({ count: 3, goal: 3 });
  });

  it('counts only the days of the first month, and not the examples nor recurring rules', async () => {
    const { code } = await summary();
    const friend = await createUser(ctx, undefined, code);
    await doSetup(friend);
    await moveOn(friend, [0, 1, 30]); // the third day is past the first month
    expect(await trialDays(friend)).toBe(14);
    const repo = ctx.container.repos.transactions;
    const from = dayAfter(0);
    expect(repo.activeDays(friend.id, from, dayAfter(30))).toBe(2);
    await request(ctx.app).post('/api/sample-data').set(friend.auth).expect(201);
    expect(ctx.container.repos.transactions.countSample(friend.id)).toBeGreaterThan(0);
    expect(repo.activeDays(friend.id, from, dayAfter(30))).toBe(2);
  });

  it('adds the months after the Premium already paid for, so nobody loses days', async () => {
    const subs = ctx.container.repos.subscriptions;
    const paidUntil = dayAfter(20);
    const paying = (user: TestUser) =>
      subs.save({
        ...subs.get(user.id)!,
        status: 'active',
        source: 'stripe',
        trialEndsAt: null,
        currentPeriodEnd: paidUntil,
      });
    const friend = await createUser(ctx, undefined, (await summary()).code);
    paying(host);
    paying(friend);
    await doFirstSteps(friend);
    await summary(friend);
    const afterPaid = new Date(new Date(paidUntil).getTime() + 30 * 86_400_000).toISOString();
    expect(subs.get(friend.id)!.trialEndsAt).toBe(afterPaid);
    expect(subs.get(host.id)!.trialEndsAt).toBe(afterPaid);
  });

  it('notices the friend’s progress when the inviter looks at their numbers', async () => {
    const { code } = await summary();
    const friend = await createUser(ctx, undefined, code);
    await doFirstSteps(friend);
    expect(await summary()).toMatchObject({ qualified: 1, rewardsEarned: 1 });
    expect(await trialDays(host)).toBe(44);
  });

  it('ignores unknown codes, one’s own code and a second invitation', async () => {
    await createUser(ctx, undefined, 'NOSUCHCD');
    expect(await summary()).toMatchObject({ pending: 0 });
    const { code } = await summary();
    ctx.container.referrals.attach(host.id, code); // own code
    expect(await summary()).toMatchObject({ pending: 0 });

    const other = await createUser(ctx);
    const friend = await createUser(ctx, undefined, code);
    ctx.container.referrals.attach(friend.id, (await summary(other)).code); // already invited
    expect(await summary(other)).toMatchObject({ pending: 0, qualified: 0 });
    expect(await summary()).toMatchObject({ pending: 1 });
  });

  it('ignores another spelling of the inviter’s inbox and a second account on a friend’s', async () => {
    const ana = await createUser(ctx, 'ana.lopez@gmail.com');
    const { code } = await summary(ana);
    await createUser(ctx, 'analopez+premium@googlemail.com', code);
    expect(await summary(ana)).toMatchObject({ pending: 0 });
    await createUser(ctx, 'luis@example.com', code);
    await createUser(ctx, 'luis+2@example.com', code);
    expect(await summary(ana)).toMatchObject({ pending: 1 });
  });

  it('gives nothing to throwaway inboxes, and the inviter’s months wait until it changes', async () => {
    const { code } = await summary();
    const throwaway = await createUser(ctx, 'quick@yopmail.com', code);
    await doFirstSteps(throwaway);
    expect(await trialDays(throwaway)).toBe(14);
    expect((await summary(throwaway)).invited).toMatchObject({ rewarded: false, eligible: false });
    expect(await summary()).toMatchObject({ qualified: 0, pending: 1 });

    const shady = await createUser(ctx, 'shady@mailinator.com');
    const friend = await createUser(ctx, undefined, (await summary(shady)).code);
    await doFirstSteps(friend);
    expect(await trialDays(friend)).toBe(44); // the friend still gets theirs
    expect(await summary(shady)).toMatchObject({ qualified: 1, rewardsEarned: 0, waiting: 1 });
    expect(await trialDays(shady)).toBe(14);
  });

  it('restarts Premium for an inviter whose trial ended', async () => {
    expireTrial(ctx, host);
    expect(await trialDays(host)).toBe(0);
    const friend = await createUser(ctx, undefined, (await summary()).code);
    await doFirstSteps(friend);
    await trialDays(friend);
    expect(await trialDays(host)).toBe(30);
  });

  const instantService = () =>
    // Same rules, with every first step and day answered "done" so friends need no data.
    new ReferralService(
      ctx.container.repos.referrals,
      ctx.container.entitlements,
      ctx.container.repos.metrics,
      ctx.container.clock,
      () => ({ movements: 3, budgets: 1, goals: 1, automations: 1 }),
      {
        accountOf: (id) => {
          const user = ctx.container.repos.users.findById(id)?.toPrimitives();
          return user ? { email: user.email, createdAt: user.createdAt } : null;
        },
        activeDays: () => 3,
      }
    );

  it('gives 3 months a month and 6 a year; the rest wait for the next month or year', async () => {
    const service = instantService();
    const { code } = await summary();
    const friends: TestUser[] = [];
    for (let i = 0; i < 8; i++) friends.push(await createUser(ctx, undefined, code));
    const granted = () => ctx.container.repos.referrals.rewardsGranted(host.id);
    const qualify = (from: number, to: number) =>
      friends.slice(from, to).forEach((f) => service.reward(f.id));

    qualify(0, 4);
    expect(granted()).toBe(3);
    expect(await summary()).toMatchObject({ qualified: 4, rewardsEarned: 3, waiting: 1 });
    expect(await trialDays(host)).toBe(14 + 3 * REFERRAL_REWARD_DAYS);

    ctx.clock.set('2026-04-02T09:00:00Z'); // a new month: the one waiting arrives
    expect(await summary()).toMatchObject({ rewardsEarned: 4, waiting: 0 });
    qualify(4, 7);
    expect(await summary()).toMatchObject({
      qualified: 7,
      rewardsEarned: 6,
      waiting: 1,
      missing: 0,
      nextAt: null,
      maxed: true,
    });
    ctx.clock.set('2026-12-01T09:00:00Z');
    expect(await summary()).toMatchObject({ rewardsEarned: 6, waiting: 1, maxed: true });

    ctx.clock.set('2027-01-05T09:00:00Z'); // a new year
    qualify(7, 8);
    expect(await summary()).toMatchObject({ rewardsEarned: 2, waiting: 0, maxed: false });
    expect(granted()).toBe(8);
    expect(await trialDays(friends[7])).toBeGreaterThan(0);
  });

  it('settles the friends of a lifetime user without months', async () => {
    const subs = ctx.container.repos.subscriptions;
    subs.save({ ...subs.get(host.id)!, lifetime: true, trialEndsAt: null });
    const before = subs.get(host.id);
    const friend = await createUser(ctx, undefined, (await summary()).code);
    await doFirstSteps(friend);
    await trialDays(friend);
    expect(subs.get(host.id)).toEqual(before);
    expect(await summary()).toMatchObject({ qualified: 1, rewardsEarned: 0, waiting: 0 });
  });

  const googleSignup = (id: string, referralCode?: string) => {
    ctx.google.identities.set(id, {
      googleId: `g-${id}`,
      email: `${id}@gmail.com`,
      emailVerified: true,
      name: null,
    });
    return request(ctx.app).post('/api/auth/google').send({ token: id, referralCode }).expect(200);
  };

  it('attaches the code when the friend signs up with Google, but not on later sign-ins', async () => {
    const { code } = await summary();
    await googleSignup('lu', code);
    expect(await summary()).toMatchObject({ pending: 1 });
    // Someone who already has an account cannot be "invited" by signing in again.
    await googleSignup('lu', (await summary(await createUser(ctx))).code);
    await googleSignup('pau');
    expect(await summary()).toMatchObject({ pending: 1 });
  });

  it('tells an invited user what is missing for their month, and nothing about the inviter', async () => {
    const { code } = await summary();
    const friend = await createUser(ctx, undefined, code);
    const steps = async () => (await summary(friend)).invited;
    expect(await steps()).toEqual({
      rewarded: false,
      activeDays: { count: 0, goal: 3 },
      eligible: true,
      steps: [
        { id: 'movements', count: 0, goal: 3, done: false },
        { id: 'budgets', count: 0, goal: 1, done: false },
        { id: 'goals', count: 0, goal: 1, done: false },
        { id: 'automations', count: 0, goal: 1, done: false },
      ],
    });
    await addTransaction(ctx, friend, { amount: 1 });
    expect((await steps()).steps[0]).toEqual({ id: 'movements', count: 1, goal: 3, done: false });
    await doFirstSteps(friend);
    const done = await steps();
    expect(done.rewarded).toBe(true);
    expect(done.steps.every((s: { done: boolean }) => s.done)).toBe(true);
    expect(JSON.stringify(await summary(friend))).not.toContain(host.id);
    expect(await trialDays(friend)).toBe(44);
  });

  it('stops attaching invitations to a user over the cap', async () => {
    const { code } = await summary();
    for (let i = 0; i < MAX_INVITED_PER_USER + 1; i++) await googleSignup(`u${i}`, code);
    expect(await summary()).toMatchObject({ pending: MAX_INVITED_PER_USER });
  });

  it('counts no days for an account it cannot find', async () => {
    const service = new ReferralService(
      ctx.container.repos.referrals,
      ctx.container.entitlements,
      ctx.container.repos.metrics,
      ctx.container.clock,
      () => ({ movements: 3, budgets: 1, goals: 1, automations: 1 }),
      { accountOf: () => null, activeDays: () => 3 }
    );
    expect(service.summary(host.id).invited).toBeNull();
    const friend = await createUser(ctx, undefined, (await summary()).code);
    expect(service.summary(friend.id).invited).toMatchObject({
      rewarded: false,
      activeDays: { count: 0, goal: 3 },
    });
  });
});

describe('migration to one month per friend', () => {
  it('keeps the months given under the old tiers, marked on the earliest friends', () => {
    const db = openDatabase(':memory:');
    migrate(
      db,
      migrations.filter((m) => m.version < 49)
    );
    const users = ['host', 'f1', 'f2', 'f3', 'f4', 'other', 'g1'];
    for (const id of users) {
      db.prepare(
        `INSERT INTO users (id, email, name, password_hash, created_at, email_verified)
         VALUES (?, ?, 'X', 'x', '2026-01-01T00:00:00Z', 1)`
      ).run(id, `${id}@example.com`);
    }
    db.exec(`
      INSERT INTO referral_codes (user_id, code, rewards_granted) VALUES ('host', 'HOSTCODE', 1);
      INSERT INTO referral_codes (user_id, code, rewards_granted) VALUES ('other', 'OTHERCOD', 0);
      INSERT INTO referrals VALUES ('f1', 'host', '2026-02-01', '2026-02-03T10:00:00Z');
      INSERT INTO referrals VALUES ('f2', 'host', '2026-02-01', '2026-02-02T10:00:00Z');
      INSERT INTO referrals VALUES ('f3', 'host', '2026-02-01', '2026-02-04T10:00:00Z');
      INSERT INTO referrals VALUES ('f4', 'host', '2026-02-01', NULL);
      INSERT INTO referrals VALUES ('g1', 'other', '2026-02-01', '2026-02-05T10:00:00Z');
    `);
    migrate(db, migrations);
    const rows = db
      .prepare(
        'SELECT referred_id AS id, inviter_settled_at AS at, inviter_month AS month FROM referrals ORDER BY referred_id'
      )
      .all();
    expect(rows).toEqual([
      { id: 'f1', at: '2026-02-03T10:00:00Z', month: 0 },
      { id: 'f2', at: '2026-02-02T10:00:00Z', month: 1 }, // the earliest friend holds the month
      { id: 'f3', at: '2026-02-04T10:00:00Z', month: 0 },
      { id: 'f4', at: null, month: 0 }, // not counted yet: the new rule applies
      { id: 'g1', at: '2026-02-05T10:00:00Z', month: 0 },
    ]);
    const repo = new SqliteReferralRepository(db);
    expect(repo.inviterMonthsSince('host', '2026-01-01')).toBe(1);
    expect(repo.unsettledForInviter('host')).toEqual([]);
    expect(repo.referredBy('host').sort()).toEqual(['f1', 'f2', 'f3', 'f4']);
  });
});
