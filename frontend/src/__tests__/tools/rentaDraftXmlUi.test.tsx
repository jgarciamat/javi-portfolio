import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { RentaPlanner } from '@modules/tools/ui/RentaPlanner';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { FAKE, VALENCIA, draftXml, latin1 } from '@test-utils/draftXml';

jest.setTimeout(60000);
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('mm_renta_view', 'expert');
});

const render = () => {
  const api = createFakeApi();
  api.billingApi.get.mockResolvedValue(
    f.billing({
      plan: 'premium',
      renta: { draft: { allowed: true, reason: 'premium' }, eligibleOn: null, passUntil: null },
    })
  );
  return renderWithProviders(<RentaPlanner mode="account" />, { api, plan: true });
};
const upload = async (xml: string, name = 'borrador-renta.txt') => {
  const input = await screen.findByLabelText(tr('tools.renta.draft.file'));
  fireEvent.change(input, { target: { files: [new File([latin1(xml) as BlobPart], name)] } });
};

describe('Renta planner: the file Renta WEB downloads', () => {
  it('reads it with the same button, marks its deductions and matches the draft to the cent', async () => {
    render();
    await upload(VALENCIA);
    expect(await screen.findByText(tr('tools.renta.draft.fromXml'))).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText(tr('tools.renta.gross'))).toHaveValue('30868.54')
    );
    expect(screen.getByLabelText(tr('tools.renta.withheld'))).toHaveValue('5167.32');
    expect(screen.getByLabelText(tr('tools.renta.ccaa'))).toHaveValue('comunitat-valenciana');
    // The sport deduction of the draft is marked with what was spent: the result is the draft's.
    const sport = await waitFor(() => {
      const el = document.getElementById('renta-ded-comunitat-valenciana-practica-deporte');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    await waitFor(() => expect(within(sport).getByRole('checkbox')).toBeChecked());
    expect(within(sport).getByRole('textbox')).toHaveValue('139');
    expect(within(sport).getByText(tr('tools.renta.hint.inDraft'))).toBeInTheDocument();
    expect(await screen.findByText(tr('tools.renta.compare.verdict.match'))).toBeInTheDocument();
    // Nothing personal is shown.
    for (const secret of [FAKE.nif, FAKE.name, FAKE.born, FAKE.iban])
      expect(document.body.textContent).not.toContain(secret);
  });

  it('says when the file is of another year, and uses it as the base', async () => {
    render();
    await upload(draftXml({ exercise: 2024 }), 'renta-2024.xml');
    expect(
      await screen.findByText(tr('tools.renta.draft.otherYear', { exercise: 2024 }))
    ).toBeInTheDocument();
    expect(screen.getByLabelText(tr('tools.renta.gross'))).toHaveValue('20000');
    expect(screen.getByLabelText(tr('tools.renta.age'))).toHaveValue('31');
  });

  it('reads a text file that is not the Agency XML as pasted text', async () => {
    render();
    await upload('Retribuciones dinerarias 21.000,00 0003', 'notas.txt');
    await waitFor(() =>
      expect(screen.getByLabelText(tr('tools.renta.gross'))).toHaveValue('21000')
    );
  });

  it('reports a broken file', async () => {
    render();
    await upload('<?xml version="1.0"?><Declaracion modelo="100" ejercicio="2025"><roto>');
    expect(await screen.findByText(tr('tools.renta.draft.error'))).toBeInTheDocument();
  });
});
