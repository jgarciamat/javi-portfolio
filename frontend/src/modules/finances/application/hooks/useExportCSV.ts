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

export type CsvValue = string | number | null | undefined;

/** A table to export: one header per column and the rows below. */
export interface CsvTable {
  head: string[];
  rows: CsvValue[][];
}

/**
 * Semicolon-separated rows, which Excel in Spanish opens as columns. Numbers use
 * `decimal` as separator and are never treated as formulas (a minus sign stays).
 */
export function tableToCSV({ head, rows }: CsvTable, decimal: ',' | '.' = ','): string {
  const cell = (value: CsvValue) =>
    typeof value === 'number' ? `"${String(value).replace('.', decimal)}"` : csvCell(value);
  return [head, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
}

/** Downloads any table as `finanverso_<name>_<today>.csv` (UTF-8 with BOM, for Excel). */
export function exportRowsCSV(name: string, table: CsvTable, decimal: ',' | '.'): void {
  downloadFile(tableToCSV(table, decimal), `finanverso_${name}_${todayDateOnly()}.csv`, CSV_TYPE);
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

type Translate = (key: string) => string;

/** Movements as a table, in the language and currency given. */
function movementsTable(
  transactions: ExportableTransaction[],
  t: Translate,
  tCategory: Translate,
  currency: string
): CsvTable {
  const typeLabel = (type: string): string =>
    type in TYPE_LABEL_KEYS ? t(TYPE_LABEL_KEYS[type as keyof typeof TYPE_LABEL_KEYS]) : type;
  return {
    head: [
      t('app.export.csv.date'),
      t('app.export.csv.description'),
      t('app.export.csv.category'),
      t('app.export.csv.type'),
      t('app.export.csv.account'),
      `${t('app.export.csv.amount')} (${currency})`,
      t('app.export.csv.notes'),
    ],
    rows: transactions.map((tx) => [
      tx.date.slice(0, 10),
      tx.description,
      tCategory(tx.category),
      typeLabel(tx.type),
      tx.accountName ?? tx.account ?? '',
      tx.amount,
      tx.notes,
    ]),
  };
}

/** CSV exports in the user's language and currency. */
export function useExportCSV() {
  const { t, tCategory } = useI18n();
  const format = useFormat();
  const transactionTable = (transactions: ExportableTransaction[]) =>
    movementsTable(transactions, t, tCategory, format.currency);
  /** The same table quoted for the comma-separated exports. */
  const quoted = (transactions: ExportableTransaction[]): string[][] => {
    const { head, rows } = transactionTable(transactions);
    return [head, ...rows].map((r) => r.map(csvCell));
  };

  /** Movements of the viewed month plus a summary footer. */
  function exportMonthCSV(
    transactions: Transaction[],
    summary: FinancialSummary | null,
    year: number,
    month: number
  ): void {
    const rows = quoted(transactions);
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
      toCSV(rows),
      `finanverso_${year}-${String(month).padStart(2, '0')}_${name}.csv`,
      CSV_TYPE
    );
  }

  const exportList = (transactions: ExportableTransaction[], name: string) =>
    downloadFile(
      toCSV(quoted(transactions)),
      `finanverso_${name}_${todayDateOnly()}.csv`,
      CSV_TYPE
    );
  /** Every movement ever recorded (used by the data export in Settings). */
  const exportAllCSV = (transactions: ExportableTransaction[]) =>
    exportList(transactions, 'movimientos');
  /** The movements selected in a list. */
  const exportSelectionCSV = (transactions: ExportableTransaction[]) =>
    exportList(transactions, 'seleccion');

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
    downloadFile(toCSV([head, ...rows]), `finanverso_${year}.csv`, CSV_TYPE);
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
    downloadFile(toCSV(rows), `finanverso_informe_${report.year}.csv`, CSV_TYPE);
  }

  return {
    exportMonthCSV,
    exportAnnualCSV,
    exportAllCSV,
    exportReportCSV,
    exportSelectionCSV,
    transactionTable,
  };
}
