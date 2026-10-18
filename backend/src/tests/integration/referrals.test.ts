import request from 'supertest';
import {
  ReferralService,
  MAX_INVITED_PER_USER,
  REFERRAL_REWARD_DAYS,
  friendsForReward,
  rewardsEarned,
} from '@application/referrals/ReferralService';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
  expireTrial,
} from '../helpers/testApp';

describe('reward tiers', () => {
  it('rewards each of the first 3 friends, then needs 6, 16, 31… in total', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(friendsForReward)).toEqual([0, 1, 2, 3, 6, 16, 31, 51]);
    expect([0, 1, 2, 3, 5, 6, 15, 16, 30, 31, 50, 51].map(rewardsEarned)).toEqual([
      0, 1, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7,
    ]);
  });
});

describe('Invite a friend', () => {
  let ctx: TestContext;
  let host: TestUser;

  beforeEach(async () => {
    ctx = createTestApp();
    host = await createUser(ctx);
  });

  const summary = async (user = host) =>
    (await request(ctx.app).get('/api/referral').set(user.auth).expect(200)).body;
  const trialDays = async (user: TestUser) =>
    (await request(ctx.app).get('/api/billing').set(user.auth).expect(200)).body.trialDaysLeft;

  /** 3 movements, a budget, a goal and an automation: what the first-steps list asks for. */
  const doFirstSteps = async (user: TestUser) => {
    for (const amount of [1, 2, 3]) await addTransaction(ctx, user, { amount });
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

  it('gives each user a stable code and shows what is missing for the next month', async () => {
    const first = await summary();
    expect(first.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(first).toMatchObject({
      qualified: 0,
      pending: 0,
      rewardDays: 30,
      rewardsEarned: 0,
      missing: 1,
    });
    expect((await summary()).code).toBe(first.code);
    expect((await summary(await createUser(ctx))).code).not.toBe(first.code);
    await request(ctx.app).get('/api/referral').expect(401);
  });

  it('counts the invitation only once the friend has done the first steps, then rewards both', async () => {
    const { code } = await summary();
    const friend = await createUser(ctx, undefined, code.toLowerCase()); // typed by hand
    expect(await summary()).toMatchObject({ qualified: 0, pending: 1, missing: 1 });
    expect(await trialDays(host)).toBe(14);
    expect(await trialDays(friend)).toBe(14);

    for (const amount of [1, 2]) await addTransaction(ctx, friend, { amount });
    expect(await trialDays(friend)).toBe(14); // not enough yet
    await doFirstSteps(friend);
    expect(await trialDays(friend)).toBe(44);
    expect(await summary()).toMatchObject({
      qualified: 1,
      pending: 0,
      rewardsEarned: 1,
      missing: 1,
    });
    expect(await trialDays(host)).toBe(44);
    expect(ctx.container.repos.metrics.totals('2026-03-01', '2026-03-31')).toContainEqual({
      name: 'referral_joined',
      count: 1,
    });
    expect(await trialDays(friend)).toBe(44); // nothing more to give
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

  it('restarts Premium for an inviter whose trial ended', async () => {
    expireTrial(ctx, host);
    expect(await trialDays(host)).toBe(0);
    const friend = await createUser(ctx, undefined, (await summary()).code);
    await doFirstSteps(friend);
    await trialDays(friend);
    expect(await trialDays(host)).toBe(30);
  });

  it('gives a month for each of the first 3 friends, then at 6 and 16 friends', async () => {
    // Same rules, with the first-steps check answered "done" so friends need no data.
    const service = new ReferralService(
      ctx.container.repos.referrals,
      ctx.container.entitlements,
      ctx.container.repos.metrics,
      ctx.container.clock,
      () => true
    );
    const { code } = await summary();
    const friends: TestUser[] = [];
    for (let i = 0; i < 16; i++) friends.push(await createUser(ctx, undefined, code));
    const days = () => trialDays(host);
    const qualify = (count: number) => friends.slice(0, count).forEach((f) => service.reward(f.id));

    for (const n of [1, 2, 3]) {
      qualify(n);
      expect(await days()).toBe(14 + n * REFERRAL_REWARD_DAYS);
    }
    qualify(5); // 5 qualified: the fourth month needs 6
    expect(await days()).toBe(14 + 3 * REFERRAL_REWARD_DAYS);
    qualify(6);
    expect(await days()).toBe(14 + 4 * REFERRAL_REWARD_DAYS);
    qualify(15); // the fifth needs 16
    expect(await days()).toBe(14 + 4 * REFERRAL_REWARD_DAYS);
    qualify(16);
    expect(await days()).toBe(14 + 5 * REFERRAL_REWARD_DAYS);
    expect(ctx.container.repos.referrals.rewardsGranted(host.id)).toBe(5);
    expect(await summary()).toMatchObject({ qualified: 16, rewardsEarned: 5, missing: 15 });
  });

  it('skips lifetime users', async () => {
    const subs = ctx.container.repos.subscriptions;
    subs.save({ ...subs.get(host.id)!, lifetime: true, trialEndsAt: null });
    const before = subs.get(host.id);
    const friend = await createUser(ctx, undefined, (await summary()).code);
    await doFirstSteps(friend);
    await trialDays(friend);
    expect(subs.get(host.id)).toEqual(before);
    expect(await summary()).toMatchObject({ qualified: 1, rewardsEarned: 1 });
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

  it('stops attaching invitations to a user over the cap', async () => {
    const { code } = await summary();
    for (let i = 0; i < MAX_INVITED_PER_USER + 1; i++) await googleSignup(`u${i}`, code);
    expect(await summary()).toMatchObject({ pending: MAX_INVITED_PER_USER });
  });
});
