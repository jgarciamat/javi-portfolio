import { v4 as uuidv4 } from 'uuid';

export class TransactionId {
    private readonly _value: string;

    private constructor(value: string) {
        this._value = value;
    }

    static create(value: string): TransactionId {
        if (!value || value.trim() === '') {
            throw new Error('TransactionId cannot be empty');
        }
        return new TransactionId(value);
    }

    static generate(): TransactionId {
        return new TransactionId(uuidv4());
    }

    get value(): string {
        return this._value;
    }

    equals(other: TransactionId): boolean {
        return this._value === other._value;
    }

    toString(): string {
        return this._value;
    }
}
