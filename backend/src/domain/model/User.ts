import { randomUUID } from 'crypto';
import { ValidationError } from '@domain/errors';

export interface UserProps {
  id: string;
  email: string;
  name: string;
  /** bcrypt hash, or null for accounts that only sign in with Google. */
  passwordHash: string | null;
  createdAt: string;
  emailVerified: boolean;
  /** SHA-256 of the e-mail verification token (the raw token only travels by e-mail). */
  verificationTokenHash: string | null;
  verificationTokenExpiresAt: string | null;
  avatarUrl: string | null;
  /** SHA-256 of the password reset token. */
  resetTokenHash: string | null;
  resetTokenExpiresAt: string | null;
  googleId: string | null;
  /** Bumped to invalidate every issued access token (password change, reset, logout-all). */
  sessionVersion: number;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function cleanName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new ValidationError('El nombre no puede estar vacío');
  if (trimmed.length > 80) throw new ValidationError('El nombre no puede superar 80 caracteres');
  return trimmed;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static register(input: {
    email: string;
    name: string;
    passwordHash: string | null;
    emailVerified?: boolean;
    googleId?: string | null;
    now?: Date;
  }): User {
    const email = normalizeEmail(input.email);
    if (!EMAIL.test(email) || email.length > 254) {
      throw new ValidationError('Email inválido', 'INVALID_EMAIL');
    }
    return new User({
      id: randomUUID(),
      email,
      name: cleanName(input.name),
      passwordHash: input.passwordHash,
      createdAt: (input.now ?? new Date()).toISOString(),
      emailVerified: input.emailVerified ?? false,
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
      avatarUrl: null,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      googleId: input.googleId ?? null,
      sessionVersion: 0,
    });
  }

  static reconstitute(props: UserProps): User {
    return new User({ ...props });
  }

  private with(changes: Partial<UserProps>): User {
    return new User({ ...this.props, ...changes });
  }

  withVerificationToken(tokenHash: string, expiresAt: Date): User {
    return this.with({
      verificationTokenHash: tokenHash,
      verificationTokenExpiresAt: expiresAt.toISOString(),
    });
  }

  markEmailVerified(): User {
    return this.with({
      emailVerified: true,
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
    });
  }

  rename(name: string): User {
    return this.with({ name: cleanName(name) });
  }

  /** New password: also invalidates every session issued before. */
  withPasswordHash(passwordHash: string): User {
    return this.with({
      passwordHash,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      sessionVersion: this.props.sessionVersion + 1,
    });
  }

  withAvatar(avatarUrl: string | null): User {
    return this.with({ avatarUrl });
  }

  startPasswordReset(tokenHash: string, expiresAt: Date): User {
    return this.with({ resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt.toISOString() });
  }

  /** Links a verified Google identity to this account. */
  linkGoogle(googleId: string): User {
    return this.with({
      googleId,
      emailVerified: true,
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
    });
  }

  /** Drops a password nobody verified (protects against pre-registration account takeover). */
  dropUnverifiedPassword(): User {
    if (this.props.emailVerified) return this;
    return this.with({ passwordHash: null, sessionVersion: this.props.sessionVersion + 1 });
  }

  bumpSessionVersion(): User {
    return this.with({ sessionVersion: this.props.sessionVersion + 1 });
  }

  hasActiveResetToken(now: Date): boolean {
    return (
      !!this.props.resetTokenHash &&
      !!this.props.resetTokenExpiresAt &&
      new Date(this.props.resetTokenExpiresAt) > now
    );
  }

  get id(): string {
    return this.props.id;
  }
  get email(): string {
    return this.props.email;
  }
  get name(): string {
    return this.props.name;
  }
  get passwordHash(): string | null {
    return this.props.passwordHash;
  }
  get emailVerified(): boolean {
    return this.props.emailVerified;
  }
  get verificationTokenExpiresAt(): string | null {
    return this.props.verificationTokenExpiresAt;
  }
  get resetTokenExpiresAt(): string | null {
    return this.props.resetTokenExpiresAt;
  }
  get sessionVersion(): number {
    return this.props.sessionVersion;
  }

  toPublic(): {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    hasPassword: boolean;
  } {
    return {
      id: this.props.id,
      email: this.props.email,
      name: this.props.name,
      avatarUrl: this.props.avatarUrl,
      hasPassword: !!this.props.passwordHash,
    };
  }

  toPrimitives(): UserProps {
    return { ...this.props };
  }
}
