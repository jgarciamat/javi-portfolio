import fs from 'fs';
import os from 'os';
import path from 'path';
import { ConfigError, loadConfig } from '@config/env';
import Stripe from 'stripe';
import { CloudflareAi } from '@infrastructure/ai/CloudflareAi';
import { GeminiAdvisor } from '@infrastructure/ai/GeminiAdvisor';
import {
  buildCategorizationPrompt,
  buildPrompt,
  parseAdvice,
  parseCategorization,
} from '@infrastructure/ai/prompts';
import { DisabledPaymentGateway, StripeGateway } from '@infrastructure/billing/StripeGateway';
import { JsonOfferCatalog } from '@infrastructure/offers/JsonOfferCatalog';
import { JwtTokenService } from '@infrastructure/auth/JwtTokenService';
import { GoogleOAuthIdentityVerifier } from '@infrastructure/auth/GoogleIdentityVerifier';
import { BackupService } from '@infrastructure/backup/BackupService';
import { escapeHtml, purchaseEmail, verificationEmail } from '@infrastructure/mail/templates';
import { openDatabase } from '@infrastructure/sqlite/database';
import { AdviceContext } from '@domain/services/rule-based-advisor';

describe('config', () => {
  it('uses development defaults outside production', () => {
    const config = loadConfig({ NODE_ENV: 'development' });
    expect(config.jwt.accessSecret).toMatch(/dev-only/);
    expect(config.corsOrigins).toEqual(
      expect.arrayContaining([
        'http://localhost:5173',
        'https://localhost',
        'capacitor://localhost',
      ])
    );
  });

  it('fails fast in production without a secret or with a published one', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(ConfigError);
    expect(() =>
      loadConfig({ NODE_ENV: 'production', JWT_SECRET: 'money-manager-secret-change-in-prod' })
    ).toThrow(/publicly known/);
    const config = loadConfig({
      NODE_ENV: 'production',
      JWT_SECRET: 'x'.repeat(48),
      APP_URL: 'https://www.winjgm.com/',
      DATABASE_URL: '/data/db.sqlite',
    });
    expect(config.appUrl).toBe('https://www.winjgm.com');
    expect(config.databasePath).toBe('/data/db.sqlite');
    expect(config.corsOrigins).not.toContain('http://localhost:5173');
    expect(config.demoSeed.enabled).toBe(false);
  });

  it('rejects malformed values', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(ConfigError);
  });

  it('uses Cloudflare when configured and Gemini only when chosen explicitly', () => {
    expect(loadConfig({ GEMINI_API_KEY: 'k' }).ai.provider).toBe('none');
    expect(loadConfig({ GEMINI_API_KEY: 'k', AI_PROVIDER: 'gemini' }).ai.provider).toBe('gemini');
    const cf = loadConfig({ CLOUDFLARE_ACCOUNT_ID: 'acc', CLOUDFLARE_AI_TOKEN: 'tok' }).ai;
    expect(cf).toMatchObject({ provider: 'cloudflare', dailyNeuronBudget: 9000 });
    expect(cf.cloudflare).toMatchObject({ jsonMode: false, neuronsPerMInput: 4119 });
  });

  it('enables Stripe only with the keys and both recurring prices', () => {
    expect(loadConfig({ STRIPE_SECRET_KEY: 'sk' }).billing.stripe).toBeNull();
    const config = loadConfig({
      STRIPE_SECRET_KEY: 'sk',
      STRIPE_WEBHOOK_SECRET: 'whsec',
      STRIPE_PRICE_MONTHLY: 'price_m',
      STRIPE_PRICE_YEARLY: 'price_y',
    });
    expect(config.billing.stripe?.prices).toEqual({
      monthly: 'price_m',
      yearly: 'price_y',
      lifetime: null,
    });
    expect(config.billing.displayPrices).toEqual({ monthly: 2.99, yearly: 24.99, lifetime: 49 });
  });
});

