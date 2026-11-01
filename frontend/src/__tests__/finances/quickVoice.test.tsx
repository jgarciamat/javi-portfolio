import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { QuickAdd } from '@modules/finances/ui/components/QuickAdd';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import type { Account } from '@modules/finances/domain/types';
import { literal, renderWithProviders, tr } from '@test-utils/render';

class FakeRecognition {
  static last: FakeRecognition;
  lang = '';
  onresult: ((e: { results: { transcript: string }[][] }) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = jest.fn();
  abort = jest.fn();
  constructor() {
    FakeRecognition.last = this;
  }
}
const w = window as unknown as Record<string, unknown>;

const categories = [
  f.category({ name: 'Desayunos', icon: '☕' }),
  f.category({ name: 'Alimentación', icon: '🛒' }),
];
const history = [f.transaction({ description: 'Café', category: 'Desayunos', date: '2026-03-02' })];

const setup = (opts: { accounts?: Account[]; locale?: 'es' | 'en'; onAdd?: jest.Mock } = {}) => {
  const onAdd = opts.onAdd ?? jest.fn().mockResolvedValue(undefined);
  const api = createFakeApi();
  api.categoryRuleApi.getAll.mockResolvedValue([]);
  renderWithProviders(
    <QuickAdd
      transactions={history}
      categories={categories}
      accounts={opts.accounts ?? []}
      defaultDate="2026-03-15"
      onAdd={onAdd}
    />,
    { api, locale: opts.locale }
  );
  const label = opts.locale === 'en' ? 'Quick transaction entry' : tr('app.quickAdd.label');
  return { onAdd, field: screen.getByLabelText(literal(label)) };
};

const mic = () => screen.getByRole('button', { name: tr('app.quickAdd.voice.label') });
const cardRegister = () =>
  screen
    .getAllByRole('button', { name: tr('app.quickAdd.add') })
    .find((b) => b.getAttribute('type') === 'button') as HTMLElement;
const say = (text: string) => {
  fireEvent.click(mic());
  act(() => FakeRecognition.last.onresult?.({ results: [[{ transcript: text }]] }));
};

beforeEach(() => {
  w.webkitSpeechRecognition = FakeRecognition;
  localStorage.clear();
});
afterEach(() => {
  delete w.webkitSpeechRecognition;
  jest.restoreAllMocks();
});

describe('QuickAdd dictation', () => {
  it('has no microphone where the browser cannot recognize speech', () => {
    delete w.webkitSpeechRecognition;
    setup();
    expect(screen.queryByRole('button', { name: tr('app.quickAdd.voice.label') })).toBeNull();
    expect(screen.queryByText(tr('app.quickAdd.voice.notice'), { exact: false })).toBeNull();
  });

  it('shows what was understood and records it only when confirmed', async () => {
    const { onAdd, field } = setup();
    expect(mic()).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(mic());
    expect(mic()).toHaveAttribute('aria-pressed', 'true');
    expect(FakeRecognition.last.lang).toBe('es-ES');
    expect(screen.getByText(tr('app.quickAdd.voice.listening'), { exact: false })).toBeVisible();
    act(() =>
      FakeRecognition.last.onresult?.({
        results: [[{ transcript: 'he pagado por un café 50 céntimos' }]],
      })
    );
    expect(field).toHaveValue('Café 0,50');
    const card = screen.getByText(/He entendido/);
    expect(card).toHaveTextContent(/Café · 0,50\s€ · Gasto · Desayunos$/);
    expect(onAdd).not.toHaveBeenCalled();
    fireEvent.click(cardRegister());
    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith({
        description: 'Café',
        amount: 0.5,
        type: 'EXPENSE',
        category: 'Desayunos',
        date: '2026-03-15',
      })
    );
    await waitFor(() => expect(screen.queryByText(/He entendido/)).toBeNull());
    expect(field).toHaveValue('');
  });

  it('shows the account when there are several, and follows the corrections of the person', () => {
    const main = f.account({ name: 'Principal', isDefault: true });
    const { field } = setup({ accounts: [main, f.account({ name: 'Efectivo' })] });
    say('me han ingresado mil doscientos euros');
    expect(screen.getByText(/He entendido/)).toHaveTextContent(
      /Ingreso · 1\.200,00\s€ · Ingreso · .* · Cuenta Principal/
    );
    expect(field).toHaveValue('Ingreso +1200');
    fireEvent.change(field, { target: { value: 'Nómina +1300' } });
    expect(screen.getByText(/He entendido/)).toHaveTextContent(/Nómina · 1\.300,00/);
  });

  it('does not record when the amount is not understood, and offers to repeat or cancel', () => {
    const { onAdd, field } = setup();
    say('he pagado por un café');
    expect(screen.getByText(tr('app.quickAdd.voice.unclear'))).toBeVisible();
    expect(field).toHaveValue('he pagado por un café');
    expect(screen.queryByRole('button', { name: tr('app.quickAdd.voice.repeat') })).not.toBeNull();
    const card = screen.getByText(tr('app.quickAdd.voice.unclear')).parentElement as HTMLElement;
    expect(within(card).queryByRole('button', { name: tr('app.quickAdd.add') })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.quickAdd.voice.repeat') }));
    expect(screen.queryByText(tr('app.quickAdd.voice.unclear'))).toBeNull();
    expect(mic()).toHaveAttribute('aria-pressed', 'true');
    act(() => FakeRecognition.last.onresult?.({ results: [[{ transcript: 'café 1 euro' }]] }));
    fireEvent.click(screen.getByRole('button', { name: tr('app.quickAdd.voice.stop') }));
    expect(field).toHaveValue('');
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('the microphone and the cancel button stop listening', () => {
    setup();
    fireEvent.click(mic());
    fireEvent.click(mic());
    expect(mic()).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(mic());
    fireEvent.click(screen.getByRole('button', { name: tr('app.quickAdd.voice.stop') }));
    expect(mic()).toHaveAttribute('aria-pressed', 'false');
    expect(FakeRecognition.last.abort).toHaveBeenCalled();
  });

  it('explains why it could not listen', () => {
    setup();
    fireEvent.click(mic());
    act(() => FakeRecognition.last.onerror?.({ error: 'not-allowed' }));
    expect(screen.getByRole('alert')).toHaveTextContent(tr('app.quickAdd.voice.error.denied'));
  });

  it('listens in English and reads English phrases', () => {
    const { field } = setup({ locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: 'Dictate an expense' }));
    expect(FakeRecognition.last.lang).toBe('en-US');
    act(() =>
      FakeRecognition.last.onresult?.({
        results: [[{ transcript: 'I bought a sandwich for nine dollars and eighty cents' }]],
      })
    );
    expect(field).toHaveValue('Sandwich 9,80');
  });

  it('cannot start another dictation while a movement is being saved', async () => {
    let done: () => void = () => undefined;
    const onAdd = jest.fn(() => new Promise<void>((r) => (done = r)));
    setup({ onAdd });
    say('café 1 euro');
    fireEvent.click(cardRegister());
    await waitFor(() => expect(mic()).toBeDisabled());
    await act(async () => done());
  });

  describe('privacy notice', () => {
    it('is shown the first time and, once dismissed, never again', () => {
      const first = setup();
      expect(screen.getByText(tr('app.quickAdd.voice.notice'), { exact: false })).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: tr('app.quickAdd.voice.noticeOk') }));
      expect(screen.queryByText(tr('app.quickAdd.voice.notice'), { exact: false })).toBeNull();
      expect(localStorage.getItem('mm_voice_notice')).toBe('1');
      expect(first.field).toBeVisible();
    });

    it('does not come back when it was already dismissed', () => {
      localStorage.setItem('mm_voice_notice', '1');
      setup();
      expect(screen.queryByText(tr('app.quickAdd.voice.notice'), { exact: false })).toBeNull();
    });

    it('works without storage', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      setup();
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      fireEvent.click(screen.getByRole('button', { name: tr('app.quickAdd.voice.noticeOk') }));
      expect(screen.queryByText(tr('app.quickAdd.voice.notice'), { exact: false })).toBeNull();
    });
  });
});
