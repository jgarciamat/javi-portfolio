import { ForbiddenError, NotFoundError } from '@domain/errors';
import { User } from '@domain/model/User';
import { RefreshTokenRepository, UnitOfWork, UserRepository } from '@domain/ports/repositories';
import { PasswordHasher } from '@domain/ports/services';
import { assertStrongPassword } from '@domain/shared/password-policy';
import { AuthService, SessionTokens } from '@application/auth/AuthService';

export class ProfileService {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly hasher: PasswordHasher,
    private readonly auth: AuthService,
    private readonly uow: UnitOfWork
  ) {}

  private requireUser(userId: string): User {
    const user = this.users.findById(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado', 'USER_NOT_FOUND');
    return user;
  }

  getProfile(userId: string): ReturnType<User['toPublic']> {
    return this.requireUser(userId).toPublic();
  }

  rename(userId: string, name: string): { name: string } {
    const user = this.requireUser(userId).rename(name);
    this.users.save(user);
    return { name: user.name };
  }

  /**
   * Changes (or, for Google-only accounts, sets) the password. Every other session
   * is closed; the caller receives fresh tokens for the current device. Setting the
   * first password needs a recent Google sign-in: otherwise a stolen session could
   * add one and use it to get past the checks that ask for the password. A wrong
   * current password answers 403, never 401, so the client does not sign out.
   */
  async changePassword(
    userId: string,
    currentPassword: string | undefined,
    newPassword: string,
    authTime: number | null = null
  ): Promise<SessionTokens> {
    const user = this.requireUser(userId);
    if (user.passwordHash) {
      const valid = await this.hasher.verify(currentPassword ?? '', user.passwordHash);
      if (!valid) {
        throw new ForbiddenError('La contraseña actual es incorrecta', 'WRONG_PASSWORD');
      }
    } else {
      await this.auth.confirmIdentity(userId, { authTime });
    }
    assertStrongPassword(newPassword);
    const updated = user.withPasswordHash(await this.hasher.hash(newPassword));
    return this.uow.run(() => {
      this.users.save(updated);
      this.refreshTokens.deleteByUser(userId);
      return this.auth.issueSession(updated);
    });
  }

  /** Sets the emoji avatar (null: the default one). Pictures are no longer accepted. */
  updateAvatar(userId: string, avatar: string | null): { avatar: string | null } {
    this.users.save(this.requireUser(userId).withAvatar(avatar));
    return { avatar };
  }

  /** Deletes the user; every owned row goes with it (ON DELETE CASCADE). */
  deleteAccount(userId: string): void {
    this.requireUser(userId);
    this.uow.run(() => this.users.delete(userId));
  }
}