describe('e-mail templates', () => {
  it('escapes user-controlled names and strips links from them', () => {
    expect(escapeHtml('<b>"x"</b>&\'')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;&amp;&#39;');
    const email = verificationEmail(
      'es',
      '<a href="https://evil.example">Pulsa aquí</a> https://evil.example',
      'https://app/verify-email?token=abc'
    );
    expect(email.html).not.toContain('<a href="https://evil');
    expect(email.html).not.toContain('evil.example');
    expect(email.html).toContain('&lt;a href=&quot;');
    expect(email.html).toContain('href="https://app/verify-email?token=abc"');
  });

  it('is localised', () => {
    expect(verificationEmail('en', 'Ann', 'u').subject).toMatch(/Verify/);
    expect(verificationEmail('es', 'Ana', 'u').subject).toMatch(/Verifica/);
  });
});

describe('purchase e-mail', () => {
  it('confirms the purchase, the immediate start and how to cancel, in the user language', () => {
    const at = new Date('2026-03-20T10:00:00Z');
    const es = purchaseEmail('es', '<b>Ana</b>', 'https://app.test/terms', at);
    expect(es.subject).toMatch(/Confirmación/);
    expect(es.text).toContain('20 de marzo de 2026');
    expect(es.text).toContain('pierdes el derecho de desistimiento');
    expect(es.text).toContain('Condiciones de contratación: https://app.test/terms');
    expect(es.html).toContain('&lt;b&gt;Ana&lt;/b&gt;');
    expect(es.html).toContain('href="https://app.test/terms"');
    const en = purchaseEmail('en', 'Ana', 'https://app.test/terms', at);
    expect(en.text).toContain('20 March 2026');
    expect(en.text).toContain('lose the 14-day right of withdrawal');
  });
});

describe('GeminiAdvisor', () => {
  const ctx: AdviceContext = {
    year: 2026,
    month: 3,
    locale: 'en',
    currency: 'EUR',
    totalIncome: 1000,
    totalExpenses: 500,
    totalSaving: 100,
    balance: 400,
    savingsRate: 50,
    budgetAmount: 600,
    expensesByCategory: { Ocio: 500 },
    savingByCategory: {},
    transactionCount: 3,
  };

  afterEach(() => jest.restoreAllMocks());

  it('builds a prompt with aggregated figures only', () => {
    const prompt = buildPrompt(ctx);
    expect(prompt).toContain('Income: 1000.00 EUR');
    expect(prompt).toContain('100.00 EUR remaining');
    expect(prompt).toContain('answer in English');
  });

  it('parses fenced JSON and validates its shape', () => {
    expect(parseAdvice('```json\n{"summary":"ok","tips":["a"]}\n```')).toEqual({
      summary: 'ok',
      tips: ['a'],
      positives: [],
      warnings: [],
    });
    expect(() => parseAdvice('{"tips":[]}')).toThrow();
    expect(() => parseAdvice('not json')).toThrow();
  });

  it('sends the key in a header, never in the URL', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '{"summary":"hi","tips":[],"positives":[],"warnings":[]}' }],
              },
            },
          ],
        }),
        { status: 200 }
      )
    );
    const result = await new GeminiAdvisor('secret-key', 'gemini-2.5-flash-lite').getAdvice(ctx);
    expect(result.advice.summary).toBe('hi');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain('secret-key');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('secret-key');
  });

  it('throws on provider errors so the service can fall back', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('quota', { status: 429 }));
    await expect(new GeminiAdvisor('k', 'm').getAdvice(ctx)).rejects.toThrow('429');
  });
});

describe('AI prompts', () => {
  it('tolerates prose around the JSON and trims long lists', () => {
    const advice = parseAdvice(
      'Here you go: {"summary":" ok ","tips":["1","2","3","4","5","6"],"warnings":[3, "w"]} Bye'
    );
    expect(advice).toEqual({
      summary: 'ok',
      tips: ['1', '2', '3', '4', '5'],
      positives: [],
      warnings: ['w'],
    });
    expect(parseAdvice({ summary: 'obj', tips: [], positives: [], warnings: [] }).summary).toBe(
      'obj'
    );
  });

  it('redacts long numbers from descriptions and maps answers to known categories', () => {
    const prompt = buildCategorizationPrompt(['RECIBO ES1234567890 LUZ'], ['Hogar', 'Ocio']);
    expect(prompt).not.toContain('1234567890');
    expect(prompt).toContain('1. RECIBO ES# LUZ');
    expect(
      parseCategorization('{"categories":["hogar","Inventada",null]}', 4, ['Hogar', 'Ocio'])
    ).toEqual(['Hogar', null, null, null]);
  });
});

