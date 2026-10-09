import { fireEvent, screen, within } from '@testing-library/react';
import { AnnualChart } from '@modules/finances/ui/components/AnnualChart';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { literal, renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';
import { captureDownloads } from '@test-utils/dom';

beforeEach(() => {
  localStorage.clear();
  freezeTime();
});
afterEach(() => {
  restoreTime();
  jest.restoreAllMocks();
});

const openReport = async (api = createFakeApi(), options: { plan?: boolean } = {}) => {
  api.transactionApi.getAnnual.mockResolvedValue({
    year: 2026,
    months: { 1: { income: 2000, expenses: 100, saving: 0, balance: 1900 } },
  });
  renderWithProviders(<AnnualChart initialYear={2026} />, { api, ...options });
  await screen.findByRole('table');
  fireEvent.click(screen.getByRole('button', { name: tr('app.export.options') }));
  fireEvent.click(screen.getByRole('menuitem', { name: literal(tr('app.report.open')) }));
};

describe('Annual report', () => {
  it('summarises the year by month, quarter and category', async () => {
    const api = createFakeApi();
    await openReport(api);
    const dialog = await screen.findByRole('dialog', { name: `${tr('app.report.title')} 2026` });
    expect(api.insightsApi.report).toHaveBeenCalledWith(2026);
    const tables = await within(dialog).findAllByRole('table');
    expect(tables).toHaveLength(4);
    const months = within(tables[0]).getAllByRole('row');
    expect(months).toHaveLength(14); // header + 12 months + total
    expect(within(months[1]).getByText(/2\.?000/)).toBeInTheDocument();
    expect(within(tables[1]).getByText('T1')).toBeInTheDocument();
    expect(within(tables[2]).getByText(tr('app.categories.Ocio'))).toBeInTheDocument();
    expect(within(tables[3]).getByText(tr('app.categories.Salario'))).toBeInTheDocument();
    expect(within(tables[2]).getByText(/^100\s?%$/)).toBeInTheDocument();
    expect(within(dialog).getByText(tr('app.report.disclaimer'))).toBeInTheDocument();
  });

  it('prints it and downloads it as CSV with months, quarters and categories', async () => {
    const downloads = captureDownloads();
    const print = jest.fn();
    window.print = print;
    await openReport();
    await screen.findAllByRole('table');
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('app.report.print')) }));
    expect(print).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('app.report.csv')) }));
    expect(downloads.names).toEqual(['money-manager_informe_2026.csv']);
    const [csv] = await downloads.text();
    expect(csv).toContain(`"${tr('app.report.title')} 2026"`);
    expect(csv).toContain('"Enero","2000","100","0","1900"');
    expect(csv).toContain(`"${tr('app.export.csv.total')}","2000","100","0","1900"`);
    expect(csv).toContain('"T1","2000","100","0","1900"');
    expect(csv).toContain(`"${tr('app.report.expensesByCategory')}"`);
    expect(csv).toContain(`"${tr('app.categories.Ocio')}","100"`);
    expect(csv).toContain(`"${tr('app.categories.Salario')}","2000"`);
    downloads.restore();
  });

  it('closes with the button and with Escape', async () => {
    await openReport();
    await screen.findAllByRole('table');
    fireEvent.click(screen.getByRole('button', { name: tr('app.menu.close') }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.export.options') }));
    fireEvent.click(screen.getByRole('menuitem', { name: literal(tr('app.report.open')) }));
    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows empty categories and loading errors', async () => {
    const api = createFakeApi();
    api.insightsApi.report.mockResolvedValue(
      f.report({ expensesByCategory: [], incomeByCategory: [] })
    );
    await openReport(api);
    expect(await screen.findAllByText(tr('app.report.noData'))).toHaveLength(2);
  });

  it('offers the plans instead of the report to users without Premium', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(
      f.billing({ plan: 'free', trialDaysLeft: 0, limits: f.catalog().limits.free })
    );
    await openReport(api, { plan: true });
    expect(
      await screen.findByText(
        tr('billing.reason.feature', { feature: tr('billing.feature.insights') })
      )
    ).toBeInTheDocument();
    expect(api.insightsApi.report).not.toHaveBeenCalled();
  });

  it('reports a failed request', async () => {
    const api = createFakeApi();
    api.insightsApi.report.mockRejectedValue(new Error('Sin informe'));
    await openReport(api);
    expect(await screen.findByText('Sin informe')).toBeInTheDocument();
  });
});
