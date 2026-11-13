import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import * as capture from '@core/capture/notificationCapture';
import { ReviewTray, SWIPE_PX, UNDO_MS } from '@modules/finances/ui/components/ReviewTray';
import type { DetectedPayment } from '@modules/finances/domain/bankNotifications';
import { setLearningEnabled } from '@modules/finances/application/capturedPayments';
import type { ImportRowDTO } from '@modules/finances/domain/types';
import { createFakeApi, type FakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

jest.mock('@core/capture/notificationCapture', () => ({
  captureSupported: jest.fn(() => true),
  configureCapture: jest.fn().mockResolvedValue(undefined),
  drainCaptured: jest.fn().mockResolvedValue([]),
  reportWaiting: jest.fn().mockResolvedValue(undefined),
}));

const mocked = capture as jest.Mocked<typeof capture>;
const postedAt = new Date(2026, 2, 15, 9, 0).getTime();

const pay = (id: string, description: string, amount = 5, type: 'EXPENSE' | 'INCOME' = 'EXPENSE') =>
  ({ id, description, amount, type, date: '2026-03-15' }) as DetectedPayment;

const waiting = (...items: DetectedPayment[]) => {
  localStorage.setItem('mm_capture_enabled', '1');
  localStorage.setItem('mm_captured', JSON.stringify(items));
};

type Suggest = (row: ImportRowDTO, index: number) => Record<string, unknown>;

/** The import answers previews with `suggest` for each row and imports everything else. */
const answering = (
  api: FakeApi,
  suggest: Suggest = () => ({ categoryName: 'Otros', categorySource: 'fallback' })
) =>
  api.transactionApi.import.mockImplementation(
    async (rows: ImportRowDTO[], options: { dryRun?: boolean }) => ({
      dryRun: !!options.dryRun,
      imported: options.dryRun ? 0 : rows.length,
      duplicates: 0,
      invalid: 0,
      rows: rows.map((row, index) => ({ index, status: 'imported', ...suggest(row, index) })),
    })
  );

const categories = [
  f.category({ id: 'c-food', name: 'Alimentación' }),
  f.category({ id: 'c-fun', name: 'Ocio' }),
  f.category({ id: 'c-other', name: 'Otros' }),
];

const setup = (api = createFakeApi(), options: { plan?: boolean } = {}) => {
  api.categoryApi.getAll.mockResolvedValue(categories);
  return renderWithProviders(<ReviewTray />, { api, ...options });
};

const imports = (api: FakeApi) =>
  api.transactionApi.import.mock.calls.filter(([, options]) => !options.dryRun);

const card = (name: string) => screen.getByRole('listitem', { name: new RegExp(`^${name},`) });

// jsdom has no PointerEvent: a mouse event with a pointer id stands in (browsers have both).
beforeAll(() => {
  class FakePointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  Object.defineProperty(window, 'PointerEvent', { configurable: true, value: FakePointerEvent });
});

afterAll(() => {
  delete (window as { PointerEvent?: unknown }).PointerEvent;
});

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  mocked.captureSupported.mockReturnValue(true);
  mocked.drainCaptured.mockResolvedValue([]);
  jest.useFakeTimers({
    now: new Date('2026-03-15T12:00:00'),
    doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate', 'performance'],
  });
});
afterEach(() => jest.useRealTimers());

const pass = (ms = UNDO_MS) => act(async () => jest.advanceTimersByTime(ms));

