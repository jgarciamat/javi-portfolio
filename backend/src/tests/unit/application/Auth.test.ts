import { RegisterUser, LoginUser, VerifyEmail, LogoutUser, RefreshAccessToken } from '@application/use-cases/Auth';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { ICategoryRepository } from '@domain/repositories/ICategoryRepository';
import { IRefreshTokenRepository } from '@domain/repositories/IRefreshTokenRepository';
import { User } from '@domain/entities/User';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeUserRepo(overrides: Partial<IUserRepository> = {}): IUserRepository {
    return {
        save: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn().mockResolvedValue(null),
        findByEmail: jest.fn().mockResolvedValue(null),
        findByVerificationToken: jest.fn().mockResolvedValue(null),
        ...overrides,
    };
}

function makeCategoryRepo(overrides: Partial<ICategoryRepository> = {}): ICategoryRepository {
    return {
        save: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn().mockResolvedValue(null),
        findByName: jest.fn().mockResolvedValue(null),
        findAll: jest.fn().mockResolvedValue([]),
        findAllByUser: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue(undefined),
        seedForUser: jest.fn(),
        ...overrides,
    };
}

function makeRefreshTokenRepo(overrides: Partial<IRefreshTokenRepository> = {}): IRefreshTokenRepository {
    return {
        save: jest.fn().mockResolvedValue(undefined),
        findByToken: jest.fn().mockResolvedValue(null),
        deleteByToken: jest.fn().mockResolvedValue(undefined),
        deleteByUserId: jest.fn().mockResolvedValue(undefined),
        deleteExpired: jest.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const emailService = { sendVerificationEmail: jest.fn().mockResolvedValue(undefined) } as any;

function makeVerifiedUser(): User {
    return User.create({
        id: 'user-001',
        email: 'test@example.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuuabcdefghijklmnopqrstuvwxyz012345', // bcrypt placeholder
        name: 'Test',
        createdAt: new Date(),
        emailVerified: true,
        verificationToken: null,
    });
}

// ── RegisterUser ─────────────────────────────────────────────────────────────

describe('RegisterUser', () => {
    it('should register a new user and return success message', async () => {
        const userRepo = makeUserRepo();
        const categoryRepo = makeCategoryRepo();
        const useCase = new RegisterUser(userRepo, categoryRepo, emailService);
        const result = await useCase.execute({ email: 'new@example.com', password: 'pass123', name: 'Alice' });

        expect(result.message).toContain('Registro exitoso');
        expect(userRepo.save).toHaveBeenCalledTimes(1);
        expect(categoryRepo.seedForUser).toHaveBeenCalledTimes(1);
        expect(emailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
    });

    it('should throw if email is already registered', async () => {
        const existingUser = makeVerifiedUser();
        const userRepo = makeUserRepo({ findByEmail: jest.fn().mockResolvedValue(existingUser) });
        const useCase = new RegisterUser(userRepo, makeCategoryRepo(), emailService);

        await expect(useCase.execute({ email: 'test@example.com', password: 'pass', name: 'Bob' }))
            .rejects.toThrow('El email ya está registrado');
    });

    it('should normalize email to lowercase', async () => {
        const userRepo = makeUserRepo();
        const categoryRepo = makeCategoryRepo();
        const useCase = new RegisterUser(userRepo, categoryRepo, emailService);

        await useCase.execute({ email: 'UPPER@EXAMPLE.COM', password: 'pass', name: 'Carol' });

        const savedUser = (userRepo.save as jest.Mock).mock.calls[0][0] as User;
        expect(savedUser.email).toBe('upper@example.com');
    });
});

// ── LoginUser ─────────────────────────────────────────────────────────────────

describe('LoginUser', () => {
    it('should throw if user not found', async () => {
        const userRepo = makeUserRepo({ findByEmail: jest.fn().mockResolvedValue(null) });
        const useCase = new LoginUser(userRepo, makeRefreshTokenRepo());

        await expect(useCase.execute({ email: 'nobody@example.com', password: 'x' }))
            .rejects.toThrow('Credenciales incorrectas');
    });

    it('should throw if email is not verified', async () => {
        const unverified = User.create({
            id: 'u2', email: 'u@e.com', passwordHash: 'h', name: 'U',
            createdAt: new Date(), emailVerified: false, verificationToken: 'tok',
        });
        const userRepo = makeUserRepo({ findByEmail: jest.fn().mockResolvedValue(unverified) });
        const useCase = new LoginUser(userRepo, makeRefreshTokenRepo());

        await expect(useCase.execute({ email: 'u@e.com', password: 'any' }))
            .rejects.toThrow('Credenciales incorrectas');
    });

    it('should throw if password is wrong', async () => {
        // Use a real bcrypt hash for 'correctpass'
        const bcrypt = await import('bcryptjs');
        const hash = await bcrypt.hash('correctpass', 10);
        const verifiedUser = User.create({
            id: 'u3', email: 'v@e.com', passwordHash: hash, name: 'V',
            createdAt: new Date(), emailVerified: true, verificationToken: null,
        });
        const userRepo = makeUserRepo({ findByEmail: jest.fn().mockResolvedValue(verifiedUser) });
        const useCase = new LoginUser(userRepo, makeRefreshTokenRepo());

        await expect(useCase.execute({ email: 'v@e.com', password: 'wrongpass' }))
            .rejects.toThrow('Credenciales incorrectas');
    });

    it('should return accessToken, refreshToken and user on success', async () => {
        const bcrypt = await import('bcryptjs');
        const hash = await bcrypt.hash('mypassword', 10);
        const verifiedUser = User.create({
            id: 'u4', email: 'ok@e.com', passwordHash: hash, name: 'OK',
            createdAt: new Date(), emailVerified: true, verificationToken: null,
        });
        const userRepo = makeUserRepo({ findByEmail: jest.fn().mockResolvedValue(verifiedUser) });
        const refreshTokenRepo = makeRefreshTokenRepo();
        const useCase = new LoginUser(userRepo, refreshTokenRepo);

        const result = await useCase.execute({ email: 'ok@e.com', password: 'mypassword' });

        expect(result.accessToken).toBeDefined();
        expect(result.accessToken.length).toBeGreaterThan(10);
        expect(result.refreshToken).toBeDefined();
        expect(result.refreshToken.length).toBeGreaterThan(10);
        expect(result.user.email).toBe('ok@e.com');
        expect(result.user.name).toBe('OK');
        expect(refreshTokenRepo.save).toHaveBeenCalledTimes(1);
    });
});

// ── VerifyEmail ─────────────────────────────────────────────────────────────

describe('VerifyEmail', () => {
    it('should throw if token is not found', async () => {
        const userRepo = makeUserRepo({ findByVerificationToken: jest.fn().mockResolvedValue(null) });
        const useCase = new VerifyEmail(userRepo);

        await expect(useCase.execute('invalid-token'))
            .rejects.toThrow('El enlace de verificación no es válido o ya fue usado.');
    });

    it('should verify the user and save', async () => {
        const unverified = User.create({
            id: 'u5', email: 'u5@e.com', passwordHash: 'h', name: 'U5',
            createdAt: new Date(), emailVerified: false, verificationToken: 'good-token',
        });
        const userRepo = makeUserRepo({ findByVerificationToken: jest.fn().mockResolvedValue(unverified) });
        const useCase = new VerifyEmail(userRepo);

        await useCase.execute('good-token');

        const savedUser = (userRepo.save as jest.Mock).mock.calls[0][0] as User;
        expect(savedUser.emailVerified).toBe(true);
        expect(savedUser.verificationToken).toBeNull();
    });
});

// ── LogoutUser ───────────────────────────────────────────────────────────────

describe('LogoutUser', () => {
    it('should delete the refresh token from the repository', async () => {
        const refreshTokenRepo = makeRefreshTokenRepo();
        const useCase = new LogoutUser(refreshTokenRepo);

        await useCase.execute('some-refresh-token');

        expect(refreshTokenRepo.deleteByToken).toHaveBeenCalledWith('some-refresh-token');
    });
});

// ── RefreshAccessToken ────────────────────────────────────────────────────────

describe('RefreshAccessToken', () => {
    it('should throw when refresh token signature is invalid', async () => {
        const useCase = new RefreshAccessToken(makeRefreshTokenRepo());
        await expect(useCase.execute('not-a-valid-jwt'))
            .rejects.toThrow('Refresh token inválido o expirado');
    });

    it('should throw when refresh token is not in DB (revoked)', async () => {
        // Generate a real refresh token using the same secret as Auth.ts
        const jwt = await import('jsonwebtoken');
        const secret = process.env.JWT_REFRESH_SECRET ?? 'money-manager-refresh-secret-change-in-prod';
        const token = jwt.sign({ userId: 'u1' }, secret, { expiresIn: '7d' });

        const refreshTokenRepo = makeRefreshTokenRepo({ findByToken: jest.fn().mockResolvedValue(null) });
        const useCase = new RefreshAccessToken(refreshTokenRepo);

        await expect(useCase.execute(token))
            .rejects.toThrow('Refresh token revocado');
    });

    it('should throw when DB record is expired', async () => {
        const jwt = await import('jsonwebtoken');
        const secret = process.env.JWT_REFRESH_SECRET ?? 'money-manager-refresh-secret-change-in-prod';
        const token = jwt.sign({ userId: 'u1' }, secret, { expiresIn: '7d' });

        const expiredRecord = {
            id: 'r1', userId: 'u1', token,
            expiresAt: new Date(Date.now() - 1000), // past
            createdAt: new Date(),
        };
        const refreshTokenRepo = makeRefreshTokenRepo({ findByToken: jest.fn().mockResolvedValue(expiredRecord) });
        const useCase = new RefreshAccessToken(refreshTokenRepo);

        await expect(useCase.execute(token))
            .rejects.toThrow('Refresh token expirado');
        expect(refreshTokenRepo.deleteByToken).toHaveBeenCalledWith(token);
    });

    it('should return a new accessToken when all checks pass', async () => {
        const jwt = await import('jsonwebtoken');
        const secret = process.env.JWT_REFRESH_SECRET ?? 'money-manager-refresh-secret-change-in-prod';
        const token = jwt.sign({ userId: 'u1' }, secret, { expiresIn: '7d' });

        const validRecord = {
            id: 'r1', userId: 'u1', token,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // future
            createdAt: new Date(),
        };
        const refreshTokenRepo = makeRefreshTokenRepo({ findByToken: jest.fn().mockResolvedValue(validRecord) });
        const useCase = new RefreshAccessToken(refreshTokenRepo);

        const result = await useCase.execute(token);

        expect(result.accessToken).toBeDefined();
        expect(result.accessToken.length).toBeGreaterThan(10);
    });
});
