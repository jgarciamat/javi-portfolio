import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@test-utils/render';
import { autonomoDraft } from '@test-utils/fixtures';
import { FormPreview, fileName, previewText } from '@modules/taxforms/ui/FormPreview';
import {
  AutonomoFormPreviews,
  RentaFormPreview,
  WithholdingFormPreviews,
} from '@modules/taxforms/ui/FormPreviews';
import type { FilledForm } from '@modules/taxforms/domain/values';
import type { WithholdingResult } from '@modules/finances/domain/withholdings';
import { computeRenta, type RentaInput, type RentaResult } from '@modules/tools/domain/rentaCalc';
import { emptyForm, toInput } from '@modules/tools/domain/rentaForm';
import { workReductionOf } from '@modules/tools/domain/rentaWork';
import { loadCcaa } from '@modules/tools/data/renta';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { rentaProperty } from '@modules/tools/data/renta/inmuebles';
import { rentaState } from '@modules/tools/data/renta/state';

const draw = jest.fn(async (..._args: unknown[]) => undefined);
/** Page and width of each drawing (the canvas itself is left out of the messages). */
const drawn = () => draw.mock.calls.map((c) => [c[0], c[2]]);
const close = jest.fn(async () => undefined);
const openFormView = jest.fn(async () => ({ pages: 2, draw, close }));
jest.mock('@modules/taxforms/application/formView', () => ({
  openFormView: (...args: unknown[]) => openFormView(...(args as [])),
  canvasPng: async () => new Blob(['png'], { type: 'image/png' }),
}));

const share = jest.fn(async () => 'saved');
jest.mock('@shared/utils/shareImage', () => ({
  shareImage: (...args: unknown[]) => share(...(args as [])),
}));

const native = jest.fn(() => false);
jest.mock('@shared/utils/platform', () => ({ isNativeApp: () => native() }));

const form130: FilledForm = {
  model: '130',
  year: 2026,
  period: '3T',
  values: { '01': 12000, '04': 1800 },
  pending: [],
};

const t = (key: string, vars?: Record<string, string | number>) =>
  `${key}${vars ? JSON.stringify(vars) : ''}`;

beforeEach(() => {
  jest.clearAllMocks();
  native.mockReturnValue(false);
});

describe('The words and the files of a preview', () => {
  it('names the files by model, year, period and page', () => {
    expect(fileName(form130, 'pdf')).toBe('modelo-130-2026-3T-vista-previa.pdf');
    expect(fileName(form130, 'png', 2)).toBe('modelo-130-2026-3T-vista-previa-pag2.png');
    const renta = { ...form130, model: '100' as const, year: 2025, period: null };
    expect(fileName(renta, 'pdf')).toBe('modelo-100-2025-vista-previa.pdf');
  });

  it('uses the legend of the Renta only for the Renta', () => {
    expect(previewText(t, form130).legend).toBe('taxforms.mark.legend');
    expect(previewText(t, form130).title).toContain('"period":"2026 3T"');
    const renta = previewText(t, { ...form130, model: '100', period: null });
    expect(renta.legend).toBe('taxforms.mark.legend100');
    expect(renta.title).toContain('"period":"2025"'.replace('2025', '2026'));
  });
});

