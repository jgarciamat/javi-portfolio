import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { MonthNavCard } from '@modules/finances/ui/components/MonthlyView';
import { RecapShare } from '@modules/finances/ui/components/RecapShare';
import { recapImage } from '@modules/finances/domain/recapImage';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { captureDownloads } from '@test-utils/dom';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

const gradient = { addColorStop: jest.fn() };
const ctx = {
  fillStyle: '',
  strokeStyle: '',
  font: '',
  lineWidth: 0,
  lineCap: '',
  textAlign: '',
  fillRect: jest.fn(),
  fillText: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  beginPath: jest.fn(),
  closePath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  quadraticCurveTo: jest.fn(),
  arc: jest.fn(),
  createLinearGradient: jest.fn(() => gradient),
  createRadialGradient: jest.fn(() => gradient),
};

function mockCanvas(blob: Blob | null = new Blob(['png'], { type: 'image/png' }), context = true) {
  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue((context ? ctx : null) as never);
  jest
    .spyOn(HTMLCanvasElement.prototype, 'toBlob')
    .mockImplementation((cb: BlobCallback) => cb(blob));
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  freezeTime('2026-03-15T12:00:00');
});
afterEach(() => {
  restoreTime();
  jest.restoreAllMocks();
  Object.assign(navigator, { share: undefined, canShare: undefined });
});

const view = () => renderWithProviders(<RecapShare summary={f.summary()} month="marzo de 2026" />);

describe('recapImage', () => {
  it('draws the card and returns a PNG', async () => {
    mockCanvas();
    const blob = await recapImage({
      title: 'Mi mes',
      month: 'marzo',
      rate: 10,
      headline: '10 %',
      headlineHint: 'ahorrado',
      lines: ['a', 'b'],
      footer: 'pie',
      site: 'finanverso.app',
    });
    expect(blob.type).toBe('image/png');
    expect(ctx.fillText).toHaveBeenCalledWith('10 %', 540, 680);
    expect(ctx.arc).toHaveBeenCalledTimes(2);
  });

  it('draws only the track of the ring when nothing was saved and caps what is above 100', async () => {
    mockCanvas();
    const base = {
      title: '',
      month: '',
      headline: '',
      headlineHint: '',
      lines: [],
      footer: '',
      site: '',
    };
    await recapImage({ ...base, rate: 0 });
    expect(ctx.arc).toHaveBeenCalledTimes(1);
    ctx.arc.mockClear();
    await recapImage({ ...base, rate: 250 });
    expect(ctx.arc).toHaveBeenLastCalledWith(540, 640, 215, -Math.PI / 2, (3 * Math.PI) / 2);
  });

  it('fails without a canvas or without a picture', async () => {
    const data = {
      title: '',
      month: '',
      rate: 0,
      headline: '',
      headlineHint: '',
      lines: [],
      footer: '',
      site: '',
    };
    mockCanvas(null, false);
    await expect(recapImage(data)).rejects.toThrow('canvas');
    jest.restoreAllMocks();
    mockCanvas(null);
    await expect(recapImage(data)).rejects.toThrow('blob');
  });
});

describe('Share the month', () => {
  it('shares the picture with the share sheet, hiding the amounts by default', async () => {
    mockCanvas();
    const share = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share, canShare: () => true });
    view();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('app.recap.share')) }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    const drawn = ctx.fillText.mock.calls.map((c) => c[0] as string);
    expect(drawn.some((t) => t.includes('Ocio') && !t.includes('300'))).toBe(true);
    expect(drawn).not.toContain(tr('app.recap.shareSaved', { amount: '200' }));
  });

  it('can show the amounts', async () => {
    mockCanvas();
    Object.assign(navigator, {
      share: jest.fn().mockResolvedValue(undefined),
      canShare: () => true,
    });
    view();
    fireEvent.click(screen.getByLabelText(tr('app.recap.shareAmounts')));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('app.recap.share')) }));
    await waitFor(() => expect(ctx.fillText).toHaveBeenCalled());
    const drawn = ctx.fillText.mock.calls.map((c) => c[0] as string);
    expect(drawn.some((t) => /Ocio.*300/.test(t))).toBe(true);
    expect(drawn.some((t) => /ahorrado|He ahorrado/.test(t) && /200/.test(t))).toBe(true);
  });

  it('saves the picture when the browser cannot share files', async () => {
    mockCanvas();
    const downloads = captureDownloads();
    view();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('app.recap.share')) }));
    expect(await screen.findByText(tr('app.recap.shareSaved2'))).toBeInTheDocument();
    expect(downloads.names).toEqual(['finanverso-resumen.png']);
    downloads.restore();
  });

  it('is fine when the share sheet is closed', async () => {
    mockCanvas();
    const share = jest.fn().mockRejectedValue(new Error('AbortError'));
    Object.assign(navigator, { share, canShare: () => true });
    view();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('app.recap.share')) }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(screen.queryByText(tr('app.recap.shareError'))).toBeNull();
  });

  it('reports a picture that could not be made and handles months without income or expenses', async () => {
    mockCanvas(null);
    renderWithProviders(
      <RecapShare
        summary={f.summary({
          totalIncome: 0,
          totalSaving: 0,
          balance: -50,
          expensesByCategory: {},
        })}
        month="marzo"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('app.recap.share')) }));
    expect(await screen.findByText(tr('app.recap.shareError'))).toBeInTheDocument();
  });
});

