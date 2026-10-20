import { fireEvent, screen, within } from '@testing-library/react';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

// A tiny limit stands in for the 500 movements the server accepts per request.
jest.mock('@modules/finances/domain/transactionBulk', () => ({
  ...jest.requireActual('@modules/finances/domain/transactionBulk'),
  BULK_MAX: 1,
}));

beforeEach(() => {
  localStorage.setItem('mm_recap_seen', '2026-3');
  freezeTime('2026-03-15T12:00:00');
});
afterEach(restoreTime);

it('asks to select fewer movements above the bulk limit', async () => {
  const api = createFakeApi();
  api.monthApi.get.mockResolvedValue(
    f.overview({
      transactions: [
        f.transaction({ id: 't1', description: 'Cena' }),
        f.transaction({ id: 't2', description: 'Taxi' }),
      ],
    })
  );
  renderWithProviders(<Dashboard />, { api });
  await screen.findByText('Cena');
  fireEvent.click(screen.getAllByRole('checkbox', { name: tr('app.bulk.selectAll') })[0]);
  const bar = screen.getByRole('region', { name: tr('app.bulk.region') });
  expect(within(bar).getByText(tr('app.bulk.tooMany', { max: 1 }))).toBeInTheDocument();
  expect(
    within(bar).getByRole('button', { name: new RegExp(tr('app.bulk.action.delete')) })
  ).toBeDisabled();
  expect(
    within(bar).getByRole('button', { name: new RegExp(tr('app.bulk.action.export')) })
  ).toBeEnabled();
});
