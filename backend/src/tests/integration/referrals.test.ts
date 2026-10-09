import request from 'supertest';
import { MAX_REFERRAL_REWARDS } from '@application/referrals/ReferralService';
import { TestContext, TestUser, createTestApp, createUser, expireTrial } from '../helpers/testApp';

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

  it('gives each user a stable code and counts what they have earned', async () => {
    const first = await summary();
    expect(first.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(first).toMatchObject({ rewarded: 0, pending: 0, rewardDays: 30, remaining: 12 });
    expect((await summary()).code).toBe(first.code);
    expect((await summary(await createUser(ctx))).code).not.toBe(first.code);
    await request(ctx.app).get('/api/referral').expect(401);
  });

  it('gives both a free month when the invited user verifies the e-mail, once', async () => {
    const { code } = await summary();
    const friend = await createUser(ctx, undefined, code.toLowerCase()); // typed by hand
    expect(await summary()).toMatchObject({ rewarded: 1, pending: 0, remaining: 11 });
    expect(await trialDays(host)).toBe(44);
    expect(await trialDays(friend)).toBe(44);
    expect(ctx.container.repos.metrics.totals('2026-03-01', '2026-03-31')).toContainEqual({
      name: 'referral_joined',
      count: 1,
    });

    ctx.container.referrals.reward(friend.id); // nothing more to give
    expect(await trialDays(host)).toBe(44);
  });

  it('keeps an invitation pending until the e-mail is verified', async () => {
    const { code } = await summary();
    const email = 'late@example.com';
    await request(ctx.app)
      .post('/api/auth/register')
      .send({ email, password: 'Sup3r-secret!', name: 'Late', referralCode: code })
      .expect(201);
    expect(await summary()).toMatchObject({ rewarded: 0, pending: 1 });
    expect(await trialDays(host)).toBe(14);
  });

  it('ignores unknown codes, one’s own code and a second invitation', async () => {
    await createUser(ctx, undefined, 'NOSUCHCD');
    expect(await summary()).toMatchObject({ rewarded: 0, pending: 0 });
    const { code } = await summary();
    ctx.container.referrals.attach(host.id, code); // own code
    expect(await summary()).toMatchObject({ pending: 0 });

    const other = await createUser(ctx);
    const friend = await createUser(ctx, undefined, code);
    ctx.container.referrals.attach(friend.id, (await summary(other)).code); // already invited
    expect(await summary(other)).toMatchObject({ pending: 0, rewarded: 0 });
    expect(await summary()).toMatchObject({ rewarded: 1 });
  });

  it('restarts Premium for a user whose trial ended and skips lifetime users', async () => {
    expireTrial(ctx, host);
    expect(await trialDays(host)).toBe(0);
    const friend = await createUser(ctx, undefined, (await summary()).code);
    expect(await trialDays(host)).toBe(30);
    expect(await trialDays(friend)).toBe(44);

    const founder = await createUser(ctx);
    const subs = ctx.container.repos.subscriptions;
    subs.save({ ...subs.get(founder.id)!, lifetime: true, trialEndsAt: null });
    const before = subs.get(founder.id);
    await createUser(ctx, undefined, (await summary(founder)).code);
    expect(subs.get(founder.id)).toEqual(before);
    expect(await summary(founder)).toMatchObject({ rewarded: 1 });
  });

  it('stops rewarding the inviter after a year of free months but still rewards the guest', async () => {
    const { code } = await summary();
    let last = host;
    for (let i = 0; i < MAX_REFERRAL_REWARDS + 1; i++)
      last = await createUser(ctx, undefined, code);
    expect(await summary()).toMatchObject({ rewarded: MAX_REFERRAL_REWARDS + 1, remaining: 0 });
    expect(await trialDays(host)).toBe(14 + 30 * MAX_REFERRAL_REWARDS);
    expect(await trialDays(last)).toBe(44);
  });
});
