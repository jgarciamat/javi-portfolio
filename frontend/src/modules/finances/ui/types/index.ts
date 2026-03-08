// ── Types ────────────────────────────────────────────────────────────────────
export type { AnnualChartProps, TooltipState, AnnualMonthEntry, AnnualChartTotals, AnnualChartData, MonthData, AnnualMonthTableProps } from './AnnualChart.types';
export type { AIAdvisorProps, AIAdviceContentProps } from './AIAdvisor.types';
export type { BankSyncProps, BankSyncBodyProps } from './BankSync.types';
export type { BudgetAlertsProps } from './BudgetAlerts.types';
export type { CategoryChartProps, BarChartProps } from './CategoryChart.types';
export type { CategoryManagerProps, EmojiGroup } from './CategoryManager.types';
export type { DeleteScope, VisibleScope, DeleteRuleModalProps } from './DeleteRuleModal.types';
export type { EditTransactionModalProps } from './EditTransactionModal.types';
export type { MonthlyViewProps } from './MonthlyView.types';
export type { SummaryCardsProps } from './SummaryCards.types';
export type { TransactionFormProps, TransactionFormFieldsProps } from './TransactionForm.types';
export type { TransactionTableProps, DayGroup } from './TransactionTable.types';
export type { FormState as RecurringFormState } from './RecurringRulesTab.types';

// ── Constants & utils ────────────────────────────────────────────────────────
export { MONTH_SHORT, fmtCurrency, buildAnnualChartData } from './AnnualChart.types';
export { buildCooldownText } from './AIAdvisor.types';
export { EMOJI_GROUPS, CATEGORY_COLORS } from './CategoryManager.types';
export { formatCurrency as formatCurrencyChart } from './CategoryChart.types';
export { formatCurrency, formatDate, txBadgeClass, txAmountColor, txDayKey, formatDayLabel, groupByDay, isoToDateInput } from './TransactionTable.types';
export { formatCurrency as formatCurrencyCards } from './SummaryCards.types';
export { MONTH_NAMES } from './Dashboard.types';
export { TYPE_CLASS, EMPTY_FORM, ruleToForm, validateRecurringForm, buildRecurringDto } from './RecurringRulesTab.types';