describe('CloudflareAi', () => {
  const options = {
    accountId: 'acc',
    apiToken: 'tok',
    model: '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
    jsonMode: true,
    neuronsPerMInput: 4119,
    neuronsPerMOutput: 34868,
  };
  const ctx: AdviceContext = {
    year: 2026,
    month: 3,
    locale: 'es',
    currency: 'EUR',
    totalIncome: 1000,
    totalExpenses: 500,
    totalSaving: 100,
    balance: 400,
    savingsRate: 50,
    budgetAmount: 0,
    expensesByCategory: { Ocio: 500 },
    savingByCategory: {},
    transactionCount: 3,
  };

  afterEach(() => jest.restoreAllMocks());

  it('calls Workers AI with the token and reports the neurons used', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          result: {
            response: { summary: 'Bien', tips: [], positives: [], warnings: [] },
            usage: { prompt_tokens: 1000, completion_tokens: 100 },
          },
        }),
        { status: 200 }
      )
    );
    const { advice, usage } = await new CloudflareAi(options).getAdvice(ctx);
    expect(advice.summary).toBe('Bien');
    expect(usage.neurons).toBeCloseTo(4.119 + 3.4868, 4);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://api.cloudflare.com/client/v4/accounts/acc/ai/run/@cf/meta/llama-3.1-8b-instruct-fp8-fast'
    );
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    const body = JSON.parse(init.body as string);
    expect(body.response_format.type).toBe('json_schema');
    expect(body.messages[0].content).toMatch(/Never recommend specific financial products/);
  });

  it('estimates usage when the API does not report it and fails loudly on errors', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, result: { response: '{"categories":["Ocio", null]}' } }),
          { status: 200 }
        )
      );
    const ai = new CloudflareAi({ ...options, jsonMode: false });
    const result = await ai.suggestCategories(['CINE', 'ZZZ'], ['Ocio', 'Hogar']);
    expect(result.suggestions).toEqual(['Ocio', null]);
    expect(result.usage.neurons).toBeGreaterThan(0);

    jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response('limit', { status: 429 }));
    await expect(ai.getAdvice(ctx)).rejects.toThrow('429');
  });
});

