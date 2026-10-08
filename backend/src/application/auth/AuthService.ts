import { randomUUID } from 'crypto';
import { ConflictError, ForbiddenError, UnauthorizedError, ValidationError } from '@domain/errors';
import { Account, DEFAULT_ACCOUNT_NAME } from '@domain/model/Account';
import { User, normalizeEmail } from '@domain/model/User';
import { defaultSettings } from '@domain/model/UserSettings';
import {
  AccountRepository,
  CategoryRepository,
  RefreshTokenRepository,
  SettingsRepository,
  UnitOfWork,
  UserRepository,
} from '@domain/ports/repositories';
import {
  Clock,
  EmailLocale,
  EmailSender,
  GoogleIdentityVerifier,
  PasswordHasher,
  TokenService,
} from '@domain/ports/services';
import { assertStrongPassword } from '@domain/shared/password-policy';
import { EntitlementService } from '@application/billing/EntitlementService';

export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const RESET_TTL_MS = 60 * 60 * 1000;
/** A new reset e-mail is not sent if the previous one is younger than this. */
export const RESET_RESEND_COOLDOWN_MS = 2 * 60 * 1000;

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends SessionTokens {
  user: ReturnType<User['toPublic']>;
}

interface Logger {
  error(message: string, error?: unknown): void;
}

