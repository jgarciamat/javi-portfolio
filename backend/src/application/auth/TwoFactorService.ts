import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyAttemptsError,
  UnauthorizedError,
  ValidationError,
} from '@domain/errors';
import { User } from '@domain/model/User';
import { SettingsRepository, UnitOfWork, UserRepository } from '@domain/ports/repositories';
import {
  Clock,
  EmailSender,
  PasswordHasher,
  SecurityNotice,
  TokenService,
} from '@domain/ports/services';
import { SecretBox, TwoFactorRecord, TwoFactorRepository } from '@domain/ports/two-factor';
import {
  RECOVERY_CODE_COUNT,
  generateRecoveryCode,
  generateTotpSecret,
  hashRecoveryCode,
  matchTotp,
  normalizeTotpCode,
  otpauthUri,
} from '@domain/services/totp';

/** Time to type the code after the password (or Google) step. */
export const CHALLENGE_TTL_MS = 5 * 60 * 1000;
/** Wrong codes accepted on one challenge before it is closed (sign in again). */
export const MAX_CHALLENGE_ATTEMPTS = 5;
/** Wrong codes in a row, on any challenge or setting, before the second step locks. */
export const MAX_FAILED_CODES = 5;
export const LOCK_MS = 15 * 60 * 1000;
/** Time to scan the QR code and confirm it before the enrolment has to start again. */
export const ENROLMENT_TTL_MS = 15 * 60 * 1000;

export interface TwoFactorStatus {
  enabled: boolean;
  enabledAt: string | null;
  recoveryCodesRemaining: number;
}

export interface TwoFactorChallenge {
  twoFactorRequired: true;
  challengeToken: string;
  expiresAt: string;
}

/** Proof asked before turning 2FA off or renewing the recovery codes. */
export interface TwoFactorProof {
  password?: string;
  /** A code of the app or a recovery code. */
  code?: string;
}

interface Logger {
  error(message: string, error?: unknown): void;
}

const TOTP_FORMAT = /^\d{6}$/;

export class TwoFactorService {
  constructor(
    private readonly repo: TwoFactorRepository,
    private readonly users: UserRepository,
    private readonly settings: SettingsRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly box: SecretBox,
    private readonly email: EmailSender,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly issuer = 'Finanverso',
    private readonly logger: Logger = console
  ) {}

  status(userId: string): TwoFactorStatus {
    const record = this.repo.find(userId);
    if (!record?.enabledAt) return { enabled: false, enabledAt: null, recoveryCodesRemaining: 0 };
    return {
      enabled: true,
      enabledAt: record.enabledAt,
      recoveryCodesRemaining: this.repo.remainingRecoveryCodes(userId),
    };
  }

  isEnabled(userId: string): boolean {
    return !!this.repo.find(userId)?.enabledAt;
  }

  // ─── Enrolment ────────────────────────────────────────────────────────────

  /**
   * Starts (or restarts) the enrolment: a new secret, kept encrypted and pending until a
   * code confirms the app has it. The caller has checked the user's identity first.
   */
  startEnrollment(userId: string): { secret: string; otpauthUri: string } {
    const user = this.requireUser(userId);
    const existing = this.repo.find(userId);
    if (existing?.enabledAt) {
      throw new ConflictError(
        'La verificación en dos pasos ya está activada',
        'TWO_FACTOR_ALREADY_ENABLED'
      );
    }
    const secret = generateTotpSecret();
    this.repo.save({
      userId,
      secretEncrypted: this.box.encrypt(secret),
      createdAt: this.clock.now().toISOString(),
      enabledAt: null,
      lastUsedStep: null,
      // Starting again does not clear a lock.
      failedAttempts: existing?.failedAttempts ?? 0,
      lockedUntil: existing?.lockedUntil ?? null,
    });
    return { secret, otpauthUri: otpauthUri(this.issuer, user.email, secret) };
  }

