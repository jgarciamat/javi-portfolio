import type {
  Account,
  AccountInput,
  AIAdvice,
  AIAnswer,
  AnnualReport,
  Forecast,
  SubscriptionReport,
  AnnualSummary,
  Asset,
  AssetKind,
  BusinessCategory,
  SplitGroup,
  SplitGroupSummary,
  VatRate,
  AutonomoCloudCopy,
  AutonomoDraft,
  AutonomoInputs,
  YearTax,
  Category,
  CategoryBudget,
  CategoryRule,
  Inbox,
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
  import(
    rows: ImportRowDTO[],
    options: {
      accountId?: string | null;
      dryRun?: boolean;
      useAi?: boolean;
      /** Payments read from bank notifications (Premium) instead of a bank statement. */
      source?: 'statement' | 'capture';
    }
  ) {
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

export const rentaApi = {
  /** Asked before reading a tax return draft (refused with a 402 when it is not included). */
  draft() {
    return apiRequest<unknown>('/renta/draft', { method: 'POST' });
  },
  /** Counts a calculation of the income tax return calculator (refused with a 402 when the plan has no more). */
  register() {
    return apiRequest<{ used: number }>('/renta/calculation', { method: 'POST' });
  },
};

export const inboxApi = {
  get() {
    return apiRequest<Inbox>('/inbox');
  },
  /** A new address: the old one stops working. */
  rotate() {
    return apiRequest<Inbox>('/inbox/rotate', { method: 'POST' });
  },
};

export const categoryRuleApi = {
  getAll() {
    return apiRequest<CategoryRule[]>('/category-rules');
  },
  add(pattern: string, categoryId: string) {
    return apiRequest<CategoryRule>('/category-rules', {
      method: 'POST',
      body: jsonBody({ pattern, categoryId }),
    });
  },
  remove(id: string) {
    return apiRequest<void>(`/category-rules/${id}`, { method: 'DELETE' });
  },
  /** The merchant text of a description and the category a rule already gives it. */
  suggest(description: string) {
    return apiRequest<{ pattern: string; categoryId: string | null }>(
      `/category-rules/suggest${query({ description })}`
    );
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
  /** With a period, the balances at its end (the same moment as that month's available money). */
  getAll(period?: { year: number; month: number }) {
    const query = period ? `?year=${period.year}&month=${period.month}` : '';
    return apiRequest<{ accounts: Account[]; total: number }>(`/accounts${query}`);
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

export const ratesApi = {
  /** Reference rate: how many `to` one `from` is worth. */
  get(from: string, to: string) {
    return apiRequest<{ from: string; to: string; rate: number }>(`/rates${query({ from, to })}`);
  },
};

export const pushApi = {
  /** Whether the server can send push notifications and the key to subscribe with. */
  key() {
    return apiRequest<{ enabled: boolean; publicKey: string | null }>('/push/key');
  },
  subscribe(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    return apiRequest<void>('/push/subscribe', {
      method: 'POST',
      body: jsonBody(subscription),
    });
  },
  unsubscribe(endpoint: string) {
    return apiRequest<void>('/push/unsubscribe', { method: 'POST', body: jsonBody({ endpoint }) });
  },
  test() {
    return apiRequest<{ sent: number }>('/push/test', { method: 'POST' });
  },
};

export const splitApi = {
  list() {
    return apiRequest<SplitGroupSummary[]>('/splits');
  },
  create(name: string, members: string[]) {
    return apiRequest<SplitGroup>('/splits', { method: 'POST', body: jsonBody({ name, members }) });
  },
  get(id: string) {
    return apiRequest<SplitGroup>(`/splits/${id}`);
  },
  remove(id: string) {
    return apiRequest<void>(`/splits/${id}`, { method: 'DELETE' });
  },
  addExpense(
    id: string,
    expense: { description: string; amount: number; paidBy: string; participants?: string[] }
  ) {
    return apiRequest<SplitGroup>(`/splits/${id}/expenses`, {
      method: 'POST',
      body: jsonBody(expense),
    });
  },
  settle(id: string, payment: { from: string; to: string; amount: number }) {
    return apiRequest<SplitGroup>(`/splits/${id}/settlements`, {
      method: 'POST',
      body: jsonBody(payment),
    });
  },
  removeExpense(id: string, expenseId: string) {
    return apiRequest<SplitGroup>(`/splits/${id}/expenses/${expenseId}`, { method: 'DELETE' });
  },
};

export const businessApi = {
  categories() {
    return apiRequest<BusinessCategory[]>('/business/categories');
  },
  setCategory(categoryId: string, vatRate: VatRate) {
    return apiRequest<void>(`/business/categories/${categoryId}`, {
      method: 'PUT',
      body: jsonBody({ vatRate }),
    });
  },
  removeCategory(categoryId: string) {
    return apiRequest<void>(`/business/categories/${categoryId}`, { method: 'DELETE' });
  },
  tax(year: number) {
    return apiRequest<YearTax>(`/business/tax/${year}`);
  },
  /** Prepares the draft of a quarter (the free plan has one; a 402 opens the plans). */
  draft(year: number, quarter: 1 | 2 | 3 | 4, inputs: AutonomoInputs) {
    return apiRequest<AutonomoDraft>('/business/draft', {
      method: 'POST',
      body: jsonBody({ year, quarter, inputs }),
    });
  },
  /** Counts a draft downloaded as a PDF (the free plan has one; a 402 opens the plans). */
  recordPdf() {
    return apiRequest<{ used: number }>('/business/draft/pdf', { method: 'POST' });
  },
  /** The form saved in the account (null when there is none). */
  data() {
    return apiRequest<AutonomoCloudCopy | null>('/business/data');
  },
  /** Saves the form; a 409 says the account has a newer copy than `baseVersion`. */
  saveData(data: unknown, baseVersion: number | null) {
    return apiRequest<{ version: number; updatedAt: string }>('/business/data', {
      method: 'PUT',
      body: jsonBody({ data, baseVersion }),
    });
  },
  deleteData() {
    return apiRequest<void>('/business/data', { method: 'DELETE' });
  },
};

export const assetApi = {
  getAll() {
    return apiRequest<Asset[]>('/assets');
  },
  create(input: {
    name: string;
    kind: AssetKind;
    value: number;
    date?: string;
    interestRate?: number | null;
    minPayment?: number | null;
  }) {
    return apiRequest<Asset>('/assets', { method: 'POST', body: jsonBody(input) });
  },
  /** Records what the asset is worth now (or on `date`). */
  setValue(id: string, value: number, date?: string) {
    return apiRequest<Asset>(`/assets/${id}/values`, {
      method: 'POST',
      body: jsonBody({ value, date }),
    });
  },
  /** Interest rate and minimum payment of a debt. */
  setTerms(id: string, terms: { interestRate: number | null; minPayment: number | null }) {
    return apiRequest<Asset>(`/assets/${id}/terms`, {
      method: 'PATCH',
      body: jsonBody(terms),
    });
  },
  remove(id: string) {
    return apiRequest<void>(`/assets/${id}`, { method: 'DELETE' });
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
  report(year: number) {
    return apiRequest<AnnualReport>(`/stats/report/${year}`);
  },
  ask(question: string, locale: string) {
    return apiRequest<AIAnswer>('/ai/ask', {
      method: 'POST',
      body: jsonBody({ question, locale }),
    });
  },
  subscriptions() {
    return apiRequest<SubscriptionReport>('/stats/subscriptions');
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
