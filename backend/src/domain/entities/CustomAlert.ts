import { v4 as uuidv4 } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CustomAlertMetric =
    | 'expenses_pct'      // total expenses as % of available balance
    | 'income_pct'        // total income as % of previous month income (future)
    | 'saving_pct'        // total saving as % of income
    | 'balance_pct'       // balance as % of income
    | 'balance_amount'    // balance drops below a fixed amount (€)
    | 'category_pct'      // expenses in a category as % of available balance
    | 'category_amount';  // expenses in a category in absolute € amount

export type CustomAlertOperator = 'gte' | 'lte';

export interface CustomAlertProps {
    id: string;
    userId: string;
    name: string;
    metric: CustomAlertMetric;
    operator: CustomAlertOperator;
    threshold: number;        // % or €
    category: string | null;  // only for category_pct / category_amount
    color: string;            // hex color for the notification banner
    active: boolean;
    createdAt: Date;
}

const VALID_METRICS: CustomAlertMetric[] = [
    'expenses_pct',
    'income_pct',
    'saving_pct',
    'balance_pct',
    'balance_amount',
    'category_pct',
    'category_amount',
];

const VALID_OPERATORS: CustomAlertOperator[] = ['gte', 'lte'];

// ─── Entity ───────────────────────────────────────────────────────────────────

export class CustomAlert {
    private constructor(private readonly props: CustomAlertProps) { }

    // ── Factories ──────────────────────────────────────────────────────────────

    static create(raw: {
        userId: string;
        name: string;
        metric: string;
        operator: string;
        threshold: number;
        category?: string | null;
        color?: string;
        active?: boolean;
    }): CustomAlert {
        if (!raw.name || raw.name.trim() === '') {
            throw new Error('CustomAlert name cannot be empty');
        }
        if (!VALID_METRICS.includes(raw.metric as CustomAlertMetric)) {
            throw new Error(`CustomAlert metric must be one of: ${VALID_METRICS.join(', ')}`);
        }
        if (!VALID_OPERATORS.includes(raw.operator as CustomAlertOperator)) {
            throw new Error(`CustomAlert operator must be one of: ${VALID_OPERATORS.join(', ')}`);
        }
        if (typeof raw.threshold !== 'number' || isNaN(raw.threshold)) {
            throw new Error('CustomAlert threshold must be a number');
        }
        if (raw.threshold < 0) {
            throw new Error('CustomAlert threshold must be non-negative');
        }
        const needsCategory = raw.metric === 'category_pct' || raw.metric === 'category_amount';
        if (needsCategory && (!raw.category || raw.category.trim() === '')) {
            throw new Error(`CustomAlert category is required for ${raw.metric} metric`);
        }

        const color = raw.color?.trim() ?? '#6366f1';
        if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
            throw new Error('CustomAlert color must be a valid hex color (e.g. #6366f1)');
        }

        return new CustomAlert({
            id: uuidv4(),
            userId: raw.userId,
            name: raw.name.trim(),
            metric: raw.metric as CustomAlertMetric,
            operator: raw.operator as CustomAlertOperator,
            threshold: raw.threshold,
            category: needsCategory ? (raw.category ?? '').trim() : null,
            color,
            active: raw.active ?? true,
            createdAt: new Date(),
        });
    }

    static reconstitute(props: CustomAlertProps): CustomAlert {
        return new CustomAlert(props);
    }

    // ── Getters ────────────────────────────────────────────────────────────────

    get id(): string { return this.props.id; }
    get userId(): string { return this.props.userId; }
    get name(): string { return this.props.name; }
    get metric(): CustomAlertMetric { return this.props.metric; }
    get operator(): CustomAlertOperator { return this.props.operator; }
    get threshold(): number { return this.props.threshold; }
    get category(): string | null { return this.props.category; }
    get color(): string { return this.props.color; }
    get active(): boolean { return this.props.active; }
    get createdAt(): Date { return this.props.createdAt; }

    // ── Behaviour ──────────────────────────────────────────────────────────────

    withActive(active: boolean): CustomAlert {
        return new CustomAlert({ ...this.props, active });
    }

    withProps(changes: Partial<Pick<CustomAlertProps, 'name' | 'metric' | 'operator' | 'threshold' | 'category' | 'color' | 'active'>>): CustomAlert {
        return new CustomAlert({ ...this.props, ...changes });
    }

    toJSON(): Omit<CustomAlertProps, 'createdAt'> & { createdAt: string } {
        return {
            ...this.props,
            createdAt: this.props.createdAt.toISOString(),
        };
    }
}
