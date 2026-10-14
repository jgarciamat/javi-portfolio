import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MonthNavCard } from '@modules/finances/ui/components/MonthlyView';
import { RecapShare } from '@modules/finances/ui/components/RecapShare';
import { recapImage } from '@modules/finances/domain/recapImage';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { captureDownloads } from '@test-utils/dom';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

const ctx = {
  fillStyle: '',
  font: '',
  fillRect: jest.fn(),
  fillText: jest.fn(),
  createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
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
      headline: '10 %',
      headlineHint: 'ahorrado',
      lines: ['a', 'b'],
      footer: 'pie',
    });
    expect(blob.type).toBe('image/png');
    expect(ctx.fillText).toHaveBeenCalledWith('10 %', 90, 560);
  });

  it('fails without a canvas or without a picture', async () => {
    const data = { title: '', month: '', headline: '', headlineHint: '', lines: [], footer: '' };
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
    expect(downloads.names).toEqual(['money-manager-resumen.png']);
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
  it('opens from the options of the month and closes again', async () => {
    const api = createFakeApi();
    renderWithProviders(<MonthNavCard />, { api });
    fireEvent.click(await screen.findByRole('button', { name: tr('app.export.options') }));
    fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(tr('app.recap.open')) }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.recap.dismiss') }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
