import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';

export class DeleteTransaction {
    constructor(private readonly transactionRepository: ITransactionRepository) { }

    async execute(id: string): Promise<void> {
        const transaction = await this.transactionRepository.findById(id);
        if (!transaction) {
            throw new Error(`Transaction with id ${id} not found`);
        }
        await this.transactionRepository.delete(id);
    }
}
