export class Amount {
    private readonly _value: number;

    private constructor(value: number) {
        this._value = value;
    }

    static create(value: number): Amount {
        if (value === null || value === undefined) {
            throw new Error('Amount cannot be null or undefined');
        }
        if (typeof value !== 'number' || isNaN(value)) {
            throw new Error('Amount must be a valid number');
        }
        if (value < 0) {
            throw new Error('Amount cannot be negative');
        }
        return new Amount(Math.round(value * 100) / 100);
    }

    get value(): number {
        return this._value;
    }

    add(other: Amount): Amount {
        return Amount.create(this._value + other._value);
    }

    subtract(other: Amount): Amount {
        return Amount.create(this._value - other._value);
    }

    equals(other: Amount): boolean {
        return this._value === other._value;
    }

    toString(): string {
        return this._value.toFixed(2);
    }
}
