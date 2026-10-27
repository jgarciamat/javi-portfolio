import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { SampleDataCard } from '@modules/finances/ui/components/SampleDataCard';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
import { createFakeApi } from '@test-utils/fakeApi';
import { literal, renderWithProviders, tr } from '@test-utils/render';

const setup = (status: { sample: number; movements: number }, onImport?: () => void) => {
  const api = createFakeApi();
  api.transactionApi.sampleStatus.mockResolvedValue(status);
  const onOpenLeaks = jest.fn();
  renderWithProviders(<SampleDataCard onOpenLeaks={onOpenLeaks} onImport={onImport} />, { api });
  return { api, onOpenLeaks };
};

describe('SampleDataCard', () => {
  it('offers the sample data before the first movement and loads it', async () => {
    const { api } = setup({ sample: 0, movements: 0 });
    const load = await screen.findByRole('button', { name: new RegExp(tr('app.sample.load')) });
    expect(screen.getByText(tr('app.emptyMonth.sampleHint'))).toBeVisible();
    api.transactionApi.loadSample.mockResolvedValue({ sample: 81, movements: 81 });
    fireEvent.click(load);
    expect(await screen.findByText(tr('app.sample.active', { count: 81 }))).toBeVisible();
    expect(api.transactionApi.loadSample).toHaveBeenCalled();
  });

  it('says so when loading fails', async () => {
    const { api } = setup({ sample: 0, movements: 0 });
    api.transactionApi.loadSample.mockRejectedValue(new Error('x'));
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(tr('app.sample.load')) }));
    expect(await screen.findByRole('alert')).toHaveTextContent('x');
  });

  it('is not shown to someone with movements of their own', async () => {
    const { api } = setup({ sample: 0, movements: 3 });
    await waitFor(() => expect(api.transactionApi.sampleStatus).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: new RegExp(tr('app.sample.load')) })).toBeNull();
  });

  it('while the sample data is there, opens «Tu dinero perdido» and removes it after asking', async () => {
    const onImport = jest.fn();
    const { api, onOpenLeaks } = setup({ sample: 80, movements: 82 }, onImport);
    fireEvent.click(
      await screen.findByRole('button', { name: literal(tr('app.sample.seeLeaks')) })
    );
    expect(onOpenLeaks).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: tr('app.sample.remove') }));
    let dialog = screen.getByRole('dialog', { name: tr('app.sample.confirmTitle') });
    expect(dialog).toHaveTextContent(tr('app.sample.confirmBody', { count: 80 }));
    fireEvent.click(within(dialog).getByRole('button', { name: tr('app.common.cancel') }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.transactionApi.removeSample).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: tr('app.sample.remove') }));
    dialog = screen.getByRole('dialog', { name: tr('app.sample.confirmTitle') });
    api.transactionApi.sampleStatus.mockResolvedValue({ sample: 0, movements: 2 });
    fireEvent.click(within(dialog).getByRole('button', { name: tr('app.sample.remove') }));
    expect(await screen.findByRole('status')).toHaveTextContent(tr('app.sample.removed'));
    fireEvent.click(screen.getByRole('button', { name: literal(tr('app.sample.import')) }));
    expect(onImport).toHaveBeenCalled();
  });

  it('after removing, without an importer, only says it is done', async () => {
    const { api } = setup({ sample: 80, movements: 80 });
    fireEvent.click(await screen.findByRole('button', { name: tr('app.sample.remove') }));
    api.transactionApi.sampleStatus.mockResolvedValue({ sample: 0, movements: 0 });
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: tr('app.sample.remove') })
    );
    expect(await screen.findByText(tr('app.sample.removed'))).toBeVisible();
    expect(screen.queryByRole('button', { name: literal(tr('app.sample.import')) })).toBeNull();
  });

  it('shows on the month of a new user and opens «Tu dinero perdido» from it', async () => {
    const api = createFakeApi();
    api.transactionApi.sampleStatus.mockResolvedValue({ sample: 80, movements: 80 });
    renderWithProviders(<Dashboard />, { api });
    fireEvent.click(
      await screen.findByRole('button', { name: literal(tr('app.sample.seeLeaks')) })
    );
    expect(
      await screen.findByRole('heading', { name: new RegExp(tr('app.tabs.leaks')) })
    ).toBeVisible();
  });
});
