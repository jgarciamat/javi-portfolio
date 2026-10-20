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
  /**
   * Stored in the `avatar_url` column: an emoji avatar. Pictures uploaded before were erased by
   * migration 033; anything that is not an emoji is still never served.
   */
  avatar: string | null;
  /** SHA-256 of the password reset token. */
  resetTokenHash: string | null;
  resetTokenExpiresAt: string | null;
  googleId: string | null;
  /** Bumped to invalidate every issued access token (password change, reset, logout-all). */
  sessionVersion: number;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
const EMOJI_PARTS = /^[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}]+$/u;
/** The joiner and the emoji presentation selector that glue the parts of an emoji. */
const GLUE = /\u200d|\ufe0f/g;

/** A single emoji (skin tones and joined emoji included): the only avatar the app offers. */
export function isEmojiAvatar(value: string): boolean {
  if (value.length > 16 || !PICTOGRAPHIC.test(value) || !EMOJI_PARTS.test(value.replace(GLUE, '')))
    return false;
  const segmenter = new Intl.Segmenter('es', { granularity: 'grapheme' });
  return [...segmenter.segment(value)].length === 1;
}

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
      avatar: null,
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

  /** Chooses an emoji avatar (null goes back to the default one). */
  withAvatar(avatar: string | null): User {
    if (avatar !== null && !isEmojiAvatar(avatar)) {
      throw new ValidationError('El avatar debe ser un emoji', 'INVALID_AVATAR');
    }
    return this.with({ avatar });
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
  get googleId(): string | null {
    return this.props.googleId;
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
    avatar: string | null;
    hasPassword: boolean;
  } {
    return {
      id: this.props.id,
      email: this.props.email,
      name: this.props.name,
      // An old uploaded picture is not served: the app shows the default emoji instead.
      avatar: this.props.avatar && isEmojiAvatar(this.props.avatar) ? this.props.avatar : null,
      hasPassword: !!this.props.passwordHash,
    };
  }

  toPrimitives(): UserProps {
    return { ...this.props };
  }
}
