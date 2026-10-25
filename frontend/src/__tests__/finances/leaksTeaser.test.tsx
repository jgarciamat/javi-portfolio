import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
import { LeaksTeaser, TEASER_SEEN_KEY } from '@modules/finances/ui/components/LeaksTeaser';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

// Made-up findings of «Tu dinero perdido».
const two = f.moneyLeaks({
  total: { annual: 870, oneOff: 0, count: 2 },
  findings: [
    f.leakFinding({ id: 'b000000000000001' }),
    f.leakFinding({ id: 'b000000000000002', label: 'CLOUDY' }),
  ],
  count: 2,
});

function teaser(data = two) {
  const api = createFakeApi();
  api.insightsApi.moneyLeaks.mockResolvedValue(data);
  const onOpen = jest.fn();
  const view = renderWithProviders(<LeaksTeaser onOpen={onOpen} />, { api, finances: false });
  return { ...view, api, onOpen };
}

beforeEach(() => localStorage.clear());

describe('the notice of «Tu dinero perdido» in the monthly summary', () => {
  it('says the figure, leads to the section and closes until there is a new finding', async () => {
    const { api, onOpen, unmount } = teaser();
    const notice = await screen.findByRole('complementary', { name: tr('app.tabs.leaks') });
    expect(api.insightsApi.moneyLeaks).toHaveBeenCalledWith('summary');
    expect(
      within(notice).getByText(tr('app.leaks.teaser', { amount: '870 €', count: 2 }))
    ).toBeVisible();
    fireEvent.click(within(notice).getByRole('button', { name: tr('app.leaks.see') }));
    expect(onOpen).toHaveBeenCalled();
    fireEvent.click(within(notice).getByRole('button', { name: tr('app.leaks.teaserClose') }));
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(JSON.parse(localStorage.getItem(TEASER_SEEN_KEY) as string)).toEqual([
      'b000000000000001',
      'b000000000000002',
    ]);
    unmount();

    // The same findings: it stays closed; one more: it comes back.
    const again = teaser();
    await waitFor(() => expect(again.api.insightsApi.moneyLeaks).toHaveBeenCalled());
    expect(screen.queryByRole('complementary')).toBeNull();
    again.unmount();
    teaser(
      f.moneyLeaks({
        total: { annual: 470, oneOff: 0, count: 1 },
        findings: [f.leakFinding({ id: 'b000000000000003' })],
      })
    );
    expect(
      await screen.findByText(tr('app.leaks.teaserOne', { amount: '470 €' }))
    ).toBeInTheDocument();
  });

  it('stays away with few movements or nothing to check', async () => {
    const partial = teaser(f.moneyLeaks({ coverage: { ...two.coverage, level: 'partial' } }));
    await waitFor(() => expect(partial.api.insightsApi.moneyLeaks).toHaveBeenCalled());
    expect(screen.queryByRole('complementary')).toBeNull();
    partial.unmount();
    const nothing = teaser(f.moneyLeaks({ total: { annual: 0, oneOff: 89, count: 0 } }));
    await waitFor(() => expect(nothing.api.insightsApi.moneyLeaks).toHaveBeenCalled());
    expect(screen.queryByRole('complementary')).toBeNull();
  });
});

/** jsdom's File has no arrayBuffer(): give it one. */
function statement(content: string): File {
  const bytes = new TextEncoder().encode(content);
  return Object.assign(new File([bytes as BlobPart], 'extracto.csv'), {
    arrayBuffer: async () => bytes.buffer.slice(0),
  });
}

