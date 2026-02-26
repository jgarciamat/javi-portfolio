/** Raw SQLite row shapes — used to type `db.prepare(...).get()` results */

export interface UserRow {
    id: string;
    email: string;
    name: string;
    password_hash: string;
    created_at: string;
    email_verified: number;
    verification_token: string | null;
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
