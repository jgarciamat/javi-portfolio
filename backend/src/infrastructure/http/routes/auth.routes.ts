import { Router } from 'express';
import { normalizeEmail } from '@domain/model/User';
import { Container } from '../../container';
import {
  RateLimiterFactory,
  asyncHandler,
  authed,
  emailAndIpKey,
  requireAuth,
} from '../middleware';
import {
  emailBody,
  googleBody,
  loginBody,
  logoutBody,
  refreshBody,
  registerBody,
  resetBody,
  verifyQuery,
} from '../schemas';

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
  const registerLimiter = limiter({ windowMs: hour, limit: 10 });
  const emailLimiter = limiter({ windowMs: hour, limit: 5, keyGenerator: emailAndIpKey });
  const tokenLimiter = limiter({ windowMs: fifteenMinutes, limit: 30 });
  const refreshLimiter = limiter({ windowMs: fifteenMinutes, limit: 120 });

  router.post(
    '/register',
    registerLimiter,
    asyncHandler(async (req, res) => {
      const { referralCode, ...input } = registerBody.parse(req.body);
      const result = await c.auth.register(input);
      const created = c.repos.users.findByEmail(normalizeEmail(input.email));
      if (created && referralCode) c.referrals.attach(created.id, referralCode);
      c.repos.metrics.record('signup');
      res.status(201).json(result);
    })
  );

  router.post(
    '/login',
    loginLimiter,
    asyncHandler(async (req, res) => {
      res.json(await c.auth.login(loginBody.parse(req.body)));
    })
  );

  router.post(
    '/google',
    loginLimiter,
    asyncHandler(async (req, res) => {
      const body = googleBody.parse(req.body);
      res.json(await c.auth.loginWithGoogle((body.token ?? body.idToken)!, body.locale));
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

  const verify = asyncHandler((req, res) => {
    const { token } = verifyQuery.parse({ ...req.body, ...req.query });
    const userId = c.auth.verifyEmail(token);
    c.referrals.reward(userId);
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
