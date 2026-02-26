import { UpdateName, UpdatePassword, UpdateAvatar } from '../../../../src/application/use-cases/UpdateProfile';
import { IUserRepository } from '../../../../src/domain/repositories/IUserRepository';
import { User } from '../../../../src/domain/entities/User';
import bcrypt from 'bcryptjs';

const baseProps = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Alice',
    passwordHash: '',
    createdAt: new Date(),
    emailVerified: true,
    verificationToken: null,
    avatarUrl: null,
};

function makeUser(overrides: Partial<typeof baseProps> = {}): User {
    return User.create({ ...baseProps, ...overrides });
}

function makeRepo(user: User | null = null): IUserRepository {
    return {
        save: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn().mockResolvedValue(user),
        findByEmail: jest.fn().mockResolvedValue(null),
        findByVerificationToken: jest.fn().mockResolvedValue(null),
    };
}

// ── UpdateName ────────────────────────────────────────────────────────────────

describe('UpdateName', () => {
    it('updates name and persists user', async () => {
        const user = makeUser();
        const repo = makeRepo(user);
        const uc = new UpdateName(repo);

        const result = await uc.execute({ userId: 'user-1', name: '  Bob  ' });

        expect(result.name).toBe('Bob');
        expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bob' }));
    });

    it('throws when user is not found', async () => {
        const repo = makeRepo(null);
        const uc = new UpdateName(repo);

        await expect(uc.execute({ userId: 'ghost', name: 'Bob' })).rejects.toThrow('Usuario no encontrado');
    });

    it('throws when name is blank', async () => {
        const repo = makeRepo(makeUser());
        const uc = new UpdateName(repo);

        await expect(uc.execute({ userId: 'user-1', name: '   ' })).rejects.toThrow('vacío');
    });
});

// ── UpdatePassword ────────────────────────────────────────────────────────────

describe('UpdatePassword', () => {
    let user: User;
    const currentPlain = 'OldPass1!';

    beforeEach(async () => {
        const hash = await bcrypt.hash(currentPlain, 1);
        user = makeUser({ passwordHash: hash });
    });

    it('changes password when current is correct', async () => {
        const repo = makeRepo(user);
        const uc = new UpdatePassword(repo);

        await expect(
            uc.execute({ userId: 'user-1', currentPassword: currentPlain, newPassword: 'NewPass1!' })
        ).resolves.not.toThrow();

        expect(repo.save).toHaveBeenCalled();
    });

    it('throws when current password is wrong', async () => {
        const repo = makeRepo(user);
        const uc = new UpdatePassword(repo);

        await expect(
            uc.execute({ userId: 'user-1', currentPassword: 'WrongPass1!', newPassword: 'NewPass1!' })
        ).rejects.toThrow('incorrecta');
    });

    it('throws when new password is too short', async () => {
        const repo = makeRepo(user);
        const uc = new UpdatePassword(repo);

        await expect(
            uc.execute({ userId: 'user-1', currentPassword: currentPlain, newPassword: 'Ab1!' })
        ).rejects.toThrow('8 caracteres');
    });

    it('throws when new password has no uppercase', async () => {
        const repo = makeRepo(user);
        const uc = new UpdatePassword(repo);

        await expect(
            uc.execute({ userId: 'user-1', currentPassword: currentPlain, newPassword: 'newpass1!' })
        ).rejects.toThrow('mayúscula');
    });

    it('throws when user is not found', async () => {
        const repo = makeRepo(null);
        const uc = new UpdatePassword(repo);

        await expect(
            uc.execute({ userId: 'ghost', currentPassword: currentPlain, newPassword: 'NewPass1!' })
        ).rejects.toThrow('no encontrado');
    });
});

// ── UpdateAvatar ──────────────────────────────────────────────────────────────

describe('UpdateAvatar', () => {
    it('saves a valid data URL', async () => {
        const user = makeUser();
        const repo = makeRepo(user);
        const uc = new UpdateAvatar(repo);
        const dataUrl = 'data:image/png;base64,abc123';

        const result = await uc.execute({ userId: 'user-1', avatarDataUrl: dataUrl });

        expect(result.avatarUrl).toBe(dataUrl);
        expect(repo.save).toHaveBeenCalled();
    });

    it('throws when data URL does not start with data:image/', async () => {
        const repo = makeRepo(makeUser());
        const uc = new UpdateAvatar(repo);

        await expect(
            uc.execute({ userId: 'user-1', avatarDataUrl: 'http://evil.com/img.png' })
        ).rejects.toThrow('no válido');
    });

    it('throws when image is too large', async () => {
        const repo = makeRepo(makeUser());
        const uc = new UpdateAvatar(repo);
        const bigDataUrl = 'data:image/png;base64,' + 'A'.repeat(270_001);

        await expect(
            uc.execute({ userId: 'user-1', avatarDataUrl: bigDataUrl })
        ).rejects.toThrow('grande');
    });

    it('throws when user is not found', async () => {
        const repo = makeRepo(null);
        const uc = new UpdateAvatar(repo);

        await expect(
            uc.execute({ userId: 'ghost', avatarDataUrl: 'data:image/png;base64,abc' })
        ).rejects.toThrow('no encontrado');
    });
});
