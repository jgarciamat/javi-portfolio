import { fireEvent, screen, waitFor } from '@testing-library/react';
import { loadLocale, translate, type Locale } from '@core/i18n/I18nContext';
import { AccountsView } from '@modules/finances/ui/views/AccountsView';
import { AnalysisView } from '@modules/finances/ui/views/AnalysisView';
import { AssetsView } from '@modules/finances/ui/views/AssetsView';
import { BudgetsView } from '@modules/finances/ui/views/BudgetsView';
import { GoalsView } from '@modules/finances/ui/views/GoalsView';
import { MoneyLeaksView } from '@modules/finances/ui/views/MoneyLeaksView';
import { SearchView } from '@modules/finances/ui/views/SearchView';
import { SplitView } from '@modules/finances/ui/views/SplitView';
import { CategoryManager } from '@modules/finances/ui/components/CategoryManager';
import { CategoryRulesCard } from '@modules/finances/ui/components/CategoryRulesCard';
import { ExportButtons } from '@modules/finances/ui/components/ExportButtons';
import { InvoiceReview } from '@modules/finances/ui/components/InvoiceReview';
import { RecurringRulesTab } from '@modules/finances/ui/components/RecurringRulesTab';
import { emptyManual } from '@modules/finances/ui/components/AutonomoManual';
import { invoiceBookTable } from '@modules/finances/ui/components/invoiceBookTable';
import { ImportModal } from '@modules/finances/ui/components/ImportModal';
import { FormPreview } from '@modules/taxforms/ui/FormPreview';
import { MonthActions } from '@modules/finances/ui/components/MonthActions';
import { AnnualChart } from '@modules/finances/ui/components/AnnualChart';
import autoTable from 'jspdf-autotable';
import { tableToCSV } from '@modules/finances/application/hooks/useExportCSV';
import type { ImportedInvoice } from '@modules/finances/domain/invoiceLedger';
import type { FilledForm } from '@modules/taxforms/domain/values';
import { createFakeApi, type FakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithI18n, renderWithProviders } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';
import { captureDownloads } from '@test-utils/dom';
import { readFileSync } from 'fs';
import { join } from 'path';

// The real table of the PDF, watched to count the rows of each screen.
jest.mock('jspdf-autotable', () => {
  const actual = jest.requireActual('jspdf-autotable');
  return { __esModule: true, ...actual, default: jest.fn(actual.default) };
});

jest.mock('@modules/taxforms/application/formView', () => ({
  openFormView: jest.fn(),
  canvasPng: jest.fn(),
}));

const TODAY = '2026-03-15';
const LOCALES: Locale[] = ['es', 'en'];

beforeAll(() => loadLocale('en'));
beforeEach(() => {
  localStorage.clear();
  freezeTime();
});
afterEach(restoreTime);

/** The export button of a table, by what it exports. */
const csvButton = (locale: Locale, whatKey: string) =>
  screen.findByRole('button', {
    name: translate(locale, 'app.exportButtons.csvFor', { what: translate(locale, whatKey) }),
  });

/** Presses an export button and reads the file it saves: its name, header and rows. */
async function download(button: HTMLElement) {
  const saved = captureDownloads();
  fireEvent.click(button);
  await waitFor(() => expect(saved.names).toHaveLength(1));
  const [text] = await saved.text();
  saved.restore();
  const [head, ...rows] = text.replace(/^\uFEFF/, '').split('\r\n');
  return { name: saved.names[0], head, rows };
}

/** The header line as the CSV writes it, from keys of the locale (or literal text after «=»). */
const header = (locale: Locale, cells: string[]) =>
  cells
    .map((c) => (c.startsWith('=') ? c.slice(1) : translate(locale, c)))
    .map((c) => `"${c}"`)
    .join(';');
const money = (locale: Locale, key: string) => `=${translate(locale, key)} (EUR)`;

/** The PDF button of a table, by what it exports. */
const pdfButton = (locale: Locale, whatKey: string) =>
  screen.findByRole('button', {
    name: translate(locale, 'app.exportButtons.pdfFor', { what: translate(locale, whatKey) }),
  });
const tables = autoTable as unknown as jest.Mock;

/** Presses a PDF button and reads the file: its name, that it is a PDF, and the rows of its table. */
async function downloadPdf(button: HTMLElement) {
  const saved = captureDownloads();
  const before = tables.mock.calls.length;
  fireEvent.click(button);
  await waitFor(() => expect(saved.names).toHaveLength(1));
  const [text] = await saved.text();
  saved.restore();
  const options = tables.mock.calls[before][1] as { body: string[][]; foot?: string[][] };
  return { name: saved.names[0], text, body: options.body, foot: options.foot };
}

