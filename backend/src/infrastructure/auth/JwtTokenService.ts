import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '@domain/errors';
import { BcryptWorkerPool, sharedBcryptPool } from './bcryptPool';
import {
  AccessTokenClaims,
  IssuedToken,
  PasswordHasher,
  TokenService,
} from '@domain/ports/services';

export class JwtTokenService implements TokenService {
  constructor(
    private readonly accessSecret: string,
    private readonly accessTtl: string,
    private readonly refreshTtlMs: number,
    private readonly now: () => Date = () => new Date()
  ) {}

  issueAccessToken(claims: AccessTokenClaims): string {
    const authTime =
      claims.authTime === null ? {} : { auth_time: Math.floor(claims.authTime / 1000) };
    return jwt.sign({ sv: claims.sessionVersion, ...authTime }, this.accessSecret, {
      subject: claims.userId,
      expiresIn: this.accessTtl as jwt.SignOptions['expiresIn'],
      algorithm: 'HS256',
    });
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    try {
      const payload = jwt.verify(token, this.accessSecret, {
        algorithms: ['HS256'],
      }) as jwt.JwtPayload;
      if (!payload.sub || typeof payload.sv !== 'number') throw new Error('missing claims');
      return {
        userId: payload.sub,
        sessionVersion: payload.sv,
        authTime: typeof payload.auth_time === 'number' ? payload.auth_time * 1000 : null,
      };
    } catch {
      throw new UnauthorizedError('Token inválido o expirado', 'INVALID_TOKEN');
    }
  }

  private issueRandom(ttlMs: number): IssuedToken {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: this.hash(token), expiresAt: new Date(this.now().getTime() + ttlMs) };
  }

  issueRefreshToken(): IssuedToken {
    return this.issueRandom(this.refreshTtlMs);
  }

  issueEmailToken(ttlMs: number): IssuedToken {
    return this.issueRandom(ttlMs);
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

/** bcrypt (bcryptjs) in worker threads, so hashing does not block other requests. */
export class BcryptPasswordHasher implements PasswordHasher {
  constructor(
    private readonly rounds = 12,
    private readonly pool: BcryptWorkerPool = sharedBcryptPool()
  ) {}

  hash(password: string): Promise<string> {
    return this.pool.hash(password, this.rounds);
  }

  verify(password: string, hash: string): Promise<boolean> {
    return this.pool.compare(password, hash);
  }
}