describe('«Para revisar»', () => {
  it('is not shown outside the Android app or when nothing waits', async () => {
    waiting(pay('1', 'BAR'));
    mocked.captureSupported.mockReturnValue(false);
    const { unmount } = setup();
    expect(screen.queryByText(tr('app.review.title'))).toBeNull();
    unmount();
    mocked.captureSupported.mockReturnValue(true);
    localStorage.clear();
    setup();
    await act(async () => undefined);
    expect(screen.queryByText(tr('app.review.title'))).toBeNull();
  });

  it('shows the payments found, already filled in with the category the import would give', async () => {
    waiting(pay('1', 'MERCADONA', 23.4), pay('2', 'Ana', 20, 'INCOME'));
    const api = createFakeApi();
    answering(api, (row) =>
      row.description === 'MERCADONA'
        ? { categoryName: 'Alimentación', categorySource: 'keywords' }
        : { status: 'duplicate' }
    );
    setup(api);
    expect(await screen.findByText('Alimentación')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: tr('app.review.title') })).toBeInTheDocument();
    expect(screen.getByText(tr('app.review.hint', { count: 2 }))).toBeInTheDocument();
    expect(screen.getByText(tr('app.review.duplicate'))).toBeInTheDocument();
    expect(api.transactionApi.import).toHaveBeenCalledWith(
      [
        expect.objectContaining({ description: 'MERCADONA', amount: -23.4, type: 'EXPENSE' }),
        expect.objectContaining({ description: 'Ana', amount: 20, type: 'INCOME' }),
      ],
      { source: 'capture', dryRun: true }
    );
    expect(card('MERCADONA')).toHaveAttribute('aria-describedby', 'review-keys');
    // The phone is told how many wait (for its reminder).
    expect(mocked.reportWaiting).toHaveBeenLastCalledWith(2);
    expect(mocked.configureCapture).toHaveBeenCalled();
  });

  it('adds one with its button once «Deshacer» is over, with the suggested category', async () => {
    waiting(pay('1', 'MERCADONA', 23.4), pay('2', 'BAR'));
    const api = createFakeApi();
    answering(api);
    setup(api);
    await screen.findAllByText('Otros');
    expect(screen.getByText(tr('app.review.hint', { count: 2 }))).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.review.addOne', { name: 'MERCADONA' }) })
    );
    expect(screen.getByText(tr('app.review.added', { name: 'MERCADONA' }))).toBeInTheDocument();
    expect(screen.queryByRole('listitem', { name: /^MERCADONA,/ })).toBeNull();
    expect(screen.getByText(tr('app.review.hint.one'))).toBeInTheDocument();
    expect(imports(api)).toHaveLength(0);
    await pass();
    await waitFor(() => expect(imports(api)).toHaveLength(1));
    expect(imports(api)[0]).toEqual([
      [
        {
          date: '2026-03-15',
          description: 'MERCADONA',
          amount: -23.4,
          type: 'EXPENSE',
          notes: 'Detectado en una notificación',
          category: 'Otros',
        },
      ],
      { source: 'capture' },
    ]);
    expect(screen.queryByText(tr('app.review.added', { name: 'MERCADONA' }))).toBeNull();
  });

  it('«Deshacer» keeps it waiting and sends nothing', async () => {
    waiting(pay('1', 'BAR'));
    const { api } = setup();
    fireEvent.click(
      await screen.findByRole('button', { name: tr('app.review.addOne', { name: 'BAR' }) })
    );
    expect(screen.queryByRole('listitem')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.review.undo') }));
    expect(card('BAR')).toBeInTheDocument();
    await pass();
    expect(imports(api)).toHaveLength(0);
  });

  it('discards one and puts it back where it was with «Deshacer»', async () => {
    waiting(pay('1', 'A'), pay('2', 'B'), pay('3', 'C'));
    setup();
    fireEvent.click(
      await screen.findByRole('button', { name: tr('app.review.discardOne', { name: 'B' }) })
    );
    expect(screen.getByText(tr('app.review.discarded', { name: 'B' }))).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: tr('app.review.undo') }));
    expect(
      screen.getAllByRole('listitem').map((li) => li.getAttribute('aria-label')?.split(',')[0])
    ).toEqual(['A', 'B', 'C']);
    // The notice goes away by itself.
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.review.discardOne', { name: 'C' }) })
    );
    await pass();
    expect(screen.queryByText(tr('app.review.discarded', { name: 'C' }))).toBeNull();
  });

  it('adds with a swipe to the right and discards with a swipe to the left', async () => {
    waiting(pay('1', 'BAR'), pay('2', 'KIOSCO'), pay('3', 'CINE'));
    const { api } = setup();
    await screen.findByText('BAR');
    const drag = (name: string, to: number, end: 'pointerUp' | 'pointerCancel' = 'pointerUp') => {
      const li = card(name);
      fireEvent.pointerDown(li, { clientX: 100, pointerId: 1 });
      fireEvent.pointerMove(li, { clientX: 100 + to, pointerId: 1 });
      fireEvent[end](li, { clientX: 100 + to, pointerId: 1 });
    };
    // A short drag, or a cancelled one, does nothing.
    drag('BAR', SWIPE_PX - 1);
    drag('BAR', SWIPE_PX * 2, 'pointerCancel');
    expect(card('BAR')).toBeInTheDocument();
    // While dragging far enough, the card says what it will do.
    const li = card('KIOSCO');
    fireEvent.pointerDown(li, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(li, { clientX: 100 - SWIPE_PX, pointerId: 1 });
    expect(li).toHaveClass('review-card--discard');
    fireEvent.pointerMove(li, { clientX: 100 + SWIPE_PX, pointerId: 1 });
    expect(li).toHaveClass('review-card--add');
    fireEvent.pointerMove(li, { clientX: 100 - SWIPE_PX, pointerId: 1 });
    fireEvent.pointerUp(li, { clientX: 100 - SWIPE_PX, pointerId: 1 });
    expect(screen.getByText(tr('app.review.discarded', { name: 'KIOSCO' }))).toBeInTheDocument();
    drag('BAR', SWIPE_PX);
    expect(screen.getByText(tr('app.review.added', { name: 'BAR' }))).toBeInTheDocument();
    // A move or a release without a press first, or a press on a button, is not a swipe.
    fireEvent.pointerMove(card('CINE'), { clientX: 400, pointerId: 1 });
    fireEvent.pointerUp(card('CINE'), { clientX: 400, pointerId: 1 });
    const button = screen.getByRole('button', { name: tr('app.review.addOne', { name: 'CINE' }) });
    fireEvent.pointerDown(button, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(card('CINE'), { clientX: 400, pointerId: 1 });
    fireEvent.pointerUp(card('CINE'), { clientX: 400, pointerId: 1 });
    expect(card('CINE')).toBeInTheDocument();
    await pass();
    await waitFor(() => expect(imports(api)).toHaveLength(1));
  });

  it('works with the keyboard on the focused card', async () => {
    waiting(pay('1', 'A'), pay('2', 'B'), pay('3', 'C'), pay('4', 'D'), pay('5', 'E'));
    const { api } = setup();
    await screen.findByText('A');
    fireEvent.keyDown(card('A'), { key: 'Tab' });
    expect(card('A')).toBeInTheDocument();
    // Keys on the buttons inside are theirs.
    fireEvent.keyDown(
      screen.getByRole('button', { name: tr('app.review.addOne', { name: 'A' }) }),
      {
        key: 'ArrowRight',
      }
    );
    expect(card('A')).toBeInTheDocument();
    fireEvent.keyDown(card('A'), { key: 'ArrowRight' });
    fireEvent.keyDown(card('B'), { key: 'Enter' });
    fireEvent.keyDown(card('C'), { key: 'ArrowLeft' });
    fireEvent.keyDown(card('D'), { key: 'Delete' });
    fireEvent.keyDown(card('E'), { key: 'Backspace' });
    expect(screen.queryByRole('listitem')).toBeNull();
    // Each new action sends the one before at once.
    await waitFor(() => expect(imports(api)).toHaveLength(2));
  });

  it('changes the category with the last ones used or any other', async () => {
    waiting(pay('1', 'MERCADONA'), pay('2', 'Ana', 20, 'INCOME'));
    const api = createFakeApi();
    answering(api);
    api.monthApi.get.mockResolvedValue(
      f.overview({
        transactions: [
          f.transaction({ type: 'EXPENSE', category: 'Ocio', date: '2026-03-10' }),
          f.transaction({ type: 'EXPENSE', category: 'Borrada', date: '2026-03-09' }),
        ],
      })
    );
    setup(api);
    await screen.findAllByText('Otros');
    const change = screen.getByRole('button', {
      name: tr('app.review.changeOne', { name: 'MERCADONA' }),
    });
    fireEvent.click(change);
    expect(change).toHaveAttribute('aria-expanded', 'true');
    const picker = screen.getByRole('group', {
      name: tr('app.review.changeOne', { name: 'MERCADONA' }),
    });
    // Only categories that still exist.
    expect(within(picker).queryByRole('button', { name: 'Borrada' })).toBeNull();
    fireEvent.click(await within(picker).findByRole('button', { name: 'Ocio' }));
    expect(screen.queryByRole('group')).toBeNull();
    expect(within(card('MERCADONA')).getByText('Ocio')).toBeInTheDocument();
    // Opened and closed again with the same button.
    fireEvent.click(change);
    expect(within(screen.getByRole('group')).getByRole('button', { name: 'Ocio' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.click(change);
    expect(screen.queryByRole('group')).toBeNull();
    // An income has no recent categories: the list of all of them.
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.review.changeOne', { name: 'Ana' }) })
    );
    expect(screen.queryByText(tr('app.review.recent'))).toBeNull();
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.review.more') }), {
      target: { value: 'Alimentación' },
    });
    expect(within(card('Ana')).getByText('Alimentación')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.review.addOne', { name: 'MERCADONA' }) })
    );
    await pass();
    await waitFor(() => expect(imports(api)).toHaveLength(1));
    expect(imports(api)[0][0][0]).toMatchObject({ description: 'MERCADONA', category: 'Ocio' });
  });

  it('adds without a category when it could not be suggested (the import picks it)', async () => {
    waiting(pay('1', 'BAR'));
    const api = createFakeApi();
    api.transactionApi.import.mockRejectedValueOnce(new Error('offline'));
    setup(api);
    expect(await screen.findByText(tr('app.review.categoryAuto'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.review.addOne', { name: 'BAR' }) }));
    await pass();
    await waitFor(() => expect(imports(api)).toHaveLength(1));
    expect(imports(api)[0][0][0]).not.toHaveProperty('category');
  });

  it('shows why one could not be added and keeps it waiting', async () => {
    waiting(pay('1', 'BAR'));
    const api = createFakeApi();
    answering(api);
    setup(api);
    await screen.findByText('Otros');
    api.transactionApi.import.mockRejectedValueOnce(new Error('Sin conexión'));
    fireEvent.click(screen.getByRole('button', { name: tr('app.review.addOne', { name: 'BAR' }) }));
    await pass();
    expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
    expect(card('BAR')).toBeInTheDocument();
  });

  it('adds or discards everything at once, and the discarded ones come back with «Deshacer»', async () => {
    waiting(pay('1', 'BAR'), pay('2', 'KIOSCO'), pay('3', 'CINE'));
    const { api } = setup();
    await screen.findByText('BAR');
    fireEvent.click(screen.getByRole('button', { name: tr('app.review.discardAll') }));
    expect(screen.getByText(tr('app.review.discardedAll', { count: 3 }))).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.review.undo') }));
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: tr('app.review.addAll') }));
    await waitFor(() => expect(screen.queryByRole('listitem')).toBeNull());
    expect(imports(api)[0][0]).toHaveLength(3);
  });

  it('sends the payment waiting for «Deshacer» when leaving the screen', async () => {
    waiting(pay('1', 'BAR'));
    const { api, unmount } = setup();
    fireEvent.click(
      await screen.findByRole('button', { name: tr('app.review.addOne', { name: 'BAR' }) })
    );
    unmount();
    await waitFor(() => expect(imports(api)).toHaveLength(1));
  });

  it('takes the reader to it when a notice of the phone opened the app', async () => {
    waiting(pay('1', 'BAR'));
    const onFocused = jest.fn();
    const api = createFakeApi();
    api.categoryApi.getAll.mockResolvedValue(categories);
    renderWithProviders(<ReviewTray focus onFocused={onFocused} />, { api });
    await waitFor(() => expect(onFocused).toHaveBeenCalled());
    expect(card('BAR')).toHaveFocus();
  });

  it('collects the payments of the notifications, one for Google Wallet and the bank together', async () => {
    localStorage.setItem('mm_capture_enabled', '1');
    mocked.drainCaptured.mockResolvedValue([
      {
        packageName: 'com.google.android.apps.walletnfcrel',
        title: 'Google Wallet',
        text: 'Pago de 23,40 €',
        postedAt,
      },
      {
        packageName: 'com.bbva.bbvacontigo',
        title: 'BBVA',
        text: 'Pago con tarjeta de 23,40 € en MERCADONA',
        postedAt: postedAt + 60_000,
      },
      {
        packageName: 'com.bbva.bbvacontigo',
        title: 'BBVA',
        text: 'Compra denegada de 9,00 € en BAR',
        postedAt,
      },
    ]);
    setup();
    expect(await screen.findByText('MERCADONA')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    // Hidden, nothing is read; back on screen, the service is read again.
    const hidden = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    hidden.mockRestore();
    expect(mocked.drainCaptured).toHaveBeenCalledTimes(1);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(mocked.drainCaptured).toHaveBeenCalledTimes(2));
  });

  it('keeps going when the service fails or is off', async () => {
    mocked.drainCaptured.mockRejectedValue(new Error('service down'));
    mocked.reportWaiting.mockRejectedValue(new Error('old app'));
    setup();
    await act(async () => undefined);
    expect(mocked.drainCaptured).not.toHaveBeenCalled();
    localStorage.setItem('mm_capture_enabled', '1');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(mocked.drainCaptured).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(tr('app.review.title'))).toBeNull();
  });
});

