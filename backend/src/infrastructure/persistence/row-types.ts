/** Raw SQLite row shapes — used to type `db.prepare(...).get()` results */

export interface UserRow {
    id: string;
    email: string;
    name: string;
    password_hash: string;
    created_at: string;
    email_verified: number;
    verification_token: string | null;
    avatar_url: string | null;
    reset_token: string | null;
    reset_token_expires_at: string | null;
    reset_email_sent: number;
}

export interface TransactionRow {
    id: string;
    user_id: string;
    year: number;
    month: number;
    description: string;
    amount: number;
    type: string;
    category: string;
    date: string;
    created_at: string;
    notes: string | null;
}

export interface CategoryRow {
    id: string;
    user_id: string;
    name: string;
    color: string;
    icon: string;
}

export interface MonthlyBudgetRow {
    id: string;
    user_id: string;
    year: number;
    month: number;
    initial_amount: number;
    created_at: string;
    updated_at: string;
}

export interface CountRow {
    n: number;
}

export interface BalanceRow {
    balance: number;
}

export interface SqlMasterRow {
    sql: string;
}

export interface RecurringRuleRow {
    id: string;
    user_id: string;
    description: string;
    amount: number;
    type: string;
    category: string;
    start_year: number;
    start_month: number;
    end_year: number | null;
    end_month: number | null;
    frequency: string;
    active: number;
    created_at: string;
}

export interface CustomAlertRow {
    id: string;
    user_id: string;
    name: string;
    metric: string;
    operator: string;
    threshold: number;
    category: string | null;
    active: number;
    created_at: string;
}
