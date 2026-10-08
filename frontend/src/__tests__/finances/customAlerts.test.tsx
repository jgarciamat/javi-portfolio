import { fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { CustomAlertsTab } from '@modules/finances/ui/components/CustomAlertsTab';
import { CustomAlertsBanner } from '@modules/finances/ui/components/CustomAlertsBanner';
import { useCustomAlerts } from '@modules/finances/application/CustomAlertsContext';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

const categories = [f.category({ id: 'c1', name: 'Ocio' })];
const expensesAlert = f.customAlert({ id: 'al1', name: 'Gasto alto', threshold: 10 });
const ocioAlert = f.customAlert({
  id: 'al2',
  name: 'Ocio caro',
  metric: 'category_amount',
  operator: 'gte',
  threshold: 250.5,
  category: 'Ocio',
  color: '',
});
const pausedAlert = f.customAlert({
  id: 'al3',
  name: 'Ahorro bajo',
  metric: 'saving_pct',
  operator: 'lte',
  threshold: 50,
  active: false,
});

function setup(alerts = [expensesAlert, ocioAlert, pausedAlert]) {
  const api = createFakeApi();
  api.customAlertApi.getAll.mockResolvedValue(alerts);
  return renderWithProviders(
    <>
      <CustomAlertsBanner summary={f.summary()} carryover={500} />
      <CustomAlertsTab categories={categories} />
    </>,
    { api }
  );
}

beforeEach(() => {
  localStorage.clear();
  freezeTime();
});
afterEach(restoreTime);

describe('custom alerts', () => {
  it('lists the alerts and shows the ones that fire in the banner', async () => {
    setup();
    expect(await screen.findByText('Ocio caro')).toBeInTheDocument();
    // expenses 500 of available 2500 → 20 % ≥ 10 %; Ocio 300 € ≥ 250,50 €.
    expect(screen.getAllByText(new RegExp(tr('app.customAlerts.triggered')))).toHaveLength(2);
    expect(screen.getAllByText(/250,50/)).toHaveLength(2);
    const banners = screen.getAllByRole('alert');
    expect(banners).toHaveLength(2);
    expect(screen.getByRole('progressbar', { name: '100%' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: tr('app.alert.dismiss') })[0]);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('shows the empty state, loading and errors', async () => {
    setup([]);
    expect(await screen.findByText(tr('app.customAlerts.empty'))).toBeInTheDocument();
    const api = createFakeApi();
    api.customAlertApi.getAll.mockRejectedValue(new Error('Sin datos'));
    renderWithProviders(<CustomAlertsTab categories={categories} />, { api });
    expect(await screen.findByText('Sin datos')).toBeInTheDocument();
  });

  it('creates a category alert after validating it', async () => {
    const { api } = setup([]);
    await screen.findByText(tr('app.customAlerts.empty'));
    fireEvent.click(screen.getByRole('button', { name: tr('app.customAlerts.new') }));
    const submit = screen.getByRole('button', { name: tr('app.customAlerts.form.create') });
    fireEvent.click(submit);
    expect(await screen.findByText(tr('app.customAlerts.error.nameRequired'))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(tr('app.customAlerts.form.name')), {
      target: { value: ' Ocio ' },
    });
    fireEvent.click(submit);
    expect(
      await screen.findByText(tr('app.customAlerts.error.thresholdInvalid'))
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(new RegExp(tr('app.customAlerts.form.threshold'))), {
      target: { value: '100' },
    });
    fireEvent.click(screen.getByLabelText(tr('app.customAlerts.form.byCategory')));
    fireEvent.click(submit);
    expect(
      await screen.findByText(tr('app.customAlerts.error.categoryRequired'))
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole('combobox', { name: tr('app.customAlerts.form.category.placeholder') }),
      { target: { value: 'Ocio' } }
    );
    fireEvent.change(screen.getByLabelText(tr('app.customAlerts.form.metric')), {
      target: { value: 'category_amount' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.customAlerts.form.operator')), {
      target: { value: 'lte' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.customAlerts.form.color')), {
      target: { value: '#00ff00' },
    });
    expect(screen.getByLabelText(/\(EUR\)/)).toBeInTheDocument();
    fireEvent.click(submit);
    await waitFor(() =>
      expect(api.customAlertApi.create).toHaveBeenCalledWith({
        name: 'Ocio',
        metric: 'category_amount',
        operator: 'lte',
        threshold: 100,
        category: 'Ocio',
        color: '#00ff00',
      })
    );
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: tr('app.customAlerts.form.create') })).toBeNull()
    );
  });

  it('switches back to a global alert and cancels', async () => {
    setup([]);
    await screen.findByText(tr('app.customAlerts.empty'));
    fireEvent.click(screen.getByRole('button', { name: tr('app.customAlerts.new') }));
    const byCategory = screen.getByLabelText(tr('app.customAlerts.form.byCategory'));
    fireEvent.click(byCategory);
    fireEvent.click(byCategory);
    expect(screen.getByLabelText(tr('app.customAlerts.form.metric'))).toHaveValue('expenses_pct');
    fireEvent.click(screen.getByRole('button', { name: tr('app.customAlerts.form.cancel') }));
    expect(screen.getByText(tr('app.customAlerts.empty'))).toBeInTheDocument();
  });

  it('edits, pauses and deletes alerts, reporting failures', async () => {
    const { api } = setup();
    api.customAlertApi.update
      .mockResolvedValueOnce({ ...ocioAlert, threshold: 300 })
      .mockResolvedValueOnce({ ...pausedAlert, active: true });
    api.customAlertApi.delete.mockRejectedValueOnce(new Error('No borrada'));
    await screen.findByText('Ocio caro');
    fireEvent.click(
      screen.getAllByRole('button', { name: new RegExp(tr('app.customAlerts.edit')) })[1]
    );
    expect(screen.getByText(tr('app.customAlerts.form.title.edit'))).toBeInTheDocument();
    expect(screen.getByLabelText(tr('app.customAlerts.form.color'))).toHaveValue('#6366f1');
    fireEvent.change(screen.getByLabelText(new RegExp(tr('app.customAlerts.form.threshold'))), {
      target: { value: '300' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.customAlerts.form.save') }));
    await waitFor(() =>
      expect(api.customAlertApi.update).toHaveBeenCalledWith(
        'al2',
        expect.objectContaining({ threshold: 300 })
      )
    );

    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(tr('app.customAlerts.activate')) })
    );
    await waitFor(() =>
      expect(api.customAlertApi.update).toHaveBeenLastCalledWith('al3', { active: true })
    );

    fireEvent.click(
      screen.getAllByRole('button', { name: new RegExp(tr('app.customAlerts.delete')) })[0]
    );
    expect(await screen.findByText('No borrada')).toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole('button', { name: new RegExp(tr('app.customAlerts.delete')) })[0]
    );
    await waitFor(() => expect(screen.queryByText('Gasto alto')).toBeNull());
  });

  it('requires its provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useCustomAlerts())).toThrow(
      'useCustomAlerts must be used inside'
    );
    jest.restoreAllMocks();
  });
});
