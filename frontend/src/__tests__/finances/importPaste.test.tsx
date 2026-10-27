import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ImportModal } from '@modules/finances/ui/components/ImportModal';
import { looksLikeTable, withoutIndex } from '@modules/finances/application/hooks/useImport';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { literal, renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

function setup(locale: 'es' | 'en' = 'es') {
  const api = createFakeApi();
  renderWithProviders(
    <ImportModal accounts={[f.account()]} onClose={jest.fn()} onImported={jest.fn()} />,
    { api, finances: false, locale }
  );
  return api;
}

const paste = (text: string) => {
  fireEvent.click(screen.getByRole('tab', { name: literal(tr('app.import.source.paste')) }));
  fireEvent.change(screen.getByLabelText(tr('app.import.paste.label')), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole('button', { name: literal(tr('app.import.paste.read')) }));
};

const sent = (api: ReturnType<typeof createFakeApi>) => api.transactionApi.import.mock.calls[0][0];

beforeEach(() => freezeTime());
afterEach(restoreTime);

describe('pasting movements in the importer', () => {
  it('reads the pasted list, lets each row be corrected or removed, and previews it', async () => {
    const api = setup();
    const read = screen.getByRole('tab', { name: literal(tr('app.import.source.file')) });
    expect(read).toHaveAttribute('aria-selected', 'true');
    paste('12 mar Mercadona -45,30 €\n11 mar Nómina +1.800,00 €\nAyer Bar -3,00 €');
    expect(
      await screen.findByText(literal(tr('app.import.rowsFound', { count: 3 })))
    ).toBeVisible();
    expect(screen.getByText(new RegExp(`^${tr('app.import.source.paste')}`))).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(`${tr('app.import.col.date')} Mercadona`), {
      target: { value: '2026-03-13' },
    });
    // An empty date is not saved.
    fireEvent.change(screen.getByLabelText(`${tr('app.import.col.date')} Mercadona`), {
      target: { value: '' },
    });
    const concept = screen.getByLabelText(`${tr('app.import.col.description')} 1`);
    fireEvent.blur(concept, { target: { value: '  ' } });
    fireEvent.blur(concept, { target: { value: 'Mercadona' } });
    fireEvent.blur(concept, { target: { value: 'Mercadona Centro' } });
    const amount = screen.getByLabelText(`${tr('app.import.col.amount')} Mercadona Centro`);
    expect(amount).toHaveValue('45,30');
    fireEvent.blur(amount, { target: { value: 'nada' } });
    fireEvent.blur(amount, { target: { value: '46,10' } });
    fireEvent.blur(screen.getByLabelText(`${tr('app.import.col.amount')} Nómina`), {
      target: { value: '1.900,00' },
    });
    fireEvent.change(screen.getByLabelText(`${tr('app.import.col.type')} Bar`), {
      target: { value: 'SAVING' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.import.removeRow', { name: 'Nómina' }) })
    );
    expect(screen.queryByLabelText(`${tr('app.import.col.type')} Nómina`)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: tr('app.import.preview') }));
    await waitFor(() => expect(api.transactionApi.import).toHaveBeenCalled());
    expect(sent(api)).toEqual([
      expect.objectContaining({
        date: '2026-03-13',
        description: 'Mercadona Centro',
        amount: -46.1,
        type: 'EXPENSE',
      }),
      expect.objectContaining({
        date: '2026-03-14',
        description: 'Bar',
        amount: 3,
        type: 'SAVING',
      }),
    ]);
  });

  it('flags the types to review when nothing carries a sign, and starts again', async () => {
    setup();
    paste('sin fecha 2,00 €\n12/03/2026 Mercadona 45,30\n13/03/2026 Bar 3,00');
    expect(await screen.findAllByText(tr('app.import.typeReview'))).toHaveLength(2);
    expect(screen.getByText(literal(tr('app.import.rowsSkipped', { count: 1 })))).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.import.removeRow', { name: 'Mercadona' }) })
    );
    expect(screen.getAllByText(tr('app.import.typeReview'))).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: tr('app.import.otherSource') }));
    expect(screen.getByRole('tab', { name: literal(tr('app.import.source.file')) })).toBeVisible();
  });

  it('shows the amounts with a decimal point in English', async () => {
    setup('en');
    fireEvent.click(screen.getByRole('tab', { name: /Paste text/ }));
    fireEvent.change(screen.getByLabelText('Paste your movements here'), {
      target: { value: 'Mar 12 Coffee -€3.20' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Read movements/ }));
    expect(await screen.findByLabelText('Amount Coffee')).toHaveValue('3.20');
  });

  it('says so when the text has no movements', () => {
    setup();
    paste('Hola, esto no es un extracto');
    expect(screen.getByText(tr('app.import.paste.nothing'))).toBeInTheDocument();
  });

  it('reads a pasted table with a header with its columns, named as pasted text', async () => {
    setup();
    paste('Fecha\tConcepto\tImporte\n02/03/2026\tMERCADONA\t-54,30');
    expect(
      await screen.findByText(literal(tr('app.import.rowsFound', { count: 1 })), { exact: false })
    ).toHaveTextContent(`${tr('app.import.source.paste')} ·`);
    expect(screen.queryByText(/· CSV/)).toBeNull();
    expect(screen.getByRole('combobox', { name: tr('app.import.col.date') })).toBeInTheDocument();
    // The rows come from columns: they are not edited one by one, and the way back starts again.
    expect(screen.queryByLabelText(/^Importe /)).toBeNull();
    expect(screen.getByRole('button', { name: tr('app.import.otherSource') })).toBeInTheDocument();
  });

  it('moves between the tabs with the arrows, Home and End', () => {
    setup();
    const file = screen.getByRole('tab', { name: literal(tr('app.import.source.file')) });
    const pasteTab = screen.getByRole('tab', { name: literal(tr('app.import.source.paste')) });
    const shot = screen.getByRole('tab', { name: literal(tr('app.import.source.screenshot')) });
    const tabs = screen.getByRole('tablist');
    fireEvent.keyDown(tabs, { key: 'ArrowRight' });
    expect(pasteTab).toHaveFocus();
    expect(screen.getByLabelText(tr('app.import.paste.label'))).toBeInTheDocument();
    fireEvent.keyDown(tabs, { key: 'ArrowRight' });
    expect(shot).toHaveFocus();
    fireEvent.keyDown(tabs, { key: 'ArrowRight' });
    expect(file).toHaveFocus();
    fireEvent.keyDown(tabs, { key: 'ArrowLeft' });
    expect(shot).toHaveFocus();
    fireEvent.keyDown(tabs, { key: 'ArrowLeft' });
    expect(pasteTab).toHaveFocus();
    fireEvent.keyDown(tabs, { key: 'Home' });
    expect(file).toHaveFocus();
    fireEvent.keyDown(tabs, { key: 'ArrowLeft' });
    expect(shot).toHaveFocus();
    fireEvent.keyDown(tabs, { key: 'End' });
    expect(shot).toHaveFocus();
    fireEvent.keyDown(tabs, { key: 'Home' });
    fireEvent.keyDown(tabs, { key: 'a' });
    expect(file).toHaveFocus();
    expect(
      within(screen.getByRole('tabpanel')).getByRole('button', {
        name: tr('app.import.file.choose'),
      })
    ).toBeVisible();
  });
});

describe('import helpers', () => {
  it('tells a pasted table with a header from a list of movements', () => {
    expect(looksLikeTable('Fecha;Concepto;Cargo\n1/3/2026;Bar;3,00')).toBe(true);
    expect(looksLikeTable('Fecha\tConcepto\n1/3/2026\tBar')).toBe(false);
    expect(looksLikeTable('12/10 Bar\t-3,00 €')).toBe(false);
    expect(looksLikeTable('12/10 Bar -3,00 €')).toBe(false);
    expect(looksLikeTable(';;\t')).toBe(false);
  });

  it('moves the indexes after a removed row one up', () => {
    expect(withoutIndex([0, 2, 3], 2)).toEqual([0, 2]);
  });
});
