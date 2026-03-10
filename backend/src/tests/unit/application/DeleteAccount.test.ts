import { DeleteAccount } from '@application/use-cases/DeleteAccount';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';
import { ICategoryRepository } from '@domain/repositories/ICategoryRepository';
import { IRecurringRuleRepository } from '@domain/repositories/IRecurringRuleRepository';
import { IRefreshTokenRepository } from '@domain/repositories/IRefreshTokenRepository';
import { User } from '@domain/entities/User';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(id = 'user-001'): User {
    return User.create({
        id,
        email: 'user@example.com',
        passwordHash: 'hash',
        name: 'Test User',
        createdAt: new Date(),
        emailVerified: true,
        verificationToken: null,
    });
}

function makeUserRepo(overrides: Partial<IUserRepository> = {}): IUserRepository {
    return {
        save: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn().mockResolvedValue(makeUser()),
        findByEmail: jest.fn().mockResolvedValue(null),
        findByVerificationToken: jest.fn().mockResolvedValue(null),
        findByResetToken: jest.fn().mockResolvedValue(null),
        delete: jest.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

function makeTransactionRepo(overrides: Partial<ITransactionRepository> = {}): ITransactionRepository {
    return {
        save: jest.fn().mockResolvedValue(undefined),
        saveForUser: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn().mockResolvedValue(null),
        findAll: jest.fn().mockResolvedValue([]),
        findByType: jest.fn().mockResolvedValue([]),
        findByCategory: jest.fn().mockResolvedValue([]),
        findByDateRange: jest.fn().mockResolvedValue([]),
        findByUserAndMonth: jest.fn().mockResolvedValue([]),
        computeCarryover: jest.fn().mockReturnValue(0),
        delete: jest.fn().mockResolvedValue(undefined),
        deleteByRecurringRule: jest.fn().mockResolvedValue(undefined),
        deleteAllByUser: jest.fn().mockResolvedValue(undefined),
        patchTransaction: jest.fn().mockResolvedValue(null),
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
        deleteAllByUser: jest.fn().mockResolvedValue(undefined),
        seedForUser: jest.fn(),
        ...overrides,
    };
}

function makeRecurringRuleRepo(overrides: Partial<IRecurringRuleRepository> = {}): IRecurringRuleRepository {
    return {
        save: jest.fn(),
        findById: jest.fn().mockReturnValue(null),
        findByUserId: jest.fn().mockReturnValue([]),
        update: jest.fn().mockReturnValue(null),
        delete: jest.fn(),
        deleteAllByUser: jest.fn(),
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

function makeUseCase(
    userRepo?: Partial<IUserRepository>,
    transactionRepo?: Partial<ITransactionRepository>,
    categoryRepo?: Partial<ICategoryRepository>,
    recurringRuleRepo?: Partial<IRecurringRuleRepository>,
    refreshTokenRepo?: Partial<IRefreshTokenRepository>,
) {
    return new DeleteAccount(
        makeUserRepo(userRepo),
        makeTransactionRepo(transactionRepo),
        makeCategoryRepo(categoryRepo),
        makeRecurringRuleRepo(recurringRuleRepo),
        makeRefreshTokenRepo(refreshTokenRepo),
    );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DeleteAccount', () => {
    const userId = 'user-001';

    describe('execute – happy path', () => {
        it('should resolve without throwing when user exists', async () => {
            const uc = makeUseCase();
            await expect(uc.execute({ userId })).resolves.toBeUndefined();
        });

        it('should call userRepo.findById with the correct userId', async () => {
            const userRepo = makeUserRepo();
            const uc = new DeleteAccount(
                userRepo,
                makeTransactionRepo(),
                makeCategoryRepo(),
                makeRecurringRuleRepo(),
                makeRefreshTokenRepo(),
            );
            await uc.execute({ userId });
            expect(userRepo.findById).toHaveBeenCalledWith(userId);
        });

        it('should call transactionRepo.deleteAllByUser with the correct userId', async () => {
            const transactionRepo = makeTransactionRepo();
            const uc = new DeleteAccount(
                makeUserRepo(),
                transactionRepo,
                makeCategoryRepo(),
                makeRecurringRuleRepo(),
                makeRefreshTokenRepo(),
            );
            await uc.execute({ userId });
            expect(transactionRepo.deleteAllByUser).toHaveBeenCalledWith(userId);
            expect(transactionRepo.deleteAllByUser).toHaveBeenCalledTimes(1);
        });

        it('should call categoryRepo.deleteAllByUser with the correct userId', async () => {
            const categoryRepo = makeCategoryRepo();
            const uc = new DeleteAccount(
                makeUserRepo(),
                makeTransactionRepo(),
                categoryRepo,
                makeRecurringRuleRepo(),
                makeRefreshTokenRepo(),
            );
            await uc.execute({ userId });
            expect(categoryRepo.deleteAllByUser).toHaveBeenCalledWith(userId);
            expect(categoryRepo.deleteAllByUser).toHaveBeenCalledTimes(1);
        });

        it('should call recurringRuleRepo.deleteAllByUser with the correct userId', async () => {
            const recurringRuleRepo = makeRecurringRuleRepo();
            const uc = new DeleteAccount(
                makeUserRepo(),
                makeTransactionRepo(),
                makeCategoryRepo(),
                recurringRuleRepo,
                makeRefreshTokenRepo(),
            );
            await uc.execute({ userId });
            expect(recurringRuleRepo.deleteAllByUser).toHaveBeenCalledWith(userId);
            expect(recurringRuleRepo.deleteAllByUser).toHaveBeenCalledTimes(1);
        });

        it('should call refreshTokenRepo.deleteByUserId with the correct userId', async () => {
            const refreshTokenRepo = makeRefreshTokenRepo();
            const uc = new DeleteAccount(
                makeUserRepo(),
                makeTransactionRepo(),
                makeCategoryRepo(),
                makeRecurringRuleRepo(),
                refreshTokenRepo,
            );
            await uc.execute({ userId });
            expect(refreshTokenRepo.deleteByUserId).toHaveBeenCalledWith(userId);
            expect(refreshTokenRepo.deleteByUserId).toHaveBeenCalledTimes(1);
        });

        it('should call userRepo.delete with the correct userId', async () => {
            const userRepo = makeUserRepo();
            const uc = new DeleteAccount(
                userRepo,
                makeTransactionRepo(),
                makeCategoryRepo(),
                makeRecurringRuleRepo(),
                makeRefreshTokenRepo(),
            );
            await uc.execute({ userId });
            expect(userRepo.delete).toHaveBeenCalledWith(userId);
            expect(userRepo.delete).toHaveBeenCalledTimes(1);
        });

        it('should call all repos exactly once each', async () => {
            const userRepo = makeUserRepo();
            const transactionRepo = makeTransactionRepo();
            const categoryRepo = makeCategoryRepo();
            const recurringRuleRepo = makeRecurringRuleRepo();
            const refreshTokenRepo = makeRefreshTokenRepo();

            const uc = new DeleteAccount(
                userRepo, transactionRepo, categoryRepo, recurringRuleRepo, refreshTokenRepo,
            );
            await uc.execute({ userId });

            expect(userRepo.findById).toHaveBeenCalledTimes(1);
            expect(transactionRepo.deleteAllByUser).toHaveBeenCalledTimes(1);
            expect(categoryRepo.deleteAllByUser).toHaveBeenCalledTimes(1);
            expect(recurringRuleRepo.deleteAllByUser).toHaveBeenCalledTimes(1);
            expect(refreshTokenRepo.deleteByUserId).toHaveBeenCalledTimes(1);
            expect(userRepo.delete).toHaveBeenCalledTimes(1);
        });
    });

    describe('execute – deletion order', () => {
        it('should delete transactions before categories', async () => {
            const callOrder: string[] = [];
            const transactionRepo = makeTransactionRepo({
                deleteAllByUser: jest.fn().mockImplementation(() => {
                    callOrder.push('transactions');
                    return Promise.resolve();
                }),
            });
            const categoryRepo = makeCategoryRepo({
                deleteAllByUser: jest.fn().mockImplementation(() => {
                    callOrder.push('categories');
                    return Promise.resolve();
                }),
            });

            const uc = new DeleteAccount(
                makeUserRepo(), transactionRepo, categoryRepo, makeRecurringRuleRepo(), makeRefreshTokenRepo(),
            );
            await uc.execute({ userId });

            expect(callOrder.indexOf('transactions')).toBeLessThan(callOrder.indexOf('categories'));
        });

        it('should delete categories before user record', async () => {
            const callOrder: string[] = [];
            const categoryRepo = makeCategoryRepo({
                deleteAllByUser: jest.fn().mockImplementation(() => {
                    callOrder.push('categories');
                    return Promise.resolve();
                }),
            });
            const userRepo = makeUserRepo({
                delete: jest.fn().mockImplementation(() => {
                    callOrder.push('user');
                    return Promise.resolve();
                }),
            });

            const uc = new DeleteAccount(
                userRepo, makeTransactionRepo(), categoryRepo, makeRecurringRuleRepo(), makeRefreshTokenRepo(),
            );
            await uc.execute({ userId });

            expect(callOrder.indexOf('categories')).toBeLessThan(callOrder.indexOf('user'));
        });

        it('should revoke refresh tokens before deleting user record', async () => {
            const callOrder: string[] = [];
            const refreshTokenRepo = makeRefreshTokenRepo({
                deleteByUserId: jest.fn().mockImplementation(() => {
                    callOrder.push('tokens');
                    return Promise.resolve();
                }),
            });
            const userRepo = makeUserRepo({
                delete: jest.fn().mockImplementation(() => {
                    callOrder.push('user');
                    return Promise.resolve();
                }),
            });

            const uc = new DeleteAccount(
                userRepo, makeTransactionRepo(), makeCategoryRepo(), makeRecurringRuleRepo(), refreshTokenRepo,
            );
            await uc.execute({ userId });

            expect(callOrder.indexOf('tokens')).toBeLessThan(callOrder.indexOf('user'));
        });
    });

    describe('execute – user not found', () => {
        it('should throw "Usuario no encontrado" when user does not exist', async () => {
            const uc = makeUseCase({ findById: jest.fn().mockResolvedValue(null) });
            await expect(uc.execute({ userId })).rejects.toThrow('Usuario no encontrado');
        });

        it('should not call any delete method when user is not found', async () => {
            const transactionRepo = makeTransactionRepo();
            const categoryRepo = makeCategoryRepo();
            const recurringRuleRepo = makeRecurringRuleRepo();
            const refreshTokenRepo = makeRefreshTokenRepo();
            const userRepo = makeUserRepo({ findById: jest.fn().mockResolvedValue(null) });

            const uc = new DeleteAccount(
                userRepo, transactionRepo, categoryRepo, recurringRuleRepo, refreshTokenRepo,
            );

            await expect(uc.execute({ userId })).rejects.toThrow();

            expect(transactionRepo.deleteAllByUser).not.toHaveBeenCalled();
            expect(categoryRepo.deleteAllByUser).not.toHaveBeenCalled();
            expect(recurringRuleRepo.deleteAllByUser).not.toHaveBeenCalled();
            expect(refreshTokenRepo.deleteByUserId).not.toHaveBeenCalled();
            expect(userRepo.delete).not.toHaveBeenCalled();
        });
    });

    describe('execute – repo errors propagate', () => {
        it('should propagate error if transactionRepo.deleteAllByUser throws', async () => {
            const uc = makeUseCase({}, {
                deleteAllByUser: jest.fn().mockRejectedValue(new Error('DB error')),
            });
            await expect(uc.execute({ userId })).rejects.toThrow('DB error');
        });

        it('should propagate error if categoryRepo.deleteAllByUser throws', async () => {
            const uc = makeUseCase({}, {}, {
                deleteAllByUser: jest.fn().mockRejectedValue(new Error('DB error')),
            });
            await expect(uc.execute({ userId })).rejects.toThrow('DB error');
        });

        it('should propagate error if refreshTokenRepo.deleteByUserId throws', async () => {
            const uc = makeUseCase({}, {}, {}, {}, {
                deleteByUserId: jest.fn().mockRejectedValue(new Error('Token error')),
            });
            await expect(uc.execute({ userId })).rejects.toThrow('Token error');
        });

        it('should propagate error if userRepo.delete throws', async () => {
            const uc = makeUseCase({
                delete: jest.fn().mockRejectedValue(new Error('Delete error')),
            });
            await expect(uc.execute({ userId })).rejects.toThrow('Delete error');
        });
    });
});
