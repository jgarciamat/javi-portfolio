import type { Page, Route } from '@playwright/test';
import { expect, openSection, signIn, test } from './fixtures';

/**
 * Payments are tested with the network mocked: the dev API has no Stripe keys, so the answers of
 * the billing endpoints are shaped here as the API gives them when payments are on, and the
 * payment page (Stripe's, in production) is a stub page of the test. No card is ever involved.
 */
const CHECKOUT_PAGE = '**/__stripe-test/**';
const WEB = `http://localhost:${process.env.E2E_WEB_PORT ?? 5186}`;

/** The real answer of the API with what Stripe would change in it. */
async function withPayments(
  page: Page,
  change: (overview: Record<string, any>) => void = () => {}
) {
  const patch = async (route: Route) => {
    const response = await route.fetch();
    const body = await response.json();
    const catalog = body.catalog ?? body;
    catalog.paymentsEnabled = true;
    change(body);
    await route.fulfill({ response, json: body });
  };
  await page.route('**/api/billing', patch);
  await page.route('**/api/billing/plans', patch);
  // The payment page: a stub, so that the redirect can be followed and checked.
  await page.route(CHECKOUT_PAGE, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>Stripe test checkout</h1>' })
  );
}

test('Premium checkout asks for both consents, sends them with the plan and leaves for the payment page', async ({
  page,
}) => {
  let sent: unknown = null;
  await withPayments(page);
  await page.route('**/api/billing/checkout', async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ json: { url: `${WEB}/__stripe-test/session/cs_test_123` } });
  });
  await signIn(page);
  await openSection(page, 'Tu plan');

  const monthly = page.getByRole('button', { name: /^Mensual/ });
  await expect(monthly).toBeDisabled();
  await expect(page.getByText('Marca las dos casillas para continuar.')).toBeVisible();
  await page.getByRole('checkbox', { name: /He leído y acepto las condiciones/ }).check();
  await expect(monthly).toBeDisabled();
  await page.getByRole('checkbox', { name: /pierdo el derecho de desistimiento/ }).check();
  await expect(monthly).toBeEnabled();

  await monthly.click();
  await expect(page).toHaveURL(/__stripe-test\/session\/cs_test_123/);
  await expect(page.getByRole('heading', { name: 'Stripe test checkout' })).toBeVisible();
  expect(sent).toEqual({ kind: 'monthly', acceptTerms: true, waiveWithdrawal: true });
});

test('a failed checkout keeps the person on the page, with a message and the way to try again', async ({
  page,
  pageErrors,
}) => {
  await withPayments(page);
  await page.route('**/api/billing/checkout', (route) =>
    route.fulfill({
      status: 502,
      json: { error: 'Proveedor de pagos no disponible', code: 'PAYMENT_ERROR' },
    })
  );
  await signIn(page);
  await openSection(page, 'Tu plan');
  await page.getByRole('checkbox', { name: /He leído y acepto las condiciones/ }).check();
  await page.getByRole('checkbox', { name: /pierdo el derecho de desistimiento/ }).check();
  await page.getByRole('button', { name: /Anual/ }).click();

  await expect(page.locator('.form-error')).toBeVisible();
  await expect(page).toHaveURL(/localhost/);
  await expect(page.getByRole('button', { name: /Anual/ })).toBeEnabled();
  // The browser logs the failed request itself: that, and nothing else, is expected here.
  expect(pageErrors.splice(0)).toEqual([expect.stringContaining('502')]);
});

test('a Stripe subscriber manages the plan in the customer portal', async ({ page }) => {
  await withPayments(page, (overview) => {
    if (!overview.subscription) return;
    overview.plan = 'premium';
    overview.trialDaysLeft = 0;
    overview.subscription = {
      status: 'active',
      source: 'stripe',
      trialEndsAt: null,
      currentPeriodEnd: '2027-01-15T00:00:00.000Z',
      cancelAtPeriodEnd: false,
      lifetime: false,
      canManage: true,
    };
  });
  let portalCalls = 0;
  await page.route('**/api/billing/portal', async (route) => {
    portalCalls++;
    await route.fulfill({ json: { url: `${WEB}/__stripe-test/portal/bps_test_1` } });
  });
  await signIn(page);
  await openSection(page, 'Tu plan');

  await page.getByRole('button', { name: 'Gestionar suscripción' }).click();
  await expect(page).toHaveURL(/__stripe-test\/portal\/bps_test_1/);
  expect(portalCalls).toBe(1);
});
