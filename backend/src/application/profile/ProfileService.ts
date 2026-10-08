import { NotFoundError, UnauthorizedError, ValidationError } from '@domain/errors';
import { User } from '@domain/model/User';
import { RefreshTokenRepository, UnitOfWork, UserRepository } from '@domain/ports/repositories';
import { PasswordHasher } from '@domain/ports/services';
import { assertStrongPassword } from '@domain/shared/password-policy';
import { AuthService, SessionTokens } from '@application/auth/AuthService';

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const DATA_URL = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/;

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
   * is closed; the caller receives fresh tokens for the current device.
   */
  async changePassword(
    userId: string,
    currentPassword: string | undefined,
    newPassword: string
  ): Promise<SessionTokens> {
    const user = this.requireUser(userId);
    if (user.passwordHash) {
      const valid = await this.hasher.verify(currentPassword ?? '', user.passwordHash);
      if (!valid) {
        throw new UnauthorizedError('La contraseña actual es incorrecta', 'WRONG_PASSWORD');
      }
    }
    assertStrongPassword(newPassword);
    const updated = user.withPasswordHash(await this.hasher.hash(newPassword));
    return this.uow.run(() => {
      this.users.save(updated);
      this.refreshTokens.deleteByUser(userId);
      return this.auth.issueSession(updated);
    });
  }

  updateAvatar(userId: string, dataUrl: string | null): { avatarUrl: string | null } {
    const user = this.requireUser(userId);
    if (dataUrl !== null) {
      const match = DATA_URL.exec(dataUrl);
      if (!match || !AVATAR_TYPES.includes(match[1])) {
        throw new ValidationError(
          'Formato de imagen no válido (PNG, JPEG, WebP o GIF)',
          'INVALID_IMAGE'
        );
      }
      const bytes = Buffer.from(match[2], 'base64').length;
      if (bytes > AVATAR_MAX_BYTES) {
        throw new ValidationError('La imagen es demasiado grande (máx. 2 MB)', 'IMAGE_TOO_LARGE');
      }
    }
    this.users.save(user.withAvatar(dataUrl));
    return { avatarUrl: dataUrl };
  }

  /** Deletes the user; every owned row goes with it (ON DELETE CASCADE). */
  deleteAccount(userId: string): void {
    this.requireUser(userId);
    this.uow.run(() => this.users.delete(userId));
  }
}
