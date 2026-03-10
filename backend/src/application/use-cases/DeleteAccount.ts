import { IUserRepository } from '@domain/repositories/IUserRepository';
import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';
import { ICategoryRepository } from '@domain/repositories/ICategoryRepository';
import { IRecurringRuleRepository } from '@domain/repositories/IRecurringRuleRepository';
import { IRefreshTokenRepository } from '@domain/repositories/IRefreshTokenRepository';

export interface DeleteAccountDTO {
    userId: string;
}

/**
 * Permanently deletes a user account and all associated data:
 * transactions, categories, recurring rules, refresh tokens, and the user record itself.
 *
 * Order matters: delete child data before the user row to respect FK constraints.
 */
export class DeleteAccount {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly transactionRepo: ITransactionRepository,
        private readonly categoryRepo: ICategoryRepository,
        private readonly recurringRuleRepo: IRecurringRuleRepository,
        private readonly refreshTokenRepo: IRefreshTokenRepository,
    ) { }

    async execute({ userId }: DeleteAccountDTO): Promise<void> {
        const user = await this.userRepo.findById(userId);
        if (!user) throw new Error('Usuario no encontrado');

        // 1. Delete all transactions for the user
        await this.transactionRepo.deleteAllByUser(userId);

        // 2. Delete all categories for the user
        await this.categoryRepo.deleteAllByUser(userId);

        // 3. Delete all recurring rules for the user
        this.recurringRuleRepo.deleteAllByUser(userId);

        // 4. Revoke all refresh tokens (invalidates all sessions)
        await this.refreshTokenRepo.deleteByUserId(userId);

        // 5. Delete the user record itself
        await this.userRepo.delete(userId);
    }
}