  /** A code of the app turns 2FA on; the recovery codes are returned only this once. */
  confirmEnrollment(userId: string, code: string): { recoveryCodes: string[] } {
    const user = this.requireUser(userId);
    const record = this.repo.find(userId);
    if (record?.enabledAt) {
      throw new ConflictError(
        'La verificación en dos pasos ya está activada',
        'TWO_FACTOR_ALREADY_ENABLED'
      );
    }
    const now = this.clock.now();
    if (!record || now.getTime() - new Date(record.createdAt).getTime() > ENROLMENT_TTL_MS) {
      throw new ValidationError(
        'La configuración ha caducado. Empieza de nuevo.',
        'TWO_FACTOR_SETUP_EXPIRED'
      );
    }
    this.assertNotLocked(record, now);
    const step = this.matchApp(record, code, now);
    if (step === null) this.fail(record, now);
    const recoveryCodes = this.uow.run(() => {
      this.repo.save({
        ...record,
        enabledAt: now.toISOString(),
        lastUsedStep: step,
        failedAttempts: 0,
        lockedUntil: null,
      });
      return this.newRecoveryCodes(userId);
    });
    this.notify(user, 'two_factor_enabled');
    return { recoveryCodes };
  }

  // ─── Settings ─────────────────────────────────────────────────────────────

  /** Needs the password, or a valid code (always a code for accounts without a password). */
  async disable(userId: string, proof: TwoFactorProof): Promise<void> {
    const { user } = await this.checkProof(userId, proof);
    this.repo.delete(userId);
    this.notify(user, 'two_factor_disabled');
  }

  async regenerateRecoveryCodes(
    userId: string,
    proof: TwoFactorProof
  ): Promise<{ recoveryCodes: string[] }> {
    const { user } = await this.checkProof(userId, proof);
    const recoveryCodes = this.uow.run(() => this.newRecoveryCodes(userId));
    this.notify(user, 'recovery_codes_regenerated');
    return { recoveryCodes };
  }

  // ─── Sign-in ──────────────────────────────────────────────────────────────

  /** After the password (or Google): the token that the code has to come with. */
  createChallenge(userId: string): TwoFactorChallenge {
    const now = this.clock.now();
    this.repo.deleteExpiredChallenges(now.toISOString());
    const issued = this.tokens.issueEmailToken(CHALLENGE_TTL_MS);
    this.repo.saveChallenge({
      tokenHash: issued.hash,
      userId,
      expiresAt: issued.expiresAt.toISOString(),
      attempts: 0,
    });
    return {
      twoFactorRequired: true,
      challengeToken: issued.token,
      expiresAt: issued.expiresAt.toISOString(),
    };
  }