describe('Month summary on demand', () => {
  const open = async () => {
    const api = createFakeApi();
    renderWithProviders(<MonthNavCard />, { api });
    fireEvent.click(await screen.findByRole('button', { name: tr('app.export.options') }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('app.recap.open')) }));
    return screen.findByRole('dialog');
  };

  it('opens from the options of the month, shows the figures and closes again', async () => {
    mockCanvas();
    Object.assign(URL, {
      createObjectURL: jest.fn(() => 'blob:preview'),
      revokeObjectURL: jest.fn(),
    });
    await open();
    for (const key of ['income', 'expenses', 'saving', 'rateLabel']) {
      expect(screen.getByText(tr(`app.recap.${key}`))).toBeInTheDocument();
    }
    expect(screen.getByText(/Tu mayor gasto fue/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.recap.dismiss') }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows a preview of the picture that follows the choice of showing the amounts', async () => {
    mockCanvas();
    const create = jest.fn(() => 'blob:preview');
    const revoke = jest.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    await open();
    const preview = await screen.findByRole('img', { name: tr('app.recap.previewAlt') });
    expect(preview).toHaveAttribute('src', 'blob:preview');
    const drawn = () => ctx.fillText.mock.calls.map((c) => c[0] as string);
    expect(drawn().some((t) => /\d+,\d{2}/.test(t))).toBe(false);
    fireEvent.click(screen.getByLabelText(tr('app.recap.shareAmounts')));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(revoke).toHaveBeenCalledWith('blob:preview');
    expect(drawn().some((t) => /Ocio.*300/.test(t))).toBe(true);
  });

  it('has no preview when the picture cannot be drawn', async () => {
    mockCanvas(null);
    await open();
    await act(async () => undefined);
    expect(screen.queryByRole('img', { name: tr('app.recap.previewAlt') })).toBeNull();
  });

  it('does not show a preview that arrives after the dialog was closed', async () => {
    let finish: (blob: Blob | null) => void = () => undefined;
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
    jest
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((cb: BlobCallback) => (finish = cb));
    const create = jest.fn(() => 'blob:late');
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: jest.fn() });
    await open();
    fireEvent.click(screen.getByRole('button', { name: tr('app.recap.dismiss') }));
    await act(async () => finish(new Blob(['png'])));
    expect(create).not.toHaveBeenCalled();
  });
});

describe('Month summary dialog with unusual months', () => {
  it('copes with a month without income, expenses or savings', async () => {
    mockCanvas();
    Object.assign(URL, { createObjectURL: jest.fn(() => 'blob:x'), revokeObjectURL: jest.fn() });
    const { MonthRecapDialog } = await import('@modules/finances/ui/components/MonthRecap');
    renderWithProviders(
      <MonthRecapDialog
        summary={f.summary({
          totalIncome: 0,
          totalExpenses: 50,
          totalSaving: 0,
          balance: -50,
          expensesByCategory: {},
        })}
        month="marzo"
        onClose={jest.fn()}
      />
    );
    expect(screen.queryByText(/Tu mayor gasto fue/)).toBeNull();
    expect(screen.getByText(/de más gastado/)).toBeInTheDocument();
    expect(screen.getAllByText(/^0\s?%$/).length).toBeGreaterThan(0);
  });
});