describe('«Tu dinero perdido» from the dashboard', () => {
  beforeEach(() => freezeTime());
  afterEach(restoreTime);

  it('opens the section from the monthly notice', async () => {
    const api = createFakeApi();
    api.insightsApi.moneyLeaks.mockResolvedValue(two);
    renderWithProviders(<Dashboard />, { api });
    const notice = await screen.findByRole('complementary', { name: tr('app.tabs.leaks') });
    fireEvent.click(within(notice).getByRole('button', { name: tr('app.leaks.see') }));
    expect(await screen.findByRole('heading', { name: tr('app.leaks.title') })).toBeInTheDocument();
  });

  it('says what was found after an import, with the way there', async () => {
    const api = createFakeApi();
    api.insightsApi.moneyLeaks.mockResolvedValue(two);
    api.transactionApi.import.mockResolvedValue({
      dryRun: true,
      imported: 1,
      duplicates: 0,
      invalid: 0,
      rows: [
        {
          index: 0,
          status: 'imported',
          date: '2026-03-02',
          description: 'FITBOX',
          amount: 39.9,
          type: 'EXPENSE',
          categoryName: 'Ocio',
          categorySource: 'file',
        },
      ],
    });
    renderWithProviders(<Dashboard />, { api });
    fireEvent.click(await screen.findByRole('button', { name: tr('app.import.open') }));
    const dialog = await screen.findByRole('dialog', { name: tr('app.import.title') });
    expect(within(dialog).getByText(tr('app.leaks.importTip'))).toBeInTheDocument();
    fireEvent.change(dialog.querySelector('input[type="file"]')!, {
      target: { files: [statement('Fecha;Concepto;Importe\n02/03/2026;FITBOX;-39,90\n')] },
    });
    fireEvent.click(await within(dialog).findByRole('button', { name: tr('app.import.preview') }));
    api.transactionApi.import.mockResolvedValueOnce({
      dryRun: false,
      imported: 1,
      duplicates: 0,
      invalid: 0,
      rows: [],
    });
    fireEvent.click(
      await within(dialog).findByRole('button', { name: tr('app.import.confirm', { count: 1 }) })
    );
    expect(
      await within(dialog).findByText(tr('app.leaks.afterImport', { amount: '870 €' }), {
        exact: false,
      })
    ).toBeInTheDocument();
    expect(api.insightsApi.moneyLeaks).toHaveBeenCalledWith('import');
    fireEvent.click(within(dialog).getByRole('button', { name: tr('app.leaks.see') }));
    expect(await screen.findByRole('heading', { name: tr('app.leaks.title') })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: tr('app.import.title') })).toBeNull();
  });

  it('says nothing after an import when there is nothing to check', async () => {
    const api = createFakeApi();
    api.insightsApi.moneyLeaks.mockResolvedValue(
      f.moneyLeaks({ total: { annual: 0, oneOff: 0, count: 0 }, findings: [], count: 0 })
    );
    api.transactionApi.import.mockResolvedValue({
      dryRun: true,
      imported: 1,
      duplicates: 0,
      invalid: 0,
      rows: [],
    });
    renderWithProviders(<Dashboard />, { api });
    fireEvent.click(await screen.findByRole('button', { name: tr('app.import.open') }));
    const dialog = await screen.findByRole('dialog', { name: tr('app.import.title') });
    fireEvent.change(dialog.querySelector('input[type="file"]')!, {
      target: { files: [statement('Fecha;Concepto;Importe\n02/03/2026;FITBOX;-39,90\n')] },
    });
    fireEvent.click(await within(dialog).findByRole('button', { name: tr('app.import.preview') }));
    api.transactionApi.import.mockResolvedValueOnce({
      dryRun: false,
      imported: 1,
      duplicates: 0,
      invalid: 0,
      rows: [],
    });
    fireEvent.click(
      await within(dialog).findByRole('button', { name: tr('app.import.confirm', { count: 1 }) })
    );
    await within(dialog).findByText(tr('app.import.done', { imported: 1, duplicates: 0 }), {
      exact: false,
    });
    await waitFor(() => expect(api.insightsApi.moneyLeaks).toHaveBeenCalledWith('import'));
    expect(within(dialog).queryByText(/Hemos revisado/)).toBeNull();
  });
});