describe('StripeGateway', () => {
  const secret = 'whsec_test_secret';
  const config = {
    secretKey: 'sk_test_x',
    webhookSecret: secret,
    prices: { monthly: 'price_m', yearly: 'price_y', lifetime: 'price_l' },
  };

  const fakeClient = () => {
    const stripe = new Stripe('sk_test_x');
    const create = jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.test/s' });
    const client = {
      webhooks: stripe.webhooks,
      customers: { create: jest.fn().mockResolvedValue({ id: 'cus_new' }) },
      checkout: { sessions: { create } },
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'sub_1',
          status: 'active',
          customer: 'cus_1',
          metadata: { userId: 'u1' },
          cancel_at_period_end: false,
          cancel_at: null,
          items: { data: [{ current_period_end: 1_780_000_000 }] },
        }),
      },
    };
    return { stripe, client: client as unknown as Stripe, create };
  };

  const signed = (stripe: Stripe, event: object) => {
    const payload = JSON.stringify(event);
    return {
      body: Buffer.from(payload),
      signature: stripe.webhooks.generateTestHeaderString({ payload, secret }),
    };
  };

  it('creates the customer and keeps the remaining trial in the checkout', async () => {
    const { client, create } = fakeClient();
    const gateway = new StripeGateway(config, client);
    const trialEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const result = await gateway.createCheckout({
      userId: 'u1',
      email: 'a@b.c',
      kind: 'monthly',
      customerId: null,
      trialEnd,
      successUrl: 'https://app/?billing=success',
      cancelUrl: 'https://app/?billing=cancel',
    });
    expect(result).toEqual({ url: 'https://checkout.stripe.test/s', customerId: 'cus_new' });
    expect(create.mock.calls[0][0]).toMatchObject({
      mode: 'subscription',
      customer: 'cus_new',
      client_reference_id: 'u1',
      line_items: [{ price: 'price_m', quantity: 1 }],
      subscription_data: { trial_end: Math.floor(trialEnd.getTime() / 1000) },
    });

    // Less than 48 h of trial left: no trial in Stripe (it would be rejected).
    await gateway.createCheckout({
      userId: 'u1',
      email: 'a@b.c',
      kind: 'lifetime',
      customerId: 'cus_1',
      trialEnd: new Date(Date.now() + 60 * 60 * 1000),
      successUrl: 's',
      cancelUrl: 'c',
    });
    expect(create.mock.calls[1][0]).toMatchObject({
      mode: 'payment',
      line_items: [{ price: 'price_l', quantity: 1 }],
      metadata: { userId: 'u1', kind: 'lifetime' },
    });
  });

  it('verifies signatures and normalises the events it cares about', async () => {
    const { stripe, client } = fakeClient();
    const gateway = new StripeGateway(config, client);

    const lifetime = signed(stripe, {
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'u1',
          customer: 'cus_1',
          metadata: { userId: 'u1', kind: 'lifetime' },
          payment_status: 'paid',
        },
      },
    });
    await expect(gateway.parseWebhook(lifetime.body, lifetime.signature)).resolves.toEqual({
      id: 'evt_1',
      type: 'lifetime_purchased',
      userId: 'u1',
      customerId: 'cus_1',
    });

    const updated = signed(stripe, {
      id: 'evt_2',
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1', status: 'past_due' } },
    });
    // The live state (active) wins over the stale payload (past_due).
    await expect(gateway.parseWebhook(updated.body, updated.signature)).resolves.toEqual({
      id: 'evt_2',
      type: 'subscription_changed',
      userId: 'u1',
      customerId: 'cus_1',
      subscriptionId: 'sub_1',
      status: 'active',
      currentPeriodEnd: new Date(1_780_000_000 * 1000),
      cancelAtPeriodEnd: false,
    });

    const other = signed(stripe, { id: 'evt_3', type: 'invoice.paid', data: { object: {} } });
    await expect(gateway.parseWebhook(other.body, other.signature)).resolves.toEqual({
      id: 'evt_3',
      type: 'ignored',
    });
    await expect(gateway.parseWebhook(other.body, 't=1,v1=bad')).rejects.toMatchObject({
      code: 'INVALID_SIGNATURE',
    });
  });

  it('checks out the yearly plan without a trial and fails without a checkout URL', async () => {
    const { client, create } = fakeClient();
    const gateway = new StripeGateway(config, client);
    const request = {
      userId: 'u1',
      email: 'a@b.c',
      kind: 'yearly' as const,
      customerId: 'cus_1',
      trialEnd: null,
      successUrl: 's',
      cancelUrl: 'c',
    };
    await gateway.createCheckout(request);
    expect(create.mock.calls[0][0]).toMatchObject({
      line_items: [{ price: 'price_y', quantity: 1 }],
      subscription_data: { trial_end: undefined },
    });
    create.mockResolvedValueOnce({ url: null });
    await expect(gateway.createCheckout(request)).rejects.toThrow('checkout URL');
  });

  it('refuses the lifetime plan when it has no price', async () => {
    const { client } = fakeClient();
    const gateway = new StripeGateway(
      { ...config, prices: { ...config.prices, lifetime: null } },
      client
    );
    await expect(
      gateway.createCheckout({
        userId: 'u1',
        email: 'a@b.c',
        kind: 'lifetime',
        customerId: 'cus_1',
        trialEnd: null,
        successUrl: 's',
        cancelUrl: 'c',
      })
    ).rejects.toMatchObject({ code: 'PLAN_UNAVAILABLE' });
  });

  it('opens the customer portal and cancels now or at the end of the period', async () => {
    const portal = jest.fn().mockResolvedValue({ url: 'https://billing.stripe.test/p' });
    const update = jest.fn().mockResolvedValue({});
    const cancel = jest.fn().mockResolvedValue({});
    const client = {
      billingPortal: { sessions: { create: portal } },
      subscriptions: { update, cancel },
    } as unknown as Stripe;
    const gateway = new StripeGateway(config, client);
    await expect(gateway.createPortal('cus_1', 'https://app')).resolves.toEqual({
      url: 'https://billing.stripe.test/p',
    });
    expect(portal).toHaveBeenCalledWith({ customer: 'cus_1', return_url: 'https://app' });
    await gateway.cancelSubscription('sub_1', true);
    expect(update).toHaveBeenCalledWith('sub_1', { cancel_at_period_end: true });
    await gateway.cancelSubscription('sub_1', false);
    expect(cancel).toHaveBeenCalledWith('sub_1');
  });

  it('normalises checkouts, deleted subscriptions and missing data', async () => {
    const { stripe, client } = fakeClient();
    const gateway = new StripeGateway(config, client);
    const parse = (event: object, signature?: string) => {
      const { body, signature: valid } = signed(stripe, event);
      return gateway.parseWebhook(body, signature ?? valid);
    };

    await expect(
      parse({
        id: 'evt_c',
        type: 'checkout.session.completed',
        data: {
          object: {
            client_reference_id: null,
            customer: { id: 'cus_9' },
            metadata: { userId: 'u9' },
          },
        },
      })
    ).resolves.toEqual({
      id: 'evt_c',
      type: 'checkout_completed',
      userId: 'u9',
      customerId: 'cus_9',
    });
    // One event per purchase: a subscription's late bank debit and an unpaid
    // founder session say nothing new.
    await expect(
      parse({
        id: 'evt_c2',
        type: 'checkout.session.async_payment_succeeded',
        data: { object: { customer: 'cus_9', metadata: { userId: 'u9' } } },
      })
    ).resolves.toEqual({ id: 'evt_c2', type: 'ignored' });
    await expect(
      parse({
        id: 'evt_c3',
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_9',
            metadata: { userId: 'u9', kind: 'lifetime' },
            payment_status: 'unpaid',
          },
        },
      })
    ).resolves.toEqual({ id: 'evt_c3', type: 'ignored' });
    await expect(
      parse({
        id: 'evt_d',
        type: 'checkout.session.completed',
        data: { object: { customer: null } },
      })
    ).resolves.toEqual({
      id: 'evt_d',
      type: 'checkout_completed',
      userId: null,
      customerId: null,
    });

    // Deleted: the payload is the final state (no extra request). Old API field for the period.
    await expect(
      parse({
        id: 'evt_e',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_2',
            status: 'incomplete_expired',
            customer: { id: 'cus_2' },
            cancel_at_period_end: false,
            cancel_at: 1_780_000_000,
            current_period_end: 1_770_000_000,
            items: { data: [] },
          },
        },
      })
    ).resolves.toEqual({
      id: 'evt_e',
      type: 'subscription_changed',
      userId: null,
      customerId: 'cus_2',
      subscriptionId: 'sub_2',
      status: 'canceled',
      currentPeriodEnd: new Date(1_770_000_000 * 1000),
      cancelAtPeriodEnd: true,
    });
    await expect(
      parse({
        id: 'evt_f',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_3',
            status: 'trialing',
            customer: 'cus_3',
            metadata: {},
            cancel_at_period_end: true,
            items: { data: [] },
          },
        },
      })
    ).resolves.toMatchObject({
      status: 'trialing',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: true,
    });

    const { body } = signed(stripe, { id: 'evt_g', type: 'invoice.paid', data: { object: {} } });
    await expect(gateway.parseWebhook(body, undefined)).rejects.toMatchObject({
      code: 'INVALID_SIGNATURE',
    });
  });

  it('reports full refunds of the founder payment and ignores the rest', async () => {
    const stripe = new Stripe('sk_test_x');
    const retrieve = jest
      .fn()
      .mockResolvedValueOnce({ metadata: { kind: 'lifetime', userId: 'u1' } })
      .mockResolvedValueOnce({ metadata: {} })
      .mockResolvedValueOnce({ metadata: { kind: 'lifetime' } });
    const client = { webhooks: stripe.webhooks, paymentIntents: { retrieve } } as unknown as Stripe;
    const gateway = new StripeGateway(config, client);
    const refund = (id: string, charge: object) => {
      const { body, signature } = signed(stripe, {
        id,
        type: 'charge.refunded',
        data: { object: { customer: 'cus_1', refunded: true, payment_intent: 'pi_1', ...charge } },
      });
      return gateway.parseWebhook(body, signature);
    };
    await expect(refund('evt_r1', {})).resolves.toEqual({
      id: 'evt_r1',
      type: 'lifetime_refunded',
      userId: 'u1',
      customerId: 'cus_1',
    });
    await expect(refund('evt_r2', {})).resolves.toEqual({ id: 'evt_r2', type: 'ignored' });
    await expect(refund('evt_r3', { payment_intent: { id: 'pi_2' } })).resolves.toMatchObject({
      type: 'lifetime_refunded',
      userId: null,
    });
    await expect(refund('evt_r4', { refunded: false })).resolves.toEqual({
      id: 'evt_r4',
      type: 'ignored',
    });
    await expect(refund('evt_r5', { payment_intent: null })).resolves.toEqual({
      id: 'evt_r5',
      type: 'ignored',
    });
    expect(retrieve).toHaveBeenCalledTimes(3);
  });

  it('builds its own Stripe client from the secret key', () => {
    expect(new StripeGateway(config).enabled).toBe(true);
  });
});

