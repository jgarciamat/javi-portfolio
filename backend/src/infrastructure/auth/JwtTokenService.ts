import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UnauthorizedError } from '@domain/errors';
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
    return jwt.sign({ sv: claims.sessionVersion }, this.accessSecret, {
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
      return { userId: payload.sub, sessionVersion: payload.sv };
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

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly rounds = 12) {}

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.rounds);
  }

  verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
