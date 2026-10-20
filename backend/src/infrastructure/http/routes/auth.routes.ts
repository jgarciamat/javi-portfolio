import { Router } from 'express';
import { Container } from '../../container';
import {
  RateLimiterFactory,
  asyncHandler,
  authed,
  emailAndIpKey,
  emailKey,
  requireAuth,
} from '../middleware';
import {
  creatorAttribution,
  emailBody,
  googleBody,
  loginBody,
  logoutBody,
  refreshBody,
  registerBody,
  resetBody,
  twoFactorCodeBody,
  twoFactorProofBody,
  twoFactorSetupBody,
  twoFactorVerifyBody,
  verifyQuery,
} from '../schemas';
import { recordSignup } from './funnel.routes';

/** Attributes a brand-new account to a creator, only with the user's explicit agreement. */
function attachCreator(c: Container, userId: string, creator: unknown): void {
  const parsed = creatorAttribution.safeParse(creator);
  if (parsed.success) c.creators.attach(userId, parsed.data.code, parsed.data.consent);
}

const GENERIC_EMAIL_SENT =
  'Si el email corresponde a una cuenta, recibirás un mensaje en unos minutos.';

export function authRoutes(c: Container, limiter: RateLimiterFactory): Router {
  const router = Router();
  const fifteenMinutes = 15 * 60 * 1000;
  const hour = 60 * 60 * 1000;
  const loginLimiter = limiter({
    windowMs: fifteenMinutes,
    limit: 10,
    keyGenerator: emailAndIpKey,
  });
  // Password spraying: only failed attempts count, so people signing in are never slowed.
  // One network trying many accounts...
  const failedLoginsByIp = limiter({
    windowMs: fifteenMinutes,
    limit: 30,
    skipSuccessfulRequests: true,
  });
  // ...and one account tried from many networks: locked for a while, with the generic message.
  const failedLoginsByAccount = limiter({
    windowMs: fifteenMinutes,
    limit: 10,
    skipSuccessfulRequests: true,
    keyGenerator: emailKey,
    skip: (req) => !emailKey(req),
  });
  const registerLimiter = limiter({ windowMs: hour, limit: 10 });
  const emailLimiter = limiter({ windowMs: hour, limit: 5, keyGenerator: emailAndIpKey });
  const tokenLimiter = limiter({ windowMs: fifteenMinutes, limit: 30 });
  const refreshLimiter = limiter({ windowMs: fifteenMinutes, limit: 120 });
  // The code is guessed, not the password: few tries per network (the account also locks).
  const twoFactorLimiter = limiter({ windowMs: fifteenMinutes, limit: 20 });
  const twoFactorSettingsLimiter = limiter({ windowMs: fifteenMinutes, limit: 20 });

  router.post(
    '/register',
    registerLimiter,
    asyncHandler(async (req, res) => {
      const { referralCode, origin, creator, ...input } = registerBody.parse(req.body);
      const { message, createdUserId } = await c.auth.register(input);
      // An e-mail that already had an account gets the same answer and nothing else.
      if (createdUserId) {
        if (referralCode) c.referrals.attach(createdUserId, referralCode);
        attachCreator(c, createdUserId, creator);
        c.repos.metrics.record('signup');
        recordSignup(c, origin);
      }
      res.status(201).json({ message });
    })
  );

  router.post(
    '/login',
    failedLoginsByIp,
    failedLoginsByAccount,
    loginLimiter,
    asyncHandler(async (req, res) => {
      res.json(await c.auth.login(loginBody.parse(req.body)));
    })
  );

  router.post(
    '/google',
    failedLoginsByIp,
    loginLimiter,
    asyncHandler(async (req, res) => {
      const body = googleBody.parse(req.body);
      const { referralCode, origin, creator } = body;
      res.json(
        await c.auth.loginWithGoogle((body.token ?? body.idToken)!, body.locale, (userId) => {
          // Only a brand-new account can be an invited friend (or come from a creator).
          if (referralCode) c.referrals.attach(userId, referralCode);
          attachCreator(c, userId, creator);
          recordSignup(c, origin);
          // Google has already checked the address.
          c.repos.funnel.record('email_verified');
        })
      );
    })
  );

  router.post(
    '/refresh',
    refreshLimiter,
    asyncHandler((req, res) => {
      res.json(c.auth.refresh(refreshBody.parse(req.body).refreshToken));
    })
  );

  router.post(
    '/logout',
    asyncHandler((req, res) => {
      c.auth.logout(logoutBody.parse(req.body ?? {}).refreshToken);
      res.status(204).end();
    })
  );

  router.post(
    '/logout-all',
    requireAuth(c.auth),
    authed((req, res) => {
      c.auth.logoutEverywhere(req.userId);
      res.status(204).end();
    })
  );

  // ─── Two-factor authentication ──────────────────────────────────────────

  router.post(
    '/2fa/verify',
    failedLoginsByIp,
    twoFactorLimiter,
    asyncHandler((req, res) => {
      const { challengeToken, code } = twoFactorVerifyBody.parse(req.body);
      res.json(c.auth.completeTwoFactorLogin(challengeToken, code));
    })
  );

  router.get(
    '/2fa',
    requireAuth(c.auth),
    authed((req, res) => res.json(c.twoFactor.status(req.userId)))
  );

  router.post(
    '/2fa/setup',
    twoFactorSettingsLimiter,
    requireAuth(c.auth),
    authed(async (req, res) => {
      const { password, googleToken } = twoFactorSetupBody.parse(req.body ?? {});
      // A stolen session must not be able to lock the owner out with its own app.
      await c.auth.confirmIdentity(req.userId, { password, googleToken, authTime: req.authTime });
      res.json(c.twoFactor.startEnrollment(req.userId));
    })
  );

  router.post(
    '/2fa/enable',
    twoFactorSettingsLimiter,
    requireAuth(c.auth),
    authed((req, res) => {
      const { code } = twoFactorCodeBody.parse(req.body);
      res.json(c.twoFactor.confirmEnrollment(req.userId, code));
    })
  );

  router.post(
    '/2fa/disable',
    twoFactorSettingsLimiter,
    requireAuth(c.auth),
    authed(async (req, res) => {
      await c.twoFactor.disable(req.userId, twoFactorProofBody.parse(req.body ?? {}));
      res.status(204).end();
    })
  );

  router.post(
    '/2fa/recovery-codes',
    twoFactorSettingsLimiter,
    requireAuth(c.auth),
    authed(async (req, res) => {
      res.json(
        await c.twoFactor.regenerateRecoveryCodes(
          req.userId,
          twoFactorProofBody.parse(req.body ?? {})
        )
      );
    })
  );

  const verify = asyncHandler((req, res) => {
    const { token } = verifyQuery.parse({ ...req.body, ...req.query });
    c.auth.verifyEmail(token);
    c.repos.metrics.record('email_verified');
    res.json({ message: 'Email verificado correctamente. Ya puedes iniciar sesión.' });
  });
  router.get('/verify-email', tokenLimiter, verify);
  router.post('/verify-email', tokenLimiter, verify);

  router.post(
    '/resend-verification',
    emailLimiter,
    asyncHandler((req, res) => {
      const { email, locale } = emailBody.parse(req.body);
      c.auth.resendVerification(email, locale);
      res.json({ message: GENERIC_EMAIL_SENT });
    })
  );

  router.post(
    '/forgot-password',
    emailLimiter,
    asyncHandler((req, res) => {
      const { email, locale } = emailBody.parse(req.body);
      c.auth.requestPasswordReset(email, locale);
      res.json({ message: GENERIC_EMAIL_SENT });
    })
  );

  router.post(
    '/reset-password',
    tokenLimiter,
    asyncHandler(async (req, res) => {
      const { token, newPassword } = resetBody.parse(req.body);
      await c.auth.resetPassword(token, newPassword);
      res.json({ message: 'Contraseña restablecida correctamente.' });
    })
  );

  return router;
}