export class AuthService {
  /** Hash compared when the e-mail does not exist, so both paths take the same time. */
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly categories: CategoryRepository,
    private readonly accounts: AccountRepository,
    private readonly settings: SettingsRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly email: EmailSender,
    private readonly google: GoogleIdentityVerifier,
    private readonly entitlements: EntitlementService,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly refreshTtlMs: number,
    private readonly logger: Logger = console
  ) {}

  // ─── Registration & verification ──────────────────────────────────────────

  async register(input: {
    email: string;
    password: string;
    name: string;
    locale?: EmailLocale;
  }): Promise<{ message: string }> {
    assertStrongPassword(input.password);
    const email = normalizeEmail(input.email);
    if (this.users.findByEmail(email)) {
      throw new ConflictError('El email ya está registrado', 'EMAIL_TAKEN');
    }
    const passwordHash = await this.hasher.hash(input.password);
    const verification = this.tokens.issueEmailToken(VERIFICATION_TTL_MS);
    const user = User.register({
      email,
      name: input.name,
      passwordHash,
      now: this.clock.now(),
    }).withVerificationToken(verification.hash, verification.expiresAt);
    this.uow.run(() => this.createUserWithDefaults(user, input.locale ?? 'es'));
    this.sendInBackground(() =>
      this.email.sendVerification(user.email, user.name, verification.token, input.locale ?? 'es')
    );
    return { message: 'Registro completado. Revisa tu email para verificar tu cuenta.' };
  }

  verifyEmail(token: string): void {
    const user = this.users.findByVerificationTokenHash(this.tokens.hash(token));
    if (!user) {
      throw new ValidationError(
        'El enlace de verificación no es válido o ya fue usado',
        'INVALID_TOKEN'
      );
    }
    const expiresAt = user.verificationTokenExpiresAt;
    if (expiresAt && new Date(expiresAt) < this.clock.now()) {
      throw new ValidationError('El enlace ha caducado. Solicita uno nuevo.', 'TOKEN_EXPIRED');
    }
    this.users.save(user.markEmailVerified());
  }

  /** Always succeeds from the caller's point of view (no account enumeration). */
  resendVerification(emailInput: string, locale: EmailLocale = 'es'): void {
    const user = this.users.findByEmail(normalizeEmail(emailInput));
    if (!user || user.emailVerified) return;
    const verification = this.tokens.issueEmailToken(VERIFICATION_TTL_MS);
    this.users.save(user.withVerificationToken(verification.hash, verification.expiresAt));
    this.sendInBackground(() =>
      this.email.sendVerification(user.email, user.name, verification.token, locale)
    );
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  async login(input: { email: string; password: string }): Promise<AuthResult> {
    const user = this.users.findByEmail(normalizeEmail(input.email));
    const hash = user?.passwordHash ?? (await this.getDummyHash());
    const valid = await this.hasher.verify(input.password ?? '', hash);
    if (!user || !user.passwordHash || !valid) {
      throw new UnauthorizedError('Email o contraseña incorrectos', 'INVALID_CREDENTIALS');
    }
    if (!user.emailVerified) {
      throw new ForbiddenError(
        'Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.',
        'EMAIL_NOT_VERIFIED'
      );
    }
    return { ...this.issueSession(user), user: user.toPublic() };
  }

  refresh(refreshToken: string): { accessToken: string } {
    const hash = this.tokens.hash(refreshToken);
    const record = this.refreshTokens.findByHash(hash);
    const now = this.clock.now();
    if (!record || new Date(record.expiresAt) < now) {
      if (record) this.refreshTokens.deleteByHash(hash);
      throw new UnauthorizedError('Sesión caducada. Inicia sesión de nuevo.', 'SESSION_EXPIRED');
    }
    const user = this.users.findById(record.userId);
    if (!user) {
      this.refreshTokens.deleteByHash(hash);
      throw new UnauthorizedError('Sesión caducada. Inicia sesión de nuevo.', 'SESSION_EXPIRED');
    }
    this.refreshTokens.extend(hash, new Date(now.getTime() + this.refreshTtlMs).toISOString());
    return {
      accessToken: this.tokens.issueAccessToken({
        userId: user.id,
        sessionVersion: user.sessionVersion,
      }),
    };
  }

  logout(refreshToken: string | undefined): void {
    if (refreshToken) this.refreshTokens.deleteByHash(this.tokens.hash(refreshToken));
  }

  /** Closes every session of the user, on every device. */
  logoutEverywhere(userId: string): void {
    this.uow.run(() => {
      const user = this.users.findById(userId);
      if (!user) return;
      this.users.save(user.bumpSessionVersion());
      this.refreshTokens.deleteByUser(userId);
    });
  }

  /** Used by the auth middleware: the token must match the user's current session version. */
  authenticate(accessToken: string): { userId: string } {
    const claims = this.tokens.verifyAccessToken(accessToken);
    const user = this.users.findById(claims.userId);
    if (!user || user.sessionVersion !== claims.sessionVersion) {
      throw new UnauthorizedError('Sesión no válida', 'INVALID_TOKEN');
    }
    return { userId: user.id };
  }

  // ─── Password reset ───────────────────────────────────────────────────────

  /** Always succeeds from the caller's point of view (no account enumeration). */
  requestPasswordReset(emailInput: string, locale: EmailLocale = 'es'): void {
    const user = this.users.findByEmail(normalizeEmail(emailInput));
    if (!user) return;
    const now = this.clock.now();
    if (user.hasActiveResetToken(now) && user.resetTokenExpiresAt) {
      const issuedAt = new Date(user.resetTokenExpiresAt).getTime() - RESET_TTL_MS;
      if (now.getTime() - issuedAt < RESET_RESEND_COOLDOWN_MS) return;
    }
    const reset = this.tokens.issueEmailToken(RESET_TTL_MS);
    this.users.save(user.startPasswordReset(reset.hash, reset.expiresAt));
    this.sendInBackground(() =>
      this.email.sendPasswordReset(user.email, user.name, reset.token, locale)
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = this.users.findByResetTokenHash(this.tokens.hash(token));
    if (!user || !user.resetTokenExpiresAt) {
      throw new ValidationError('El enlace no es válido o ya fue usado', 'INVALID_TOKEN');
    }
    if (new Date(user.resetTokenExpiresAt) < this.clock.now()) {
      throw new ValidationError('El enlace ha caducado. Solicita uno nuevo.', 'TOKEN_EXPIRED');
    }
    assertStrongPassword(newPassword);
    const hash = await this.hasher.hash(newPassword);
    this.uow.run(() => {
      // Resetting through the e-mail link also proves ownership of the address.
      this.users.save(user.withPasswordHash(hash).markEmailVerified());
      this.refreshTokens.deleteByUser(user.id);
    });
  }

  // ─── Google ───────────────────────────────────────────────────────────────

  async loginWithGoogle(token: string, locale: EmailLocale = 'es'): Promise<AuthResult> {
    const identity = await this.google.verify(token);
    if (!identity.emailVerified) {
      throw new UnauthorizedError(
        'Tu email de Google no está verificado',
        'GOOGLE_EMAIL_NOT_VERIFIED'
      );
    }
    const user = this.uow.run(() => {
      const linked = this.users.findByGoogleId(identity.googleId);
      if (linked) return linked;
      const byEmail = this.users.findByEmail(normalizeEmail(identity.email));
      if (byEmail) {
        // An unverified password may belong to someone who registered the address
        // before its real owner: drop it before linking the Google identity.
        const linkedUser = byEmail.dropUnverifiedPassword().linkGoogle(identity.googleId);
        this.users.save(linkedUser);
        if (!byEmail.emailVerified) this.refreshTokens.deleteByUser(byEmail.id);
        return linkedUser;
      }
      const created = User.register({
        email: identity.email,
        name: identity.name ?? identity.email.split('@')[0],
        passwordHash: null,
        emailVerified: true,
        googleId: identity.googleId,
        now: this.clock.now(),
      });
      this.createUserWithDefaults(created, locale);
      return created;
    });
    return { ...this.issueSession(user), user: user.toPublic() };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  issueSession(user: User): SessionTokens {
    const refresh = this.tokens.issueRefreshToken();
    this.refreshTokens.save({
      id: randomUUID(),
      userId: user.id,
      tokenHash: refresh.hash,
      expiresAt: refresh.expiresAt.toISOString(),
      createdAt: this.clock.now().toISOString(),
    });
    return {
      accessToken: this.tokens.issueAccessToken({
        userId: user.id,
        sessionVersion: user.sessionVersion,
      }),
      refreshToken: refresh.token,
    };
  }

  private createUserWithDefaults(user: User, locale: string): void {
    this.users.save(user);
    this.categories.seedDefaults(user.id);
    const account = Account.create(user.id, { name: DEFAULT_ACCOUNT_NAME }, this.clock.now());
    this.accounts.save(account);
    this.settings.save({ ...defaultSettings(user.id, locale), defaultAccountId: account.id });
    this.entitlements.grantTrial(user.id);
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash(`dummy-${randomUUID()}`);
    return this.dummyHash;
  }

  private sendInBackground(send: () => Promise<void>): void {
    send().catch((e) => this.logger.error('[email] send failed', e));
  }
}
