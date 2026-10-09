import type {
  Account,
  AccountInput,
  AIAdvice,
  Forecast,
  AnnualSummary,
  Category,
  CategoryBudget,
  CategoryTrend,
  CreateCategoryDTO,
  CreateCustomAlertDTO,
  CreateRecurringRuleDTO,
  CreateTransactionDTO,
  CustomAlert,
  Goal,
  GoalInput,
  ImportResult,
  ImportRowDTO,
  MonthOverview,
  NetWorthPoint,
  RecurringRule,
  SettingsChanges,
  Transaction,
  TransactionSearchFilters,
  TransactionSearchResult,
  Transfer,
  TransferInput,
  UpdateCustomAlertDTO,
  UpdateRecurringRuleDTO,
  UpdateTransactionDTO,
  UserSettings,
} from '@modules/finances/domain/types';
import { apiRequest, jsonBody, query } from './http';

export const monthApi = {
  /** Everything the month screen needs: movements, summary, carry-over, budgets and alerts. */
  get(year: number, month: number) {
    return apiRequest<MonthOverview>(`/months/${year}/${month}`);
  },
};

export const transactionApi = {
  create(dto: CreateTransactionDTO) {
    return apiRequest<Transaction>('/transactions', { method: 'POST', body: jsonBody(dto) });
  },
  update(id: string, dto: UpdateTransactionDTO) {
    return apiRequest<Transaction>(`/transactions/${id}`, { method: 'PUT', body: jsonBody(dto) });
  },
  patch(id: string, changes: { notes?: string | null }) {
    return apiRequest<Transaction>(`/transactions/${id}`, {
      method: 'PATCH',
      body: jsonBody(changes),
    });
  },
  delete(id: string) {
    return apiRequest<void>(`/transactions/${id}`, { method: 'DELETE' });
  },
  search(filters: TransactionSearchFilters) {
    return apiRequest<TransactionSearchResult>(
      `/transactions/search${query({ ...filters, categoryIds: filters.categoryIds })}`
    );
  },
  getAnnual(year: number) {
    return apiRequest<AnnualSummary>(`/transactions/annual/${year}`);
  },
  import(rows: ImportRowDTO[], options: { accountId?: string | null; dryRun?: boolean }) {
    return apiRequest<ImportResult>('/transactions/import', {
      method: 'POST',
      body: jsonBody({ rows, ...options }),
    });
  },
};

export const categoryApi = {
  getAll() {
    return apiRequest<Category[]>('/categories');
  },
  create(dto: CreateCategoryDTO) {
    return apiRequest<Category>('/categories', { method: 'POST', body: jsonBody(dto) });
  },
  update(id: string, dto: Partial<CreateCategoryDTO>) {
    return apiRequest<Category>(`/categories/${id}`, { method: 'PATCH', body: jsonBody(dto) });
  },
  /** If the category is in use, `reassignTo` says where its movements, rules… go. */
  delete(id: string, reassignTo?: string) {
    return apiRequest<void>(`/categories/${id}${query({ reassignTo })}`, { method: 'DELETE' });
  },
};

export const recurringApi = {
  getAll() {
    return apiRequest<RecurringRule[]>('/recurring-rules');
  },
  create(dto: CreateRecurringRuleDTO) {
    return apiRequest<RecurringRule>('/recurring-rules', { method: 'POST', body: jsonBody(dto) });
  },
  update(id: string, dto: UpdateRecurringRuleDTO) {
    return apiRequest<RecurringRule>(`/recurring-rules/${id}`, {
      method: 'PATCH',
      body: jsonBody(dto),
    });
  },
  delete(id: string, scope: 'none' | 'from_current' | 'all' = 'none') {
    return apiRequest<void>(`/recurring-rules/${id}?scope=${scope}`, { method: 'DELETE' });
  },
};

export const customAlertApi = {
  getAll() {
    return apiRequest<CustomAlert[]>('/custom-alerts');
  },
  create(dto: CreateCustomAlertDTO) {
    return apiRequest<CustomAlert>('/custom-alerts', { method: 'POST', body: jsonBody(dto) });
  },
  update(id: string, dto: UpdateCustomAlertDTO) {
    return apiRequest<CustomAlert>(`/custom-alerts/${id}`, {
      method: 'PATCH',
      body: jsonBody(dto),
    });
  },
  delete(id: string) {
    return apiRequest<void>(`/custom-alerts/${id}`, { method: 'DELETE' });
  },
};

export const accountApi = {
  getAll() {
    return apiRequest<{ accounts: Account[]; total: number }>('/accounts');
  },
  create(dto: AccountInput) {
    return apiRequest<Account[]>('/accounts', { method: 'POST', body: jsonBody(dto) });
  },
  update(id: string, dto: Partial<AccountInput>) {
    return apiRequest<Account[]>(`/accounts/${id}`, { method: 'PATCH', body: jsonBody(dto) });
  },
  delete(id: string) {
    return apiRequest<void>(`/accounts/${id}`, { method: 'DELETE' });
  },
  transfers() {
    return apiRequest<Transfer[]>('/transfers');
  },
  createTransfer(dto: TransferInput) {
    return apiRequest<Transfer>('/transfers', { method: 'POST', body: jsonBody(dto) });
  },
  deleteTransfer(id: string) {
    return apiRequest<void>(`/transfers/${id}`, { method: 'DELETE' });
  },
};

export const budgetApi = {
  getAll() {
    return apiRequest<CategoryBudget[]>('/budgets');
  },
  /** Creates or replaces the monthly limit of a category. */
  set(categoryId: string, amount: number) {
    return apiRequest<CategoryBudget>('/budgets', {
      method: 'PUT',
      body: jsonBody({ categoryId, amount }),
    });
  },
  delete(id: string) {
    return apiRequest<void>(`/budgets/${id}`, { method: 'DELETE' });
  },
};

export const goalApi = {
  getAll() {
    return apiRequest<Goal[]>('/goals');
  },
  create(dto: GoalInput) {
    return apiRequest<Goal>('/goals', { method: 'POST', body: jsonBody(dto) });
  },
  update(id: string, dto: GoalInput) {
    return apiRequest<Goal>(`/goals/${id}`, { method: 'PATCH', body: jsonBody(dto) });
  },
  delete(id: string) {
    return apiRequest<void>(`/goals/${id}`, { method: 'DELETE' });
  },
};

export const settingsApi = {
  get() {
    return apiRequest<UserSettings>('/settings');
  },
  update(changes: SettingsChanges) {
    return apiRequest<UserSettings>('/settings', { method: 'PATCH', body: jsonBody(changes) });
  },
};

export const insightsApi = {
  trends(year: number, month: number) {
    return apiRequest<{ year: number; month: number; categories: CategoryTrend[] }>(
      `/stats/trends/${year}/${month}`
    );
  },
  netWorth(months = 12) {
    return apiRequest<NetWorthPoint[]>(`/stats/net-worth${query({ months })}`);
  },
  forecast(months = 6, exclude: string[] = []) {
    return apiRequest<Forecast>(
      `/stats/forecast${query({
        months,
        ...(exclude.length > 0 ? { exclude: exclude.join(',') } : {}),
      })}`
    );
  },
  advice(year: number, month: number, locale: string) {
    return apiRequest<AIAdvice>('/ai/advice', {
      method: 'POST',
      body: jsonBody({ year, month, locale }),
    });
  },
};

export const dataApi = {
  /** Every piece of stored data about the user (GDPR portability). */
  exportAll() {
    return apiRequest<Record<string, unknown>>('/export');
  },
};
