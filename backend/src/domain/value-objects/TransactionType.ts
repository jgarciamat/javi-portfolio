export type TransactionTypeValue = 'INCOME' | 'EXPENSE' | 'SAVING';

export class TransactionType {
    private readonly _value: TransactionTypeValue;

    private constructor(value: TransactionTypeValue) {
        this._value = value;
    }

    static create(value: string): TransactionType {
        if (!value || value.trim() === '') {
            throw new Error('TransactionType cannot be empty');
        }
        const upper = value.toUpperCase();
        if (!TransactionType.isValid(upper)) {
            throw new Error(`Invalid transaction type: ${value}. Must be INCOME, EXPENSE or SAVING`);
        }
        return new TransactionType(upper as TransactionTypeValue);
    }

    static income(): TransactionType {
        return new TransactionType('INCOME');
    }

    static expense(): TransactionType {
        return new TransactionType('EXPENSE');
    }

    static saving(): TransactionType {
        return new TransactionType('SAVING');
    }

    private static isValid(value: string): value is TransactionTypeValue {
        return ['INCOME', 'EXPENSE', 'SAVING'].includes(value);
    }

    get value(): TransactionTypeValue {
        return this._value;
    }

    isIncome(): boolean {
        return this._value === 'INCOME';
    }

    isExpense(): boolean {
        return this._value === 'EXPENSE';
    }

    isSaving(): boolean {
        return this._value === 'SAVING';
    }

    equals(other: TransactionType): boolean {
        return this._value === other._value;
    }

    toString(): string {
        return this._value;
    }
}
