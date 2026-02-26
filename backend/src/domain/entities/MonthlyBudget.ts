export interface MonthlyBudgetProps {
    id: string;
    userId: string;
    year: number;
    month: number; // 1-12
    initialAmount: number;
    createdAt: Date;
    updatedAt: Date;
}

export class MonthlyBudget {
    private constructor(private props: MonthlyBudgetProps) { }

    static create(props: MonthlyBudgetProps): MonthlyBudget {
        if (props.month < 1 || props.month > 12) {
            throw new Error('Month must be between 1 and 12');
        }
        return new MonthlyBudget(props);
    }

    get id(): string { return this.props.id; }
    get userId(): string { return this.props.userId; }
    get year(): number { return this.props.year; }
    get month(): number { return this.props.month; }
    get initialAmount(): number { return this.props.initialAmount; }
    get updatedAt(): Date { return this.props.updatedAt; }

    updateAmount(amount: number): void {
        this.props.initialAmount = amount;
        this.props.updatedAt = new Date();
    }

    /** Returns "YYYY-MM" label */
    get label(): string {
        return `${this.props.year}-${String(this.props.month).padStart(2, '0')}`;
    }

    toJSON() {
        return {
            id: this.props.id,
            userId: this.props.userId,
            year: this.props.year,
            month: this.props.month,
            initialAmount: this.props.initialAmount,
            label: this.label,
        };
    }
}
