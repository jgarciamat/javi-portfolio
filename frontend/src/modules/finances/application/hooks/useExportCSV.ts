import type {
  AnnualReport,
  FinancialSummary,
  MonthData,
  Transaction,
} from '@modules/finances/domain/types';
import { TYPE_LABEL_KEYS } from '@modules/finances/domain/transactionTypes';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { todayDateOnly } from '@shared/utils/format';

/**
 * Wraps a cell in double quotes, escaping inner quotes. Text starting with
 * = + - @ is prefixed with ' so spreadsheet apps never evaluate it as a formula.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (typeof value === 'number') return `"${value}"`;
  let str = value ?? '';
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return `"${str.replace(/"/g, '""')}"`;
}

const toCSV = (rows: string[][]): string => rows.map((r) => r.join(',')).join('\r\n');
const round2 = (n: number) => Math.round(n * 100) / 100;
const CSV_TYPE = 'text/csv;charset=utf-8;';

export function downloadFile(content: string, filename: string, type: string): void {
  // UTF-8 BOM so Excel opens CSV files with the right encoding
  const prefix = type.startsWith('text/csv') ? '﻿' : '';
  const url = URL.createObjectURL(new Blob([prefix + content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ExportableTransaction {
  date: string;
  description: string;
  category: string;
  type: string;
  amount: number;
  notes: string | null;
  account?: string;
  accountName?: string;
}

/** CSV exports in the user's language and currency. */
export function useExportCSV() {
  const { t, tCategory } = useI18n();
  const format = useFormat();
  const typeLabel = (type: string): string =>
    type in TYPE_LABEL_KEYS ? t(TYPE_LABEL_KEYS[type as keyof typeof TYPE_LABEL_KEYS]) : type;

  const header = (): string[] =>
    [
      t('app.export.csv.date'),
      t('app.export.csv.description'),
      t('app.export.csv.category'),
      t('app.export.csv.type'),
      t('app.export.csv.account'),
      `${t('app.export.csv.amount')} (${format.currency})`,
      t('app.export.csv.notes'),
    ].map(csvCell);

  const rowsOf = (transactions: ExportableTransaction[]): string[][] =>
    transactions.map((tx) => [
      csvCell(tx.date.slice(0, 10)),
      csvCell(tx.description),
      csvCell(tCategory(tx.category)),
      csvCell(typeLabel(tx.type)),
      csvCell(tx.accountName ?? tx.account ?? ''),
      csvCell(tx.amount),
      csvCell(tx.notes),
    ]);

  /** Movements of the viewed month plus a summary footer. */
  function exportMonthCSV(
    transactions: Transaction[],
    summary: FinancialSummary | null,
    year: number,
    month: number
  ): void {
    const rows = rowsOf(transactions);
    if (summary) {
      const total = (key: string, value: number) => [
        csvCell(t(key)),
        '',
        '',
        '',
        '',
        csvCell(value),
        '',
      ];
      rows.push(
        [],
        [csvCell(t('app.export.csv.summary'))],
        total('app.summary.income', summary.totalIncome),
        total('app.summary.expenses', summary.totalExpenses),
        total('app.summary.saving', summary.totalSaving),
        total('app.summary.monthBalance', summary.balance)
      );
    }
    const name = format.monthName(month).toLowerCase();
    downloadFile(
      toCSV([header(), ...rows]),
      `money-manager_${year}-${String(month).padStart(2, '0')}_${name}.csv`,
      CSV_TYPE
    );
  }

  /** Every movement ever recorded (used by the data export in Settings). */
  function exportAllCSV(transactions: ExportableTransaction[]): void {
    downloadFile(
      toCSV([header(), ...rowsOf(transactions)]),
      `money-manager_movimientos_${todayDateOnly()}.csv`,
      CSV_TYPE
    );
  }

  /** One row per month plus totals. */
  function exportAnnualCSV(months: (MonthData & { month: number })[], year: number): void {
    const money = (key: string) => csvCell(`${t(key)} (${format.currency})`);
    const head = [
      csvCell(t('app.annual.table.month')),
      money('app.annual.table.income'),
      money('app.annual.table.expenses'),
      money('app.annual.table.saving'),
      money('app.annual.table.balance'),
    ];
    const rows = months.map((m) =>
      [format.monthName(m.month), m.income, m.expenses, m.saving, m.balance].map(csvCell)
    );
    const sum = (key: keyof MonthData) => round2(months.reduce((s, m) => s + m[key], 0));
    rows.push(
      [],
      [
        t('app.export.csv.total'),
        sum('income'),
        sum('expenses'),
        sum('saving'),
        sum('balance'),
      ].map(csvCell)
    );
    downloadFile(toCSV([head, ...rows]), `money-manager_${year}.csv`, CSV_TYPE);
  }

  /** The yearly report: months, quarters and categories in one file. */
  function exportReportCSV(report: AnnualReport): void {
    const unit = (key: string) => csvCell(`${t(key)} (${report.currency})`);
    const line = (cells: (string | number)[]) => cells.map(csvCell);
    const table = (title: string, head: string[], rows: (string | number)[][]) => [
      [csvCell(title)],
      head,
      ...rows.map(line),
      [],
    ];
    const totalsRow = (
      label: string,
      x: { income: number; expenses: number; saving: number; balance: number }
    ) => [label, x.income, x.expenses, x.saving, x.balance];
    const periodHead = (first: string) => [
      csvCell(first),
      unit('app.annual.table.income'),
      unit('app.annual.table.expenses'),
      unit('app.annual.table.saving'),
      unit('app.annual.table.balance'),
    ];
    const categoryRows = (list: AnnualReport['expensesByCategory']) =>
      list.map((c) => [tCategory(c.categoryName), c.amount]);
    const categoryHead = [csvCell(t('app.export.csv.category')), unit('app.export.csv.amount')];

    const rows = [
      ...table(`${t('app.report.title')} ${report.year}`, periodHead(t('app.annual.table.month')), [
        ...report.months.map((m) => [
          format.monthName(m.month),
          m.income,
          m.expenses,
          m.saving,
          round2(m.income - m.expenses - m.saving),
        ]),
        totalsRow(t('app.export.csv.total'), report.totals),
      ]),
      ...table(
        t('app.report.quarters'),
        periodHead(t('app.report.quarter')),
        report.quarters.map((q) => totalsRow(`T${q.quarter}`, q))
      ),
      ...table(
        t('app.report.expensesByCategory'),
        categoryHead,
        categoryRows(report.expensesByCategory)
      ),
      ...table(
        t('app.report.incomeByCategory'),
        categoryHead,
        categoryRows(report.incomeByCategory)
      ),
    ];
    downloadFile(toCSV(rows), `money-manager_informe_${report.year}.csv`, CSV_TYPE);
  }

  return { exportMonthCSV, exportAnnualCSV, exportAllCSV, exportReportCSV };
}
