import { NextFunction, Request, RequestHandler, Response } from 'express';
import rateLimit, { Options as RateLimitOptions } from 'express-rate-limit';
import { ZodError } from 'zod';
import {
  BusinessRuleError,
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  PaymentRequiredError,
  UnauthorizedError,
  ValidationError,
} from '@domain/errors';
import { AuthService } from '@application/auth/AuthService';

export interface AuthedRequest extends Request {
  /** Who is signed in: profile, password, billing, sessions. */
  userId: string;
  /** Whose data the request works on: the same user, or the owner of the household they joined. */
  dataUserId: string;
}

type Handler = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>;

/** Forwards rejected promises to the error handler (Express 4 does not do it). */
export function asyncHandler(fn: Handler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** Handler for authenticated routes: receives the user id already checked. */
export function authed(
  fn: (req: AuthedRequest, res: Response) => unknown | Promise<unknown>
): RequestHandler {
  return asyncHandler((req, res) => fn(req as AuthedRequest, res));
}

export function requireAuth(
  auth: AuthService,
  dataOwnerOf: (userId: string) => string = (userId) => userId
): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      next(new UnauthorizedError('Token requerido', 'TOKEN_REQUIRED'));
      return;
    }
    try {
      const { userId } = auth.authenticate(header.slice(7));
      (req as AuthedRequest).userId = userId;
      (req as AuthedRequest).dataUserId = dataOwnerOf(userId);
      next();
    } catch (e) {
      next(e);
    }
  };
}

function statusFor(error: DomainError): number {
  if (error instanceof ValidationError) return 400;
  if (error instanceof BusinessRuleError) return 400;
  if (error instanceof UnauthorizedError) return 401;
  if (error instanceof PaymentRequiredError) return 402;
  if (error instanceof ForbiddenError) return 403;
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ConflictError) return 409;
  return 400;
}

export function errorHandler(logger: Pick<Console, 'error'> = console) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof DomainError) {
      res.status(statusFor(err)).json({ error: err.message, code: err.code, details: err.details });
      return;
    }
    if (err instanceof ZodError) {
      const first = err.issues[0];
      res.status(400).json({
        error: first ? `${first.path.join('.') || 'body'}: ${first.message}` : 'Datos inválidos',
        code: 'VALIDATION_ERROR',
        details: {
          issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      });
      return;
    }
    const status = (err as { status?: number; type?: string }).status;
    if (status === 400 || status === 413) {
      const tooLarge = status === 413;
      res.status(status).json({
        error: tooLarge ? 'La petición es demasiado grande' : 'JSON inválido',
        code: tooLarge ? 'PAYLOAD_TOO_LARGE' : 'INVALID_JSON',
      });
      return;
    }
    logger.error('[http] unexpected error', err);
    res.status(500).json({ error: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
  };
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Ruta no encontrada', code: 'ROUTE_NOT_FOUND' });
}

export type RateLimiterFactory = (options: Partial<RateLimitOptions>) => RequestHandler;

/** Builds limiters that answer with the API's error format; disabled in tests. */
export function rateLimiterFactory(disabled: boolean): RateLimiterFactory {
  return (options) => {
    if (disabled) return (_req, _res, next) => next();
    return rateLimit({
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler: (_req, res) => {
        res.status(429).json({
          error: 'Demasiados intentos. Espera un poco y vuelve a probar.',
          code: 'RATE_LIMITED',
        });
      },
      ...options,
    });
  };
}

/** Key by e-mail + IP so one attacker cannot lock out a user from every network. */
export function emailAndIpKey(req: Request): string {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return `${req.ip}|${email}`;
}
