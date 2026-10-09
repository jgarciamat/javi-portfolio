import request from 'supertest';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
  expireTrial,
} from '../helpers/testApp';

const DAY = 24 * 60 * 60 * 1000;

describe('Shared household', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let partner: TestUser;
  let stranger: TestUser;

  beforeEach(async () => {
    ctx = createTestApp();
    owner = await createUser(ctx);
    partner = await createUser(ctx);
    stranger = await createUser(ctx);
  });

  const invite = async (user = owner) =>
    (await request(ctx.app).post('/api/household/invite').set(user.auth).expect(201)).body as {
      code: string;
      expiresAt: string;
    };
  const join = (code: string, user = partner) =>
    request(ctx.app).post('/api/household/join').set(user.auth).send({ code });
  const joined = async () => {
    await join((await invite()).code).expect(204);
  };
  const month = async (user: TestUser) =>
    (await request(ctx.app).get('/api/months/2026/3').set(user.auth).expect(200)).body;
  const status = async (user: TestUser) =>
    (await request(ctx.app).get('/api/household').set(user.auth).expect(200)).body;

  it('lets two people work on the same data while everyone else stays out', async () => {
    await addTransaction(ctx, owner, {
      description: 'Alquiler',
      amount: 700,
      category: 'Vivienda',
    });
    await addTransaction(ctx, partner, { description: 'Mi dato previo', amount: 5 });
    await joined();

    // The member sees the owner's data, not their own.
    const seenByMember = await month(partner);
    expect(seenByMember.transactions.map((t: { description: string }) => t.description)).toEqual([
      'Alquiler',
    ]);

    // What the member adds belongs to the household.
    await addTransaction(ctx, partner, { description: 'Compra', amount: 30 });
    const seenByOwner = await month(owner);
    expect(
      seenByOwner.transactions.map((t: { description: string }) => t.description).sort()
    ).toEqual(['Alquiler', 'Compra']);

    // A stranger never sees any of it.
    expect((await month(stranger)).transactions).toEqual([]);
    expect(await status(stranger)).toMatchObject({ role: 'none', members: [] });
  });

  it('brings the member back to their own data when they leave', async () => {
    await addTransaction(ctx, partner, { description: 'Mi dato previo', amount: 5 });
    await joined();
    await request(ctx.app).delete('/api/household/membership').set(partner.auth).expect(204);
    expect(
      (await month(partner)).transactions.map((t: { description: string }) => t.description)
    ).toEqual(['Mi dato previo']);
    await request(ctx.app).delete('/api/household/membership').set(partner.auth).expect(404);
  });

  it('lets the owner remove the member, and only their own members', async () => {
    await joined();
    expect(await status(owner)).toMatchObject({
      role: 'owner',
      members: [{ id: partner.id }],
      pendingInvite: null,
    });
    expect(await status(partner)).toMatchObject({
      role: 'member',
      owner: { id: owner.id },
      members: [],
    });
    await request(ctx.app)
      .delete(`/api/household/members/${partner.id}`)
      .set(stranger.auth)
      .expect(404);
    await request(ctx.app)
      .delete(`/api/household/members/${partner.id}`)
      .set(owner.auth)
      .expect(204);
    expect(await status(partner)).toMatchObject({ role: 'none' });
  });

  it('uses single-use invitations that expire and are replaced by new ones', async () => {
    const first = await invite();
    const second = await invite();
    await join(first.code).expect(404); // replaced
    expect((await status(owner)).pendingInvite).toEqual({ expiresAt: second.expiresAt });
    ctx.clock.set(new Date(Date.now() + 8 * DAY).toISOString());
    await join(second.code).expect(404); // expired
    expect((await status(owner)).pendingInvite).toBeNull();

    ctx.clock.set('2026-03-15T12:00:00Z');
    const third = await invite();
    await join(third.code).expect(204);
    await join(third.code, stranger).expect(404); // used
    await request(ctx.app).get('/api/household/invite/short').set(stranger.auth).expect(400);
  });

  it('shows who is inviting before joining and lets the owner cancel', async () => {
    const { code } = await invite();
    const res = await request(ctx.app)
      .get(`/api/household/invite/${code}`)
      .set(partner.auth)
      .expect(200);
    expect(res.body.owner).toEqual({ id: owner.id, name: 'Test User' });
    await request(ctx.app).delete('/api/household/invite').set(owner.auth).expect(204);
    await request(ctx.app).get(`/api/household/invite/${code}`).set(partner.auth).expect(404);
  });

  it('keeps invitations for Premium owners, one member and clear situations', async () => {
    expireTrial(ctx, owner);
    expect(
      (await request(ctx.app).post('/api/household/invite').set(owner.auth).expect(402)).body.code
    ).toBe('PREMIUM_REQUIRED');

    const host = await createUser(ctx);
    const { code } = await invite(host);
    await join(code, host).expect(409); // own invitation
    await join(code, partner).expect(204);
    await join(code, stranger).expect(404); // already used
    const again = await request(ctx.app).post('/api/household/invite').set(host.auth);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('HOUSEHOLD_FULL');
    // A member cannot invite others nor join a second household.
    expect(
      (await request(ctx.app).post('/api/household/invite').set(partner.auth).expect(409)).body.code
    ).toBe('HOUSEHOLD_IS_MEMBER');
    const other = await createUser(ctx);
    await join((await invite(other)).code, partner).expect(409);
    // Someone who already shares their own data cannot join another one, and an owner cannot be joined while being a member.
    const third = await createUser(ctx);
    await join((await invite(third)).code, host).expect(409);
    const fourth = await createUser(ctx);
    const toMember = await invite(fourth);
    ctx.container.repos.household.addMember(fourth.id, other.id, '2026-03-15T12:00:00.000Z');
    await join(toMember.code, stranger).expect(404);
  });

  it('gives the member the plan, limits and quota of the household', async () => {
    expireTrial(ctx, partner);
    const billing = async (user: TestUser) =>
      (await request(ctx.app).get('/api/billing').set(user.auth).expect(200)).body;
    expect(await billing(partner)).toMatchObject({ plan: 'free', household: { role: 'none' } });
    await joined();
    const shared = await billing(partner);
    expect(shared).toMatchObject({
      plan: 'premium',
      household: { role: 'member', owner: { id: owner.id } },
      subscription: { canManage: false },
    });
    // Premium features of the owner work for the member.
    await request(ctx.app).get('/api/stats/forecast').set(partner.auth).expect(200);
    await request(ctx.app).delete('/api/household/membership').set(partner.auth).expect(204);
    expect((await billing(partner)).plan).toBe('free');
    await request(ctx.app).get('/api/stats/net-worth').set(partner.auth).expect(402);
  });

  it('shows the shared currency and month start and keeps them in the owner’s hands', async () => {
    await request(ctx.app)
      .patch('/api/settings')
      .set(owner.auth)
      .send({ currency: 'USD', monthStartDay: 5 })
      .expect(200);
    await joined();
    const settings = (await request(ctx.app).get('/api/settings').set(partner.auth).expect(200))
      .body;
    expect(settings).toMatchObject({ currency: 'USD', monthStartDay: 5 });
    expect(
      (await request(ctx.app).get('/api/profile').set(partner.auth).expect(200)).body.settings
    ).toMatchObject({ currency: 'USD' });

    const refused = await request(ctx.app)
      .patch('/api/settings')
      .set(partner.auth)
      .send({ monthStartDay: 1 });
    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe('HOUSEHOLD_MEMBER_SETTINGS');
    const own = await request(ctx.app)
      .patch('/api/settings')
      .set(partner.auth)
      .send({ locale: 'en', showTour: false })
      .expect(200);
    expect(own.body).toMatchObject({ locale: 'en', showTour: false, currency: 'USD' });
    // The owner's own preferences did not change.
    expect(
      (await request(ctx.app).get('/api/settings').set(owner.auth).expect(200)).body
    ).toMatchObject({ locale: 'es', currency: 'USD' });
  });

  it('keeps the account itself personal: profile, export and sign-in stay with the person', async () => {
    await addTransaction(ctx, owner, { description: 'Del hogar', amount: 10 });
    await addTransaction(ctx, partner, { description: 'Mío', amount: 3 });
    await joined();
    const profile = (await request(ctx.app).get('/api/profile').set(partner.auth).expect(200)).body;
    expect(profile.id).toBe(partner.id);
    const exported = (await request(ctx.app).get('/api/export').set(partner.auth).expect(200)).body;
    expect(JSON.stringify(exported)).toContain('Mío');
    expect(JSON.stringify(exported)).not.toContain('Del hogar');
  });

  it('frees the member when the owner deletes the account', async () => {
    await addTransaction(ctx, partner, { description: 'Mío', amount: 3 });
    await joined();
    await request(ctx.app).delete('/api/profile/account').set(owner.auth).expect(204);
    expect(
      (await month(partner)).transactions.map((t: { description: string }) => t.description)
    ).toEqual(['Mío']);
    expect(await status(partner)).toMatchObject({ role: 'none' });
  });

  it('counts joined households anonymously', async () => {
    await joined();
    expect(ctx.container.repos.metrics.totals('2026-03-01', '2026-03-31')).toContainEqual({
      name: 'household_joined',
      count: 1,
    });
  });
});