describe('A preview on the screen', () => {
  it('opens page by page, goes forward and back, and closes', async () => {
    renderWithI18n(<FormPreview form={form130} label="Modelo 130" />);
    const toggle = screen.getByRole('button', { name: 'Ver vista previa' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    await waitFor(() => expect(drawn()).toContainEqual([1, 600]));
    expect(screen.getByRole('button', { name: 'Ocultar vista previa' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByRole('img', { name: /modelo 130, página 1 de 2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await waitFor(() => expect(drawn()).toContainEqual([2, 600]));
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    await waitFor(() => expect(drawn().at(-1)).toEqual([1, 600]));
    // The figures typed in, for screen readers.
    expect(screen.getByText('Casillas rellenadas (2)')).toBeInTheDocument();
    expect(screen.getByText('12.000,00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar vista previa' }));
    expect(screen.getByRole('button', { name: 'Ver vista previa' })).toBeInTheDocument();
    // Opened again, the same view is used.
    fireEvent.click(screen.getByRole('button', { name: 'Ver vista previa' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ocultar vista previa' })));
    expect(openFormView).toHaveBeenCalledTimes(1);
  });

  it('downloads the PDF on a computer and shares it on a phone, building it once', async () => {
    renderWithI18n(<FormPreview form={form130} label="Modelo 130" />);
    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const [blob, name, , mode] = share.mock.calls[0] as unknown as [Blob, string, string, string];
    expect(blob.type).toBe('application/pdf');
    expect(name).toBe('modelo-130-2026-3T-vista-previa.pdf');
    expect(mode).toBe('download');
    native.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(2));
    expect((share.mock.calls[1] as unknown[])[3]).toBe('share');
    expect(((share.mock.calls[1] as unknown[])[0] as Blob).size).toBe(blob.size);
  });

  it('downloads the page as a PNG, opening the view when needed', async () => {
    renderWithI18n(<FormPreview form={form130} label="Modelo 130" />);
    fireEvent.click(screen.getByRole('button', { name: 'Descargar imagen (PNG)' }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(drawn()).toContainEqual([1, 1240]);
    expect((share.mock.calls[0] as unknown[])[1]).toBe('modelo-130-2026-3T-vista-previa-pag1.png');
  });

  it('says so when the preview cannot be built or drawn', async () => {
    openFormView.mockRejectedValueOnce(new Error('broken'));
    renderWithI18n(<FormPreview form={form130} label="Modelo 130" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver vista previa' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se ha podido preparar');
    draw.mockRejectedValueOnce(new Error('canvas'));
    fireEvent.click(screen.getByRole('button', { name: 'Ver vista previa' }));
    await waitFor(() => expect(draw).toHaveBeenCalled());
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('lists the boxes left for the draft and starts again with new figures', async () => {
    const renta: FilledForm = {
      model: '100',
      year: 2025,
      period: null,
      values: { '0003': 30000 },
      pending: ['0596', '0604'],
    };
    const { rerender } = renderWithI18n(<FormPreview form={renta} label="Renta" />);
    expect(screen.getByText(/0596, 0604/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver vista previa' }));
    await screen.findByRole('button', { name: 'Ocultar vista previa' }, { timeout: 15000 });
    await act(async () => {
      rerender(<FormPreview form={{ ...renta, values: { '0003': 31000 } }} label="Renta" />);
    });
    expect(screen.getByRole('button', { name: 'Ver vista previa' })).toBeInTheDocument();
  }, 30000);

  it('uses the width of its column when the page has one', async () => {
    jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(320);
    renderWithI18n(<FormPreview form={form130} label="Modelo 130" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver vista previa' }));
    await waitFor(() => expect(drawn()).toContainEqual([1, 320]));
    jest.restoreAllMocks();
  });
});

describe('The previews of each screen', () => {
  it('shows the 303 and the 130 of a draft, and only the 303 when the 130 is not filed', () => {
    const { unmount } = renderWithI18n(<AutonomoFormPreviews draft={autonomoDraft()} />);
    expect(screen.getByRole('heading', { name: 'Modelo 303 · IVA' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Modelo 130/ })).toBeInTheDocument();
    unmount();
    const exempt = autonomoDraft();
    exempt.irpf = { ...exempt.irpf, required: false };
    renderWithI18n(<AutonomoFormPreviews draft={exempt} />);
    expect(screen.queryByRole('heading', { name: /Modelo 130/ })).not.toBeInTheDocument();
  });

  it('shows the 111 and the 115 only when they are filed', () => {
    const result = (m111: string, m115: string) =>
      ({
        quarter: 2,
        m111: { result: m111, boxes: [{ box: '28', label: 'Suma', amount: 150 }] },
        m115: { result: m115, boxes: [{ box: '03', label: 'Ret.', amount: 57 }] },
        warnings: [],
      } as unknown as WithholdingResult);
    const { unmount } = renderWithI18n(
      <WithholdingFormPreviews result={result('pay', 'zero')} year={2026} />
    );
    expect(screen.getByRole('heading', { name: /Modelo 111/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Modelo 115/ })).toBeInTheDocument();
    unmount();
    const { container } = renderWithI18n(
      <WithholdingFormPreviews result={result('none', 'none')} year={2026} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the Renta, and nothing for a result saved by an older version', async () => {
    const input = toInput(
      { ...emptyForm('30000'), ccaaId: 'castilla-y-leon' },
      {
        state: rentaState,
        ccaa: await loadCcaa('castilla-y-leon'),
        extras: rentaWorkExtras,
        property: rentaProperty,
        workReduction: workReductionOf(rentaState),
      }
    );
    const { unmount } = renderWithI18n(
      <RentaFormPreview result={computeRenta(input)} input={input} year={2025} />
    );
    expect(screen.getByRole('heading', { name: /Modelo 100/ })).toBeInTheDocument();
    unmount();
    const broken = { minimum: {} } as unknown as RentaResult;
    const { container } = renderWithI18n(
      <RentaFormPreview result={broken} input={{} as RentaInput} year={2025} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