describe('the CSV writer', () => {
  it('separates with semicolons, writes the decimal mark asked and keeps negatives as numbers', () => {
    const table = { head: ['A', 'B'], rows: [[-12.5, '=SUM(A1)'], [null, undefined], []] };
    expect(tableToCSV(table)).toBe(`"A";"B"\r\n"-12,5";"'=SUM(A1)"\r\n"";""\r\n`);
    expect(tableToCSV(table, '.')).toContain('"-12.5"');
  });
});

describe('ExportButtons', () => {
  const table = () => ({ head: ['A'], rows: [[1]] });

  it('is off, and says why, when there is nothing to export', () => {
    renderWithI18n(<ExportButtons name="x" what="Cosas" count={0} table={table} />);
    const button = screen.getByRole('button', { name: 'Exportar CSV: Cosas' });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(translate('es', 'app.exportButtons.empty'));
  });

  it('offers the PDF of the same table when the screen has one', async () => {
    renderWithI18n(<ExportButtons name="x" what="Cosas" count={1} table={table} pdf />);
    expect(screen.getByRole('group', { name: 'Exportar' })).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Descargar PDF: Cosas' });
    expect(button).toHaveTextContent('Descargar PDF');
    const file = await downloadPdf(button);
    expect(file.name).toBe(`finanverso_x_${TODAY}.pdf`);
    expect(file.text.startsWith('%PDF-')).toBe(true);
    expect(file.body).toEqual([['1']]);
  });

  it('has no PDF where the screen does not ask for one, and none to make without rows', () => {
    const { unmount } = renderWithI18n(
      <ExportButtons name="x" what="Cosas" count={1} table={table} />
    );
    expect(screen.queryByRole('button', { name: /PDF/ })).toBeNull();
    unmount();
    renderWithI18n(<ExportButtons name="x" what="Cosas" count={0} table={table} pdf />);
    const pdf = screen.getByRole('button', { name: 'Descargar PDF: Cosas' });
    expect(pdf).toBeDisabled();
    expect(pdf).toHaveAccessibleDescription(translate('es', 'app.exportButtons.empty'));
  });

  it('says so when the PDF cannot be made', async () => {
    const failing = () => Promise.reject(new Error('Sin conexión'));
    renderWithI18n(<ExportButtons name="x" what="Cosas" count={1} table={failing} pdf />);
    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF: Cosas' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  });

  it('says so when the table cannot be read', async () => {
    const failing = () => Promise.reject(new Error('Sin conexión'));
    renderWithI18n(<ExportButtons name="x" what="Cosas" count={1} table={failing} />);
    fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV: Cosas' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  });
});

describe.each(LOCALES)('exports in %s', (locale) => {
  /** The account's language comes from its settings too: they say the same. */
  const render = (ui: React.ReactElement, api: FakeApi = createFakeApi()) => {
    api.settingsApi.get.mockResolvedValue(f.settings({ locale }));
    return renderWithProviders(ui, { api, locale });
  };

  it('Search: every match of the filters, page by page', async () => {
    const api = createFakeApi();
    api.transactionApi.search.mockResolvedValue({
      items: [f.transaction({ id: 't1' }), f.transaction({ id: 't2', notes: 'Cena' })],
      total: 250,
      totals: { income: 0, expenses: 80, saving: 0 },
    });
    render(<SearchView onEdit={jest.fn()} />, api);
    const file = await download(await csvButton(locale, 'app.search.title'));
    expect(file.name).toBe(`finanverso_busqueda_${TODAY}.csv`);
    expect(file.head).toBe(
      header(locale, [
        'app.export.csv.date',
        'app.export.csv.description',
        'app.export.csv.category',
        'app.export.csv.type',
        'app.export.csv.account',
        money(locale, 'app.export.csv.amount'),
        'app.export.csv.notes',
      ])
    );
    // Two pages of 200 asked: the mock answers two movements each time.
    expect(file.rows).toHaveLength(4);
    expect(api.transactionApi.search).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 200, offset: 200 })
    );
    // The PDF: the same four rows, signed, and the totals of what was found at the end.
    const pdf = await downloadPdf(await pdfButton(locale, 'app.search.title'));
    expect(pdf.name).toBe(`finanverso_busqueda_${TODAY}.pdf`);
    expect(pdf.text.startsWith('%PDF-')).toBe(true);
    expect(pdf.body).toHaveLength(4);
    expect(pdf.body[0][5]).toBe(locale === 'es' ? '-40,00' : '-40.00');
    expect(pdf.foot!.map((r) => r[0])).toEqual(
      [
        'app.summary.income',
        'app.summary.expenses',
        'app.summary.saving',
        'app.annual.table.balance',
      ].map((k) => translate(locale, k))
    );
    expect(pdf.foot![1][5]).toBe(locale === 'es' ? '160,00' : '160.00');
  });

  it('Search: the dates of the filters go under the title of the PDF', async () => {
    const api = createFakeApi();
    api.transactionApi.search.mockResolvedValue({
      items: [f.transaction({ id: 't1', type: 'INCOME' })],
      total: 1,
      totals: { income: 40, expenses: 0, saving: 0 },
    });
    render(<SearchView onEdit={jest.fn()} />, api);
    const pdf = await pdfButton(locale, 'app.search.title');
    const [from, to] = screen.getAllByLabelText(/./, { selector: 'input[type="date"]' });
    for (const [field, value] of [
      [from, '2026-03-01'],
      [to, '2026-03-31'],
    ] as const) {
      fireEvent.change(field, { target: { value } });
      const file = await downloadPdf(await pdfButton(locale, 'app.search.title'));
      expect(file.body[0][5]).toBe(locale === 'es' ? '+40,00' : '+40.00');
    }
    fireEvent.change(from, { target: { value: '' } });
    expect((await downloadPdf(pdf)).text.startsWith('%PDF-')).toBe(true);
  });

  it('Accounts: the accounts and the transfers', async () => {
    const api = createFakeApi();
    api.accountApi.getAll.mockResolvedValue({
      accounts: [f.account({ isDefault: true }), f.account({ name: 'Vieja', archived: true })],
      total: 1000,
    });
    api.accountApi.transfers.mockResolvedValue([f.transfer({ description: 'Paga' })]);
    render(<AccountsView />, api);
    const accounts = await download(await csvButton(locale, 'app.accounts.title'));
    expect(accounts.name).toBe(`finanverso_cuentas_${TODAY}.csv`);
    expect(accounts.head).toBe(
      header(locale, [
        'app.accounts.export.name',
        'app.accounts.export.type',
        money(locale, 'app.accounts.export.initial'),
        money(locale, 'app.accounts.export.balance'),
        'app.accounts.export.default',
        'app.accounts.export.archived',
      ])
    );
    expect(accounts.rows).toHaveLength(2);
    const transfers = await download(await csvButton(locale, 'app.accounts.transfers'));
    expect(transfers.name).toBe(`finanverso_transferencias_${TODAY}.csv`);
    expect(transfers.head.startsWith(header(locale, ['app.export.csv.date']))).toBe(true);
    expect(transfers.rows).toEqual(['"2026-03-05";"Principal";"Ahorro";"100";"Paga"']);
    const accountsPdf = await downloadPdf(await pdfButton(locale, 'app.accounts.title'));
    expect(accountsPdf.name).toBe(`finanverso_cuentas_${TODAY}.pdf`);
    expect(accountsPdf.text.startsWith('%PDF-')).toBe(true);
    expect(accountsPdf.body).toHaveLength(2);
    const transfersPdf = await downloadPdf(await pdfButton(locale, 'app.accounts.transfers'));
    expect(transfersPdf.name).toBe(`finanverso_transferencias_${TODAY}.pdf`);
    expect(transfersPdf.body).toHaveLength(1);
  });

  it('Budgets: each limit next to what was spent of it', async () => {
    const api = createFakeApi();
    api.categoryApi.getAll.mockResolvedValue([f.category({ id: 'c-ocio', name: 'Ocio' })]);
    api.budgetApi.getAll.mockResolvedValue([
      f.budget({ categoryId: 'c-ocio' }),
      f.budget({ categoryId: 'c-casa', categoryName: 'Casa', amount: 50.5 }),
    ]);
    api.monthApi.get.mockResolvedValue(f.overview({ budgets: [f.budgetLine()] }));
    render(<BudgetsView />, api);
    const button = await csvButton(locale, 'app.budgets.title');
    await waitFor(() => expect(button).toBeEnabled());
    const file = await download(button);
    expect(file.name).toBe(`finanverso_presupuestos_2026-03_${TODAY}.csv`);
    expect(file.head).toBe(
      header(locale, [
        'app.export.csv.category',
        money(locale, 'app.budgets.export.limit'),
        money(locale, 'app.budgets.export.spent'),
        money(locale, 'app.budgets.export.remaining'),
        'app.budgets.export.percentage',
      ])
    );
    const decimal = locale === 'es' ? '50,5' : '50.5';
    expect(file.rows).toEqual([
      `"${translate(locale, 'app.categories.Ocio')}";"400";"300";"100";"75"`,
      `"Casa";"${decimal}";"0";"${decimal}";"0"`,
    ]);
    const pdf = await downloadPdf(await pdfButton(locale, 'app.budgets.title'));
    expect(pdf.name).toBe(`finanverso_presupuestos_2026-03_${TODAY}.pdf`);
    expect(pdf.text.startsWith('%PDF-')).toBe(true);
    expect(pdf.body).toHaveLength(2);
  });

  it('Goals: every goal, archived ones included', async () => {
    const api = createFakeApi();
    api.goalApi.getAll.mockResolvedValue([
      f.goal(),
      f.goal({
        name: 'Coche',
        archived: true,
        targetDate: null,
        progress: { ...f.goal().progress, monthlyNeeded: null },
      }),
    ]);
    render(<GoalsView />, api);
    const button = await csvButton(locale, 'app.goals.title');
    await waitFor(() => expect(button).toBeEnabled());
    const file = await download(button);
    expect(file.name).toBe(`finanverso_metas_${TODAY}.csv`);
    expect(file.head.startsWith(header(locale, ['app.goals.export.name']))).toBe(true);
    expect(file.head).toContain(translate(locale, 'app.goals.export.targetDate'));
    expect(file.rows).toHaveLength(2);
    expect(file.rows[1]).toContain(`"";"";"${translate(locale, 'app.export.csv.yes')}"`);
    const pdf = await downloadPdf(await pdfButton(locale, 'app.goals.title'));
    expect(pdf.name).toBe(`finanverso_metas_${TODAY}.pdf`);
    expect(pdf.body).toHaveLength(2);
  });

  it('Fixed expenses: the automatic movements with their period', async () => {
    const api = createFakeApi();
    api.recurringApi.getAll.mockResolvedValue([
      f.rule(),
      f.rule({ description: 'Gimnasio', endYear: 2026, endMonth: 6, active: false }),
    ]);
    render(<RecurringRulesTab categories={[]} />, api);
    const button = await csvButton(locale, 'app.recurring.title');
    await waitFor(() => expect(button).toBeEnabled());
    const file = await download(button);
    expect(file.name).toBe(`finanverso_gastos-fijos_${TODAY}.csv`);
    expect(file.head).toContain(`"${translate(locale, 'app.recurring.form.frequency')}"`);
    expect(file.rows).toHaveLength(2);
    expect(file.rows[0]).toContain('"2026-01";""');
    expect(file.rows[1]).toContain(
      `"2026-01";"2026-06";"${translate(locale, 'app.export.csv.no')}"`
    );
    const pdf = await downloadPdf(await pdfButton(locale, 'app.recurring.title'));
    expect(pdf.name).toBe(`finanverso_gastos-fijos_${TODAY}.pdf`);
    expect(pdf.body).toHaveLength(2);
  });

  it('Analysis: trends and net worth', async () => {
    const api = createFakeApi();
    api.insightsApi.trends.mockResolvedValue({
      year: 2026,
      month: 3,
      categories: [
        {
          categoryName: 'Ocio',
          current: 300,
          previous: 200,
          average3: 250,
          changeVsPreviousPct: 50,
          changeVsAveragePct: null,
        },
      ],
    });
    api.insightsApi.netWorth.mockResolvedValue([
      { year: 2026, month: 2, available: 100, saved: 50, assets: 0, debts: 0, netWorth: 150 },
      { year: 2026, month: 3, available: 200, saved: 60, assets: 0, debts: 0, netWorth: 260 },
    ]);
    render(<AnalysisView onOpenTab={jest.fn()} />, api);
    const trends = await download(await csvButton(locale, 'app.analysis.trendsName'));
    expect(trends.name).toBe(`finanverso_tendencias_2026-03_${TODAY}.csv`);
    expect(trends.head).toBe(
      header(locale, [
        'app.analysis.category',
        money(locale, 'app.analysis.thisMonth'),
        money(locale, 'app.analysis.previous'),
        `=${translate(locale, 'app.analysis.vsPrevious')} (%)`,
        money(locale, 'app.analysis.average3'),
        `=${translate(locale, 'app.analysis.vsAverage')} (%)`,
      ])
    );
    expect(trends.rows).toHaveLength(1);
    const worth = await download(await csvButton(locale, 'app.analysis.netWorthTitle'));
    expect(worth.name).toBe(`finanverso_patrimonio_evolucion_${TODAY}.csv`);
    expect(worth.head.startsWith(header(locale, ['app.analysis.month']))).toBe(true);
    expect(worth.rows[0].startsWith('"2026-02"')).toBe(true);
    expect(worth.rows).toHaveLength(2);
    const trendsPdf = await downloadPdf(await pdfButton(locale, 'app.analysis.trendsName'));
    expect(trendsPdf.name).toBe(`finanverso_tendencias_2026-03_${TODAY}.pdf`);
    expect(trendsPdf.body).toHaveLength(1);
    const worthPdf = await downloadPdf(await pdfButton(locale, 'app.analysis.netWorthTitle'));
    expect(worthPdf.name).toBe(`finanverso_patrimonio_evolucion_${TODAY}.pdf`);
    expect(worthPdf.body).toHaveLength(2);
  });

  it('Money leaks: the findings still to check that the plan shows', async () => {
    const api = createFakeApi();
    api.insightsApi.moneyLeaks.mockResolvedValue(
      f.moneyLeaks({
        findings: [
          f.leakFinding(),
          f.leakFinding({
            kind: 'duplicate',
            label: 'ELECTRO MARKET',
            cadence: null,
            amount: 89,
            annual: 0,
            oneOff: 89,
            lastDate: '2026-09-12',
          }),
          f.leakFinding({ label: 'VIEJO', status: 'keep' }),
        ],
      })
    );
    render(<MoneyLeaksView onImport={jest.fn()} onOpenTab={jest.fn()} />, api);
    const file = await download(await csvButton(locale, 'app.leaks.exportWhat'));
    expect(file.name).toBe(`finanverso_dinero-perdido_${TODAY}.csv`);
    expect(file.head).toBe(
      header(locale, [
        'app.leaks.col.label',
        'app.leaks.col.kind',
        'app.leaks.col.cadence',
        money(locale, 'app.leaks.col.amount'),
        money(locale, 'app.leaks.col.annual'),
        money(locale, 'app.leaks.col.oneOff'),
        'app.leaks.col.last',
      ])
    );
    expect(file.rows).toHaveLength(2);
    expect(file.rows[0]).toContain(`"FITBOX";"${translate(locale, 'app.leaks.tag.recurring')}"`);
    expect(file.rows[1]).toContain(`"${translate(locale, 'app.leaks.tag.duplicate')}";""`);
    const pdf = await downloadPdf(await pdfButton(locale, 'app.leaks.exportWhat'));
    expect(pdf.body).toHaveLength(2);
  });

  it('Net worth: investments, goods and debts', async () => {
    const api = createFakeApi();
    api.assetApi.getAll.mockResolvedValue([
      f.asset({ valueDate: '2026-03-01T00:00:00Z' }),
      f.asset({ kind: 'debt', valueDate: null }),
    ]);
    render(<AssetsView />, api);
    const button = await csvButton(locale, 'app.assets.title');
    await waitFor(() => expect(button).toBeEnabled());
    const file = await download(button);
    expect(file.name).toBe(`finanverso_patrimonio_${TODAY}.csv`);
    expect(file.head.startsWith(header(locale, ['app.assets.name', 'app.assets.kind']))).toBe(true);
    expect(file.rows).toHaveLength(2);
    expect(file.rows[0]).toContain('"2026-03-01"');
    const pdf = await downloadPdf(await pdfButton(locale, 'app.assets.title'));
    expect(pdf.name).toBe(`finanverso_patrimonio_${TODAY}.pdf`);
    expect(pdf.body).toHaveLength(2);
  });

  it('Shared expenses: what each member pays of every expense', async () => {
    const api = createFakeApi();
    api.splitApi.list.mockResolvedValue([{ id: 'g1', name: 'Piso', members: 2, expenses: 2 }]);
    api.splitApi.get.mockResolvedValue({
      id: 'g1',
      name: 'Piso',
      members: [
        { id: 'a', name: 'Ana', balance: 10 },
        { id: 'b', name: 'Ben', balance: -10 },
      ],
      expenses: [
        {
          id: 'e1',
          description: 'Cena',
          amount: 40,
          paidBy: 'a',
          date: '2026-03-10',
          settlement: false,
          shares: [
            { memberId: 'a', share: 20 },
            { memberId: 'b', share: 20 },
          ],
        },
        {
          id: 'e2',
          description: 'Pago',
          amount: 10,
          paidBy: 'b',
          date: '2026-03-11',
          settlement: true,
          shares: [{ memberId: 'a', share: 10 }],
        },
      ],
      transfers: [],
    });
    render(<SplitView />, api);
    fireEvent.click(await screen.findByRole('button', { name: /Piso/ }));
    const file = await download(await csvButton(locale, 'app.split.expenses'));
    expect(file.name).toBe(`finanverso_gastos-compartidos_${TODAY}.csv`);
    expect(file.head).toBe(
      header(locale, [
        'app.export.csv.date',
        'app.export.csv.description',
        'app.split.export.paidBy',
        money(locale, 'app.export.csv.amount'),
        '=Ana (EUR)',
        '=Ben (EUR)',
      ])
    );
    expect(file.rows).toEqual([
      '"2026-03-10";"Cena";"Ana";"40";"20";"20"',
      `"2026-03-11";"${translate(locale, 'app.split.payment')}";"Ben";"10";"10";"0"`,
    ]);
    const pdf = await downloadPdf(await pdfButton(locale, 'app.split.expenses'));
    expect(pdf.name).toBe(`finanverso_gastos-compartidos_${TODAY}.pdf`);
    expect(pdf.text.startsWith('%PDF-')).toBe(true);
    expect(pdf.body).toHaveLength(2);
  });

  it('Categories: name, icon and colour', async () => {
    renderWithI18n(
      <CategoryManager
        onClose={jest.fn()}
        categories={[f.category({ name: 'Ocio' }), f.category({ name: 'Mascotas' })]}
        onAdd={jest.fn()}
        onUpdate={jest.fn()}
        onDelete={jest.fn()}
      />,
      locale
    );
    const file = await download(await csvButton(locale, 'app.category.manager.list.title'));
    expect(file.name).toBe(`finanverso_categorias_${TODAY}.csv`);
    // Settings lists: CSV only (to keep or edit), not a table to print.
    expect(screen.queryByRole('button', { name: /PDF/ })).toBeNull();
    expect(file.head).toBe(
      header(locale, [
        'app.category.export.name',
        'app.category.export.icon',
        'app.category.export.color',
      ])
    );
    expect(file.rows).toHaveLength(2);
  });

  it('Categorisation rules: the words and their category', async () => {
    const api = createFakeApi();
    api.categoryRuleApi.getAll.mockResolvedValue([
      { id: 'r1', pattern: 'mercadona', categoryId: 'c1', categoryName: 'Ocio' },
    ]);
    render(<CategoryRulesCard />, api);
    const button = await csvButton(locale, 'app.rules.title');
    await waitFor(() => expect(button).toBeEnabled());
    const file = await download(button);
    expect(file.name).toBe(`finanverso_reglas_${TODAY}.csv`);
    expect(file.head).toBe(header(locale, ['app.rules.pattern', 'app.rules.category']));
    expect(file.rows).toEqual([`"mercadona";"${translate(locale, 'app.categories.Ocio')}"`]);
  });

  it('Invoices: each book with its totals by quarter', async () => {
    const invoices = [
      invoice({ id: 'i1', book: 'issued', concept: 'Estudio Norte' }),
      invoice({ id: 'r1', book: 'received', concept: 'Papelería' }),
      invoice({ id: 'r2', book: 'received', concept: 'Imprenta', date: '2026-05-02', quarter: 2 }),
    ];
    renderWithI18n(
      <InvoiceReview form={{ ...emptyManual(), invoices }} onChange={jest.fn()} focus={null} />,
      locale
    );
    const issued = await download(await csvButton(locale, 'app.autonomo.export.issued'));
    expect(issued.name).toBe(`finanverso_facturas-emitidas_${TODAY}.csv`);
    expect(issued.head).toContain(`"${translate(locale, 'app.autonomo.review.col.client')}"`);
    // One invoice, a blank line, four quarters and the year.
    expect(issued.rows).toHaveLength(7);
    const received = await download(await csvButton(locale, 'app.autonomo.export.received'));
    expect(received.name).toBe(`finanverso_facturas-recibidas_${TODAY}.csv`);
    expect(received.head).toContain(`"${translate(locale, 'app.autonomo.review.col.supplier')}"`);
    expect(received.rows).toHaveLength(8);
  });

  it('Tax forms: one row per box, next to the PDF', async () => {
    const form: FilledForm = {
      model: '303',
      year: 2026,
      period: '1T',
      values: { '01': 1000.5, '03': 210 },
      pending: [],
      texts: { nif: 'B00000000' },
    };
    renderWithI18n(<FormPreview form={form} label="Modelo 303" />, locale);
    const button = await screen.findByRole('button', {
      name: translate(locale, 'app.exportButtons.csvFor', { what: 'Modelo 303' }),
    });
    const file = await download(button);
    expect(file.name).toBe(`finanverso_modelo-303-2026-1T_${TODAY}.csv`);
    expect(file.head).toBe(
      header(locale, [
        'taxforms.export.model',
        'taxforms.export.period',
        'taxforms.preview.box',
        'taxforms.export.value',
      ])
    );
    expect(file.rows).toEqual([
      `"303";"1T";"01";"${locale === 'es' ? '1000,5' : '1000.5'}"`,
      '"303";"1T";"03";"210"',
      '"303";"1T";"nif";"B00000000"',
    ]);
  });
});

describe.each(LOCALES)('the PDF of the month and of the year in %s', (locale) => {
  const render = (ui: React.ReactElement, api: FakeApi) => {
    api.settingsApi.get.mockResolvedValue(f.settings({ locale }));
    return renderWithProviders(ui, { api, locale });
  };
  const button = (key: string) =>
    screen.findByRole('button', {
      name: new RegExp(translate(locale, key).replace(/[()]/g, '\\$&')),
    });

  it('Month: its movements, signed, and its totals', async () => {
    const api = createFakeApi();
    api.monthApi.get.mockResolvedValue(
      f.overview({
        transactions: [
          f.transaction({ type: 'INCOME', amount: 2000, description: 'Nómina' }),
          f.transaction(),
          f.transaction({ type: 'SAVING', amount: 200 }),
        ],
      })
    );
    render(<MonthActions />, api);
    const pdfButton = await button('app.export.monthPdf');
    await waitFor(() => expect(pdfButton).toBeEnabled());
    const pdf = await downloadPdf(pdfButton);
    expect(pdf.name).toBe(`finanverso_mes_2026-03_${TODAY}.pdf`);
    expect(pdf.text.startsWith('%PDF-')).toBe(true);
    expect(pdf.body).toHaveLength(3);
    expect(pdf.body.map((r) => r[5])).toEqual(
      locale === 'es' ? ['+2000,00', '-40,00', '200,00'] : ['+2,000.00', '-40.00', '200.00']
    );
    expect(pdf.foot).toHaveLength(4);
  });

  it('Month: without its summary there are no totals, and a failure is said', async () => {
    const api = createFakeApi();
    api.monthApi.get.mockResolvedValue(
      f.overview({ transactions: [f.transaction()], summary: null as never })
    );
    render(<MonthActions />, api);
    const pdfButton = await button('app.export.monthPdf');
    await waitFor(() => expect(pdfButton).toBeEnabled());
    const pdf = await downloadPdf(pdfButton);
    expect(pdf.foot).toBeUndefined();
    tables.mockImplementationOnce(() => {
      throw new Error('Sin memoria');
    });
    fireEvent.click(pdfButton);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin memoria');
  });

  it('Year: one row per month and the total of the year', async () => {
    const api = createFakeApi();
    api.transactionApi.getAnnual.mockResolvedValue({
      year: 2026,
      months: { 1: { income: 2000, expenses: 100, saving: 0, balance: 1900 } },
    });
    render(<AnnualChart initialYear={2026} />, api);
    const pdf = await downloadPdf(await button('app.export.annualPdf'));
    expect(pdf.name).toBe(`finanverso_balance-anual_2026_${TODAY}.pdf`);
    expect(pdf.text.startsWith('%PDF-')).toBe(true);
    // The months with movements, as in the CSV.
    expect(pdf.body).toHaveLength(1);
    expect(pdf.foot).toEqual([
      [
        translate(locale, 'app.export.csv.total'),
        ...(locale === 'es'
          ? ['2000,00', '100,00', '0,00', '1900,00']
          : ['2,000.00', '100.00', '0.00', '1,900.00']),
      ],
    ]);
    tables.mockImplementationOnce(() => {
      throw new Error('Sin memoria');
    });
    fireEvent.click(await button('app.export.annualPdf'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin memoria');
  });
});

describe('the boxes of a yearly form', () => {
  it('put the year as the period and leave out the words it has none of', async () => {
    const form: FilledForm = {
      model: '390',
      year: 2026,
      period: null,
      values: { '01': 5 },
      pending: [],
    };
    renderWithI18n(<FormPreview form={form} label="Modelo 390" />);
    const file = await download(screen.getByRole('button', { name: 'Exportar CSV: Modelo 390' }));
    expect(file.name).toBe(`finanverso_modelo-390-2026_${TODAY}.csv`);
    expect(file.rows).toEqual(['"390";"2026";"01";"5"']);
  });
});

/** An invoice of the book, with only what the export reads. */
function invoice(over: Partial<ImportedInvoice> = {}): ImportedInvoice {
  return {
    id: 'i',
    book: 'issued',
    kind: 'other',
    excluded: false,
    date: '2026-02-10',
    quarter: 1,
    base: 100,
    vatRate: 21,
    vat: 21,
    total: 121,
    withheld: 15,
    concept: 'Cliente',
    ...over,
  };
}

describe('the book of invoices as a table', () => {
  const t = (key: string) => key;

  it('adds the included invoices by quarter and keeps the corrected withholding', () => {
    const { head, rows } = invoiceBookTable(
      'received',
      [
        invoice({ id: 'a', date: '2026-04-01', quarter: 2, retention: 19, retentionFix: 9 }),
        invoice({ id: 'b', retention: 7 }),
        invoice({ id: 'c', excluded: true }),
        invoice({ id: 'd', date: '', nif: 'B1' }),
      ],
      t,
      'EUR'
    );
    expect(head[8]).toBe('app.autonomo.review.col.retention (EUR)');
    // Sorted by date: the one without a date first.
    expect(rows.slice(0, 4).map((r) => r[8])).toEqual([0, 7, 0, 9]);
    expect(rows[0].slice(1, 3)).toEqual(['—', 'B1']);
    expect(rows[2][9]).toBe('app.export.csv.no');
    // Quarter 1 adds «d» and «b» (not the excluded one); quarter 2 adds «a»; then the year.
    expect(rows[5]).toEqual(['app.export.csv.total T1', '', '', '', 200, '', 42, 242, 7, '']);
    expect(rows[6][8]).toBe(9);
    expect(rows[9]).toEqual(['app.export.csv.total', '', '', '', 300, '', 63, 363, 16, '']);
  });
});

describe('the movements template of the import', () => {
  /** jsdom's File has no arrayBuffer(): give it one. */
  const statement = (content: string, name = 'extracto.csv') => {
    const bytes = new TextEncoder().encode(content);
    return Object.assign(new File([bytes], name), { arrayBuffer: async () => bytes.buffer });
  };
  const setup = (locale: Locale = 'es') => {
    const api = createFakeApi();
    api.settingsApi.get.mockResolvedValue(f.settings({ locale }));
    renderWithProviders(<ImportModal accounts={[]} onClose={jest.fn()} onImported={jest.fn()} />, {
      api,
      finances: false,
      locale,
    });
    return (file: File) =>
      fireEvent.change(document.querySelector('input[type="file"]')!, {
        target: { files: [file] },
      });
  };

  it.each(LOCALES)('is offered before choosing a file (%s)', (locale) => {
    setup(locale);
    const link = screen.getByRole('link', {
      name: translate(locale, 'app.import.template.downloadAria'),
    });
    expect(link).toHaveAttribute('href', '/plantillas/movimientos.csv');
    expect(link).toHaveAttribute('download');
  });

  it('reads as it is: its invented movements need no column chosen by hand', async () => {
    const upload = setup();
    const csv = readFileSync(join(__dirname, '../../../public/plantillas/movimientos.csv'), 'utf8');
    upload(statement(csv, 'movimientos.csv'));
    expect(
      await screen.findByText(new RegExp(translate('es', 'app.import.rowsFound', { count: 3 })))
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(LOCALES)('says which columns are missing and which are expected (%s)', async (locale) => {
    const upload = setup(locale);
    upload(statement('Día;Nombre\n02/03/2026;MERCADONA\n'));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      translate(locale, 'app.import.error.columns', {
        missing: ['date', 'description', 'amount']
          .map((c) => translate(locale, `app.import.col.${c}`))
          .join(', '),
        found: 'Día, Nombre',
      })
    );
    expect(alert.querySelector('a[href="/plantillas/movimientos.csv"]')).not.toBeNull();
  });
});
