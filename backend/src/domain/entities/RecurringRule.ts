import { v4 as uuidv4 } from 'uuid';

export type RecurringFrequency = 'monthly' | 'bimonthly';
export type RecurringType = 'INCOME' | 'EXPENSE' | 'SAVING';

export interface RecurringRuleProps {
    id: string;
    userId: string;
    description: string;
    amount: number;
    type: RecurringType;
    category: string;
    startYear: number;
    startMonth: number;
    endYear: number | null;
    endMonth: number | null;
    frequency: RecurringFrequency;
    active: boolean;
    createdAt: Date;
}

export class RecurringRule {
    private constructor(private readonly props: RecurringRuleProps) { }

    static create(raw: {
        userId: string;
        description: string;
        amount: number;
        type: string;
        category: string;
        startYear: number;
        startMonth: number;
        endYear?: number | null;
        endMonth?: number | null;
        frequency?: RecurringFrequency;
        active?: boolean;
    }): RecurringRule {
        if (!raw.description || raw.description.trim() === '') {
            throw new Error('RecurringRule description cannot be empty');
        }
        if (typeof raw.amount !== 'number' || raw.amount <= 0) {
            throw new Error('RecurringRule amount must be a positive number');
        }
        if (!raw.category || raw.category.trim() === '') {
            throw new Error('RecurringRule category cannot be empty');
        }
        const validTypes: RecurringType[] = ['INCOME', 'EXPENSE', 'SAVING'];
        const type = raw.type?.toUpperCase() as RecurringType;
        if (!validTypes.includes(type)) {
            throw new Error(`RecurringRule type must be one of: ${validTypes.join(', ')}`);
        }

        if (raw.startMonth < 1 || raw.startMonth > 12) {
            throw new Error('startMonth must be between 1 and 12');
        }
        if (raw.endYear !== undefined && raw.endYear !== null && raw.endMonth !== undefined && raw.endMonth !== null) {
            const startOrd = raw.startYear * 12 + raw.startMonth;
            const endOrd = raw.endYear * 12 + raw.endMonth;
            if (endOrd < startOrd) {
                throw new Error('End date cannot be before start date');
            }
        }

        const frequency = raw.frequency ?? 'monthly';

        return new RecurringRule({
            id: uuidv4(),
            userId: raw.userId,
            description: raw.description.trim(),
            amount: raw.amount,
            type,
            category: raw.category.trim(),
            startYear: raw.startYear,
            startMonth: raw.startMonth,
            endYear: raw.endYear ?? null,
            endMonth: raw.endMonth ?? null,
            frequency,
            active: raw.active ?? true,
            createdAt: new Date(),
        });
    }

    static reconstitute(props: RecurringRuleProps): RecurringRule {
        return new RecurringRule(props);
    }

    /** True if this rule should fire in the given year/month */
    appliesTo(year: number, month: number): boolean {
        if (!this.props.active) return false;

        const targetOrd = year * 12 + month;
        const startOrd = this.props.startYear * 12 + this.props.startMonth;

        if (targetOrd < startOrd) return false;

        if (this.props.endYear !== null && this.props.endMonth !== null) {
            const endOrd = this.props.endYear * 12 + this.props.endMonth;
            if (targetOrd > endOrd) return false;
        }

        if (this.props.frequency === 'bimonthly') {
            const elapsed = targetOrd - startOrd;
            return elapsed % 2 === 0;
        }

        return true;
    }

    toJSON() {
        return {
            id: this.props.id,
            userId: this.props.userId,
            description: this.props.description,
            amount: this.props.amount,
            type: this.props.type,
            category: this.props.category,
            startYear: this.props.startYear,
            startMonth: this.props.startMonth,
            endYear: this.props.endYear,
            endMonth: this.props.endMonth,
            frequency: this.props.frequency,
            active: this.props.active,
            createdAt: this.props.createdAt.toISOString(),
        };
    }

    get id() { return this.props.id; }
    get userId() { return this.props.userId; }
    get description() { return this.props.description; }
    get amount() { return this.props.amount; }
    get type() { return this.props.type; }
    get category() { return this.props.category; }
    get startYear() { return this.props.startYear; }
    get startMonth() { return this.props.startMonth; }
    get endYear() { return this.props.endYear; }
    get endMonth() { return this.props.endMonth; }
    get frequency() { return this.props.frequency; }
    get active() { return this.props.active; }
    get createdAt() { return this.props.createdAt; }
}