describe('«Para revisar» on the free plan', () => {
  const free = (captures: number) => {
    const api = createFakeApi();
    answering(api);
    api.billingApi.get.mockResolvedValue(
      f.billing({
        plan: 'free',
        limits: f.catalog().limits.free,
        usage: { ...f.billing().usage, captures },
      })
    );
    return api;
  };

  it('says how many detected payments it can still add this month', async () => {
    waiting(pay('1', 'BAR'), pay('2', 'KIOSCO'));
    setup(free(10), { plan: true });
    expect(
      await screen.findByText(tr('app.review.left', { count: 5, limit: 15 }))
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.review.addOne', { name: 'BAR' }) }));
    expect(screen.getByText(tr('app.review.left', { count: 4, limit: 15 }))).toBeInTheDocument();
  });

  it('keeps them waiting when the month is used up, and offers Premium', async () => {
    waiting(pay('1', 'BAR'));
    const { api } = setup(free(15), { plan: true });
    expect(await screen.findByText(tr('app.review.noneLeft', { limit: 15 }))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.review.addOne', { name: 'BAR' }) }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(card('BAR')).toBeInTheDocument();
    expect(imports(api)).toHaveLength(0);
  });

  it('adds all it can and offers Premium for the rest', async () => {
    waiting(pay('1', 'BAR'), pay('2', 'KIOSCO'), pay('3', 'CINE'));
    const { api } = setup(free(13), { plan: true });
    await screen.findByText(tr('app.review.left', { count: 2, limit: 15 }));
    fireEvent.click(screen.getByRole('button', { name: tr('app.review.addAll') }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await waitFor(() => expect(imports(api)).toHaveLength(1));
    expect(imports(api)[0][0].map((r: ImportRowDTO) => r.description)).toEqual(['BAR', 'KIOSCO']);
  });

  it('adds none and offers Premium when nothing is left', async () => {
    waiting(pay('1', 'BAR'), pay('2', 'KIOSCO'));
    const { api } = setup(free(20), { plan: true });
    await screen.findByText(tr('app.review.noneLeft', { limit: 15 }));
    fireEvent.click(screen.getByRole('button', { name: tr('app.review.addAll') }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(imports(api)).toHaveLength(0);
  });
});

describe('Rules that learn from «Para revisar»', () => {
  const twice = async (api: FakeApi, first = 'Alimentación', second = 'Alimentación') => {
    waiting(pay('1', 'MERCADONA'), pay('2', 'Mercadona'));
    setup(api);
    await screen.findAllByText('Otros');
    for (const [name, category] of [
      ['MERCADONA', first],
      ['Mercadona', second],
    ]) {
      fireEvent.click(screen.getByRole('button', { name: tr('app.review.changeOne', { name }) }));
      fireEvent.change(screen.getByRole('combobox', { name: tr('app.review.more') }), {
        target: { value: category },
      });
      fireEvent.click(screen.getByRole('button', { name: tr('app.review.addOne', { name }) }));
      await pass();
      await waitFor(() =>
        expect(screen.queryByRole('listitem', { name: new RegExp(`^${name},`) })).toBeNull()
      );
    }
    await act(async () => undefined);
  };

  it('creates the rule the second time the same shop goes to the same category, and «Deshacer» removes it', async () => {
    const api = createFakeApi();
    answering(api);
    await twice(api);
    await waitFor(() =>
      expect(api.categoryRuleApi.add).toHaveBeenCalledWith('mercadona', 'c-food')
    );
    expect(api.categoryRuleApi.add).toHaveBeenCalledTimes(1);
    expect(api.categoryRuleApi.suggest).toHaveBeenCalledWith('Mercadona');
    const notice = await screen.findByText(
      tr('app.review.learnt', { name: 'Mercadona', category: 'Alimentación' })
    );
    expect(notice).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.review.undo') }));
    expect(api.categoryRuleApi.remove).toHaveBeenCalledWith('r1');
  });

  it('starts again with another category', async () => {
    const api = createFakeApi();
    answering(api);
    await twice(api, 'Alimentación', 'Ocio');
    expect(api.categoryRuleApi.add).not.toHaveBeenCalled();
  });

  it('learns nothing when it is turned off', async () => {
    setLearningEnabled(false);
    const api = createFakeApi();
    answering(api);
    await twice(api);
    expect(api.categoryRuleApi.suggest).not.toHaveBeenCalled();
  });

  it('learns nothing when the shop name is too short for a rule', async () => {
    const api = createFakeApi();
    answering(api);
    api.categoryRuleApi.suggest.mockResolvedValue({ pattern: 'me', categoryId: null });
    await twice(api);
    await waitFor(() => expect(api.categoryRuleApi.suggest).toHaveBeenCalled());
    expect(api.categoryRuleApi.add).not.toHaveBeenCalled();
  });

  it('keeps the payment when the rule could not be saved', async () => {
    const api = createFakeApi();
    answering(api);
    api.categoryRuleApi.add.mockRejectedValue(new Error('offline'));
    api.categoryRuleApi.remove.mockRejectedValue(new Error('offline'));
    await twice(api);
    await waitFor(() => expect(api.categoryRuleApi.add).toHaveBeenCalled());
    expect(screen.queryByText(/A partir de ahora/)).toBeNull();
  });

  it('removes the rule quietly even if the server fails', async () => {
    const api = createFakeApi();
    answering(api);
    api.categoryRuleApi.remove.mockRejectedValue(new Error('offline'));
    await twice(api);
    fireEvent.click(await screen.findByRole('button', { name: tr('app.review.undo') }));
    await waitFor(() => expect(api.categoryRuleApi.remove).toHaveBeenCalled());
  });

  it('learns nothing for a category that is not there or a description without a shop', async () => {
    const api = createFakeApi();
    answering(api, () => ({ categoryName: 'Nueva', categorySource: 'history' }));
    localStorage.setItem('mm_review_streaks', JSON.stringify({ bar: { category: 'Nueva' } }));
    waiting(pay('1', 'BAR'), pay('2', '1234'));
    setup(api);
    await screen.findAllByText('Nueva');
    fireEvent.click(screen.getByRole('button', { name: tr('app.review.addOne', { name: 'BAR' }) }));
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.review.addOne', { name: '1234' }) })
    );
    await pass();
    await waitFor(() => expect(imports(api)).toHaveLength(2));
    await act(async () => undefined);
    expect(api.categoryRuleApi.suggest).not.toHaveBeenCalled();
  });
});
