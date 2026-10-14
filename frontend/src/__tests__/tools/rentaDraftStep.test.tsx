import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { RentaPlanner } from '@modules/tools/ui/RentaPlanner';
import { readPdfText } from '@modules/tools/application/readPdf';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

jest.mock('@modules/tools/application/readPdf', () => ({ readPdfText: jest.fn() }));
const read = readPdfText as jest.Mock;

beforeEach(() => {
  localStorage.clear();
  read.mockReset();
});

const premium = () => {
  const api = createFakeApi();
  api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
  return api;
};
const render = () =>
  renderWithProviders(<RentaPlanner mode="account" />, { api: premium(), plan: true });
const paste = async (text: string) => {
  fireEvent.click(await screen.findByText(tr('tools.renta.draft.paste')));
  fireEvent.change(screen.getByLabelText(tr('tools.renta.draft.paste'), { selector: 'textarea' }), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.draft.read') }));
};

const DRAFT = `Comunitat Valenciana Retribuciones dinerarias 30.000,00
  Total retenciones 4.100,00 Ingresos íntegros computables 5.000,00
  Descendientes 12/03/2023 Ascendientes`;

describe('Renta planner: the draft', () => {
  it('is a Premium feature', () => {
    renderWithProviders(<RentaPlanner mode="local" />, { authenticated: false });
    expect(screen.getByText(tr('tools.renta.draft.premium'))).toBeInTheDocument();
    expect(screen.queryByText(tr('tools.renta.draft.upload'))).toBeNull();
  });

  it('fills the form from the text, and asks about the deductions that are missing', async () => {
    render();
    await paste(DRAFT);
    expect(await screen.findByText(tr('tools.renta.draft.found'))).toBeInTheDocument();
    expect(screen.getByLabelText(tr('tools.renta.gross'))).toHaveValue('30000');
    expect(screen.getByLabelText(tr('tools.renta.ccaa'))).toHaveValue('comunitat-valenciana');
    expect(screen.getByLabelText(tr('tools.renta.childAge', { n: 1 }))).toHaveValue('2');
    await screen.findByText(/Deducciones de Comunitat Valenciana/);
    const maternity = await screen.findByRole('button', {
      name: `${tr('tools.renta.draft.yes')}: Por maternidad (hijos menores de 3 años)`,
    });
    fireEvent.click(maternity);
    expect(
      screen.queryByRole('button', { name: maternity.getAttribute('aria-label') as string })
    ).toBeNull();
    const dentist = screen.getByRole('button', {
      name: new RegExp(`^${tr('tools.renta.draft.no')}: Dentista`),
    });
    fireEvent.click(dentist);
    expect(
      screen.queryByRole('button', { name: dentist.getAttribute('aria-label') as string })
    ).toBeNull();
    expect(screen.getAllByText(tr('tools.renta.hint.missing')).length).toBeGreaterThan(0);
  });

  it('asks about rent when the person rents', async () => {
    render();
    await paste(DRAFT);
    await screen.findByText(/Deducciones de Comunitat Valenciana/);
    const before = screen.queryAllByRole('button', { name: /alquiler/i }).length;
    fireEvent.click(screen.getByLabelText(tr('tools.renta.draft.rents')));
    expect(screen.queryAllByRole('button', { name: /alquiler/i }).length).toBeGreaterThan(before);
  });

  it('says so when nothing is recognised', async () => {
    render();
    await paste('texto cualquiera');
    expect(await screen.findByText(tr('tools.renta.draft.nothing'))).toBeInTheDocument();
  });

  it('reads a PDF file in the browser', async () => {
    read.mockResolvedValue(DRAFT);
    render();
    const input = await screen.findByLabelText(tr('tools.renta.draft.file'));
    fireEvent.change(input, { target: { files: [new File(['x'], 'borrador.pdf')] } });
    await waitFor(() =>
      expect(screen.getByLabelText(tr('tools.renta.gross'))).toHaveValue('30000')
    );
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.draft.upload') }));
  });

  it('ignores an empty file choice and reports an unreadable file', async () => {
    read.mockRejectedValue(new Error('bad'));
    render();
    const input = await screen.findByLabelText(tr('tools.renta.draft.file'));
    fireEvent.change(input, { target: { files: [] } });
    expect(read).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { files: [new File(['x'], 'borrador.pdf')] } });
    expect(await screen.findByText(tr('tools.renta.draft.error'))).toBeInTheDocument();
  });

  it('marks what the draft already includes', async () => {
    render();
    await paste(`${DRAFT} Deducción por nacimiento, adopción o acogimiento`);
    await screen.findByText(/Deducciones de Comunitat Valenciana/);
    expect(await screen.findAllByText(tr('tools.renta.hint.inDraft'))).not.toHaveLength(0);
    expect(within(document.body).queryByText(tr('tools.renta.draft.noneMissing'))).toBeNull();
  });
});

describe('Renta planner: answering every question', () => {
  it('says there is nothing else to ask once every deduction is answered', async () => {
    render();
    await paste(DRAFT);
    await screen.findByText(/Deducciones de Comunitat Valenciana/);
    for (let i = 0; i < 200; i++) {
      const next = screen.queryAllByRole('button', { name: /^No me corresponde:/ })[0];
      if (!next) break;
      fireEvent.click(next);
    }
    expect(screen.getByText(tr('tools.renta.draft.noneMissing'))).toBeInTheDocument();
  });
});

describe('Renta planner: the family decides what is asked', () => {
  it('counts relatives with a disability', async () => {
    render();
    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(tr('tools.renta.addAscendant')) })
    );
    fireEvent.change(screen.getByLabelText(tr('tools.renta.ascendantDisability', { n: 1 })), {
      target: { value: '65' },
    });
    await paste(DRAFT);
    await screen.findByText(/Deducciones de Comunitat Valenciana/);
    expect(
      screen.getAllByRole('button', { name: /^Me corresponde: .*discapacidad/i }).length
    ).toBeGreaterThan(0);
  });
});
