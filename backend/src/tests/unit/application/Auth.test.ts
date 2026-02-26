import { RegisterUser, LoginUser, VerifyEmail } from '@application/use-cases/Auth';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { ICategoryRepository } from '@domain/repositories/ICategoryRepository';
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
        const useCase = new LoginUser(userRepo);

        await expect(useCase.execute({ email: 'nobody@example.com', password: 'x' }))
            .rejects.toThrow('Credenciales incorrectas');
    });

    it('should throw if email is not verified', async () => {
        const unverified = User.create({
            id: 'u2', email: 'u@e.com', passwordHash: 'h', name: 'U',
            createdAt: new Date(), emailVerified: false, verificationToken: 'tok',
        });
        const userRepo = makeUserRepo({ findByEmail: jest.fn().mockResolvedValue(unverified) });
        const useCase = new LoginUser(userRepo);

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
        const useCase = new LoginUser(userRepo);

        await expect(useCase.execute({ email: 'v@e.com', password: 'wrongpass' }))
            .rejects.toThrow('Credenciales incorrectas');
    });

    it('should return token and user on success', async () => {
        const bcrypt = await import('bcryptjs');
        const hash = await bcrypt.hash('mypassword', 10);
        const verifiedUser = User.create({
            id: 'u4', email: 'ok@e.com', passwordHash: hash, name: 'OK',
            createdAt: new Date(), emailVerified: true, verificationToken: null,
        });
        const userRepo = makeUserRepo({ findByEmail: jest.fn().mockResolvedValue(verifiedUser) });
        const useCase = new LoginUser(userRepo);

        const result = await useCase.execute({ email: 'ok@e.com', password: 'mypassword' });

        expect(result.token).toBeDefined();
        expect(result.token.length).toBeGreaterThan(10);
        expect(result.user.email).toBe('ok@e.com');
        expect(result.user.name).toBe('OK');
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