describe('DisabledPaymentGateway', () => {
  it('refuses payments but lets accounts be deleted', async () => {
    const gateway = new DisabledPaymentGateway();
    expect(gateway.enabled).toBe(false);
    await expect(gateway.createCheckout()).rejects.toMatchObject({ code: 'PAYMENTS_DISABLED' });
    await expect(gateway.createPortal()).rejects.toMatchObject({ code: 'PAYMENTS_DISABLED' });
    await expect(gateway.parseWebhook()).rejects.toMatchObject({ code: 'PAYMENTS_DISABLED' });
    await expect(gateway.cancelSubscription()).resolves.toBeUndefined();
  });
});

describe('JsonOfferCatalog', () => {
  it('loads valid offers and ignores an invalid file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-offers-'));
    const valid = path.join(dir, 'offers.json');
    const offer = {
      id: 'bank-a',
      category: 'banking',
      name: 'Banco A',
      title: { es: 'Cuenta', en: 'Account' },
      description: { es: 'Sin comisiones', en: 'No fees' },
      url: 'https://partner.example/a',
    };
    fs.writeFileSync(valid, JSON.stringify([offer, offer]));
    const warn = jest.fn();
    const offers = new JsonOfferCatalog(valid, { warn }).list();
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({ id: 'bank-a', active: true, highlight: null, icon: '🏷️' });
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/duplicated/));

    const insecure = path.join(dir, 'bad.json');
    fs.writeFileSync(insecure, JSON.stringify([{ ...offer, url: 'http://partner.example' }]));
    expect(new JsonOfferCatalog(insecure, { warn }).list()).toEqual([]);
    expect(new JsonOfferCatalog(path.join(dir, 'missing.json'), { warn }).list()).toEqual([]);
    expect(new JsonOfferCatalog(null, { warn }).list()).toEqual([]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('JwtTokenService', () => {
  const service = new JwtTokenService('s'.repeat(40), '15m', 1000);

  it('round-trips access tokens with the session version', () => {
    const token = service.issueAccessToken({ userId: 'u1', sessionVersion: 3 });
    expect(service.verifyAccessToken(token)).toEqual({ userId: 'u1', sessionVersion: 3 });
  });

  it('rejects tokens signed with another secret or without session version', () => {
    const other = new JwtTokenService('o'.repeat(40), '15m', 1000);
    expect(() =>
      service.verifyAccessToken(other.issueAccessToken({ userId: 'u', sessionVersion: 0 }))
    ).toThrow(expect.objectContaining({ code: 'INVALID_TOKEN' }));
  });

  it('issues random opaque tokens and stores only their hash', () => {
    const a = service.issueRefreshToken();
    const b = service.issueRefreshToken();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toBe(service.hash(a.token));
    expect(a.hash).not.toContain(a.token);
  });
});

describe('GoogleOAuthIdentityVerifier tokeninfo details', () => {
  const verifierWith = (info: Record<string, unknown>) => {
    const verifier = new GoogleOAuthIdentityVerifier('my-client');
    (verifier as unknown as { client: { getTokenInfo: jest.Mock } }).client.getTokenInfo = jest
      .fn()
      .mockResolvedValue({ aud: 'my-client', sub: '42', email: 'a@gmail.com', ...info });
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    return verifier;
  };
  afterEach(() => jest.restoreAllMocks());

  it('reads the verified flag Google sends as the text "true"', async () => {
    await expect(verifierWith({ email_verified: 'true' }).verify('ya29.t')).resolves.toMatchObject({
      emailVerified: true,
    });
    await expect(verifierWith({ email_verified: 'false' }).verify('ya29.t')).resolves.toMatchObject(
      {
        emailVerified: false,
      }
    );
  });

  it('logs why a token was rejected, without the token', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const verifier = new GoogleOAuthIdentityVerifier('my-client');
    (verifier as unknown as { client: { getTokenInfo: jest.Mock } }).client.getTokenInfo = jest
      .fn()
      .mockRejectedValue(new Error('Request failed with status code 400'));
    await expect(verifier.verify('ya29.secret-token')).rejects.toMatchObject({
      code: 'GOOGLE_AUTH_FAILED',
    });
    expect(warn).toHaveBeenCalledWith(
      '[google] token rejected: Request failed with status code 400'
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-token');
    const other = new GoogleOAuthIdentityVerifier('my-client');
    (other as unknown as { client: { getTokenInfo: jest.Mock } }).client.getTokenInfo = jest
      .fn()
      .mockRejectedValue('boom');
    await expect(other.verify('ya29.t')).rejects.toMatchObject({ code: 'GOOGLE_AUTH_FAILED' });
    expect(warn).toHaveBeenLastCalledWith('[google] token rejected: boom');
  });
});

describe('GoogleOAuthIdentityVerifier', () => {
  it('is disabled without a client id', async () => {
    await expect(new GoogleOAuthIdentityVerifier(null).verify('x')).rejects.toMatchObject({
      code: 'GOOGLE_DISABLED',
    });
  });

  it('rejects access tokens issued to another app (audience check)', async () => {
    const verifier = new GoogleOAuthIdentityVerifier('my-client.apps.googleusercontent.com');
    const client = (verifier as unknown as { client: { getTokenInfo: jest.Mock } }).client;
    client.getTokenInfo = jest.fn().mockResolvedValue({
      aud: 'someone-else.apps.googleusercontent.com',
      sub: '1',
      email: 'a@gmail.com',
      email_verified: true,
    });
    await expect(verifier.verify('ya29.token')).rejects.toMatchObject({
      code: 'GOOGLE_AUTH_FAILED',
    });
  });

  it('accepts access tokens issued to this app', async () => {
    const verifier = new GoogleOAuthIdentityVerifier('my-client');
    const client = (verifier as unknown as { client: { getTokenInfo: jest.Mock } }).client;
    client.getTokenInfo = jest.fn().mockResolvedValue({
      aud: 'my-client',
      sub: '42',
      email: 'a@gmail.com',
      email_verified: true,
    });
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ name: 'Ana' }), { status: 200 }));
    await expect(verifier.verify('ya29.token')).resolves.toEqual({
      googleId: '42',
      email: 'a@gmail.com',
      emailVerified: true,
      name: 'Ana',
    });
    jest.restoreAllMocks();
  });
});

describe('BackupService', () => {
  it('writes a consistent copy and prunes old ones', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-backup-'));
    const db = openDatabase(path.join(dir, 'live.db'));
    db.exec("CREATE TABLE t (v TEXT); INSERT INTO t VALUES ('hello')");
    const service = new BackupService(db, path.join(dir, 'backups'), 7, {
      info: () => undefined,
      error: () => undefined,
    });
    const file = await service.runOnce(new Date('2026-03-15T00:00:00Z'));
    const copy = openDatabase(file);
    expect(copy.prepare('SELECT v FROM t').get()).toEqual({ v: 'hello' });
    copy.close();

    const old = path.join(dir, 'backups', 'money-manager-old.db');
    fs.writeFileSync(old, '');
    fs.utimesSync(old, new Date('2020-01-01'), new Date('2020-01-01'));
    expect(service.prune(new Date())).toEqual([old]);
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
