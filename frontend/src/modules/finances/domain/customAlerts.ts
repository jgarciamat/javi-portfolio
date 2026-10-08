import type {
  CustomAlert,
  CustomAlertMetric,
  CustomAlertOperator,
  FinancialSummary,
} from './types';

export interface AlertEvalInput {
  totalExpenses: number;
  totalIncome: number;
  totalSaving: number;
  balance: number;
  carryover: number;
  expensesByCategory: Record<string, number>;
}

export interface TriggeredAlert {
  alert: CustomAlert;
  currentValue: number;
}

export type MetricUnit = 'percent' | 'money';

export interface MetricMeta {
  value: CustomAlertMetric;
  /** Needs a category to be evaluated. */
  byCategory: boolean;
  unit: MetricUnit;
  labelKey: string;
  /** Banner message key; `.gte` / `.lte` is appended. */
  bannerKey: string;
}

const meta = (value: CustomAlertMetric, bannerKey: string, byCategory = false): MetricMeta => ({
  value,
  byCategory,
  unit: value.endsWith('_pct') ? 'percent' : 'money',
  labelKey: `app.customAlerts.metric.${value}`,
  bannerKey: `app.customAlerts.banner.${bannerKey}`,
});

/** Every metric, in the order the form lists them. */
export const ALERT_METRICS: MetricMeta[] = [
  meta('expenses_pct', 'expensesPct'),
  meta('saving_pct', 'savingPct'),
  meta('balance_pct', 'balancePct'),
  meta('balance_amount', 'balanceAmount'),
  meta('income_pct', 'incomePct'),
  meta('category_pct', 'categoryPct', true),
  meta('category_amount', 'categoryAmount', true),
];

export const ALERT_OPERATORS: CustomAlertOperator[] = ['gte', 'lte'];

export function metricMeta(metric: CustomAlertMetric): MetricMeta {
  return ALERT_METRICS.find((m) => m.value === metric) ?? ALERT_METRICS[0];
}

export const isCategoryMetric = (metric: CustomAlertMetric): boolean =>
  metricMeta(metric).byCategory;

type MetricComputer = (alert: CustomAlert, input: AlertEvalInput) => number | null;

const percentOf = (part: number, total: number): number | null =>
  total > 0 ? (part / total) * 100 : null;

const available = (i: AlertEvalInput): number => i.carryover + i.totalIncome;

const METRIC_COMPUTERS: Record<CustomAlertMetric, MetricComputer> = {
  expenses_pct: (_a, i) => percentOf(i.totalExpenses, available(i)),
  income_pct: (_a, i) => percentOf(i.totalIncome, i.carryover),
  saving_pct: (_a, i) => percentOf(i.totalSaving, i.totalIncome),
  balance_pct: (_a, i) => percentOf(i.balance, available(i)),
  balance_amount: (_a, i) => i.balance,
  category_pct: (a, i) =>
    a.category ? percentOf(i.expensesByCategory[a.category] ?? 0, available(i)) : null,
  category_amount: (a, i) => (a.category ? i.expensesByCategory[a.category] ?? 0 : null),
};

/** Figures of the month the alerts are evaluated against. */
export function alertInput(
  summary: Pick<
    FinancialSummary,
    'totalExpenses' | 'totalIncome' | 'totalSaving' | 'balance' | 'expensesByCategory'
  > | null,
  carryover: number | null
): AlertEvalInput {
  return {
    totalExpenses: summary?.totalExpenses ?? 0,
    totalIncome: summary?.totalIncome ?? 0,
    totalSaving: summary?.totalSaving ?? 0,
    balance: summary?.balance ?? 0,
    carryover: carryover ?? 0,
    expensesByCategory: summary?.expensesByCategory ?? {},
  };
}

/** Active alerts whose condition holds for `input`, with the value that triggered them. */
export function evaluateAlerts(alerts: CustomAlert[], input: AlertEvalInput): TriggeredAlert[] {
  return alerts.flatMap((alert) => {
    const compute = METRIC_COMPUTERS[alert.metric];
    if (!alert.active || !compute) return [];
    const currentValue = compute(alert, input);
    if (currentValue === null) return [];
    const triggered =
      alert.operator === 'gte' ? currentValue >= alert.threshold : currentValue <= alert.threshold;
    return triggered ? [{ alert, currentValue }] : [];
  });
}
