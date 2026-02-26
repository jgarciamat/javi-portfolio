import { TransactionId } from '@domain/value-objects/TransactionId';
import { Amount } from '@domain/value-objects/Amount';
import { TransactionType } from '@domain/value-objects/TransactionType';

export interface TransactionProps {
    id: TransactionId;
    description: string;
    amount: Amount;
    type: TransactionType;
    category: string;
    date: Date;
    createdAt: Date;
}

export class Transaction {
    private readonly _id: TransactionId;
    private _description: string;
    private _amount: Amount;
    private _type: TransactionType;
    private _category: string;
    private _date: Date;
    private readonly _createdAt: Date;

    private constructor(props: TransactionProps) {
        this._id = props.id;
        this._description = props.description;
        this._amount = props.amount;
        this._type = props.type;
        this._category = props.category;
        this._date = props.date;
        this._createdAt = props.createdAt;
    }

    static create(props: {
        description: string;
        amount: number;
        type: string;
        category: string;
        date?: Date | string;
    }): Transaction {
        if (!props.description || props.description.trim() === '') {
            throw new Error('Transaction description cannot be empty');
        }
        if (!props.category || props.category.trim() === '') {
            throw new Error('Transaction category cannot be empty');
        }
        const date = props.date ? new Date(props.date) : new Date();
        return new Transaction({
            id: TransactionId.generate(),
            description: props.description.trim(),
            amount: Amount.create(props.amount),
            type: TransactionType.create(props.type),
            category: props.category.trim(),
            date,
            createdAt: new Date(),
        });
    }

    static reconstitute(props: TransactionProps): Transaction {
        return new Transaction(props);
    }

    get id(): TransactionId {
        return this._id;
    }

    get description(): string {
        return this._description;
    }

    get amount(): Amount {
        return this._amount;
    }

    get type(): TransactionType {
        return this._type;
    }

    get category(): string {
        return this._category;
    }

    get date(): Date {
        return this._date;
    }

    get createdAt(): Date {
        return this._createdAt;
    }

    toJSON() {
        return {
            id: this._id.value,
            description: this._description,
            amount: this._amount.value,
            type: this._type.value,
            category: this._category,
            date: this._date.toISOString(),
            createdAt: this._createdAt.toISOString(),
        };
    }
}