  /** Checks the code of a challenge and closes it; returns whose sign-in it was. */
  verifyChallenge(challengeToken: string, code: string): string {
    const now = this.clock.now();
    this.repo.deleteExpiredChallenges(now.toISOString());
    const hash = this.tokens.hash(challengeToken);
    const challenge = this.repo.findChallenge(hash);
    const expired = (): UnauthorizedError =>
      new UnauthorizedError(
        'El inicio de sesión ha caducado. Vuelve a introducir tu contraseña.',
        'TWO_FACTOR_CHALLENGE_EXPIRED'
      );
    if (!challenge) throw expired();
    const record = this.repo.find(challenge.userId);
    if (!record?.enabledAt || challenge.attempts >= MAX_CHALLENGE_ATTEMPTS) {
      this.repo.deleteChallenge(hash);
      throw expired();
    }
    this.repo.countChallengeAttempt(hash);
    try {
      this.checkCode(record, code, now);
    } catch (e) {
      if (challenge.attempts + 1 >= MAX_CHALLENGE_ATTEMPTS) this.repo.deleteChallenge(hash);
      throw e;
    }
    this.repo.deleteChallenge(hash);
    return challenge.userId;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private requireUser(userId: string): User {
    const user = this.users.findById(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado', 'USER_NOT_FOUND');
    return user;
  }

  private async checkProof(
    userId: string,
    proof: TwoFactorProof
  ): Promise<{ user: User; record: TwoFactorRecord }> {
    const user = this.requireUser(userId);
    const record = this.repo.find(userId);
    if (!record?.enabledAt) {
      throw new ConflictError(
        'La verificación en dos pasos no está activada',
        'TWO_FACTOR_NOT_ENABLED'
      );
    }
    if (proof.code) {
      this.checkCode(record, proof.code, this.clock.now());
    } else if (user.passwordHash && proof.password) {
      if (!(await this.hasher.verify(proof.password, user.passwordHash))) {
        throw new ForbiddenError('La contraseña no es correcta', 'WRONG_PASSWORD');
      }
    } else {
      throw new ValidationError(
        user.passwordHash
          ? 'Introduce tu contraseña o un código de verificación'
          : 'Introduce un código de verificación',
        'TWO_FACTOR_PROOF_REQUIRED'
      );
    }
    return { user, record };
  }

  /** Accepts a code of the app or an unused recovery code; counts and locks failures. */
  private checkCode(record: TwoFactorRecord, code: string, now: Date): void {
    this.assertNotLocked(record, now);
    if (TOTP_FORMAT.test(normalizeTotpCode(code))) {
      const step = this.matchApp(record, code, now);
      if (step === null) this.fail(record, now);
      this.repo.save({ ...record, lastUsedStep: step, failedAttempts: 0, lockedUntil: null });
      return;
    }
    const used = this.repo.useRecoveryCode(
      record.userId,
      hashRecoveryCode(record.userId, code),
      now.toISOString()
    );
    if (!used) this.fail(record, now);
    this.repo.save({ ...record, failedAttempts: 0, lockedUntil: null });
    const user = this.users.findById(record.userId);
    if (user) this.notify(user, 'recovery_code_used');
  }

  private matchApp(record: TwoFactorRecord, code: string, now: Date): number | null {
    const secret = this.box.decrypt(record.secretEncrypted);
    // A secret that cannot be decrypted (the key changed) never matches: recovery codes still work.
    if (secret === null) return null;
    return matchTotp(secret, code, now.getTime(), record.lastUsedStep);
  }

  private assertNotLocked(record: TwoFactorRecord, now: Date): void {
    if (record.lockedUntil && new Date(record.lockedUntil) > now) {
      const retryAfterSeconds = Math.ceil(
        (new Date(record.lockedUntil).getTime() - now.getTime()) / 1000
      );
      throw new TooManyAttemptsError(
        'Demasiados códigos incorrectos. Espera unos minutos y vuelve a probar.',
        'TWO_FACTOR_LOCKED',
        { retryAfterSeconds }
      );
    }
  }

  /** Records a wrong code (outside any transaction, so it is never rolled back) and throws. */
  private fail(record: TwoFactorRecord, now: Date): never {
    const failedAttempts = record.failedAttempts + 1;
    const locked = failedAttempts >= MAX_FAILED_CODES;
    this.repo.save({
      ...record,
      failedAttempts: locked ? 0 : failedAttempts,
      lockedUntil: locked ? new Date(now.getTime() + LOCK_MS).toISOString() : record.lockedUntil,
    });
    throw new ForbiddenError('El código no es correcto', 'INVALID_TWO_FACTOR_CODE');
  }

  private newRecoveryCodes(userId: string): string[] {
    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);
    this.repo.replaceRecoveryCodes(
      userId,
      codes.map((c) => hashRecoveryCode(userId, c))
    );
    return codes;
  }

  private notify(user: User, notice: SecurityNotice): void {
    this.email
      .sendSecurityNotice(user.email, user.name, notice, this.settings.get(user.id).locale)
      .catch((e) => this.logger.error('[email] send failed', e));
  }
}
