import request from 'supertest';
import {
  ReferralService,
  MAX_INVITED_PER_USER,
  REFERRAL_REWARD_DAYS,
  firstStepsProgress,
  friendsForReward,
  rewardsEarned,
} from '@application/referrals/ReferralService';
import { referralSummaryResponse } from '@infrastructure/http/schemas';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
  expireTrial,
} from '../helpers/testApp';

describe('reward tiers', () => {
  it('gives the months at 1, 5, 20, 40 and 50 friends in total, and no more', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(friendsForReward)).toEqual([0, 1, 5, 20, 40, 50, null]);
    expect([0, 1, 4, 5, 19, 20, 39, 40, 49, 50, 51, 100].map(rewardsEarned)).toEqual([
      0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5,
    ]);
  });

  it('lets friends who never finish leave room for the last tier', () => {
    expect(MAX_INVITED_PER_USER).toBeGreaterThan(50);
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

describe('referral response', () => {
  const valid = {
    code: 'ABCD2345',
    qualified: 0,
    pending: 0,
    rewardDays: 30,
    rewardsEarned: 0,
    missing: 1,
    nextAt: 1,
    maxed: false,
    maxRewards: 5,
    tiers: [1, 5, 20, 40, 50],
    invited: null,
  };

  it('accepts the summary and rejects anything extra, such as who invited the user', () => {
    expect(referralSummaryResponse.parse(valid)).toEqual(valid);
    expect(() => referralSummaryResponse.parse({ ...valid, referrerId: 'u1' })).toThrow();
    expect(() =>
      referralSummaryResponse.parse({
        ...valid,
        invited: { rewarded: false, steps: [], inviter: 'Ana' },
      })
    ).toThrow();
    expect(() => referralSummaryResponse.parse({ ...valid, missing: -1 })).toThrow();
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
      nextAt: 1,
      maxed: false,
      maxRewards: 5,
      tiers: [1, 5, 20, 40, 50],
      invited: null,
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
      missing: 4, // the second month comes with 5 friends
      nextAt: 5,
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

  const instantService = () =>
    // Same rules, with every first step answered "done" so friends need no data.
    new ReferralService(
      ctx.container.repos.referrals,
      ctx.container.entitlements,
      ctx.container.repos.metrics,
      ctx.container.clock,
      () => ({ movements: 3, budgets: 1, goals: 1, automations: 1 })
    );

  it('gives the months at 1, 5, 20, 40 and 50 friends, and says when the maximum is reached', async () => {
    const service = instantService();
    const { code } = await summary();
    const friends: TestUser[] = [];
    for (let i = 0; i < 52; i++) friends.push(await createUser(ctx, undefined, code));
    const days = () => trialDays(host);
    const qualify = (count: number) => friends.slice(0, count).forEach((f) => service.reward(f.id));

    qualify(1);
    expect(await days()).toBe(14 + REFERRAL_REWARD_DAYS);
    qualify(4); // the second month needs 5
    expect(await days()).toBe(14 + REFERRAL_REWARD_DAYS);
    expect(await summary()).toMatchObject({ qualified: 4, rewardsEarned: 1, missing: 1 });
    qualify(5);
    expect(await days()).toBe(14 + 2 * REFERRAL_REWARD_DAYS);
    qualify(19);
    expect(await days()).toBe(14 + 2 * REFERRAL_REWARD_DAYS);
    qualify(20);
    expect(await days()).toBe(14 + 3 * REFERRAL_REWARD_DAYS);
    qualify(40);
    expect(await days()).toBe(14 + 4 * REFERRAL_REWARD_DAYS);
    expect(await summary()).toMatchObject({ rewardsEarned: 4, missing: 10, nextAt: 50 });
    qualify(50);
    expect(await days()).toBe(14 + 5 * REFERRAL_REWARD_DAYS);
    expect(await summary()).toMatchObject({
      qualified: 50,
      pending: 2,
      rewardsEarned: 5,
      missing: 0,
      nextAt: null,
      maxed: true,
    });
    qualify(52); // past the maximum the friends still get their month, the inviter nothing more
    expect(await days()).toBe(14 + 5 * REFERRAL_REWARD_DAYS);
    expect(ctx.container.repos.referrals.rewardsGranted(host.id)).toBe(5);
    expect(await trialDays(friends[51])).toBe(14 + REFERRAL_REWARD_DAYS);
  });

  it('keeps the months granted under the old tiers and adds only those over them', async () => {
    const service = instantService();
    const { code } = await summary();
    const friends: TestUser[] = [];
    for (let i = 0; i < 6; i++) friends.push(await createUser(ctx, undefined, code));
    friends.slice(0, 3).forEach((f) => ctx.container.repos.referrals.markRewarded(f.id, 'x'));
    // Old rule: 3 friends, 3 months already given.
    ctx.container.repos.referrals.setRewardsGranted(host.id, 3);
    service.reward(friends[3].id);
    service.reward(friends[4].id); // 5 friends: 2 months with the new table, fewer than 3
    expect(ctx.container.repos.referrals.rewardsGranted(host.id)).toBe(3);
    expect(await trialDays(host)).toBe(14);
    expect(await summary()).toMatchObject({ qualified: 5, rewardsEarned: 2, nextAt: 20 });
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

  it('tells an invited user what is missing for their month, and nothing about the inviter', async () => {
    const { code } = await summary();
    const friend = await createUser(ctx, undefined, code);
    const steps = async () => (await summary(friend)).invited;
    expect(await steps()).toEqual({
      rewarded: false,
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
});
