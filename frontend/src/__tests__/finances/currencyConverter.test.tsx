import { fireEvent, screen, waitFor } from '@testing-library/react';
import { CurrencyConverter } from '@modules/finances/ui/components/CurrencyConverter';
import type { UseTransactionFormReturn } from '@modules/finances/application/hooks/useTransactionForm';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

function setup(notes = '', currency: 'EUR' | 'USD' = 'EUR') {
  const api = createFakeApi();
  api.settingsApi.get.mockResolvedValue(f.settings({ currency }));
  const form = {
    fields: { notes },
    setAmount: jest.fn(),
    setNotes: jest.fn(),
  } as unknown as UseTransactionFormReturn;
  renderWithProviders(<CurrencyConverter form={form} />, { api });
  return { api, form };
}

const open = async () =>
  fireEvent.click(await screen.findByRole('button', { name: /Otra moneda/ }));

describe('CurrencyConverter', () => {
  it('fetches the rate, converts the amount and keeps the original in the notes', async () => {
    const { api, form } = setup();
    await open();
    await waitFor(() => expect(api.ratesApi.get).toHaveBeenCalledWith('USD', 'EUR'));
    const rate = await screen.findByDisplayValue('0.9');
    const convert = screen.getByRole('button', { name: tr('app.currency.convert', { to: 'EUR' }) });
    expect(convert).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.currency.original') }), {
      target: { value: '50' },
    });
    expect(rate).toBeInTheDocument();
    fireEvent.click(convert);
    expect(form.setAmount).toHaveBeenCalledWith('45');
    expect(form.setNotes).toHaveBeenCalledWith('50 USD (1 USD = 0.9 EUR)');
    // The panel folds away again.
    expect(screen.getByRole('button', { name: /Otra moneda/ })).toBeInTheDocument();
  });

  it('adds to the notes already written, lets the rate be typed and picks another currency', async () => {
    const { api, form } = setup('Con Luis', 'USD');
    await open();
    await waitFor(() => expect(api.ratesApi.get).toHaveBeenCalledWith('EUR', 'USD'));
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.currency.which') }), {
      target: { value: 'GBP' },
    });
    await waitFor(() => expect(api.ratesApi.get).toHaveBeenCalledWith('GBP', 'USD'));
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.currency.original') }), {
      target: { value: '10,5' },
    });
    fireEvent.change(
      screen.getByRole('textbox', { name: tr('app.currency.rate', { from: 'GBP', to: 'USD' }) }),
      {
        target: { value: '1,25' },
      }
    );
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.currency.convert', { to: 'USD' }) })
    );
    expect(form.setAmount).toHaveBeenCalledWith('13.13');
    expect(form.setNotes).toHaveBeenCalledWith('Con Luis · 10,5 GBP (1 GBP = 1,25 USD)');
  });

  it('asks for the rate by hand when it cannot be fetched, and can be cancelled', async () => {
    const api = createFakeApi();
    api.ratesApi.get.mockRejectedValueOnce(new Error('sin servicio')).mockRejectedValueOnce('x');
    const form = { fields: { notes: '' }, setAmount: jest.fn(), setNotes: jest.fn() };
    renderWithProviders(<CurrencyConverter form={form as unknown as UseTransactionFormReturn} />, {
      api,
    });
    await open();
    expect(await screen.findByText('sin servicio')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.common.cancel') }));
    await open();
    expect(await screen.findByText(tr('app.currency.noRate'))).toBeInTheDocument();
  });

  it('ignores a rate that arrives after the panel was closed', async () => {
    const api = createFakeApi();
    let resolve: (v: { from: string; to: string; rate: number }) => void = () => undefined;
    api.ratesApi.get.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    renderWithProviders(
      <CurrencyConverter form={{ fields: { notes: '' } } as unknown as UseTransactionFormReturn} />,
      { api }
    );
    await open();
    fireEvent.click(screen.getByRole('button', { name: tr('app.common.cancel') }));
    resolve({ from: 'USD', to: 'EUR', rate: 2 });
    await waitFor(() => expect(screen.queryByDisplayValue('2')).toBeNull());
  });
});
